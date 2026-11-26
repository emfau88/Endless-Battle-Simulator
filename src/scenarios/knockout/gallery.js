/* Marble Knockout · Element-Galerie (R43/M2, M3)
 *
 * Jedes Element einzeln auf einer kleinen Bühne: Murmeln kommen oben herein, laufen durch das Element und fallen
 * unten aus dem Bild; danach kommen sie oben wieder. Dient zum Ansehen und als Dauertest (60 s ohne Hänger).
 * Maße relativ zur Bildmitte und zum Murmeldurchmesser d, damit beide Formate gehen.
 */
(function (global) {
  'use strict';
  const EBS = global.EBS;
  const { sin, cos, PI } = EBS.KnockoutMath;
  const deg = (a) => a * PI / 180;
  const tand = (a) => sin(deg(a)) / cos(deg(a));            // eigene Winkelfunktionen: Node = Chromium

  /** Zickzack aus Rampen mit Kehren: rows Reihen zwischen x0 und x1, Start oben bei y0. Gibt Endpunkt und Pfad. */
  function zigzag(b, { x0, x1, y0, rows, slope = 8, drop, gap, first = 1 }) {
    const d = b.d, k = tand(slope), dropY = drop || d * 2.4, g = gap || d * 1.5, path = [];
    let y = y0;
    for (let i = 0; i < rows; i++) {
      const dir = (i % 2 === 0) === (first > 0) ? 1 : -1;
      const xs = dir > 0 ? x0 : x1, xe = dir > 0 ? x1 - g : x0 + g, ye = y + Math.abs(xe - xs) * k;
      b.track([[xs, y], [xe, ye]]);
      const wx = dir > 0 ? x1 : x0;
      b.wall([[wx, ye - d * 1.6], [wx, ye + dropY + d * 0.2]]);
      path.push([xs + dir * d, y - d * 0.6], [xe, ye - d * 0.6], [wx - dir * d * 0.6, ye + dropY - d * 0.6]);
      y = ye + dropY;
    }
    return { end: path[path.length - 1], y, path };
  }

  const G = {};
  const add = (id, label, title, build) => { G[id] = { id, label, title, build }; };

  add('pegs', 'A3 Nagelfeld', 'PEG FIELD', (b, c) => {
    const cx = c.W / 2, d = c.d, top = c.H * 0.2, bot = c.H * 0.72;
    b.wall([[cx - 7 * d, top - d], [cx - 7 * d, bot]]); b.wall([[cx + 7 * d, top - d], [cx + 7 * d, bot]]);
    b.pegField({ x0: cx - 6 * d, y0: top + d, cols: 9, rows: 7, dx: 1.5 * d, dy: 1.3 * d, rad: d * 0.16 });
    b.track([[cx - 7 * d, bot], [cx - 1.1 * d, bot + 2.5 * d]]); b.track([[cx + 7 * d, bot], [cx + 1.1 * d, bot + 2.5 * d]]);
    return { spawn: [cx, top - d * 0.5] };
  });
  add('zigzag', 'A1 Rampe, Zickzack', 'ZIGZAG', (b, c) => {
    const cx = c.W / 2, d = c.d, w = Math.min(10 * d, c.W / 2 - 2 * d);
    zigzag(b, { x0: cx - w, x1: cx + w, y0: c.H * 0.16, rows: 4, slope: 7, drop: d * 2.6 });
    return { spawn: [cx - w + d, c.H * 0.16 - d * 1.5] };
  });
  add('funnel', 'A2 Trichter', 'FUNNEL', (b, c) => {
    const cx = c.W / 2, d = c.d, y0 = c.H * 0.3, y1 = c.H * 0.6;
    b.track([[cx - 8 * d, y0], [cx - 0.65 * d - b.rad, y1]]); b.track([[cx + 8 * d, y0], [cx + 0.65 * d + b.rad, y1]]);
    return { spawn: [cx - 6 * d, y0 - d * 2] };
  });
  add('bumper', 'A6 Bumper', 'BUMPERS', (b, c) => {
    const cx = c.W / 2, d = c.d, y0 = c.H * 0.25;
    b.wall([[cx - 7 * d, y0 - d], [cx - 7 * d, y0 + 9 * d]]); b.wall([[cx + 7 * d, y0 - d], [cx + 7 * d, y0 + 9 * d]]);
    for (const [x, y] of [[-3, 2], [3, 2], [0, 4.5], [-4, 6.5], [4, 6.5]]) b.bumper(cx + x * d, y0 + y * d, d * 0.5);
    b.track([[cx - 7 * d, y0 + 9 * d], [cx - 1.1 * d, y0 + 11 * d]]); b.track([[cx + 7 * d, y0 + 9 * d], [cx + 1.1 * d, y0 + 11 * d]]);
    return { spawn: [cx - 0.3 * d, y0 - d * 0.5] };
  });
  add('jump', 'A5 Sprungschanze', 'THE JUMP', (b, c) => {
    const cx = c.W / 2, d = c.d, y0 = c.H * 0.25, k = tand(16);
    const x0 = cx - 12 * d, xk = cx - 2.5 * d, yk = y0 + (xk - x0) * k;
    b.track([[x0, y0], [xk, yk], [xk + 1.4 * d, yk - 0.45 * d]]);
    b.track([[xk + 5.2 * d, yk + 0.6 * d], [cx + 13 * d, yk + 3.5 * d]]);
    b.net([[xk - 0.5 * d, yk + 5 * d], [xk + 2.6 * d, yk + 6.2 * d], [xk + 6 * d, yk + 5.4 * d]]);
    return { spawn: [x0 + d, y0 - d] };
  });
  add('turnstile', 'B1 Drehkreuz', 'TURNSTILES', (b, c) => {
    const cx = c.W / 2, d = c.d, k = tand(7), x0 = cx - 13 * d, y0 = c.H * 0.36, at = (x) => y0 + (x - x0) * k;
    b.track([[x0, y0], [cx + 13 * d, at(cx + 13 * d)]]);
    const arm = 1.25 * d;
    for (const dx of [-5 * d, 0, 5 * d]) {
      const x = cx + dx, hy = at(x) - b.rad - 0.12 * d - arm;
      b.turnstile({ x, y: hy, arm, arms: 4, rps: -0.5 });
      b.track([[x - arm - 0.6 * d, hy - arm - 0.3 * d], [x + arm + 0.6 * d, hy - arm - 0.3 * d]], { kind: 'wall' });
    }
    return { spawn: [x0 + d, y0 - 1.5 * d] };
  });
  add('wheel', 'B2 Schaufelrad', 'THE WHEEL', (b, c) => {
    const cx = c.W / 2, d = c.d, cy = c.H * 0.55, R = 4.5 * d;
    const w = b.wheel({ x: cx, y: cy, R, hubR: 1.3 * d, paddles: 8, rps: -0.15, casing: [PI / 2, -PI / 2 + 0.25], casingGap: 0.8 * c.r });
    const Rc = R + 0.8 * c.r + b.rad, yb = cy + Rc;
    b.track([[cx - 9 * d, yb - 2 * d], [cx - 1.5 * d, yb], [cx, yb]]);
    // Ausgang links auf halber Höhe: Die absteigenden Schaufeln laufen durch die Rampe, die Murmeln bleiben liegen
    const k = tand(10), x0 = cx - 1.5 * d, y0 = cy - 0.12 * R;
    b.track([[x0, y0], [cx - 16 * d, y0 + (16 * d - 1.5 * d) * k]]);
    void w;
    return { spawn: [cx - 8.5 * d, yb - 3.4 * d] };
  });
  add('drum', 'B3 Drehtrommel', 'THE DRUM', (b, c) => {
    const cx = c.W / 2, d = c.d, cy = c.H * 0.55, R = 5 * d;
    b.drum({ x: cx, y: cy, R, gaps: [0, PI], gapW: 1.5 * d, rps: 0.14, fins: 6 });
    b.track([[cx - 14 * d, cy - 7 * d], [cx - 0.4 * d, cy - 1.2 * d]], { front: true });
    return { spawn: [cx - 13.5 * d, cy - 8.5 * d] };
  });
  add('rings', 'B4 Ringausbruch', 'RING ESCAPE', (b, c) => {
    const cx = c.W / 2, d = c.d, cy = c.H * 0.56;
    b.rings({ x: cx, y: cy, radii: [2.4 * d, 4.0 * d, 5.6 * d], rps: [0.2, -0.15, 0.1], slotW: 1.5 * d });
    b.wall([[cx - 0.7 * d, cy - 9 * d], [cx - 0.7 * d, cy - 0.6 * d]], { front: true }); b.wall([[cx + 0.7 * d, cy - 9 * d], [cx + 0.7 * d, cy - 0.6 * d]], { front: true });
    return { spawn: [cx, cy - 10 * d] };
  });
  add('sweeper', 'B5 Kehrarm', 'SWEEPER', (b, c) => {
    const cx = c.W / 2, d = c.d, y = c.H * 0.55, k = tand(3);
    b.track([[cx - 14 * d, y - 3 * d], [cx - 9 * d, y]]);
    const segs = [[-9, -5.2], [-3.8, -0.6], [0.8, 4.2], [5.6, 11]];
    for (const [a, e] of segs) b.track([[cx + a * d, y + (a + 9) * d * k], [cx + e * d, y + (e + 9) * d * k]]);
    const arm = 3.6 * d;
    b.turnstile({ x: cx, y: y - b.rad - 0.15 * d - arm, arm, arms: 2, rps: -0.25 });
    return { spawn: [cx - 13.5 * d, y - 4.5 * d] };
  });
  add('flipflop', 'B6 Flip-Flop-Weiche', 'FLIP-FLOP', (b, c) => {
    const cx = c.W / 2, d = c.d, y = c.H * 0.45;
    b.track([[cx - 10 * d, y - 5 * d], [cx - 0.5 * d, y - 1.4 * d]]);
    b.flipflop({ x: cx, y, len: 3.2 * d, ang: 0.45 });
    b.track([[cx - 2.4 * d, y + 1.6 * d], [cx - 12 * d, y + 4 * d]]); b.track([[cx + 2.4 * d, y + 1.6 * d], [cx + 12 * d, y + 4 * d]]);
    return { spawn: [cx - 9.5 * d, y - 6.5 * d] };
  });
  add('gate', 'C1 Schiebetor', 'RED LIGHT, GREEN LIGHT', (b, c) => {
    const cx = c.W / 2, d = c.d, k = tand(6), x0 = cx - 13 * d, y0 = c.H * 0.4, at = (x) => y0 + (x - x0) * k;
    b.track([[x0, y0], [cx + 13 * d, at(cx + 13 * d)]]);
    b.gate({ x: cx - 2 * d, y: at(cx - 2 * d), h: 1.4 * c.r * 2 * 0.6, open: 1.2, period: 3 });
    b.gate({ x: cx + 5 * d, y: at(cx + 5 * d), h: 1.4 * c.r * 2 * 0.6, open: 1.2, period: 3, phase: 1.5 });
    return { spawn: [x0 + d, y0 - 1.5 * d] };
  });
  add('hammer', 'C2 Pendelhammer + E6 Fangnetz', 'HAMMER ALLEY', (b, c) => {
    const cx = c.W / 2, d = c.d, k = tand(5), x0 = cx - 14 * d, y0 = c.H * 0.42, at = (x) => y0 + (x - x0) * k;
    // Sims mit drei Löchern; vor jedem Loch eine kleine Kante, damit man in Fahrt darüber springt
    const holes = [-6, 0, 6], hw = 1.35 * d;
    let xs = x0;
    for (const h of holes) {
      const xe = cx + h * d - hw / 2;
      b.track([[xs, at(xs)], [xe - 0.6 * d, at(xe - 0.6 * d)], [xe, at(xe) - 0.12 * d]]);
      xs = xe + hw;
      b.hammer({ px: cx + h * d - 1.4 * d, py: at(cx + h * d) - 6 * d, L: 5.6 * d, amp: 0.8, period: 2.4, phase: h * 0.13 });
    }
    b.track([[xs, at(xs)], [cx + 14 * d, at(cx + 14 * d)]]);
    b.net([[cx - 8 * d, at(cx) + 4 * d], [cx, at(cx) + 5 * d], [cx + 8 * d, at(cx) + 4.4 * d]]);
    return { spawn: [x0 + d, y0 - 1.5 * d] };
  });
  add('piston', 'C3 Kolben', 'PISTONS', (b, c) => {
    // Katapult-Becher: Murmeln rollen in einen Becher vor einer Wand, der Kolben stößt sie schräg darüber
    const cx = c.W / 2, d = c.d, y = c.H * 0.52, cupX = cx + 1.6 * d, cupW = 1.6 * d;
    b.track([[cx - 12 * d, y - 3.2 * d], [cupX - cupW / 2, y], [cupX - cupW / 2, y + 0.9 * d], [cupX + cupW / 2, y + 0.9 * d]]);
    b.wall([[cupX + cupW / 2 + b.rad, y + 0.9 * d], [cupX + cupW / 2 + b.rad, y - 0.7 * d]]);
    b.piston({ x: cupX - 0.1 * d, y: y + 0.9 * d - b.rad - 0.25 * d, dx: 0, dy: -1, stroke: 2.0 * d, period: 1.6, push: 0.14, tilt: 0.5, w: 1.3 * cupW / 1.6, len: 1.2 * d });
    b.track([[cupX + cupW / 2 + 2.4 * d, y + 1.2 * d], [cx + 14 * d, y + 3.4 * d]]);
    return { spawn: [cx - 11.5 * d, y - 4.6 * d] };
  });
  add('lift', 'C4 Plattform (Fähre)', 'THE FERRY', (b, c) => {
    const cx = c.W / 2, d = c.d, y = c.H * 0.5;
    b.track([[cx - 14 * d, y - 3 * d], [cx - 5 * d, y - 0.4 * d]]);
    b.track([[cx + 5.3 * d, y + 1.05 * d], [cx + 14 * d, y + 3 * d]]);
    const tray = [{ ax: -1.8 * d, ay: -0.5 * d, bx: -0.2 * d, by: 0 }, { ax: -0.2 * d, ay: 0, bx: 1.6 * d, by: -0.35 * d }];
    const L = cx - 3.4 * d, Rr = cx + 3.5 * d, P = 5;
    b.mover({ shapes: tray, period: P, keys: [[0, L, y + 0.25 * d, -0.12], [1.0, L, y + 0.25 * d, -0.12], [2.3, Rr, y + 0.2 * d, 0], [2.8, Rr, y + 0.2 * d, 0.62], [3.6, Rr, y + 0.2 * d, 0.62], [3.9, Rr, y + 0.2 * d, 0]] });
    b.gate({ x: cx - 5.4 * d, y: y - 0.35 * d, h: 1.0 * d, open: 1.0, period: P, phase: 0 });
    return { spawn: [cx - 13.5 * d, y - 4.5 * d] };
  });
  add('conveyor', 'C5 Förderband', 'CONVEYOR', (b, c) => {
    const cx = c.W / 2, d = c.d, y = c.H * 0.55;
    b.conveyor({ pts: [[cx - 9 * d, y], [cx + 9 * d, y]], v: 420, half: 4 });
    b.track([[cx - 9.6 * d, y + 0.4 * d], [cx - 14 * d, y + 3 * d]]); b.track([[cx + 9.6 * d, y + 0.4 * d], [cx + 14 * d, y + 3 * d]]);
    b.track([[cx - 6 * d, y - 6 * d], [cx - 1.2 * d, y - 3 * d]]);
    return { spawn: [cx - 5.6 * d, y - 7.4 * d] };
  });
  add('trapdoors', 'C6 Falltüren', 'TRAPDOORS', (b, c) => {
    const cx = c.W / 2, d = c.d, y = c.H * 0.5, w = 2.4 * d, n = 6, x0 = cx - n * w / 2, k = tand(3);
    b.track([[x0 - 8 * d, y - 2.2 * d], [x0 - 0.1 * d, y - 0.1 * d]]);
    b.trapdoors({ x0, y, n, w, interval: 0.9, slope: 3 });
    b.track([[x0 + n * w + 0.1 * d, y + n * w * k + 0.1 * d], [x0 + n * w + 6 * d, y + n * w * k + 1.5 * d]]);
    b.pit(x0 - 0.5 * d, x0 + n * w + 0.5 * d, y + d, c.H + 20);
    return { spawn: [x0 - 7.5 * d, y - 3.6 * d] };
  });
  add('tilt', 'D1 Kippbrett', 'TILT', (b, c) => {
    const cx = c.W / 2, d = c.d, y = c.H * 0.55, len = Math.min(18 * d, c.W * 0.8);
    b.tilt({ x: cx, y, len, amp: 0.21, period: 7, holes: [[-len / 2 + 1.2 * d, -len / 2 + 2.6 * d], [len / 2 - 2.6 * d, len / 2 - 1.2 * d]], posts: [-3 * d, 3 * d], lips: 0.9 * d });
    b.track([[cx - 4 * d, y - 6 * d], [cx - 0.8 * d, y - 3.2 * d]]);
    return { spawn: [cx - 3.6 * d, y - 7.4 * d] };
  });
  add('bridge', 'D2 Einstürzende Brücke', 'CRUMBLING BRIDGE', (b, c) => {
    const cx = c.W / 2, d = c.d, y = c.H * 0.4, x0 = cx - 8 * d, x1 = cx + 8 * d;
    b.track([[cx - 14 * d, y - 2.5 * d], [x0, y]]);
    b.bridge({ x0, y0: y, x1, y1: y + 0.6 * d, n: 10, trigger: cx - 2 * d, delay: 0.2, interval: 0.45 });
    b.track([[x1, y + 0.6 * d], [cx + 14 * d, y + 2.5 * d]]);
    b.pit(x0 - d, x1 + d, y + d, c.H + 20);
    return { spawn: [cx - 13.5 * d, y - 4 * d], cycle: 9 };
  });
  add('floors', 'D3 Wandernde Böden', 'SHIFTING FLOORS', (b, c) => {
    const cx = c.W / 2, d = c.d, y0 = c.H * 0.22, step = Math.min(3.4 * d, c.H * 0.14), xl = cx - 8 * d, xr = cx + 8 * d;
    b.wall([[xl, y0 - 2 * d], [xl, y0 + 4 * step]]); b.wall([[xr, y0 - 2 * d], [xr, y0 + 4 * step]]);
    b.floors({ xl, xr, travel: 3 * d, periods: [2.0, 2.6, 3.1, 3.7], levels: [0, 1, 2, 3].map((i) => ({ y: y0 + i * step, dir: i % 2 ? -1 : 1, slope: 5, hole: (i % 2 ? 1 : -1) * 1.5 * d })) });
    return { spawn: [xl + 1.5 * d, y0 - 1.6 * d] };
  });
  add('maze', 'D4 Drehende Bühne', 'ROTATING MAZE', (b, c) => {
    const cx = c.W / 2, d = c.d, cy = c.H * 0.56, R = 6.4 * d;
    b.maze({ x: cx, y: cy, R, rps: 0.12, rings: [0.68, 0.38], spokes: 2 });
    b.wall([[cx - 0.7 * d, cy - R - 3 * d], [cx - 0.7 * d, cy - 0.4 * d]], { front: true }); b.wall([[cx + 0.7 * d, cy - R - 3 * d], [cx + 0.7 * d, cy - 0.4 * d]], { front: true });
    return { spawn: [cx, cy - R - 4 * d] };
  });

  EBS.KnockoutGallery = G;
  EBS.KnockoutHelpers = { zigzag, deg, tand };
  void sin; void cos;
})(typeof window !== 'undefined' ? window : globalThis);
