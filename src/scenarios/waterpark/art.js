/* Endless Waterpark: static artwork in the visual language of Endless Pyramid and the 2026-11-16 design mockup.
 * Everything here is painted once into cached layers. Light comes from the upper left; shadows fall down/right.
 * Load after critter-art.js and layout.js, before renderer.js.
 */
(function () {
'use strict';
const WP = EBS.Waterpark = EBS.Waterpark || {};
const TAU = Math.PI * 2;
const xy = p => Array.isArray(p) ? p : [p.x, p.y];

// Palette measured from the 2026-11-16 mockup (see docs/WASSERPARK_MOCKUP_PLAN_2026-11-16.md, Stilbibel)
const C = {
  outline: '#86674a', rimLight: '#fffaf1', rim: '#efe4d3', rimShade: '#d7bea0', seam: '#c9ad89', innerWall: '#f4ecdf',
  waterDeep: '#1abacb', water: '#30e3ec', waterCore: '#9af3f3',
  woodDark: '#a65f28', wood: '#e3944a', woodLight: '#f1a353', plank: '#f6d6a6', plankShade: '#e0a865',
  glassFrame: '#2f86a2', glassLight: '#e8fcfb',
  stone: '#e6d4bb', stoneJoint: '#cbb393', stoneCap: '#f4eadb', stoneDark: '#c4a987',
  rock: '#b9b6a2', rockLight: '#ddd8c4', rockDark: '#8a8573',
  glaze: 'rgba(140,210,30,.3)',
};
WP.ART_COLORS = C;

function poly(g, pts, close = true) { g.beginPath(); pts.forEach((p, i) => { const [x, y] = xy(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); if (close) g.closePath(); }
function dot(g, x, y, r) { g.beginPath(); g.arc(x, y, Math.max(.1, r), 0, TAU); g.fill(); }
function ellipse(g, x, y, rx, ry, color) { g.fillStyle = color; g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, TAU); g.fill(); }
/** Polyline stroke with an optional screen offset (used for rims, lips and highlights). */
function line(g, pts, width, color, dx = 0, dy = 0) {
  if (pts.length < 2) return;
  g.beginPath(); pts.forEach((p, i) => { const [x, y] = xy(p); i ? g.lineTo(x + dx, y + dy) : g.moveTo(x + dx, y + dy); });
  g.lineWidth = width; g.strokeStyle = color; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
}
function roundRect(g, x, y, w, h, r, color) { g.fillStyle = color; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); }
WP.artUtil = { poly, dot, ellipse, line, roundRect };
/** Paints into an offscreen copy and lays a glaze over exactly what was painted, then composites it onto g. */
function glazed(g, tint, paint) {
  const c = document.createElement('canvas'); c.width = g.canvas.width; c.height = g.canvas.height;
  const cg = c.getContext('2d'); cg.setTransform(g.getTransform()); paint(cg);
  cg.setTransform(1, 0, 0, 1, 0, 0); cg.globalCompositeOperation = 'source-atop'; cg.fillStyle = tint; cg.fillRect(0, 0, c.width, c.height);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(c, 0, 0); g.restore();
  c.width = c.height = 1;
}

const TROUGH = R => ({ out: 2 * R + 30, inner: 2 * R + 8 });
WP.troughSize = TROUGH;

/** Soft drop shadow of a path (cached layers only, uses a blur filter). */
function pathShadow(g, pts, width, alpha = .2) {
  g.save(); g.filter = 'blur(5px)'; line(g, pts, width, `rgba(16,58,66,${alpha})`, 7, 13); g.restore();
}
/** Open cream half-pipe with a turquoise water film (static part). */
function trough(g, pts, R) {
  const { out, inner } = TROUGH(R), wf = inner - 14, D = Math.round(R * .42);
  // Side wall below the rim: stacked strokes give the slab its thickness (light from the upper left)
  line(g, pts, out + 5, C.outline, 0, D + 1.5);
  for (let k = D; k > 0; k -= 2) line(g, pts, out, k > D * .55 ? '#c9aa84' : C.rimShade, .5, k);
  line(g, pts, out + 5, C.outline, 0, 1.5);
  line(g, pts, out, C.rimShade, 1.5, 6);
  line(g, pts, out, C.rimLight, -1, -2);
  line(g, pts, out - 5, C.rim, .5, 1);
  line(g, pts, inner + 4, C.seam, 0, .5);
  line(g, pts, inner, C.innerWall, 0, 0);
  line(g, pts, wf + 4, C.waterDeep, .5, 4);
  line(g, pts, wf, C.water, .5, 3.5);
  line(g, pts, wf * .38, C.waterCore, 0, 2);
  line(g, pts, 2.2, 'rgba(255,255,255,.75)', -.5, -wf / 2 + 6);
}
WP.paintTrough = trough;
WP.paintPathShadow = pathShadow;
/** Transparent outlet tube under the funnel (back half, the animal is drawn on top). */
/** Polyline shifted sideways along its local normal (positive d: to the left of the travel direction). */
function offset(pts, d) {
  const a = pts.map(xy);
  return a.map((p, i) => {
    const p0 = a[Math.max(0, i - 1)], p1 = a[Math.min(a.length - 1, i + 1)], l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
    return [p[0] + (p1[1] - p0[1]) / l * d, p[1] - (p1[0] - p0[0]) / l * d];
  });
}
function tube(g, pts, R) {
  const w = 2 * R + 18;
  line(g, pts, w + 5, 'rgba(22,84,104,.85)');
  line(g, pts, w, 'rgba(196,242,248,.62)');
  line(g, pts, w - 14, 'rgba(34,172,210,.82)');
  line(g, pts, (w - 14) * .36, 'rgba(140,236,244,.62)');
}
WP.paintTubeFront = function (g, pts, R) {
  const w = 2 * R + 18, a = pts.map(xy);
  line(g, pts, w - 6, 'rgba(220,250,255,.12)');
  // Ring joints of the glass sections
  let acc = 40;
  for (let i = 1; i < a.length - 1; i++) {
    acc += Math.hypot(a[i][0] - a[i - 1][0], a[i][1] - a[i - 1][1]); if (acc < 86) continue; acc = 0;
    const tri = [a[i - 1], a[i], a[i + 1]], l = offset(tri, w / 2 + 2)[1], r = offset(tri, -w / 2 - 2)[1];
    line(g, [l, r], 7, 'rgba(22,84,104,.55)'); line(g, [l, r], 4, 'rgba(236,252,255,.75)');
  }
  line(g, offset(pts, w / 2 - 8), 3.2, 'rgba(255,255,255,.85)');
  line(g, offset(pts, -(w / 2 - 9)), 2, 'rgba(255,255,255,.45)');
};

/** Wooden post with light left edge and dark outline. */
function post(g, x, y0, y1, w = 12) {
  line(g, [[x, y0], [x, y1]], w + 3, C.woodDark);
  line(g, [[x, y0], [x, y1]], w, C.wood);
  line(g, [[x - w * .28, y0 + 2], [x - w * .28, y1 - 2]], w * .3, C.woodLight);
}
function beam(g, a, b, w = 8) {
  line(g, [a, b], w + 3, C.woodDark); line(g, [a, b], w, C.wood); line(g, [a, b], w * .35, 'rgba(250,196,128,.75)', 0, -w * .2);
}

// ---------------------------------------------------------------- sky
WP.paintSky = function (g, L) {
  const gr = g.createLinearGradient(0, 0, 0, L.waterY);
  gr.addColorStop(0, '#26a0ff'); gr.addColorStop(.42, '#36acfe'); gr.addColorStop(.8, '#6ac9fd'); gr.addColorStop(1, '#c4ecfe');
  g.fillStyle = gr; g.fillRect(0, 0, L.W, L.H);
};

// ---------------------------------------------------------------- background scenery
WP.paintBack = function (g, L, rng, art) {
  const { W, H, waterY, land } = L, wallH = H * (land ? .052 : .04), wallTop = waterY - wallH;
  L.wallTop = wallTop;
  // Far hazy hills with faint palm silhouettes
  const farTop = waterY - H * (land ? .33 : .25), midTop = waterY - H * (land ? .2 : .145);
  const ridge = (y0, amp, freq, ph) => { const pts = []; for (let x = -20; x <= W + 20; x += 8) pts.push([x, y0 + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 2.7 + ph * 2) * amp * .35]); return pts; };
  let gr = g.createLinearGradient(0, farTop - 40, 0, wallTop);
  gr.addColorStop(0, '#b4e2d2'); gr.addColorStop(1, '#88c59a');
  g.fillStyle = gr; poly(g, [...ridge(farTop, 26, .004, rng.range(0, 6)), [W + 20, wallTop], [-20, wallTop]]); g.fill();
  g.save(); g.globalAlpha = .38;
  for (let i = 0; i < (land ? 9 : 6); i++) art.palm(g, rng, rng.range(0, W), farTop + rng.range(30, 90), rng.range(80, 140), rng.range(-.2, .2));
  g.restore();
  gr = g.createLinearGradient(0, farTop - 40, 0, wallTop);
  gr.addColorStop(0, 'rgba(214,240,250,.45)'); gr.addColorStop(1, 'rgba(214,240,250,0)');
  g.fillStyle = gr; g.fillRect(0, farTop - 60, W, wallTop - farTop + 60);
  // Jungle band (Pyramid island technique: dark base plus layered foliage blobs)
  const canopy = ridge(midTop, 18, .011, rng.range(0, 6));
  glazed(g, C.glaze, g => {
    g.fillStyle = '#1f5a28'; poly(g, [...canopy, [W + 20, wallTop + 4], [-20, wallTop + 4]]); g.fill();
    for (let i = 0; i < (land ? 14 : 9); i++) art.palm(g, rng, rng.range(-20, W + 20), midTop + rng.range(20, 60), rng.range(110, 200), rng.range(-.2, .2));
    art.foliage(g, rng, canopy, 6, (wallTop - midTop) * .75, (nx, ny) => ny > 0, { dens: 3, rMin: 4, rMax: 11, flowers: .02 });
  });
  // Rocks with a side waterfall (animated water is drawn per frame)
  const fall = land ? { x: W * .925, top: H * .34, w: 58 } : { x: W * .9, top: H * .47, w: 50 };
  L.waterfall = { ...fall, bottom: wallTop + 6 };
  const rocks = [];
  for (let i = 0; i < 9; i++) {
    const cx = fall.x + rng.range(-1, 1) * (land ? 120 : 90), cy = fall.top + 30 + rng.range(0, 1) * (wallTop - fall.top - 30), r = rng.range(45, 85);
    rocks.push([cx, cy, r]);
  }
  rocks.push([fall.x - 70, fall.top + 10, 70], [fall.x + 70, fall.top + 20, 75], [fall.x, fall.top - 12, 62]);
  for (const [cx, cy, r] of rocks) {
    const pts = []; for (let k = 0; k < 9; k++) { const a = k / 9 * TAU; pts.push([cx + Math.cos(a) * r * rng.range(.8, 1.1), cy + Math.sin(a) * r * .8 * rng.range(.8, 1.1)]); }
    g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = C.rockDark;
    const rg = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r); rg.addColorStop(0, C.rockLight); rg.addColorStop(.6, C.rock); rg.addColorStop(1, C.rockDark);
    g.fillStyle = rg; poly(g, pts); g.fill(); g.stroke();
  }
  glazed(g, C.glaze, g => art.foliage(g, rng, [[fall.x - 140, fall.top - 30], [fall.x - 40, fall.top - 50], [fall.x + 40, fall.top - 45], [fall.x + 150, fall.top - 20]], 6, 26, (nx, ny) => ny > 0, { dens: 3, rMin: 3, rMax: 9, flowers: .05 }));
  // Big frame palms at the edges
  const big = land ? [[30, 520, .14], [140, 330, .08], [W - 20, 430, -.18]] : [[20, 430, .12], [W - 22, 360, -.16]];
  glazed(g, C.glaze, g => { for (const [x, h, lean] of big) art.palm(g, rng, x, wallTop + 6, h, lean); });
  // Retaining wall of sandstone blocks behind the lagoon
  g.fillStyle = C.stone; g.fillRect(0, wallTop, W, wallH);
  g.strokeStyle = C.stoneJoint; g.lineWidth = 2;
  const rows = 2, bh = wallH / rows;
  for (let r = 0; r < rows; r++) {
    const y = wallTop + r * bh; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    for (let x = (r % 2) * 40; x < W; x += 80) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + bh); g.stroke(); }
  }
  const shade = g.createLinearGradient(0, wallTop, 0, waterY); shade.addColorStop(0, 'rgba(255,255,255,0)'); shade.addColorStop(1, 'rgba(90,60,30,.22)');
  g.fillStyle = shade; g.fillRect(0, wallTop, W, wallH);
  roundRect(g, -10, wallTop - 9, W + 20, 13, 4, C.stoneCap);
  line(g, [[0, wallTop + 4], [W, wallTop + 4]], 2, 'rgba(120,90,50,.35)');
  // Planted wall top with hibiscus
  glazed(g, C.glaze, g => art.foliage(g, rng, [[-10, wallTop - 10], [W + 10, wallTop - 10]], 2, 20, (nx, ny) => ny < 0, { dens: 2, rMin: 3, rMax: 9, flowers: .05 }));
  for (let i = 0; i < (land ? 16 : 10); i++) hibiscus(g, rng.range(0, W), wallTop - rng.range(14, 30), rng.range(5, 8), rng);
  // Terraces with parasols and loungers, lamps, waterwheel stand and bridge
  const deco = land ? { parasols: [[W * .055, wallTop, 70], [W * .965, wallTop, 64]], lamps: [W * .025, W * .985] }
    : { parasols: [[W * .08, wallTop, 60]], lamps: [W * .03] };
  for (const [x, y, r] of deco.parasols) parasol(g, x, y, r);
  L.lamps = deco.lamps.map(x => [x, wallTop - 120]);
  for (const x of deco.lamps) lamp(g, x, wallTop);
  // Pool coping at the waterline
  roundRect(g, -10, waterY - 9, W + 20, 12, 3, C.stoneCap);
  line(g, [[0, waterY + 3], [W, waterY + 3]], 3, 'rgba(20,110,120,.25)');
};
function hibiscus(g, x, y, r, rng) {
  const col = ['#ff6f9f', '#ff8db3', '#ff9a5a', '#ffd1e2'][Math.floor(rng.next() * 4)];
  g.fillStyle = col;
  for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + .3; g.beginPath(); g.ellipse(x + Math.cos(a) * r * .6, y + Math.sin(a) * r * .6, r * .62, r * .42, a, 0, TAU); g.fill(); }
  g.fillStyle = '#ffe16a'; dot(g, x, y, r * .22);
}
WP.hibiscus = hibiscus;
function parasol(g, x, y, r) {
  // Loungers
  for (const dx of [-r * .95, r * .2]) {
    line(g, [[x + dx, y - 6], [x + dx + r * .75, y - 6]], 7, '#9a6a3c');
    line(g, [[x + dx, y - 9], [x + dx + r * .55, y - 9], [x + dx + r * .75, y - 22]], 6, '#f4f1e6');
    line(g, [[x + dx + 6, y - 6], [x + dx + 6, y]], 3, '#7a5332'); line(g, [[x + dx + r * .7, y - 6], [x + dx + r * .7, y]], 3, '#7a5332');
  }
  line(g, [[x, y], [x, y - r * 1.55]], 5, '#7f5a35');
  const ty = y - r * 1.55;
  g.fillStyle = '#d9b46e'; g.strokeStyle = '#9b7440'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(x - r, ty + r * .38); g.quadraticCurveTo(x - r * .5, ty - r * .05, x, ty - r * .42); g.quadraticCurveTo(x + r * .5, ty - r * .05, x + r, ty + r * .38); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(140,100,50,.55)'; g.lineWidth = 1.5;
  for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(x, ty - r * .4); g.lineTo(x + i * r / 6, ty + r * .36); g.stroke(); }
  // Straw fringe
  g.strokeStyle = '#c69a52'; g.lineWidth = 2;
  for (let i = -10; i <= 10; i++) { const fx = x + i * r / 10; g.beginPath(); g.moveTo(fx, ty + r * .36 - Math.abs(i) * .4); g.lineTo(fx + 1, ty + r * .5); g.stroke(); }
}
function lamp(g, x, ground) {
  const top = ground - 120;
  line(g, [[x, ground], [x, top + 22]], 7, '#5a3c22'); line(g, [[x - 1, ground], [x - 1, top + 22]], 3, '#8a6038');
  line(g, [[x, top + 18], [x + 16, top + 12]], 4, '#5a3c22');
  roundRect(g, x + 6, top - 4, 22, 30, 5, '#6b4a2a'); roundRect(g, x + 10, top + 1, 14, 20, 3, '#ffe2a0');
  g.fillStyle = '#6b4a2a'; poly(g, [[x + 3, top - 3], [x + 17, top - 13], [x + 31, top - 3]]); g.fill();
}
WP.lampPos = (x, ground) => [x + 17, ground - 109];

// ---------------------------------------------------------------- structures
/** Posts and braces: a timber scaffold under the deck and single supports with knee braces under high slides. */
WP.paintFrame = function (g, L) {
  const { R, deck, lift } = L, ground = L.wallTop, towerHalf = R + 40;
  const clearOfTower = x => Math.abs(x - lift.x) > towerHalf + 10;
  // Deck scaffold
  const deckBottom = deck.y + 28, cols = [];
  for (let x = deck.x0 + 26; x <= deck.x1 - 20; x += 180) if (clearOfTower(x)) cols.push(x);
  if (clearOfTower(deck.x1 - 20)) cols.push(deck.x1 - 20);
  for (let i = 0; i < cols.length - 1; i++) {
    const a = cols[i], b = cols[i + 1]; if (b - a > 260 || !clearOfTower((a + b) / 2)) continue;
    for (let y = deckBottom + 20, k = 0; y < ground - 60; y += 190, k++) {
      const y2 = Math.min(ground - 10, y + 190);
      beam(g, [a, y], [b, y], 7);
      if ((k + i) % 2 === 0) { beam(g, [a, y], [b, y2], 5); beam(g, [b, y], [a, y2], 5); }
    }
  }
  for (const x of cols) post(g, x, deckBottom - 4, ground + 4, 13);
  // Supports under slides and the funnel
  for (const route of L.routes) for (const seg of route.drawSegments) {
    if (seg.kind === 'deck' || seg.kind === 'tube') continue;
    let last = -1e9;
    for (const p of seg) {
      if (p.s - last < 210) continue;
      if (p.y > ground - 110 || !clearOfTower(p.x) || Math.abs(p.y - deck.y) < 50) continue;
      last = p.s;
      const top = p.y + R + 14;
      post(g, p.x, top, ground + 4, 11);
      for (const sgn of [-1, 1]) if ((Math.round(p.s / 210) + (sgn > 0 ? 1 : 0)) % 2) beam(g, [p.x, top + 55], [p.x + sgn * 34, top + 6], 5);
      if (top < ground - 260) beam(g, [p.x - 18, top + 120], [p.x + 18, top + 120], 5);
    }
  }
  const f = L.funnel;
  for (const dx of [-.62, -.22, .22, .62]) post(g, f.x + dx * f.rx, f.y + f.ry * 1.2, ground + 4, 11);
  beam(g, [f.x - f.rx * .62, f.y + f.ry * 2.6], [f.x + f.rx * .62, f.y + f.ry * 2.6], 6);
};

/** Wooden launch deck with plank top, front fascia, back railing and hanging plants. */
WP.paintDeck = function (g, L, rng, art) {
  const { deck, lift, R } = L, y = deck.y, x0 = deck.x0, x1 = deck.x1;
  // Back railing (behind the animals)
  const railTop = y - R * 1.45;
  for (let x = x0 + 8; x <= x1 - 4; x += 58) line(g, [[x, y], [x, railTop]], 6, C.wood);
  line(g, [[x0 + 4, railTop], [x1 - 4, railTop]], 7, C.woodDark); line(g, [[x0 + 4, railTop], [x1 - 4, railTop]], 4.5, C.woodLight);
  line(g, [[x0 + 4, railTop + R * .55], [x1 - 4, railTop + R * .55]], 3.5, C.wood);
  for (let x = x0 + 30; x < x1 - 30; x += 116) { ellipse(g, x, railTop - 4, 5, 5, '#f8cf8e'); }
  // Plank top and fascia
  roundRect(g, x0, y - 4, x1 - x0, 10, 3, C.plank);
  line(g, [[x0 + 2, y - 3], [x1 - 2, y - 3]], 2, 'rgba(255,248,226,.8)');
  g.fillStyle = C.plankShade; g.fillRect(x0, y + 6, x1 - x0, 20);
  g.strokeStyle = 'rgba(150,90,40,.4)'; g.lineWidth = 1.5;
  for (let x = x0 + 22; x < x1; x += 44) { g.beginPath(); g.moveTo(x, y + 7); g.lineTo(x, y + 25); g.stroke(); }
  line(g, [[x0, y + 26], [x1, y + 26]], 3, C.woodDark);
  // Flower boxes with trailing ivy, kept clear of slide launches
  const launches = L.routes.map(r => r.launch[0]);
  for (let x = x0 + 70; x < x1 - 60; x += 175) {
    if (launches.some(lx => Math.abs(lx - x) < 70) || Math.abs(x - lift.x) < R + 60) continue;
    roundRect(g, x - 34, y + 10, 68, 14, 3, '#c47a3a');
    glazed(g, C.glaze, g => art.foliage(g, rng, [[x - 32, y + 8], [x + 32, y + 8]], 4, 8, (nx, ny) => ny < 0, { dens: 3, rMin: 2.5, rMax: 6, flowers: .12 }));
    for (let k = 0; k < 4; k++) {
      const vx = x - 26 + k * 17, len = rng.range(30, 80), pts = [];
      for (let j = 0; j <= 8; j++) pts.push([vx + Math.sin(j * .9 + k) * 4, y + 22 + len * j / 8]);
      line(g, pts, 2, '#3f8f2a');
      g.fillStyle = '#7cbf2e'; for (let j = 2; j <= 8; j += 2) { const [px, py] = pts[j]; g.beginPath(); g.ellipse(px + (j % 4 ? 3 : -3), py, 4, 2.6, (j % 4 ? .6 : -.6), 0, TAU); g.fill(); }
    }
  }
};

/** Glass tower: back panes, frame, base pier and faceted pyramid roof (lift mechanics are drawn per frame). */
WP.paintTower = function (g, L) {
  const { lift, R, deck } = L, x = lift.x, hw = R + 34, top = deck.y - R * 2.9, bottom = lift.bottom + R * .6;
  L.tower = { x, hw, top, bottom };
  // Back panes
  const gl = g.createLinearGradient(x - hw, 0, x + hw, 0);
  gl.addColorStop(0, 'rgba(140,226,244,.55)'); gl.addColorStop(.35, 'rgba(176,240,250,.36)'); gl.addColorStop(.7, 'rgba(90,190,220,.42)'); gl.addColorStop(1, 'rgba(36,128,168,.6)');
  g.fillStyle = gl; g.fillRect(x - hw, top, hw * 2, bottom - top);
  g.fillStyle = 'rgba(8,52,80,.14)'; g.fillRect(x - R * 1.1, top, R * 2.2, bottom - top);
  // Base pier in the water
  roundRect(g, x - hw - 10, bottom - 8, hw * 2 + 20, 26, 6, '#ddc6aa'); roundRect(g, x - hw - 10, bottom - 8, hw * 2 + 20, 7, 4, C.stoneCap);
  // Frame: corner posts, mullions and rings
  for (const sx of [-1, 1]) { line(g, [[x + sx * hw, top - 6], [x + sx * hw, bottom]], 8, C.glassFrame); line(g, [[x + sx * hw - 2, top - 6], [x + sx * hw - 2, bottom]], 2.2, C.glassLight); }
  for (const sx of [-.42, .42]) line(g, [[x + sx * hw, top], [x + sx * hw, bottom]], 2.5, 'rgba(43,101,113,.55)');
  for (let y = top + 70; y < bottom - 20; y += 120) { line(g, [[x - hw, y], [x + hw, y]], 3.5, C.glassFrame); line(g, [[x - hw, y - 2], [x + hw, y - 2]], 1.2, 'rgba(228,251,246,.7)'); }
  // Roof cabin ring and faceted glass pyramid
  const ry = top - 4, rw = hw + 18, apex = ry - (L.land ? 50 : 64);
  roundRect(g, x - rw, ry - 10, rw * 2, 16, 4, C.rim); line(g, [[x - rw, ry + 6], [x + rw, ry + 6]], 2.5, C.seam);
  g.lineJoin = 'round';
  g.fillStyle = '#b6f1f6'; poly(g, [[x - rw, ry - 10], [x - rw * .18, ry - 16], [x, apex]]); g.fill();
  g.fillStyle = '#6fd2e6'; poly(g, [[x - rw * .18, ry - 16], [x + rw * .3, ry - 16], [x, apex]]); g.fill();
  g.fillStyle = '#2f9cc2'; poly(g, [[x + rw * .3, ry - 16], [x + rw, ry - 10], [x, apex]]); g.fill();
  g.strokeStyle = C.glassFrame; g.lineWidth = 3; poly(g, [[x - rw, ry - 10], [x, apex], [x + rw, ry - 10]], false); g.stroke();
  g.lineWidth = 2; for (const fx of [-rw * .18, rw * .3]) { g.beginPath(); g.moveTo(x + fx, ry - 16); g.lineTo(x, apex); g.stroke(); }
  for (let k = 1; k < 4; k++) { const f = k / 4, yy = ry - 12 + (apex - ry + 12) * f, w = rw * (1 - f); line(g, [[x - w, yy], [x + w, yy]], 1.6, 'rgba(43,101,113,.6)'); }
  line(g, [[x - rw + 8, ry - 14], [x - 4, apex + 10]], 2.5, 'rgba(255,255,255,.75)');
  ellipse(g, x, apex - 4, 7, 7, '#f2cf5b'); ellipse(g, x - 2, apex - 6, 2.5, 2.5, '#fff6c4');
  L.tower.apex = [x, apex];
};
/** Front glints of the tower, drawn over the lift each frame. */
WP.paintTowerFront = function (g, L) {
  const T = L.tower; if (!T) return; const { x, hw, top, bottom } = T;
  g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(x - hw, top, hw * .45, bottom - top);
  g.save(); g.beginPath(); g.rect(x - hw, top, hw * 2, bottom - top); g.clip();
  g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 16;
  for (let y = top + 40; y < bottom; y += 260) { g.beginPath(); g.moveTo(x - hw, y + 60); g.lineTo(x + hw, y - 20); g.stroke(); }
  g.lineWidth = 5; for (let y = top + 70; y < bottom; y += 260) { g.beginPath(); g.moveTo(x - hw, y + 95); g.lineTo(x + hw, y + 15); g.stroke(); }
  g.restore();
};

/** The open funnel bowl: cone shell, cream rim, water surface with dark drain. */
WP.paintFunnel = function (g, L) {
  const f = L.funnel, { x, y, rx, ry } = f, depth = ry * 1.9, neck = rx * .14;
  g.save(); g.filter = 'blur(6px)'; ellipse(g, x + 10, y + depth + 14, rx * .7, ry * .5, 'rgba(16,58,66,.22)'); g.restore();
  const cone = g.createLinearGradient(x - rx, 0, x + rx, 0);
  cone.addColorStop(0, '#fcf7ee'); cone.addColorStop(.45, '#efe4d3'); cone.addColorStop(1, '#cdb08c');
  g.fillStyle = cone; g.strokeStyle = C.outline; g.lineWidth = 3;
  g.beginPath(); g.moveTo(x - rx, y); g.bezierCurveTo(x - rx * .9, y + depth * .7, x - neck * 1.6, y + depth * .85, x - neck, y + depth);
  g.lineTo(x + neck, y + depth); g.bezierCurveTo(x + neck * 1.6, y + depth * .85, x + rx * .9, y + depth * .7, x + rx, y); g.closePath(); g.fill(); g.stroke();
  line(g, [[x - rx * .55, y + depth * .45], [x - neck * 1.4, y + depth * .9]], 3, 'rgba(255,255,255,.45)');
  // Rim
  ellipse(g, x, y + 3, rx + 6, ry + 6, C.outline); ellipse(g, x, y + 2, rx + 4, ry + 4, C.rimShade); ellipse(g, x, y, rx + 3, ry + 3, C.rimLight); ellipse(g, x, y + 1, rx - 3, ry - 2, C.rim);
  // Water surface
  const wr = rx - 12, wry = ry - 7, wg = g.createRadialGradient(x, y + wry * .2, wr * .08, x, y, wr);
  wg.addColorStop(0, '#11789a'); wg.addColorStop(.18, '#1aaec4'); wg.addColorStop(.55, '#30dbe6'); wg.addColorStop(1, '#8ff1f2');
  g.save(); g.beginPath(); g.ellipse(x, y + 1, wr, wry, 0, 0, TAU); g.clip();
  g.fillStyle = C.innerWall; g.fillRect(x - wr, y - wry, wr * 2, wry * 2.2);
  g.fillStyle = wg; g.beginPath(); g.ellipse(x, y + 4, wr, wry - 2, 0, 0, TAU); g.fill();
  g.restore();
  ellipse(g, x, y + wry * .22, wr * .14, wry * .16, '#0d5a74');
  g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y + 1, wr - 4, wry - 3, 0, Math.PI * 1.05, Math.PI * 1.5); g.stroke();
};
WP.paintTube = tube;
/** Bowl silhouette, used to cut the outlet tube's front glints where they would shine through the funnel. */
WP.funnelCut = function (g, L) {
  const { x, y, rx, ry } = L.funnel, depth = ry * 1.9, neck = rx * .14;
  g.beginPath(); g.moveTo(x - rx, y); g.bezierCurveTo(x - rx * .9, y + depth * .7, x - neck * 1.6, y + depth * .85, x - neck, y + depth);
  g.lineTo(x + neck, y + depth); g.bezierCurveTo(x + neck * 1.6, y + depth * .85, x + rx * .9, y + depth * .7, x + rx, y); g.closePath(); g.fill();
  g.beginPath(); g.ellipse(x, y + 3, rx + 7, ry + 7, 0, 0, TAU); g.fill();
};
/** Front half of the funnel rim, drawn over animals riding the spiral so they sit inside the bowl. */
WP.paintFunnelFront = function (g, L) {
  const { x, y, rx, ry } = L.funnel;
  g.save(); g.beginPath(); g.rect(x - rx - 12, y + 1, 2 * rx + 24, ry + 14); g.clip();
  g.beginPath(); g.ellipse(x, y + 3, rx + 6, ry + 6, 0, 0, TAU); g.ellipse(x, y + 1, rx - 12, ry - 7, 0, 0, TAU); g.clip('evenodd');
  ellipse(g, x, y + 3, rx + 6, ry + 6, C.outline); ellipse(g, x, y + 2, rx + 4, ry + 4, C.rimShade); ellipse(g, x, y, rx + 3, ry + 3, C.rimLight); ellipse(g, x, y + 1, rx - 3, ry - 2, C.rim);
  g.restore();
};

/** Seesaw stand: stone footing, A-frame legs and the large bearing wheel (the board itself moves). */
WP.paintSeesawStand = function (g, L) {
  const s = L.seesaw, { x, y } = s, h = L.wallTop - y + 4, foot = y + h;
  roundRect(g, x - 70, foot - 6, 140, 20, 6, '#ddc6aa'); roundRect(g, x - 70, foot - 6, 140, 6, 4, C.stoneCap);
  for (const sx of [-1, 1]) { line(g, [[x, y + 6], [x + sx * 52, foot - 4]], 19, C.woodDark); line(g, [[x, y + 6], [x + sx * 52, foot - 4]], 15, C.wood); line(g, [[x - 3, y + 8], [x + sx * 52 - 3, foot - 6]], 4, C.woodLight); }
  beam(g, [x - 30, y + h * .55], [x + 30, y + h * .55], 8);
};
WP.paintSeesawWheel = function (g, L, angle) {
  const { x, y } = L.seesaw, r = L.R * .85;
  ellipse(g, x, y + 4, r + 4, r + 4, C.woodDark); ellipse(g, x, y + 4, r, r, '#f6c27e');
  g.save(); g.translate(x, y + 4); g.rotate(angle * 3);
  for (let k = 0; k < 6; k++) { g.rotate(TAU / 6); line(g, [[0, 0], [r - 4, 0]], 4, '#c07a3a'); }
  g.restore(); ellipse(g, x, y + 4, r * .32, r * .32, C.woodDark); ellipse(g, x - 2, y + 2, r * .12, r * .12, '#fbe3b0');
};

/** Springboard pedestal rising from the lagoon. */
WP.paintSpringStand = function (g, L) {
  const j = L.jump, x = j.x + 6, y = j.y + L.R + 14, ground = L.wallTop;
  post(g, x, y + 30, ground + 4, 14);
  roundRect(g, x - 36, y + 22, 72, 14, 6, '#ddc6aa'); roundRect(g, x - 36, y + 22, 72, 5, 3, C.stoneCap);
};

/** Foreground corners: reeds, cattails and hibiscus in front of the lagoon edge. */
WP.paintFore = function (g, L, rng, art) {
  const { W, H } = L, corners = L.land ? [[-10, 1], [W + 10, -1]] : [[-10, 1], [W + 10, -1]];
  for (const [x0, dir] of corners) {
    for (let i = 0; i < 16; i++) {
      const bx = x0 + dir * rng.range(0, L.land ? 120 : 90), h = rng.range(110, 210), lean = dir * rng.range(.05, .3), by = H + 6;
      const tip = [bx + lean * h, by - h];
      g.strokeStyle = i % 3 ? '#3c8a2a' : '#64aa26'; g.lineWidth = rng.range(4, 7); g.lineCap = 'round';
      g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx, by - h * .6, tip[0], tip[1]); g.stroke();
      if (i % 4 === 0) { line(g, [[bx + lean * h * .55, by - h * .72], [bx + lean * h * .62, by - h * .95]], 9, '#7a4a26'); }
    }
    glazed(g, C.glaze, g => art.foliage(g, rng, [[x0, H - 30], [x0 + dir * (L.land ? 150 : 110), H + 10]], 26, 26, () => true, { dens: 3, rMin: 6, rMax: 14 }));
    for (let i = 0; i < 4; i++) hibiscus(g, x0 + dir * rng.range(15, L.land ? 130 : 95), H - rng.range(10, 70), rng.range(8, 13), rng);
  }
};
})();
