/*
 * Cloud Wars – Leben am Boden (Nutzerwunsch vom 18.11.: „mehr Liebe und Action vom Boden“). Reine Darstellung, alles
 * aus der Zeit berechnet (Seek-Regel), nichts verändert die Simulation:
 * Fluss strömt (helle Schlieren entlang der Flussmitte), Wellen auf Seen, Boote auf dem Fluss, ein Traktor oder Mähdrescher
 * bearbeitet ein Feld (die bearbeitete Fläche wächst mit der Zeit), Schafe und Kühe auf Weiden, Rauch aus Schornsteinen.
 * Längen in GE, Ortskoordinaten des Ausschnitts. Die Auswahl hängt nur vom Ausschnitt ab.
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
function radial(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return c;
}
// Startwerte (GE, Sekunden)
const LIFE = {
  flowSpeed: 7, flowLanes: [[-0.42, [12, 30]], [0, [20, 26]], [0.42, [9, 34]]],
  rippleEvery: 1, rippleShare: 0.55, ripplePeriod: 5.5,
  boatMinHalf: 7, boats: 3, boatSpeed: [7, 12],
  tractorSpeed: 7, rowWidth: 4.2, turnTime: 1.6, margin: 7,
  smokeEvery: 1.3, smokeLife: 4.6, smokeShare: 0.4,
};

/** Polylinie mit kumulierter Länge (für Strecke → Ort). */
function withLength(P, stride) {
  const n = P.length / stride, cum = new Float32Array(n);
  for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + Math.hypot(P[i * stride] - P[(i - 1) * stride], P[i * stride + 1] - P[(i - 1) * stride + 1]);
  return { P, stride, cum, len: cum[n - 1] };
}
/** Ort, Richtung und Index auf einer Polylinie bei Strecke d. */
function at(line, d) {
  const { P, stride, cum } = line;
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < d) lo = m; else hi = m; }
  const u = clamp((d - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]), 0, 1);
  const ax = P[lo * stride], ay = P[lo * stride + 1], bx = P[hi * stride], by = P[hi * stride + 1];
  return { x: lerp(ax, bx, u), y: lerp(ay, by, u), ang: Math.atan2(by - ay, bx - ax), i: lo, u };
}

class GroundLife {
  constructor(sim) {
    const a = sim.area, T = EBS.CloudWarsTerrain, salt = (a.x * 7 + a.y * 13) | 0;
    this.smokeImg = radial([[0, 'rgba(236,236,232,0.9)'], [0.5, 'rgba(228,228,224,0.45)'], [1, 'rgba(228,228,224,0)']]);
    this.dust = radial([[0, 'rgba(196,170,120,0.7)'], [1, 'rgba(196,170,120,0)']]);
    // Straßenpunkte (Ortskoordinaten) für Abstände
    const roadPts = [];
    for (const e of sim.roads) for (let i = 0; i < e.pts.length; i += 2) roadPts.push(e.pts[i], e.pts[i + 1]);
    const roadDist = (x, y) => { let d = Infinity; for (let i = 0; i < roadPts.length; i += 2) d = Math.min(d, Math.hypot(roadPts[i] - x, roadPts[i + 1] - y)); return d; };
    const houses = [];
    for (const v of T.villagesIn(a.x - 300, a.y - 300, a.x + a.w + 300, a.y + a.h + 300)) for (const h of v.houses) houses.push(h);
    const houseDist = (x, y) => { let d = Infinity; for (const h of houses) d = Math.min(d, Math.hypot(h.x - a.x - x, h.y - a.y - y)); return d; };

    // ---------- Flüsse: Mittellinie, Schlieren-Pfade, Abstand zu Brücken ----------
    this.rivers = T.riverLines(a).map((r) => {
      const n = r.pts.length / 4, line = withLength(r.pts, 4), bridge = new Float32Array(n);
      for (let i = 0; i < n; i++) bridge[i] = roadDist(r.pts[i * 4], r.pts[i * 4 + 1]);
      // Schlieren: drei Bahnen quer versetzt, unterbrochen an Seen, schmalen Stellen und Brücken
      const lanes = [];
      LIFE.flowLanes.forEach(([off, dash], li) => {
        let seg = null;
        for (let i = 0; i <= n; i++) {
          const q = i * 4, ok = i < n && !r.pts[q + 3] && r.pts[q + 2] > 4 && bridge[i] > 9;
          if (!ok) { if (seg && seg.length >= 8) lanes.push({ line: withLength(seg, 2), dash, phase: h01(salt, li, 3) * 40 }); seg = null; continue; }
          const j = Math.min(n - 1, i + 1), k = Math.max(0, i - 1), half = r.pts[q + 2];
          const tx = r.pts[j * 4] - r.pts[k * 4], ty = r.pts[j * 4 + 1] - r.pts[k * 4 + 1], tl = Math.hypot(tx, ty) || 1;
          (seg = seg || []).push(r.pts[q] - ty / tl * off * half, r.pts[q + 1] + tx / tl * off * half);
        }
      });
      return { line, half: (i) => r.pts[i * 4 + 2], lake: (i) => r.pts[i * 4 + 3], bridge, lanes };
    });

    // ---------- Wellen auf dem Wasser: an Wasserzellen (24 GE), leicht versetzt ----------
    this.ripples = [];
    const cells = sim.water.cells;
    for (let i = 0; i < cells.length; i += 2) for (let q = 0; q < LIFE.rippleEvery; q++) {
      if (h01(i, q, 200) > LIFE.rippleShare) continue;
      const x = cells[i] + (h01(i, q, 201) - 0.5) * 16, y = cells[i + 1] + (h01(i, q, 202) - 0.5) * 16;
      // nur auf Seen; auf dem Fluss zeigen die Schlieren die Bewegung
      if (!T.isLakeAt(a.x + x, a.y + y) || !T.isWaterAt(a.x + x + 5, a.y + y) || !T.isWaterAt(a.x + x - 5, a.y + y)) continue;
      this.ripples.push({ x, y, p: h01(i, q, 203), len: 2.6 + h01(i, q, 204) * 2.4, tilt: (h01(i, q, 205) - 0.5) * 0.16 });
    }

    // ---------- Boote auf dem Fluss: nur wo der Fluss breit genug ist ----------
    this.riverBoats = [];
    this.rivers.forEach((rv, ri) => {
      let wide = 0;
      for (let i = 0; i < rv.line.cum.length; i++) if (rv.half(i) >= LIFE.boatMinHalf && !rv.lake(i)) wide++;
      if (wide < 40) return;
      const n = Math.min(LIFE.boats - this.riverBoats.length, rv.line.len > 900 ? 2 : 1);
      for (let j = 0; j < n; j++) {
        const type = Math.floor(h01(salt + ri, j, 211) * 3), v = lerp(LIFE.boatSpeed[0], LIFE.boatSpeed[1], h01(salt + ri, j, 212));
        this.riverBoats.push({ ri, s0: h01(salt + ri, j, 213), v: (h01(salt + ri, j, 214) < 0.5 ? -1 : 1) * v * (type === 0 ? 0.7 : 1), type,
          col: ['#5b4636', '#f4f1ea', '#8b5a3c'][type], cargo: h01(salt + ri, j, 215) < 0.5 ? '#c9b58a' : '#8a9aa8' });
      }
    });

    // ---------- Felder mit Traktor oder Mähdrescher, Weiden mit Tieren ----------
    this.tractors = []; this.flocks = [];
    const seen = new Set(), G = 30, cand = [];
    for (let y = G / 2; y < a.h; y += G) for (let x = G / 2; x < a.w; x += G) cand.push([x, y, h01(salt, x | 0, (y | 0) + 221)]);
    cand.sort((p, q) => p[2] - q[2]);
    const inside = (x, y, m) => x > m && y > m && x < a.w - m && y < a.h - m;
    for (const [x, y] of cand) {
      if (this.tractors.length >= 2 && this.flocks.length >= 2) break;
      const g0 = T.groundAt(a.x + x, a.y + y);
      if (g0.kind === 'field' && this.tractors.length < 2 && !seen.has(g0.key)) {
        seen.add(g0.key);
        const cx = g0.cx - a.x, cy = g0.cy - a.y, ca = Math.cos(g0.ang), sa = Math.sin(g0.ang), m = LIFE.margin;
        const L = g0.len / 2 - m, W = g0.wid / 2 - m;
        if (!inside(cx, cy, 30) || L < 20 || W < 12) continue;
        // ganze Fläche Feld derselben Parzelle, keine Straße, kein Haus
        let ok = true;
        for (let iu = -3; iu <= 3 && ok; iu++) for (let iv = -2; iv <= 2 && ok; iv++) {
          const u = iu / 3 * L, v = iv / 2 * W, px = cx + u * ca - v * sa, py = cy + u * sa + v * ca;
          const gg = T.groundAt(a.x + px, a.y + py);
          ok = inside(px, py, 6) && gg.kind === 'field' && gg.key === g0.key && roadDist(px, py) > 10 && houseDist(px, py) > 14;
        }
        if (!ok || this.tractors.some((t) => Math.hypot(t.cx - cx, t.cy - cy) < 120)) continue;
        const grain = g0.pattern === 1, rows = Math.floor((2 * W) / LIFE.rowWidth);
        const rowTime = (2 * L) / LIFE.tractorSpeed, cycle = rows * (rowTime + LIFE.turnTime);
        this.tractors.push({ cx, cy, ang: g0.ang, L, W, rows, rowTime, cycle, t0: (0.25 + 0.4 * h01(salt, this.tractors.length, 231)) * cycle,
          grain, body: grain ? '#4f8a3a' : (h01(salt, this.tractors.length, 232) < 0.5 ? '#c0392b' : '#3f7d3a'),
          // bearbeitete Fläche: Getreide → Stoppeln, sonst gepflügt; im nächsten Durchgang frisch eingesät
          work: grain ? ['rgb(228,214,162)', 'rgb(168,138,96)'] : ['rgb(128,96,66)', 'rgb(146,174,96)'] });
        continue;
      }
      const pasture = g0.kind === 'meadow' || (g0.kind === 'field' && g0.pattern === 0);
      if (pasture && this.flocks.length < 2 && inside(x, y, 40) && roadDist(x, y) > 28 && houseDist(x, y) > 30) {
        let ok = true;
        for (let q = 0; q < 8 && ok; q++) { const gg = T.groundAt(a.x + x + Math.cos(q / 8 * TAU) * 20, a.y + y + Math.sin(q / 8 * TAU) * 20); ok = gg.kind === 'meadow' || (gg.kind === 'field' && gg.pattern === 0); }
        if (!ok || this.flocks.some((f) => Math.hypot(f.x - x, f.y - y) < 150)) continue;
        const k = this.flocks.length, cows = h01(salt, k, 241) < 0.4, n = cows ? 4 + Math.floor(h01(salt, k, 242) * 3) : 6 + Math.floor(h01(salt, k, 242) * 5);
        const animals = [];
        for (let i = 0; i < n; i++) animals.push({ ox: (h01(k, i, 243) - 0.5) * 30, oy: (h01(k, i, 244) - 0.5) * 24, p: h01(k, i, 245) * TAU, a0: h01(k, i, 246) * TAU, spot: h01(k, i, 247) < 0.5 });
        this.flocks.push({ x, y, cows, animals });
      }
    }

    // ---------- Schornsteine mit Rauch ----------
    this.chimneys = [];
    houses.forEach((h, i) => {
      if (h.chimney === null || h.chimney === undefined || h01(h.x | 0, h.y | 0, 251) > LIFE.smokeShare) return;
      const lx = h.chimney * h.w, ly = h.chimSide * h.d * 0.21, c = Math.cos(h.ang), s = Math.sin(h.ang);
      const x = h.x - a.x + lx * c - ly * s, y = h.y - a.y + lx * s + ly * c;
      if (inside(x, y, -10)) this.chimneys.push({ x, y, p: h01(i, 1, 252) * LIFE.smokeEvery });
    });
  }

  /** Wasser bewegt sich: Schlieren strömen den Fluss entlang, Wellchen auf Seen kommen und gehen. */
  drawWater(g, sim) {
    const t = sim.t;
    g.lineCap = 'round';
    // Schlieren: kurze Striche wandern die Bahnen entlang (aus der Zeit); je ein breiter, blasser Saum und ein schmaler Kern
    const streaks = new Path2D();
    for (const r of this.rivers) for (const ln of r.lanes) {
      const L = ln.line.len, gap = ln.dash[0] + ln.dash[1], shift = ((t * LIFE.flowSpeed + ln.phase) % gap + gap) % gap;
      for (let d0 = shift - gap; d0 < L; d0 += gap) {
        const a0 = Math.max(0, d0), a1 = Math.min(L, d0 + ln.dash[0]);
        if (a1 - a0 < 1) continue;
        const p0 = at(ln.line, a0), pm = at(ln.line, (a0 + a1) / 2), p1 = at(ln.line, a1);
        streaks.moveTo(p0.x, p0.y); streaks.quadraticCurveTo(2 * pm.x - (p0.x + p1.x) / 2, 2 * pm.y - (p0.y + p1.y) / 2, p1.x, p1.y);
      }
    }
    g.strokeStyle = 'rgba(228,242,246,0.07)'; g.lineWidth = 3.2; g.stroke(streaks);
    g.strokeStyle = 'rgba(228,242,246,0.16)'; g.lineWidth = 1.1; g.stroke(streaks);
    // Wellchen in vier Helligkeitsstufen gebündelt (wenige Zeichenaufrufe)
    const w = sim.wind(), buckets = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    for (const r of this.ripples) {
      const ph = (t / LIFE.ripplePeriod + r.p) % 1, s = Math.sin(ph * Math.PI), b = Math.min(3, Math.floor(s * s * 4));
      if (b === 0) continue;
      const x = r.x + w.x * 0.5 * ph, y = r.y + w.y * 0.5 * ph, L = r.len * (0.8 + 0.4 * ph), ty = r.tilt * L;
      buckets[b].moveTo(x - L, y + 0.6 - ty); buckets[b].quadraticCurveTo(x, y - 0.9, x + L, y + 0.6 + ty);
    }
    g.lineWidth = 0.6;
    for (let b = 1; b < 4; b++) { g.strokeStyle = `rgba(236,246,250,${0.12 * b})`; g.stroke(buckets[b]); }
  }

  /** Boote fahren den Fluss entlang; vor Brücken werden sie durchsichtig (fahren darunter durch). */
  drawRiverBoats(g, sim) {
    const t = sim.t;
    for (const b of this.riverBoats) {
      const r = this.rivers[b.ri], L = r.line.len, d = (((b.s0 * L + b.v * t) % L) + L) % L, p = at(r.line, d);
      const i = p.i, half = r.half(i), alpha = clamp((half - LIFE.boatMinHalf + 2) / 2, 0, 1) * clamp((r.bridge[i] - 5) / 6, 0, 1) * (r.lake(i) ? 0 : 1)
        * clamp(Math.min(d, L - d) / 20, 0, 1);
      b.lx = undefined;
      if (alpha <= 0.02) continue;
      const ang = p.ang + (b.v < 0 ? Math.PI : 0), len = b.type === 0 ? 12 : b.type === 1 ? 6.5 : 4.2, wid = b.type === 0 ? 3.8 : b.type === 1 ? 2.5 : 1.7;
      g.save(); g.translate(p.x, p.y); g.rotate(ang); g.globalAlpha = alpha;
      // Kielwasser: V hinter dem Heck
      g.strokeStyle = 'rgba(240,248,252,0.38)'; g.lineWidth = 0.7;
      const wl = b.type === 2 ? 5 : 10, ws = b.type === 0 ? 2.6 : 3.2;
      g.beginPath(); g.moveTo(-len / 2, -wid * 0.3); g.lineTo(-len / 2 - wl, -wid * 0.3 - ws); g.moveTo(-len / 2, wid * 0.3); g.lineTo(-len / 2 - wl, wid * 0.3 + ws); g.stroke();
      g.fillStyle = 'rgba(10,30,40,0.25)'; g.beginPath(); g.ellipse(0.8, 1.2, len / 2, wid / 2, 0, 0, TAU); g.fill();
      g.fillStyle = b.col;
      if (b.type === 0) {
        // Lastkahn: Rumpf, Ladung, Steuerhaus hinten
        g.beginPath(); g.roundRect(-len / 2, -wid / 2, len, wid, 1.4); g.fill();
        g.fillStyle = b.cargo; g.fillRect(-len / 2 + 3.6, -wid / 2 + 0.6, len - 5.6, wid - 1.2);
        g.strokeStyle = 'rgba(40,30,20,0.4)'; g.lineWidth = 0.3; g.beginPath(); g.moveTo(-len / 2 + 6.4, -wid / 2 + 0.6); g.lineTo(-len / 2 + 6.4, wid / 2 - 0.6); g.moveTo(-len / 2 + 9, -wid / 2 + 0.6); g.lineTo(-len / 2 + 9, wid / 2 - 0.6); g.stroke();
        g.fillStyle = '#ece6d8'; g.fillRect(-len / 2 + 0.7, -1.2, 2.4, 2.4);
      } else if (b.type === 1) {
        // Motorboot: weißer Rumpf mit Spitze, blaue Scheibe
        g.beginPath(); g.moveTo(len / 2, 0); g.quadraticCurveTo(len / 4, -wid / 2, -len / 2, -wid / 2); g.lineTo(-len / 2, wid / 2); g.quadraticCurveTo(len / 4, wid / 2, len / 2, 0); g.fill();
        g.fillStyle = '#3c5a6e'; g.fillRect(-0.2, -0.8, 1.1, 1.6);
        g.fillStyle = '#c84a3a'; g.fillRect(-len / 2, -0.25, len * 0.55, 0.5);
      } else {
        // Ruderboot mit Rudern im Takt
        g.beginPath(); g.ellipse(0, 0, len / 2, wid / 2, 0, 0, TAU); g.fill();
        const row = Math.sin(t * 3 + b.s0 * 9) * 0.6;
        g.strokeStyle = '#6b4a30'; g.lineWidth = 0.35; g.beginPath(); g.moveTo(row, -wid / 2); g.lineTo(row - 0.8, -wid / 2 - 2); g.moveTo(row, wid / 2); g.lineTo(row - 0.8, wid / 2 + 2); g.stroke();
      }
      g.restore();
      b.lx = p.x; b.ly = p.y;
    }
    g.globalAlpha = 1;
  }

  /** Traktor bzw. Mähdrescher fährt Bahn für Bahn; die bearbeitete Fläche ergibt sich aus der Zeit. */
  drawFields(g, sim) {
    const t = sim.t, rw = LIFE.rowWidth, per = LIFE.turnTime;
    for (const tr of this.tractors) {
      // Bahnen hin und her; jeder Durchgang beginnt dort, wo der vorige endete (gespiegelt), also kein Sprung
      const tt = t + tr.t0, cyc = Math.floor(tt / tr.cycle), tc = tt - cyc * tr.cycle, pr = tr.rowTime + per;
      const row = Math.min(tr.rows - 1, Math.floor(tc / pr)), f = tc - row * pr;
      const dir = (row + cyc * tr.rows) % 2 ? -1 : 1, vs = cyc % 2 ? -1 : 1, H = tr.rows * rw / 2, vRow = (r) => vs * (-H + rw / 2 + r * rw);
      let u, v, head;
      if (f < tr.rowTime) { u = dir * (-tr.L + (f / tr.rowTime) * 2 * tr.L); v = vRow(row); head = dir > 0 ? 0 : Math.PI; }
      else {
        const q = (f - tr.rowTime) / per;
        u = dir * tr.L + dir * Math.sin(q * Math.PI) * 2.5; v = row < tr.rows - 1 ? lerp(vRow(row), vRow(row + 1), q) : vRow(row);
        head = (dir > 0 ? 0 : Math.PI) + dir * vs * q * Math.PI;
      }
      g.save(); g.translate(tr.cx, tr.cy); g.rotate(tr.ang);
      // Fläche: im vorigen Durchgang ganz bearbeitet, im laufenden bis zur aktuellen Bahn; Bahnen leicht unterschiedlich hell
      const strip = (r, u0, u1, col) => { g.globalAlpha = r % 2 ? 0.62 : 0.78; g.fillStyle = col; g.fillRect(u0, vRow(r) - rw / 2, u1 - u0, rw); };
      if (cyc > 0) for (let r = 0; r < tr.rows; r++) strip(r, -tr.L, tr.L, tr.work[(cyc - 1) % 2]);
      for (let r = 0; r < row; r++) strip(r, -tr.L, tr.L, tr.work[cyc % 2]);
      if (f < tr.rowTime) strip(row, dir > 0 ? -tr.L : u, dir > 0 ? u : tr.L, tr.work[cyc % 2]);
      else strip(row, -tr.L, tr.L, tr.work[cyc % 2]);
      g.globalAlpha = 1;
      // Staub hinter dem Fahrzeug
      for (let k = 0; k < 4; k++) {
        const age = ((t * 1.7 + k / 4) % 1), r = 1.5 + age * 4;
        g.globalAlpha = 0.45 * (1 - age);
        g.drawImage(this.dust, u - Math.cos(head) * (4 + age * 7) - r, v - Math.sin(head) * (4 + age * 7) + (h01(k, 1, 261) - 0.5) * 2 - r, r * 2, r * 2);
      }
      g.globalAlpha = 1;
      g.translate(u, v); g.rotate(head); g.scale(1.35, 1.35);
      g.fillStyle = 'rgba(20,20,10,0.3)'; g.fillRect(-2.6, -1.2, 6, 3.2);
      if (tr.grain) {
        // Mähdrescher: breites Schneidwerk vorn, Korntank, Kabine
        g.fillStyle = '#d9c04a'; g.fillRect(3, -3.4, 1.3, 6.8);
        g.fillStyle = tr.body; g.fillRect(-3.4, -1.8, 6.6, 3.6);
        g.fillStyle = '#e8e6dc'; g.fillRect(1, -1.1, 1.8, 2.2);
        g.fillStyle = '#3d6a2e'; g.fillRect(-3, -1.3, 2.6, 2.6);
      } else {
        // Traktor: große Hinterräder, Motorhaube, Kabine
        g.fillStyle = '#222'; g.fillRect(-2.2, -2, 2, 0.7); g.fillRect(-2.2, 1.3, 2, 0.7); g.fillRect(1.6, -1.6, 1.2, 0.5); g.fillRect(1.6, 1.1, 1.2, 0.5);
        g.fillStyle = tr.body; g.fillRect(-2.4, -1.3, 5.6, 2.6);
        g.fillStyle = '#e8e6dc'; g.fillRect(-2, -1, 1.9, 2);
        g.fillStyle = '#5a5248'; g.fillRect(-5.2, -1.6, 2.2, 3.2);             // Pflug bzw. Egge
      }
      g.restore();
      tr.lx = tr.cx + Math.cos(tr.ang) * u - Math.sin(tr.ang) * v; tr.ly = tr.cy + Math.sin(tr.ang) * u + Math.cos(tr.ang) * v; tr.lang = tr.ang + head;
    }
  }

  /** Schafe und Kühe grasen und wandern langsam. */
  drawAnimals(g, sim) {
    const t = sim.t, sh = new Path2D(), white = new Path2D(), brown = new Path2D(), dark = new Path2D(), head = new Path2D();
    const ell = (p, x, y, rx, ry, a) => { p.moveTo(x + Math.cos(a) * rx, y + Math.sin(a) * rx); p.ellipse(x, y, rx, ry, a, 0, TAU); };
    for (const f of this.flocks) {
      const fx = f.x + Math.sin(t * 0.021 + f.x) * 6, fy = f.y + Math.cos(t * 0.017 + f.y) * 5;
      for (const an of f.animals) {
        const x = fx + an.ox + Math.sin(t * 0.09 + an.p) * 2.2, y = fy + an.oy + Math.cos(t * 0.07 + an.p * 1.3) * 1.8;
        const a = an.a0 + Math.sin(t * 0.05 + an.p) * 0.9, ca = Math.cos(a), sa = Math.sin(a);
        if (f.cows) {
          ell(sh, x + 0.7, y + 0.9, 2, 1.1, a); ell(an.spot ? white : brown, x, y, 2, 1.05, a);
          if (an.spot) ell(dark, x - 0.5 * ca - 0.2 * sa, y - 0.5 * sa + 0.2 * ca, 0.7, 0.5, a + 0.4);
          ell(an.spot ? dark : head, x + 2.1 * ca, y + 2.1 * sa, 0.6, 0.6, 0);
        } else {
          ell(sh, x + 0.6, y + 0.8, 1.6, 1.1, a); ell(white, x, y, 1.6, 1.1, a); ell(dark, x + 1.65 * ca, y + 1.65 * sa, 0.5, 0.5, 0);
        }
      }
    }
    g.fillStyle = 'rgba(20,30,10,0.3)'; g.fill(sh);
    g.fillStyle = '#f3f0e7'; g.fill(white);
    g.fillStyle = '#8a5a3a'; g.fill(brown);
    g.fillStyle = '#6a4228'; g.fill(head);
    g.fillStyle = '#2f2b28'; g.fill(dark);
  }

  /** Rauch aus Schornsteinen: Wölkchen steigen auf und treiben mit dem Wind. */
  drawChimneySmoke(g, sim) {
    const t = sim.t, w = sim.wind(), E = LIFE.smokeEvery, life = LIFE.smokeLife;
    for (const c of this.chimneys) {
      const n0 = Math.floor((t - c.p) / E);
      for (let j = 0; j * E < life; j++) {
        const born = (n0 - j) * E + c.p, age = t - born;
        if (age < 0 || age > life) continue;
        const q = age / life, r = 1.2 + q * 4.5;
        g.globalAlpha = 0.42 * (1 - q) * Math.min(1, age * 3);
        g.drawImage(this.smokeImg, c.x + w.x * age * 0.45 - r, c.y + w.y * age * 0.45 - age * 1.2 - r, r * 2, r * 2);
      }
    }
    g.globalAlpha = 1;
  }

  /** Lichter bei Nacht: Laternen der Flussboote, Scheinwerfer der Landmaschinen (nach dem Abdunkeln, additiv). */
  drawLights(g, sim, night, warm, white) {
    if (night <= 0.05) return;
    g.globalCompositeOperation = 'lighter';
    for (const b of this.riverBoats) if (b.lx !== undefined) { g.globalAlpha = night * 0.8; g.drawImage(warm, b.lx - 5, b.ly - 5, 10, 10); }
    for (const tr of this.tractors) if (tr.lx !== undefined) {
      g.globalAlpha = night * 0.75;
      g.drawImage(white, tr.lx + Math.cos(tr.lang) * 7 - 7, tr.ly + Math.sin(tr.lang) * 7 - 7, 14, 14);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
}

EBS.CloudWarsGroundLife = { GroundLife, LIFE };
})();
