/*
 * Szenario „Endless Pyramid“
 *
 * Geschlossener Kreislauf auf einer begrünten Glaspyramide:
 *   Lagune (Strömung) -> Tunnel im Pyramidenfuß -> Becherwerk im Glasschacht (Band über zwei Rollen,
 *   Becher schöpfen unten, kippen oben aus) -> Lichtimpuls zur Spitze -> gerade Schienen mit gleichem Gefälle,
 *   halbrunde Wendekappen an den Enden -> letzte Kappe lenkt nach unten -> freier Fall in die Lagune
 *
 * Bahnen sind deterministische Wege (wie in der Kugelfabrik): Rollbeschleunigung einer Vollkugel (5/7 g · Gefälle),
 * Rollreibung und Luftwiderstand; im freien Fall volle Erdbeschleunigung. Stau-Logik, Figuren werden nie erzeugt
 * oder gelöscht. Darstellung wahlweise als Leuchtkugeln oder als runde Tierchen mit Ärmchen und Beinchen –
 * die Darstellung ändert die Simulation nicht. Sämtliche Grafik entsteht per Canvas 2D im Code.
 */
(function () {
'use strict';
const { DT, RNG } = EBS;
const { clamp, num, bool, fnv1a, hashSeed, fmtInt, fmtIntEn } = EBS.util;

const TAU = Math.PI * 2;
const RP = 18;                                  // Rollenradius des Becherwerks
const PHI_D = -Math.PI / 2 - 0.5;               // Kippwinkel oben (kurz hinter dem Scheitel)
const TUNE = { Geff: 1000 * 5 / 7, G: 1000, mu: 12, cd: 0.0008, vMin: 8, vMax: 700, belt: 100, float: 80, spacing: 76 };
const MIN_SLOPE = 0.045;                        // flachstes Gefälle: auch bei 0,6× Schwerkraft rollt es noch (5/7·g·sin > Rollreibung)
const PULSE_TRAVEL = 0.35;                      // Sekunden, die der Lichtimpuls von der Rolle zur Spitze braucht
const COLORS = [
  { name: 'Gold', rgb: [255, 196, 52] },
  { name: 'Cyan', rgb: [64, 228, 255] },
  { name: 'Magenta', rgb: [255, 84, 214] },
  { name: 'Lime', rgb: [150, 255, 74] },
];
const POOL = 0, LIFT = 1, RAMP = 2;
const KIND_RAIL = 0, KIND_CURVE = 1, KIND_FALL = 2;
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mix = (c, d, k) => [Math.round(c[0] + (d[0] - c[0]) * k), Math.round(c[1] + (d[1] - c[1]) * k), Math.round(c[2] + (d[2] - c[2]) * k)];

// =====================================================================
//  Geometrie-Helfer
// =====================================================================
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const norm = (x, y) => { const d = Math.hypot(x, y) || 1; return [x / d, y / d]; };
function bezier(p0, p1, p2, p3, n, out) {
  for (let i = 1; i <= n; i++) {
    const t = i / n, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
}
function catmull(pts, seg = 18) {
  const out = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 1; k <= seg; k++) {
      const t = k / seg, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}
/**
 * Polylinie gleichmäßig nach Bogenlänge abtasten.
 * raw[i] = [x, y, Art des Abschnitts, der bei i endet, Drehwinkel einer rollenden Figur bei i].
 */
function resample(raw, step = 3) {
  const cum = [0];
  for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + dist(raw[i - 1], raw[i]));
  const len = cum[cum.length - 1], n = Math.max(2, Math.round(len / step) + 1), st = len / (n - 1);
  const x = new Float64Array(n), y = new Float64Array(n), rot = new Float64Array(n), k = new Uint8Array(n);
  for (let i = 0, j = 0; i < n; i++) {
    const s = Math.min(len, i * st);
    while (j < raw.length - 2 && cum[j + 1] < s) j++;
    const f = (s - cum[j]) / (cum[j + 1] - cum[j] || 1), a = raw[j], b = raw[j + 1];
    x[i] = a[0] + (b[0] - a[0]) * f; y[i] = a[1] + (b[1] - a[1]) * f;
    rot[i] = (a[3] || 0) + ((b[3] || 0) - (a[3] || 0)) * f;
    k[i] = b[2] || 0;
  }
  return { x, y, rot, k, n, step: st, len };
}
function pathAt(p, s, out) {
  const f = clamp(s, 0, p.len) / p.step; let i = Math.floor(f); if (i > p.n - 2) i = p.n - 2;
  const k = f - i, x0 = p.x[i], y0 = p.y[i], dx = p.x[i + 1] - x0, dy = p.y[i + 1] - y0, d = Math.hypot(dx, dy) || 1;
  out.x = x0 + dx * k; out.y = y0 + dy * k; out.tx = dx / d; out.ty = dy / d; out.k = p.k[i + 1];
  out.rot = p.rot[i] + (p.rot[i + 1] - p.rot[i]) * k;
  return out;
}
const Q = { x: 0, y: 0, tx: 1, ty: 0, k: 0, rot: 0 };

/** Becherwerk: Bandposition p (0 = rechter Fußpunkt der unteren Rolle, aufwärts gegen den Uhrzeigersinn). */
function beltAt(E, p, out) {
  p = ((p % E.loop) + E.loop) % E.loop;
  const { cx, yTop, yBot, rp, Lv } = E, arc = Math.PI * rp;
  let x, y, nx, ny, tx, ty;
  if (p < Lv) { x = cx + rp; y = yBot - p; nx = 1; ny = 0; tx = 0; ty = -1; }
  else if (p < Lv + arc) { const f = -(p - Lv) / rp; x = cx + rp * Math.cos(f); y = yTop + rp * Math.sin(f); nx = Math.cos(f); ny = Math.sin(f); tx = Math.sin(f); ty = -Math.cos(f); }
  else if (p < 2 * Lv + arc) { x = cx - rp; y = yTop + (p - Lv - arc); nx = -1; ny = 0; tx = 0; ty = 1; }
  else { const f = Math.PI - (p - 2 * Lv - arc) / rp; x = cx + rp * Math.cos(f); y = yBot + rp * Math.sin(f); nx = Math.cos(f); ny = Math.sin(f); tx = Math.sin(f); ty = -Math.cos(f); }
  out.x = x; out.y = y; out.nx = nx; out.ny = ny; out.tx = tx; out.ty = ty;
  out.bx = x + nx * E.bo; out.by = y + ny * E.bo;   // Mittelpunkt des Bechers bzw. der Figur darin
  return out;
}
const BQ = { x: 0, y: 0, nx: 0, ny: 0, tx: 0, ty: 0, bx: 0, by: 0 };

// =====================================================================
//  Layout: Pyramide aus drei Bodenecken (links, vorn, rechts; gleiche Höhe) + Spitze.
//  Gerechnet wird in einer Entwurfsfläche (Querformat 1920×1080, Hochkant 1080×1920); andere Seitenverhältnisse
//  (Quadrat) zeigen dieselbe Entwurfsfläche verkleinert und mittig – die Physik bleibt dadurch unverändert.
//  Die Schienen liegen außen auf dem Glas, das Becherwerk steht innen senkrecht unter der Spitze.
// =====================================================================
function computeLayout(world, size = 16) {
  // Figurradius R bestimmt Mindestabstand, Becher, Wendekappen und Tunnel
  const R = size, GAP = 2 * R + 6, BO = R + 5, TURN = Math.max(34, R + 16);
  const land = world.w >= world.h, DW = land ? 1920 : 1080, DH = land ? 1080 : 1920;
  const fit = Math.min(world.w / DW, world.h / DH);
  const d = land ? {
    apex: [960, 160], left: [236, 852], front: [700, 852], right: [1690, 852],
    horizon: 728, islandTop: 784, shore: 884, rails: 5, rail0: 120, clampX: 0,
    poolVia: [[330, 1004], [700, 1048], [1250, 1046], [1470, 1002], [1290, 952], [1090, 914]],
  } : {
    apex: [540, 540], left: [-150, 1404], front: [250, 1404], right: [1230, 1404],
    horizon: 1262, islandTop: 1318, shore: 1440, rails: 5, rail0: 110, clampX: 100,
    poolVia: [[124, 1640], [330, 1810], [720, 1836], [960, 1730], [950, 1590], [760, 1520], [640, 1466]],
  };
  const L = { land, R, GAP, W: DW, H: DH, fit, ox: (world.w - DW * fit) / 2, oy: (world.h - DH * fit) / 2, ...d };
  const A = d.apex, baseY = d.left[1], hgt = baseY - A[1], cx = A[0];
  const Lv = (v) => lerp2(d.left, A, v), Fv = (v) => lerp2(d.front, A, v), Rv = (v) => lerp2(d.right, A, v);
  const face = (u, v) => (u <= 1 ? lerp2(Lv(v), Fv(v), u) : lerp2(Fv(v), Rv(v), u - 1));
  const xL = (y) => d.left[0] + (A[0] - d.left[0]) * (baseY - y) / hgt;
  const xR = (y) => d.right[0] + (A[0] - d.right[0]) * (baseY - y) / hgt;
  const r = TURN, m = r + R + 14;
  const endL = (y) => Math.max(xL(y) + m, d.clampX), endR = (y) => Math.min(xR(y) - m, DW - d.clampX);
  Object.assign(L, { baseY, Lv, Fv, Rv, face, xL, xR });

  // --- Becherwerk: obere Rolle so hoch wie möglich, solange die erste Schiene lang genug bleibt
  const rho = RP + BO, dD = [Math.sin(PHI_D), -Math.cos(PHI_D)];
  const disch = (yt) => [cx + rho * Math.cos(PHI_D), yt + rho * Math.sin(PHI_D)];
  const start0 = (yt) => { const D = disch(yt); return [D[0] + dD[0] * 30, D[1] + dD[1] * 30 + 6]; };
  let yTop = A[1] + 40;
  while (start0(yTop)[0] - endL(start0(yTop)[1]) < d.rail0 && yTop < baseY - 200) yTop += 2;
  const yBot = d.shore - 4, Lvert = yBot - yTop, loop = 2 * Lvert + TAU * RP, nb = Math.round(loop / TUNE.spacing);
  L.lift = { cx, yTop, yBot, rp: RP, bo: BO, Lv: Lvert, loop, nb, spacing: loop / nb,
    pTop: Lvert + Math.PI / 2 * RP,                // Scheitel der oberen Rolle: Lichtimpuls
    pD: Lvert - PHI_D * RP };                      // Kippwinkel: Figur verlässt den Becher
  L.pick = [cx + RP + BO, yBot];
  L.disch = disch(yTop);
  L.tunnel = { cx, tw: Math.max(66, RP + BO + R + 8), top: baseY - 78 };

  // --- Schienen: Gefälle s so gewählt, dass die letzte Schiene knapp über dem Fuß endet
  function build(s, nRails) {
    const raw = [], rails = [], turns = [], lip = [];
    // Drehwinkel einer rollenden Figur: dθ = (Weg × Richtung zur Auflage) / R (ohne Schlupf)
    let rot = 0, prev = null;
    const add = (p, kind, C) => {
      if (prev) {
        const dx = p[0] - prev[0], dy = p[1] - prev[1];
        let nx, ny;
        if (C) [nx, ny] = norm(p[0] - C[0], p[1] - C[1]);                  // Wendekappe: Auflage außen
        else { const [tx, ty] = norm(dx, dy); [nx, ny] = tx >= 0 ? [-ty, tx] : [ty, -tx]; }   // Schiene: Auflage unten
        if (kind !== KIND_FALL) rot += (dx * ny - dy * nx) / R;
      }
      raw.push([p[0], p[1], kind, rot]); prev = p;
    };
    const D = disch(yTop), S0 = start0(yTop), d0 = norm(-1, s);
    add(D, KIND_RAIL); lip.push(D);
    const tr = []; bezier(D, [D[0] + dD[0] * 12, D[1] + dD[1] * 12], [S0[0] - d0[0] * 12, S0[1] - d0[1] * 12], S0, 10, tr);
    for (const p of tr) { add(p, KIND_RAIL); lip.push(p); }
    let P0 = S0, dir = -1, E = S0, drop = null;
    for (let k = 0; k < nRails; k++) {
      let x = P0[0];
      for (let it = 0; it < 40; it++) { const y = P0[1] + s * Math.abs(x - P0[0]); x = dir < 0 ? endL(y) : endR(y); }
      E = [x, P0[1] + s * Math.abs(x - P0[0])];
      rails.push({ a: P0, b: E, dir });
      const n = Math.max(2, Math.ceil(Math.abs(E[0] - P0[0]) / 8));
      for (let i = 1; i <= n; i++) add(lerp2(P0, E, i / n), KIND_RAIL);
      const C = [E[0], E[1] + r];
      if (k < nRails - 1) {
        turns.push({ C, dir });
        for (let i = 1; i <= 28; i++) { const a = -Math.PI / 2 + dir * Math.PI * i / 28; add([C[0] + r * Math.cos(a), C[1] + r * Math.sin(a)], KIND_CURVE, C); }
        P0 = [E[0], E[1] + 2 * r]; dir = -dir;
      } else {
        for (let i = 1; i <= 14; i++) { const a = -Math.PI / 2 + dir * Math.PI / 2 * i / 14; add([C[0] + r * Math.cos(a), C[1] + r * Math.sin(a)], KIND_CURVE, C); }
        const F0 = [C[0] + dir * r, C[1]], F1 = [F0[0], d.shore + 40];
        drop = { C, dir, from: F0, to: F1 };
        for (let i = 1; i <= 12; i++) add(lerp2(F0, F1, i / 12), KIND_FALL);
      }
    }
    return { raw, rails, turns, lip, drop, endY: E[1], slope: s };
  }
  // Gefälle so, dass die letzte Schiene knapp über dem Fuß endet; wird es zu flach (große Figuren), gibt es
  // zwei Schienen weniger – sonst gewänne die Rollreibung und die Figuren blieben stehen
  const solve = (nr) => {
    let lo = 0.005, hi = 0.35;
    for (let it = 0; it < 50; it++) { const mid = (lo + hi) / 2; if (build(mid, nr).endY > baseY - 44) hi = mid; else lo = mid; }
    return build(lo, nr);
  };
  let B = solve(d.rails);
  if (B.slope < MIN_SLOPE && d.rails > 3) B = solve(d.rails - 2);
  Object.assign(L, { rails: B.rails, turns: B.turns, lip: B.lip, drop: B.drop, slope: B.slope, splash: B.drop.to, turnR: r });
  L.paths = {
    ramp: resample(B.raw),
    pool: resample(catmull([B.drop.to, ...d.poolVia, L.pick]).map((p) => [p[0], p[1], 0, 0])),
  };
  // Stellen für Geräusche: Eintritt in eine Wendekappe, Beginn des freien Falls
  const P = L.paths.ramp; L.capS = []; L.fallS = P.len;
  for (let i = 1; i < P.n; i++) {
    if (P.k[i] === KIND_CURVE && P.k[i - 1] !== KIND_CURVE) L.capS.push({ s: i * P.step, x: P.x[i], y: P.y[i] });
    if (P.k[i] === KIND_FALL && P.k[i - 1] !== KIND_FALL && L.fallS === P.len) L.fallS = i * P.step;
  }
  L.fallRot = pathAt(P, L.fallS, { ...Q }).rot;
  return L;
}

// =====================================================================
//  Simulation
// =====================================================================
const VISUAL_FX = new Set(['pulse', 'splash']);
class PyramidSim {
  constructor({ seed, params, world, timeScale = 1 }) {
    this.cfg = { ...params }; this.world = world; this.L = computeLayout(world, params.size);
    this.dt = DT * (timeScale || 1);
    this.rng = new RNG(hashSeed('pyramid', seed));
    this.events = new Array(512); this.eventSeq = 0; this.fxSeq = 0; this.recent = [];
    this.liftPhase = 0; this.beltPos = 0;
    this._newStats();
    const n = this.cfg.orbs, P = this.L.paths;
    this.orbs = []; let c = this.rng.int(0, 3);
    for (let i = 0; i < n; i++) {
      c = (c + 1 + this.rng.int(0, 2)) % 4;
      this.orbs.push({ id: i, color: c, state: RAMP, s: P.ramp.len * (1 - (i + 0.5) / n) * 0.97, v: 150, laps: 0 });
    }
    // Einlaufphase: das Video beginnt mit einem bereits laufenden Kreislauf (Schritt 0 = Videobeginn)
    const warm = Math.round(this.cfg.warmup / this.dt);
    this.step = -warm; this.t = this.step * this.dt; this.lastPulse = { t: -99, color: 0 };
    this.quiet = true;
    for (let i = 0; i < warm; i++) this.stepOnce();
    this.quiet = false; this._newStats();
    for (const b of this.orbs) b.laps = 0;
  }
  _newStats() { this.stats = { pulses: 0, splashes: 0, lifted: 0, caps: 0, maxSpeed: 0 }; }
  setParam(k, v) { this.cfg[k] = v; }
  /** Ereignis für Tonspur (Weltkoordinaten) und Effekte (Entwurfskoordinaten); p = Stärke, c = Farbe. */
  _emit(type, x, y, c = -1, p = 1) {
    this.fxSeq++;
    if (VISUAL_FX.has(type)) { this.recent.push({ type, t: this.t, x, y, c, p, n: this.fxSeq }); if (this.recent.length > 40) this.recent.shift(); }
    if (this.quiet) return;
    const L = this.L;
    this.events[this.eventSeq % this.events.length] = { seq: this.eventSeq, step: this.step, t: this.t, type, x: L.ox + x * L.fit, y: L.oy + y * L.fit, p, c };
    this.eventSeq++;
  }
  _list(st) { return this.orbs.filter((b) => b.state === st).sort((a, b) => (b.s - a.s) || (a.id - b.id)); }
  /** Neue Figur am Anfang der Lagune; schwimmende Figuren davor werden vom Aufprall weitergeschoben. */
  _enterPool(b) {
    const GAP = this.L.GAP;
    b.state = POOL; b.s = 0;
    const l = this._list(POOL).reverse();
    for (let i = 1; i < l.length; i++) if (l[i].s < l[i - 1].s + GAP) l[i].s = l[i - 1].s + GAP;
  }
  stepOnce() {
    const dt = this.dt, T = TUNE, L = this.L, P = L.paths, E = L.lift, cfg = this.cfg, critters = cfg.figure === 1, GAP = L.GAP;
    this.step++; this.t = this.step * this.dt;
    // --- Schienenbahn (Führende zuerst)
    const gk = cfg.rollSpeed;
    let ahead = null;
    for (const b of this._list(RAMP)) {
      pathAt(P.ramp, b.s, Q);
      const a = Q.k === KIND_FALL ? T.G * gk * Q.ty : T.Geff * gk * Q.ty - T.mu - T.cd * b.v * b.v;
      b.v = clamp(b.v + a * dt, T.vMin, T.vMax);
      const s0 = b.s; b.s += b.v * dt;
      if (b.v > this.stats.maxSpeed) this.stats.maxSpeed = b.v;
      if (ahead && b.s > ahead.s - GAP) { b.s = ahead.s - GAP; b.v = Math.min(b.v, ahead.v); }
      else if (!ahead && b.s >= P.ramp.len) {
        const hit = b.v; b.v = Math.min(hit * 0.4, 200);
        this._enterPool(b); this.stats.splashes++;
        this._emit('splash', L.splash[0], L.splash[1], b.color, hit);
        continue;
      }
      for (const cp of L.capS) if (s0 < cp.s && b.s >= cp.s) { this.stats.caps++; this._emit(critters ? 'boing' : 'cap', cp.x, cp.y, b.color, b.v); }
      if (critters && s0 < L.fallS && b.s >= L.fallS) this._emit('wheee', L.drop.from[0], L.drop.from[1], b.color);
      ahead = b;
    }
    let rampMin = Infinity; for (const b of this.orbs) if (b.state === RAMP && b.s < rampMin) rampMin = b.s;
    // --- Lagune: Strömung zum Tunnel
    const float = T.float * cfg.current;
    ahead = null;
    for (const b of this._list(POOL)) {
      b.v += (float - b.v) * Math.min(1, 2.2 * dt);
      b.s += b.v * dt;
      const cap = ahead ? ahead.s - GAP : P.pool.len;
      if (b.s >= cap) { b.s = cap; b.v = ahead ? Math.min(b.v, ahead.v) : 0; }
      ahead = b;
    }
    // --- Becherwerk: läuft gleichmäßig; hält an, wenn oben die Schiene noch belegt ist
    const lift = this._list(LIFT), belt = T.belt * cfg.beltSpeed, dl = belt * dt;
    if (lift.length && lift[0].s + dl >= E.pD && rampMin < GAP) return;
    for (const b of lift) {
      const s0 = b.s; b.s += dl;
      if (s0 < E.pTop && b.s >= E.pTop) {
        this.stats.pulses++; b.laps++; this.lastPulse = { t: this.t, color: b.color };
        this._emit('pulse', L.apex[0], L.apex[1], b.color);
      }
      if (b.s >= E.pD) {
        b.state = RAMP; b.s = 0; b.v = belt * (RP + E.bo) / RP * 0.8; rampMin = 0;
        this._emit('tip', L.disch[0], L.disch[1], b.color);
      }
    }
    this.beltPos = (this.beltPos + dl) % E.loop;
    this.liftPhase += dl;
    if (this.liftPhase >= E.spacing) {
      this.liftPhase -= E.spacing;
      const head = this._list(POOL)[0];
      if (head && head.s >= P.pool.len - 0.5) {
        head.state = LIFT; head.s = this.liftPhase; head.v = 0; this.stats.lifted++;
        this._emit('scoop', L.pick[0], L.pick[1], head.color);
        if (critters) this._emit('squeak', L.pick[0], L.pick[1], head.color);
      }
    }
  }
  counts() {
    const c = { pool: 0, lift: 0, ramp: 0 };
    for (const b of this.orbs) c[['pool', 'lift', 'ramp'][b.state]]++;
    return c;
  }
  snapshot() {
    const c = this.counts(), s = this.stats;
    return {
      summary: `${fmtInt(s.pulses)} Lichtimpulse · ${c.ramp} auf der Bahn · ${c.pool} in der Lagune`,
      t: this.t, step: this.step, ...s, counts: c, orbs: this.orbs.length,
      inLift: c.lift, onRamp: c.ramp, inWater: c.pool,
      minLaps: Math.min(...this.orbs.map((b) => b.laps)), maxLaps: Math.max(...this.orbs.map((b) => b.laps)),
      layout: { rails: this.L.rails.length, slope: +this.L.slope.toFixed(4), poolLen: Math.round(this.L.paths.pool.len) },
    };
  }
  checkInvariants() {
    const errors = [], P = this.L.paths, n = this.orbs.length, GAP = this.L.GAP;
    if (n !== this.cfg.orbs) errors.push(`Figurenzahl ${n} statt ${this.cfg.orbs}`);
    if (new Set(this.orbs.map((b) => b.id)).size !== n) errors.push('Figur doppelt');
    if (P.pool.len < (n + 1) * GAP) errors.push('Lagune zu kurz für alle Figuren');
    const lens = [P.pool.len, this.L.lift.pD, P.ramp.len];
    for (const b of this.orbs) {
      if (!Number.isFinite(b.s) || !Number.isFinite(b.v)) errors.push(`Figur ${b.id}: ungültige Position`);
      if (b.s < -1e-6 || b.s > lens[b.state] + 1e-6) errors.push(`Figur ${b.id}: außerhalb der Bahn`);
    }
    for (const st of [POOL, LIFT, RAMP]) {
      const l = this._list(st);
      for (let i = 1; i < l.length; i++) if (l[i - 1].s - l[i].s < GAP - 1e-6) errors.push(`Figuren ${l[i - 1].id}/${l[i].id} überlappen`);
    }
    return { ok: errors.length === 0, errors };
  }
  stateHash() {
    let s = `${this.step}|${JSON.stringify(this.stats)}|${this.liftPhase.toFixed(4)}|${this.beltPos.toFixed(4)}|`;
    for (const b of this.orbs) s += `${b.id}${b.state}${b.s.toFixed(4)},${b.v.toFixed(4)};`;
    return fnv1a(s + this.rng.s).toString(16).padStart(8, '0');
  }
  destroy() {}
}

// =====================================================================
//  Grafik: Bausteine
// =====================================================================
const LEAF_DARK = ['#123a1a', '#174a1f', '#1d5a25', '#24692a'];
const LEAF_MID = ['#2c7a30', '#378a37', '#43993e', '#2f8034'];
const LEAF_LIGHT = ['#5aad48', '#6fbf52', '#86cc5d', '#9ed86a'];
const FLOWERS = ['#ffffff', '#ffd3ec', '#fff1a0', '#ffb36b', '#f6a8ff'];
const pick = (rng, a) => a[Math.floor(rng.next() * a.length)];
function poly(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); }
function dot(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
const line = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => lerp2(a, b, i / n));

/** Blattwerk entlang einer Linie; side(nx, ny, x, y) wählt die „positive“ Seite der Normalen. */
function foliage(g, rng, pts, wNeg, wPos, side, { dens = 3, rMin = 2, rMax = 6, skip = null, flowers = 0 } = {}) {
  const blobs = [];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], len = Math.hypot(x1 - x0, y1 - y0);
    if (!len) continue;
    let nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
    if (!side(nx, ny, x0, y0)) { nx = -nx; ny = -ny; }
    const steps = Math.max(1, Math.round(len / 3));
    for (let k = 0; k < steps; k++) {
      const f = k / steps, bx = x0 + (x1 - x0) * f, by = y0 + (y1 - y0) * f;
      if (skip && skip(bx, by)) continue;
      for (let m = 0; m < dens; m++) {
        const o = -wNeg + rng.next() * (wNeg + wPos), mid = (wPos - wNeg) / 2, half = (wPos + wNeg) / 2 || 1;
        const core = 1 - Math.min(1, Math.abs(o - mid) / half);
        blobs.push([bx + nx * o + rng.range(-2, 2), by + ny * o + rng.range(-2, 2), rMin + rng.next() * (rMax - rMin) * (0.45 + 0.55 * core)]);
      }
    }
  }
  for (const [x, y, r] of blobs) { g.fillStyle = pick(rng, LEAF_DARK); dot(g, x + 1, y + 1.6, r * 1.18); }
  for (const [x, y, r] of blobs) { g.fillStyle = pick(rng, LEAF_MID); dot(g, x, y, r); }
  for (const [x, y, r] of blobs) if (rng.next() < 0.55) { g.fillStyle = pick(rng, LEAF_LIGHT); dot(g, x - r * 0.3, y - r * 0.35, r * 0.5); }
  if (flowers) for (const [x, y, r] of blobs) if (rng.next() < flowers) { g.fillStyle = pick(rng, FLOWERS); dot(g, x + rng.range(-r, r), y + rng.range(-r, r), rng.range(1.1, 2.2)); }
}

function palm(g, rng, x, y, h, lean) {
  const cx = x + lean * h, cy = y - h, mx = x + lean * h * 0.15, my = y - h * 0.55;
  g.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const t0 = i / 12, t1 = (i + 1) / 12;
    const P = (t) => [(1 - t) * (1 - t) * x + 2 * (1 - t) * t * mx + t * t * cx, (1 - t) * (1 - t) * y + 2 * (1 - t) * t * my + t * t * cy];
    const a = P(t0), b = P(t1);
    g.strokeStyle = i % 2 ? '#7a5d3b' : '#6a4f31'; g.lineWidth = h * (0.075 - 0.035 * t0);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  }
  const n = 8 + rng.int(0, 2);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * Math.PI * 1.55 + rng.range(-0.15, 0.15);
    const len = h * rng.range(0.42, 0.6), ex = cx + Math.cos(a) * len, ey = cy + Math.sin(a) * len + len * 0.42;
    const qx = cx + Math.cos(a) * len * 0.62, qy = cy + Math.sin(a) * len * 0.62 - len * 0.16;
    g.strokeStyle = i % 2 ? '#1f5e26' : '#2a7330'; g.lineWidth = Math.max(1, h * 0.022);
    g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(qx, qy, ex, ey); g.stroke();
    for (let k = 1; k <= 9; k++) {
      const t = k / 10, u = 1 - t;
      const px = u * u * cx + 2 * u * t * qx + t * t * ex, py = u * u * cy + 2 * u * t * qy + t * t * ey;
      const tx = 2 * u * (qx - cx) + 2 * t * (ex - qx), ty = 2 * u * (qy - cy) + 2 * t * (ey - qy), tl = Math.hypot(tx, ty) || 1;
      const ll = h * 0.11 * (1 - t * 0.55);
      for (const sgn of [-1, 1]) {
        const nx = (-ty / tl) * sgn, ny = (tx / tl) * sgn;
        g.lineWidth = Math.max(0.8, h * 0.016);
        g.beginPath(); g.moveTo(px, py); g.lineTo(px + (nx * 0.7 + tx / tl * 0.45) * ll, py + (ny * 0.7 + ty / tl * 0.45) * ll + ll * 0.35); g.stroke();
      }
    }
  }
  g.fillStyle = '#4a3a22'; for (let i = 0; i < 3; i++) dot(g, cx + rng.range(-3, 3) * h / 60, cy + h * 0.03, h * 0.028);
}

function cloudSprite(rng, w, sc) {
  const h = w * 0.42, pad = 12, c = document.createElement('canvas');
  c.width = Math.ceil((w + pad * 2) * sc); c.height = Math.ceil((h + pad * 2) * sc);
  const tmp = document.createElement('canvas'); tmp.width = c.width; tmp.height = c.height;
  const t = tmp.getContext('2d'); t.scale(sc, sc); t.translate(pad, pad);
  for (let i = 0; i < 34; i++) {
    const fx = rng.range(0.12, 0.88), bulge = 1 - Math.abs(fx - 0.5) * 1.6;
    const r = w * rng.range(0.05, 0.12) * (0.6 + bulge * 0.6);
    t.fillStyle = 'rgba(255,255,255,.92)'; dot(t, fx * w, h * 0.7 - rng.next() * h * 0.42 * bulge, r);
  }
  t.globalCompositeOperation = 'source-atop';
  const gr = t.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.55, 'rgba(205,222,240,.25)'); gr.addColorStop(1, 'rgba(150,178,212,.7)');
  t.fillStyle = gr; t.fillRect(-pad, -pad, w + pad * 2, h + pad * 2);
  const g = c.getContext('2d'); g.filter = `blur(${1.6 * sc}px)`; g.drawImage(tmp, 0, 0);
  return { c, w: w + pad * 2, h: h + pad * 2 };
}

function orbSprite(col, sc, glow, R) {
  const r = glow ? R * 3.6 : R + 1, c = document.createElement('canvas');
  c.width = c.height = Math.ceil(r * 2 * sc * 2);
  const g = c.getContext('2d'); g.scale(sc * 2, sc * 2); g.translate(r, r);
  if (glow) {
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
    gr.addColorStop(0, rgba(col, 0.85)); gr.addColorStop(0.22, rgba(col, 0.38)); gr.addColorStop(0.55, rgba(col, 0.1)); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.fillRect(-r, -r, r * 2, r * 2);
  } else {
    const gr = g.createRadialGradient(-R * 0.35, -R * 0.4, 0, 0, 0, R * 1.05);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, rgba(mix(col, [255, 255, 255], 0.55), 1));
    gr.addColorStop(0.72, rgba(col, 1)); gr.addColorStop(1, rgba(mix(col, [0, 0, 0], 0.45), 1));
    g.fillStyle = gr; dot(g, 0, 0, R);
    g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, R - 0.5, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(-R * 0.38, -R * 0.45, R * 0.28, R * 0.18, -0.6, 0, TAU); g.fill();
  }
  return { c, r };
}

// =====================================================================
//  Tierchen: runde Körper (Küken, Pinguin, Schweinchen, Frosch) mit Ärmchen und Beinchen.
//  Körper, Bauch und feste Merkmale sind vorgezeichnet; Augen, Mund und Glieder entstehen je Bild (Mimik, Gezappel).
// =====================================================================
const SPECIES = [
  { name: 'Küken', body: '#ffd03c', hi: '#fff3b0', dark: '#c98a12', belly: '#fff2b8', arm: '#e9a91c', foot: '#ff9a1a', eyes: [0.34, -0.22, 0.24] },
  { name: 'Pinguin', body: '#2f9ad6', hi: '#8fd8ff', dark: '#174f78', belly: '#f4fbff', arm: '#1f6a9c', foot: '#ff9a1a', eyes: [0.31, -0.2, 0.24] },
  { name: 'Schweinchen', body: '#ff8ec7', hi: '#ffd1ea', dark: '#c4508d', belly: '#ffc0e0', arm: '#ef74b1', foot: '#b8467f', eyes: [0.36, -0.3, 0.22] },
  { name: 'Frosch', body: '#7fdc48', hi: '#d7ffb0', dark: '#3d8a26', belly: '#dcf8b2', arm: '#5bb534', foot: '#4a9e2b', eyes: [0.44, -0.8, 0.27] },
];
const OUTLINE = '#2a1f33';
function critterSprite(kind, sc, R) {
  const sp = SPECIES[kind], pad = R * 0.9, size = R * 2 + pad * 2, c = document.createElement('canvas');
  c.width = c.height = Math.ceil(size * sc * 2);
  const g = c.getContext('2d'); g.scale(sc * 2, sc * 2); g.translate(size / 2, size / 2);
  g.lineWidth = 1.6; g.strokeStyle = OUTLINE; g.lineJoin = 'round'; g.lineCap = 'round';
  // hinter dem Körper: Ohren, Augenhöcker, Schwänzchen
  if (kind === 2) {
    for (const s of [-1, 1]) { g.fillStyle = sp.body; poly(g, [[s * R * 0.25, -R * 0.85], [s * R * 0.85, -R * 1.2], [s * R * 0.8, -R * 0.45]]); g.fill(); g.stroke(); }
    g.strokeStyle = sp.dark; g.lineWidth = 1.8; g.beginPath(); g.moveTo(R * 0.9, R * 0.4);
    g.bezierCurveTo(R * 1.35, R * 0.2, R * 1.35, R * 0.75, R * 1.1, R * 0.6); g.stroke();
    g.strokeStyle = OUTLINE; g.lineWidth = 1.6;
  }
  if (kind === 3) for (const s of [-1, 1]) { g.fillStyle = sp.body; g.beginPath(); g.arc(s * R * 0.44, -R * 0.8, R * 0.4, 0, TAU); g.fill(); g.stroke(); }
  if (kind === 0) {
    g.strokeStyle = sp.dark; g.lineWidth = 1.8;
    for (const a of [-0.5, 0, 0.5]) { g.beginPath(); g.moveTo(Math.sin(a) * R * 0.9, -R * 0.9); g.quadraticCurveTo(Math.sin(a) * R * 1.4, -R * 1.25, Math.sin(a) * R * 1.05 + R * 0.25, -R * 1.45); g.stroke(); }
    g.strokeStyle = OUTLINE; g.lineWidth = 1.6;
  }
  // Körper
  const gr = g.createRadialGradient(-R * 0.35, -R * 0.42, R * 0.1, 0, 0, R * 1.08);
  gr.addColorStop(0, sp.hi); gr.addColorStop(0.55, sp.body); gr.addColorStop(1, sp.dark);
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
  // Bauch bzw. Gesichtsmaske
  g.save(); g.beginPath(); g.arc(0, 0, R - 0.5, 0, TAU); g.clip();
  g.fillStyle = sp.belly;
  if (kind === 1) { g.beginPath(); g.ellipse(-R * 0.3, -R * 0.12, R * 0.42, R * 0.48, 0, 0, TAU); g.ellipse(R * 0.3, -R * 0.12, R * 0.42, R * 0.48, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(0, R * 0.55, R * 0.62, R * 0.55, 0, 0, TAU); g.fill(); }
  else { g.globalAlpha = 0.85; g.beginPath(); g.ellipse(0, R * 0.55, R * 0.66, R * 0.5, 0, 0, TAU); g.fill(); g.globalAlpha = 1; }
  g.restore();
  g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
  if (kind === 3) for (const s of [-1, 1]) { g.fillStyle = sp.body; g.beginPath(); g.arc(s * R * 0.44, -R * 0.8, R * 0.33, 0, TAU); g.fill(); }
  // Schnabel, Rüssel, Bäckchen
  if (kind === 0 || kind === 1) { g.fillStyle = '#ff9a1a'; poly(g, [[-R * 0.17, R * 0.02], [R * 0.17, R * 0.02], [0, R * 0.3]]); g.fill(); g.stroke(); }
  if (kind === 2) {
    g.fillStyle = '#ff6fb1'; g.beginPath(); g.ellipse(0, R * 0.12, R * 0.3, R * 0.21, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#9b2f66'; dot(g, -R * 0.1, R * 0.12, R * 0.055); dot(g, R * 0.1, R * 0.12, R * 0.055);
  }
  if (kind !== 1) { g.fillStyle = 'rgba(255,90,140,.35)'; dot(g, -R * 0.58, R * 0.12, R * 0.14); dot(g, R * 0.58, R * 0.12, R * 0.14); }
  return { c, r: size / 2 };
}

/** Ein Glied (Arm oder Bein) vom Körperpunkt a zum Endpunkt b; Hand bzw. Fuß als kleine Kugel/Ellipse. */
function limb(g, a, b, col, end, foot, k) {
  g.strokeStyle = OUTLINE; g.lineWidth = 5.2 * k; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  g.strokeStyle = col; g.lineWidth = 3 * k; g.stroke();
  g.fillStyle = end; g.strokeStyle = OUTLINE; g.lineWidth = 1.3 * k;
  g.beginPath();
  if (foot) g.ellipse(b[0] + Math.sign(b[0]) * 1.8 * k, b[1] + 0.6 * k, 4.2 * k, 2.4 * k, 0, 0, TAU); else g.arc(b[0], b[1], 2.7 * k, 0, TAU);
  g.fill(); g.stroke();
}

/**
 * Zeichnet ein Tierchen. mode: 'roll' (Schiene), 'fall', 'lift' (im Becher), 'pool' (schwimmt).
 * ang = Körperdrehung (rollt ohne Schlupf), look = Blickrichtung in Weltkoordinaten, wig = Gezappel 0..2.
 */
function drawCritter(g, sprite, kind, id, x, y, ang, mode, t, speed, look, wig, R) {
  const sp = SPECIES[kind], ph = t * 9 + id * 1.7, w = wig, lk = R / 16;
  g.save(); g.translate(x, y); g.rotate(ang);
  g.lineCap = 'round'; g.lineJoin = 'round';
  // Glieder (hinter dem Körper)
  const sh = [R * 0.8, R * 0.05], hip = [R * 0.42, R * 0.78];
  let aL, aR, lL, lR;
  if (mode === 'fall') {
    aL = [-R * 1.02, -R * 0.78 + Math.sin(ph * 1.7) * 2.5 * w]; aR = [R * 1.02, -R * 0.78 + Math.sin(ph * 1.7 + 1.3) * 2.5 * w];
    lL = [-R * 0.66, R * 1.16 + Math.sin(ph * 2) * 1.5 * w]; lR = [R * 0.66, R * 1.16 - Math.sin(ph * 2) * 1.5 * w];
  } else if (mode === 'lift') {
    aL = [-R * 1.12, -R * 0.42]; aR = [R * 1.08 + Math.sin(ph * 0.8) * R * 0.1 * w, -R * 0.72 + Math.sin(ph * 0.8) * R * 0.28 * w];
    lL = [-R * 0.46, R * 1.14]; lR = [R * 0.46, R * 1.14];
  } else if (mode === 'pool') {
    aL = [-R * 1.18 + Math.cos(ph * 0.6) * 2 * w, R * 0.18 + Math.sin(ph * 0.6) * 2.5 * w];
    aR = [R * 1.18 - Math.cos(ph * 0.6 + 2) * 2 * w, R * 0.18 + Math.sin(ph * 0.6 + 2) * 2.5 * w];
  } else {
    const f = 0.4 + Math.min(1, speed / 320) * 0.6;
    aL = [-R * 1.16, -R * 0.08 + Math.sin(ph * 1.3) * R * 0.38 * w * f]; aR = [R * 1.16, -R * 0.08 + Math.sin(ph * 1.3 + 2.1) * R * 0.38 * w * f];
    lL = [-R * 0.55 + Math.sin(ph) * R * 0.18 * w * f, R * 1.16]; lR = [R * 0.55 - Math.sin(ph) * R * 0.18 * w * f, R * 1.16];
  }
  if (lL) { limb(g, [-hip[0], hip[1]], lL, sp.arm, sp.foot, true, lk); limb(g, hip, lR, sp.arm, sp.foot, true, lk); }
  limb(g, [-sh[0], sh[1]], aL, sp.arm, sp.arm, false, lk); limb(g, sh, aR, sp.arm, sp.arm, false, lk);
  g.drawImage(sprite.c, -sprite.r, -sprite.r, sprite.r * 2, sprite.r * 2);
  // Gesicht
  const [ex, ey, er] = sp.eyes, blink = ((t + id * 0.73) % (3.4 + (id % 5) * 0.37)) < 0.11;
  const cl = Math.cos(-ang), sl = Math.sin(-ang), lx = (look[0] * cl - look[1] * sl), ly = (look[0] * sl + look[1] * cl);
  g.strokeStyle = OUTLINE; g.lineWidth = 1.6 * lk;
  for (const s of [-1, 1]) {
    const cx = s * ex * R, cy = ey * R, rr = er * R * (mode === 'fall' ? 1.15 : 1);
    if (mode === 'pool' || (blink && mode !== 'fall')) {
      g.beginPath();
      if (mode === 'pool') g.arc(cx, cy + rr * 0.35, rr * 0.75, Math.PI * 1.15, Math.PI * 1.85); else { g.moveTo(cx - rr, cy); g.lineTo(cx + rr, cy); }
      g.stroke(); continue;
    }
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx, cy, rr, 0, TAU); g.fill(); g.stroke();
    if (mode === 'roll' && speed > 330) {                      // schwindelig: Spiralaugen
      g.strokeStyle = '#3a2a44'; g.lineWidth = 1.1; g.beginPath();
      for (let i = 0; i <= 14; i++) { const a = i * 0.9 + t * 14 * s, q = rr * 0.85 * i / 14; i ? g.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q) : g.moveTo(cx, cy); }
      g.stroke(); g.strokeStyle = OUTLINE; g.lineWidth = 1.6 * lk; continue;
    }
    const pr = rr * (mode === 'fall' ? 0.38 : 0.5), wob = Math.sin(t * 17 + id + s) * 0.12 * w;   // Wackelaugen
    g.fillStyle = '#1d1424'; dot(g, cx + (lx + wob) * (rr - pr), cy + (ly - wob) * (rr - pr), pr);
    g.fillStyle = '#ffffff'; dot(g, cx + (lx + wob) * (rr - pr) - pr * 0.35, cy + (ly - wob) * (rr - pr) - pr * 0.35, pr * 0.35);
  }
  // Mund
  const my = kind === 3 ? R * 0.05 : kind === 2 ? R * 0.42 : R * 0.42;
  g.strokeStyle = OUTLINE; g.lineWidth = 1.5 * lk;
  if (mode === 'fall' || (mode === 'roll' && speed > 330)) { g.fillStyle = '#5a1630'; g.beginPath(); g.ellipse(0, my + R * 0.05, R * 0.15, R * 0.19, 0, 0, TAU); g.fill(); g.stroke(); }
  else if (kind === 3) { g.beginPath(); g.arc(0, -R * 0.15, R * 0.62, Math.PI * 0.22, Math.PI * 0.78); g.stroke(); }
  else if (kind === 2) { g.beginPath(); g.arc(0, R * 0.3, R * 0.2, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); }
  g.restore();
}

// =====================================================================
//  Grafik: statische Ebenen
// =====================================================================
function drawSky(g, L) {
  const { W, H } = L;
  const gr = g.createLinearGradient(0, 0, 0, L.horizon);
  gr.addColorStop(0, '#0b3a9e'); gr.addColorStop(0.42, '#2a71dc'); gr.addColorStop(0.82, '#7ab8f2'); gr.addColorStop(1, '#c4e4ff');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const [ax, ay] = L.apex, rr = Math.max(W, H) * 0.55;
  const hz = g.createRadialGradient(ax, ay, 0, ax, ay, rr);
  hz.addColorStop(0, 'rgba(255,255,250,.55)'); hz.addColorStop(0.18, 'rgba(225,240,255,.25)'); hz.addColorStop(1, 'rgba(200,230,255,0)');
  g.fillStyle = hz; g.fillRect(0, 0, W, H);
}
const RAYS = [[-2.75, 0.07, 0.07], [-2.35, 0.05, 0.05], [-1.95, 0.09, 0.06], [-1.2, 0.06, 0.06], [-0.8, 0.08, 0.05], [-0.38, 0.06, 0.07], [0.12, 0.05, 0.05], [3.0, 0.05, 0.05]];

const GLASS_SEED = 4711;
function drawGlass(g, L, rng, alpha) {
  const A = L.apex, Lc = L.left, F = L.front, Rc = L.right, face = L.face, ROWS = 30;
  const faces = [
    { pts: [Lc, F, A], top: '#3f8fe6', bot: '#a3dcff', u0: 0, cols: 10 },
    { pts: [F, Rc, A], top: '#174aa6', bot: '#3c88d8', u0: 1, cols: 20 },
  ];
  g.save(); g.globalAlpha = alpha;
  for (const f of faces) {
    g.save(); poly(g, f.pts); g.clip();
    const xs = f.pts.map((p) => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs), yb = L.baseY;
    let gr = g.createLinearGradient(0, A[1], 0, yb);
    gr.addColorStop(0, f.top); gr.addColorStop(1, f.bot);
    g.fillStyle = gr; g.fillRect(x0, A[1], x1 - x0, yb - A[1]);
    gr = g.createLinearGradient(0, yb - 140, 0, yb);
    gr.addColorStop(0, 'rgba(0,25,70,0)'); gr.addColorStop(1, 'rgba(0,25,70,.3)');
    g.fillStyle = gr; g.fillRect(x0, yb - 140, x1 - x0, 140);
    for (let i = 0; i < ROWS; i++) for (let j = 0; j < f.cols; j++) {
      const r = rng.next(); if (r > 0.4) continue;
      const v0 = i / ROWS, v1 = (i + 1) / ROWS, ua = f.u0 + j / f.cols, ub = f.u0 + (j + 1) / f.cols;
      g.fillStyle = r < 0.2 ? `rgba(255,255,255,${rng.range(0.04, 0.13)})` : `rgba(0,30,100,${rng.range(0.04, 0.14)})`;
      poly(g, [face(ua, v0), face(ub, v0), face(ub, v1), face(ua, v1)]); g.fill();
    }
    gr = g.createLinearGradient(x0, A[1], x1, yb);
    for (const [p, a] of [[0, 0], [0.3, 0], [0.37, 0.24], [0.44, 0], [0.6, 0], [0.64, 0.12], [0.69, 0], [1, 0]]) gr.addColorStop(p, `rgba(255,255,255,${a})`);
    g.fillStyle = gr; g.fillRect(x0, A[1], x1 - x0, yb - A[1]);
    g.strokeStyle = 'rgba(225,242,255,.26)'; g.lineWidth = 1;
    for (let i = 1; i < ROWS; i++) { const a = face(f.u0, i / ROWS), b = face(f.u0 + 1, i / ROWS); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    for (let j = 1; j < f.cols; j++) { const a = face(f.u0 + j / f.cols, 0); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(A[0], A[1]); g.stroke(); }
    g.restore();
  }
  g.restore();
}
function drawRidge(g, L) {
  const F = L.front, A = L.apex;
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(20,50,90,.3)'; g.lineWidth = 12; g.beginPath(); g.moveTo(F[0] + 3, F[1]); g.lineTo(A[0] + 3, A[1]); g.stroke();
  g.strokeStyle = '#f2f7fa'; g.lineWidth = 7; g.beginPath(); g.moveTo(F[0], F[1]); g.lineTo(A[0], A[1]); g.stroke();
}

function drawBack(g, L, rng) {
  const { W } = L;
  let gr = g.createLinearGradient(0, L.horizon, 0, L.shore);
  gr.addColorStop(0, '#6ab3ea'); gr.addColorStop(0.25, '#3591d8'); gr.addColorStop(1, '#2e9fd2');
  g.fillStyle = gr; g.fillRect(0, L.horizon, W, L.shore - L.horizon + 2);
  g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(0, L.horizon, W, 1.5);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${rng.range(0.05, 0.16)})`; g.fillRect(rng.range(0, W), rng.range(L.horizon + 4, L.islandTop), rng.range(20, 120), 1); }
  for (const [cx, w, h] of L.land ? [[120, 260, 26], [1830, 300, 30]] : [[90, 200, 22], [990, 240, 26]]) {
    g.fillStyle = 'rgba(96,150,190,.55)'; g.beginPath(); g.ellipse(cx, L.horizon + 2, w / 2, h, 0, Math.PI, TAU); g.fill();
  }
  const top = [], ph = [rng.range(0, 6), rng.range(0, 6), rng.range(0, 6)];
  for (let x = -10; x <= W + 10; x += 6) top.push([x, L.islandTop + Math.sin(x * 0.021 + ph[0]) * 7 + Math.sin(x * 0.063 + ph[1]) * 4 + Math.sin(x * 0.17 + ph[2]) * 2]);
  g.fillStyle = '#1b4d22'; poly(g, [...top, [W + 10, L.shore + 4], [-10, L.shore + 4]]); g.fill();
  foliage(g, rng, top, 4, (L.shore - L.islandTop) * 0.7, (nx, ny) => ny > 0, { dens: 5, rMin: 2.5, rMax: 7 });
  for (const x of L.land ? [60, 150, 1760, 1860] : [24, 1040]) palm(g, rng, x, L.islandTop + 30, rng.range(46, 70), rng.range(-0.2, 0.2));
  // Pyramide
  const A = L.apex, Lc = L.left, F = L.front, Rc = L.right;
  drawGlass(g, L, new RNG(GLASS_SEED), 1);
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = '#e9f3f8'; g.lineWidth = 4;
  for (const [a, b] of [[Lc, A], [Rc, A], [Lc, Rc]]) { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  drawRidge(g, L);
  const cx = (Lc[0] + Rc[0] + F[0]) / 3, cy = (Lc[1] + Rc[1] + F[1] + A[1]) / 4;
  const inward = (p) => (nx, ny) => nx * (cx - p[0]) + ny * (cy - p[1]) > 0;
  foliage(g, rng, line(Lc, lerp2(Lc, A, 0.93), 40), 6, 24, inward(Lc), { dens: 3, rMin: 2, rMax: 6 });
  foliage(g, rng, line(Rc, lerp2(Rc, A, 0.93), 40), 6, 24, inward(Rc), { dens: 3, rMin: 2, rMax: 6 });
  g.strokeStyle = 'rgba(240,248,255,.9)'; g.lineWidth = 1.6;
  for (const p of [lerp2(A, Lc, 0.07), lerp2(A, Rc, 0.07), lerp2(A, F, 0.09)]) { g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(A[0], A[1] - 26); g.stroke(); }
  // Tunnel im Fuß: hier strömt das Wasser zum Becherwerk
  const { cx: tx, tw, top: tt } = L.tunnel, yb = L.shore + 8;
  const arch = (close) => { g.beginPath(); g.moveTo(tx - tw, yb); g.lineTo(tx - tw, tt + tw); g.arc(tx, tt + tw, tw, Math.PI, 0); g.lineTo(tx + tw, yb); if (close) g.closePath(); };
  arch(true); gr = g.createLinearGradient(0, tt, 0, yb); gr.addColorStop(0, '#05151f'); gr.addColorStop(1, '#0e3242'); g.fillStyle = gr; g.fill();
  arch(true); gr = g.createRadialGradient(tx, yb, 0, tx, yb, tw * 1.5); gr.addColorStop(0, 'rgba(70,210,235,.35)'); gr.addColorStop(1, 'rgba(70,210,235,0)'); g.fillStyle = gr; g.fill();
  for (const sg of [-1, 1]) { g.fillStyle = 'rgba(120,235,255,.85)'; dot(g, tx + sg * (tw - 13), tt + tw + 4, 3); }
  g.strokeStyle = '#eaf3f7'; g.lineWidth = 6; arch(false); g.stroke();
}

function drawFront(g, L, rng) {
  const R = L.R, cx = L.lift.cx, r = L.turnR, off = R + 5, colW = RP + L.lift.bo + R + 12;
  const col = (x) => Math.abs(x - cx) < colW;
  // Pflanzkästen unter den Schienen (am Glasschacht offen, damit das Becherwerk sichtbar bleibt)
  for (const rl of L.rails) {
    foliage(g, rng, line(rl.a, rl.b, Math.ceil(dist(rl.a, rl.b) / 10)), -(R + 9), R + 46, (nx, ny) => ny > 0,
      { dens: 4, rMin: 2.2, rMax: 7, skip: (x) => col(x), flowers: 0.05 });
  }
  const arcPts = (C, a0, a1, rad, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [C[0] + rad * Math.cos(a), C[1] + rad * Math.sin(a)]; });
  const out = (C) => (nx, ny, x, y) => nx * (x - C[0]) + ny * (y - C[1]) > 0;
  for (const tn of L.turns) foliage(g, rng, arcPts(tn.C, -Math.PI / 2, -Math.PI / 2 + tn.dir * Math.PI, r), -(R + 10), R + 26, out(tn.C), { dens: 3, rMin: 2, rMax: 6, flowers: 0.05 });
  // Schienen, Wendekappen, Auffanglippe oben, Umlenkung unten
  const sp = new Path2D(), down = (a, b) => { const [dx, dy] = norm(b[0] - a[0], b[1] - a[1]); return dx >= 0 ? [-dy, dx] : [dy, -dx]; };
  for (const rl of L.rails) { const [nx, ny] = down(rl.a, rl.b); sp.moveTo(rl.a[0] + nx * off, rl.a[1] + ny * off); sp.lineTo(rl.b[0] + nx * off, rl.b[1] + ny * off); }
  L.lip.forEach((p, i) => {
    const q = L.lip[Math.min(i + 1, L.lip.length - 1)], o = L.lip[Math.max(i - 1, 0)], [nx, ny] = down(o, q);
    i ? sp.lineTo(p[0] + nx * off, p[1] + ny * off) : sp.moveTo(p[0] + nx * off, p[1] + ny * off);
  });
  const wall = (C, a0, a1, ccw) => { const rad = r + off; sp.moveTo(C[0] + rad * Math.cos(a0), C[1] + rad * Math.sin(a0)); sp.arc(C[0], C[1], rad, a0, a1, ccw); };
  for (const tn of L.turns) tn.dir > 0 ? wall(tn.C, -Math.PI / 2 - 0.3, Math.PI / 2, false) : wall(tn.C, -Math.PI / 2 + 0.3, -1.5 * Math.PI, true);
  const dp = L.drop; dp.dir > 0 ? wall(dp.C, -Math.PI / 2 - 0.3, 0.15, false) : wall(dp.C, -Math.PI / 2 + 0.3, -Math.PI - 0.15, true);
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.save(); g.translate(2, 6); g.strokeStyle = 'rgba(5,30,25,.32)'; g.lineWidth = 14; g.stroke(sp); g.restore();
  g.strokeStyle = '#6f8992'; g.lineWidth = 12; g.stroke(sp);
  g.strokeStyle = '#e6eff2'; g.lineWidth = 8.5; g.stroke(sp);
  g.strokeStyle = '#ffffff'; g.lineWidth = 2.5; g.save(); g.translate(0, -2.5); g.stroke(sp); g.restore();
}

/** Ufer vor der Pyramide: Büsche, Sand, Palmen – verdecken Schienen und Figuren (Tunnel und Fallstelle bleiben frei). */
function drawFore(g, L, rng) {
  const { W } = L, T = L.tunnel, gapX = (x) => Math.abs(x - T.cx) < T.tw + 6;
  const shoreLine = Array.from({ length: 97 }, (_, i) => [i * W / 96, L.shore - 16 + Math.sin(i * 0.9) * 3]);
  foliage(g, rng, shoreLine, 22, 12, (nx, ny) => ny > 0, { dens: 4, rMin: 2.5, rMax: 7.5, skip: (x) => gapX(x) });
  const sand = g.createLinearGradient(0, L.shore - 6, 0, L.shore + 1);
  sand.addColorStop(0, '#efe3bd'); sand.addColorStop(1, '#c9b78a');
  g.fillStyle = sand; g.fillRect(0, L.shore - 5, T.cx - T.tw - 6, 6); g.fillRect(T.cx + T.tw + 6, L.shore - 5, W, 6);
  const palms = L.land ? [[40, 230], [150, 170], [430, 120], [600, 100], [1180, 110], [1350, 140], [1880, 210]]
    : [[150, 120], [700, 120], [830, 150], [990, 190]];
  for (const [x, h] of palms) if (Math.abs(x - T.cx) > 90 && Math.abs(x - L.drop.from[0]) > 45) palm(g, rng, x, L.shore - 2, h, rng.range(-0.18, 0.18));
}

// =====================================================================
//  Renderer (liest Darstellungsregler live aus sim.cfg; verändert die Simulation nicht)
// =====================================================================
class PyramidRenderer extends EBS.CanvasScene {
  constructor(ctx) {
    super(ctx);
    this.sim = ctx.sim; this.view = ctx.view; this.L = this.sim.L;
    this.ls = ctx.renderScale * this.L.fit;                                 // Pixel je Entwurfseinheit
    const L = this.L, E = L.lift, R = L.R, rng = new RNG(hashSeed('pyramid-art', 7));   // Kulisse unabhängig vom Seed
    this.clouds = [];
    const spots = L.land
      ? [[-60, 560, 380], [300, 650, 300], [1260, 640, 320], [1500, 520, 420], [180, 300, 240], [1380, 260, 260], [620, 220, 200], [1700, 700, 260]]
      : [[-80, 760, 340], [600, 820, 320], [-40, 1150, 280], [760, 1120, 300], [60, 440, 260], [740, 400, 240], [330, 330, 200], [880, 640, 200]];
    for (const [x, y, w] of spots) this.clouds.push({ ...cloudSprite(rng, w, this.ls), x0: x, y, speed: rng.range(3, 7) });
    this.sky = this.layer((g) => drawSky(g, L));
    this.back = this.layer((g) => drawBack(g, L, rng));
    this.front = this.layer((g) => drawFront(g, L, rng));
    this.fore = this.layer((g) => drawFore(g, L, rng));
    this.refl = this.layer((g) => {
      for (const c of [this.sky, this.back, this.front, this.fore]) { if (c === this.back) this.drawClouds(g, 0, 1); g.drawImage(c, 0, 0, L.W, L.H); }
    });
    // Glas vor dem Schacht: Ausschnitt mit weichen Rändern
    const fx = E.rp + E.bo + R + 14, y0 = L.apex[1] + 56;
    this.col = { x: E.cx - fx, y: y0, w: fx * 2, h: L.tunnel.top - y0 };
    const full = this.layer((g) => { drawGlass(g, L, new RNG(GLASS_SEED), 0.35); drawRidge(g, L); });
    const c = this.col, cc = document.createElement('canvas'), ls = this.ls;
    cc.width = Math.round(c.w * ls); cc.height = Math.round(c.h * ls);
    const cg = cc.getContext('2d');
    cg.drawImage(full, c.x * ls, c.y * ls, cc.width, cc.height, 0, 0, cc.width, cc.height);
    cg.globalCompositeOperation = 'destination-in';
    const mask = cg.createLinearGradient(0, 0, cc.width, 0);
    mask.addColorStop(0, 'rgba(0,0,0,0)'); mask.addColorStop(0.12, '#000'); mask.addColorStop(0.88, '#000'); mask.addColorStop(1, 'rgba(0,0,0,0)');
    cg.fillStyle = mask; cg.fillRect(0, 0, cc.width, cc.height);
    this.colCanvas = cc; full.width = full.height = 1;
    this.belt = new Path2D();
    for (let p = 0; p <= E.loop; p += 2) { beltAt(E, p, BQ); p ? this.belt.lineTo(BQ.x, BQ.y) : this.belt.moveTo(BQ.x, BQ.y); }
    this.belt.closePath();
    this.orb = COLORS.map((c2) => orbSprite(c2.rgb, this.ls, false, R));
    this.glow = COLORS.map((c2) => orbSprite(c2.rgb, this.ls, true, R));
    this.white = orbSprite([255, 250, 235], this.ls, true, 16);
    this.critter = SPECIES.map((_, k) => critterSprite(k, this.ls, R));
  }
  layer(draw) {
    const c = document.createElement('canvas');
    c.width = Math.round(this.L.W * this.ls); c.height = Math.round(this.L.H * this.ls);
    const g = c.getContext('2d'); g.scale(this.ls, this.ls); draw(g); return c;
  }
  sprite(g, s, x, y, k = 1) { const r = s.r * k; g.drawImage(s.c, x - r, y - r, r * 2, r * 2); }
  drawClouds(g, t, k) {
    const W = this.L.W;
    for (const c of this.clouds) {
      const span = W + c.w + 200, x = ((c.x0 + t * c.speed * k + 100 + c.w) % span + span) % span - c.w - 100;
      g.drawImage(c.c, x, c.y - c.h / 2, c.w, c.h);
    }
  }
  /** Position, Drehung und Haltung einer Figur. */
  pose(b, t) {
    const L = this.L, P = L.paths;
    if (b.state === LIFT) {
      beltAt(L.lift, b.s, BQ);
      return { x: BQ.bx - BQ.tx * 2.5, y: BQ.by - BQ.ty * 2.5, ang: 0, mode: 'lift', speed: 0, look: [0, -1] };
    }
    if (b.state === POOL) {
      const p = pathAt(P.pool, b.s, Q);
      return { x: p.x, y: p.y + Math.sin(t * 2.4 + b.id * 1.7) * 2.2 * this.sim.cfg.waves, ang: 0, mode: 'pool', speed: b.v, look: [p.tx, p.ty] };
    }
    const p = pathAt(P.ramp, b.s, Q);
    if (p.k === KIND_FALL) {                                     // im Fall richtet sich das Tierchen auf
      const f = clamp((b.s - L.fallS) / (P.ramp.len - L.fallS), 0, 1);
      return { x: p.x, y: p.y, ang: L.fallRot * (1 - Math.min(1, f * 1.6)), mode: 'fall', speed: b.v, look: [0, 1] };
    }
    return { x: p.x, y: p.y, ang: p.rot, mode: 'roll', speed: b.v, look: [p.tx, p.ty] };
  }
  drawFigure(g, b, q, glowK) {
    const cfg = this.sim.cfg, a0 = g.globalAlpha, glow = cfg.glow * glowK * (cfg.figure ? 0.35 : 1);
    if (glow > 0.01) {
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = a0 * Math.min(1, glow);   // über 100 %: größerer Schein
      this.sprite(g, this.glow[b.color], q.x, q.y, Math.max(1, glow));
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = a0;
    }
    if (cfg.figure) drawCritter(g, this.critter[b.color], b.color, b.id, q.x, q.y, q.ang, q.mode, this.sim.t, q.speed, q.look, cfg.wiggle, this.L.R);
    else this.sprite(g, this.orb[b.color], q.x, q.y);
  }
  pulseAge() { return this.sim.t - this.sim.lastPulse.t - PULSE_TRAVEL; }
  paint(g) {
    const s = this.sim, L = this.L, R = L.R, t = s.t, cfg = s.cfg, ww = this.world.w, wh = this.world.h;
    if (L.oy > 0) { g.fillStyle = '#0b3a9e'; g.fillRect(0, 0, ww, L.oy + 1); g.fillStyle = '#093c7c'; g.fillRect(0, wh - L.oy - 1, ww, L.oy + 1); }
    if (L.ox > 0) { g.fillStyle = '#0b3a9e'; g.fillRect(0, 0, L.ox + 1, wh); g.fillRect(ww - L.ox - 1, 0, L.ox + 1, wh); }
    g.save(); g.translate(L.ox, L.oy); g.scale(L.fit, L.fit);
    g.beginPath(); g.rect(0, 0, L.W, L.H); g.clip();
    g.save();
    if (this.view.camera) {
      const k = 1.012 + 0.006 * Math.sin(t * 0.21);
      g.translate(L.W / 2 + Math.sin(t * 0.13) * 3, L.H / 2 + Math.cos(t * 0.17) * 2.5); g.scale(k, k); g.translate(-L.W / 2, -L.H / 2);
    }
    g.drawImage(this.sky, 0, 0, L.W, L.H);
    this.drawRays(g, t, cfg.rays);
    this.drawClouds(g, t, cfg.clouds);
    g.drawImage(this.back, 0, 0, L.W, L.H);
    this.drawWater(g, t);
    this.drawLift(g, t);
    const c = this.col; g.drawImage(this.colCanvas, c.x, c.y, c.w, c.h);
    this.drawGlassFlash(g);
    g.drawImage(this.front, 0, 0, L.W, L.H);
    for (const b of s.orbs) if (b.state === RAMP) {
      const q = this.pose(b, t);
      if (q.mode !== 'fall') { g.fillStyle = 'rgba(0,30,40,.28)'; g.beginPath(); g.ellipse(q.x + 1, q.y + R + 3, R * 0.75, 3, 0, 0, TAU); g.fill(); }
      this.drawFigure(g, b, q, 1);
    }
    g.drawImage(this.fore, 0, 0, L.W, L.H);
    this.drawApex(g, t);
    this.drawPool(g, t);
    this.drawSplashes(g, t);
    if (cfg.birds) this.drawBirds(g, t);
    g.restore();
    if (this.view.hud) this.drawHud(g);
    g.restore();
  }
  drawRays(g, t, k) {
    if (k <= 0.01) return;
    const [ax, ay] = this.L.apex, len = Math.max(this.L.W, this.L.H) * 1.1;
    RAYS.forEach(([ang, wd, a], i) => {
      const al = a * k * (0.85 + 0.15 * Math.sin(t * 0.45 + i * 1.7));
      const gr = g.createRadialGradient(ax, ay, 0, ax, ay, len);
      gr.addColorStop(0, `rgba(255,255,245,${Math.min(1, al * 2)})`); gr.addColorStop(0.5, `rgba(255,255,245,${al})`); gr.addColorStop(1, 'rgba(255,255,245,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(ax, ay); g.arc(ax, ay, len, ang - wd, ang + wd); g.closePath(); g.fill();
    });
  }
  drawGlassFlash(g) {
    const L = this.L, age = this.pulseAge(), k = this.sim.cfg.pulse;
    if (age < 0 || k <= 0.01) return;
    const a = Math.exp(-age * 2.2) * k; if (a < 0.02) return;
    const col = COLORS[this.sim.lastPulse.color].rgb, [ax, ay] = L.apex, rr = (L.baseY - ay) * 1.1;
    g.save(); poly(g, [L.left, L.front, L.right, L.apex]); g.clip();
    g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(ax, ay, 0, ax, ay, rr);
    gr.addColorStop(0, rgba(mix(col, [255, 255, 255], 0.4), Math.min(1, 0.35 * a))); gr.addColorStop(0.5, rgba(col, Math.min(1, 0.1 * a))); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.fillRect(ax - rr, ay, rr * 2, rr);
    g.restore();
  }
  drawWater(g, t) {
    const L = this.L, R = L.R, cfg = this.sim.cfg, W = L.W, H = L.H, y0 = L.shore, ls = this.ls, hW = H - y0, wv = cfg.waves;
    let gr = g.createLinearGradient(0, y0, 0, H);
    gr.addColorStop(0, '#4bd0e4'); gr.addColorStop(0.3, '#229ed2'); gr.addColorStop(1, '#093c7c');
    g.fillStyle = gr; g.fillRect(0, y0, W, hW);
    if (cfg.reflection > 0.01) {
      for (let y = y0; y < H; y += 3) {
        const d = y - y0, sy = y0 - d - 3; if (sy < 0) break;
        g.globalAlpha = (0.6 - 0.32 * (d / hW)) * cfg.reflection;
        const wob = (Math.sin(y * 0.13 + t * 2.2) * (1.2 + d * 0.02) + Math.sin(y * 0.041 - t * 1.4) * 2) * wv;
        g.drawImage(this.refl, 0, sy * ls, W * ls, 3 * ls, wob, y, W, 3.3);
      }
      g.globalAlpha = 1;
    }
    gr = g.createLinearGradient(0, y0, 0, H);
    gr.addColorStop(0, 'rgba(70,215,232,.28)'); gr.addColorStop(0.5, 'rgba(20,120,190,.3)'); gr.addColorStop(1, 'rgba(3,35,95,.55)');
    g.fillStyle = gr; g.fillRect(0, y0, W, hW);
    g.globalCompositeOperation = 'lighter';
    if (cfg.reflection > 0.01 && cfg.glow > 0.01) for (const b of this.sim.orbs) {
      if (b.state === POOL) continue;
      const q = this.pose(b, t), my = 2 * y0 - q.y;
      if (my > H + 40 || my < y0) continue;
      const k = 1 - (my - y0) / hW, s = this.glow[b.color];
      g.globalAlpha = Math.min(1, 0.45 * k * (b.state === LIFT ? 0.5 : 1) * cfg.reflection * cfg.glow * (cfg.figure ? 0.5 : 1));
      g.drawImage(s.c, q.x - s.r * 0.8 + Math.sin(my * 0.13 + t * 2.2) * 2 * wv, my - s.r * 1.3, s.r * 1.6, s.r * 2.6);
    }
    const nSpark = Math.round(90 * Math.min(2, cfg.sparkle));
    for (let i = 0; i < nSpark; i++) {
      const hx = (Math.sin(i * 12.9898) * 43758.5453) % 1, hy = (Math.sin(i * 78.233) * 12543.123) % 1;
      const x = Math.abs(hx) * W + Math.sin(t * 0.4 + i) * 6, y = y0 + 6 + Math.pow(Math.abs(hy), 1.6) * (hW - 10);
      const a = Math.pow(Math.max(0, Math.sin(t * 2.6 + i * 1.93)), 14);
      if (a < 0.05) continue;
      g.globalAlpha = Math.min(1, a * 0.9 * Math.min(1, cfg.sparkle)); g.fillStyle = '#ffffff';
      const sz = 1 + (i % 3);
      g.fillRect(x - sz * 2, y - 0.5, sz * 4, 1); g.fillRect(x - 0.5, y - sz, 1, sz * 2);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2;
    g.beginPath(); for (let x = 0; x <= W; x += 8) { const y = y0 + 2 + Math.sin(x * 0.05 + t * 2) * 1.3 * wv; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    if (cfg.lane) {
      const P = L.paths.pool, lane = () => { g.beginPath(); for (let i = 0; i < P.n; i += 3) (i ? g.lineTo(P.x[i], P.y[i]) : g.moveTo(P.x[i], P.y[i])); };
      g.lineCap = 'round'; g.lineJoin = 'round';
      lane(); g.strokeStyle = 'rgba(190,250,255,.08)'; g.lineWidth = 2 * R + 14; g.stroke();
      lane(); g.setLineDash([10, 26]); g.lineDashOffset = -t * 80 * cfg.current; g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 2; g.stroke(); g.setLineDash([]);
    }
  }
  drawLift(g, t) {
    const L = this.L, R = L.R, E = L.lift, s = this.sim, cx = E.cx;
    const fx = E.rp + E.bo + R + 6, yA = E.yTop - E.rp - E.bo - R - 8;
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(230,242,250,.55)'; g.lineWidth = 2;
    for (const sg of [-1, 1]) { g.beginPath(); g.moveTo(cx + sg * fx, yA); g.lineTo(cx + sg * fx, L.tunnel.top + 6); g.stroke(); }
    g.strokeStyle = 'rgba(230,242,250,.16)'; g.lineWidth = 1;
    for (let y = yA + 20; y < L.tunnel.top - 30; y += 70) { g.beginPath(); g.moveTo(cx - fx, y); g.lineTo(cx + fx, y + 35); g.moveTo(cx + fx, y); g.lineTo(cx - fx, y + 35); g.stroke(); }
    const lt = [cx, E.yTop - E.rp - 3];
    g.strokeStyle = 'rgba(255,246,220,.5)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(lt[0], lt[1]); g.lineTo(L.apex[0], L.apex[1]); g.stroke();
    const mech = () => {
      g.lineJoin = 'round';
      g.strokeStyle = '#26343b'; g.lineWidth = 7; g.stroke(this.belt);
      g.setLineDash([6, 8]); g.lineDashOffset = -s.beltPos; g.strokeStyle = '#a9bcc4'; g.lineWidth = 2.2; g.stroke(this.belt); g.setLineDash([]);
      for (const yc of [E.yTop, E.yBot]) {
        g.fillStyle = '#dfe8ec'; g.strokeStyle = '#43545c'; g.lineWidth = 3; g.beginPath(); g.arc(cx, yc, E.rp + 1, 0, TAU); g.fill(); g.stroke();
        const a0 = -s.beltPos / E.rp;
        g.strokeStyle = '#6d818a'; g.lineWidth = 2.5;
        for (let i = 0; i < 3; i++) { const a = a0 + i * TAU / 3; g.beginPath(); g.moveTo(cx, yc); g.lineTo(cx + Math.cos(a) * (E.rp - 4), yc + Math.sin(a) * (E.rp - 4)); g.stroke(); }
        g.fillStyle = '#3b4b53'; dot(g, cx, yc, 3.5);
      }
      for (const b of s.orbs) if (b.state === LIFT) this.drawFigure(g, b, this.pose(b, t), 0.8);
      for (let k = 0; k < E.nb; k++) {
        beltAt(E, s.liftPhase + k * E.spacing, BQ);
        const ang = Math.atan2(-BQ.ty, -BQ.tx), rr = R + 4;
        g.beginPath(); g.moveTo(BQ.x, BQ.y); g.lineTo(BQ.bx - BQ.nx * rr * 0.6, BQ.by - BQ.ny * rr * 0.6);
        g.strokeStyle = '#3d4f58'; g.lineWidth = 4; g.stroke();
        g.beginPath(); g.arc(BQ.bx, BQ.by, rr, ang - Math.PI / 2, ang + Math.PI / 2); g.closePath();
        g.fillStyle = 'rgba(214,228,235,.88)'; g.fill(); g.strokeStyle = '#3d4f58'; g.lineWidth = 2.5; g.stroke();
      }
    };
    g.save(); g.beginPath(); g.rect(0, 0, L.W, L.shore); g.clip(); mech(); g.restore();
    g.save(); g.beginPath(); g.rect(0, L.shore, L.W, L.H - L.shore); g.clip(); g.globalAlpha = 0.3; mech(); g.restore();
    // Lichtimpuls steigt vom Scheitel der Rolle zur Spitze
    const age = s.t - s.lastPulse.t, k = s.cfg.pulse;
    if (age >= 0 && age < PULSE_TRAVEL && k > 0.01) {
      const p = lerp2(lt, L.apex, age / PULSE_TRAVEL), col = COLORS[s.lastPulse.color].rgb;
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, k);
      g.strokeStyle = rgba(col, 0.6); g.lineWidth = 5; g.beginPath(); g.moveTo(lt[0], lt[1]); g.lineTo(p[0], p[1]); g.stroke();
      this.sprite(g, this.glow[s.lastPulse.color], p[0], p[1], 0.8); this.sprite(g, this.white, p[0], p[1], 0.3);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    }
  }
  drawApex(g, t) {
    const L = this.L, [ax, ay] = L.apex, age = this.pulseAge(), k = this.sim.cfg.pulse, flash = age >= 0 ? Math.exp(-age * 2.4) * k : 0;
    const col = mix([255, 246, 220], COLORS[this.sim.lastPulse.color].rgb, age >= 0 ? Math.min(1, 0.65 * Math.exp(-age * 1.4) * k) : 0);
    g.globalCompositeOperation = 'lighter';
    if (k > 0.01) for (const e of this.sim.recent) {
      if (e.type !== 'pulse') continue;
      const a = t - e.t - PULSE_TRAVEL; if (a < 0 || a > 1.8) continue;
      const c = COLORS[e.c].rgb, r = 26 + a * 420, q = Math.pow(1 - a / 1.8, 2) * Math.min(1.5, k);
      g.strokeStyle = rgba(c, Math.min(1, 0.5 * q)); g.lineWidth = 3; g.beginPath(); g.arc(ax, ay, r, 0, TAU); g.stroke();
      g.strokeStyle = `rgba(255,255,255,${Math.min(1, 0.5 * q)})`; g.lineWidth = 1.2; g.beginPath(); g.arc(ax, ay, r, 0, TAU); g.stroke();
    }
    const I = 0.85 + 0.9 * flash, hr = 170 * I;
    let gr = g.createRadialGradient(ax, ay, 0, ax, ay, hr);
    gr.addColorStop(0, rgba([255, 255, 255], 0.95)); gr.addColorStop(0.12, rgba(col, 0.55)); gr.addColorStop(0.45, rgba(col, 0.12)); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.fillRect(ax - hr, ay - hr, hr * 2, hr * 2);
    for (const [ang, kk] of [[0, 1], [Math.PI / 2, 1], [Math.PI / 4 + t * 0.05, 0.45], [-Math.PI / 4 + t * 0.05, 0.45]]) {
      const len = 340 * I * kk;
      g.save(); g.translate(ax, ay); g.rotate(ang);
      gr = g.createLinearGradient(-len, 0, len, 0);
      gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(0.5, rgba([255, 255, 255], 0.85)); gr.addColorStop(1, rgba(col, 0));
      g.fillStyle = gr; g.beginPath(); g.moveTo(-len, 0); g.lineTo(0, -2.6 * kk * I); g.lineTo(len, 0); g.lineTo(0, 2.6 * kk * I); g.closePath(); g.fill();
      g.restore();
    }
    this.sprite(g, this.white, ax, ay, 0.55 + 0.25 * flash);
    g.globalCompositeOperation = 'source-over';
  }
  drawPool(g, t) {
    const wv = this.sim.cfg.waves, R = this.L.R;
    for (const b of this.sim.orbs) {
      if (b.state !== POOL) continue;
      const q = this.pose(b, t), { x, y } = q;
      g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1.5;
      g.beginPath(); g.ellipse(x, y + R * 0.45, R * 1.7 + Math.sin(t * 3 + b.id) * 1.5 * wv, R * 0.5, 0, 0, TAU); g.stroke();
      this.drawFigure(g, b, q, 0.8);
      g.save(); g.beginPath(); g.rect(x - R * 2, y + R * 0.35, R * 4, R * 1.2); g.clip();
      g.beginPath(); g.arc(x, y, R + 0.5, 0, TAU); g.fillStyle = 'rgba(20,130,185,.55)'; g.fill();
      g.restore();
    }
  }
  drawSplashes(g, t) {
    for (const e of this.sim.recent) {
      if (e.type !== 'splash') continue;
      const a = t - e.t; if (a < 0 || a > 1.6) continue;
      const st = clamp(e.p / 450, 0.4, 1.3);
      for (let i = 0; i < 3; i++) {
        const aa = a - i * 0.18; if (aa <= 0) continue;
        const k = Math.max(0, 1 - aa / 1.2);
        g.strokeStyle = `rgba(255,255,255,${0.7 * k})`; g.lineWidth = 2;
        g.beginPath(); g.ellipse(e.x, e.y + 6, 10 + aa * 90, 3 + aa * 26, 0, 0, TAU); g.stroke();
      }
      const rng = new RNG(e.n * 7919 + 13);
      g.fillStyle = 'rgba(235,252,255,.95)';
      for (let i = 0; i < 14; i++) {
        const vx = rng.range(-130, 130) * st, vy = -rng.range(160, 330) * st, x = e.x + vx * a, y = e.y + vy * a + 450 * a * a;
        if (y > e.y + 4) continue;
        dot(g, x, y, rng.range(1.4, 3.2));
      }
    }
  }
  drawBirds(g, t) {
    const L = this.L, W = L.W;
    const rows = L.land ? [300, 420, 360, 520, 470] : [380, 520, 760, 640, 900];
    g.lineCap = 'round'; g.lineJoin = 'round';
    rows.forEach((y0, i) => {
      const sp = 34 + i * 6, x = ((t * sp + i * 397) % (W + 200) + W + 200) % (W + 200) - 100, y = y0 + Math.sin(t * 0.6 + i) * 12;
      const f = Math.sin(t * (7 + i * 0.6) + i * 2), w = 9 + i % 2 * 2, wy = -f * 5;
      for (const [col, lw] of [['rgba(20,50,100,.35)', 3.4], ['rgba(255,255,255,.95)', 2]]) {
        g.strokeStyle = col; g.lineWidth = lw;
        g.beginPath(); g.moveTo(x - w, y + wy); g.quadraticCurveTo(x - w * 0.4, y - 3, x, y + 1); g.quadraticCurveTo(x + w * 0.4, y - 3, x + w, y + wy); g.stroke();
      }
    });
  }
  drawHud(g) {
    const L = this.L, n = fmtIntEn(this.sim.stats.pulses);
    g.save();
    g.shadowColor = 'rgba(0,25,70,.45)'; g.shadowBlur = 14;
    g.textBaseline = 'middle'; g.fillStyle = '#ffffff';
    const font = (w, s) => `${w} ${s}px Bahnschrift, "Segoe UI", Arial, sans-serif`;
    if (L.land) {
      g.letterSpacing = '4px'; g.textAlign = 'left'; g.font = font(700, 52); g.fillText('ENDLESS PYRAMID', 60, 80);
      g.letterSpacing = '3px'; g.font = font(600, 20); g.fillStyle = '#d7ecff'; g.fillText('ONE LOOP. FOREVER.', 62, 128);
      g.textAlign = 'right'; g.fillText('SUN PULSES', L.W - 60, 66);
      g.letterSpacing = '1px'; g.font = font(700, 48); g.fillStyle = '#ffd25a'; g.fillText(n, L.W - 60, 110);
    } else {
      g.letterSpacing = '5px'; g.textAlign = 'center'; g.font = font(700, 68); g.fillText('ENDLESS PYRAMID', L.W / 2, 118);
      g.letterSpacing = '3px'; g.font = font(600, 26); g.fillStyle = '#d7ecff'; g.fillText('SUN PULSES', L.W / 2, 192);
      g.letterSpacing = '1px'; g.font = font(700, 56); g.fillStyle = '#ffd25a'; g.fillText(n, L.W / 2, 246);
    }
    g.restore();
  }
  destroy() {
    for (const c of [this.sky, this.back, this.front, this.fore, this.refl, this.colCanvas, ...this.clouds.map((x) => x.c)]) c.width = c.height = 1;
    super.destroy();
  }
}

const pct = (v) => Math.round(v * 100) + ' %', times = (v) => v.toFixed(2).replace('.', ',') + '×';
EBS.registerScenario({
  id: 'pyramid',
  title: 'Endless Pyramid',
  defaults: {
    orbs: 22, size: 16, warmup: 30, figure: 0, beltSpeed: 1, rollSpeed: 1, current: 1,
    glow: 1, pulse: 1, rays: 1, clouds: 1, reflection: 1, waves: 1, sparkle: 1, wiggle: 1, birds: true, lane: true,
  },
  controls: [
    { key: 'figure', label: 'Figuren', type: 'select', options: [[0, 'Leuchtkugeln'], [1, 'Tierchen (Küken, Pinguin, Schweinchen, Frosch)']] },
    { key: 'orbs', label: 'Anzahl der Figuren', type: 'range', restart: true, min: 12, max: 26, step: 1, format: (v) => String(v) },
    { key: 'size', label: 'Größe der Figuren', type: 'range', restart: true, min: 12, max: 24, step: 1, format: (v) => `${v * 2} px` },
    { key: 'beltSpeed', label: 'Tempo des Becherwerks', type: 'range', min: 0.5, max: 2, step: 0.05, format: times },
    { key: 'rollSpeed', label: 'Rolltempo (Schwerkraft)', type: 'range', min: 0.6, max: 1.6, step: 0.05, format: times },
    { key: 'current', label: 'Strömung in der Lagune', type: 'range', min: 0.4, max: 2, step: 0.05, format: times },
    { key: 'glow', label: 'Leuchten der Figuren', type: 'range', min: 0, max: 1.5, step: 0.05, format: pct },
    { key: 'pulse', label: 'Lichtimpuls an der Spitze', type: 'range', min: 0, max: 1.5, step: 0.05, format: pct },
    { key: 'rays', label: 'Sonnenstrahlen', type: 'range', min: 0, max: 1.5, step: 0.05, format: pct },
    { key: 'clouds', label: 'Wolkentempo', type: 'range', min: 0, max: 3, step: 0.1, format: times },
    { key: 'reflection', label: 'Spiegelung im Wasser', type: 'range', min: 0, max: 1, step: 0.05, format: pct },
    { key: 'waves', label: 'Wellengang', type: 'range', min: 0, max: 2, step: 0.05, format: times },
    { key: 'sparkle', label: 'Glitzern auf dem Wasser', type: 'range', min: 0, max: 2, step: 0.05, format: times },
    { key: 'wiggle', label: 'Gezappel der Tierchen', type: 'range', min: 0, max: 2, step: 0.05, format: times },
    { key: 'birds', label: 'Vögel', type: 'check' },
    { key: 'lane', label: 'Strömungsspur im Wasser', type: 'check' },
  ],
  normalizeParams(p) {
    const r = (k, d, a, b) => clamp(num(p[k], d), a, b);
    return {
      orbs: clamp(Math.round(num(p.orbs, 22)), 12, 26), size: clamp(Math.round(num(p.size, 16)), 12, 24), warmup: r('warmup', 30, 0, 120),
      figure: clamp(Math.round(num(p.figure, 0)), 0, 1),
      beltSpeed: r('beltSpeed', 1, 0.5, 2), rollSpeed: r('rollSpeed', 1, 0.6, 1.6), current: r('current', 1, 0.4, 2),
      glow: r('glow', 1, 0, 1.5), pulse: r('pulse', 1, 0, 1.5), rays: r('rays', 1, 0, 1.5), clouds: r('clouds', 1, 0, 3),
      reflection: r('reflection', 1, 0, 1), waves: r('waves', 1, 0, 2), sparkle: r('sparkle', 1, 0, 2), wiggle: r('wiggle', 1, 0, 2),
      birds: bool(p.birds, true), lane: bool(p.lane, true),
    };
  },
  create: (ctx) => new PyramidSim(ctx),
  createRenderer: (ctx) => new PyramidRenderer(ctx),
  panelStats(sim) {
    const s = sim.snapshot();
    return [
      { key: 'pulses', label: 'Lichtimpulse', value: fmtInt(s.pulses) },
      { key: 'ramp', label: 'Auf der Bahn', value: s.onRamp },
      { key: 'lift', label: 'Im Becherwerk', value: s.inLift },
      { key: 'water', label: 'In der Lagune', value: s.inWater },
    ];
  },
  panelNote: (sim) => sim.snapshot().summary,
  // Tonspur: Ereignistyp -> Samples (assets/audio bzw. im Code erzeugt), Verhältnis der Klänge (gain), Stärkebezug (ref),
  // Verstimmung (detune zufällig, semis fest, scale je Farbe). Tierchen-Klänge erklingen nur in der Darstellung „Tierchen“.
  audio: {
    events: {
      scoop: { label: 'Becher schöpft', samples: ['impactSoft_medium_000'], gain: 0.14, semis: 3, detune: 1 },
      pulse: { label: 'Lichtimpuls', samples: ['synth:chime'], gain: 0.2, scale: [0, 4, 7, 12] },
      tip: { label: 'Becher kippt aus', samples: ['impactMetal_light_000'], gain: 0.1, semis: 2, detune: 0.8 },
      cap: { label: 'Wendekappe (Kugeln)', samples: ['impactGlass_light_000', 'impactGlass_light_001', 'impactGlass_light_002'], gain: 0.16, ref: 420, detune: 1.2, minGap: 0.04 },
      splash: { label: 'Platscher', samples: ['synth:splash'], gain: 0.16, ref: 450, detune: 2, minGap: 0.1 },
      boing: { label: 'Tierchen: Boing', samples: ['synth:boing'], gain: 0.2, ref: 420, detune: 1.5, minGap: 0.05 },
      wheee: { label: 'Tierchen: Juhu', samples: ['synth:wheee'], gain: 0.1, detune: 2.5, minGap: 0.2 },
      squeak: { label: 'Tierchen: Quiek', samples: ['synth:squeak'], gain: 0.09, detune: 3 },
    },
  },
});
})();
