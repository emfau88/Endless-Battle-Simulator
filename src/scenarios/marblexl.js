/*
 * Szenario „Marble Factory XL“ – Stufe 1 (in Arbeit)
 *
 * Eine große Halle aus mehreren Linien der klassischen Kugelfabrik. Jede Linie ist eine unveränderte
 * MarbleFactory in ihrem bewährten Hoch- oder Querformat-Layout und steht als „Raum“ an einer festen Stelle der
 * Halle. Die Kamera zeigt die Übersicht, fährt in einzelne Räume und an den Türmen entlang.
 *
 * Bewusst einfach gehalten: Die Linien tauschen noch keine Kugeln aus. Neue Stationen, Wachstum und Übergaben
 * zwischen den Linien folgen in späteren Paketen (docs/GESAMTPLAN_2026-11-16.md, Abschnitt 9).
 *
 * Die Kamera hängt nur von der Videozeit ab (Seek-Regel): gleiches t ergibt dasselbe Bild.
 */
(function () {
'use strict';
const { DT, canvasTex } = EBS;
const { clamp, hashSeed, fnv1a, fmtInt, fmtIntEn, fmtTime } = EBS.util;
const C = EBS.MarbleClassic;

const BOX = { land: { w: 1920, h: 1080 }, port: { w: 1080, h: 1920 } };
// Kugeln und Puffer je Linie: leicht verschieden, damit die Räume nicht im Gleichschritt laufen
const LINES = [
  { name: 'ALPHA', balls: 35, buffer: 2 }, { name: 'BETA', balls: 32, buffer: 3 },
  { name: 'GAMMA', balls: 35, buffer: 1 }, { name: 'DELTA', balls: 30, buffer: 2 },
];

/** Grundriss der Halle in Hallen-Einheiten (eine Einheit = eine logische Bildeinheit bei Zoom 1). */
function hallPlan(world) {
  const land = world.w >= world.h;
  const rooms = land ? [
    { form: 'port', x: 0, y: 375 }, { form: 'land', x: 1080, y: 135 },
    { form: 'land', x: 1080, y: 1215 }, { form: 'port', x: 3000, y: 375 },
  ] : [
    { form: 'port', x: 135, y: 240 }, { form: 'port', x: 1215, y: 240 },
    { form: 'land', x: 255, y: 2160 }, { form: 'land', x: 255, y: 3240 },
  ];
  rooms.forEach((r, i) => Object.assign(r, { i, ...BOX[r.form], ...LINES[i] }));
  return land ? { land, W: 4080, H: 2295, rooms } : { land, W: 2430, H: 4320, rooms };
}

// =====================================================================
//  Kamera: feste Folge ruhiger Einstellungen, rein aus der Videozeit
// =====================================================================
const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const TRANSITION = 4;                    // Sekunden zwischen zwei Einstellungen
function shotList(plan, world) {
  const fitS = Math.min(world.w / plan.W, world.h / plan.H);
  const keep = (p) => {                  // Bildausschnitt bleibt innerhalb der Halle
    const hw = world.w / (2 * p.s), hh = world.h / (2 * p.s);
    return { s: p.s, cx: 2 * hw >= plan.W ? plan.W / 2 : clamp(p.cx, hw, plan.W - hw), cy: 2 * hh >= plan.H ? plan.H / 2 : clamp(p.cy, hh, plan.H - hh) };
  };
  const overview = (dur) => { const p = { s: fitS, cx: plan.W / 2, cy: plan.H / 2 }; return { a: p, b: p, dur }; };
  // Raum bei Zoom 1: passt er nicht ins Bild, fährt die Kamera die lange Seite entlang
  const tour = (i, dur, reverse = false) => {
    const r = plan.rooms[i], mx = r.x + r.w / 2, my = r.y + r.h / 2;
    const dx = Math.max(0, (r.w - world.w) / 2), dy = Math.max(0, (r.h - world.h) / 2);
    let a = keep({ s: 1, cx: mx - dx, cy: my - dy }), b = keep({ s: 1, cx: mx + dx, cy: my + dy });
    if (reverse) [a, b] = [b, a];
    return { a, b, dur: dx || dy ? dur + 4 : dur };
  };
  return plan.land
    ? [overview(8), tour(1, 12), tour(3, 12), overview(6), tour(2, 12), tour(0, 12, true)]
    : [overview(8), tour(0, 12), tour(2, 12), overview(6), tour(1, 12), tour(3, 12, true)];
}
function cameraPose(shots, t, auto) {
  if (!auto) return shots[0].a;
  const total = shots.reduce((n, s) => n + s.dur + TRANSITION, 0);
  let u = t % total;
  for (let i = 0; i < shots.length; i++) {
    const sh = shots[i], next = shots[(i + 1) % shots.length];
    if (u < sh.dur) return mix(sh.a, sh.b, smooth(u / sh.dur));
    u -= sh.dur;
    if (u < TRANSITION) return mix(sh.b, next.a, smooth(u / TRANSITION));
    u -= TRANSITION;
  }
  return shots[0].a;
}
function mix(a, b, f) {
  if (a === b) return a;
  return { cx: a.cx + (b.cx - a.cx) * f, cy: a.cy + (b.cy - a.cy) * f, s: Math.exp(Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * f) };
}

// =====================================================================
//  Simulation: mehrere unabhängige klassische Linien im selben Takt
// =====================================================================
class MarbleXL {
  constructor({ seed, params, world, timeScale = 1 }) {
    this.cfg = { seed, ...params };
    this.plan = hallPlan(world);
    this.dt = DT * timeScale;
    this.lines = this.plan.rooms.map((room) => ({
      room,
      sim: new C.MarbleFactory({
        seed: hashSeed(seed, 'marblexl', room.i), world: { w: room.w, h: room.h }, timeScale,
        params: { balls: room.balls, buffer: room.buffer, warmup: params.warmup },
      }),
    }));
    this.step = 0; this.t = 0;
    // Gemeinsames Ereignisprotokoll in Hallen-Koordinaten (für die Tonspur)
    this.events = new Array(2048); this.eventSeq = 0; this.seen = this.lines.map(() => 0);
    this.audioWorldWidth = this.plan.W;
  }
  setParam(k, v) { this.cfg[k] = v; }
  stepOnce() {
    for (const ln of this.lines) ln.sim.stepOnce();
    this.lines.forEach((ln, i) => {
      const s = ln.sim;
      for (; this.seen[i] < s.eventSeq; this.seen[i]++) {
        const e = s.events[this.seen[i] % s.events.length];
        if (!e) continue;
        this.events[this.eventSeq % this.events.length] = { ...e, seq: this.eventSeq, x: e.x + ln.room.x, y: e.y + ln.room.y, line: i };
        this.eventSeq++;
      }
    });
    this.step++; this.t = this.step * this.dt;
  }
  checkInvariants() {
    const errors = [];
    let bodies = 0;
    for (const ln of this.lines) {
      const c = ln.sim.checkInvariants(); bodies += c.bodies;
      for (const e of c.errors) errors.push(`Linie ${ln.room.name}: ${e}`);
    }
    return { ok: errors.length === 0, errors, bodies };
  }
  snapshot() {
    const parts = this.lines.map((ln) => ln.sim.snapshot());
    const sum = (f) => parts.reduce((n, p) => n + f(p), 0);
    const cycles = sum((p) => p.cycles), sorted = sum((p) => p.sorted.reduce((a, b) => a + b, 0)), balls = sum((p) => p.ballsTotal);
    return {
      summary: `${this.lines.length} Linien · ${balls} Kugeln · ${fmtInt(sorted)} sortiert`,
      t: this.t, step: this.step, cycles, sorted, ballsTotal: balls, ballsExpected: sum((p) => p.ballsExpected),
      inHopper: sum((p) => p.inHopper), inColumns: sum((p) => p.inColumns), moving: sum((p) => p.moving), inLift: sum((p) => p.inLift),
      lines: parts.map((p, i) => ({ name: this.lines[i].room.name, cycles: p.cycles, balls: p.ballsTotal })),
      particlesActive: sum((p) => p.particlesActive),
    };
  }
  stateHash() { return fnv1a(this.step + '|' + this.lines.map((ln) => ln.sim.stateHash()).join('|')).toString(16).padStart(8, '0'); }
  destroy() { for (const ln of this.lines) ln.sim.destroy(); }
}

// =====================================================================
//  Halle (Hintergrund hinter und zwischen den Räumen)
// =====================================================================
function drawHall(g, P) {
  const { W, H } = P;
  const wall = g.createLinearGradient(0, 0, 0, H);
  wall.addColorStop(0, '#090d14'); wall.addColorStop(0.5, '#141b26'); wall.addColorStop(1, '#0b1017');
  g.fillStyle = wall; g.fillRect(0, 0, W, H);
  // Wandplatten im Raster der klassischen Halle
  const pw = 240, ph = 260;
  let k = 0;
  for (let x = -pw; x < W + pw; x += pw) for (let y = -20; y < H; y += ph) {
    const ox = (Math.round(y / ph) % 2) * (pw / 2);
    g.fillStyle = `rgba(255,255,255,${(0.004 + ((k++ * 37) % 19) * 0.001).toFixed(3)})`; g.fillRect(x + ox + 2, y + 2, pw - 4, ph - 4);
    g.strokeStyle = 'rgba(0,0,0,.42)'; g.lineWidth = 2; g.strokeRect(x + ox, y, pw, ph);
    g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 1; g.strokeRect(x + ox + 2.5, y + 2.5, pw - 5, ph - 5);
  }
  // Stahlträger über die ganze Hallenhöhe
  for (let x = 180; x < W; x += 600) {
    const beam = g.createLinearGradient(x - 26, 0, x + 26, 0);
    for (const [o, c] of [[0, '#0b0f15'], [0.3, '#1c242f'], [0.5, '#283241'], [0.7, '#1a212b'], [1, '#090c11']]) beam.addColorStop(o, c);
    g.fillStyle = beam; g.fillRect(x - 26, 0, 52, H);
  }
  // Warmes Licht von oben
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let x = 300; x < W; x += 620) {
    const light = g.createRadialGradient(x, -40, 20, x, 120, 760);
    light.addColorStop(0, 'rgba(255,186,110,.22)'); light.addColorStop(0.4, 'rgba(255,160,90,.07)'); light.addColorStop(1, 'rgba(255,150,80,0)');
    g.fillStyle = light; g.fillRect(x - 800, -100, 1600, 1000);
  }
  g.restore();
  for (let x = 300; x < W; x += 620) {
    g.fillStyle = '#1b2029'; g.fillRect(x - 130, 8, 260, 20);
    g.save(); g.shadowColor = 'rgba(255,190,110,.9)'; g.shadowBlur = 26; g.fillStyle = '#ffe9c4'; g.fillRect(x - 116, 22, 232, 7); g.restore();
  }
}

// =====================================================================
//  Renderer
// =====================================================================
class MarbleXLRenderer {
  constructor({ sim, view, world, renderScale = 1 }) {
    this.sim = sim; this.view = view; this.world = world; this.own = [];
    const P = (this.plan = sim.plan);
    this.shots = shotList(P, world);
    this.root = new PIXI.Container();
    const cam = (this.cam = new PIXI.Container()); this.root.addChild(cam);
    // Halle: bei Zoom 1 höchstens Bildschärfe, in der Übersicht wird sie verkleinert
    const tHall = canvasTex(P.W, P.H, (g) => drawHall(g, P), Math.min(renderScale, 1)); this.own.push(tHall);
    const hall = new PIXI.Sprite(tHall); hall.width = P.W; hall.height = P.H; cam.addChild(hall);
    // Räume: je Linie der unveränderte klassische Renderer im eingebetteten Betrieb
    const lineView = { camera: false, get hud() { return view.hud; } };
    this.lineRenderers = sim.lines.map((ln) => {
      const r = new C.MarbleRenderer({ sim: ln.sim, view: lineView, renderScale, embedded: { title: ['LINE ', ln.room.name] } });
      r.root.position.set(ln.room.x, ln.room.y); cam.addChild(r.root);
      return r;
    });
    // Stahlrahmen um jeden Raum
    const frame = new PIXI.Graphics();
    for (const r of P.rooms) {
      frame.rect(r.x, r.y, r.w, r.h).stroke({ width: 16, color: 0x10151c, alignment: 0.5 });
      frame.rect(r.x + 8, r.y + 8, r.w - 16, r.h - 16).stroke({ width: 2, color: 0x4a5767, alpha: 0.55, alignment: 0.5 });
    }
    cam.addChild(frame);
    // Vignette und Anzeige stehen fest im Bild (nicht in der Kamera)
    const tVig = canvasTex(256, 256, (g) => {
      const v = g.createRadialGradient(128, 118, 70, 128, 128, 190);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.6, 'rgba(0,0,0,.14)'); v.addColorStop(1, 'rgba(0,0,0,.58)');
      g.fillStyle = v; g.fillRect(0, 0, 256, 256);
    });
    this.own.push(tVig);
    const vig = new PIXI.Sprite(tVig); vig.width = world.w; vig.height = world.h; this.root.addChild(vig);
    this._buildHud();
  }

  _buildHud() {
    const { w } = this.world, land = this.plan.land;
    const style = (size, weight, fill, ls, glow) => new PIXI.TextStyle({
      fontFamily: 'Bahnschrift, "Segoe UI", Arial, sans-serif', fontSize: size, fontWeight: weight, fill, letterSpacing: ls,
      dropShadow: glow ? { color: glow, alpha: 0.9, blur: 14, distance: 0, angle: 0 } : { color: 0x000000, alpha: 0.8, blur: 6, distance: 0, angle: 0 },
    });
    const hud = (this.hud = new PIXI.Container()); this.root.addChild(hud);
    const size = land ? 30 : 34, pw = land ? 980 : 940, ph = land ? 60 : 92, y = land ? 34 : 56;
    const plate = new PIXI.Graphics();
    plate.roundRect(w / 2 - pw / 2, y - ph / 2, pw, ph, 14).fill({ color: 0x0a0e15, alpha: 0.84 }).stroke({ width: 2, color: 0x4a5767, alpha: 0.9 });
    hud.addChild(plate);
    const a = new PIXI.Text({ text: 'MARBLE FACTORY ', style: style(size, '800', 0xeafcff, 3, 0x22d3ee) });
    const b = new PIXI.Text({ text: 'XL', style: style(size, '800', 0xffe1f1, 3, 0xff3f9e) });
    this.hInfo = new PIXI.Text({ text: '', style: style(land ? 20 : 22, '600', 0xa9b8cc, 2) });
    if (land) {
      const x0 = w / 2 - pw / 2 + 26;
      a.anchor.set(0, 0.5); b.anchor.set(0, 0.5); a.position.set(x0, y + 1); b.position.set(x0 + a.width, y + 1);
      this.hInfo.anchor.set(1, 0.5); this.hInfo.position.set(w / 2 + pw / 2 - 26, y + 1);
    } else {
      const total = a.width + b.width;
      a.anchor.set(0, 0.5); b.anchor.set(0, 0.5); a.position.set(w / 2 - total / 2, y - 19); b.position.set(w / 2 - total / 2 + a.width, y - 19);
      this.hInfo.anchor.set(0.5, 0.5); this.hInfo.position.set(w / 2, y + 22);
    }
    hud.addChild(a, b, this.hInfo);
    this.hudSig = '';
  }

  draw() {
    const sim = this.sim, w = this.world;
    for (const r of this.lineRenderers) r.draw();
    const vt = sim.step * DT;                                     // Videozeit (unabhängig von der Zeitlupe)
    const p = cameraPose(this.shots, vt, !!this.view.camera && sim.cfg.cameraMode !== 'overview');
    this.cam.scale.set(p.s); this.cam.position.set(w.w / 2 - p.cx * p.s, w.h / 2 - p.cy * p.s);
    const fit = this.shots[0].a.s, near = clamp((p.s - fit * 1.12) / (fit * 0.5), 0, 1);
    this.hud.alpha = 1 - near;                                    // in Nahaufnahmen tragen die Räume ihre eigenen Schilder
    this.hud.visible = !!this.view.hud && near < 1;
    if (!this.hud.visible) return;
    let sorted = 0, balls = 0;
    for (const ln of sim.lines) { for (const n of ln.sim.stats.sorted) sorted += n; balls += ln.sim.balls.length; }
    const sig = sorted + '|' + Math.floor(vt);
    if (sig !== this.hudSig) { this.hudSig = sig; this.hInfo.text = `${balls} MARBLES  ·  SORTED ${fmtIntEn(sorted)}  ·  ${fmtTime(vt)}`; }
  }

  destroy() {
    for (const r of this.lineRenderers) { this.cam.removeChild(r.root); r.destroy(); }
    this.root.destroy({ children: true });
    for (const t of this.own) t.destroy(true);
  }
}

// =====================================================================
//  Registrierung
// =====================================================================
EBS.registerScenario({
  id: 'marblexl',
  title: 'Marble Factory XL (in Arbeit)',
  defaults: { cameraMode: 'auto', warmup: 30 },
  controls: [
    { key: 'cameraMode', label: 'Kamera', type: 'select', options: [['auto', 'Automatische Fahrt'], ['overview', 'Nur Übersicht']] },
  ],
  normalizeParams(p) {
    return { cameraMode: p.cameraMode === 'overview' ? 'overview' : 'auto', warmup: clamp(Number.isFinite(+p.warmup) ? +p.warmup : 30, 0, 120) };
  },
  create: (ctx) => new MarbleXL(ctx),
  createRenderer: (ctx) => new MarbleXLRenderer(ctx),
  panelStats(sim) {
    const s = sim.snapshot();
    return [
      { key: 'lines', label: 'Linien', value: s.lines.length },
      { key: 'balls', label: 'Kugeln', value: s.ballsTotal },
      { key: 'cycles', label: 'Umläufe', value: fmtInt(s.cycles) },
      { key: 'sorted', label: 'Sortiert', value: fmtInt(s.sorted) },
      { key: 'moving', label: 'Unterwegs', value: s.moving },
      { key: 'lift', label: 'In den Aufzügen', value: s.inLift },
    ];
  },
  panelNote: (sim) => sim.snapshot().summary,
  // Klänge der klassischen Fabrik; die Ereignisse aller Linien liegen in Hallen-Koordinaten vor
  audio: EBS.getScenario('marble').audio,
});
})();
