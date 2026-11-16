/*
 * Marble Factory XL – Entwurfsbild der Produktionslinie (Vorschau, kein laufendes Szenario)
 *
 * Zeichnet eine Halle mit einer Kette verschiedener Maschinen im Stil der klassischen Kugelfabrik:
 * Rohkugeln -> Waschtrommel -> Polierer -> Ofen -> Farbstation -> Kühlstrecke -> Prüfung -> Radaufzug -> Sortierung.
 * Die Kugeln sind von Hand gesetzt und zeigen ihren Zustand an jeder Station. Dient der Freigabe des Aussehens,
 * bevor die Maschinen einzeln mit Simulation gebaut werden.
 */
(function () {
'use strict';
const C = EBS.MarbleClassic, K = C.kit, R = C.R, COLORS = C.COLORS;
const { lin, rad, shadow, noShadow, rr, circ, css, STEEL, STEEL_DARK, CYL, BRASS_CYL, BRASS, TUBE_OUT,
  plate, bolt, band, tubesBack, tubesFront, rod, collar, post, hopperPath, drawGear, drawBall, drawSwirl, drawGloss, buildPath, pathAt } = K;
const TAU = Math.PI * 2, HALF_PI = Math.PI / 2;
const W = 3840, H = 2160, FLOOR = 2080, DECK = 1010;
const FONT = 'Bahnschrift, "Segoe UI", Arial, sans-serif';
const P = { x: 0, y: 0, tx: 1, ty: 0 };
let T = 0, FLOW = null;                                          // Bildzeit in Sekunden, Kugeln des aktuellen Bildes

// ---------------------------------------------------------------- Kugeln in ihren Zuständen
const RAW = 0x5c5145, WASHED = 0x8496aa, CLEAR = 0x93c4e8;
const texCache = new Map();
function ballTex(hex, gloss, swirl) {
  const key = hex + '|' + gloss + '|' + swirl;
  if (texCache.has(key)) return texCache.get(key);
  const c0 = R + 3, S = 2, cv = document.createElement('canvas'); cv.width = cv.height = 2 * c0 * S;
  const g = cv.getContext('2d'); g.scale(S, S);
  drawBall(g, c0, hex);
  if (swirl) { g.save(); g.globalAlpha = swirl; drawSwirl(g, c0); g.restore(); }
  if (gloss) { g.save(); g.globalAlpha = gloss; drawGloss(g, c0); g.restore(); }
  if (!gloss) {                                      // rohe Kugel: matte Oberfläche mit Sprenkeln
    g.save(); circ(g, c0, c0, R - 1); g.clip();
    for (let k = 0; k < 26; k++) { const a = k * 2.399, d = Math.sqrt((k + 0.5) / 26) * (R - 3); circ(g, c0 + Math.cos(a) * d, c0 + Math.sin(a) * d, 0.9 + (k % 3) * 0.5); g.fillStyle = k % 2 ? 'rgba(0,0,0,.28)' : 'rgba(255,255,255,.16)'; g.fill(); }
    g.restore();
  }
  texCache.set(key, cv); return cv;
}
function glow(g, x, y, hex, a, r) {
  g.save(); g.globalCompositeOperation = 'lighter';
  g.fillStyle = rad(g, x, y, 0, x, y, r, [[0, css(hex, a)], [0.5, css(hex, a * 0.4)], [1, css(hex, 0)]]);
  g.fillRect(x - r, y - r, 2 * r, 2 * r); g.restore();
}
/** kind: raw | washed | clear | color; heat 0..1 lässt die Kugel orange glühen */
function marble(g, x, y, kind, color = 0, heat = 0) {
  const c0 = R + 3;
  const hex = kind === 'raw' ? RAW : kind === 'washed' ? WASHED : kind === 'clear' ? CLEAR : COLORS[color].hex;
  if (kind === 'color') glow(g, x, y, hex, 0.30 * (1 - heat * 0.6), R * 2.1);
  if (kind === 'clear' && heat < 0.05) glow(g, x, y, 0xbfe4ff, 0.10, R * 1.7);
  if (heat > 0.02) glow(g, x, y, 0xff8a2a, 0.55 * heat, R * 2.8);
  const t = ballTex(hex, kind === 'raw' ? 0 : kind === 'washed' ? 0.75 : 1, kind === 'color' ? 0.6 : kind === 'clear' ? 0.4 : 0);
  g.drawImage(t, x - c0, y - c0, 2 * c0, 2 * c0);
  if (kind === 'washed') for (const [dx, dy, r] of [[-8, -9, 2.6], [7, -2, 1.7], [-2, 9, 2.1], [10, 9, 1.4]]) { circ(g, x + dx, y + dy, r); g.fillStyle = 'rgba(190,242,255,.9)'; g.fill(); }
  if (kind === 'clear' && heat < 0.05) sparkle(g, x - R * 0.44, y - R * 0.48, 14);
  if (heat > 0.02) {
    g.save(); circ(g, x, y, R); g.clip(); g.globalCompositeOperation = 'lighter';
    g.fillStyle = rad(g, x, y, 0, x, y, R, [[0, `rgba(255,236,190,${0.75 * heat})`], [0.7, `rgba(255,140,40,${0.6 * heat})`], [1, `rgba(255,90,20,${0.35 * heat})`]]);
    g.fillRect(x - R, y - R, 2 * R, 2 * R); g.restore();
  }
}

// ---------------------------------------------------------------- kleine Bausteine
function gearAt(g, x, y, z, m, o) { g.save(); g.translate(x, y); if (o && o.rot) g.rotate(o.rot); drawGear(g, 0, z, m, o); g.restore(); }
function nameplate(g, x, y, text, w = 0) {
  g.save(); g.font = `700 14px ${FONT}`; const tw = w || g.measureText(text).width + 28;
  rr(g, x, y, tw, 24, 4); g.fillStyle = lin(g, 0, y, 0, y + 24, BRASS); g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = 'rgba(40,24,4,.88)'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x + tw / 2, y + 13); g.restore();
}
function neon(g, x, y, a, b, size, frame = true) {
  g.save(); g.font = `800 ${size}px ${FONT}`; g.textBaseline = 'middle'; g.textAlign = 'left';
  try { g.letterSpacing = Math.round(size * 0.07) + 'px'; } catch (e) { /* ältere Browser */ }
  const wa = g.measureText(a).width, wb = g.measureText(b).width, total = wa + wb, tw = total + size, th = size + size * 0.7;
  if (frame) {
    rr(g, x - tw / 2, y - th / 2, tw, th, 14); g.fillStyle = 'rgba(10,14,21,.86)'; g.fill(); g.strokeStyle = 'rgba(74,87,103,.9)'; g.lineWidth = 2; g.stroke();
    rr(g, x - tw / 2 + 7, y - th / 2 + 7, tw - 14, th - 14, 9); g.strokeStyle = 'rgba(34,211,238,.35)'; g.lineWidth = 1.5; g.stroke();
  }
  for (const [txt, px, fill, glw] of [[a, x - total / 2, '#eafcff', 'rgba(34,211,238,.95)'], [b, x - total / 2 + wa, '#ffe1f1', 'rgba(255,63,158,.95)']]) {
    g.shadowColor = glw; g.shadowBlur = size * 0.32; g.fillStyle = fill; g.fillText(txt, px, y + 2); g.fillText(txt, px, y + 2);
  }
  g.restore();
}
function led(g, x, y, hex, r = 5) { glow(g, x, y, hex, 0.9, r * 4); circ(g, x, y, r); g.fillStyle = css(hex, 1); g.fill(); circ(g, x - r * 0.3, y - r * 0.3, r * 0.35); g.fillStyle = 'rgba(255,255,255,.8)'; g.fill(); }
function gauge(g, gx, gy, gr, val) {
  circ(g, gx, gy, gr + 5); g.fillStyle = lin(g, gx - gr, gy - gr, gx + gr, gy + gr, BRASS); g.fill(); g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 1.2; g.stroke();
  circ(g, gx, gy, gr); g.fillStyle = rad(g, gx, gy - gr * 0.3, 2, gx, gy, gr, [[0, '#f4f1e6'], [1, '#bdb8a6']]); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(30,30,30,.8)'; g.lineWidth = 1.2;
  for (let k = 0; k <= 10; k++) { const a = Math.PI * 0.75 + (k / 10) * Math.PI * 1.5; g.beginPath(); g.moveTo(gx + Math.cos(a) * gr * 0.78, gy + Math.sin(a) * gr * 0.78); g.lineTo(gx + Math.cos(a) * gr * 0.93, gy + Math.sin(a) * gr * 0.93); g.stroke(); }
  g.beginPath(); g.arc(gx, gy, gr * 0.86, Math.PI * 1.95, Math.PI * 2.25); g.strokeStyle = 'rgba(220,50,40,.9)'; g.lineWidth = 3; g.stroke();
  const a = Math.PI * 0.75 + val * Math.PI * 1.5;
  g.save(); g.lineCap = 'round'; g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + Math.cos(a) * gr * 0.8, gy + Math.sin(a) * gr * 0.8); g.strokeStyle = '#c22a1e'; g.lineWidth = 2.2; g.stroke(); g.restore();
  circ(g, gx, gy, 3.2); g.fillStyle = '#2a2a2a'; g.fill();
}
function glassPane(g, x, y, w, h, r) {            // dunkle Kammer mit Glas davor (Rückseite)
  g.save(); shadow(g, 10, 3, 5, 0.5); rr(g, x, y, w, h, r); g.fillStyle = lin(g, 0, y, 0, y + h, [[0, '#070a0f'], [1, '#121821']]); g.fill(); g.restore();
  rr(g, x, y, w, h, r); g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 2.5; g.stroke();
}
function glassShine(g, x, y, w, h, r) {           // Reflexe auf dem Glas (Vorderseite)
  g.save(); rr(g, x, y, w, h, r); g.clip();
  g.fillStyle = 'rgba(255,255,255,.07)';
  for (const [o, wd] of [[0.12, 0.10], [0.30, 0.035], [0.72, 0.07]]) { g.beginPath(); g.moveTo(x + w * o + h * 0.35, y); g.lineTo(x + w * (o + wd) + h * 0.35, y); g.lineTo(x + w * (o + wd), y + h); g.lineTo(x + w * o, y + h); g.fill(); }
  g.restore();
  rr(g, x + 1.5, y + 1.5, w - 3, h - 3, Math.max(0, r - 1.5)); g.strokeStyle = 'rgba(176,220,246,.38)'; g.lineWidth = 2; g.stroke();
}
function vents(g, x, y, w, n) { for (let i = 0; i < n; i++) { rr(g, x, y + i * 13, w, 7, 3.5); g.fillStyle = lin(g, 0, y + i * 13, 0, y + i * 13 + 7, [[0, '#0d1116'], [1, '#2c343e']]); g.fill(); } }
function cornerBolts(g, x, y, w, h, r = 3.8, inset = 11) { for (const [bx, by] of [[x + inset, y + inset], [x + w - inset, y + inset], [x + inset, y + h - inset], [x + w - inset, y + h - inset]]) bolt(g, bx, by, r); }

// ---------------------------------------------------------------- Halle mit Zwischendeck
function hall(g) {
  g.fillStyle = lin(g, 0, 0, 0, FLOOR, [[0, '#070a10'], [0.45, '#111822'], [1, '#0b0f16']]); g.fillRect(0, 0, W, FLOOR);
  const pw = 240, ph = 260; let k = 0;
  for (let x = -pw; x < W + pw; x += pw) for (let y = -20; y < FLOOR; y += ph) {
    const ox = (Math.round(y / ph) % 2) * (pw / 2);
    g.fillStyle = `rgba(255,255,255,${(0.003 + ((k++ * 37) % 19) * 0.0011).toFixed(4)})`; g.fillRect(x + ox + 2, y + 2, pw - 4, ph - 4);
    g.strokeStyle = 'rgba(0,0,0,.42)'; g.lineWidth = 2; g.strokeRect(x + ox, y, pw, ph);
    g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 1; g.strokeRect(x + ox + 2.5, y + 2.5, pw - 5, ph - 5);
    g.fillStyle = 'rgba(0,0,0,.5)';
    for (const [dx, dy] of [[12, 12], [pw - 12, 12], [12, ph - 12], [pw - 12, ph - 12]]) { circ(g, x + ox + dx, y + dy, 2.4); g.fill(); }
  }
  for (let x = 420; x < W; x += 560) {              // Träger im Hintergrund
    g.fillStyle = lin(g, x - 26, 0, x + 26, 0, [[0, '#0b0f15'], [0.3, '#1c242f'], [0.5, '#283241'], [0.7, '#1a212b'], [1, '#090c11']]);
    g.fillRect(x - 26, -20, 52, FLOOR + 20);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x - 34, -20, 8, FLOOR + 20); g.fillRect(x + 26, -20, 8, FLOOR + 20);
  }
  for (const [yy, hh] of [[452, 22], [492, 12], [1490, 20], [1528, 12]]) {   // ferne Rohrleitungen
    g.fillStyle = lin(g, 0, yy, 0, yy + hh, [[0, '#0d1219'], [0.3, '#2c3848'], [0.5, '#3a485b'], [1, '#0b0f15']]);
    g.globalAlpha = 0.7; g.fillRect(-20, yy, W + 40, hh);
    for (let x = 90; x < W; x += 310) { g.fillStyle = '#222b38'; g.fillRect(x, yy - 4, 12, hh + 8); }
    g.globalAlpha = 1;
  }
  const lamps = [[640, 8], [1240, 8], [2240, 8], [3420, 8], [900, DECK + 34], [1900, DECK + 34], [2620, DECK + 34], [3620, DECK + 34]];
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const [lx, ly] of lamps) { g.fillStyle = rad(g, lx, ly - 40, 20, lx, ly + 150, 880, [[0, 'rgba(255,186,110,.14)'], [0.4, 'rgba(255,160,90,.045)'], [1, 'rgba(255,150,80,0)']]); g.fillRect(lx - 900, ly - 60, 1800, 1100); }
  g.restore();
  // Boden mit Warnstreifen
  g.fillStyle = lin(g, 0, FLOOR, 0, H, [[0, '#232c38'], [0.2, '#161c25'], [1, '#07090d']]); g.fillRect(0, FLOOR, W, H - FLOOR);
  g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(0, FLOOR, W, 1.5);
  stripe(g, 0, FLOOR + 6, W);
  return lamps;
}
function stripe(g, x, y, w) {
  g.save(); g.beginPath(); g.rect(x, y, w, 9); g.clip(); g.fillStyle = '#c99a1e'; g.fillRect(x, y - 6, w, 30); g.fillStyle = '#14171c';
  for (let sx = x - 40; sx < x + w + 40; sx += 34) { g.beginPath(); g.moveTo(sx, y + 10); g.lineTo(sx + 12, y - 2); g.lineTo(sx + 29, y - 2); g.lineTo(sx + 17, y + 10); g.fill(); }
  g.restore(); g.fillStyle = 'rgba(0,0,0,.30)'; g.fillRect(x, y, w, 9);
}
function lampBars(g, lamps) {
  for (const [lx, ly] of lamps) {
    plate(g, lx - 130, ly, 260, 20, 6, { stops: STEEL_DARK, blur: 8 });
    g.save(); g.shadowColor = 'rgba(255,190,110,.9)'; g.shadowBlur = 26; rr(g, lx - 116, ly + 14, 232, 7, 3.5); g.fillStyle = '#ffe9c4'; g.fill(); g.restore();
  }
}
function deck(g) {                                 // Zwischendeck aus Stahl
  for (const x of [352, 2155, 2968, 3792]) post(g, x, DECK + 26, FLOOR + 12, 24);
  plate(g, 318, DECK, W - 300, 30, 5, { stops: [[0, '#4c5764'], [0.5, '#2f3741'], [1, '#191e25']], blur: 22, sa: 0.6 });
  stripe(g, 322, DECK + 19, W - 322);
  for (let x = 350; x < W; x += 120) bolt(g, x, DECK + 9, 3.2);
}

// ---------------------------------------------------------------- Bahnen (Kugelmitte)
const PATHS = {
  shaft: buildPath([[222, 1986], [222, 300]]),
  top: buildPath([[222, 300], [222, 258], [274, 244], [442, 308], [470, 360]], 36),
  feed: buildPath([[650, 645], [650, 705], [946, 800]], 44),
  drumOut: buildPath([[1276, 800], [1392, 800]]),
  polIn: buildPath([[1716, 800], [1832, 800]]),
  polOut: buildPath([[2108, 800], [2356, 800]]),
  drop: buildPath([[3240, 800], [3590, 800], [3680, 890], [3680, 1330], [3590, 1440], [3450, 1440]], 80),
  colourOut: buildPath([[3150, 1440], [2960, 1440]]),
  cool: buildPath([[2960, 1440], [2300, 1478], [2300, 1598], [2860, 1636], [2860, 1756], [2120, 1800], [1996, 1806]], 58),
  toWheel: buildPath([[1996, 1806], [1900, 1800], [1812, 1722]], 50),
  sortRail: buildPath([[1470, 1350], [1400, 1356], [560, 1404]], 30),
};
const COLS = [1280, 1150, 1020, 890, 760, 630].map((x) => {
  const yRail = 1356 + (1400 - x) * (48 / 840);
  return { x, yRail, path: buildPath([[x, yRail + 6], [x, 2004]]) };
});
const at = (p, f) => pathAt(p, p.len * f, { x: 0, y: 0, tx: 1, ty: 0 });

// ---------------------------------------------------------------- Stationen: Rückseite / Vorderseite
const WHEEL = { x: 650, y: 603, r: 62, rp: 42 }, HOP = { x: 650, rim: 330, neckHw: 27, xl: 420, xr: 677, shoulder: 425, neckTop: 511, neckBot: 541 };
const LIFT = { cx: 150, rs: 40, top: 250, bot: 1950, ballX: 222 };
const DRUM = { x: 1110, y: 700, r: 185 }, BELT = { x0: 1400, x1: 1700, cy: 861 };
const POL = { x: 1790, y: 590, w: 360, h: 400 }, KILN = { x: 2340, y: 680, w: 920, h: 240 };
const TANKS = [3040, 3140, 3240, 3340, 3440, 3540], CRADLE = { x: 3300, y: 1440 };
const BIG = { x: 1640, y: 1530, r: 280, rp: 236 };

function liftBack(g) {
  const lf = LIFT, sx = lf.cx - lf.rs - 66, sw = lf.ballX + TUBE_OUT + 18 - sx, sy0 = lf.top - lf.rs - 62, sy1 = lf.bot + lf.rs + 62;
  plate(g, sx, sy0, sw, sy1 - sy0, 26, { stops: [[0, '#2e3640'], [0.5, '#222830'], [1, '#161a20']], blur: 24 });
  rr(g, sx + 12, sy0 + 12, sw - 24, sy1 - sy0 - 24, 18); g.fillStyle = lin(g, sx, 0, sx + sw, 0, [[0, '#0a0d12'], [0.5, '#141a22'], [1, '#0a0d12']]); g.fill(); g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 2; g.stroke();
  for (let y = lf.top + 30; y < lf.bot - 20; y += 92) { g.fillStyle = 'rgba(255,255,255,.03)'; g.fillRect(sx + 14, y, sw - 28, 2); g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(sx + 14, y + 2, sw - 28, 2); }
  // Kette, Kettenräder, Träger
  g.save(); g.strokeStyle = '#59636f'; g.lineWidth = 6; g.setLineDash([11, 4]); g.lineDashOffset = -T * LIFT_V;
  g.beginPath(); g.moveTo(lf.cx + lf.rs, lf.bot); g.lineTo(lf.cx + lf.rs, lf.top); g.arc(lf.cx, lf.top, lf.rs, 0, Math.PI, true); g.lineTo(lf.cx - lf.rs, lf.bot); g.arc(lf.cx, lf.bot, lf.rs, Math.PI, 0, true); g.stroke(); g.restore();
  for (const y of [lf.top, lf.bot]) gearAt(g, lf.cx, y, 14, 5, { rot: -T * LIFT_V / lf.rs });
  for (let k = 0; k < 9; k++) carrier(g, lf.cx + lf.rs, lf.bot - 30 - mod(k * 185 + T * LIFT_V, 1665), 1);
  for (let k = 0; k < 9; k++) carrier(g, lf.cx - lf.rs, lf.top + 5 + mod(k * 185 + T * LIFT_V, 1665), -1);
}
function carrier(g, x, y, dir) {
  g.save(); g.translate(x, y); g.scale(dir, 1);
  g.beginPath(); g.moveTo(-4, -7); g.lineTo(48, -4.5); g.lineTo(50, -13); g.lineTo(53.5, -13); g.lineTo(52, 3); g.lineTo(-4, 3); g.closePath();
  g.fillStyle = lin(g, 0, -8, 0, 4, [[0, '#fff0b8'], [0.35, '#dba744'], [1, '#7c4f16']]); g.fill(); g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 1.2; g.stroke();
  rr(g, -8, -12, 17, 22, 4); g.fillStyle = lin(g, 0, -12, 0, 10, STEEL); g.fill(); g.stroke(); g.restore();
}
function hopperBack(g) {
  const h = HOP, w = WHEEL;
  for (const x of [h.xl - 26, h.x + 176]) post(g, x, h.shoulder - 30, DECK + 4, 20);
  plate(g, h.xl - 42, h.shoulder - 44, h.x + 176 - h.xl + 58, 16, 4, { stops: STEEL_DARK });
  g.save(); shadow(g, 22, 8, 14, 0.5); hopperPath(g, h); g.fillStyle = 'rgba(8,15,24,.80)'; g.fill(); g.restore();
  g.save(); shadow(g, 18, 6, 10, 0.55); circ(g, w.x, w.y, w.r + 15); g.fillStyle = '#12171e'; g.fill(); g.restore();
  circ(g, w.x, w.y, w.r + 2); g.fillStyle = rad(g, w.x, w.y, 10, w.x, w.y, w.r, [[0, '#0d1117'], [1, '#05070a']]); g.fill();
  // Rotor mit vier Taschen
  g.save(); g.translate(w.x, w.y); g.rotate((T / PERIOD) * HALF_PI);
  circ(g, 0, 0, w.r - 1); g.fillStyle = rad(g, 0, 0, 6, 0, 0, w.r, [[0, '#2b323b'], [0.6, '#56616d'], [0.92, '#a3aeba'], [1, '#5c6672']]); g.fill();
  for (let k = 0; k < 4; k++) { circ(g, Math.cos(k * HALF_PI) * w.rp, Math.sin(k * HALF_PI) * w.rp, R + 3.5); g.fillStyle = '#06080b'; g.fill(); g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 2; g.stroke(); }
  g.restore();
}
function hopperFront(g) {
  const h = HOP, w = WHEEL;
  g.save(); g.lineJoin = 'round';
  hopperPath(g, h, true); g.lineWidth = 8; g.strokeStyle = 'rgba(3,7,12,.8)'; g.stroke();
  hopperPath(g, h, true); g.lineWidth = 4; g.strokeStyle = 'rgba(176,220,246,.66)'; g.stroke(); g.restore();
  plate(g, h.xl - 14, h.rim - 24, h.xr - h.xl + 28, 28, 7, { blur: 12 });
  for (let x = h.xl + 60; x <= h.xr - 3; x += (h.xr - h.xl - 8) / 6) bolt(g, x, h.rim - 10, 4.2);
  band(g, h.x, h.neckTop + 4, 12, h.neckHw + 12, HALF_PI, BRASS_CYL);
  g.save(); shadow(g, 10, 3, 6, 0.5); g.beginPath(); g.arc(w.x, w.y, w.r + 17, 0, TAU); g.arc(w.x, w.y, w.r + 3, 0, TAU, true);
  g.fillStyle = lin(g, w.x - w.r, w.y - w.r, w.x + w.r, w.y + w.r, [[0, '#8c98a6'], [0.45, '#48515d'], [1, '#1f242c']]); g.fill('evenodd'); g.restore();
  for (let k = 0; k < 8; k++) { const a = (k + 0.5) * TAU / 8; bolt(g, w.x + Math.cos(a) * (w.r + 10), w.y + Math.sin(a) * (w.r + 10), 3.4); }
  circ(g, w.x, w.y, 13); g.fillStyle = rad(g, w.x - 4, w.y - 5, 1, w.x, w.y, 13, [[0, '#fff3c4'], [0.6, '#d19c3a'], [1, '#6e4613']]); g.fill(); g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 1.5; g.stroke();
  band(g, w.x, w.y + w.r + 24, 13, TUBE_OUT + 7, HALF_PI, BRASS_CYL);
}

function drumBack(g) {
  const d = DRUM;
  for (const x of [d.x - 150, d.x + 150]) post(g, x, d.y + 120, DECK + 4, 22);
  g.save(); g.strokeStyle = 'rgba(70,82,96,.6)'; g.lineWidth = 8; g.lineCap = 'round'; shadow(g, 8, 4, 4, 0.4);
  g.beginPath(); g.moveTo(d.x - 150, d.y + 150); g.lineTo(d.x + 150, DECK - 20); g.moveTo(d.x + 150, d.y + 150); g.lineTo(d.x - 150, DECK - 20); g.stroke(); g.restore();
  g.save(); shadow(g, 26, 8, 14, 0.55); circ(g, d.x, d.y, d.r + 26); g.fillStyle = '#12171e'; g.fill(); g.restore();
  circ(g, d.x, d.y, d.r + 2); g.fillStyle = rad(g, d.x, d.y - 40, 20, d.x, d.y, d.r, [[0, '#101820'], [1, '#05080c']]); g.fill();
  // Wasser am Boden der Trommel und Schaufeln
  g.save(); circ(g, d.x, d.y, d.r); g.clip();
  g.fillStyle = lin(g, 0, d.y + 70, 0, d.y + d.r, [[0, 'rgba(60,190,230,.10)'], [1, 'rgba(60,190,230,.34)']]); g.fillRect(d.x - d.r, d.y + 78, 2 * d.r, d.r);
  g.fillStyle = 'rgba(170,235,255,.5)'; g.fillRect(d.x - d.r, d.y + 78, 2 * d.r, 2);
  g.translate(d.x, d.y); g.rotate(0.5 - T * DRUM_W);
  for (let k = 0; k < 6; k++) { g.rotate(TAU / 6); rr(g, d.r - 64, -7, 60, 14, 4); g.fillStyle = lin(g, 0, -7, 0, 7, BRASS); g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.2; g.stroke(); }
  g.restore();
}
function drumFront(g) {
  const d = DRUM;
  g.save(); circ(g, d.x, d.y, d.r); g.clip();        // Tropfen und Glasreflexe
  for (const [dx, dy, r] of [[-70, 30, 4], [-40, -20, 3], [10, 44, 5], [55, 5, 3.5], [88, 60, 4], [-96, 70, 3], [30, -50, 3], [-12, 96, 4.5], [70, -40, 2.5]]) { circ(g, d.x + dx, d.y + dy, r); g.fillStyle = 'rgba(150,228,255,.75)'; g.fill(); }
  g.strokeStyle = 'rgba(255,255,255,.30)'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.arc(d.x, d.y, d.r - 16, Math.PI * 1.08, Math.PI * 1.42); g.stroke();
  g.strokeStyle = 'rgba(160,215,255,.14)'; g.lineWidth = 10; g.beginPath(); g.arc(d.x, d.y, d.r - 20, Math.PI * 0.1, Math.PI * 0.4); g.stroke();
  g.restore();
  g.save(); shadow(g, 12, 4, 7, 0.5); g.beginPath(); g.arc(d.x, d.y, d.r + 28, 0, TAU); g.arc(d.x, d.y, d.r + 2, 0, TAU, true);
  g.fillStyle = lin(g, d.x - d.r, d.y - d.r, d.x + d.r, d.y + d.r, [[0, '#8c98a6'], [0.45, '#48515d'], [1, '#1f242c']]); g.fill('evenodd'); g.restore();
  circ(g, d.x, d.y, d.r + 28); g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 1.6; g.stroke();
  circ(g, d.x, d.y, d.r + 2); g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 2; g.stroke();
  for (let k = 0; k < 16; k++) { const a = (k + 0.5) * TAU / 16; bolt(g, d.x + Math.cos(a) * (d.r + 15), d.y + Math.sin(a) * (d.r + 15), 4); }
  circ(g, d.x, d.y, 20); g.fillStyle = rad(g, d.x - 5, d.y - 6, 1, d.x, d.y, 20, [[0, '#fff3c4'], [0.6, '#d19c3a'], [1, '#6e4613']]); g.fill(); g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 1.5; g.stroke(); bolt(g, d.x, d.y, 6);
  gearAt(g, d.x - 60, d.y + d.r + 62, 16, 6, { brass: true, rot: T * 3.2 });       // Antrieb am Trommelkranz
  nameplate(g, d.x + 40, d.y + d.r + 52, 'WASH DRUM · MK I');
}

function beltBack(g) {
  const b = BELT, br = 32 + 3.5;
  for (const x of [b.x0 + 40, b.x1 - 40]) post(g, x, b.cy + 6, DECK + 4, 18);
  plate(g, b.x0 - 10, b.cy - 8, b.x1 - b.x0 + 20, 16, 8, { stops: STEEL_DARK, blur: 20, sa: 0.6 });
  g.save(); shadow(g, 14, 6, 12, 0.5);
  g.beginPath(); g.moveTo(b.x0, b.cy - br); g.lineTo(b.x1, b.cy - br); g.arc(b.x1, b.cy, br, -HALF_PI, HALF_PI); g.lineTo(b.x0, b.cy + br); g.arc(b.x0, b.cy, br, HALF_PI, 3 * HALF_PI); g.closePath();
  g.lineWidth = 7; g.strokeStyle = '#14171c'; g.stroke(); g.restore();
  for (let x = b.x0 + mod(T * 165, 24); x < b.x1; x += 24) { rr(g, x, b.cy - br - 9, 5, 12, 2); g.fillStyle = '#59636f'; g.fill(); }
  for (const x of [b.x0, b.x1]) { circ(g, x, b.cy, 32); g.fillStyle = rad(g, x, b.cy, 4, x, b.cy, 32, [[0, '#2b323b'], [0.6, '#59636f'], [0.9, '#98a3af'], [1, '#4e5863']]); g.fill(); g.strokeStyle = 'rgba(0,0,0,.75)'; g.lineWidth = 1.5; g.stroke(); }
}
function beltFront(g) {
  const b = BELT;
  plate(g, b.x0 - 6, b.cy - 13, b.x1 - b.x0 + 12, 26, 13, { blur: 10, sa: 0.5 });
  g.save(); g.shadowColor = 'rgba(40,220,255,.9)'; g.shadowBlur = 10; g.fillStyle = 'rgba(120,235,255,.95)'; rr(g, b.x0 + 30, b.cy + 15.5, b.x1 - b.x0 - 60, 2.4, 1.2); g.fill(); g.restore();
  gearAt(g, 1700, 861, 12, 6, { rot: T * 5.2 }); gearAt(g, 1612, 912, 22, 6, { rot: 0.1 - T * 5.2 * 12 / 22 }); gearAt(g, 1456, 898, 30, 6, { rot: 0.2 + T * 5.2 * 12 / 30 }); gearAt(g, 1336, 898, 10, 6, { brass: true, rot: -T * 5.2 * 12 / 10 });
}

function polisherBack(g) {
  const p = POL, cx = p.x + p.w / 2;
  for (const x of [p.x + 30, p.x + p.w - 30]) post(g, x, p.y + p.h - 6, DECK + 4, 22);
  plate(g, p.x, p.y, p.w, p.h, 18, { blur: 26 });
  glassPane(g, p.x + 40, p.y + 56, p.w - 80, p.h - 96, 14);
  // Bürstenräder: weicher Filz mit Borsten
  for (const [by, dir] of [[716, 1], [884, -1]]) {
    g.save(); g.translate(cx, by); g.rotate(dir * (0.4 + T * 11));
    circ(g, 0, 0, 60); g.fillStyle = rad(g, 0, 0, 8, 0, 0, 60, [[0, '#7a5a2a'], [0.5, '#d9b878'], [0.85, '#f3e2b8'], [1, '#b89455']]); g.fill();
    g.strokeStyle = 'rgba(90,60,20,.55)'; g.lineWidth = 1.4;
    for (let k = 0; k < 40; k++) { const a = k * TAU / 40; g.beginPath(); g.moveTo(Math.cos(a) * 30, Math.sin(a) * 30); g.lineTo(Math.cos(a + 0.12) * 59, Math.sin(a + 0.12) * 59); g.stroke(); }
    circ(g, 0, 0, 60); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.5; g.stroke();
    circ(g, 0, 0, 16); g.fillStyle = rad(g, -4, -5, 1, 0, 0, 16, [[0, '#e6ecf2'], [0.6, '#8a96a3'], [1, '#3b444f']]); g.fill(); g.stroke();
    g.restore();
  }
}
function polisherFront(g) {
  const p = POL, cx = p.x + p.w / 2;
  // Funken und Glanzlicht an der Kugel
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 22; k++) {
    const a = -0.5 + ((k * 53 + Math.floor(T * 24) * 37) % 100) / 100 * 1.0 + (k % 2 ? Math.PI : 0), d = 26 + ((k * 31) % 70), len = 7 + (k * 7) % 12;
    g.strokeStyle = `rgba(255,${200 + (k * 13) % 55},120,${0.9 - d / 130})`; g.lineWidth = 2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx + Math.cos(a) * d, 800 + Math.sin(a) * d); g.lineTo(cx + Math.cos(a) * (d + len), 800 + Math.sin(a) * (d + len) + 2); g.stroke();
  }
  g.restore();
  glow(g, cx, 800, 0xffe9b0, 0.5, 90);
  glassShine(g, p.x + 40, p.y + 56, p.w - 80, p.h - 96, 14);
  cornerBolts(g, p.x, p.y, p.w, p.h, 5, 14);
  nameplate(g, p.x + 26, p.y + 16, 'PRECISION POLISH · MK II');
  led(g, p.x + p.w - 30, p.y + 28, 0x54ff9a); led(g, p.x + p.w - 54, p.y + 28, 0xffc13a, 4);
  vents(g, p.x + 44, p.y + p.h - 34, p.w - 88, 2);
  for (const x of [p.x, p.x + p.w]) band(g, x, 800, 16, TUBE_OUT + 8, 0, BRASS_CYL);
}

function kilnBack(g) {
  const k = KILN;
  for (const x of [k.x + 60, k.x + k.w / 2, k.x + k.w - 60]) post(g, x, k.y + k.h - 6, DECK + 4, 24);
  for (const x of [2520, 2800, 3080]) {               // Abzüge bis zur Decke
    g.save(); shadow(g, 14, 6, 6, 0.45); g.fillStyle = lin(g, x - 34, 0, x + 34, 0, CYL); g.fillRect(x - 34, -10, 68, k.y + 14); g.restore();
    for (const y of [120, 330, 540]) band(g, x, y, 16, 40, HALF_PI, STEEL);
  }
  glow(g, k.x + k.w / 2, k.y + k.h / 2, 0xff7a1f, 0.20, 720);
  plate(g, k.x, k.y, k.w, k.h, 22, { stops: [[0, '#6b6f78'], [0.45, '#474b54'], [1, '#24272e']], blur: 30 });
  // Glutkammer hinter dem Sichtfenster
  rr(g, k.x + 56, k.y + 70, k.w - 112, 100, 22);
  g.fillStyle = lin(g, k.x + 56, 0, k.x + k.w - 56, 0, [[0, '#3a1206'], [0.12, '#a83a0c'], [0.5, '#ffb347'], [0.88, '#ff8a2a'], [1, '#6a1f08']]); g.fill();
  g.save(); rr(g, k.x + 56, k.y + 70, k.w - 112, 100, 22); g.clip(); g.globalCompositeOperation = 'lighter';
  for (let x = k.x + 110; x < k.x + k.w - 80; x += 92) {     // Flammenzungen
    g.fillStyle = rad(g, x, k.y + 178, 4, x, k.y + 150, 60, [[0, 'rgba(255,244,200,.85)'], [0.5, 'rgba(255,170,60,.45)'], [1, 'rgba(255,90,20,0)']]);
    g.beginPath(); g.ellipse(x, k.y + 150, 30, 58 * (0.8 + 0.2 * Math.sin(T * 9 + x * 0.05)), 0, 0, TAU); g.fill();
  }
  g.restore();
}
function kilnFront(g) {
  const k = KILN;
  g.save(); rr(g, k.x + 56, k.y + 70, k.w - 112, 100, 22); g.clip();          // Hitzeflimmern und Glas
  g.fillStyle = 'rgba(255,255,255,.07)'; for (const o of [0.1, 0.34, 0.62, 0.86]) { g.beginPath(); g.moveTo(k.x + k.w * o + 40, k.y + 70); g.lineTo(k.x + k.w * o + 80, k.y + 70); g.lineTo(k.x + k.w * o + 40, k.y + 170); g.lineTo(k.x + k.w * o, k.y + 170); g.fill(); }
  g.restore();
  g.save(); g.shadowColor = 'rgba(255,140,40,.9)'; g.shadowBlur = 30; rr(g, k.x + 56, k.y + 70, k.w - 112, 100, 22); g.strokeStyle = '#1a1c21'; g.lineWidth = 9; g.stroke(); g.restore();
  rr(g, k.x + 56, k.y + 70, k.w - 112, 100, 22); g.strokeStyle = 'rgba(255,200,140,.5)'; g.lineWidth = 2; g.stroke();
  for (let x = k.x + 30; x < k.x + k.w - 10; x += 62) { bolt(g, x, k.y + 22, 4.6); bolt(g, x, k.y + k.h - 22, 4.6); }
  for (const x of [k.x + 250, k.x + 480, k.x + 710]) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x - 2, k.y + 44, 4, 152); }
  gauge(g, k.x + 140, k.y + 208, 20, 0.82); gauge(g, k.x + k.w - 140, k.y + 208, 20, 0.7);
  nameplate(g, k.x + k.w / 2 - 92, k.y + 196, 'TUNNEL KILN · 1200 °C', 184);
  led(g, k.x + 190, k.y + 208, 0xff5a2a); led(g, k.x + k.w - 190, k.y + 208, 0xff5a2a);
  for (const x of [k.x, k.x + k.w]) band(g, x, 800, 18, TUBE_OUT + 9, 0, BRASS_CYL);
}

function domePath(g, c) {
  g.beginPath(); g.moveTo(c.x - 150, 1506); g.lineTo(c.x - 150, 1424);
  g.bezierCurveTo(c.x - 150, 1342, c.x - 72, 1338, c.x, 1338); g.bezierCurveTo(c.x + 72, 1338, c.x + 150, 1342, c.x + 150, 1424);
  g.lineTo(c.x + 150, 1506); g.closePath();
}
function colourBack(g) {
  const c = CRADLE, y0 = DECK + 62, hgt = 204;
  // Pigmenttanks hängen unter dem Deck
  TANKS.forEach((x, i) => {
    const hex = COLORS[i].hex;
    g.save(); shadow(g, 14, 5, 8, 0.5); rr(g, x - 36, y0, 72, hgt, 20); g.fillStyle = 'rgba(8,15,24,.86)'; g.fill(); g.restore();
    g.save(); rr(g, x - 32, y0 + 4, 64, hgt - 8, 17); g.clip();
    const lvl = y0 + 40 + ((i * 37) % 52);
    g.fillStyle = lin(g, 0, lvl, 0, y0 + hgt, [[0, css(hex, 0.8)], [1, css(hex, 0.44)]]); g.fillRect(x - 32, lvl, 64, y0 + hgt - lvl);
    g.fillStyle = css(0xffffff, 0.55); g.fillRect(x - 32, lvl, 64, 2.5);
    for (const [dx, dy, r] of [[-12, 50, 5], [9, 96, 3.5], [-4, 130, 4], [15, 34, 2.5]]) { circ(g, x + dx, lvl + dy, r); g.strokeStyle = css(0xffffff, 0.5); g.lineWidth = 1.2; g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.13)'; g.fillRect(x - 22, y0, 9, hgt); g.restore();
    rr(g, x - 36, y0, 72, hgt, 20); g.strokeStyle = 'rgba(176,220,246,.55)'; g.lineWidth = 2.5; g.stroke();
    band(g, x, y0 + 8, 14, 42, HALF_PI, CYL); band(g, x, y0 + hgt - 6, 14, 42, HALF_PI, CYL);
    glow(g, x, y0 + hgt * 0.6, hex, 0.3, 140);
    g.fillStyle = lin(g, x - 5, 0, x + 5, 0, CYL); g.fillRect(x - 5, DECK + 28, 10, 40);
    // Leitung zum Injektor
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#11151a'; g.lineWidth = 10; shadow(g, 6, 3, 4, 0.4);
    g.beginPath(); g.moveTo(x, y0 + hgt + 2); g.lineTo(x, y0 + hgt + 20); g.lineTo(c.x + (i - 2.5) * 13, 1306); g.lineTo(c.x + (i - 2.5) * 13, 1320); g.stroke();
    noShadow(g); g.strokeStyle = css(hex, 0.9); g.lineWidth = 4; g.stroke(); g.restore();
  });
  // Sockel und Glaskuppel (Rückseite)
  for (const px of [c.x - 110, c.x + 110]) post(g, px, 1570, FLOOR + 12, 24);
  plate(g, c.x - 196, 1504, 392, 88, 14, { blur: 24 });
  g.save(); shadow(g, 14, 4, 6, 0.5); domePath(g, c); g.fillStyle = lin(g, 0, 1338, 0, 1506, [[0, '#06090e'], [1, '#131b26']]); g.fill(); g.restore();
  domePath(g, c); g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 2.5; g.stroke();
}
function colourFront(g) {
  const c = CRADLE, hex = COLORS[2].hex;
  // Farbstrahl aus der Düse, Farbnebel und Farbring um die Kugel
  g.save(); g.globalCompositeOperation = 'lighter';
  g.fillStyle = lin(g, 0, 1372, 0, 1424, [[0, css(hex, 0.95)], [1, css(hex, 0.6)]]);
  g.beginPath(); g.moveTo(c.x - 5, 1372); g.lineTo(c.x + 5, 1372); g.lineTo(c.x + 10, 1424); g.lineTo(c.x - 10, 1424); g.closePath(); g.fill();
  for (let k = 0; k < 30; k++) { const a = (k / 30) * TAU, d = 34 + (k * 17) % 52; circ(g, c.x + Math.cos(a) * d, c.y + 2 + Math.sin(a) * d * 0.6, 2.5 + (k % 4)); g.fillStyle = css(hex, Math.max(0.12, 0.62 - d / 180)); g.fill(); }
  g.strokeStyle = css(hex, 0.6); g.lineWidth = 3.5; g.beginPath(); g.ellipse(c.x, c.y + 10, 56, 19, 0, 0, TAU); g.stroke();
  g.strokeStyle = css(hex, 0.3); g.lineWidth = 2; g.beginPath(); g.ellipse(c.x, c.y + 12, 84, 28, 0, 0, TAU); g.stroke();
  g.restore();
  glow(g, c.x, c.y, hex, 0.62, 210);
  // Glas vorn
  g.save(); domePath(g, c); g.clip(); g.fillStyle = 'rgba(255,255,255,.07)';
  for (const [o, wd] of [[-118, 28], [-66, 9], [64, 20]]) { g.beginPath(); g.moveTo(c.x + o + 46, 1338); g.lineTo(c.x + o + 46 + wd, 1338); g.lineTo(c.x + o + wd, 1506); g.lineTo(c.x + o, 1506); g.fill(); }
  g.restore();
  domePath(g, c); g.strokeStyle = 'rgba(176,220,246,.55)'; g.lineWidth = 2.5; g.stroke();
  // Injektorkopf über der Kuppel
  plate(g, c.x - 66, 1312, 132, 32, 9, { blur: 10 });
  g.beginPath(); g.moveTo(c.x - 16, 1344); g.lineTo(c.x + 16, 1344); g.lineTo(c.x + 6, 1374); g.lineTo(c.x - 6, 1374); g.closePath();
  g.fillStyle = lin(g, c.x - 16, 0, c.x + 16, 0, BRASS_CYL); g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.2; g.stroke();
  band(g, c.x, 1507, 304, 8, 0, BRASS_CYL);
  nameplate(g, c.x - 104, 1530, 'CHROMATIC INFUSION', 208);
  COLORS.forEach((col, i) => led(g, c.x - 50 + i * 20, 1572, col.hex, 4));
  for (const x of [c.x - 150, c.x + 150]) band(g, x, c.y, 16, TUBE_OUT + 8, 0, BRASS_CYL);
}

function coolBack(g) {
  const x = 2210, y = 1392, w = 740, h = 452;
  for (const px of [x + 50, x + w - 50]) post(g, px, y + h - 6, FLOOR + 12, 22);
  plate(g, x, y, w, h, 20, { blur: 26 });
  rr(g, x + 16, y + 44, w - 32, h - 60, 12); g.fillStyle = lin(g, 0, y, 0, y + h, [[0, '#08101a'], [1, '#0d1722']]); g.fill(); g.strokeStyle = 'rgba(0,0,0,.75)'; g.lineWidth = 2.5; g.stroke();
  glow(g, x + w / 2, y + h / 2 + 20, 0x4fc3ff, 0.16, 520);
  for (const fx of [2440, 2620, 2800]) {              // Lüfter hinter den Rohren
    const fy = 1622, fr = 86;
    circ(g, fx, fy, fr + 8); g.fillStyle = '#161d26'; g.fill(); g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 2; g.stroke();
    circ(g, fx, fy, fr); g.fillStyle = rad(g, fx, fy, 6, fx, fy, fr, [[0, '#0e1a26'], [1, '#060b11']]); g.fill();
    g.save(); g.translate(fx, fy); g.rotate(fx * 0.01 + T * 6);
    for (let k = 0; k < 5; k++) { g.rotate(TAU / 5); g.beginPath(); g.moveTo(8, -6); g.bezierCurveTo(34, -40, 70, -30, fr - 8, 2); g.bezierCurveTo(60, 8, 30, 10, 8, 6); g.closePath(); g.fillStyle = lin(g, 0, -30, fr, 10, [[0, '#5d6b7a'], [1, '#27313c']]); g.fill(); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1; g.stroke(); }
    g.restore();
    circ(g, fx, fy, 13); g.fillStyle = rad(g, fx - 4, fy - 4, 1, fx, fy, 13, [[0, '#e6ecf2'], [0.6, '#8a96a3'], [1, '#3b444f']]); g.fill();
    g.strokeStyle = 'rgba(140,170,200,.22)'; g.lineWidth = 1.5; for (const r of [28, 50, 72]) { circ(g, fx, fy, r); g.stroke(); }
  }
}
function coolFront(g) {
  const x = 2210, y = 1392, w = 740, h = 452;
  cornerBolts(g, x, y, w, h, 5, 14);
  nameplate(g, x + 24, y + 12, 'CONTROLLED COOLING');
  led(g, x + w - 30, y + 24, 0x35d8ff); led(g, x + w - 54, y + 24, 0x35d8ff, 4);
}

function inspectBack(g) {
  post(g, 2040, 1700, FLOOR + 12, 18);
  plate(g, 1968, 1556, 144, 150, 10, { blur: 20 });
  rr(g, 1982, 1570, 116, 84, 6); g.fillStyle = '#050a0d'; g.fill(); g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 2; g.stroke();
  // Prüfbild: Kugelumriss mit Haken
  g.save(); g.shadowColor = 'rgba(84,255,154,.9)'; g.shadowBlur = 10; g.strokeStyle = '#54ff9a'; g.lineWidth = 2.4;
  circ(g, 2018, 1612, 24); g.stroke(); g.beginPath(); g.moveTo(2060, 1612); g.lineTo(2070, 1624); g.lineTo(2088, 1598); g.stroke(); g.restore();
  // Ausschussbehälter
  plate(g, 1884, 1946, 150, 122, 10, { blur: 16 });
  glassPane(g, 1898, 1960, 122, 80, 8);
}
function inspectFront(g) {
  band(g, 2040, 1803, 34, TUBE_OUT + 10, 0, STEEL); band(g, 2040, 1803, 10, TUBE_OUT + 12, 0, BRASS_CYL, false);
  glow(g, 2040, 1803, 0x7fe9ff, FLOW && FLOW.scan ? 0.95 : 0.3, 110);
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = lin(g, 0, 1740, 0, 1866, [[0, 'rgba(127,233,255,0)'], [0.5, 'rgba(127,233,255,.55)'], [1, 'rgba(127,233,255,0)']]); g.fillRect(2036, 1740, 8, 126); g.restore();
  led(g, 2000, 1680, 0x54ff9a); led(g, 2026, 1680, 0xffc13a, 4); led(g, 2052, 1680, 0x35d8ff, 4);
  nameplate(g, 1972, 1706, 'OPTICAL CONTROL', 136);
  glassShine(g, 1898, 1960, 122, 80, 8);
  nameplate(g, 1912, 2042, 'REWORK', 94);
}

function bigWheelBack(g) {
  const b = BIG;
  for (const x of [b.x - 200, b.x + 200]) post(g, x, b.y + 150, FLOOR + 12, 26);
  g.save(); g.strokeStyle = 'rgba(70,82,96,.6)'; g.lineWidth = 10; g.lineCap = 'round'; shadow(g, 8, 4, 4, 0.4);
  g.beginPath(); g.moveTo(b.x - 200, FLOOR - 10); g.lineTo(b.x, b.y); g.lineTo(b.x + 200, FLOOR - 10); g.stroke(); g.restore();
  g.save(); shadow(g, 28, 8, 16, 0.55); circ(g, b.x, b.y, b.r + 22); g.fillStyle = '#12171e'; g.fill(); g.restore();
  circ(g, b.x, b.y, b.r); g.fillStyle = rad(g, b.x, b.y, 40, b.x, b.y, b.r, [[0, '#101720'], [1, '#05080c']]); g.fill();
  // Rad mit zehn Taschen und Speichen
  g.save(); g.translate(b.x, b.y); g.rotate(BIG_ROT0 - BIG_W * T);
  g.beginPath(); g.arc(0, 0, b.rp + 34, 0, TAU); g.arc(0, 0, b.rp - 34, 0, TAU, true);
  g.fillStyle = rad(g, 0, 0, b.rp - 40, 0, 0, b.rp + 36, [[0, '#3a434e'], [0.5, '#6f7b88'], [1, '#353d47']]); g.fill('evenodd');
  g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 1.5; circ(g, 0, 0, b.rp + 34); g.stroke(); circ(g, 0, 0, b.rp - 34); g.stroke();
  for (let k = 0; k < 10; k++) {
    const a = k * TAU / 10;
    g.save(); g.rotate(a); rr(g, 30, -8, b.rp - 66, 16, 6); g.fillStyle = lin(g, 0, -8, 0, 8, STEEL); g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.2; g.stroke(); g.restore();
    circ(g, Math.cos(a) * b.rp, Math.sin(a) * b.rp, R + 4); g.fillStyle = '#06080b'; g.fill(); g.strokeStyle = 'rgba(0,0,0,.85)'; g.lineWidth = 2; g.stroke();
  }
  g.restore();
}
function bigWheelFront(g) {
  const b = BIG;
  g.save(); shadow(g, 12, 4, 7, 0.5); g.beginPath(); g.arc(b.x, b.y, b.r + 24, 0, TAU); g.arc(b.x, b.y, b.r, 0, TAU, true);
  g.fillStyle = lin(g, b.x - b.r, b.y - b.r, b.x + b.r, b.y + b.r, [[0, '#8c98a6'], [0.45, '#48515d'], [1, '#1f242c']]); g.fill('evenodd'); g.restore();
  circ(g, b.x, b.y, b.r + 24); g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 1.6; g.stroke();
  for (let k = 0; k < 24; k++) { const a = (k + 0.5) * TAU / 24; bolt(g, b.x + Math.cos(a) * (b.r + 12), b.y + Math.sin(a) * (b.r + 12), 4); }
  g.save(); g.lineCap = 'round'; g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 8; g.beginPath(); g.arc(b.x, b.y, b.r - 14, Math.PI * 1.08, Math.PI * 1.4); g.stroke(); g.restore();
  gearAt(g, b.x, b.y, 20, 6, { brass: true, rot: -BIG_W * T });
  circ(g, b.x, b.y, 16); g.fillStyle = rad(g, b.x - 5, b.y - 6, 1, b.x, b.y, 16, [[0, '#e6ecf2'], [0.6, '#8a96a3'], [1, '#3b444f']]); g.fill(); bolt(g, b.x, b.y, 6);
  gearAt(g, b.x + 112, b.y + 112, 14, 6, { rot: T * 1.4 }); nameplate(g, b.x - 78, b.y + b.r + 34, 'WHEEL LIFT · MK I', 156);
}

function sorterBack(g) {
  const x = 566, y = 1296, w = 790, h = 762;
  plate(g, x, y, w, h, 18, { blur: 26 });
  rr(g, x + 14, y + 46, w - 28, h - 60, 10); g.fillStyle = lin(g, 0, y, 0, y + h, [[0, '#0b0f15'], [1, '#141a23']]); g.fill(); g.strokeStyle = 'rgba(0,0,0,.75)'; g.lineWidth = 2.5; g.stroke();
  g.save(); rr(g, x + 14, y + 46, w - 28, h - 60, 10); g.clip();
  g.strokeStyle = 'rgba(255,255,255,.028)'; g.lineWidth = 1; for (let lx = x + 14; lx < x + w; lx += 24) { g.beginPath(); g.moveTo(lx, y); g.lineTo(lx, y + h); g.stroke(); }
  COLS.forEach((c, i) => { g.fillStyle = lin(g, 0, c.yRail, 0, 2030, [[0, css(COLORS[i].hex, 0)], [0.4, css(COLORS[i].hex, 0.10)], [1, css(COLORS[i].hex, 0.24)]]); g.fillRect(c.x - 44, c.yRail, 88, 2040 - c.yRail); });
  g.restore();
  cornerBolts(g, x, y, w, h, 5, 14);
  nameplate(g, x + 26, y + 12, 'COLOR SORTER · MK II');
}
function sorterFront(g) {
  COLS.forEach((c, i) => {
    band(g, c.x, c.yRail + 52, 16, TUBE_OUT + 7, HALF_PI);
    rr(g, c.x - 18, c.yRail + 48.5, 36, 7, 3.5); g.fillStyle = css(COLORS[i].hex, 0.95); g.fill(); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1; g.stroke();
    glow(g, c.x, c.yRail + 52, COLORS[i].hex, 0.4, 70);
    band(g, c.x, 2012, 12, TUBE_OUT + 6, HALF_PI);
    rr(g, c.x - 32, 2026, 64, 12, 6); g.fillStyle = css(COLORS[i].hex, 0.9); g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.2; g.stroke();
    // Klappe an der Sortierschiene
    g.save(); g.translate(c.x + 30, c.yRail + 24); g.rotate(i === 2 ? -1.3 : -0.06); rr(g, -4, -3, 56, 6, 3); g.fillStyle = lin(g, 0, -3, 0, 3, BRASS); g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.stroke(); g.restore();
  });
}

function rawBin(g, front) {
  const x = 300, y = 1776, w = 226, h = 280;
  if (!front) {
    plate(g, x, y, w, h, 14, { blur: 22 });
    glassPane(g, x + 16, y + 44, w - 32, h - 92, 10);
    return;
  }
  glassShine(g, x + 16, y + 44, w - 32, h - 92, 10);
  cornerBolts(g, x, y, w, h, 4.4, 12);
  nameplate(g, x + 18, y + 10, 'RAW STOCK', 110);
  g.save(); g.font = `800 26px ${FONT}`; g.fillStyle = '#eafcff'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(34,211,238,.9)'; g.shadowBlur = 10; g.fillText('41', x + w - 20, y + 23); g.restore();
  vents(g, x + 24, y + h - 36, w - 48, 2);
}

// ---------------------------------------------------------------- Tiefe, Lichtzonen und ruhige Details
function fan(g, fx, fy, fr, rot = 0) {
  circ(g, fx, fy, fr + 8); g.fillStyle = '#161d26'; g.fill(); g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 2; g.stroke();
  circ(g, fx, fy, fr); g.fillStyle = rad(g, fx, fy, 6, fx, fy, fr, [[0, '#0e1a26'], [1, '#060b11']]); g.fill();
  g.save(); g.translate(fx, fy); g.rotate(rot);
  for (let k = 0; k < 5; k++) { g.rotate(TAU / 5); g.beginPath(); g.moveTo(fr * 0.09, -fr * 0.07); g.bezierCurveTo(fr * 0.4, -fr * 0.46, fr * 0.8, -fr * 0.35, fr * 0.9, 2); g.bezierCurveTo(fr * 0.7, fr * 0.1, fr * 0.35, fr * 0.12, fr * 0.09, fr * 0.07); g.closePath(); g.fillStyle = lin(g, 0, -fr * 0.35, fr, fr * 0.1, [[0, '#5d6b7a'], [1, '#27313c']]); g.fill(); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1; g.stroke(); }
  g.restore();
  circ(g, fx, fy, fr * 0.15); g.fillStyle = rad(g, fx - 4, fy - 4, 1, fx, fy, fr * 0.15, [[0, '#e6ecf2'], [0.6, '#8a96a3'], [1, '#3b444f']]); g.fill();
  g.strokeStyle = 'rgba(140,170,200,.22)'; g.lineWidth = 1.5; for (const r of [0.33, 0.58, 0.84]) { circ(g, fx, fy, fr * r); g.stroke(); }
}
function pipeRun(g, pts, w = 18, a = 1) {
  g.save(); g.globalAlpha = a; g.lineJoin = 'round';
  const path = () => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); };
  shadow(g, 10, 4, 6, 0.4); path(); g.strokeStyle = '#0b0f15'; g.lineWidth = w + 3; g.stroke(); noShadow(g);
  path(); g.strokeStyle = '#36414e'; g.lineWidth = w; g.stroke();
  g.translate(-w * 0.2, -w * 0.2); path(); g.strokeStyle = 'rgba(205,220,235,.24)'; g.lineWidth = w * 0.2; g.stroke();
  g.restore();
  pts.forEach(([x, y], i) => { if (i && i < pts.length - 1) { g.save(); g.globalAlpha = a; circ(g, x, y, w * 0.72); g.fillStyle = '#48535f'; g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.2; g.stroke(); g.restore(); } });
}
function windowTall(g, x, y, w, h) {
  const outline = () => { g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); };
  glow(g, x + w / 2, y + h * 0.5, 0x6fa8e0, 0.085, w * 2.1);
  g.save(); outline(); g.fillStyle = lin(g, 0, y, 0, y + h, [[0, '#1a3857'], [0.6, '#102438'], [1, '#0a1624']]); g.fill(); g.clip();
  g.fillStyle = rad(g, x + w * 0.68, y + h * 0.22, 4, x + w * 0.68, y + h * 0.22, w * 0.95, [[0, 'rgba(170,212,255,.42)'], [1, 'rgba(170,212,255,0)']]); g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(6,10,16,.55)';                      // ferne Dächer und Schlote
  g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + h * 0.78); g.lineTo(x + w * 0.2, y + h * 0.78); g.lineTo(x + w * 0.2, y + h * 0.6); g.lineTo(x + w * 0.3, y + h * 0.6); g.lineTo(x + w * 0.3, y + h * 0.82); g.lineTo(x + w * 0.62, y + h * 0.7); g.lineTo(x + w * 0.62, y + h * 0.86); g.lineTo(x + w, y + h * 0.74); g.lineTo(x + w, y + h); g.fill();
  g.strokeStyle = 'rgba(7,11,17,.96)'; g.lineWidth = 5;
  for (let k = 1; k < 3; k++) { g.beginPath(); g.moveTo(x + (w * k) / 3, y); g.lineTo(x + (w * k) / 3, y + h); g.stroke(); }
  for (let yy = y + w / 2; yy < y + h; yy += 76) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); }
  g.restore();
  outline(); g.strokeStyle = '#090d13'; g.lineWidth = 10; g.stroke(); outline(); g.strokeStyle = 'rgba(120,140,165,.22)'; g.lineWidth = 1.5; g.stroke();
}
function crate(g, x, y, s, label) {
  g.save(); shadow(g, 12, 5, 6, 0.5); rr(g, x, y, s, s, 4); g.fillStyle = lin(g, 0, y, 0, y + s, [[0, '#6b5335'], [1, '#3c2d1c']]); g.fill(); g.restore();
  g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2; rr(g, x, y, s, s, 4); g.stroke();
  g.strokeStyle = 'rgba(20,12,4,.55)'; g.lineWidth = 7; g.beginPath(); g.moveTo(x + 6, y + 6); g.lineTo(x + s - 6, y + s - 6); g.moveTo(x + s - 6, y + 6); g.lineTo(x + 6, y + s - 6); g.stroke();
  g.strokeStyle = 'rgba(230,200,150,.16)'; g.lineWidth = 1.5; g.strokeRect(x + 5, y + 5, s - 10, s - 10);
  if (label) { g.save(); g.font = `800 ${Math.round(s * 0.16)}px ${FONT}`; g.fillStyle = 'rgba(240,220,180,.55)'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, x + s / 2, y + s / 2); g.restore(); }
}
/** Hintergrundebene: kontrastarm, damit die Kugeln die hellsten Dinge im Bild bleiben */
function depth(g) {
  for (const [x, y, w, h] of [[836, 66, 150, 318], [1056, 66, 150, 318], [3350, 84, 160, 470], [3600, 84, 160, 470]]) windowTall(g, x, y, w, h);
  // ferne Rohrbrücken und Steigleitungen
  pipeRun(g, [[300, 596], [900, 596]], 20, 0.5); pipeRun(g, [[2200, 584], [2330, 584]], 20, 0.5);
  pipeRun(g, [[330, 1096], [1310, 1096]], 22, 0.6); pipeRun(g, [[330, 1136], [820, 1136], [820, 1262]], 14, 0.6);
  pipeRun(g, [[2196, 1090], [2980, 1090]], 22, 0.55); pipeRun(g, [[3460, 640], [3460, 992]], 18, 0.5); pipeRun(g, [[3760, 600], [3760, 2000]], 20, 0.5);
  // Schaltwand unter dem Ofen
  plate(g, 2440, 1150, 330, 190, 12, { blur: 22, stops: STEEL_DARK });
  rr(g, 2454, 1164, 302, 162, 7); g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1; g.stroke();
  [[2510, 0.55], [2605, 0.72], [2700, 0.38]].forEach(([gx, v]) => gauge(g, gx, 1220, 30, v));
  vents(g, 2470, 1272, 150, 3); nameplate(g, 2640, 1280, 'MAIN CONTROL', 110);
  for (const [lx, hex] of [[2476, 0x54ff9a], [2500, 0xffc13a], [2524, 0x35d8ff]]) led(g, lx, 1178, hex, 3.5);
  pipeRun(g, [[2605, 1150], [2605, 1040]], 12, 0.8);
  // Reservierter Platz für die zweite Linie
  g.save(); g.setLineDash([26, 16]); g.strokeStyle = 'rgba(201,154,30,.42)'; g.lineWidth = 5; rr(g, 3010, 1726, 700, 338, 10); g.stroke(); g.restore();
  g.save(); g.font = `800 96px ${FONT}`; g.fillStyle = 'rgba(201,154,30,.16)'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BAY 2', 3350, 1900); g.restore();
  nameplate(g, 3440, 1748, 'RESERVED · LINE 2', 192);
  crate(g, 3560, 1950, 126, 'PARTS'); crate(g, 3430, 1986, 90); crate(g, 3586, 1838, 96);
}
function zoneLights(g) {
  glow(g, 1110, 700, 0x2fd6e6, 0.11, 560); glow(g, 1970, 790, 0xffe2a8, 0.09, 480);
  glow(g, 2800, 800, 0xff7a1f, 0.13, 980); glow(g, 3300, 1330, 0xb46bff, 0.09, 600);
  glow(g, 2580, 1620, 0x4fc3ff, 0.10, 760); glow(g, 2040, 1720, 0x7fe9ff, 0.07, 380);
  glow(g, 960, 1700, 0x9fb4ff, 0.05, 700); glow(g, 430, 1900, 0xffd9a0, 0.06, 440);
}
function waterTank(g) {                              // Wasserversorgung der Waschtrommel
  for (const x of [390, 560]) post(g, x, 952, DECK + 4, 18);
  band(g, 474, 892, 250, 62, 0, CYL); band(g, 356, 892, 16, 68, 0, STEEL); band(g, 592, 892, 16, 68, 0, STEEL);
  rr(g, 440, 846, 16, 92, 8); g.fillStyle = 'rgba(8,15,24,.9)'; g.fill(); g.fillStyle = 'rgba(70,205,240,.8)'; rr(g, 443, 880, 10, 55, 5); g.fill(); g.strokeStyle = 'rgba(176,220,246,.6)'; g.lineWidth = 1.5; rr(g, 440, 846, 16, 92, 8); g.stroke();
  glow(g, 448, 900, 0x2fd6e6, 0.35, 70); nameplate(g, 490, 880, 'WATER', 72);
  pipeRun(g, [[600, 904], [900, 904], [958, 854]], 16);
}
function ducts(g) { pipeRun(g, [[2100, 594], [2100, 430], [2292, 430], [2292, -10]], 30); }
function chevrons(g, p, fs) {
  for (const f of fs) {
    const q = at(p, f);
    g.save(); g.translate(q.x, q.y); g.rotate(Math.atan2(q.ty, q.tx)); g.strokeStyle = 'rgba(190,240,255,.55)'; g.lineWidth = 3; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const o of [-9, 4]) { g.beginPath(); g.moveTo(o - 5, -10); g.lineTo(o + 5, 0); g.lineTo(o - 5, 10); g.stroke(); }
    g.restore();
  }
}
function quietDetails(g) {
  // Dampf über der Waschtrommel
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const [dx, dy, r, a] of [[-40, -214, 46, 0.10], [10, -262, 62, 0.085], [-18, -330, 78, 0.06], [44, -396, 92, 0.04], [70, -230, 38, 0.07]]) {
    g.fillStyle = rad(g, DRUM.x + dx, DRUM.y + dy, 2, DRUM.x + dx, DRUM.y + dy, r, [[0, `rgba(205,240,255,${a})`], [1, 'rgba(205,240,255,0)']]); g.fillRect(DRUM.x + dx - r, DRUM.y + dy - r, 2 * r, 2 * r);
  }
  // Hitzeflimmern über dem Ofen
  g.fillStyle = lin(g, 0, KILN.y - 150, 0, KILN.y, [[0, 'rgba(255,140,50,0)'], [1, 'rgba(255,140,50,.10)']]); g.fillRect(KILN.x + 40, KILN.y - 150, KILN.w - 80, 150);
  g.strokeStyle = 'rgba(255,190,120,.10)'; g.lineWidth = 3; g.lineCap = 'round';
  for (let x = KILN.x + 90; x < KILN.x + KILN.w - 60; x += 74) { g.beginPath(); g.moveTo(x, KILN.y - 12); g.bezierCurveTo(x - 16, KILN.y - 50, x + 18, KILN.y - 84, x - 6, KILN.y - 128); g.stroke(); }
  g.restore();
  chevrons(g, PATHS.top, [0.3]); chevrons(g, PATHS.feed, [0.28]); chevrons(g, PATHS.polOut, [0.52]);
  chevrons(g, PATHS.drop, [0.25, 0.53, 0.9]); chevrons(g, PATHS.colourOut, [0.72]);
  chevrons(g, PATHS.cool, [0.075, 0.23, 0.5, 0.68, 0.855]); chevrons(g, PATHS.toWheel, [0.2]); chevrons(g, PATHS.sortRail, [0.26, 0.56, 0.85]);
  // deutliche Anschlüsse an Trommel und Radaufzug
  collar(g, PATHS.feed, PATHS.feed.len - 10, 18, 9, BRASS_CYL); collar(g, PATHS.drumOut, 10, 18, 9, BRASS_CYL);
  collar(g, PATHS.toWheel, PATHS.toWheel.len - 26, 18, 9, BRASS_CYL);
}
function sparkle(g, x, y, s) {
  g.save(); g.globalCompositeOperation = 'lighter'; g.shadowColor = 'rgba(190,230,255,.9)'; g.shadowBlur = 8; g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineCap = 'round';
  g.lineWidth = 1.8; g.beginPath(); g.moveTo(x - s, y); g.lineTo(x + s, y); g.moveTo(x, y - s); g.lineTo(x, y + s); g.stroke();
  g.lineWidth = 1.1; g.beginPath(); g.moveTo(x - s * 0.45, y - s * 0.45); g.lineTo(x + s * 0.45, y + s * 0.45); g.moveTo(x + s * 0.45, y - s * 0.45); g.lineTo(x - s * 0.45, y + s * 0.45); g.stroke();
  g.restore();
}

// ---------------------------------------------------------------- Ablauf: jede Kugel folgt demselben Zeitplan
// Bewusst einfach: reine Funktion der Zeit, noch ohne Warteschlangen. Alle PERIOD Sekunden startet eine Kugel;
// ihr Ort und Zustand hängen nur von ihrem Alter u ab. Damit ist jedes Bild nach einem Sprung sofort richtig.
const PERIOD = 1.6, LOOP = PERIOD * 48;
const SEQ = [2, 5, 0, 3, 1, 4, 4, 1, 5, 2, 0, 3];                // Farbfolge der Kugeln
const BASE = [5, 3, 5, 2, 4, 3];                                  // Füllstand der Röhren zu Beginn (Cyan … Grün)
const mod = (a, m) => ((a % m) + m) % m;
const colorOf = (n) => SEQ[mod(n, SEQ.length)];
const smooth = (x) => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
const lerp = (a, b, f) => a + (b - a) * f;
const LIFT_V = 185 / PERIOD, DRUM_W = 1.232;                      // Kettentempo, Drehzahl der Trommel (rad/s)
const BIG_W = (TAU / 10) / PERIOD;                                // Radaufzug: eine Tasche je Kugel
const A_PICK = Math.atan2(1722 - BIG.y, 1812 - BIG.x), A_REL = Math.atan2(1350 - BIG.y, 1470 - BIG.x);
const RIDE = (A_PICK - A_REL) / BIG_W;
const colS = COLS.map((c) => { for (let s = 0; s < PATHS.sortRail.len; s += 2) { if (pathAt(PATHS.sortRail, s, P).x <= c.x) return s; } return PATHS.sortRail.len; });
// Abschnitte in Sekunden nach dem Start aus dem Zellenrad
const ST = (() => {
  const t = {}; let u = 0;
  const add = (name, dur) => { t[name] = u; u += dur; };
  add('feed', 2.0); add('slide', 0.5); add('drum', 2 * 2.4 + 0.824); add('drumExit', 0.3); add('belt', 4.2); add('polish', 1.4);
  add('polOut', 1.8); add('kiln', 7.6); add('dropIn', 0.25); add('drop', 2.8); add('toCradle', 0.5); add('colour', 1.4);
  add('colourOut', 1.2); add('cool', PATHS.cool.len / 265); add('toWheel', 1.0); add('ride', RIDE); t.rail = u;
  return t;
})();
const BIG_ROT0 = A_PICK + BIG_W * ST.ride;                         // eine Tasche steht bei der Übergabe bereit
const railTime = (c) => colS[c] / 230;
const slotIndex = (n) => { const c = colorOf(n), first = Math.ceil(-ST.rail / PERIOD); let k = BASE[c]; for (let m = first; m < n; m++) if (colorOf(m) === c) k++; return k; };
const fallTime = (c, idx) => Math.sqrt(2 * Math.max(40, 1984 - idx * 46 - COLS[c].yRail) / 1500);

/** Ort und Zustand der Kugel n zur Zeit t (null = noch im Behälter). */
function poseOf(n, t) {
  const u = t - n * PERIOD, c = colorOf(n), o = { x: 0, y: 0, kind: 'raw', color: c, heat: 0, tint: 0, n };
  const seg = (a, b) => (u - ST[a]) / (ST[b] - ST[a]);
  if (u < -2 * PERIOD) return null;
  if (u < 0) { const a = HALF_PI + (u / PERIOD) * HALF_PI; o.x = WHEEL.x + Math.cos(a) * WHEEL.rp; o.y = WHEEL.y + Math.sin(a) * WHEEL.rp; return o; }
  if (u < ST.slide) { const f = seg('feed', 'slide'), q = pathAt(PATHS.feed, PATHS.feed.len * f * f * (0.4 + 0.6 * f) / 1, P); o.x = q.x; o.y = q.y; return o; }
  if (u < ST.drum) { const f = smooth(seg('slide', 'drum')); o.x = lerp(946, DRUM.x + 150 * Math.cos(1.745), f); o.y = lerp(800, DRUM.y + 150 * Math.sin(1.745), f) + Math.sin(f * Math.PI) * 14; return o; }
  if (u < ST.drumExit) {                                          // Schaufeln heben die Kugel an, dann fällt sie zurück
    const ud = u - ST.drum, cyc = Math.floor(ud / 2.4), p = (ud - cyc * 2.4) / 2.4, last = cyc >= 2;
    o.kind = ud > 2.9 ? 'washed' : 'raw';
    if (p < 0.62 || last) { const a = 1.745 - DRUM_W * (ud - cyc * 2.4); o.x = DRUM.x + 150 * Math.cos(a); o.y = DRUM.y + 150 * Math.sin(a); }
    else { const q = (p - 0.62) / 0.38, a0 = 1.745 - DRUM_W * 0.62 * 2.4; o.x = lerp(DRUM.x + 150 * Math.cos(a0), DRUM.x + 150 * Math.cos(1.745), q); o.y = lerp(DRUM.y + 150 * Math.sin(a0), DRUM.y + 150 * Math.sin(1.745), q * q); }
    return o;
  }
  o.kind = 'washed';
  if (u < ST.belt) { const f = seg('drumExit', 'belt'); o.x = lerp(DRUM.x + 150 * Math.cos(0.73), 1276, f); o.y = 800; return o; }
  if (u < ST.polish) { o.x = lerp(1276, 1970, seg('belt', 'polish')); o.y = 800; return o; }
  if (u < ST.polOut) { const f = seg('polish', 'polOut'); o.x = 1970; o.y = 800; o.kind = f > 0.55 ? 'clear' : 'washed'; o.work = f; return o; }
  o.kind = 'clear';
  if (u < ST.kiln) { o.x = lerp(1970, 2400, smooth(seg('polOut', 'kiln'))); o.y = 800; return o; }
  if (u < ST.dropIn) { const f = seg('kiln', 'dropIn'); o.x = lerp(2400, 3200, f); o.y = 800; o.heat = 0.06 + 0.94 * smooth(f * 1.15); return o; }
  o.heat = 1;
  if (u < ST.drop) { o.x = lerp(3200, 3240, seg('dropIn', 'drop')); o.y = 800; return o; }
  if (u < ST.toCradle) { const f = seg('drop', 'toCradle'), q = pathAt(PATHS.drop, PATHS.drop.len * (0.35 * f + 0.65 * f * f), P); o.x = q.x; o.y = q.y; o.heat = 1 - 0.1 * f; return o; }
  if (u < ST.colour) { const f = smooth(seg('toCradle', 'colour')); o.x = lerp(3450, CRADLE.x, f); o.y = 1440; o.heat = 0.9; return o; }
  if (u < ST.colourOut) { const f = seg('colour', 'colourOut'); o.x = CRADLE.x; o.y = 1440; o.kind = 'color'; o.tint = smooth(f * 1.3); o.heat = 0.9 - 0.2 * f; o.work = f; return o; }
  o.kind = 'color'; o.tint = 1;
  if (u < ST.cool) { o.x = lerp(CRADLE.x, 2960, smooth(seg('colourOut', 'cool'))); o.y = 1440; o.heat = 0.7; return o; }
  if (u < ST.toWheel) { const f = seg('cool', 'toWheel'), q = pathAt(PATHS.cool, PATHS.cool.len * f, P); o.x = q.x; o.y = q.y; o.heat = Math.max(0, 0.7 - f * 1.0); o.scan = Math.abs(q.x - 2040) < 26; return o; }
  o.heat = 0;
  if (u < ST.ride) { const f = seg('toWheel', 'ride'), q = pathAt(PATHS.toWheel, PATHS.toWheel.len * f, P), e = smooth((f - 0.75) / 0.25); o.x = lerp(q.x, BIG.x + Math.cos(A_PICK) * BIG.rp, e); o.y = lerp(q.y, BIG.y + Math.sin(A_PICK) * BIG.rp, e); return o; }
  if (u < ST.rail) { const a = A_PICK - BIG_W * (u - ST.ride); o.x = BIG.x + Math.cos(a) * BIG.rp; o.y = BIG.y + Math.sin(a) * BIG.rp; return o; }
  const ur = u - ST.rail, rt = railTime(c), idx = slotIndex(n);
  if (ur < 0.35) { const f = smooth(ur / 0.35), q = pathAt(PATHS.sortRail, 0, P); o.x = lerp(BIG.x + Math.cos(A_REL) * BIG.rp, q.x, f); o.y = lerp(BIG.y + Math.sin(A_REL) * BIG.rp, q.y, f); return o; }
  if (ur < 0.35 + rt) { const q = pathAt(PATHS.sortRail, colS[c] * ((ur - 0.35) / rt), P); o.x = q.x; o.y = q.y; return o; }
  if (idx > 12) return null;                                       // Röhre voll (in der Vorschau, vor dem Neubeginn)
  const ft = fallTime(c, idx), f = Math.min(1, (ur - 0.35 - rt) / ft);
  o.x = COLS[c].x; o.y = lerp(COLS[c].yRail + 6, 1984 - idx * 46, f * f); o.landed = f >= 1;
  return o;
}
/** Alle sichtbaren Kugeln zur Zeit t und die Zahl der fertigen. */
function flowAt(t) {
  const list = [], first = Math.ceil(-ST.rail / PERIOD), last = Math.floor(t / PERIOD + 2);
  let done = BASE.reduce((a, b) => a + b, 0), scan = false;
  for (let n = first; n <= last; n++) {
    const p = poseOf(n, t); if (!p) continue;
    if (p.landed) done++;
    if (p.scan) scan = true;
    list.push(p);
  }
  return { list, done, scan };
}
/** Tonereignisse im Zeitraum (t0, t1]: gleiche Zeitpunkte wie im Bild. */
function eventsBetween(t0, t1, emit) {
  const fixed = [['pick', 0, WHEEL.x, WHEEL.y, 1], ['tick', ST.drum + 2.4, DRUM.x, DRUM.y + 140, 200], ['tick', ST.drum + 4.8, DRUM.x, DRUM.y + 140, 230],
    ['belt', ST.drumExit + 0.3, 1290, 800, 150], ['valve', ST.polish, 1970, 800, 1], ['flap', ST.cool + (PATHS.cool.len - 40) / 265, 2040, 1803, 1],
    ['lift', ST.ride, 1812, 1722, 1], ['rail', ST.rail + 0.3, 1470, 1350, 200], ['hopper', -2 * PERIOD - 0.2, 470, 380, 180]];
  for (const [type, e, x, y, p] of fixed) for (let n = Math.floor((t0 - e) / PERIOD) + 1; n * PERIOD + e <= t1; n++) emit(type, n * PERIOD + e, x, y, p, colorOf(n));
  for (let n = Math.floor((t0 - ST.rail - 6) / PERIOD); n * PERIOD + ST.rail <= t1; n++) {
    const c = colorOf(n), idx = Math.min(12, BASE[c] + mod(Math.floor(n / 6), 5)), land = n * PERIOD + ST.rail + 0.35 + railTime(c) + fallTime(c, idx);
    if (land > t0 && land <= t1) emit('clink', land, COLS[c].x, 1984 - idx * 46, 330, c);
  }
}

// ---------------------------------------------------------------- Kamera: ruhige Fahrt, rein aus der Videozeit
function cameraAt(t, world, auto) {
  const land = world.w >= world.h;
  if (!land) {                                                    // Hochformat: volle Hallenhöhe, langsame Fahrt die Linie entlang
    const s = world.h / H, hw = world.w / (2 * s), f = auto ? smooth(1 - Math.abs(mod(t, 48) / 24 - 1)) : 0.5;
    return { s, cx: lerp(hw, W - hw, f), cy: H / 2 };
  }
  const A = { cx: W / 2, cy: H / 2, s: world.w / W }, U = { cx: 1900, cy: 720, s: 0.75 }, U2 = { cx: 2060, cy: 720, s: 0.75 }, L = { cx: 1980, cy: 1440, s: 0.75 }, L2 = { cx: 1860, cy: 1440, s: 0.75 };
  if (!auto) return A;
  const keys = [[0, A], [4, A], [8, U], [10.5, U2], [15.5, L], [17, L2], [20, A]], u = mod(t, 20);
  for (let i = 1; i < keys.length; i++) if (u <= keys[i][0]) {
    const [t0, a] = keys[i - 1], [t1, b] = keys[i], f = smooth((u - t0) / (t1 - t0));
    return { cx: lerp(a.cx, b.cx, f), cy: lerp(a.cy, b.cy, f), s: Math.exp(lerp(Math.log(a.s), Math.log(b.s), f)) };
  }
  return A;
}

// ---------------------------------------------------------------- Kugeln entlang der Linie
function placeMarbles(g) {
  const lf = LIFT, tf = mod(T, LOOP), fl = (FLOW = flowAt(tf));
  // Aufzug: beladene Träger fahren rechts hoch
  for (let k = 0; k < 9; k++) { const y = lf.bot - 30 - mod(k * 185 + T * LIFT_V, 1665); if (y > 344) marble(g, lf.ballX, y - 34, 'raw'); }
  { const q = pathAt(PATHS.top, PATHS.top.len * mod(T / PERIOD, 1), P); marble(g, q.x, q.y, 'raw'); }
  // Vorrat und Behälter (ruhende Kugeln)
  for (const [dx, dy] of [[40, 0], [86, 2], [132, 0], [170, -2], [62, -40], [108, -39], [150, -40], [84, -78], [128, -78], [34, -40]]) marble(g, 316 + dx, 1984 + dy, 'raw');
  for (const [dx, dy] of [[0, 0], [-46, -30], [-92, -58], [-138, -86], [-24, -62], [-70, -92], [-116, -120], [-12, -110]]) marble(g, 646 + dx * 0.98, 490 + dy * 0.82, 'raw');
  marble(g, 1930, 2012, 'washed'); marble(g, 1982, 2014, 'raw');
  // ruhende Kugeln in den Röhren, darüber die laufenden
  COLS.forEach((c, i) => { for (let k = 0; k < BASE[i]; k++) marble(g, c.x, 1984 - k * 46, 'color', i); });
  for (const p of fl.list) {
    if (p.kind === 'color' && p.tint < 1) { marble(g, p.x, p.y, 'clear', 0, p.heat); g.save(); g.globalAlpha = p.tint; marble(g, p.x, p.y, 'color', p.color, p.heat); g.restore(); }
    else marble(g, p.x, p.y, p.kind, p.color, p.heat);
  }
}

// ---------------------------------------------------------------- Gesamtbild
let BG = null;                                                    // unbewegter Hintergrund, einmal vorgezeichnet
function background(scale) {
  if (BG && BG.scale === scale) return BG.canvas;
  const cv = document.createElement('canvas'); cv.width = Math.round(W * scale); cv.height = Math.round(H * scale);
  const g = cv.getContext('2d'); g.scale(scale, scale); g.lineJoin = 'round';
  K.setPX(scale);
  const lamps = hall(g); depth(g); zoneLights(g); deck(g); lampBars(g, lamps);
  BG = { scale, canvas: cv }; return cv;
}
/** Zeichnet die Halle zur Zeit t in den vorbereiteten Kontext (Hallen-Einheiten). px = Gerätepixel je Einheit. */
function drawScene(g, t, px, bgScale = 1) {
  T = t; g.lineJoin = 'round';
  const bg = background(bgScale);
  g.drawImage(bg, 0, 0, W, H);
  K.setPX(px);
  fan(g, 500, 1196, 74, 0.5 + T * 2.6); fan(g, 3640, 660, 62, 1.1 - T * 3.1);
  const tubes = [
    { p: PATHS.shaft, s0: 0, s1: PATHS.shaft.len }, { p: PATHS.top, s0: 0, s1: PATHS.top.len - 34 }, { p: PATHS.feed, s0: 30, s1: PATHS.feed.len },
    { p: PATHS.drumOut, s0: 0, s1: PATHS.drumOut.len }, { p: PATHS.polIn, s0: 0, s1: PATHS.polIn.len }, { p: PATHS.polOut, s0: 0, s1: PATHS.polOut.len },
    { p: PATHS.drop, s0: 0, s1: PATHS.drop.len }, { p: PATHS.colourOut, s0: 0, s1: PATHS.colourOut.len }, { p: PATHS.cool, s0: 0, s1: PATHS.cool.len },
    { p: PATHS.toWheel, s0: 0, s1: PATHS.toWheel.len - 20 }, { p: PATHS.sortRail, s0: 0, s1: PATHS.sortRail.len },
    ...COLS.map((c) => ({ p: c.path, s0: 0, s1: c.path.len })),
  ];
  liftBack(g); rawBin(g, false); waterTank(g); ducts(g); hopperBack(g); drumBack(g); beltBack(g); polisherBack(g); kilnBack(g);
  colourBack(g); coolBack(g); inspectBack(g); bigWheelBack(g); sorterBack(g);
  tubesBack(g, tubes);
  placeMarbles(g);
  tubesFront(g, tubes);
  for (const [p, f] of [[PATHS.top, 0.04], [PATHS.top, 0.55], [PATHS.shaft, 0.02], [PATHS.shaft, 0.3], [PATHS.shaft, 0.6], [PATHS.drop, 0.1], [PATHS.drop, 0.5], [PATHS.drop, 0.82], [PATHS.cool, 0.02], [PATHS.cool, 0.33], [PATHS.cool, 0.66], [PATHS.cool, 0.97], [PATHS.sortRail, 0.03]]) collar(g, p, p.len * f, 14, 6, f < 0.05 ? BRASS_CYL : CYL);
  band(g, 3680, DECK + 15, 44, TUBE_OUT + 12, HALF_PI, STEEL);            // Durchführung durch das Deck
  hopperFront(g); drumFront(g); beltFront(g); polisherFront(g); kilnFront(g);
  colourFront(g); coolFront(g); inspectFront(g); bigWheelFront(g); sorterFront(g); rawBin(g, true);
  quietDetails(g);
  neon(g, 1790, 150, 'MARBLE FACTORY ', 'XL', 78);
  board(g, 1790, 318, FLOW ? FLOW.done : 35);
  for (const [x, y, a, b] of [[560, 250, '01 ', 'RAW'], [1110, 440, '02 ', 'WASH'], [1970, 520, '03 ', 'POLISH'], [2800, 610, '04 ', 'KILN'],
    [3300, 1650, '05 ', 'COLOUR'], [2580, 1910, '06 ', 'COOL'], [2040, 1490, '07 ', 'INSPECT'], [1640, 1180, '08 ', 'LIFT'], [960, 1230, '09 ', 'SORT']]) neon(g, x, y, a, b, 40);
}
function vignette(g, w, h) { g.fillStyle = rad(g, w / 2, h * 0.46, h * 0.55, w / 2, h / 2, w * 0.62, [[0, 'rgba(0,0,0,0)'], [0.6, 'rgba(0,0,0,.14)'], [1, 'rgba(0,0,0,.55)']]); g.fillRect(0, 0, w, h); }
/** Standbild der ganzen Halle (für Entwurfsbilder). */
function render(t = 30) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  drawScene(g, t, 1); vignette(g, W, H);
  return cv;
}
function board(g, x, y, done) {
  const w = 900, h = 104, total = 96, n = Math.min(total, done);
  rr(g, x - w / 2, y - h / 2, w, h, 14); g.fillStyle = 'rgba(10,14,21,.82)'; g.fill(); g.strokeStyle = 'rgba(58,69,84,.9)'; g.lineWidth = 2; g.stroke();
  g.save(); g.textBaseline = 'middle';
  g.font = `800 44px ${FONT}`; g.fillStyle = '#ffffff'; g.textAlign = 'left'; g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 6; g.fillText(`${n} / ${total}`, x - w / 2 + 30, y - 10);
  g.font = `600 16px ${FONT}`; g.fillStyle = '#8fa0b8'; g.fillText('M A R B L E S   F I N I S H E D', x - w / 2 + 30, y + 30);
  g.textAlign = 'right'; g.font = `800 32px ${FONT}`; g.fillStyle = '#ffe1f1'; g.shadowColor = 'rgba(255,63,158,.9)'; g.shadowBlur = 12; g.fillText('II · COLOUR', x + w / 2 - 30, y - 12);
  g.font = `600 16px ${FONT}`; g.fillStyle = '#8fa0b8'; g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 6; g.fillText('N E X T :   S E C O N D   L I N E', x + w / 2 - 30, y + 30);
  rr(g, x - 130, y - 20, 260, 14, 7); g.fillStyle = '#0d1219'; g.fill(); g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 1.2; g.stroke();
  g.shadowColor = 'rgba(34,211,238,.9)'; g.shadowBlur = 10; rr(g, x - 128, y - 18, 256 * (n / total), 10, 5); g.fillStyle = '#22d3ee'; g.fill();
  g.restore();
}
/** Liefert Übersicht und Ausschnitte als PNG-Daten (Base64 ohne Präfix). crops: [{ x, y, w, h }] */
function exportImages(crops = []) {
  const full = render();
  const scaled = (sx, sy, sw, sh, dw, dh) => { const c = document.createElement('canvas'); c.width = dw; c.height = dh; const t = c.getContext('2d'); t.imageSmoothingQuality = 'high'; t.drawImage(full, sx, sy, sw, sh, 0, 0, dw, dh); const u = c.toDataURL('image/png'); return u.slice(u.indexOf(',') + 1); };
  return { overview: scaled(0, 0, W, H, 1920, 1080), crops: crops.map((c) => scaled(c.x, c.y, c.w, c.h, c.w, c.h)) };
}

EBS.MarbleXLConcept = { render, exportImages, drawScene, vignette, cameraAt, flowAt, eventsBetween, W, H, PERIOD, LOOP };
})();
