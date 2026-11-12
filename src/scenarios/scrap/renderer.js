// Extracted unchanged from docs/reference/scrap-arena.source.html. See SOURCE.json.
/* Scrap Arena — procedural Canvas 2D art. No assets, no renderer-side game rules. */
(function (global) {
  'use strict';

  const ScrapArena = global.ScrapArena = global.ScrapArena || {};
  const WORLD = 900;
  const MARGIN = 18;
  const TAU = Math.PI * 2;
  const COLORS = ['#f26b59', '#54d6dc', '#f3c65d', '#a5d66f'];
  const NAMES = ['EMBER', 'AZURE', 'AMBER', 'MOSS'];
  const FONT = '"Inter", "Segoe UI", Arial, sans-serif';
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const finite = (v, fallback = 0) => Number.isFinite(v) ? v : fallback;
  const mix = (a, b, t) => a + (b - a) * t;

  function hash(seed, index = 0) {
    let v = ((Number(seed) || 0) ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0;
    v = Math.imul(v ^ (v >>> 16), 0x21f0aaad);
    v = Math.imul(v ^ (v >>> 15), 0x735a2d97);
    return (v ^ (v >>> 15)) >>> 0;
  }
  const noise = (seed, index) => hash(seed, index) / 4294967296;
  function rgb(color) {
    if (typeof color === 'number') return [color >> 16 & 255, color >> 8 & 255, color & 255];
    const value = typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? parseInt(color.slice(1), 16) : 0xe6bd7a;
    return [value >> 16 & 255, value >> 8 & 255, value & 255];
  }
  function rgba(color, alpha) { const c = rgb(color); return `rgba(${c[0]},${c[1]},${c[2]},${clamp(alpha, 0, 1)})`; }
  function tint(color, white = 0) {
    const c = rgb(color), end = white >= 0 ? 255 : 0, t = Math.abs(white);
    return `rgb(${c.map((v) => Math.round(mix(v, end, t))).join(',')})`;
  }
  function round(g, x, y, w, h, r = 4) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    g.beginPath();
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }
  function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, Math.max(0, r), 0, TAU); }
  function polygon(g, points) {
    g.beginPath(); points.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath();
  }
  function linear(g, x0, y0, x1, y1, stops) {
    const gradient = g.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([n, c]) => gradient.addColorStop(n, c)); return gradient;
  }
  function radial(g, x, y, r, stops) {
    const gradient = g.createRadialGradient(x, y, 0, x, y, Math.max(1, r));
    stops.forEach(([n, c]) => gradient.addColorStop(n, c)); return gradient;
  }
  function line(g, x0, y0, x1, y1, color, width = 1) {
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.strokeStyle = color; g.lineWidth = width; g.stroke();
  }
  function label(g, text, x, y, size = 10, color = '#b2bbc2', align = 'left', weight = 600) {
    g.font = `${weight} ${size}px ${FONT}`; g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = color; g.fillText(String(text), x, y);
  }
  function bolt(g, x, y, r = 2.8) {
    circle(g, x + 0.7, y + 1, r + 0.5); g.fillStyle = '#080c10'; g.fill();
    circle(g, x, y, r); g.fillStyle = linear(g, x - r, y - r, x + r, y + r, [[0, '#87939c'], [0.43, '#47535c'], [1, '#161e25']]); g.fill();
    line(g, x - r * 0.55, y, x + r * 0.55, y, '#10161c', 1);
    line(g, x - r * 0.4, y - r * 0.55, x + r * 0.25, y - r * 0.65, '#a5afb6', 0.65);
  }
  function discGlow(g, x, y, r, color, alpha) {
    if (alpha <= 0 || r <= 0) return;
    g.fillStyle = radial(g, x, y, r, [[0, rgba(color, alpha)], [0.33, rgba(color, alpha * 0.48)], [1, rgba(color, 0)]]);
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function newCanvas(width, height) {
    if (typeof global.OffscreenCanvas === 'function') return new global.OffscreenCanvas(width, height);
    const canvas = global.document.createElement('canvas'); canvas.width = width; canvas.height = height; return canvas;
  }
  function caution(g, x, y, w, h, alpha = 0.38) {
    g.save(); round(g, x, y, w, h, 1.5); g.clip(); g.fillStyle = '#11161b'; g.fillRect(x, y, w, h);
    g.fillStyle = `rgba(203,163,84,${alpha})`;
    for (let xx = x - h; xx < x + w + h; xx += 14) polygon(g, [[xx, y + h], [xx + 7, y + h], [xx + h + 7, y], [xx + h, y]]), g.fill();
    g.restore();
  }

  class Renderer {
    constructor(canvas, { dpr = 1, quality = 1 } = {}) {
      if (!canvas || typeof canvas.getContext !== 'function') throw new TypeError('ScrapArena.Renderer requires a canvas.');
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      if (!this.ctx) throw new Error('Canvas 2D is unavailable.');
      this.dpr = clamp(finite(dpr, 1), 0.5, 2);
      this.quality = clamp(finite(quality, 1), 0.5, 2);
      this._floor = null; this._floorKey = '';
      this._bodies = new Map(); this._blocks = new Map();
      this._width = canvas.width; this._height = canvas.height;
      this._destroyed = false;
    }

    setSize(width, height, dpr = 1) {
      if (this._destroyed) return;
      this.dpr = clamp(finite(dpr, 1), 0.5, 2);
      const w = Math.max(1, Math.round(finite(width, 1) * this.dpr));
      const h = Math.max(1, Math.round(finite(height, 1) * this.dpr));
      if (this.canvas.width !== w) this.canvas.width = w;
      if (this.canvas.height !== h) this.canvas.height = h;
      this._width = w; this._height = h;
      this._floor = null;
    }

    _getFloor(seed, scale) {
      // Quantized backing resolution avoids rebuilding the cache after tiny layout changes.
      const density = clamp(Math.ceil(scale * this.quality * 2) / 2, 0.75, 2);
      const key = `${seed}|${density}`;
      if (this._floor && this._floorKey === key) return this._floor;
      const canvas = newCanvas(Math.ceil(940 * density), Math.ceil(940 * density));
      const g = canvas.getContext('2d'); g.scale(density, density); g.translate(20, 20);

      // Cast shadow and the thick, bevelled containment tray.
      g.shadowColor = '#000000'; g.shadowBlur = 20; g.shadowOffsetX = 8; g.shadowOffsetY = 14;
      round(g, 0, 0, WORLD, WORLD, 24); g.fillStyle = '#080c11'; g.fill(); g.shadowBlur = 0; g.shadowOffsetX = g.shadowOffsetY = 0;
      round(g, 0, 0, WORLD, WORLD, 24);
      g.fillStyle = linear(g, 0, 0, WORLD * 0.8, WORLD, [[0, '#58616a'], [0.045, '#313b44'], [0.4, '#1d252d'], [0.94, '#151d24'], [1, '#3b444b']]); g.fill();
      round(g, 2, 2, 896, 896, 22); g.strokeStyle = '#788087'; g.lineWidth = 1.2; g.stroke();
      round(g, 7, 7, 886, 886, 19); g.strokeStyle = '#0b1117'; g.lineWidth = 5; g.stroke();
      round(g, 14, 14, 872, 872, 13); g.strokeStyle = '#454d54'; g.lineWidth = 1; g.stroke();
      round(g, 25, 25, 850, 850, 8); g.fillStyle = '#070c10'; g.fill();
      round(g, 28, 28, 844, 844, 5); g.fillStyle = '#1e252c'; g.fill();

      // Concrete panels: quiet, warm-lit upper left and cooler lower right.
      g.save(); round(g, 28, 28, 844, 844, 5); g.clip();
      for (let y = 29, row = 0; y < 872; y += 92, row++) {
        for (let x = 29, col = 0; x < 872; x += 92, col++) {
          const k = row * 20 + col, v = Math.round(31 + noise(seed, k) * 7);
          const warm = (1 - (x + y) / 1800) * 3;
          g.fillStyle = linear(g, x, y, x + 92, y + 92, [[0, `rgb(${v + 2 + warm},${v + 7 + warm},${v + 11})`], [1, `rgb(${v - 2},${v + 3},${v + 7})`]]);
          g.fillRect(x + 1, y + 1, 90, 90);
          line(g, x, y, x + 91, y, 'rgba(128,144,151,.075)');
          line(g, x, y, x, y + 91, 'rgba(128,144,151,.05)');
          line(g, x + 91, y, x + 91, y + 92, 'rgba(0,0,0,.35)');
          line(g, x, y + 91, x + 91, y + 91, 'rgba(0,0,0,.36)');
          if (noise(seed + 8, k) > 0.53) {
            g.fillStyle = 'rgba(5,10,12,.14)';
            g.beginPath(); g.ellipse(x + 18 + noise(seed, k + 100) * 50, y + 34, 9 + noise(seed, k + 200) * 23, 2.5, noise(seed, k + 300) * Math.PI, 0, TAU); g.fill();
          }
        }
      }
      // Grain and marks are deterministic and drawn only once.
      for (let i = 0; i < 1900; i++) {
        const x = 31 + noise(seed + 30, i * 2) * 838, y = 31 + noise(seed + 30, i * 2 + 1) * 838;
        g.fillStyle = i % 3 ? 'rgba(158,168,164,.035)' : 'rgba(0,0,0,.10)';
        g.fillRect(x, y, 0.8 + noise(seed + 1, i) * 1.4, 0.6);
      }
      for (let i = 0; i < 94; i++) {
        const x = 60 + noise(seed + 7, i * 2) * 780, y = 60 + noise(seed + 7, i * 2 + 1) * 780;
        const a = noise(seed + 17, i) * TAU, len = 3 + noise(seed + 11, i) * 26;
        line(g, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, 'rgba(135,146,143,.055)', 0.8);
      }
      for (let i = 0; i < 9; i++) {
        const x = 95 + noise(seed + 19, i * 2) * 700, y = 95 + noise(seed + 19, i * 2 + 1) * 700;
        g.save(); g.translate(x, y); g.rotate(noise(seed, i + 30) * TAU); g.scale(1.8, 0.6);
        discGlow(g, 0, 0, 23 + noise(seed + 25, i) * 22, '#060c10', 0.25); g.restore();
      }
      // Faded service lane paint and centre-circle inlay.
      g.setLineDash([18, 13]); g.lineWidth = 1.5; g.strokeStyle = 'rgba(165,151,116,.12)';
      round(g, 79, 79, 742, 742, 38); g.stroke(); g.setLineDash([]);
      circle(g, 450, 450, 114); g.strokeStyle = 'rgba(121,140,145,.065)'; g.lineWidth = 1.5; g.stroke();
      circle(g, 450, 450, 120); g.strokeStyle = 'rgba(5,10,15,.18)'; g.lineWidth = 3; g.stroke();
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        line(g, 450 + Math.cos(a) * 108, 450 + Math.sin(a) * 108, 450 + Math.cos(a) * 126, 450 + Math.sin(a) * 126, 'rgba(160,153,132,.12)', 2);
      }
      label(g, 'S C R A P   W O R K S', 450, 438, 15, 'rgba(150,161,163,.11)', 'center', 800);
      label(g, 'AUTONOMOUS TEST CHAMBER  /  04', 450, 460, 7, 'rgba(150,161,163,.12)', 'center', 600);
      // Recessed drainage strips along the two sides.
      for (const x of [42, 847]) {
        round(g, x, 294, 11, 312, 3); g.fillStyle = '#10181f'; g.fill();
        for (let y = 299; y < 600; y += 9) line(g, x + 2, y, x + 9, y, '#364149', 1.6);
      }
      const ambient = g.createLinearGradient(28, 28, 872, 872);
      ambient.addColorStop(0, 'rgba(215,177,117,.065)'); ambient.addColorStop(0.6, 'rgba(80,120,148,0)'); ambient.addColorStop(1, 'rgba(5,12,20,.23)');
      g.fillStyle = ambient; g.fillRect(28, 28, 844, 844);
      g.restore();

      // Inner-wall shadows and hard lip catches.
      line(g, 29, 30, 870, 30, '#050a10', 5);
      line(g, 30, 30, 30, 870, '#0a1016', 4);
      line(g, 33, 871, 866, 871, '#64605a', 1.7);
      line(g, 871, 33, 871, 866, '#3c4b55', 1.2);
      // Corner reinforcement and tiny industrial fasteners.
      for (const [x, y, a] of [[0, 0, 0], [900, 0, Math.PI / 2], [900, 900, Math.PI], [0, 900, -Math.PI / 2]]) {
        g.save(); g.translate(x, y); g.rotate(a);
        polygon(g, [[6, 42], [6, 19], [19, 6], [69, 6], [69, 19], [22, 19], [19, 42]]);
        g.fillStyle = '#4b555e'; g.fill(); g.strokeStyle = '#717970'; g.lineWidth = 0.8; g.stroke();
        bolt(g, 15, 30, 3); bolt(g, 47, 12, 3); g.restore();
      }
      for (let p = 116; p < 830; p += 111) { bolt(g, p, 13, 2.7); bolt(g, p, 887, 2.7); bolt(g, 13, p, 2.7); bolt(g, 887, p, 2.7); }
      caution(g, 106, 7, 94, 10, 0.48); caution(g, 700, 883, 94, 10, 0.38);
      // Short warm practical lights, with a very subtle reflection on the floor.
      for (const x of [244, 628]) {
        round(g, x, 11, 28, 6, 2); g.fillStyle = '#090c0d'; g.fill();
        round(g, x + 2, 12, 24, 3, 1); g.fillStyle = '#d9b675'; g.fill();
        discGlow(g, x + 14, 29, 36, '#e8bc77', 0.10);
      }
      label(g, 'S-04', 64, 885, 8, '#778086', 'center');
      label(g, 'CAUTION  ·  ACTIVE MACHINERY', 450, 887, 6.5, '#7d817e', 'center');
      this._floor = canvas; this._floorKey = key; return canvas;
    }

    _blockTexture(block) {
      const w = Math.max(8, finite(block.w, 70)), h = Math.max(8, finite(block.h, 70));
      const health = clamp(finite(block.hp, 1) / Math.max(1, finite(block.maxHp, 1)), 0, 1);
      const stage = Math.min(4, Math.floor((1 - health) * 5));
      const variant = hash(block.id, 2) % 5;
      const key = `${w}|${h}|${stage}|${variant}`;
      if (this._blocks.has(key)) return this._blocks.get(key);
      const density = 2, pad = 20, canvas = newCanvas(Math.ceil((w + pad * 2) * density), Math.ceil((h + pad * 2) * density));
      const g = canvas.getContext('2d'); g.scale(density, density); g.translate(pad, pad);
      g.shadowColor = 'rgba(0,0,0,.62)'; g.shadowBlur = 9; g.shadowOffsetX = 6; g.shadowOffsetY = 10;
      round(g, 0, 2, w, h, 5); g.fillStyle = '#0c1115'; g.fill(); g.shadowBlur = 0; g.shadowOffsetX = g.shadowOffsetY = 0;
      // Concrete block thickness is visible below the upper surface.
      polygon(g, [[0, h - 7], [w, h - 7], [w - 1, h + 6], [4, h + 6]]);
      g.fillStyle = linear(g, 0, h - 8, 0, h + 6, [[0, '#3e484c'], [0.22, '#323b40'], [1, '#1b252b']]); g.fill();
      polygon(g, [[w - 7, 1], [w + 5, 7], [w + 5, h + 2], [w - 7, h - 7]]);
      g.fillStyle = '#202d35'; g.fill();
      round(g, 0, -4, w, h - 1, 5);
      g.fillStyle = linear(g, 0, -6, w * 0.8, h, [[0, '#627075'], [0.13, '#535f64'], [0.7, '#444f54'], [1, '#36434a']]); g.fill();
      g.save(); round(g, 1, -3, w - 2, h - 3, 4); g.clip();
      for (let i = 0; i < Math.min(160, w * h / 45); i++) {
        const x = noise(variant + 18, i * 2) * w, y = noise(variant + 18, i * 2 + 1) * h - 4;
        g.fillStyle = i % 2 ? 'rgba(190,200,191,.075)' : 'rgba(12,22,26,.19)';
        g.fillRect(x, y, 0.8 + noise(variant, i) * 2.2, 0.9 + noise(variant + 19, i));
      }
      // A single worn identification stripe and embedded metal cross-straps.
      g.fillStyle = 'rgba(182,151,87,.19)'; g.fillRect(5, h * 0.55 - 4, w - 10, 8);
      for (const x of [7, w - 15]) {
        g.fillStyle = linear(g, x, 0, x + 8, 0, [[0, '#66737b'], [0.24, '#394850'], [0.8, '#2c3b44'], [1, '#718087']]);
        g.fillRect(x, -4, 8, h - 1);
      }
      // Seeded fracture network: same cracks deepen as this block takes damage.
      for (let c = 0; c < stage + (stage > 1 ? 1 : 0); c++) {
        let x = 15 + noise(variant + 14, c * 2) * Math.max(1, w - 30), y = 8 + noise(variant + 14, c * 2 + 1) * Math.max(1, h - 22);
        g.beginPath(); g.moveTo(x, y);
        for (let j = 0; j < 5; j++) { x += (noise(variant + c * 31, j) - 0.4) * 17; y += (noise(variant + c * 11, j + 20) - 0.48) * 19; g.lineTo(x, y); }
        g.strokeStyle = 'rgba(12,20,25,.85)'; g.lineWidth = 1.15 + stage * 0.22; g.stroke();
        g.strokeStyle = 'rgba(151,157,143,.22)'; g.lineWidth = 0.5; g.translate(-0.8, -0.8); g.stroke(); g.translate(0.8, 0.8);
      }
      if (stage >= 3) {
        const x = w * 0.45, y = h * 0.52;
        g.fillStyle = radial(g, x, y, Math.min(w, h) * 0.4, [[0, 'rgba(10,17,22,.5)'], [1, 'rgba(10,17,22,0)']]);
        g.fillRect(0, -4, w, h);
      }
      g.restore();
      round(g, 0.8, -3.2, w - 1.6, h - 2.6, 4); g.strokeStyle = '#7d898a'; g.lineWidth = 1; g.stroke();
      line(g, 5, -3, w - 6, -3, 'rgba(217,211,183,.42)', 1);
      line(g, 1, 2, 1, h - 9, 'rgba(205,202,180,.22)', 1);
      for (const [x, y] of [[10.8, 7], [w - 10.8, 7], [10.8, h - 16], [w - 10.8, h - 16]]) bolt(g, x, y, 2.4);
      if (w > 54 && h > 40) label(g, `C-${String(variant + 12).padStart(2, '0')}`, w / 2, h * 0.55, 5.5, 'rgba(222,217,191,.44)', 'center', 700);
      const result = { canvas, pad, width: w + pad * 2, height: h + pad * 2 };
      // Bounded across restarts with other arena geometry.
      if (this._blocks.size >= 120) this._blocks.clear();
      this._blocks.set(key, result); return result;
    }

    _rubble(g, block) {
      const w = finite(block.w, 70), h = finite(block.h, 70), seed = hash(block.id, 87);
      const x = block.x + w / 2, y = block.y + h / 2;
      g.save(); g.translate(x, y);
      g.fillStyle = radial(g, 0, 0, Math.max(w, h) * 0.8, [[0, 'rgba(5,10,14,.50)'], [0.65, 'rgba(5,10,14,.22)'], [1, 'rgba(5,10,14,0)']]);
      g.fillRect(-w, -h, w * 2, h * 2);
      round(g, -w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 3); g.strokeStyle = 'rgba(113,119,112,.12)'; g.lineWidth = 2; g.stroke();
      for (let i = 0; i < 12; i++) {
        const xx = (noise(seed, i * 3) - 0.5) * (w + 30), yy = (noise(seed, i * 3 + 1) - 0.5) * (h + 23), size = 2 + noise(seed, i * 3 + 2) * 6;
        g.save(); g.translate(xx, yy); g.rotate(noise(seed + 6, i) * TAU);
        polygon(g, [[-size, -size * 0.4], [-size * 0.1, -size], [size, -size * 0.3], [size * 0.7, size * 0.6], [-size * 0.5, size * 0.8]]);
        g.fillStyle = i % 3 ? '#303a3f' : '#465157'; g.fill(); g.strokeStyle = 'rgba(142,151,145,.18)'; g.lineWidth = 0.8; g.stroke();
        g.restore();
      }
      g.restore();
    }

    _bodyTexture(color, dead = false) {
      const key = `${color}|${dead}`;
      if (this._bodies.has(key)) return this._bodies.get(key);
      const canvas = newCanvas(208, 208), g = canvas.getContext('2d'); g.scale(2, 2); g.translate(52, 52);
      const accent = dead ? '#596165' : color;
      // Independent paired tracks, tread bevels and rear drive housings.
      for (const y of [-27, 15]) {
        round(g, -25, y, 44, 13, 4); g.fillStyle = '#070d12'; g.fill();
        round(g, -23, y + 1, 40, 10, 3); g.fillStyle = linear(g, 0, y, 0, y + 13, [[0, '#44505a'], [0.24, '#202b33'], [0.8, '#131d24'], [1, '#54606a']]); g.fill();
        for (let x = -20; x < 17; x += 6) {
          line(g, x, y + 1.7, x, y + 10.5, '#080e14', 1.5);
          line(g, x + 1, y + 2, x + 1, y + 8, '#4b5860', 0.7);
        }
        circle(g, -18, y + 6, 4); g.fillStyle = '#141c24'; g.fill(); bolt(g, -18, y + 6, 2.2);
      }
      // Rear power pack; hints of copper pipe under the shell.
      round(g, -29, -13, 15, 26, 5); g.fillStyle = '#18232c'; g.fill();
      for (const y of [-8, 8]) {
        line(g, -25, y, -12, y, '#70583a', 3.3); line(g, -25, y - 1, -12, y - 1, '#bf9b62', 0.8);
      }
      // Lower chassis, bevel, upper faceted armour.
      polygon(g, [[-23, -17], [-15, -23], [12, -21], [23, -12], [23, 12], [12, 21], [-15, 23], [-23, 17]]);
      g.fillStyle = '#0b131b'; g.fill(); g.strokeStyle = '#121d25'; g.lineWidth = 3; g.stroke();
      polygon(g, [[-23, -19], [-13, -25], [13, -22], [24, -11], [22, 11], [11, 19], [-13, 21], [-23, 14]]);
      g.fillStyle = linear(g, -26, -29, 26, 24, [[0, '#b1b8b9'], [0.16, '#63717b'], [0.45, '#4b5a65'], [0.7, '#33424e'], [1, '#172631']]); g.fill();
      g.strokeStyle = '#15212b'; g.lineWidth = 1.1; g.stroke();
      line(g, -21, -18, -13, -23, '#e0ddd0', 0.8); line(g, -13, -23, 10, -20, '#bfc8c8', 0.8);
      // Painted inset panels with a coloured edge, kept distinct from weapon colour.
      for (const s of [-1, 1]) {
        polygon(g, [[-14, s * 14], [-9, s * 19], [12, s * 17], [17, s * 11], [11, s * 11]]);
        g.fillStyle = linear(g, -10, -20, 10, 20, [[0, tint(accent, 0.25)], [1, tint(accent, -0.5)]]); g.fill();
        line(g, -10, s * 18, 10, s * 16, rgba(accent, dead ? 0.2 : 0.95), 1.3);
      }
      round(g, -20, -13, 29, 26, 7); g.fillStyle = linear(g, -12, -14, 6, 15, [[0, '#263541'], [1, '#0d1a23']]); g.fill();
      g.strokeStyle = '#80929c'; g.lineWidth = 0.6; g.stroke();
      // Three exhaust grooves and small split plates.
      for (let y = -7; y <= 7; y += 7) {
        round(g, -25, y - 1.5, 8, 3, 1); g.fillStyle = '#080f16'; g.fill();
        line(g, -24, y - 1.5, -19, y - 1.5, '#6d7d87', 0.6);
      }
      line(g, 10, -10, 18, -6, '#101c25', 1.2); line(g, 10, 10, 18, 6, '#101c25', 1.2);
      // Glass energy cell: inset black bezel, illuminated core, fixed glints.
      circle(g, -5, 0, 12); g.fillStyle = '#0a151e'; g.fill(); g.strokeStyle = '#8b9ca5'; g.lineWidth = 1.3; g.stroke();
      circle(g, -5, 0, 8.7); g.fillStyle = radial(g, -7.2, -3.2, 12, [[0, dead ? '#6a6258' : tint(accent, 0.7)], [0.3, dead ? '#3c342e' : accent], [0.78, tint(accent, -0.65)], [1, '#08131d']]); g.fill();
      g.save(); circle(g, -5, 0, 8.7); g.clip();
      line(g, -15, -6, 4, 6, 'rgba(240,251,255,.13)', 3.3); line(g, -11, -7, -3, -7, 'rgba(255,255,255,.68)', 1); g.restore();
      for (const a of [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5]) {
        const x = -5 + Math.cos(a) * 11.5, y = Math.sin(a) * 11.5;
        circle(g, x, y, 1.25); g.fillStyle = dead ? '#414749' : tint(accent, 0.45); g.fill();
      }
      // Front bumper and sensor.
      round(g, 18, -11, 9, 22, 3); g.fillStyle = linear(g, 18, 0, 27, 0, [[0, '#1b2b37'], [0.5, '#6c7c88'], [1, '#283b48']]); g.fill();
      round(g, 24, -5, 3, 10, 1); g.fillStyle = dead ? '#4b514f' : '#d9f2f1'; g.fill();
      for (const [x, y] of [[-16, -17], [-16, 17], [12, -14], [12, 14]]) bolt(g, x, y, 1.7);
      if (dead) {
        line(g, -17, -13, 12, 11, '#070d12', 2); line(g, -3, -3, 6, -12, '#070d12', 1.5);
        g.globalAlpha = 0.4; circle(g, -6, 0, 15); g.fillStyle = '#15130f'; g.fill(); g.globalAlpha = 1;
      }
      this._bodies.set(key, canvas); return canvas;
    }

    _weapon(g, kind, loaded, color = '#84c9df', miniature = false) {
      // Draw along +X; the broad launcher is visibly different from the vented blaster.
      g.save();
      if (miniature) g.scale(0.65, 0.65);
      if (kind === 'rocket') {
        round(g, 8, -6, 14, 12, 3); g.fillStyle = '#17212a'; g.fill();
        // Breach, two retaining bands, wide tube and dark hexagonal muzzle.
        round(g, 14, -12, 31, 24, 4); g.fillStyle = linear(g, 0, -12, 0, 12, [[0, '#a6aca6'], [0.18, '#d2d0ba'], [0.4, '#777f7b'], [0.68, '#4d5b5b'], [1, '#26383e']]); g.fill();
        g.strokeStyle = '#0d1b23'; g.lineWidth = 1.2; g.stroke();
        for (const x of [17, 33]) {
          round(g, x, -13, 4, 26, 1.5); g.fillStyle = linear(g, 0, -13, 0, 13, [[0, '#d7d1b9'], [0.4, '#8e9b9a'], [1, '#3e535b']]); g.fill();
          line(g, x + 1, -12, x + 1, 10, 'rgba(250,245,218,.3)', 0.7);
        }
        polygon(g, [[42, -12], [49, -8], [49, 8], [42, 12], [38, 7], [38, -7]]); g.fillStyle = '#172730'; g.fill(); g.strokeStyle = '#859795'; g.lineWidth = 1; g.stroke();
        polygon(g, [[43, -7], [47, -5], [47, 5], [43, 7], [41, 3], [41, -3]]); g.fillStyle = loaded ? '#dd9662' : '#050e14'; g.fill();
        if (loaded) line(g, 45, -4, 45, 4, '#ffe5ae', 1);
        round(g, 22, -7, 8, 14, 1.5); g.fillStyle = '#ad783a'; g.fill();
        line(g, 24, -5, 27, 5, '#d5b277', 2);
        line(g, 15, -8, 33, -8, 'rgba(255,251,224,.4)', 0.8);
        // A small rectangular aiming sight.
        round(g, 29, -16, 10, 4, 1); g.fillStyle = '#202c34'; g.fill(); line(g, 31, -16, 36, -16, '#c6c5ad', 0.7);
      } else {
        round(g, 8, -8, 20, 16, 4); g.fillStyle = linear(g, 8, -8, 22, 8, [[0, '#9fadb5'], [0.33, '#566a78'], [1, '#253947']]); g.fill();
        g.strokeStyle = '#0c1a25'; g.lineWidth = 1; g.stroke();
        for (const y of [-5, 0, 5]) {
          round(g, 24, y - 1.8, 22, 3.6, 1.3); g.fillStyle = linear(g, 0, y - 2, 0, y + 2, [[0, '#b1c5cc'], [0.45, '#536d7d'], [1, '#162c3c']]); g.fill();
          circle(g, 45, y, 1.8); g.fillStyle = loaded ? '#80d9ea' : '#111f2c'; g.fill();
        }
        round(g, 31, -8, 5, 16, 1.5); g.fillStyle = '#3e5461'; g.fill(); line(g, 32, -7, 32, 7, '#93abb5', 0.7);
        for (let x = 12; x <= 22; x += 4) line(g, x, -5, x + 1, 5, '#152d3d', 1.4);
        round(g, 12, -10, 13, 3, 1); g.fillStyle = loaded ? tint(color, 0.3) : '#435360'; g.fill();
        round(g, 12, 7, 9, 5, 2); g.fillStyle = '#2b3b49'; g.fill();
      }
      g.restore();
    }

    _pad(g, pad, t, index) {
      const x = finite(pad.x), y = finite(pad.y), ready = Math.max(0, finite(pad.readyIn));
      const color = pad.kind === 'rocket' ? '#dca367' : '#68bacf';
      const fraction = 1 - clamp(ready / Math.max(1, finite(pad.period, 12)), 0, 1);
      g.save(); g.translate(x, y);
      g.shadowColor = 'rgba(0,0,0,.48)'; g.shadowBlur = 7; g.shadowOffsetY = 5;
      round(g, -42, -38, 84, 76, 10); g.fillStyle = '#101a23'; g.fill(); g.shadowBlur = 0; g.shadowOffsetY = 0;
      round(g, -41, -39, 82, 73, 9); g.fillStyle = linear(g, -35, -39, 35, 35, [[0, '#4b5a64'], [0.24, '#263640'], [1, '#162530']]); g.fill();
      g.strokeStyle = '#66747b'; g.lineWidth = 1; g.stroke();
      round(g, -33, -31, 66, 59, 6); g.fillStyle = '#101e28'; g.fill(); g.strokeStyle = '#354c59'; g.stroke();
      circle(g, 0, -2, 26); g.fillStyle = '#152630'; g.fill();
      circle(g, 0, -2, 28); g.strokeStyle = '#050f17'; g.lineWidth = 4; g.stroke();
      g.beginPath(); g.arc(0, -2, 28, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0.005, fraction));
      g.strokeStyle = rgba(color, ready ? 0.55 : 0.9); g.lineWidth = 2.3; g.stroke();
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2; line(g, Math.cos(a) * 18, -2 + Math.sin(a) * 18, Math.cos(a) * 23, -2 + Math.sin(a) * 23, '#5a737d', 1);
      }
      discGlow(g, 0, -2, 40, color, ready ? 0.045 : 0.13 + Math.sin(t * 2.2) * 0.025);
      if (ready > 0) {
        label(g, String(Math.ceil(ready)).padStart(2, '0'), 0, -3, 15, tint(color, 0.25), 'center', 700);
        label(g, 'RECHARGE', 0, 13, 5.3, '#6d8c98', 'center', 600);
      } else {
        label(g, 'READY', 0, 0, 7.5, tint(color, 0.5), 'center', 700);
      }
      caution(g, -30, -38, 19, 4, 0.38); caution(g, 11, 30, 19, 4, 0.38);
      for (const xx of [-35, 35]) { bolt(g, xx, -31, 2); bolt(g, xx, 27, 2); }
      label(g, `${String(index + 1).padStart(2, '0')} / ${pad.kind === 'rocket' ? 'ROCKET' : 'BLASTER'}`, 0, 47, 6.5, '#78919b', 'center', 700);
      g.restore();
    }

    _pickup(g, p, t) {
      const empty = !!p.empty || finite(p.ammo, 1) <= 0;
      const color = p.kind === 'rocket' ? '#eeb779' : '#7cdbef';
      const a = (noise(p.id, 13) - 0.5) * 1.5;
      g.save(); g.translate(finite(p.x), finite(p.y));
      if (empty) g.globalAlpha = clamp(0.68 - finite(p.age) * 0.13, 0.15, 0.68);
      else {
        discGlow(g, 0, 0, 34, color, 0.16 + Math.sin(t * 3 + finite(p.id)) * 0.025);
        circle(g, 0, 0, 25); g.strokeStyle = rgba(color, 0.23); g.lineWidth = 1; g.stroke();
        for (let i = 0; i < 3; i++) {
          const angle = -Math.PI / 2 + i * TAU / 3;
          g.beginPath(); g.arc(0, 0, 28, angle, angle + 0.38); g.strokeStyle = rgba(color, 0.55); g.lineWidth = 1.5; g.stroke();
        }
      }
      g.save(); g.rotate(a);
      g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.ellipse(4, 7, 22, 6, 0, 0, TAU); g.fill();
      g.translate(-14, -1); this._weapon(g, p.kind, !empty, color, true); g.restore();
      if (!empty) {
        round(g, -11, 19, 22, 10, 3); g.fillStyle = '#0b1721'; g.fill();
        label(g, `${Math.max(0, Math.ceil(finite(p.ammo)))}`, 0, 24, 7, tint(color, 0.35), 'center', 700);
      }
      g.restore();
    }

    _robot(g, r, t) {
      const color = r.color || COLORS[r.id % 4] || COLORS[0];
      const dead = r.alive === false || finite(r.hp, 1) <= 0;
      const x = finite(r.x), y = finite(r.y), speed = Math.hypot(finite(r.vx), finite(r.vy));
      const chassisAngle = speed > 8 ? Math.atan2(r.vy, r.vx) : finite(r.angle);
      const aim = finite(r.angle), radius = Math.max(12, finite(r.r, 24)), bodyScale = radius / 24;
      g.save(); g.translate(x, y);
      if (!dead) discGlow(g, 0, 5, 40 * bodyScale, color, 0.10);
      g.fillStyle = radial(g, 7, 10, 35 * bodyScale, [[0, 'rgba(0,0,0,.65)'], [0.65, 'rgba(0,0,0,.30)'], [1, 'rgba(0,0,0,0)']]);
      g.fillRect(-31 * bodyScale, -22 * bodyScale, 78 * bodyScale, 72 * bodyScale);
      g.save(); g.rotate(chassisAngle); g.scale(bodyScale, bodyScale);
      g.drawImage(this._bodyTexture(color, dead), -52, -52, 104, 104);
      // Tread travel glints; subtle enough to avoid the old recycling-pattern problem.
      if (!dead && speed > 8) {
        g.globalAlpha = 0.28;
        const travel = ((finite(r.x) + finite(r.y)) * 0.28) % 6;
        for (const yy of [-23, 20]) for (let xx = -20; xx < 15; xx += 6) line(g, xx + travel, yy, xx + travel, yy + 3, '#a8bcc4', 0.7);
        g.globalAlpha = 1;
      }
      g.restore();
      if (!dead && r.weapon) {
        g.save(); g.rotate(aim); g.scale(bodyScale, bodyScale);
        // Exposed rotating mount and recoil slider.
        circle(g, 7, 0, 10.5); g.fillStyle = linear(g, -4, -12, 16, 12, [[0, '#93a6af'], [0.32, '#536c7b'], [1, '#1a303f']]); g.fill();
        g.strokeStyle = '#122431'; g.lineWidth = 1.3; g.stroke();
        const recoil = clamp((finite(r.flashUntil) - t) * 32, 0, 4);
        g.translate(-recoil, 0);
        this._weapon(g, r.weapon.kind, r.weapon.ammo > 0, color);
        circle(g, 6, 0, 5.5); g.fillStyle = '#293f4c'; g.fill(); bolt(g, 6, 0, 2.1);
        if (r.flashUntil > t) {
          g.globalCompositeOperation = 'screen';
          const length = 9 + clamp((r.flashUntil - t) * 100, 0, 14);
          polygon(g, [[47, -3], [55, -6], [52 + length, 0], [55, 6], [47, 3]]);
          g.fillStyle = r.weapon.kind === 'rocket' ? '#ffd0a0' : '#d8f6ff'; g.fill();
          discGlow(g, 49, 0, 23, r.weapon.kind === 'rocket' ? '#ffb15c' : '#81d9ee', 0.34);
        }
        g.restore();
      } else if (!dead) {
        // Clearly exposed, empty mount rather than an invisible weapon swap.
        circle(g, 7, 0, 8); g.fillStyle = '#101d28'; g.fill(); g.strokeStyle = '#526c7b'; g.lineWidth = 1.4; g.stroke();
        line(g, 3, 0, 11, 0, '#a1b7c2', 1.5);
      }
      if (dead) {
        discGlow(g, -3, 0, 18, '#d38944', 0.08);
        g.restore(); return;
      }
      if (r.hurtUntil > t) {
        circle(g, 0, 0, radius + 7); g.strokeStyle = rgba('#ffe6cf', clamp((r.hurtUntil - t) * 5, 0, 0.8)); g.lineWidth = 2; g.stroke();
      }
      // Always-readable local telemetry. Robot colour encodes identity; magazine pips encode ammo.
      const hp = clamp(finite(r.hp) / Math.max(1, finite(r.maxHp, 100)), 0, 1);
      const barY = -radius - 17;
      round(g, -28, barY, 56, 7, 3.5); g.fillStyle = 'rgba(3,10,16,.90)'; g.fill();
      round(g, -26, barY + 2, 52 * hp, 3, 1.5); g.fillStyle = hp < 0.24 ? '#f48562' : color; g.fill();
      if (hp > 0.05) line(g, -25, barY + 2, -26 + 51 * hp, barY + 2, tint(color, 0.5), 0.7);
      const name = r.name || NAMES[r.id % 4] || `UNIT ${r.id}`;
      label(g, name, 0, barY - 7.5, 7.4, tint(color, 0.43), 'center', 800);
      const yAmmo = radius + 12;
      if (r.weapon) {
        const max = Math.max(1, finite(r.weapon.maxAmmo, r.weapon.kind === 'rocket' ? 2 : 12));
        const count = Math.min(12, max), n = clamp(finite(r.weapon.ammo) / max, 0, 1) * count;
        const gap = r.weapon.kind === 'rocket' ? 4 : 1.8;
        const wide = r.weapon.kind === 'rocket' ? 9 : 3;
        const total = count * wide + (count - 1) * gap;
        for (let i = 0; i < count; i++) {
          round(g, -total / 2 + i * (wide + gap), yAmmo, wide, 4, 1);
          g.fillStyle = i < n ? (r.weapon.kind === 'rocket' ? '#f1b773' : '#bbdee7') : '#273b47'; g.fill();
        }
      } else label(g, 'UNARMED', 0, yAmmo + 1, 5.8, '#c7a36e', 'center', 800);
      g.restore();
    }

    _projectile(g, p) {
      const x = finite(p.x), y = finite(p.y), vx = finite(p.vx, 1), vy = finite(p.vy), a = Math.atan2(vy, vx);
      const ux = Math.cos(a), uy = Math.sin(a);
      g.save();
      if (p.kind === 'rocket') {
        const seed = hash(p.id, 23);
        for (let k = 6; k > 0; k--) {
          const dist = 10 + k * 6;
          const xx = x - ux * dist + Math.sin(noise(seed, k) * TAU) * k * 0.9;
          const yy = y - uy * dist + Math.cos(noise(seed, k) * TAU) * k * 0.9;
          circle(g, xx, yy, 2 + k * 1.3); g.fillStyle = `rgba(144,144,130,${(7 - k) * 0.016})`; g.fill();
        }
        discGlow(g, x - ux * 9, y - uy * 9, 19, '#ffb25b', 0.29);
        g.translate(x, y); g.rotate(a);
        polygon(g, [[-11, -3], [-21, 0], [-11, 3], [-5, 0]]); g.fillStyle = '#ffbb62'; g.fill();
        polygon(g, [[-10, -1.5], [-16, 0], [-10, 1.5], [-6, 0]]); g.fillStyle = '#fff1c3'; g.fill();
        polygon(g, [[-7, -3], [-10, -6], [-3, -4], [7, -3], [11, 0], [7, 3], [-3, 4], [-10, 6], [-7, 3]]);
        g.fillStyle = linear(g, 0, -5, 0, 5, [[0, '#d1d1b9'], [0.5, '#8e9e9c'], [1, '#465e69']]); g.fill();
        polygon(g, [[6, -3], [11, 0], [6, 3]]); g.fillStyle = '#d88459'; g.fill(); line(g, -4, -2, 5, -2, '#eff3da', 0.8);
      } else {
        const len = clamp(Math.hypot(x - finite(p.px, x - ux * 13), y - finite(p.py, y - uy * 13)) + 8, 12, 30);
        g.globalCompositeOperation = 'screen';
        g.strokeStyle = linear(g, x - ux * len, y - uy * len, x, y, [[0, 'rgba(87,193,225,0)'], [0.7, 'rgba(137,222,244,.65)'], [1, '#f0fcff']]);
        g.lineCap = 'round'; g.lineWidth = 2.3; g.beginPath(); g.moveTo(x - ux * len, y - uy * len); g.lineTo(x, y); g.stroke();
        discGlow(g, x, y, 9, '#80d7ef', 0.3);
        circle(g, x, y, 1.8); g.fillStyle = '#e7fbff'; g.fill();
      }
      g.restore();
    }

    _effect(g, e, under = false) {
      const age = Math.max(0, finite(e.age)), ttl = Math.max(0.04, finite(e.ttl, 0.45)), u = clamp(age / ttl, 0, 1);
      if (u >= 1) return;
      const seed = finite(e.seed, hash(e.x, Math.round(e.y))), color = e.color || '#f4be78';
      const x = finite(e.x), y = finite(e.y), type = e.type;
      const size = clamp(finite(e.size, type === 'blast' || type === 'ko' ? 60 : 18), 4, 150);
      if (under) {
        if (type === 'blast' || type === 'ko' || type === 'break') {
          const r = size * (0.5 + u * 0.7);
          g.save(); g.globalAlpha = (1 - u) * 0.35;
          discGlow(g, x, y, r, '#10100d', 0.9);
          g.restore();
        }
        return;
      }
      g.save(); g.translate(x, y);
      if (type === 'blast' || type === 'ko') {
        const grow = 1 - Math.pow(1 - u, 3), radius = size * (0.18 + grow * 0.8);
        // Slow smoke behind a brief, bright core; the field stays readable.
        for (let i = 0; i < 5; i++) {
          const a = noise(seed, i) * TAU, d = radius * (0.25 + noise(seed + 20, i) * 0.4);
          const xx = Math.cos(a) * d, yy = Math.sin(a) * d - u * 10;
          discGlow(g, xx, yy, radius * (0.35 + noise(seed + 4, i) * 0.2), '#353632', (1 - u) * 0.34);
        }
        g.globalCompositeOperation = 'screen';
        const flare = Math.max(0, 1 - u * 3);
        discGlow(g, 0, 0, radius * 1.2, '#ff9744', flare * 0.5);
        discGlow(g, 0, 0, radius * 0.65, '#ffdc93', flare * 0.8);
        g.beginPath(); g.arc(0, 0, radius, 0, TAU); g.strokeStyle = rgba('#f3c48b', (1 - u) * 0.38); g.lineWidth = 1 + (1 - u) * 2.5; g.stroke();
        for (let i = 0; i < 11; i++) {
          const a = noise(seed + 3, i) * TAU, d = radius * (0.7 + noise(seed + 7, i) * 0.6);
          const len = (1 - u) * (3 + noise(seed + 9, i) * 10);
          line(g, Math.cos(a) * d, Math.sin(a) * d, Math.cos(a) * (d + len), Math.sin(a) * (d + len), rgba('#ffe2a5', (1 - u) * 0.8), 1.2);
        }
      } else if (type === 'hit' || type === 'shot') {
        g.globalCompositeOperation = 'screen';
        const radius = size * (0.15 + u * 0.7), fade = (1 - u) * (1 - u);
        discGlow(g, 0, 0, radius + 8, color, fade * 0.33);
        for (let i = 0; i < (type === 'shot' ? 4 : 7); i++) {
          const a = type === 'shot' ? finite(e.angle) + (noise(seed, i) - 0.5) * 1.7 : noise(seed, i) * TAU;
          const d = radius * (0.3 + noise(seed + 2, i)), len = (1 - u) * 7;
          line(g, Math.cos(a) * d, Math.sin(a) * d, Math.cos(a) * (d + len), Math.sin(a) * (d + len), rgba('#ffdfa3', fade), 1.25);
        }
      } else if (type === 'break') {
        for (let i = 0; i < 10; i++) {
          const a = noise(seed, i) * TAU, d = size * (0.15 + noise(seed + 1, i)) * (1 - Math.pow(1 - u, 2));
          const z = Math.sin(u * Math.PI) * (8 + noise(seed + 2, i) * 13), s = 1.5 + noise(seed + 3, i) * 4;
          g.globalAlpha = 1 - u;
          g.save(); g.translate(Math.cos(a) * d, Math.sin(a) * d - z); g.rotate(a + u * 3);
          polygon(g, [[-s, -s / 2], [s * 0.3, -s], [s, s * 0.5], [-s * 0.6, s]]);
          g.fillStyle = i % 3 ? '#6e7978' : '#a59b7d'; g.fill(); line(g, -s, -s / 2, s * 0.3, -s, '#bbc0ad', 0.7); g.restore();
        }
      } else if (type === 'pickup') {
        g.globalCompositeOperation = 'screen';
        g.beginPath(); g.arc(0, 0, 12 + u * 27, 0, TAU); g.strokeStyle = rgba(color, (1 - u) * 0.75); g.lineWidth = 2 * (1 - u) + 0.4; g.stroke();
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI / 2; const d = 16 + u * 15;
          line(g, Math.cos(a) * d, Math.sin(a) * d, Math.cos(a) * (d + 5), Math.sin(a) * (d + 5), rgba('#e4f4e2', 1 - u), 1.5);
        }
      } else if (type === 'drop') {
        g.beginPath(); g.ellipse(0, 0, 7 + u * 14, 4 + u * 8, 0, 0, TAU); g.strokeStyle = `rgba(161,171,164,${(1 - u) * 0.25})`; g.lineWidth = 1; g.stroke();
      }
      g.restore();
    }

    _hud(g, sim) {
      const robots = sim.robots || [], t = finite(sim.t), duration = finite(sim.duration, 90);
      const left = Math.max(0, duration - t), mm = Math.floor(left / 60), ss = Math.floor(left % 60);
      // A compact, translucent instrument strip at the upper edge of the arena.
      g.save(); round(g, 224, 39, 452, 39, 7); g.fillStyle = 'rgba(8,17,25,.88)'; g.fill(); g.strokeStyle = '#425562'; g.lineWidth = 0.8; g.stroke();
      for (let i = 0; i < 4; i++) {
        const r = robots.find((unit) => unit.id === i) || robots[i]; if (!r) continue;
        const x = 240 + (i < 2 ? i * 87 : 254 + (i - 2) * 87), color = r.color || COLORS[i];
        circle(g, x, 52, 2.2); g.fillStyle = r.alive === false ? '#50606a' : color; g.fill();
        label(g, r.name || NAMES[i], x + 7, 52, 6.5, r.alive === false ? '#687980' : tint(color, 0.25), 'left', 800);
        label(g, r.alive === false ? 'OUT' : `${Math.max(0, Math.ceil(r.hp))} HP`, x + 7, 65, 6.8, '#b6c6cd', 'left', 600);
      }
      label(g, `${mm}:${String(ss).padStart(2, '0')}`, 450, 55, 17, '#e3e9e8', 'center', 700);
      label(g, 'REMAINING', 450, 70, 4.8, '#7b929f', 'center', 700);
      g.restore();
    }

    _result(g, sim) {
      if (sim.phase !== 'ended') return;
      const winner = typeof sim.winner === 'object' && sim.winner !== null ? sim.winner : (sim.robots || []).find((r) => r.id === sim.winner);
      const color = winner ? winner.color || COLORS[winner.id % 4] : '#c5b18e';
      g.save();
      round(g, 285, 91, 330, 43, 8); g.fillStyle = 'rgba(9,18,25,.96)'; g.fill(); g.strokeStyle = rgba(color, 0.65); g.lineWidth = 1; g.stroke();
      line(g, 302, 102, 302, 123, color, 2.5);
      label(g, 'ROUND COMPLETE', 450, 103, 6, '#8ba0a9', 'center', 700);
      label(g, winner ? `${winner.name || NAMES[winner.id % 4]} WINS` : 'DRAW', 450, 119, 13, tint(color, 0.3), 'center', 800);
      g.restore();
    }

    draw(sim, { hud = false, cinematic = false } = {}) {
      if (this._destroyed || !sim) return;
      const g = this.ctx, width = this.canvas.width, height = this.canvas.height;
      if (!width || !height) return;
      const scale = Math.min(width, height) / (WORLD + MARGIN * 2);
      const ox = (width - WORLD * scale) / 2, oy = (height - WORLD * scale) / 2;
      const t = finite(sim.t), effects = (sim.effects || []).slice(-100);
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#0b1118'; g.fillRect(0, 0, width, height);
      // Full-canvas ambient backdrop also gives portrait/landscape exports intentional letterboxing.
      const backdrop = g.createRadialGradient(width * 0.43, height * 0.38, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
      backdrop.addColorStop(0, '#1d2932'); backdrop.addColorStop(0.65, '#101923'); backdrop.addColorStop(1, '#080e15');
      g.fillStyle = backdrop; g.fillRect(0, 0, width, height);
      let shakeX = 0, shakeY = 0;
      if (cinematic) {
        // Optional restrained camera response; deterministic and never used by default.
        for (const e of effects) if ((e.type === 'blast' || e.type === 'ko') && e.age < 0.22) {
          const amplitude = (1 - e.age / 0.22) * 1.8;
          shakeX += Math.sin(t * 103 + finite(e.seed)) * amplitude;
          shakeY += Math.cos(t * 127 + finite(e.seed)) * amplitude;
        }
        shakeX = clamp(shakeX, -3, 3); shakeY = clamp(shakeY, -3, 3);
      }
      g.translate(ox + shakeX * scale, oy + shakeY * scale); g.scale(scale, scale);
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(this._getFloor(sim.seed, scale), -20, -20, 940, 940);
      for (const b of sim.blocks || []) if (b.alive === false || b.hp <= 0) this._rubble(g, b);
      for (let i = 0; i < (sim.pads || []).length; i++) this._pad(g, sim.pads[i], t, i);
      for (const e of effects) this._effect(g, e, true);
      for (const p of sim.pickups || []) this._pickup(g, p, t);
      for (const b of sim.blocks || []) if (b.alive !== false && b.hp > 0) {
        const texture = this._blockTexture(b); g.drawImage(texture.canvas, b.x - texture.pad, b.y - texture.pad, texture.width, texture.height);
      }
      // Fallen machines remain as readable wrecks, below active competitors.
      for (const r of sim.robots || []) if (r.alive === false || r.hp <= 0) this._robot(g, r, t);
      for (const r of sim.robots || []) if (r.alive !== false && r.hp > 0) this._robot(g, r, t);
      for (const p of (sim.projectiles || []).slice(-180)) this._projectile(g, p);
      for (const e of effects) this._effect(g, e);
      if (hud) this._hud(g, sim);
      this._result(g, sim);
      g.restore();
    }

    destroy() {
      this._floor = null; this._bodies.clear(); this._blocks.clear(); this._destroyed = true;
    }
  }

  ScrapArena.Renderer = Renderer;
})(typeof window === 'undefined' ? globalThis : window);
