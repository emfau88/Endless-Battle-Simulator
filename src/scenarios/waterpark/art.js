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
  woodDark: '#8f5628', wood: '#b9763f', woodLight: '#de9a52', plank: '#f6d6a6', plankShade: '#e0a865',
  glassFrame: '#2f86a2', glassLight: '#e8fcfb',
  stone: '#ddc6aa', stoneJoint: '#c4ab8a', stoneCap: '#e6d4bb', stoneDark: '#c4a987', stoneLight: '#f4eadb',
  face: '#d7bea0', faceDark: '#c8ae85', deckTop: '#efe4d3',
  metal: '#a5bacb', metalLight: '#e8f0f6', metalDark: '#3d4f58', board: '#f7e332',
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

/** Aerial perspective: paints into an offscreen copy and lays it down about 10 % lighter with 20 % less contrast. */
function hazed(g, paint, filter = 'contrast(0.8) brightness(1.1) saturate(0.92)') {
  const c = document.createElement('canvas'); c.width = g.canvas.width; c.height = g.canvas.height;
  const cg = c.getContext('2d'); cg.setTransform(g.getTransform()); paint(cg);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.filter = filter; g.drawImage(c, 0, 0); g.restore();
  c.width = c.height = 1;
}

const TROUGH = WP.troughSize;

/** Soft drop shadow of a path (cached layers only, uses a blur filter). */
function pathShadow(g, pts, width, alpha = .2) {
  g.save(); g.filter = 'blur(5px)'; line(g, pts, width, `rgba(16,58,66,${alpha})`, 7, 13); g.restore();
}
/** Water channel of a trough: width and downward shift, so the far inner wall shows as a cream band above it. */
WP.troughWater = R => ({ wf: TROUGH(R).inner - 18, wo: Math.round(R * .18) });
/** Open cream half-pipe with a turquoise water film (static part). */
function trough(g, pts, R) { for (const stage of ['under', 'rim', 'bed', 'water']) troughStage(g, pts, R, stage); }
/** One stage of a trough. Painting two shapes stage by stage (all outlines, then all rims, then all water) fuses them
 *  into one piece: this is how the funnel's feed slide runs into the bowl without an edge between them. */
function troughStage(g, pts, R, stage) {
  const { out, inner } = TROUGH(R), { wf, wo } = WP.troughWater(R), D = Math.round(R * .42);
  if (stage === 'under') {
    // Side wall below the rim: stacked strokes give the slab its thickness (light from the upper left)
    line(g, pts, out + 5, C.outline, 0, D + 1.5);
    for (let k = D; k > 0; k -= 2) line(g, pts, out, k > D * .55 ? C.faceDark : C.rimShade, .5, k);
    line(g, pts, out + 5, C.outline, 0, 1.5);
  } else if (stage === 'rim') {
    line(g, pts, out, C.rimShade, 1.5, 6);
    line(g, pts, out, C.rimLight, -1, -2);
    line(g, pts, out - 5, C.rim, .5, 1);
  } else if (stage === 'bed') {
    // Channel: far inner wall in light cream, water lower in the channel and brighter in its middle
    line(g, pts, inner + 4, C.seam, 0, .5);
    line(g, pts, inner, '#e3d3ba', 0, 0);
    line(g, pts, inner - 6, C.innerWall, 0, -2);
  } else {
    line(g, pts, wf + 4, C.waterDeep, .5, wo + 1.5);
    line(g, pts, wf, C.water, .5, wo);
    line(g, pts, wf * .5, C.waterCore, 0, wo - 1);
    line(g, pts, 2.2, 'rgba(255,255,255,.8)', -.5, wo - wf / 2 + 5);
  }
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

/** Honey-coloured timber post: dark outline, shade side on the right, light edge on the left. */
function post(g, x, y0, y1, w = 20) {
  line(g, [[x, y0], [x, y1]], w + 4, C.woodDark);
  line(g, [[x, y0], [x, y1]], w, C.woodLight);
  line(g, [[x + w * .3, y0 + 2], [x + w * .3, y1 - 2]], w * .38, C.wood);
  line(g, [[x - w * .3, y0 + 3], [x - w * .3, y1 - 3]], Math.max(1.5, w * .14), 'rgba(250,190,110,.9)');
}
function beam(g, a, b, w = 8) {
  line(g, [a, b], w + 4, C.woodDark); line(g, [a, b], w, C.woodLight);
  line(g, [a, b], w * .38, C.wood, 0, w * .26); line(g, [a, b], Math.max(1.2, w * .18), 'rgba(250,190,110,.9)', 0, -w * .28);
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
  // Retaining wall behind the attractions: terraces on its top, bushes along its foot
  const rwTop = waterY - H * (land ? .19 : .13), rwBot = waterY - H * (land ? .095 : .07);
  L.terraceY = rwTop;
  const farTop = waterY - H * (land ? .40 : .30), midTop = waterY - H * (land ? .29 : .21);
  const ridge = (y0, amp, freq, ph) => { const pts = []; for (let x = -20; x <= W + 20; x += 8) pts.push([x, y0 + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 2.7 + ph * 2) * amp * .35]); return pts; };
  const fall = land ? { x: W * .925, top: H * .34, w: 58 } : { x: W * .79, top: H * .52, w: 50 };
  L.waterfall = { ...fall, bottom: wallTop + 6 };
  // Layers 2-4 in aerial perspective: far jungle silhouette, palm row, rock face with the waterfall
  hazed(g, g => {
    let gr = g.createLinearGradient(0, farTop - 40, 0, rwBot);
    gr.addColorStop(0, '#bfe7d8'); gr.addColorStop(1, '#93cda4');
    g.fillStyle = gr; poly(g, [...ridge(farTop, 26, .004, rng.range(0, 6)), [W + 20, rwBot], [-20, rwBot]]); g.fill();
    g.save(); g.globalAlpha = .34;
    for (let i = 0; i < (land ? 11 : 7); i++) art.palm(g, rng, rng.range(0, W), farTop + rng.range(30, 80), rng.range(80, 140), rng.range(-.2, .2));
    g.restore();
    gr = g.createLinearGradient(0, farTop - 40, 0, rwTop);
    gr.addColorStop(0, 'rgba(214,240,250,.5)'); gr.addColorStop(1, 'rgba(214,240,250,0)');
    g.fillStyle = gr; g.fillRect(0, farTop - 60, W, rwTop - farTop + 60);
    const canopy = ridge(midTop, 18, .011, rng.range(0, 6));
    glazed(g, C.glaze, g => {
      g.fillStyle = '#2a6a30'; poly(g, [...canopy, [W + 20, rwBot], [-20, rwBot]]); g.fill();
      for (let i = 0; i < (land ? 15 : 9); i++) art.palm(g, rng, rng.range(-20, W + 20), midTop + rng.range(20, 50), rng.range(120, 210), rng.range(-.2, .2));
      art.foliage(g, rng, canopy, 6, (rwTop - midTop) * .9, (nx, ny) => ny > 0, { dens: 3, rMin: 4, rMax: 11, flowers: .02 });
    });
  });
  hazed(g, g => {
    const rocks = [];
    for (let i = 0; i < 9; i++) {
      const cx = fall.x + rng.range(-1, 1) * (land ? 120 : 90), cy = fall.top + 30 + rng.range(0, 1) * (rwBot - fall.top - 30), r = rng.range(45, 85);
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
  }, 'contrast(0.9) brightness(1.05)');
  // Layer 5: retaining wall of beige blocks with a light cap
  const rwH = rwBot - rwTop, courses = 3, ch = rwH / courses;
  let gr = g.createLinearGradient(0, rwTop, 0, rwBot); gr.addColorStop(0, '#e3d5c0'); gr.addColorStop(1, '#cfbea4');
  g.fillStyle = gr; g.fillRect(0, rwTop, W, rwH);
  for (let r = 0; r < courses; r++) {
    const y = rwTop + r * ch;
    for (let x = (r % 2) * -38, k = 0; x < W; x += 76, k++) {
      const v = Math.sin(x * 12.9898 + r * 78.233) * 43758.5453 % 1;
      g.fillStyle = v > .35 ? 'rgba(255,255,255,.1)' : v < -.35 ? 'rgba(120,90,60,.08)' : 'rgba(0,0,0,0)'; g.fillRect(x + 2, y + 2, 72, ch - 4);
    }
    g.strokeStyle = '#b8a385'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    for (let x = (r % 2) * -38; x < W; x += 76) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + ch); g.stroke(); }
  }
  roundRect(g, -10, rwTop - 9, W + 20, 13, 3, '#b8a385'); roundRect(g, -10, rwTop - 8, W + 20, 10, 3, '#efe5d6');
  // Terraces on the wall: parasols with loungers, lamps, a little hedge between them
  const deco = land ? { parasols: [[W * .06, 70], [W * .962, 64]], lamps: [W * .02, W * .985] } : { parasols: [[W * .08, 60]], lamps: [W * .03] };
  glazed(g, C.glaze, g => art.foliage(g, rng, [[-10, rwTop - 6], [W + 10, rwTop - 6]], 2, 16, (nx, ny) => ny < 0, { dens: 2, rMin: 3, rMax: 8, flowers: .06 }));
  for (const [x, r] of deco.parasols) parasol(g, x, rwTop, r);
  L.lamps = deco.lamps.map(x => [x, rwTop]);
  for (const x of deco.lamps) lamp(g, x, rwTop);
  // Layer 6: bushes and blossoms in front of the wall foot
  const bushes = []; for (let x = -40; x < W + 40;) { const w = rng.range(90, 180); bushes.push([x, w, rng.range(.55, 1) * (wallTop - rwBot + 34)]); x += w * rng.range(.7, 1); }
  glazed(g, C.glaze, g => { for (const [x, w, h] of bushes) art.foliage(g, rng, [[x, wallTop - 4], [x + w, wallTop - 4]], 3, h, (nx, ny) => ny < 0, { dens: 3, rMin: 5, rMax: 13, flowers: .06 }); });
  for (let i = 0; i < (land ? 11 : 7); i++) leafPlant(g, rng, (i + rng.range(.2, .8)) * W / (land ? 11 : 7), wallTop - 2, rng.range(.8, 1.2) * (land ? 1 : .8));
  for (let i = 0; i < (land ? 22 : 13); i++) hibiscus(g, rng.range(0, W), wallTop - rng.range(14, 54), rng.range(5, 8), rng);
  // Big frame palms at the edges
  const big = land ? [[-8, 500, .16], [W + 6, 470, -.2]] : [[20, 430, .12], [W - 22, 360, -.16]];
  glazed(g, C.glaze, g => { for (const [x, h, lean] of big) art.palm(g, rng, x, wallTop + 6, h, lean); });
  // Left: wooden flume from the wall onto a waterwheel (turned per frame) and a small arched footbridge
  if (land) {
    const wr = Math.round(H * .046), wheel = { x: W * .031, y: wallTop - wr * .3, r: wr };
    L.wheel = wheel;
    const fx1 = wheel.x + wr * .55, fy = wheel.y - wr - 14;
    roundRect(g, wheel.x - 16, wheel.y - 6, 32, wallTop - wheel.y + 10, 5, C.stoneDark); roundRect(g, wheel.x - 13, wheel.y - 4, 26, 10, 4, C.stoneCap);
    roundRect(g, -10, fy - 14, fx1 + 12, 20, 4, C.woodDark); roundRect(g, -10, fy - 12, fx1 + 10, 16, 3, C.woodLight);
    line(g, [[-10, fy - 9], [fx1 - 2, fy - 9]], 5, C.water); line(g, [[-10, fy - 10.5], [fx1 - 2, fy - 10.5]], 1.5, 'rgba(255,255,255,.85)');
    post(g, wheel.x - wr * .45, fy + 6, wheel.y - wr * .5, 10);
    L.flume = [fx1, fy];
    const b0 = W * .061, b1 = W * .104, by = wallTop - 6, arch = 24, bp = u => [b0 + (b1 - b0) * u, by - Math.sin(Math.PI * u) * arch];
    const deckPts = Array.from({ length: 13 }, (_, i) => bp(i / 12));
    for (const u of [.12, .5, .88]) { const [x, y] = bp(u); line(g, [[x, y - 30], [x, Math.min(by, y + 8)]], 7, C.woodDark); line(g, [[x, y - 30], [x, Math.min(by, y + 8)]], 4, C.woodLight); }
    line(g, deckPts, 12, C.woodDark); line(g, deckPts, 8, C.woodLight); line(g, deckPts.map(([x, y]) => [x, y - 2]), 2, 'rgba(250,200,130,.9)');
    line(g, deckPts.map(([x, y]) => [x, y - 30]), 6, C.woodDark); line(g, deckPts.map(([x, y]) => [x, y - 30]), 3, C.woodLight);
  }
  // Layer 7: pool edge, two sandstone courses under a light coping (everything stands on it)
  g.fillStyle = C.stone; g.fillRect(0, wallTop, W, wallH);
  g.strokeStyle = C.stoneJoint; g.lineWidth = 2;
  const rows = 2, bh = wallH / rows;
  for (let r = 0; r < rows; r++) {
    const y = wallTop + r * bh; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    for (let x = (r % 2) * 44; x < W; x += 88) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + bh); g.stroke(); }
  }
  const shade = g.createLinearGradient(0, wallTop, 0, waterY); shade.addColorStop(0, 'rgba(255,255,255,0)'); shade.addColorStop(1, 'rgba(90,60,30,.18)');
  g.fillStyle = shade; g.fillRect(0, wallTop, W, wallH);
  roundRect(g, -10, wallTop - 11, W + 20, 16, 4, C.outline);
  roundRect(g, -10, wallTop - 10, W + 20, 13, 4, C.stoneCap);
  line(g, [[0, wallTop - 8], [W, wallTop - 8]], 2, C.stoneLight);
  line(g, [[0, wallTop + 5], [W, wallTop + 5]], 2, 'rgba(120,90,50,.3)');
  // Pool coping at the waterline
  roundRect(g, -10, waterY - 9, W + 20, 12, 3, C.stoneLight);
  line(g, [[0, waterY + 3], [W, waterY + 3]], 3, 'rgba(20,110,120,.25)');
};
/** Waterwheel on the left, turned by the water from the flume (angle is a function of time). */
WP.paintWaterwheel = function (g, L, angle) {
  const w = L.wheel; if (!w) return;
  const { x, y, r } = w;
  g.save(); g.translate(x, y);
  g.lineCap = 'round';
  for (const [rr, lw, col] of [[r, 9, C.woodDark], [r, 5, C.woodLight], [r * .62, 6, C.woodDark], [r * .62, 3, C.wood]]) { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.stroke(); }
  g.rotate(angle);
  for (let k = 0; k < 8; k++) {
    g.rotate(TAU / 8);
    line(g, [[0, 0], [r, 0]], 6, C.woodDark); line(g, [[0, 0], [r, 0]], 3, C.woodLight);
    roundRect(g, r - 6, -9, 16, 18, 3, C.woodDark); roundRect(g, r - 4, -7, 12, 14, 2, C.woodLight);
  }
  g.restore();
  ellipse(g, x, y, 9, 9, C.woodDark); ellipse(g, x, y, 5, 5, '#f2cf5b');
};
/** Big-leaf plant (banana / elephant ear): pointed leaves fanning up from the ground, each with a midrib. */
function leafPlant(g, rng, x, y, s) {
  const n = 6, cols = ['#3f9a34', '#5cb43a', '#7cc63e'];
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + (k / (n - 1) - .5) * 2.3 + rng.range(-.12, .12), len = (34 + rng.range(0, 26)) * s, wd = len * .34;
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = cols[k % 3]; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * .45, -wd, len, 0); g.quadraticCurveTo(len * .45, wd, 0, 0); g.fill();
    g.strokeStyle = '#2c6f26'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(2, 0); g.lineTo(len * .92, 0); g.stroke();
    g.restore();
  }
}
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
  const { R, deck, lift, W } = L, ground = L.wallTop, pw = L.land ? 20 : 18, towerHalf = L.towerHW + 6;
  const clearOfTower = x => Math.abs(x - lift.x) > towerHalf + pw;
  // Deck scaffold: main posts about a tenth of the width apart, a girder under the deck and one at mid height
  const deckBottom = deck.y + 24, cols = [], step = Math.max(150, W * .1);
  for (let x = deck.x0 + 26; x <= deck.x1 - 20; x += step) if (clearOfTower(x)) cols.push(x);
  if (clearOfTower(deck.x1 - 20) && deck.x1 - 20 - cols[cols.length - 1] > 70) cols.push(deck.x1 - 20);
  const midY = deckBottom + (ground - deckBottom) * .46;
  for (let i = 0; i < cols.length - 1; i++) {
    const a = cols[i], b = cols[i + 1]; if (b - a > 280 || !clearOfTower((a + b) / 2)) continue;
    beam(g, [a, deckBottom + 14], [b, deckBottom + 14], 10);
    beam(g, [a, midY], [b, midY], 9);
    if (i % 2 === 0) { beam(g, [a + 8, deckBottom + 22], [b - 8, midY - 8], 7); beam(g, [b - 8, deckBottom + 22], [a + 8, midY - 8], 7); }
  }
  for (const x of cols) post(g, x, deckBottom - 6, ground + 4, pw);
  // Supports under slides only where a slide runs high above the ground
  for (const route of L.routes) for (const seg of route.drawSegments) {
    if (seg.kind === 'deck' || seg.kind === 'tube') continue;
    let last = -1e9;
    for (const p of seg) {
      if (p.s - last < 300) continue;
      if (p.y > ground - 150 || !clearOfTower(p.x) || Math.abs(p.y - deck.y) < 60 || cols.some(c => Math.abs(c - p.x) < 60)) continue;
      last = p.s;
      const top = p.y + R + 16;
      post(g, p.x, top, ground + 4, pw - 4);
      for (const sgn of [-1, 1]) if ((Math.round(p.s / 300) + (sgn > 0 ? 1 : 0)) % 2) beam(g, [p.x, top + 60], [p.x + sgn * 38, top + 8], 6);
    }
  }
  // Funnel: two thick posts and a cross girder
  const f = L.funnel, fp = L.land ? .55 : .8;   // portrait: wider apart, the outlet tube bends between them
  for (const dx of [-fp, fp]) post(g, f.x + dx * f.rx, f.y + f.ry * 1.2, ground + 4, pw);
  beam(g, [f.x - f.rx * fp, f.y + f.ry * 2.5], [f.x + f.rx * fp, f.y + f.ry * 2.5], 10);
};

/** Wooden railing behind the deck: posts every 40 px, mid rail and a handrail with a light top edge. */
function railing(g, x0, x1, y, h) {
  const top = y - h;
  for (let x = x0 + 8; x <= x1 - 4; x += 40) { line(g, [[x, y], [x, top]], 8, C.woodDark); line(g, [[x, y], [x, top]], 5, C.woodLight); }
  line(g, [[x0 + 4, y - h * .48], [x1 - 4, y - h * .48]], 6, C.woodDark); line(g, [[x0 + 4, y - h * .48], [x1 - 4, y - h * .48]], 3.5, C.wood);
  line(g, [[x0 + 4, top], [x1 - 4, top]], 9, C.woodDark); line(g, [[x0 + 4, top], [x1 - 4, top]], 6, C.woodLight);
  line(g, [[x0 + 4, top - 1.5], [x1 - 4, top - 1.5]], 2, 'rgba(255,236,200,.95)');
}
/** Deck slab: cream plank top, front face with joints every 28 px and a timber girder below. */
function slab(g, x0, x1, y) {
  roundRect(g, x0 - 2.5, y - 6.5, x1 - x0 + 5, 32, 4, C.outline);
  g.fillStyle = C.deckTop; g.fillRect(x0, y - 4, x1 - x0, 9);
  line(g, [[x0 + 2, y - 2.5], [x1 - 2, y - 2.5]], 2, C.rimLight);
  g.fillStyle = C.face; g.fillRect(x0, y + 5, x1 - x0, 11);
  g.strokeStyle = C.faceDark; g.lineWidth = 1.5;
  for (let x = x0 + 28; x < x1; x += 28) { g.beginPath(); g.moveTo(x, y + 6); g.lineTo(x, y + 15); g.stroke(); }
  g.fillStyle = C.woodLight; g.fillRect(x0 + 3, y + 16, x1 - x0 - 6, 7);
  line(g, [[x0 + 3, y + 21.5], [x1 - 3, y + 21.5]], 3, C.wood);
}
/** Flower box on a deck edge with ivy hanging down. */
function flowerBox(g, rng, art, x, y) {
  roundRect(g, x - 36, y + 3, 72, 17, 4, C.woodDark); roundRect(g, x - 34, y + 4, 68, 14, 3, C.woodLight);
  line(g, [[x - 32, y + 6], [x + 32, y + 6]], 2, 'rgba(255,226,176,.9)');
  glazed(g, C.glaze, g => art.foliage(g, rng, [[x - 32, y + 4], [x + 32, y + 4]], 4, 9, (nx, ny) => ny < 0, { dens: 3, rMin: 2.5, rMax: 6.5, flowers: .14 }));
  for (let k = 0; k < 4; k++) {
    const vx = x - 26 + k * 17, len = rng.range(30, 80), pts = [];
    for (let j = 0; j <= 8; j++) pts.push([vx + Math.sin(j * .9 + k) * 4, y + 18 + len * j / 8]);
    line(g, pts, 2, '#3f8f2a');
    g.fillStyle = '#7cbf2e'; for (let j = 2; j <= 8; j += 2) { const [px, py] = pts[j]; g.beginPath(); g.ellipse(px + (j % 4 ? 3 : -3), py, 4, 2.6, (j % 4 ? .6 : -.6), 0, TAU); g.fill(); }
  }
}
/** Launch deck (animals walk on its top edge) and, in landscape, a second decorative level between tower and funnel. */
WP.paintDeck = function (g, L, rng, art) {
  const { deck, lift, R } = L, y = deck.y, x0 = deck.x0, x1 = deck.x1;
  railing(g, x0, x1, y, R * 1.45);
  slab(g, x0, x1, y);
  const launches = L.routes.map(r => r.launch[0]);
  for (let x = x0 + 70; x < x1 - 60; x += 175) {
    if (launches.some(lx => Math.abs(lx - x) < 76) || Math.abs(x - lift.x) < L.towerHW + 40) continue;
    flowerBox(g, rng, art, x, y + 2);
  }
  if (!L.land) return;
  const d2 = { x0: L.W * .468, x1: L.W * .545, y: L.H * .375 };
  L.deck2 = d2;
  for (const x of [d2.x0 + 14, d2.x1 - 14]) post(g, x, d2.y + 20, L.wallTop + 4, 16);
  beam(g, [d2.x0 + 14, d2.y + 70], [d2.x1 - 14, d2.y + 70], 8);
  railing(g, d2.x0, d2.x1, d2.y, R * 1.05);
  slab(g, d2.x0, d2.x1, d2.y);
  flowerBox(g, rng, art, (d2.x0 + d2.x1) / 2, d2.y + 2);
};

/** Glass tower: tinted panes with struts, cream ring bands, base pier and a faceted pyramid roof (lift drawn per frame). */
WP.paintTower = function (g, L) {
  const { lift, R, deck } = L, x = lift.x, hw = L.towerHW, top = deck.y - R * 2.9, bottom = lift.bottom + R * .6;
  L.tower = { x, hw, top, bottom };
  const gl = g.createLinearGradient(x - hw, 0, x + hw, 0);
  gl.addColorStop(0, 'rgba(160,232,244,.55)'); gl.addColorStop(.3, 'rgba(122,214,234,.38)'); gl.addColorStop(.75, 'rgba(57,159,187,.42)'); gl.addColorStop(1, 'rgba(40,118,150,.58)');
  g.fillStyle = gl; g.fillRect(x - hw, top, hw * 2, bottom - top);
  // Vertical struts about 30 px apart, a light stripe on the left pane
  const n = Math.max(3, Math.round(hw * 2 / 30));
  for (let i = 1; i < n; i++) { const sx = x - hw + i * hw * 2 / n; line(g, [[sx, top], [sx, bottom]], 2.2, 'rgba(43,101,113,.42)'); line(g, [[sx - 1.6, top], [sx - 1.6, bottom]], 1, 'rgba(228,251,246,.4)'); }
  g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x - hw + 7, top, hw * .2, bottom - top);
  // Base pier in the water
  roundRect(g, x - hw - 12, bottom - 9, hw * 2 + 24, 28, 6, C.outline);
  roundRect(g, x - hw - 10, bottom - 8, hw * 2 + 20, 26, 6, C.stone); roundRect(g, x - hw - 10, bottom - 8, hw * 2 + 20, 8, 4, C.stoneCap);
  // Corner posts and horizontal rings
  for (const sx of [-1, 1]) { line(g, [[x + sx * hw, top - 6], [x + sx * hw, bottom]], 9, C.glassFrame); line(g, [[x + sx * hw - 2, top - 6], [x + sx * hw - 2, bottom]], 2.4, C.glassLight); }
  for (let y = top + 90; y < bottom - 30; y += 140) { line(g, [[x - hw, y], [x + hw, y]], 4, C.glassFrame); line(g, [[x - hw, y - 2], [x + hw, y - 2]], 1.3, 'rgba(228,251,246,.75)'); }
  // Cream ring band just above the lagoon
  const band = (y, h) => { roundRect(g, x - hw - 8, y - 1.5, hw * 2 + 16, h + 3, 4, C.outline); roundRect(g, x - hw - 6, y, hw * 2 + 12, h, 3, C.rim); line(g, [[x - hw - 4, y + 2], [x + hw + 4, y + 2]], 2, C.rimLight); line(g, [[x - hw - 4, y + h - 2], [x + hw + 4, y + h - 2]], 2.5, C.rimShade); };
  band(L.waterY - 26, 15);
  // Roof: cream eave ring and a pyramid with five glass facets, light on the left
  const ry = top - 4, rw = hw + 18, apex = ry - (L.land ? 74 : 64);
  band(ry - 12, 18);
  const xs = [-1, -.58, -.16, .26, .66, 1], base = k => ry - 12 + (1 - k * k) * 3, cols = ['#bff3f8', '#9fe6f0', '#7fd8e7', '#6acfe2', '#5cc8de'];
  g.lineJoin = 'round';
  for (let i = 0; i < 5; i++) { g.fillStyle = cols[i]; poly(g, [[x + xs[i] * rw, base(xs[i])], [x + xs[i + 1] * rw, base(xs[i + 1])], [x, apex]]); g.fill(); }
  g.strokeStyle = C.glassFrame; g.lineWidth = 3; poly(g, [[x - rw, base(-1)], [x, apex], [x + rw, base(1)]], false); g.stroke();
  g.lineWidth = 1.8; for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(x + xs[i] * rw, base(xs[i])); g.lineTo(x, apex); g.stroke(); }
  for (let k = 1; k < 4; k++) { const f = k / 4, yy = base(0) + (apex - base(0)) * f, w = rw * (1 - f); line(g, [[x - w, yy], [x + w, yy]], 1.4, 'rgba(43,101,113,.5)'); }
  line(g, [[x - rw + 10, base(-1) - 4], [x - 6, apex + 12]], 2.6, 'rgba(255,255,255,.8)');
  ellipse(g, x, apex - 4, 8, 8, C.glassFrame); ellipse(g, x, apex - 4, 6, 6, '#f2cf5b'); ellipse(g, x - 2, apex - 6, 2.5, 2.5, '#fff6c4');
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

/** Thick white lip of the funnel bowl (8 px), shaded on its outer edge. */
function funnelLip(g, x, y, rx, ry, stage) {
  if (stage !== 'top') { ellipse(g, x, y + 4, rx + 9, ry + 8, C.outline); ellipse(g, x, y + 3, rx + 7, ry + 6, C.rimShade); }
  if (stage !== 'under') { ellipse(g, x, y, rx + 6, ry + 5, '#fefdfc'); ellipse(g, x, y + 2, rx - 2, ry - 2, C.rim); ellipse(g, x, y + 1.5, rx - 3, ry - 3, C.rimLight); }
}
/** The open funnel bowl: cone shell, cream rim, water surface with dark drain. */
WP.paintFunnel = function (g, L) {
  const f = L.funnel, { x, y, rx, ry } = f, depth = ry * 1.9, neck = rx * .14;
  g.save(); g.filter = 'blur(6px)'; ellipse(g, x + 10, y + depth + 14, rx * .7, ry * .5, 'rgba(16,58,66,.22)'); g.restore();
  const cone = g.createLinearGradient(x - rx, 0, x + rx, 0);
  cone.addColorStop(0, '#fcf7ee'); cone.addColorStop(.45, '#efe4d3'); cone.addColorStop(1, '#cdb08c');
  g.fillStyle = cone; g.strokeStyle = C.outline; g.lineWidth = 3;
  g.beginPath(); g.moveTo(x - rx, y); g.bezierCurveTo(x - rx * .9, y + depth * .7, x - neck * 1.6, y + depth * .85, x - neck, y + depth);
  g.lineTo(x + neck, y + depth); g.bezierCurveTo(x + neck * 1.6, y + depth * .85, x + rx * .9, y + depth * .7, x + rx, y); g.closePath(); g.fill(); g.stroke();
  // Shell panels: joints run from the rim down to the neck
  g.save(); g.clip(); g.strokeStyle = C.faceDark; g.lineWidth = 2;
  for (const k of [-.78, -.5, -.22, .06, .34, .62, .86]) { g.beginPath(); g.moveTo(x + rx * k, y + ry * .6); g.quadraticCurveTo(x + rx * k * .78, y + depth * .62, x + neck * k, y + depth); g.stroke(); }
  g.restore();
  line(g, [[x - rx * .55, y + depth * .45], [x - neck * 1.4, y + depth * .9]], 3, 'rgba(255,255,255,.45)');
  // The feed slide and the bowl are painted stage by stage, so the slide's rim becomes the bowl's rim and its channel opens
  // into the bowl without a line between them.
  const I = WP.funnelInlet(L), R = L.R, wr = rx - 12, wry = ry - 7;
  funnelLip(g, x, y, rx, ry, 'under');
  if (I) troughStage(g, I.pts, R, 'under');
  funnelLip(g, x, y, rx, ry, 'top');
  if (I) { troughStage(g, I.pts, R, 'rim'); troughStage(g, I.pts, R, 'bed'); }
  // Water surface
  const wg = g.createRadialGradient(x, y + wry * .2, wr * .08, x, y, wr);
  wg.addColorStop(0, '#11789a'); wg.addColorStop(.18, '#1aaec4'); wg.addColorStop(.55, '#30dbe6'); wg.addColorStop(1, '#8ff1f2');
  g.save(); g.beginPath(); g.ellipse(x, y + 1, wr, wry, 0, 0, TAU); g.clip();
  g.fillStyle = C.innerWall; g.fillRect(x - wr, y - wry, wr * 2, wry * 2.2);
  g.fillStyle = wg; g.beginPath(); g.ellipse(x, y + 4, wr, wry - 2, 0, 0, TAU); g.fill();
  g.restore();
  g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y + 1, wr - 4, wry - 3, 0, Math.PI * 1.05, Math.PI * 1.5); g.stroke();
  if (I) {   // channel water through the rim; on the bowl water it fades out per frame, while the slide is open (renderer)
    g.save(); g.beginPath(); g.rect(0, 0, L.W, L.H); g.ellipse(x, y + 1, wr, wry, 0, 0, TAU); g.clip('evenodd');
    troughStage(g, I.pts, R, 'water'); g.restore();
  }
  ellipse(g, x, y + wry * .22, wr * .14, wry * .16, '#0d5a74');
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
  funnelLip(g, x, y, rx, ry);
  g.restore();
};

/** Feed slide of the funnel. It does not vanish behind the bowl: its rounded end lies on the rim and is fused with the bowl
 *  (see paintFunnel). Geometry, cached on L: centre line up to that end (pts), the ride from there into the swirl (run),
 *  where the channel water has faded out (fade) and the area in which the slide is drawn again on top of the bowl (box). */
WP.funnelInlet = function (L) {
  if (L.inlet !== undefined) return L.inlet;
  const route = L.routes[1], f = L.funnel, R = L.R, { out } = TROUGH(R);
  const seg = route.drawSegments.find(s => s.kind !== 'deck' && s.kind !== 'tube');
  const inside = p => ((p.x - f.x) / (f.rx + 6)) ** 2 + ((p.y - f.y) / (f.ry + 5)) ** 2 < 1;
  const first = seg ? seg.find(inside) : null;
  if (!first) return (L.inlet = null);
  const last = seg[seg.length - 1], cutS = Math.min(last.s - 2, first.s + R * .45), m = WP.samplePath(route.path, cutS);
  const before = seg.filter(p => p.s < cutS), pts = before.map(p => [p.x, p.y]); pts.push([m.x, m.y]);
  const run = [[m.x, m.y], ...seg.filter(p => p.s > cutS).map(p => [p.x, p.y]), ...f.spiral.slice(1, 12)], h = out / 2 + 10;
  const tail = [...before.filter(p => p.s > cutS - R * 3.5).map(p => [p.x, p.y]), [m.x, m.y]], xs = tail.map(p => p[0]), ys = tail.map(p => p[1]);
  return (L.inlet = { seg, pts, run, cutS, x: m.x, y: m.y, dir: [m.tx, m.ty], fade: run[run.length - 1],
    box: { x: Math.min(...xs) - h, y: Math.min(...ys) - h, w: Math.max(...xs) - Math.min(...xs) + 2 * h, h: Math.max(...ys) - Math.min(...ys) + 2 * h + Math.round(R * .42) } });
};

/** Seesaw board cross-section: half-height of the top (h), depth of the front face (F), middle of the water (wm). */
WP.boardSize = R => { const h = Math.round(TROUGH(R).out * .27); return { h, F: Math.round(R * .7), wm: 1 }; };
/** Seesaw stand: a big timber A-frame from the hub down to a two-course stone plinth on the pool edge. */
WP.paintSeesawStand = function (g, L) {
  const s = L.seesaw, R = L.R, { h, F } = WP.boardSize(R), x = s.x, cy = s.y + h + F * .3, foot = L.wallTop - 6;
  if (s.hang) {   // portrait: the seesaw hangs under the deck on a thick timber hanger with knee braces
    const top = L.deck.y + 30;
    roundRect(g, x - 46, top - 4, 92, 17, 4, C.woodDark); roundRect(g, x - 44, top - 2, 88, 13, 3, C.woodLight);
    line(g, [[x - 42, top], [x + 42, top]], 2, 'rgba(255,226,176,.9)');
    for (const sx of [-1, 1]) beam(g, [x + sx * 42, top + 14], [x + sx * 6, top + 64], 9);
    post(g, x, top + 10, cy, 22);
    return;
  }
  const spread = Math.min(s.length * .36, Math.max(64, (foot - cy) * .82), Math.max(40, s.maxSpread ?? 1e9)), pw = spread + 34;
  roundRect(g, x - pw - 2.5, foot - 14.5, 2 * pw + 5, 27, 6, C.outline);
  roundRect(g, x - pw, foot - 12, 2 * pw, 22, 5, C.stone); roundRect(g, x - pw, foot - 12, 2 * pw, 8, 4, C.stoneLight);
  g.strokeStyle = C.stoneJoint; g.lineWidth = 1.5;
  for (let k = -2; k <= 2; k++) { const jx = x + k * pw * .4 + 12; g.beginPath(); g.moveTo(jx, foot - 4); g.lineTo(jx, foot + 10); g.stroke(); }
  for (const sx of [-1, 1]) {
    const a = [x + sx * 6, cy], b = [x + sx * spread, foot - 12];
    line(g, [a, b], 25, C.woodDark); line(g, [a, b], 20, C.woodLight); line(g, [a, b], 7, C.wood, 4, 2);
    line(g, [a, b], 2.5, 'rgba(250,190,110,.9)', -5, -1);
    roundRect(g, b[0] - 17, foot - 18, 34, 10, 3, C.woodDark); roundRect(g, b[0] - 15, foot - 17, 30, 6, 2, C.wood);
  }
  const by = cy + (foot - cy) * .62; beam(g, [x - spread * .66, by], [x + spread * .66, by], 12);
};
/** Seesaw board as a box beam: cream top with a water channel, a deep front face and end caps (rotated frame, pivot at 0,0). */
WP.paintBoard = function (g, half, R, open) {
  const { h, F } = WP.boardSize(R), e = half + 4, cx = e - 12, ch0 = -h + 6, ch1 = h - 9;
  g.fillStyle = C.outline; g.beginPath(); g.roundRect(-e - 2.5, -h - 2.5, 2 * e + 5, 2 * h + F + 5, 8); g.fill();
  g.fillStyle = C.face; g.fillRect(-e, h, 2 * e, F);
  g.fillStyle = C.faceDark; g.fillRect(-e, h + F * .6, 2 * e, F * .4);
  g.fillStyle = 'rgba(120,90,50,.22)'; g.fillRect(-e, h, 10, F); g.fillRect(e - 10, h, 10, F);
  g.fillStyle = C.rim; g.beginPath(); g.roundRect(-e, -h, 2 * e, 2 * h + 1, 7); g.fill();
  line(g, [[-e + 5, -h + 2.5], [e - 5, -h + 2.5]], 2.5, C.rimLight);
  line(g, [[-e + 4, h - 3], [e - 4, h - 3]], 3, C.rimLight);
  line(g, [[-e + 3, h + 1], [e - 3, h + 1]], 1.5, C.rimShade);
  g.fillStyle = C.seam; g.fillRect(-cx - 1, ch0 - 1, 2 * cx + 2, ch1 - ch0 + 2);
  g.fillStyle = '#e3d3ba'; g.fillRect(-cx, ch0, 2 * cx, ch1 - ch0);
  g.fillStyle = C.innerWall; g.fillRect(-cx, ch0, 2 * cx, (ch1 - ch0) * .35);
  if (!open) return;
  const w0 = ch0 + 5, w1 = ch1;
  g.fillStyle = C.waterDeep; g.fillRect(-cx + 2, w0 - 1, 2 * cx - 4, w1 - w0 + 1);
  g.fillStyle = C.water; g.fillRect(-cx + 2, w0, 2 * cx - 4, w1 - w0 - 2);
  g.fillStyle = C.waterCore; g.fillRect(-cx + 2, (w0 + w1) / 2 - 3, 2 * cx - 4, 6);
  line(g, [[-cx + 5, w0 + 2], [cx - 5, w0 + 2]], 2, 'rgba(255,255,255,.8)');
};
/** Big timber hub with spokes at the pivot, on the board's front face. */
WP.paintSeesawWheel = function (g, L, angle) {
  const { x, y } = L.seesaw, R = L.R, { h, F } = WP.boardSize(R), cy = y + h + F * .3, r = R * .62;
  ellipse(g, x, cy, r + 3, r + 3, C.outline); ellipse(g, x, cy, r, r, C.woodLight);
  ellipse(g, x + 2, cy + 2, r * .8, r * .8, C.wood); ellipse(g, x, cy, r * .78, r * .78, '#f2c27e');
  g.save(); g.translate(x, cy); g.rotate(angle * 3);
  for (let k = 0; k < 6; k++) { g.rotate(TAU / 6); line(g, [[r * .3, 0], [r * .72, 0]], 4, C.wood); }
  g.restore();
  ellipse(g, x, cy, r * .32, r * .32, C.woodDark); ellipse(g, x, cy, r * .22, r * .22, '#f2cf5b'); ellipse(g, x - 2, cy - 2, r * .08, r * .08, '#fff6c4');
};

/** Springboard pedestal: a round stone plinth with a front face on the pool edge (spring and board drawn per frame). */
WP.paintSpringStand = function (g, L) {
  const j = L.jump, R = L.R, x = j.x + (j.landing[0] < j.x ? -6 : 6), top = j.y + R + 36, rx = R * 1.9, ry = R * .42, foot = L.waterY + 4;
  g.fillStyle = C.outline; g.beginPath(); g.ellipse(x, foot, rx + 2.5, ry + 2.5, 0, 0, Math.PI); g.lineTo(x - rx - 2.5, top); g.ellipse(x, top, rx + 2.5, ry + 2.5, 0, Math.PI, TAU); g.closePath(); g.fill();
  const fg = g.createLinearGradient(x - rx, 0, x + rx, 0); fg.addColorStop(0, C.stoneCap); fg.addColorStop(.55, C.stone); fg.addColorStop(1, C.faceDark);
  g.fillStyle = fg; g.beginPath(); g.ellipse(x, foot, rx, ry, 0, 0, Math.PI); g.lineTo(x - rx, top); g.ellipse(x, top, rx, ry, 0, Math.PI, TAU); g.closePath(); g.fill();
  g.strokeStyle = C.stoneJoint; g.lineWidth = 1.6; g.beginPath(); g.ellipse(x, (top + foot) / 2, rx, ry, 0, 0, Math.PI); g.stroke();
  ellipse(g, x, top, rx, ry, C.stoneLight); g.strokeStyle = C.stoneJoint; g.beginPath(); g.ellipse(x, top, rx - 7, ry - 3, 0, 0, TAU); g.stroke();
};
/** Short cream catch basin on the pool edge where the funnel tube ends: high back wall, two side walls,
 *  the water spills over the low front lip into the lagoon (open slides pour straight into the lagoon). */
WP.paintBasins = function (g, L) {
  const R = L.R, { out } = TROUGH(R), top = L.wallTop - 12, face = L.waterY - 1;
  L.basins = [];
  for (const r of L.routes) {
    const segs = r.drawSegments; if (segs[segs.length - 1].kind !== 'tube') continue;
    const x = r.end[0], w = Math.round(out * 1.2), sw = Math.round(w * .2), lip = top + 30, i0 = x - w / 2 + sw, iw = w - 2 * sw;
    L.basins.push({ x, i0, iw, lip, face });
    roundRect(g, x - w / 2 - 2.5, top - 18.5, w + 5, 30, 10, C.outline);
    roundRect(g, x - w / 2, top - 16, w, 25, 9, C.rim); line(g, [[x - w / 2 + 8, top - 13], [x + w / 2 - 8, top - 13]], 2.5, C.rimLight);
    roundRect(g, i0 - 4.5, lip - 2.5, iw + 9, face - lip + 5, 4, C.outline);
    g.fillStyle = C.face; g.fillRect(i0 - 2, lip, iw + 4, face - lip);
    g.fillStyle = C.water; g.fillRect(i0 - 2, top + 2, iw + 4, lip - top);
    const sg = g.createLinearGradient(0, lip, 0, face); sg.addColorStop(0, 'rgba(70,232,240,.95)'); sg.addColorStop(1, 'rgba(170,246,250,.92)');
    g.fillStyle = sg; g.beginPath(); g.roundRect(i0 + 2, lip - 4, iw - 4, face - lip + 6, 4); g.fill();
    line(g, [[i0 + 6, lip - 1], [i0 + iw - 6, lip - 1]], 2.5, 'rgba(255,255,255,.85)');
    for (const s of [-1, 1]) {
      const cx = x + s * (w / 2 - sw / 2);
      roundRect(g, cx - sw / 2 - 2.5, top - 8.5, sw + 5, face - top + 11, 8, C.outline);
      roundRect(g, cx - sw / 2, top - 6, sw, face - top + 6, 7, C.rim);
      g.fillStyle = s < 0 ? C.rimShade : C.innerWall; g.fillRect(s < 0 ? cx + sw * .2 : cx - sw / 2, top + 4, sw * .3, face - top - 6);
      g.fillStyle = C.faceDark; g.fillRect(cx - sw / 2, face - 8, sw, 7);
      line(g, [[cx - sw / 2 + 4, top - 3], [cx + sw / 2 - 4, top - 3]], 2.5, C.rimLight);
    }
  }
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
