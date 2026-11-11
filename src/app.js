/*
 * Endless Battle Simulator – Anwendung
 *   ?mode=export&cfg=<json>  -> Export-Modus (gesteuert von Node/Playwright über window.exportAPI)
 *   sonst                    -> Live-Ansicht mit Bedienfeld
 * Szenariounabhängig: Szenario-Regler und -Statistiken kommen aus der Szenario-Registrierung.
 */
(function () {
'use strict';
const { PHYS_HZ, DT, ASPECTS, normalizeConfig, mergeConfig, getScenario, scenarios, Session, createStage, installExportAPI, videoSize } = EBS;
const { fmtTime, fmtInt } = EBS.util;

const params = new URLSearchParams(location.search);
const EXPORT = params.get('mode') === 'export';
const RESERVED = ['mode', 'cfg', 'paused'];
// Was das Live-Bedienfeld anbietet (weitere Werte lassen sich hier ergänzen, der Kern kann sie bereits)
const UI_ASPECTS = ['9:16', '16:9'];
const UI_DURATIONS = [[20, '20 Sekunden (Test)'], [45, '45 Sekunden (Short)'], [60, '1 Minute'], [300, '5 Minuten'], [600, '10 Minuten'], [1800, '30 Minuten'], [3600, '60 Minuten']];
// Werte < 1 sind Zeitlupe und gelten auch für den Videoexport (cfg.video.tempo), Werte > 1 nur für die Vorschau
const UI_SPEEDS = [0.64, 0.8, 1, 2, 5, 10];

// Videolänge als Text: "45", "45s", "5m", "1h" -> Sekunden (null = ungültig) und zurück
function parseDuration(text) {
  const m = String(text).trim().toLowerCase().replace(',', '.').match(/^(\d+(?:\.\d+)?)\s*(h|std|m|min|s|sek)?\.?$/);
  if (!m) return null;
  const sec = Math.round(parseFloat(m[1]) * (m[2] === 'h' || m[2] === 'std' ? 3600 : m[2] === 'm' || m[2] === 'min' ? 60 : 1));
  return sec > 0 ? sec : null;
}
const fmtDuration = (s) => (s % 3600 === 0 ? s / 3600 + 'h' : s % 60 === 0 ? s / 60 + 'm' : s + 's');

// ---------------- Export-Modus ----------------
async function bootExport() {
  document.body.classList.add('export');
  const api = (window.exportAPI = { ready: false, error: null });
  try {
    const cfg = normalizeConfig(JSON.parse(params.get('cfg') || '{}'));
    const a = ASPECTS[cfg.video.aspect];
    const app = await createStage({ w: a.w, h: a.h }, { renderScale: videoSize(cfg.video).scale, exportMode: true });
    document.getElementById('stage').appendChild(app.canvas);
    installExportAPI(new Session(app).start(cfg));
    api.ready = true;
  } catch (e) {
    console.error(e);
    // Konfigurationsfehler (z. B. unbekanntes Szenario) als klare Meldung, alles andere mit Aufrufliste
    api.errorCode = (e && e.code) || null;
    api.error = api.errorCode ? e.message : String((e && e.stack) || e);
  }
}

// ---------------- Live-Modus ----------------
async function bootLive() {
  const $ = (id) => document.getElementById(id);
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('ebs.cfg') || '{}'); } catch { /* privat/blockiert */ }
  const fromUrl = {};
  for (const [k, v] of params) if (!RESERVED.includes(k)) fromUrl[k] = v;
  // Unbekanntes Szenario im Link oder in der gespeicherten Konfiguration: sichtbar melden, Standard-Szenario starten
  const notices = [];
  let initial, staleSaved = false;
  for (;;) {
    try { initial = mergeConfig(saved, fromUrl); break; } catch (e) {
      if (e.code !== 'UNKNOWN_SCENARIO') throw e;
      const fromLink = fromUrl.scenario !== undefined;
      notices.push(`${fromLink ? 'Der Link' : 'Die gespeicherte Konfiguration'} nennt das unbekannte Szenario „${e.scenario}“.`);
      if (fromLink) delete fromUrl.scenario; else { delete saved.scenario; staleSaved = true; }
    }
  }
  const a0 = ASPECTS[initial.video.aspect];
  const app = await createStage({ w: a0.w, h: a0.h }, { renderScale: 1 });
  $('stage').appendChild(app.canvas);
  const session = new Session(app, { renderScale: 1 }).start(initial);
  const cfg = () => session.cfg;
  const save = () => { try { localStorage.setItem('ebs.cfg', JSON.stringify(session.cfg)); } catch { /* egal */ } };
  if (notices.length) {
    const n = $('notice');
    n.textContent = `${notices.join(' ')} Gestartet wurde „${session.scenario.title}“. Verfügbar: ${[...scenarios.values()].map((s) => s.id).join(', ')}.`;
    n.hidden = false;
    if (staleSaved) save();   // veralteten Eintrag ersetzen, damit die Meldung nicht bei jedem Start wiederkommt
  }

  let running = !params.has('paused'), speed = 1, acc = 0, last = performance.now(), fpsN = 0, fpsT = last, fps = 0, uiT = 0;
  const fit = () => {
    const st = $('stage'), cs = getComputedStyle(st);
    const aw = st.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const ah = st.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const W = session.world.w, H = session.world.h, s = Math.min(aw / W, ah / H);
    app.canvas.style.width = Math.floor(W * s) + 'px'; app.canvas.style.height = Math.floor(H * s) + 'px';
  };
  window.addEventListener('resize', fit);
  const restart = (override) => {
    session.start(override ? mergeConfig(session.cfg, override) : session.cfg);
    acc = 0; fit(); save(); syncUi();
  };

  // ---- Szenario-Auswahl + Szenario-Regler (aus der Registrierung erzeugt)
  const scSel = $('scenario');
  for (const s of scenarios.values()) scSel.add(new Option(s.title, s.id));
  scSel.addEventListener('change', () => {
    const c = session.cfg;
    session.start({ scenario: scSel.value, seed: c.seed, video: c.video, view: c.view }); // neue Standardwerte des Szenarios
    acc = 0; fit(); save(); buildScenarioUi(); syncUi();
  });
  function buildScenarioUi() {
    const sc = session.scenario, box = $('scenarioControls');
    box.innerHTML = '';
    $('subtitle').textContent = `Szenario: ${sc.title} · deterministisch per Seed`;
    const checks = document.createElement('div'); checks.className = 'checks';
    for (const c of sc.controls) {
      const id = 'p-' + c.key;
      if (c.type === 'check') {
        const l = document.createElement('label');
        l.innerHTML = `<input type="checkbox" id="${id}"> ${c.label}`;
        checks.appendChild(l);
        l.firstChild.addEventListener('change', (e) => onParam(c, e.target.checked));
        continue;
      }
      const d = document.createElement('div'); d.className = 'ctl';
      d.innerHTML = `<label for="${id}">${c.label} <output id="o-${c.key}"></output></label>`;
      let el;
      if (c.type === 'select') {
        el = document.createElement('select');
        for (const [v, t] of c.options) el.add(new Option(t, v));
      } else {
        el = document.createElement('input'); el.type = 'range';
        Object.assign(el, { min: c.min, max: c.max, step: c.step });
      }
      el.id = id; d.appendChild(el); box.appendChild(d);
      el.addEventListener('input', () => {
        const v = +el.value;
        if (c.format) $('o-' + c.key).textContent = c.format(v);
        if (!c.restart) onParam(c, v);
      });
      el.addEventListener('change', () => { if (c.restart) onParam(c, +el.value); });
    }
    if (checks.children.length) box.appendChild(checks);
    buildVolumeUi();
    // Statistikzeilen
    const stats = $('stats');
    stats.querySelectorAll('.stat.sc').forEach((n) => n.remove());
    for (const s of sc.panelStats ? sc.panelStats(session.sim) : []) {
      const d = document.createElement('div'); d.className = 'stat sc';
      d.innerHTML = `<span>${s.label}</span><b id="stat-${s.key}">–</b>`;
      stats.appendChild(d);
    }
  }
  // ---- Lautstärke: Gesamtregler + je Klang der Klangtabelle (Prozent, nur für den Export; wirkt ohne Neustart)
  function buildVolumeUi() {
    const sc = session.scenario, box = $('volumeControls'), events = (sc.audio && sc.audio.events) || {};
    box.innerHTML = '';
    const row = (key, label) => {
      const d = document.createElement('div'); d.className = 'ctl';
      d.innerHTML = `<label for="vol-${key}">${label} <output id="vo-${key}"></output></label>`;
      const el = document.createElement('input');
      Object.assign(el, { type: 'range', id: 'vol-' + key, min: 0, max: 100, step: 5 });
      el.dataset.key = key;
      el.addEventListener('input', () => {
        session.cfg.video.volume[key] = +el.value; $('vo-' + key).textContent = el.value + ' %'; save();
      });
      d.appendChild(el); box.appendChild(d);
    };
    if (!sc.audio) return;
    row('master', 'Gesamtlautstärke');
    const sub = document.createElement('div'); sub.className = 'subhead'; sub.textContent = 'Einzelne Klänge';
    box.appendChild(sub);
    for (const [key, def] of Object.entries(events)) row(key, def.label || key);
  }
  function syncVolumeUi() {
    const c = session.cfg, hasAudio = !!session.scenario.audio, on = hasAudio && c.video.audio;
    $('volumeReset').hidden = !hasAudio;
    for (const el of $('volumeControls').querySelectorAll('input[type=range]')) {
      const v = c.video.volume[el.dataset.key] ?? 100;
      el.value = String(v); el.disabled = !on;
      el.closest('.ctl').classList.toggle('off', !on);
      $('vo-' + el.dataset.key).textContent = v + ' %';
    }
    $('btnVolumeReset').disabled = !on;
    $('audioHint').textContent = !hasAudio ? 'Dieses Szenario hat noch keinen Ton.'
      : on ? 'Die Vorschau ist stumm. Die Regler gelten für den Ton im exportierten Video, im Hoch- wie im Querformat.'
        : 'Ton ist ausgeschaltet – das Video wird ohne Tonspur exportiert.';
  }
  $('btnVolumeReset').addEventListener('click', () => {
    for (const k of Object.keys(session.cfg.video.volume)) session.cfg.video.volume[k] = 100;
    save(); syncVolumeUi();
  });

  function onParam(c, v) {
    if (c.restart) restart({ params: { [c.key]: v } });
    else { session.setParam(c.key, v); save(); }
  }

  // ---- allgemeine Regler
  const seg = (id, items, current, on) => {
    const box = $(id);
    box.innerHTML = '';
    for (const [v, label] of items) {
      const b = document.createElement('button'); b.dataset.v = String(v); b.textContent = label;
      b.addEventListener('click', () => { mark(); on(v); mark(v); });
      box.appendChild(b);
    }
    const mark = (v) => box.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(v)));
    mark(current);
    return mark;
  };
  // Die Zeitlupe steckt im Physik-Zeitschritt (cfg.video.tempo); speed beschleunigt nur die Vorschau zusätzlich
  const uiSpeed = () => (cfg().video.tempo < 1 ? cfg().video.tempo : speed);
  const markSpeed = seg('segSpeed', UI_SPEEDS.map((s) => [s, s + '×']), uiSpeed(), (v) => {
    const tempo = v < 1 ? v : 1;
    speed = v / tempo;
    if (cfg().video.tempo !== tempo) restart({ video: { tempo } });
  });
  const markAspect = seg('segFormat', UI_ASPECTS.map((k) => [k, `${ASPECTS[k].label} ${ASPECTS[k].w}×${ASPECTS[k].h}`]), cfg().video.aspect,
    (v) => { if (cfg().video.aspect !== v) restart({ video: { aspect: v } }); });
  // Auflösung und Bildrate des exportierten Videos (die Vorschau bleibt bei 1080p und der Bildrate des Bildschirms)
  const resSel = $('resolution');
  for (const [v, t] of Object.entries(EBS.RESOLUTIONS)) resSel.add(new Option(t, v));
  const showSize = () => { const vs = videoSize(cfg().video); $('resolutionOut').textContent = `${vs.width}×${vs.height}`; };
  resSel.addEventListener('change', () => { session.cfg.video.resolution = +resSel.value; save(); showSize(); });
  const markFps = seg('segFps', EBS.FPS_OPTIONS.map((f) => [f, f + ' fps']), cfg().video.fps, (v) => { session.cfg.video.fps = v; save(); });
  // Videolänge: freie Eingabe (1 s bis 4 h) plus Schnellwahl; beide zeigen stets den Wert der Konfiguration
  const dur = $('duration'), durText = $('durationText'), durHint = $('durationHint'), DUR_HINT = durHint.textContent;
  dur.add(new Option('Eigene Dauer', ''));
  for (const [v, t] of UI_DURATIONS) dur.add(new Option(t, v));
  const showDuration = (note, isError) => {
    const d = cfg().video.durationSec;
    if (!isError) durText.value = fmtDuration(d);
    durText.classList.toggle('bad', !!isError);
    $('durationOut').textContent = fmtTime(d);
    dur.value = UI_DURATIONS.some(([v]) => v === d) ? String(d) : '';
    durHint.textContent = note || DUR_HINT; durHint.classList.toggle('err', !!isError);
  };
  const setDuration = (sec, note) => { session.cfg.video.durationSec = sec; save(); showDuration(note); };
  dur.addEventListener('change', () => { if (dur.value) setDuration(+dur.value); else showDuration(); });
  durText.addEventListener('change', () => {
    const sec = parseDuration(durText.value);
    if (sec === null) {
      showDuration(`„${durText.value}“ ist keine gültige Dauer (Beispiele: 45, 45s, 5m, 1h). Es gilt weiterhin ${fmtDuration(cfg().video.durationSec)}.`, true);
      return;
    }
    const ok = Math.min(EBS.MAX_DURATION, sec);
    setDuration(ok, ok !== sec ? `Auf ${fmtDuration(ok)} begrenzt – erlaubt sind 1 s bis 4 h.` : '');
  });
  $('seed').addEventListener('change', () => restart({ seed: Math.abs(Math.floor(+$('seed').value || 0)) }));
  $('btnSeed').addEventListener('click', () => restart({ seed: Math.floor(Math.random() * 1e6) }));
  for (const k of ['hud', 'camera']) $(k).addEventListener('change', () => { session.setView(k, $(k).checked); save(); });
  $('audio').addEventListener('change', () => { session.cfg.video.audio = $('audio').checked; save(); syncVolumeUi(); });
  const playBtn = $('btnPlay');
  const setRun = (r) => { running = r; playBtn.textContent = r ? '⏸ Pause' : '▶ Start'; };
  setRun(running);
  playBtn.addEventListener('click', () => setRun(!running));
  $('btnRestart').addEventListener('click', () => restart());

  function syncUi() {
    const c = session.cfg;
    scSel.value = c.scenario; $('seed').value = c.seed;
    for (const ctl of session.scenario.controls) {
      const el = $('p-' + ctl.key), v = c.params[ctl.key];
      if (!el) continue;
      if (ctl.type === 'check') el.checked = !!v; else el.value = String(v);
      const o = $('o-' + ctl.key);
      if (o && ctl.format) o.textContent = ctl.format(+v);
    }
    $('hud').checked = c.view.hud; $('camera').checked = c.view.camera;
    // Ton gibt es nur für Szenarien mit Klangtabelle; die Vorschau selbst bleibt stumm
    const hasAudio = !!session.scenario.audio;
    $('audio').checked = hasAudio && c.video.audio; $('audio').disabled = !hasAudio;
    $('audioLabel').title = hasAudio ? 'Die Vorschau ist stumm; der Ton entsteht beim Export.' : 'Dieses Szenario hat noch keinen Ton.';
    syncVolumeUi();
    markAspect(c.video.aspect); markSpeed(uiSpeed());
    resSel.value = String(c.video.resolution); markFps(c.video.fps); showSize();
    showDuration();
  }
  buildScenarioUi(); syncUi(); fit();

  // ---- Export über den lokalen Server
  const msg = $('exportMsg'), bar = $('exportBar'), barIn = bar.firstElementChild, ctl = $('exportCtl'), btnExp = $('btnExport');
  const cliCmd = () => {
    const c = session.cfg;
    const p = Object.entries(c.params).map(([k, v]) => `--param ${k}=${v}`).join(' ');
    const vol = c.video.audio ? Object.entries(c.video.volume).filter(([, v]) => v !== 100).map(([k, v]) => ` --volume ${k}=${v}`).join('') : '';
    return `npm run export -- --scenario ${c.scenario} --seed ${c.seed} --aspect ${c.video.aspect} --resolution ${c.video.resolution} --fps ${c.video.fps} --duration ${c.video.durationSec}${c.video.tempo !== 1 ? ' --tempo ' + c.video.tempo : ''} ${p}${c.view.hud ? '' : ' --no-hud'}${c.view.camera ? '' : ' --no-camera'}${c.video.audio ? vol : ' --no-audio'}`;
  };
  // Gibt es den lokalen Export-Server? (null = noch unbekannt; false z. B. beim Öffnen als Datei oder über GitHub Pages)
  let hasServer = location.protocol === 'file:' ? false : null;
  const showOffline = () => {
    btnExp.textContent = '⬇ Export nur am eigenen PC – Befehl anzeigen';
    const h = $('exportHint');
    h.textContent = 'Vorschau ohne Export-Server: Regler und Vorschau funktionieren hier, das Video entsteht am eigenen PC (Node.js, Chromium, FFmpeg). Einstellungen per Link oder JSON mitnehmen.';
    h.hidden = false;
  };
  if (hasServer === false) showOffline();
  else fetch('/api/health').then((r) => r.json()).then((j) => { hasServer = !!(j && j.ok); }).catch(() => { hasServer = false; }).then(() => { if (!hasServer) showOffline(); });
  let polling = null;
  const showStatus = (s) => {
    if (!s || s.state === 'idle') return;
    bar.hidden = false; barIn.style.width = ((s.progress || 0) * 100).toFixed(1) + '%';
    ctl.hidden = s.state !== 'running'; btnExp.disabled = s.state === 'running';
    msg.classList.toggle('err', s.state === 'error');
    if (s.state === 'running') {
      msg.textContent = s.frame
        ? `Rendere Frame ${fmtInt(s.frame)} / ${fmtInt(s.totalFrames || 0)} · ${(s.renderFps || 0).toFixed(1)} fps · Rest ca. ${fmtTime(s.etaSec || 0)}`
        : 'Starte Renderer …';
    } else if (s.state === 'done') {
      const r = s.result || {};
      msg.innerHTML = `✅ Fertig: <a href="${s.url}" target="_blank">${s.file}</a><br>${r.width}×${r.height}, ${r.fps} fps, ${(+r.duration).toFixed(2)} s, ${fmtInt(r.frames)} Frames`;
    } else if (s.state === 'cancelled') msg.textContent = 'Export abgebrochen.';
    else if (s.state === 'error') msg.textContent = 'Fehler: ' + s.error;
    if (s.state !== 'running' && polling) { clearInterval(polling); polling = null; }
  };
  const poll = async () => { try { showStatus(await (await fetch('/api/export')).json()); } catch { /* Server weg */ } };
  btnExp.addEventListener('click', async () => {
    msg.classList.remove('err');
    if (hasServer === false) {
      msg.innerHTML = `Der Export läuft am eigenen PC. Im Projektordner <code>start.bat</code> doppelklicken (oder <code>npm start</code>) und <code>http://localhost:8080</code> öffnen.\nOder direkt per Kommandozeile:\n<code>${cliCmd()}</code>`;
      return;
    }
    try {
      const res = await fetch('/api/export', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(session.cfg) });
      const s = await res.json();
      if (!res.ok) throw new Error(s.error || res.statusText);
      showStatus(s);
      if (!polling) polling = setInterval(poll, 1000);
    } catch (e) {
      msg.classList.add('err');
      msg.innerHTML = `Export-Server nicht erreichbar (${e.message}). Starte <code>npm start</code> oder nutze:\n<code>${cliCmd()}</code>`;
    }
  });
  $('btnCancel').addEventListener('click', () => fetch('/api/export/cancel', { method: 'POST' }).then(poll));
  if (location.protocol !== 'file:') {
    fetch('/api/export').then((r) => r.json()).then((s) => { showStatus(s); if (s.state === 'running') polling = setInterval(poll, 1000); }).catch(() => {});
  }

  // ---- Einstellungen teilen: Link mit allen Werten, JSON speichern und laden
  const shareUrl = () => {
    const c = session.cfg, q = new URLSearchParams();
    const put = (k, v) => q.set(k, String(v));
    put('scenario', c.scenario); put('seed', c.seed);
    for (const [k, v] of Object.entries(c.params)) put(k, v);
    for (const k of ['aspect', 'resolution', 'fps', 'durationSec', 'tempo', 'audio']) put(k, c.video[k]);
    for (const [k, v] of Object.entries(c.video.volume)) put(EBS.VOLUME_PREFIX + k, v);
    put('hud', c.view.hud); put('camera', c.view.camera);
    return location.href.split(/[?#]/)[0] + '?' + q.toString();
  };
  const shareMsg = $('shareMsg');
  const sayShare = (text, isError) => { shareMsg.textContent = text; shareMsg.classList.toggle('err', !!isError); };
  $('btnCopy').addEventListener('click', async () => {
    const link = $('shareLink'); link.value = shareUrl(); link.select();
    try { await navigator.clipboard.writeText(link.value); sayShare('Link kopiert.'); }
    catch { sayShare('Link ist markiert – bitte mit Strg+C bzw. „Kopieren“ übernehmen.'); }
  });
  $('btnSaveCfg').addEventListener('click', () => {
    const c = session.cfg, a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(c, null, 2) + '\n'], { type: 'application/json' }));
    a.download = `${c.scenario}_seed${c.seed}_${c.video.aspect.replace(':', 'x')}.json`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    sayShare(`Gespeichert als ${a.download}.`);
  });
  $('btnLoadCfg').addEventListener('click', () => $('cfgFile').click());
  $('cfgFile').addEventListener('change', async () => {
    const file = $('cfgFile').files[0];
    $('cfgFile').value = '';
    if (!file) return;
    try {
      const j = JSON.parse(await file.text());
      // sowohl gespeicherte Einstellungen als auch die JSON-Datei neben einem Video ("config") werden akzeptiert
      session.start(normalizeConfig(j && typeof j.config === 'object' && j.config ? j.config : j));
      acc = 0; fit(); save(); buildScenarioUi(); syncUi();
      sayShare(`Einstellungen aus ${file.name} geladen.`);
    } catch (e) { sayShare(`${file.name} konnte nicht geladen werden: ${e.message}`, true); }
  });
  const refreshShare = () => { const l = $('shareLink'); if (document.activeElement !== l) l.value = shareUrl(); };
  refreshShare();

  // ---- Hauptschleife: feste Physikschritte, Rendering entkoppelt
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (running) {
      acc += dt * speed;
      let n = 0;
      while (acc >= DT && n < 40 * speed) { session.step(); acc -= DT; n++; }
      if (n >= 40 * speed) acc = 0;
    }
    session.render();
    fpsN++;
    if (now - fpsT > 500) { fps = (fpsN * 1000) / (now - fpsT); fpsN = 0; fpsT = now; }
    if (now - uiT > 250) {
      uiT = now;
      $('sFps').textContent = fps.toFixed(0); $('sTime').textContent = fmtTime(session.sim.t);
      const sc = session.scenario;
      if (sc.panelStats) for (const s of sc.panelStats(session.sim)) { const el = $('stat-' + s.key); if (el) el.textContent = s.value; }
      $('scenarioNote').textContent = sc.panelNote ? sc.panelNote(session.sim) : '';
      refreshShare();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  EBS.app = {
    get session() { return session; }, get sim() { return session.sim; }, get cfg() { return session.cfg; },
    restart, setSpeed: (v) => { speed = v; }, setRunning: setRun,
  };
}

(EXPORT ? bootExport() : bootLive()).catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f88;padding:16px">${(e && e.stack) || e}</pre>`);
});
})();
