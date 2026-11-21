// Scrap Wars · Short (R40, S1–S3): Darstellung ohne Kopfleiste, Einstiegstext, Sieger groß, Seek-Bild mit Zeitlupe,
// Casting-Seeds im Browser, Schalter. Die Simulation des Shorts prüft test/scrap-v4.test.mjs.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INDEX, ROOT, launchBrowser, openExportPage } from '../lib/browser.mjs';
import { exportVideo, verifyResult } from '../lib/exporter.mjs';
import { castSeeds, judge } from '../scripts/scrap-short-casting.mjs';

const dir = mkdtempSync(join(tmpdir(), 'ebs-scrap-short-'));
let browser;
before(async () => { browser = await launchBrowser({ gpu: process.env.EBS_GPU === '1' }); });
after(async () => { await browser?.close(); rmSync(dir, { recursive: true, force: true }); });
const SHORT = { rulesVersion: 'v4', arena: 'sunshine', layout: 'short' };

test('Scrap-Short: kein Text am Rand, keine Kopfleiste, Einstiegstext 2,5 s, Sieger groß ohne „NEXT ROUND“', async () => {
  const { page, errors } = await openExportPage(browser, { scenario: 'scrap', seed: 42, video: { resolution: 720 } });
  try {
    const result = await page.evaluate(params => {
      const cfg = EBS.normalizeConfig({ scenario: 'scrap', seed: 42, params, video: { aspect: '9:16', resolution: 720 }, view: { hud: true, camera: false } });
      const world = { w: 1080, h: 1920 }, sc = EBS.getScenario('scrap');
      const sim = sc.create({ seed: 42, params: cfg.params, world, view: cfg.view, timeScale: 1 });
      const renderer = sc.createRenderer({ sim, world, view: cfg.view, renderScale: 2 / 3 });
      const proto = CanvasRenderingContext2D.prototype, fill = proto.fillText, stroke = proto.strokeText;
      // Jede Schrift mit ihrer Lage im Bild (Anteil der Bildhöhe), samt halber Schrifthöhe
      const shot = () => {
        const words = [];
        const note = function (value, x, y) {
          const m = this.getTransform(), size = parseFloat(this.font.match(/([\d.]+)px/)[1]) * Math.hypot(m.b, m.d);
          const py = m.b * x + m.d * y + m.f;
          words.push({ text: String(value), top: (py - size / 2) / this.canvas.height, bottom: (py + size / 2) / this.canvas.height });
        };
        try {
          proto.fillText = function (...a) { note.apply(this, a); return fill.apply(this, a); };
          proto.strokeText = function (...a) { note.apply(this, a); return stroke.apply(this, a); };
          renderer.draw();
        } finally { proto.fillText = fill; proto.strokeText = stroke; }
        // Randstreifen: oben 8 %, unten 19 % bleiben einfarbig (eine Zeile Abstand für die Kantenglättung)
        const c = renderer.canvas, g = c.getContext('2d'), plain = (y0, y1) => {
          const d = g.getImageData(0, y0, c.width, y1 - y0).data;
          for (let i = 4; i < d.length; i += 4) if (d[i] !== d[0] || d[i + 1] !== d[1] || d[i + 2] !== d[2]) return false;
          return true;
        };
        return { step: sim.step, phase: sim.phase, words, top: plain(0, Math.floor(c.height * .08) - 1), bottom: plain(Math.ceil(c.height * .81) + 1, c.height) };
      };
      const out = { layout: { ...renderer.layout }, shots: [], labelWidth: renderer.arena._labelLayout(sim.roundSim.robots, 540, 700, 1.4)[0].width };
      for (const step of [6, 60, 144, 156, 600]) { while (sim.step < step) sim.stepOnce(); out.shots.push(shot()); }
      while (sim.phase === 'running') sim.stepOnce();
      const end = sim.step, hash = sim.stateHash();
      // 0,1 s nach dem letzten K.o. läuft noch die Zeitlupe (Sieger erst ab 0,3 s), danach steht er groß im Bild
      for (const step of [end + 6, end + 60, end + 149]) { while (sim.step < step) sim.stepOnce(); out.shots.push(shot()); }
      out.winner = sim.roundSim.robots[sim.roundSim.winner].name; out.readOnly = hash !== undefined && sim.checkInvariants().ok;
      renderer.destroy(); sim.destroy(); return out;
    }, SHORT);
    assert.equal(result.layout.short, true);
    assert.ok(Math.abs(result.layout.y / 1920 - .08) < 1e-9 && Math.abs((result.layout.y + result.layout.height) / 1920 - .81) < .002);
    assert.ok(Math.abs(result.labelWidth - 58 * 1.4) < 1e-9, 'Schilder 1,4-fach');
    const texts = s => s.words.map(w => w.text), banned = /SCRAP WARS|ROUND|NEXT|COMPLETE|KNOCKED|WOOD|STONE|CONCRETE|★/;
    for (const s of result.shots) {
      assert.ok(s.top && s.bottom, `Schritt ${s.step}: Randstreifen nicht frei`);
      assert.ok(s.words.every(w => w.top >= .08 && w.bottom <= .81), `Schritt ${s.step}: Text am Rand ${JSON.stringify(s.words.filter(w => w.top < .08 || w.bottom > .81))}`);
      assert.ok(texts(s).every(t => !banned.test(t)), `Schritt ${s.step}: ${texts(s).join(' | ')}`);
    }
    const [early, mid, late, gone, fight, blast, hold, last] = result.shots;
    for (const s of [early, mid, late]) {
      assert.ok(texts(s).includes('4 BOTS · 1 SURVIVOR') && texts(s).includes('PICK YOUR COLOR'), `Schritt ${s.step}`);
      const head = s.words.find(w => w.text === '4 BOTS · 1 SURVIVOR'), sub = s.words.find(w => w.text === 'PICK YOUR COLOR');
      assert.ok(Math.abs((head.top + head.bottom) / 2 - .22) < 1e-6 && sub.top > head.top, 'Einstiegstext bei 22 % Höhe, zweite Zeile darunter');
    }
    for (const s of [gone, fight, blast]) assert.ok(!texts(s).some(t => /BOTS|PICK|WINS/.test(t)), `Schritt ${s.step}: ${texts(s).join(' | ')}`);
    for (const s of [blast, hold, last]) assert.equal(s.phase, 'outro');
    for (const s of [hold, last]) {
      const big = s.words.filter(w => w.text === `${result.winner} WINS`);
      assert.ok(big.length >= 1, `Schritt ${s.step}: Sieger fehlt`);
      assert.ok(big[0].bottom - big[0].top > .05, 'Sieger groß (über 5 % der Bildhöhe)');
    }
    assert.ok(result.readOnly);
    assert.deepEqual(errors.map(e => e.message), []);
  } finally { await page.close(); }
});

test('Scrap-Short: Bild nach Seek entspricht laufendem Zeichnen (Einstieg, Kampf, Abspann)', async () => {
  const { page, errors } = await openExportPage(browser, { scenario: 'scrap', seed: 42, video: { resolution: 720 } });
  try {
    const results = await page.evaluate(params => {
      const cfg = EBS.normalizeConfig({ scenario: 'scrap', seed: 42, params, video: { aspect: '9:16', resolution: 720 }, view: { hud: true, camera: false } });
      const world = { w: 1080, h: 1920 }, sc = EBS.getScenario('scrap');
      const create = () => {
        const sim = sc.create({ seed: 42, params: cfg.params, world, view: cfg.view, timeScale: 1 });
        return { sim, renderer: sc.createRenderer({ sim, world, view: cfg.view, renderScale: 2 / 3 }) };
      };
      const probe = create(), drop = probe.sim.roundSim.supply[0].at * 60;
      while (probe.sim.phase === 'running' && probe.sim.step < 91 * 60) probe.sim.stepOnce();
      if (probe.sim.phase !== 'outro') throw Error('Short endet nicht im Abspann');
      const end = probe.sim.step, slow = probe.sim.slow.startStep, even = v => Math.ceil(v / 2) * 2;
      const blast = probe.sim.events.find(e => e.type === 'blast')?.step ?? probe.sim.events.find(e => e.type === 'hit').step;
      const crate = probe.sim.events.find(e => e.type === 'crate_break').step;
      probe.renderer.destroy(); probe.sim.destroy();
      const out = [];
      // Einstiegstext beim Ein- und Ausblenden, Bretter beim Ausblenden, Waffe im Fall und kurz nach der Landung,
      // frische Explosion, Zeitlupe vor und nach dem letzten K.o., Sieger beim Einblenden und im Stand
      for (const target of [6, 144, even(crate + 84), even(drop - 10), even(drop + 8), even(blast + 6), even(slow + 10), even(end + 6), even(end + 26), even(end + 90)]) {
        const continuous = create(), start = Math.max(0, target - 60);
        while (continuous.sim.step < start) continuous.sim.stepOnce();
        let frame;
        while (continuous.sim.step < target) {
          continuous.sim.stepOnce();
          if (continuous.sim.step % 2 === 0) { continuous.renderer.draw(); frame = continuous.renderer.canvas.toDataURL(); }
        }
        const sought = create();
        while (sought.sim.step < target) sought.sim.stepOnce();
        const events = JSON.stringify(sought.sim.events), hash = sought.sim.stateHash();
        sought.renderer.draw();
        out.push({ target, samePixels: frame === sought.renderer.canvas.toDataURL(),
          sameState: continuous.sim.stateHash() === hash && sought.sim.stateHash() === hash,
          readOnlyEvents: events === JSON.stringify(sought.sim.events), ok: sought.sim.checkInvariants().ok });
        for (const x of [continuous, sought]) { x.renderer.destroy(); x.sim.destroy(); }
      }
      return out;
    }, SHORT);
    assert.equal(results.length, 10);
    for (const r of results) assert.ok(r.samePixels && r.sameState && r.readOnlyEvents && r.ok, JSON.stringify(r));
    assert.deepEqual(errors.map(e => e.message), []);
  } finally { await page.close(); }
});

test('Scrap-Short: Bretter der Startkisten blenden nach 1 bis 1,8 s aus, Waffen fallen sichtbar vom Himmel; ohne Short bleiben die Bretter liegen', async () => {
  const { page, errors } = await openExportPage(browser, { scenario: 'scrap', seed: 42, video: { resolution: 720 } });
  try {
    const out = await page.evaluate(params => {
      const world = { w: 1080, h: 1920 }, sc = EBS.getScenario('scrap'), view = { hud: true, camera: false };
      const run = p => {
        const sim = sc.create({ seed: 42, params: p, world, view, timeScale: 1 }), renderer = sc.createRenderer({ sim, world, view, renderScale: 2 / 3 });
        const planks = () => renderer._fxScene(q => q, sim.roundSim.robots).debris.filter(d => d.kind === 'plank');
        const first = sim.roundSim.crates.reduce((a, c) => Math.min(a, c.openAt), 99), last = sim.roundSim.crates.reduce((a, c) => Math.max(a, c.openAt), 0);
        // Fallende Waffe (Alter unter 0): Jeder solche Schritt wird gezeichnet, ohne Fehler
        let fallSteps = 0, drawn = 0;
        const at = sec => {
          while (sim.step < Math.round(sec * 60)) {
            sim.stepOnce();
            if (sim.roundSim.pickups.some(q => q.sky && q.age < 0)) { fallSteps++; renderer.draw(); drawn++; }
          }
          return planks();
        };
        const fresh = at(first + .5), fading = at(first + 1.4).filter(d => d.alpha !== undefined), late = at(last + 4);
        const result = { fresh: fresh.length, freshAlpha: fresh.filter(d => d.alpha !== undefined).length, fading: fading.map(d => d.alpha), late: late.length, fallSteps, drawn, ok: sim.checkInvariants().ok };
        renderer.destroy(); sim.destroy(); return result;
      };
      return { short: run(params), plain: run({ ...params, layout: 'standard' }) };
    }, SHORT);
    assert.ok(out.short.fresh >= 9 && out.short.freshAlpha === 0, 'frische Bretter deckend');
    assert.ok(out.short.fading.length >= 9 && out.short.fading.every(a => a > 0 && a < 1), JSON.stringify(out.short.fading));
    assert.equal(out.short.late, 0, 'nach dem letzten Ausbruch bleibt kein Brett liegen');
    assert.ok(out.short.fallSteps > 50 && out.short.drawn === out.short.fallSteps && out.short.ok);
    assert.deepEqual([out.plain.late, out.plain.fading.length, out.plain.fallSteps], [36, 0, 0], 'ohne Short: 36 Bretter bleiben, nichts fällt');
    assert.deepEqual(errors.map(e => e.message), []);
  } finally { await page.close(); }
});

test('Scrap-Short: alle Casting-Seeds halten in Chromium den Bogen ein, und es gewinnt nicht der zuerst Bewaffnete', async () => {
  const { page, errors } = await openExportPage(browser, { scenario: 'scrap', seed: 1, video: { aspect: '9:16', resolution: 720 } });
  try {
    await page.addScriptTag({ content: `window.castSeeds = ${castSeeds.toString()};` });
    const { rows, picks } = await page.evaluate(() => ({ rows: window.castSeeds(EBS, EBS.Scrap.SHORT_SEEDS),
      picks: [1, 42, 84, 85, 1189, 99999].map(seed => EBS.Scrap.castSeed(seed)) }));
    assert.ok(rows.length >= 10, `${rows.length} geprüfte Seeds`);
    for (const r of rows.map(judge)) assert.ok(r.complete && r.underdog, `Seed ${r.seed}: ${JSON.stringify({ checks: r.checks, kos: r.kos, duel: r.duel, length: r.length, winner: r.winner, armed: r.armed })}`);
    // Die Vorlage nimmt den nächsten geprüften Seed ab dem gewünschten, am Ende der Liste wieder den ersten
    assert.deepEqual(picks, [8, 84, 84, 92, 1189, 8]);
    assert.deepEqual(errors.map(e => e.message), []);
  } finally { await page.close(); }
});

test('Scrap-Short-Vorlage (S3): Casting-Seed, Länge aus der Vorplanung, Export der letzten zwei Sekunden mit Sieger', async () => {
  const preset = JSON.parse(readFileSync(join(ROOT, 'presets', 'production', 'scrap-short.json'), 'utf8'));
  assert.deepEqual([preset.seed, preset.params.layout, preset.params.rulesVersion, preset.params.arena, preset.video.aspect], [84, 'short', 'v4', 'sunshine', '9:16']);
  // Länge wie in der Oberfläche vorab geplant: Sieg + 2,5 s Abspann, im Zielbereich 26–38 s
  const { page, errors } = await openExportPage(browser, preset);
  let planned;
  try {
    planned = await page.evaluate(() => { let p; do p = exportAPI.planEpisode(); while (!p.done); return { sec: p.durationSec, natural: exportAPI.info().naturalDuration }; });
    assert.equal(planned.natural, true); assert.ok(planned.sec >= 26 && planned.sec <= 38, String(planned.sec));
    assert.deepEqual(errors.map(e => e.message), []);
  } finally { await page.close(); }
  // Echter Exportweg, nur die letzten zwei Sekunden (720p, ohne Ton): Die Episode läuft bis zum Ende durch.
  const r = await exportVideo({ ...preset, video: { ...preset.video, durationSec: 1, resolution: 720, audio: false } },
    { out: join(dir, 'short-ende.mp4'), gpu: false, encoder: { preset: 'ultrafast' }, clip: { startSec: planned.sec - 2, durationSec: 2 } });
  assert.deepEqual(verifyResult(r), []);
  assert.equal(r.cfg.video.durationSec, planned.sec); assert.equal(r.frames, 60);
  assert.deepEqual([r.width, r.height, r.snapshot.phase, r.snapshot.completedRounds, r.snapshot.round], [720, 1280, 'ended', 1, 1]);
  assert.ok(r.snapshot.winner !== null);
});

test('Scrap-Short: deutscher Schalter „Bildaufbau“, nur Taktik-Arena auf Sunny Yard; hochkant endet das Video von selbst', async t => {
  const ctx = await browser.newContext(); t.after(() => ctx.close());
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(pathToFileURL(INDEX).href + '?scenario=scrap&seed=42&paused=1&aspect=9:16');
  await page.waitForFunction(() => window.EBS?.app?.sim);
  // Ohne Angabe: normales Bild, in der Episode fehlt der Schlüssel (gleiche Zustands-Hashes wie bisher)
  assert.equal(await page.evaluate(() => EBS.app.cfg.params.layout), 'standard');
  assert.equal(await page.evaluate(() => 'layout' in EBS.app.sim.cfg), false);
  assert.deepEqual(await page.locator('#p-layout option').allTextContents(),
    ['Normal · Kopfleiste, ganze Arena', 'Short · kleine Karte, ohne Kopfleiste, eine Runde (nur Hochformat)']);
  assert.equal(await page.isDisabled('#p-layout'), true, 'ohne Taktik-Arena auf Sunny Yard gesperrt');
  // Erst die Regeln, dann die Karte: Auf Sunny Yard ist die Regelwahl ohne Taktik-Arena gesperrt.
  await page.selectOption('#p-rulesVersion', 'v4'); await page.selectOption('#p-arena', 'sunshine');
  assert.equal(await page.isDisabled('#p-layout'), false);
  await page.selectOption('#p-layout', 'short');
  await page.waitForFunction(() => EBS.app.sim.short === true && document.querySelector('#durationOut').textContent !== '…');
  assert.equal(await page.isDisabled('#durationText'), true);
  assert.match(await page.textContent('#durationHint'), /eine Runde bis zum Sieg und 2,5 Sekunden Abspann/);
  const sec = await page.evaluate(() => EBS.app.cfg.video.durationSec);
  assert.ok(sec > 10 && sec < 95, String(sec));
  // Andere Karte: Schalter fällt auf normal zurück, die Länge ist wieder frei wählbar
  await page.selectOption('#p-arena', 'yard');
  assert.equal(await page.evaluate(() => EBS.app.cfg.params.layout), 'standard');
  assert.equal(await page.isDisabled('#durationText'), false);
  assert.deepEqual(errors, []);
});
