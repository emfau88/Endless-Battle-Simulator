/* Marble Knockout · Vorschau V0 (R43)
 *
 * Szene „Crumbling Bridge“ (Bahn 4) mitten im Rennen, in drei Stilen und zwei Formaten. Reine Entwurfszeichnung
 * zur Stilwahl, kein Teil des Szenarios. Werte nach der Stilbibel im Plan
 * (docs/MARBLE_KNOCKOUT_PLAN_2026-11-25.md, Abschnitt 6). Kein Zufall: Details über eine Hash-Funktion.
 * Gerendert mit: node scripts/knockout-vorschau.mjs
 */
(function (global) {
  'use strict';
  const TAU = Math.PI * 2;

  const COLORS = {
    RED: '#e8343a', ORANGE: '#f7862a', YELLOW: '#f5cf2a', LIME: '#9ad83a', GREEN: '#1fa85a', CYAN: '#22c4dc',
    BLUE: '#2f6be0', PURPLE: '#8a4de0', PINK: '#f25fae', WHITE: '#eef1f4', BLACK: '#2a2d33', GOLD: '#e3b23c',
  };

  const STYLES = {
    A: {
      id: 'A', name: 'Holz & Abendlicht',
      bg: ['#1b3b41', '#0e2226'], glow: 'rgba(255,186,110,0.16)', glowAt: [0.16, -0.06], vignette: 'rgba(0,0,0,0.5)',
      pattern: { kind: 'dots', color: 'rgba(255,255,255,0.045)' },
      pit: 'rgba(2,10,12,0.5)', pitDeep: 'rgba(0,4,6,0.8)', dust: [236, 205, 160],
      track: { kind: 'wood', base: '#cf9752', top: '#efc584', bottom: '#93602b', grain: 'rgba(96,54,20,0.28)', shadow: 'rgba(0,0,0,0.42)' },
      metal: { light: '#eef2f5', base: '#aeb8bf', dark: '#5f6c75', accent: '#d4a537' },
      post: { light: '#b8834a', base: '#8a5a2b', dark: '#55361a' },
      rope: '#4a2f1a', marbleShadow: 'rgba(0,0,0,0.45)', marbleGlow: 0,
      text: '#ffffff', textShadow: 'rgba(0,0,0,0.6)', sub: 'rgba(255,255,255,0.8)',
      tube: { glass: 'rgba(200,232,240,0.10)', edge: 'rgba(225,242,250,0.6)', cap: '#a8743e' },
    },
    B: {
      id: 'B', name: 'Hell & clean',
      bg: ['#f7f9fc', '#e1e7ee'], glow: null, vignette: 'rgba(40,60,90,0.08)',
      pattern: { kind: 'grid', color: 'rgba(40,70,110,0.06)' },
      pit: 'rgba(70,92,120,0.10)', pitDeep: 'rgba(60,82,110,0.22)', dust: [150, 165, 185],
      track: { kind: 'plastic', base: '#7d9dbf', top: '#adc6df', bottom: '#58789a', grain: null, shadow: 'rgba(40,62,95,0.22)' },
      metal: { light: '#ffffff', base: '#e4e9ee', dark: '#8d99a6', accent: '#ffae1f' },
      post: { light: '#e8eef3', base: '#c3cdd7', dark: '#8f9dac' },
      rope: '#8794a3', marbleShadow: 'rgba(30,50,85,0.22)', marbleGlow: 0,
      text: '#1d2935', textShadow: null, sub: 'rgba(29,41,53,0.68)',
      tube: { glass: 'rgba(255,255,255,0.6)', edge: 'rgba(90,110,135,0.55)', cap: '#c3cdd7' },
    },
    C: {
      id: 'C', name: 'Glas & Nacht',
      bg: ['#14204a', '#060b1c'], glow: 'rgba(90,140,255,0.14)', glowAt: [0.5, -0.12], vignette: 'rgba(0,0,10,0.55)',
      pattern: { kind: 'stars' },
      pit: 'rgba(0,0,10,0.45)', pitDeep: 'rgba(0,0,6,0.8)', dust: [150, 200, 255],
      track: { kind: 'glass', base: 'rgba(150,200,255,0.14)', top: 'rgba(205,236,255,0.95)', bottom: 'rgba(120,170,240,0.6)', glow: 'rgba(110,180,255,0.7)' },
      metal: { light: '#a9b9e0', base: '#2c3658', dark: '#121830', accent: '#5ef0ff' },
      post: { glass: true, base: 'rgba(150,200,255,0.12)', light: 'rgba(205,236,255,0.85)' },
      rope: 'rgba(170,215,255,0.6)', marbleShadow: null, marbleGlow: 18,
      text: '#ffffff', textShadow: 'rgba(70,130,255,0.75)', sub: 'rgba(220,232,255,0.82)',
      tube: { glass: 'rgba(150,200,255,0.10)', edge: 'rgba(205,236,255,0.85)', cap: '#2c3658' },
    },
  };

  // ---------------------------------------------------------------- kleine Helfer
  function hash(a, b) {
    let h = (a * 374761393 + b * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  const rgb = hex => { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mixA = (hex, to, t, a = 1) => { const p = rgb(hex), q = rgb(to); return `rgba(${p.map((v, i) => Math.round(v + (q[i] - v) * t)).join(',')},${a})`; };
  const alpha = (hex, a) => `rgba(${rgb(hex).join(',')},${a})`;

  function path(g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); }
  function stroke(g, pts, w, color, dx = 0, dy = 0, cap = 'round') {
    g.save(); g.translate(dx, dy); path(g, pts);
    g.lineWidth = w; g.strokeStyle = color; g.lineCap = cap; g.lineJoin = 'round'; g.stroke(); g.restore();
  }

  /** Punkt auf einer Polylinie bei x; lift > 0 hebt ihn senkrecht zur Bahn nach oben (Mitte einer aufliegenden Murmel). */
  function onTrack(pts, x, lift) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      if (x1 !== x2 && (x - x1) * (x - x2) <= 0) {
        const t = (x - x1) / (x2 - x1), y = y1 + (y2 - y1) * t, len = Math.hypot(x2 - x1, y2 - y1);
        let nx = (y2 - y1) / len, ny = -(x2 - x1) / len;
        if (ny > 0) { nx = -nx; ny = -ny; }
        return { x: x + nx * lift, y: y + ny * lift, ty: y, ang: Math.atan2(y2 - y1, x2 - x1) };
      }
    }
    throw new Error('x liegt außerhalb der Bahn: ' + x);
  }

  function text(g, S, s, x, y, size, o = {}) {
    g.save();
    g.font = `${o.weight || 800} ${size}px "Segoe UI", Arial, sans-serif`;
    g.textAlign = o.align || 'left'; g.textBaseline = 'alphabetic';
    if ('letterSpacing' in g) g.letterSpacing = (o.spacing || 0) + 'px';
    if (S.textShadow) { g.shadowColor = S.textShadow; g.shadowBlur = size * 0.35; g.shadowOffsetY = size * 0.05; }
    g.fillStyle = o.color || S.text; g.fillText(s, x, y);
    g.restore();
  }

  // ---------------------------------------------------------------- Hintergrund und Grube
  function background(g, S, W, H) {
    const lg = g.createLinearGradient(0, 0, 0, H);
    lg.addColorStop(0, S.bg[0]); lg.addColorStop(1, S.bg[1]);
    g.fillStyle = lg; g.fillRect(0, 0, W, H);
    const p = S.pattern;
    if (p.kind === 'dots') {
      g.fillStyle = p.color;
      for (let row = 0, y = 14; y < H; row++, y += 28) for (let x = 14 + (row % 2) * 14; x < W; x += 28) { g.beginPath(); g.arc(x, y, 1.4, 0, TAU); g.fill(); }
    } else if (p.kind === 'grid') {
      g.strokeStyle = p.color; g.lineWidth = 1;
      for (let x = 30; x < W; x += 60) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); g.stroke(); }
      for (let y = 30; y < H; y += 60) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke(); }
    } else if (p.kind === 'stars') {
      for (let i = 0; i < 190; i++) {
        const x = hash(i, 1) * W, y = hash(i, 2) * H * 0.9, s = 0.6 + hash(i, 3) * 1.7, a = 0.12 + hash(i, 4) * 0.5;
        g.fillStyle = `rgba(200,220,255,${a.toFixed(2)})`; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
      }
    }
    if (S.glow) {
      const gx = S.glowAt[0] * W, gy = S.glowAt[1] * H, R = Math.max(W, H) * 0.85;
      const rg = g.createRadialGradient(gx, gy, 0, gx, gy, R);
      rg.addColorStop(0, S.glow); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
    }
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.hypot(W, H) * 0.62);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, S.vignette);
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }

  /** Abgrund unter der Brücke: oben und an den Seiten weich auslaufend. */
  function pit(g, S, x1, x2, y1, y2) {
    const w = Math.ceil(x2 - x1), h = Math.ceil(y2 - y1), c = document.createElement('canvas');
    c.width = w; c.height = h;
    const p = c.getContext('2d'), v = p.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.28, S.pit); v.addColorStop(1, S.pitDeep);
    p.fillStyle = v; p.fillRect(0, 0, w, h);
    const s = p.createLinearGradient(0, 0, w, 0);
    s.addColorStop(0, 'rgba(0,0,0,0)'); s.addColorStop(0.16, 'rgba(0,0,0,1)'); s.addColorStop(0.84, 'rgba(0,0,0,1)'); s.addColorStop(1, 'rgba(0,0,0,0)');
    p.globalCompositeOperation = 'destination-in'; p.fillStyle = s; p.fillRect(0, 0, w, h);
    g.drawImage(c, x1, y1);
  }

  function hazard(g, x, y, w, h, glow) {
    g.save();
    if (glow) { g.shadowColor = 'rgba(255,200,60,0.7)'; g.shadowBlur = 14; }
    g.beginPath(); g.roundRect(x, y, w, h, Math.min(4, h / 3)); g.fillStyle = '#f2c230'; g.fill();
    g.shadowColor = 'transparent'; g.clip();
    g.fillStyle = '#1d1d1f';
    const s = h * 0.9;
    for (let k = -2 * h; k < w + 2 * h; k += s * 2) {
      g.beginPath(); g.moveTo(x + k, y + h); g.lineTo(x + k + h, y); g.lineTo(x + k + h + s, y); g.lineTo(x + k + s, y + h); g.closePath(); g.fill();
    }
    g.restore();
  }

  function lamp(g, x, y, r, on) {
    const c = on === 'red' ? [255, 70, 50] : [70, 230, 120];
    const halo = g.createRadialGradient(x, y, 0, x, y, r * 4.2);
    halo.addColorStop(0, `rgba(${c},0.55)`); halo.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = halo; g.beginPath(); g.arc(x, y, r * 4.2, 0, TAU); g.fill();
    const body = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    body.addColorStop(0, '#ffffff'); body.addColorStop(0.35, `rgb(${c})`); body.addColorStop(1, `rgb(${c.map(v => v * 0.55 | 0)})`);
    g.fillStyle = body; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }

  // ---------------------------------------------------------------- Bahnteile
  /** Bahnstück als Polylinie der Stärke T. side 'h': Licht oben, Schatten unten; 'v' für senkrechte Banden. */
  function track(g, S, pts, T, side = 'h') {
    const t = S.track, o = d => (side === 'h' ? [0, d] : [d, 0]);
    if (t.kind === 'glass') {
      g.save(); g.shadowColor = t.glow; g.shadowBlur = 16; stroke(g, pts, T, t.base); g.restore();
      stroke(g, pts, 2.6, t.top, ...o(-T / 2 + 1.3), 'butt');
      stroke(g, pts, 1.6, t.bottom, ...o(T / 2 - 0.8), 'butt');
      return;
    }
    g.save();
    g.shadowColor = t.shadow; g.shadowBlur = t.kind === 'plastic' ? T * 1.4 : T * 0.8;
    g.shadowOffsetX = T * 0.3; g.shadowOffsetY = T * 0.5;
    stroke(g, pts, T, t.base); g.restore();
    stroke(g, pts, T * 0.3, t.bottom, ...o(T * 0.35), 'butt');
    stroke(g, pts, T * 0.2, t.top, ...o(-T * 0.3), 'butt');
    if (t.grain) { g.save(); g.setLineDash([T * 4, T * 0.35, T * 1.7, T * 0.3]); stroke(g, pts, 1.3, t.grain, ...o(T * 0.04), 'butt'); g.restore(); }
  }

  function plank(g, S, cx, cy, w, h, ang, o = {}) {
    const t = S.track, r = Math.min(4, h / 3);
    g.save(); g.translate(cx, cy); g.rotate(ang);
    if (t.kind === 'glass') {
      g.save(); g.shadowColor = t.glow; g.shadowBlur = 12; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, r); g.fillStyle = t.base; g.fill(); g.restore();
      g.lineWidth = 2; g.strokeStyle = t.top; g.stroke();
    } else {
      g.save();
      g.shadowColor = t.shadow; g.shadowBlur = t.kind === 'plastic' ? h * 1.4 : h * 0.8; g.shadowOffsetX = h * 0.3; g.shadowOffsetY = h * 0.5;
      g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, r); g.fillStyle = t.base; g.fill(); g.restore();
      g.save(); g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, r); g.clip();
      g.fillStyle = t.top; g.fillRect(-w / 2, -h / 2, w, h * 0.26);
      g.fillStyle = t.bottom; g.fillRect(-w / 2, h * 0.2, w, h * 0.3);
      if (t.grain) {
        g.strokeStyle = t.grain; g.lineWidth = 1.1;
        for (const k of [-0.04, 0.12]) { g.beginPath(); g.moveTo(-w / 2, h * k); g.bezierCurveTo(-w / 6, h * (k - 0.1), w / 6, h * (k + 0.1), w / 2, h * k); g.stroke(); }
      }
      g.restore();
      if (t.kind === 'wood') { g.fillStyle = 'rgba(60,35,15,0.65)'; for (const s of [-1, 1]) { g.beginPath(); g.arc(s * (w / 2 - 7), -h * 0.05, 1.8, 0, TAU); g.fill(); } }
    }
    if (o.danger) {
      g.save(); g.shadowColor = 'rgba(255,70,50,0.95)'; g.shadowBlur = 18;
      g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, r); g.lineWidth = 3; g.strokeStyle = 'rgba(255,90,70,0.95)'; g.stroke(); g.restore();
    }
    g.restore();
  }

  function post(g, S, x, yTop, yBottom, w) {
    const P = S.post;
    if (P.glass) {
      g.save(); g.shadowColor = S.track.glow; g.shadowBlur = 12; g.beginPath(); g.roundRect(x - w / 2, yTop, w, yBottom - yTop, 4); g.fillStyle = P.base; g.fill(); g.restore();
      g.lineWidth = 2; g.strokeStyle = P.light; g.stroke();
    } else {
      const lg = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
      lg.addColorStop(0, P.light); lg.addColorStop(0.45, P.base); lg.addColorStop(1, P.dark);
      g.save(); g.shadowColor = S.track.shadow; g.shadowBlur = 12; g.shadowOffsetX = 5; g.shadowOffsetY = 6;
      g.beginPath(); g.roundRect(x - w / 2, yTop, w, yBottom - yTop, 3); g.fillStyle = lg; g.fill(); g.restore();
    }
    hazard(g, x - w / 2, yTop + 22, w, 30, S.id === 'C');
    const M = S.metal;
    g.fillStyle = M.dark; g.beginPath(); g.roundRect(x - w / 2 - 2, yTop - 6, w + 4, 10, 3); g.fill();
    lamp(g, x, yTop - 10, w * 0.38, 'red');
  }

  /** Halteseil zwischen zwei Pfosten; gibt y(x) des Seils zurück. */
  function rope(g, S, a, b, sag) {
    const cy = (a[1] + b[1]) / 2 + sag;
    g.save(); g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo((a[0] + b[0]) / 2, cy, b[0], b[1]);
    g.lineWidth = 3.6; g.strokeStyle = S.rope; g.lineCap = 'round'; g.stroke();
    if (S.track.kind === 'wood') { g.setLineDash([5, 5]); g.lineWidth = 1.6; g.strokeStyle = 'rgba(160,110,60,0.5)'; g.stroke(); }
    g.restore();
    return x => { const t = (x - a[0]) / (b[0] - a[0]); return (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * cy + t * t * b[1]; };
  }

  function hangers(g, S, planks, ropeY, T, broken) {
    g.save(); g.lineWidth = 2; g.strokeStyle = S.rope; g.lineCap = 'round';
    planks.forEach((p, i) => {
      const y0 = ropeY(p.cx);
      g.beginPath(); g.moveTo(p.cx, y0);
      if (i < broken) { const len = 30 + hash(i, 7) * 26, lean = (hash(i, 8) - 0.5) * 0.5; g.lineTo(p.cx + Math.sin(lean) * len, y0 + Math.cos(lean) * len); }
      else g.lineTo(p.cx, p.cy - T / 2);
      g.stroke();
    });
    g.restore();
  }

  function dust(g, S, x, y, scale) {
    for (let i = 0; i < 7; i++) {
      const px = x + (hash(i, 21) - 0.5) * 70 * scale, py = y + hash(i, 22) * 46 * scale, r = (14 + hash(i, 23) * 22) * scale;
      const rg = g.createRadialGradient(px, py, 0, px, py, r);
      rg.addColorStop(0, `rgba(${S.dust},${(0.16 + hash(i, 24) * 0.14).toFixed(2)})`); rg.addColorStop(1, `rgba(${S.dust},0)`);
      g.fillStyle = rg; g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill();
    }
  }

  function metalBar(g, S, x1, y1, x2, y2, w) {
    const M = S.metal;
    stroke(g, [[x1, y1], [x2, y2]], w + 2, M.dark);
    stroke(g, [[x1, y1], [x2, y2]], w, M.base);
    stroke(g, [[x1, y1], [x2, y2]], w * 0.35, M.light, -w * 0.18, 0);
  }

  function finish(g, S, pts, x, T, flagH) {
    const p = onTrack(pts, x, 0), sq = T / 2;
    g.save(); g.translate(x, p.ty); g.rotate(p.ang);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#141414' : '#f6f6f6'; g.fillRect(-1.5 * sq + i * sq, -T / 2 + j * sq, sq, sq); }
    g.restore();
    const top = p.ty - T / 2 - flagH;
    metalBar(g, S, x, p.ty - T / 2, x, top, 6);
    const f = Math.round(flagH * 0.11);
    g.save(); if (S.id === 'C') { g.shadowColor = 'rgba(200,235,255,0.8)'; g.shadowBlur = 10; }
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { g.fillStyle = (i + j) % 2 ? '#141414' : '#f6f6f6'; g.fillRect(x + 3 + i * f, top + j * f, f, f); }
    g.restore();
  }

  function sign(g, S, x, yBase, h, label, size) {
    metalBar(g, S, x, yBase, x, yBase - h, 6);
    g.font = `900 ${size}px "Segoe UI", Arial, sans-serif`;
    const w = g.measureText(label).width + size * 1.1, bh = size * 1.6, y = yBase - h - bh;
    g.save(); g.shadowColor = 'rgba(0,0,0,0.3)'; g.shadowBlur = 8; g.shadowOffsetY = 3;
    g.beginPath(); g.roundRect(x - w / 2, y, w, bh, 7); g.fillStyle = S.metal.base; g.fill(); g.restore();
    g.lineWidth = 2.5; g.strokeStyle = S.metal.accent; g.stroke();
    g.save(); g.fillStyle = S.id === 'C' ? '#e8f4ff' : '#1b2129'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${size}px "Segoe UI", Arial, sans-serif`; g.fillText(label, x, y + bh / 2 + 1); g.restore();
  }

  // ---------------------------------------------------------------- Murmeln
  function crown(g, x, y, s) {
    const w = s * 1.2, h = s * 0.8;
    g.save(); g.translate(x, y);
    g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(-w / 2, -h); g.lineTo(-w / 4, -h * 0.48); g.lineTo(0, -h * 1.1);
    g.lineTo(w / 4, -h * 0.48); g.lineTo(w / 2, -h); g.lineTo(w / 2, 0); g.closePath();
    const gr = g.createLinearGradient(0, -h, 0, 0);
    gr.addColorStop(0, '#fff1a8'); gr.addColorStop(0.5, '#f2c43d'); gr.addColorStop(1, '#b8861c');
    g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 6; g.shadowOffsetY = 2; g.fillStyle = gr; g.fill();
    g.shadowColor = 'transparent'; g.lineWidth = 1.6; g.strokeStyle = '#7a5410'; g.stroke();
    g.fillStyle = '#e8343a'; g.beginPath(); g.arc(0, -h * 0.3, s * 0.09, 0, TAU); g.fill();
    g.restore();
  }

  function marble(g, S, x, y, r, name, spin, o = {}) {
    const base = COLORS[name], gold = name === 'GOLD';
    if (o.trail) o.trail.forEach(([dx, dy], i) => {
      g.fillStyle = alpha(base, [0.2, 0.12, 0.06][i] || 0.04);
      g.beginPath(); g.arc(x + dx, y + dy, r * (0.94 - i * 0.08), 0, TAU); g.fill();
    });
    if (!o.air && !o.noShadow && S.marbleShadow) {
      g.save(); g.filter = `blur(${(r * 0.2).toFixed(1)}px)`; g.fillStyle = S.marbleShadow;
      g.beginPath(); g.ellipse(x + r * 0.28, y + r * 0.8, r * 0.82, r * 0.3, 0, 0, TAU); g.fill(); g.restore();
    }
    if (S.marbleGlow) {
      g.save(); g.shadowColor = alpha(gold ? '#ffd45a' : base, 0.9); g.shadowBlur = S.marbleGlow;
      g.fillStyle = base; g.beginPath(); g.arc(x, y, r * 0.96, 0, TAU); g.fill(); g.restore();
    }
    const gr = g.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.06, x, y, r * 1.02);
    if (gold) { gr.addColorStop(0, '#fff7cf'); gr.addColorStop(0.3, '#f4cf5c'); gr.addColorStop(0.72, '#c48d1f'); gr.addColorStop(1, '#6a460b'); }
    else {
      gr.addColorStop(0, mixA(base, '#ffffff', 0.55)); gr.addColorStop(0.4, base);
      gr.addColorStop(0.86, mixA(base, '#000000', 0.32)); gr.addColorStop(1, mixA(base, '#000000', 0.55));
    }
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    // Schliere im Glas, dreht mit der Murmel
    g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip(); g.translate(x, y); g.rotate(spin); g.lineCap = 'round';
    g.strokeStyle = gold ? 'rgba(255,250,220,0.38)' : 'rgba(255,255,255,0.32)'; g.lineWidth = r * 0.17;
    g.beginPath(); g.arc(r * 0.18, r * 0.08, r * 0.56, -0.5, 1.4); g.stroke();
    g.strokeStyle = gold ? 'rgba(110,70,10,0.3)' : mixA(base, '#000000', 0.4, 0.45); g.lineWidth = r * 0.1;
    g.beginPath(); g.arc(-r * 0.12, -r * 0.04, r * 0.44, 2.3, 3.9); g.stroke();
    g.restore();
    const lw = Math.max(1, r * 0.05);
    g.lineWidth = lw; g.strokeStyle = gold ? 'rgba(90,60,10,0.55)' : `rgba(0,0,0,${S.id === 'B' ? 0.22 : 0.35})`;
    g.beginPath(); g.arc(x, y, r - lw / 2, 0, TAU); g.stroke();
    g.save(); g.translate(x - r * 0.36, y - r * 0.42); g.rotate(-0.62); g.fillStyle = 'rgba(255,255,255,0.92)';
    g.beginPath(); g.ellipse(0, 0, r * 0.27, r * 0.15, 0, 0, TAU); g.fill(); g.restore();
    g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.ellipse(x + r * 0.38, y + r * 0.4, r * 0.12, r * 0.07, -0.6, 0, TAU); g.fill();
    if (o.danger) {
      g.save(); g.shadowColor = 'rgba(255,60,45,0.95)'; g.shadowBlur = r * 0.6;
      g.lineWidth = Math.max(3, r * 0.15); g.strokeStyle = 'rgba(255,74,60,0.95)';
      g.beginPath(); g.arc(x, y, r * 1.3, 0, TAU); g.stroke(); g.restore();
      g.lineWidth = 2; g.strokeStyle = 'rgba(255,90,75,0.35)'; g.beginPath(); g.arc(x, y, r * 1.62, 0, TAU); g.stroke();
    }
    if (o.crown) crown(g, x, y - r - 5, r * 0.9);
  }

  function outTube(g, S, x, yTop, yBottom, w, names, r) {
    const T = S.tube;
    g.beginPath(); g.roundRect(x - w / 2, yTop, w, yBottom - yTop, w / 2); g.fillStyle = T.glass; g.fill();
    names.forEach((n, i) => {
      const y = yBottom - 8 - r - i * (2 * r + 3);
      marble(g, S, x, y, r, n, hash(i, 9) * TAU, { noShadow: true });
      text(g, S, n, x - w / 2 - 16, y + 8, 22, { align: 'right', color: S.sub, weight: 800, spacing: 1 });
    });
    g.lineWidth = 2.5; g.strokeStyle = T.edge; g.beginPath(); g.roundRect(x - w / 2, yTop, w, yBottom - yTop, w / 2); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.2)'; g.beginPath(); g.roundRect(x - w / 2 + 8, yTop + 18, 6, yBottom - yTop - 36, 3); g.fill();
    for (const y of [yTop - 9, yBottom - 9]) { g.fillStyle = T.cap; g.beginPath(); g.roundRect(x - w / 2 - 6, y, w + 12, 18, 6); g.fill(); }
    text(g, S, 'OUT', x, yTop - 24, 30, { align: 'center', weight: 900, spacing: 2 });
  }

  // ---------------------------------------------------------------- Szenen
  function landscape(g, S) {
    const W = 1920, H = 1080, T = 16, R = 22, lift = R + T / 2;
    background(g, S, W, H);
    const xL = 470, xR = 1250, deckY = x => 384 + (x - xL) * 48 / (xR - xL), ang = Math.atan2(48, xR - xL);
    pit(g, S, xL - 60, xR + 40, deckY(xL) + 20, H);
    post(g, S, 458, 234, deckY(xL) + 70, 22);
    post(g, S, 1262, 284, deckY(xR) + 70, 22);
    const ropeY = rope(g, S, [458, 246], [1262, 296], 88);

    const entry = [[24, 206], [462, 380]], kicker = [[1244, 434], [1300, 438], [1392, 404]];
    const landing = [[1505, 488], [1752, 604]], wall = [[1768, 536], [1768, 680]];
    const lower = [[1752, 704], [1340, 852]], tray = [[1340, 852], [1276, 856]], stop = [[1270, 830], [1270, 858]];
    for (const p of [entry, kicker, landing, lower, tray]) track(g, S, p, T);
    for (const p of [wall, stop]) track(g, S, p, T, 'v');
    hazard(g, 1284, 868, 52, 12, S.id === 'C');

    const pitch = 78, pw = 74, planks = [];
    for (let i = 0; i < 10; i++) { const cx = xL + pitch * i + pitch / 2; planks.push({ cx, cy: deckY(cx) }); }
    hangers(g, S, planks, ropeY, T, 3);
    const fall = [{ dx: 14, dy: 540, rot: 1.15 }, { dx: -8, dy: 290, rot: -0.5 }, { dx: 5, dy: 92, rot: 0.2 }];
    planks.forEach((p, i) => {
      if (i < 3) plank(g, S, p.cx + fall[i].dx, p.cy + fall[i].dy, pw, T, ang + fall[i].rot);
      else plank(g, S, p.cx, p.cy + (i === 3 ? 3 : 0), pw, T, ang + (i === 3 ? 0.07 : 0), { danger: i === 3 });
    });
    dust(g, S, planks[3].cx - pitch / 2, deckY(planks[3].cx) + 14, 1);
    finish(g, S, lower, 1420, T, 96);

    const deck = [[xL, deckY(xL)], [xR, deckY(xR)]], at = (pts, x) => onTrack(pts, x, lift);
    const field = [
      ['GOLD', at(tray, 1302), { crown: true }],
      ['BLUE', at(lower, 1470), { trail: [[26, -9], [52, -19], [78, -28]] }],
      ['PINK', at(landing, 1630), { trail: [[-26, -12], [-52, -24]] }],
      ['CYAN', { x: 1468, y: 410 }, { air: true, trail: [[-18, -16], [-36, -26], [-54, -30]] }],
      ['RED', { x: 1404, y: 360 }, { air: true, trail: [[-18, 10], [-38, 18], [-58, 24]] }],
      ['GREEN', at(deck, 1136)], ['YELLOW', at(deck, 1050)], ['WHITE', at(deck, 952)],
      ['PURPLE', at(deck, 832), { danger: true }],
    ];
    field.forEach(([n, p, o], i) => marble(g, S, p.x, p.y, R, n, hash(i, 5) * TAU, o));

    outTube(g, S, 1856, 178, 1012, 56, ['LIME', 'BLACK', 'ORANGE'], R);
    text(g, S, 'STAGE 4/10', 56, 80, 46, { weight: 900, spacing: 1 });
    text(g, S, 'CRUMBLING BRIDGE', 58, 122, 28, { weight: 800, spacing: 3, color: S.sub });
    text(g, S, '9 LEFT', 1886, 80, 46, { weight: 900, align: 'right', spacing: 1 });
  }

  function portrait(g, S) {
    const W = 1080, H = 1920, T = 20, R = 30, lift = R + T / 2;
    background(g, S, W, H);
    const xL = 125, xR = 955, deckY = x => 735 + (x - xL) * 40 / (xR - xL), ang = Math.atan2(40, xR - xL);
    pit(g, S, xL - 50, xR + 20, deckY(xL) + 24, 1296);
    hazard(g, xL + 6, 1290, xR - xL - 12, 20, S.id === 'C');
    post(g, S, 116, 560, deckY(xL) + 80, 26);
    post(g, S, 964, 600, deckY(xR) + 80, 26);
    const ropeY = rope(g, S, [116, 574], [964, 614], 96);

    const entry = [[0, 640], [128, 738]], chuteIn = [[974, 812], [974, 1330]], chuteOut = [[1066, 690], [1066, 1352], [1036, 1386]];
    const lower = [[1058, 1392], [250, 1526]], tray = [[250, 1526], [122, 1534]], stop = [[110, 1500], [110, 1538]];
    for (const p of [entry, lower, tray]) track(g, S, p, T);
    for (const p of [chuteIn, chuteOut, stop]) track(g, S, p, T, 'v');
    hazard(g, 124, 1552, 124, 14, S.id === 'C');

    const pitch = 83, pw = 78, planks = [];
    for (let i = 0; i < 10; i++) { const cx = xL + pitch * i + pitch / 2; planks.push({ cx, cy: deckY(cx) }); }
    hangers(g, S, planks, ropeY, T, 3);
    const fall = [{ dx: 10, dy: 430, rot: 1.0 }, { dx: -6, dy: 235, rot: -0.55 }, { dx: 4, dy: 70, rot: 0.22 }];
    planks.forEach((p, i) => {
      if (i < 3) plank(g, S, p.cx + fall[i].dx, p.cy + fall[i].dy, pw, T, ang + fall[i].rot);
      else plank(g, S, p.cx, p.cy + (i === 3 ? 3 : 0), pw, T, ang + (i === 3 ? 0.07 : 0), { danger: i === 3 });
    });
    dust(g, S, planks[3].cx - pitch / 2, deckY(planks[3].cx) + 18, 1.3);
    finish(g, S, lower, 430, T, 110);
    sign(g, S, 262, 1512, 64, 'TOP 3', 26);

    const deck = [[xL, deckY(xL)], [xR, deckY(xR)]], at = (pts, x) => onTrack(pts, x, lift);
    const field = [
      ['RED', at(lower, 352), { crown: true, trail: [[30, -5], [60, -10]] }],
      ['BLUE', { x: 1020, y: 1130 }, { air: true, trail: [[0, -36], [0, -70], [0, -102]] }],
      ['YELLOW', at(deck, 885)], ['GREEN', at(deck, 735)],
      ['PINK', at(deck, 500), { danger: true }],
    ];
    field.forEach(([n, p, o], i) => marble(g, S, p.x, p.y, R, n, hash(i, 6) * TAU, o));

    text(g, S, '5 → TOP 3', W / 2, 300, 112, { weight: 900, align: 'center', spacing: 2 });
    text(g, S, 'CRUMBLING BRIDGE', W / 2, 382, 40, { weight: 800, align: 'center', spacing: 5, color: S.sub });
  }

  global.KnockoutVorschau = {
    STYLES, COLORS,
    draw(g, style, format) { const S = STYLES[style]; (format === '9x16' ? portrait : landscape)(g, S); },
  };
})(typeof window !== 'undefined' ? window : globalThis);
