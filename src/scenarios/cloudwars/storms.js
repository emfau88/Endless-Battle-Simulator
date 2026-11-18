/*
 * Cloud Wars – Gewitter, Blitze, Feuer und Feuerwehr (Paket C3). Ergänzt CloudWarsSimulation um Methoden.
 * Plan: docs/CLOUD_WARS_PLAN_2026-11-18.md, Abschnitt 3 („Gewitter“, „Feuer“). Längen in GE, Zeiten in Sekunden.
 */
(function () {
'use strict';
const T = EBS.CloudWarsTerrain;
const { CloudWarsSimulation, RULES, radiusOf } = EBS.CloudWarsSim;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

const STORM = {
  on: 30, off: 22, rainLoss: 0.6, boltMin: 4, boltMax: 7, boltRange: 2.2, zapShare: 0.18, groundIgnite: 0.7, burnCap: 0.14,
  neutralStorms: 1, neutralStormsFront: 3, neutralMass: [9, 16], chargedTime: 20, boltLife: 0.35,
  rainReach: 0.8,
};
const FIRE = {
  cell: 16, maxBurning: 40, spread: 0.05, windWith: 2, windAgainst: 0.3, grow: 1 / 3, dur: [20, 40],
  rainCool: 0.5, scarFrom: 0.4,
};
const TRUCK = { speed: 55, reach: 260, approach: 420, spray: 50, sprayCap: 0.08, max: 4, sprayMax: 25 };
// Zellzustände im Feuerraster
const NONE = 0, BURN = 1, SCAR = 2, OUT = 3;

Object.assign(CloudWarsSimulation.prototype, {
  initStorms() {
    const a = this.area, c = FIRE.cell, nx = Math.ceil(a.w / c), ny = Math.ceil(a.h / c);
    const forest = new Uint8Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) forest[j * nx + i] = T.isForestAt(a.x + (i + 0.5) * c, a.y + (j + 0.5) * c) ? 1 : 0;
    this.fire = { c, nx, ny, forest, state: new Uint8Array(nx * ny), int: new Float32Array(nx * ny), age: new Float32Array(nx * ny), dur: new Float32Array(nx * ny), burning: [] };
    this.forestCells = forest.reduce((s, v) => s + v, 0);
    this.burnLog = []; this.burnGen = 0;
    this.bolts = []; this.trucks = []; this.nextTruck = 1;
    // Straßen im Ausschnitt (Ortskoordinaten) für die Feuerwehr
    this.roads = T.edgesIn(a.x, a.y, a.x + a.w, a.y + a.h).map((e) => {
      const n = e.pts.length / 2, pts = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) { pts[i * 2] = e.pts[i * 2] - a.x; pts[i * 2 + 1] = e.pts[i * 2 + 1] - a.y; }
      return { pts, cum: e.cum, len: e.len, main: e.main };
    });
  },

  /** Neue Runde: Feuer aus, Brandflächen weg (der Wald ist am neuen Morgen nachgewachsen). */
  resetStorms() {
    const f = this.fire;
    f.state.fill(0); f.int.fill(0); f.age.fill(0); f.burning = [];
    this.burnLog = []; this.burnGen++; this.bolts = []; this.trucks = [];
  },

  /** Wetterfaktoren aus dem Wetterplan (Paket C4); ohne Plan „klar“. */
  weatherNow() {
    const S = EBS.CloudWarsStory;
    return S ? S.weatherAt(this.seed, this.t, this.cfg.mode) : { kind: 'clear', evap: 1, wind: 1, storms: 0 };
  },

  logBurn(i, state) { this.burnLog.push({ i, s: state, t: this.t }); },

  ignite(i) {
    const f = this.fire;
    if (!f.forest[i] || f.state[i] !== NONE || f.burning.length >= FIRE.maxBurning) return false;
    f.state[i] = BURN; f.int[i] = 0.15; f.age[i] = 0;
    f.dur[i] = FIRE.dur[0] + this.rngFlow.next() * (FIRE.dur[1] - FIRE.dur[0]);
    f.burning.push(i); this.logBurn(i, BURN);
    return true;
  },

  cellAt(x, y) {
    const f = this.fire, i = Math.floor(x / f.c), j = Math.floor(y / f.c);
    return i >= 0 && j >= 0 && i < f.nx && j < f.ny ? j * f.nx + i : -1;
  },

  stepStorms(dt) {
    const t = this.t, w = this.wind(), wx = Math.cos(w.ang), wy = Math.sin(w.ang), wx0 = this.weatherNow();
    // 1) Gewitterwechsel mit Hysterese, Regenverlust, Blitze
    for (const c of this.clouds) {
      if (c.dead || c.eat) continue;
      if (c.team >= 0) {
        // Aufladung läuft ab; danach gilt wieder die Hysterese (Gewitter ab 45, weiß unter 36)
        if (c.charged && t > c.charged) { c.charged = 0; if (c.kind === 2) c.kind = c.mass >= STORM.on ? 1 : 0; }
        if (!c.charged) {
          if (c.kind !== 1 && c.mass >= STORM.on) { c.kind = 1; c.boltAt = t + this.boltGap(c); this.emit('storm', c.x, c.y, c.mass, c.team); }
          else if (c.kind === 1 && c.mass < STORM.off) c.kind = 0;
        }
      }
      if (!c.kind) continue;
      const loss = STORM.rainLoss * (c.rainFactor || 1);
      if (c.team >= 0) c.mass = Math.max(1, c.mass - loss * dt);
      if (t >= c.boltAt) { this.lightning(c); c.boltAt = t + this.boltGap(c); }
    }
    // 2) Neutrale Gewitterwolken: 1, in der Gewitterfront 3
    let ns = 0;
    for (const c of this.clouds) if (c.team < 0 && c.kind) ns++;
    const want = STORM.neutralStorms + (wx0.storms || 0);
    if (ns < want && this.clouds.length < EBS.CloudWarsSim.POOL && this.rngFlow.next() < 0.25 * dt) {
      const m = STORM.neutralMass[0] + this.rngFlow.next() * (STORM.neutralMass[1] - STORM.neutralMass[0]);
      this.spawnNeutral(m);
      const c = this.clouds[this.clouds.length - 1];
      c.kind = 1; c.boltAt = t + 2 + this.rngFlow.next() * 3;
    }
    // 3) Feuer: wachsen, brennen, ausbreiten, durch Regen gelöscht werden
    const f = this.fire, nx = f.nx;
    const rainers = this.clouds.filter((c) => !c.dead && !c.eat && c.kind);
    const still = [];
    for (const i of f.burning) {
      if (f.state[i] !== BURN) continue;
      f.age[i] += dt; f.int[i] = Math.min(1, f.int[i] + FIRE.grow * dt);
      const cx = ((i % nx) + 0.5) * f.c, cy = (Math.floor(i / nx) + 0.5) * f.c;
      for (const c of rainers) if (Math.hypot(c.x - cx, c.y - cy) < radiusOf(c.mass) * STORM.rainReach) f.int[i] -= (FIRE.rainCool + FIRE.grow) * dt;
      for (const tr of this.trucks) if (tr.state === 'spray' && Math.hypot(tr.x - cx, tr.y - cy) < TRUCK.spray) f.int[i] = Math.min(f.int[i], TRUCK.sprayCap);
      if (f.int[i] <= 0) {
        f.int[i] = 0; f.state[i] = f.age[i] >= FIRE.scarFrom * f.dur[i] ? SCAR : OUT; this.logBurn(i, f.state[i]);
        this.emit('extinguish', cx, cy, 1, -1); continue;
      }
      if (f.age[i] >= f.dur[i]) { f.state[i] = SCAR; f.int[i] = 0; this.logBurn(i, SCAR); continue; }
      still.push(i);
    }
    f.burning = still;
    // Bremse: je mehr Wald schon verbrannt ist, desto langsamer breitet sich Feuer aus (ab burnCap, aus bei +6 Punkten)
    const lost = still.length ? this.burnedShare() + still.length / Math.max(1, this.forestCells) : 0;
    const brake = Math.max(0, Math.min(1, (STORM.burnCap + 0.06 - lost) / 0.06));
    for (const i of still.slice()) {
      const x = i % nx, y = Math.floor(i / nx);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= nx || Y >= f.ny) continue;
        const j = Y * nx + X;
        if (!f.forest[j] || f.state[j] !== NONE) continue;
        const dot = dx * wx + dy * wy, k = dot > 0.5 ? FIRE.windWith : dot < -0.5 ? FIRE.windAgainst : 1;
        if (this.rngFlow.next() < FIRE.spread * k * f.int[i] * dt * brake && this.ignite(j)) this.emit('fire', (X + 0.5) * f.c, (Y + 0.5) * f.c, 0.5, -1);
      }
    }
    // 4) Feuerwehr
    this.stepTrucks(dt);
    // 5) Blitz-Aufzeichnungen nur kurz halten
    while (this.bolts.length && t - this.bolts[0].t0 > STORM.boltLife) this.bolts.shift();
  },

  boltGap(c) {
    const g = STORM.boltMin + this.rngFlow.next() * (STORM.boltMax - STORM.boltMin);
    return c.charged ? g * 0.5 : g;
  },

  lightning(c) {
    const R = radiusOf(c.mass);
    let target = null, td = Infinity;
    for (const o of this.clouds) {
      if (o === c || o.dead || o.eat || o.team < 0 || (c.team >= 0 && o.team === c.team)) continue;
      if (c.team < 0 && o.mass >= c.mass) continue;                 // neutrale Gewitter treffen nur Kleinere
      const d = Math.hypot(o.x - c.x, o.y - c.y);
      if (d < STORM.boltRange * R && d < td) { td = d; target = o; }
    }
    const seed = (this.rngFx.next() * 4294967296) >>> 0;
    if (target) {
      const lost = target.mass * STORM.zapShare;
      target.mass -= lost;
      const n = Math.min(2 + Math.floor(this.rngFlow.next() * 3), EBS.CloudWarsSim.POOL - this.clouds.length);
      for (let k = 0; k < n; k++) {
        const a = Math.atan2(target.y - c.y, target.x - c.x) + (this.rngFlow.next() - 0.5) * 2.2;
        const r = radiusOf(target.mass) * 0.8;
        const s = this.addCloud(-1, Math.max(0.4, lost / n), target.x + Math.cos(a) * r, target.y + Math.sin(a) * r);
        s.vx = Math.cos(a) * 40; s.vy = Math.sin(a) * 40;
      }
      this.bolts.push({ t0: this.t, x0: c.x, y0: c.y, x1: target.x, y1: target.y, air: true, seed });
      this.emit('zap', target.x, target.y, lost, c.team);
    } else {
      // Bodenblitz schlägt seitlich neben der Wolke ein (0,9–1,6 Radien), nicht unter ihrem eigenen Regen
      const a = this.rngFlow.next() * TAU, r = R * (0.9 + this.rngFlow.next() * 0.7);
      const x = c.x + Math.cos(a) * r, y = c.y + Math.sin(a) * r;
      this.bolts.push({ t0: this.t, x0: c.x, y0: c.y, x1: x, y1: y, air: false, seed });
      this.emit('strike', x, y, 1, c.team);
      const i = this.cellAt(x, y);
      if (i >= 0 && this.fire.forest[i] && this.rngFlow.next() < STORM.groundIgnite && this.burnedShare() < STORM.burnCap && this.ignite(i)) {
        this.emit('fire', x, y, 1, -1);
        this.dispatchTruck(x, y);
      }
    }
  },

  /** Wolke frisst eine neutrale Gewitterwolke: 20 s aufgeladen (doppelt so viele Blitze). */
  chargeFrom(A, B) {
    if (A.team < 0 || !B.kind || B.team >= 0) return;
    if (A.kind !== 1) A.kind = 2;
    A.charged = this.t + STORM.chargedTime;
    this.emit('charged', A.x, A.y, B.mass, A.team);
    if (!A.boltAt || A.boltAt > this.t + 2) A.boltAt = this.t + 1;
  },

  // ---------- Feuerwehr ----------
  nearestRoadPoint(x, y) {
    let best = null;
    for (let r = 0; r < this.roads.length; r++) {
      const e = this.roads[r], P = e.pts;
      for (let s = 0; s < P.length / 2; s++) {
        const d = Math.hypot(P[s * 2] - x, P[s * 2 + 1] - y);
        if (!best || d < best.d) best = { r, s, d };
      }
    }
    return best;
  },

  dispatchTruck(x, y) {
    if (this.trucks.length >= TRUCK.max) return;
    for (const tr of this.trucks) if (tr.state !== 'leave' && Math.hypot(tr.fx - x, tr.fy - y) < 200) return;
    const p = this.nearestRoadPoint(x, y);
    if (!p || p.d > TRUCK.reach) return;
    const e = this.roads[p.r], target = e.cum[p.s];
    // Anfahrt von der Seite, auf der mehr Straße liegt
    const fromStart = target > e.len - target, dir = fromStart ? 1 : -1;
    const start = fromStart ? Math.max(0, target - TRUCK.approach) : Math.min(e.len, target + TRUCK.approach);
    const tr = { id: this.nextTruck++, r: p.r, d: start, dir, target, state: 'go', fx: x, fy: y, x: 0, y: 0, ang: 0, sprayT: 0 };
    this.placeTruck(tr); this.trucks.push(tr);
    this.emit('truck', tr.x, tr.y, 1, -1);
  },

  placeTruck(tr) {
    const e = this.roads[tr.r], P = e.pts, C = e.cum;
    let s = 1;
    while (s < C.length - 1 && C[s] < tr.d) s++;
    const u = clamp((tr.d - C[s - 1]) / Math.max(0.001, C[s] - C[s - 1]), 0, 1);
    const ax = P[s * 2 - 2], ay = P[s * 2 - 1], bx = P[s * 2], by = P[s * 2 + 1];
    let ang = Math.atan2(by - ay, bx - ax);
    if (tr.dir < 0) ang += Math.PI;
    // rechte Fahrspur: 1,6 GE neben der Mitte
    tr.x = ax + (bx - ax) * u - Math.sin(ang) * 1.6; tr.y = ay + (by - ay) * u + Math.cos(ang) * 1.6; tr.ang = ang;
  },

  stepTrucks(dt) {
    const f = this.fire, keep = [];
    for (const tr of this.trucks) {
      const e = this.roads[tr.r];
      if (tr.state === 'go') {
        tr.d += tr.dir * TRUCK.speed * dt;
        if ((tr.d - tr.target) * tr.dir >= 0) { tr.d = tr.target; tr.state = 'spray'; tr.sprayT = 0; }
      } else if (tr.state === 'spray') {
        tr.sprayT += dt;
        let near = false;
        for (const i of f.burning) {
          const cx = ((i % f.nx) + 0.5) * f.c, cy = (Math.floor(i / f.nx) + 0.5) * f.c;
          if (Math.hypot(cx - tr.x, cy - tr.y) < TRUCK.spray + 40) { near = true; break; }
        }
        if (!near || tr.sprayT > TRUCK.sprayMax) tr.state = 'leave';
      } else {
        tr.d += tr.dir * TRUCK.speed * dt;
        if (tr.d < 0 || tr.d > e.len) continue;                       // am Ende der Straße verschwunden
      }
      this.placeTruck(tr); keep.push(tr);
    }
    this.trucks = keep;
  },

  stormHashParts() {
    const f = this.fire, parts = [`b${this.burnLog.length}g${this.burnGen}`];
    for (const i of f.burning) parts.push(`${i}:${f.int[i]}:${f.age[i]}`);
    for (const tr of this.trucks) parts.push(`T${tr.id}:${tr.d}:${tr.state}`);
    for (const b of this.bolts) parts.push(`B${b.t0}:${b.seed}`);
    for (const c of this.clouds) if (c.kind) parts.push(`k${c.id}:${c.kind}:${c.boltAt}:${c.charged || 0}`);
    return parts;
  },

  stormInvariants(errors) {
    const f = this.fire;
    if (f.burning.length > FIRE.maxBurning) errors.push(`zu viele Brände: ${f.burning.length}`);
    if (this.trucks.length > TRUCK.max) errors.push(`zu viele Feuerwehrautos: ${this.trucks.length}`);
    for (const i of f.burning) if (!(f.int[i] >= 0 && f.int[i] <= 1)) errors.push(`Brandzelle ${i}: Stärke ${f.int[i]}`);
  },

  burnedShare() {
    const f = this.fire;
    let n = 0;
    for (let i = 0; i < f.state.length; i++) if (f.state[i] === SCAR) n++;
    return this.forestCells ? n / this.forestCells : 0;
  },
});

EBS.CloudWarsStorms = { STORM, FIRE, TRUCK, NONE, BURN, SCAR, OUT };
})();
