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

    podium(g) {
      const sim = this.sim, W = sim.W, H = sim.H, k = Math.min(1, sim.phaseT / 0.5), p = sim.podium || [];
      g.save(); g.globalAlpha = 0.6 * k; g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.restore();
      const blocks = [[0, W / 2, 300, '#e3b23c'], [1, W / 2 - 260, 220, '#c8ced4'], [2, W / 2 + 260, 160, '#c58a52']];
      const base = H * 0.82, r = sim.r * 2.4;
      for (const [i, x, h, col] of blocks) {
        const id = p[i]; if (id === undefined) continue;
        g.save(); g.globalAlpha = k;
        g.fillStyle = col; g.beginPath(); g.roundRect(x - 120, base - h * k, 240, h * k, 10); g.fill();
        A.text(g, String(i + 1), x, base - h * k + 70, 64, { align: 'center', weight: 900, color: 'rgba(0,0,0,0.55)' });
        const M = sim.roster[id];
        A.marble(g, x, base - h * k - r - 4, r, M.name, M.color, 0.3 + i, { crown: i === 0 });
        A.text(g, M.name, x, base - h * k - 2 * r - 40, 40, { align: 'center', weight: 900, spacing: 2 });
        g.restore();
      }
      A.text(g, 'CHAMPION', W / 2, 150, 72, { align: 'center', weight: 900, spacing: 6, alpha: k, color: '#fff3c4' });
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
      // Hintergrund in drei Ebenen: Tiefenverlauf (Welt), Lichtflecken und Punkte (0,15-fach), Gerüst (0,5-fach)
      g.save(); g.translate(W / 2, H / 2); g.scale(cam.z, cam.z); g.translate(-cam.x, -cam.y);
      A.levelDepth(g, v, sim.bounds.y1, sim.level.gold);
      g.restore();
      this.layer(g, 0.15, (lv) => A.levelFar(g, lv, this.dotPat || (this.dotPat = A.dotPattern(g))));
      this.layer(g, 0.5, (lv) => A.scaffold(g, lv));
      g.save();
      g.translate(W / 2, H / 2); g.scale(cam.z, cam.z); g.translate(-cam.x, -cam.y);
      for (let iy = Math.floor(v.y0 / TILE); iy <= Math.floor(v.y1 / TILE); iy++) {
        for (let ix = Math.floor(v.x0 / TILE); ix <= Math.floor(v.x1 / TILE); ix++) {
          g.drawImage(this.tile(ix, iy), ix * TILE - BLEED, iy * TILE - BLEED, TILE + 2 * BLEED, TILE + 2 * BLEED);
        }
      }
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
      for (const { p, b } of this.pitBox) if (p.kill && hit(b, v)) A.killPit(g, p);
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
      const alive = sim.roster.filter((m) => m.alive).length, since = sim.t - Math.max(sim.secT, sim.R.ready);
      if (short) {
        if (sim.secNo === 0 && sim.t < 3.2) {
          // Schon im ersten Bild voll sichtbar (Vorschaubild des Shorts)
          A.text(g, sim.hook || 'PICK YOUR COLOR!', W / 2, H * 0.42, 96, { align: 'center', weight: 900, spacing: 1, outline: true, alpha: fade(sim.t + 0.01, 0.01, 2.6, 0.5), max: W * 0.9 });
        } else if (!sec.placeholder && since >= 0 && since < 2.2) {
          const k = fade(since, 0.15, 1.5, 0.5);
          A.text(g, `${sim.nIn} → TOP ${sim.keep}`, W / 2, H * 0.42, 112, { align: 'center', weight: 900, spacing: 2, outline: true, alpha: k, max: W * 0.9 });
          A.text(g, sec.title, W / 2, H * 0.42 + 76, 40, { align: 'center', weight: 800, spacing: 5, color: A.S.sub, alpha: k, max: W * 0.9 });
        }
      } else {
        const no = sim.secNo + 1, n = lv.stages || sim.sections.length;
        if (sim.phase !== 'end' && !sec.placeholder) {
          A.text(g, `STAGE ${no}/${n}`, 56, 80, 46, { weight: 900, spacing: 1 });
          A.text(g, sec.title, 58, 122, 28, { weight: 800, spacing: 3, color: A.S.sub });
          A.text(g, `${alive} LEFT · TOP ${sim.keep}`, 1790, 80, 46, { weight: 900, align: 'right', spacing: 1 });
        }
        A.outTube(g, sim, 1856, 178, 1012, 56);
        if (sim.phase !== 'end' && sim.cfg.bar !== 'off') this.courseBar(g);
        if (sim.phase === 'ready') this.card(g, [lv.title, `${sim.roster.length} MARBLES. ONLY THE FASTEST GO ON.`], fade(sim.phaseT + 0.3, 0.3, sim.R.ready - 0.9, 0.5));
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
      // Kurze Einblendung: neue Führende oder großer Sprung (höchstens eine je 4 s, aus dem Zustand)
      const hl = sim.notes.filter((x) => (x.kind === 'leader' || x.kind === 'jump') && now - x.t < 2.2).pop();
      if (hl && !(hl.kind === 'leader' && sim.leader !== hl.rid)) {             // Führung schon wieder verloren: weg
        const name = sim.roster[hl.rid].name, line = hl.kind === 'leader' ? `NEW LEADER: ${name}` : `${name} +${hl.n} PLACES!`;
        A.text(g, line, W / 2, short ? H * 0.2 : 176, short ? 54 : 34, { align: 'center', weight: 900, spacing: 3, outline: true, color: hl.kind === 'leader' ? '#ffe9a8' : '#c9f3ff', alpha: fade(now - hl.t, 0.15, 1.6, 0.45), max: W * 0.9 });
      }
    }
  }

  EBS.KnockoutRender = { Painter, LevelPainter };
})(typeof window !== 'undefined' ? window : globalThis);
