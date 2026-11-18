/*
 * Cloud Wars – Wolken zeichnen (Paket C2). Sprites, Teamfarbe, Gesichter, Namensschilder, fliegende Puffs.
 * Übernommen aus dem Prototyp (puffLayout, blurCircles, PAL, buildSprite, ballSprite, eatPuffPos, drawFace) und für
 * den Simulator angepasst: kein Math.random, alles aus dem Seed der Wolke und der Simulationszeit (Seek-Regel).
 * Längen in Geländeeinheiten (GE), solange nichts anderes dasteht.
 * Sog (Nachtrag 18.11.): Kommt eine Wolke einem Gegner nahe, den sie nach den Regeln fressen darf, ziehen Dunstfäden in
 * ihrer Teamfarbe vom Opfer zu ihr, das Opfer wird zu ihr hin gedehnt. Der Fresser öffnet den Mund, das Opfer schaut
 * erschrocken. Alles nur aus Abständen, Massen und Zeit der Simulation berechnet (Seek-Regel), die Simulation bleibt gleich.
 */
(function () {
'use strict';
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Zustandsloser Hash → 0..1 für Aussehen (Blinzeln, Puff-Ziele). */
function h01(a, b, c) {
  let x = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1442695041)) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177); x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

// ---------- Puff-Anordnung und Sprites (Prototyp) ----------
const PUFF_MAX = 30;
const layoutCache = new Map();
function puffLayout(seed) {
  let out = layoutCache.get(seed);
  if (out) return out;
  const rng = mulberry32(seed); out = [];
  for (let i = 0; i < PUFF_MAX; i++) {
    const a = rng() * TAU, d = i === 0 ? 0 : Math.sqrt(rng()) * 0.66;
    out.push([Math.cos(a) * d * 1.18, Math.sin(a) * d * 0.8, (0.5 - d * 0.3) * (0.78 + rng() * 0.44)]);
  }
  if (layoutCache.size > 400) layoutCache.clear();
  layoutCache.set(seed, out);
  return out;
}
const puffCount = (m) => clamp(Math.round(7 + m * 0.5), 7, PUFF_MAX);
/** Leichte, feste Drehung je Wolke (aus ihrem Seed), damit nicht alle gleich liegen. */
const rotOf = (seed) => (h01(seed, 7, 11) - 0.5) * 0.7;

function circ(g, x, y, r) { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); }
// Weiche Flächen über den Schatten-Trick
function blurCircles(g, list, color, blurDev, sc) {
  const OFF = 30000;
  g.save(); g.shadowColor = color; g.shadowBlur = blurDev; g.shadowOffsetX = OFF; g.shadowOffsetY = 0;
  g.fillStyle = '#000'; g.beginPath();
  for (const c of list) circ(g, c[0] - OFF / sc, c[1], c[2]);
  g.fill(); g.restore();
}
// Farben: Grundkörper, Lichtseite der Ballen, Glanzlicht, dunkler Kern (0 weiß, 1 Gewitter, 2 aufgeladen)
const PAL = [
  ['#d5deea', 'rgba(255,255,255,0.95)', 'rgba(255,255,255,1)', null],
  ['#474e60', 'rgba(104,112,132,0.55)', 'rgba(150,160,184,0.35)', 'rgba(18,20,28,0.6)'],
  ['#aeb8c8', 'rgba(232,236,244,0.95)', 'rgba(250,251,255,0.95)', 'rgba(70,80,105,0.25)'],
];
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

/**
 * Baut das Sprite einer Wolke. Neu gegenüber dem Prototyp: Teamfarbe als Tönung der Schattenseite (30 %) und als
 * Saum unten rechts (rund 3 GE). sc = Pixel je GE.
 */
function buildSprite(puffs, n, R, rot, kind, sc, teamColor) {
  const c = Math.cos(rot), s = Math.sin(rot), list = [];
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i < n; i++) {
    const p = puffs[i], x = (p[0] * c - p[1] * s) * R, y = (p[0] * s + p[1] * c) * R, r = p[2] * R;
    list.push([x, y, r]);
    x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r);
  }
  list.sort((a, b) => a[1] - b[1]);
  const pad = R * 0.32 + 8;
  const w = Math.ceil((x1 - x0 + pad * 2) * sc), h = Math.ceil((y1 - y0 + pad * 2) * sc);
  const ox = pad - x0, oy = pad - y0, P = PAL[kind];
  const can = document.createElement('canvas'); can.width = w; can.height = h;
  const g = can.getContext('2d');
  g.setTransform(sc, 0, 0, sc, ox * sc, oy * sc);
  blurCircles(g, list, P[0], R * 0.09 * sc, sc);
  g.globalCompositeOperation = 'source-atop';
  if (P[3]) blurCircles(g, [[R * 0.08, R * 0.12, R * 0.55]], P[3], R * 0.35 * sc, sc);
  if (teamColor) blurCircles(g, list.map((q) => [q[0] + q[2] * 0.35, q[1] + q[2] * 0.45, q[2] * 0.75]), rgba(teamColor, 0.3), R * 0.1 * sc, sc);
  for (const [x, y, r] of list) blurCircles(g, [[x - r * 0.16, y - r * 0.2, r * 0.8]], P[1], r * 0.32 * sc, sc);
  blurCircles(g, list.map((q) => [q[0] - q[2] * 0.3, q[1] - q[2] * 0.36, q[2] * 0.36]), P[2], R * 0.07 * sc, sc);
  if (teamColor) {
    // Saum: dieselbe Form in Teamfarbe, leicht nach unten rechts versetzt, hinter die Wolke gelegt
    g.globalCompositeOperation = 'destination-over';
    blurCircles(g, list.map((q) => [q[0] + 2.2, q[1] + 2.8, q[2]]), rgba(teamColor, 0.95), 1.2 * sc, sc);
  }
  g.globalCompositeOperation = 'source-over';
  const sh = document.createElement('canvas'); sh.width = w; sh.height = h;
  const g2 = sh.getContext('2d'); g2.setTransform(sc, 0, 0, sc, ox * sc, oy * sc);
  blurCircles(g2, list, '#000', R * 0.16 * sc, sc);
  return { can, sh, ox, oy, sc, R };
}

function ballSprite(c0, c1, c2) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(25, 23, 2, 32, 32, 32);
  gr.addColorStop(0, c0); gr.addColorStop(0.62, c1); gr.addColorStop(1, c2);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return c;
}

// ---------- Darstellung aller Wolken ----------
const STYLE = {
  lift: 34,                 // logische Einheiten: Wolke schwebt so weit über ihrem Bodenpunkt
  shadow: [18, 28],         // GE: Schattenversatz am Boden (Licht von oben links)
  shadowAlpha: 0.22, neutralAlpha: 0.9,
  sizeStep: 1.08,           // Sprite-Neubau, wenn sich der Radius um mehr als eine Stufe ändert
  eatTime: 0.7, puffDur: [0.4, 0.6], puffMax: 10,
  label: 19,                // logische Einheiten Schriftgröße der Namensschilder
};

/**
 * Sog vor dem Biss. start: Abstand der Ränder, ab dem der Sog beginnt, in Radien des Fressers. Gefressen wird erst bei
 * Berührung (Simulation: Abstand < R_A + 0,25 R_B); bis dahin wächst die Stärke s von 0 auf 1.
 */
const PULL = {
  start: 0.9, wisps: 4, dots: 6, flow: 1.1,       // Fäden je Paar, Tropfen je Faden, Durchläufe je Sekunde
  stretch: 0.16, squeeze: 0.08, shift: 0.14,      // Opfer: Dehnung längs, Stauchung quer, Versatz zum Fresser (in R_B)
  tint: 0.45, line: 0.16, dot: 0.17,              // Fadenfarbe (Deckkraft), Fadenbreite und Tropfengröße in R_B
  face: 0.12, gulpNeutral: 0.6,                   // ab dieser Stärke zeigt das Gesicht Gefühl; Mund beim Einsammeln
};

class CloudArt {
  constructor({ radiusOf, teams }) {
    this.radiusOf = radiusOf; this.teams = teams;
    this.cache = new Map();
    this.ballW = ballSprite('rgba(255,255,255,1)', 'rgba(238,243,250,0.95)', 'rgba(214,224,238,0)');
  }
  destroy() { this.cache.clear(); }

  /** Sprite einer Wolke; hängt nur von Seed, Masse-Stufe, Art, Team und Schärfe ab (gleich nach Seek). */
  sprite(c, sc) {
    const R = this.radiusOf(c.mass), step = Math.round(Math.log(R) / Math.log(STYLE.sizeStep));
    const n = puffCount(c.mass), kind = c.kind || 0, team = c.team;
    const key = `${step}|${n}|${kind}|${team}|${sc}`;
    let e = this.cache.get(c.id);
    if (!e || e.key !== key) {
      const Rs = Math.pow(STYLE.sizeStep, step);
      e = { key, spr: buildSprite(puffLayout(c.puffSeed), n, Rs, rotOf(c.puffSeed), kind, sc, team >= 0 ? this.teams[team].color : null) };
      this.cache.set(c.id, e);
    }
    return e.spr;
  }

  /**
   * Sog-Paare und Gefühle der Gesichter für den aktuellen Zeitpunkt. Nur aus dem Zustand der Simulation abgeleitet; der
   * Zwischenspeicher gilt nur für denselben Zeitpunkt (Wolken und Namensschilder werden getrennt gezeichnet).
   */
  pulls(sim) {
    if (this._pull && this._pull.sim === sim && this._pull.t === sim.t && this._pull.n === sim.clouds.length) return this._pull;
    const pairs = [], mood = new Map(), t = sim.t, R = this.radiusOf;
    const feel = (c) => { let m = mood.get(c.id); if (!m) mood.set(c.id, (m = { mouth: 0, fear: 0, lx: 0, ly: 0, w: 0, tr: null })); return m; };
    const look = (m, from, to, s) => {
      if (s <= m.w) return;
      const d = Math.hypot(to.x - from.x, to.y - from.y) || 1;
      m.w = s; m.lx = (to.x - from.x) / d; m.ly = (to.y - from.y) / d;
    };
    for (const A of sim.clouds) {
      if (A.dead || A.eat || A.team < 0) continue;
      const RA = R(A.mass);
      for (const B of sim.clouds) {
        if (B === A || B.dead || B.team < 0 || B.team === A.team) continue;
        let s;
        if (B.eat) {
          if (B.eat.by !== A.id) continue;
          s = 1 - clamp((t - B.eat.t0) / STYLE.eatTime, 0, 1);   // beim Schlucken ausklingen
        } else {
          if (A.mass < B.mass * sim.ratio(B)) continue;
          const RB = R(B.mass), d = Math.hypot(A.x - B.x, A.y - B.y);
          s = smooth(RA + RB + PULL.start * RA, RA + 0.25 * RB, d);
        }
        if (s <= 0) continue;
        pairs.push({ A, B, s });
        const ma = feel(A), mb = feel(B);
        ma.mouth = Math.max(ma.mouth, s); look(ma, A, B, s);
        if (!B.eat) {
          mb.fear = Math.max(mb.fear, s); look(mb, B, A, s);
          if (!mb.tr || s > mb.tr.s) {
            const d = Math.hypot(A.x - B.x, A.y - B.y) || 1, RB = R(B.mass);
            mb.tr = { s, ang: Math.atan2(A.y - B.y, A.x - B.x), sx: 1 + PULL.stretch * s, sy: 1 - PULL.squeeze * s,
              ox: (A.x - B.x) / d * PULL.shift * s * RB, oy: (A.y - B.y) / d * PULL.shift * s * RB };
          }
        }
      }
    }
    // Mund auf beim Einsammeln kleiner neutraler Wolken (Schlucken dauert eatTime)
    for (const B of sim.clouds) {
      if (!B.eat || B.team >= 0 || B.dead) continue;
      const A = sim.clouds.find((c) => c.id === B.eat.by);
      if (!A || A.team < 0) continue;
      const u = clamp((t - B.eat.t0) / STYLE.eatTime, 0, 1), m = feel(A);
      m.mouth = Math.max(m.mouth, PULL.gulpNeutral * smooth(0, 0.18, u) * (1 - smooth(0.7, 1, u)));
    }
    this._pull = { sim, t: sim.t, n: sim.clouds.length, pairs, mood };
    return this._pull;
  }

  /** Dunstfäden vom Opfer zum Fresser: getönte Fäden, darauf weiße Tropfen, die zum Fresser hin fließen und kleiner werden. */
  drawPull(g, sim, lift) {
    const { pairs } = this.pulls(sim), t = sim.t;
    for (const { A, B, s } of pairs) {
      const RA = this.radiusOf(A.mass), RB = this.radiusOf(B.mass) * (B.eat ? 1 - 0.55 * (1 - s) : 1);
      const dx = A.x - B.x, dy = A.y - B.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
      const color = this.teams[A.team].color;
      for (let i = 0; i < PULL.wisps; i++) {
        const o = (i / (PULL.wisps - 1) - 0.5) * 1.25 * RB, swirl = (h01(B.id, i, 11) - 0.5) * 0.5 * RB;
        const x0 = B.x + ux * RB * 0.45 + nx * o, y0 = B.y + uy * RB * 0.45 + ny * o - lift;
        const x2 = A.x - ux * RA * 0.5 + nx * o * 0.18, y2 = A.y - uy * RA * 0.5 + ny * o * 0.18 - lift;
        const x1 = (x0 + x2) / 2 + nx * (o * 0.45 + swirl), y1 = (y0 + y2) / 2 + ny * (o * 0.45 + swirl);
        g.globalAlpha = PULL.tint * s; g.strokeStyle = color; g.lineWidth = PULL.line * RB * (0.6 + 0.4 * s); g.lineCap = 'round';
        g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x1, y1, x2, y2); g.stroke();
        for (let j = 0; j < PULL.dots; j++) {
          const q = (t * PULL.flow + j / PULL.dots + h01(B.id, i, 12)) % 1, p = 1 - q;
          const x = p * p * x0 + 2 * p * q * x1 + q * q * x2, y = p * p * y0 + 2 * p * q * y1 + q * q * y2;
          const r = PULL.dot * RB * (1 - 0.6 * q) * (0.6 + 0.4 * s);
          g.globalAlpha = 0.9 * s * Math.sin(Math.PI * q);
          g.drawImage(this.ballW, x - r, y - r, r * 2, r * 2);
        }
      }
    }
    g.globalAlpha = 1;
  }

  /** Federn nach dem Fressen: aus den Fress-Aufzeichnungen und der Zeit, ohne eigenen Zustand. */
  wobble(sim, c) {
    let w = 0;
    for (const e of sim.eats) {
      if (e.toId !== c.id) continue;
      const age = sim.t - e.t0 - 0.45;
      if (age > 0) w += Math.min(0.12, 0.5 * e.mass / c.mass + 0.02) * Math.exp(-age * 5) * Math.sin(age * 18);
    }
    return 1 + w;
  }

  /**
   * Zeichnet alle Wolken. g ist auf GE skaliert (k logische Einheiten je GE, Ursprung = Ausschnitt-Ecke).
   * px = Pixel je GE im Ausgabebild.
   */
  draw(g, sim, k, px, opts = {}) {
    const lift = STYLE.lift / k, t = sim.t, alive = new Set(), { mood } = this.pulls(sim);
    const list = sim.clouds.slice().sort((a, b) => (a.team >= 0) - (b.team >= 0) || a.mass - b.mass || a.id - b.id);
    const items = list.map((c) => {
      alive.add(c.id);
      const u = c.eat ? clamp((t - c.eat.t0) / STYLE.eatTime, 0, 1) : 0;
      const m = mood.get(c.id);
      return { c, spr: this.sprite(c, px), u, scl: (1 - 0.55 * u) * this.wobble(sim, c), m, tr: m && m.tr };
    });
    for (const id of this.cache.keys()) if (!alive.has(id)) this.cache.delete(id);
    // Schatten am Boden
    const sh = opts.shadow || { dx: STYLE.shadow[0], dy: STYLE.shadow[1], alpha: STYLE.shadowAlpha };
    for (const it of items) {
      g.globalAlpha = sh.alpha * (1 - it.u);
      this.blit(g, it.spr.sh, it.spr, it.c, it.c.x + sh.dx, it.c.y + sh.dy, it.scl, it.tr);
    }
    if (opts.beforeClouds) opts.beforeClouds();
    // Wolken
    for (const it of items) {
      g.globalAlpha = (it.c.team < 0 ? STYLE.neutralAlpha : 1) * (1 - smooth(0.4, 1, it.u));
      this.blit(g, it.spr.can, it.spr, it.c, it.c.x, it.c.y - lift, it.scl, it.tr);
    }
    g.globalAlpha = 1;
    this.drawEatPuffs(g, sim, lift);
    this.drawPull(g, sim, lift);
    if (opts.faces !== false) for (const it of items) if (it.c.team >= 0 && it.u < 0.3) this.drawFace(g, sim, it.c, lift, it.scl, it.m);
  }

  /** tr: Dehnung und Versatz durch den Sog (Richtung ang, Faktoren sx längs und sy quer). */
  blit(g, img, spr, c, x, y, scl, tr) {
    const f = (this.radiusOf(c.mass) / spr.R) * scl, w = (img.width / spr.sc) * f, h = (img.height / spr.sc) * f;
    if (!tr) { g.drawImage(img, x - spr.ox * f, y - spr.oy * f, w, h); return; }
    g.save(); g.translate(x + tr.ox, y + tr.oy); g.rotate(tr.ang); g.scale(tr.sx, tr.sy); g.rotate(-tr.ang);
    g.drawImage(img, -spr.ox * f, -spr.oy * f, w, h);
    g.restore();
  }

  /** Fliegende Puffs: Ort aus Fress-Aufzeichnung und Alter (Prototyp: eatPuffPos). */
  drawEatPuffs(g, sim, lift) {
    for (const e of sim.eats) {
      const to = sim.clouds.find((c) => c.id === e.toId);
      if (!to) continue;
      const puffs = puffLayout(e.puffSeed), R = this.radiusOf(e.mass), rot = rotOf(e.puffSeed);
      const co = Math.cos(rot), si = Math.sin(rot), n = Math.min(STYLE.puffMax, puffCount(e.mass)), RT = this.radiusOf(to.mass);
      for (let i = 0; i < n; i++) {
        const p = puffs[i], dur = lerp(STYLE.puffDur[0], STYLE.puffDur[1], h01(e.puffSeed, i, 1));
        const age = sim.t - e.t0 - i * 0.03;
        if (age < 0 || age >= dur) continue;
        const x0 = e.x + (p[0] * co - p[1] * si) * R, y0 = e.y + (p[0] * si + p[1] * co) * R;
        const ta = h01(e.puffSeed, i, 2) * TAU, td = h01(e.puffSeed, i, 3) * 0.5, bend = (h01(e.puffSeed, i, 4) - 0.5) * 0.9;
        const tx = to.x + Math.cos(ta) * td * RT, ty = to.y + Math.sin(ta) * td * RT;
        const q = ease(age / dur), dx = tx - x0, dy = ty - y0, arc = Math.sin(q * Math.PI) * bend;
        const x = lerp(x0, tx, q) - dy * arc * 0.35, y = lerp(y0, ty, q) + dx * arc * 0.35 - lift;
        const r = p[2] * R * (1 - 0.5 * q) * 1.3;
        g.globalAlpha = 1 - smooth(0.8, 1, q) * 0.7;
        g.drawImage(this.ballW, x - r, y - r, r * 2, r * 2);
      }
    }
    g.globalAlpha = 1;
  }

  /**
   * Augen wie im Prototyp; Blick in Fahrtrichtung, Blinzeln aus Zeit und Kennung. m (Sog): Fresser öffnet den Mund und
   * schaut zum Opfer, das Opfer reißt die Augen auf und schaut zum Fresser.
   */
  drawFace(g, sim, c, lift, scl, m) {
    const R = this.radiusOf(c.mass) * scl, mood = m && m.w > PULL.face ? m : null;
    const hx = mood ? mood.lx : c.hx, hy = mood ? mood.ly : c.hy, ox = m && m.tr ? m.tr.ox : 0, oy = m && m.tr ? m.tr.oy : 0;
    const fx = c.x + ox + hx * R * 0.16, fy = c.y + oy - lift + hy * R * 0.12 - R * 0.06;
    const ex = R * 0.17, er = R * 0.07;
    if (mood && mood.fear > PULL.face) { this.drawScared(g, fx, fy, ex, er, hx, hy, mood.fear); return; }
    g.fillStyle = 'rgba(255,140,155,0.26)';
    for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(fx + sd * ex * 1.6, fy + er * 1.6, er * 1.05, er * 0.6, 0, 0, TAU); g.fill(); }
    const phase = (sim.t / 3.7 + h01(c.id, 3, 5)) % 1, open = phase < 0.035 ? 0.12 : 1;
    g.fillStyle = '#2b3a4f';
    for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(fx + sd * ex, fy, er * 0.8, er * 1.15 * open, 0, 0, TAU); g.fill(); }
    if (open === 1) {
      g.fillStyle = '#fff';
      for (const sd of [-1, 1]) { g.beginPath(); circ(g, fx + sd * ex - er * 0.25, fy - er * 0.45, er * 0.3); g.fill(); }
    }
    if (c.kind) {
      // Gewitter und aufgeladen: grimmige Brauen wie im Prototyp
      g.strokeStyle = c.kind === 1 ? '#e8ecf4' : '#2b3a4f'; g.lineWidth = er * 0.42; g.lineCap = 'round';
      for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(fx + sd * ex * 1.45, fy - er * 1.9); g.lineTo(fx + sd * ex * 0.55, fy - er * 1.35); g.stroke(); }
    }
    const mouth = m ? m.mouth : 0;
    if (mouth > PULL.face) {
      // Offener Mund, wächst mit dem Sog; leicht in Blickrichtung
      const mo = smooth(PULL.face, 1, mouth), mx = fx + hx * er * 0.6, my = fy + er * 2.3 + hy * er * 0.3;
      const rx = er * (0.75 + 0.55 * mo), ry = er * (0.35 + 1.05 * mo);
      g.fillStyle = '#2b3a4f'; g.beginPath(); g.ellipse(mx, my, rx, ry, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,128,140,0.85)'; g.beginPath(); g.ellipse(mx, my + ry * 0.45, rx * 0.62, ry * 0.4, 0, 0, TAU); g.fill();
    }
  }

  /** Erschrocken: weiße, aufgerissene Augen mit kleinen Pupillen zum Fresser, besorgte Brauen, kleiner runder Mund. */
  drawScared(g, fx, fy, ex, er, hx, hy, fear) {
    const f = smooth(PULL.face, 0.6, fear), ew = er * (0.95 + 0.3 * f), eh = er * (1.15 + 0.35 * f);
    for (const sd of [-1, 1]) {
      const x = fx + sd * ex * 1.05;
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, fy, ew, eh, 0, 0, TAU); g.fill();
      g.lineWidth = er * 0.28; g.strokeStyle = '#2b3a4f'; g.stroke();
      g.fillStyle = '#2b3a4f'; g.beginPath(); circ(g, x + hx * ew * 0.42, fy + hy * eh * 0.42, er * 0.42); g.fill();
    }
    g.strokeStyle = '#2b3a4f'; g.lineWidth = er * 0.38; g.lineCap = 'round';
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(fx + sd * ex * 0.45, fy - eh - er * 0.9); g.lineTo(fx + sd * ex * 1.45, fy - eh - er * 0.45); g.stroke(); }
    g.fillStyle = '#2b3a4f'; g.beginPath(); g.ellipse(fx + hx * er * 0.4, fy + er * 2.3, er * 0.42 * (0.7 + 0.3 * f), er * 0.55 * (0.7 + 0.3 * f), 0, 0, TAU); g.fill();
  }

  /** Namensschilder in logischen Einheiten (feste Schriftgröße in beiden Formaten). */
  drawLabels(g, sim, k) {
    const lift = STYLE.lift, fs = STYLE.label;
    g.font = `800 ${fs}px "Segoe UI", Roboto, Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const { mood } = this.pulls(sim);
    for (const c of sim.clouds) {
      if (c.team < 0 || c.eat) continue;
      const tm = this.teams[c.team], R = this.radiusOf(c.mass) * k, tr = mood.get(c.id)?.tr;
      // Schild bleibt im Bild, auch wenn die Wolke am oberen Rand steht; folgt dem Versatz durch den Sog
      const x = (c.x + (tr ? tr.ox : 0)) * k, y = Math.max(fs * 1.1, (c.y + (tr ? tr.oy : 0)) * k - lift - R * 0.62 - fs * 0.9);
      const w = g.measureText(tm.name).width + fs * 1.1, h = fs * 1.45;
      g.fillStyle = 'rgba(255,255,255,0.92)'; g.strokeStyle = tm.color; g.lineWidth = 2.5;
      g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, h / 2); g.fill(); g.stroke();
      g.fillStyle = '#2b3a4f'; g.fillText(tm.name, x, y + 1);
    }
  }
}

EBS.CloudWarsArt = { CloudArt, STYLE, PULL, puffLayout, puffCount };
})();
