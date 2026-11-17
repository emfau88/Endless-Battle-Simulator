/*
 * Cloud Wars – Gelände (Paket C0)
 *
 * Übernommen aus dem Prototyp „Wolkenflug“ (docs/reference/cloudwars-prototype.source.html, Zeilen 101–466):
 * Rauschen, Wasser, Wald, Felder, Straßennetz, Dörfer und das Zeichnen einer Kachel. Alle Werte hängen nur von der
 * Weltposition ab (Ganzzahl-Hash, kein Math.random). Der Seed wählt nur den Ausschnitt (pickArea).
 * Geändert gegenüber dem Prototyp: renderChunk zeichnet mit wählbarer Schärfe (Pixel je Geländeeinheit),
 * renderArea setzt den festen Ausschnitt aus Kacheln zusammen.
 */
(function () {
'use strict';
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function hash2(x, y, s) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s, oct) {
  let sum = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) { sum += vnoise(x * f, y * f, s + i * 17) * amp; norm += amp; amp *= 0.5; f *= 2.03; }
  return sum / norm;
}

// ---------- Gelände ----------
const LAKE = 0.35, RIVW = 0.0065, FOREST = 0.565;
function waterAmt(h, rn) {
  const lake = LAKE - h, riv = (RIVW - Math.abs(rn - 0.5)) * 3.5;
  return lake > riv ? lake : riv;
}
let T_h = 0, T_r = 0, T_f = 0, T_w = 0;
function sampleT(x, y) {
  T_h = fbm(x * 0.0009, y * 0.0009, 11, 4);
  T_r = fbm(x * 0.00045 + 31.7, y * 0.00045 - 12.3, 23, 3);
  T_f = fbm(x * 0.0019 - 40, y * 0.0019 + 70, 37, 4);
  T_w = waterAmt(T_h, T_r);
}
function isForestAt(x, y) { sampleT(x, y); return T_w < -0.012 && T_f > FOREST + 0.012; }
function isWaterAt(x, y) { sampleT(x, y); return T_w > 0; }

// ---------- Felder (gedrehte Parzellen je Region) ----------
const FANG = [0.35, -0.52, 1.08, 0.12].map(a => [Math.cos(a), Math.sin(a)]);
const FCU = 92, FCV = 58;
let F_ri = 0, F_iu = 0, F_iv = 0, F_m = false, F_v = 0, F_edge = 0, F_id = 0;
function fieldCell(x, y, g) {
  const ri = g < 0.38 ? 0 : g < 0.52 ? 1 : g < 0.66 ? 2 : 3, cs = FANG[ri];
  const u = x * cs[0] + y * cs[1], v = -x * cs[1] + y * cs[0];
  const fu = u / FCU, fv = v / FCV, iu = Math.floor(fu), iv = Math.floor(fv), ru = fu - iu, rv = fv - iv;
  const m = hash2(iu >> 1, iv, ri + 70) < 0.35;
  let du = Math.min(ru, 1 - ru) * FCU;
  if (m && ((iu & 1) === 0 ? ru > 0.5 : ru < 0.5)) du = 99;
  const dv = Math.min(rv, 1 - rv) * FCV;
  F_ri = ri; F_m = m; F_iu = m ? (iu >> 1) * 2 : iu; F_iv = iv; F_v = v;
  F_edge = du < dv ? du : dv;
  F_id = hash2(F_iu, iv, ri + 90);
}
const cellCache = new Map();
function cellField() {
  const k = ((F_iu + 60000) * 120000 + (F_iv + 60000)) * 4 + F_ri;
  let v = cellCache.get(k);
  if (v === undefined) {
    const cs = FANG[F_ri], uc = (F_iu + (F_m ? 1 : 0.5)) * FCU, vc = (F_iv + 0.5) * FCV;
    const wx = uc * cs[0] - vc * cs[1], wy = uc * cs[1] + vc * cs[0];
    v = vnoise(wx * 0.0011 + 3, wy * 0.0011 - 8, 53) > 0.41 ? 1 : 0;
    if (cellCache.size > 60000) cellCache.clear();
    cellCache.set(k, v);
  }
  return v;
}
// Feldtypen: Schwelle, Farbe, Muster (0 glatt, 1 Getreide, 2 Reihen, 3 gepflügt)
const FT = [
  [0.20, 217, 194, 122, 1], [0.36, 143, 179, 94, 2], [0.48, 169, 196, 111, 2], [0.62, 166, 137, 98, 3],
  [0.73, 111, 154, 79, 2], [0.79, 228, 208, 92, 1], [0.88, 198, 180, 122, 1], [1.01, 150, 186, 101, 0]];

// ---------- Chunk-Raster (grobes Rauschgitter, dann bilinear) ----------
const CS = 256, CG = 8, CPAD = 16, GN = (CS + 2 * CPAD) / CG + 1;
const gH = new Float32Array(GN * GN), gR = new Float32Array(GN * GN), gF = new Float32Array(GN * GN), gG = new Float32Array(GN * GN);
let I_h = 0, I_r = 0, I_f = 0, I_g = 0;
function fillGrid(x0, y0) {
  for (let j = 0, k = 0; j < GN; j++) for (let i = 0; i < GN; i++, k++) {
    const wx = x0 - CPAD + i * CG, wy = y0 - CPAD + j * CG;
    sampleT(wx, wy);
    gH[k] = T_h; gR[k] = T_r; gF[k] = T_f;
    gG[k] = vnoise(wx * 0.0005 + 5, wy * 0.0005 + 9, 41);
  }
}
function interp(lx, ly) {
  const gx = (lx + CPAD) / CG, gy = (ly + CPAD) / CG;
  let i = Math.floor(gx), j = Math.floor(gy);
  if (i < 0) i = 0; else if (i > GN - 2) i = GN - 2;
  if (j < 0) j = 0; else if (j > GN - 2) j = GN - 2;
  const fx = gx - i, fy = gy - j, k = j * GN + i;
  const a = (1 - fx) * (1 - fy), b = fx * (1 - fy), c = (1 - fx) * fy, d = fx * fy;
  I_h = gH[k] * a + gH[k + 1] * b + gH[k + GN] * c + gH[k + GN + 1] * d;
  I_r = gR[k] * a + gR[k + 1] * b + gR[k + GN] * c + gR[k + GN + 1] * d;
  I_f = gF[k] * a + gF[k + 1] * b + gF[k + GN] * c + gF[k + GN + 1] * d;
  I_g = gG[k] * a + gG[k + 1] * b + gG[k + GN] * c + gG[k + GN + 1] * d;
}

// ---------- Grundfarben pro Pixel (2 Welteinheiten je Pixel) ----------
const BR = CS / 2 + 2;
const baseCan = document.createElement('canvas'); baseCan.width = baseCan.height = BR;
const baseCtx = baseCan.getContext('2d');
const baseImg = baseCtx.createImageData(BR, BR);
function renderBase(x0, y0) {
  const D = baseImg.data;
  let p = 0, lastKey = -1, isF = 0;
  for (let py = 0; py < BR; py++) {
    const ly = (py - 1) * 2 + 1;
    for (let px = 0; px < BR; px++, p += 4) {
      const lx = (px - 1) * 2 + 1, wx = x0 + lx, wy = y0 + ly;
      interp(lx, ly);
      const w = waterAmt(I_h, I_r);
      let r, g, b;
      if (w > 0) {
        const t = clamp(w / 0.07, 0, 1);
        r = 104 - 60 * t; g = 160 - 58 * t; b = 168 - 46 * t;
        if (w < 0.0035) { const e = 1 - w / 0.0035; r += 30 * e; g += 22 * e; b += 10 * e; }
      } else {
        fieldCell(wx, wy, I_g);
        const key = F_iu * 7919 + F_iv * 104729 + F_ri;
        if (key !== lastKey) { lastKey = key; isF = cellField(); }
        const moist = I_f - 0.45;
        if (isF) {
          let ti = 0; while (F_id > FT[ti][0]) ti++;
          const ft = FT[ti], pat = ft[4];
          let m = 0.93 + 0.14 * ((F_id * 7.13) % 1);
          if (pat === 1) m *= 1 + 0.035 * Math.sin(F_v * 0.45);
          else if (pat === 2) m *= 1 + 0.05 * Math.sin(F_v * 1.1);
          else if (pat === 3) m *= 0.9 + 0.12 * Math.sin(F_v * 1.5);
          r = ft[1] * m; g = ft[2] * m; b = ft[3] * m;
          if (F_edge < 2.4) { const e = (1 - F_edge / 2.4) * 0.9; r = lerp(r, 84, e); g = lerp(g, 120, e); b = lerp(b, 60, e); }
        } else {
          r = 146 - moist * 70; g = 184 - moist * 34; b = 98 - moist * 44;
        }
        const ff = smooth(FOREST - 0.02, FOREST + 0.015, I_f);
        if (ff > 0) { r = lerp(r, 48, ff); g = lerp(g, 86, ff); b = lerp(b, 42, ff); }
        if (w > -0.007) { const t = (1 + w / 0.007) * 0.85; r = lerp(r, 206, t); g = lerp(g, 194, t); b = lerp(b, 148, t); }
      }
      const n = (hash2(wx, wy, 7) - 0.5) * 7;
      D[p] = r + n; D[p + 1] = g + n; D[p + 2] = b + n * 0.8; D[p + 3] = 255;
    }
  }
  baseCtx.putImageData(baseImg, 0, 0);
}

// ---------- Straßennetz (verzerrtes Gitter mit gebogenen Kanten) ----------
const RS = 560;
const nodeDryCache = new Map(), edgeCache = new Map(), villCache = new Map();
const nkey = (i, j) => (i + 4096) * 8192 + (j + 4096);
function nodePos(i, j) { return [i * RS + (hash2(i, j, 301) - 0.5) * RS * 0.55, j * RS + (hash2(i, j, 302) - 0.5) * RS * 0.55]; }
function nodeDry(i, j) {
  const k = nkey(i, j);
  let v = nodeDryCache.get(k);
  if (v === undefined) { const p = nodePos(i, j); sampleT(p[0], p[1]); v = T_w < -0.02; nodeDryCache.set(k, v); }
  return v;
}
function getEdge(i, j, dir) {
  const k = nkey(i, j) * 2 + dir;
  if (edgeCache.has(k)) return edgeCache.get(k);
  let res = null;
  const i2 = i + 1 - dir, j2 = j + dir;
  if (hash2(i, j, 303 + dir) < (dir ? 0.66 : 0.76) && nodeDry(i, j) && nodeDry(i2, j2)) {
    const [ax, ay] = nodePos(i, j), [bx, by] = nodePos(i2, j2);
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy), off = (hash2(i, j, 306 + dir) - 0.5) * L * 0.4;
    const qx = (ax + bx) / 2 - dy / L * off, qy = (ay + by) / 2 + dx / L * off;
    const N = 24, pts = new Float32Array((N + 1) * 2), cum = new Float32Array(N + 1);
    let wet = 0, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let s = 0; s <= N; s++) {
      const t = s / N, mt = 1 - t;
      const x = mt * mt * ax + 2 * mt * t * qx + t * t * bx, y = mt * mt * ay + 2 * mt * t * qy + t * t * by;
      pts[s * 2] = x; pts[s * 2 + 1] = y;
      if (s) cum[s] = cum[s - 1] + Math.hypot(x - pts[s * 2 - 2], y - pts[s * 2 - 1]);
      if (s % 3 === 0 && s > 0 && s < N) { sampleT(x, y); if (LAKE - T_h > -0.006) wet++; }
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    if (!wet) res = { pts, cum, len: cum[N], main: hash2(i, j, 308 + dir) < 0.3, x0, y0, x1, y1 };
  }
  edgeCache.set(k, res);
  return res;
}
function alongEdge(e, d, rev) {
  if (rev) d = e.len - d;
  const P = e.pts, C = e.cum;
  let s = 1;
  while (s < C.length - 1 && C[s] < d) s++;
  const t = clamp((d - C[s - 1]) / Math.max(0.001, C[s] - C[s - 1]), 0, 1);
  const ax = P[s * 2 - 2], ay = P[s * 2 - 1], bx = P[s * 2], by = P[s * 2 + 1];
  let ang = Math.atan2(by - ay, bx - ax);
  if (rev) ang += Math.PI;
  return [lerp(ax, bx, t), lerp(ay, by, t), ang];
}
const ROOFS = [[184, 84, 62], [199, 110, 80], [118, 122, 134], [152, 98, 74], [171, 72, 60], [176, 96, 70], [132, 134, 142]];
function getVillage(i, j) {
  const k = nkey(i, j);
  if (villCache.has(k)) return villCache.get(k);
  let v = null;
  if (hash2(i, j, 310) < 0.6 && nodeDry(i, j)) {
    const es = [];
    let e;
    if ((e = getEdge(i, j, 0))) es.push([e, false]);
    if ((e = getEdge(i, j, 1))) es.push([e, false]);
    if ((e = getEdge(i - 1, j, 0))) es.push([e, true]);
    if ((e = getEdge(i, j - 1, 1))) es.push([e, true]);
    if (es.length) {
      const rng = mulberry32(k * 7 + 13);
      const [nx, ny] = nodePos(i, j);
      const n = 5 + Math.floor(Math.pow(rng(), 1.5) * 32);
      const houses = [];
      let rad = 40;
      for (let a = 0; a < n * 4 && houses.length < n; a++) {
        const [ed, rev] = es[Math.floor(rng() * es.length)];
        const d = 15 + Math.pow(rng(), 1.25) * (32 + n * 6);
        if (d > ed.len * 0.45) continue;
        const [px, py, ang] = alongEdge(ed, d, rev);
        const side = rng() < 0.5 ? -1 : 1, back = n > 12 && rng() < 0.3;
        const off = (back ? 29 : 13) + rng() * 4;
        const hx = px - Math.sin(ang) * off * side, hy = py + Math.cos(ang) * off * side;
        let ok = true;
        for (const h of houses) if ((h.x - hx) ** 2 + (h.y - hy) ** 2 < 190) { ok = false; break; }
        if (!ok) continue;
        sampleT(hx, hy);
        if (T_w > -0.01) continue;
        houses.push({ x: hx, y: hy, w: 10 + rng() * 6, d: 7.5 + rng() * 3.5, ang: ang + (rng() - 0.5) * 0.08,
          roof: Math.floor(rng() * ROOFS.length), garden: !back && rng() < 0.6, side });
        rad = Math.max(rad, Math.hypot(hx - nx, hy - ny) + 24);
      }
      if (n > 18) {
        const [px, py, ang] = alongEdge(es[0][0], 6, es[0][1]);
        houses.push({ x: px - Math.sin(ang) * 24, y: py + Math.cos(ang) * 24, w: 28, d: 13, ang, roof: 2, church: true, side: 1 });
      }
      if (houses.length) v = { x: nx, y: ny, rad, houses };
    }
  }
  villCache.set(k, v);
  return v;
}

// ---------- Chunk zeichnen ----------
const OCC = 4, ON = (CS + 2 * CPAD) / OCC;
const occ = new Uint8Array(ON * ON);
function occMark(lx, ly, r) {
  const i0 = Math.max(0, Math.floor((lx - r + CPAD) / OCC)), i1 = Math.min(ON - 1, Math.floor((lx + r + CPAD) / OCC));
  const j0 = Math.max(0, Math.floor((ly - r + CPAD) / OCC)), j1 = Math.min(ON - 1, Math.floor((ly + r + CPAD) / OCC));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) occ[j * ON + i] = 1;
}
function occGet(lx, ly) {
  const i = Math.floor((lx + CPAD) / OCC), j = Math.floor((ly + CPAD) / OCC);
  return i < 0 || j < 0 || i >= ON || j >= ON ? 0 : occ[j * ON + i];
}
const rgb = (c, m) => `rgb(${clamp(c[0] * m, 0, 255) | 0},${clamp(c[1] * m, 0, 255) | 0},${clamp(c[2] * m, 0, 255) | 0})`;
const TREECOL = ['#2e5829', '#376630', '#3e7335', '#2b5025', '#467c3a', '#335f2c', '#52823b'];
const TS = 7.5;
function drawHouse(g, h, x0, y0) {
  const c = ROOFS[h.roof], w = h.w, d = h.d;
  g.save(); g.translate(h.x - x0, h.y - y0); g.rotate(h.ang);
  const lit = -0.55 * Math.sin(h.ang) + 0.83 * Math.cos(h.ang) > 0;
  g.fillStyle = rgb(c, lit ? 1.13 : 0.76); g.fillRect(-w / 2, -d / 2, w, d / 2);
  g.fillStyle = rgb(c, lit ? 0.76 : 1.13); g.fillRect(-w / 2, 0, w, d / 2);
  g.fillStyle = rgb(c, 0.58); g.fillRect(-w / 2, -0.35, w, 0.7);
  if (h.church) {
    g.fillStyle = '#8d8a86'; g.fillRect(w / 2 - 2, -4.5, 9, 9);
    g.fillStyle = '#6f6c69'; g.beginPath(); g.moveTo(w / 2 - 2, -4.5); g.lineTo(w / 2 + 2.5, 0); g.lineTo(w / 2 - 2, 4.5); g.fill();
    g.fillStyle = '#a7a39e'; g.beginPath(); g.moveTo(w / 2 - 2, -4.5); g.lineTo(w / 2 + 2.5, 0); g.lineTo(w / 2 + 7, -4.5); g.fill();
  }
  g.strokeStyle = 'rgba(30,20,15,0.22)'; g.lineWidth = 0.6; g.strokeRect(-w / 2, -d / 2, w, d);
  g.restore();
}
function renderChunk(x0, y0, k, g, tx, ty) {
  fillGrid(x0, y0);
  renderBase(x0, y0);
  // Direkt ins Zielbild zeichnen. Jede Kachel ragt 3 Pixel in die nächste; dort liegt derselbe Inhalt, also keine Fuge.
  g.save(); g.translate(tx, ty); g.scale(k, k);
  g.beginPath(); g.rect(0, 0, CS + 3 / k, CS + 3 / k); g.clip();
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(baseCan, 0, 0, BR, BR, -2, -2, BR * 2, BR * 2);
  occ.fill(0);
  const bx0 = x0 - CPAD - 12, by0 = y0 - CPAD - 12, bx1 = x0 + CS + CPAD + 12, by1 = y0 + CS + CPAD + 12;
  const i0 = Math.floor(bx0 / RS) - 1, i1 = Math.floor(bx1 / RS) + 1, j0 = Math.floor(by0 / RS) - 1, j1 = Math.floor(by1 / RS) + 1;
  // Straßen
  const edges = [];
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) for (let dir = 0; dir < 2; dir++) {
    const e = getEdge(i, j, dir);
    if (e && e.x1 > bx0 && e.x0 < bx1 && e.y1 > by0 && e.y0 < by1) edges.push(e);
  }
  for (const e of edges) {
    const P = e.pts;
    for (let s = 1; s < P.length / 2; s++) {
      const ax = P[s * 2 - 2] - x0, ay = P[s * 2 - 1] - y0, ex = P[s * 2] - x0, ey = P[s * 2 + 1] - y0;
      const n = Math.ceil(Math.hypot(ex - ax, ey - ay) / 3);
      for (let q = 0; q <= n; q++) occMark(lerp(ax, ex, q / n), lerp(ay, ey, q / n), 7);
    }
  }
  g.lineCap = g.lineJoin = 'round';
  const roadPath = (main) => {
    const p = new Path2D();
    for (const e of edges) if (e.main === main) {
      const P = e.pts; p.moveTo(P[0] - x0, P[1] - y0);
      for (let s = 1; s < P.length / 2; s++) p.lineTo(P[s * 2] - x0, P[s * 2 + 1] - y0);
    }
    return p;
  };
  const minor = roadPath(false), major = roadPath(true);
  g.strokeStyle = 'rgba(88,82,66,0.55)'; g.lineWidth = 6.2; g.stroke(minor); g.lineWidth = 8.4; g.stroke(major);
  g.strokeStyle = '#d6cfbb'; g.lineWidth = 4; g.stroke(minor);
  g.strokeStyle = '#c9c3b3'; g.lineWidth = 6; g.stroke(major);
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 0.7; g.setLineDash([5, 6]); g.stroke(major); g.setLineDash([]);
  // Häuser
  const houses = [];
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const v = getVillage(i, j);
    if (!v || v.x + v.rad < bx0 || v.x - v.rad > bx1 || v.y + v.rad < by0 || v.y - v.rad > by1) continue;
    for (const h of v.houses) if (h.x > bx0 && h.x < bx1 && h.y > by0 && h.y < by1) houses.push(h);
  }
  for (const h of houses) occMark(h.x - x0, h.y - y0, h.church ? 19 : 11);
  // Bäume
  const shadow = new Path2D(), hl = new Path2D(), crowns = TREECOL.map(() => new Path2D());
  const gx0 = Math.floor((x0 - CPAD) / TS), gx1 = Math.floor((x0 + CS + CPAD) / TS);
  const gy0 = Math.floor((y0 - CPAD) / TS), gy1 = Math.floor((y0 + CS + CPAD) / TS);
  for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
    const tx = (gx + 0.5) * TS + (hash2(gx, gy, 502) - 0.5) * TS * 0.8, ty = (gy + 0.5) * TS + (hash2(gx, gy, 503) - 0.5) * TS * 0.8;
    const lx = tx - x0, ly = ty - y0;
    if (lx < -CPAD || ly < -CPAD || lx > CS + CPAD || ly > CS + CPAD) continue;
    interp(lx, ly);
    if (waterAmt(I_h, I_r) > -0.006 || occGet(lx, ly)) continue;
    const hr = hash2(gx, gy, 504);
    let p, rad;
    const fd = smooth(FOREST - 0.025, FOREST + 0.02, I_f);
    if (fd > 0.02) { p = fd * 0.97; rad = 3.3 + hr * 2.3; }
    else {
      fieldCell(tx, ty, I_g);
      if (F_edge < 3 && cellField()) { p = 0.2; rad = 2.4 + hr * 1.5; }
      else { p = 0.012; rad = 3 + hr * 2; }
    }
    if (hash2(gx, gy, 501) > p) continue;
    const sx = lx + rad * 0.9 + 1.2, sy = ly + rad * 1.25 + 1.6;
    shadow.moveTo(sx + rad * 1.05, sy); shadow.arc(sx, sy, rad * 1.05, 0, TAU);
    const cp = crowns[Math.floor(hash2(gx, gy, 505) * TREECOL.length)];
    cp.moveTo(lx + rad, ly); cp.arc(lx, ly, rad, 0, TAU);
    const hx = lx - rad * 0.32, hy = ly - rad * 0.36;
    hl.moveTo(hx + rad * 0.5, hy); hl.arc(hx, hy, rad * 0.5, 0, TAU);
  }
  // Gärten
  for (const h of houses) if (h.garden) {
    g.save(); g.translate(h.x - x0, h.y - y0); g.rotate(h.ang);
    g.fillStyle = 'rgba(158,196,112,0.9)'; g.fillRect(-h.w / 2 - 1.5, h.side > 0 ? h.d / 2 + 1 : -h.d / 2 - 10, h.w + 3, 9);
    g.strokeStyle = 'rgba(70,108,52,0.6)'; g.lineWidth = 1; g.strokeRect(-h.w / 2 - 1.5, h.side > 0 ? h.d / 2 + 1 : -h.d / 2 - 10, h.w + 3, 9);
    g.restore();
  }
  g.fillStyle = 'rgba(14,30,12,0.34)'; g.fill(shadow);
  g.fillStyle = 'rgba(22,26,20,0.32)';
  for (const h of houses) {
    g.save(); g.translate(h.x - x0 + 2.4, h.y - y0 + 3.2); g.rotate(h.ang); g.fillRect(-h.w / 2, -h.d / 2, h.w, h.d); g.restore();
  }
  for (const h of houses) drawHouse(g, h, x0, y0);
  for (let i = 0; i < TREECOL.length; i++) { g.fillStyle = TREECOL[i]; g.fill(crowns[i]); }
  g.fillStyle = 'rgba(126,176,92,0.33)'; g.fill(hl);
  g.restore();
}

// =================== Ausschnitt (neu für den Simulator) ===================
const nodeIndex = (v) => Math.floor(v / RS);
/** Straßenstücke, deren Hülle das Rechteck berührt. */
function edgesIn(x0, y0, x1, y1) {
  const out = [];
  for (let j = nodeIndex(y0) - 1; j <= nodeIndex(y1) + 1; j++) for (let i = nodeIndex(x0) - 1; i <= nodeIndex(x1) + 1; i++) for (let dir = 0; dir < 2; dir++) {
    const e = getEdge(i, j, dir);
    if (e && e.x1 > x0 && e.x0 < x1 && e.y1 > y0 && e.y0 < y1) out.push(e);
  }
  return out;
}
/** Dörfer, deren Mittelpunkt im Rechteck liegt. */
function villagesIn(x0, y0, x1, y1) {
  const out = [];
  for (let j = nodeIndex(y0) - 1; j <= nodeIndex(y1) + 1; j++) for (let i = nodeIndex(x0) - 1; i <= nodeIndex(x1) + 1; i++) {
    const v = getVillage(i, j);
    if (v && v.x > x0 && v.x < x1 && v.y > y0 && v.y < y1) out.push(v);
  }
  return out;
}
/** Anteile von Wasser, Wald und Feldern im Rechteck (Raster 24 GE). */
function measure(x0, y0, w, h) {
  let n = 0, water = 0, forest = 0, field = 0;
  for (let y = y0 + 12; y < y0 + h; y += 24) for (let x = x0 + 12; x < x0 + w; x += 24) {
    n++; sampleT(x, y);
    if (T_w > 0) { water++; continue; }
    if (T_w < -0.012 && T_f > FOREST + 0.012) { forest++; continue; }
    fieldCell(x, y, vnoise(x * 0.0005 + 5, y * 0.0005 + 9, 41));
    if (cellField()) field++;
  }
  return { water: water / n, forest: forest / n, field: field / n };
}
/**
 * Wählt aus dem Seed einen Ausschnitt von w × h GE. Bis zu 128 Kandidaten; der erste, der alle Regeln erfüllt, gewinnt,
 * sonst der Kandidat mit den wenigsten Verstößen. Regeln: Wasser 8–22 %, Wald 25–50 %, Felder ≥ 12 %, ein Dorf mit
 * mindestens 8 Häusern ganz im Bild, mindestens zwei Straßenstücke, freie Wiese höchstens 30 %.
 */
function pickArea(seed, w, h) {
  const rng = mulberry32((seed >>> 0) * 2654435761 + 977);
  let best = null;
  for (let c = 0; c < 128; c++) {
    const ox = Math.round((rng() - 0.5) * 400000), oy = Math.round((rng() - 0.5) * 400000);
    const m = measure(ox, oy, w, h);
    const vill = villagesIn(ox, oy, ox + w, oy + h).filter((v) => v.houses.length >= 8 && v.x - v.rad > ox && v.x + v.rad < ox + w && v.y - v.rad > oy && v.y + v.rad < oy + h);
    const roads = edgesIn(ox, oy, ox + w, oy + h).length;
    const miss = (m.water < 0.08 || m.water > 0.22 ? 1 : 0) + (m.forest < 0.25 || m.forest > 0.5 ? 1 : 0) + (m.field < 0.12 ? 1 : 0) + (vill.length ? 0 : 1) + (roads >= 2 ? 0 : 1)
      + (1 - m.water - m.forest - m.field > 0.3 ? 1 : 0);
    if (!best || miss < best.miss) best = { x: ox, y: oy, w, h, miss, candidate: c, ...m, villages: vill.length, roads };
    if (!miss) break;
  }
  return best;
}
/** Zeichnet den Ausschnitt mit k Pixeln je GE auf ein neues Canvas. */
function renderArea(area, k) {
  const can = document.createElement('canvas');
  can.width = Math.ceil(area.w * k); can.height = Math.ceil(area.h * k);
  const g = can.getContext('2d', { alpha: false });
  const cx0 = Math.floor(area.x / CS), cy0 = Math.floor(area.y / CS), cx1 = Math.floor((area.x + area.w) / CS), cy1 = Math.floor((area.y + area.h) / CS);
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
    renderChunk(cx * CS, cy * CS, k, g, (cx * CS - area.x) * k, (cy * CS - area.y) * k);
  }
  return can;
}
EBS.CloudWarsTerrain = { hash2, vnoise, fbm, sampleT, isForestAt, isWaterAt, measure, pickArea, renderArea, edgesIn, villagesIn, CS, RS };
})();
