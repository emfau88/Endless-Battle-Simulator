/*
 * Szenario „Endless Marble Factory“ – Premium Visual Prototype V0.1
 *
 * Geschlossener Kugelkreislauf:
 *   Glasbehälter (Matter.js) -> Zellenrad -> Fallrohr -> Förderband (Zahnradantrieb) -> Scanner + Sortierrohr mit Klappen
 *   -> Farbröhren mit Ventil -> Sammelrinne -> Kettenaufzug -> Rücklaufrohr -> Glasbehälter
 *
 * Echte Physik nur im Behälter (dort sieht man sie). Alle übrigen Wege sind deterministische Bahnen mit
 * Bogenlängen-Parametrisierung, Rollbeschleunigung und Stau-Logik – Kugeln werden nie erzeugt oder gelöscht.
 * Sämtliche Grafik entsteht per Canvas-2D/PixiJS im Code (keine externen Bilddateien).
 */
(function () {
'use strict';
const { DT, DT_MS, RNG, Particles, ParticleView, canvasTex, getParticleTextures, FX } = EBS;
const { clamp, num, fnv1a, hashSeed, lerpColor, fmtTime, fmtInt, fmtIntEn } = EBS.util;
const { Engine, Bodies, Body, Composite, Common } = Matter;

const TAU = Math.PI * 2, HALF_PI = Math.PI / 2;
const mod = (v, m) => ((v % m) + m) % m;
const R = 22, TUBE_IN = 27, TUBE_OUT = 32;      // Kugelradius, Rohr innen/außen (halbe Breite)
const RD = 32, BT = 7;                           // Bandtrommel-Radius, Banddicke
const SEAT = R + 6;                              // Kugelmitte über dem Aufzugsträger
const ENTRY = 2 * R + 6;                         // Wartepunkt vor dem Aufzugsschacht
const NCOL = 6;
const COLORS = [
  { name: 'Cyan', hex: 0x1fd6f0 }, { name: 'Blue', hex: 0x3a66ff }, { name: 'Pink', hex: 0xff3f9e },
  { name: 'Orange', hex: 0xff8418 }, { name: 'Yellow', hex: 0xffd31a }, { name: 'Green', hex: 0x36dd5c },
];
const TUNE = { release: 1.2, belt: 150, lift: 220, entry: 190, G: 1000 };

// =====================================================================
//  Bahnen (Polylinie mit runden Ecken, gleichmäßig abgetastet)
// =====================================================================
function buildPath(wp, defR = 40, step = 3) {
  const raw = [];
  const push = (x, y) => { const n = raw.length; if (!n || Math.hypot(raw[n - 1][0] - x, raw[n - 1][1] - y) > 0.01) raw.push([x, y]); };
  push(wp[0][0], wp[0][1]);
  for (let i = 1; i < wp.length - 1; i++) {
    const [px, py] = wp[i - 1], [cx, cy, cr] = wp[i], [nx, ny] = wp[i + 1];
    let ax = px - cx, ay = py - cy, bx = nx - cx, by = ny - cy;
    const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
    ax /= la; ay /= la; bx /= lb; by /= lb;
    const ang = Math.acos(clamp(ax * bx + ay * by, -1, 1));
    let r = cr === undefined ? defR : cr, d = r / Math.tan(ang / 2);
    const dmax = Math.min(la, lb) * 0.5;
    if (d > dmax) { d = dmax; r = d * Math.tan(ang / 2); }
    if (ang > 3.12 || r < 1) { push(cx, cy); continue; }
    let mx = ax + bx, my = ay + by; const lm = Math.hypot(mx, my); mx /= lm; my /= lm;
    const h = r / Math.sin(ang / 2), ox = cx + mx * h, oy = cy + my * h;
    const a0 = Math.atan2(cy + ay * d - oy, cx + ax * d - ox), a1 = Math.atan2(cy + by * d - oy, cx + bx * d - ox);
    const da = Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0)), n = Math.max(4, Math.ceil(Math.abs(da) * r / 3));
    for (let k = 0; k <= n; k++) { const a = a0 + (da * k) / n; push(ox + Math.cos(a) * r, oy + Math.sin(a) * r); }
  }
  push(wp[wp.length - 1][0], wp[wp.length - 1][1]);
  const cum = [0];
  for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
  const len = cum[cum.length - 1], n = Math.max(2, Math.round(len / step) + 1), st = len / (n - 1);
  const x = new Float32Array(n), y = new Float32Array(n);
  for (let k = 0, j = 0; k < n; k++) {
    const s = Math.min(len, k * st);
    while (j < raw.length - 2 && cum[j + 1] < s) j++;
    const f = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
    x[k] = raw[j][0] + (raw[j + 1][0] - raw[j][0]) * f; y[k] = raw[j][1] + (raw[j + 1][1] - raw[j][1]) * f;
  }
  return { x, y, n, step: st, len };
}
function pathAt(p, s, out) {
  const f = clamp(s, 0, p.len) / p.step; let i = Math.floor(f); if (i > p.n - 2) i = p.n - 2;
  const k = f - i, x0 = p.x[i], y0 = p.y[i], dx = p.x[i + 1] - x0, dy = p.y[i + 1] - y0, d = Math.hypot(dx, dy) || 1;
  out.x = x0 + dx * k; out.y = y0 + dy * k; out.tx = dx / d; out.ty = dy / d;
  return out;
}
/** Bogenlänge, an der die Bahn die Koordinate v (Achse 'x'/'y') kreuzt – Suche ab Index i0. */
function sAtAxis(p, axis, v, s0 = 0) {
  const a = p[axis];
  for (let i = Math.floor(s0 / p.step); i < p.n - 1; i++) {
    if ((a[i] - v) * (a[i + 1] - v) <= 0 && a[i] !== a[i + 1]) return (i + (v - a[i]) / (a[i + 1] - a[i])) * p.step;
  }
  return p.len;
}
const P0 = { x: 0, y: 0, tx: 1, ty: 0 }, P1 = { x: 0, y: 0, tx: 1, ty: 0 };

// =====================================================================
//  Layout: Querformat und Hochkant ordnen dieselben Baugruppen unterschiedlich an.
//  Die Simulation kennt nur die daraus entstehenden Bahnen.
// =====================================================================
function computeLayout(world) {
  const land = world.w >= world.h;
  const DW = land ? 1920 : 1080, DH = land ? 1080 : 1920, fit = Math.min(world.w / DW, world.h / DH);
  const L = { land, DW, DH, fit, W: world.w, H: world.h, ox: (world.w - DW * fit) / 2, oy: (world.h - DH * fit) / 2 };
  const d = land ? {
    floorY: 1040, lift: { cx: 150, top: 120, bot: 977, exitY: 178, slotY: 927 }, hop: { x: 560, rim: 172 },
    feedEnd: [742, 575], beltEnd: 1180, dir: 1,
    sort: [[1216, 577], [1242, 604.8], [1836, 640.2]], colX0: 1325, colDx: 96, valveY: 800,
    trough: [[1856, 862], [300, 923], [222, 927]],
    gearB: 125, gearC: 160,
    title: { x: 1330, y: 96, size: 62 }, board: { x: 1330, y: 250, w: 780 },
  } : {
    floorY: 1856, lift: { cx: 112, top: 356, bot: 1775, exitY: 424, slotY: 1725 }, hop: { x: 600, rim: 440 },
    feedEnd: [372, 868], beltEnd: 800, dir: -1,
    sort: [[868, 872], [912, 920], [912, 1166], [866, 1212.3], [286, 1248.4]], colX0: 772, colDx: -90, valveY: 1492,
    trough: [[834, 1640], [262, 1718], [184, 1725]],
    gearB: 140, gearC: 155,
    title: { x: 540, y: 92, size: 66 }, board: { x: 540, y: 226, w: 940 },
  };
  L.floorY = d.floorY; L.dir = d.dir; L.title = d.title; L.board = d.board;
  // --- Aufzug
  const lf = (L.lift = { ...d.lift, rs: 40 });
  lf.runX = lf.cx + lf.rs; lf.ballX = lf.runX + 32; lf.run = lf.bot - lf.top;
  lf.loop = 2 * lf.run + TAU * lf.rs; lf.n = Math.round(lf.loop / 185); lf.spacing = lf.loop / lf.n;
  // --- Behälter + Zellenrad
  // Einseitiger Behälter: Der Boden fällt vom Einlauf (links) zum Hals, rechts steht die Wand senkrecht über dem Hals.
  // So liegt immer nur eine Kugel über der Öffnung – zwei Kugeln können sich nicht mehr gegenseitig abstützen.
  const hp = (L.hop = { ...d.hop, neckHw: 27 });
  hp.xl = hp.x - 230; hp.xr = hp.x + hp.neckHw;
  hp.shoulder = hp.rim + 95; hp.neckTop = hp.shoulder + 86; hp.neckBot = hp.neckTop + 30;
  const wh = (L.wheel = { x: hp.x, y: hp.neckBot + 62, r: 62, rp: 42 });
  L.spawn = { x: hp.xl + 44, y: hp.rim + 30 };
  // --- Bahnen
  const P = (L.paths = {});
  P.shaft = buildPath([[lf.ballX, lf.slotY + 36], [lf.ballX, lf.exitY]]);
  P.top = buildPath([[lf.ballX, lf.exitY], [lf.ballX, lf.exitY - 42], [lf.ballX + 52, lf.exitY - 56], [L.spawn.x - 28, hp.rim - 22], [L.spawn.x, L.spawn.y]], 36);
  const ex = [wh.x, wh.y + wh.rp];
  P.feed = buildPath([ex, [wh.x, ex[1] + 56], d.feedEnd], 44);
  const by = d.feedEnd[1];
  P.belt = buildPath([d.feedEnd, [d.beltEnd, by]]);
  L.conv = { x0: d.feedEnd[0], x1: d.beltEnd, cy: by + R + BT + RD, top: by + R };
  P.sort = buildPath([[d.beltEnd, by], ...d.sort], 26);
  const sw = d.sort, cornerX = sw[sw.length - 2][0];
  // ab hier: gerades Sortierrohr (Hochkant: erst nach dem senkrechten Fallrohr suchen)
  L.railS0 = sAtAxis(P.sort, 'x', cornerX + d.dir * 14, land ? 0 : sAtAxis(P.sort, 'y', sw[sw.length - 2][1] - 30));
  L.scanS = L.railS0 + 20;
  P.trough = buildPath(d.trough, 60);
  L.cols = [];
  for (let i = 0; i < NCOL; i++) {
    const x = d.colX0 + i * d.colDx;
    const divS = sAtAxis(P.sort, 'x', x - d.dir * 30, L.railS0), midS = sAtAxis(P.sort, 'x', x, L.railS0);
    const a = pathAt(P.sort, divS, {}), b = pathAt(P.sort, midS, {});
    const tS = sAtAxis(P.trough, 'x', x), joinS = sAtAxis(P.trough, 'x', x - 40, tS);
    const c = pathAt(P.trough, tS, {}), e = pathAt(P.trough, joinS, {});
    const path = buildPath([[a.x, a.y], [b.x, b.y, 24], [c.x, c.y, 26], [e.x, e.y]]);
    const stopS = sAtAxis(path, 'y', d.valveY, 40);
    const hinge = pathAt(P.sort, midS + 29, {});
    L.cols.push({
      x, divS, joinS, path, stopS, valveY: d.valveY, railY: b.y, outS: sAtAxis(path, 'y', c.y - R - 20, stopS),
      hinge: { x: hinge.x, y: hinge.y + TUBE_IN - 3 }, closedAng: Math.atan2(-hinge.ty, -hinge.tx),
    });
  }
  // --- Zahnradzug am Antriebsroller des Förderbands (Modul 6): A auf der Trommelwelle -> B -> C -> Motorritzel D
  const m = 6, deg = Math.PI / 180, G = (L.gears = []);
  const add = (z, from, phi) => {
    const g = { z, m, r: (m * z) / 2 };
    if (!from) { g.x = L.conv.x1; g.y = L.conv.cy; } else {
      const dist = from.r + g.r; g.phi = phi * deg; g.from = from;
      g.x = from.x + Math.cos(g.phi) * dist; g.y = from.y + Math.sin(g.phi) * dist;
    }
    G.push(g); return g;
  };
  const gA = add(12), gB = add(22, gA, d.gearB), gC = add(30, gB, d.gearC), gD = add(10, gC, 180);
  L.motor = { x: gD.x - 190, y: gD.y - 70, w: 186, h: 140 };
  L.cabinet = land ? { x: 1030, y: 330, w: 190, h: 150 } : { x: 862, y: 1362, w: 176, h: 250 };
  const xs = L.cols.map((c) => c.x), x0 = Math.min(...xs), x1 = Math.max(...xs), ry = Math.min(...L.cols.map((c) => c.railY));
  L.sorter = { x: x0 - 56, y: ry - 66, w: x1 - x0 + 112, h: d.valveY + 48 - (ry - 66) };
  return L;
}
/** Position auf der Aufzugskette (u = Weg ab unterem Ende des Aufwärtstrums). out.a = Richtung nach außen. */
function liftPos(lf, u, out) {
  const arc = Math.PI * lf.rs;
  if (u < lf.run) { out.x = lf.runX; out.y = lf.bot - u; out.a = 0; }
  else if (u < lf.run + arc) { const a = -(u - lf.run) / lf.rs; out.x = lf.cx + lf.rs * Math.cos(a); out.y = lf.top + lf.rs * Math.sin(a); out.a = a; }
  else if (u < 2 * lf.run + arc) { out.x = lf.cx - lf.rs; out.y = lf.top + (u - lf.run - arc); out.a = Math.PI; }
  else { const a = Math.PI - (u - 2 * lf.run - arc) / lf.rs; out.x = lf.cx + lf.rs * Math.cos(a); out.y = lf.bot + lf.rs * Math.sin(a); out.a = a; }
  return out;
}

// =====================================================================
//  Simulation
// =====================================================================
class MarbleFactory {
  constructor({ seed, params, world, timeScale = 1 }) {
    // Zeitlupe: jeder Physikschritt deckt timeScale × 1/60 s Simulationszeit ab (1 = unverändert, bitgleich)
    this.dt = DT * timeScale; this.dtMs = DT_MS * timeScale;
    Common._nextId = 0; Common._seed = 0;                 // Matter-interne Zähler zurücksetzen -> reproduzierbar
    this.cfg = { seed, ...params };
    const L = (this.L = computeLayout(world));
    this.rng = new RNG(hashSeed(seed, 'marble')); this.fx = new RNG(hashSeed(seed, 'marble-fx'));
    this.particles = new Particles(320);
    this.engine = Engine.create({ positionIterations: 8, velocityIterations: 6 });
    this.world = this.engine.world;
    this.tick = 0; this.clock = 0; this.step = 0; this.t = 0;
    this.wheelAng = -HALF_PI + 0.4; this.pockets = [null, null, null, null]; this.wheelHalt = false;
    this.liftU = 0; this.liftHalt = false; this.slotBall = null; this.beltU = 0;
    this.carriers = Array.from({ length: L.lift.n }, (_, k) => ({ off: k * L.lift.spacing, u: k * L.lift.spacing, ball: null }));
    this.flaps = L.cols.map(() => ({ open: 0, want: false, flash: 0 }));
    this.valves = L.cols.map(() => ({ open: 0, cool: 0 }));
    this.scan = { a: 0, color: 0 };
    this.lastKick = 0; this.lastCapture = 0; this.lastShake = 0; this.neckT = 0;
    this._newStats();
    this._buildStatics(); this._buildTracks(); this._buildBalls();
    // Einlaufphase: das Video beginnt mit einer bereits arbeitenden Fabrik
    this.quiet = true;
    const warm = Math.round(this.cfg.warmup / this.dt);
    for (let i = 0; i < warm; i++) this._tick();
    this.quiet = false; this._newStats();
    for (const b of this.balls) b.laps = 0;
  }
  _newStats() { this.stats = { released: 0, cycles: 0, sorted: [0, 0, 0, 0, 0, 0], missorted: 0, kicks: 0, shakes: 0, priority: 0, maxJump: 0 }; }

  _buildStatics() {
    const { hop: h, wheel: w } = this.L, opt = { isStatic: true, friction: 0.004, frictionStatic: 0, restitution: 0.15 };
    const wall = (x1, y1, x2, y2) => {
      const th = 30, a = Math.atan2(y2 - y1, x2 - x1), mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      let nx = -Math.sin(a), ny = Math.cos(a);
      const ix = h.x - mx, iy = (Math.abs(nx) > 0.2 ? my : h.rim + 60) - my;   // Normale zeigt vom Innenraum weg
      if (nx * ix + ny * iy > 0) { nx = -nx; ny = -ny; }
      return Bodies.rectangle(mx + nx * th / 2, my + ny * th / 2, Math.hypot(x2 - x1, y2 - y1) + 2, th, { ...opt, angle: a });
    };
    const st = [
      wall(h.xl, h.rim, h.xr, h.rim), Bodies.circle(w.x, w.y, w.r, opt),
      wall(h.xl, h.rim - 10, h.xl, h.shoulder), wall(h.xl, h.shoulder, h.x - h.neckHw, h.neckTop),
      wall(h.x - h.neckHw, h.neckTop, h.x - h.neckHw, w.y), wall(h.xr, h.rim - 10, h.xr, w.y),
    ];
    this.statics = st.length;
    Composite.add(this.world, st);
  }

  _buildTracks() {
    const P = this.L.paths;
    const mk = (name, path, o) => ({ name, path, len: path.len, balls: [], drag: 0.4, vmin: 60, vmax: 1e9, gap: 2, blocked: false, ...o });
    this.tr = {
      top: mk('top', P.top, { drag: 0.4, vmin: 150 }),
      feed: mk('feed', P.feed, { drag: 0.6, vmin: 70 }),
      belt: mk('belt', P.belt, { belt: true }),
      rail: mk('rail', P.sort, { drag: 0.3, vmin: 120, vmax: 210, vmaxPre: 380 }),
      trough: mk('trough', P.trough, { drag: 0.12, vmin: 160, vmax: 400 }),
    };
    this.cols = this.L.cols.map((c, i) => mk('col', c.path, { drag: 0.3, vmin: 70, gap: 1, col: i, stopS: c.stopS }));
  }

  _buildBalls() {
    const n = this.cfg.balls, h = this.L.hop, tg = this.tr.trough;
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = this.rng.int(0, i); [order[i], order[j]] = [order[j], order[i]]; }
    this.balls = order.map((id) => ({
      id, color: id % NCOL, state: 'hopper', tr: null, s: 0, v: 0, rot: this.rng.range(0, TAU), spin: 1,
      x: 0, y: 0, px: NaN, py: NaN, bx: 0, by: 0, pass: false, entering: false, laps: 0, hopT: 0,
      body: Bodies.circle(0, 0, R, { restitution: 0.2, friction: 0.004, frictionStatic: 0, frictionAir: 0.012, density: 0.002 }),
    }));
    const inCol = [0, 0, 0, 0, 0, 0], rest = [];
    let inHop = 0;
    for (const b of this.balls) {
      if (inHop < 10) {
        const row = Math.floor(inHop / 5), k = inHop % 5;
        Body.setPosition(b.body, { x: h.xl + 36 + k * 46 + this.rng.range(-2, 2), y: h.rim + 76 - row * 48 });
        Composite.add(this.world, b.body); inHop++;
      } else if (inCol[b.color] < 3) {
        const tr = this.cols[b.color];
        b.state = 'track'; b.tr = tr; b.s = tr.stopS - inCol[b.color]++ * (2 * R + tr.gap); tr.balls.push(b);
      } else rest.push(b);
    }
    const sp = Math.min(150, (tg.len - ENTRY - 80) / Math.max(1, rest.length));
    rest.forEach((b, k) => { b.state = 'track'; b.tr = tg; b.s = tg.len - ENTRY - 20 - k * sp; b.v = tg.vmin; tg.balls.push(b); });
    this._positions();
  }

  setParam(k, v) { this.cfg[k] = v; }
  stepOnce() { this._tick(); this.step++; this.t = this.step * this.dt; }

  _tick() {
    this.tick++; this.clock = this.tick * this.dt;
    this._wheel();
    Engine.update(this.engine, this.dtMs);
    this._agitate();
    this._lift();
    const t = this.tr;
    this._advance(t.top); this._advance(t.feed); this._advance(t.belt); this._advance(t.rail);
    for (const c of this.cols) this._advance(c);
    this._advance(t.trough);
    this._controls();
    this._positions();
    this.particles.update(this.dt);
  }

  _room(tr) { const n = tr.balls.length; return !n || tr.balls[n - 1].s >= 2 * R + tr.gap; }
  _enter(b, tr, s, v) { b.state = 'track'; b.tr = tr; b.s = s; b.v = v; b.pass = false; b.entering = false; tr.balls.push(b); }

  // ---- Zellenrad: nimmt die unterste Kugel aus dem Behälterhals und gibt sie nach einer halben Drehung ins Fallrohr
  _wheel() {
    const w = this.L.wheel, om = HALF_PI / TUNE.release, feed = this.tr.feed, nextAng = this.wheelAng + om * this.dt;
    this.wheelHalt = false;
    for (let k = 0; k < 4; k++) {
      const b = this.pockets[k];
      if (!b || mod(nextAng + k * HALF_PI + HALF_PI, TAU) < Math.PI) continue;
      if (!this._room(feed)) { this.wheelHalt = true; continue; }
      const a = this.wheelAng + k * HALF_PI;
      b.bx = w.x + w.rp * Math.cos(a) - w.x; b.by = w.y + w.rp * Math.sin(a) - (w.y + w.rp);
      this.pockets[k] = null; this._enter(b, feed, 0, 90);
    }
    if (this.wheelHalt) return;
    this.wheelAng = mod(nextAng, TAU);
    for (let k = 0; k < 4; k++) {
      if (this.pockets[k] || mod(this.wheelAng + k * HALF_PI + HALF_PI, TAU) > 0.42) continue;
      let best = null;
      for (const b of this.balls) {
        if (b.state !== 'hopper') continue;
        const p = b.body.position, v = b.body.velocity;
        if (Math.abs(p.x - w.x) < 12 && p.y > w.y - w.r - R - 6 && v.x * v.x + v.y * v.y < 20 && (!best || p.y > best.body.position.y)) best = b;
      }
      if (!best) continue;
      const a = this.wheelAng + k * HALF_PI, p = best.body.position;
      best.bx = p.x - (w.x + w.rp * Math.cos(a)); best.by = p.y - (w.y + w.rp * Math.sin(a));
      best.rot = best.body.angle;
      Composite.remove(this.world, best.body);
      best.state = 'wheel'; best.pocket = k; this.pockets[k] = best;
      this.stats.released++; this.lastCapture = this.clock;
    }
  }
  /**
   * Sicherungen für den Behälter (greifen nur noch selten, seit der Boden einseitig zum Hals fällt):
   *  1. Brückenbrecher – bleibt der Hals länger als 0,5 s leer, obwohl Kugeln davor liegen, wird die unterste Kugel
   *     sanft zur Öffnung geschoben; ihre Nachbarinnen weichen ein Stück zurück. (Sofortiges Eingreifen störte das
   *     normale Nachrutschen und kostete Durchsatz; die Kugel über der Öffnung zu wählen verschlimmerte Staus.)
   *  2. Vorrang für Kugeln, die länger als 15 s im Behälter liegen.
   *  3. Rütteln – erst wenn 3 s lang keine Kugel aufgenommen wurde und auch keine im Hals bereitliegt.
   */
  _agitate() {
    const h = this.L.hop, w = this.L.wheel;
    let n = 0, inNeck = false, pick = null, old = null;
    for (const b of this.balls) {
      if (b.state !== 'hopper') continue;
      n++;
      if (!old || b.hopT < old.hopT) old = b;
      const p = b.body.position;
      if (p.y > h.neckTop - 4 && Math.abs(p.x - w.x) < 14) inNeck = true;
      else if (p.y > h.neckTop - 2.4 * R && (!pick || p.y > pick.body.position.y)) pick = b;
    }
    if (!n) { this.lastCapture = this.neckT = this.clock; return; }     // leerer Behälter ist kein Stau
    if (inNeck) this.neckT = this.clock;
    const jam = this.clock - this.lastCapture;
    if (jam > (inNeck ? 6 : 3) && this.clock - this.lastShake >= 0.4) {
      const a = Math.min(7, 2 + (jam - 3) * 0.8);
      for (const b of this.balls) {
        if (b.state !== 'hopper') continue;
        const v = b.body.velocity;
        Body.setVelocity(b.body, { x: v.x + this.rng.range(-0.5, 0.5) * a, y: v.y - this.rng.range(0.5, 1) * a });
      }
      this.lastShake = this.clock; this.stats.shakes++;
      return;
    }
    if (this.clock - old.hopT > 15) {
      const op = old.body.position, ov = old.body.velocity, tx = w.x - op.x, ty = h.neckTop - R - op.y, d = Math.hypot(tx, ty) || 1;
      const f = clamp(1 + (this.clock - old.hopT - 15) / 30, 1, 3);      // je länger sie wartet, desto stärker der Zug
      if (!(op.y > h.neckTop - 4 && Math.abs(tx) < 14)) {
        this.stats.priority++;
        Body.setVelocity(old.body, { x: ov.x + (tx / d) * 0.07 * f, y: ov.y + (ty / d) * 0.07 * f });
        for (const b of this.balls) {
          if (b.state !== 'hopper' || b === old) continue;
          const p = b.body.position, v = b.body.velocity, dx = p.x - op.x, dy = p.y - op.y, dd = Math.hypot(dx, dy) || 1;
          if (dd < 2 * R + 12 && p.y > op.y - 6) Body.setVelocity(b.body, { x: v.x + (dx / dd) * 0.09 * f, y: v.y - 0.06 * f });
        }
      }
    }
    if (inNeck || !pick || this.clock - this.neckT < 0.5 || this.clock - this.lastKick < 0.12) return;
    this.lastKick = this.clock; this.stats.kicks++;
    const lp = pick.body.position, lv = pick.body.velocity;
    Body.setVelocity(pick.body, { x: lv.x + clamp((w.x - lp.x) * 0.05, -1.2, 1.2), y: lv.y + 0.4 });
    for (const b of this.balls) {
      if (b.state !== 'hopper' || b === pick) continue;
      const p = b.body.position, v = b.body.velocity;
      if (p.y > h.neckTop - 3.2 * R && Math.hypot(p.x - lp.x, p.y - lp.y) < 2 * R + 6) {
        Body.setVelocity(b.body, { x: v.x + (p.x >= lp.x ? 0.9 : -0.9), y: v.y - 1.1 });
      }
    }
  }

  // ---- Kettenaufzug
  _lift() {
    const lf = this.L.lift, top = this.tr.top, dv = TUNE.lift * this.dt;
    let halt = false;
    for (const c of this.carriers) if (c.ball && lf.bot - mod(this.liftU + c.off + dv, lf.loop) - SEAT <= lf.exitY && !this._room(top)) halt = true;
    this.liftHalt = halt;
    if (!halt) this.liftU = mod(this.liftU + dv, lf.loop);
    for (const c of this.carriers) {
      const u = (c.u = mod(this.liftU + c.off, lf.loop));
      if (u >= lf.run) continue;
      const sy = lf.bot - u - SEAT, b = c.ball;
      if (b) {
        if (sy <= lf.exitY && this._room(top)) { c.ball = null; b.by = sy - lf.exitY; b.bx = 0; this._enter(b, top, 0, TUNE.lift); }
      } else if (this.slotBall && sy <= lf.slotY && sy > lf.slotY - 2 * dv - 1e-6) {
        const sb = this.slotBall; this.slotBall = null; c.ball = sb; sb.state = 'lift'; sb.carrier = c; sb.by = lf.slotY - sy; sb.bx = 0;
        this._spark(lf.ballX, lf.slotY + R, 0xffe2a0, 3);
      }
    }
  }
  _slotFree() {
    if (this.slotBall || this.liftHalt || this.tr.top.blocked) return false;
    const lf = this.L.lift, uS = lf.bot - lf.slotY - SEAT;
    let below = 1e9, above = 1e9;
    for (const c of this.carriers) { const dd = mod(uS - c.u, lf.loop); if (dd < below) below = dd; if (lf.loop - dd < above) above = lf.loop - dd; }
    return below >= TUNE.lift * (ENTRY / TUNE.entry) + 34 && above >= 2 * R + 10;
  }

  // ---- Bahnbewegung mit Stau-Logik
  _limit(tr, b, i) {
    let lim = i ? tr.balls[i - 1].s - (2 * R + tr.gap) : tr.len;
    const t = this.tr;
    if (tr === t.trough) { if (i === 0 && !b.entering) lim = Math.min(lim, tr.len - ENTRY); }
    else if (tr.col !== undefined) { if (!b.pass) lim = Math.min(lim, tr.stopS); }
    else if (tr === t.rail) {
      const cs = this.L.cols, c = b.color, own = cs[c].divS;
      lim = Math.min(lim, this.flaps[c].open >= 0.95 && this._room(this.cols[c]) ? own : own - 1);
      for (let j = 0; j < c; j++) if (this.flaps[j].open > 0.02 && b.s <= cs[j].divS - 8) lim = Math.min(lim, cs[j].divS - 8);
    }
    return lim;
  }
  _advance(tr) {
    const balls = tr.balls, t = this.tr;
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i], lim = this._limit(tr, b, i);
      let v = b.v;
      if (tr.belt) v = TUNE.belt;
      else if (b.entering) v = TUNE.entry;
      else {
        pathAt(tr.path, b.s, P0);
        v += (TUNE.G * P0.ty - tr.drag * v) * this.dt;
        const vmax = tr.vmaxPre && b.s < this.L.railS0 ? tr.vmaxPre : tr.vmax;
        if (v > vmax) v = Math.max(vmax, v - 2600 * this.dt);
        if (v < tr.vmin) v = tr.vmin;
        if (Math.abs(P0.tx) > 0.08) b.spin = P0.tx > 0 ? 1 : -1;
      }
      let ns = b.s + v * this.dt;
      if (ns >= lim) {
        ns = Math.max(b.s, lim);
        if (tr.col !== undefined && v > 160 && ns > b.s) this._clink(b, v);
        v = i ? Math.min(v, balls[i - 1].v) : 0;
      }
      const ds = ns - b.s;
      if (tr === t.rail && b.s < this.L.scanS && ns >= this.L.scanS) { this.scan.a = 1; this.scan.color = b.color; }
      b.s = ns; b.v = v;
      if (!tr.belt) b.rot += (b.spin * ds) / R;
    }
    // Übergänge
    tr.blocked = false;
    if (tr === t.rail) {
      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i], c = b.color;
        if (b.s < this.L.cols[c].divS - 1e-3 || this.flaps[c].open < 0.95 || !this._room(this.cols[c])) continue;
        balls.splice(i, 1); this._enter(b, this.cols[c], 0, b.v);
        this.stats.sorted[c]++; this.flaps[c].flash = 1;
      }
      return;
    }
    const b = balls[0];
    if (!b || b.s < tr.len - 1e-3) { if (tr === t.trough && b && !b.entering && b.s >= tr.len - ENTRY - 1e-3 && this._slotFree()) b.entering = true; return; }
    if (tr === t.top) {
      const sp = this.L.spawn;
      for (const o of this.balls) if (o.state === 'hopper' && Math.hypot(o.body.position.x - sp.x, o.body.position.y - sp.y) < 2 * R + 1) { tr.blocked = true; return; }
      pathAt(tr.path, tr.len, P0);
      balls.shift(); b.state = 'hopper'; b.tr = null; b.bx = b.by = 0; b.hopT = this.clock;
      Body.setPosition(b.body, { x: sp.x, y: sp.y }); Body.setAngle(b.body, b.rot); Body.setAngularVelocity(b.body, 0);
      Body.setVelocity(b.body, { x: P0.tx * b.v * DT, y: P0.ty * b.v * DT }); // Matter-Geschwindigkeit in px je 1/60 s (unabhängig vom Zeitschritt)
      Composite.add(this.world, b.body);
      b.laps++; this.stats.cycles++;
    } else if (tr === t.feed) { if (this._room(t.belt)) { balls.shift(); this._enter(b, t.belt, 0, TUNE.belt); } }
    else if (tr === t.belt) { if (this._room(t.rail)) { balls.shift(); this._enter(b, t.rail, 0, TUNE.belt); } }
    else if (tr === t.trough) { balls.shift(); b.state = 'slot'; b.tr = null; b.entering = false; this.slotBall = b; }
    else if (tr.col !== undefined) {
      const js = this.L.cols[tr.col].joinS;
      if (!this._joinClear(js, 2 * R + 12, 2 * R + 4)) return;
      balls.shift();
      const tb = t.trough.balls; let k = 0;
      while (k < tb.length && tb[k].s > js) k++;
      b.state = 'track'; b.tr = t.trough; b.s = js; b.v = Math.max(t.trough.vmin, b.v * 0.6); b.pass = false;
      tb.splice(k, 0, b);
    }
  }
  _joinClear(js, up, down) {
    for (const o of this.tr.trough.balls) if (o.s > js - up && o.s < js + down) return false;
    return true;
  }

  // ---- Klappen (Weichen) und Ventile
  _controls() {
    const cs = this.L.cols, rail = this.tr.rail.balls, K = this.cfg.buffer;
    for (let i = 0; i < NCOL; i++) {
      const f = this.flaps[i], c = cs[i], col = this.cols[i], cb = col.balls;
      let want = cb.length > 0 && cb[cb.length - 1].s < 2 * R + 14, target = false, foreign = false;
      for (const b of rail) {
        if (b.color === i) { if (b.s > c.divS - 95) target = true; }
        else if (b.s > c.divS - 34 && b.s < c.divS + 66) foreign = true;
      }
      if (target && !foreign && this._room(col)) want = true;
      if (want && !f.want) this._spark(c.hinge.x - this.L.dir * 28, c.hinge.y, COLORS[i].hex, 5);
      f.want = want;
      f.open = clamp(f.open + (want ? this.dt : -this.dt) / 0.14, 0, 1);
      f.flash = Math.max(0, f.flash - this.dt * 1.6);
      // Ventil: hält die Röhre gefüllt und gibt die unterste Kugel frei, sobald mehr als K warten
      const v = this.valves[i];
      v.cool = Math.max(0, v.cool - this.dt);
      let waiting = 0, front = null, passing = false;
      for (const b of cb) { if (b.pass) { if (b.s < col.stopS + 2 * R + 8) passing = true; } else { waiting++; if (!front) front = b; } }
      if (front && waiting > K && !cb[0].pass && v.cool <= 0 && front.s >= col.stopS - 0.5 && this._joinClear(c.joinS, 180, 2 * R + 8)) {
        front.pass = true; v.cool = 0.3; passing = true;
      }
      v.open = clamp(v.open + (passing ? this.dt : -this.dt) / 0.1, 0, 1);
    }
    this.scan.a = Math.max(0, this.scan.a - this.dt * 2.2);
    if (!this.tr.belt.balls.length || this.tr.belt.balls[0].v > 0) this.beltU += TUNE.belt * this.dt;
  }

  _positions() {
    const w = this.L.wheel, lf = this.L.lift, k = Math.exp(-this.dt / 0.06);
    let mj = this.stats.maxJump;
    for (const b of this.balls) {
      b.bx *= k; b.by *= k;
      if (b.state === 'hopper') { b.x = b.body.position.x; b.y = b.body.position.y; b.rot = b.body.angle; }
      else if (b.state === 'track') { pathAt(b.tr.path, b.s, P0); b.x = P0.x + b.bx; b.y = P0.y + b.by; }
      else if (b.state === 'wheel') {
        const a = this.wheelAng + b.pocket * HALF_PI;
        b.x = w.x + w.rp * Math.cos(a) + b.bx; b.y = w.y + w.rp * Math.sin(a) + b.by;
        if (!this.wheelHalt) b.rot += (HALF_PI / TUNE.release) * this.dt;
      } else if (b.state === 'slot') { b.x = lf.ballX; b.y = lf.slotY; }
      else { b.x = lf.ballX; b.y = lf.bot - b.carrier.u - SEAT + b.by; }
      if (b.px === b.px) { const j = Math.hypot(b.x - b.px, b.y - b.py); if (j > mj) mj = j; }
      b.px = b.x; b.py = b.y;
    }
    this.stats.maxJump = mj;
  }

  // ---- Effekte (eigener Zufallsgenerator, beeinflusst die Simulation nicht)
  _spark(x, y, color, n) {
    if (this.quiet) return;
    const f = this.fx;
    for (let i = 0; i < n; i++) {
      const a = f.range(0, TAU), sp = f.range(40, 150);
      this.particles.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 30, f.range(0.25, 0.5), f.range(5, 9), 1, 0.9, color, FX.T_SPARK, 1, 260, 2.5, 0, 0);
    }
  }
  _clink(b, v) {
    if (this.quiet) return;
    pathAt(b.tr.path, b.s, P1);
    this._spark(P1.x, P1.y + R, lerpColor(COLORS[b.color].hex, 0xffffff, 0.5), v > 320 ? 4 : 2);
    this.particles.spawn(P1.x, P1.y, 0, 0, 0.3, 30, 76, 0.28, COLORS[b.color].hex, FX.T_SOFT, 1, 0, 0, 0, 0);
  }

  counts() {
    const c = { hopper: 0, wheel: 0, top: 0, feed: 0, belt: 0, rail: 0, col: 0, trough: 0, slot: 0, lift: 0 };
    for (const b of this.balls) c[b.state === 'track' ? b.tr.name : b.state]++;
    return c;
  }
  checkInvariants() {
    const errors = [], seen = new Set(), n = this.balls.length;
    const mark = (b, where) => { if (seen.has(b.id)) errors.push(`Kugel ${b.id} doppelt (${where})`); seen.add(b.id); };
    for (const tr of [...Object.values(this.tr), ...this.cols]) {
      tr.balls.forEach((b, i) => {
        mark(b, tr.name);
        if (b.state !== 'track' || b.tr !== tr) errors.push(`Kugel ${b.id}: Bahn ${tr.name} inkonsistent`);
        if (!(b.s >= -1e-6 && b.s <= tr.len + 1e-6)) errors.push(`Kugel ${b.id}: s=${b.s} außerhalb von ${tr.name}`);
        if (i && tr.balls[i - 1].s - b.s < 2 * R - 0.01) errors.push(`Kugeln ${tr.balls[i - 1].id}/${b.id} überlappen auf ${tr.name}`);
        if (tr.col !== undefined && b.color !== tr.col) errors.push(`Kugel ${b.id}: falsche Farbröhre`);
      });
    }
    this.pockets.forEach((b, k) => { if (b) { mark(b, 'Rad'); if (b.state !== 'wheel' || b.pocket !== k) errors.push(`Kugel ${b.id}: Zellenrad inkonsistent`); } });
    for (const c of this.carriers) if (c.ball) { mark(c.ball, 'Aufzug'); if (c.ball.state !== 'lift' || c.ball.carrier !== c) errors.push(`Kugel ${c.ball.id}: Aufzug inkonsistent`); }
    if (this.slotBall) { mark(this.slotBall, 'Schacht'); if (this.slotBall.state !== 'slot') errors.push('Schachtkugel inkonsistent'); }
    let hop = 0;
    for (const b of this.balls) {
      if (b.state === 'hopper') { hop++; mark(b, 'Behälter'); }
      if (!(Number.isFinite(b.x) && Number.isFinite(b.y))) errors.push(`Kugel ${b.id}: NaN`);
      else if (b.x < 0 || b.x > this.L.DW || b.y < 0 || b.y > this.L.DH) errors.push(`Kugel ${b.id}: außerhalb der Anlage (${b.x.toFixed(0)}, ${b.y.toFixed(0)})`);
    }
    if (seen.size !== n) errors.push(`${seen.size} Kugeln auffindbar statt ${n}`);
    if (n !== this.cfg.balls) errors.push(`${n} Kugeln statt ${this.cfg.balls}`);
    const bodies = Composite.allBodies(this.world).length;
    if (bodies !== this.statics + hop) errors.push(`Physikwelt: ${bodies} Körper statt ${this.statics + hop}`);
    if (this.stats.missorted) errors.push(`${this.stats.missorted} falsch sortierte Kugeln`);
    if (this.stats.maxJump > 20) errors.push(`Sprung von ${this.stats.maxJump.toFixed(1)} Einheiten in einem Schritt`);
    return { ok: errors.length === 0, errors, bodies };
  }
  snapshot() {
    const c = this.counts(), s = this.stats;
    return {
      summary: `${fmtInt(s.cycles)} Umläufe · ${fmtInt(s.sorted.reduce((a, b) => a + b, 0))} sortiert · ${c.hopper} im Behälter`,
      t: this.t, step: this.step, ...s, sorted: [...s.sorted], counts: c,
      ballsTotal: this.balls.length, ballsExpected: this.cfg.balls,
      inHopper: c.hopper, inColumns: c.col, inLift: c.lift + c.slot, moving: this.balls.length - c.hopper - c.col,
      minLaps: Math.min(...this.balls.map((b) => b.laps)), maxLaps: Math.max(...this.balls.map((b) => b.laps)),
      particlesActive: this.particles.active, particleCap: this.particles.cap,
    };
  }
  stateHash() {
    const f = (v) => v.toFixed(4);
    let s = `${this.step}|${this.tick}|${JSON.stringify(this.stats)}|${f(this.wheelAng)}|${f(this.liftU)}|`;
    for (const b of this.balls) s += `${b.id}${b.state[0]}${f(b.x)},${f(b.y)},${f(b.s)};`;
    return fnv1a(s + this.rng.s + '|' + this.fx.s).toString(16).padStart(8, '0');
  }
  destroy() { Composite.clear(this.world, false); Engine.clear(this.engine); }
}

// =====================================================================
//  Zeichenhelfer (Canvas 2D) – alles in Design-Einheiten; PX = Gerätepixel je Einheit (für Schatten)
// =====================================================================
let PX = 1;
const css = (hex, a = 1) => `rgba(${(hex >> 16) & 255},${(hex >> 8) & 255},${hex & 255},${a})`;
const tone = (hex, t) => css(t >= 0 ? lerpColor(hex, 0xffffff, t) : lerpColor(hex, 0x000000, -t));
function lin(g, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); for (const [o, c] of stops) gr.addColorStop(o, c); return gr; }
function rad(g, x0, y0, r0, x1, y1, r1, stops) { const gr = g.createRadialGradient(x0, y0, r0, x1, y1, r1); for (const [o, c] of stops) gr.addColorStop(o, c); return gr; }
const shadow = (g, blur, ox, oy, a) => { g.shadowColor = `rgba(0,0,0,${a})`; g.shadowBlur = blur * PX; g.shadowOffsetX = ox * PX; g.shadowOffsetY = oy * PX; };
const noShadow = (g) => { g.shadowColor = 'rgba(0,0,0,0)'; g.shadowBlur = 0; g.shadowOffsetX = g.shadowOffsetY = 0; };
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
const circ = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); };
const STEEL = [[0, '#657180'], [0.45, '#434c58'], [1, '#262c35']];
const STEEL_DARK = [[0, '#3a424d'], [0.5, '#282e37'], [1, '#191d24']];
const CYL = [[0, '#161b22'], [0.2, '#77838f'], [0.36, '#eef3f8'], [0.52, '#93a0ad'], [0.82, '#3a434e'], [1, '#12161c']];
const BRASS_CYL = [[0, '#3d260a'], [0.2, '#c58f35'], [0.36, '#fff0b8'], [0.52, '#dba744'], [0.82, '#8a5a1c'], [1, '#33200a']];
const BRASS = [[0, '#ffe9a8'], [0.5, '#d9a23e'], [1, '#8a5a1c']];

function plate(g, x, y, w, h, r, o = {}) {
  g.save();
  if (o.shadow !== false) shadow(g, o.blur || 16, 5, 9, o.sa || 0.55);
  rr(g, x, y, w, h, r); g.fillStyle = lin(g, 0, y, 0, y + h, o.stops || STEEL); g.fill();
  noShadow(g);
  rr(g, x + 0.75, y + 0.75, w - 1.5, h - 1.5, Math.max(0, r - 0.75)); g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 1.5; g.stroke();
  g.beginPath(); g.moveTo(x + r, y + 2.2); g.lineTo(x + w - r, y + 2.2); g.strokeStyle = 'rgba(255,255,255,.26)'; g.lineWidth = 1.4; g.stroke();
  g.beginPath(); g.moveTo(x + r, y + h - 2.2); g.lineTo(x + w - r, y + h - 2.2); g.strokeStyle = 'rgba(0,0,0,.4)'; g.stroke();
  g.restore();
}
function bolt(g, x, y, r = 4.5, brass = false) {
  circ(g, x, y + 0.8, r + 1.2); g.fillStyle = 'rgba(0,0,0,.55)'; g.fill();
  circ(g, x, y, r); g.fillStyle = rad(g, x - r * 0.35, y - r * 0.4, 0.5, x, y, r, brass ? [[0, '#fff3c4'], [0.6, '#d19c3a'], [1, '#6e4613']] : [[0, '#e6ecf2'], [0.6, '#8a96a3'], [1, '#3b444f']]); g.fill();
  g.beginPath(); g.moveTo(x - r * 0.55, y + r * 0.2); g.lineTo(x + r * 0.55, y - r * 0.2); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = Math.max(0.8, r * 0.22); g.stroke();
}
/** Zylinder-/Manschettenband quer zur Richtung ang (Mittelpunkt x,y; Länge entlang, halbe Breite quer). */
function band(g, x, y, len, hw, ang, stops = CYL, sh = true) {
  g.save(); g.translate(x, y); g.rotate(ang);
  if (sh) shadow(g, 8, 2, 4, 0.5);
  rr(g, -len / 2, -hw, len, 2 * hw, Math.min(3, len / 3)); g.fillStyle = lin(g, 0, -hw, 0, hw, stops); g.fill();
  noShadow(g);
  g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.2; g.stroke();
  g.restore();
}
function trace(g, p, s0 = 0, s1 = p.len, dx = 0, dy = 0) {
  pathAt(p, s0, P0); g.moveTo(P0.x + dx, P0.y + dy);
  for (let i = Math.ceil(s0 / p.step + 1e-6); i * p.step < s1; i++) g.lineTo(p.x[i] + dx, p.y[i] + dy);
  pathAt(p, s1, P0); g.lineTo(P0.x + dx, P0.y + dy);
}
/** Zeichnet in eine Hilfsebene gleicher Größe/Transformation und legt sie anschließend über g. */
function onLayer(g, fn) {
  const c = document.createElement('canvas'); c.width = g.canvas.width; c.height = g.canvas.height;
  const t = c.getContext('2d'); t.setTransform(g.getTransform()); t.lineJoin = 'round';
  fn(t);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(c, 0, 0); g.restore();
}

// ---- Glasrohre: tubes = [{ p, s0, s1 }]
const traceAll = (g, tubes, dx = 0, dy = 0) => { g.beginPath(); for (const t of tubes) trace(g, t.p, t.s0, t.s1, dx, dy); };
function tubesBack(g, tubes) {
  g.save(); g.lineJoin = 'round';
  shadow(g, 18, 8, 14, 0.5);
  traceAll(g, tubes); g.lineWidth = 2 * TUBE_OUT; g.strokeStyle = 'rgba(7,13,21,.72)'; g.stroke();
  noShadow(g);
  traceAll(g, tubes); g.lineWidth = 2 * TUBE_IN; g.strokeStyle = 'rgba(96,150,190,.10)'; g.stroke();
  traceAll(g, tubes, 5, 9); g.lineWidth = 2 * TUBE_IN - 22; g.strokeStyle = 'rgba(120,180,220,.05)'; g.stroke();
  g.restore();
}
function tubesFront(g, tubes) {
  onLayer(g, (t) => {                       // Lichtreflexe, auf das Rohrinnere beschnitten
    traceAll(t, tubes, 7, 13); t.lineWidth = 9; t.strokeStyle = 'rgba(120,190,255,.13)'; t.stroke();
    traceAll(t, tubes, -6, -11); t.lineWidth = 8; t.strokeStyle = 'rgba(255,255,255,.20)'; t.stroke();
    traceAll(t, tubes, -8, -14.5); t.lineWidth = 2.6; t.strokeStyle = 'rgba(255,255,255,.80)'; t.stroke();
    t.globalCompositeOperation = 'destination-in';
    traceAll(t, tubes); t.lineWidth = 2 * TUBE_IN - 1; t.strokeStyle = '#000'; t.stroke();
  });
  onLayer(g, (t) => {                       // Glaswand: dunkle Außenkante + helle Kante, Inneres frei
    traceAll(t, tubes); t.lineWidth = 2 * TUBE_OUT + 3; t.strokeStyle = 'rgba(3,7,12,.85)'; t.stroke();
    traceAll(t, tubes); t.lineWidth = 2 * TUBE_OUT; t.strokeStyle = 'rgba(176,220,246,.62)'; t.stroke();
    t.globalCompositeOperation = 'destination-out';
    traceAll(t, tubes); t.lineWidth = 2 * TUBE_OUT - 5; t.strokeStyle = '#000'; t.stroke();
  });
}
/** Rundstab entlang einer Bahn (dy = senkrechter Versatz, w = Durchmesser, k = Helligkeit). */
function rod(g, p, s0, s1, dy, w, k) {
  g.save(); g.lineCap = 'round'; shadow(g, 8, 4, 7, 0.45);
  g.beginPath(); trace(g, p, s0, s1, 0, dy); g.lineWidth = w + 2; g.strokeStyle = '#080b0f'; g.stroke(); noShadow(g);
  g.lineWidth = w; g.strokeStyle = css(lerpColor(0x1c222a, 0x66727f, k)); g.stroke();
  g.beginPath(); trace(g, p, s0, s1, 0, dy - w * 0.2); g.lineWidth = w * 0.3; g.strokeStyle = `rgba(238,244,250,${0.85 * k})`; g.stroke();
  g.beginPath(); trace(g, p, s0, s1, 0, dy + w * 0.27); g.lineWidth = w * 0.28; g.strokeStyle = 'rgba(0,0,0,.4)'; g.stroke();
  g.restore();
}
function collar(g, p, s, len = 14, extra = 6, stops = CYL) {
  pathAt(p, s, P1);
  band(g, P1.x, P1.y, len, TUBE_OUT + extra, Math.atan2(P1.ty, P1.tx), stops);
}

// ---- Halle
function drawHall(g, L) {
  const W = L.DW, H = L.DH, fy = L.floorY, rng = new RNG(77);
  g.fillStyle = lin(g, 0, 0, 0, fy, [[0, '#090d14'], [0.45, '#161e2a'], [1, '#0f141c']]); g.fillRect(-2000, -2000, W + 4000, fy + 2000);
  // Wandplatten
  const pw = 240, ph = 260;
  for (let x = -pw; x < W + pw; x += pw) for (let y = -20; y < fy; y += ph) {
    const ox = (Math.round(y / ph) % 2) * (pw / 2);
    g.fillStyle = `rgba(255,255,255,${(rng.next() * 0.022).toFixed(3)})`; g.fillRect(x + ox + 2, y + 2, pw - 4, ph - 4);
    g.strokeStyle = 'rgba(0,0,0,.42)'; g.lineWidth = 2; g.strokeRect(x + ox, y, pw, ph);
    g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 1; g.strokeRect(x + ox + 2.5, y + 2.5, pw - 5, ph - 5);
    g.fillStyle = 'rgba(0,0,0,.5)';
    for (const [dx, dy] of [[12, 12], [pw - 12, 12], [12, ph - 12], [pw - 12, ph - 12]]) { circ(g, x + ox + dx, y + dy, 2.4); g.fill(); }
  }
  // Träger im Hintergrund
  for (let x = L.land ? 300 : 250; x < W; x += L.land ? 520 : 580) {
    g.fillStyle = lin(g, x - 26, 0, x + 26, 0, [[0, '#0b0f15'], [0.3, '#1c242f'], [0.5, '#283241'], [0.7, '#1a212b'], [1, '#090c11']]);
    g.fillRect(x - 26, -20, 52, fy + 20);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x - 34, -20, 8, fy + 20); g.fillRect(x + 26, -20, 8, fy + 20);
  }
  // Ferne Rohrleitungen
  for (const [yy, hh] of L.land ? [[452, 22], [492, 12]] : [[306, 20], [1560, 14]]) {
    g.fillStyle = lin(g, 0, yy, 0, yy + hh, [[0, '#0d1219'], [0.3, '#2c3848'], [0.5, '#3a485b'], [1, '#0b0f15']]);
    g.globalAlpha = 0.75; g.fillRect(-20, yy, W + 40, hh);
    for (let x = 90; x < W; x += 310) { g.fillStyle = '#222b38'; g.fillRect(x, yy - 4, 12, hh + 8); }
    g.globalAlpha = 1;
  }
  // Warme Lichtbänder an der Decke + Lichtkegel
  g.save(); g.globalCompositeOperation = 'lighter';
  const lamps = L.land ? [640, 1200, 1740] : [300, 800];
  for (const lx of lamps) {
    g.fillStyle = rad(g, lx, -40, 20, lx, 160, L.land ? 900 : 1000, [[0, 'rgba(255,186,110,.20)'], [0.4, 'rgba(255,160,90,.07)'], [1, 'rgba(255,150,80,0)']]);
    g.fillRect(-200, -200, W + 400, H + 400);
  }
  g.restore();
  for (const lx of lamps) {
    plate(g, lx - 130, 8, 260, 20, 6, { stops: STEEL_DARK, blur: 8 });
    g.save(); shadow(g, 0, 0, 0, 0); g.shadowColor = 'rgba(255,190,110,.9)'; g.shadowBlur = 26 * PX;
    rr(g, lx - 116, 22, 232, 7, 3.5); g.fillStyle = '#ffe9c4'; g.fill(); g.restore();
  }
  // Boden
  g.fillStyle = lin(g, 0, fy, 0, H, [[0, '#232c38'], [0.12, '#161c25'], [1, '#07090d']]); g.fillRect(-2000, fy, W + 4000, H - fy + 2000);
  g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(-2000, fy, W + 4000, 1.5);
  g.save(); g.beginPath(); g.rect(-2000, fy + 6, W + 4000, 9); g.clip();
  g.fillStyle = '#c99a1e'; g.fillRect(-2000, fy, W + 4000, 30);
  g.fillStyle = '#14171c';
  for (let x = -40; x < W + 40; x += 34) { g.beginPath(); g.moveTo(x, fy + 16); g.lineTo(x + 12, fy + 4); g.lineTo(x + 29, fy + 4); g.lineTo(x + 17, fy + 16); g.fill(); }
  g.restore();
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-2000, fy + 6, W + 4000, 9);
}

function post(g, x, y0, y1, w = 22) {
  g.save(); shadow(g, 12, 6, 6, 0.45);
  g.fillStyle = lin(g, x - w / 2, 0, x + w / 2, 0, [[0, '#1d232b'], [0.3, '#566170'], [0.5, '#6b7786'], [0.75, '#353d48'], [1, '#161a20']]);
  g.fillRect(x - w / 2, y0, w, y1 - y0); g.restore();
  plate(g, x - w / 2 - 12, y1 - 10, w + 24, 12, 3, { stops: STEEL_DARK, blur: 6 });
  for (let y = y0 + 26; y < y1 - 30; y += 64) { g.fillStyle = 'rgba(0,0,0,.4)'; rr(g, x - 4, y, 8, 22, 4); g.fill(); }
}

// ---- Schaltschrank mit Manometern (Wanddekor, über ein Leerrohr mit dem Boden verbunden)
function drawCabinet(g, L) {
  const c = L.cabinet, fy = L.floorY;
  g.save(); shadow(g, 8, 4, 5, 0.45);
  g.fillStyle = lin(g, c.x + c.w / 2 - 9, 0, c.x + c.w / 2 + 9, 0, [[0, '#14181e'], [0.4, '#4a5461'], [1, '#12151a']]);
  g.fillRect(c.x + c.w / 2 - 9, c.y + c.h, 18, fy + 10 - c.y - c.h); g.restore();
  plate(g, c.x, c.y, c.w, c.h, 10, { blur: 20 });
  rr(g, c.x + 10, c.y + 10, c.w - 20, c.h - 20, 6); g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1.5; g.stroke();
  rr(g, c.x + 11.5, c.y + 11.5, c.w - 23, c.h - 23, 5); g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1; g.stroke();
  const gr = Math.min(34, c.w * 0.19), gy = c.y + 26 + gr;
  [[c.x + c.w * 0.29, 0.62], [c.x + c.w * 0.71, 0.3]].forEach(([gx, val]) => {
    circ(g, gx, gy, gr + 5); g.fillStyle = lin(g, gx - gr, gy - gr, gx + gr, gy + gr, BRASS); g.fill(); g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 1.2; g.stroke();
    circ(g, gx, gy, gr); g.fillStyle = rad(g, gx, gy - gr * 0.3, 2, gx, gy, gr, [[0, '#f4f1e6'], [1, '#bdb8a6']]); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(30,30,30,.8)'; g.lineWidth = 1.2;
    for (let k = 0; k <= 10; k++) { const a = Math.PI * 0.75 + (k / 10) * Math.PI * 1.5; g.beginPath(); g.moveTo(gx + Math.cos(a) * gr * 0.78, gy + Math.sin(a) * gr * 0.78); g.lineTo(gx + Math.cos(a) * gr * 0.93, gy + Math.sin(a) * gr * 0.93); g.stroke(); }
    g.beginPath(); g.arc(gx, gy, gr * 0.86, Math.PI * 1.95, Math.PI * 2.25); g.strokeStyle = 'rgba(220,50,40,.9)'; g.lineWidth = 3; g.stroke();
    const a = Math.PI * 0.75 + val * Math.PI * 1.5;
    g.beginPath(); g.moveTo(gx - Math.cos(a) * gr * 0.18, gy - Math.sin(a) * gr * 0.18); g.lineTo(gx + Math.cos(a) * gr * 0.8, gy + Math.sin(a) * gr * 0.8); g.strokeStyle = '#c22a1e'; g.lineWidth = 2.2; g.lineCap = 'round'; g.stroke(); g.lineCap = 'butt';
    circ(g, gx, gy, 3.4); g.fillStyle = '#2a2a2a'; g.fill();
    g.save(); g.lineCap = 'round'; g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2.5; g.beginPath(); g.arc(gx, gy, gr * 0.8, Math.PI * 1.1, Math.PI * 1.4); g.stroke(); g.restore();
  });
  const sy = gy + gr + 20;
  for (let y = sy; y < c.y + c.h - 58; y += 12) { rr(g, c.x + 22, y, c.w - 44, 6, 3); g.fillStyle = lin(g, 0, y, 0, y + 6, [[0, '#0d1116'], [1, '#2c343e']]); g.fill(); }
  rr(g, c.x + 20, c.y + c.h - 44, c.w - 40, 24, 5); g.fillStyle = '#0a0d12'; g.fill(); g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 1.5; g.stroke();
  for (const [x, y] of [[c.x + 9, c.y + 9], [c.x + c.w - 9, c.y + 9], [c.x + 9, c.y + c.h - 9], [c.x + c.w - 9, c.y + c.h - 9]]) bolt(g, x, y, 3.4);
}

// ---- Behälter
function hopperPath(g, h, open = false) {
  g.beginPath(); g.moveTo(h.xl, h.rim); g.lineTo(h.xl, h.shoulder); g.lineTo(h.x - h.neckHw, h.neckTop); g.lineTo(h.x - h.neckHw, h.neckBot + 8);
  if (open) g.moveTo(h.x + h.neckHw, h.neckBot + 8); else g.lineTo(h.x + h.neckHw, h.neckBot + 8);
  g.lineTo(h.xr, h.rim);
  if (!open) g.closePath();
}

// =====================================================================
//  Statische Ebenen
// =====================================================================
function drawBack(g, L) {
  const { lift: lf, hop: h, wheel: w, conv: cv, paths: P, sorter: so, motor: mo } = L, fy = L.floorY;
  drawHall(g, L);
  // --- Tragwerk
  const pl = h.xl - 26, pr = h.x + 176;            // Stützen links neben dem Behälter und rechts neben dem Zellenrad
  for (const x of [pl, pr]) post(g, x, h.shoulder - 30, fy + 12, 20);
  g.save(); g.strokeStyle = 'rgba(70,82,96,.55)'; g.lineWidth = 7; g.lineCap = 'round'; shadow(g, 8, 4, 4, 0.4);
  const by0 = w.y + 150, by1 = Math.min(fy - 60, by0 + 240);
  g.beginPath(); g.moveTo(pl, by0); g.lineTo(pr, by1); g.moveTo(pr, by0); g.lineTo(pl, by1); g.stroke(); g.restore();
  plate(g, pl - 16, h.shoulder - 44, pr - pl + 32, 16, 4, { stops: STEEL_DARK });
  for (const x of [cv.x0 + 40, cv.x1 - 40]) post(g, x, cv.cy + 6, fy + 12, 18);
  for (const x of [so.x + 26, so.x + so.w - 26]) post(g, x, so.y + so.h - 12, fy + 12, 20);
  g.save(); g.strokeStyle = '#11151a'; g.lineWidth = 11; g.lineCap = 'round'; shadow(g, 8, 4, 5, 0.5);
  g.beginPath(); g.moveTo(mo.x + 40, mo.y + mo.h); g.bezierCurveTo(mo.x + 40, mo.y + mo.h + 70, mo.x - 30, mo.y + mo.h + 40, mo.x - 30, fy); g.stroke();
  noShadow(g); g.strokeStyle = 'rgba(255,255,255,.10)'; g.lineWidth = 2; g.stroke(); g.restore();
  drawCabinet(g, L);
  // --- Aufzugsschacht (Rückwand)
  const sx = lf.cx - lf.rs - 66, sw = lf.ballX + TUBE_OUT + 18 - sx, sy0 = lf.top - lf.rs - 62, sy1 = Math.min(L.DH - 8, lf.bot + lf.rs + 62);
  plate(g, sx, sy0, sw, sy1 - sy0, 26, { stops: [[0, '#2e3640'], [0.5, '#222830'], [1, '#161a20']], blur: 24 });
  rr(g, sx + 12, sy0 + 12, sw - 24, sy1 - sy0 - 24, 18);
  g.fillStyle = lin(g, sx, 0, sx + sw, 0, [[0, '#0a0d12'], [0.5, '#141a22'], [1, '#0a0d12']]); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 2; g.stroke();
  for (let y = lf.top + 30; y < lf.bot - 20; y += 92) { g.fillStyle = 'rgba(255,255,255,.03)'; g.fillRect(sx + 14, y, sw - 28, 2); g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(sx + 14, y + 2, sw - 28, 2); }
  for (const y of [sy0 + 7, sy1 - 7]) for (const x of [sx + 22, sx + sw - 22]) bolt(g, x, y, 3.6);
  // --- Sortierer-Gehäuse
  plate(g, so.x, so.y, so.w, so.h, 18, { blur: 26 });
  rr(g, so.x + 14, so.y + 46, so.w - 28, so.h - 60, 10);
  g.fillStyle = lin(g, 0, so.y, 0, so.y + so.h, [[0, '#0b0f15'], [1, '#141a23']]); g.fill(); g.strokeStyle = 'rgba(0,0,0,.75)'; g.lineWidth = 2.5; g.stroke();
  g.save(); rr(g, so.x + 14, so.y + 46, so.w - 28, so.h - 60, 10); g.clip();
  g.strokeStyle = 'rgba(255,255,255,.028)'; g.lineWidth = 1;
  for (let x = so.x + 14; x < so.x + so.w; x += 24) { g.beginPath(); g.moveTo(x, so.y); g.lineTo(x, so.y + so.h); g.stroke(); }
  L.cols.forEach((c, i) => {      // Farbspur hinter jeder Röhre
    g.fillStyle = lin(g, 0, c.railY, 0, c.valveY + 30, [[0, css(COLORS[i].hex, 0.0)], [0.5, css(COLORS[i].hex, 0.10)], [1, css(COLORS[i].hex, 0.22)]]);
    g.fillRect(c.x - 40, c.railY, 80, c.valveY + 40 - c.railY);
  });
  g.restore();
  for (const [x, y] of [[so.x + 14, so.y + 14], [so.x + so.w - 14, so.y + 14], [so.x + 14, so.y + so.h - 9], [so.x + so.w - 14, so.y + so.h - 9]]) bolt(g, x, y, 5);
  const nx = L.land ? so.x + so.w - 190 : so.x + 26;
  rr(g, nx, so.y + 12, 164, 24, 4); g.fillStyle = lin(g, 0, so.y + 12, 0, so.y + 36, BRASS); g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = 'rgba(40,24,4,.85)'; g.font = '700 14px Bahnschrift, "Segoe UI", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('COLOR SORTER · MK I', nx + 82, so.y + 25);
  // --- Getriebeträger + Motor
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; shadow(g, 18, 6, 10, 0.55);
  g.beginPath(); L.gears.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)));
  g.lineWidth = 58; g.strokeStyle = '#2b323c'; g.stroke(); noShadow(g);
  g.lineWidth = 50; g.strokeStyle = '#39424e'; g.stroke(); g.lineWidth = 34; g.strokeStyle = '#2a313b'; g.stroke(); g.restore();
  plate(g, mo.x, mo.y, mo.w, mo.h, 12, { blur: 20 });
  for (let y = mo.y + 18; y < mo.y + mo.h - 36; y += 13) {
    rr(g, mo.x + 14, y, mo.w - 62, 7, 3.5); g.fillStyle = lin(g, 0, y, 0, y + 7, [[0, '#0d1116'], [1, '#2c343e']]); g.fill();
  }
  rr(g, mo.x + 14, mo.y + mo.h - 30, 96, 18, 3); g.fillStyle = lin(g, 0, mo.y + mo.h - 30, 0, mo.y + mo.h - 12, BRASS); g.fill();
  g.fillStyle = 'rgba(40,24,4,.85)'; g.font = '700 11px Bahnschrift, "Segoe UI", Arial'; g.fillText('DRIVE 24 V', mo.x + 62, mo.y + mo.h - 20.5);
  for (const [x, y] of [[mo.x + 9, mo.y + 9], [mo.x + mo.w - 9, mo.y + 9], [mo.x + 9, mo.y + mo.h - 9], [mo.x + mo.w - 9, mo.y + mo.h - 9]]) bolt(g, x, y, 3.6);
  // --- Sammelrinne: zwei Stahlstangen als Laufschiene (hintere Stange + Halter + Stützen)
  const tr = P.trough;
  for (let s = 120; s < tr.len - 100; s += L.land ? 330 : 250) {
    pathAt(tr, s, P1); post(g, P1.x, P1.y + R + 12, fy + 10, 14);
    plate(g, P1.x - 20, P1.y + R + 4, 40, 14, 4, { stops: STEEL_DARK, blur: 6 });
  }
  rod(g, tr, 0, tr.len - 26, R - 8, 6, 0.45);
  // --- Förderband: Gestell hinten + Bandschleife
  const br = RD + BT / 2;
  plate(g, cv.x0 - 10, cv.cy - 8, cv.x1 - cv.x0 + 20, 16, 8, { stops: STEEL_DARK, blur: 20, sa: 0.6 });
  g.save(); shadow(g, 14, 6, 12, 0.5);
  g.beginPath(); g.moveTo(cv.x0, cv.cy - br); g.lineTo(cv.x1, cv.cy - br); g.arc(cv.x1, cv.cy, br, -HALF_PI, HALF_PI); g.lineTo(cv.x0, cv.cy + br); g.arc(cv.x0, cv.cy, br, HALF_PI, 3 * HALF_PI); g.closePath();
  g.lineWidth = BT; g.strokeStyle = '#14171c'; g.stroke(); noShadow(g);
  g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,255,255,.06)'; g.stroke(); g.restore();
  g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(cv.x0, cv.cy - RD - BT, cv.x1 - cv.x0, 1.4);
  // --- Glasrohre (Rückseite)
  tubesBack(g, L.tubes);
  // --- Behälter (Rückseite) + Radgehäuse
  g.save(); shadow(g, 22, 8, 14, 0.5); hopperPath(g, h); g.fillStyle = 'rgba(8,15,24,.80)'; g.fill(); g.restore();
  g.save(); hopperPath(g, h); g.clip();
  g.fillStyle = lin(g, h.xl, 0, h.xr, 0, [[0, 'rgba(120,180,220,.10)'], [0.3, 'rgba(120,180,220,.02)'], [0.8, 'rgba(120,180,220,.03)'], [1, 'rgba(120,180,220,.12)']]);
  g.fillRect(h.xl, h.rim, h.xr - h.xl, h.neckBot - h.rim + 10); g.restore();
  g.save(); shadow(g, 18, 6, 10, 0.55); circ(g, w.x, w.y, w.r + 15); g.fillStyle = '#12171e'; g.fill(); g.restore();
  circ(g, w.x, w.y, w.r + 2); g.fillStyle = rad(g, w.x, w.y, 10, w.x, w.y, w.r, [[0, '#0d1117'], [1, '#05070a']]); g.fill();
}

function drawFront(g, L) {
  const { lift: lf, hop: h, wheel: w, conv: cv, paths: P, sorter: so } = L;
  // --- Förderband: Seitenwange vorn mit Lagerschalen
  plate(g, cv.x0 - 6, cv.cy - 13, cv.x1 - cv.x0 + 12, 26, 13, { blur: 10, sa: 0.5 });
  for (let x = cv.x0 + 46; x < cv.x1 - 30; x += 58) { rr(g, x, cv.cy - 4, 30, 8, 4); g.fillStyle = 'rgba(0,0,0,.5)'; g.fill(); }
  g.save(); g.shadowColor = 'rgba(40,220,255,.9)'; g.shadowBlur = 10 * PX; g.fillStyle = 'rgba(120,235,255,.95)'; rr(g, cv.x0 + 30, cv.cy + 15.5, cv.x1 - cv.x0 - 60, 2.4, 1.2); g.fill(); g.restore();
  circ(g, cv.x0, cv.cy, 11); g.fillStyle = rad(g, cv.x0 - 3, cv.cy - 4, 1, cv.x0, cv.cy, 11, [[0, '#fff0bd'], [0.6, '#d19c3a'], [1, '#6e4613']]); g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.2; g.stroke();
  // --- Sammelrinne: vordere Stange + Klemmen
  const tr = P.trough;
  rod(g, tr, 0, tr.len - 26, R + 3, 9, 1);
  pathAt(tr, 0, P1);
  plate(g, P1.x - 7, P1.y - 4, 14, R + 20, 4, { blur: 8 });
  for (let s = 34; s < tr.len - 60; s += 110) { pathAt(tr, s, P1); band(g, P1.x, P1.y + R + 3, 9, 8.5, Math.atan2(P1.ty, P1.tx), BRASS_CYL); }
  // --- Glasrohre (Vorderseite) + Manschetten
  tubesFront(g, L.tubes);
  for (const c of L.collars) collar(g, c.p, c.s, c.len, c.extra, c.brass ? BRASS_CYL : CYL);
  // Messingmanschette am Übergang Zellenrad -> Fallrohr: waagerecht direkt unter dem Gehäusering (nicht dem Bogen folgend)
  pathAt(P.feed, sAtAxis(P.feed, 'y', w.y + w.r + 24), P1);
  band(g, P1.x, w.y + w.r + 24, 13, TUBE_OUT + 7, HALF_PI, BRASS_CYL);
  // --- Behälterglas
  onLayer(g, (t) => {
    t.fillStyle = 'rgba(255,255,255,.085)';
    const mid = (h.xl + h.xr) / 2, bw = (h.xr - h.xl) / 2;
    for (const [o, wd] of [[-bw * 0.72, 46], [-bw * 0.32, 16], [bw * 0.5, 30]]) {
      t.beginPath(); t.moveTo(mid + o + 60, h.rim); t.lineTo(mid + o + 60 + wd, h.rim); t.lineTo(mid + o + wd - 70, h.neckBot); t.lineTo(mid + o - 70, h.neckBot); t.fill();
    }
    t.strokeStyle = 'rgba(255,255,255,.55)'; t.lineWidth = 3; t.lineCap = 'round';
    t.beginPath(); t.moveTo(h.xl + 9, h.rim + 16); t.lineTo(h.xl + 9, h.shoulder - 6); t.lineTo(h.x - h.neckHw + 2, h.neckTop - 14); t.stroke();
    t.strokeStyle = 'rgba(150,210,255,.20)'; t.lineWidth = 5;
    t.beginPath(); t.moveTo(h.xr - 9, h.rim + 20); t.lineTo(h.xr - 9, h.neckTop - 6); t.stroke();
    t.globalCompositeOperation = 'destination-in'; hopperPath(t, h); t.fillStyle = '#000'; t.fill();
  });
  g.save(); g.lineJoin = 'round';
  hopperPath(g, h, true); g.lineWidth = 8; g.strokeStyle = 'rgba(3,7,12,.8)'; g.stroke();
  hopperPath(g, h, true); g.lineWidth = 4; g.strokeStyle = 'rgba(176,220,246,.66)'; g.stroke(); g.restore();
  plate(g, h.xl - 14, h.rim - 24, h.xr - h.xl + 28, 28, 7, { blur: 12 });
  for (let x = h.xl + 4; x <= h.xr - 3; x += (h.xr - h.xl - 8) / 6) if (Math.abs(x - (L.spawn.x - 14)) > 50) bolt(g, x, h.rim - 10, 4.2);
  rr(g, (h.xl + h.xr) / 2 - 30, h.rim - 34, 60, 12, 5); g.fillStyle = lin(g, 0, h.rim - 34, 0, h.rim - 22, BRASS); g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.2; g.stroke();
  band(g, h.x, h.neckTop + 4, 12, h.neckHw + 12, HALF_PI, BRASS_CYL);
  // --- Zellenrad-Gehäuse: Stahlring, Glasdeckel, Messingnabe
  g.save(); shadow(g, 10, 3, 6, 0.5);
  g.beginPath(); g.arc(w.x, w.y, w.r + 17, 0, TAU); g.arc(w.x, w.y, w.r + 3, 0, TAU, true);
  g.fillStyle = lin(g, w.x - w.r, w.y - w.r, w.x + w.r, w.y + w.r, [[0, '#8c98a6'], [0.45, '#48515d'], [1, '#1f242c']]); g.fill('evenodd'); g.restore();
  circ(g, w.x, w.y, w.r + 17); g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 1.5; g.stroke();
  circ(g, w.x, w.y, w.r + 3); g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 2; g.stroke();
  for (let k = 0; k < 8; k++) { const a = (k + 0.5) * TAU / 8; bolt(g, w.x + Math.cos(a) * (w.r + 10), w.y + Math.sin(a) * (w.r + 10), 3.4); }
  g.save(); g.lineCap = 'round'; g.strokeStyle = 'rgba(255,255,255,.34)'; g.lineWidth = 4; g.beginPath(); g.arc(w.x, w.y, w.r - 7, Math.PI * 1.08, Math.PI * 1.45); g.stroke();
  g.strokeStyle = 'rgba(160,215,255,.14)'; g.lineWidth = 6; g.beginPath(); g.arc(w.x, w.y, w.r - 9, Math.PI * 0.1, Math.PI * 0.42); g.stroke(); g.restore();
  circ(g, w.x, w.y, 13); g.fillStyle = rad(g, w.x - 4, w.y - 5, 1, w.x, w.y, 13, [[0, '#fff3c4'], [0.6, '#d19c3a'], [1, '#6e4613']]); g.fill(); g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 1.5; g.stroke();
  bolt(g, w.x, w.y, 4.4);
  // --- Sortierer: Scanner, Röhrenringe, Ventilblöcke, Farbschilder
  pathAt(P.sort, L.scanS, P1);
  const sa = Math.atan2(P1.ty, P1.tx);
  band(g, P1.x, P1.y, 34, TUBE_OUT + 10, sa, STEEL);
  band(g, P1.x, P1.y, 10, TUBE_OUT + 12, sa, BRASS_CYL, false);
  L.cols.forEach((c, i) => {
    band(g, c.x, c.railY + 58, 16, TUBE_OUT + 7, HALF_PI);
    rr(g, c.x - 18, c.railY + 54.5, 36, 7, 3.5); g.fillStyle = css(COLORS[i].hex, 0.95); g.fill(); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1; g.stroke();
    const vx = c.x - TUBE_OUT - 24, vy = c.valveY + R + 4;
    plate(g, vx, vy - 15, 26, 30, 5, { blur: 8 });
    bolt(g, vx + 13, vy - 7, 2.6); bolt(g, vx + 13, vy + 7, 2.6);
    band(g, c.x, c.valveY + R + 26, 10, TUBE_OUT + 5, HALF_PI);
    rr(g, c.x - 30, so.y + so.h - 21, 60, 11, 5.5); g.fillStyle = css(COLORS[i].hex, 0.9); g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.35)'; rr(g, c.x - 26, so.y + so.h - 19.5, 52, 3, 1.5); g.fill();
  });
  // --- Aufzug: Schachtfuß und -kopf
  plate(g, lf.ballX - TUBE_OUT - 8, lf.slotY + R + 8, 2 * TUBE_OUT + 16, 26, 6, { blur: 10 });
  bolt(g, lf.ballX - 22, lf.slotY + R + 21, 3.4); bolt(g, lf.ballX + 22, lf.slotY + R + 21, 3.4);
  for (const y of [lf.top, lf.bot]) { circ(g, lf.cx, y, 12); g.fillStyle = rad(g, lf.cx - 4, y - 4, 1, lf.cx, y, 12, [[0, '#fff3c4'], [0.6, '#d19c3a'], [1, '#6e4613']]); g.fill(); g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 1.4; g.stroke(); bolt(g, lf.cx, y, 4); }
}

// =====================================================================
//  Texturen für bewegte Teile
// =====================================================================
function drawGear(g, c, z, m, o = {}) {
  const rp = (m * z) / 2, ra = rp + m, rf = rp - 1.25 * m, pt = TAU / z;
  g.save(); g.translate(c, c);
  g.beginPath();
  for (let i = 0; i < z; i++) {
    const a = i * pt;
    for (const [r, f] of [[rf, -0.3], [rp, -0.25], [ra, -0.12], [ra, 0.12], [rp, 0.25], [rf, 0.3]]) g.lineTo(r * Math.cos(a + f * pt), r * Math.sin(a + f * pt));
    g.arc(0, 0, rf, a + 0.3 * pt, a + 0.7 * pt);
  }
  g.closePath();
  g.fillStyle = rad(g, 0, 0, rf * 0.2, 0, 0, ra, o.brass ? [[0, '#8a5a1c'], [0.6, '#c8923a'], [0.88, '#f1cf7a'], [1, '#b17f2e']] : [[0, '#2a313a'], [0.55, '#4d5763'], [0.86, '#8792a0'], [0.94, '#b3bdc9'], [1, '#6f7a87']]);
  g.fill(); g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 1.6; g.stroke();
  const rng = new RNG(z * 31 + 7);                              // Drehriefen
  for (let r = rf * 0.34; r < rf; r += 2.2) { circ(g, 0, 0, r); g.strokeStyle = rng.next() < 0.5 ? `rgba(255,255,255,${(rng.next() * 0.07).toFixed(3)})` : `rgba(0,0,0,${(rng.next() * 0.10).toFixed(3)})`; g.lineWidth = 1.1; g.stroke(); }
  circ(g, 0, 0, rf - 1.5); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5; g.stroke();
  if (z >= 18) {                                                 // vertiefter Steg mit Taschen
    g.beginPath(); g.arc(0, 0, rf * 0.82, 0, TAU); g.arc(0, 0, rf * 0.36, 0, TAU, true);
    g.fillStyle = rad(g, 0, 0, rf * 0.36, 0, 0, rf * 0.82, [[0, '#333b45'], [1, '#444e59']]); g.fill('evenodd');
    circ(g, 0, 0, rf * 0.82); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2; g.stroke();
    circ(g, 0, 0, rf * 0.82 - 2); g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.stroke();
    const nh = z >= 28 ? 6 : 5;
    for (let k = 0; k < nh; k++) {
      const a = (k * TAU) / nh, hx = Math.cos(a) * rf * 0.59, hy = Math.sin(a) * rf * 0.59, hr = rf * (z >= 28 ? 0.15 : 0.14);
      circ(g, hx, hy, hr); g.fillStyle = rad(g, hx, hy, 0, hx, hy, hr, [[0, '#07090c'], [0.8, '#0d1116'], [1, '#1c222a']]); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 1.5; g.stroke();
    }
  }
  const hub = z >= 18 ? rf * 0.3 : rf * 0.52;
  circ(g, 0, 0, hub); g.fillStyle = rad(g, 0, 0, 1, 0, 0, hub, o.brass ? [[0, '#59636f'], [1, '#2b323b']] : [[0, '#f6da8c'], [0.7, '#cf9a3a'], [1, '#855718']]); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 1.5; g.stroke();
  const nb = z >= 18 ? 6 : 3;
  for (let k = 0; k < nb; k++) { const a = (k + 0.5) * TAU / nb; bolt(g, Math.cos(a) * hub * 0.66, Math.sin(a) * hub * 0.66, Math.max(2, hub * 0.13)); }
  circ(g, 0, 0, hub * 0.36); g.fillStyle = rad(g, 0, 0, 0, 0, 0, hub * 0.36, [[0, '#59636f'], [1, '#161a20']]); g.fill(); g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = '#0a0c10'; g.fillRect(-hub * 0.09, -hub * 0.46, hub * 0.18, hub * 0.2);
  g.restore();
}
/** Feststehender Lichtreflex für rotierende Metallscheiben (Glanzkeile + Schattenseite). */
function drawDiscLight(g, c, r) {
  const cg = g.createConicGradient(-Math.PI * 0.93, c, c);
  for (const [o, a] of [[0, 0], [0.07, 0.34], [0.15, 0], [0.33, 0], [0.4, 0.1], [0.47, 0], [0.5, 0], [0.57, 0.2], [0.65, 0], [1, 0]]) cg.addColorStop(o, `rgba(255,255,255,${a})`);
  circ(g, c, c, r); g.fillStyle = cg; g.fill();
  g.fillStyle = lin(g, c - r * 0.7, c - r * 0.7, c + r * 0.7, c + r * 0.7, [[0, 'rgba(255,255,255,.10)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.34)']]); g.fill();
}
function drawBall(g, c, hex) {
  const r = R;
  circ(g, c, c, r);
  g.fillStyle = rad(g, c - r * 0.32, c - r * 0.38, r * 0.05, c, c, r, [[0, tone(hex, 0.55)], [0.3, tone(hex, 0.08)], [0.72, tone(hex, -0.34)], [1, tone(hex, -0.72)]]); g.fill();
  g.save(); g.clip(); g.globalCompositeOperation = 'lighter';
  g.fillStyle = rad(g, c + r * 0.36, c + r * 0.44, 0, c + r * 0.36, c + r * 0.44, r * 0.7, [[0, css(lerpColor(hex, 0xffffff, 0.35), 0.75)], [1, css(hex, 0)]]); g.fillRect(0, 0, 2 * c, 2 * c);
  g.restore();
  circ(g, c, c, r - 0.6); g.strokeStyle = css(lerpColor(hex, 0x000000, 0.8), 0.75); g.lineWidth = 1.3; g.stroke();
}
function drawSwirl(g, c) {                       // „Katzenauge“ im Glas – dreht sich beim Rollen mit
  g.save(); g.translate(c, c); circ(g, 0, 0, R * 0.86); g.clip();
  for (let k = 0; k < 3; k++) {
    g.rotate(TAU / 3);
    g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(R * 0.25, -R * 0.5, R * 0.75, -R * 0.42, R * 0.8, R * 0.02); g.bezierCurveTo(R * 0.55, -R * 0.12, R * 0.3, -R * 0.05, 0, 0);
    g.fillStyle = lin(g, 0, 0, R * 0.8, 0, [[0, 'rgba(255,255,255,.75)'], [1, 'rgba(255,255,255,.12)']]); g.fill();
  }
  g.restore();
}
function drawGloss(g, c) {
  const r = R;
  g.save(); g.translate(c - r * 0.36, c - r * 0.44); g.rotate(-0.62);
  g.beginPath(); g.ellipse(0, 0, r * 0.4, r * 0.2, 0, 0, TAU);
  g.fillStyle = rad(g, 0, 0, 0, 0, 0, r * 0.4, [[0, 'rgba(255,255,255,.98)'], [0.5, 'rgba(255,255,255,.7)'], [1, 'rgba(255,255,255,0)']]); g.fill(); g.restore();
  circ(g, c - r * 0.5, c - r * 0.2, r * 0.07); g.fillStyle = 'rgba(255,255,255,.7)'; g.fill();
  g.save(); g.lineCap = 'round'; g.strokeStyle = 'rgba(255,255,255,.34)'; g.lineWidth = 2.2;
  g.beginPath(); g.arc(c, c, r - 3.4, 0.25, 1.35); g.stroke(); g.restore();
  circ(g, c, c, r); g.fillStyle = rad(g, c, c, r * 0.72, c, c, r, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.30)']]); g.fill();
}

// =====================================================================
//  Renderer (PixiJS) – liest nur den Simulationszustand
// =====================================================================
class MarbleRenderer {
  constructor({ sim, view, renderScale = 1 }) {
    this.sim = sim; this.view = view; this.frame = 0; this.own = [];
    const L = (this.L = sim.L);
    PX = L.fit * renderScale;
    const ts = clamp(PX * 1.5, 1, 4);
    const tex = (w, h, draw) => { const t = canvasTex(w, h, draw, ts); this.own.push(t); return t; };
    this._prepare();
    this.root = new PIXI.Container();
    const cam = (this.cam = new PIXI.Container()); this.root.addChild(cam);
    cam.pivot.set(L.W / 2, L.H / 2); cam.position.set(L.W / 2, L.H / 2);
    const still = (draw) => {
      const t = canvasTex(L.W, L.H, (g) => { g.translate(L.ox, L.oy); g.scale(L.fit, L.fit); g.lineJoin = 'round'; draw(g, L); }, renderScale);
      this.own.push(t); cam.addChild(new PIXI.Sprite(t));
    };
    const layer = () => { const c = new PIXI.Container(); c.position.set(L.ox, L.oy); c.scale.set(L.fit); cam.addChild(c); return c; };
    const spr = (parent, t, x = 0, y = 0, o = {}) => {
      const s = new PIXI.Sprite(t); s.anchor.set(o.ax === undefined ? 0.5 : o.ax, o.ay === undefined ? 0.5 : o.ay); s.position.set(x, y);
      if (o.tint !== undefined) s.tint = o.tint; if (o.alpha !== undefined) s.alpha = o.alpha; if (o.add) s.blendMode = 'add'; if (o.scale) s.scale.set(o.scale);
      parent.addChild(s); return s;
    };
    const soft = getParticleTextures()[FX.T_SOFT];
    const { lift: lf, wheel: w, conv: cv } = L;

    still(drawBack);
    // ---------- bewegte Mechanik hinter den Kugeln
    const mech = layer();
    const tShadow = tex(64, 64, (g) => { g.fillStyle = rad(g, 32, 32, 0, 32, 32, 32, [[0, 'rgba(0,0,0,.75)'], [0.6, 'rgba(0,0,0,.4)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(0, 0, 64, 64); });
    const tLight = tex(128, 128, (g) => drawDiscLight(g, 64, 62));
    // Bandstollen, Stützrollen, Trommeln
    const tCleat = tex(8, 14, (g) => { rr(g, 1.5, 1, 5, 12, 2); g.fillStyle = lin(g, 0, 0, 8, 0, [[0, '#3a424d'], [0.5, '#59636f'], [1, '#262c34']]); g.fill(); });
    this.beltLoop = { x0: cv.x0, x1: cv.x1, cy: cv.cy, r: RD + BT / 2 + 0.5, len: 2 * (cv.x1 - cv.x0) + TAU * (RD + BT / 2 + 0.5) };
    const nc = Math.round(this.beltLoop.len / 24);
    this.cleats = Array.from({ length: nc }, (_, k) => ({ s: spr(mech, tCleat), off: (k * this.beltLoop.len) / nc }));
    const tIdler = tex(24, 24, (g) => {
      circ(g, 12, 12, 10); g.fillStyle = rad(g, 12, 12, 1, 12, 12, 10, [[0, '#2a313a'], [0.7, '#77828f'], [1, '#353d47']]); g.fill(); g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 1.2; g.stroke();
      g.fillStyle = '#12161b'; for (let k = 0; k < 3; k++) { circ(g, 12 + Math.cos(k * TAU / 3) * 5.4, 12 + Math.sin(k * TAU / 3) * 5.4, 1.9); g.fill(); }
    });
    this.idlers = [];
    for (let x = cv.x0 + 62; x < cv.x1 - 40; x += 62) this.idlers.push(spr(mech, tIdler, x, cv.cy - RD + 10.5));
    const tDrum = tex(2 * RD + 4, 2 * RD + 4, (g) => {
      const c = RD + 2;
      circ(g, c, c, RD); g.fillStyle = rad(g, c, c, 4, c, c, RD, [[0, '#2b323b'], [0.6, '#59636f'], [0.9, '#98a3af'], [1, '#4e5863']]); g.fill(); g.strokeStyle = 'rgba(0,0,0,.75)'; g.lineWidth = 1.5; g.stroke();
      for (let k = 0; k < 6; k++) { const a = (k * TAU) / 6, x = c + Math.cos(a) * RD * 0.62, y = c + Math.sin(a) * RD * 0.62; circ(g, x, y, RD * 0.17); g.fillStyle = '#090c10'; g.fill(); g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 1; g.stroke(); }
    });
    this.drums = [spr(mech, tDrum, cv.x0, cv.cy), spr(mech, tDrum, cv.x1, cv.cy)];
    for (const x of [cv.x0, cv.x1]) spr(mech, tLight, x, cv.cy, { scale: (2 * RD) / 124 });
    // Aufzug: Kettenräder, Kette, Träger
    const zS = 14, mS = (2 * (lf.rs - 5)) / zS, szS = Math.ceil(2 * (lf.rs + mS) + 6);
    const tSprocket = tex(szS, szS, (g) => drawGear(g, szS / 2, zS, mS));
    this.sprockets = [lf.top, lf.bot].map((y) => { spr(mech, tShadow, lf.cx + 6, y + 9, { scale: (2.5 * lf.rs) / 64, alpha: 0.7 }); return spr(mech, tSprocket, lf.cx, y); });
    for (const y of [lf.top, lf.bot]) spr(mech, tLight, lf.cx, y, { scale: (2 * (lf.rs - 6)) / 124 });
    const tLink = tex(18, 10, (g) => {
      rr(g, 1, 1.5, 16, 7, 3.5); g.fillStyle = lin(g, 0, 1, 0, 9, [[0, '#85909d'], [0.5, '#4a535e'], [1, '#22272e']]); g.fill(); g.strokeStyle = 'rgba(0,0,0,.75)'; g.lineWidth = 1; g.stroke();
      for (const x of [4.5, 13.5]) { circ(g, x, 5, 1.7); g.fillStyle = '#d7dee6'; g.fill(); }
    });
    const nl = Math.round(lf.loop / 15);
    this.links = Array.from({ length: nl }, (_, k) => ({ s: spr(mech, tLink), off: (k * lf.loop) / nl }));
    const tCarrier = tex(72, 44, (g) => {                     // Ursprung (10, 34): Kettenanschluss; +x zeigt nach außen
      g.save(); shadow(g, 5, 1, 3, 0.5);
      g.beginPath(); g.moveTo(6, 27); g.lineTo(58, 29.5); g.lineTo(60, 21); g.lineTo(63.5, 21); g.lineTo(62, 37); g.lineTo(6, 37); g.closePath();
      g.fillStyle = lin(g, 0, 26, 0, 38, [[0, '#fff0b8'], [0.35, '#dba744'], [1, '#7c4f16']]); g.fill(); g.restore();
      g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 1.2; g.stroke();
      rr(g, 2, 22, 17, 22, 4); g.fillStyle = lin(g, 0, 22, 0, 44, STEEL); g.fill(); g.strokeStyle = 'rgba(0,0,0,.7)'; g.stroke();
      bolt(g, 10.5, 28, 2.6); bolt(g, 10.5, 38.5, 2.6);
    });
    this.carrierSprites = sim.carriers.map(() => spr(mech, tCarrier, 0, 0, { ax: 10 / 72, ay: 34 / 44 }));
    // Zellenrad
    const wr = w.r, sw = 2 * wr + 4;
    const tRotor = tex(sw, sw, (g) => {
      const c = sw / 2;
      circ(g, c, c, wr - 1); g.fillStyle = rad(g, c, c, 6, c, c, wr, [[0, '#2b323b'], [0.6, '#56616d'], [0.92, '#a3aeba'], [1, '#5c6672']]); g.fill();
      for (let r = 12; r < wr; r += 3) { circ(g, c, c, r); g.strokeStyle = `rgba(0,0,0,${0.03 + 0.05 * ((r * 7) % 3) / 3})`; g.lineWidth = 1; g.stroke(); }
      for (let k = 0; k < 4; k++) { const a = k * HALF_PI + Math.PI / 4; bolt(g, c + Math.cos(a) * wr * 0.74, c + Math.sin(a) * wr * 0.74, 4.2, true); }
      g.save(); g.globalCompositeOperation = 'destination-out';
      for (let k = 0; k < 4; k++) { circ(g, c + Math.cos(k * HALF_PI) * w.rp, c + Math.sin(k * HALF_PI) * w.rp, R + 3.5); g.fill(); }
      g.restore();
      for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(c + Math.cos(k * HALF_PI) * w.rp, c + Math.sin(k * HALF_PI) * w.rp, R + 3.5, 0, TAU); g.save(); circ(g, c, c, wr - 1); g.clip(); g.beginPath(); g.arc(c + Math.cos(k * HALF_PI) * w.rp, c + Math.sin(k * HALF_PI) * w.rp, R + 4.2, 0, TAU); g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 2; g.stroke(); g.restore(); }
    });
    this.rotor = spr(mech, tRotor, w.x, w.y);
    // ---------- Kugeln
    const balls = layer();
    const tGlow = soft, c0 = R + 3, bs = 2 * c0;
    this.tBall = COLORS.map((c) => tex(bs, bs, (g) => drawBall(g, c0, c.hex)));
    const tSwirl = tex(bs, bs, (g) => drawSwirl(g, c0)), tGloss = tex(bs, bs, (g) => drawGloss(g, c0));
    const shL = new PIXI.Container(), glL = new PIXI.Container(), bdL = new PIXI.Container(), swL = new PIXI.Container(), gsL = new PIXI.Container();
    balls.addChild(shL, glL, bdL, swL, gsL);
    this.ballViews = sim.balls.map((b) => ({
      b, sh: spr(shL, tShadow, 0, 0, { alpha: 0 }), glow: spr(glL, tGlow, 0, 0, { tint: COLORS[b.color].hex, alpha: 0.2, add: true, scale: (R * 3.6) / 64 }),
      body: spr(bdL, this.tBall[b.color]), swirl: spr(swL, tSwirl, 0, 0, { tint: lerpColor(COLORS[b.color].hex, 0xffffff, 0.6), alpha: 0.6 }), gloss: spr(gsL, tGloss),
    }));
    // ---------- Klappen + Ventilstifte (liegen im Rohr, also vor den Kugeln, hinter dem Glas)
    const gates = layer();
    const tFlap = tex(64, 12, (g) => {
      g.save(); shadow(g, 4, 1, 2, 0.5); rr(g, 5, 3, 57, 6, 3); g.fillStyle = lin(g, 0, 3, 0, 9, [[0, '#fff0b8'], [0.4, '#dba744'], [1, '#7c4f16']]); g.fill(); g.restore();
      g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 1; g.stroke(); circ(g, 6, 6, 5); g.fillStyle = rad(g, 5, 5, 0.5, 6, 6, 5, [[0, '#e6ecf2'], [1, '#48515c']]); g.fill(); g.stroke();
    });
    this.flapSprites = L.cols.map((c) => spr(gates, tFlap, c.hinge.x, c.hinge.y, { ax: 6 / 64, ay: 0.5 }));
    const tPin = tex(54, 10, (g) => { rr(g, 1, 1.5, 52, 7, 3.5); g.fillStyle = lin(g, 0, 1, 0, 9, [[0, '#fff0b8'], [0.4, '#dba744'], [1, '#7c4f16']]); g.fill(); g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 1; g.stroke(); });
    this.pinSprites = L.cols.map((c) => spr(gates, tPin, c.x - TUBE_OUT - 6, c.valveY + R + 4, { ax: 0, ay: 0.5 }));
    still(drawFront);
    // ---------- Zahnräder (vor dem Bandgestell)
    const gearL = layer();
    this.gearSprites = L.gears.map((q, i) => {
      const sz = Math.ceil(2 * (q.r + q.m) + 6), t = tex(sz, sz, (g) => drawGear(g, sz / 2, q.z, q.m, { brass: i === 3 }));
      spr(gearL, tShadow, q.x + 8, q.y + 13, { scale: (2.7 * q.r) / 64, alpha: 0.75 });
      return { q, s: spr(gearL, t, q.x, q.y) };
    });
    for (const q of L.gears) spr(gearL, tLight, q.x, q.y, { scale: (2 * (q.r - 1.25 * q.m)) / 124 });
    // ---------- Lichter + Partikel
    const fx = layer();
    pathAt(L.paths.sort, L.scanS, P1);
    const perp = { x: -P1.ty, y: P1.tx }, sgn = perp.y < 0 ? 1 : -1;
    this.scanLight = spr(fx, soft, P1.x + perp.x * sgn * (TUBE_OUT + 12), P1.y + perp.y * sgn * (TUBE_OUT + 12), { add: true, scale: 1.5, alpha: 0 });
    this.scanCore = spr(fx, soft, this.scanLight.x, this.scanLight.y, { add: true, scale: 0.32, alpha: 0.5 });
    this.scanBeam = spr(fx, soft, P1.x, P1.y, { add: true, alpha: 0 }); this.scanBeam.scale.set(0.5, 1.5); this.scanBeam.rotation = Math.atan2(P1.ty, P1.tx);
    this.laneLights = L.cols.map((c, i) => spr(fx, soft, c.x, c.railY + 58, { add: true, tint: COLORS[i].hex, alpha: 0.3, scale: 1.5 }));
    this.laneBeams = L.cols.map((c, i) => { const s = spr(fx, soft, c.x, (c.railY + c.valveY) / 2 + 30, { add: true, tint: COLORS[i].hex, alpha: 0 }); s.scale.set(1.3, (c.valveY - c.railY) / 50); return s; });
    const mo = L.motor;
    this.motorLed = spr(fx, soft, mo.x + mo.w - 24, mo.y + mo.h - 21, { add: true, tint: 0x54ff9a, scale: 0.42 });
    spr(fx, soft, mo.x + mo.w - 24, mo.y + mo.h - 21, { add: true, tint: 0xd8ffe8, scale: 0.12 });
    const cb = L.cabinet;
    this.cabLeds = [0x54ff9a, 0xffc13a, 0x35d8ff].map((tint, i) => {
      const x = cb.x + 38 + i * ((cb.w - 76) / 2), y = cb.y + cb.h - 32;
      spr(fx, soft, x, y, { add: true, tint: lerpColor(tint, 0xffffff, 0.7), scale: 0.1 });
      return spr(fx, soft, x, y, { add: true, tint, scale: 0.42 });
    });
    this.pview = new ParticleView(sim.particles);
    fx.addChild(this.pview.normal, this.pview.add);
    // ---------- Vignette (nicht in der Kamera)
    const tVig = canvasTex(256, 256, (g) => { g.fillStyle = rad(g, 128, 118, 70, 128, 128, 190, [[0, 'rgba(0,0,0,0)'], [0.6, 'rgba(0,0,0,.16)'], [1, 'rgba(0,0,0,.62)']]); g.fillRect(0, 0, 256, 256); });
    this.own.push(tVig);
    const vig = new PIXI.Sprite(tVig); vig.width = L.W; vig.height = L.H; this.root.addChild(vig);
    // ---------- HUD
    this.hud = new PIXI.Container(); this.hud.position.set(L.ox, L.oy); this.hud.scale.set(L.fit); this.root.addChild(this.hud);
    this._buildHud(spr);
  }

  /** Rohr- und Manschettenlisten fürs statische Zeichnen (hängen nur vom Layout ab). */
  _prepare() {
    const L = this.L, P = L.paths;
    if (L.tubes) return;
    L.tubes = [
      { p: P.shaft, s0: 0, s1: P.shaft.len }, { p: P.top, s0: 0, s1: P.top.len - 34 },
      { p: P.feed, s0: L.wheel.r + 12 - L.wheel.rp, s1: P.feed.len - 36 },
      { p: P.sort, s0: 22, s1: L.cols[NCOL - 1].divS },
      ...L.cols.map((c) => ({ p: c.path, s0: 0, s1: c.outS })),
    ];
    const C = (L.collars = []);
    C.push({ p: P.shaft, s: 8, len: 16, extra: 7 }, { p: P.top, s: 6, len: 12, extra: 6, brass: true }, { p: P.top, s: P.top.len * 0.52, len: 12, extra: 5 }, { p: P.top, s: P.top.len - 40, len: 14, extra: 7 });
    for (let s = 230; s < P.shaft.len - 120; s += 250) C.push({ p: P.shaft, s, len: 10, extra: 4 });
    C.push({ p: P.feed, s: P.feed.len - 42, len: 14, extra: 7 });
    C.push({ p: P.sort, s: 30, len: 14, extra: 7, brass: true });
    if (!L.land) C.push({ p: P.sort, s: sAtAxis(P.sort, 'y', 1040), len: 12, extra: 5 });
    for (const c of L.cols) C.push({ p: c.path, s: c.outS - 7, len: 14, extra: 6 });
  }

  _buildHud(spr) {
    const L = this.L, T = L.title, B = L.board;
    const style = (size, weight, fill, ls, glow) => new PIXI.TextStyle({
      fontFamily: 'Bahnschrift, "Segoe UI", Arial, sans-serif', fontSize: size, fontWeight: weight, fill, letterSpacing: ls,
      dropShadow: glow ? { color: glow, alpha: 0.9, blur: 18, distance: 0, angle: 0 } : { color: 0x000000, alpha: 0.8, blur: 6, distance: 0, angle: 0 },
    });
    const g = new PIXI.Graphics();
    const a = new PIXI.Text({ text: 'ENDLESS MARBLE ', style: style(T.size, '800', 0xeafcff, 4, 0x22d3ee) });
    const b = new PIXI.Text({ text: 'FACTORY', style: style(T.size, '800', 0xffe1f1, 4, 0xff3f9e) });
    // Rahmenbreite folgt der tatsächlichen Schriftbreite (die Schrift ragte im Querformat über den festen Rahmen hinaus)
    const total = a.width + b.width, tw = Math.max(L.land ? 820 : 960, total + 64), th = T.size + 44;
    g.roundRect(T.x - tw / 2, T.y - th / 2, tw, th, 16).fill({ color: 0x0a0e15, alpha: 0.82 }).stroke({ width: 2, color: 0x4a5767, alpha: 0.9 });
    g.roundRect(T.x - tw / 2 + 8, T.y - th / 2 + 8, tw - 16, th - 16, 10).stroke({ width: 1.5, color: 0x22d3ee, alpha: 0.35 });
    g.roundRect(B.x - B.w / 2, B.y - 52, B.w, 104, 14).fill({ color: 0x0a0e15, alpha: 0.78 }).stroke({ width: 2, color: 0x3a4554, alpha: 0.9 });
    this.hud.addChild(g);
    a.anchor.set(0, 0.5); b.anchor.set(0, 0.5); a.position.set(T.x - total / 2, T.y + 2); b.position.set(T.x - total / 2 + a.width, T.y + 2);
    this.hud.addChild(a, b);
    const cw = (B.w - 250) / NCOL, x0 = B.x - B.w / 2 + 24;
    this.hCount = COLORS.map((c, i) => {
      const x = x0 + i * cw;
      spr(this.hud, this.tBall[i], x + 20, B.y - 8, { scale: 0.82 });
      const t = new PIXI.Text({ text: '0', style: style(30, '700', lerpColor(c.hex, 0xffffff, 0.35), 1) });
      t.anchor.set(0, 0.5); t.position.set(x + 46, B.y - 7); this.hud.addChild(t);
      return t;
    });
    const lab = new PIXI.Text({ text: 'SORTED BY COLOR', style: style(15, '600', 0x8fa0b8, 3) });
    lab.position.set(x0, B.y + 22); this.hud.addChild(lab);
    this.hCycles = new PIXI.Text({ text: '0', style: style(40, '800', 0xffffff, 1) });
    this.hCycles.anchor.set(1, 0.5); this.hCycles.position.set(B.x + B.w / 2 - 26, B.y - 9);
    this.hTime = new PIXI.Text({ text: '', style: style(15, '600', 0x8fa0b8, 3) });
    this.hTime.anchor.set(1, 0); this.hTime.position.set(B.x + B.w / 2 - 26, B.y + 22);
    this.hud.addChild(this.hCycles, this.hTime);
  }

  draw() {
    const sim = this.sim, L = this.L, t = sim.clock, lf = L.lift, bl = this.beltLoop;
    this.frame++;
    this.hud.visible = !!this.view.hud;
    if (this.view.camera) { this.cam.scale.set(1.012 + 0.006 * Math.sin(t * 0.21)); this.cam.position.set(L.W / 2 + Math.sin(t * 0.13) * 3 * L.fit, L.H / 2 + Math.cos(t * 0.17) * 2.5 * L.fit); }
    else { this.cam.scale.set(1); this.cam.position.set(L.W / 2, L.H / 2); }
    // Förderband
    const arc = Math.PI * bl.r, run = bl.x1 - bl.x0;
    for (const c of this.cleats) {
      const u = mod(sim.beltU + c.off, bl.len), s = c.s;
      if (u < run) { s.position.set(bl.x0 + u, bl.cy - bl.r); s.rotation = 0; }
      else if (u < run + arc) { const a = -HALF_PI + (u - run) / bl.r; s.position.set(bl.x1 + bl.r * Math.cos(a), bl.cy + bl.r * Math.sin(a)); s.rotation = a + HALF_PI; }
      else if (u < 2 * run + arc) { s.position.set(bl.x1 - (u - run - arc), bl.cy + bl.r); s.rotation = Math.PI; }
      else { const a = HALF_PI + (u - 2 * run - arc) / bl.r; s.position.set(bl.x0 + bl.r * Math.cos(a), bl.cy + bl.r * Math.sin(a)); s.rotation = a + HALF_PI; }
    }
    const thA = sim.beltU / RD;
    for (const d of this.drums) d.rotation = thA;
    for (const i of this.idlers) i.rotation = sim.beltU / 10;
    // Zahnradzug: jedes Rad wird vom vorherigen über das Zähneverhältnis mitgenommen
    L.gears.forEach((q, i) => { q.th = i ? q.phi + Math.PI + Math.PI / q.z - (q.from.th - q.phi) * (q.from.z / q.z) : thA; this.gearSprites[i].s.rotation = q.th; });
    // Aufzug
    for (const s of this.sprockets) s.rotation = -sim.liftU / (lf.rs - 2);
    for (const k of this.links) { liftPos(lf, mod(sim.liftU + k.off, lf.loop), P0); k.s.position.set(P0.x, P0.y); k.s.rotation = P0.a - HALF_PI; }
    sim.carriers.forEach((c, i) => { liftPos(lf, c.u, P0); const s = this.carrierSprites[i]; s.position.set(P0.x, P0.y); s.rotation = P0.a; });
    this.rotor.rotation = sim.wheelAng;
    // Kugeln
    const tr = sim.tr;
    for (const v of this.ballViews) {
      const b = v.b, x = b.x, y = b.y;
      v.body.position.set(x, y); v.gloss.position.set(x, y); v.glow.position.set(x, y);
      v.swirl.position.set(x, y); v.swirl.rotation = b.rot;
      const open = b.state === 'track' && (b.tr === tr.belt || b.tr === tr.trough || (b.tr === tr.feed && b.s > b.tr.len - 30));
      v.sh.alpha = open ? 0.8 : 0;
      if (open) { v.sh.position.set(x + 3, y + R - 1); v.sh.scale.set((R * 2.3) / 64, (R * 0.7) / 64); }
    }
    // Klappen, Ventile, Lichter
    L.cols.forEach((c, i) => {
      const f = sim.flaps[i], e = f.open * f.open * (3 - 2 * f.open);
      let da = HALF_PI - c.closedAng; da = Math.atan2(Math.sin(da), Math.cos(da));
      this.flapSprites[i].rotation = c.closedAng + da * e * 0.96;
      this.pinSprites[i].x = c.x - TUBE_OUT - 6 - sim.valves[i].open * 34;
      this.laneLights[i].alpha = 0.26 + 0.6 * f.flash + 0.06 * Math.sin(t * 2 + i);
      this.laneBeams[i].alpha = 0.22 * f.flash;
    });
    const sc = sim.scan, col = COLORS[sc.color].hex, pulse = 0.5 + 0.5 * Math.sin(t * 5);
    this.scanLight.tint = sc.a > 0.02 ? col : 0x7fe9ff; this.scanLight.alpha = 0.22 + 0.7 * sc.a + 0.08 * pulse;
    this.scanCore.tint = sc.a > 0.02 ? lerpColor(col, 0xffffff, 0.6) : 0xd8fbff;
    this.scanBeam.tint = col; this.scanBeam.alpha = 0.55 * sc.a;
    this.motorLed.alpha = 0.55 + 0.35 * Math.sin(t * 3);
    this.cabLeds.forEach((s, i) => { s.alpha = i === 1 ? (Math.sin(t * 2.6) > 0.2 ? 0.75 : 0.12) : 0.5 + 0.2 * Math.sin(t * (1.3 + i) + i); });
    this.pview.draw();
    const st = sim.stats, sig = st.cycles + '|' + st.sorted.join() + '|' + Math.floor(sim.step * DT);
    if (this.hud.visible && sig !== this.hudSig) {
      this.hudSig = sig;
      // Texte im Video englisch; Uhr = Videozeit (bei Zeitlupe läuft die Simulationszeit langsamer)
      st.sorted.forEach((n, i) => { this.hCount[i].text = fmtIntEn(n); });
      this.hCycles.text = fmtIntEn(st.cycles);
      this.hTime.text = `CYCLES  ·  ${fmtTime(sim.step * DT)}`;
    }
  }

  destroy() {
    this.root.destroy({ children: true });
    for (const t of this.own) t.destroy(true);
  }
}

// =====================================================================
//  Registrierung
// =====================================================================
EBS.registerScenario({
  id: 'marble',
  title: 'Endless Marble Factory',
  defaults: { balls: 35, buffer: 2, warmup: 30 },
  controls: [
    { key: 'balls', label: 'Anzahl der Kugeln', type: 'range', restart: true, min: 20, max: 35, step: 1, format: (v) => String(v) },
    { key: 'buffer', label: 'Kugeln je Farbröhre', type: 'range', min: 1, max: 3, step: 1, format: (v) => String(v) },
  ],
  normalizeParams(p) {
    return {
      balls: clamp(Math.round(num(p.balls, 35)), 20, 35),
      buffer: clamp(Math.round(num(p.buffer, 2)), 1, 3),
      warmup: clamp(num(p.warmup, 30), 0, 120),
    };
  },
  create: (ctx) => new MarbleFactory(ctx),
  createRenderer: (ctx) => new MarbleRenderer(ctx),
  panelStats(sim) {
    const s = sim.snapshot();
    return [
      { key: 'cycles', label: 'Umläufe', value: fmtInt(s.cycles) },
      { key: 'sorted', label: 'Sortiert', value: fmtInt(s.sorted.reduce((a, b) => a + b, 0)) },
      { key: 'hopper', label: 'Im Behälter', value: s.inHopper },
      { key: 'columns', label: 'In Farbröhren', value: s.inColumns },
      { key: 'moving', label: 'Unterwegs', value: s.moving },
      { key: 'lift', label: 'Im Aufzug', value: s.inLift },
    ];
  },
  panelNote: (sim) => sim.snapshot().summary,
});
})();
