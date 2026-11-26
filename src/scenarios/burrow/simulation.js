/*
 * Endless Burrow – Simulation (Paket P1)
 *
 * Würmer graben sich von oben gesehen durch die Erde, fressen Gartenfutter und kleinere Würmer und wachsen.
 * Groß frisst Klein: Erwischt ein Kopf den Körper eines deutlich kleineren Wurms, ist dieser gefressen. Ein Teil
 * seiner Masse geht sofort an den Jäger, der Rest bleibt als Bröckchen in seiner Farbe liegen. Gefressene Würmer
 * schlüpfen nach kurzer Zeit klein wieder (gleicher Name, gleiche Art), damit der Ablauf endlos weiterläuft.
 *
 * Der Körper folgt der Spur des Kopfes (Idee aus Burrow im Repository emfau88/abriss, BodyTrail.ts, Stand
 * edbec0b; hier neu in JavaScript geschrieben). Die Spur ist Teil des Zustands und reicht über den Körper hinaus:
 * Der Renderer zeichnet daraus den verblassenden Tunnel, ohne eigenen Zustand (Seek-Regel).
 *
 * Eigenständig ohne EBS-Kern lauffähig (Tests laden die Datei in einen leeren Kontext).
 */
(function () {
'use strict';
const B = (EBS.Burrow = EBS.Burrow || {});
const DT = 1 / 60;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
class Rng {
  constructor(seed) { this.s = seed >>> 0; }
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) { return a + (b - a) * this.next(); }
}
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

/** Namen und Arten. Farben und Aussehen stehen in burrow/art.js. */
const ROSTER = [
  { name: 'TIGER', sp: 'tiger' }, { name: 'ROSY', sp: 'rosy' }, { name: 'DOTTY', sp: 'dotty' }, { name: 'BRISTLES', sp: 'bristles' },
  { name: 'TANK', sp: 'tank' }, { name: 'FUZZ', sp: 'fuzz' }, { name: 'CYCLO', sp: 'cyclo' }, { name: 'MOSSY', sp: 'mossy' },
  { name: 'ZIGGY', sp: 'cyclo', c: '#4fc9e0', pc: '#e2fbff' }, { name: 'PEBBLE', sp: 'tank', c: '#c9a77a' },
  { name: 'LULU', sp: 'rosy', c: '#c9a0ff', saddle: '#ecdcff' }, { name: 'SKIPPY', sp: 'dotty', c: '#5ab0ff', pc: '#e0f1ff' },
  { name: 'PIP', sp: 'dotty', c: '#ffd84a', pc: '#fff6c8' }, { name: 'BLAZE', sp: 'tiger', c: '#ff7a4a', pc: '#5a1408' },
  { name: 'NOODLE', sp: 'bristles', c: '#f2c94c' }, { name: 'COCO', sp: 'fuzz', c: '#c08a5e' },
  { name: 'SPROUT', sp: 'mossy', c: '#6fbf73', pc: '#2f6a33' }, { name: 'BUBBLES', sp: 'rosy', c: '#ff9ecf', saddle: '#ffe0f0' },
  { name: 'RIVET', sp: 'tank', c: '#8a93ad' }, { name: 'ECHO', sp: 'cyclo', c: '#c48bff', pc: '#f3e6ff' },
];

/** Regeln (Längen in Pixeln einer 1080 Pixel hohen bzw. breiten Welt; wird mit der kurzen Weltseite skaliert). */
const RULES = {
  version: 1,
  startMass: 12, maxMass: 420,
  minR: 7, maxR: 26, minLen: 90, maxLen: 1150, tunnel: 400,
  minSpeed: 105, maxSpeed: 150, minTurn: 1.5, maxTurn: 3.4,
  eatRatio: 1.2,                 // Jäger braucht mindestens das 1,2-Fache der Masse
  gain: 0.45, leave: 0.4,        // Anteil der Beute: sofort / als Bröckchen
  upkeep: 0.02,                  // große Würmer verlieren Masse: Anteil je Sekunde = upkeep × Größe² (Größe 0..1)
  respawnMin: 3, respawnMax: 7, digest: 3,  // Sekunden ohne Jagd nach einem Biss
  foodDensity: 1 / 13000, foodCap: 320, foodRefill: 5,  // Futter je Pixel², Obergrenze, Nachwuchs je Sekunde
  chunkLife: 45, bites: 24, spacing: 3, warmup: 4,
};
/** Gartenfutter: Samen, Beere, Blatt, Pilz, Larve (Nährwert, Radius). Art 5 = Bröckchen eines gefressenen Wurms. */
const FOOD = [
  { kind: 'seed', value: 2, r: 6, p: 0.32 }, { kind: 'berry', value: 3, r: 6, p: 0.24 },
  { kind: 'leaf', value: 2, r: 7, p: 0.22 }, { kind: 'shroom', value: 4, r: 7, p: 0.13 },
  { kind: 'grub', value: 5, r: 7, p: 0.09 },
];
const CHUNK = 5;

class Simulation {
  constructor({ seed = 42, params = {}, world = { w: 1920, h: 1080 }, timeScale = 1 } = {}) {
    this.seed = seed >>> 0;
    this.cfg = { worms: 14, food: 1, growth: 1, ...params };
    this.world = world; this.timeScale = timeScale || 1;
    this.k = Math.min(world.w, world.h) / 1080;
    this.rng = new Rng(fnv1a('burrow|' + this.seed));
    this.step = 0; this.t = 0; this.videoTime = 0;
    this.events = new Array(1024); this.eventSeq = 0;
    this.food = []; this.nextFoodId = 0; this.foodDebt = 0;
    this.bites = []; this.eaten = 0; this.hatched = 0;
    this.worms = [];
    const n = clamp(Math.round(this.cfg.worms), 6, ROSTER.length);
    // Startmassen gestaffelt: ein großer, einige mittlere, viele kleine. Reihenfolge der Größen nach Seed gemischt.
    const masses = [];
    for (let i = 0; i < n; i++) masses.push(RULES.startMass + (RULES.maxMass * 0.45 - RULES.startMass) * Math.pow((n - 1 - i) / (n - 1), 2.2));
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(this.rng.next() * (i + 1)); [masses[i], masses[j]] = [masses[j], masses[i]]; }
    for (let i = 0; i < n; i++) {
      const w = { id: i, name: ROSTER[i].name, sp: ROSTER[i].sp, alive: false, mass: masses[i], x: 0, y: 0, a: 0,
        tx: [], ty: [], bornX: 0, bornY: 0, target: null, flee: false, desired: 0, biteT: -99, bornT: -99, deadT: -99, respawnAt: 0, kills: 0, best: 0 };
      this.worms.push(w);
      this._spawn(w, masses[i], true);
    }
    const target = this._foodTarget();
    for (let i = 0; i < target; i++) this._spawnFood(true);
    // Vorlauf: Die Welt läuft vor dem ersten Bild einige Sekunden, damit Körper und Tunnel schon geschwungen sind.
    // Danach beginnen Schrittzähler, Videouhr, Ereignisse und Zähler bei null; die Simulationszeit t läuft weiter.
    for (let i = 0; i < RULES.warmup * 60; i++) this.stepOnce();
    this.step = 0; this.videoTime = 0; this.eventSeq = 0; this.events = new Array(1024);
    this.eaten = 0; this.hatched = 0; this.bites = [];
    for (const w of this.worms) w.kills = 0;
  }

  // ------------------------------------------------------------- Größen
  frac(m) { return clamp((m - RULES.startMass) / (RULES.maxMass - RULES.startMass), 0, 1); }
  radiusOf(m) { return (RULES.minR + (RULES.maxR - RULES.minR) * Math.sqrt(this.frac(m))) * this.k; }
  lengthOf(m) { return (RULES.minLen + (RULES.maxLen - RULES.minLen) * this.frac(m)) * this.k; }
  speedOf(m) { return (RULES.maxSpeed - (RULES.maxSpeed - RULES.minSpeed) * Math.sqrt(this.frac(m))) * this.k; }
  turnOf(m) { return RULES.maxTurn - (RULES.maxTurn - RULES.minTurn) * Math.sqrt(this.frac(m)); }
  tunnelLength() { return RULES.tunnel * this.k; }
  _foodTarget() { return Math.min(RULES.foodCap - 60, Math.round(this.world.w * this.world.h * RULES.foodDensity * clamp(this.cfg.food, 0.3, 3))); }

  // ------------------------------------------------------------- Spur
  /** Punkt im Abstand d hinter dem Kopf entlang der Spur. */
  pointAt(w, d) {
    const n = w.tx.length, sp = RULES.spacing;
    if (!n) return { x: w.x, y: w.y };
    const lx = w.tx[n - 1], ly = w.ty[n - 1], d0 = Math.hypot(w.x - lx, w.y - ly);
    if (d <= d0) { const t = d0 > 0 ? d / d0 : 0; return { x: w.x + (lx - w.x) * t, y: w.y + (ly - w.y) * t }; }
    const f = (d - d0) / sp, i = Math.floor(f), t = f - i, a = n - 1 - i, b = a - 1;
    if (b < 0) return { x: w.tx[0], y: w.ty[0] };
    return { x: w.tx[a] + (w.tx[b] - w.tx[a]) * t, y: w.ty[a] + (w.ty[b] - w.ty[a]) * t };
  }
  /** Verfügbare Spurlänge hinter dem Kopf. */
  trailLength(w) {
    const n = w.tx.length;
    return n ? Math.hypot(w.x - w.tx[n - 1], w.y - w.ty[n - 1]) + (n - 1) * RULES.spacing : 0;
  }
  _record(w) {
    const sp = RULES.spacing;
    let n = w.tx.length, lx = w.tx[n - 1], ly = w.ty[n - 1], d = Math.hypot(w.x - lx, w.y - ly);
    while (d >= sp) {
      const nx = lx + (w.x - lx) * (sp / d), ny = ly + (w.y - ly) * (sp / d);
      w.tx.push(nx); w.ty.push(ny); lx = nx; ly = ny; d = Math.hypot(w.x - lx, w.y - ly);
    }
    const cap = Math.ceil((this.lengthOf(w.mass) + this.tunnelLength()) / sp) + 4;
    if (w.tx.length > cap + 64) { const cut = w.tx.length - cap; w.tx.splice(0, cut); w.ty.splice(0, cut); }
  }

  // ------------------------------------------------------------- Entstehen
  _spawn(w, mass, initial) {
    const W = this.world.w, H = this.world.h, len = this.lengthOf(mass), m = 120 * this.k;
    let best = null, bestScore = -Infinity;
    for (let k = 0; k < 40; k++) {
      const x = this.rng.range(m, W - m), y = this.rng.range(m, H - m), a = this.rng.range(-Math.PI, Math.PI);
      // Körper zeigt nach hinten; er soll im Bild liegen und Abstand zu anderen halten
      const ex = x - Math.cos(a) * len, ey = y - Math.sin(a) * len;
      let score = 0;
      if (ex < 30 || ex > W - 30 || ey < 30 || ey > H - 30) score -= 400;
      for (const o of this.worms) {
        if (o === w || !o.alive) continue;
        const dh = Math.hypot(o.x - x, o.y - y);
        score += Math.min(dh, 500) * 0.2;
        for (let d = 0; d <= this.lengthOf(o.mass); d += 30) {
          const p = this.pointAt(o, d);
          for (let s = 0; s <= 1; s += 0.25) {
            const qx = x - Math.cos(a) * len * s, qy = y - Math.sin(a) * len * s;
            if (Math.hypot(p.x - qx, p.y - qy) < 60 * this.k) score -= 60;
          }
        }
      }
      if (score > bestScore) { bestScore = score; best = { x, y, a }; }
    }
    w.alive = true; w.mass = mass; w.x = best.x; w.y = best.y; w.a = best.a; w.desired = best.a;
    w.tx = []; w.ty = []; w.target = null; w.flee = false;
    const sp = RULES.spacing, steps = Math.ceil(len / sp) + 1;
    for (let i = steps; i >= 1; i--) { w.tx.push(w.x - Math.cos(w.a) * i * sp); w.ty.push(w.y - Math.sin(w.a) * i * sp); }
    w.bornT = initial ? -99 : this.t; w.bornX = w.x; w.bornY = w.y; w.best = Math.max(w.best, mass);
    if (!initial) { this.hatched++; this._emit('hatch', w.x, w.y, w.id, 0.5); }
  }
  _spawnFood(initial) {
    if (this.food.length >= RULES.foodCap) return;
    const W = this.world.w, H = this.world.h, m = 24 * this.k;
    let x = 0, y = 0;
    for (let k = 0; k < 6; k++) {
      x = this.rng.range(m, W - m); y = this.rng.range(m, H - m);
      if (this.worms.every((w) => !w.alive || Math.hypot(w.x - x, w.y - y) > 140 * this.k)) break;
    }
    let roll = this.rng.next(), kind = 0;
    for (; kind < FOOD.length - 1; kind++) { if ((roll -= FOOD[kind].p) <= 0) break; }
    this.food.push({ id: this.nextFoodId++, kind, x, y, a: this.rng.range(0, Math.PI * 2), v: Math.floor(this.rng.next() * 4),
      value: FOOD[kind].value, r: FOOD[kind].r * this.k, c: -1, born: initial ? -99 : this.t });
  }

  // ------------------------------------------------------------- Ablauf
  _emit(type, x, y, c = -1, p = 1) {
    this.events[this.eventSeq % this.events.length] = { seq: this.eventSeq, step: this.step, t: this.videoTime, type, x, y, c, p };
    this.eventSeq++;
  }
  setParam(key, value) { this.cfg[key] = value; }

  stepOnce() {
    this.step++; this.videoTime = this.step * DT;
    const dt = DT * this.timeScale; this.t += dt;
    const alive = this.worms.filter((w) => w.alive);
    for (const w of alive) if ((this.step + w.id * 5) % 6 === 0) this._think(w);
    for (const w of alive) this._move(w, dt);
    this._eatFood(alive);
    this._eatWorms(alive);
    for (const w of this.worms) {
      if (w.alive) {
        { const f = this.frac(w.mass); w.mass = Math.max(RULES.startMass, w.mass - w.mass * RULES.upkeep * f * f * dt); }
        w.best = Math.max(w.best, w.mass);
      } else if (this.t >= w.respawnAt) this._spawn(w, RULES.startMass, false);
    }
    // Futter wächst nach; Bröckchen verrotten
    this.food = this.food.filter((f) => f.kind !== CHUNK || this.t - f.born < RULES.chunkLife);
    const garden = this.food.reduce((n, f) => n + (f.kind !== CHUNK), 0), target = this._foodTarget();
    if (garden < target) {
      this.foodDebt += RULES.foodRefill * dt * (target - garden > target * 0.3 ? 2 : 1);
      while (this.foodDebt >= 1) { this.foodDebt -= 1; this._spawnFood(false); }
    } else this.foodDebt = 0;
    while (this.bites.length && this.t - this.bites[0].t > 2) this.bites.shift();
  }

  /** Entscheidung alle sechs Schritte: fliehen, jagen, fressen oder umherziehen. */
  _think(w) {
    const k = this.k, sense = (360 + 300 * this.frac(w.mass)) * k;
    let threat = null, threatD = Infinity;
    let prey = null, preyScore = 0;
    const hunt = this.t - w.biteT > RULES.digest;
    for (const o of this.worms) {
      if (o === w || !o.alive) continue;
      const d = Math.hypot(o.x - w.x, o.y - w.y);
      if (o.mass >= w.mass * RULES.eatRatio) {
        const reach = 230 * k + this.radiusOf(o.mass) * 5;
        if (d < reach && d < threatD) { threat = o; threatD = d; }
      } else if (hunt && w.mass >= o.mass * (RULES.eatRatio + 0.05) && d < sense * 0.75) {
        const s = (o.mass / (d + 60)) * 1.6;
        if (s > preyScore) { preyScore = s; prey = o; }
      }
    }
    w.flee = !!threat;
    if (threat) {
      // vom Kopf des Größeren weg, leicht seitlich, damit es nicht in die Wand geht
      const away = Math.atan2(w.y - threat.y, w.x - threat.x);
      w.desired = away + (angDiff(away, w.a) > 0 ? 0.35 : -0.35);
      w.target = null;
      return;
    }
    let food = null, foodScore = 0;
    for (const f of this.food) {
      const d = Math.hypot(f.x - w.x, f.y - w.y);
      if (d > sense) continue;
      const ahead = Math.cos(angDiff(w.a, Math.atan2(f.y - w.y, f.x - w.x)));
      const s = (f.value / (d + 40)) * (1.25 + 0.5 * ahead) * (f.kind === CHUNK ? 1.6 : 1);
      if (s > foodScore) { foodScore = s; food = f; }
    }
    if (w.target && w.target.type === 'food') {
      const cur = this.food.find((f) => f.id === w.target.id);
      if (cur && food && food !== cur) {
        const d = Math.hypot(cur.x - w.x, cur.y - w.y), s = (cur.value / (d + 40)) * 1.4;
        if (s * 1.5 > foodScore) food = cur;
      }
    }
    if (prey && preyScore > foodScore * 0.9) {
      const lead = 40 * k;
      w.target = { type: 'worm', id: prey.id };
      w.desired = Math.atan2(prey.y + Math.sin(prey.a) * lead - w.y, prey.x + Math.cos(prey.a) * lead - w.x);
    } else if (food) {
      w.target = { type: 'food', id: food.id };
      w.desired = Math.atan2(food.y - w.y, food.x - w.x);
    } else {
      w.target = null;
      w.desired = w.a + this.rng.range(-0.6, 0.6);
    }
  }

  _move(w, dt) {
    const W = this.world.w, H = this.world.h, r = this.radiusOf(w.mass), k = this.k;
    let desired = w.desired;
    // Ränder: früh zur Mitte lenken
    const edge = 90 * k + r * 2, lx = w.x + Math.cos(w.a) * edge, ly = w.y + Math.sin(w.a) * edge;
    if (lx < edge || lx > W - edge || ly < edge || ly > H - edge) {
      const toC = Math.atan2(H / 2 - w.y, W / 2 - w.x);
      desired = toC + angDiff(toC, desired) * 0.3;
    }
    // sanftes Schlängeln, nur von Zeit und Kennung abhängig
    const wiggle = Math.sin(this.t * 2.3 + w.id * 1.7) * 0.5;
    const turn = this.turnOf(w.mass) * (w.flee ? 1.25 : 1);
    w.a += clamp(angDiff(w.a, desired) * 4, -turn, turn) * dt + wiggle * 0.6 * dt;
    w.a = Math.atan2(Math.sin(w.a), Math.cos(w.a));
    const v = this.speedOf(w.mass) * (w.flee ? 1.22 : 1);
    w.x += Math.cos(w.a) * v * dt; w.y += Math.sin(w.a) * v * dt;
    if (w.x < r || w.x > W - r) { w.x = clamp(w.x, r, W - r); w.a = Math.PI - w.a; }
    if (w.y < r || w.y > H - r) { w.y = clamp(w.y, r, H - r); w.a = -w.a; }
    this._record(w);
  }

  _eatFood(alive) {
    const gone = new Set();
    for (const w of alive) {
      const r = this.radiusOf(w.mass);
      for (const f of this.food) {
        if (gone.has(f.id)) continue;
        const dx = f.x - w.x, dy = f.y - w.y, lim = r * 1.15 + f.r;
        if (dx * dx + dy * dy > lim * lim) continue;
        gone.add(f.id);
        w.mass = Math.min(RULES.maxMass, w.mass + f.value * clamp(this.cfg.growth, 0.3, 3));
        this._emit(f.kind === CHUNK ? 'chunk' : 'eat', f.x, f.y, w.id, Math.min(1, f.value / 8));
      }
    }
    if (gone.size) this.food = this.food.filter((f) => !gone.has(f.id));
  }

  /** Körperproben (Lage, Radius, Abstand zum Kopf) und Hüllrechteck eines Wurms für diesen Schritt. */
  _body(w) {
    const r = this.radiusOf(w.mass), len = this.lengthOf(w.mass), step = Math.max(4 * this.k, r * 0.7), pts = [];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let d = 0; d <= len; d += step) {
      const p = this.pointAt(w, d), u = d / len, rr = r * (u < 0.6 ? 1 : 1 - Math.pow((u - 0.6) / 0.4, 1.4) * 0.62);
      pts.push(p.x, p.y, rr * 0.9, d);
      if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
    }
    return { pts, x0: x0 - r, y0: y0 - r, x1: x1 + r, y1: y1 + r };
  }
  _eatWorms(alive) {
    const bodies = new Map();
    for (const w of alive) bodies.set(w, this._body(w));
    for (const a of alive) {
      if (!a.alive) continue;
      const ra = this.radiusOf(a.mass) * 1.05;
      for (const b of alive) {
        if (b === a || !b.alive) continue;
        const bd = bodies.get(b);
        if (a.x < bd.x0 - ra || a.x > bd.x1 + ra || a.y < bd.y0 - ra || a.y > bd.y1 + ra) continue;
        let hitD = -1;
        const P = bd.pts;
        for (let i = 0; i < P.length; i += 4) {
          const dx = P[i] - a.x, dy = P[i + 1] - a.y, lim = ra + P[i + 2];
          if (dx * dx + dy * dy < lim * lim) { hitD = P[i + 3]; break; }
        }
        if (hitD < 0) continue;
        if (a.mass >= b.mass * RULES.eatRatio) { this._devour(a, b); continue; }
        // zu klein zum Fressen: abprallen und abdrehen
        const p = this.pointAt(b, hitD), away = Math.atan2(a.y - p.y, a.x - p.x);
        a.a = away + angDiff(away, a.a) * 0.3; a.desired = a.a;
        a.x += Math.cos(away) * 2 * this.k; a.y += Math.sin(away) * 2 * this.k;
      }
    }
  }

  _devour(a, b) {
    const gain = b.mass * RULES.gain, leave = b.mass * RULES.leave, lenB = this.lengthOf(b.mass);
    a.mass = Math.min(RULES.maxMass, a.mass + gain * clamp(this.cfg.growth, 0.3, 3));
    a.biteT = this.t; a.kills++;
    const n = clamp(Math.round(lenB / (22 * this.k)), 3, 40);
    for (let i = 0; i < n && this.food.length < RULES.foodCap; i++) {
      const p = this.pointAt(b, ((i + 0.5) / n) * lenB);
      this.food.push({ id: this.nextFoodId++, kind: CHUNK, x: p.x + this.rng.range(-5, 5) * this.k, y: p.y + this.rng.range(-5, 5) * this.k,
        a: this.rng.range(0, Math.PI * 2), v: Math.floor(this.rng.next() * 4), value: leave / n, r: 7 * this.k, c: b.id, born: this.t });
    }
    this.bites.push({ t: this.t, x: b.x, y: b.y, by: a.id, victim: b.id, gain: Math.round(gain), seed: this.eaten });
    if (this.bites.length > RULES.bites) this.bites.shift();
    b.alive = false; b.deadT = this.t; b.respawnAt = this.t + this.rng.range(RULES.respawnMin, RULES.respawnMax); b.target = null;
    this.eaten++;
    this._emit('gulp', b.x, b.y, a.id, clamp(b.mass / 120, 0.2, 1));
  }

  // ------------------------------------------------------------- Auskunft
  leader() {
    let best = null;
    for (const w of this.worms) if (w.alive && (!best || w.mass > best.mass)) best = w;
    return best;
  }
  ranking() { return this.worms.filter((w) => w.alive).sort((x, y) => (y.mass - x.mass) || (x.id - y.id)); }
  score(w) { return Math.round(w.mass * 3); }
  snapshot() {
    const alive = this.worms.filter((w) => w.alive), lead = this.leader();
    return {
      t: this.t, step: this.step, alive: alive.length, eaten: this.eaten, hatched: this.hatched, food: this.food.length,
      leader: lead ? lead.name : null,
      worms: this.worms.map((w) => ({ id: w.id, name: w.name, alive: w.alive, mass: w.mass, kills: w.kills })),
      summary: `${alive.length} Würmer · größter: ${lead ? `${lead.name} (${this.score(lead)})` : '–'} · gefressen: ${this.eaten}`,
    };
  }
  checkInvariants() {
    const errors = [], W = this.world.w, H = this.world.h;
    for (const w of this.worms) {
      if (!Number.isFinite(w.x) || !Number.isFinite(w.y) || !Number.isFinite(w.a)) errors.push(`${w.name}: Lage ungültig`);
      if (w.alive && (w.x < -1 || w.x > W + 1 || w.y < -1 || w.y > H + 1)) errors.push(`${w.name}: außerhalb der Welt`);
      if (!(w.mass >= RULES.startMass - 1e-9 && w.mass <= RULES.maxMass + 1e-9)) errors.push(`${w.name}: Masse ${w.mass}`);
      const cap = Math.ceil((this.lengthOf(RULES.maxMass) + this.tunnelLength()) / RULES.spacing) + 80;
      if (w.tx.length > cap || w.tx.length !== w.ty.length) errors.push(`${w.name}: Spur zu lang (${w.tx.length})`);
    }
    if (this.food.length > RULES.foodCap) errors.push('zu viel Futter');
    if (this.bites.length > RULES.bites) errors.push('zu viele Bisse');
    return { ok: errors.length === 0, errors };
  }
  stateHash() {
    const parts = [RULES.version, this.step, this.rng.s, this.eaten, this.nextFoodId, this.foodDebt];
    for (const w of this.worms) parts.push(`${w.id}:${w.alive ? 1 : 0}:${w.mass}:${w.x}:${w.y}:${w.a}:${w.tx.length}:${w.respawnAt}`);
    for (const f of this.food) parts.push(`${f.id}:${f.kind}:${f.x}:${f.y}`);
    return fnv1a(parts.join('|')).toString(16).padStart(8, '0');
  }
  destroy() { this.worms = []; this.food = []; this.bites = []; }
}

Object.assign(B, { Simulation, ROSTER, RULES, FOOD, CHUNK });
})();
