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
function isLakeAt(x, y) { sampleT(x, y); return LAKE - T_h > 0; }

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
// Leinwand erst beim ersten Zeichnen anlegen: so laufen Simulation und Casting-Skript auch ohne Browser
let baseCan = null, baseCtx = null, baseImg = null;
function renderBase(x0, y0) {
  if (!baseCan) { baseCan = document.createElement('canvas'); baseCan.width = baseCan.height = BR; baseCtx = baseCan.getContext('2d'); baseImg = baseCtx.createImageData(BR, BR); }
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
const CAR_PARK = ['#e9e4da', '#3b5f8f', '#b8423a', '#2f3338', '#8c8f96'];
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
      if (houses.length) {
        v = { x: nx, y: ny, rad, houses, plaza: houses.length >= 12 };
        // Kleine Zusätze aus festen Hashes (nicht aus rng): die Lage der Häuser und damit die Ausschnitte bleiben gleich
        houses.forEach((h, q) => {
          if (h.church) return;
          h.hip = hash2(k, q, 321) < 0.45;
          h.chimney = hash2(k, q, 322) < 0.75 ? (hash2(k, q, 323) - 0.5) * 0.55 : null;
          h.chimSide = hash2(k, q, 324) < 0.5 ? -1 : 1;
          h.solar = hash2(k, q, 325) < 0.16;
          h.parked = hash2(k, q, 326) < 0.22 ? CAR_PARK[Math.floor(hash2(k, q, 327) * CAR_PARK.length)] : null;
          h.fence = hash2(k, q, 328) < 0.7;
          h.beds = hash2(k, q, 329) < 0.45;
          h.gtree = hash2(k, q, 330) < 0.4;
        });
      }
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
/** Helligkeit einer Dachfläche mit lokaler Normalen (nx, ny) im Haus, das um ang gedreht ist; Licht von oben links. */
function facet(nx, ny, ang) {
  const c = Math.cos(ang), s = Math.sin(ang), wx = nx * c - ny * s, wy = nx * s + ny * c;
  return 0.945 - 0.2 * (wx * 0.55 + wy * 0.83);
}
function poly(g, pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); }
function drawHouse(g, h, x0, y0) {
  const c = ROOFS[h.roof], w = h.w, d = h.d, a = h.ang, hw = w / 2, hd = d / 2;
  g.save(); g.translate(h.x - x0, h.y - y0); g.rotate(a);
  if (h.hip) {
    // Walmdach: vier Flächen, First kürzer als das Haus
    const r = Math.max(0, hw - hd * 0.9);
    g.fillStyle = rgb(c, facet(0, -1, a)); poly(g, [-hw, -hd, hw, -hd, r, 0, -r, 0]);
    g.fillStyle = rgb(c, facet(0, 1, a)); poly(g, [-hw, hd, hw, hd, r, 0, -r, 0]);
    g.fillStyle = rgb(c, facet(-1, 0, a)); poly(g, [-hw, -hd, -r, 0, -hw, hd]);
    g.fillStyle = rgb(c, facet(1, 0, a)); poly(g, [hw, -hd, r, 0, hw, hd]);
    g.strokeStyle = rgb(c, 0.6); g.lineWidth = 0.45;
    g.beginPath(); g.moveTo(-hw, -hd); g.lineTo(-r, 0); g.lineTo(-hw, hd); g.moveTo(hw, -hd); g.lineTo(r, 0); g.lineTo(hw, hd); g.moveTo(-r, 0); g.lineTo(r, 0); g.stroke();
  } else {
    g.fillStyle = rgb(c, facet(0, -1, a)); g.fillRect(-hw, -hd, w, hd);
    g.fillStyle = rgb(c, facet(0, 1, a)); g.fillRect(-hw, 0, w, hd);
    g.fillStyle = rgb(c, 0.58); g.fillRect(-hw, -0.35, w, 0.7);
  }
  if (h.solar) {
    // Solarfeld auf der helleren Dachseite
    const sy = facet(0, -1, a) > facet(0, 1, a) ? -hd + 0.9 : 0.9;
    g.fillStyle = '#2c3e5c'; g.fillRect(-hw * 0.55, sy, hw * 1.1, hd - 1.8);
    g.strokeStyle = 'rgba(160,190,230,0.55)'; g.lineWidth = 0.25; g.beginPath();
    for (let q = 1; q < 4; q++) { const x = -hw * 0.55 + hw * 1.1 * q / 4; g.moveTo(x, sy); g.lineTo(x, sy + hd - 1.8); }
    g.stroke();
  }
  if (h.chimney !== null && h.chimney !== undefined) {
    const cx = h.chimney * w, cy = h.chimSide * hd * 0.42;
    g.fillStyle = 'rgba(30,20,15,0.3)'; g.fillRect(cx - 0.6, cy - 0.5, 2.1, 2.1);
    g.fillStyle = '#86604e'; g.fillRect(cx - 1, cy - 1, 2, 2);
    g.fillStyle = '#3a2c26'; g.fillRect(cx - 0.5, cy - 0.5, 1, 1);
  }
  if (h.church) {
    // Turm: quadratisch mit Pyramidendach und kleiner goldener Spitze
    const tx = hw + 2.5, s2 = 5;
    g.fillStyle = '#8f8a83'; g.fillRect(tx - s2, -s2, s2 * 2, s2 * 2);
    g.fillStyle = `rgb(${Math.round(150 * facet(0, -1, a))},${Math.round(146 * facet(0, -1, a))},${Math.round(140 * facet(0, -1, a))})`; poly(g, [tx - s2, -s2, tx + s2, -s2, tx, 0]);
    g.fillStyle = `rgb(${Math.round(150 * facet(0, 1, a))},${Math.round(146 * facet(0, 1, a))},${Math.round(140 * facet(0, 1, a))})`; poly(g, [tx - s2, s2, tx + s2, s2, tx, 0]);
    g.fillStyle = `rgb(${Math.round(150 * facet(-1, 0, a))},${Math.round(146 * facet(-1, 0, a))},${Math.round(140 * facet(-1, 0, a))})`; poly(g, [tx - s2, -s2, tx - s2, s2, tx, 0]);
    g.fillStyle = `rgb(${Math.round(150 * facet(1, 0, a))},${Math.round(146 * facet(1, 0, a))},${Math.round(140 * facet(1, 0, a))})`; poly(g, [tx + s2, -s2, tx + s2, s2, tx, 0]);
    g.fillStyle = '#e2bf4f'; g.beginPath(); g.arc(tx, 0, 0.75, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(30,20,15,0.25)'; g.lineWidth = 0.5; g.strokeRect(tx - s2, -s2, s2 * 2, s2 * 2);
  }
  g.strokeStyle = 'rgba(30,20,15,0.22)'; g.lineWidth = 0.6; g.strokeRect(-hw, -hd, w, d);
  g.restore();
}
/** Brückenstellen einer Straße: Abschnitte über Wasser (einmal je Straße berechnet, Länge entlang der Straße). */
function bridgeSpans(e) {
  if (e.spans) return e.spans;
  const out = [];
  let on = -1;
  for (let dd = 0; dd <= e.len; dd += 2.5) {
    const [x, y] = alongEdge(e, dd, false);
    sampleT(x, y);
    const wet = T_w > -0.002;
    if (wet && on < 0) on = dd;
    if (!wet && on >= 0) { out.push([Math.max(0, on - 4), Math.min(e.len, dd + 2)]); on = -1; }
  }
  if (on >= 0) out.push([Math.max(0, on - 4), e.len]);
  e.spans = out;
  return out;
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
  // Dörfer und Häuser in der Nähe (vor den Straßen, weil der Dorfplatz unter den Straßen liegt)
  const houses = [], plazas = [];
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const v = getVillage(i, j);
    if (!v || v.x + v.rad < bx0 || v.x - v.rad > bx1 || v.y + v.rad < by0 || v.y - v.rad > by1) continue;
    if (v.plaza) plazas.push(v);
    for (const h of v.houses) if (h.x > bx0 && h.x < bx1 && h.y > by0 && h.y < by1) houses.push(h);
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
  // Dorfplatz: gepflasterte Fläche, wo die Straßen sich treffen, mit einer Linde am Rand
  const lindens = [];
  for (const v of plazas) {
    const px = v.x - x0, py = v.y - y0;
    g.fillStyle = 'rgba(88,82,66,0.5)'; g.beginPath(); g.arc(px, py, 16.2, 0, TAU); g.fill();
    g.fillStyle = '#d3cbb6'; g.beginPath(); g.arc(px, py, 15, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(150,140,120,0.35)'; g.lineWidth = 0.6; g.beginPath(); g.arc(px, py, 10, 0, TAU); g.stroke();
    // Linde in die Richtung, die am weitesten von allen Straßen weg ist
    let best = -1, bx = 0, by = 0;
    for (let q = 0; q < 12; q++) {
      const ang = q / 12 * TAU + 0.13, cx = v.x + Math.cos(ang) * 11, cy = v.y + Math.sin(ang) * 11;
      let dmin = Infinity;
      for (const e of edges) for (let s = 0; s < e.pts.length; s += 2) dmin = Math.min(dmin, Math.hypot(e.pts[s] - cx, e.pts[s + 1] - cy));
      if (dmin > best) { best = dmin; bx = cx; by = cy; }
    }
    lindens.push([bx - x0, by - y0]);
    occMark(px, py, 15);
  }
  g.strokeStyle = '#d6cfbb'; g.lineWidth = 4; g.stroke(minor);
  g.strokeStyle = '#c9c3b3'; g.lineWidth = 6; g.stroke(major);
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 0.7; g.setLineDash([5, 6]); g.stroke(major); g.setLineDash([]);
  // Brücken: wo eine Straße Wasser quert, Schatten aufs Wasser, Geländer, heller Belag
  g.lineCap = 'butt';
  for (const e of edges) for (const [d0, d1] of bridgeSpans(e)) {
    const p = new Path2D();
    for (let dd = d0, first = true; dd <= d1 + 0.01; dd += 2, first = false) { const [x, y] = alongEdge(e, Math.min(dd, d1), false); first ? p.moveTo(x - x0, y - y0) : p.lineTo(x - x0, y - y0); }
    const wd = e.main ? 8.6 : 6.6;
    g.save(); g.translate(1.6, 2.4); g.strokeStyle = 'rgba(16,36,46,0.3)'; g.lineWidth = wd + 1; g.stroke(p); g.restore();
    g.strokeStyle = '#6f685d'; g.lineWidth = wd + 1.6; g.stroke(p);
    g.strokeStyle = '#d9d1bd'; g.lineWidth = wd - 0.6; g.stroke(p);
    g.strokeStyle = 'rgba(120,110,95,0.5)'; g.lineWidth = 0.4; g.setLineDash([0.4, 3.2]); g.lineWidth = wd + 0.8; g.stroke(p); g.setLineDash([]);
    g.strokeStyle = '#d9d1bd'; g.lineWidth = wd - 1.2; g.stroke(p);
  }
  g.lineCap = 'round';
  for (const h of houses) occMark(h.x - x0, h.y - y0, h.church ? 19 : 11);
  // Bäume
  const shadow = new Path2D(), hl = new Path2D(), crowns = TREECOL.map(() => new Path2D());
  const tree = (lx, ly, rad, ci) => {
    const sx = lx + rad * 0.9 + 1.2, sy = ly + rad * 1.25 + 1.6;
    shadow.moveTo(sx + rad * 1.05, sy); shadow.arc(sx, sy, rad * 1.05, 0, TAU);
    const cp = crowns[ci];
    cp.moveTo(lx + rad, ly); cp.arc(lx, ly, rad, 0, TAU);
    const hx = lx - rad * 0.32, hy = ly - rad * 0.36;
    hl.moveTo(hx + rad * 0.5, hy); hl.arc(hx, hy, rad * 0.5, 0, TAU);
  };
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
    tree(lx, ly, rad, Math.floor(hash2(gx, gy, 505) * TREECOL.length));
  }
  for (const [lx, ly] of lindens) tree(lx, ly, 5.2, 4);
  // Gärten: Rasen, Zaun oder Hecke, Beete, manchmal ein Obstbaum; vorn am Haus manchmal ein geparktes Auto
  for (const h of houses) {
    if (!h.garden && !h.parked) continue;
    g.save(); g.translate(h.x - x0, h.y - y0); g.rotate(h.ang);
    if (h.garden) {
      const gx = -h.w / 2 - 1.5, gy = h.side > 0 ? h.d / 2 + 1 : -h.d / 2 - 10, gw = h.w + 3;
      g.fillStyle = 'rgba(158,196,112,0.9)'; g.fillRect(gx, gy, gw, 9);
      if (h.beds) {
        g.fillStyle = 'rgba(122,92,62,0.55)';
        for (let q = 0; q < 3; q++) g.fillRect(gx + gw * 0.52, gy + 1.4 + q * 2.4, gw * 0.4, 1.1);
      }
      if (h.fence) { g.strokeStyle = 'rgba(238,230,208,0.9)'; g.lineWidth = 0.45; g.strokeRect(gx, gy, gw, 9); }
      else { g.strokeStyle = 'rgba(62,104,48,0.75)'; g.lineWidth = 1.2; g.strokeRect(gx, gy, gw, 9); }
      if (h.gtree) {
        // Obstbaum in der Gartenecke (Weltlage für die Baumschicht zurückrechnen)
        const lx = gx + 3, ly = gy + 4.5, c = Math.cos(h.ang), s = Math.sin(h.ang);
        tree(h.x - x0 + lx * c - ly * s, h.y - y0 + lx * s + ly * c, 2.6, 6);
      }
    }
    if (h.parked) {
      const py = h.side > 0 ? -h.d / 2 - 2 : h.d / 2 + 2, px = h.w * 0.28;
      g.fillStyle = 'rgba(20,20,20,0.28)'; g.fillRect(px - 2, py - 0.6, 5, 2.4);
      g.fillStyle = h.parked; g.fillRect(px - 2.4, py - 1.1, 4.8, 2.2);
      g.fillStyle = 'rgba(40,50,60,0.55)'; g.fillRect(px + 0.4, py - 0.9, 1.2, 1.8);
    }
    g.restore();
  }
  g.fillStyle = 'rgba(14,30,12,0.34)'; g.fill(shadow);
  g.fillStyle = 'rgba(22,26,20,0.32)';
  for (const h of houses) {
    g.save(); g.translate(h.x - x0 + 2.4, h.y - y0 + 3.2); g.rotate(h.ang); g.fillRect(-h.w / 2, -h.d / 2, h.w, h.d);
    if (h.church) { g.translate(4, 6); g.fillRect(h.w / 2 - 2.5, -5, 10, 10); }        // Turm wirft einen längeren Schatten
    g.restore();
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
 * Wählt aus dem Seed einen Ausschnitt von w × h GE. Bis zu 256 Kandidaten, jeder um ein passendes Dorf gelegt; der erste, der alle Regeln erfüllt, gewinnt,
 * sonst der Kandidat mit den wenigsten Verstößen. Regeln: Wasser 8–22 %, Wald 25–50 %, Felder ≥ 12 %, ein Dorf mit
 * mindestens 8 Häusern ganz im Bild, mindestens zwei Straßenstücke, freie Wiese höchstens 30 %.
 */
function pickArea(seed, w, h) {
  const rng = mulberry32((seed >>> 0) * 2654435761 + 977);
  let best = null;
  for (let c = 0; c < 256; c++) {
    // Kandidat um ein passendes Dorf legen: zufälliger Punkt, nächstes Dorf mit 8+ Häusern, das ins Bild passt
    const px = (rng() - 0.5) * 400000, py = (rng() - 0.5) * 400000, jx = rng() - 0.5, jy = rng() - 0.5;
    let ox = Math.round(px - w / 2), oy = Math.round(py - h / 2), near = Infinity;
    for (let j = nodeIndex(py) - 3; j <= nodeIndex(py) + 3; j++) for (let i = nodeIndex(px) - 3; i <= nodeIndex(px) + 3; i++) {
      const v = getVillage(i, j);
      if (!v || v.houses.length < 8 || 2 * v.rad + 40 > Math.min(w, h)) continue;
      const d = Math.hypot(v.x - px, v.y - py);
      if (d >= near) continue;
      near = d;
      ox = Math.round(v.x - w / 2 + jx * (w - 2 * v.rad - 40)); oy = Math.round(v.y - h / 2 + jy * (h - 2 * v.rad - 40));
    }
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
// =================== Für das Leben am Boden (Darstellung) ===================
const riverAt = (x, y) => fbm(x * 0.00045 + 31.7, y * 0.00045 - 12.3, 23, 3);
/** Folgt der Flussmitte (Höhenlinie T_r = 0,5) ab (x, y) in Richtung dir; Punkte x, y, halbe Breite, See (1/0). */
function traceRiver(x, y, dir, box) {
  const out = [], sx = x, sy = y;
  for (let s = 0; s < 1600; s++) {
    let gx = 0, gy = 0;
    for (let q = 0; q < 3; q++) {
      const v = riverAt(x, y) - 0.5;
      gx = (riverAt(x + 1, y) - riverAt(x - 1, y)) / 2; gy = (riverAt(x, y + 1) - riverAt(x, y - 1)) / 2;
      const g2 = gx * gx + gy * gy || 1e-12;
      if (q < 2) { x -= v * gx / g2; y -= v * gy / g2; }
    }
    const gl = Math.hypot(gx, gy) || 1e-9;
    sampleT(x, y);
    out.push(x, y, RIVW / gl, LAKE - T_h > 0 ? 1 : 0);
    if (x < box[0] || y < box[1] || x > box[2] || y > box[3]) break;
    if (s > 30 && Math.hypot(x - sx, y - sy) < 5) { out.closed = true; break; }
    x += -gy / gl * dir * 4; y += gx / gl * dir * 4;
  }
  return out;
}
/** Flussmittellinien im Ausschnitt (Ortskoordinaten): [{ pts: [x, y, halbe Breite, See, …] }]. */
function riverLines(area) {
  const G = 16, nx = Math.ceil(area.w / G) + 1, ny = Math.ceil(area.h / G) + 1, val = new Float32Array(nx * ny), used = new Uint8Array(nx * ny);
  const box = [area.x - 70, area.y - 70, area.x + area.w + 70, area.y + area.h + 70];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) val[j * nx + i] = riverAt(area.x + i * G, area.y + j * G) - 0.5;
  const lines = [];
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const k = j * nx + i, a = val[k];
    if (used[k] || lines.length >= 4) continue;
    let b = val[k + 1], px = 1, py = 0;
    if (a * b > 0) { b = val[k + nx]; px = 0; py = 1; }
    if (a * b > 0) continue;
    const f = a / (a - b), x = area.x + (i + px * f) * G, y = area.y + (j + py * f) * G;
    const fw = traceRiver(x, y, 1, box), bw = fw.closed ? [] : traceRiver(x, y, -1, box);
    const pts = [];
    for (let q = bw.length - 4; q >= 4; q -= 4) pts.push(bw[q], bw[q + 1], bw[q + 2], bw[q + 3]);
    for (let q = 0; q < fw.length; q++) pts.push(fw[q]);
    for (let q = 0; q < pts.length; q += 4) {
      const ci = Math.round((pts[q] - area.x) / G), cj = Math.round((pts[q + 1] - area.y) / G);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const ii = ci + di, jj = cj + dj;
        if (ii >= 0 && jj >= 0 && ii < nx && jj < ny) used[jj * nx + ii] = 1;
      }
      pts[q] -= area.x; pts[q + 1] -= area.y;
    }
    if (pts.length >= 40) lines.push({ pts });
  }
  return lines;
}
/** Bodenart an einem Weltpunkt: water, forest, field (mit Parzelle) oder meadow. */
function groundAt(x, y) {
  sampleT(x, y);
  if (T_w > -0.006) return { kind: 'water' };
  if (T_f > FOREST - 0.03) return { kind: 'forest' };
  fieldCell(x, y, vnoise(x * 0.0005 + 5, y * 0.0005 + 9, 41));
  if (!cellField()) return { kind: 'meadow' };
  const cs = FANG[F_ri], uc = (F_iu + (F_m ? 1 : 0.5)) * FCU, vc = (F_iv + 0.5) * FCV;
  let ti = 0; while (F_id > FT[ti][0]) ti++;
  return { kind: 'field', key: `${F_ri}:${F_iu}:${F_iv}`, cx: uc * cs[0] - vc * cs[1], cy: uc * cs[1] + vc * cs[0],
    ang: Math.atan2(cs[1], cs[0]), len: (F_m ? 2 : 1) * FCU, wid: FCV, type: ti, color: FT[ti].slice(1, 4), pattern: FT[ti][4] };
}

EBS.CloudWarsTerrain = { hash2, vnoise, fbm, sampleT, isForestAt, isWaterAt, measure, pickArea, renderArea, edgesIn, villagesIn, riverLines, groundAt, isLakeAt, CS, RS };
})();
