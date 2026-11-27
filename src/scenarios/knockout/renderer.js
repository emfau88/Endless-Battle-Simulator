/* Marble Knockout · Bild (R43/M5)
 *
 * Painter zeichnet ein Bild aus dem Zustand der Simulation: feste Teile aus einer Textur je Bahn, darüber bewegte
 * Elemente, Murmeln, Zulaufrinnen „vorn“, Ziel und die Texte. Alle Zeiten für Einblendungen kommen aus dem Zustand
 * (Phasenzeit, Zeitpunkt der Ereignisse), nichts hängt an der Zahl gezeichneter Bilder.
 */
(function (global) {
  'use strict';
  const EBS = global.EBS;
  const A = EBS.KnockoutArt;
  const TAU = Math.PI * 2;
  const fade = (age, inn, hold, out) => (age < 0 ? 0 : age < inn ? age / inn : age < inn + hold ? 1 : age < inn + hold + out ? 1 - (age - inn - hold) / out : 0);

  class Painter {
    constructor(sim, scale = 1) { this.sim = sim; this.scale = scale; this.cache = null; this.front = null; this.key = ''; this.hud = true; }
    setSim(sim) { this.sim = sim; this.key = ''; }

    /** Feste Teile hinter (back) und vor (front) den Murmeln, je Bahn einmal gezeichnet. Inhalt hängt nur an der Bahn. */
    layers() {
      const sim = this.sim, key = `${sim.stageNo}|${sim.galleryIndex}|${sim.stageSeedValue}|${sim.galleryStart}|${this.scale}`;
      if (key === this.key && this.cache) return this;
      const w = Math.round(sim.W * this.scale), h = Math.round(sim.H * this.scale);
      const c = this.cache || document.createElement('canvas'), f = this.front || document.createElement('canvas');
      c.width = w; c.height = h; f.width = w; f.height = h;
      const g = c.getContext('2d'); g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
      A.paintStatic(g, sim, sim.stage, (sim.spec && sim.spec.world) || 'petrol');
      const q = f.getContext('2d'); q.setTransform(this.scale, 0, 0, this.scale, 0, 0);
      A.paintFront(q, sim, sim.stage);
      this.cache = c; this.front = f; this.key = key; return this;
    }

    paint(g) {
      const sim = this.sim, st = sim.stage, W = sim.W, H = sim.H, rt = sim.world.t, r = sim.r;
      // Zeitlupe wirkt nur im Rennen (danach läuft die Physik wieder in normalem Tempo)
      const L = this.layers(), rate = sim.phase === 'race' && sim.slowAt ? sim.slowAt(sim.t) : 1;
      g.drawImage(L.cache, 0, 0, W, H);
      if (st.finish) A.finishLine(g, st.finish, sim.T);
      for (const el of st.elements) A.drawElement(g, el, sim, rt, sim.t);
      // Murmeln: Klappe unter Ausgeschiedenen, Spuren, dann die Murmeln (Führende zuletzt, damit sie oben liegt)
      const runners = sim.runners || [];
      for (const u of runners) if (u.hatchT >= 0) A.hatch(g, u.hx, u.hy, sim.t - u.hatchT, r);
      for (const u of runners) {
        const m = u.pm, M = sim.roster[u.rid];
        if (m.active && M && m.collide) A.trail(g, m.x, m.y, m.vx, m.vy, r, M.color, rate);
        if (u.nudgeT >= 0) A.shake(g, u.nx, u.ny, sim.t - u.nudgeT, r);
      }
      const racing = sim.phase === 'race' && !sim.final;
      const order = runners.slice().sort((a, b) => (b.rank || 0) - (a.rank || 0));
      for (const u of order) {
        const m = u.pm, M = sim.roster[u.rid];
        if (!m.active || !M) continue;
        if (m.y < -3 * r || m.y > H + 3 * r) continue;
        const lead = sim.mode !== 'gallery' && sim.phase === 'race' && sim.leader === u.rid && !u.out;
        const danger = racing && sim.lastPlace === u.rid && sim.needOut > sim.outHere ? 0.75 + 0.25 * Math.sin(sim.t * TAU * 1.6) : 0;
        A.marble(g, m.x, m.y, r, M.name, M.color, m.a, { crown: lead && sim.cfg.marks !== 'off', danger: sim.cfg.marks !== 'off' ? danger : 0, noShadow: !m.collide });
      }
      // Kleines Glitzern an der Ziellinie für jede Murmel, die gerade durch ist (Bahnzeit des Zieldurchgangs)
      if (st.finish) for (const u of runners) if (u.finished && u.place < 500) A.glitter(g, st.finish, rt - u.finishT, u.rid);
      g.drawImage(L.front, 0, 0, W, H);
      if (rate < 1) this.slowmo(g, rate);
      this.overlay(g);
    }

    /** Zeitlupe: weicher dunkler Rand, im Langvideo dazu klein `SLOW MOTION` oben in der Mitte. */
    slowmo(g, rate) {
      const sim = this.sim, W = sim.W, H = sim.H, k = Math.min(1, (1 - rate) / 0.65);
      const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.hypot(W, H) * 0.6);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${(0.42 * k).toFixed(3)})`);
      g.fillStyle = v; g.fillRect(0, 0, W, H);
      if (this.hud && sim.format !== 'short') A.text(g, 'SLOW MOTION', W / 2, 84, 30, { align: 'center', weight: 900, spacing: 6, alpha: 0.9 * k, color: '#fff3c4' });
    }

    overlay(g) {
      const sim = this.sim, W = sim.W, H = sim.H, short = sim.format === 'short';
      if (!this.hud) return;
      if (sim.mode === 'gallery') {
        A.text(g, sim.spec.title, W / 2, short ? 170 : 92, short ? 64 : 52, { align: 'center', weight: 900, spacing: 2 });
        return;
      }
      if (sim.cfg.display === 'off') return;
      // Einzelne Bahn: ihre Nummer im ganzen Rennen (nicht 1/1)
      const one = sim.mode === 'stage', n = one ? sim.stageSpecs().length : sim.list.length, no = (one ? sim.cfg.stage | 0 : sim.stageNo) + 1;
      const title = sim.spec.title, alive = sim.roster.filter((m) => m.alive).length;
      if (!short) {
        // Anzeige oben links und rechts, Röhre OUT rechts
        if (sim.phase !== 'podium' && sim.phase !== 'end') {
          A.text(g, sim.final ? 'GRAND FINAL' : `STAGE ${no}/${n}`, 56, 80, 46, { weight: 900, spacing: 1 });
          A.text(g, sim.final ? 'FOR GOLD, SILVER AND BRONZE' : sim.safe ? 'SAFE STAGE · NOBODY IS OUT' : title, 58, 122, 28, { weight: 800, spacing: 3, color: A.S.sub });
          A.text(g, `${alive} LEFT`, sim.mode === 'race' ? 1790 : 1886, 80, 46, { weight: 900, align: 'right', spacing: 1 });
        }
        if (sim.mode === 'race') A.outTube(g, sim, 1856, 178, 1012, 56);
        // Einstieg und Bahntitel
        if (sim.phase === 'intro') this.card(g, ['12 MARBLES. 10 STAGES.', 'THE LAST ONE IS OUT.'], fade(sim.phaseT, 0.4, 2.8, 0.5));
        if (sim.phase === 'ready') this.card(g, [sim.final ? 'GRAND FINAL' : `STAGE ${no}`, sim.final ? '3 MARBLES. ONE CROWN.' : title], fade(sim.phaseT, 0.2, sim.R.ready - 0.2, 0.4), true);
        if (sim.phase === 'race' && sim.world.t - sim.raceStart < 0.6) this.card(g, [sim.final ? 'GRAND FINAL' : `STAGE ${no}`, sim.final ? '3 MARBLES. ONE CROWN.' : title], 1 - (sim.world.t - sim.raceStart) / 0.6, true);
      } else {
        // Short: kein Rahmen; große Zeile zu Beginn jeder Bahn, Frage im ersten Bild
        const keep = sim.final ? 'FINAL' : `${alive} → TOP ${sim.keep}`;
        const since = sim.phase === 'ready' ? sim.phaseT : sim.phase === 'race' ? sim.R.ready + (sim.world.t - sim.raceStart) : 99;
        if (sim.stageNo === 0 && since < 3.2) {
          A.text(g, sim.hook || 'PICK YOUR COLOR!', W / 2, H * 0.42, 96, { align: 'center', weight: 900, spacing: 1, outline: true, alpha: fade(since, 0.01, 2.6, 0.5), max: W * 0.9 });
        } else if (since < 2.2) {
          A.text(g, keep, W / 2, H * 0.42, 112, { align: 'center', weight: 900, spacing: 2, outline: true, alpha: fade(since, 0.15, 1.5, 0.5), max: W * 0.9 });
          A.text(g, title, W / 2, H * 0.42 + 76, 40, { align: 'center', weight: 800, spacing: 5, color: A.S.sub, alpha: fade(since, 0.15, 1.5, 0.5), max: W * 0.9 });
        }
      }
      // Einblendungen aus dem Zustand: wer raus ist, Fallen zu, Sieger
      const now = sim.t;
      const outs = sim.notes.filter((x) => x.kind === 'out' && now - x.t < 2.0);
      if (outs.length) {
        const names = outs.map((x) => sim.roster[x.rid].name), k = fade(now - outs[0].t, 0.15, 1.4, 0.45);
        const line = names.length === 1 ? `${names[0]} IS OUT` : names.length === 2 ? `${names[0]} & ${names[1]} ARE OUT` : `${names.length} ARE OUT`;
        A.text(g, line, W / 2, short ? H * 0.56 : H * 0.5, short ? 78 : 64, { align: 'center', weight: 900, spacing: 2, outline: true, alpha: k, color: '#ffd9d4', max: W * 0.9 });
      }
      const traps = sim.notes.filter((x) => x.kind === 'traps' && now - x.t < 1.8);
      if (traps.length) A.text(g, 'TRAPS CLOSED', W / 2, short ? H * 0.62 : H * 0.58, short ? 56 : 40, { align: 'center', weight: 900, spacing: 3, color: '#b8f5c8', alpha: fade(now - traps[0].t, 0.15, 1.2, 0.45) });
      if (sim.final && sim.phase === 'result') {
        const win = sim.runners.find((u) => u.place === 1);
        if (win) A.text(g, `${sim.roster[win.rid].name} WINS!`, W / 2, short ? H * 0.42 : H * 0.46, short ? 120 : 96, { align: 'center', weight: 900, spacing: 2, outline: true, alpha: fade(sim.phaseT, 0.2, 9, 0.3), color: '#fff3c4', max: W * 0.9 });
      }
      if (sim.phase === 'podium' || (sim.phase === 'end' && sim.podium)) this.podium(g);
    }

    card(g, lines, k, small) {
      if (k <= 0) return;
      const sim = this.sim, W = sim.W, H = sim.H;
      g.save(); g.globalAlpha = Math.min(1, k) * 0.55; g.fillStyle = '#000'; g.fillRect(0, H * 0.36, W, H * 0.24); g.restore();
      A.text(g, lines[0], W / 2, H * 0.47, small ? 84 : 76, { align: 'center', weight: 900, spacing: 3, alpha: Math.min(1, k) });
      A.text(g, lines[1], W / 2, H * 0.47 + 62, small ? 40 : 44, { align: 'center', weight: 800, spacing: 5, color: A.S.sub, alpha: Math.min(1, k) });
    }

    /** Podest; age: Sekunden seit dem Erscheinen (alter Ablauf: Phasenzeit, Gesamtlevel: seit podiumT). Zwei Rennen
     *  (G9): list, title und pts (Punkte je Platz) für das Podest der Gesamtwertung, sonst der Titel aus sim.labels;
     *  mul < 1 blendet das ganze Podest aus (Übergang zur Tabelle). */
    podium(g, age = this.sim.phaseT, list = null, title = null, pts = null, mul = 1) {
      const sim = this.sim, W = sim.W, H = sim.H, k = Math.min(1, age / 0.5), p = list || sim.podium || [];
      const fo = (o) => (mul < 1 ? { ...o, alpha: mul } : o);
      g.save(); g.globalAlpha = 0.6 * k * mul; g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.restore();
      const blocks = [[0, W / 2, 300, '#e3b23c'], [1, W / 2 - 260, 220, '#c8ced4'], [2, W / 2 + 260, 160, '#c58a52']];
      const base = H * 0.82, r = sim.r * 2.4;
      for (const [i, x, h, col] of blocks) {
        const id = p[i]; if (id === undefined) continue;
        g.save(); g.globalAlpha = k * mul;
        g.fillStyle = col; g.beginPath(); g.roundRect(x - 120, base - h * k, 240, h * k, 10); g.fill();
        A.text(g, String(i + 1), x, base - h * k + 70, 64, fo({ align: 'center', weight: 900, color: 'rgba(0,0,0,0.55)' }));
        if (pts) A.text(g, `${pts[i]} PTS`, x, base - h * k + 122, 30, fo({ align: 'center', weight: 900, spacing: 2, color: 'rgba(0,0,0,0.6)' }));
        const M = sim.roster[id];
        A.marble(g, x, base - h * k - r - 4, r, M.name, M.color, 0.3 + i, { crown: i === 0, band: M.band });
        A.text(g, M.name, x, base - h * k - 2 * r - 40, 40, fo({ align: 'center', weight: 900, spacing: 2 }));
        g.restore();
      }
      A.text(g, title || (sim.labels && sim.labels.podium) || 'CHAMPION', W / 2, 150, 72, { align: 'center', weight: 900, spacing: 6, alpha: k * mul, color: '#fff3c4' });
    }
  }

  // ======================================================================= Gesamtlevel (R43 Teil 2, Paket G1)
  // Die Welt ist größer als das Bild; die Kamera (Simulationszustand) wählt den Ausschnitt. Feste Teile liegen in
  // Kacheln zu 512 × 512 Welt-Einheiten, deren Inhalt nur am Level hängt (Hintergrund in Welt-Koordinaten, Bahnen,
  // Stifte, Schilder). Kacheln überlappen um 2 Einheiten, damit beim Skalieren keine Fugen entstehen. Bewegtes,
  // Murmeln und Lampen kommen jedes Bild neu aus dem Zustand; die Anzeige wird nach der Kamera gezeichnet.
  const TILE = 512, BLEED = 2, MAX_TILES = 160;
  const CAM = EBS.KnockoutCamera;
  const boxOf = (pts, pad) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
  };
  const hit = (a, v) => a.x1 >= v.x0 && a.x0 <= v.x1 && a.y1 >= v.y0 && a.y0 <= v.y1;
  /** Gruben mit Tötungstiefe fürs Gesamtlevel (Paket G8): OUT-Kiste an den Schleusen (look 'out'), Schacht mit Rahmen
   *  an Fallstellen (mit Warnstreifen), sonst Abgrund. Überlappende Abgrund-Stücke (unter der schrägen Einsturz-Brücke)
   *  werden zu einem zusammengefasst; k ist die Neigung ihrer Oberkante (durch die linken oberen Ecken). */
  function holesOf(pits) {
    const out = [];
    let run = null;
    for (const p of pits) {
      if (!p.kill || p.jail) continue;                                // Gefängnis: eigene Zeichnung (decor 'jail')
      if (p.look === 'out' || p.stripes) { out.push({ type: p.look === 'out' ? 'crate' : 'shaft', p }); run = null; continue; }
      if (run && p.x0 <= run[run.length - 1].x1 && p.x1 >= run[run.length - 1].x0) run.push(p);
      else { run = [p]; out.push({ type: 'chasm', parts: run }); }
    }
    for (const h of out) {
      if (h.parts) {
        const ps = h.parts.slice().sort((a, b) => a.x0 - b.x0), a = ps[0], z = ps[ps.length - 1];
        const k = ps.length > 1 && z.x0 > a.x0 ? (z.y0 - a.y0) / (z.x0 - a.x0) : 0;
        h.p = { x0: a.x0, x1: Math.max(...ps.map((q) => q.x1)), y0: a.y0, k, y1: Math.max(...ps.map((q) => q.y1)), depth: Math.min(...ps.map((q) => q.depth)) };
      }
      const p = h.p, top = h.type === 'chasm' ? Math.min(p.y0, p.y0 + p.k * (p.x1 - p.x0)) : p.y0;
      h.b = { x0: p.x0 - 2 * p.depth, y0: top - 2 * p.depth, x1: p.x1 + 2 * p.depth, y1: p.y1 + 2 * p.depth };
    }
    return out;
  }
  const seen = (el, v) => el.bodies.some((b) => b.x + b.reach + 60 > v.x0 && b.x - b.reach - 60 < v.x1 && b.y + b.reach + 60 > v.y0 && b.y - b.reach - 60 < v.y1);

  class LevelPainter extends Painter {
    constructor(sim, scale = 1) {
      super(sim, scale);
      this.tiles = new Map();
      this.prep();
    }
    setSim(sim) { this.dispose(); this.sim = sim; this.prep(); }
    prep() {
      const sim = this.sim, st = sim.stage;
      this.px = this.scale * sim.cam.o.zmax;                         // Bildpunkte je Welt-Einheit in den Kacheln
      this.tracks = st.tracks.map((tr) => ({ tr, b: boxOf(tr.pts, tr.w * 2 + 24) }));
      this.pegBox = st.pegs.map((p) => ({ p, b: { x0: p.x - p.rad - 12, y0: p.y - p.rad - 12, x1: p.x + p.rad + 12, y1: p.y + p.rad + 12 } }));
      this.signBox = st.signs.map((s) => ({ s, b: { x0: s.x - 260, y0: s.y - s.h - s.size * 2.4, x1: s.x + 260, y1: s.y + 12 } }));
      this.pitBox = st.pits.map((p) => ({ p, b: { x0: p.x0 - 80, y0: p.y0 - 30, x1: p.x1 + 80, y1: p.y1 + 30 } }));
      this.holes = holesOf(st.pits);
      // Gefängnisse (R44): Rückwand in den Kacheln, Gitter vor den Murmeln; cache nimmt das feste Gitterbild auf
      this.jails = (st.decor || []).filter((j) => j.kind === 'jail').map((j) => ({ j, cache: {},
        b: { x0: j.x0 - 60, y0: Math.min(j.ya, j.yb) - 160, x1: j.x1 + 60, y1: Math.max(j.ja, j.jb) + 60 } }));
    }
    dispose() { for (const c of this.tiles.values()) c.width = c.height = 1; this.tiles.clear(); }

    /** Kachel (ix, iy): einmal gezeichnet, Inhalt hängt nur am Level. */
    tile(ix, iy) {
      const key = ix + ',' + iy;
      let c = this.tiles.get(key);
      if (c) return c;
      const sim = this.sim, side = TILE + 2 * BLEED, n = Math.ceil(side * this.px), k = n / side;
      c = document.createElement('canvas'); c.width = n; c.height = n;
      const g = c.getContext('2d'), v = { x0: ix * TILE - BLEED, y0: iy * TILE - BLEED, x1: (ix + 1) * TILE + BLEED, y1: (iy + 1) * TILE + BLEED };
      g.setTransform(k, 0, 0, k, -v.x0 * k, -v.y0 * k);
      // Kacheln sind durchsichtig: Hintergrund und Gerüst liegen in eigenen Ebenen dahinter (paint)
      for (const { p, b } of this.pitBox) {
        if (p.kill || !hit(b, v)) continue;
        A.pit(g, p, sim.bounds.y1 + 400);
        if (p.stripes) A.hazard(g, p.x0 + 8, p.y1 - 22, p.x1 - p.x0 - 16, 14);
      }
      for (const h of this.holes) if (hit(h.b, v)) A.hole(g, h, false);
      for (const { j, b } of this.jails) if (hit(b, v)) A.jailBack(g, j);
      for (const { tr, b } of this.tracks) if (!tr.front && tr.kind !== 'belt' && hit(b, v)) A.drawTrack(g, tr);
      for (const { p, b } of this.pegBox) if (hit(b, v)) A.peg(g, p);
      for (const { s, b } of this.signBox) if (hit(b, v)) A.sign(g, s);
      if (this.tiles.size >= MAX_TILES) { const old = this.tiles.keys().next().value; const oc = this.tiles.get(old); oc.width = oc.height = 1; this.tiles.delete(old); }
      this.tiles.set(key, c);
      return c;
    }

    paint(g) {
      const sim = this.sim, cam = sim.cam, W = sim.W, H = sim.H, st = sim.stage, rt = sim.world.t, r = sim.r;
      const rate = sim.phase === 'race' ? sim.slowAt(sim.t) : 1, marks = sim.cfg.marks !== 'off';
      const v = CAM.view(cam, 2);
      const ty0 = Math.floor(v.y0 / TILE), ty1 = Math.floor(v.y1 / TILE), tx0 = Math.floor(v.x0 / TILE), tx1 = Math.floor(v.x1 / TILE);
      // Hintergrund in drei Ebenen: Tiefenverlauf (Welt), Lichtflecken und Punkte (0,15-fach), Gerüst (0,5-fach)
      g.save(); g.translate(W / 2, H / 2); g.scale(cam.z, cam.z); g.translate(-cam.x, -cam.y);
      A.levelDepth(g, v, sim.bounds.y1, sim.level.gold);
      g.restore();
      this.layer(g, 0.15, (lv) => A.levelFar(g, lv, this.dotPat || (this.dotPat = A.dotPattern(g))));
      this.layer(g, 0.5, (lv) => A.scaffold(g, lv));
      g.save();
      g.translate(W / 2, H / 2); g.scale(cam.z, cam.z); g.translate(-cam.x, -cam.y);
      for (let iy = ty0; iy <= ty1; iy++) {
        for (let ix = tx0; ix <= tx1; ix++) {
          g.drawImage(this.tile(ix, iy), ix * TILE - BLEED, iy * TILE - BLEED, TILE + 2 * BLEED, TILE + 2 * BLEED);
        }
      }
      if (st.finish) A.finishLine(g, st.finish, sim.T);
      for (const el of st.elements) if (seen(el, v)) A.drawElement(g, el, sim, rt, sim.t);
      for (const sec of sim.sections) if (sec.sch && hit(sec.sch.box, v)) this.lamps(g, sec);
      const runners = sim.runners;
      for (const u of runners) if (u.hatchT >= 0) A.hatch(g, u.hx, u.hy, sim.t - u.hatchT, r);
      const near = (m, pad) => m.x > v.x0 - pad && m.x < v.x1 + pad && m.y > v.y0 - pad && m.y < v.y1 + pad;
      for (const u of runners) {
        const m = u.pm, M = sim.roster[u.rid];
        if (m.active && m.collide && near(m, 120)) A.trail(g, m.x, m.y, m.vx, m.vy, r, M.color, rate);
        if (u.nudgeT >= 0) A.shake(g, u.nx, u.ny, sim.t - u.nudgeT, r);
      }
      // Ausgeschiedene zuerst, dann nach Rang (die Führende zuletzt, also oben)
      const order = runners.slice().sort((a, b) => (a.out !== b.out ? (a.out ? -1 : 1) : (b.rank || 0) - (a.rank || 0)));
      const racing = sim.phase === 'race';
      for (const u of order) {
        const m = u.pm, M = sim.roster[u.rid];
        if (!m.active || !near(m, 3 * r)) continue;
        const lead = racing && sim.leader === u.rid && !u.out;
        const danger = racing && !u.out && !u.finished && u.rank > sim.cut ? 0.75 + 0.25 * Math.sin(sim.t * TAU * 1.6) : 0;
        A.marble(g, m.x, m.y, r, M.name, M.color, m.a, { crown: lead && marks, danger: marks ? danger : 0, noShadow: !m.collide, band: M.band });
      }
      // Glitzern an der Ziellinie für jede, die gerade durch ist (nur im Finale; in den Schleusen heißt „finished“ drin)
      if (st.finish && sim.sec.fin) for (const u of runners) if (u.finished && !u.out) A.glitter(g, st.finish, rt - u.finishT, u.rid);
      for (const h of this.holes) if (hit(h.b, v)) A.hole(g, h, true);
      for (const { j, b, cache } of this.jails) if (hit(b, v)) A.jailFront(g, j, cache);
      for (const { tr, b } of this.tracks) if (tr.front && hit(b, v)) A.drawTrack(g, tr);
      g.restore();
      // Bildrand: weiche Vignette (fest, bewegt sich nicht mit)
      const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.hypot(W, H) * 0.62);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, A.S.vignette);
      g.fillStyle = vg; g.fillRect(0, 0, W, H);
      if (rate < 1) this.slowmo(g, rate);
      this.levelOverlay(g);
    }

    /** Hintergrund-Ebene, die f-fach mit der Kamera läuft (Zoom ebenso abgeschwächt). draw(v) zeichnet in
     *  Ebenen-Koordinaten; v ist der sichtbare Ausschnitt. Hängt nur am Kamera-Zustand (Seek-Regel). */
    layer(g, f, draw) {
      const sim = this.sim, cam = sim.cam, W = sim.W, H = sim.H, zf = 1 + (cam.z - 1) * f, hw = W / (2 * zf) + 2, hh = H / (2 * zf) + 2;
      g.save(); g.translate(W / 2, H / 2); g.scale(zf, zf); g.translate(-cam.x * f, -cam.y * f);
      draw({ x0: cam.x * f - hw, y0: cam.y * f - hh, x1: cam.x * f + hw, y1: cam.y * f + hh });
      g.restore();
    }

    /** Streckenleiste (Langvideo, Plan Abschnitt 3 und 7): Linie über das ganze Level, Striche für die Schleusen, ein
     *  Punkt je Murmel an ihrer Stelle, rote Schnittlinie zwischen dem letzten freien Platz und dem ersten draußen. */
    courseBar(g) {
      const sim = this.sim, W = sim.W, H = sim.H, L = sim.lv.path.length, x0 = (W - 1600) / 2, y = H - 44;
      const X = (p) => x0 + 1600 * Math.max(0, Math.min(1, p / L));
      g.save();
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.roundRect(x0 - 22, y - 20, 1644, 40, 20); g.fill();
      g.fillStyle = A.S.track.base; g.fillRect(x0, y - 2, 1600, 4);
      g.fillStyle = A.S.track.top;
      for (const sec of sim.sections) if (sec.sch) g.fillRect(X(sec.p1) - 2, y - 9, 4, 18);
      g.fillRect(x0 + 1600 - 3, y - 12, 6, 24);
      const live = sim.runners.filter((u) => !u.out && u.pm.active);
      if (sim.sec.sch && sim.closeT < 0 && sim.cut < live.length) {
        const a = live.find((u) => u.rank === sim.cut), b = live.find((u) => u.rank === sim.cut + 1);
        if (a && b) { g.fillStyle = '#ff5a4e'; g.fillRect((X(a.prog) + X(b.prog)) / 2 - 1.5, y - 14, 3, 28); }
      }
      const order = live.slice().sort((p, q) => q.rank - p.rank);
      for (const u of order) {
        const M = sim.roster[u.rid], x = X(u.prog), lead = u.rid === sim.leader;
        g.fillStyle = M.color; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 2;
        g.beginPath(); g.arc(x, y, lead ? 10 : 8, 0, TAU); g.fill(); g.stroke();
        if (M.band) { g.fillStyle = 'rgba(250,250,246,0.9)'; g.fillRect(x - 7, y - 1.5, 14, 3); }
      }
      g.restore();
    }

    /** Lampenreihe einer Schleuse: grün = belegt, gelb = frei, die letzten drei freien blinken rot; nach dem Schließen
     *  blinken alle zweimal grün bis zur Freigabe. */
    lamps(g, sec) {
      const sim = this.sim, sch = sec.sch, t = sim.t, cur = sec === sim.sec;
      const free = cur ? sim.cut - sim.placeCount : 0, blink = Math.floor(t * 4) % 2 === 0;
      sch.lamps.forEach(([x, y], i) => {
        let on = 'green', a = 1;
        if (cur && sim.closeT < 0) {
          if (i < sim.placeCount) on = 'green';
          else if (i >= sim.cut) { on = 'amber'; a = 0.25; }                       // Platz fällt weg (Sturz zählt mit)
          else { on = free <= 3 && blink ? 'red' : 'amber'; }
        } else if (cur && sim.releaseT < 0) {
          a = Math.floor((t - sim.closeT) / (sim.R.release / 4)) % 2 === 0 ? 1 : 0.35;
          if (i >= sim.placeCount) { on = 'amber'; a = 0.25; }
        } else if (sec.i > sim.secNo) { on = 'amber'; a = 0.6; }
        g.save(); g.globalAlpha = a; A.lamp(g, x, y, sch.lampR, on); g.restore();
      });
    }

    levelOverlay(g) {
      const sim = this.sim, W = sim.W, H = sim.H, short = sim.format === 'short', sec = sim.sec, lv = sim.level;
      if (!this.hud || sim.cfg.display === 'off') return;
      // Zwei Rennen (G9): eigene Karten, RACE n vor der Stufe, Titel des Podests (sim.labels, nur Darstellung)
      const L = sim.labels || {};
      // Einstiegsflug: nur die Karte, keine Anzeige
      if (sim.phase === 'intro') {
        this.card(g, L.intro || [`${sim.roster.length} MARBLES. ONE COURSE.`, 'ONLY THE FASTEST GO ON.'], fade(sim.phaseT, 0.6, sim.introT - 1.8, 0.8));
        return;
      }
      const podium = sim.podiumT >= 0 && sim.t >= sim.podiumT;
      const alive = sim.roster.filter((m) => m.alive).length, since = sim.t - Math.max(sim.secT, (sim.introT || 0) + sim.R.ready);
      if (short) {
        if (sim.secNo === 0 && sim.t < 3.2) {
          // Schon im ersten Bild voll sichtbar (Vorschaubild des Shorts)
          A.text(g, sim.hook || 'PICK YOUR COLOR!', W / 2, H * 0.42, 96, { align: 'center', weight: 900, spacing: 1, outline: true, alpha: fade(sim.t + 0.01, 0.01, 2.6, 0.5), max: W * 0.9 });
        } else if (!sec.placeholder && since >= 0 && since < 2.2) {
          // Finale: groß FINAL, darunter wie viele um den Sieg fahren
          const k = fade(since, 0.15, 1.5, 0.5);
          A.text(g, sec.fin ? 'FINAL' : `${sim.nIn} → TOP ${sim.keep}`, W / 2, H * 0.42, 112, { align: 'center', weight: 900, spacing: 2, outline: true, alpha: k, max: W * 0.9 });
          A.text(g, sec.fin ? `${sim.nIn} MARBLES. ONE WINNER.` : sec.title, W / 2, H * 0.42 + 76, 40, { align: 'center', weight: 800, spacing: 5, color: A.S.sub, alpha: k, max: W * 0.9 });
        }
      } else {
        const no = sim.secNo + 1, n = lv.stages || sim.sections.length;
        if (sim.phase !== 'end' && !sec.placeholder && sim.winnerT < 0) {
          A.text(g, `${L.tag || ''}STAGE ${no}/${n}`, 56, 80, 46, { weight: 900, spacing: 1 });
          A.text(g, sec.title, 58, 122, 28, { weight: 800, spacing: 3, color: A.S.sub });
          A.text(g, sec.fin ? `${alive} LEFT · ONE WINS` : `${alive} LEFT · TOP ${sim.keep}`, 1790, 80, 46, { weight: 900, align: 'right', spacing: 1 });
        }
        if (!podium) A.outTube(g, sim, 1856, 178, 1012, 56);
        if (sim.phase !== 'end' && !podium && sim.cfg.bar !== 'off') this.courseBar(g);
        // Nach dem Einstiegsflug steht dessen Satz schon im Bild; die Karte nennt dann Stufen und Ziel
        const sub = sim.introT ? `${n} STAGES. ONE CHAMPION.` : `${sim.roster.length} MARBLES. ONLY THE FASTEST GO ON.`;
        if (sim.phase === 'ready') this.card(g, L.ready || [lv.title, sub], fade(sim.phaseT + 0.3, 0.3, sim.R.ready - 0.9, 0.5));
        else if (!sec.placeholder && since >= 0 && since < 1.4) this.card(g, [`STAGE ${no}`, sec.title], fade(since, 0.1, 0.9, 0.4), true);
      }
      const now = sim.t, outs = sim.notes.filter((x) => x.kind === 'out' && now - x.t < 2.0);
      if (outs.length) {
        const names = outs.map((x) => sim.roster[x.rid].name), k = fade(now - outs[0].t, 0.15, 1.4, 0.45);
        const line = names.length === 1 ? `${names[0]} IS OUT` : names.length === 2 ? `${names[0]} & ${names[1]} ARE OUT`
          : names.length === 3 ? `${names[0]}, ${names[1]} & ${names[2]} ARE OUT` : `${names.length} ARE OUT`;
        A.text(g, line, W / 2, short ? H * 0.56 : H * 0.5, short ? 78 : 64, { align: 'center', weight: 900, spacing: 2, outline: true, alpha: k, color: '#ffd9d4', max: W * 0.9 });
      }
      const traps = sim.notes.filter((x) => x.kind === 'traps' && now - x.t < 1.8);
      if (traps.length) A.text(g, 'TRAPS CLOSED', W / 2, short ? H * 0.62 : H * 0.58, short ? 56 : 40, { align: 'center', weight: 900, spacing: 3, color: '#b8f5c8', alpha: fade(now - traps[0].t, 0.15, 1.2, 0.45) });
      // Starttor im Finale: alle warten, gleich geht es los
      const sprint = sim.notes.find((x) => x.kind === 'sprint' && now - x.t < 2.6);
      if (sprint) A.text(g, 'FINAL SPRINT', W / 2, short ? H * 0.3 : 250, short ? 80 : 60, { align: 'center', weight: 900, spacing: 4, outline: true, color: '#ffe9a8', alpha: fade(now - sprint.t, 0.15, 1.9, 0.5), max: W * 0.9 });
      // Kurze Einblendung: neue Führende oder großer Sprung (höchstens eine je 4 s, aus dem Zustand)
      const hl = sim.notes.filter((x) => (x.kind === 'leader' || x.kind === 'jump') && now - x.t < 2.2).pop();
      if (hl && sim.winnerT < 0 && !(hl.kind === 'leader' && sim.leader !== hl.rid)) {   // Führung schon wieder verloren: weg
        const name = sim.roster[hl.rid].name, line = hl.kind === 'leader' ? `NEW LEADER: ${name}` : `${name} +${hl.n} PLACES!`;
        A.text(g, line, W / 2, short ? H * 0.2 : 176, short ? 54 : 34, { align: 'center', weight: 900, spacing: 3, outline: true, color: hl.kind === 'leader' ? '#ffe9a8' : '#c9f3ff', alpha: fade(now - hl.t, 0.15, 1.6, 0.45), max: W * 0.9 });
      }
      // Podest (Langvideo): ersetzt die Siegerzeile
      if (podium) { this.podium(g, sim.t - sim.podiumT); return; }
      // Sieg: groß der Name, bei knappem Einlauf darunter PHOTO FINISH (beides aus dem Zustand, bis zum Ende)
      if (sim.winnerT >= 0 && sim.winner >= 0) {
        const k = fade(now - sim.winnerT, 0.2, 99, 0.3), y = short ? H * 0.42 : H * 0.46;
        A.text(g, `${sim.roster[sim.winner].name} WINS${L.win || ''}!`, W / 2, y, short ? 120 : 96, { align: 'center', weight: 900, spacing: 2, outline: true, alpha: k, color: '#fff3c4', max: W * 0.9 });
        const ph = sim.notes.find((x) => x.kind === 'photo');
        if (ph) A.text(g, 'PHOTO FINISH', W / 2, y + (short ? 92 : 74), short ? 52 : 40, { align: 'center', weight: 900, spacing: 6, outline: true, color: '#c9f3ff', alpha: fade(now - ph.t, 0.15, 99, 0.3) });
      }
    }
  }

  // ======================================================================= Zwei Rennen (R43 Teil 2, Paket G9)
  // Das laufende Rennen zeichnet ein LevelPainter (beim Wechsel zu Rennen 2 neu vorbereitet, die Kacheln hängen am
  // Level des Rennens); darüber die Tabellen und das Podest der Gesamtwertung. Alle Zeiten aus dem Zustand der Serie.
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  class SeriesPainter {
    constructor(sim, scale = 1) { this.sim = sim; this.scale = scale; this.hud = true; this.cache = null; this.front = null; this.inner = new LevelPainter(sim.cur, scale); }
    setSim(sim) { this.sim = sim; this.inner.setSim(sim.cur); }
    dispose() { this.inner.dispose(); }

    paint(g) {
      const s = this.sim, X = EBS.KnockoutSeries, ph = s.phase, age = s.phaseT;
      if (this.inner.sim !== s.cur) this.inner.setSim(s.cur);
      // Anzeige des Rennens aus, sobald eine Tabelle oder das Podest der Gesamtwertung steht
      const over = ph === 'table1' || ph === 'table2' || ph === 'champion' || ph === 'end';
      this.inner.hud = this.hud && !over;
      this.inner.paint(g);
      if (!this.hud || s.cfg.display === 'off') return;
      if (ph === 'table1' || ph === 'table2') {
        // Übergang: erst blendet das Podest des Rennens aus, dann die Tabelle ein (die Titel stehen an derselben Stelle)
        const race = s.cur;
        if (age < 0.35 && race.podium && race.podiumT >= 0) this.inner.podium(g, race.t - race.podiumT, null, null, null, 1 - age / 0.35);
        const inn = clamp01(age / 0.25), a = clamp01((age - 0.2) / 0.35);
        if (ph === 'table1') {
          // Nach Rennen 1: steht, bis der Flug von Rennen 2 (hinter ihr) fast vorbei ist; beim Wechsel fast deckend
          const total = X.HOLD1 + (s.runs[0].R.intro || 7), out = clamp01((total - age) / 0.8), bump = clamp01(1 - Math.abs(age - X.HOLD1) / 0.35);
          this.table(g, s.tables[0], false, age, Math.min(a, out), Math.min(inn, out) * (0.8 + 0.17 * bump));
        } else this.table(g, s.tables[1], true, age, a, inn * 0.82);
      } else if (over) {
        // Podest der Gesamtwertung: die Tabelle blendet aus, das Podest wächst kurz danach
        const tab = s.tables[1], top = tab.slice(0, 3), t = ph === 'champion' ? age : X.CHAMP + age;
        if (t < 0.75) this.table(g, tab, true, X.TABLE2 + t, clamp01(1 - t / 0.3), 0.82 * clamp01(1 - t / 0.75));
        if (t > 0.25) this.inner.podium(g, t - 0.25, top.map((r) => r.rid), 'CHAMPION', top.map((r) => r.total));
        const M = s.runs[0].roster[top[0].rid];
        A.text(g, `${M.name} · ${top[0].total} POINTS FROM TWO RACES`, s.W / 2, 212, 30, { align: 'center', weight: 800, spacing: 4, color: A.S.sub, alpha: clamp01((t - 0.7) / 0.5) });
      }
    }

    /** Gesamtwertung, die ersten zehn. final: Spalten je Rennen und Gesamt, Zeilen erscheinen von Platz 10 bis 1 (zur
     *  selben Zeit wie die Töne in series.js), darunter der Abstand des Siegers. a: Deckkraft der Tabelle, dim: der
     *  Abdunklung dahinter. */
    table(g, tab, final, age, a, dim) {
      const s = this.sim, X = EBS.KnockoutSeries, W = s.W, H = s.H, names = s.runs[0].roster, rows = tab.slice(0, 10), n = rows.length;
      const x0 = 420, x1 = 1500, cy = (k) => 290 + (k - 1) * 64;
      if (dim > 0) { g.save(); g.globalAlpha = dim; g.fillStyle = '#04070d'; g.fillRect(0, 0, W, H); g.restore(); }
      if (a <= 0) return;
      A.text(g, final ? 'FINAL STANDINGS' : 'STANDINGS AFTER RACE 1', W / 2, 128, 66, { align: 'center', weight: 900, spacing: 5, alpha: a, color: '#fff3c4' });
      A.text(g, `POINTS FOR THE TOP 10: ${X.POINTS.join(' · ')}`, W / 2, 178, 26, { align: 'center', weight: 800, spacing: 4, alpha: a, color: A.S.sub });
      const head = { align: 'center', weight: 800, spacing: 3, alpha: a * 0.8, color: A.S.sub, baseline: 'middle' };
      if (final) { A.text(g, 'RACE 1', 1150, 236, 22, head); A.text(g, 'RACE 2', 1290, 236, 22, head); A.text(g, 'TOTAL', x1 - 40, 236, 22, { ...head, align: 'right' }); }
      else A.text(g, 'POINTS', x1 - 40, 236, 22, { ...head, align: 'right' });
      const at0 = final ? X.REVEAL0 : 0.5, gap = final ? X.REVEAL_GAP : 0.12;
      rows.forEach((r, i) => {
        const k = i + 1, rk = clamp01((age - (at0 + (n - k) * gap)) / 0.3);
        if (rk <= 0) return;
        const y = cy(k), dx = (1 - rk) * 60, al = a * rk, M = names[r.rid];
        g.save(); g.globalAlpha = al; g.fillStyle = k === 1 ? 'rgba(227,178,60,0.26)' : 'rgba(255,255,255,0.07)';
        g.beginPath(); g.roundRect(x0 + dx, y - 27, x1 - x0, 54, 12); g.fill(); g.restore();
        const o = { weight: 900, baseline: 'middle', alpha: al };
        A.text(g, String(k), x0 + 70 + dx, y + 1, 32, { ...o, align: 'right' });
        g.save(); g.globalAlpha = al; A.marble(g, x0 + 116 + dx, y, 20, M.name, M.color, 0.4 + k, { noShadow: true, band: M.band }); g.restore();
        A.text(g, M.name, x0 + 158 + dx, y + 1, 32, { ...o, spacing: 2 });
        if (final) {
          const c = { ...o, align: 'center', weight: 800, color: A.S.sub };
          A.text(g, String(r.p[0]), 1150 + dx, y + 1, 30, c); A.text(g, String(r.p[1]), 1290 + dx, y + 1, 30, c);
        }
        A.text(g, String(r.total), x1 - 40 + dx, y + 1, 36, { ...o, align: 'right', color: k === 1 ? '#ffe9a8' : A.S.text });
      });
      // Abstand des Siegers (Schlusstabelle, kurz nach Platz 1); Gleichstand entscheidet Rennen 2
      if (final && n > 1) {
        const k = clamp01((age - (at0 + (n - 1) * gap + 0.9)) / 0.4), m = rows[0].total - rows[1].total, who = names[rows[0].rid].name;
        const line = m > 0 ? `${who} WINS THE TITLE BY ${m} POINT${m === 1 ? '' : 'S'}` : `${who} WINS THE TITLE ON THE RACE 2 RESULT`;
        if (k > 0) A.text(g, line, W / 2, 960, 44, { align: 'center', weight: 900, spacing: 3, outline: true, alpha: a * k, color: '#ffe9a8', max: W * 0.9 });
      } else if (!final) {
        A.text(g, 'NEXT: RACE 2 · NEW STARTING ORDER', W / 2, 960, 34, { align: 'center', weight: 900, spacing: 4, alpha: a * clamp01((age - 2) / 0.5), color: '#c9f3ff' });
      }
    }
  }

  EBS.KnockoutRender = { Painter, LevelPainter, SeriesPainter };
})(typeof window !== 'undefined' ? window : globalThis);
