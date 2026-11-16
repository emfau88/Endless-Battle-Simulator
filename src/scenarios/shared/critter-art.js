/* Shared Pyramid animal and environment artwork. Load after core.js and before scenes that use EBS.CritterArt.
 * Drawing functions are kept identical to the original Pyramid renderer.
 * kind: 0 chick, 1 penguin, 2 pig, 3 frog; sc: render scale; R: body radius.
 * drawCritter modes: roll, fall, lift, pool. Optional mood: cheer, yawn, sleep, cap.
 */
(function () {
'use strict';
const TAU = Math.PI * 2;
function poly(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); }
function dot(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }

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
const CAPS = [['#3f6fe0', '#ffffff'], ['#e8484f', '#ffffff'], ['#58b7f0', '#ffffff'], ['#9a5fd6', '#ffe36a']];
function drawCritter(g, sprite, kind, id, x, y, ang, mode, t, speed, look, wig, R, mood = null) {
  // Jedes Tierchen zappelt in eigenem Tempo und mit eigenem Armversatz; sein Gezappel schwillt für sich an und ab
  const h1 = Math.abs(Math.sin(id * 12.9898) * 43758.5453) % 1, h2 = Math.abs(Math.sin(id * 78.233 + 1.3) * 24634.6345) % 1;
  const sp = SPECIES[kind], ph = t * 9 * (0.7 + 0.65 * h1) + id * 1.7, ao = 0.9 + 2.2 * h2, lk = R / 16;
  const w = wig * (0.62 + 0.62 * (0.5 + 0.5 * Math.sin(t * (0.5 + 0.9 * h2) + id * 2.9)));
  const cheer = mood && mood.cheer && (mode === 'lift' || mode === 'pool');
  const yawn = mood && !cheer ? mood.yawn : 0, sleep = mood && !cheer && mood.sleep && mode === 'pool';
  g.save(); g.translate(x, y); g.rotate(ang);
  g.lineCap = 'round'; g.lineJoin = 'round';
  // Glieder (hinter dem Körper)
  const sh = [R * 0.8, R * 0.05], hip = [R * 0.42, R * 0.78];
  let aL, aR, lL, lR;
  if (mode === 'fall') {
    aL = [-R * 1.02, -R * 0.78 + Math.sin(ph * 1.7) * 2.5 * w]; aR = [R * 1.02, -R * 0.78 + Math.sin(ph * 1.7 + ao) * 2.5 * w];
    lL = [-R * 0.66, R * 1.16 + Math.sin(ph * 2) * 1.5 * w]; lR = [R * 0.66, R * 1.16 - Math.sin(ph * 2) * 1.5 * w];
  } else if (cheer) {                                                  // Finale: Arme hoch und winken
    aL = [-R * 1.0 + Math.sin(ph * 1.4) * 2, -R * 1.0 + Math.cos(ph * 1.4) * 3]; aR = [R * 1.0 - Math.sin(ph * 1.4 + 1) * 2, -R * 1.0 + Math.cos(ph * 1.4 + 1) * 3];
    if (mode === 'lift') { lL = [-R * 0.46, R * 1.14]; lR = [R * 0.46, R * 1.14]; }
  } else if (yawn > 0.25 && (mode === 'lift' || mode === 'pool')) {   // gähnen und strecken
    aL = [-R * 1.0, -R * (0.55 + 0.45 * yawn)]; aR = [R * 1.0, -R * (0.55 + 0.45 * yawn)];
    if (mode === 'lift') { lL = [-R * 0.46, R * 1.14]; lR = [R * 0.46, R * 1.14]; }
  } else if (mode === 'lift') {
    const wv = Math.sin(ph * 0.8), still = [R * 1.12, -R * 0.42], wave = [R * 1.08 + wv * R * 0.1 * w, -R * 0.72 + wv * R * 0.28 * w];
    if (h1 < 0.5) { aL = [-still[0], still[1]]; aR = wave; } else { aL = [-wave[0], wave[1]]; aR = still; }   // mal winkt der rechte, mal der linke Arm
    lL = [-R * 0.46 + Math.sin(ph * 0.6) * R * 0.08 * w, R * 1.14]; lR = [R * 0.46 + Math.sin(ph * 0.6 + ao) * R * 0.08 * w, R * 1.14];   // Beine baumeln
  } else if (mode === 'pool') {
    aL = [-R * 1.18 + Math.cos(ph * 0.6) * 2 * w, R * 0.18 + Math.sin(ph * 0.6) * 2.5 * w];
    aR = [R * 1.18 - Math.cos(ph * 0.6 + ao) * 2 * w, R * 0.18 + Math.sin(ph * 0.6 + ao) * 2.5 * w];
  } else {
    const f = 0.4 + Math.min(1, speed / 320) * 0.6;
    aL = [-R * 1.16, -R * 0.08 + Math.sin(ph * 1.3) * R * 0.38 * w * f]; aR = [R * 1.16, -R * 0.08 + Math.sin(ph * 1.3 + ao) * R * 0.38 * w * f];
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
    if (sleep || (yawn > 0.3 && mode !== 'fall' && mode !== 'roll')) {     // schlafend bzw. gähnend: Augen zu
      g.beginPath(); g.arc(cx, cy - rr * 0.2, rr * 0.7, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); continue;
    }
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
    const pr = rr * (mode === 'fall' ? 0.38 : 0.5), wob = Math.sin(t * 17 + id + s) * 0.12 * Math.min(w, 2);   // Wackelaugen
    g.fillStyle = '#1d1424'; dot(g, cx + (lx + wob) * (rr - pr), cy + (ly - wob) * (rr - pr), pr);
    g.fillStyle = '#ffffff'; dot(g, cx + (lx + wob) * (rr - pr) - pr * 0.35, cy + (ly - wob) * (rr - pr) - pr * 0.35, pr * 0.35);
  }
  // Mund
  const my = kind === 3 ? R * 0.05 : kind === 2 ? R * 0.42 : R * 0.42;
  g.strokeStyle = OUTLINE; g.lineWidth = 1.5 * lk;
  if (cheer) { g.fillStyle = '#5a1630'; g.beginPath(); g.arc(0, my - R * 0.04, R * 0.2, 0, Math.PI); g.closePath(); g.fill(); g.stroke(); }
  else if (yawn > 0.25 && mode !== 'fall' && mode !== 'roll') { g.fillStyle = '#5a1630'; g.beginPath(); g.ellipse(0, my + R * 0.08, R * 0.16 + R * 0.06 * yawn, R * 0.12 + R * 0.2 * yawn, 0, 0, TAU); g.fill(); g.stroke(); }
  else if (mode === 'fall' || (mode === 'roll' && speed > 330)) { g.fillStyle = '#5a1630'; g.beginPath(); g.ellipse(0, my + R * 0.05, R * 0.15, R * 0.19, 0, 0, TAU); g.fill(); g.stroke(); }
  else if (kind === 3) { g.beginPath(); g.arc(0, -R * 0.15, R * 0.62, Math.PI * 0.22, Math.PI * 0.78); g.stroke(); }
  else if (kind === 2) { g.beginPath(); g.arc(0, R * 0.3, R * 0.2, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); }
  // Schlafmütze (nachts): sitzt zwischen den Ohren bzw. Froschaugen und kippt zur Seite
  if (mood && mood.cap) {
    const [c0, c1] = CAPS[kind], by = kind === 3 ? -R * 0.55 : -R * 0.74, bw = kind === 3 ? R * 0.34 : R * 0.6;
    g.lineWidth = 1.3 * lk; g.strokeStyle = OUTLINE;
    g.fillStyle = c0; g.beginPath(); g.moveTo(-bw, by); g.quadraticCurveTo(-bw * 0.2, by - R * 1.15, R * 0.95, by - R * 0.75);
    g.quadraticCurveTo(bw * 0.5, by - R * 0.55, bw, by); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = c1; g.lineWidth = 2.2 * lk; g.beginPath(); g.moveTo(-bw * 0.45, by - R * 0.42); g.quadraticCurveTo(bw * 0.15, by - R * 0.62, bw * 0.75, by - R * 0.38); g.stroke();
    g.fillStyle = c1; g.strokeStyle = OUTLINE; g.lineWidth = 1.2 * lk;
    g.beginPath(); g.ellipse(0, by, bw * 1.05, R * 0.13, 0, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.arc(R * 0.95, by - R * 0.75, R * 0.17, 0, TAU); g.fill(); g.stroke();
  }
  g.restore();
}

const LEAF_DARK = ['#123a1a', '#174a1f', '#1d5a25', '#24692a'];
const LEAF_MID = ['#2c7a30', '#378a37', '#43993e', '#2f8034'];
const LEAF_LIGHT = ['#5aad48', '#6fbf52', '#86cc5d', '#9ed86a'];
const FLOWERS = ['#ffffff', '#ffd3ec', '#fff1a0', '#ffb36b', '#f6a8ff'];
const pick = (rng, a) => a[Math.floor(rng.next() * a.length)];

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

/** Mond: Scheibe mit Maren, beleuchtete Sichel links oben, Nachtseite schwach sichtbar (Erdschein), weiche Schattengrenze. */
function moonSprite(sc, r) {
  const pad = 4, c = document.createElement('canvas'); c.width = c.height = Math.ceil((r + pad) * 2 * sc * 2);
  const g = c.getContext('2d'); g.scale(sc * 2, sc * 2); g.translate(r + pad, r + pad);
  g.save(); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.clip();
  const gr = g.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r * 1.05);
  gr.addColorStop(0, '#fffef4'); gr.addColorStop(0.6, '#f6eed2'); gr.addColorStop(1, '#dcd3b2');
  g.fillStyle = gr; g.fillRect(-r, -r, r * 2, r * 2);
  g.fillStyle = 'rgba(150,146,150,.26)';
  for (const [x, y, a, b, rot] of [[-0.42, -0.3, 0.26, 0.2, 0.4], [-0.1, -0.6, 0.2, 0.13, -0.3], [-0.55, 0.2, 0.2, 0.26, 0.2], [-0.2, 0.62, 0.22, 0.14, 0.9], [0.1, 0.05, 0.3, 0.22, 0]]) {
    g.beginPath(); g.ellipse(x * r, y * r, a * r, b * r, rot, 0, TAU); g.fill();
  }
  const sh = g.createRadialGradient(r * 0.6, r * 0.28, r * 0.5, r * 0.6, r * 0.28, r * 1.22);
  sh.addColorStop(0, 'rgba(0,0,0,.9)'); sh.addColorStop(0.78, 'rgba(0,0,0,.84)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalCompositeOperation = 'destination-out';              // Nachtseite fast durchsichtig: der Himmel scheint durch, ein Rest Erdschein bleibt
  g.fillStyle = sh; g.fillRect(-r, -r, r * 2, r * 2);
  g.restore();
  return { c, r: r + pad };
}

EBS.CritterArt = { SPECIES, critterSprite, drawCritter };
EBS.PyramidArt = { palm, foliage, cloudSprite, moonSprite };
})();
