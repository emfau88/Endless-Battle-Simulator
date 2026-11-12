/*
 * Szenario: Endless Naval Battle
 * Zwei bis vier Schiffe beschießen sich endlos; jede Kanonenkugel läuft in einem geschlossenen,
 * sichtbaren Kreislauf zurück (Wasser -> Mulde am Meeresgrund -> Glasrohr durch den Kiel -> Magazin).
 * Duell (zwei Schiffe): Beuteprinzip – eine Kugel gehört dem Schiff, in dessen Mulde sie landet; es schießt sie zurück.
 * Drei und vier Schiffe: Jedes Schiff behält seine Kugeln; sie laufen vom Sockel der Mulde durch eine Leitung im Sand
 * zum eigenen Rohr (sonst fangen die mittleren Schiffe fast alles ab und die äußeren stehen ohne Munition da).
 *
 * Aufbau eines Szenarios (siehe src/core.js, registerScenario):
 *   NavalBattle   – Simulation (Matter.js), kein Rendering
 *   NavalRenderer – Darstellung (PixiJS), liest nur den Zustand
 *   Registrierung – Standardwerte, Bedienelemente, Normalisierung, Statistik fürs Bedienfeld
 */
(function () {
'use strict';
const { Engine, Body, Bodies, Composite, Events, Vertices, Common } = Matter;
const { PHYS_HZ, DT, DT_MS, RNG, Particles, ParticleView, canvasTex, getParticleTextures } = EBS;
const { clamp, lerp, angleDiff, num, bool, fnv1a, hashSeed, lerpColor, fmtTime, fmtInt, fmtIntEn } = EBS.util;
const { T_SOFT, T_SPARK, T_SPLINTER, T_DROP, T_RING, T_BUBBLE, F_BUBBLE, F_DROPLET, F_FADEIN } = EBS.FX;

// =====================================================================
//  Konstanten und Stellschrauben
// =====================================================================
const TEAMS = [
  { name: 'RED',   color: 0xff5a4e, dark: 0x8f2a22, sail: 0xf3e6cf },
  { name: 'BLUE',  color: 0x3fb6ff, dark: 0x1c5a8a, sail: 0xe4edf6 },
  { name: 'GREEN', color: 0x5ee08a, dark: 0x23743f, sail: 0xe8f1e2 },
  { name: 'GOLD',  color: 0xffc94a, dark: 0x93701c, sail: 0xf5ecd6 },
];
// Stellschrauben für Schaden, Stabilisierung und Recycling
const TUNING = {
  damagePerHit: 0.0026,  // Schaden pro Treffer bei Intensität 100 % (gedämpft mit (1-d)^2)
  maxDamage: 0.9,        // harte Obergrenze: Schiffe gehen nie ganz unter
  repairStart: 0.68,     // ab diesem Schaden repariert die Crew langsam (Gleichgewicht ≈ 70 %)
  repairRate: 0.004,     // Reparatur pro Sekunde, proportional zum Schaden über repairStart
  maxActiveHoles: 26,    // ältere Löcher werden geflickt
  maxHoles: 44,          // Gesamtgrenze (Löcher + Flicken) pro Schiff
  sinkAccel: 900,        // Sinkbeschleunigung unter Wasser (px/s²)
  sinkDrag: 3.4,         // -> Sinkgeschwindigkeit ≈ 265 px/s
  conveyor: 300,         // Rollen am Meeresgrund (px/s)
  lift: 230,             // Steigen im Glasrohr (px/s)
  shotSpeedFactor: 1.18, // Mündungsgeschwindigkeit relativ zur Minimalgeschwindigkeit
};
const BALL_CAT = 0x0001, SHIP_CAT = 0x0002, MAST_CAT = 0x0020;
const TRAIL_N = 12;

// Layout aus der logischen Weltgröße (9:16, 16:9 oder 1:1 – kurze Seite 1080)
function computeLayout(world, cfg) {
  const W = world.w, H = world.h, portrait = H > W * 1.2, wide = W > H * 1.2, u = Math.min(W, H) / 1080, n = cfg.ships;
  // Querformat mit zwei Schiffen (Vollbild-Video): Schiffe weit auseinander, damit die Flugbahnen gut zu verfolgen sind,
  // etwas kleinere Rümpfe und eine tiefere Wasserlinie, damit über den Masten Platz für die Bögen bleibt.
  const duel = wide && n === 2;
  const span = (duel ? 0.62 : wide ? 0.46 : 0.54) + (n > 2 ? 0.14 : 0);
  const xs = [];
  for (let i = 0; i < n; i++) xs.push(W * (0.5 + (i / (n - 1) - 0.5) * span));
  const spacing = W * span / (n - 1);
  const baseHull = (duel ? 400 : wide ? 430 : 335) * u;
  const hull = Math.min(baseHull, spacing * 0.62);
  const sc = hull / baseHull;
  const g = 470 * u;
  return {
    W, H, portrait, wide, u, n, xs, spacing, hull, sc, g,
    ballR: Math.max(7, 10.5 * u * Math.max(0.75, sc)),
    waterY: Math.round(H * (portrait ? 0.565 : duel ? 0.66 : 0.6)),
    floorY: portrait ? Math.round(H * 0.795) : Math.round(H - 74 * u),   // tiefster Punkt der Mulden
    ridge: (portrait ? 66 : 58) * u, edgeRise: (portrait ? 40 : 46) * u,
    waveAmp: u,
    // Querformat: flachere Bögen, bleiben im Bild (im Duell wegen des größeren Abstands noch etwas flacher)
    v0: Math.sqrt(g * spacing) * TUNING.shotSpeedFactor * (portrait ? 1 : duel ? 0.90 : 0.95),
  };
}

function quadPts(p0, p1, p2, n) {
  const out = [];
  for (let k = 1; k <= n; k++) {
    const t = k / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
    out.push([a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]]);
  }
  return out;
}

// Schiffsgeometrie in lokalen Koordinaten (Ursprung = Wasserlinie, Mitte; Bug zeigt in Richtung f)
function shipGeometry(L, f) {
  const fb = 0.16 * L, dr = 0.13 * L, X = (x) => x * f;
  const sternTop = [-0.52 * L, -fb - 0.012 * L], bowTop = [0.53 * L, -fb - 0.025 * L];
  const keelBow = [0.33 * L, dr], keelStern = [-0.36 * L, dr];
  const outlineU = [sternTop, bowTop,
    ...quadPts(bowTop, [0.585 * L, 0.05 * dr], keelBow, 10),
    ...quadPts(keelBow, [-0.02 * L, dr * 1.06], keelStern, 4),
    ...quadPts(keelStern, [-0.545 * L, 0.45 * dr], sternTop, 8).slice(0, -1)];
  const outline = outlineU.map(([x, y]) => [X(x), y]);
  const cx0 = X(-0.535 * L), cx1 = X(-0.27 * L), portX = X(-0.36 * L);
  return {
    L, f, fb, dr, deckY: -fb, outline,
    castle: { x0: Math.min(cx0, cx1), x1: Math.max(cx0, cx1), y0: -fb - 0.13 * L, y1: -fb + 2 },
    masts: [
      { x: X(-0.06 * L), h: 0.80 * L, w: Math.max(9, 0.03 * L), main: true },
      { x: X(0.25 * L), h: 0.62 * L, w: Math.max(8, 0.026 * L), main: false },
    ],
    bowsprit: [[X(0.5 * L), -fb - 0.02 * L], [X(0.70 * L), -fb - 0.17 * L]],
    port: { x: portX, y: polyYMax(outline, portX) },   // Kielöffnung unter dem Achterkastell: hier kommt der Lift von unten an
    rack: { x: X(-0.4 * L), y: -fb - 0.13 * L },
  };
}

// Sutherland-Hodgman gegen eine horizontale Linie
function clipY(poly, y0, keepBelow) {
  const out = [], inside = (p) => (keepBelow ? p[1] >= y0 : p[1] <= y0);
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], ia = inside(a), ib = inside(b);
    if (ia) out.push(a);
    if (ia !== ib) { const t = (y0 - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, y0]); }
  }
  return out;
}
function polyXRange(poly, y) {
  let mn = Infinity, mx = -Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
      const x = a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]);
      mn = Math.min(mn, x); mx = Math.max(mx, x);
    }
  }
  return mn < mx ? [mn, mx] : null;
}
function polyYMax(poly, x) {
  let mx = -Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if ((a[0] <= x && b[0] > x) || (b[0] <= x && a[0] > x)) mx = Math.max(mx, a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]));
  }
  return mx;
}
const flat = (pts) => pts.flatMap((p) => p);

class NavalBattle {
  constructor({ seed, params, world, timeScale = 1 }) {
    // Zeitlupe: jeder Physikschritt deckt timeScale × 1/60 s Simulationszeit ab (1 = unverändert, bitgleich)
    this.dt = DT * timeScale; this.dtMs = DT_MS * timeScale;
    const cfg = (this.cfg = { seed, ...params });
    const L = (this.L = computeLayout(world, cfg));
    Common._nextId = 0; Common._seed = 0; // Matter-interne Zähler zurücksetzen -> reproduzierbar
    this.rng = new RNG(hashSeed(cfg.seed, 'physics'));
    this.fx = new RNG(hashSeed(cfg.seed, 'fx'));
    this.engine = Engine.create({ gravity: { x: 0, y: L.g / 1000, scale: 0.001 }, positionIterations: 8, velocityIterations: 6 });
    this.world = this.engine.world;
    this.step = 0; this.t = 0; this.shake = 0;
    this.stats = { shots: 0, hits: 0, splashes: 0, recycled: 0, forced: 0, nudges: 0, clinks: 0 };
    this.particles = new Particles(1600);
    this._surfaceNow = (x) => this.surfaceY(x, this.t);
    this.events = new Array(256); this.eventSeq = 0;
    this.hitQueue = []; this.clinkQueue = [];
    this.ships = []; this.balls = [];
    this.allShipsMask = ((1 << L.n) - 1) * SHIP_CAT;
    this.allMastsMask = ((1 << L.n) - 1) * MAST_CAT;
    for (let i = 0; i < L.n; i++) this.ships.push(this._createShip(i));
    // Mulden von links nach rechts. Die Wasserscheide zwischen zwei Nachbarn liegt mittig zwischen den Schiffen,
    // damit jedes Schiff einsammelt, was neben ihm ins Wasser fällt (im Duell ist das die Bildmitte).
    this.bowls = [...this.ships].sort((a, b) => a.liftX - b.liftX);
    this.liftXs = this.bowls.map((s) => s.liftX);
    this.sheds = [];
    for (let k = 0; k + 1 < this.bowls.length; k++) {
      const a = this.bowls[k], b = this.bowls[k + 1];
      this.sheds.push(clamp((a.x0 + b.x0) / 2, a.liftX + 60 * L.u, b.liftX - 60 * L.u));
    }
    for (const s of this.ships) {
      s.footY = this.groundY(s.liftX) - L.ballR - 2 * L.u;            // Kugelmitte am Rohrfuß
      s.liftLen = s.footY - (L.waterY + s.geo.rack.y);                 // Rohrfuß bis Munitionsregal
      s.headY = L.waterY + s.geo.port.y + s.maxSink + 16 * L.u;        // Oberkante des feststehenden Glasrohrs
    }
    this.beute = L.n === 2;                                            // Beuteprinzip nur im Duell
    this.ammoTarget = cfg.cannons * cfg.ballsPerCannon * 0.45;
    for (const s of this.ships) this._createBalls(s);
    for (const s of this.ships) this._initCannons(s);
    Events.on(this.engine, 'collisionStart', (e) => this._onCollision(e));
    this._updateShips(0, true);
  }

  // ---------- Wasser ----------
  surfaceY(x, t) {
    const a = this.L.waveAmp;
    return this.L.waterY + a * (7.5 * Math.sin(x * 0.0102 - t * 1.15) + 4.2 * Math.sin(x * 0.0231 + t * 1.73 + 1.3)
      + 1.8 * Math.sin(x * 0.047 - t * 2.6 + 0.4));
  }
  backY(x, t) {
    const a = this.L.waveAmp;
    return this.L.waterY - 18 * a + a * (5 * Math.sin(x * 0.0079 + t * 0.85 + 2) + 3 * Math.sin(x * 0.019 - t * 1.37));
  }

  // Meeresgrund: Mulde an jedem Rohrfuß, flacher Rücken dazwischen, Anstieg zu den Bildrändern -> jede Kugel rollt bergab
  groundY(x) {
    const L = this.L, xs = this.liftXs, n = xs.length;
    const hill = (d, span, h) => h * (1 - Math.cos(Math.PI * clamp(d / span, 0, 1))) / 2;
    if (x <= xs[0]) return L.floorY - hill(xs[0] - x, xs[0] + 90 * L.u, L.edgeRise);
    if (x >= xs[n - 1]) return L.floorY - hill(x - xs[n - 1], L.W - xs[n - 1] + 90 * L.u, L.edgeRise);
    let k = 0; while (x > xs[k + 1]) k++;
    const m = this.sheds[k], left = m - xs[k], right = xs[k + 1] - m, h = Math.min(L.ridge, 0.2 * Math.min(left, right));
    return L.floorY - (x < m ? hill(x - xs[k], left, h) : hill(xs[k + 1] - x, right, h));
  }

  // ---------- Aufbau ----------
  _createShip(i) {
    const L = this.L, len = L.hull, n = L.n;
    const facing = i < (n - 1) / 2 ? 1 : i > (n - 1) / 2 ? -1 : 1;
    const geo = shipGeometry(len, facing);
    const parts = [], mastParts = [];
    const mk = (verts, kind, list = parts) => {
      const c = Vertices.centre(verts);
      const b = Body.create({ position: { x: c.x, y: c.y }, vertices: verts });
      b.simKind = kind; list.push(b);
    };
    mk(Vertices.hull(geo.outline.map(([x, y]) => ({ x, y }))), 'hull');
    const c = geo.castle;
    mk([{ x: c.x0, y: c.y0 }, { x: c.x1, y: c.y0 }, { x: c.x1, y: c.y1 }, { x: c.x0, y: c.y1 }], 'castle');
    for (const m of geo.masts) {
      const top = geo.deckY - m.h, w = m.w / 2;
      mk([{ x: m.x - w, y: top }, { x: m.x + w, y: top }, { x: m.x + w, y: geo.deckY }, { x: m.x - w, y: geo.deckY }], 'mast', mastParts);
    }
    // Rumpf+Kastell und Masten sind getrennte Körper: Kugeln, die schon getroffen haben,
    // rollen durch die Masten hindurch und bleiben so nicht an Deck hängen.
    const body = Body.create({ parts, isStatic: true, restitution: 0.25, friction: 0.35,
      collisionFilter: { category: SHIP_CAT << i, mask: BALL_CAT, group: 0 } });
    const mastBody = Body.create({ parts: mastParts, isStatic: true, restitution: 0.25, friction: 0.35,
      collisionFilter: { category: MAST_CAT << i, mask: BALL_CAT, group: 0 } });
    const ship = {
      i, team: TEAMS[i % TEAMS.length], facing, len, geo, body, mastBody,
      bodies: [body, mastBody].map((b) => ({ b, co: { x: b.position.x, y: b.position.y } })),
      x0: L.xs[i], x: L.xs[i], y: L.waterY, angle: 0, baseAngle: 0, recoilX: 0, recoilA: 0, sink: 0,
      maxSink: geo.fb * 0.42, damage: 0, holes: [], dmgVer: 0, lastPatch: 0,
      ammo: 0, magBalls: [], lane: [], cannons: [], totalBalls: 0,
      shots: 0, hitsDealt: 0, hitsTaken: 0, smokeAcc: 0, fireAcc: 0,
      liftX: L.xs[i] + geo.port.x, footY: 0, headY: 0, liftLen: 0, portX: 0, portY: 0, rackX: 0, rackY: 0, ballMask: 0,
    };
    for (const p of [...parts, ...mastParts]) p.simShip = ship;
    body.simShip = mastBody.simShip = ship;
    Composite.add(this.world, [body, mastBody]);
    return ship;
  }

  _createBalls(ship) {
    const L = this.L, count = this.cfg.cannons * this.cfg.ballsPerCannon;
    const mask = BALL_CAT | (this.allShipsMask & ~(SHIP_CAT << ship.i)) | (this.allMastsMask & ~(MAST_CAT << ship.i));
    for (let k = 0; k < count; k++) {
      const body = Bodies.circle(0, -5000, L.ballR, {
        restitution: 0.3, friction: 0.03, frictionStatic: 0.2, frictionAir: 0, density: 0.004,
        collisionFilter: { category: BALL_CAT, mask, group: 0 },
      });
      const ball = {
        id: this.balls.length, owner: ship.i, body, r: L.ballR, mask, state: 'mag',
        x: 0, y: 0, vx: 0, vy: 0, age: 0, still: 0, nudges: 0, hit: false, ghost: false, dist: 0, dir: 1,
        trail: new Float32Array(TRAIL_N * 2), trailLen: 0, trailHead: 0, bubbleT: 0, laneT: 0, viaX: 0, under: 0,
      };
      body.simBall = ball;
      this.balls.push(ball); ship.magBalls.push(ball);
    }
    ship.totalBalls = count; ship.ammo = ship.magBalls.length; ship.ballMask = mask;
  }

  _initCannons(ship) {
    const c = this.cfg.cannons, L = ship.len;
    for (let k = 0; k < c; k++) {
      const u = (k + 0.5) / c;
      const cannon = {
        k, lx: ship.facing * lerp(-0.2 * L, 0.43 * L, u), ly: ship.geo.deckY - 0.035 * L, len: 0.105 * L,
        arc: k % 2 ? 'high' : 'low',
        interval: 2.9 * [1, 1.17, 0.9, 1.08, 0.96, 1.12][k] * this.rng.range(0.92, 1.08),
        speedF: [1, 0.97, 1.04, 0.95, 1.02, 0.99][k] * this.rng.range(0.97, 1.03),
        timer: this.rng.range(0.4, 2.6), angle: ship.facing > 0 ? -0.6 : Math.PI + 0.6, aim: 0,
        target: null, tlx: 0, tly: 0, recoil: 0, waiting: false,
      };
      cannon.aim = cannon.angle;
      ship.cannons.push(cannon);
      this._chooseTarget(ship, cannon);
    }
  }

  // ---------- Koordinaten ----------
  _localToWorld(ship, lx, ly) {
    const ca = Math.cos(ship.angle), sa = Math.sin(ship.angle);
    return { x: ship.x + lx * ca - ly * sa, y: ship.y + lx * sa + ly * ca };
  }
  _worldToLocal(ship, x, y) {
    const ca = Math.cos(ship.angle), sa = Math.sin(ship.angle), dx = x - ship.x, dy = y - ship.y;
    return { x: dx * ca + dy * sa, y: -dx * sa + dy * ca };
  }

  // ---------- Zielen ----------
  _shotSpeed(c) { return this.L.v0 * this.cfg.projectileSpeed * c.speedF; }
  _solve(px, py, tx, ty, v, high) {
    const g = this.L.g, dx = tx - px, x = Math.max(1, Math.abs(dx)), h = py - ty;
    let v2 = v * v, disc = v2 * v2 - g * (g * x * x + 2 * h * v2), it = 0;
    while (disc < 0 && it++ < 40) { v *= 1.04; v2 = v * v; disc = v2 * v2 - g * (g * x * x + 2 * h * v2); }
    const th = Math.atan((v2 + (high ? 1 : -1) * Math.sqrt(Math.max(0, disc))) / (g * x));
    return { angle: Math.atan2(-Math.sin(th), (dx >= 0 ? 1 : -1) * Math.cos(th)), v };
  }
  _chooseTarget(ship, c) {
    let target = null;
    if (this.ships.length === 2) target = this.ships[1 - ship.i];
    else {
      let sum = 0;
      for (const s of this.ships) if (s !== ship) sum += 1 / Math.abs(s.x0 - ship.x0);
      let r = this.rng.next() * sum;
      for (const s of this.ships) {
        if (s === ship) continue;
        target = s; r -= 1 / Math.abs(s.x0 - ship.x0);
        if (r <= 0) break;
      }
    }
    c.target = target;
    c.tlx = this.rng.range(-0.42, 0.42) * target.len;
    c.tly = c.arc === 'high' ? target.geo.deckY - this.rng.range(0, 0.3) * target.len : target.geo.deckY * this.rng.range(0.25, 0.9);
    const p = this._localToWorld(ship, c.lx, c.ly), tp = this._localToWorld(target, c.tlx, c.tly);
    c.aim = this._solve(p.x, p.y, tp.x, tp.y, this._shotSpeed(c), c.arc === 'high').angle;
  }

  // ---------- Hauptschritt (fester Zeitschritt 1/60 s) ----------
  stepOnce() {
    const t = this.t;
    this._updateShips(t, false);
    this._updateCannons();
    Engine.update(this.engine, this.dtMs);
    this.step++; this.t = this.step * this.dt;
    this._processHits();
    this._updateBalls();
    this._updateShipDamage();
    this.particles.update(this.dt, this._surfaceNow);
    this.shake *= 0.9;
  }

  _updateShips(t, snap) {
    for (const ship of this.ships) {
      const L = ship.len, x0 = ship.x0;
      ship.recoilX *= 0.9; ship.recoilA *= 0.93;
      const xl = x0 - 0.38 * L, xr = x0 + 0.38 * L;
      const yl = this.surfaceY(xl, t), yr = this.surfaceY(xr, t), yc = this.surfaceY(x0, t);
      ship.sink += (ship.damage * ship.maxSink - ship.sink) * (snap ? 1 : 0.01);
      const ty = (yl + yr) * 0.3 + yc * 0.4 + ship.sink;
      const ta = Math.atan2(yr - yl, xr - xl) * 0.8 + ship.facing * ship.damage * 0.07;
      if (snap) { ship.y = ty; ship.baseAngle = ta; } else { ship.y += (ty - ship.y) * 0.14; ship.baseAngle += (ta - ship.baseAngle) * 0.1; }
      ship.x = x0 + ship.recoilX; ship.angle = ship.baseAngle + ship.recoilA;
      const ca = Math.cos(ship.angle), sa = Math.sin(ship.angle);
      for (const { b, co } of ship.bodies) {
        Body.setAngle(b, ship.angle);
        Body.setPosition(b, { x: ship.x + co.x * ca - co.y * sa, y: ship.y + co.x * sa + co.y * ca });
      }
      const pt = this._localToWorld(ship, ship.geo.port.x, ship.geo.port.y), rk = this._localToWorld(ship, ship.geo.rack.x, ship.geo.rack.y);
      ship.portX = pt.x; ship.portY = pt.y; ship.rackX = rk.x; ship.rackY = rk.y;
    }
  }

  _updateCannons() {
    const maxTurn = 2.2 * this.dt;
    for (const ship of this.ships) {
      for (const c of ship.cannons) {
        c.recoil = Math.max(0, c.recoil - this.dt * 3);
        c.angle += clamp(angleDiff(c.aim, c.angle), -maxTurn, maxTurn);
        // Ausgleich fürs Beuteprinzip: ein volles Regal feuert etwas schneller, ein leeres etwas langsamer
        c.timer -= this.dt * this.cfg.fireRate * (this.beute ? clamp(1 + 0.03 * (ship.ammo - this.ammoTarget), 0.85, 1.3) : 1);
        if (c.timer <= 0) {
          if (ship.ammo > 0) this._fire(ship, c); else { c.waiting = true; c.timer = 0; }
        }
      }
    }
  }

  _fire(ship, c) {
    const ball = ship.magBalls.pop();
    ship.ammo = ship.magBalls.length; c.waiting = false;
    const high = c.arc === 'high', tgt = c.target;
    const piv = this._localToWorld(ship, c.lx, c.ly), tp = this._localToWorld(tgt, c.tlx, c.tly);
    let sol = this._solve(piv.x, piv.y, tp.x, tp.y, this._shotSpeed(c), high);
    let mx = piv.x + Math.cos(sol.angle) * c.len, my = piv.y + Math.sin(sol.angle) * c.len;
    sol = this._solve(mx, my, tp.x, tp.y, this._shotSpeed(c), high); // aus Mündungsposition nachzielen
    const ang = sol.angle + this.rng.normal() * 0.018;
    const v = sol.v * (1 + this.rng.normal() * 0.03);
    mx = piv.x + Math.cos(ang) * c.len; my = piv.y + Math.sin(ang) * c.len;
    const b = ball.body, aStep = this.L.g * this.dt * this.dt;
    b.collisionFilter.mask = ball.mask;
    Body.setPosition(b, { x: mx, y: my });
    Body.setAngle(b, 0); Body.setAngularVelocity(b, 0);
    Body.setVelocity(b, { x: Math.cos(ang) * v / PHYS_HZ, y: Math.sin(ang) * v / PHYS_HZ - aStep * 0.5 });
    Composite.add(this.world, b);
    ball.state = 'fly'; ball.age = 0; ball.still = 0; ball.nudges = 0; ball.hit = false; ball.ghost = false;
    ball.trailLen = 0; ball.trailHead = 0;
    c.angle = ang; c.recoil = 1;
    const dirX = Math.cos(ang) >= 0 ? 1 : -1;
    ship.recoilX -= dirX * 2.4 * this.L.u; ship.recoilA -= dirX * 0.008;
    this.stats.shots++; ship.shots++;
    this._fxMuzzle(mx, my, ang);
    this._event('shot', mx, my, 1);
    c.timer = c.interval * this.rng.range(0.85, 1.15);
    this._chooseTarget(ship, c);
  }

  _onCollision(e) {
    for (const pair of e.pairs) {
      const a = pair.bodyA, b = pair.bodyB, ba = a.simBall, bb = b.simBall;
      if (ba && bb) { this.clinkQueue.push(ba, bb); continue; }
      const ball = ba || bb;
      if (!ball) continue;
      const part = ba ? b : a, ship = part.simShip || (part.parent && part.parent.simShip);
      if (!ship) continue;
      const s = pair.collision && pair.collision.supports, sp = (s && s[0]) || ball.body.position;
      this.hitQueue.push({ ball, ship, kind: part.simKind || 'hull', x: sp.x, y: sp.y, speed: ball.body.speed * PHYS_HZ });
    }
  }

  _processHits() {
    const u = this.L.u;
    for (const h of this.hitQueue) {
      const ball = h.ball;
      if (ball.state !== 'fly' || ball.ghost) continue;
      if (ball.hit || h.speed < 140 * u) { if (h.speed > 260 * u) this._fxDust(h.x, h.y); continue; }
      ball.hit = true;
      ball.body.collisionFilter.mask = ball.mask & ~this.allMastsMask;
      const ship = h.ship;
      const kindF = h.kind === 'mast' ? 0.55 : h.kind === 'castle' ? 0.9 : 1;
      const spF = clamp(h.speed / this.L.v0, 0.6, 1.3);
      const dd = TUNING.damagePerHit * this.cfg.intensity * kindF * spF * (1 - ship.damage) * (1 - ship.damage);
      ship.damage = Math.min(TUNING.maxDamage, ship.damage + dd);
      ship.hitsTaken++; this.ships[ball.owner].hitsDealt++; this.stats.hits++;
      // sichtbare Löcher folgen dem Schadenswert -> Zerstörung wächst langsam und gleichmäßig
      const target = Math.round((ship.damage / TUNING.maxDamage) * TUNING.maxActiveHoles + 0.35);
      if (this._activeHoles(ship) < target) {
        const loc = this._worldToLocal(ship, h.x, h.y);
        this._addHole(ship, loc.x, loc.y, h.kind, spF);
      }
      this._fxImpact(h.x, h.y, spF);
      this.shake = Math.min(14 * u, this.shake + 4.5 * u);
      this._event('hit', h.x, h.y, spF);
    }
    this.hitQueue.length = 0;
    for (let i = 0; i < this.clinkQueue.length; i += 2) {
      const a = this.clinkQueue[i], b = this.clinkQueue[i + 1];
      if (a.state !== 'fly' || b.state !== 'fly') continue;
      const rv = Math.hypot(a.body.velocity.x - b.body.velocity.x, a.body.velocity.y - b.body.velocity.y) * PHYS_HZ;
      if (rv > 120 * u) {
        this.stats.clinks++;
        this._fxClink((a.body.position.x + b.body.position.x) / 2, (a.body.position.y + b.body.position.y) / 2);
        this._event('clink', a.body.position.x, a.body.position.y, rv);
      }
    }
    this.clinkQueue.length = 0;
  }

  _addHole(ship, lx, ly, kind, spF) {
    const L = ship.len, fx = this.fx;
    // leicht ins Rumpfinnere schieben, damit das Loch nicht nur am Rand klebt
    const cy = ship.geo.deckY * 0.5, d = Math.hypot(lx, ly - cy) || 1, r = L * 0.03 * spF * fx.range(0.8, 1.25);
    if (kind !== 'mast') { lx -= (lx / d) * r * 0.7; ly -= ((ly - cy) / d) * r * 0.7; }
    ship.holes.push({ x: lx, y: ly, r, rot: fx.range(0, 6.283), kind, seed: fx.int(1, 1e9), patched: false, t: this.t });
    if (this._activeHoles(ship) > TUNING.maxActiveHoles) { for (const h of ship.holes) if (!h.patched) { h.patched = true; break; } }
    if (ship.holes.length > TUNING.maxHoles) {
      const idx = ship.holes.findIndex((h) => h.patched);
      ship.holes.splice(idx >= 0 ? idx : 0, 1);
    }
    ship.dmgVer++;
  }

  _updateShipDamage() {
    for (const ship of this.ships) {
      // automatische Stabilisierung: Crew repariert oberhalb der Schwelle
      if (ship.damage > TUNING.repairStart) ship.damage -= TUNING.repairRate * (ship.damage - TUNING.repairStart) * this.dt;
      // Reparatur sichtbar machen: alle 3 s ein Loch flicken, wenn mehr offen sind als der Schaden erklärt
      if (this.t - ship.lastPatch > 3) {
        ship.lastPatch = this.t;
        const target = Math.round((ship.damage / TUNING.maxDamage) * TUNING.maxActiveHoles + 0.35);
        if (this._activeHoles(ship) > target + 1) { for (const h of ship.holes) if (!h.patched) { h.patched = true; ship.dmgVer++; break; } }
      }
      this._shipSmoke(ship);
    }
  }

  _updateBalls() {
    const W = this.L.W, u = this.L.u;
    for (const ball of this.balls) {
      if (ball.state === 'fly') {
        const b = ball.body, p = b.position;
        ball.age += this.dt;
        if ((this.step & 1) === 0) {
          ball.trail[ball.trailHead * 2] = p.x; ball.trail[ball.trailHead * 2 + 1] = p.y;
          ball.trailHead = (ball.trailHead + 1) % TRAIL_N; ball.trailLen = Math.min(TRAIL_N, ball.trailLen + 1);
        }
        const sy = this.surfaceY(p.x, this.t);
        if (p.y + ball.r * 0.35 > sy) { this._splash(ball, p.x, sy); continue; }
        if (!ball.ghost) {
          if (b.speed < 0.45 && ball.age > 0.4) {
            if (++ball.still > 30) { // Kugel liegt an Deck -> Richtung Bug (offene Seite) anstoßen
              let near = this.ships[0];
              for (const s of this.ships) if (Math.abs(s.x - p.x) < Math.abs(near.x - p.x)) near = s;
              b.collisionFilter.mask = ball.mask & ~this.allMastsMask;
              Body.setVelocity(b, { x: near.facing * 3.6 * u, y: -2.2 * u });
              ball.still = 0; ball.nudges++; this.stats.nudges++;
            }
          } else if (ball.still > 0) ball.still--;
          if (ball.age > 15 || ball.nudges > 3) { // Notfall: Kugel fällt durch und landet im Recycling
            b.collisionFilter.mask = 0; ball.ghost = true; this.stats.forced++;
            this._fxPoof(p.x, p.y);
          }
        }
      } else if (ball.state === 'sink') {
        ball.vx *= Math.exp(-2.2 * this.dt);
        ball.vy += (TUNING.sinkAccel * u - TUNING.sinkDrag * ball.vy) * this.dt;
        ball.x = clamp(ball.x + ball.vx * this.dt, -30 * u, W + 30 * u); ball.y += ball.vy * this.dt;
        if ((ball.bubbleT -= this.dt) <= 0) { ball.bubbleT = 0.08 + this.fx.next() * 0.08; this._fxBubble(ball.x, ball.y - ball.r); }
        const gy = this.groundY(ball.x) - ball.r - 1.5 * u;
        if (ball.y >= gy) { ball.y = gy; this._enterLane(ball); }
      }
    }
    // Mulde + Glasrohr (Warteschlange je Schiff, Kugeln überholen sich nicht)
    const roll = TUNING.conveyor * u * this.dt, rise = TUNING.lift * u * this.dt;
    for (const ship of this.ships) {
      const lane = ship.lane, gap = 2 * this.L.ballR + 3;
      let prev = -Infinity;
      for (const b of lane) {
        b.laneT += this.dt;                                   // rollt aus dem Stand an, steigt im Rohr gleichmäßig
        let d = b.dist - (b.dist > ship.liftLen ? roll * clamp(0.2 + b.laneT * 1.6, 0.2, 1) : rise);
        if (d < prev + gap) d = prev + gap;
        b.dist = d; prev = d;
      }
      while (lane.length && lane[0].dist <= 0) {
        const b = lane.shift();
        b.state = 'mag'; ship.magBalls.push(b); ship.ammo = ship.magBalls.length; this.stats.recycled++;
        this._fxPop(ship.rackX, ship.rackY, ship.team.color);
        this._event('reload', ship.rackX, ship.rackY, 1);
      }
    }
  }

  _splash(ball, x, sy) {
    const b = ball.body, vx = b.velocity.x * PHYS_HZ, vy = b.velocity.y * PHYS_HZ;
    Composite.remove(this.world, b);
    ball.state = 'sink'; ball.x = clamp(x, -30 * this.L.u, this.L.W + 30 * this.L.u); ball.y = sy;
    ball.vx = vx * 0.25; ball.vy = Math.max(60, vy * 0.3); ball.bubbleT = 0;
    this.stats.splashes++;
    this._fxSplash(ball.x, sy, Math.hypot(vx, vy));
    this._event('splash', ball.x, sy, Math.hypot(vx, vy));
  }

  _enterLane(ball) {
    // Die Kugel rollt in die Mulde, in der sie liegt (Bereich zwischen den Wasserscheiden).
    // Duell: Beuteprinzip – sie gehört ab jetzt dem Schiff dieser Mulde.
    // Drei und vier Schiffe: Sie bleibt bei ihrem Schiff und läuft vom Sockel dieser Mulde durch die Leitung im Sand
    // (verdeckt) zum eigenen Rohr.
    let k = 0; while (k < this.sheds.length && ball.x >= this.sheds[k]) k++;
    const bowl = this.bowls[k], ship = this.beute ? bowl : this.ships[ball.owner];
    ball.owner = ship.i; ball.mask = ship.ballMask;
    ball.state = 'lane'; ball.laneT = 0;
    this._fxSand(ball.x, ball.y + ball.r);
    this._event('land', ball.x, ball.y, 1);                  // Kugel setzt am Grund auf -> „Tock“
    ball.viaX = bowl.liftX; ball.under = Math.abs(bowl.liftX - ship.liftX);
    ball.dir = ball.x >= bowl.liftX ? 1 : -1;
    let d = Math.abs(ball.x - bowl.liftX) + ball.under + ship.liftLen;
    const gap = 2 * this.L.ballR + 3;
    for (let guard = 0, moved = true; moved && guard < 64; guard++) {
      moved = false;
      for (const o of ship.lane) if (Math.abs(o.dist - d) < gap) { d = o.dist + gap; moved = true; }
    }
    ball.dist = d;
    ship.lane.push(ball);
    ship.lane.sort((a, b) => a.dist - b.dist || a.id - b.id);
  }

  // Position einer Kugel in der Mulde bzw. im Glasrohr (für Rendering)
  lanePos(ball) {
    const ship = this.ships[ball.owner], u = this.L.u;
    const rest = ball.dist - ship.liftLen - ball.under;      // Weg bis zum Sockel der Mulde
    if (rest > 0) {
      const x = ball.viaX + ball.dir * rest;
      return { x, y: this.groundY(x) - ball.r - 1.5 * u, lift: false, t: 0, hidden: false };
    }
    // in der Leitung im Sand unterwegs zum eigenen Rohr (nur bei drei und vier Schiffen)
    if (ball.dist > ship.liftLen) return { x: ball.viaX, y: this.groundY(ball.viaX) - ball.r - 1.5 * u, lift: false, t: 0, hidden: true };
    // Rohr: vom Fuß senkrecht nach oben, im Bereich der Manschette zur Kielöffnung, im Rumpf verdeckt bis zum Regal
    const t = 1 - ball.dist / ship.liftLen, y = lerp(ship.footY, ship.rackY, t);
    const k = clamp((ship.headY - y) / Math.max(1, ship.headY - ship.portY), 0, 1);
    return { x: lerp(ship.liftX, ship.portX, k), y, lift: true, t, hidden: y < ship.portY + ball.r * 0.5 };
  }

  _event(type, x, y, p) {
    // step = Physikschritt (60 je Videosekunde, auch in Zeitlupe) – daraus entsteht die Tonspur
    this.events[this.eventSeq % this.events.length] = { seq: this.eventSeq, step: this.step + 1, t: this.t, type, x, y, p, c: -1 };
    this.eventSeq++;
  }

  // ---------- Effekte (eigener Zufallsstrom, beeinflusst die Physik nicht) ----------
  _fxMuzzle(x, y, ang) {
    const P = this.particles, r = this.fx, u = this.L.u, ca = Math.cos(ang), sa = Math.sin(ang);
    P.spawn(x, y, 0, 0, 0.12, 36 * u, 74 * u, 0.95, 0xffe2a8, T_SOFT, 1, 0, 0, 0, 0);
    for (let i = 0; i < 10; i++) {
      const a = ang + r.range(-0.35, 0.35), s = r.range(180, 520) * u;
      P.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, r.range(0.15, 0.4), r.range(4, 7) * u, 1 * u, 1, 0xffb54d, T_SPARK, 1, 350 * u, 1.5, 0, 0);
    }
    for (let i = 0; i < 7; i++) {
      const a = ang + r.range(-0.5, 0.5), s = r.range(40, 190) * u;
      P.spawn(x + ca * 6, y + sa * 6, Math.cos(a) * s, Math.sin(a) * s - 10 * u, r.range(1.0, 2.2), r.range(12, 18) * u,
        r.range(40, 66) * u, r.range(0.35, 0.55), 0xa3a9b4, T_SOFT, 0, -18 * u, 2.4, 0, F_FADEIN);
    }
  }
  _fxImpact(x, y, spF) {
    const P = this.particles, r = this.fx, u = this.L.u;
    P.spawn(x, y, 0, 0, 0.12, 24 * u, 70 * u * spF, 1, 0xfff0c0, T_SOFT, 1, 0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
      const a = -Math.PI / 2 + r.range(-1.4, 1.4), s = r.range(150, 480) * u * spF;
      P.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, r.range(0.2, 0.5), r.range(4, 7) * u, 1 * u, 1, 0xffc46b, T_SPARK, 1, 500 * u, 1.2, 0, 0);
    }
    const woods = [0x8a5a36, 0x6b4228, 0xa8743f];
    for (let i = 0; i < 10; i++) {
      P.spawn(x, y, r.range(-260, 260) * u, -r.range(120, 430) * u, r.range(0.9, 1.8), r.range(9, 15) * u, r.range(9, 15) * u, 1,
        woods[i % 3], T_SPLINTER, 0, 950 * u, 0.3, r.range(-14, 14), F_DROPLET);
    }
    for (let i = 0; i < 5; i++) {
      P.spawn(x + r.range(-8, 8), y + r.range(-8, 8), r.range(-30, 30) * u, -r.range(20, 60) * u, r.range(1.2, 2.4), 14 * u, 56 * u,
        0.5, 0x3d3d42, T_SOFT, 0, -14 * u, 1.2, 0, F_FADEIN);
    }
  }
  _fxSplash(x, y, speed) {
    const P = this.particles, r = this.fx, u = this.L.u, k = clamp(speed / (600 * u), 0.6, 1.4);
    const n = Math.round(clamp(speed / (35 * u), 10, 24));
    for (let i = 0; i < n; i++) {
      P.spawn(x + r.range(-6, 6) * u, y, r.range(-150, 150) * u, -r.range(170, 520) * u * k, r.range(0.5, 1.1),
        r.range(4, 8) * u, r.range(3, 5) * u, 0.9, 0xd6f5ff, T_DROP, 0, 1000 * u, 0.2, 0, F_DROPLET);
    }
    for (let i = 0; i < 3; i++) {
      P.spawn(x + r.range(-10, 10) * u, y - 4 * u, r.range(-20, 20) * u, -r.range(30, 70) * u, r.range(0.6, 1.0),
        20 * u, 54 * u, 0.4, 0xe8fbff, T_SOFT, 0, 0, 1.5, 0, F_FADEIN);
    }
    P.spawn(x, y + 2 * u, 0, 0, 0.9, 16 * u, 110 * u * k, 0.7, 0xbff0ff, T_RING, 0, 0, 0, 0, 0);
    for (let i = 0; i < 6; i++) this._fxBubble(x + r.range(-14, 14) * u, y + r.range(10, 40) * u);
  }
  _fxBubble(x, y) {
    const r = this.fx, u = this.L.u;
    this.particles.spawn(x, y, r.range(-25, 25) * u, -r.range(40, 110) * u, r.range(1.2, 2.4), r.range(5, 9) * u, r.range(6, 11) * u,
      0.7, 0xcff4ff, T_BUBBLE, 0, -40 * u, 0.8, 0, F_BUBBLE);
  }
  _fxPop(x, y, color) {
    const r = this.fx, u = this.L.u;
    this.particles.spawn(x, y, 0, 0, 0.18, 10 * u, 36 * u, 0.9, color, T_SOFT, 1, 0, 0, 0, 0);
    for (let i = 0; i < 6; i++) {
      const a = r.range(0, 6.283), s = r.range(60, 160) * u;
      this.particles.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, r.range(0.2, 0.4), 4 * u, 1 * u, 1, color, T_SPARK, 1, 200 * u, 2, 0, 0);
    }
  }
  _fxClink(x, y) {
    const r = this.fx, u = this.L.u;
    for (let i = 0; i < 8; i++) {
      const a = r.range(0, 6.283), s = r.range(120, 320) * u;
      this.particles.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, r.range(0.15, 0.35), 5 * u, 1 * u, 1, 0xfff6d8, T_SPARK, 1, 300 * u, 1, 0, 0);
    }
  }
  _fxDust(x, y) {
    const r = this.fx, u = this.L.u;
    for (let i = 0; i < 3; i++) {
      this.particles.spawn(x, y, r.range(-40, 40) * u, -r.range(10, 50) * u, r.range(0.5, 0.9), 8 * u, 22 * u, 0.35, 0x8c7a6a, T_SOFT, 0, 0, 2, 0, 0);
    }
  }
  _fxPoof(x, y) {
    const r = this.fx, u = this.L.u;
    for (let i = 0; i < 5; i++) {
      this.particles.spawn(x, y, r.range(-50, 50) * u, -r.range(20, 70) * u, r.range(0.6, 1.1), 10 * u, 34 * u, 0.5, 0x9aa0aa, T_SOFT, 0, 0, 2, 0, 0);
    }
  }
  _fxSand(x, y) {
    const r = this.fx, u = this.L.u;
    for (let i = 0; i < 4; i++) {
      this.particles.spawn(x + r.range(-6, 6) * u, y, r.range(-45, 45) * u, -r.range(8, 34) * u, r.range(0.7, 1.3), 7 * u, r.range(22, 34) * u,
        0.3, 0xb9ad92, T_SOFT, 0, 0, 2.2, 0, F_FADEIN);
    }
  }
  _shipSmoke(ship) {
    const holes = ship.holes;
    if (!holes.length) return;
    const r = this.fx, u = this.L.u, d = ship.damage;
    ship.smokeAcc += this.dt * (0.5 + d * 4.5);
    while (ship.smokeAcc > 0.3) {
      ship.smokeAcc -= 0.3;
      const h = this._recentHole(ship, r.int(0, 4));
      if (!h) break;
      const p = this._localToWorld(ship, h.x, h.y);
      this.particles.spawn(p.x, p.y, r.range(5, 28) * u, -r.range(25, 60) * u, r.range(2.2, 3.6), r.range(10, 16) * u, r.range(46, 74) * u,
        r.range(0.3, 0.5), lerpColor(0x55555c, 0x26262a, d), T_SOFT, 0, -8 * u, 0.4, 0, F_FADEIN);
    }
    if (d > 0.35) {
      ship.fireAcc += this.dt * (d - 0.35) * 40;
      while (ship.fireAcc > 1) {
        ship.fireAcc -= 1;
        const h = this._recentHole(ship, r.int(0, 1));
        if (!h) break;
        const p = this._localToWorld(ship, h.x + r.range(-4, 4) * u, h.y);
        this.particles.spawn(p.x, p.y, r.range(-15, 15) * u, -r.range(50, 110) * u, r.range(0.35, 0.7), r.range(12, 18) * u, 3 * u,
          0.9, r.next() < 0.5 ? 0xff7a26 : 0xffc04a, T_SOFT, 1, -20 * u, 0.5, 0, 0);
      }
    }
  }
  _activeHoles(ship) {
    let n = 0;
    for (const h of ship.holes) if (!h.patched) n++;
    return n;
  }
  _recentHole(ship, k) {
    for (let i = ship.holes.length - 1; i >= 0; i--) {
      const h = ship.holes[i];
      if (!h.patched && h.kind !== 'mast' && k-- <= 0) return h;
    }
    return null;
  }

  // ---------- Prüf- und Statusfunktionen ----------
  counts() {
    const c = { mag: 0, fly: 0, sink: 0, lane: 0 };
    for (const b of this.balls) c[b.state]++;
    return c;
  }
  checkInvariants() {
    const errors = [], per = this.ships.map(() => ({ mag: 0, fly: 0, sink: 0, lane: 0 }));
    for (const b of this.balls) {
      if (!(b.state in per[b.owner])) errors.push(`Kugel ${b.id}: unbekannter Zustand ${b.state}`);
      else per[b.owner][b.state]++;
    }
    let fly = 0;
    this.ships.forEach((s, i) => {
      const p = per[i], total = p.mag + p.fly + p.sink + p.lane;
      fly += p.fly;
      // Drei und vier Schiffe: jedes Schiff behält seine Kugeln; im Duell (Beuteprinzip) wechseln sie den Besitzer
      if (!this.beute && total !== s.totalBalls) errors.push(`Schiff ${i}: ${total} Kugeln statt ${s.totalBalls}`);
      if (p.mag !== s.magBalls.length || s.ammo !== s.magBalls.length) errors.push(`Schiff ${i}: Magazin inkonsistent`);
      if (p.lane !== s.lane.length) errors.push(`Schiff ${i}: Mulde inkonsistent`);
      if (!(s.damage >= 0 && s.damage <= TUNING.maxDamage + 1e-9)) errors.push(`Schiff ${i}: Schaden außerhalb des Bereichs`);
    });
    const all = per.reduce((a, p) => a + p.mag + p.fly + p.sink + p.lane, 0), expected = this.ships.reduce((a, sh) => a + sh.totalBalls, 0);
    if (all !== expected || this.balls.length !== expected) errors.push(`${all} Kugeln im Umlauf statt ${expected}`);
    for (const sh of this.ships) {
      for (const b of sh.magBalls) if (b.owner !== sh.i || b.state !== 'mag') errors.push(`Schiff ${sh.i}: Kugel ${b.id} gehört nicht ins Magazin`);
      for (const b of sh.lane) if (b.owner !== sh.i || b.state !== 'lane') errors.push(`Schiff ${sh.i}: Kugel ${b.id} gehört nicht in die Mulde`);
    }
    const bodies = Composite.allBodies(this.world).filter((b) => b.parent === b).length;
    if (bodies !== 2 * this.ships.length + fly) errors.push(`Physikwelt: ${bodies} Körper statt ${2 * this.ships.length + fly}`);
    for (const b of this.balls) {
      if (b.state === 'fly' && !(Number.isFinite(b.body.position.x) && Number.isFinite(b.body.position.y))) errors.push(`Kugel ${b.id}: NaN`);
    }
    return { ok: errors.length === 0, errors, bodies };
  }
  snapshot() {
    const c = this.counts();
    return {
      summary: this.ships.map((s) => `${s.team.name} ${Math.round((1 - s.damage) * 100)} % · Munition ${s.ammo}${this.beute ? '' : '/' + s.totalBalls}`).join('   '),
      t: this.t, step: this.step, ...this.stats,
      inFlight: c.fly, inRecycle: c.sink + c.lane, inMag: c.mag, ballsTotal: this.balls.length,
      ballsExpected: this.ships.reduce((a, s) => a + s.totalBalls, 0),
      particlesActive: this.particles.active, particleCap: this.particles.cap,
      ships: this.ships.map((s) => ({
        name: s.team.name, damage: s.damage, health: 1 - s.damage, ammo: s.ammo, shots: s.shots, hitsTaken: s.hitsTaken,
        holes: s.holes.filter((h) => !h.patched).length, patches: s.holes.filter((h) => h.patched).length, sink: s.sink,
      })),
    };
  }
  stateHash() {
    const f = (v) => v.toFixed(4);
    let s = `${this.step}|${JSON.stringify(this.stats)}|`;
    for (const sh of this.ships) s += `${f(sh.damage)},${f(sh.y)},${f(sh.angle)},${sh.ammo},${sh.holes.length};`;
    for (const b of this.balls) {
      s += b.state[0];
      if (b.state === 'fly') s += f(b.body.position.x) + ',' + f(b.body.position.y);
      else if (b.state === 'sink') s += f(b.x) + ',' + f(b.y);
      else if (b.state === 'lane') s += f(b.dist);
      s += ';';
    }
    s += `${this.rng.s}|${this.fx.s}`;
    return fnv1a(s).toString(16).padStart(8, '0');
  }
  destroy() {
    Events.off(this.engine);
    Composite.clear(this.world, false);
    Engine.clear(this.engine);
  }
}


// =====================================================================
//  Renderer (PixiJS) – liest nur den Simulationszustand
// =====================================================================
let ballTex = null;
function getBallTexture() {
  if (ballTex) return ballTex;
  return (ballTex = canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(24, 21, 2, 32, 32, 31);
    gr.addColorStop(0, '#c9d2df'); gr.addColorStop(0.18, '#7d8796'); gr.addColorStop(0.55, '#353b46'); gr.addColorStop(1, '#14171d');
    g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 30, 0, 6.283); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2; g.stroke();
  }));
}

class ShipView {
  constructor(ship, L) {
    this.ship = ship; this.L = L;
    const g = ship.geo, len = ship.len, f = ship.facing, team = ship.team, u = L.u;
    const root = (this.root = new PIXI.Container());
    // --- Takelage hinter dem Rumpf
    const rig = new PIXI.Graphics();
    const mains = g.masts[0], fore = g.masts[1];
    const ropes = [[g.bowsprit[1], [fore.x, g.deckY - fore.h]], [[fore.x, g.deckY - fore.h * 0.95], [mains.x, g.deckY - mains.h * 0.9]],
      [[mains.x, g.deckY - mains.h], [f * -0.5 * len, g.castle.y0]], [[fore.x, g.deckY - fore.h], [f * 0.5 * len, g.deckY]]];
    for (const [a, b] of ropes) rig.moveTo(a[0], a[1]).lineTo(b[0], b[1]);
    rig.stroke({ width: Math.max(1.5, 1.6 * u), color: 0x2a1c14, alpha: 0.85 });
    for (const m of g.masts) {
      rig.rect(m.x - m.w / 2, g.deckY - m.h, m.w, m.h).fill(0x6b4528).stroke({ width: 2, color: 0x24160d });
      rig.rect(m.x - m.w * 1.6, g.deckY - m.h * 0.84, m.w * 3.2, m.w * 0.9).fill(0x4a2f1b).stroke({ width: 1.5, color: 0x24160d });
    }
    rig.moveTo(g.bowsprit[0][0], g.bowsprit[0][1]).lineTo(g.bowsprit[1][0], g.bowsprit[1][1]).stroke({ width: Math.max(4, 0.016 * len), color: 0x5e3d24, cap: 'round' });
    root.addChild(rig);
    // Klüversegel
    const jib = new PIXI.Graphics();
    jib.poly(flat([g.bowsprit[1], [fore.x + f * fore.w, g.deckY - fore.h * 0.7], [fore.x + f * 0.14 * len, g.deckY - 0.12 * len]]))
      .fill({ color: team.sail, alpha: 0.92 }).stroke({ width: 2, color: 0x6e6252 });
    root.addChild(jib);
    // --- Segel (eigene Container zum leichten Blähen)
    this.sails = [];
    const sailDefs = [
      [mains, 0.22, 0.55, 0.44], [mains, 0.58, 0.8, 0.33], [fore, 0.2, 0.55, 0.36], [fore, 0.58, 0.82, 0.27],
    ];
    sailDefs.forEach(([m, a, b, w], idx) => {
      const c = new PIXI.Container(); c.position.set(m.x, g.deckY - m.h * b);
      const s = new PIXI.Graphics();
      const hw = (w * len) / 2, hgt = m.h * (b - a), bulge = f * hgt * 0.12;
      s.moveTo(-hw, 0).lineTo(hw, 0).lineTo(hw * 0.92, hgt * 0.96).quadraticCurveTo(bulge, hgt * 1.12, -hw * 0.92, hgt * 0.96).closePath()
        .fill({ color: team.sail, alpha: 0.96 }).stroke({ width: 2, color: 0x6e6252, alpha: 0.9 });
      s.rect(-hw * 0.95, hgt * 0.42, hw * 1.9, hgt * 0.13).fill({ color: team.color, alpha: 0.85 });
      if (idx === 0) s.circle(0, hgt * 0.48, Math.min(hw, hgt) * 0.27).fill(team.color).stroke({ width: 3, color: team.sail });
      s.moveTo(-hw * 1.08, 0).lineTo(hw * 1.08, 0).stroke({ width: Math.max(3, 0.012 * len), color: 0x4a2f1b, cap: 'round' });
      c.addChild(s); root.addChild(c);
      this.sails.push({ c, phase: idx * 1.7 + ship.i * 0.9 });
    });
    // Flagge
    this.flag = new PIXI.Graphics(); this.flagPos = [mains.x, g.deckY - mains.h]; root.addChild(this.flag);

    // --- Rumpf
    const hull = (this.hull = new PIXI.Graphics());
    const o = g.outline;
    hull.poly(flat(o)).fill(0x4b2d1c);
    const copper = clipY(o, g.dr * 0.28, true);
    if (copper.length > 2) hull.poly(flat(copper)).fill(0x2f5a52);
    for (let y = g.deckY + 0.04 * len; y < g.dr * 0.25; y += 0.034 * len) {
      const r = polyXRange(o, y); if (r) hull.moveTo(r[0] + 3, y).lineTo(r[1] - 3, y);
    }
    hull.stroke({ width: 1.5, color: 0x6b4630, alpha: 0.8 });
    const band = clipY(clipY(o, g.deckY + 0.05 * len, true), g.deckY + 0.085 * len, false);
    if (band.length > 2) hull.poly(flat(band)).fill(team.color);
    // Stückpforten
    for (let k = 0; k < 7; k++) {
      const x = f * lerp(-0.36 * len, 0.36 * len, k / 6), y = g.deckY + 0.11 * len, s = 0.03 * len;
      hull.rect(x - s / 2, y, s, s * 0.8).fill(0x1d120b).stroke({ width: 1.5, color: team.dark });
    }
    hull.poly(flat(o)).stroke({ width: 3, color: 0x1a0f09, join: 'round' });
    // Achterkastell
    const c = g.castle;
    hull.rect(c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0).fill(0x5a3823).stroke({ width: 2.5, color: 0x1a0f09 });
    hull.rect(c.x0 - 2, c.y0 - 5 * u, c.x1 - c.x0 + 4, 6 * u).fill(team.dark);
    const wy = c.y0 + (c.y1 - c.y0) * 0.35, ww = 0.03 * len;
    for (let k = 0; k < 3; k++) {
      const x = lerp(c.x0 + 0.04 * len, c.x1 - 0.04 * len, k / 2);
      hull.rect(x - ww / 2, wy, ww, ww * 1.2).fill(0xffcf7a).stroke({ width: 1.5, color: 0x2a1a10 });
    }
    // Reling
    const ry = g.deckY - 0.035 * len, rx0 = Math.min(f * 0.52 * len, f * -0.27 * len), rx1 = Math.max(f * 0.52 * len, f * -0.27 * len);
    hull.moveTo(rx0, ry).lineTo(rx1, ry);
    for (let x = rx0; x <= rx1; x += 0.06 * len) hull.moveTo(x, ry).lineTo(x, g.deckY);
    hull.stroke({ width: 2, color: 0x2a1a10 });
    root.addChild(hull);
    // Laternen-Glühen
    this.lantern = new PIXI.Sprite(getParticleTextures()[T_SOFT]); this.lantern.anchor.set(0.5); this.lantern.blendMode = 'add';
    this.lantern.tint = 0xffb64a; this.lantern.position.set(f * -0.5 * len, c.y0 - 4 * u); this.lantern.scale.set((60 * u) / 64);
    root.addChild(this.lantern);
    // Schäden
    this.dmg = new PIXI.Graphics(); root.addChild(this.dmg); this.dmgVer = -1;
    // Munitionsregal
    this.rack = new PIXI.Graphics(); root.addChild(this.rack); this.rackAmmo = -1;
    // Kanonen
    this.cannons = ship.cannons.map((cn) => {
      const cc = new PIXI.Container(); cc.position.set(cn.lx, cn.ly);
      const barrel = new PIXI.Graphics(), bl = cn.len, bw = 0.022 * len;
      barrel.poly([-0.03 * len, -bw, bl, -bw * 0.7, bl, bw * 0.7, -0.03 * len, bw]).fill(0x2b313b).stroke({ width: 2, color: 0x0e1116 });
      barrel.rect(bl - 0.014 * len, -bw * 0.95, 0.014 * len, bw * 1.9).fill(0x3c4452).stroke({ width: 1.5, color: 0x0e1116 });
      barrel.moveTo(-0.02 * len, -bw * 0.45).lineTo(bl - 0.02 * len, -bw * 0.32).stroke({ width: 2, color: 0x7a8597, alpha: 0.7 });
      barrel.circle(-0.03 * len, 0, bw * 0.75).fill(0x2b313b).stroke({ width: 1.5, color: 0x0e1116 });
      const carriage = new PIXI.Graphics(), cw = 0.05 * len;
      carriage.poly([-cw, 0.034 * len, cw, 0.034 * len, cw * 0.6, -0.004 * len, -cw * 0.6, -0.004 * len]).fill(0x4a2e1c).stroke({ width: 1.5, color: 0x1a0f09 });
      carriage.circle(-cw * 0.55, 0.03 * len, 0.014 * len).fill(0x24160d).stroke({ width: 1.5, color: 0x8a5a36 });
      carriage.circle(cw * 0.55, 0.03 * len, 0.014 * len).fill(0x24160d).stroke({ width: 1.5, color: 0x8a5a36 });
      cc.addChild(barrel); cc.addChild(carriage); root.addChild(cc);
      return { cc, barrel };
    });
    // Mündungsfeuer als Licht: warmer Schein auf Segeln und Rumpf, solange der Rückstoß abklingt
    this.flash = new PIXI.Sprite(getParticleTextures()[T_SOFT]); this.flash.anchor.set(0.5); this.flash.blendMode = 'add';
    this.flash.tint = 0xffb264; this.flash.visible = false; root.addChild(this.flash);
  }

  draw(t) {
    const s = this.ship, u = this.L.u;
    this.root.position.set(s.x, s.y); this.root.rotation = s.angle;
    this.hull.tint = lerpColor(0xffffff, 0x8f7c70, s.damage / TUNING.maxDamage);
    for (const sl of this.sails) sl.c.scale.set(1 + 0.025 * Math.sin(t * 1.3 + sl.phase), 1 + 0.02 * Math.sin(t * 1.1 + sl.phase * 1.3));
    this.lantern.alpha = 0.55 + 0.15 * Math.sin(t * 7.3 + s.i) + 0.1 * Math.sin(t * 13.1);
    // Flagge
    const fl = this.flag, [fx, fy] = this.flagPos, fw = 0.12 * s.len, fh = 0.06 * s.len, dir = -s.facing;
    fl.clear();
    const pts = [];
    for (let k = 0; k <= 6; k++) pts.push(fx + dir * fw * k / 6, fy + Math.sin(t * 6 - k * 0.9) * 3 * u * k / 6);
    for (let k = 6; k >= 0; k--) pts.push(fx + dir * fw * k / 6, fy + fh + Math.sin(t * 6 - k * 0.9) * 3 * u * k / 6);
    fl.poly(pts).fill(s.team.color).stroke({ width: 1.5, color: 0x1a0f09 });
    // Kanonen
    s.cannons.forEach((c, i) => {
      const v = this.cannons[i], rot = c.angle - s.angle, rec = c.recoil * c.recoil * 0.05 * s.len;
      v.barrel.rotation = rot; v.barrel.position.set(-Math.cos(rot) * rec, -Math.sin(rot) * rec);
    });
    let hot = null;                                           // die Kanone, die zuletzt gefeuert hat
    for (const c of s.cannons) if (c.recoil > 0 && (!hot || c.recoil > hot.recoil)) hot = c;
    this.flash.visible = !!hot;
    if (hot) {
      const rot = hot.angle - s.angle, k = hot.recoil * hot.recoil;
      this.flash.position.set(hot.lx + Math.cos(rot) * hot.len * 0.6, hot.ly + Math.sin(rot) * hot.len * 0.6 - 0.1 * s.len);
      this.flash.scale.set((s.len * (0.75 + 0.35 * k)) / 64);
      this.flash.alpha = 0.5 * k;
    }
    if (this.dmgVer !== s.dmgVer) { this.dmgVer = s.dmgVer; this._drawDamage(); }
    if (this.rackAmmo !== s.ammo) { this.rackAmmo = s.ammo; this._drawRack(); }
  }

  _drawDamage() {
    const g = this.dmg, s = this.ship;
    g.clear();
    for (const h of s.holes) {
      const rng = new RNG(h.seed);
      if (h.patched) {
        const w = h.r * 2.3, hh = h.r * 1.5, ca = Math.cos(h.rot * 0.15), sa = Math.sin(h.rot * 0.15);
        const pts = [[-w / 2, -hh / 2], [w / 2, -hh / 2], [w / 2, hh / 2], [-w / 2, hh / 2]]
          .flatMap(([x, y]) => [h.x + x * ca - y * sa, h.y + x * sa + y * ca]);
        g.poly(pts).fill(0x8a6340).stroke({ width: 1.5, color: 0x2a1a10 });
        g.circle(h.x - w * 0.38 * ca, h.y - w * 0.38 * sa, 1.6).circle(h.x + w * 0.38 * ca, h.y + w * 0.38 * sa, 1.6).fill(0x1a1a1a);
        continue;
      }
      const n = 9, pts = [], spl = [];
      for (let k = 0; k < n; k++) {
        const a = h.rot + (k / n) * 6.283, rr = h.r * (k % 2 ? rng.range(0.55, 0.8) : rng.range(0.9, 1.3));
        pts.push(h.x + Math.cos(a) * rr, h.y + Math.sin(a) * rr);
        if (k % 3 === 0) spl.push([h.x + Math.cos(a) * rr, h.y + Math.sin(a) * rr, h.x + Math.cos(a) * rr * 1.7, h.y + Math.sin(a) * rr * 1.7]);
      }
      if (h.kind !== 'mast') g.circle(h.x, h.y, h.r * 1.9).fill({ color: 0x140b06, alpha: 0.35 });
      g.poly(pts).fill(0x0f0805).stroke({ width: 2, color: 0x8a4a1c, alpha: 0.9 });
      for (const [x0, y0, x1, y1] of spl) g.moveTo(x0, y0).lineTo(x1, y1);
      g.stroke({ width: 2, color: 0xa8743f, alpha: 0.9 });
    }
  }

  _drawRack() {
    const g = this.rack, s = this.ship, r = this.L.ballR * 0.62, { x, y } = s.geo.rack;
    g.clear();
    const rows = [6, 5, 4, 3, 2, 1], w = 6 * 2 * r + 6;   // 21 Plätze; mehr liegt beim Beuteprinzip praktisch nie im Regal
    g.roundRect(x - w / 2, y - r * 0.9, w, r * 1.3, 3).fill(0x3a2416).stroke({ width: 1.5, color: 0x1a0f09 });
    let left = s.ammo;
    rows.forEach((cnt, ri) => {
      for (let k = 0; k < cnt && left > 0; k++, left--) {
        const bx = x - (cnt - 1) * r + k * 2 * r, by = y - r * 0.9 - r - ri * r * 1.72;
        g.circle(bx, by, r).fill(0x2b313b).stroke({ width: 1.2, color: 0x0e1116 });
        g.circle(bx - r * 0.3, by - r * 0.3, r * 0.3).fill({ color: 0xaab4c4, alpha: 0.8 });
      }
    });
  }
}

class NavalRenderer {
  constructor({ app, sim, view, renderScale = 1 }) {
    this.app = app; this.sim = sim; this.view = view; this.rs = renderScale; this.L = sim.L; this.frame = 0;
    const L = this.L, W = L.W, H = L.H, u = L.u, M = 90 * u;
    this.root = new PIXI.Container(); this.world = new PIXI.Container(); this.root.addChild(this.world);
    this.world.pivot.set(W / 2, H / 2); this.world.position.set(W / 2, H / 2);
    this.ownTex = [];
    const starRng = new RNG(hashSeed(sim.cfg.seed, 'stars'));
    // Mond: steht über der Lücke zwischen zwei Schiffen, damit seine Glitzerbahn auf dem Wasser frei zu sehen ist
    const gaps = sim.ships.slice(0, -1).map((s, i) => (s.x0 + sim.ships[i + 1].x0) / 2);
    const moon = (this.moon = {
      x: gaps.reduce((a, b) => (Math.abs(b - 0.6 * W) < Math.abs(a - 0.6 * W) ? b : a)), y: (L.portrait ? 0.235 : 0.27) * H, r: 46 * u,
    });
    // Himmel
    const sky = canvasTex(Math.ceil(W + 2 * M), Math.ceil(L.waterY + M), (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#04070f'); gr.addColorStop(0.45, '#0b1430'); gr.addColorStop(0.85, '#1b2550'); gr.addColorStop(1, '#3a2f5c');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) {
        const x = starRng.next() * w, y = starRng.next() * (h * 0.8), a = starRng.range(0.15, 0.9) * (1 - y / h);
        g.fillStyle = `rgba(220,230,255,${a.toFixed(3)})`; g.fillRect(x, y, starRng.next() < 0.1 ? 2.2 : 1.3, starRng.next() < 0.1 ? 2.2 : 1.3);
      }
      const mx = moon.x + M, my = moon.y + M, mr = moon.r;
      const glow = g.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 5);
      glow.addColorStop(0, 'rgba(200,220,255,.35)'); glow.addColorStop(1, 'rgba(200,220,255,0)');
      g.fillStyle = glow; g.fillRect(0, 0, w, h);
      const mg = g.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
      mg.addColorStop(0, '#fbf6e8'); mg.addColorStop(1, '#c9cbd8');
      g.fillStyle = mg; g.beginPath(); g.arc(mx, my, mr, 0, 6.283); g.fill();
      g.fillStyle = 'rgba(150,150,170,.35)';
      for (const [dx, dy, r] of [[-0.3, -0.1, 0.18], [0.25, 0.2, 0.14], [0.05, -0.35, 0.1]]) { g.beginPath(); g.arc(mx + dx * mr, my + dy * mr, r * mr, 0, 6.283); g.fill(); }
      const hz = g.createLinearGradient(0, h - 220 * u, 0, h);
      hz.addColorStop(0, 'rgba(255,120,90,0)'); hz.addColorStop(1, 'rgba(255,120,90,.18)');
      g.fillStyle = hz; g.fillRect(0, h - 220 * u, w, 220 * u);
    }, this.rs);
    this.ownTex.push(sky);
    const skyS = new PIXI.Sprite(sky); skyS.position.set(-M, -M); this.world.addChild(skyS);
    // Wolken
    const cloudTex = canvasTex(256, 110, (g) => {
      for (const [x, y, r] of [[70, 65, 42], [120, 50, 50], [175, 62, 40], [100, 75, 38], [150, 78, 34]]) {
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 256, 110);
      }
    }, this.rs);
    this.ownTex.push(cloudTex);
    this.clouds = [];
    for (let i = 0; i < 6; i++) {
      const s = new PIXI.Sprite(cloudTex); s.anchor.set(0.5); s.tint = 0x9fb0d8;
      s.alpha = starRng.range(0.1, 0.22); s.scale.set(starRng.range(1.4, 2.6) * u, starRng.range(0.9, 1.4) * u);
      this.clouds.push({ s, x0: starRng.next() * (W + 600 * u), y: starRng.range(0.12, 0.85) * (L.waterY - 250 * u) + 120 * u, v: starRng.range(5, 14) * u });
      this.world.addChild(s);
    }
    // Hintere Wellen (opakes Wasser hinter den Schiffen)
    this.gBack = new PIXI.Graphics(); this.world.addChild(this.gBack);
    // Mondlicht auf dem Wasser: heller Fleck und Glitzerbahn unter dem Mond (liegt hinter den Schiffen)
    this.moonPool = new PIXI.Sprite(getParticleTextures()[T_SOFT]); this.moonPool.anchor.set(0.5); this.moonPool.blendMode = 'add';
    this.moonPool.tint = 0xcfe0ff; this.moonPool.alpha = 0.2; this.moonPool.position.set(moon.x, L.waterY - 8 * u);
    this.moonPool.scale.set((330 * u) / 64, (64 * u) / 64); this.world.addChild(this.moonPool);
    this.gGlitter = new PIXI.Graphics(); this.gGlitter.blendMode = 'add'; this.world.addChild(this.gGlitter);
    const glRng = new RNG(hashSeed(sim.cfg.seed, 'mondlicht'));
    this.glints = [];
    for (let k = 0; k < 26; k++) this.glints.push({ dx: glRng.range(-1, 1), row: glRng.next(), len: glRng.range(8, 30) * u, sp: glRng.range(1.2, 3.4), ph: glRng.range(0, 6.283) });
    // Meeresgrund mit Mulden (statisch). Liegt über dem Wasserfilm, damit Sand, Sockel und Kugeln klar zu lesen sind.
    const ground = new PIXI.Graphics();
    const prof = (off) => { const p = []; for (let x = -M; x <= W + M; x += 16 * u) p.push(x, sim.groundY(x) + off); p.push(W + M, H + M, -M, H + M); return p; };
    ground.poly(prof(0)).fill(0x3f5d66);
    ground.poly(prof(13 * u)).fill(0x2b434c);
    ground.poly(prof(48 * u)).fill(0x1d3038);
    ground.poly(prof(120 * u)).fill(0x14232a);
    ground.poly(prof(230 * u)).fill(0x0e1a20);
    if (!sim.beute) {                      // Leitung im Sand: verbindet die Sockel, durch sie laufen die Kugeln zum eigenen Rohr
      const xa = sim.liftXs[0], xb = sim.liftXs[sim.liftXs.length - 1], pipe = (off) => {
        ground.moveTo(xa, sim.groundY(xa) + off);
        for (let x = xa + 16 * u; x < xb; x += 16 * u) ground.lineTo(x, sim.groundY(x) + off);
        ground.lineTo(xb, sim.groundY(xb) + off);
      };
      pipe(30 * u); ground.stroke({ width: 13 * u, color: 0x0b1419, alpha: 0.95, join: 'round' });
      pipe(30 * u); ground.stroke({ width: 9 * u, color: 0x6b5a2e, alpha: 0.9, join: 'round' });
      pipe(27.5 * u); ground.stroke({ width: 1.6 * u, color: 0xd9c27a, alpha: 0.55, join: 'round' });
    }
    const clear = (x) => sim.ships.every((sh) => Math.abs(x - sh.liftX) > 70 * u);
    for (let i = 0; i < 26; i++) {      // Steine, halb im Sand
      const x = starRng.next() * W, r = starRng.range(8, 26) * u, dy = starRng.range(2, 9) * u, dark = starRng.next() < 0.5;
      if (clear(x)) ground.ellipse(x, sim.groundY(x) + dy, r * 1.5, r * 0.62).fill(dark ? 0x223840 : 0x34505a);
    }
    for (let i = 0; i < 70; i++) {      // Kiesel in den tieferen Schichten
      const x = starRng.next() * W, y = sim.groundY(x) + starRng.range(24, 320) * u, r = starRng.range(2, 6) * u;
      ground.ellipse(x, y, r * 1.5, r).fill({ color: 0x4a6a73, alpha: 0.22 });
    }
    for (let i = 0; i < 16; i++) {      // Seegras
      const x = starRng.next() * W, hgt = starRng.range(34, 96) * u, y0 = sim.groundY(x) + 4 * u;
      const c1 = starRng.range(-22, 22) * u, c2 = starRng.range(-12, 12) * u, sw = starRng.range(3, 6) * u;
      if (clear(x)) ground.moveTo(x, y0).quadraticCurveTo(x + c1, y0 - hgt * 0.5, x + c2, y0 - hgt).stroke({ width: sw, color: 0x2c8a6c, alpha: 0.8, cap: 'round' });
    }
    const edge = prof(0);                 // Lichtkante des Sands
    ground.moveTo(edge[0], edge[1]);
    for (let i = 2; i < edge.length - 4; i += 2) ground.lineTo(edge[i], edge[i + 1]);
    ground.stroke({ width: 2.5 * u, color: 0x9fc4c9, alpha: 0.5 });
    this.gRec = new PIXI.Graphics(); this.recBalls = new PIXI.Container();
    // Schiffe
    this.shipLayer = new PIXI.Container(); this.world.addChild(this.shipLayer);
    this.shipViews = sim.ships.map((s) => { const v = new ShipView(s, L); this.shipLayer.addChild(v.root); return v; });
    // Wasser vorne (transparent) + Tiefenverlauf
    this.gFront = new PIXI.Graphics(); this.world.addChild(this.gFront);
    const depth = canvasTex(4, 256, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, 'rgba(2,10,20,0)'); gr.addColorStop(1, 'rgba(2,8,16,.72)');
      g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
    });
    this.ownTex.push(depth);
    const depthS = new PIXI.Sprite(depth); depthS.position.set(-M, L.waterY + 10 * u); depthS.width = W + 2 * M; depthS.height = L.floorY + 70 * u - L.waterY;
    this.world.addChild(depthS);
    // Mondlicht unter Wasser: weiche Lichtbahnen, die von der Glitzerbahn aus leicht auffächern
    const rayTex = canvasTex(64, 256, (g) => {
      const v = g.createLinearGradient(0, 0, 0, 256);
      v.addColorStop(0, 'rgba(255,255,255,.95)'); v.addColorStop(0.55, 'rgba(255,255,255,.35)'); v.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = v; g.fillRect(0, 0, 64, 256);
      const h = g.createLinearGradient(0, 0, 64, 0);          // seitlich weich ausblenden
      h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(0.5, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,1)');
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = h; g.fillRect(0, 0, 64, 256);
    });
    this.ownTex.push(rayTex);
    this.rays = [];
    for (let k = 0; k < 9; k++) {
      const s = new PIXI.Sprite(rayTex); s.anchor.set(0.5, 0); s.blendMode = 'add'; s.tint = 0xbfe4ff;
      const off = (k - 4) / 4 + glRng.range(-0.12, 0.12);                       // −1 … 1 um den Mond herum
      const ray = { s, off, a: glRng.range(0.13, 0.24) * (1 - 0.45 * Math.abs(off)), sp: glRng.range(0.15, 0.4), ph: glRng.range(0, 6.283) };
      s.width = glRng.range(50, 125) * u; s.height = (L.floorY - L.waterY) * 1.15;
      this.rays.push(ray); this.world.addChild(s);
    }
    this.world.addChild(ground);
    // Lift + Kugeln im Wasser: Rückwand -> Farbschimmer -> Kugeln -> Frontglas und Messing (die Kugel sitzt sichtbar IM Rohr)
    this.recGlow = new PIXI.Container(); this.gRecFront = new PIXI.Graphics();
    this.world.addChild(this.gRec); this.world.addChild(this.recGlow); this.world.addChild(this.recBalls); this.world.addChild(this.gRecFront);
    this.gFoam = new PIXI.Graphics(); this.world.addChild(this.gFoam);
    // Flugbahnen + fliegende Kugeln
    this.gTrails = new PIXI.Graphics(); this.world.addChild(this.gTrails);
    this.flyGlow = new PIXI.Container(); this.flyLayer = new PIXI.Container();
    this.world.addChild(this.flyGlow); this.world.addChild(this.flyLayer);
    this.ballViews = sim.balls.map((b) => {
      const team = sim.ships[b.owner].team, sc = (2 * b.r) / 60;
      const fly = new PIXI.Sprite(getBallTexture()); fly.anchor.set(0.5); fly.scale.set(sc); fly.visible = false;
      const glow = new PIXI.Sprite(getParticleTextures()[T_SOFT]); glow.anchor.set(0.5); glow.blendMode = 'add'; glow.tint = team.color;
      glow.scale.set((b.r * 5) / 64); glow.alpha = 0.55; glow.visible = false;
      const rec = new PIXI.Sprite(getBallTexture()); rec.anchor.set(0.5); rec.scale.set(sc); rec.visible = false;
      // Schimmer in Teamfarbe: zeigt unter Wasser, zu welchem Schiff die Kugel zurückläuft
      const tag = new PIXI.Sprite(getParticleTextures()[T_SOFT]); tag.anchor.set(0.5); tag.blendMode = 'add'; tag.tint = team.color;
      tag.scale.set((b.r * 3.6) / 64); tag.visible = false;
      this.flyLayer.addChild(fly); this.flyGlow.addChild(glow); this.recBalls.addChild(rec); this.recGlow.addChild(tag);
      return { fly, glow, rec, tag };
    });
    // Partikel (Kern-Komponente, zwei Schichten: normal + additiv)
    this.pview = new ParticleView(sim.particles);
    this.world.addChild(this.pview.normal); this.world.addChild(this.pview.add);
    // HUD
    this.hud = new PIXI.Container(); this.root.addChild(this.hud);
    this._buildHud();
  }

  _buildHud() {
    const L = this.L, u = L.u, W = L.W, sim = this.sim;
    const style = (size, weight = '800', fill = 0xffffff, ls = 0) => new PIXI.TextStyle({
      fontFamily: 'Segoe UI, Arial, sans-serif', fontSize: size, fontWeight: weight, fill, letterSpacing: ls,
      dropShadow: { color: 0x000000, alpha: 0.75, blur: 8 * u, distance: 0, angle: 0 },
    });
    const top = L.portrait ? 70 * u : 34 * u, corners = (this.cornerHud = L.wide && sim.ships.length === 2);
    this.hTitle = new PIXI.Text({ text: 'ENDLESS NAVAL BATTLE', style: style(L.portrait ? 50 * u : 40 * u, '900', 0xffffff, 5 * u) });
    this.hTitle.anchor.set(0.5, 0); this.hTitle.position.set(W / 2, top);
    this.hSub = new PIXI.Text({ text: '', style: style(26 * u, '600', 0xb9c6e4, 2 * u) });
    this.hSub.anchor.set(0.5, 0); this.hSub.position.set(W / 2, corners ? L.H - 50 * u : top + (L.portrait ? 64 : 50) * u);
    if (corners) this.hSub.alpha = 0.8;
    this.hud.addChild(this.hTitle, this.hSub);
    const n = sim.ships.length, pad = 60 * u, gapX = 30 * u;
    const bw = corners ? 430 * u : L.portrait ? (W - 2 * pad - (n - 1) * gapX) / n : Math.min(520 * u, (W - 2 * pad - (n - 1) * gapX) / n);
    const totalW = n * bw + (n - 1) * gapX, x0 = (W - totalW) / 2, by = corners ? 30 * u : top + (L.portrait ? 132 : 104) * u;
    this.hBars = sim.ships.map((s, i) => {
      const x = corners ? (i === 0 ? pad : W - pad - bw) : x0 + i * (bw + gapX);
      const label = new PIXI.Text({ text: s.team.name, style: style(24 * u, '900', s.team.color, 3 * u) });
      label.position.set(x, by);
      const pct = new PIXI.Text({ text: '', style: style(24 * u, '800') });
      pct.anchor.set(1, 0); pct.position.set(x + bw, by);
      const ammo = new PIXI.Text({ text: '', style: style(19 * u, '600', 0xb9c6e4) });
      ammo.position.set(x, by + 72 * u);
      const bar = new PIXI.Graphics();
      this.hud.addChild(bar, label, pct, ammo);
      return { s, x, y: by + 36 * u, w: bw, h: 26 * u, bar, pct, ammo };
    });
  }

  _drawWave(g, fn, t, fillColor, fillAlpha) {
    const L = this.L, M = 90 * L.u, step = 20 * L.u, pts = [];
    for (let x = -M; x <= L.W + M + step; x += step) pts.push(x, fn(x, t));
    pts.push(L.W + M + step, L.H + M, -M, L.H + M);
    g.poly(pts).fill({ color: fillColor, alpha: fillAlpha });
    return pts;
  }

  draw() {
    const sim = this.sim, L = this.L, t = sim.t, u = L.u, W = L.W, cfg = sim.cfg;
    this.frame++;
    // Kamera: dezentes Atmen + Erschütterung bei Treffern (deterministisch aus Simzeit)
    if (this.view.camera) {
      const sh = sim.shake;
      this.world.position.set(W / 2 + Math.sin(t * 61.3) * sh + Math.sin(t * 0.13) * 4 * u, L.H / 2 + Math.cos(t * 47.9) * sh * 0.7 + Math.sin(t * 0.11 + 1) * 3 * u);
      this.world.scale.set(1.02 + 0.008 * Math.sin(t * 0.05));
    } else { this.world.position.set(W / 2, L.H / 2); this.world.scale.set(1); }
    for (const c of this.clouds) {
      const span = W + 600 * u;
      c.s.position.set(((c.x0 + t * c.v) % span) - 300 * u, c.y);
    }
    // Wasser
    this.gBack.clear();
    this._drawWave(this.gBack, (x, tt) => sim.backY(x, tt), t, 0x0a2436, 1);
    this.gFront.clear();
    const pts = this._drawWave(this.gFront, (x, tt) => sim.surfaceY(x, tt), t, 0x0f5878, 0.5);
    const gf = this.gFoam; gf.clear();
    gf.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length - 4; i += 2) gf.lineTo(pts[i], pts[i + 1]);
    gf.stroke({ width: 10 * u, color: 0x7fe3ff, alpha: 0.08 });
    gf.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length - 4; i += 2) gf.lineTo(pts[i], pts[i + 1]);
    gf.stroke({ width: 3 * u, color: 0xbfefff, alpha: 0.75 });
    // Schaum am Rumpf: helle Kante entlang der Wasserlinie, kräftiger an Bug und Heck
    for (const s of sim.ships) {
      const wl = polyXRange(s.geo.outline, -s.sink);
      if (!wl) continue;
      const ca = Math.cos(s.angle), xa = s.x + wl[0] * ca - 5 * u, xb = s.x + wl[1] * ca + 5 * u, n = Math.max(6, Math.round((xb - xa) / (11 * u)));
      gf.moveTo(xa, sim.surfaceY(xa, t) + 1.5 * u);
      for (let k = 1; k <= n; k++) { const x = xa + ((xb - xa) * k) / n; gf.lineTo(x, sim.surfaceY(x, t) + 1.5 * u); }
      gf.stroke({ width: 5 * u, color: 0xffffff, alpha: 0.22, cap: 'round', join: 'round' });
      for (let k = 0; k <= n; k++) {
        const x = xa + ((xb - xa) * k) / n, e = Math.min(k, n - k) < 2 ? 1.7 : 1;      // Bug und Heck schäumen stärker
        const r = (1.8 + 1.5 * Math.sin(t * 1.9 + k * 2.4 + s.i)) * e * u;
        if (r > 0.6 * u) gf.circle(x + 3 * u * Math.sin(t * 0.8 + k * 1.3), sim.surfaceY(x, t) + 1.5 * u + Math.sin(t * 1.3 + k) * 1.5 * u, r).fill({ color: 0xffffff, alpha: 0.5 });
      }
    }
    // Mondlicht: Glitzerbahn auf dem Wasser (nach vorn breiter), Glanzpunkte auf der Wasserlinie, Lichtbahnen unter Wasser
    const gg = this.gGlitter, mo = this.moon; gg.clear();
    this.glints.forEach((q, k) => {
      const a = 0.5 + 0.5 * Math.sin(t * q.sp + q.ph);
      const x = mo.x + q.dx * (36 + 100 * q.row) * u, yb = sim.backY(x, t) + 2.5 * u, yf = sim.surfaceY(x, t) - 2.5 * u;
      if (yf - yb > 3 * u) {
        gg.moveTo(x - q.len / 2, lerp(yb, yf, q.row)).lineTo(x + q.len / 2, lerp(yb, yf, q.row))
          .stroke({ width: (1.6 + 1.8 * q.row) * u, color: 0xeaf2ff, alpha: 0.14 + 0.62 * a * a, cap: 'round' });
      }
      if (k < 9) {
        const xs = mo.x + q.dx * 150 * u, ys = sim.surfaceY(xs, t);
        gf.moveTo(xs - q.len * 0.4, ys).lineTo(xs + q.len * 0.4, ys).stroke({ width: 2.6 * u, color: 0xffffff, alpha: 0.2 + 0.55 * a * a, cap: 'round' });
      }
    });
    for (const r of this.rays) {
      const x = mo.x + r.off * 0.44 * W + Math.sin(t * r.sp + r.ph) * 16 * u;
      r.s.position.set(x, sim.surfaceY(x, t) + 2 * u);
      r.s.rotation = -(r.off * 0.34 + 0.05 * Math.sin(t * r.sp * 0.7 + r.ph));      // fächert vom Mond weg auf
      r.s.alpha = r.a * (0.7 + 0.3 * Math.sin(t * r.sp * 1.9 + r.ph * 1.7));
    }
    // Schiffe
    for (const v of this.shipViews) v.draw(t);
    // Recycling
    this._drawRecycling(t);
    // Kugeln
    const gt = this.gTrails; gt.clear();
    sim.balls.forEach((b, i) => {
      const v = this.ballViews[i];
      const team = sim.ships[b.owner].team;
      if (b.state === 'fly') {
        const p = b.body.position;
        v.fly.visible = v.glow.visible = true; v.rec.visible = v.tag.visible = false;
        v.fly.position.set(p.x, p.y); v.glow.position.set(p.x, p.y); v.glow.tint = team.color;
        this._drawTrail(gt, b, team.color);
      } else {
        v.fly.visible = v.glow.visible = false;
        if (b.state === 'mag') { v.rec.visible = v.tag.visible = false; return; }
        const pos = b.state === 'sink' ? b : sim.lanePos(b);
        const depth = pos.y - sim.surfaceY(pos.x, t);
        if (!cfg.recycleVisible) {
          v.rec.visible = b.state === 'sink' && depth < 90 * u;
          v.rec.alpha = clamp(1 - depth / (90 * u), 0, 1);
        } else { v.rec.visible = !pos.hidden; v.rec.alpha = 1; }
        v.rec.position.set(pos.x, pos.y);
        v.rec.tint = depth > b.r ? 0xa9d2e6 : 0xffffff;
        if (b.state === 'lane' && !pos.lift) v.rec.rotation = -(b.dir || 1) * (b.dist / b.r);   // rollt sichtbar
        const k = b.state === 'lane' && pos.lift ? clamp(pos.t * 2.6, 0, 1) : 0;
        v.tag.visible = v.rec.visible && depth > b.r; v.tag.position.set(pos.x, pos.y);
        v.tag.tint = lerpColor(0xbfe2f4, team.color, k);
        v.tag.alpha = (0.26 + 0.6 * k) * v.rec.alpha * clamp(depth / (60 * u), 0, 1);
        v.tag.scale.set((b.r * (3.2 + 1.4 * k)) / 64);
      }
    });
    this.pview.draw();
    // HUD
    this.hud.visible = this.view.hud;
    if (this.view.hud) this._drawHud();
  }

  _drawTrail(g, b, color) {
    const n = b.trailLen;
    if (n < 2) return;
    const tr = b.trail, start = (b.trailHead - n + TRAIL_N) % TRAIL_N, p = b.body.position;
    let px = tr[start * 2], py = tr[start * 2 + 1];
    for (let k = 1; k <= n; k++) {
      const idx = (start + k) % TRAIL_N, x = k === n ? p.x : tr[idx * 2], y = k === n ? p.y : tr[idx * 2 + 1], f = k / n;
      g.moveTo(px, py).lineTo(x, y).stroke({ width: b.r * 1.5 * f, color, alpha: 0.42 * f, cap: 'round' });
      px = x; py = y;
    }
  }

  /**
   * Lift je Schiff: Messingsockel in der Mulde, feststehendes Glasrohr, oben eine Glasmanschette, die am Kiel sitzt und
   * mit dem Seegang über das Rohr gleitet. Hinten (gRec) liegen Rohrkörper und Sockelinneres, vorne (gRecFront)
   * Glasreflexe, Messingringe und Sockelplatte – die Kugeln liegen dazwischen und sitzen so sichtbar im Rohr.
   */
  _drawRecycling(t) {
    const sim = this.sim, L = this.L, u = L.u, g = this.gRec, f = this.gRecFront, r = L.ballR;
    g.clear(); f.clear();
    if (!sim.cfg.recycleVisible) return;
    const BRASS = 0xc9a24a, BRASS_HI = 0xf6e2a0, BRASS_DK = 0x6b4f1e, GLASS = 0xc6ebff, SAND = 0x3f5d66;
    const ring = (gr, x, y, hw, h) => {            // Messingring quer über das Rohr
      gr.roundRect(x - hw, y - h / 2, 2 * hw, h, 2 * u).fill(BRASS).stroke({ width: 1.2 * u, color: BRASS_DK, alpha: 0.9 });
      gr.moveTo(x - hw + 2 * u, y - h / 2 + 1.8 * u).lineTo(x + hw - 2 * u, y - h / 2 + 1.8 * u).stroke({ width: 1.4 * u, color: BRASS_HI, alpha: 0.85 });
    };
    for (const s of sim.ships) {
      const c = s.team.color, x = s.liftX, w = r + 5 * u, yg = sim.groundY(x), y0 = s.footY, yh = s.headY;
      const px = s.portX, py = s.portY, ws = w + 5 * u, ys = py + s.maxSink + 44 * u;   // Unterkante der Manschette
      const bw = w + 23 * u, bt = y0 - r - 15 * u, R = r + 4 * u, Rm = r + 3.5 * u;   // Sockelplatte: halbe Breite, Oberkante, Schauglas, Einlauf
      const tb = bt - 9 * u;                                                               // Unterkante des Glasrohrs (über der Sockelschulter)
      let near = 0;                                                                        // Kugel am oder im Sockel -> Ring leuchtet
      for (const o of sim.ships) for (const b of o.lane) {
        const d = Math.min(o === s ? Math.abs(b.dist - o.liftLen) : Infinity, b.viaX === x ? Math.abs(b.dist - o.liftLen - b.under) : Infinity);
        if (d < 40 * u) near = Math.max(near, 1 - d / (40 * u));
      }
      // ---------- hinten
      g.rect(px - ws, py, 2 * ws, ys - py).fill({ color: 0x06131c, alpha: 0.42 });                    // Manschette
      g.rect(x - w, yh, 2 * w, bt - yh + 6 * u).fill({ color: 0x06131c, alpha: 0.6 });                 // Rohr
      g.rect(x - w + 2 * u, yh, 2 * w - 4 * u, bt - yh + 6 * u).fill({ color: 0x7fc8ee, alpha: 0.1 });
      g.roundRect(x - bw, bt, 2 * bw, yg - bt + 6 * u, 6 * u).fill({ color: 0x070d12, alpha: 1 });    // Sockelinneres
      // ---------- vorne: Sockel mit Schauglas; die Kugel rollt seitlich in den dunklen Einlauf und taucht im Schauglas wieder auf
      f.poly([x - bw + 12 * u, bt + 1 * u, x - w - 5 * u, tb, x + w + 5 * u, tb, x + bw - 12 * u, bt + 1 * u]).fill(0xb38d3c).stroke({ width: 1.4 * u, color: BRASS_DK });
      f.roundRect(x - bw, bt, 2 * bw, yg - bt + 8 * u, 7 * u).fill(BRASS).circle(x, y0, R).cut();
      f.roundRect(x - bw, bt, 2 * bw, yg - bt + 8 * u, 7 * u).stroke({ width: 1.6 * u, color: BRASS_DK, alpha: 1 });
      f.moveTo(x - bw + 6 * u, bt + 3 * u).lineTo(x + bw - 6 * u, bt + 3 * u).stroke({ width: 2 * u, color: BRASS_HI, alpha: 0.8 });
      f.moveTo(x - bw, y0 - Rm).arc(x - bw, y0, Rm, -Math.PI / 2, Math.PI / 2).closePath().fill(0x050b10).stroke({ width: 1.6 * u, color: BRASS_DK });
      f.moveTo(x + bw, y0 + Rm).arc(x + bw, y0, Rm, Math.PI / 2, Math.PI * 1.5).closePath().fill(0x050b10).stroke({ width: 1.6 * u, color: BRASS_DK });
      for (const sd of [-1, 1]) f.circle(x + sd * (R + 8 * u), bt + 9 * u, 1.8 * u).fill(BRASS_DK);    // Nieten
      f.circle(x, y0, R).fill({ color: 0x9fd8ff, alpha: 0.07 });
      f.circle(x, y0, R).stroke({ width: (2.6 + 1.8 * near) * u, color: c, alpha: 0.6 + 0.4 * near });
      f.circle(x, y0, R + 4.5 * u).stroke({ width: 5 * u, color: c, alpha: 0.08 + 0.32 * near });
      f.ellipse(x, yg + 7 * u, bw + 36 * u, 6 * u).fill(SAND);                                         // Sockel sitzt im Sand
      // ---------- vorne: Glasrohr
      const top = yh, bot = tb;
      f.moveTo(x - w, top).lineTo(x - w, bot).moveTo(x + w, top).lineTo(x + w, bot).stroke({ width: 2 * u, color: GLASS, alpha: 0.75 });
      f.moveTo(x - w * 0.52, top + 8 * u).lineTo(x - w * 0.52, bot - 8 * u).stroke({ width: 3.2 * u, color: 0xffffff, alpha: 0.2 });
      f.moveTo(x - w * 0.74, top + 14 * u).lineTo(x - w * 0.74, bot - 14 * u).stroke({ width: 1.2 * u, color: 0xffffff, alpha: 0.55 });
      f.moveTo(x + w * 0.62, top + 8 * u).lineTo(x + w * 0.62, bot - 8 * u).stroke({ width: 2 * u, color: 0x8fd0ff, alpha: 0.14 });
      ring(f, x, bot, w + 5 * u, 9 * u);                                                               // Flansch am Sockel
      ring(f, x, top, w + 1.5 * u, 5 * u);                                                             // Rohrkopf
      const n = Math.max(1, Math.round((bot - top) / (190 * u)));
      for (let q = 1; q < n; q++) ring(f, x, top + ((bot - top) * q) / n, w + 3 * u, 6 * u);
      // ---------- vorne: Manschette am Kiel (bewegt sich mit dem Schiff)
      f.moveTo(px - ws, py).lineTo(px - ws, ys).moveTo(px + ws, py).lineTo(px + ws, ys).stroke({ width: 2 * u, color: GLASS, alpha: 0.7 });
      f.moveTo(px - ws * 0.6, py + 8 * u).lineTo(px - ws * 0.6, ys - 8 * u).stroke({ width: 2.6 * u, color: 0xffffff, alpha: 0.2 });
      ring(f, px, ys, ws + 3 * u, 8 * u);
      ring(f, px, py + 1 * u, ws + 6 * u, 9 * u);                                                      // Flansch am Kiel
    }
  }

  _drawHud() {
    const sim = this.sim, u = this.L.u, st = sim.stats;
    if (this.cornerHud) this.hTitle.alpha = clamp(1 - (sim.step * DT - 5) / 1.5, 0, 1);
    for (const b of this.hBars) {
      const hp = 1 - b.s.damage, g = b.bar;
      g.clear();
      g.roundRect(b.x, b.y, b.w, b.h, b.h / 2).fill({ color: 0x000000, alpha: 0.45 }).stroke({ width: 2 * u, color: 0xffffff, alpha: 0.25 });
      g.roundRect(b.x + 3 * u, b.y + 3 * u, Math.max(0, (b.w - 6 * u) * hp), b.h - 6 * u, (b.h - 6 * u) / 2).fill(b.s.team.color);
    }
    if (this.frame % 6 === 1) {
      // Texte im Video englisch; Uhr = Videozeit (bei Zeitlupe läuft die Simulationszeit langsamer)
      this.hSub.text = `${fmtTime(sim.step * DT)}  ·  Shots ${fmtIntEn(st.shots)}  ·  Hits ${fmtIntEn(st.hits)}`;
      for (const b of this.hBars) {
        b.pct.text = `${Math.round((1 - b.s.damage) * 100)}%`;
        b.ammo.text = sim.beute ? `Ammo ${b.s.ammo}` : `Ammo ${b.s.ammo}/${b.s.totalBalls}`;
      }
    }
  }

  destroy() {
    this.root.destroy({ children: true });
    for (const t of this.ownTex) t.destroy(true);
  }
}


// =====================================================================
//  Registrierung
// =====================================================================
EBS.registerScenario({
  id: 'naval',
  title: 'Endless Naval Battle',
  defaults: { ships: 2, cannons: 4, fireRate: 1, projectileSpeed: 1, intensity: 0.35, ballsPerCannon: 5, recycleVisible: true },
  // Bedienelemente fürs Live-Bedienfeld (restart: true -> Änderung startet die Simulation neu)
  controls: [
    { key: 'ships', label: 'Anzahl der Schiffe', type: 'select', restart: true, options: [[2, '2 Schiffe'], [3, '3 Schiffe'], [4, '4 Schiffe']] },
    { key: 'cannons', label: 'Kanonen pro Schiff', type: 'range', restart: true, min: 1, max: 6, step: 1, format: (v) => String(v) },
    { key: 'fireRate', label: 'Feuergeschwindigkeit', type: 'range', min: 0.2, max: 3, step: 0.05, format: (v) => v.toFixed(2) + '×' },
    { key: 'projectileSpeed', label: 'Geschossgeschwindigkeit', type: 'range', min: 0.64, max: 1.6, step: 0.02, format: (v) => v.toFixed(2) + '×' },
    { key: 'intensity', label: 'Zerstörungsintensität', type: 'range', min: 0, max: 1, step: 0.01, format: (v) => Math.round(v * 100) + ' %' },
    { key: 'recycleVisible', label: 'Recycling sichtbar', type: 'check' },
  ],
  normalizeParams(p) {
    return {
      ships: clamp(Math.round(num(p.ships, 2)), 2, 4),
      cannons: clamp(Math.round(num(p.cannons, 4)), 1, 6),
      fireRate: clamp(num(p.fireRate, 1), 0.2, 3),
      projectileSpeed: clamp(num(p.projectileSpeed, 1), 0.64, 1.6),
      intensity: clamp(num(p.intensity, 0.35), 0, 1),
      ballsPerCannon: clamp(Math.round(num(p.ballsPerCannon, 5)), 2, 10),
      recycleVisible: bool(p.recycleVisible, true),
    };
  },
  create: (ctx) => new NavalBattle(ctx),
  createRenderer: (ctx) => new NavalRenderer(ctx),
  panelStats(sim) {
    const s = sim.snapshot();
    return [
      { key: 'active', label: 'Geschosse aktiv', value: s.inFlight },
      { key: 'recycle', label: 'Im Recycling', value: s.inRecycle },
      { key: 'shots', label: 'Abgefeuert', value: fmtInt(s.shots) },
      { key: 'hits', label: 'Treffer', value: fmtInt(s.hits) },
      { key: 'ratio', label: 'Trefferquote', value: s.shots ? Math.round((s.hits / s.shots) * 100) + ' %' : '–' },
      { key: 'recycled', label: 'Recycelt', value: fmtInt(s.recycled) },
    ];
  },
  panelNote: (sim) => sim.snapshot().summary,
  // Tonspur – bewusst wenige Klänge: Schuss (im Code erzeugt), Treffer (Holz), Platscher (im Code erzeugt, leise),
  // dazu leise der Kreislauf: „Tock“, wenn eine Kugel am Grund aufsetzt, und „Tink“, wenn sie im Regal ankommt.
  // minGap begrenzt die Dichte je Klang, damit bei knapp drei Schüssen pro Sekunde kein Ton-Chaos entsteht.
  // label = Name des Lautstärkereglers in der Oberfläche (video.volume.<Klang> in Prozent); gain = Verhältnis der Klänge
  // zueinander – die Gesamtlautheit misst der Exporter auf −14 LUFS ein (lib/audio.mjs)
  audio: {
    events: {
      shot: { label: 'Kanonenschuss', samples: ['synth:cannon'], gain: 0.34, detune: 1.5, minGap: 0.07 },
      hit: { label: 'Treffer', samples: ['impactWood_medium_000', 'impactWood_medium_001', 'impactWood_heavy_000'], gain: 0.40, detune: 1.5, minGap: 0.05 },
      splash: { label: 'Platscher', samples: ['synth:splash'], gain: 0.11, detune: 2, minGap: 0.22 },
      land: { label: 'Kugel am Grund', samples: ['impactGeneric_light_000', 'impactGeneric_light_001'], gain: 0.22, semis: -2, detune: 1.5, minGap: 0.12 },
      reload: { label: 'Nachladen', samples: ['impactMetal_light_003', 'impactMetal_light_002'], gain: 0.09, semis: 3, detune: 1.5, minGap: 0.09 },
    },
  },
});
})();
