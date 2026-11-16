/* Endless Waterpark renderer: the Endless Pyramid look (sky, light, water, critters, guests, HUD) on the mockup layout.
 * Static artwork is painted once from art.js. The renderer only reads the simulation; display poses are derived per frame.
 */
(function () {
'use strict';
const WP = EBS.Waterpark = EBS.Waterpark || {};
const { clamp, hashSeed, fmtInt } = EBS.util;
const TAU = Math.PI * 2;
const { dot, ellipse, line, roundRect } = WP.artUtil;
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * clamp(k, 0, 1)));
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const smooth = u => u * u * (3 - 2 * u);

// Daylight keys identical to Endless Pyramid: p, multiply tint, warm light, its strength, night 0..1, sun rays 0..1
const DAY_KEYS = [
  [0.00, [255, 226, 214], [255, 160, 150], 0.30, 0.00, 0.45],
  [0.10, [255, 246, 238], [255, 190, 160], 0.10, 0.00, 0.85],
  [0.22, [255, 255, 255], [255, 220, 180], 0.00, 0.00, 1.00],
  [0.50, [255, 255, 255], [255, 220, 180], 0.00, 0.00, 1.00],
  [0.62, [255, 228, 188], [255, 170, 80], 0.45, 0.00, 0.75],
  [0.72, [255, 186, 150], [255, 110, 40], 0.95, 0.05, 0.30],
  [0.80, [180, 130, 170], [240, 80, 110], 0.60, 0.35, 0.05],
  [0.88, null, [120, 90, 200], 0.10, 0.90, 0.00],
  [1.00, null, [120, 90, 200], 0.00, 1.00, 0.00],
];
function dayState(p, nightDark) {
  const night = mix([255, 255, 255], [34, 46, 110], nightDark);
  let i = 0; while (i < DAY_KEYS.length - 2 && p > DAY_KEYS[i + 1][0]) i++;
  const a = DAY_KEYS[i], b = DAY_KEYS[i + 1], f = clamp((p - a[0]) / (b[0] - a[0] || 1), 0, 1);
  const k = j => a[j] + (b[j] - a[j]) * f;
  return { p, mult: mix(a[1] || night, b[1] || night, f), warm: mix(a[2], b[2], f), warmK: k(3), night: k(4), rays: k(5) };
}
/** Short film, as in the Pyramid short: long readable daylight, then one soft transition into bright evening light. */
function shortDay(phase, nightDark) {
  const k = smooth(clamp((phase - 0.35) / 0.39, 0, 1));
  return { p: 0.42 + 0.42 * k, mult: mix([255, 255, 255], [70, 100, 158], nightDark * 0.7 * k),
    warm: [255, 200, 150], warmK: 0.12 * k, night: 0.55 * k, rays: 1 - 0.7 * k, short: true };
}
// Sun rays fan out mostly downwards over the park (angle, half width, alpha)
const RAYS = [[0.42, 0.06, 0.07], [0.78, 0.05, 0.05], [1.12, 0.08, 0.06], [1.5, 0.05, 0.07], [1.86, 0.07, 0.05], [2.25, 0.05, 0.06], [2.68, 0.06, 0.05], [-0.25, 0.05, 0.04], [3.32, 0.05, 0.04]];
const COLORS = [[255, 208, 60], [47, 154, 214], [255, 142, 199], [127, 220, 72]];
const FLAGS = ['#2fc4b2', '#3f8fe0', '#ffb400', '#ff6f8f'];
const EMOTES = ['♥', '♪', '!', '?', '★', '☺'], EMOTE_COLORS = ['#ff4f7d', '#3f8fe0', '#ff9a1e', '#7a5cf0', '#ffb400', '#43b05a'];
const CLOUDS = {
  land: [[-60, 250, 340], [430, 150, 250], [860, 330, 300], [1240, 110, 270], [1590, 270, 360], [150, 70, 210], [1040, 50, 190]],
  port: [[-80, 470, 320], [560, 560, 300], [720, 380, 250], [-40, 760, 280], [400, 820, 240], [860, 700, 220]],
};
const CIRRUS = { land: [[400, 120, 420], [1260, 200, 520]], port: [[300, 420, 380], [-60, 640, 420]] };

class WaterparkRenderer extends EBS.CanvasScene {
  constructor(ctx) {
    super(ctx);
    this.sim = ctx.sim; this.view = ctx.view; this.video = ctx.video; this.L = ctx.sim.L;
    const L = this.L, A = (this.A = Object.create(L)), sc = this.scale, R = L.R;   // A: render-only additions to the layout
    this.art = EBS.PyramidArt; this.critters = EBS.CritterArt;
    this.sprites = this.critters.SPECIES.map((_, i) => this.critters.critterSprite(i, Math.min(2, sc), R));
    const crng = new EBS.RNG(hashSeed('waterpark-clouds', 3)), fmt = L.land ? 'land' : 'port';
    this.clouds = CLOUDS[fmt].map(([x, y, w]) => ({ ...this.art.cloudSprite(crng, w, sc), x0: x, y, speed: crng.range(3, 7) }))
      .concat(CIRRUS[fmt].map(([x, y, w]) => ({ ...this.art.cloudSprite(crng, w, sc), x0: x, y, speed: crng.range(8, 13), thin: true })));
    // Scenery is independent of the seed, like the Pyramid island.
    this.skyL = this.layer(g => WP.paintSky(g, A));
    this.back = this.layer(g => WP.paintBack(g, A, new EBS.RNG(hashSeed('waterpark-back', 7)), this.art));
    this.struct = this.layer(g => this.paintStruct(g));
    this.funnelL = this.layer(g => WP.paintFunnel(g, A));
    const tubes = L.routes.flatMap(r => r.drawSegments.filter(s => s.kind === 'tube'));
    this.front = this.layer(g => {
      for (const s of tubes) WP.paintTubeFront(g, s, R);
      g.globalCompositeOperation = 'destination-out'; WP.funnelCut(g, A); g.globalCompositeOperation = 'source-over';
      WP.paintFunnelFront(g, A);
    });
    this.fore = this.layer(g => WP.paintFore(g, A, new EBS.RNG(hashSeed('waterpark-fore', 7)), this.art));
    this.refl = this.layer(g => {
      for (const c of [this.skyL]) g.drawImage(c, 0, 0, L.W, L.H);
      this.drawClouds(g, 0, 1);
      for (const c of [this.back, this.struct, this.funnelL]) g.drawImage(c, 0, 0, L.W, L.H);
    });
    const f = L.funnel, box = pts => { const xs = pts.map(p => p.x), ys = pts.map(p => p.y), m = R + 22; return { x: Math.min(...xs) - m, y: Math.min(...ys) - m, w: Math.max(...xs) - Math.min(...xs) + 2 * m, h: Math.max(...ys) - Math.min(...ys) + 2 * m }; };
    this.funnelBox = { x: f.x - f.rx - 20, y: f.y - f.ry - 16, w: f.rx * 2 + 52, h: f.ry * 3.1 + 60 };
    this.frontBoxes = [{ x: f.x - f.rx - 14, y: f.y, w: f.rx * 2 + 28, h: f.ry + 16 }, ...tubes.map(box)];
    // Route geometry for the moving water film, the belt loop and the return lane
    this.routePaths = L.routes.map(r => { const p = new Path2D(); for (const s of r.drawSegments) if (s.kind !== 'deck') s.forEach((q, i) => (i ? p.lineTo(q.x, q.y) : p.moveTo(q.x, q.y))); return p; });
    const E = L.lift, rp = (this.rp = 13), bx = (this.bx = E.x + R + 8);
    this.belt = new Path2D(); this.belt.moveTo(bx, E.bottom); this.belt.lineTo(bx, E.top); this.belt.arc(bx + rp, E.top, rp, Math.PI, 0);
    this.belt.lineTo(bx + 2 * rp, E.bottom); this.belt.arc(bx + rp, E.bottom, rp, 0, Math.PI); this.belt.closePath();
    this.lane = new Path2D(); L.pool.path.points.forEach((q, i) => { if (i % 3 === 0) i ? this.lane.lineTo(q.x, q.y) : this.lane.moveTo(q.x, q.y); });
    // Night sky: fixed stars where no scenery covers the sky, moon away from HUD and attractions
    const srng = new EBS.RNG(hashSeed('waterpark-stars', 3)), skyBottom = L.waterY - L.H * (L.land ? 0.33 : 0.25);
    this.skyBottom = skyBottom;
    this.stars = this.visibleStars(Array.from({ length: L.land ? 190 : 170 }, () => [srng.range(0, L.W), Math.pow(srng.next(), 1.4) * (skyBottom - 20), srng.range(1.1, 2.8), srng.range(0, TAU)]));
    this.moon = L.land ? [L.W * 0.765, L.H * 0.09, 44] : [L.W * 0.085, L.H * 0.13, 40];
    this.moonImg = this.art.moonSprite(sc, this.moon[2]);
    this.beltPos = 0; this.beltT = null; this.ufoCanvas = null;
  }
  layer(draw) {
    const c = document.createElement('canvas'); c.width = Math.round(this.L.W * this.scale); c.height = Math.round(this.L.H * this.scale);
    const g = c.getContext('2d'); g.scale(this.scale, this.scale); draw(g); return c;
  }
  /** Draws a part of a cached full-size layer (much cheaper than the whole canvas). */
  blit(g, c, b) {
    const s = this.scale, x = Math.max(0, b.x), y = Math.max(0, b.y), x1 = Math.min(this.L.W, b.x + b.w), y1 = Math.min(this.L.H, b.y + b.h);
    if (x1 > x && y1 > y) g.drawImage(c, x * s, y * s, (x1 - x) * s, (y1 - y) * s, x, y, x1 - x, y1 - y);
  }
  visibleStars(stars) {
    const s = this.scale, w = this.back.width, h = Math.min(this.back.height, Math.ceil(this.skyBottom * s) + 2);
    const masks = [this.back, this.struct, this.funnelL].map(c => c.getContext('2d').getImageData(0, 0, w, h).data);
    return stars.filter(([x, y]) => {
      const i = (Math.min(h - 1, Math.round(y * s)) * w + Math.min(w - 1, Math.round(x * s))) * 4 + 3;
      return masks.every(m => m[i] < 8);
    });
  }
  paintStruct(g) {
    const A = this.A, L = this.L, R = L.R, segs = L.routes.flatMap(r => r.drawSegments.filter(s => s.kind !== 'deck'));
    WP.paintFrame(g, A);
    WP.paintTower(g, A);
    WP.paintDeck(g, A, new EBS.RNG(hashSeed('waterpark-deck', 7)), this.art);
    for (const s of segs) if (s.kind !== 'tube') WP.paintPathShadow(g, s, WP.troughSize(R).out);
    for (const s of segs) (s.kind === 'tube' ? WP.paintTube : WP.paintTrough)(g, s, R);
    WP.paintSeesawStand(g, A);
    WP.paintSpringStand(g, A);
  }
  day() {
    const st = this.sim.story || {}, cfg = this.sim.cfg, p = st.dayPhase ?? 0.35, nd = cfg.nightDark ?? 0.7;
    return cfg.mode === 'short' ? shortDay(p, nd) : dayState(p, nd);
  }
  /** Midday sun high above the deck; in the evening it sinks behind the jungle. */
  sunAt(day) {
    const L = this.L, [x0, y0] = L.land ? [L.W * 0.585, L.H * 0.075] : [L.W * 0.80, L.H * 0.125];
    const f = clamp((day.p - 0.6) / 0.22, 0, 1);
    return [x0 - (L.land ? L.W * 0.12 : L.W * 0.2) * f, y0 + (L.waterY - L.H * 0.14 - y0) * f * f];
  }

  paint(g) {
    const L = this.L, s = this.sim, cfg = s.cfg, t = s.t, vt = s.videoTime ?? s.step / 60;
    const day = (this.dayState = this.day()), sun = (this.sunPos = this.sunAt(day));
    g.drawImage(this.skyL, 0, 0, L.W, L.H);
    this.drawSkyTint(g, day);
    this.drawSun(g, day, sun);
    this.drawRays(g, vt, (cfg.rays ?? 0.7) * day.rays * (1 - day.night), sun);
    this.drawClouds(g, vt, cfg.clouds ?? 0.7);
    if (cfg.birds && day.night < 0.95) { g.globalAlpha = 1 - day.night; this.drawBirds(g, vt); g.globalAlpha = 1; }
    this.drawGuests(g, vt, day, false);
    g.drawImage(this.back, 0, 0, L.W, L.H);
    this.drawWaterfall(g, vt);
    this.drawWater(g, vt);
    g.drawImage(this.struct, 0, 0, L.W, L.H);
    this.drawFlow(g, vt);
    this.drawLift(g);
    this.drawSeesaw(g, vt);
    this.drawSpring(g, vt);
    const riders = this.riders();
    for (const d of riders) if (d.behindFunnel) this.drawRider(g, d);
    this.blit(g, this.funnelL, this.funnelBox);
    this.drawSwirl(g, vt);
    for (const d of riders) if (!d.behindFunnel) this.drawRider(g, d);
    for (const b of this.frontBoxes) this.blit(g, this.front, b);
    const swimmers = this.swimmers();
    this.drawPool(g, swimmers);
    this.drawSplashes(g, vt);
    this.drawFish(g, vt);
    g.drawImage(this.fore, 0, 0, L.W, L.H);
    // Time of day: tint the whole scene, then everything that keeps its own light
    this.grade(g, day);
    this.drawSelfLit(g, day, riders, swimmers);
    this.drawNight(g, vt, day);
    this.drawGuests(g, vt, day, true);
    this.drawEmotes(g, vt);
    this.drawFinale(g, vt);
    if (this.view.hud) this.drawHud(g);
  }

  // ------------------------------------------------------------- sky
  drawSkyTint(g, day) {
    const L = this.L, H = this.skyBottom + 2, n = day.night, k = day.warmK * (1 - n);
    const band = stops => { const gr = g.createLinearGradient(0, 0, 0, H); for (const [q, c, a] of stops) gr.addColorStop(q, rgba(c, Math.min(1, a))); g.fillStyle = gr; g.fillRect(0, 0, L.W, H); };
    if (k > 0.02) band(day.p < 0.3
      ? [[0, [120, 150, 230], 0], [0.6, [255, 210, 190], 0.22 * k], [1, [255, 214, 170], 0.7 * k]]
      : [[0, [58, 26, 120], 0.6 * k], [0.45, [150, 60, 130], 0.3 * k], [0.8, [255, 150, 70], 0.36 * k], [1, [255, 214, 110], 0.6 * k]]);
    if (n > 0.02) band([[0, [1, 4, 26], 0.72 * n], [0.6, [8, 24, 80], 0.3 * n], [1, [74, 120, 200], 0.42 * n]]);
  }
  /** Soft haze, glow, disc and the four-pointed sparkle of the Pyramid apex. */
  drawSun(g, day, [x, y]) {
    const L = this.L, k = 1 - day.night; if (k < 0.03) return;
    const ev = clamp((day.p - 0.6) / 0.2, 0, 1), col = mix([255, 246, 214], [255, 150, 70], ev), r = L.land ? 40 : 38;
    g.save(); g.globalAlpha = k;
    const rr = Math.max(L.W, L.H) * 0.55, hz = g.createRadialGradient(x, y, 0, x, y, rr);
    hz.addColorStop(0, 'rgba(255,255,250,.55)'); hz.addColorStop(0.18, 'rgba(225,240,255,.22)'); hz.addColorStop(1, 'rgba(200,230,255,0)');
    g.fillStyle = hz; g.fillRect(0, 0, L.W, this.skyBottom + 4);
    const gr = g.createRadialGradient(x, y, 0, x, y, r * 5);
    gr.addColorStop(0, rgba(col, 0.8)); gr.addColorStop(0.2, rgba(col, 0.35)); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);
    g.fillStyle = rgba(mix(col, [255, 255, 255], 0.55), 1); dot(g, x, y, r);
    g.globalCompositeOperation = 'lighter';
    for (const [ang, kk] of [[0, 1], [Math.PI / 2, 1], [Math.PI / 4, 0.45], [-Math.PI / 4, 0.45]]) {
      // Portrait: spikes pointing up stop below the title
      const len = 230 * kk, back = !L.land && ang ? Math.max(20, Math.min(len, (y - 205) / Math.sin(ang))) : len;
      g.save(); g.translate(x, y); g.rotate(ang);
      const sg = g.createLinearGradient(-back, 0, len, 0);
      sg.addColorStop(0, rgba(col, 0)); sg.addColorStop(back / (back + len), 'rgba(255,255,255,.8)'); sg.addColorStop(1, rgba(col, 0));
      g.fillStyle = sg; g.beginPath(); g.moveTo(-back, 0); g.lineTo(0, -2.6 * kk); g.lineTo(len, 0); g.lineTo(0, 2.6 * kk); g.closePath(); g.fill(); g.restore();
    }
    g.restore();
  }
  drawRays(g, t, k, [ax, ay]) {
    if (k <= 0.01) return;
    const len = Math.max(this.L.W, this.L.H) * 1.1;
    RAYS.forEach(([ang, wd, a], i) => {
      const al = a * k * (0.85 + 0.15 * Math.sin(t * 0.45 + i * 1.7)), gr = g.createRadialGradient(ax, ay, 0, ax, ay, len);
      gr.addColorStop(0, `rgba(255,255,245,${Math.min(1, al * 2)})`); gr.addColorStop(0.5, `rgba(255,255,245,${al})`); gr.addColorStop(1, 'rgba(255,255,245,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(ax, ay); g.arc(ax, ay, len, ang - wd, ang + wd); g.closePath(); g.fill();
    });
  }
  drawClouds(g, t, k) {
    const W = this.L.W;
    for (const c of this.clouds) {
      const span = W + c.w + 200, x = ((c.x0 + t * c.speed * k + 100 + c.w) % span + span) % span - c.w - 100;
      if (c.thin) { const a = g.globalAlpha; g.globalAlpha = a * 0.5; g.drawImage(c.c, x, c.y - c.h * 0.16, c.w, c.h * 0.32); g.globalAlpha = a; }
      else g.drawImage(c.c, x, c.y - c.h / 2, c.w, c.h);
    }
  }
  drawBirds(g, t) {
    const L = this.L, W = L.W, rows = L.land ? [118, 170, 140, 300, 250] : [420, 520, 690, 600, 780];
    g.lineCap = 'round'; g.lineJoin = 'round';
    rows.forEach((y0, i) => {
      const sp = 34 + i * 6, x = ((t * sp + i * 397) % (W + 200) + W + 200) % (W + 200) - 100, y = y0 + Math.sin(t * 0.6 + i) * 12;
      const f = Math.sin(t * (7 + i * 0.6) + i * 2), w = 9 + i % 2 * 2, wy = -f * 5;
      for (const [col, lw] of [['rgba(20,50,100,.35)', 3.4], ['rgba(255,255,255,.95)', 2]]) {
        g.strokeStyle = col; g.lineWidth = lw;
        g.beginPath(); g.moveTo(x - w, y + wy); g.quadraticCurveTo(x - w * 0.4, y - 3, x, y + 1); g.quadraticCurveTo(x + w * 0.4, y - 3, x + w, y + wy); g.stroke();
      }
    });
  }

  // ------------------------------------------------------------- water
  drawWaterfall(g, t) {
    const f = this.A.waterfall; if (!f) return;
    const L = this.L, x0 = f.x - f.w / 2, y0 = f.top, y1 = L.waterY, wv = this.sim.cfg.waves ?? 0.7;
    const gr = g.createLinearGradient(x0, 0, x0 + f.w, 0);
    gr.addColorStop(0, 'rgba(206,250,248,.92)'); gr.addColorStop(0.35, 'rgba(84,206,222,.9)'); gr.addColorStop(0.7, 'rgba(60,186,212,.9)'); gr.addColorStop(1, 'rgba(232,255,255,.92)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(x0 + 4, y0); g.lineTo(x0 + f.w - 4, y0); g.lineTo(x0 + f.w + 6, y1); g.lineTo(x0 - 6, y1); g.closePath(); g.fill();
    g.save(); g.clip(); g.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      g.strokeStyle = `rgba(255,255,255,${0.35 + (i % 3) * 0.12})`; g.lineWidth = 2 + (i % 2);
      g.setLineDash([26 + i * 5, 34 + i * 3]); g.lineDashOffset = -t * (230 + i * 25);
      const xx = x0 + 5 + i * (f.w - 10) / 6; g.beginPath(); g.moveTo(xx, y0); g.lineTo(xx + (i - 3) * 1.6, y1); g.stroke();
    }
    g.restore(); g.setLineDash([]);
    for (let k = 0; k < 5; k++) {
      const ph = (t * 0.8 + k / 5) % 1;
      ellipse(g, f.x + (k - 2) * f.w * 0.22, y1 + 4 - ph * 6, f.w * (0.24 + 0.1 * Math.sin(t * 3 + k)) * (1 - ph * 0.4), 7 + Math.sin(t * 4 + k) * 2 * wv, `rgba(255,255,255,${0.75 - ph * 0.5})`);
    }
  }
  drawWater(g, t) {
    const L = this.L, R = L.R, cfg = this.sim.cfg, W = L.W, H = L.H, y0 = L.waterY, ls = this.scale, hW = H - y0, wv = cfg.waves ?? 0.7;
    let gr = g.createLinearGradient(0, y0, 0, H);
    gr.addColorStop(0, '#52d8e6'); gr.addColorStop(0.3, '#25aed6'); gr.addColorStop(1, '#0b4f94');
    g.fillStyle = gr; g.fillRect(0, y0, W, hW);
    if (cfg.reflection > 0.01) {
      for (let y = y0; y < H; y += 3) {
        const d = y - y0, sy = y0 - d - 3; if (sy < 0) break;
        g.globalAlpha = (0.6 - 0.32 * (d / hW)) * cfg.reflection;
        const wob = (Math.sin(y * 0.13 + t * 2.2) * (1.2 + d * 0.02) + Math.sin(y * 0.041 - t * 1.4) * 2) * wv;
        g.drawImage(this.refl, 0, sy * ls, W * ls, 3 * ls, wob, y, W, 3.3);
      }
      g.globalAlpha = 1;
    }
    gr = g.createLinearGradient(0, y0, 0, H);
    gr.addColorStop(0, 'rgba(70,220,232,.3)'); gr.addColorStop(0.5, 'rgba(20,140,195,.3)'); gr.addColorStop(1, 'rgba(3,45,105,.5)');
    g.fillStyle = gr; g.fillRect(0, y0, W, hW);
    g.globalCompositeOperation = 'lighter';
    const nSpark = Math.round(90 * Math.min(2, cfg.sparkle ?? 0.55));
    for (let i = 0; i < nSpark; i++) {
      const hx = (Math.sin(i * 12.9898) * 43758.5453) % 1, hy = (Math.sin(i * 78.233) * 12543.123) % 1;
      const x = Math.abs(hx) * W + Math.sin(t * 0.4 + i) * 6, y = y0 + 6 + Math.pow(Math.abs(hy), 1.6) * (hW - 10);
      const a = Math.pow(Math.max(0, Math.sin(t * 2.6 + i * 1.93)), 14); if (a < 0.05) continue;
      g.globalAlpha = Math.min(1, a * 0.9 * Math.min(1, cfg.sparkle ?? 0.55)); g.fillStyle = '#ffffff';
      const sz = 1 + (i % 3); g.fillRect(x - sz * 2, y - 0.5, sz * 4, 1); g.fillRect(x - 0.5, y - sz, 1, sz * 2);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2;
    g.beginPath(); for (let x = 0; x <= W; x += 8) { const y = y0 + 4 + Math.sin(x * 0.05 + t * 2) * 1.3 * wv; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    // Return current: a faint lane with drifting dashes
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(190,250,255,.08)'; g.lineWidth = 2 * R + 14; g.stroke(this.lane);
    g.setLineDash([10, 26]); g.lineDashOffset = -t * 80 * (cfg.current || 1); g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 2; g.stroke(this.lane); g.setLineDash([]);
  }

  // ------------------------------------------------------------- attractions
  /** Water film on open slides, dry closed slides with a barrier, foam at the outlets. */
  drawFlow(g, t) {
    const L = this.L, R = L.R, cfg = this.sim.cfg, open = this.sim.story?.openRoutes || [true, true, true, true];
    const wf = WP.troughSize(R).inner - 14, rs = cfg.rollSpeed || 1;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    L.routes.forEach((r, i) => {
      const P = this.routePaths[i];
      if (!open[i]) {
        g.save(); g.translate(0.5, 3.5); g.strokeStyle = WP.ART_COLORS.innerWall; g.lineWidth = wf + 5; g.stroke(P); g.restore();
        const [x] = r.launch, y = L.deck.y;
        for (const sx of [-1, 1]) { line(g, [[x + sx * R * 0.9, y], [x + sx * R * 0.9, y - 36]], 5, '#7a5332'); ellipse(g, x + sx * R * 0.9, y - 37, 4, 4, '#f4d79a'); }
        g.setLineDash([9, 9]); line(g, [[x - R * 0.9, y - 30], [x + R * 0.9, y - 30]], 5, '#ffffff'); g.lineDashOffset = 9; line(g, [[x - R * 0.9, y - 30], [x + R * 0.9, y - 30]], 5, '#e8484f'); g.setLineDash([]); g.lineDashOffset = 0;
        return;
      }
      g.save(); g.translate(0, 2.5);
      g.setLineDash([18, 46, 6, 70]); g.lineDashOffset = -t * 95 * rs - i * 37; g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2.4; g.stroke(P);
      g.translate(0, -wf * 0.3); g.setLineDash([10, 64, 4, 50]); g.lineDashOffset = -t * 125 * rs - i * 53; g.strokeStyle = 'rgba(235,255,255,.55)'; g.lineWidth = 1.8; g.stroke(P);
      g.restore(); g.setLineDash([]);
      if (i < 3) {                                                  // outlet into the lagoon
        const [ex, ey] = r.end;
        for (let k = 0; k < 3; k++) {
          const ph = (t * 0.9 + k / 3) % 1;
          g.strokeStyle = `rgba(255,255,255,${0.55 * (1 - ph)})`; g.lineWidth = 2;
          g.beginPath(); g.ellipse(ex, ey + 9, 12 + ph * R * 1.7, 3 + ph * 8, 0, 0, TAU); g.stroke();
        }
        ellipse(g, ex, ey + 6, R * (0.85 + 0.1 * Math.sin(t * 5 + i)), 6, 'rgba(255,255,255,.6)');
      }
    });
    g.restore();
    this.drawFlags(g, t, open);
  }
  /** A pennant on a pole marks every slide start on the deck; grey while the attraction is still closed. */
  drawFlags(g, t, open) {
    const L = this.L, R = L.R, y = L.deck.y;
    L.routes.forEach((r, i) => {
      const side = r.launch[0] < L.origin[0] ? -1 : 1, x = r.launch[0] + side * R * 1.55, top = y - 92, w = 34, wav = Math.sin(t * 4 + i * 1.3);
      line(g, [[x, y], [x, top]], 5, '#5a3c22'); line(g, [[x - 1, y], [x - 1, top]], 2, '#b9864c'); ellipse(g, x, top - 2, 4, 4, '#f2cf5b');
      g.fillStyle = open[i] ? FLAGS[i] : '#b9b3a6'; g.strokeStyle = 'rgba(60,40,30,.6)'; g.lineWidth = 1.5; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(x, top + 1); g.quadraticCurveTo(x + side * w * 0.5, top + 4 + wav * 3, x + side * w, top + 12 + wav * 4);
      g.quadraticCurveTo(x + side * w * 0.5, top + 17 + wav * 2, x, top + 24); g.closePath(); g.fill(); g.stroke();
    });
  }
  drawSwirl(g, t) {
    if (this.sim.story?.openRoutes?.[1] === false) return;
    const f = this.L.funnel, wr = f.rx - 12, wry = f.ry - 7;
    g.save(); g.beginPath(); g.ellipse(f.x, f.y + 1, wr, wry, 0, 0, TAU); g.clip(); g.lineCap = 'round';
    for (let j = 0; j < 5; j++) {
      const k = 0.24 + j * 0.17, a = t * 1.7 * (1.5 - k) + j * 1.9;
      g.strokeStyle = `rgba(255,255,255,${0.6 - j * 0.07})`; g.lineWidth = 2.6 - j * 0.25;
      g.beginPath(); g.ellipse(f.x, f.y + wry * 0.22 * (1 - k), wr * k, wry * k, 0, a, a + 1.2); g.stroke();
    }
    g.restore();
  }
  drawLift(g) {
    const L = this.L, R = L.R, E = L.lift, x = E.x, cfg = this.sim.cfg, T = this.A.tower, st = this.sim.t, rp = this.rp, bx = this.bx;
    // The belt runs while a passenger moves (render-side only; the simulation is untouched)
    if (this.beltT == null || st < this.beltT) { this.beltT = st; this.beltPos = 0; }
    if (this.sim.animals.some(b => b.state === 'lift' && b.v > 1)) this.beltPos += (st - this.beltT) * 180 * (cfg.beltSpeed || 1);
    this.beltT = st;
    g.fillStyle = 'rgba(6,26,60,.22)'; g.fillRect(x - R - 10, E.top - R - 6, bx + 2 * rp + 6 - (x - R - 10), E.bottom - E.top + 2 * R);
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.strokeStyle = '#26343b'; g.lineWidth = 7; g.stroke(this.belt);
    g.setLineDash([6, 8]); g.lineDashOffset = -this.beltPos; g.strokeStyle = '#a9bcc4'; g.lineWidth = 2.2; g.stroke(this.belt); g.setLineDash([]);
    for (const yc of [E.top, E.bottom]) {
      g.fillStyle = '#dfe8ec'; g.strokeStyle = '#43545c'; g.lineWidth = 3; g.beginPath(); g.arc(bx + rp, yc, rp + 1, 0, TAU); g.fill(); g.stroke();
      const a0 = -this.beltPos / rp; g.strokeStyle = '#6d818a'; g.lineWidth = 2.5;
      for (let i = 0; i < 3; i++) { const a = a0 + i * TAU / 3; g.beginPath(); g.moveTo(bx + rp, yc); g.lineTo(bx + rp + Math.cos(a) * (rp - 4), yc + Math.sin(a) * (rp - 4)); g.stroke(); }
      g.fillStyle = '#3b4b53'; dot(g, bx + rp, yc, 3.5);
    }
    const riders = this.sim.animals.filter(b => b.state === 'lift');
    for (const b of riders) { const q = this.sim.pose(b); this.drawCritterAt(g, b, { x: q.x, y: q.y, ang: 0, mode: 'lift', speed: 0, look: [0, -1] }); }
    for (const b of riders) {
      const q = this.sim.pose(b), rr = R + 4;
      line(g, [[bx, q.y - 6], [q.x + rr * 0.75, q.y + rr * 0.45]], 4, '#3d4f58');
      g.beginPath(); g.arc(q.x, q.y, rr, 0, Math.PI); g.closePath();
      g.fillStyle = 'rgba(214,228,235,.88)'; g.fill(); g.strokeStyle = '#3d4f58'; g.lineWidth = 2.5; g.stroke();
    }
    // Lower shaft stands in the lagoon
    const y0 = L.waterY, y1 = T.bottom + 22;
    const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, 'rgba(30,160,200,.5)'); gr.addColorStop(1, 'rgba(10,70,130,.72)');
    g.fillStyle = gr; g.fillRect(T.x - T.hw - 12, y0, 2 * T.hw + 24, y1 - y0);
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y0 + 4, T.hw + 16, 6, 0, 0, TAU); g.stroke();
    WP.paintTowerFront(g, this.A);
  }
  /** Tilting board. The feed slide pours onto its entry end, the exit end pours into the catch chute (mockup hand-overs). */
  drawSeesaw(g, t) {
    const L = this.L, R = L.R, f = L.seesaw, d = f.dir || 1, phi = (this.sim.seesawAngle || 0) * d, half = f.length / 2;
    const open = this.sim.story?.openRoutes?.[2] !== false, at = lx => [f.x + Math.cos(phi) * lx, f.y + Math.sin(phi) * lx];
    g.save(); g.translate(f.x, f.y); g.rotate(phi); const board = [[-half, 0], [half, 0]]; WP.paintTrough(g, board, R);
    if (!open) line(g, board, WP.troughSize(R).inner - 9, WP.ART_COLORS.innerWall, 0.5, 3.5);
    else {                                                                    // water running towards the exit end
      g.lineCap = 'round'; g.setLineDash([16, 42, 6, 54]); g.lineDashOffset = -t * 110 * (this.sim.cfg.rollSpeed || 1);
      line(g, [[-d * half, 2.5], [d * half, 2.5]], 2.4, 'rgba(255,255,255,.5)'); g.setLineDash([]);
    }
    g.restore();
    WP.paintSeesawWheel(g, this.A, phi);
    if (!open) return;
    const [sx, sy] = f.spout, entry = at(-d * half), exit = at(d * half);
    this.pour(g, t, [sx, sy + R * 0.85], entry, R, 0);
    this.pour(g, t, [exit[0] + d * R * 0.6, exit[1] + 4], f.catchTop, R, 1);
  }
  /** Short water curtain from a slide end down into the next trough, with a foam ring where it lands. */
  pour(g, t, [ax, ay], [bx, by], R, k) {
    const w = R * 0.62;
    g.save(); g.lineCap = 'round';
    const gr = g.createLinearGradient(0, ay, 0, by); gr.addColorStop(0, 'rgba(232,252,255,.8)'); gr.addColorStop(1, 'rgba(150,228,246,.5)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(ax - w * 0.75, ay); g.lineTo(ax + w * 0.75, ay); g.lineTo(bx + w, by); g.lineTo(bx - w, by); g.closePath(); g.fill();
    g.setLineDash([9, 15]); g.lineDashOffset = -t * 170 - k * 11; g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2;
    for (const u of [-0.55, 0, 0.55]) { g.beginPath(); g.moveTo(ax + u * w * 0.75, ay); g.lineTo(bx + u * w, by); g.stroke(); }
    g.setLineDash([]);
    for (let i = 0; i < 2; i++) {
      const ph = (t * 1.4 + i / 2 + k * 0.3) % 1;
      g.strokeStyle = `rgba(255,255,255,${0.6 * (1 - ph)})`; g.lineWidth = 2;
      g.beginPath(); g.ellipse(bx, by, w * (0.9 + ph * 0.8), 3 + ph * 4, 0, 0, TAU); g.stroke();
    }
    ellipse(g, bx, by, w * 0.95, 4.5, 'rgba(255,255,255,.75)');
    g.restore();
  }
  drawSpring(g, t) {
    const L = this.L, R = L.R, j = L.jump;
    const launch = [...(this.sim.recent || [])].reverse().find(e => e.type === 'spring'), age = launch ? t - launch.t : 99;
    const rebound = age >= 0 && age < 1.1 ? -Math.sin(age * 14) * Math.exp(-age * 3.8) * 8 : 0;
    const loaded = this.sim.animals.some(b => b.state === 'route' && b.route === 3 && b.s < j.entryS && j.entryS - b.s < 40);
    const by = j.y + R + (loaded ? 6 : rebound), base = j.y + R + 36, coil = [];
    for (let i = 0; i <= 10; i++) coil.push([j.x + 6 + (i % 2 ? 15 : -15), by + 10 + i * (base - by - 10) / 10]);
    line(g, coil, 6, '#2d4a52'); line(g, coil, 3.5, '#9cc4cc');
    roundRect(g, j.x - 52, by - 3, 120, 16, 7, '#6f5638'); roundRect(g, j.x - 50, by - 2, 116, 12, 6, '#f2c94c');
    line(g, [[j.x - 42, by + 1], [j.x + 58, by + 1]], 3, '#fff1b0'); line(g, [[j.x - 44, by + 8], [j.x + 60, by + 8]], 2, 'rgba(160,110,20,.5)');
  }

  // ------------------------------------------------------------- animals
  /** Display pose: walking on the deck, sitting on flat slides, arms up on steep ones, dizzy in the funnel. */
  display(b) {
    const L = this.L, q = this.sim.pose(b);
    const d = { b, x: q.x, y: q.y, ang: q.angle || 0, mode: q.mode, speed: q.speed || 0, look: q.look || [1, 0], part: null, tilt: 0, behindFunnel: false };
    if (b.state !== 'route' || q.mode === 'pool') return d;
    const r = L.routes[b.route], p = WP.samplePath(r.path, b.s); d.part = p.kind;
    if (p.kind === 'deck') { d.mode = 'roll'; d.ang = 0; d.y -= Math.abs(Math.sin(b.s / L.R * 1.2)) * 3; d.speed = Math.min(d.speed, 200); }
    else if (p.kind === 'funnel') { d.mode = 'roll'; d.speed = 420; }
    else if (p.kind === 'seesaw') { d.mode = 'lift'; d.tilt = q.angle; d.ang = q.angle; }
    else if (p.kind === 'drop') { d.mode = 'fall'; d.tilt = 0; d.ang = 0; }       // short plop onto / off the seesaw
    else if (p.kind !== 'flight') {
      const incl = p.tx >= 0 ? Math.atan2(p.ty, p.tx) : Math.atan2(-p.ty, -p.tx);
      d.tilt = incl; d.ang = clamp(incl * 0.55, -0.55, 0.55); d.mode = Math.abs(p.ty) > 0.62 ? 'fall' : 'lift';
    }
    d.behindFunnel = !L.land && b.route === 2 && p.kind !== 'deck' && b.s < r.feature.entryS;
    return d;
  }
  riders() {
    const out = [];
    for (const b of this.sim.animals) if (b.state === 'platform' || b.state === 'route') { const d = this.display(b); if (d.mode !== 'pool') out.push(d); }
    return out.sort((a, b) => a.y - b.y);
  }
  swimmers() {
    const out = [], t = this.sim.t, wv = this.sim.cfg.waves ?? 0.7;
    for (const b of this.sim.animals) {
      if (b.state !== 'pool' && b.state !== 'gather' && b.state !== 'route') continue;
      const d = this.display(b); if (d.mode !== 'pool') continue;
      d.y += Math.sin(t * 2.4 + b.id * 1.7) * 2.2 * wv; d.ang = 0; out.push(d);
    }
    return out.sort((a, b) => a.y - b.y);
  }
  mood(b) {
    const d = this.dayState, cfg = this.sim.cfg, st = this.sim.story || {};
    if (st.show && b.state === 'gather') return { cheer: true, cap: !!(cfg.sleepy && d.p > 0.8) };
    if (!cfg.sleepy || !d) return null;
    const p = d.p, t = this.sim.t, per = 6 + (b.id % 4) * 1.3, ph = (t + b.id * 1.37) % per;
    const yawn = p > 0.66 && p < 0.9 && ph < 1.4 ? Math.sin(Math.PI * ph / 1.4) : 0;
    return { yawn, cap: p > 0.8 || p < 0.03, sleep: (p > 0.84 || p < 0.02) && b.state === 'gather' };
  }
  drawCritterAt(g, b, d) {
    this.critters.drawCritter(g, this.sprites[b.kind], b.kind, b.id, d.x, d.y, d.ang, d.mode, this.sim.t, d.speed, d.look, this.sim.cfg.wiggle ?? 1, this.L.R, this.mood(b));
  }
  drawRider(g, d) {
    this.drawCritterAt(g, d.b, d);
    if (!d.part || d.part === 'deck' || d.part === 'flight') return;
    // Sits in the water film: lower body under water, foam crest and a little spray behind
    const R = this.L.R, t = this.sim.t, back = d.look[0] < 0 ? 1 : -1;
    g.save(); g.translate(d.x, d.y); g.rotate(d.tilt);
    g.save(); g.beginPath(); g.rect(-R * 1.8, R * 0.4, R * 3.6, R * 1.4); g.clip();
    g.fillStyle = 'rgba(38,182,214,.55)'; g.beginPath(); g.arc(0, 0, R + 1, 0, TAU); g.fill(); g.restore();
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2.4; g.lineCap = 'round';
    g.beginPath(); for (let k = 0; k <= 10; k++) { const u = -1.1 + k * 0.22, y = R * 0.42 + Math.sin(t * 9 + k * 1.3) * 1.4; k ? g.lineTo(u * R, y) : g.moveTo(u * R, y); } g.stroke();
    if (d.part !== 'funnel') {
      g.fillStyle = 'rgba(240,253,255,.9)';
      for (let k = 0; k < 5; k++) { const ph = (t * 3.2 + k / 5) % 1; dot(g, back * R * (0.9 + ph * 0.9), R * 0.35 - Math.sin(ph * Math.PI) * R * 0.55 - k % 2 * 3, 2.6 * (1 - ph * 0.5)); }
    }
    g.restore();
  }
  drawPool(g, swimmers) {
    const L = this.L, R = L.R, t = this.sim.t, wv = this.sim.cfg.waves ?? 0.7;
    for (const d of swimmers) {
      const { x, y, b } = d;
      g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1.5;
      g.beginPath(); g.ellipse(x, y + R * 0.45, R * 1.7 + Math.sin(t * 3 + b.id) * 1.5 * wv, R * 0.5, 0, 0, TAU); g.stroke();
      this.drawCritterAt(g, b, d);
      g.save(); g.beginPath(); g.rect(x - R * 2, y + R * 0.35, R * 4, R * 1.2); g.clip();
      g.beginPath(); g.arc(x, y, R + 0.5, 0, TAU); g.fillStyle = 'rgba(20,130,185,.55)'; g.fill(); g.restore();
      const m = this.mood(b);
      if (m && m.sleep) {
        g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
        for (let i = 0; i < 3; i++) {
          const f = (t * 0.5 + b.id * 0.31 + i / 3) % 1;
          g.globalAlpha = Math.sin(Math.PI * f) * 0.9; g.font = `700 ${Math.round(R * (0.55 + f * 0.5))}px Bahnschrift, "Segoe UI", Arial`;
          g.fillText('z', x + R * 0.7 + f * R * 0.9 + Math.sin(f * 6 + b.id) * 3, y - R * 1.1 - f * R * 1.8);
        }
        g.globalAlpha = 1;
      }
    }
  }
  drawSplashes(g, t) {
    for (const e of this.sim.recent || []) {
      if (e.type !== 'splash') continue;
      const a = t - e.t; if (a < 0 || a > 1.6) continue;
      const st = clamp((e.p || 1) * 0.85, 0.45, 1.3);
      for (let i = 0; i < 3; i++) {
        const aa = a - i * 0.18; if (aa <= 0) continue;
        g.strokeStyle = `rgba(255,255,255,${0.7 * Math.max(0, 1 - aa / 1.2)})`; g.lineWidth = 2;
        g.beginPath(); g.ellipse(e.x, e.y + 8, 10 + aa * 90, 3 + aa * 26, 0, 0, TAU); g.stroke();
      }
      const rng = new EBS.RNG(e.seq * 7919 + 13);
      g.fillStyle = 'rgba(235,252,255,.95)';
      for (let i = 0; i < 16; i++) {
        const vx = rng.range(-130, 130) * st, vy = -rng.range(160, 330) * st, x = e.x + vx * a, y = e.y + vy * a + 450 * a * a, r = rng.range(1.4, 3.4);
        if (y <= e.y + 6) dot(g, x, y, r);
      }
    }
  }
  drawSelfLit(g, day, riders, swimmers) {
    const a = clamp(day.warmK * 0.7 + day.night * 0.85, 0, 0.9) * 0.7; if (a < 0.03) return;
    const L = this.L, R = L.R;
    g.globalAlpha = a * 0.6;
    for (const b of this.sim.animals) if (b.state === 'lift') {
      const q = this.sim.pose(b); if (q.y > L.waterY) continue;
      this.drawCritterAt(g, b, { x: q.x, y: q.y, ang: 0, mode: 'lift', speed: 0, look: [0, -1] });
    }
    g.globalAlpha = a;
    for (const d of riders) this.drawCritterAt(g, d.b, d);
    for (const d of swimmers) { g.save(); g.beginPath(); g.rect(d.x - R * 2, d.y - R * 3, R * 4, R * 3.35); g.clip(); this.drawCritterAt(g, d.b, d); g.restore(); }
    g.globalAlpha = 1;
  }

  // ------------------------------------------------------------- light
  grade(g, day) {
    const L = this.L, m = day.mult, shore = L.waterY;
    if (m[0] + m[1] + m[2] < 762) { g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgb(${m[0]},${m[1]},${m[2]})`; g.fillRect(-20, -20, L.W + 40, L.H + 40); }
    if (day.warmK > 0.01) {
      const sp = day.short ? [L.W / 2, L.horizon] : this.sunPos;
      g.globalCompositeOperation = 'screen';
      let gr = g.createLinearGradient(0, 0, 0, L.horizon);
      gr.addColorStop(0, rgba(day.warm, 0)); gr.addColorStop(0.55, rgba(day.warm, Math.min(1, 0.18 * day.warmK))); gr.addColorStop(1, rgba(day.warm, Math.min(1, 0.55 * day.warmK)));
      g.fillStyle = gr; g.fillRect(-20, -20, L.W + 40, L.horizon + 20);
      gr = g.createLinearGradient(0, L.horizon, 0, shore);
      gr.addColorStop(0, rgba(day.warm, Math.min(1, 0.55 * day.warmK))); gr.addColorStop(1, rgba(day.warm, Math.min(1, 0.4 * day.warmK)));
      g.fillStyle = gr; g.fillRect(-20, L.horizon, L.W + 40, shore - L.horizon);
      gr = g.createLinearGradient(0, shore, 0, L.H);
      gr.addColorStop(0, rgba(day.warm, Math.min(1, 0.4 * day.warmK))); gr.addColorStop(1, rgba(day.warm, 0));
      g.fillStyle = gr; g.fillRect(-20, shore, L.W + 40, L.H - shore + 20);
      for (const [x, y, a] of [[sp[0], sp[1], 1], [sp[0], 2 * shore - sp[1], 0.6]]) {
        const rr = Math.max(L.W, L.H) * 0.85, rg = g.createRadialGradient(x, y, 0, x, y, rr);
        rg.addColorStop(0, rgba(day.warm, Math.min(1, 0.6 * day.warmK * a))); rg.addColorStop(0.5, rgba(day.warm, Math.min(1, 0.2 * day.warmK * a))); rg.addColorStop(1, rgba(day.warm, 0));
        g.fillStyle = rg; g.fillRect(-20, -20, L.W + 40, L.H + 40);
      }
    }
    g.globalCompositeOperation = 'source-over';
  }
  glow(g, x, y, r, col, a) {
    if (a <= 0.005) return;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(col, Math.min(1, a))); gr.addColorStop(0.35, rgba(col, Math.min(1, a * 0.35))); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  /** Stars and moon, moon glitter, lamps, festoon lights on the deck, tower light, pool lights and fireflies. */
  drawNight(g, t, day) {
    const L = this.L, n = day.night, cfg = this.sim.cfg, A = this.A, lit = clamp(n * 1.3 + day.warmK * 0.2, 0, 1);
    if (lit < 0.02) return;
    g.globalCompositeOperation = 'lighter';
    if (cfg.stars && n > 0.02) {
      for (const [x, y, r, ph] of this.stars) { g.globalAlpha = n * (0.55 + 0.45 * Math.sin(t * 1.7 + ph)); g.fillStyle = '#fffbe8'; g.fillRect(x - r / 2, y - r / 2, r, r); }
      const [mx, my0, mr] = this.moon, my = my0 + (1 - n) * mr * 1.5;
      const halo = g.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 5);
      halo.addColorStop(0, `rgba(190,212,255,${0.4 * n})`); halo.addColorStop(0.35, `rgba(150,180,255,${0.13 * n})`); halo.addColorStop(1, 'rgba(150,180,255,0)');
      g.globalAlpha = 1; g.fillStyle = halo; g.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
      g.globalAlpha = Math.min(1, n * 1.15); g.globalCompositeOperation = 'source-over';
      g.drawImage(this.moonImg.c, mx - this.moonImg.r, my - this.moonImg.r, this.moonImg.r * 2, this.moonImg.r * 2);
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 26; i++) {
        const y = L.waterY + 8 + i * (L.H - L.waterY - 8) / 26, w = 6 + i * 1.6, a = Math.max(0, Math.sin(t * 2.3 + i * 1.9));
        g.globalAlpha = n * 0.5 * a; g.fillStyle = '#fff2c8'; g.fillRect(mx - w / 2 + Math.sin(t + i) * 6 * (cfg.waves ?? 0.7), y, w, 1.6);
      }
    }
    g.globalAlpha = 1;
    for (const [x, ground] of A.lamps || []) { const [lx, ly] = WP.lampPos(x, ground); this.glow(g, lx, ly, 90, [255, 214, 140], lit * 0.55); this.glow(g, lx, ly, 18, [255, 246, 214], lit * 0.9); }
    const dk = A.deck, railY = dk.y - L.R * 1.45 - 6;
    for (let x = dk.x0 + 20, k = 0; x < dk.x1 - 10; x += 46, k++) {
      const c = COLORS[k % 4], a = lit * (0.7 + 0.3 * Math.sin(t * 2 + k * 1.3));
      this.glow(g, x, railY + Math.sin(k * 1.7) * 3, 16, c, a * 0.55); g.fillStyle = rgba(mix(c, [255, 255, 255], 0.5), Math.min(1, a)); dot(g, x, railY + Math.sin(k * 1.7) * 3, 2.6);
    }
    const T = A.tower;
    if (T) {
      const cy = (T.top + A.deck.y) / 2; this.glow(g, T.x, cy, T.hw * 2.6, [140, 225, 245], lit * 0.35);
      this.glow(g, T.apex[0], T.apex[1] - 4, 70, [255, 220, 140], lit * 0.6);
    }
    for (let i = 0; i < 6; i++) { const x = L.W * (0.08 + i * 0.168), y = L.waterY + 34; this.glow(g, x, y, 80, [110, 240, 225], lit * 0.3); g.fillStyle = `rgba(200,255,245,${lit * 0.8})`; dot(g, x, y, 2.5); }
    if (cfg.fireflies && n > 0.2) for (let i = 0; i < 16; i++) {
      const x = ((i * 0.754) % 1) * L.W + Math.sin(t * 0.7 + i) * 14, y = (A.wallTop || L.waterY) - 40 - Math.abs(Math.sin(t * 0.35 + i * 1.9)) * 70, a = n * (0.25 + 0.65 * Math.sin(t + i * 3) ** 2);
      this.glow(g, x, y, 12, [211, 249, 135], a * 0.6); g.fillStyle = `rgba(230,255,160,${a})`; dot(g, x, y, 1.6);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }

  // ------------------------------------------------------------- guests
  drawGuests(g, t, day, lit) {
    const cfg = this.sim.cfg;
    for (const e of this.sim.decorations || []) {
      const tau = t - e.start, D = e.duration || 8; if (tau < 0 || tau > D || cfg[e.type] === false) continue;
      if (!lit) { if (e.type === 'balloon') this.drawBalloon(g, e, tau / D, tau); else if (e.type === 'birds') this.drawFlock(g, e, tau / D, t); }
      else if (e.type === 'ufo') this.drawUfoBehind(g, e, tau, t);
      else if (e.type === 'shootingStars') this.drawShooting(g, e, tau);
    }
  }
  guestY() { return this.L.land ? this.L.H * 0.12 : this.L.H * 0.27; }
  drawBalloon(g, e, u, tau) {
    const L = this.L, side = (e.seed & 1) ? 1 : -1, x = side < 0 ? -90 + (L.W + 180) * u : L.W + 90 - (L.W + 180) * u, y = this.guestY() + Math.sin(tau * 0.8) * 6, col = COLORS[e.seed % 4];
    g.save(); g.translate(x, y); if (!L.land) g.scale(1.15, 1.15);
    g.strokeStyle = '#6b4a2a'; g.lineWidth = 1.5; for (const dx of [-9, 9]) { g.beginPath(); g.moveTo(dx * 1.4, 38); g.lineTo(dx, 58); g.stroke(); }
    g.fillStyle = '#8a5a2b'; g.beginPath(); g.roundRect(-11, 57, 22, 15, 3); g.fill(); g.fillStyle = '#6b4520'; g.fillRect(-11, 57, 22, 3);
    const hull = () => { g.beginPath(); g.moveTo(0, 46); g.bezierCurveTo(-54, 12, -46, -54, 0, -54); g.bezierCurveTo(46, -54, 54, 12, 0, 46); g.closePath(); };
    g.save(); hull(); g.clip();
    for (let k = -4; k < 4; k++) { g.fillStyle = rgba(k % 2 ? col : [255, 252, 240], 1); g.fillRect(k * 14, -58, 14, 108); }
    const sh = g.createRadialGradient(-16, -24, 4, 0, -6, 62);
    sh.addColorStop(0, 'rgba(255,255,255,.4)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(40,20,60,.3)');
    g.fillStyle = sh; g.fillRect(-60, -60, 120, 112); g.restore();
    g.strokeStyle = 'rgba(60,40,40,.45)'; g.lineWidth = 1.5; hull(); g.stroke();
    g.restore();
  }
  drawFlock(g, e, u, t) {
    const L = this.L, dir = (e.seed & 2) ? 1 : -1, x0 = dir > 0 ? -160 + (L.W + 320) * u : L.W + 160 - (L.W + 320) * u, y0 = this.guestY() + (L.land ? 40 : 60);
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let k = 0; k < 7; k++) {
      const row = Math.ceil(k / 2), sg = k % 2 ? 1 : -1, x = x0 - dir * row * 26, y = y0 + sg * row * 13 + Math.sin(t * 0.9 + k) * 4;
      const f = Math.sin(t * 8.5 + k * 1.7), w = 10, wy = -f * 5.5;
      for (const [col, lw] of [['rgba(20,50,100,.35)', 3.4], ['rgba(255,255,255,.95)', 2]]) {
        g.strokeStyle = col; g.lineWidth = lw;
        g.beginPath(); g.moveTo(x - w, y + wy); g.quadraticCurveTo(x - w * 0.4, y - 3, x, y + 1); g.quadraticCurveTo(x + w * 0.4, y - 3, x + w, y + wy); g.stroke();
      }
    }
  }
  /** UFO visit: glides in, hovers with a light cone, leaves upwards on the other side. */
  ufoPose(e, tau) {
    const L = this.L, rng = new EBS.RNG(e.seed), side = rng.next() < 0.5 ? -1 : 1, D = e.duration || 9;
    const a = [side < 0 ? -150 : L.W + 150, this.guestY() + rng.range(-30, 40)], h = [L.W * rng.range(0.42, 0.62), this.guestY() + rng.range(-10, 30)], z = [side < 0 ? L.W + 170 : -170, this.guestY() - 160];
    const u = tau / D;
    if (u < 0.3) { const f = smooth(u / 0.3); return { x: a[0] + (h[0] - a[0]) * f, y: a[1] + (h[1] - a[1]) * f, tilt: (h[0] - a[0]) / 900 * Math.sin(Math.PI * f) * 0.35, beam: 0 }; }
    if (u < 0.65) { const q = (u - 0.3) * D; return { x: h[0] + Math.sin(q * 5) * 4, y: h[1] + Math.cos(q * 3.3) * 5, tilt: Math.sin(q * 3) * 0.06, beam: clamp(Math.min((u - 0.34) / 0.05, (0.62 - u) / 0.05), 0, 1) }; }
    const f = smooth((u - 0.65) / 0.35);
    return { x: h[0] + (z[0] - h[0]) * f, y: h[1] + (z[1] - h[1]) * f, tilt: clamp((z[0] - h[0]) / 900, -0.35, 0.35) * Math.sin(Math.PI * f), beam: 0 };
  }
  /** Drawn after grading so it stays bright at night, but cut out behind the jungle, the deck, the tower and the slides. */
  drawUfoBehind(g, e, tau, t) {
    const L = this.L, s = this.scale, P = this.ufoPose(e, tau), bw = 300, bh = 520, bx = P.x - bw / 2, by = P.y - 100;
    if (!this.ufoCanvas) { this.ufoCanvas = document.createElement('canvas'); this.ufoCanvas.width = Math.ceil(bw * s); this.ufoCanvas.height = Math.ceil(bh * s); }
    const C = this.ufoCanvas, cg = C.getContext('2d');
    cg.setTransform(1, 0, 0, 1, 0, 0); cg.globalCompositeOperation = 'source-over'; cg.globalAlpha = 1; cg.clearRect(0, 0, C.width, C.height);
    cg.setTransform(s, 0, 0, s, -bx * s, -by * s);
    this.drawUfo(cg, P, t);
    cg.globalCompositeOperation = 'destination-out';
    for (const c of [this.back, this.struct]) this.blit(cg, c, { x: bx, y: by, w: bw, h: bh });
    this.blit(cg, this.funnelL, this.funnelBox);
    g.drawImage(C, bx, by, bw, bh);
  }
  drawUfo(g, P, t) {
    g.save(); g.translate(P.x, P.y); { const k = this.L.land ? 1.3 : 1.45; g.scale(k, k); }
    if (P.beam > 0) {
      const cone = g.createLinearGradient(0, 10, 0, 340);
      cone.addColorStop(0, `rgba(190,255,225,${0.3 * P.beam})`); cone.addColorStop(1, 'rgba(190,255,225,0)');
      g.globalCompositeOperation = 'lighter'; g.fillStyle = cone;
      g.beginPath(); g.moveTo(-15, 12); g.lineTo(15, 12); g.lineTo(95, 340); g.lineTo(-95, 340); g.closePath(); g.fill();
      g.globalCompositeOperation = 'source-over';
    }
    g.rotate(P.tilt);
    g.globalCompositeOperation = 'lighter';
    const gl = g.createRadialGradient(0, 8, 2, 0, 8, 70); gl.addColorStop(0, 'rgba(150,255,225,.2)'); gl.addColorStop(1, 'rgba(150,255,225,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(0, 8, 70, 0, TAU); g.fill();
    g.globalCompositeOperation = 'source-over';
    const dome = g.createLinearGradient(0, -30, 0, 0); dome.addColorStop(0, 'rgba(215,250,255,.95)'); dome.addColorStop(1, 'rgba(120,205,235,.9)');
    g.fillStyle = dome; g.beginPath(); g.arc(0, -4, 22, Math.PI, 0); g.closePath(); g.fill();
    g.fillStyle = '#6fe06a'; g.beginPath(); g.ellipse(0, -10, 8, 9, 0, 0, TAU); g.fill();
    g.fillStyle = '#16301a'; for (const dx of [-3.4, 3.4]) { g.beginPath(); g.ellipse(dx, -11, 2.3, 3.2, dx * 0.08, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.6; g.beginPath(); g.arc(0, -4, 19, Math.PI * 1.12, Math.PI * 1.45); g.stroke();
    const body = g.createLinearGradient(0, -12, 0, 14); body.addColorStop(0, '#f4f7fa'); body.addColorStop(0.55, '#aab6c1'); body.addColorStop(1, '#68767f');
    g.fillStyle = '#56636d'; g.beginPath(); g.ellipse(0, 7, 34, 9, 0, 0, TAU); g.fill();
    g.fillStyle = body; g.beginPath(); g.ellipse(0, 0, 48, 13, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(40,52,64,.55)'; g.lineWidth = 1.4; g.stroke();
    for (let k = 0; k < 6; k++) {
      const lx = -35 + k * 14, ly = 3 + (1 - Math.pow((k - 2.5) / 2.5, 2)) * 5, c = COLORS[(k + Math.floor(t * 6)) % 4];
      g.globalCompositeOperation = 'lighter'; g.fillStyle = rgba(c, 0.22); dot(g, lx, ly, 6.5);
      g.globalCompositeOperation = 'source-over'; g.fillStyle = rgba(mix(c, [255, 255, 255], 0.35), 1); dot(g, lx, ly, 3);
    }
    g.restore();
  }
  drawShooting(g, e, tau) {
    const L = this.L, rng = new EBS.RNG(e.seed);
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (let k = 0; k < 2; k++) {
      const at = k * rng.range(0.6, 1.1), x0 = rng.range(L.W * 0.1, L.W * 0.9), y0 = rng.range(L.H * 0.04, this.skyBottom * 0.6), ang = rng.range(0.45, 1.0), len = rng.range(170, 300), dir = rng.next() < 0.5 ? -1 : 1;
      const a = tau - at; if (a < 0 || a > 0.8) continue;
      const f = a / 0.8, dx = Math.cos(ang) * dir, dy = Math.sin(ang), hx = x0 + dx * len * f, hy = y0 + dy * len * f, kk = Math.sin(Math.PI * f);
      const gr = g.createLinearGradient(hx, hy, hx - dx * 130, hy - dy * 130);
      gr.addColorStop(0, `rgba(255,255,240,${0.95 * kk})`); gr.addColorStop(1, 'rgba(200,220,255,0)');
      g.strokeStyle = gr; g.lineWidth = 2.6; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx - dx * 130, hy - dy * 130); g.stroke();
      this.glow(g, hx, hy, 9, [255, 250, 235], kk);
    }
    g.restore();
  }
  /** A fish leaps out of the lagoon: arc with rings where it leaves and where it dives back in. */
  drawFish(g, t) {
    const L = this.L, D = 0.85;
    for (const e of this.sim.decorations || []) {
      if (e.type !== 'fish' || this.sim.cfg.fish === false) continue;
      const a = t - e.start; if (a < 0 || a > D + 0.65) continue;
      const rng = new EBS.RNG(e.seed), dir = rng.next() < 0.5 ? -1 : 1, h = rng.range(46, 84), w = rng.range(60, 110), big = rng.range(0.85, 1.2), c = rng.int(0, 2);
      const fx = e.x ?? L.W * 0.2, fy = e.y ?? L.H * 0.89;
      g.save(); g.strokeStyle = 'rgba(255,255,255,.65)'; g.lineWidth = 1.6;
      for (const [ux, t0] of [[-0.5, 0], [0.5, D]]) {
        const r = a - t0; if (r < 0 || r > 0.65) continue;
        g.globalAlpha = 1 - r / 0.65; g.beginPath(); g.ellipse(fx + dir * w * ux, fy + 3, 8 + r * 46, 2.5 + r * 12, 0, 0, TAU); g.stroke();
      }
      const u = a / D;
      if (u <= 1) {
        const sc = big * (L.land ? 1 : 1.15), col = [['#ff9a3c', '#ffd9a0'], ['#ff6f8f', '#ffd0dc'], ['#8fd0e6', '#eafaff']][c];
        g.globalAlpha = 1; g.translate(fx + dir * w * (u - 0.5), fy - h * 4 * u * (1 - u)); g.scale(dir * sc, sc); g.rotate(Math.atan2(-h * 4 * (1 - 2 * u), w));
        g.fillStyle = col[0]; g.strokeStyle = 'rgba(60,30,10,.6)'; g.lineWidth = 1.2; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(-9, 0); g.lineTo(-19, -7); g.lineTo(-19, 7); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.ellipse(0, 0, 13, 6.5, 0, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = col[1]; g.beginPath(); g.ellipse(1, 2.2, 9, 3, 0, 0, TAU); g.fill();
        g.fillStyle = '#1d1424'; dot(g, 7, -1.5, 1.5);
      }
      g.restore();
    }
  }
  /** Speech bubble above a critter; drawn after grading so it stays bright at night. */
  drawEmotes(g, t) {
    if (this.sim.cfg.emotes === false) return;
    const R = this.L.R;
    for (const e of this.sim.decorations || []) {
      if (e.type !== 'emote') continue;
      const a = t - e.start, D = e.duration || 2, b = this.sim.animals[e.id]; if (a < 0 || a > D || !b) continue;
      const q = this.display(b), sym = e.seed % EMOTES.length, k = Math.min(1, a / 0.12) * (a < 0.25 ? 1 + 0.25 * Math.sin(Math.PI * a / 0.25) : 1) * R / 15;
      g.save(); g.globalAlpha = Math.min(1, (D - a) / 0.3); g.translate(q.x + R * 1.45, q.y - R * 2.4 - Math.sin(a * 3) * 2); g.scale(k, k);
      g.fillStyle = '#ffffff'; g.strokeStyle = 'rgba(42,31,51,.85)'; g.lineJoin = 'round'; g.lineWidth = 4.4;
      g.beginPath(); g.roundRect(-17, -19, 34, 30, 10); g.moveTo(-10, 9); g.lineTo(-16, 22); g.lineTo(0, 9); g.closePath(); g.stroke(); g.fill();
      g.fillStyle = EMOTE_COLORS[sym]; g.font = '700 21px "Segoe UI Symbol", "Segoe UI Emoji", Bahnschrift, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(EMOTES[sym], 0, -3);
      g.restore();
    }
  }
  /** Small fountain show and optional fireworks at the end of a park day. */
  drawFinale(g, t) {
    const st = this.sim.story || {}, cfg = this.sim.cfg, L = this.L;
    if (st.show && cfg.mode !== 'relax') {
      const age = t - st.finaleAt;
      if (age >= 0 && age < 8) {
        const alpha = Math.min(1, age) * Math.min(1, 8 - age);
        g.save(); g.globalAlpha = alpha; g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
        for (let j = 0; j < 5; j++) {
          // Light colour changes every two seconds, neighbours offset; height pulses
          const x = L.W * (0.18 + j * 0.16), y = L.waterY + 40 + (j % 2) * 30, h = (L.land ? 120 : 190) * (0.75 + 0.25 * Math.sin(age * 1.6 + j));
          const col = COLORS[(j + Math.floor(age / 2)) % 4], lit = c => rgba(c.map(v => Math.round(v * .55 + 255 * .45)), 1);
          this.glow(g, x, y + 6, 90, col, 0.42);                       // lit water around the nozzle
          this.glow(g, x, y + 70, 60, col, 0.18);                      // its reflection
          // Centre jet with a spray crown
          const top = y - h * 1.5, jg = g.createLinearGradient(0, y, 0, top);
          jg.addColorStop(0, rgba(col, 0.75)); jg.addColorStop(0.6, 'rgba(225,250,255,.7)'); jg.addColorStop(1, 'rgba(255,255,255,.15)');
          g.fillStyle = jg; g.beginPath(); g.moveTo(x - 7, y); g.lineTo(x - 2.5, top); g.lineTo(x + 2.5, top); g.lineTo(x + 7, y); g.closePath(); g.fill();
          // Three arcs per side: wide coloured glow, white core
          for (const d of [-1, 1]) for (let k = 0; k < 3; k++) {
            const hk = h * (2 - k * 0.32), wk = 30 + k * 20;
            g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + d * wk * 0.35, y - hk, x + d * wk, y);
            g.strokeStyle = rgba(col, 0.3); g.lineWidth = 9 - k * 2; g.stroke();
            g.strokeStyle = lit(col); g.globalAlpha = alpha * 0.55; g.lineWidth = 2.2; g.stroke(); g.globalAlpha = alpha;
          }
          // Falling droplets along the arcs and from the crown
          g.fillStyle = 'rgba(240,253,255,.9)';
          for (let i = 0; i < 12; i++) {
            const f = (age * 0.8 + i / 12) % 1, k = i % 3, d = (i >> 1) % 2 ? 1 : -1, wk = 30 + k * 20, hk = h * (2 - k * 0.32);
            const bx = x + d * wk * (2 * f * (1 - f) * 0.35 + f * f), by = y - hk * 2 * f * (1 - f);   // point on the quadratic arc
            dot(g, bx, by, 2.2 - f);
          }
          for (let i = 0; i < 6; i++) { const f = (age * 1.1 + i / 6) % 1; dot(g, x + (i - 2.5) * 6 * f, top + f * f * h * 0.9, 1.8); }
        }
        g.restore();
      }
    }
    if (cfg.fireworks) for (const e of this.sim.decorations || []) {
      if (e.type !== 'firework') continue;
      const a = t - e.start; if (a < 0 || a > 2.5) continue;
      const x = e.x ?? L.W * 0.5, y = e.y ?? L.H * 0.16, c = COLORS[(e.seed >>> 3) % 4], k = Math.max(0, 1 - a / 2.5);
      g.save(); g.globalCompositeOperation = 'lighter';
      this.glow(g, x, y + a * a * 10, 140 * Math.min(1, a * 3), c, 0.4 * k);
      // Outer shell in the burst colour, inner shell warm white; tapered trails with bright heads, sagging with gravity
      for (const [n, rr, sc, tw] of [[30, 150, c, 1], [16, 82, [255, 240, 200], 0.8]]) for (let i = 0; i < n; i++) {
        const ang = (i + (n === 16 ? 0.5 : 0)) / n * TAU, r = (1 - Math.exp(-a * 2.4)) * rr, trail = 10 + 30 * Math.exp(-a * 1.5);
        const px = x + Math.cos(ang) * r, py = y + Math.sin(ang) * r + a * a * 16, qx = px - Math.cos(ang) * trail, qy = py - Math.sin(ang) * trail - a * 6;
        const tg = g.createLinearGradient(qx, qy, px, py); tg.addColorStop(0, rgba(sc, 0)); tg.addColorStop(1, rgba(sc, k * tw));
        g.strokeStyle = tg; g.lineWidth = 2.6; g.beginPath(); g.moveTo(qx, qy); g.lineTo(px, py); g.stroke();
        g.fillStyle = rgba([255, 252, 236], k * (0.6 + 0.4 * Math.sin(a * 20 + i))); dot(g, px, py, 2.4);
      }
      g.restore();
    }
  }

  // ------------------------------------------------------------- HUD (Endless Pyramid style)
  drawHud(g) {
    const L = this.L, st = this.sim.story || {}, cfg = this.sim.cfg, land = L.land;
    const font = (w, s) => `${w} ${s}px Bahnschrift, "Segoe UI", Arial, sans-serif`;
    const sub = { short: 'VIER FREUNDE · EIN WASSERPARK', day: 'EIN TAG IM WASSERPARK', relax: 'RUHIGER DAUERBETRIEB' }[cfg.mode] || '';
    g.save();
    const sh = land ? 240 : 400, scrim = g.createLinearGradient(0, 0, 0, sh);
    scrim.addColorStop(0, `rgba(5,20,62,${land ? 0.32 : 0.46})`); scrim.addColorStop(0.65, `rgba(5,20,62,${land ? 0.12 : 0.2})`); scrim.addColorStop(1, 'rgba(5,20,62,0)');
    g.fillStyle = scrim; g.fillRect(0, 0, L.W, sh);
    g.shadowColor = 'rgba(0,25,70,.45)'; g.shadowBlur = 14; g.textBaseline = 'middle'; g.fillStyle = '#ffffff';
    const rides = fmtInt(this.sim.rides || 0), banner = (st.closing && cfg.mode !== 'short') || st.finished;
    if (land) {
      g.letterSpacing = '4px'; g.textAlign = 'left'; g.font = font(700, 48); g.fillText('ENDLESS WATERPARK', 60, 76);
      g.letterSpacing = '3px'; g.font = font(600, 20); g.fillStyle = '#d7ecff'; g.fillText(sub, 62, 124);
      if (cfg.mode !== 'short') {
        g.textAlign = 'right'; g.fillText('FAHRTEN', L.W - 60, 64);
        g.letterSpacing = '1px'; g.font = font(700, 48); g.fillStyle = '#ffd25a'; g.fillText(rides, L.W - 60, 108);
      }
    } else {
      g.letterSpacing = '5px'; g.textAlign = 'center'; g.font = font(700, 62); g.fillText('ENDLESS WATERPARK', L.W / 2, 108);
      g.letterSpacing = '3px'; g.font = font(600, 25); g.fillStyle = '#d7ecff'; if (!banner) g.fillText(sub, L.W / 2, 172);
      if (cfg.mode !== 'short') {
        g.letterSpacing = '2px'; g.font = font(600, 22); g.fillText('FAHRTEN', L.W / 2, 222);
        g.letterSpacing = '1px'; g.font = font(700, 40); g.fillStyle = '#ffd25a'; g.fillText(rides, L.W / 2, 262);
      }
    }
    if (banner) {   // landscape: centred in the gap between title and moon; portrait: replaces the subtitle line, clear of the tower roof
      const text = st.finished ? (cfg.ending === 'show' ? 'EIN SCHÖNER TAG!' : 'GUTE NACHT, KLEINE FREUNDE') : 'DIE LETZTE RUNDE';
      g.textAlign = 'center'; g.letterSpacing = '4px'; g.font = font(700, land ? 32 : 36); g.fillStyle = '#fff3c4';
      g.shadowColor = 'rgba(255,170,40,.85)'; g.shadowBlur = 20; g.fillText(text, land ? L.W * .545 : L.W / 2, land ? 66 : 172);
    }
    g.restore();
  }
  destroy() {
    for (const c of [this.skyL, this.back, this.struct, this.funnelL, this.front, this.fore, this.refl, this.moonImg.c, ...(this.ufoCanvas ? [this.ufoCanvas] : []), ...this.clouds.map(c => c.c), ...this.sprites.map(s => s.c)]) c.width = c.height = 1;
    super.destroy();
  }
}
WP.Renderer = WaterparkRenderer;
})();
