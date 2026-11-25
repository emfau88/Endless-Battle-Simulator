/* Marble Knockout · Zeichnung im Stil A „Holz & Abendlicht“ (R43/M5)
 *
 * Werte nach der Stilbibel (docs/MARBLE_KNOCKOUT_PLAN_2026-11-25.md, Abschnitt 6) und der Vorschau
 * docs/reference/knockout-vorschau.js. Liest die Simulation nur. Feste Bahnteile einer Bahn werden einmal in eine
 * Textur gezeichnet; alles Bewegte kommt jedes Bild neu aus dem Zustand (Seek-Regel). Kein Zufall: Details über
 * eine Hash-Funktion.
 */
(function (global) {
  'use strict';
  const EBS = global.EBS;
  const TAU = Math.PI * 2;

  const S = {
    glow: 'rgba(255,186,110,0.16)', vignette: 'rgba(0,0,0,0.5)', dots: 'rgba(255,255,255,0.045)',
    pit: 'rgba(2,10,12,0.5)', pitDeep: 'rgba(0,4,6,0.8)', dust: [236, 205, 160],
    track: { base: '#cf9752', top: '#efc584', bottom: '#93602b', grain: 'rgba(96,54,20,0.28)', shadow: 'rgba(0,0,0,0.42)' },
    wall: { base: '#b77f40', top: '#d9a868', bottom: '#7e5223' },
    metal: { light: '#eef2f5', base: '#aeb8bf', dark: '#5f6c75', accent: '#d4a537' },
    rope: '#4a2f1a', marbleShadow: 'rgba(0,0,0,0.45)',
    text: '#ffffff', textShadow: 'rgba(0,0,0,0.6)', sub: 'rgba(255,255,255,0.8)',
    tube: { glass: 'rgba(200,232,240,0.10)', edge: 'rgba(225,242,250,0.6)', cap: '#a8743e' },
    font: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
  };
  // Hintergrund je Bahn („eine Welt pro Bahn“): oben, unten
  const WORLDS = {
    night: ['#1a2c47', '#0c1626'], forest: ['#1b3b2c', '#0c1f16'], sand: ['#4a3a24', '#221a0f'], petrol: ['#1b3b41', '#0e2226'],
    dusk: ['#4a2430', '#1c0d14'], plum: ['#3a2142', '#170c1c'], slate: ['#2c343c', '#12171c'], ice: ['#21405a', '#0d1c2a'],
    violet: ['#2c1f52', '#110b24'], gold: ['#4a3816', '#1c1407'],
  };

  function hash(a, b) {
    let h = (a * 374761393 + b * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mixA = (hex, to, t, a = 1) => { const p = rgb(hex), q = rgb(to); return `rgba(${p.map((v, i) => Math.round(v + (q[i] - v) * t)).join(',')},${a})`; };
  const alpha = (hex, a) => `rgba(${rgb(hex).join(',')},${a})`;

  function path(g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); }
  function stroke(g, pts, w, color, dx = 0, dy = 0, cap = 'round') {
    g.save(); g.translate(dx, dy); path(g, pts);
    g.lineWidth = w; g.strokeStyle = color; g.lineCap = cap; g.lineJoin = 'round'; g.stroke(); g.restore();
  }
  function text(g, s, x, y, size, o = {}) {
    g.save();
    g.font = `${o.weight || 800} ${size}px ${S.font}`;
    g.textAlign = o.align || 'left'; g.textBaseline = o.baseline || 'alphabetic';
    if ('letterSpacing' in g) g.letterSpacing = (o.spacing || 0) + 'px';
    g.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
    g.shadowColor = S.textShadow; g.shadowBlur = size * 0.35; g.shadowOffsetY = size * 0.05;
    if (o.outline) { g.lineWidth = size * 0.14; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineJoin = 'round'; g.strokeText(s, x, y); }
    g.fillStyle = o.color || S.text; g.fillText(s, x, y);
    g.restore();
  }

  // ---------------------------------------------------------------- Hintergrund
  function background(g, W, H, world) {
    const bg = WORLDS[world] || WORLDS.petrol;
    const lg = g.createLinearGradient(0, 0, 0, H);
    lg.addColorStop(0, bg[0]); lg.addColorStop(1, bg[1]);
    g.fillStyle = lg; g.fillRect(0, 0, W, H);
    g.fillStyle = S.dots;
    for (let row = 0, y = 14; y < H; row++, y += 28) for (let x = 14 + (row % 2) * 14; x < W; x += 28) { g.beginPath(); g.arc(x, y, 1.4, 0, TAU); g.fill(); }
    const gx = 0.16 * W, gy = -0.06 * H, R = Math.max(W, H) * 0.85, rg = g.createRadialGradient(gx, gy, 0, gx, gy, R);
    rg.addColorStop(0, S.glow); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.hypot(W, H) * 0.62);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, S.vignette);
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }
  function pit(g, p, H) {
    const x1 = p.x0, x2 = p.x1, y1 = p.y0, y2 = Math.min(p.y1, H + 40), w = Math.ceil(x2 - x1), h = Math.ceil(y2 - y1);
    if (w <= 0 || h <= 0) return;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const q = c.getContext('2d'), v = q.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.28, S.pit); v.addColorStop(1, S.pitDeep);
    q.fillStyle = v; q.fillRect(0, 0, w, h);
    const s = q.createLinearGradient(0, 0, w, 0);
    s.addColorStop(0, 'rgba(0,0,0,0)'); s.addColorStop(0.16, 'rgba(0,0,0,1)'); s.addColorStop(0.84, 'rgba(0,0,0,1)'); s.addColorStop(1, 'rgba(0,0,0,0)');
    q.globalCompositeOperation = 'destination-in'; q.fillStyle = s; q.fillRect(0, 0, w, h);
    g.drawImage(c, x1, y1);
  }
  /** Gefahren-Grube vor den Murmeln: Wer hineinfällt, verschwindet im Dunkeln. Rand mit Warnstreifen. */
  function killPit(g, p) {
    const w = p.x1 - p.x0, h = p.y1 - p.y0, v = g.createLinearGradient(0, p.y0, 0, p.y1);
    v.addColorStop(0, 'rgba(4,6,10,0)'); v.addColorStop(Math.min(0.9, p.depth / h), 'rgba(4,6,10,0.97)'); v.addColorStop(1, 'rgba(4,6,10,0.97)');
    g.save(); g.beginPath(); g.roundRect(p.x0, p.y0, w, h, Math.min(18, h / 3)); g.fillStyle = v; g.fill(); g.restore();
    hazard(g, p.x0 + 10, p.y1 - 9, w - 20, 9);
  }
  function hazard(g, x, y, w, h) {
    g.save();
    g.beginPath(); g.roundRect(x, y, w, h, Math.min(4, h / 3)); g.fillStyle = '#f2c230'; g.fill(); g.clip();
    g.fillStyle = '#1d1d1f';
    const s = h * 0.9;
    for (let k = -2 * h; k < w + 2 * h; k += s * 2) {
      g.beginPath(); g.moveTo(x + k, y + h); g.lineTo(x + k + h, y); g.lineTo(x + k + h + s, y); g.lineTo(x + k + s, y + h); g.closePath(); g.fill();
    }
    g.restore();
  }
  function lamp(g, x, y, r, on) {
    const c = on === 'red' ? [255, 70, 50] : on === 'amber' ? [255, 190, 60] : [70, 230, 120];
    const halo = g.createRadialGradient(x, y, 0, x, y, r * 4.2);
    halo.addColorStop(0, `rgba(${c},0.55)`); halo.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = halo; g.beginPath(); g.arc(x, y, r * 4.2, 0, TAU); g.fill();
    const body = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    body.addColorStop(0, '#ffffff'); body.addColorStop(0.35, `rgb(${c})`); body.addColorStop(1, `rgb(${c.map((v) => v * 0.55 | 0)})`);
    g.fillStyle = body; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }

  // ---------------------------------------------------------------- feste Bahnteile
  /** Holzbahn als Polylinie: Licht oben, Schatten unten (Richtung nach der Steilheit). */
  function woodTrack(g, pts, T, kind) {
    const t = kind === 'wall' ? { ...S.track, ...S.wall } : S.track;
    let vx = 0, vy = 0;
    for (let i = 1; i < pts.length; i++) { vx += Math.abs(pts[i][0] - pts[i - 1][0]); vy += Math.abs(pts[i][1] - pts[i - 1][1]); }
    const vert = vy > vx * 1.4, o = (d) => (vert ? [d, 0] : [0, d]);
    g.save();
    g.shadowColor = t.shadow; g.shadowBlur = T * 0.8; g.shadowOffsetX = T * 0.3; g.shadowOffsetY = T * 0.5;
    stroke(g, pts, T, t.base); g.restore();
    stroke(g, pts, T * 0.3, t.bottom, ...o(T * 0.35), 'butt');
    stroke(g, pts, T * 0.2, t.top, ...o(-T * 0.3), 'butt');
    if (kind !== 'wall') { g.save(); g.setLineDash([T * 4, T * 0.35, T * 1.7, T * 0.3]); stroke(g, pts, 1.3, t.grain, ...o(T * 0.04), 'butt'); g.restore(); }
  }
  function netTrack(g, pts, T) {
    stroke(g, pts, T * 0.5, 'rgba(40,25,12,0.8)');
    g.save(); g.setLineDash([3, 5]); stroke(g, pts, T * 1.6, 'rgba(210,180,130,0.5)'); g.restore();
    stroke(g, pts, 2, '#c9a46a');
  }
  function beltTrack(g, pts, T, pos) {
    stroke(g, pts, T + 4, '#2b2f35');
    stroke(g, pts, T, '#40464f');
    g.save(); g.setLineDash([T * 0.6, T * 0.9]); g.lineDashOffset = -(pos || 0); stroke(g, pts, T * 0.55, '#6a727d', 0, 0, 'butt'); g.restore();
    for (const p of [pts[0], pts[pts.length - 1]]) { g.fillStyle = S.metal.dark; g.beginPath(); g.arc(p[0], p[1], T * 0.7, 0, TAU); g.fill(); g.fillStyle = S.metal.accent; g.beginPath(); g.arc(p[0], p[1], T * 0.25, 0, TAU); g.fill(); }
  }
  function peg(g, p) {
    if (p.kind === 'bumper') {
      const gr = g.createRadialGradient(p.x - p.rad * 0.3, p.y - p.rad * 0.35, p.rad * 0.1, p.x, p.y, p.rad);
      gr.addColorStop(0, '#fff0d0'); gr.addColorStop(0.4, S.metal.accent); gr.addColorStop(1, '#7a5a16');
      g.save(); g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 10; g.shadowOffsetX = 3; g.shadowOffsetY = 5;
      g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, p.rad, 0, TAU); g.fill(); g.restore();
      g.lineWidth = p.rad * 0.18; g.strokeStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(p.x, p.y, p.rad * 0.62, 0, TAU); g.stroke();
      return;
    }
    g.save(); g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 5; g.shadowOffsetX = 2; g.shadowOffsetY = 3;
    const gr = g.createRadialGradient(p.x - p.rad * 0.35, p.y - p.rad * 0.35, p.rad * 0.1, p.x, p.y, p.rad);
    gr.addColorStop(0, S.metal.light); gr.addColorStop(0.55, S.metal.base); gr.addColorStop(1, S.metal.dark);
    g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, p.rad, 0, TAU); g.fill(); g.restore();
  }
  function sign(g, s) {
    metalBar(g, s.x, s.y, s.x, s.y - s.h, 6);
    g.font = `900 ${s.size}px ${S.font}`;
    const w = g.measureText(s.text).width + s.size * 1.1, bh = s.size * 1.6, y = s.y - s.h - bh;
    g.save(); g.shadowColor = 'rgba(0,0,0,0.3)'; g.shadowBlur = 8; g.shadowOffsetY = 3;
    g.beginPath(); g.roundRect(s.x - w / 2, y, w, bh, 7); g.fillStyle = S.metal.base; g.fill(); g.restore();
    g.lineWidth = 2.5; g.strokeStyle = S.metal.accent; g.stroke();
    g.save(); g.fillStyle = '#1b2129'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${s.size}px ${S.font}`; g.fillText(s.text, s.x, y + bh / 2 + 1); g.restore();
  }
  function metalBar(g, x1, y1, x2, y2, w) {
    stroke(g, [[x1, y1], [x2, y2]], w + 2, S.metal.dark);
    stroke(g, [[x1, y1], [x2, y2]], w, S.metal.base);
    stroke(g, [[x1, y1], [x2, y2]], Math.max(1, w * 0.35), S.metal.light, -w * 0.12, -w * 0.12);
  }

  /** Feste Teile einer Bahn in eine Leinwand (Ausgabeauflösung). */
  function paintStatic(g, sim, st, world) {
    const W = sim.W, H = sim.H;
    background(g, W, H, world);
    for (const p of st.pits) { if (p.kill) continue; pit(g, p, H); if (p.stripes) hazard(g, p.x0 + 8, Math.min(p.y1, H) - 22, p.x1 - p.x0 - 16, 14); }
    for (const tr of st.tracks) if (!tr.front && tr.kind !== 'belt') drawTrack(g, tr);
    for (const p of st.pegs) peg(g, p);
    for (const s of st.signs) sign(g, s);
  }
  function drawTrack(g, tr, beltPos) {
    if (tr.kind === 'net') netTrack(g, tr.pts, tr.w);
    else if (tr.kind === 'belt') beltTrack(g, tr.pts, tr.w, beltPos);
    else woodTrack(g, tr.pts, tr.w, tr.kind);
  }

  // ---------------------------------------------------------------- bewegte Teile
  function capsule(g, s, w, color) { stroke(g, [[s.wax, s.way], [s.wbx, s.wby]], w, color); }
  function metalShapes(g, b, o = {}) {
    for (const s of b.shapes) capsule(g, s, 2 * s.rad + 2, S.metal.dark);
    for (const s of b.shapes) capsule(g, s, 2 * s.rad, o.base || S.metal.base);
    for (const s of b.shapes) if (s.rad > 2.5) stroke(g, [[s.wax, s.way], [s.wbx, s.wby]], Math.max(1, s.rad * 0.55), S.metal.light, -s.rad * 0.25, -s.rad * 0.3);
  }
  function hubDot(g, x, y, r) {
    g.fillStyle = S.metal.dark; g.beginPath(); g.arc(x, y, r * 1.15, 0, TAU); g.fill();
    const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    gr.addColorStop(0, '#fff2c2'); gr.addColorStop(0.5, S.metal.accent); gr.addColorStop(1, '#8a6a1c');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  function woodShapes(g, b, danger) {
    for (const s of b.shapes) {
      const dx = s.wbx - s.wax, dy = s.wby - s.way, len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx), h = 2 * s.rad, w = len + h;
      g.save(); g.translate((s.wax + s.wbx) / 2, (s.way + s.wby) / 2); g.rotate(ang);
      g.save(); g.shadowColor = S.track.shadow; g.shadowBlur = h * 0.8; g.shadowOffsetX = h * 0.3; g.shadowOffsetY = h * 0.5;
      g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, Math.min(4, h / 3)); g.fillStyle = S.track.base; g.fill(); g.restore();
      g.save(); g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, Math.min(4, h / 3)); g.clip();
      g.fillStyle = S.track.top; g.fillRect(-w / 2, -h / 2, w, h * 0.26);
      g.fillStyle = S.track.bottom; g.fillRect(-w / 2, h * 0.2, w, h * 0.3);
      g.strokeStyle = S.track.grain; g.lineWidth = 1.1;
      g.beginPath(); g.moveTo(-w / 2, 0); g.bezierCurveTo(-w / 6, -h * 0.1, w / 6, h * 0.1, w / 2, 0); g.stroke();
      g.restore();
      if (danger > 0) {
        g.save(); g.shadowColor = 'rgba(255,70,50,0.95)'; g.shadowBlur = 16 * danger;
        g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, Math.min(4, h / 3)); g.lineWidth = 3; g.strokeStyle = `rgba(255,90,70,${0.95 * danger})`; g.stroke(); g.restore();
      }
      g.restore();
    }
  }

  /** Ein bewegtes Element zeichnen (Bahnzeit rt, Videozeit t). */
  function drawElement(g, el, sim, rt, t) {
    switch (el.type) {
      case 'gate': {
        const f = el.frac(rt);
        if (el.kind === 'shelf') { for (const b of el.bodies) woodShapes(g, b, 0); for (const b of el.bodies) hubDot(g, b.x, b.y, 5); return; }
        // Ganz versenkt: nicht zeichnen (es kommt aus der Bahn). Ampel nur bei Takttoren, fest über der Bahn.
        const b = el.bodies[0];
        if (f < 0.99) metalShapes(g, b, { base: '#c9cfd4' });
        if (el.kind === 'gate') lamp(g, el.x, el.y - el.h - 30, 6, f > 0.5 ? 'green' : 'red');
        return;
      }
      case 'lid': {
        for (const b of el.bodies) if (b.enabled) woodShapes(g, b, 0);
        return;
      }
      case 'bridge': {
        el.bodies.forEach((b, i) => {
          if (!b.enabled) return;
          const s = b.shapes[0];
          if (s.way > sim.H + 60 && s.wby > sim.H + 60) return;
          const wob = el.wobbling(i, rt) ? 1 : 0;
          woodShapes(g, b, wob);
        });
        return;
      }
      case 'trapdoors': {
        el.bodies.forEach((b, i) => {
          woodShapes(g, b, 0);
          const s = b.shapes[0], warn = el.warnAt(i, rt);
          const mx = (s.wax + s.wbx) / 2, my = (s.way + s.wby) / 2;
          hazard(g, mx - (el.w * 0.3), my + s.rad + 2, el.w * 0.6, 6);
          if (warn && Math.floor(rt * 8) % 2 === 0) lamp(g, mx, my + s.rad + 16, 4.5, 'red');
          hubDot(g, s.wax, s.way, s.rad * 0.6);
        });
        return;
      }
      case 'hammer': {
        const b = el.bodies[0], [rod, head] = b.shapes;
        metalShapes(g, { shapes: [rod] });
        // Kopf: dunkles Metall mit Messingband
        capsule(g, head, 2 * head.rad + 2, '#3a4148');
        capsule(g, head, 2 * head.rad, '#6f7a83');
        stroke(g, [[head.wax, head.way], [head.wbx, head.wby]], head.rad * 0.5, S.metal.light, -head.rad * 0.25, -head.rad * 0.35);
        const mx = (head.wax + head.wbx) / 2, my = (head.way + head.wby) / 2;
        g.fillStyle = S.metal.accent; g.beginPath(); g.arc(mx, my, head.rad * 0.45, 0, TAU); g.fill();
        hubDot(g, el.px, el.py, 7);
        return;
      }
      case 'conveyor':
        for (const tr of [{ pts: el.pts, w: 2 * (el.shapes[0] ? el.shapes[0].rad : 8), kind: 'belt' }]) drawTrack(g, tr, el.pos);
        return;
      case 'tilt': {
        const b = el.bodies[0];
        woodShapes(g, { shapes: b.shapes.filter((s) => s.ay === s.by || Math.abs(s.ay - s.by) < 1e-9 ? true : false) }, 0);
        metalShapes(g, { shapes: b.shapes.filter((s) => !(Math.abs(s.ay - s.by) < 1e-9)) });
        // Stütze und Achse
        metalBar(g, el.x, el.y + 10, el.x - 26, el.y + 90, 8); metalBar(g, el.x, el.y + 10, el.x + 26, el.y + 90, 8);
        hubDot(g, el.x, el.y, 9);
        return;
      }
      case 'floors':
        // Nur zwischen den Turmwänden zeichnen: Die Böden gleiten hinter den Wänden weiter
        g.save(); g.beginPath(); g.rect(el.xl, -1e4, el.xr - el.xl, 2e4); g.clip();
        for (const b of el.bodies) woodShapes(g, b, 0);
        g.restore();
        return;
      default: {
        for (const b of el.bodies) {
          metalShapes(g, b);
          if (b.hub) hubDot(g, b.x, b.y, Math.min(b.hub, 26));
        }
        if (el.type === 'drum' || el.type === 'rings' || el.type === 'maze') hubDot(g, el.x, el.y, 7);
      }
    }
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
  function marble(g, x, y, r, name, color, spin, o = {}) {
    const base = color, gold = name === 'GOLD';
    if (!o.noShadow) {
      g.save(); g.filter = `blur(${(r * 0.2).toFixed(1)}px)`; g.fillStyle = S.marbleShadow;
      g.beginPath(); g.ellipse(x + r * 0.28, y + r * 0.8, r * 0.82, r * 0.3, 0, 0, TAU); g.fill(); g.restore();
    }
    const gr = g.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.06, x, y, r * 1.02);
    if (gold) { gr.addColorStop(0, '#fff7cf'); gr.addColorStop(0.3, '#f4cf5c'); gr.addColorStop(0.72, '#c48d1f'); gr.addColorStop(1, '#6a460b'); }
    else {
      gr.addColorStop(0, mixA(base, '#ffffff', 0.55)); gr.addColorStop(0.4, base);
      gr.addColorStop(0.86, mixA(base, '#000000', 0.32)); gr.addColorStop(1, mixA(base, '#000000', 0.55));
    }
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip(); g.translate(x, y); g.rotate(spin); g.lineCap = 'round';
    g.strokeStyle = gold ? 'rgba(255,250,220,0.38)' : 'rgba(255,255,255,0.32)'; g.lineWidth = r * 0.17;
    g.beginPath(); g.arc(r * 0.18, r * 0.08, r * 0.56, -0.5, 1.4); g.stroke();
    g.strokeStyle = gold ? 'rgba(110,70,10,0.3)' : mixA(base, '#000000', 0.4, 0.45); g.lineWidth = r * 0.1;
    g.beginPath(); g.arc(-r * 0.12, -r * 0.04, r * 0.44, 2.3, 3.9); g.stroke();
    g.restore();
    const lw = Math.max(1, r * 0.05);
    g.lineWidth = lw; g.strokeStyle = gold ? 'rgba(90,60,10,0.55)' : 'rgba(0,0,0,0.35)';
    g.beginPath(); g.arc(x, y, r - lw / 2, 0, TAU); g.stroke();
    g.save(); g.translate(x - r * 0.36, y - r * 0.42); g.rotate(-0.62); g.fillStyle = 'rgba(255,255,255,0.92)';
    g.beginPath(); g.ellipse(0, 0, r * 0.27, r * 0.15, 0, 0, TAU); g.fill(); g.restore();
    g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.ellipse(x + r * 0.38, y + r * 0.4, r * 0.12, r * 0.07, -0.6, 0, TAU); g.fill();
    if (o.danger) {
      const k = o.danger;
      g.save(); g.shadowColor = 'rgba(255,60,45,0.95)'; g.shadowBlur = r * 0.6;
      g.lineWidth = Math.max(3, r * 0.15); g.strokeStyle = `rgba(255,74,60,${0.95 * k})`;
      g.beginPath(); g.arc(x, y, r * 1.3, 0, TAU); g.stroke(); g.restore();
      g.lineWidth = 2; g.strokeStyle = `rgba(255,90,75,${0.35 * k})`; g.beginPath(); g.arc(x, y, r * 1.62, 0, TAU); g.stroke();
    }
    if (o.crown) crown(g, x, y - r - 5, r * 0.9);
  }
  /** Klappe: kurz aufklappende Platte unter der ausgeschiedenen Murmel. */
  function hatch(g, x, y, age, r) {
    if (age > 0.9) return;
    const k = Math.min(1, age / 0.18), fade = age < 0.6 ? 1 : 1 - (age - 0.6) / 0.3, w = r * 2.6;
    g.save(); g.globalAlpha = fade;
    g.fillStyle = 'rgba(0,0,0,0.75)'; g.beginPath(); g.ellipse(x, y, w / 2, r * 0.32, 0, 0, TAU); g.fill();
    hazard(g, x - w / 2 - 6, y - 4, 6, 8); hazard(g, x + w / 2, y - 4, 6, 8);
    for (const s of [-1, 1]) {
      g.save(); g.translate(x + s * w / 2, y); g.rotate(s * k * 1.25);
      g.fillStyle = S.metal.base; g.fillRect(s > 0 ? -w / 2 : 0, -3, w / 2, 6);
      g.restore();
    }
    g.restore();
  }
  function finishLine(g, f, T) {
    const dx = f.bx - f.ax, dy = f.by - f.ay, len = Math.hypot(dx, dy), n = Math.max(2, Math.round(len / (T * 0.8)));
    g.save(); g.translate(f.ax, f.ay); g.rotate(Math.atan2(dy, dx));
    const sq = len / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? 'rgba(20,20,20,0.85)' : 'rgba(246,246,246,0.85)'; g.fillRect(i * sq, -sq + j * sq, sq, sq); }
    g.restore();
  }
  function outTube(g, sim, x, yTop, yBottom, w) {
    const r = sim.r, T = S.tube, names = sim.outList.map((i) => sim.roster[i]);
    g.beginPath(); g.roundRect(x - w / 2, yTop, w, yBottom - yTop, w / 2); g.fillStyle = T.glass; g.fill();
    names.forEach((m, i) => {
      const y = yBottom - 8 - r - i * (2 * r + 3);
      marble(g, x, y, r, m.name, m.color, hash(i, 9) * TAU, { noShadow: true });
      text(g, m.name, x - w / 2 - 14, y + 8, 21, { align: 'right', color: S.sub, weight: 800, spacing: 1 });
    });
    g.lineWidth = 2.5; g.strokeStyle = T.edge; g.beginPath(); g.roundRect(x - w / 2, yTop, w, yBottom - yTop, w / 2); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.2)'; g.beginPath(); g.roundRect(x - w / 2 + 8, yTop + 18, 6, yBottom - yTop - 36, 3); g.fill();
    for (const y of [yTop - 9, yBottom - 9]) { g.fillStyle = T.cap; g.beginPath(); g.roundRect(x - w / 2 - 6, y, w + 12, 18, 6); g.fill(); }
    text(g, 'OUT', x, yTop - 24, 30, { align: 'center', weight: 900, spacing: 2 });
  }

  EBS.KnockoutArt = { S, WORLDS, hash, text, background, hazard, killPit, lamp, stroke, metalBar, paintStatic, drawTrack, drawElement, marble, crown, hatch, finishLine, outTube, woodShapes, metalShapes, hubDot, alpha, mixA };
})(typeof window !== 'undefined' ? window : globalThis);
