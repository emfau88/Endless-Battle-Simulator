/* Endless Mycelium – Simulation (deterministisch, ohne Matter.js).
 *
 * Kreislauf je Generation: Spore landet -> Myzel wächst zu Laub -> Blätter werden bis aufs Gerippe verdaut ->
 * Pilze wachsen aus den dicken Strängen -> Sporenwolke -> altes Netz verblasst -> Sporen landen anderswo,
 * die nächste Generation (nächste Farbe) beginnt. Nichts wird endlos angehäuft: Totes wird nach dem Verblassen
 * entfernt, die Segmentpuffer werden je Generation verdichtet.
 *
 * Zeit: stepOnce() = ein Video-Tick (60 je Videosekunde). Simulationszeit t = Ticks × Tempo / 60.
 * Das Wachstum läuft in „Bio-Schritten“, deren Takt aus Generationsdauer und Ausbreitung folgt.
 * Rendern liest nur – es verändert keinen Zustand.
 */
(function () {
'use strict';
const { clamp, num, bool, fnv1a, hashSeed } = EBS.util;
const RNG = EBS.RNG;
const TAU = Math.PI * 2;
const CS = 6;                 // Rasterzelle (logische Einheiten)
const SEG = 4.6;              // Länge eines Hyphen-Segments
const COST = 0.06, SOIL = 0.062, DIG = 0.012;
const BASE_STEPS = 260;       // Wachstumsschritte einer Generation bei Ausbreitung 1
const MAX_SEG = 320000, EVENT_LIMIT = 4096, MAX_LEAVES = 40, MAX_SPORES = 3000;
const SKELETON_SEC = 2.6;     // so lange bleibt das Blattgerippe nach dem Verdauen
const PALETTE_KEYS = ['cycle', 'mint', 'cool', 'warm'];
const LEAF_COLORS = 6;

const r2 = (v) => Math.round(v * 100) / 100;
const normalizeParams = (p = {}) => ({
  cycleSec: clamp(Math.round(num(p.cycleSec, 24)), 12, 180),
  spread: clamp(r2(num(p.spread, 1)), 0.4, 1.6),
  branching: clamp(r2(num(p.branching, 1)), 0.5, 1.6),
  colonies: clamp(Math.round(num(p.colonies, 2)), 1, 3),
  startLeaves: clamp(Math.round(num(p.startLeaves, 8)), 0, 16),
  leafFall: clamp(Math.round(num(p.leafFall, 5)), 0, 10),
  digest: clamp(r2(num(p.digest, 1)), 0.4, 2.5),
  mushrooms: clamp(Math.round(num(p.mushrooms, 4)), 1, 6),
  spores: clamp(Math.round(num(p.spores, 110)), 0, 250),
  wind: clamp(r2(num(p.wind, 1)), 0, 2.5),
  palette: PALETTE_KEYS.includes(p.palette) ? p.palette : 'cycle',
  glow: clamp(r2(num(p.glow, 1)), 0.3, 1.8),
  pulses: bool(p.pulses, true),
});
// Nur Darstellung: ohne Neustart änderbar, gehen nicht in den Zustands-Hash ein
const VISUAL_KEYS = ['palette', 'glow', 'pulses'];

/** Spielfeld je Format: hochkant bleibt oben Platz für die Titelzeile. */
function layout({ w, h }) {
  if (h > w) return { x0: 6, y0: 200, x1: w - 6, y1: h - 6, kind: 'portrait' };
  if (w > h) return { x0: 6, y0: 6, x1: w - 6, y1: h - 6, kind: 'landscape' };
  return { x0: 6, y0: 150, x1: w - 6, y1: h - 6, kind: 'square' };
}

/** Zeitplan einer Generation (Simulationssekunden) aus der Generationsdauer. */
function timing(cfg) {
  const C = cfg.cycleSec;
  const flight = clamp(0.2 * C, 2.6, 12), lead = clamp(0.16 * C, 2.2, 14), grow = C - flight - lead;
  const rate = BASE_STEPS * cfg.spread / grow;
  // Narben des alten Netzes bleiben je nach Generationsdauer 8–40 s sichtbar (gemessen in Bio-Schritten)
  return { C, flight, lead, grow, fadeDur: clamp(0.22 * C, 2.5, 20), popDur: clamp(0.05 * C, 1.4, 4),
    rate, dayLen: C / 4, scarSteps: Math.round(rate * clamp(0.6 * C, 8, 40)) };
}

function leafHalf(u, L, Wd) {
  const s = u / L + 0.5;
  if (s <= 0 || s >= 1) return 0;
  return Wd / 2 * Math.pow(Math.sin(Math.PI * s), 0.8) * (1 - 0.28 * s);
}

/** Prüfsumme über die ersten n Werte eines typisierten Arrays (Bitmuster, auch für Float32). */
function hashArray(h, arr, n) {
  const v = new Int32Array(arr.buffer, arr.byteOffset, Math.ceil(n * arr.BYTES_PER_ELEMENT / 4));
  for (let i = 0; i < v.length; i++) { h ^= v[i]; h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

class Simulation {
  constructor({ seed, params, world, timeScale = 1 }) {
    this.seed = seed >>> 0; this.cfg = normalizeParams(params); this.world = world; this.timeScale = timeScale;
    this.field = layout(world); this.timing = timing(this.cfg);
    this.rng = new RNG(hashSeed('myco-grow', this.seed));
    this.frng = new RNG(hashSeed('myco-world', this.seed));
    const GW = (this.GW = Math.ceil(world.w / CS)), GH = (this.GH = Math.ceil(world.h / CS)), NC = GW * GH;
    this.owner = new Int32Array(NC).fill(-1); this.segAt = new Int32Array(NC).fill(-1);
    this.food = new Float32Array(NC); this.foodId = new Int32Array(NC).fill(-1); this.soilUsed = new Uint8Array(NC);
    const F = Float32Array, I = Int32Array;
    this.sx0 = new F(MAX_SEG); this.sy0 = new F(MAX_SEG); this.sx1 = new F(MAX_SEG); this.sy1 = new F(MAX_SEG);
    this.scol = new I(MAX_SEG); this.spar = new I(MAX_SEG); this.sdead = new I(MAX_SEG).fill(-1);
    this.sfed = new I(MAX_SEG).fill(-1e9); this.sfirst = new I(MAX_SEG).fill(-1); this.snext = new I(MAX_SEG).fill(-1);
    this.sband = new Uint8Array(MAX_SEG); this.sborn = new I(MAX_SEG);
    this.NS = 0; this.step = 0; this.t = 0; this.bio = 0; this.bioAcc = 0;
    this.colonies = []; this.gens = []; this.leaves = []; this.leafSeq = 0; this.spores = [];
    this.leavesEaten = 0; this.generation = 0; this.compactions = 0;
    this.events = []; this.eventSeq = 0; this.eventDigest = 0;
    this.stats = { leavesLanded: 0, mushrooms: 0, bursts: 0, landings: 0 };
    this._init();
  }

  // ------------------------------------------------------------ Aufbau
  _init() {
    const f = this.field, k = f.kind;
    const spot = k === 'portrait' ? { x: 0.40 * this.world.w, y: 0.60 * this.world.h }
      : k === 'landscape' ? { x: 0.36 * this.world.w, y: 0.56 * this.world.h } : { x: 0.45 * this.world.w, y: 0.58 * this.world.h };
    let n = 0, guard = 0;
    while (n < this.cfg.startLeaves && guard++ < 600) {
      const x = f.x0 + 80 + this.frng.next() * (f.x1 - f.x0 - 160), y = f.y0 + 80 + this.frng.next() * (f.y1 - f.y0 - 160);
      if (Math.hypot(x - spot.x, y - spot.y) < 140 || this.leaves.some((o) => Math.hypot(o.x - x, o.y - y) < 150)) continue;
      this._landLeaf(this._makeLeaf(x, y, -10), false); n++;
    }
    const t0 = 2.2;
    this._scheduleGen(0, t0, [spot], [{ x: this.world.w + 60, y: f.y0 + 40, depart: t0 - 2.6 }]);
  }
  _event(type, x, y, extra = {}) {
    const e = { seq: this.eventSeq++, step: this.step, type, x, y, ...extra };
    this.eventDigest = fnv1a(this.eventDigest + '|' + JSON.stringify(e));
    this.events.push(e);
    if (this.events.length > EVENT_LIMIT) this.events.splice(0, 512);
  }
  _makeLeaf(x, y, t) {
    const R = this.frng, L = 95 + R.next() * 60;
    const f = { id: this.leafSeq++, x, y, t, L, Wd: L * (0.42 + R.next() * 0.16), rot: R.next() * TAU,
      spin: (R.next() < 0.5 ? -1 : 1) * (2 + R.next() * 2.5), color: Math.floor(R.next() * LEAF_COLORS), val: 1.2,
      landed: false, cells: [], total: 0, remaining: 0, doneT: null, eater: -1 };
    this.leaves.push(f);
    return f;
  }
  _landLeaf(f, sound = true) {
    f.landed = true;
    const fl = this.field, ca = Math.cos(-f.rot), sa = Math.sin(-f.rot), R = f.L * 0.62 + 6;
    const gx0 = Math.max(0, Math.floor((f.x - R) / CS)), gx1 = Math.min(this.GW - 1, Math.floor((f.x + R) / CS));
    const gy0 = Math.max(0, Math.floor((f.y - R) / CS)), gy1 = Math.min(this.GH - 1, Math.floor((f.y + R) / CS));
    for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
      const cx = (gx + 0.5) * CS, cy = (gy + 0.5) * CS;
      if (cx <= fl.x0 || cx >= fl.x1 || cy <= fl.y0 || cy >= fl.y1) continue;
      const dx = cx - f.x, dy = cy - f.y, u = dx * ca - dy * sa, v = dx * sa + dy * ca;
      if (Math.abs(v) > leafHalf(u, f.L, f.Wd)) continue;
      const c = gy * this.GW + gx, old = this.foodId[c];
      if (old >= 0 && old !== f.id && this.food[c] > 0) { const o = this._leaf(old); if (o) o.remaining -= this.food[c]; }
      this.foodId[c] = f.id; this.food[c] = f.val; f.cells.push(c);
    }
    f.total = f.remaining = f.cells.length * f.val;
    if (sound) { this.stats.leavesLanded++; this._event('leaf_land', f.x, f.y); }
  }
  _leaf(id) { for (const f of this.leaves) if (f.id === id) return f; return null; }
  _placeLeaf(cx, cy, dmin, dmax, t) {
    const fl = this.field, R = this.frng;
    if (this.leaves.filter((o) => o.doneT === null).length >= MAX_LEAVES) return null;
    for (let k = 0; k < 60; k++) {
      const a = R.next() * TAU, d = dmin + R.next() * (dmax - dmin);
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
      if (x < fl.x0 + 80 || x > fl.x1 - 80 || y < fl.y0 + 80 || y > fl.y1 - 80) continue;
      if (this.leaves.some((o) => o.doneT === null && Math.hypot(o.x - x, o.y - y) < 120)) continue;
      return this._makeLeaf(x, y, t);
    }
    return null;
  }
  _scheduleGen(id, t0, spots, froms) {
    const T = this.timing, fruitT = t0 + T.grow, sporeT = fruitT + T.lead;
    const g = { id, t0, colonies: [], mushrooms: [], fruitT, sporeT, fadeT: sporeT + 0.6, fadeDur: T.fadeDur,
      fruited: false, spored: false, faded: false, gone: false, goneBio: -1, compacted: false, landings: [] };
    spots.forEach((s, k) => {
      const from = froms[k], t = t0 + k * 0.6;
      const dx = s.x - from.x, dy = s.y - from.y, n = Math.hypot(dx, dy) || 1, side = this.frng.next() < 0.5 ? 1 : -1;
      g.landings.push({ x: s.x, y: s.y, t, done: false, fromX: from.x, fromY: from.y, depart: Math.min(from.depart, t - 0.5),
        cx: (from.x + s.x) / 2 - dy / n * 180 * side, cy: (from.y + s.y) / 2 + dx / n * 180 * side - 60 });
    });
    // Laub für diese Generation: zwei Blätter zur Landung, der Rest während des Wachsens
    const n = this.cfg.leafFall;
    for (let k = 0; k < n; k++) {
      const s = spots[k % spots.length];
      if (k === 0) this._placeLeaf(s.x, s.y, 150, 240, t0 - 0.5);
      else if (k === 1) this._placeLeaf(s.x, s.y, 150, 240, t0 + 0.4);
      else this._placeLeaf(s.x, s.y, 170, 420, t0 + T.grow * (0.15 + 0.65 * (k - 2) / Math.max(1, n - 3)));
    }
    this.gens.push(g);
    return g;
  }
  _spawnColony(g, x, y) {
    const ci = this.colonies.length;
    const c = { ci, gen: g.id, ox: x, oy: y, stock: 28, tips: [], segs: [], cells: 0, state: 'growing' };
    this.colonies.push(c); g.colonies.push(ci);
    // Zelle aus dem Segmentende – genau diese gibt _kill später wieder frei
    const root = this._addSeg(ci, -1, x, y, x + 0.1, y), cell = this._cell(this.sx1[root], this.sy1[root]);
    if (this.owner[cell] >= 0) this._colony(this.owner[cell]).cells--;
    this.owner[cell] = ci; this.segAt[cell] = root; c.cells++;
    for (let k = 0; k < 12; k++) {
      const a = k / 12 * TAU + this.rng.next() * 0.3;
      c.tips.push({ x, y, a, home: a, seg: root, cell, retarget: 0, target: -1 });
    }
    this.generation = Math.max(this.generation, g.id + 1);
    this.stats.landings++;
  }
  _colony(ci) { return this.colonies[ci]; }
  _cell(x, y) { return Math.floor(y / CS) * this.GW + Math.floor(x / CS); }
  _inField(x, y) { const f = this.field; return x > f.x0 && x < f.x1 && y > f.y0 && y < f.y1; }
  _addSeg(ci, par, x0, y0, x1, y1) {
    const i = this.NS++;
    this.sx0[i] = x0; this.sy0[i] = y0; this.sx1[i] = x1; this.sy1[i] = y1;
    this.scol[i] = ci; this.spar[i] = par; this.sborn[i] = this.bio; this.sdead[i] = -1; this.sfed[i] = -1e9; this.sfirst[i] = -1; this.snext[i] = -1; this.sband[i] = 0;
    if (par >= 0) { this.snext[i] = this.sfirst[par]; this.sfirst[par] = i; }
    this.colonies[ci].segs.push(i);
    return i;
  }

  // ------------------------------------------------------------ Takt
  stepOnce() {
    this.step++;
    const dt = this.timeScale / 60;
    this.t = this.step * this.timeScale / 60;
    this._timeline();
    this.bioAcc += this.timing.rate * dt;
    while (this.bioAcc >= 1) { this.bioAcc -= 1; this._bioStep(); }
    this._updateSpores(dt);
    if (this.step % 600 === 1) this._event('ambience', this.world.w / 2, this.world.h / 2);
  }
  _timeline() {
    const t = this.t;
    for (const g of this.gens) {
      if (g.compacted) continue;
      for (const L of g.landings) if (!L.done && t >= L.t) {
        L.done = true; this._spawnColony(g, L.x, L.y); this._event('spore_land', L.x, L.y, { c: g.id % 4, gen: g.id });
      }
      if (!g.fruited && t >= g.fruitT && g.colonies.length) {
        g.fruited = true;
        for (const ci of g.colonies) { const c = this._colony(ci); c.state = 'fruiting'; c.tips.length = 0; }
        this._chooseMushrooms(g);
      }
      for (const m of g.mushrooms) {
        if (!m.popped && t >= m.growT + 0.3) { m.popped = true; this.stats.mushrooms++; this._event('mushroom', m.x, m.y, { c: g.id % 4 }); }
        if (!m.burst && t >= m.relT) { m.burst = true; this.stats.bursts++; this._event('spore_burst', m.x, m.y, { c: g.id % 4 }); }
      }
      if (!g.spored && g.fruited && t >= g.sporeT) { g.spored = true; this._releaseSpores(g); }
      if (!g.faded && g.fruited && t >= g.fadeT) { g.faded = true; this._startFade(g); }
      if (g.faded && !g.gone && t >= g.fadeT + g.fadeDur) { g.gone = true; g.goneBio = this.bio; this._kill(g); }
      if (g.gone && !g.compacted && this.bio - g.goneBio > this.timing.scarSteps) this._compact(g);
    }
    if (this.gens.length > 4 && this.gens[0].compacted) this.gens = this.gens.filter((g) => !g.compacted);
    for (const f of this.leaves) if (!f.landed && t >= f.t) this._landLeaf(f);
    // Vollständig verdaute Blätter verschwinden nach dem Gerippe
    if (this.leaves.some((f) => f.doneT !== null && t > f.doneT + SKELETON_SEC)) {
      this.leaves = this.leaves.filter((f) => {
        if (f.doneT === null || t <= f.doneT + SKELETON_SEC) return true;
        for (const c of f.cells) if (this.foodId[c] === f.id) { this.foodId[c] = -1; this.food[c] = 0; }
        return false;
      });
    }
  }
  _bioStep() {
    for (const c of this.colonies) {
      if (!c || c.state !== 'growing') continue;
      for (let i = c.tips.length - 1; i >= 0; i--) {
        if (!this._moveTip(c, c.tips[i])) { c.tips[i] = c.tips[c.tips.length - 1]; c.tips.pop(); }
      }
      this._regrow(c);
    }
    this._digest();
    this.bio++;
  }

  // ------------------------------------------------------------ Wachstum
  _ownNeighbors(cell, ci, skip) {
    const GW = this.GW, gx = cell % GW, gy = (cell / GW) | 0;
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const x = gx + dx, y = gy + dy;
      if (x < 0 || y < 0 || x >= GW || y >= this.GH) continue;
      const cc = y * GW + x;
      if (cc !== skip && this.owner[cc] === ci) n++;
    }
    return n;
  }
  _findFood(x, y) {
    let best = -1, bd = 380;
    for (const f of this.leaves) {
      if (!f.landed || f.doneT !== null || f.remaining < f.total * 0.15) continue;
      const d = Math.hypot(f.x - x, f.y - y);
      if (d < bd) { bd = d; best = f.id; }
    }
    return best;
  }
  _targetTips(c) { return Math.min(this.field.kind === 'portrait' ? 260 : 300, 30 + c.stock * 2.5); }
  _moveTip(c, t) {
    const R = this.rng;
    if (this.sdead[t.seg] >= 0) return false;
    if (c.stock < COST) return true;
    if (R.next() < 0.0015) return false;
    if (this.NS + 1 >= MAX_SEG) return false;
    t.a += (R.next() - 0.5) * 0.28;
    if (this.bio >= t.retarget) { t.target = this._findFood(t.x, t.y); t.retarget = this.bio + 25 + Math.floor(R.next() * 20); }
    if (t.target >= 0) {
      const f = this._leaf(t.target);
      if (f && f.doneT === null) t.a += EBS.util.angleDiff(Math.atan2(f.y - t.y, f.x - t.x), t.a) * 0.05;
      else t.target = -1;
    }
    t.a += EBS.util.angleDiff(t.home, t.a) * 0.03;
    const sgn = R.next() < 0.5 ? 1 : -1;
    let ok = false, nx = 0, ny = 0, cell = -1;
    for (const d of [0, 0.32 * sgn, -0.32 * sgn]) {
      const a2 = t.a + d;
      // auf Float32 runden wie im Segmentpuffer – sonst kann die Zelle an einer Zellgrenze abweichen
      nx = Math.fround(t.x + Math.cos(a2) * SEG); ny = Math.fround(t.y + Math.sin(a2) * SEG);
      if (!this._inField(nx, ny)) continue;
      cell = this._cell(nx, ny);
      if (cell === t.cell) { ok = true; t.a = a2; break; }
      const o = this.owner[cell];
      if (o === c.ci) continue;
      if (o >= 0 && this._colony(o).gen === c.gen) continue;
      if (this._ownNeighbors(cell, c.ci, t.cell) >= 4) continue;
      ok = true; t.a = a2; break;
    }
    if (!ok) return false;
    const seg = this._addSeg(c.ci, t.seg, t.x, t.y, nx, ny);
    if (cell !== t.cell) {
      const o = this.owner[cell];
      if (o >= 0 && o !== c.ci) this._colony(o).cells--;
      this.owner[cell] = c.ci; this.segAt[cell] = seg; c.cells++;
      if (!this.soilUsed[cell]) { this.soilUsed[cell] = 1; c.stock += SOIL; }
    }
    c.stock = Math.min(220, c.stock - COST);
    t.x = nx; t.y = ny; t.seg = seg; t.cell = cell;
    const onFood = this.food[cell] > 0;
    if (c.tips.length < this._targetTips(c) && R.next() < 0.075 * this.cfg.branching * (onFood ? 2.5 : 1)) {
      const na = t.a + (R.next() < 0.5 ? 1 : -1) * (0.3 + R.next() * 0.5);
      c.tips.push({ x: nx, y: ny, a: na, home: na, seg, cell, retarget: 0, target: -1 });
    }
    return true;
  }
  _regrow(c) {
    const R = this.rng;
    if (c.tips.length >= this._targetTips(c) * 0.5 || c.stock < 2 || !c.segs.length) return;
    for (let k = 0; k < 40; k++) {
      const i = c.segs[Math.floor(R.next() * c.segs.length)];
      if (this.sdead[i] >= 0) continue;
      const a = R.next() * TAU, x = this.sx1[i] + Math.cos(a) * SEG * 1.4, y = this.sy1[i] + Math.sin(a) * SEG * 1.4;
      if (!this._inField(x, y)) continue;
      const cell = this._cell(x, y), o = this.owner[cell];
      if (o === c.ci || (o >= 0 && this._colony(o).gen === c.gen) || this._ownNeighbors(cell, c.ci, -1) > 3) continue;
      c.tips.push({ x: this.sx1[i], y: this.sy1[i], a, home: a, seg: i, cell: this._cell(this.sx1[i], this.sy1[i]), retarget: 0, target: -1 });
    }
  }
  _digest() {
    const GW = this.GW, GH = this.GH, rate = DIG * this.cfg.digest;
    for (const f of this.leaves) {
      if (!f.landed || f.doneT !== null) continue;
      for (const cell of f.cells) {
        if (this.foodId[cell] !== f.id || this.food[cell] <= 0) continue;
        const gx = cell % GW, gy = (cell / GW) | 0;
        let col = null, seg = -1;
        for (let dy = -1; dy <= 1 && !col; dy++) for (let dx = -1; dx <= 1; dx++) {
          const x = gx + dx, y = gy + dy;
          if (x < 0 || y < 0 || x >= GW || y >= GH) continue;
          const cc = y * GW + x, o = this.owner[cc];
          if (o < 0) continue;
          const c = this._colony(o), s = this.segAt[cc];
          if ((c.state === 'growing' || c.state === 'fruiting') && s >= 0 && this.sdead[s] < 0) { col = c; seg = s; break; }
        }
        if (!col) continue;
        const take = Math.min(this.food[cell], rate);
        this.food[cell] -= take; f.remaining -= take; col.stock = Math.min(220, col.stock + take * 0.6);
        this.sfed[seg] = this.bio; f.eater = col.gen;
      }
      if (f.total > 0 && f.remaining <= f.total * 0.02) {
        for (const c of f.cells) if (this.foodId[c] === f.id) this.food[c] = 0;
        f.remaining = 0; f.doneT = this.t; this.leavesEaten++;
        this._event('leaf_eaten', f.x, f.y, { c: (this.leavesEaten - 1) % 6, gen: Math.max(0, f.eater) });   // c = Ton der Melodie
      }
    }
  }
  /** Lebende Nachkommen je Segment (für Strangdicke und Pilzorte). */
  counts() {
    const n = this.NS, cnt = new Float32Array(n), sd = this.sdead, sp = this.spar;
    for (let i = n - 1; i >= 0; i--) {
      if (sd[i] >= 0) continue;
      cnt[i] += 1;
      const p = sp[i];
      if (p >= 0 && sd[p] < 0) cnt[p] += cnt[i];
    }
    return cnt;
  }

  // ------------------------------------------------------------ Pilze, Sporen, Vergehen
  _chooseMushrooms(g) {
    const cnt = this.counts(), cand = [], R = this.frng, T = this.timing;
    for (const ci of g.colonies) {
      const c = this._colony(ci);
      for (const i of c.segs) {
        if (this.sdead[i] >= 0 || cnt[i] < 25) continue;
        const d = Math.hypot(this.sx1[i] - c.ox, this.sy1[i] - c.oy);
        if (d < 70 || d > 480) continue;
        cand.push({ i, s: cnt[i] * (0.55 + 0.45 * R.next()) });
      }
    }
    cand.sort((a, b) => b.s - a.s || a.i - b.i);
    const gap = Math.min(0.35, T.lead * 0.12);
    const add = (x, y) => {
      const k = g.mushrooms.length, n = 2 + Math.floor(R.next() * 3), caps = [[0, 0, 33 + R.next() * 8]];
      for (let j = 1; j < n; j++) { const a = R.next() * TAU, r = 15 + R.next() * 11; caps.push([Math.cos(a) * (33 + r * 0.6), Math.sin(a) * (33 + r * 0.6), r]); }
      g.mushrooms.push({ x, y, caps, growT: g.fruitT + k * gap, relT: g.sporeT + k * 0.22, popped: false, burst: false });
    };
    for (const k of cand) {
      const x = this.sx1[k.i], y = this.sy1[k.i];
      if (g.mushrooms.some((m) => Math.hypot(m.x - x, m.y - y) < 170)) continue;
      add(x, y);
      if (g.mushrooms.length >= this.cfg.mushrooms) break;
    }
    if (!g.mushrooms.length) for (const ci of g.colonies) { const c = this._colony(ci); add(c.ox, c.oy); }
  }
  _releaseSpores(g) {
    const R = this.frng, f = this.field;
    for (const m of g.mushrooms) for (let k = 0; k < this.cfg.spores && this.spores.length < MAX_SPORES; k++) {
      const a = R.next() * TAU, sp = 50 + R.next() * 120, born = m.relT + R.next() * 0.9;
      this.spores.push({ x: m.x + Math.cos(a) * 10, y: m.y + Math.sin(a) * 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        born, life: 3.2 + R.next() * 2.8, gen: g.id, size: 0.8 + R.next() * 0.6 });
    }
    // nächste Generation: Landeplätze möglichst weit weg vom alten Netz und voneinander
    const olds = g.colonies.map((ci) => this._colony(ci)).map((c) => ({ x: c.ox, y: c.oy })).concat(g.mushrooms);
    const want = this.cfg.colonies, spots = [];
    for (let s = 0; s < want; s++) {
      let best = null, bs = -1;
      for (let k = 0; k < 60; k++) {
        const x = f.x0 + 140 + R.next() * (f.x1 - f.x0 - 280), y = f.y0 + 160 + R.next() * (f.y1 - f.y0 - 320);
        const d1 = Math.min(...olds.map((o) => Math.hypot(o.x - x, o.y - y)));
        const d2 = spots.length ? Math.min(...spots.map((o) => Math.hypot(o.x - x, o.y - y))) : 1e9;
        const score = Math.min(d1 / 330, d2 / 480);
        if (score > bs) { bs = score; best = { x, y }; }
      }
      spots.push(best);
    }
    const froms = spots.map((s, k) => { const m = g.mushrooms[k % g.mushrooms.length]; return { x: m.x, y: m.y, depart: m.relT + 0.3 }; });
    this._scheduleGen(g.id + 1, g.sporeT + this.timing.flight, spots, froms);
  }
  _startFade(g) {
    for (const ci of g.colonies) {
      const c = this._colony(ci);
      c.state = 'fading'; c.tips.length = 0;
      let maxD = 1;
      const ds = new Float32Array(c.segs.length);
      c.segs.forEach((i, k) => {
        let d = 1e9;
        for (const m of g.mushrooms) d = Math.min(d, Math.hypot(this.sx1[i] - m.x, this.sy1[i] - m.y));
        ds[k] = d; if (d > maxD) maxD = d;
      });
      // weit entfernte Fäden verblassen zuerst, die Stränge an den Pilzen zuletzt
      c.segs.forEach((i, k) => { this.sband[i] = Math.min(7, Math.floor((1 - ds[k] / maxD) * 8)); });
    }
  }
  _kill(g) {
    for (const ci of g.colonies) {
      const c = this._colony(ci);
      c.state = 'gone'; c.tips.length = 0;
      for (const i of c.segs) {
        if (this.sdead[i] >= 0) continue;
        this.sdead[i] = this.bio;
        const cell = this._cell(this.sx1[i], this.sy1[i]);
        if (this.segAt[cell] === i) { this.owner[cell] = -1; this.segAt[cell] = -1; c.cells--; }
      }
    }
  }
  /** Entfernt die Segmente einer vergangenen Generation und verdichtet die Puffer (Indizes werden umgeschrieben). */
  _compact(g) {
    g.compacted = true;
    const drop = new Set(g.colonies), n = this.NS, map = new Int32Array(n).fill(-1);
    let k = 0;
    const A = [this.sx0, this.sy0, this.sx1, this.sy1, this.scol, this.sdead, this.sfed, this.sband, this.sborn];
    for (let i = 0; i < n; i++) {
      if (drop.has(this.scol[i])) continue;
      map[i] = k;
      if (k !== i) { for (const a of A) a[k] = a[i]; this.spar[k] = this.spar[i]; }
      k++;
    }
    for (let i = 0; i < k; i++) { const p = this.spar[i]; this.spar[i] = p >= 0 ? map[p] : -1; this.sfirst[i] = -1; this.snext[i] = -1; }
    for (let i = 0; i < k; i++) { const p = this.spar[i]; if (p >= 0) { this.snext[i] = this.sfirst[p]; this.sfirst[p] = i; } }
    for (let c = 0; c < this.segAt.length; c++) {
      const s = this.segAt[c];
      if (s < 0) continue;
      const m = s < n ? map[s] : -1;
      this.segAt[c] = m;
      if (m < 0) this.owner[c] = -1;
    }
    for (const c of this.colonies) {
      if (!c) continue;
      if (drop.has(c.ci)) { c.segs = []; c.tips = []; c.state = 'removed'; continue; }
      c.segs = c.segs.map((i) => map[i]);
      for (const t of c.tips) t.seg = map[t.seg];
    }
    this.NS = k; this.compactions++;
  }
  _updateSpores(dt) {
    if (!this.spores.length) return;
    const t = this.t, w = this.cfg.wind, keep = [];
    for (const s of this.spores) {
      if (t > s.born + s.life) continue;
      keep.push(s);
      if (t < s.born) continue;
      const wx = w * (34 + 22 * Math.sin(s.y * 0.004 + t * 0.6)), wy = w * (-14 + 18 * Math.cos(s.x * 0.005 + t * 0.45));
      const k = 1 - Math.exp(-0.7 * dt);
      s.vx += (wx - s.vx) * k; s.vy += (wy - s.vy) * k; s.x += s.vx * dt; s.y += s.vy * dt;
    }
    this.spores = keep;
  }

  // ------------------------------------------------------------ Auskunft
  get liveGeneration() {
    let g = null;
    for (const x of this.gens) if (x.landings.some((L) => L.done)) g = x;
    return g || this.gens[0];
  }
  phaseOf(g) {
    if (!g) return 'start';
    const t = this.t;
    if (!g.landings.some((L) => L.done)) return 'landing';
    if (t < g.fruitT) return 'growing';
    if (t < g.sporeT) return 'fruiting';
    return 'spores';
  }
  aliveSegments() { let n = 0; for (let i = 0; i < this.NS; i++) if (this.sdead[i] < 0) n++; return n; }
  snapshot() {
    const g = this.liveGeneration;
    return {
      t: this.t, step: this.step, videoTime: this.step / 60, bio: this.bio, generation: g ? g.id + 1 : 0, phase: this.phaseOf(g),
      leavesEaten: this.leavesEaten, leavesOnGround: this.leaves.filter((f) => f.landed && f.doneT === null).length,
      segments: this.NS, alive: this.aliveSegments(), tips: this.colonies.reduce((s, c) => s + (c ? c.tips.length : 0), 0),
      mushrooms: g ? g.mushrooms.filter((m) => this.t >= m.growT).length : 0, spores: this.spores.filter((s) => this.t >= s.born).length,
      compactions: this.compactions, eventSeq: this.eventSeq, stats: { ...this.stats },
    };
  }
  stateHash() {
    const cfg = {};
    for (const [k, v] of Object.entries(this.cfg)) if (!VISUAL_KEYS.includes(k)) cfg[k] = v;
    const state = { version: 'mycelium-v1', seed: this.seed, cfg, world: this.world, timeScale: this.timeScale,
      step: this.step, bio: this.bio, bioAcc: this.bioAcc, NS: this.NS, rng: this.rng.s, frng: this.frng.s,
      leavesEaten: this.leavesEaten, leafSeq: this.leafSeq, eventSeq: this.eventSeq, eventDigest: this.eventDigest,
      generation: this.generation, compactions: this.compactions, stats: this.stats,
      colonies: this.colonies.map((c) => c && { gen: c.gen, state: c.state, stock: c.stock, cells: c.cells, segs: c.segs.length, tips: c.tips }),
      gens: this.gens, leaves: this.leaves.map((f) => [f.id, f.x, f.y, f.t, f.landed, f.remaining, f.doneT, f.cells.length]),
      spores: this.spores };
    let h = fnv1a(JSON.stringify(state));
    const n = this.NS;
    for (const a of [this.sx0, this.sy0, this.sx1, this.sy1, this.scol, this.spar, this.sdead, this.sfed, this.sband, this.sborn]) h = hashArray(h, a, n);
    for (const a of [this.owner, this.segAt, this.food, this.foodId]) h = hashArray(h, a, a.length);
    return h.toString(16).padStart(8, '0');
  }
  checkInvariants() {
    const errors = [], n = this.NS;
    if (n < 0 || n > MAX_SEG) errors.push('Segmentpuffer überlaufen');
    if (![this.step, this.t, this.bio, this.bioAcc, this.eventSeq, this.eventDigest].every(Number.isFinite)) errors.push('Zeit/Zähler ungültig');
    for (let i = 0; i < n; i++) {
      if (!(Number.isFinite(this.sx0[i]) && Number.isFinite(this.sy0[i]) && Number.isFinite(this.sx1[i]) && Number.isFinite(this.sy1[i]))) { errors.push(`Segment ${i} nicht endlich`); break; }
      const p = this.spar[i];
      if (p >= i || p < -1) { errors.push(`Segment ${i}: Elternverweis ungültig`); break; }
      const c = this.colonies[this.scol[i]];
      if (!c || c.state === 'removed') { errors.push(`Segment ${i} gehört zu keiner Kolonie`); break; }
    }
    for (let cell = 0; cell < this.segAt.length; cell++) {
      const s = this.segAt[cell], o = this.owner[cell];
      if ((s < 0) !== (o < 0)) { errors.push(`Zelle ${cell}: Besitz und Segment widersprechen sich`); break; }
      if (s >= 0 && (s >= n || this.scol[s] !== o || this.sdead[s] >= 0)) { errors.push(`Zelle ${cell}: verweist auf ungültiges Segment`); break; }
      if (!(this.food[cell] >= 0) || !Number.isFinite(this.food[cell])) { errors.push(`Zelle ${cell}: Futter ungültig`); break; }
    }
    for (const c of this.colonies) {
      if (!c) continue;
      if (!['growing', 'fruiting', 'fading', 'gone', 'removed'].includes(c.state)) errors.push(`Kolonie ${c.ci}: Zustand ${c.state}`);
      if (c.state !== 'growing' && c.tips.length) errors.push(`Kolonie ${c.ci}: Spitzen außerhalb des Wachstums`);
      for (const t of c.tips) if (t.seg < 0 || t.seg >= n || this.scol[t.seg] !== c.ci) { errors.push(`Kolonie ${c.ci}: Spitze ohne Segment`); break; }
      if (!Number.isFinite(c.stock) || c.stock < -COST) errors.push(`Kolonie ${c.ci}: Vorrat ungültig`);
    }
    if (this.leaves.length > 4 * MAX_LEAVES) errors.push('Zu viele Blätter');
    for (const f of this.leaves) if (!(f.remaining >= -1e-3) || f.remaining > f.total + 1e-3) { errors.push(`Blatt ${f.id}: Restmenge ungültig`); break; }
    if (this.spores.length > MAX_SPORES) errors.push('Zu viele Sporen');
    if (this.gens.length > 12) errors.push('Generationsliste wächst unbegrenzt');
    if (this.events.length > EVENT_LIMIT) errors.push('Ereignispuffer zu groß');
    for (let i = 1; i < this.events.length; i++) {
      const e = this.events[i], prev = this.events[i - 1];
      if (e.seq !== prev.seq + 1 || e.step < prev.step || e.step > this.step) { errors.push('Ereignisfolge ungültig'); break; }
    }
    return { ok: !errors.length, errors };
  }
  setParam(key, value) {
    if (VISUAL_KEYS.includes(key)) this.cfg = { ...this.cfg, ...normalizeParams({ ...this.cfg, [key]: value }) };
  }
  destroy() { this.events.length = 0; this.spores.length = 0; }
}

EBS.Mycelium = { Simulation, normalizeParams, layout, timing, leafHalf, VISUAL_KEYS, PALETTE_KEYS, LEAF_COLORS, CS, SEG, SKELETON_SEC, MAX_SEG, EVENT_LIMIT };
})();
