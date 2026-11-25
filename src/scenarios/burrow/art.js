/*
 * Endless Burrow – Zeichnungen (Paket P1)
 *
 * Grundstil „Warme Erde“ aus der Vorschau vom 25.11.2026: Erdboden mit Wurzeln und Kieseln, Würmer mit eigener Art
 * (Muster, Augen, Extras), Gartenfutter und Wurmreste. Alle Funktionen zeichnen nur auf die übergebene Zeichenfläche
 * und behalten keinen Zustand; Zufall nur aus festen Startwerten.
 */
(function () {
'use strict';
const B = (EBS.Burrow = EBS.Burrow || {});
const TAU = Math.PI * 2;
const INK = '#2a1608';
const FONT = '"Segoe UI", "Arial Black", Arial, sans-serif';

function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
const rgbCache = new Map();
function hexRgb(h) {
  let v = rgbCache.get(h);
  if (!v) { const n = parseInt(h.slice(1), 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; rgbCache.set(h, v); }
  return v;
}
const mixCache = new Map();
function mix(a, b, t) {
  const key = a + b + t;
  let v = mixCache.get(key);
  if (!v) {
    const A = hexRgb(a), C = hexRgb(b);
    v = '#' + A.map((x, i) => Math.round(x + (C[i] - x) * t).toString(16).padStart(2, '0')).join('');
    mixCache.set(key, v);
  }
  return v;
}
function rgba(h, al) { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${al})`; }
function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, TAU); c.fill(); }
function line(c, a, b) { c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
const V = {
  mul: (a, k) => ({ x: a.x * k, y: a.y * k }),
  lin: (p, a, ka, b, kb) => ({ x: p.x + a.x * ka + (b ? b.x * kb : 0), y: p.y + a.y * ka + (b ? b.y * kb : 0) }),
};
/** Hilfsfläche; cpu: im Hauptspeicher zeichnen (im Software-Modus des Browsers deutlich schneller). */
function canvas(w, h, scale, cpu = true) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * scale)); c.height = Math.max(1, Math.round(h * scale));
  const g = c.getContext('2d', { willReadFrequently: cpu }); g.scale(scale, scale);
  return c;
}

// ---------------------------------------------------------------- Arten
const SPECIES = {
  tiger: { c: '#ffb02e', pat: 'tiger', pc: '#6b2f0c', eyes: 'angry', extra: 'horns' },
  rosy: { c: '#f58aa8', pat: 'rings', saddle: '#ffc9d8', eyes: 'sleepy' },
  dotty: { c: '#45cfa5', pat: 'spots', pc: '#d4fff1', eyes: 'big', extra: 'antennae' },
  bristles: { c: '#a07cf0', pat: 'rings', legs: true, eyes: 'stalk', k: 0.88 },
  tank: { c: '#6f8fb8', pat: 'plates', eyes: 'visor', extra: 'jaws', k: 1.08 },
  fuzz: { c: '#ff8a5c', pat: 'fuzz', eyes: 'sleepy', extra: 'tuft' },
  cyclo: { c: '#9bd84a', pat: 'zigzag', pc: '#f0ffd2', eyes: 'cyclops' },
  mossy: { c: '#93a352', pat: 'moss', pc: '#5d6e2c', eyes: 'big', extra: 'sprout' },
};
/** Aussehen eines Wurms aus dem Eintrag der Namensliste (Simulation). */
function look(entry) {
  const sp = SPECIES[entry.sp];
  return { name: entry.name, spd: sp, c: entry.c || sp.c, pc: entry.pc || sp.pc, saddle: entry.saddle || sp.saddle, seed: hashStr(entry.name) };
}
const taper = (t) => (t < 0.6 ? 1 : 1 - Math.pow((t - 0.6) / 0.4, 1.4) * 0.62);

/**
 * Zeichenform eines Wurms für ein Bild. pt(d) liefert den Punkt im Abstand d hinter dem Kopf.
 * scaleK: Anwachsen nach dem Schlüpfen (0..1).
 */
function pose(lk, pt, r, len, a) {
  const R = r * (lk.spd.k || 1);
  const head = pt(0), dir = { x: Math.cos(a), y: Math.sin(a) };
  const w = { ...lk, pt, R, len, head, dir, perp: { x: -dir.y, y: dir.x }, hr: R * 1.34, S: [] };
  const sp2 = Math.max(2, R * 0.25);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let d = len; d > 0; d -= sp2) {
    const p = pt(d), rr = R * taper(d / len);
    w.S.push({ x: p.x, y: p.y, r: rr, d });
    if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
  }
  w.S.push({ x: head.x, y: head.y, r: R, d: 0 });
  x0 = Math.min(x0, head.x); x1 = Math.max(x1, head.x); y0 = Math.min(y0, head.y); y1 = Math.max(y1, head.y);
  const pad = R * 3.2 + 12;   // Platz für Beine, Fühler, Krone und Schatten
  w.box = { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
  return w;
}
function frame(w, d) {
  const p = w.pt(d), q = w.pt(d + 3);
  const l = Math.hypot(p.x - q.x, p.y - q.y) || 1;
  const dir = { x: (p.x - q.x) / l, y: (p.y - q.y) / l };
  return { p, dir, n: { x: -dir.y, y: dir.x }, r: w.R * taper(d / w.len) };
}
function along(w, start, step, end, fn) { let i = 0; for (let d = start; d < end; d += step) fn(frame(w, d), d, i++); }

// ---------------------------------------------------------------- Boden
function walk(rnd, x, y, a, n, step, wob) {
  const out = [{ x, y }];
  let t = 0;
  for (let i = 0; i < n; i++) { t = t * 0.9 + (rnd() - 0.5) * wob; a += t; x += Math.cos(a) * step; y += Math.sin(a) * step; out.push({ x, y }); }
  return out;
}
/** Erdboden mit Flecken, Körnung, Wurzeln, Kieseln. Einmal je Renderer gezeichnet. */
function paintSoil(g, W, H, seed, scale) {
  const rnd = mulberry(seed), area = (W * H) / (1920 * 1080);
  const grad = g.createLinearGradient(0, 0, W, H); grad.addColorStop(0, '#76492a'); grad.addColorStop(1, '#58341d');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  const lay = canvas(W, H, scale), l = lay.getContext('2d');
  for (let i = 0; i < Math.round(700 * area); i++) {
    l.fillStyle = rnd() < 0.5 ? rgba('#8c5e39', 0.1 + rnd() * 0.12) : rgba('#3c2312', 0.1 + rnd() * 0.15);
    circle(l, rnd() * W, rnd() * H, 18 + rnd() * 80);
  }
  g.save(); g.filter = `blur(${16 * scale}px)`; g.drawImage(lay, 0, 0, W, H); g.restore();
  for (let i = 0; i < Math.round(5000 * area); i++) {
    g.fillStyle = rnd() < 0.55 ? rgba('#a97b50', 0.35) : rgba('#2c180b', 0.35);
    circle(g, rnd() * W, rnd() * H, 0.6 + rnd() * 1.6);
  }
  const roots = [];
  for (let i = 0; i < 6; i++) {
    const side = Math.floor(rnd() * 4);
    let x, y, a;
    if (side === 0) { x = rnd() * W; y = -10; a = Math.PI / 2 + (rnd() - 0.5) * 1.2; }
    else if (side === 1) { x = W + 10; y = rnd() * H; a = Math.PI + (rnd() - 0.5) * 1.2; }
    else if (side === 2) { x = rnd() * W; y = H + 10; a = -Math.PI / 2 + (rnd() - 0.5) * 1.2; }
    else { x = -10; y = rnd() * H; a = (rnd() - 0.5) * 1.2; }
    const n = 50 + Math.floor(rnd() * 90), w0 = 5 + rnd() * 6;
    const pts = walk(rnd, x, y, a, n, 5, 0.12);
    roots.push({ pts, w0 });
    for (let b = 0; b < 3; b++) {
      const k = Math.max(1, Math.floor(n * (0.2 + rnd() * 0.6))), p = pts[k];
      const ba = Math.atan2(pts[k].y - pts[k - 1].y, pts[k].x - pts[k - 1].x) + (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.6);
      roots.push({ pts: walk(rnd, p.x, p.y, ba, 15 + Math.floor(rnd() * 30), 4, 0.2), w0: w0 * (1 - k / n) * 0.7 + 1 });
    }
  }
  g.globalAlpha = 0.85; g.lineCap = 'round';
  for (const pass of [0, 1]) for (const r of roots) {
    const n = r.pts.length - 1;
    for (let i = 0; i < n; i++) {
      const lw = r.w0 * (1 - i / n) + 1;
      g.strokeStyle = pass === 0 ? '#3a2212' : '#b68858'; g.lineWidth = pass === 0 ? lw + 3 : lw;
      line(g, r.pts[i], r.pts[i + 1]);
    }
  }
  g.globalAlpha = 1;
  const cols = ['#9c8b78', '#b5a48f', '#857565', '#a8957c'];
  for (let i = 0; i < Math.round(46 * area); i++) {
    const x = rnd() * W, y = rnd() * H, rx = 6 + Math.pow(rnd(), 2.4) * 24, ry = rx * (0.6 + rnd() * 0.3), rot = rnd() * Math.PI;
    const c = cols[Math.floor(rnd() * cols.length)];
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = 'rgba(20,10,4,0.45)'; g.filter = `blur(${3 * scale}px)`;
    g.beginPath(); g.ellipse(3, 4, rx, ry, 0, 0, TAU); g.fill(); g.filter = 'none';
    g.fillStyle = c; g.strokeStyle = 'rgba(40,22,10,0.5)'; g.lineWidth = 1.5;
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,245,225,0.45)';
    g.beginPath(); g.ellipse(-rx * 0.3, -ry * 0.3, rx * 0.4, ry * 0.3, 0, 0, TAU); g.fill();
    g.restore();
  }
}
function paintVignette(g, W, H, strength) {
  const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.56);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${strength})`);
  g.fillStyle = v; g.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------- Würmer
function drawPattern(l, w) {
  const sp = w.spd, c = w.c, rnd = mulberry(w.seed);
  l.lineCap = 'round';
  if (sp.pat === 'rings' || sp.pat === 'fuzz') {
    l.strokeStyle = sp.pat === 'fuzz' ? mix(c, '#ffffff', 0.4) : mix(c, '#2a0f05', 0.5);
    along(w, w.R * 0.9, w.R * (sp.pat === 'fuzz' ? 0.9 : 0.46), w.len * 0.97, (f) => {
      l.lineWidth = sp.pat === 'fuzz' ? f.r * 0.28 : Math.max(1.2, f.r * 0.11);
      l.beginPath();
      l.moveTo(f.p.x + f.n.x * f.r * 1.1, f.p.y + f.n.y * f.r * 1.1);
      l.quadraticCurveTo(f.p.x + f.dir.x * f.r * 0.35, f.p.y + f.dir.y * f.r * 0.35, f.p.x - f.n.x * f.r * 1.1, f.p.y - f.n.y * f.r * 1.1);
      l.stroke();
    });
  } else if (sp.pat === 'tiger') {
    l.fillStyle = w.pc;
    along(w, w.R * 1.0, w.R * 0.95, w.len * 0.93, (f, d, i) => {
      const L = i % 2 ? 0.6 : 0.85;
      for (const s of [-1, 1]) {
        const e = V.lin(f.p, f.n, s * f.r * 1.15), wv = f.r * 0.3;
        const tip = V.lin(f.p, f.n, s * f.r * (1.15 - L * 1.05), f.dir, f.r * 0.28);
        l.beginPath(); l.moveTo(e.x + f.dir.x * wv, e.y + f.dir.y * wv); l.lineTo(e.x - f.dir.x * wv, e.y - f.dir.y * wv);
        l.lineTo(tip.x, tip.y); l.closePath(); l.fill();
      }
    });
  } else if (sp.pat === 'spots') {
    l.fillStyle = w.pc;
    along(w, w.R * 0.9, w.R * 0.7, w.len * 0.92, (f, d, i) => {
      const side = i % 2 ? 1 : -1, off = side * (0.12 + 0.36 * rnd()) * f.r, rr = f.r * (0.17 + 0.15 * rnd());
      circle(l, f.p.x + f.n.x * off + f.dir.x * (rnd() - 0.5) * f.r * 0.3, f.p.y + f.n.y * off + f.dir.y * (rnd() - 0.5) * f.r * 0.3, rr);
    });
  } else if (sp.pat === 'plates') {
    along(w, w.R * 0.7, w.R * 0.6, w.len * 0.96, (f) => {
      const a = V.lin(f.p, f.n, f.r * 1.15), b = V.lin(f.p, f.n, -f.r * 1.15), q = V.lin(f.p, f.dir, f.r * 0.6);
      l.strokeStyle = mix(c, '#0d1420', 0.55); l.lineWidth = Math.max(1.5, f.r * 0.15);
      l.beginPath(); l.moveTo(a.x, a.y); l.quadraticCurveTo(q.x, q.y, b.x, b.y); l.stroke();
      const o = V.mul(f.dir, -f.r * 0.15);
      l.strokeStyle = mix(c, '#ffffff', 0.45); l.lineWidth = Math.max(1, f.r * 0.07);
      l.beginPath(); l.moveTo(a.x + o.x, a.y + o.y); l.quadraticCurveTo(q.x + o.x, q.y + o.y, b.x + o.x, b.y + o.y); l.stroke();
    });
  } else if (sp.pat === 'zigzag') {
    l.strokeStyle = w.pc; l.lineJoin = 'round'; l.lineWidth = w.R * 0.26;
    l.beginPath();
    along(w, w.R * 0.6, w.R * 0.55, w.len * 0.9, (f, d, i) => {
      const s = i % 2 ? 1 : -1, p = V.lin(f.p, f.n, s * f.r * 0.42);
      if (i === 0) l.moveTo(p.x, p.y); else l.lineTo(p.x, p.y);
    });
    l.stroke();
  } else if (sp.pat === 'moss') {
    along(w, w.R * 0.8, w.R * 0.8, w.len * 0.92, (f) => {
      const off = (rnd() - 0.5) * f.r * 1.1, cx = f.p.x + f.n.x * off, cy = f.p.y + f.n.y * off;
      l.fillStyle = w.pc;
      for (let k = 0; k < 3; k++) circle(l, cx + (rnd() - 0.5) * f.r * 0.45, cy + (rnd() - 0.5) * f.r * 0.45, f.r * (0.13 + 0.1 * rnd()));
      l.fillStyle = '#cfe68a'; circle(l, cx - f.r * 0.06, cy - f.r * 0.06, f.r * 0.07);
    });
  }
}
const PAT_ALPHA = { rings: 0.42, fuzz: 0.35, tiger: 0.92, spots: 0.9, plates: 0.85, zigzag: 0.9, moss: 0.9 };

function drawUnder(g, w) {
  const sp = w.spd, c = w.c, rnd = mulberry(w.seed + 17), dark = mix(c, '#1a0d05', 0.62);
  g.lineCap = 'round';
  if (sp.legs) {
    along(w, w.R * 1.2, w.R * 0.75, w.len * 0.88, (f) => {
      for (const s of [-1, 1]) {
        const base = V.lin(f.p, f.n, s * f.r * 0.7);
        const knee = V.lin(base, f.n, s * f.r * 0.75, f.dir, -f.r * 0.15);
        const tip = V.lin(knee, f.n, s * f.r * 0.25, f.dir, -f.r * 0.5);
        for (const pass of [0, 1]) {
          g.strokeStyle = pass ? mix(c, '#1a0d05', 0.25) : dark;
          g.lineWidth = Math.max(1.8, f.r * 0.2) + (pass ? 0 : 2.4);
          g.beginPath(); g.moveTo(base.x, base.y); g.lineTo(knee.x, knee.y); g.lineTo(tip.x, tip.y); g.stroke();
        }
      }
    });
  }
  if (sp.pat === 'fuzz') {
    g.strokeStyle = mix(c, '#1a0d05', 0.4); g.lineWidth = 1.8;
    g.beginPath();
    along(w, 1, 2.5, w.len, (f) => {
      for (const s of [-1, 1]) {
        const a = Math.atan2(f.n.y * s, f.n.x * s) + (rnd() - 0.5) * 1.0;
        const u = { x: Math.cos(a), y: Math.sin(a) }, p0 = V.lin(f.p, u, f.r * 0.8), p1 = V.lin(f.p, u, f.r * (1.28 + rnd() * 0.25));
        g.moveTo(p0.x, p0.y); g.lineTo(p1.x, p1.y);
      }
    });
    for (let k = 0; k < 40; k++) {
      const a = Math.atan2(-w.dir.y, -w.dir.x) + (rnd() - 0.5) * 3.6, u = { x: Math.cos(a), y: Math.sin(a) };
      const p0 = V.lin(w.head, u, w.hr * 0.8), p1 = V.lin(w.head, u, w.hr * (1.22 + rnd() * 0.2));
      g.moveTo(p0.x, p0.y); g.lineTo(p1.x, p1.y);
    }
    g.stroke();
  }
}

/** Viele Kreise als ein Pfad (eine Füllung statt vieler). */
function circles(g, list, grow, ox = 0, oy = 0, k = 1) {
  g.beginPath();
  for (const q of list) { const r = Math.max(0.1, q.r * k + grow); g.moveTo(q.x + ox * q.r + r, q.y + oy * q.r); g.arc(q.x + ox * q.r, q.y + oy * q.r, r, 0, TAU); }
}
/**
 * Wurm zeichnen: Umriss, Körper, dann Muster, Schatten und Glanz innerhalb der Körperform (Clip).
 * w.S enthält den Kopf als letzten Eintrag mit Radius R; der Kopf selbst ist größer (hr).
 */
function drawWorm(g, w, opts = {}) {
  const sp = w.spd, c = w.c, h = w.head, hr = w.hr;
  const all = w.S.slice(0, -1).concat([{ x: h.x, y: h.y, r: hr, d: 0 }]);
  drawUnder(g, w);
  g.fillStyle = mix(c, '#1a0d05', 0.62);
  circles(g, all, sp.pat === 'fuzz' ? 1.6 : 2.6); g.fill();
  g.save();
  circles(g, all, 0); g.fillStyle = c; g.fill(); g.clip();
  if (w.saddle) {
    g.fillStyle = w.saddle;
    circles(g, w.S.filter((q) => q.d > w.len * 0.2 && q.d < w.len * 0.3), 0, 0, 0, 1.02); g.fill();
  }
  if (PAT_ALPHA[sp.pat]) { g.globalAlpha = PAT_ALPHA[sp.pat]; drawPattern(g, w); }
  g.globalAlpha = 0.32; g.fillStyle = mix(c, '#1a0805', 0.5);
  circles(g, all, 0, 0.3, 0.36, 0.8); g.fill();
  g.globalAlpha = 0.55; g.fillStyle = mix(c, '#ffffff', 0.6);
  circles(g, all, 0, -0.28, -0.32, 0.38); g.fill();
  g.restore();

  if (sp.extra === 'jaws') drawExtra(g, w, 'jaws');
  if (opts.biting) drawMouth(g, w);
  drawEyes(g, w, opts.biting, opts.blink);
  if (sp.extra && sp.extra !== 'jaws') drawExtra(g, w, sp.extra);
  if (opts.crown) drawCrown(g, w);
}
/** Schatten aller Würmer als dunkle Kreise; der Renderer weichzeichnet sie in kleiner Auflösung. */
function drawShadow(g, w, ox, oy) {
  g.beginPath();
  for (const q of w.S) { g.moveTo(q.x + ox + q.r + 2, q.y + oy); g.arc(q.x + ox, q.y + oy, q.r + 2, 0, TAU); }
  g.moveTo(w.head.x + ox + w.hr + 2, w.head.y + oy); g.arc(w.head.x + ox, w.head.y + oy, w.hr + 2, 0, TAU);
  g.fill();
}

function eyeBall(g, x, y, er, w, look = 0.4, pupil = 0.52) {
  g.fillStyle = '#ffffff'; g.strokeStyle = mix(w.c, '#1a0d05', 0.72); g.lineWidth = 2;
  g.beginPath(); g.arc(x, y, er, 0, TAU); g.fill(); g.stroke();
  const pr = er * pupil, px = x + w.dir.x * er * look, py = y + w.dir.y * er * look;
  g.fillStyle = '#1a1014'; circle(g, px, py, pr);
  g.fillStyle = '#ffffff'; circle(g, px - pr * 0.35, py - pr * 0.4, pr * 0.35);
}
function lid(g, w, ex, ey, er, amount) {
  // Augenlid von hinten über das Auge (amount 0..1)
  const d = w.dir;
  g.save(); g.beginPath(); g.arc(ex, ey, er + 1, 0, TAU); g.clip();
  g.translate(ex, ey); g.rotate(Math.atan2(d.y, d.x));
  g.fillStyle = mix(w.c, '#000000', 0.08); g.fillRect(-er * 2, -er * 2, er * (1 + 2 * amount) + 0.05 * er, er * 4);
  g.strokeStyle = mix(w.c, '#1a0d05', 0.72); g.lineWidth = 2.2;
  const lx = -er + 2 * er * amount + 0.05 * er;
  g.beginPath(); g.moveTo(lx, -er); g.lineTo(lx, er); g.stroke();
  g.restore();
  g.strokeStyle = mix(w.c, '#1a0d05', 0.72); g.lineWidth = 2;
  g.beginPath(); g.arc(ex, ey, er, 0, TAU); g.stroke();
}
function drawEyes(g, w, biting, blink = 0) {
  const h = w.head, d = w.dir, p = w.perp, r = w.hr * 0.86, type = w.spd.eyes;
  const fwd = biting ? 0.02 : 0.38;
  if (type === 'cyclops') {
    const ex = h.x + d.x * r * 0.3, ey = h.y + d.y * r * 0.3;
    eyeBall(g, ex, ey, r * 0.58, w, 0.42, 0.5);
    if (blink > 0) lid(g, w, ex, ey, r * 0.58, blink);
    return;
  }
  if (type === 'visor') {
    g.save(); g.translate(h.x, h.y); g.rotate(Math.atan2(d.y, d.x));
    g.fillStyle = '#e6f3ff'; g.strokeStyle = mix(w.c, '#0d1420', 0.7); g.lineWidth = 2.5;
    g.beginPath(); g.roundRect(r * 0.12, -r * 0.72, r * 0.46, r * 1.44, r * 0.2); g.fill(); g.stroke();
    g.fillStyle = '#1a1420';
    for (const s of [-1, 1]) circle(g, r * 0.4, s * r * 0.34, r * 0.15);
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(r * 0.18, -r * 0.62, r * 0.08, r * 0.5);
    g.restore();
    return;
  }
  if (type === 'stalk') {
    for (const s of [-1, 1]) {
      const base = V.lin(h, p, s * r * 0.35, d, r * 0.3), e = V.lin(h, d, r * 0.95, p, s * r * 0.85);
      g.lineCap = 'round';
      g.strokeStyle = mix(w.c, '#1a0d05', 0.62); g.lineWidth = r * 0.24; line(g, base, e);
      g.strokeStyle = w.c; g.lineWidth = r * 0.13; line(g, base, e);
      eyeBall(g, e.x, e.y, r * 0.3, w, 0.35, 0.55);
      if (blink > 0) lid(g, w, e.x, e.y, r * 0.3, blink);
    }
    return;
  }
  const er = r * 0.38;
  for (const s of [-1, 1]) {
    const ex = h.x + d.x * r * fwd + p.x * r * 0.5 * s, ey = h.y + d.y * r * fwd + p.y * r * 0.5 * s;
    eyeBall(g, ex, ey, er, w, type === 'angry' ? 0.45 : 0.4, type === 'angry' ? 0.46 : 0.52);
    const lidAmount = Math.max(type === 'sleepy' ? 0.5 : 0, blink);
    if (lidAmount > 0) lid(g, w, ex, ey, er, lidAmount);
    if (type === 'angry') {
      g.save(); g.translate(ex, ey); g.rotate(Math.atan2(d.y, d.x));
      g.strokeStyle = '#2a1206'; g.lineWidth = er * 0.42; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-er * 1.15, s * er * 0.85); g.lineTo(-er * 0.55, -s * er * 0.45); g.stroke();
      g.restore();
    }
  }
}
function drawExtra(g, w, kind) {
  const h = w.head, d = w.dir, p = w.perp, hr = w.hr, r = w.hr * 0.86, dark = mix(w.c, '#1a0d05', 0.62);
  g.lineCap = 'round'; g.lineJoin = 'round';
  if (kind === 'horns') {
    for (const s of [-1, 1]) {
      const base = V.lin(h, d, -hr * 0.1, p, s * hr * 0.72), tip = V.lin(base, p, s * hr * 0.42, d, -hr * 0.5);
      g.fillStyle = '#fff1d0'; g.strokeStyle = INK; g.lineWidth = 2;
      g.beginPath(); g.moveTo(base.x + d.x * hr * 0.22, base.y + d.y * hr * 0.22);
      g.lineTo(base.x - d.x * hr * 0.22, base.y - d.y * hr * 0.22); g.lineTo(tip.x, tip.y); g.closePath(); g.fill(); g.stroke();
    }
  } else if (kind === 'antennae') {
    for (const s of [-1, 1]) {
      const a = V.lin(h, d, hr * 0.55, p, s * hr * 0.3), q = V.lin(h, d, hr * 1.45, p, s * hr * 0.35), e = V.lin(h, d, hr * 1.7, p, s * hr * 1.0);
      g.strokeStyle = dark; g.lineWidth = Math.max(2, r * 0.1);
      g.beginPath(); g.moveTo(a.x, a.y); g.quadraticCurveTo(q.x, q.y, e.x, e.y); g.stroke();
      g.fillStyle = w.pc || '#ffffff'; g.strokeStyle = dark; g.lineWidth = 1.8;
      g.beginPath(); g.arc(e.x, e.y, Math.max(2.5, r * 0.2), 0, TAU); g.fill(); g.stroke();
    }
  } else if (kind === 'jaws') {
    for (const s of [-1, 1]) {
      const a1 = V.lin(h, d, hr * 0.55, p, s * hr * 0.78), a2 = V.lin(h, d, hr * 0.85, p, s * hr * 0.28);
      const q = V.lin(h, d, hr * 1.55, p, s * hr * 0.95), e = V.lin(h, d, hr * 1.55, p, s * hr * 0.22);
      g.beginPath(); g.moveTo(a1.x, a1.y); g.quadraticCurveTo(q.x, q.y, e.x, e.y);
      const q2 = V.lin(h, d, hr * 1.2, p, s * hr * 0.55);
      g.quadraticCurveTo(q2.x, q2.y, a2.x, a2.y); g.closePath();
      g.fillStyle = '#f0e2c4'; g.strokeStyle = INK; g.lineWidth = 2.2; g.fill(); g.stroke();
    }
  } else if (kind === 'sprout') {
    const base = V.lin(h, d, -hr * 0.25);
    const ang = Math.atan2(d.y, d.x) + Math.PI;
    for (const s of [-1, 1]) {
      g.save(); g.translate(base.x, base.y); g.rotate(ang + s * 0.75);
      const L = hr * 0.85, Bw = hr * 0.36;
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(L * 0.5, -Bw, L, 0); g.quadraticCurveTo(L * 0.5, Bw, 0, 0);
      g.fillStyle = '#86dc5c'; g.strokeStyle = '#2f5a14'; g.lineWidth = 2; g.fill(); g.stroke();
      g.strokeStyle = '#4f8f2a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(2, 0); g.lineTo(L * 0.8, 0); g.stroke();
      g.restore();
    }
    g.fillStyle = '#5a9a30'; circle(g, base.x, base.y, hr * 0.12);
  } else if (kind === 'tuft') {
    const b = V.lin(h, d, -hr * 0.42);
    for (const pass of [0, 1]) {
      g.strokeStyle = pass ? mix(w.c, '#ffffff', 0.3) : mix(w.c, '#1a0d05', 0.55);
      g.lineWidth = pass ? 2.2 : 4.2;
      for (let k = -3; k <= 3; k++) {
        const a = Math.atan2(-d.y, -d.x) + k * 0.38, u = { x: Math.cos(a), y: Math.sin(a) };
        const e = V.lin(b, u, hr * (0.55 + (k % 2 ? 0 : 0.12))), q = V.lin(b, u, hr * 0.3, p, hr * 0.12);
        g.beginPath(); g.moveTo(b.x, b.y); g.quadraticCurveTo(q.x, q.y, e.x, e.y); g.stroke();
      }
    }
  }
}
function drawMouth(g, w) {
  const h = w.head, d = w.dir, r = w.hr * 0.86;
  const mx = h.x + d.x * r * 0.72, my = h.y + d.y * r * 0.72;
  g.save(); g.translate(mx, my); g.rotate(Math.atan2(d.y, d.x));
  g.fillStyle = '#3a0d14'; g.strokeStyle = mix(w.c, '#1a0d05', 0.62); g.lineWidth = 2.5;
  g.beginPath(); g.ellipse(0, 0, r * 0.42, r * 0.62, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#ffffff';
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
    const ty = (k - 1) * r * 0.32;
    g.beginPath(); g.moveTo(s * r * 0.36, ty - r * 0.1); g.lineTo(s * r * 0.36, ty + r * 0.1); g.lineTo(s * r * 0.16, ty); g.closePath(); g.fill();
  }
  g.restore();
}
function drawCrown(g, w) {
  const r = Math.max(w.hr * 0.86, 12), x = w.head.x - w.dir.x * r * 0.25, y = w.head.y - Math.max(w.hr, 14) * 1.42;
  const cw = r * 1.5, ch = r * 0.95;
  g.save(); g.translate(x, y);
  g.beginPath();
  g.moveTo(-cw / 2, ch * 0.3); g.lineTo(-cw / 2, -ch * 0.45); g.lineTo(-cw * 0.25, -ch * 0.05);
  g.lineTo(0, -ch * 0.6); g.lineTo(cw * 0.25, -ch * 0.05); g.lineTo(cw / 2, -ch * 0.45); g.lineTo(cw / 2, ch * 0.3); g.closePath();
  g.fillStyle = '#ffd23f'; g.fill(); g.strokeStyle = '#8a5a00'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#ff4f7b'; circle(g, 0, ch * 0.08, r * 0.11);
  g.fillStyle = '#5fd0ff'; circle(g, -cw * 0.3, ch * 0.1, r * 0.08); circle(g, cw * 0.3, ch * 0.1, r * 0.08);
  g.restore();
}

// ---------------------------------------------------------------- Futter
/** Futterbilder ohne Schatten, mittig um (0,0) mit Größe s. */
const FOOD_ART = {
  seed(g, s, rnd) {
    const c = ['#e8c27a', '#d9a35a', '#f2dca0', '#c98d4f'][Math.floor(rnd() * 4)];
    g.fillStyle = c; g.beginPath(); g.moveTo(-s * 1.3, 0); g.quadraticCurveTo(-s * 0.2, -s * 0.95, s * 1.1, -s * 0.2); g.quadraticCurveTo(s * 1.35, 0, s * 1.1, s * 0.2); g.quadraticCurveTo(-s * 0.2, s * 0.95, -s * 1.3, 0); g.fill();
    g.strokeStyle = '#4a2c14'; g.lineWidth = 1.5; g.stroke();
    g.strokeStyle = rgba('#4a2c14', 0.5); g.lineWidth = 1.2; g.beginPath(); g.moveTo(-s * 0.9, 0); g.lineTo(s * 0.8, 0); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(-s * 0.2, -s * 0.32, s * 0.5, s * 0.15, 0, 0, TAU); g.fill();
  },
  berry(g, s, rnd) {
    const c = ['#e8414f', '#5568e8', '#9b4fd1', '#ff6a3d'][Math.floor(rnd() * 4)];
    const n = rnd() < 0.4 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const bx = k ? s * 1.6 : 0;
      g.fillStyle = c; circle(g, bx, 0, s);
      g.strokeStyle = mix(c, '#1a0505', 0.6); g.lineWidth = 1.5; g.beginPath(); g.arc(bx, 0, s, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.8)'; circle(g, bx - s * 0.35, -s * 0.35, s * 0.28);
    }
    g.save(); g.rotate(-0.8);
    g.fillStyle = '#6cc24a'; g.strokeStyle = '#2f5a14'; g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(0, -s * 0.8); g.quadraticCurveTo(s * 0.9, -s * 1.9, s * 1.6, -s * 1.3); g.quadraticCurveTo(s * 0.9, -s * 0.7, 0, -s * 0.8); g.fill(); g.stroke();
    g.restore();
  },
  leaf(g, s, rnd) {
    const c = ['#7cc14a', '#e8c040', '#e88a3a', '#c9d65a'][Math.floor(rnd() * 4)];
    const L = s * 1.7;
    g.fillStyle = c; g.beginPath(); g.moveTo(-L, 0); g.quadraticCurveTo(0, -L * 0.62, L, 0); g.quadraticCurveTo(0, L * 0.62, -L, 0); g.fill();
    g.strokeStyle = mix(c, '#1a1005', 0.6); g.lineWidth = 1.4; g.stroke();
    g.strokeStyle = mix(c, '#1a1005', 0.35); g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(-L * 1.15, 0); g.lineTo(L * 0.85, 0); g.stroke();
    for (const t of [-0.4, 0, 0.4]) { g.beginPath(); g.moveTo(t * L, 0); g.lineTo(t * L + L * 0.25, -L * 0.25); g.moveTo(t * L, 0); g.lineTo(t * L + L * 0.25, L * 0.25); g.stroke(); }
  },
  shroom(g, s, rnd) {
    const red = rnd() < 0.6, c = red ? '#e0483e' : '#c08850', a = rnd() * TAU;
    g.fillStyle = c; circle(g, 0, 0, s * 1.15);
    g.strokeStyle = red ? '#5a1a12' : '#4a2c14'; g.lineWidth = 1.6; g.beginPath(); g.arc(0, 0, s * 1.15, 0, TAU); g.stroke();
    if (red) { g.fillStyle = '#fff6ea'; for (let k = 0; k < 4; k++) { const aa = a + k * 1.6; circle(g, Math.cos(aa) * s * 0.55, Math.sin(aa) * s * 0.55, s * (0.18 + (k % 2) * 0.08)); } }
    else { g.fillStyle = '#e9c08a'; circle(g, 0, 0, s * 0.55); g.fillStyle = '#c08850'; circle(g, 0, 0, s * 0.25); }
    g.fillStyle = 'rgba(255,255,255,0.45)'; circle(g, -s * 0.4, -s * 0.45, s * 0.25);
  },
  grub(g, s) {
    g.lineCap = 'round';
    g.strokeStyle = '#5a4630'; g.lineWidth = s * 1.05 + 2.6;
    g.beginPath(); g.arc(0, 0, s * 0.9, 0.3, Math.PI * 1.55); g.stroke();
    g.strokeStyle = '#f7ecd6'; g.lineWidth = s * 1.05;
    g.beginPath(); g.arc(0, 0, s * 0.9, 0.3, Math.PI * 1.55); g.stroke();
    g.strokeStyle = 'rgba(120,90,60,0.55)'; g.lineWidth = 1;
    for (let t = 0.6; t < Math.PI * 1.5; t += 0.42) {
      g.beginPath(); g.moveTo(Math.cos(t) * s * 0.45, Math.sin(t) * s * 0.45); g.lineTo(Math.cos(t) * s * 1.35, Math.sin(t) * s * 1.35); g.stroke();
    }
    g.fillStyle = '#a0522d'; circle(g, Math.cos(Math.PI * 1.55) * s * 0.9, Math.sin(Math.PI * 1.55) * s * 0.9, s * 0.42);
  },
};
function chunkArt(g, s, c, pc, rnd) {
  const n = 9, pts = [];
  for (let k = 0; k < n; k++) { const aa = (k / n) * TAU; const rr = s * (0.8 + rnd() * 0.35); pts.push({ x: Math.cos(aa) * rr, y: Math.sin(aa) * rr }); }
  g.fillStyle = c; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); g.fill();
  g.strokeStyle = mix(c, '#1a0d05', 0.6); g.lineWidth = 1.8; g.lineJoin = 'round'; g.stroke();
  if (pc) { g.fillStyle = pc; circle(g, s * 0.2, s * 0.15, s * 0.28); }
  g.fillStyle = 'rgba(255,255,255,0.55)'; circle(g, -s * 0.35, -s * 0.35, s * 0.25);
}
/**
 * Fertiges Futterbild mit weichem Schatten als Zeichenfläche (Mittelpunkt in der Mitte). draw(g) zeichnet um (0,0).
 * Der Schatten liegt in Weltrichtung unten rechts, deshalb getrennt: { img, shadow, half }.
 */
function sprite(size, scale, draw) {
  const half = Math.ceil(size * 2.6 + 6), dim = half * 2;
  const img = canvas(dim, dim, scale), g = img.getContext('2d');
  g.translate(half, half); draw(g);
  const sh = canvas(dim, dim, scale), q = sh.getContext('2d');
  q.filter = `blur(${2.5 * scale}px)`; q.drawImage(img, 0, 0, dim, dim); q.filter = 'none';
  q.globalCompositeOperation = 'source-in'; q.fillStyle = 'rgba(20,8,2,0.55)'; q.fillRect(0, 0, dim, dim);
  return { img, shadow: sh, half };
}

// ---------------------------------------------------------------- Anzeige
function hudText(g, text, x, y, size, weight, align, opts = {}) {
  g.save();
  g.font = `${weight} ${size}px ${FONT}`; g.textAlign = align; g.textBaseline = 'middle';
  if ('letterSpacing' in g) g.letterSpacing = opts.spacing || '0px';
  g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 6; g.shadowOffsetY = 2;
  g.globalAlpha = opts.alpha ?? 1;
  g.fillStyle = opts.color || '#fff3dc';
  g.fillText(text, x, y);
  g.restore();
}
function miniHead(g, x, y, w) {
  g.save();
  g.fillStyle = mix(w.c, '#1a0d05', 0.62); circle(g, x, y, 12.5);
  g.fillStyle = w.c; circle(g, x, y, 10.5);
  if (w.pc && w.spd.pat !== 'zigzag') { g.fillStyle = w.pc; circle(g, x - 4, y + 4, 2.6); circle(g, x + 5, y + 3, 2); }
  g.fillStyle = '#ffffff';
  if (w.spd.eyes === 'cyclops') { circle(g, x, y - 1, 5); g.fillStyle = '#1a1014'; circle(g, x, y - 1, 2.6); }
  else { circle(g, x - 4, y - 2, 3.6); circle(g, x + 4, y - 2, 3.6); g.fillStyle = '#1a1014'; circle(g, x - 4, y - 2, 1.8); circle(g, x + 4, y - 2, 1.8); }
  g.restore();
}

B.art = { mulberry, hashStr, mix, rgba, circle, line, canvas, SPECIES, look, pose, paintSoil, paintVignette, drawWorm, drawShadow,
  FOOD_ART, chunkArt, sprite, hudText, miniHead, TAU };
})();
