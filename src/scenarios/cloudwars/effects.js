/*
 * Cloud Wars – Effekte zeichnen (Paket C3): Regen, Blitze, Feuer, Rauch, Brandflächen, Feuerwehr.
 * Alles aus Simulationszustand und Zeit (Seek-Regel). Die Brand-Textur wird aus dem Brandprotokoll aufgebaut und bei
 * einem Sprung zurück oder einer neuen Runde vollständig neu gezeichnet. Längen in GE, solange nichts anderes dasteht.
 */
(function () {
'use strict';
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
function h01(a, b, c) {
  let x = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1442695041)) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177); x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function radial(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return c;
}

class Effects {
  constructor({ radiusOf, storms, lift }) {
    this.radiusOf = radiusOf; this.S = storms; this.lift = lift;
    this.glow = radial([[0, 'rgba(255,190,90,0.9)'], [0.45, 'rgba(255,130,40,0.45)'], [1, 'rgba(255,90,20,0)']]);
    this.smoke = radial([[0, 'rgba(160,154,146,0.55)'], [0.5, 'rgba(176,170,162,0.3)'], [1, 'rgba(190,184,176,0)']]);
    this.flashSpr = radial([[0, 'rgba(225,235,255,0.85)'], [1, 'rgba(225,235,255,0)']]);
    this.scar = null; this.scarDone = 0; this.scarGen = -1;
  }
  destroy() { if (this.scar) this.scar.width = this.scar.height = 1; }

  /** Brandflächen aus dem Protokoll; px = Pixel je GE. */
  scarLayer(sim, px) {
    const a = sim.area, log = sim.burnLog;
    if (!this.scar || this.scarGen !== sim.burnGen || log.length < this.scarDone || this.scarPx !== px) {
      if (!this.scar) this.scar = document.createElement('canvas');
      this.scar.width = Math.ceil(a.w * px); this.scar.height = Math.ceil(a.h * px);
      this.scarDone = 0; this.scarGen = sim.burnGen; this.scarPx = px;
    }
    if (this.scarDone < log.length) {
      const g = this.scar.getContext('2d'), f = sim.fire;
      g.save(); g.scale(px, px);
      for (let n = this.scarDone; n < log.length; n++) {
        const e = log[n];
        if (e.s !== this.S.SCAR) continue;
        const cx = ((e.i % f.nx) + 0.5) * f.c, cy = (Math.floor(e.i / f.nx) + 0.5) * f.c;
        for (let k = 0; k < 4; k++) {
          const ox = (h01(e.i, k, 31) - 0.5) * 10, oy = (h01(e.i, k, 32) - 0.5) * 10, r = 7 + h01(e.i, k, 33) * 5;
          g.fillStyle = k === 0 ? 'rgba(46,36,28,0.82)' : 'rgba(62,50,38,0.6)';
          g.beginPath(); g.arc(cx + ox, cy + oy, r, 0, TAU); g.fill();
        }
        g.fillStyle = 'rgba(150,140,128,0.35)';
        for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(cx + (h01(e.i, k, 34) - 0.5) * 14, cy + (h01(e.i, k, 35) - 0.5) * 14, 1.6, 0, TAU); g.fill(); }
      }
      g.restore();
      this.scarDone = log.length;
    }
    return this.scar;
  }

  /** Feuer am Boden: Glut, flackernde Flammen, Brandkante. */
  drawFires(g, sim, night = 0) {
    const f = sim.fire, t = sim.t;
    g.globalCompositeOperation = 'lighter';
    for (const i of f.burning) {
      const cx = ((i % f.nx) + 0.5) * f.c, cy = (Math.floor(i / f.nx) + 0.5) * f.c, k = f.int[i];
      const fl = 0.75 + 0.25 * Math.sin(t * 13 + i * 1.7) * Math.sin(t * 7.3 + i);
      const r = (12 + 10 * night) * k * fl + 4;
      g.globalAlpha = clamp(0.75 + 0.25 * night, 0, 1) * k;
      g.drawImage(this.glow, cx - r, cy - r, r * 2, r * 2);
    }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    for (const i of f.burning) {
      const cx = ((i % f.nx) + 0.5) * f.c, cy = (Math.floor(i / f.nx) + 0.5) * f.c, k = f.int[i];
      for (let q = 0; q < 3; q++) {
        const ph = t * (5 + q) + h01(i, q, 41) * TAU, x = cx + (h01(i, q, 42) - 0.5) * 12, y = cy + (h01(i, q, 43) - 0.5) * 12;
        const r = (2.2 + 1.4 * Math.sin(ph)) * (0.5 + k * 0.6);
        g.fillStyle = q === 0 ? '#ffd36a' : q === 1 ? '#ff9b3d' : '#f26a2a';
        g.beginPath(); g.arc(x, y, Math.max(0.6, r), 0, TAU); g.fill();
      }
    }
  }

  /** Rauch steigt vom Brand auf und treibt mit dem Wind (aus der Zeit berechnet). */
  drawSmoke(g, sim) {
    const f = sim.fire, t = sim.t, w = sim.wind();
    for (const i of f.burning) {
      const cx = ((i % f.nx) + 0.5) * f.c, cy = (Math.floor(i / f.nx) + 0.5) * f.c, k = f.int[i];
      for (let q = 0; q < 3; q++) {
        const p = (h01(i, q, 51) + t / 3.5) % 1, r = 8 + p * 22;
        g.globalAlpha = 0.7 * (1 - p) * Math.min(1, k * 2);
        const x = cx + w.x * p * 3.2 + (h01(i, q, 52) - 0.5) * 8, y = cy + w.y * p * 3.2 - p * 22;
        g.drawImage(this.smoke, x - r, y - r, r * 2, r * 2);
      }
    }
    g.globalAlpha = 1;
  }

  /** Regen unter Gewitterwolken: Striche vom Wolkenboden zum Boden. */
  drawRain(g, sim) {
    const t = sim.t, w = sim.wind(), lift = this.lift;
    g.strokeStyle = 'rgba(205,220,240,0.55)'; g.lineWidth = 0.9; g.lineCap = 'round';
    g.beginPath();
    for (const c of sim.clouds) {
      if (!c.kind || c.dead || c.eat) continue;
      const R = this.radiusOf(c.mass), n = Math.round(14 + R * 0.35);
      for (let k = 0; k < n; k++) {
        const p = (h01(c.id, k, 61) + t * 1.9) % 1;
        const x = c.x + (h01(c.id, k, 62) - 0.5) * 1.4 * R + w.x * 0.15 * p, top = c.y - lift + R * 0.1 + (h01(c.id, k, 63) - 0.5) * R * 0.5;
        const y = lerp(top, top + lift + R * 0.2, p);
        g.moveTo(x, y); g.lineTo(x + w.x * 0.05, y + 5);
      }
    }
    g.stroke();
  }

  /** Feuerwehr mit Blaulicht und Wasserstrahl. */
  drawTrucks(g, sim) {
    const t = sim.t, f = sim.fire;
    for (const tr of sim.trucks) {
      if (tr.state === 'spray') {
        let best = null, bd = Infinity;
        for (const i of f.burning) {
          const cx = ((i % f.nx) + 0.5) * f.c, cy = (Math.floor(i / f.nx) + 0.5) * f.c, d = Math.hypot(cx - tr.x, cy - tr.y);
          if (d < bd) { bd = d; best = [cx, cy]; }
        }
        if (best && bd < 90) {
          g.strokeStyle = 'rgba(190,225,255,0.85)'; g.lineWidth = 1.3; g.setLineDash([3, 2.5]); g.lineDashOffset = -t * 40;
          const mx = (tr.x + best[0]) / 2, my = (tr.y + best[1]) / 2 - bd * 0.25;
          g.beginPath(); g.moveTo(tr.x, tr.y); g.quadraticCurveTo(mx, my, best[0], best[1]); g.stroke();
          g.setLineDash([]); g.lineDashOffset = 0;
        }
      }
      g.save(); g.translate(tr.x, tr.y); g.rotate(tr.ang);
      g.fillStyle = 'rgba(20,20,20,0.3)'; g.fillRect(-4.6, -1.6, 10, 4.6);
      g.fillStyle = '#d23a2a'; g.fillRect(-5.2, -2.2, 10.4, 4.4);
      g.fillStyle = '#f2f2f2'; g.fillRect(2.6, -2.2, 2.6, 4.4);
      const blink = Math.floor(t * 6) % 2;
      g.fillStyle = blink ? '#4aa3ff' : '#ff4a3a'; g.fillRect(0.6, -2.2, 1.6, 1.6);
      g.fillStyle = blink ? '#ff4a3a' : '#4aa3ff'; g.fillRect(0.6, 0.6, 1.6, 1.6);
      g.restore();
    }
  }

  boltPoints(b) {
    const rng = mulberry32(b.seed), lift = this.lift;
    const x0 = b.x0, y0 = b.y0 - lift, x1 = b.x1, y1 = b.y1 - (b.air ? lift : 0);
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, pts = [[x0, y0]];
    for (let s = 1; s < 9; s++) { const u = s / 9, j = (rng() - 0.5) * L * 0.16; pts.push([x0 + dx * u + nx * j, y0 + dy * u + ny * j]); }
    pts.push([x1, y1]);
    const br = [pts[4]];
    const ba = Math.atan2(dy, dx) + (rng() < 0.5 ? -0.7 : 0.7);
    for (let s = 1; s <= 3; s++) { const p = br[s - 1]; br.push([p[0] + Math.cos(ba) * L * 0.09 + (rng() - 0.5) * L * 0.05, p[1] + Math.sin(ba) * L * 0.09 + (rng() - 0.5) * L * 0.05]); }
    return { pts, br };
  }

  /** Blitze über den Wolken; k = logische Einheiten je GE (Linienbreiten in logischen Einheiten). */
  drawBolts(g, sim, k) {
    const t = sim.t, life = this.S.STORM.boltLife;
    g.globalCompositeOperation = 'lighter'; g.lineCap = g.lineJoin = 'round';
    for (const b of sim.bolts) {
      const age = t - b.t0;
      if (age < 0 || age > life || Math.floor(age * 22) % 3 === 2) continue;
      const al = 1 - age / life, { pts, br } = this.boltPoints(b);
      g.beginPath();
      for (const line of [pts, br]) line.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
      g.strokeStyle = `rgba(140,170,255,${0.4 * al})`; g.lineWidth = 9 / k; g.stroke();
      g.strokeStyle = `rgba(255,255,255,${al})`; g.lineWidth = 2.4 / k; g.stroke();
      const e = pts[pts.length - 1], r = 26;
      g.globalAlpha = al; g.drawImage(this.flashSpr, e[0] - r, e[1] - r, r * 2, r * 2); g.globalAlpha = 1;
    }
    g.globalCompositeOperation = 'source-over';
  }

  /** Kurzes Aufhellen des ganzen Bildes beim jüngsten Blitz (höchstens 12 %). */
  flash(sim) {
    let a = 0;
    for (const b of sim.bolts) { const age = sim.t - b.t0; if (age >= 0 && age < 0.15) a = Math.max(a, 0.12 * (1 - age / 0.15)); }
    return a;
  }
}

EBS.CloudWarsEffects = { Effects };
})();
