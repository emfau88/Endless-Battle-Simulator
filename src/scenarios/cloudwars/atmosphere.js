/*
 * Cloud Wars – Tageslicht, Nebel und Leben am Boden (Paket C4). Reine Darstellung, alles aus der Zeit berechnet:
 * Autos auf den Straßen, Boote auf den Seen, Vogelschwärme, Nebelbänke, Lichter der Dörfer und Fahrzeuge bei Nacht.
 * Längen in GE.
 */
(function () {
'use strict';
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
function h01(a, b, c) {
  let x = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1442695041)) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177); x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
function radial(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return c;
}
const CAR_COLORS = ['#e9e4da', '#3b5f8f', '#b8423a', '#2f3338', '#d9a441', '#6d8a5c', '#8c8f96'];

/** Punkt und Richtung auf einer Straße (Polylinie mit kumulierter Länge). */
function along(e, d, rev) {
  if (rev) d = e.len - d;
  const P = e.pts, C = e.cum;
  let s = 1;
  while (s < C.length - 1 && C[s] < d) s++;
  const u = clamp((d - C[s - 1]) / Math.max(0.001, C[s] - C[s - 1]), 0, 1);
  const ax = P[s * 2 - 2], ay = P[s * 2 - 1], bx = P[s * 2], by = P[s * 2 + 1];
  let ang = Math.atan2(by - ay, bx - ax);
  if (rev) ang += Math.PI;
  return [ax + (bx - ax) * u, ay + (by - ay) * u, ang];
}

class Atmosphere {
  constructor(sim) {
    const a = sim.area, T = EBS.CloudWarsTerrain;
    this.warm = radial([[0, 'rgba(255,214,140,1)'], [0.4, 'rgba(255,190,110,0.45)'], [1, 'rgba(255,170,90,0)']]);
    this.white = radial([[0, 'rgba(255,255,240,1)'], [0.4, 'rgba(255,250,220,0.4)'], [1, 'rgba(255,250,220,0)']]);
    this.red = radial([[0, 'rgba(255,70,50,1)'], [1, 'rgba(255,70,50,0)']]);
    this.fog = radial([[0, 'rgba(246,248,252,0.9)'], [0.55, 'rgba(246,248,252,0.45)'], [1, 'rgba(246,248,252,0)']]);
    // Häuser im Ausschnitt (Ortskoordinaten) für die Nachtlichter, einmal gesammelt
    this.houses = [];
    for (const v of T.villagesIn(a.x - 200, a.y - 200, a.x + a.w + 200, a.y + a.h + 200)) {
      for (const h of v.houses) if (h.x > a.x && h.y > a.y && h.x < a.x + a.w && h.y < a.y + a.h) this.houses.push({ x: h.x - a.x, y: h.y - a.y, k: this.houses.length });
    }
    // Autos: je Straße eins je angefangene 260 GE, höchstens 24
    this.cars = [];
    sim.roads.forEach((e, r) => {
      const n = Math.min(3, 1 + Math.floor(e.len / 260));
      for (let j = 0; j < n && this.cars.length < 24; j++) {
        this.cars.push({ r, s0: h01(r, j, 71), v: 20 + h01(r, j, 72) * 10, rev: h01(r, j, 73) < 0.5, col: CAR_COLORS[Math.floor(h01(r, j, 74) * CAR_COLORS.length)] });
      }
    });
    // Boote: Stellen, an denen ein Kreis von 40 GE ganz im Wasser liegt, mit Abstand zueinander; höchstens 4
    this.boats = [];
    const cells = sim.water.cells;
    for (let i = 0; i < cells.length && this.boats.length < 4; i += 2 * 7) {
      const x = cells[i], y = cells[i + 1];
      let ok = true;
      for (let q = 0; q < 12 && ok; q++) ok = sim.overWater(x + Math.cos(q / 12 * TAU) * 40, y + Math.sin(q / 12 * TAU) * 40);
      for (const b of this.boats) if (Math.hypot(b.x - x, b.y - y) < 160) ok = false;
      if (ok) this.boats.push({ x, y, r: 22 + h01(i, 1, 81) * 12, w: (h01(i, 2, 82) < 0.5 ? -1 : 1) * (0.1 + h01(i, 3, 83) * 0.06), p: h01(i, 4, 84) * TAU, sail: h01(i, 5, 85) < 0.6 });
    }
    this.flockDir = h01(sim.seed, 9, 91) * TAU;
  }

  drawCars(g, sim, night) {
    const t = sim.t;
    for (const c of this.cars) {
      const e = sim.roads[c.r], d = (c.s0 * e.len + c.v * t) % e.len;
      const [x0, y0, ang] = along(e, d, c.rev), x = x0 - Math.sin(ang) * 1.6, y = y0 + Math.cos(ang) * 1.6;
      g.save(); g.translate(x, y); g.rotate(ang);
      g.fillStyle = 'rgba(20,20,20,0.28)'; g.fillRect(-2, -0.6, 5, 2.6);
      g.fillStyle = c.col; g.fillRect(-2.4, -1.1, 4.8, 2.2);
      g.fillStyle = 'rgba(40,50,60,0.55)'; g.fillRect(0.4, -0.9, 1.2, 1.8);
      g.restore();
      c.x = x; c.y = y; c.ang = ang;
    }
  }

  drawBoats(g, sim) {
    const t = sim.t;
    for (const b of this.boats) {
      const a = b.p + b.w * t, x = b.x + Math.cos(a) * b.r, y = b.y + Math.sin(a) * b.r, dir = a + Math.sign(b.w) * Math.PI / 2;
      // Kielwasser: Bogen hinter dem Boot
      g.strokeStyle = 'rgba(235,245,250,0.5)'; g.lineWidth = 1.2;
      g.beginPath(); g.arc(b.x, b.y, b.r, a - Math.sign(b.w) * 0.9, a, b.w < 0); g.stroke();
      g.save(); g.translate(x, y); g.rotate(dir);
      g.fillStyle = 'rgba(10,30,40,0.25)'; g.beginPath(); g.ellipse(1, 1.5, 6, 2.2, 0, 0, TAU); g.fill();
      g.fillStyle = '#f4f1ea'; g.beginPath(); g.ellipse(0, 0, 6, 2.1, 0, 0, TAU); g.fill();
      if (b.sail) { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(-1.5, -0.3); g.lineTo(3, -0.3); g.lineTo(-1, -5); g.closePath(); g.fill(); }
      else { g.fillStyle = '#9c5a3c'; g.fillRect(-2, -1, 3, 2); }
      g.restore();
      b.lx = x; b.ly = y;
    }
  }

  /** Vogelschwarm: alle 45 s einer, quer durchs Bild. */
  drawBirds(g, sim) {
    const a = sim.area, period = 45, n = Math.floor(sim.t / period), u = (sim.t % period) / 30;
    if (u > 1) return;
    const dir = this.flockDir + (h01(n, 1, 92) - 0.5) * 1.2, cx = a.w / 2 + (h01(n, 2, 93) - 0.5) * a.w * 0.5, cy = a.h / 2 + (h01(n, 3, 94) - 0.5) * a.h * 0.5;
    const L = Math.hypot(a.w, a.h) * 0.75, x = cx + Math.cos(dir) * (u - 0.5) * 2 * L, y = cy + Math.sin(dir) * (u - 0.5) * 2 * L;
    g.strokeStyle = 'rgba(40,44,52,0.75)'; g.lineWidth = 0.9; g.lineCap = 'round';
    for (let k = 0; k < 6; k++) {
      const row = Math.ceil(k / 2), side = k % 2 ? 1 : -1;
      const bx = x - Math.cos(dir) * row * 7 + Math.cos(dir + Math.PI / 2) * side * row * 5, by = y - Math.sin(dir) * row * 7 + Math.sin(dir + Math.PI / 2) * side * row * 5;
      const flap = Math.sin(sim.t * 9 + k) * 1.2;
      g.save(); g.translate(bx, by); g.rotate(dir + Math.PI / 2);
      g.beginPath(); g.moveTo(-2.6, flap); g.lineTo(0, 0); g.lineTo(2.6, flap); g.stroke();
      g.restore();
    }
  }

  /** Nebelbänke treiben mit dem Wind; amount 0..1. */
  drawFog(g, sim, amount) {
    if (amount <= 0) return;
    const a = sim.area, w = sim.wind(), t = sim.t;
    g.fillStyle = `rgba(240,244,250,${0.22 * amount})`; g.fillRect(0, 0, a.w, a.h);   // leichter Dunst überall
    for (let k = 0; k < 16; k++) {
      const R = 160 + h01(k, 1, 101) * 180, span = a.w + 2 * R, spanY = a.h + 2 * R;
      const x = ((h01(k, 2, 102) * span + w.x * t * 0.8) % span + span) % span - R;
      const y = ((h01(k, 3, 103) * spanY + w.y * t * 0.8) % spanY + spanY) % spanY - R;
      g.globalAlpha = amount * (0.6 + 0.3 * h01(k, 4, 104));
      g.drawImage(this.fog, x - R, y - R * 0.6, R * 2, R * 1.2);
    }
    g.globalAlpha = 1;
  }

  /** Lichter bei Nacht: Fenster, Scheinwerfer, Rücklichter, Bootslaternen (nach dem Abdunkeln, additiv). */
  drawLights(g, sim, night) {
    if (night <= 0.05) return;
    g.globalCompositeOperation = 'lighter';
    for (const h of this.houses) {
      if (h01(h.k, 1, 111) > 0.25 + night * 0.65) continue;
      const fl = 0.85 + 0.15 * Math.sin(sim.t * 1.3 + h.k);
      g.globalAlpha = night * 0.75 * fl;
      g.drawImage(this.warm, h.x - 9, h.y - 9, 18, 18);
    }
    for (const c of this.cars) {
      if (c.x === undefined) continue;
      const fx = c.x + Math.cos(c.ang) * 7, fy = c.y + Math.sin(c.ang) * 7, bx = c.x - Math.cos(c.ang) * 3, by = c.y - Math.sin(c.ang) * 3;
      g.globalAlpha = night * 0.7; g.drawImage(this.white, fx - 6, fy - 6, 12, 12);
      g.globalAlpha = night * 0.6; g.drawImage(this.red, bx - 2.5, by - 2.5, 5, 5);
    }
    for (const b of this.boats) if (b.lx !== undefined) { g.globalAlpha = night * 0.8; g.drawImage(this.warm, b.lx - 5, b.ly - 5, 10, 10); }
    for (const tr of sim.trucks) {
      const blink = Math.floor(sim.t * 6) % 2;
      g.globalAlpha = 0.35 + 0.6 * night;
      g.drawImage(blink ? this.red : this.white, tr.x - 8, tr.y - 8, 16, 16);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }

  /** Tageslicht auf das ganze Bild (logische Einheiten). */
  tint(g, w, L) {
    const [r, gg, b] = L.mul.map((v) => Math.round(v));
    if (r < 255 || gg < 255 || b < 255) {
      g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgb(${r},${gg},${b})`; g.fillRect(0, 0, w.w, w.h);
      g.globalCompositeOperation = 'source-over';
    }
    if (L.glow[3] > 0.001) { g.fillStyle = `rgba(${L.glow.slice(0, 3).map(Math.round).join(',')},${L.glow[3]})`; g.fillRect(0, 0, w.w, w.h); }
  }
}

EBS.CloudWarsAtmosphere = { Atmosphere };
})();
