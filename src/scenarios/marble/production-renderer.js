/* Progressive Marble Works: presentation is a pure projection of production state.
 * The fixed factory never changes with the camera, the frame rate or the video format.
 * CanvasScene retains the existing Pixi capture/export pipeline. */
(function () {
  'use strict';
  const P = EBS.MarbleProduction;
  const { clamp } = EBS.util;
  const TAU = Math.PI * 2;
  const W = 6000, H = 1500;
  const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const mix = (a, b, f) => a + (b - a) * f;
  const hex = (n) => '#' + n.toString(16).padStart(6, '0');
  const rgba = (n, a) => `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
  const palette = (sim) => (P.PALETTES?.[sim.cfg.palette] || P.COLORS || [0x38d8e8, 0x598cff, 0xec74ce, 0xf3aa58, 0xf0d56b, 0x79dca6]).map(c => typeof c === 'number' ? c : c.hex);
  function linear(g, x0, y0, x1, y1, stops) {
    const d = g.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([p, c]) => d.addColorStop(p, c)); return d;
  }
  function radial(g, x, y, r, stops) {
    const d = g.createRadialGradient(x - r * .28, y - r * .34, r * .02, x, y, r);
    stops.forEach(([p, c]) => d.addColorStop(p, c)); return d;
  }
  function rect(g, x, y, w, h, r = 0) { g.beginPath(); g.roundRect(x, y, w, h, r); }
  function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); }
  function line(g, points, color, width = 1) {
    g.beginPath(); points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
    g.strokeStyle = color; g.lineWidth = width; g.stroke();
  }
  function text(g, txt, x, y, size = 18, color = '#b9ccd6', align = 'left', weight = 500) {
    g.font = `${weight} ${size}px "Segoe UI",Arial,sans-serif`; g.textAlign = align;
    g.textBaseline = 'middle'; g.fillStyle = color; g.fillText(txt, x, y);
  }
  function plate(g, x, y, w, h, r = 8, brass = false) {
    g.save(); g.shadowColor = '#0009'; g.shadowBlur = 15; g.shadowOffsetY = 9;
    rect(g, x, y, w, h, r);
    g.fillStyle = linear(g, x, y, x + w * .35, y + h, brass ? [[0, '#e9c785'], [.2, '#ad834b'], [.5, '#79613d'], [1, '#3b3022']] : [[0, '#72838d'], [.07, '#4a5a65'], [.48, '#263641'], [1, '#111d28']]);
    g.fill(); g.shadowBlur = 0; g.shadowOffsetY = 0; g.strokeStyle = '#070e16'; g.lineWidth = 2; g.stroke();
    rect(g, x + 1.5, y + 1.5, w - 3, h - 3, Math.max(0, r - 1)); g.strokeStyle = '#c4e0ee35'; g.lineWidth = 1; g.stroke();
    g.restore();
  }
  function bolt(g, x, y, r = 4, gold = false) {
    circle(g, x, y + 1, r + 1); g.fillStyle = '#03080d'; g.fill();
    circle(g, x, y, r); g.fillStyle = radial(g, x, y, r, gold ? [[0, '#fff0bd'], [.5, '#b78f50'], [1, '#594023']] : [[0, '#d5e5ea'], [.5, '#81929d'], [1, '#263844']]); g.fill();
    line(g, [[x - r * .6, y + r * .22], [x + r * .6, y - r * .22]], '#18222b', 1);
  }
  function feet(g, x, y, w, bottom = 1370) {
    for (const xx of [x + 22, x + w - 22]) {
      plate(g, xx - 10, y, 20, Math.max(12, bottom - y), 3);
      plate(g, xx - 27, bottom - 7, 54, 14, 3);
      bolt(g, xx - 15, bottom); bolt(g, xx + 15, bottom);
    }
  }
  function gear(g, x, y, r, teeth, angle, gold = false) {
    g.save(); g.translate(x, y); g.rotate(angle);
    g.beginPath();
    for (let i = 0; i <= teeth * 4; i++) {
      const a = i / (teeth * 4) * TAU, rr = r * (i % 4 === 1 || i % 4 === 2 ? 1 : .85);
      i ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    g.closePath(); g.fillStyle = radial(g, 0, 0, r, gold ? [[0, '#d6ba78'], [.6, '#bc9558'], [.92, '#6f5736'], [1, '#f4d599']] : [[0, '#788c99'], [.6, '#516777'], [.92, '#23323e'], [1, '#a6bcc8']]);
    g.fill(); g.strokeStyle = '#030b12'; g.lineWidth = 2; g.stroke();
    circle(g, 0, 0, r * .65); g.strokeStyle = '#0e18247f'; g.lineWidth = 4; g.stroke();
    for (let i = 0; i < 5; i++) { const a = TAU * i / 5; circle(g, Math.cos(a) * r * .43, Math.sin(a) * r * .43, r * .115); g.fillStyle = '#0c1823'; g.fill(); }
    circle(g, 0, 0, r * .22); g.fillStyle = '#aebfca'; g.fill(); bolt(g, 0, 0, r * .11, gold);
    g.restore();
  }
  function lamp(g, x, y, color, active = true, r = 5) {
    circle(g, x, y, r + 3); g.fillStyle = '#07111b'; g.fill();
    g.save(); if (active) { g.shadowColor = color; g.shadowBlur = r * 4; }
    circle(g, x, y, r); g.fillStyle = active ? color : '#344651'; g.fill(); g.restore();
    circle(g, x - r * .25, y - r * .3, r * .24); g.fillStyle = '#fff8'; g.fill();
  }
  function tube(g, points, front = false, radius = 27) {
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    if (!front) {
      line(g, points.map(([x, y]) => [x + 3, y + 9]), '#0007', radius * 2 + 9);
      line(g, points, '#a7d4e331', radius * 2 + 2);
      line(g, points, '#071522', radius * 2 - 3);
      line(g, points, '#7ca5bd15', radius * 2 - 6);
    } else {
      const offset = (distance) => points.map(([x, y], i) => {
        const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
        const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
        return [x + dy / len * distance, y - dx / len * distance];
      });
      line(g, offset(radius - 4), '#deefff7b', 2.4);
      line(g, offset(radius - 9), '#ecfaff30', 5);
      line(g, offset(-radius + 5), '#85c0df48', 3);
    }
    g.restore();
  }
  function collar(g, x, y, vertical = false) {
    g.save(); g.translate(x, y); if (vertical) g.rotate(Math.PI / 2);
    plate(g, -9, -36, 18, 72, 3); bolt(g, 0, -29, 3); bolt(g, 0, 29, 3); g.restore();
  }
  function belt(g, x0, x1, y, t, enabled = true) {
    const cy = y + 46;
    plate(g, x0 - 20, cy - 28, x1 - x0 + 40, 68, 18);
    rect(g, x0 - 26, cy - 28, x1 - x0 + 52, 56, 28); g.fillStyle = '#0d1720'; g.fill(); g.strokeStyle = '#9ab2c33e'; g.lineWidth = 3; g.stroke();
    line(g, [[x0, y + 24], [x1, y + 24]], '#738894', 6);
    const off = enabled ? (t * 90) % 24 : 0;
    for (let x = x0 + off; x < x1; x += 24) line(g, [[x, cy - 21], [x - 5, cy - 12]], '#41505b', 3);
    for (let x = x0 + 62; x < x1 - 35; x += 76) { circle(g, x, cy, 13); g.fillStyle = '#415664'; g.fill(); bolt(g, x, cy, 4); }
    gear(g, x0, cy, 25, 14, enabled ? t * 2.6 : 0); gear(g, x1, cy, 25, 14, enabled ? t * 2.6 : 0);
  }
  function machineLabel(g, index, title, x, y, subtitle) {
    text(g, index, x, y, 13, '#d3ac6f', 'left', 700);
    text(g, title, x + 32, y, 19, '#d9e7ea', 'left', 600);
    if (subtitle) text(g, subtitle, x + 32, y + 25, 13, '#8297a6');
  }

  /** Stateless camera: seeking directly to a frame yields the same shot as playback. */
  function cameraAt(sim, world, view = {}) {
    const portrait = world.h > world.w;
    const availableH = world.h - (portrait ? 370 : 210);
    const overview = { x: 3000, y: 755, zoom: Math.min((world.w - 70) / W, availableH / H) };
    const mode = sim.cfg.cameraMode || 'auto';
    if (mode === 'overview' || view.camera === false) return overview;
    const zoom = Math.min(portrait ? 1.15 : 1.07, availableH / (portrait ? 1190 : 830));
    const minX = Math.min(W / 2, world.w / zoom / 2 - 80), maxX = W - minX;
    if (mode === 'manual') {
      const manualZoom = zoom * (sim.cfg.cameraZoom || 1), half = Math.min(W / 2, world.w / manualZoom / 2 - 35);
      return { x: mix(half, W - half, clamp((sim.cfg.cameraPosition ?? 50) / 100, 0, 1)), y: 810, zoom: manualZoom };
    }
    const t = sim.t || 0;
    // Thirty-second traversals with an eight-second settling period on each machine.
    const marks = [650, 1500, 2800, 3650, 4400, 5400, 3650, 2800, 1500];
    const elapsed = Math.max(0, t - 10), segment = elapsed / 17, ix = Math.floor(segment) % marks.length;
    const u = segment % 1, f = smooth((u - .24) / .76);
    let x = mix(marks[ix], marks[(ix + 1) % marks.length], f), y = 825;
    let z = zoom * (1 + .045 * Math.sin(elapsed * .035));
    // Real production events interrupt the established tour, then blend back into it.
    const events = sim.milestones || [];
    const milestone = [...events].reverse().find(e => e.type !== 'complete' && t >= e.time && t - e.time < 19);
    if (milestone) {
      const age = t - milestone.time;
      const weight = smooth(age / 4) * (1 - smooth((age - 12) / 7));
      x = mix(x, milestone.x || (milestone.type === 'parallel' ? 2250 : 2800), weight);
      y = mix(y, milestone.type === 'parallel' ? 900 : 700, weight);
      z = mix(z, zoom * (milestone.type === 'parallel' ? .88 : 1.04), weight);
    }
    x = clamp(x, minX, maxX);
    y = mix(y, 1030, smooth((x - 4400) / 700));
    const intro = smooth((t - 7) / 8);
    let out = { x: mix(overview.x, x, intro), y: mix(overview.y, y, intro), zoom: mix(overview.zoom, z, intro) };
    if (sim.completedAt != null) {
      const finish = smooth((t - sim.completedAt) / 8);
      out = { x: mix(out.x, overview.x, finish), y: mix(out.y, overview.y, finish), zoom: mix(out.zoom, overview.zoom, finish) };
    }
    return out;
  }

  class ProductionRenderer extends EBS.CanvasScene {
    constructor(ctx) {
      super(ctx); this.sim = ctx.sim; this.view = ctx.view; this.video = ctx.video;
      this.colors = palette(this.sim);
      this.background = document.createElement('canvas'); this.background.width = W; this.background.height = H;
      this._hall(this.background.getContext('2d'));
    }
    resize(world, renderScale = this.scale) {
      this.world = world; this.scale = renderScale;
      this.canvas.width = Math.round(world.w * renderScale); this.canvas.height = Math.round(world.h * renderScale);
      this.root.children[0].width = world.w; this.root.children[0].height = world.h;
      this.texture.source.resize?.(this.canvas.width, this.canvas.height);
      this.texture.source.update();
    }
    _hall(g) {
      g.fillStyle = linear(g, 0, 0, 0, H, [[0, '#070f18'], [.45, '#152330'], [1, '#0a121b']]); g.fillRect(0, 0, W, H);
      for (let x = 0; x < W; x += 225) for (let y = 0; y < 1420; y += 190) {
        g.fillStyle = (x / 225 + y / 190) % 3 === 0 ? '#afcad805' : '#00000008';
        g.fillRect(x + 2, y + 2, 221, 186); g.strokeStyle = '#030a1050'; g.lineWidth = 2; g.strokeRect(x, y, 225, 190);
        for (const dx of [12, 213]) for (const dy of [12, 178]) { circle(g, x + dx, y + dy, 2.2); g.fillStyle = '#050a12'; g.fill(); }
      }
      for (let x = 135; x < W; x += 580) {
        g.fillStyle = linear(g, x, 0, x + 34, 0, [[0, '#08131e'], [.2, '#243747'], [.65, '#172937'], [1, '#080e15']]); g.fillRect(x, 0, 34, 1420);
      }
      for (const y of [220, 242]) {
        g.fillStyle = linear(g, 0, y, 0, y + 14, [[0, '#243e4d'], [.4, '#3a5260'], [1, '#101c27']]); g.fillRect(0, y, W, 14);
        for (let x = 95; x < W; x += 230) plate(g, x, y - 4, 11, 22, 2);
      }
      for (const x of [380, 1130, 1880, 2630, 3380, 4130, 4880, 5630]) {
        const glow = g.createRadialGradient(x, 65, 20, x, 65, 660);
        glow.addColorStop(0, '#edc79b16'); glow.addColorStop(1, '#edc79b00'); g.fillStyle = glow; g.fillRect(x - 660, 0, 1320, 870);
        plate(g, x - 135, 62, 270, 24, 4); g.save(); g.shadowColor = '#ffd39b'; g.shadowBlur = 24;
        rect(g, x - 120, 84, 240, 5, 2); g.fillStyle = '#ffe6ba'; g.fill(); g.restore();
      }
      g.fillStyle = linear(g, 0, 1418, 0, H, [[0, '#263746'], [.08, '#172632'], [1, '#07121c']]); g.fillRect(0, 1418, W, H - 1418);
      line(g, [[0, 1419], [W, 1419]], '#badbe935', 2);
      for (let x = -300; x < W + 300; x += 210) line(g, [[x, H], [x + 100, 1420]], '#5c7f9619', 1);
      text(g, 'SIMCASCADE   /   GLASSWORKS', 310, 188, 17, '#7d97a5', 'left', 600);
      for (const x of [920, 2190, 3150, 4145, 4700]) {
        line(g, [[x, 1370], [x + 35, 1370]], '#b79962', 3);
        line(g, [[x + 24, 1359], [x + 36, 1370], [x + 24, 1381]], '#b79962', 3);
      }
    }
    _hopper(g, front = false) {
      const sim = this.sim, raw = sim.balls.filter(b => b.state === 'raw').length;
      if (!front) {
        feet(g, 112, 525, 390);
        plate(g, 93, 498, 435, 34, 7);
        g.beginPath(); g.moveTo(115, 237); g.lineTo(520, 237); g.lineTo(520, 435); g.lineTo(477, 490); g.lineTo(423, 490); g.lineTo(115, 455); g.closePath();
        g.fillStyle = linear(g, 115, 237, 520, 490, [[0, '#88c2df20'], [.3, '#0c1b2d55'], [1, '#82bfda19']]); g.fill(); g.strokeStyle = '#82b5c96b'; g.lineWidth = 4; g.stroke();
        plate(g, 101, 224, 432, 24, 5);
        machineLabel(g, '01', 'RAW STOCK', 142, 216);
        plate(g, 190, 548, 192, 74, 7); text(g, 'INVENTORY', 207, 568, 12, '#8199a8'); text(g, String(raw).padStart(3, '0'), 206, 599, 30, '#dcebef', 'left', 600);
        lamp(g, 357, 591, '#9dc5b0', raw > 0);
        gear(g, 450, 462, 59, 18, sim.t * (raw ? 1.1 : 0), true);
        circle(g, 450, 462, 44); g.strokeStyle = '#0a15249c'; g.lineWidth = 11; g.stroke();
        for (let i = 0; i < 4; i++) {
          const a = sim.t * (raw ? 1.1 : 0) + i * TAU / 4;
          circle(g, 450 + Math.cos(a) * 31, 462 + Math.sin(a) * 31, 15); g.fillStyle = '#071420'; g.fill(); g.strokeStyle = '#b49664'; g.lineWidth = 2; g.stroke();
        }
        tube(g, [[450, 510], [450, 600], [550, 600]]);
      } else {
        line(g, [[124, 256], [124, 446], [422, 479]], '#ecfaff65', 3);
        line(g, [[139, 260], [139, 429], [238, 443]], '#d5f3ff17', 10);
        line(g, [[510, 253], [510, 429]], '#d5f3ff65', 2);
        for (const [x, y] of [[112, 236], [522, 236], [431, 490], [469, 490]]) bolt(g, x, y, 5, true);
        tube(g, [[450, 510], [450, 600], [550, 600]], true); collar(g, 450, 550, true);
      }
    }
    _polisher(g, lane, front = false) {
      const sim = this.sim, y = lane ? 840 : 600, st = sim.stations?.polish?.[lane];
      const busy = !!st?.ball, p = st?.progress || 0, r = lane ? 77 : 92;
      if (!front) {
        plate(g, 930, y - 110, 240, 236, 17);
        for (const [x, yy] of [[944, y - 95], [1156, y - 95], [944, y + 109], [1156, y + 109]]) bolt(g, x, yy, 5, true);
        circle(g, 1050, y, r + 3); g.fillStyle = '#050d15'; g.fill();
        circle(g, 1050, y, r - 5); g.fillStyle = radial(g, 1050, y, r, [[0, '#234751'], [.65, '#142d39'], [1, '#0a1723']]); g.fill();
        gear(g, 1195, y + 76, 40, 18, busy ? -sim.t * 2.6 : 0, true);
        gear(g, 1247, y + 103, 22, 12, busy ? sim.t * 4.8 : 0);
        plate(g, 1265, y + 70, 95, 64, 7); for (let i = 0; i < 5; i++) line(g, [[1280 + i * 12, y + 82], [1280 + i * 12, y + 120]], '#111d29', 4);
        lamp(g, 1345, y + 84, '#8edbc4', busy, 4);
        if (!lane) { machineLabel(g, '02', sim.cfg.material === 'rubber' ? 'ELASTIC PRESS' : 'DIAMOND POLISH', 923, 407, 'Precision shaping · mirror finish'); feet(g, 930, 726, 430); }
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + (busy ? sim.t * .75 : 0), bx = 1050 + Math.cos(a) * (r - 19), by = y + Math.sin(a) * (r - 19);
          g.save(); g.translate(bx, by); g.rotate(a + Math.PI / 2);
          plate(g, -22, -12, 44, 24, 8, true);
          for (let n = -16; n <= 16; n += 4) line(g, [[n, -8], [n, 8]], '#f0d8b180', 1);
          g.restore();
        }
        line(g, [[963, y + 92], [1137, y + 92]], '#121e28', 6);
        line(g, [[963, y + 92], [963 + 174 * p, y + 92]], '#80d6ce', 4);
      } else {
        circle(g, 1050, y, r); g.strokeStyle = '#c5dfed65'; g.lineWidth = 4; g.stroke();
        g.beginPath(); g.arc(1050, y, r - 8, -2.8, -1.0); g.strokeStyle = '#e6f6ff5c'; g.lineWidth = 4; g.stroke();
        circle(g, 1050, y, r - 4); g.fillStyle = '#b7eeff08'; g.fill();
        if (busy) {
          for (let i = 0; i < 9; i++) { const a = sim.t * 4 + i * 2.4, rr = 28 + ((sim.t * 35 + i * 11) % 40); circle(g, 1050 + Math.cos(a) * rr, y + Math.sin(a) * rr, 1.2); g.fillStyle = '#d7f9ed9c'; g.fill(); }
        }
      }
    }
    _coater(g, lane, front = false) {
      const sim = this.sim, y = lane ? 840 : 600, st = sim.stations?.coat?.[lane], upgraded = sim.level >= 1;
      const busy = !!st?.ball, p = st?.progress || 0;
      const col = this.colors[st?.ball?.color ?? 0] || 0x65d9e7;
      if (!front) {
        plate(g, 1658, y - 102, 282, 226, 14);
        for (const x of [1673, 1925]) for (const yy of [y - 86, y + 107]) bolt(g, x, yy, 5, true);
        circle(g, 1800, y, 97); g.fillStyle = '#07121d'; g.fill();
        circle(g, 1800, y, 87); g.fillStyle = radial(g, 1800, y, 90, [[0, rgba(col, busy ? .2 : .04)], [1, '#14313c40']]); g.fill();
        if (!lane) {
          machineLabel(g, '03', upgraded ? 'CHROMATIC INFUSION' : 'CLEAR ANNEALING', 1638, 273, upgraded ? 'Pigment · inner pattern · optical finish' : 'First batch · clear glass finish');
          feet(g, 1658, 725, 384);
          for (let i = 0; i < 6; i++) {
            const x = 1680 + i * 47;
            plate(g, x - 14, 341, 28, 99, 8);
            rect(g, x - 10, 359, 20, 60, 4); g.fillStyle = rgba(this.colors[i], upgraded ? .72 : .08); g.fill();
            line(g, [[x - 7, 365], [x - 7, 409]], '#ffffff47', 2);
            tube(g, [[x, 440], [x, 468], [1800, 484]], false, 4);
            lamp(g, x, 347, hex(this.colors[i]), upgraded, 3);
          }
          if (!upgraded) { text(g, 'INFUSION UPGRADE', 1800, 320, 12, '#a79170', 'center'); }
          plate(g, 1748, 466, 104, 40, 5, true);
        }
        for (const x of [1714, 1886]) {
          plate(g, x - 8, y - 78, 16, 156, 4);
          for (let yy = y - 63; yy < y + 70; yy += 19) line(g, [[x - 5, yy], [x + 5, yy]], '#d9eefb40', 2);
        }
        const piston = busy ? Math.sin(Math.PI * p) * 24 : 0;
        plate(g, 1786, y - 89, 28, 30 + piston, 3, true);
        plate(g, 1770, y - 65 + piston, 60, 12, 4, true);
        gear(g, 1980, y + 84, 38, 18, busy ? sim.t * 1.8 : 0, true);
        lamp(g, 1916, y - 60, upgraded ? '#72decf' : '#d4b37e', busy);
      } else {
        circle(g, 1800, y, 94); g.strokeStyle = '#9fbed274'; g.lineWidth = 5; g.stroke();
        circle(g, 1800, y, 84); g.strokeStyle = busy ? rgba(col, .7) : '#83beca30'; g.lineWidth = 3; g.stroke();
        g.beginPath(); g.arc(1800, y, 79, -2.6, -1.1); g.strokeStyle = '#efffff68'; g.lineWidth = 5; g.stroke();
        if (busy && upgraded) {
          g.save(); g.globalCompositeOperation = 'screen';
          for (let i = 0; i < 3; i++) {
            const a = sim.t * 1.9 + i * TAU / 3;
            g.beginPath(); g.ellipse(1800, y, 61, 18, a, 0, TAU); g.strokeStyle = rgba(col, .22 + .22 * Math.sin(Math.PI * p)); g.lineWidth = 2.4; g.stroke();
          }
          g.restore();
        }
      }
    }
    _inspector(g, front = false) {
      const sim = this.sim, st = sim.stations?.inspect, busy = !!st?.ball, p = st?.progress || 0;
      if (!front) {
        feet(g, 2315, 755, 269);
        plate(g, 2315, 464, 269, 290, 14);
        rect(g, 2343, 499, 214, 196, 14); g.fillStyle = '#06101a'; g.fill(); g.strokeStyle = '#82b2ca40'; g.lineWidth = 2; g.stroke();
        machineLabel(g, '05', 'OPTICAL CONTROL', 2306, 407, 'Scan · verify · colour sort');
        for (const x of [2329, 2570]) for (const y of [480, 738]) bolt(g, x, y, 5, true);
        plate(g, 2362, 430, 176, 26, 5); text(g, 'QUALITY ASSURED', 2450, 444, 11, '#b6cdc9', 'center', 600);
        lamp(g, 2351, 721, '#79dfba', busy); text(g, busy ? 'ANALYSING' : 'READY', 2371, 721, 14, '#90b8af');
        if (st?.ball?.material === 'steel' || sim.cfg.material === 'steel') {
          g.beginPath(); g.arc(2450, 547, 43, Math.PI, TAU); g.strokeStyle = '#b89c6a'; g.lineWidth = 18; g.stroke();
          plate(g, 2398, 539, 18, 25, 3); plate(g, 2484, 539, 18, 25, 3); text(g, 'MAGNETIC', 2450, 486, 10, '#a99573', 'center');
        }
      } else {
        line(g, [[2354, 516], [2354, 682]], '#d0efff38', 3);
        if (busy) {
          const x = 2366 + 169 * ((p * 2) % 1);
          g.save(); g.shadowColor = '#80eeeb'; g.shadowBlur = 17;
          line(g, [[x, 521], [x, 679]], '#8df7e3', 2);
          rect(g, x - 17, 521, 34, 158); g.fillStyle = '#70e8cf12'; g.fill(); g.restore();
          for (let i = 0; i < 4; i++) line(g, [[2470, 531 + i * 9], [2490 + (i % 3) * 13, 531 + i * 9]], '#89d9bf77', 2);
        }
        for (const [x, y, sx, sy] of [[2370, 530, 1, 1], [2530, 530, -1, 1], [2370, 670, 1, -1], [2530, 670, -1, -1]]) line(g, [[x, y + sy * 12], [x, y], [x + sx * 12, y]], '#86aeaf', 2);
      }
    }
    _bins(g, front = false) {
      const sim = this.sim;
      if (!front) {
        machineLabel(g, '06', 'THE COLLECTION', 4810, 457, 'Finished products · sorted with precision');
        feet(g, 4790, 1385, 1200, 1420);
        plate(g, 4790, 1380, 1200, 28, 6);
      }
      for (let i = 0; i < 6; i++) {
        const x = 4900 + i * 200, col = this.colors[i];
        const current = sim.balls.find(b => b.state === 'sorting' && b.bin === i && b.x > x - 55);
        if (!front) {
          tube(g, [[x, 650], [x, 955]], false);
          rect(g, x - 90, 943, 180, 435, 10); g.fillStyle = linear(g, x - 90, 943, x + 90, 1378, [[0, rgba(col, .06)], [.4, '#081521'], [1, rgba(col, .08)]]); g.fill();
          g.strokeStyle = '#a1cbd13b'; g.lineWidth = 2; g.stroke();
          plate(g, x - 92, 931, 184, 22, 5);
          plate(g, x - 92, 1371, 184, 14, 4);
          lamp(g, x, 903, hex(col), !!current, 5);
          gear(g, x + 27, 676, 15, 10, current ? sim.t * 2 : .4, true);
          text(g, String(sim.stats.sorted[i]).padStart(2, '0'), x, 1444, 24, '#c1d8dc', 'center', 600);
          line(g, [[x - 35, 1420], [x + 35, 1420]], rgba(col, .8), 3);
          for (const y of [771, 855]) collar(g, x, y, true);
        } else {
          tube(g, [[x, 650], [x, 955]], true);
          g.save(); g.translate(x, 670); g.rotate(current ? -.65 : .04); plate(g, -27, -4, 54, 8, 3, true); g.restore();
          line(g, [[x - 82, 958], [x - 82, 1367]], '#d7f5ff6b', 2);
          line(g, [[x - 73, 965], [x - 73, 1362]], '#ccf0ff12', 7);
          line(g, [[x + 82, 958], [x + 82, 1367]], '#97c8d44d', 2);
          rect(g, x - 87, 955, 174, 418, 6); g.fillStyle = '#d3f5ff06'; g.fill();
          for (let y = 980; y < 1355; y += 32) line(g, [[x + 65, y], [x + 80, y]], '#b7d0de55', 1);
        }
      }
    }
    _annealer(g, lane, front = false) {
      const sim = this.sim, y = lane ? 1050 : 650, st = sim.stations?.anneal?.[lane], busy = !!st?.ball;
      const heat = st?.ball?.temperature || 0;
      if (!front) {
        plate(g, 3548, y - 112, 216, 245, 16);
        rect(g, 3568, y - 91, 176, 171, 50); g.fillStyle = '#07121c'; g.fill();
        if (!lane) { machineLabel(g, '04', 'THERMAL STABILISATION', 3400, 395, 'Controlled annealing · cooling buffer'); feet(g, 3548, y + 134, 282); }
        for (const x of [3562, 3750]) for (const yy of [y - 97, y + 116]) bolt(g, x, yy, 5, true);
        for (const x of [3595, 3618, 3641, 3664, 3687, 3710]) {
          g.beginPath(); g.ellipse(x, y, 20, 71, 0, 0, TAU); g.strokeStyle = heat > .1 ? `rgba(233,${Math.round(138 + 70 * (1 - heat))},109,${.35 + .4 * heat})` : '#7498a75c'; g.lineWidth = 6; g.stroke();
        }
        plate(g, 3777, y - 54, 67, 101, 8);
        for (let i = 0; i < 7; i++) line(g, [[3789, y - 40 + i * 12], [3832, y - 40 + i * 12]], '#08141f', 4);
        gear(g, 3810, y + 94, 31, 14, busy ? sim.t * 3.2 : 0);
        lamp(g, 3741, y + 98, heat > .25 ? '#ffc382' : '#8dded6', busy);
        text(g, busy ? 'COOLING' : 'READY', 3650, y + 107, 12, '#9cbcc6', 'center', 600);
      } else {
        rect(g, 3568, y - 91, 176, 171, 50); g.strokeStyle = '#b1d6e153'; g.lineWidth = 3; g.stroke();
        line(g, [[3581, y - 49], [3581, y + 38]], '#e2f7ff47', 4);
        if (busy) {
          g.save(); g.globalCompositeOperation = 'screen';
          const glow = g.createRadialGradient(3650, y, 14, 3650, y, 72); glow.addColorStop(0, `rgba(244,177,91,${heat * .15})`); glow.addColorStop(1, '#ffd18a00');
          g.fillStyle = glow; g.fillRect(3576, y - 74, 148, 148); g.restore();
        }
      }
    }
    _servicePlant(g) {
      // Physical support equipment around the long manufacturing line, kept behind the marbles.
      const t = this.sim.completedAt == null ? this.sim.t : this.sim.completedAt;
      // The overhead drive turns the long conveyor through its visible chain transmission.
      plate(g, 1915, 468, 183, 90, 13);
      for (let i = 0; i < 10; i++) line(g, [[1931 + i * 14, 484], [1931 + i * 14, 540]], '#0b1722', 5);
      line(g, [[2070, 514], [2070, 697]], '#0b1520', 7);
      line(g, [[2124, 514], [2124, 697]], '#0b1520', 7);
      for (let y = 519 + ((t * 30) % 13); y < 687; y += 13) {
        line(g, [[2067, y], [2073, y]], '#96a6aa', 3);
        line(g, [[2121, 1206 - y], [2127, 1206 - y]], '#96a6aa', 3);
      }
      gear(g, 2097, 514, 34, 18, t * 2.1, true); gear(g, 2097, 697, 34, 18, t * 2.1);
      lamp(g, 1934, 477, '#94c4af', this.sim.completedAt == null, 4);
      text(g, 'CONVEYOR DRIVE', 1950, 452, 12, '#7f9ba8');
      // Insulated coolant vessel and its manifold feed the annealing coils.
      plate(g, 3250, 358, 102, 173, 34);
      plate(g, 3240, 380, 122, 15, 5); plate(g, 3240, 490, 122, 15, 5);
      rect(g, 3292, 403, 17, 68, 4); g.fillStyle = '#0a2638'; g.fill();
      rect(g, 3295, 420, 11, 47, 2); g.fillStyle = '#6dc7d360'; g.fill();
      line(g, [[3297, 409], [3297, 466]], '#d0f6ff6a', 2);
      tube(g, [[3352, 442], [3452, 442], [3452, 530], [3600, 530]], false, 9);
      gear(g, 3452, 442, 20, 10, .4, true);
      for (const x of [1910, 2170]) {
        feet(g, x - 72, 1250, 144, 1420);
        plate(g, x - 72, 1110, 144, 140, 16);
        circle(g, x, 1163, 36); g.fillStyle = '#06131f'; g.fill(); g.strokeStyle = '#8ba5b5'; g.lineWidth = 4; g.stroke();
        for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; line(g, [[x + Math.cos(a) * 27, 1163 + Math.sin(a) * 27], [x + Math.cos(a) * 31, 1163 + Math.sin(a) * 31]], '#a8bfcd', 1); }
        const a = -.7 + Math.sin(t * .28 + x) * .12;
        line(g, [[x, 1163], [x + Math.cos(a) * 24, 1163 + Math.sin(a) * 24]], '#ddb47b', 2); bolt(g, x, 1163, 3, true);
        text(g, x < 2000 ? 'PRESSURE' : 'COOLANT', x, 1220, 12, '#94a8b4', 'center');
      }
      tube(g, [[1910, 1110], [1910, 1010], [1500, 1010]], false, 9);
      tube(g, [[2170, 1110], [2170, 1280], [3430, 1280], [3430, 1030]], false, 9);
      for (let x = 2310; x < 3300; x += 180) collar(g, x, 1280);
      plate(g, 3070, 1130, 202, 110, 12);
      for (let i = 0; i < 8; i++) line(g, [[3090 + i * 22, 1148], [3090 + i * 22, 1218]], '#0c1724', 5);
      gear(g, 3109, 1190, 27, 13, -t * 1.7, true); lamp(g, 3250, 1150, '#82bba5', this.sim.level >= 2);
      for (const x of [1690, 2440, 3980]) {
        plate(g, x, 270, 152, 123, 10);
        text(g, 'CONTROL', x + 16, 288, 10, '#a6bcc6');
        rect(g, x + 15, 306, 122, 41, 3); g.fillStyle = '#07131d'; g.fill();
        for (let i = 0; i < 11; i++) line(g, [[x + 22 + i * 10, 339], [x + 22 + i * 10, 332 - 15 * Math.abs(Math.sin(i * .8 + t * .25))]], '#729d92', 4);
        for (let i = 0; i < 3; i++) lamp(g, x + 27 + i * 46, 371, i === 1 ? '#d8b778' : '#78bdad', i !== 1 || this.sim.level > 0, 4);
        tube(g, [[x + 75, 393], [x + 75, 440], [x + 180, 440], [x + 180, 550]], false, 5);
      }
    }
    _marble(g, b) {
      const raw = b.state === 'raw' || b.polish < .02;
      const p = b.polish || 0, coat = b.coating || 0, col = this.colors[b.color] || 0x6edee5;
      const r = b.displayR || b.r || 22, material = b.material || 'glass';
      g.save(); g.translate(b.x, b.y);
      const rubber = material === 'rubber';
      if (rubber && (b.state === 'polishing' || b.state === 'finished')) {
        const amount = b.state === 'polishing' ? Math.sin(p * Math.PI) * .16 : (b.finishedAt != null ? Math.max(0, 1 - (this.sim.t - b.finishedAt) * 1.1) * Math.sin((this.sim.t - b.finishedAt) * 18) * .14 : 0);
        g.scale(1 + amount, 1 - amount);
      }
      g.beginPath(); g.ellipse(4, r * .87, r * 1.12, r * .34, 0, 0, TAU); g.fillStyle = '#0006'; g.fill();
      circle(g, 0, 0, r);
      if (material === 'steel') g.fillStyle = linear(g, -r, -r, r, r, [[0, '#f2f0d9'], [.19, '#91a3b0'], [.37, '#e2eff0'], [.46, '#485d6b'], [.58, '#172c3c'], [.77, '#b7c7ca'], [1, '#455764']]);
      else if (rubber) g.fillStyle = radial(g, 0, 0, r, [[0, coat > .2 ? rgba(col, 1) : '#97a2a1'], [.6, coat > .2 ? rgba(col, .85) : '#677873'], [1, '#283d43']]);
      else if (raw) g.fillStyle = radial(g, 0, 0, r, [[0, '#cad6d4'], [.4, '#93aaa9'], [.8, '#577682'], [1, '#354f5d']]);
      else g.fillStyle = radial(g, 0, 0, r, [[0, '#c8f4fa88'], [.3, coat > .05 ? rgba(col, .5) : '#7bc9db44'], [.64, '#143c568c'], [.86, coat > .05 ? rgba(col, .8) : '#97e7f1ad'], [1, '#e1fcffb3']]);
      g.fill(); g.strokeStyle = material === 'glass' && !raw ? '#d5f8ff99' : '#07121e80'; g.lineWidth = .9; g.stroke();
      g.save(); circle(g, 0, 0, r - 1); g.clip();
      if (material === 'glass' && coat > .02) {
        g.globalAlpha = coat;
        g.rotate(b.rot || 0);
        const pattern = b.finishLevel === 0 ? 'clear' : (b.pattern || this.sim.cfg.product);
        if (pattern === 'pearl') {
          circle(g, 0, 0, r * .46); g.fillStyle = radial(g, 0, 0, r * .47, [[0, '#fffde9'], [.4, rgba(col, .98)], [1, rgba(col, .12)]]); g.fill();
        } else if (pattern !== 'clear') {
          for (let i = 0; i < 3; i++) {
            g.save(); g.rotate(i * TAU / 3);
            g.beginPath(); g.moveTo(-r * .83, -r * .28); g.bezierCurveTo(-r * .17, -r * .63, r * .17, r * .61, r * .87, r * .23); g.bezierCurveTo(r * .11, r * .18, -r * .05, -r * .1, -r * .83, -r * .28);
            g.fillStyle = i === 1 ? '#ffffff8a' : rgba(col, .94); g.fill(); g.restore();
          }
        } else { circle(g, 0, 0, r * .8); g.fillStyle = rgba(col, .18); g.fill(); }
      }
      if (raw) {
        for (let i = 0; i < 9; i++) { const a = i * 2.399 + b.id, rr = r * Math.sqrt((i + 1) / 11); circle(g, Math.cos(a) * rr, Math.sin(a) * rr, 1.2); g.fillStyle = '#dcece446'; g.fill(); }
      }
      if (material === 'steel' && coat > .2) { g.rotate(b.rot || 0); line(g, [[-r, -r * .25], [r, -r * .25]], rgba(col, .8), r * .25); }
      g.restore();
      if (!rubber) {
        g.beginPath(); g.ellipse(-r * .32, -r * .4, r * .32, r * .15, -.55, 0, TAU); g.fillStyle = raw ? '#ffffff69' : '#ffffffd9'; g.fill();
        g.beginPath(); g.arc(0, 0, r * .78, .15, 1.3); g.strokeStyle = '#d9f7ff7d'; g.lineWidth = 1.6; g.stroke();
        circle(g, r * .38, r * .35, r * .085); g.fillStyle = '#e8fbff9c'; g.fill();
      } else { g.beginPath(); g.ellipse(-r * .28, -r * .34, r * .29, r * .18, -.55, 0, TAU); g.fillStyle = '#ffffff15'; g.fill(); }
      g.restore();
    }
    _world(g) {
      const sim = this.sim, active = sim.completedAt == null, t = active ? sim.t : sim.completedAt;
      g.drawImage(this.background, 0, 0);
      this._servicePlant(g);
      const at = (x, y, fn) => { g.save(); g.translate(x, y); fn(); g.restore(); };
      at(200, 50, () => this._hopper(g));
      belt(g, 750, 1370, 650, t); belt(g, 1630, 2650, 650, t); belt(g, 2950, 3150, 650, t);
      const cool = (y) => [[3150, y], [3200, y + 100], [3500, y + 100], [3550, y], [3568, y]];
      tube(g, cool(650));
      belt(g, 3780, 4244, 650, t); tube(g, [[4535, 650], [5900, 650]]);
      for (const x of [4612, 4740, 5010, 5210, 5410, 5610, 5810]) collar(g, x, 650);
      at(450, 50, () => this._polisher(g, 0)); at(1000, 50, () => this._coater(g, 0));
      this._annealer(g, 0); at(1950, 50, () => this._inspector(g)); this._bins(g);
      if (sim.level >= 2) {
        const event = sim.milestones?.find(e => e.type === 'parallel'), reveal = event ? smooth((sim.t - event.time) / 3) : 1;
        g.save(); g.globalAlpha = .25 + .75 * reveal; g.translate(0, (1 - reveal) * 24);
        tube(g, [[1180, 650], [1230, 1050], [1380, 1050]]);
        belt(g, 1630, 2650, 1050, t); belt(g, 2950, 3150, 1050, t); tube(g, cool(1050));
        tube(g, [[3750, 1050], [3950, 1050], [4050, 650]]);
        at(450, 210, () => this._polisher(g, 1)); at(1000, 210, () => this._coater(g, 1)); this._annealer(g, 1);
        g.restore();
      } else {
        g.save(); g.setLineDash([12, 9]);
        rect(g, 1300, 965, 2584, 160, 12); g.strokeStyle = '#84a1ad2a'; g.lineWidth = 2; g.stroke();
        line(g, [[1328, 1045], [3852, 1045]], '#84a1ad20', 2); g.setLineDash([]);
        text(g, 'RESERVED FOR PARALLEL PRODUCTION', 2592, 1004, 16, '#647b89', 'center', 600);
        text(g, 'Capacity expands as the order progresses', 2592, 1085, 14, '#4f6675', 'center');
        g.restore();
      }
      let rawDrawn = 0;
      for (const b of sim.balls) {
        if (b.state === 'raw' && rawDrawn++ >= 30) continue;
        this._marble(g, b);
      }
      at(200, 50, () => this._hopper(g, true)); at(450, 50, () => this._polisher(g, 0, true)); at(1000, 50, () => this._coater(g, 0, true));
      this._annealer(g, 0, true); at(1950, 50, () => this._inspector(g, true)); this._bins(g, true);
      tube(g, [[4535, 650], [5900, 650]], true); tube(g, cool(650), true);
      if (sim.level >= 2) {
        at(450, 210, () => this._polisher(g, 1, true)); at(1000, 210, () => this._coater(g, 1, true)); this._annealer(g, 1, true);
        tube(g, [[1180, 650], [1230, 1050], [1380, 1050]], true); tube(g, [[3750, 1050], [3950, 1050], [4050, 650]], true); tube(g, cool(1050), true);
        collar(g, 1239, 1050); collar(g, 4050, 650);
      }
    }
    _hud(g, camera) {
      const { w, h } = this.world, sim = this.sim, portrait = h > w, pad = portrait ? 60 : 54;
      const scrim = g.createLinearGradient(0, 0, 0, portrait ? 160 : 142);
      scrim.addColorStop(0, '#06111bf2'); scrim.addColorStop(.65, '#06111bdb'); scrim.addColorStop(1, '#06111b00');
      g.fillStyle = scrim; g.fillRect(0, 0, w, portrait ? 160 : 142);
      const complete = sim.completedAt != null, total = sim.orderSize || sim.cfg.orderSize, done = sim.stats.completed;
      const stage = complete ? 'ORDER COMPLETE' : sim.level >= 2 ? '03  /  PARALLEL PRODUCTION' : sim.level >= 1 ? '02  /  COLOUR & CHARACTER' : '01  /  THE FIRST BATCH';
      text(g, 'SIMCASCADE / GLASSWORKS', pad, 46, portrait ? 19 : 16, '#b7cbd3', 'left', 600);
      text(g, stage, pad, portrait ? 87 : 81, portrait ? 17 : 14, complete ? '#93dfb8' : '#cdb385', 'left', 500);
      text(g, `${String(done).padStart(3, '0')} / ${total}`, w - pad, portrait ? 51 : 45, portrait ? 28 : 25, '#e1eeed', 'right', 500);
      text(g, 'FINISHED MARBLES', w - pad, portrait ? 84 : 78, portrait ? 12 : 11, '#819ba8', 'right', 600);
      const bw = portrait ? 190 : 180, bx = w - pad - bw, by = portrait ? 106 : 99;
      rect(g, bx, by, bw, 4, 2); g.fillStyle = '#627f8e30'; g.fill();
      rect(g, bx, by, bw * clamp(done / total, 0, 1), 4, 2); g.fillStyle = complete ? '#8edfb5' : '#c5ac7e'; g.fill();
      const latest = [...(sim.milestones || [])].reverse().find(e => sim.t >= e.time && sim.t - e.time < 11);
      if (latest && latest.type !== 'complete') {
        const fade = Math.min(smooth((sim.t - latest.time) / 2), 1 - smooth((sim.t - latest.time - 8) / 3));
        g.save(); g.globalAlpha = fade;
        const yy = portrait ? 148 : 139;
        text(g, latest.type === 'parallel' ? 'CAPACITY UPGRADE  ·  SECOND LINE ONLINE' : 'INFUSION UPGRADE  ·  COLOUR IN MOTION', w / 2, yy, portrait ? 18 : 17, '#dfc899', 'center', 500);
        g.restore();
      }
      this._overviewStrip(g, camera, portrait ? h - 210 : h - 93, portrait ? 146 : 51);
      text(g, complete ? 'Every sphere accounted for. A collection complete.' : `${(sim.cfg.material || 'glass').toUpperCase()}  /  ${(sim.cfg.product || 'swirl').toUpperCase()}  /  SEED ${sim.cfg.seed ?? '—'}`, pad, h - (portrait ? 27 : 20), portrait ? 16 : 13, '#7f9aa8');
      text(g, sim.cfg.cameraMode === 'manual' ? 'MANUAL CAMERA' : sim.cfg.cameraMode === 'overview' ? 'FACTORY OVERVIEW' : 'AUTOMATIC CAMERA', w - pad, h - (portrait ? 27 : 20), portrait ? 12 : 11, '#607d8e', 'right');
    }
    _overviewStrip(g, camera, y, height) {
      const { w, h } = this.world, portrait = h > w, x = portrait ? 58 : 54, width = w - 2 * x;
      const mapX = x + 25, mapY = y + (portrait ? 67 : 18), mapW = width - 50, sx = mapW / W;
      rect(g, x, y, width, height, 12); g.fillStyle = '#08131bd6'; g.fill(); g.strokeStyle = '#85adba24'; g.lineWidth = 1; g.stroke();
      if (portrait) text(g, 'PRODUCTION FLOW', x + 23, y + 25, 12, '#748e9a', 'left', 600);
      line(g, [[mapX + 600 * sx, mapY], [mapX + 5900 * sx, mapY]], '#4b6d7e', 2);
      if (this.sim.level >= 2) line(g, [[mapX + 1180 * sx, mapY], [mapX + 1300 * sx, mapY + 17], [mapX + 3950 * sx, mapY + 17], [mapX + 4050 * sx, mapY]], '#50867f', 2);
      const stages = [[500, 'RAW'], [1500, 'POLISH'], [2800, 'INFUSE'], [3650, 'ANNEAL'], [4400, 'VERIFY'], [5400, 'COLLECT']];
      for (const [xx, label] of stages) {
        circle(g, mapX + xx * sx, mapY, portrait ? 5 : 4); g.fillStyle = '#c5b080'; g.fill();
        text(g, label, mapX + xx * sx, mapY + (portrait ? 42 : 22), portrait ? 13 : 11, '#8ca5ae', 'center', 600);
      }
      const left = clamp(camera.x - this.world.w / camera.zoom / 2, 0, W), right = clamp(camera.x + this.world.w / camera.zoom / 2, 0, W);
      rect(g, mapX + left * sx, mapY - 13, Math.max(8, (right - left) * sx), 31, 5); g.strokeStyle = '#aad3d35c'; g.lineWidth = 1; g.stroke();
      for (const b of this.sim.balls) if (b.state !== 'raw' && b.state !== 'finished') {
        circle(g, mapX + b.x * sx, mapY + (b.lane ? 17 : 0), 2); g.fillStyle = hex(this.colors[b.color]); g.fill();
      }
    }
    paint(g) {
      const { w, h } = this.world, portrait = h > w;
      g.fillStyle = linear(g, 0, 0, 0, h, [[0, '#07111a'], [.5, '#11222e'], [1, '#060e16']]); g.fillRect(0, 0, w, h);
      const camera = cameraAt(this.sim, this.world, this.view);
      this.camera = camera;
      const cy = portrait ? h * .51 : h * .525;
      g.save();
      g.translate(w / 2, cy); g.scale(camera.zoom, camera.zoom); g.translate(-camera.x, -camera.y);
      this._world(g); g.restore();
      // Lens-edge falloff avoids hard world edges while keeping all machinery readable.
      const vignette = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .2, w / 2, h / 2, Math.max(w, h) * .8);
      vignette.addColorStop(0, '#02080e00'); vignette.addColorStop(1, '#02080e55'); g.fillStyle = vignette; g.fillRect(0, 0, w, h);
      if (this.view.hud) this._hud(g, camera);
    }
    destroy() { this.background.width = this.background.height = 1; super.destroy(); }
  }
  P.cameraAt = cameraAt;
  P.Renderer = ProductionRenderer;
})();
