/* Marble Knockout · Bahnen (R43/M4, M7)
 *
 * Langvideo: zehn Bahnen im Querformat (1920 × 1080). Short: drei Fassungen (A, B, C) mit je drei Hochformat-Bahnen.
 * Jede Bahn ist eine Bauanleitung build(b, c) für den Builder aus elements.js; c = { W, H, r, d, T, n, short }.
 *
 * Querformat, freie Fläche: x 40 bis 1790 (rechts davon die Röhre OUT), y 150 bis 1060 (oben links die Anzeige).
 * Die Startrinne liegt oben links mit dem Tor bei (640, 260); das Ziel ist eine Lichtschranke mit Auffangkasten oder
 * einer Zielschiene, in der die Durchgekommenen in Reihenfolge liegen bleiben.
 * Die Ideallinie (setPath) läuft etwa auf Höhe der Murmelmitte; sie misst Fortschritt und Rangfolge.
 */
(function (global) {
  'use strict';
  const EBS = global.EBS;
  const { PI } = EBS.KnockoutMath;
  const { tand } = EBS.KnockoutHelpers;

  const GATE = [640, 260];

  /** Höhe der Bahnmitte entlang einer geraden Reihe ab (xs, ys) mit Neigung slope (fällt in Fahrtrichtung). */
  const line = (xs, ys, slope) => { const k = tand(slope); return (x) => ys + Math.abs(x - xs) * k; };
  /** Gerade Reihe von xs nach xe; gibt die Höhenfunktion zurück. */
  function row(b, xs, ys, xe, slope, o) { const at = line(xs, ys, slope); b.track([[xs, ys], [xe, at(xe)]], o); return at; }
  /** Punkt der Ideallinie über der Bahn (Murmelmitte). */
  const over = (c, x, y) => [x, y - 0.7 * c.d];

  /** Startrinne oben links; gibt die Pfadpunkte der Rinne zurück. */
  function chute(b, c) {
    b.startChute({ x: GATE[0], y: GATE[1], dir: 1, slope: 6, n: c.n });
    const back = b.start.floor[0];
    return [over(c, back[0] + c.d, back[1]), over(c, GATE[0], GATE[1])];
  }
  /** Lichtschranke bei x (Bahn at, Fahrtrichtung dir) mit Tor eine Murmelbreite davor. */
  function finishAt(b, c, at, x, dir) {
    const y = at(x), lo = y - b.rad, hi = lo - 3 * c.d;
    const gate = { x: x - dir * c.d, y: at(x - dir * c.d), h: 1.4 * c.r };
    b.finishLine(dir > 0 ? { ax: x, ay: lo, bx: x, by: hi, gate } : { ax: x, ay: hi, bx: x, by: lo, gate });
  }
  /** Ziel mit Auffangkasten: Die Bahn (bis x gebaut) läuft 1,2 d weiter und fällt in einen Kasten. */
  function finishBin(b, c, at, x, dir) {
    const d = c.d, xe = x + dir * 1.2 * d, ye = at(xe), yb = ye + 2.4 * d, wo = xe + dir * 7.2 * d;
    finishAt(b, c, at, x, dir);
    b.track([[x, at(x)], [xe, ye]]);
    b.wall([[xe, ye], [xe, yb]]); b.track([[xe, yb], [wo, yb]]); b.wall([[wo, yb], [wo, ye - 1.4 * d]]);
    return [over(c, x, at(x))];
  }
  /** Ziel mit Schiene: Die Durchgekommenen rollen bis an eine Wand und liegen dort in Zielreihenfolge. */
  function finishRail(b, c, at, x, dir, slope = 1.5) {
    const L = (c.n + 1.5) * c.d, y = at(x), ye = y + L * tand(slope), xe = x + dir * L;
    finishAt(b, c, at, x, dir);
    b.track([[x, y], [xe, ye]]);
    b.wall([[xe, ye], [xe, ye - 1.4 * c.d]]);
    return [over(c, x, y)];
  }
  /** Wand am Ende einer Reihe (Kehre) zwischen y0 und y1. */
  const turn = (b, x, y0, y1) => b.wall([[x, y0], [x, y1]]);
  /** Drehkreuz über der Bahn mit Schutzbügel darüber (Murmeln müssen unten durch). Die Armspitzen enden auf
   *  halber Murmelhöhe: Sie schieben nur von oben, so hebt kein Arm eine Murmel auf der Ausgangsseite hoch. */
  function turnstileOn(b, c, at, x, o = {}) {
    const arm = o.arm || 1.25 * c.d, hy = at(x) - b.rad - 0.5 * c.d - arm;
    b.turnstile({ x, y: hy, arm, arms: o.arms || 4, rps: o.rps || -0.5 });
    b.wall([[x - arm - 0.6 * c.d, hy - arm - 0.3 * c.d], [x + arm + 0.6 * c.d, hy - arm - 0.3 * c.d]]);
  }

  // ======================================================================= Langvideo
  const L = [];
  const stage = (id, title, world, build, o = {}) => L.push({ id, title, world, build, ...o });

  // 1 · THE DROP: Alle fallen gleichzeitig durch ein Nagelfeld, Gedränge am Trichter
  stage('drop', 'THE DROP', 'night', (b, c) => {
    const d = c.d, cx = 960, x0 = cx - 6.8 * d, x1 = cx + 6.8 * d;
    // Zehn schmale Klappen: Offen enden sie gut eine Murmel über der ersten Stiftreihe (mit fünf breiten klemmte in
    // jedem zweiten Rennen eine Murmel zwischen Klappe und Stift fest)
    b.dropShelf({ x0, x1, y: 185, n: c.n, flaps: 10 });
    const wl = x0 - b.rad, wr = x1 + b.rad;
    b.wall([[wl, 140], [wl, 560]]); b.wall([[wr, 140], [wr, 560]]);
    b.pegField({ x0: cx - 5.25 * d, y0: 330, cols: 8, rows: 4, dx: 1.5 * d, dy: 56, rad: d * 0.16 });
    b.track([[wl, 560], [cx - 42, 650]]); b.track([[wr, 560], [cx + 42, 650]]);
    // Unter dem Trichter steil (12°), dann flach: Der Stau unter dem Trichter löst sich schnell auf
    const ka = tand(12), kb = tand(3.5), xk = 1060, yk = 715 + (xk - 860) * ka, e1 = 1655;
    const r1 = (x) => (x < xk ? 715 + (x - 860) * ka : yk + (x - xk) * kb);
    // Anschlag direkt unter dem Trichterrand: keine Ecke, in der eine Murmel hinter dem Strom festsitzt
    b.track([[894, 665], [902, r1(902)], [xk, yk], [e1, r1(e1)]]);
    turn(b, 1730, 720, 900);
    const r2 = row(b, 1730, 885, 700, 2.5);
    const path = [[cx, 150], [cx, 520], [cx, 700], over(c, 960, r1(960)), over(c, e1, r1(e1)), [1700, 840], over(c, 1680, r2(1680))];
    path.push(...finishBin(b, c, r2, 700, -1));
    b.setPath(path);
  });

  // 2 · TURNSTILES: drei Drehkreuze hintereinander, ein viertes kurz vor dem Ziel
  stage('turnstiles', 'TURNSTILES', 'forest', (b, c) => {
    const d = c.d, p = chute(b, c);
    const r1 = row(b, GATE[0], GATE[1], 1655, 5);
    for (const x of [900, 1150, 1400]) turnstileOn(b, c, r1, x);
    turn(b, 1730, r1(1655) - 1.6 * d, 450);
    const r2 = row(b, 1730, 440, 215, 3.5); turn(b, 140, 480, 640);
    const r3 = row(b, 140, 620, 1655, 3.5); turn(b, 1730, 640, 820);
    const r4 = line(1730, 800, 3);
    b.track([[1730, 800], [700, r4(700)]]);
    turnstileOn(b, c, r4, 1050, { rps: 0.5 });
    p.push(over(c, 1655, r1(1655)), [1700, 400], over(c, 1690, r2(1690)), over(c, 215, r2(215)), [170, 580], over(c, 180, r3(180)),
      over(c, 1655, r3(1655)), [1700, 760], over(c, 1690, r4(1690)));
    p.push(...finishBin(b, c, r4, 700, -1));
    b.setPath(p);
  });

  // 3 · THE WHEEL: Bumper-Kasten, dann hebt ein Schaufelrad das Feld und dreht die Richtung um
  stage('wheel', 'THE WHEEL', 'sand', (b, c) => {
    const d = c.d, p = chute(b, c);
    const r1 = row(b, GATE[0], GATE[1], 1655, 5); turn(b, 1730, r1(1655) - 1.6 * d, 450);
    const r2 = row(b, 1730, 440, 300, 3);
    // Bumper-Kasten links
    b.wall([[70, 440], [70, 880]]); b.wall([[400, 560], [400, 820]]);
    for (const [x, y] of [[165, 660], [305, 660], [235, 770]]) b.bumper(x, y, 0.45 * d);
    // Rad rechts unten: Zulauf von links unten, Ausgang links auf halber Höhe
    const cx = 1250, cy = 740, R = 4.5 * d, gap = 0.8 * c.r, Rc = R + gap + b.rad, yb = cy + Rc;
    b.wheel({ x: cx, y: cy, R, hubR: 1.3 * d, paddles: 8, rps: -0.15, casing: [PI / 2, -PI / 2 + 0.25], casingGap: gap });
    b.track([[70, 880], [cx - 1.5 * d, yb], [cx, yb]]);
    const ex = cx - 1.5 * d, ey = cy - 0.12 * R, r5 = line(ex, ey, 10);
    b.track([[ex, ey], [1000, r5(1000)]]);
    p.push(over(c, 1655, r1(1655)), [1700, 400], over(c, 1690, r2(1690)), over(c, 300, r2(300)), [120, 560], [235, 700], [235, 820],
      over(c, 420, 880 + 350 * (yb - 880) / (cx - 1.5 * d - 70)), over(c, cx - 1.5 * d, yb), [cx + 150, cy + 150], [cx + R - 10, cy],
      [cx + 130, cy - 150], [cx, cy - R + 20], [cx - 130, cy - 140], [cx - R + 40, cy - 30], over(c, 1100, r5(1100)));
    p.push(...finishRail(b, c, r5, 1000, -1));
    b.setPath(p);
  });

  // 4 · CRUMBLING BRIDGE: Schanze auf eine Brücke, die hinter dem Feld einstürzt (Gefahr)
  stage('bridge', 'CRUMBLING BRIDGE', 'petrol', (b, c) => {
    const d = c.d, p = chute(b, c);
    const r1 = row(b, GATE[0], GATE[1], 1655, 5); turn(b, 1730, r1(1655) - 1.6 * d, 450);
    // Reihe 2 nach links: steiler Anlauf, kleine Schanze, dann die Brücke über einer dunklen Grube
    const r2 = line(1730, 440, 7), xk = 1350;
    b.track([[1730, 440], [xk, r2(xk)], [xk - 1.4 * d, r2(xk) - 0.3 * d]]);
    // Die Brücke beginnt direkt hinter der Schanze; erst wenn ihre erste Planke fällt, wird daraus ein Sprung
    const bx0 = 1262, bx1 = 560, by0 = 490, by1 = 525;
    b.bridge({ x0: bx0, y0: by0, x1: bx1, y1: by1, n: 10, trigger: bx0 - 1.5 * d, count: Math.max(1, c.n - 2), delay: 0.8, interval: 0.45, sink: 2 * d });
    b.pit(520, 1300, by1 - 13, 600, { kill: true, depth: 1.0 * d });
    const r3 = row(b, bx1, by1, 215, 3); turn(b, 140, 500, 660);
    const r4 = row(b, 140, 640, 1655, 3.5); turn(b, 1730, 680, 840);
    const r5 = line(1730, 830, 3); b.track([[1730, 830], [760, r5(760)]]);
    p.push(over(c, 1655, r1(1655)), [1700, 400], over(c, 1690, r2(1690)), over(c, xk, r2(xk)), [bx0, by0 - 0.8 * d], [bx1, by1 - 0.8 * d],
      over(c, 215, r3(215)), [170, 600], over(c, 180, r4(180)), over(c, 1655, r4(1655)), [1700, 790], over(c, 1690, r5(1690)));
    p.push(...finishBin(b, c, r5, 760, -1));
    b.setPath(p);
  }, { hazard: true });

  // 5 · TILT: zwei Ampeltore, dann ein großes Kippbrett mit Löchern an beiden Enden
  stage('tilt', 'TILT', 'dusk', (b, c) => {
    const d = c.d, p = chute(b, c);
    const r1 = row(b, GATE[0], GATE[1], 960, 5);
    b.gate({ x: 760, y: r1(760), h: 0.84 * d, open: 1.2, period: 3 });
    b.gate({ x: 880, y: r1(880), h: 0.84 * d, open: 1.2, period: 3, phase: 1.5 });
    const cx = 1060, cy = 520, len = 22 * d;
    b.tilt({ x: cx, y: cy, len, amp: 0.26, period: 6, holes: [[-len / 2 + 1.2 * d, -len / 2 + 2.9 * d], [len / 2 - 2.9 * d, len / 2 - 1.2 * d]], posts: [-5 * d, 5 * d], postH: 0.35, lips: 0.9 * d });
    const r2 = line(420, 700, 3.5);
    b.track([[420, 620], [420, 700], [1655, r2(1655)]]); turn(b, 1730, 735, 880);
    const r3 = line(1730, 860, 3); b.track([[1730, 860], [760, r3(760)]]);
    p.push(over(c, 960, r1(960)), [cx, cy - 0.8 * d], [cx - len / 2 + 2 * d, cy - 0.8 * d], over(c, cx - len / 2 + 2 * d, r2(cx - len / 2 + 2 * d)),
      over(c, 1655, r2(1655)), [1700, 820], over(c, 1690, r3(1690)));
    p.push(...finishBin(b, c, r3, 760, -1));
    b.setPath(p);
  });

  // 6 · THE DRUM: Weiche teilt das Feld nach links und rechts, beide Wege münden von vorn in die Drehtrommel
  stage('drum', 'THE DRUM', 'plum', (b, c) => {
    const d = c.d, p = chute(b, c), cx = 960, fy = 345, dy = 650, R = 4.4 * d;
    b.track([[GATE[0], GATE[1]], [cx - 0.5 * d, fy - 1.4 * d]]);
    b.flipflop({ x: cx, y: fy, len: 3.2 * d, ang: 0.45 });
    b.track([[cx - 2.4 * d, fy + 1.6 * d], [285, 480]]); turn(b, 210, 370, 580);
    b.track([[cx + 2.4 * d, fy + 1.6 * d], [1635, 480]]); turn(b, 1710, 370, 580);
    const fl = line(210, 560, 8.2), fr = line(1710, 560, 8.2), xl = cx - R - 20, xr = cx + R + 20;
    b.track([[210, 560], [xl, fl(xl)]]); b.track([[xl, fl(xl)], [cx - 0.5 * d, fl(cx - 0.5 * d)]], { front: true });
    b.track([[1710, 560], [xr, fr(xr)]]); b.track([[xr, fr(xr)], [cx + 0.5 * d, fr(cx + 0.5 * d)]], { front: true });
    // Zwei Rippen, zwei Lücken; die Trommel schaukelt dazu, sonst fährt eine Murmel an der Rippe ewig dieselbe Runde
    b.drum({ x: cx, y: dy, R, gaps: [0, PI], gapW: 1.5 * d, rps: 0.14, fins: 2, finL: 0.9 * d, rock: { amp: 0.5, period: 4.3 } });
    const r4 = line(1500, 890, 2.5);
    b.track([[1500, 890], [600, r4(600)]]); turn(b, 1540, 790, 890);
    p.push([cx - 0.5 * d, fy - 2.2 * d], [cx, fy - 0.8 * d], [cx, dy - 1.5 * d], [cx, dy], [cx, dy + R + 0.5 * d], over(c, 900, r4(900)));
    p.push(...finishBin(b, c, r4, 600, -1));
    b.setPath(p);
  });

  // 7 · HAMMER ALLEY: Sims mit Löchern, Pendelhämmer darüber; zwei Löcher führen ins Aus, eins ins Fangnetz (Gefahr)
  stage('hammers', 'HAMMER ALLEY', 'slate', (b, c) => {
    const d = c.d, p = chute(b, c);
    const r1 = row(b, GATE[0], GATE[1], 1655, 5); turn(b, 1730, r1(1655) - 1.6 * d, 620);
    b.net([[1722, 600], [1620, 632]]);
    const at = line(1620, 632, 4), holes = [1300, 950, 600], hw = 1.6 * d;
    let xs = 1620;
    holes.forEach((h, i) => {
      const xe = h + hw / 2;
      b.track([[xs, at(xs)], [xe + 0.6 * d, at(xe + 0.6 * d)], [xe, at(xe) - 0.12 * d]]);
      xs = h - hw / 2;
      b.hammer({ px: h + 1.4 * d, py: at(h) - 6 * d, L: 5.6 * d, amp: 0.8, period: 2.4, phase: i * 0.37 });
      if (i < 2) {
        // Grube breiter als das Loch: Wer schräg hindurchfällt (Hammertreffer), fällt sonst an ihr vorbei ins Ziel
        b.pit(h - 2.2 * d, h + 2.2 * d, at(h) + 6, at(h) + 2.4 * d, { kill: true, depth: 1.1 * d });
        b.lid({ x0: h - hw / 2 + b.rad, y0: at(h - hw / 2), x1: h + hw / 2 - b.rad, y1: at(h + hw / 2) });
      }
    });
    b.track([[xs, at(xs)], [215, at(215)]]); turn(b, 140, 690, 890);
    b.net([[680, 785], [400, 810]]);
    // Landestelle nach der Kehre steil (7°), dann flach: Dort blieb sonst oft ein Paar übereinander liegen
    const k3 = tand(7), x3 = 380, y3 = 872 + (x3 - 140) * k3, r3 = (x) => (x < x3 ? 872 + (x - 140) * k3 : y3 + (x - x3) * tand(2.5));
    b.track([[140, 872], [x3, y3], [1240, r3(1240)]]);
    p.push(over(c, 1655, r1(1655)), [1690, 560], over(c, 1620, at(1620)), over(c, 215, at(215)), [170, 830], over(c, 180, r3(180)));
    p.push(...finishBin(b, c, r3, 1240, 1));
    b.setPath(p);
  }, { hazard: true });

  // 8 · SHIFTING FLOORS: Förderband mit Richtungswechsel, dann ein Turm aus wandernden Böden
  stage('floors', 'SHIFTING FLOORS', 'ice', (b, c) => {
    const d = c.d, p = chute(b, c);
    b.track([[GATE[0], GATE[1]], [700, 265]]);
    b.conveyor({ pts: [[700, 265], [1000, 275.5]], v: 380, half: 3.5 });
    b.track([[1000, 275.5], [1080, 283]]);
    const xl = 1020, xr = 1700, y0 = 440, step = 150;
    b.wall([[xl, 340], [xl, 800]]); b.wall([[xr, 340], [xr, 860]]);
    b.floors({ xl, xr, travel: 3 * d, periods: [2.0, 2.6, 3.1], levels: [0, 1, 2].map((i) => ({ y: y0 + i * step, dir: i % 2 ? -1 : 1, slope: 5, hole: (i % 2 ? 1 : -1) * 1.5 * d })) });
    const r4 = line(1700, 860, 3); b.track([[1700, 860], [760, r4(760)]]);
    p.push(over(c, 1080, 283), [1080, y0 - 0.8 * d], [1650, y0 - 0.8 * d + 25], [1650, y0 + step - 0.8 * d], [1080, y0 + step - 0.8 * d + 25],
      [1080, y0 + 2 * step - 0.8 * d], [1650, y0 + 2 * step - 0.8 * d + 25], [1660, 820], over(c, 1640, r4(1640)));
    p.push(...finishBin(b, c, r4, 760, -1));
    b.setPath(p);
  });

  // 9 · RING ESCAPE: drei gegenläufige Ringe mit je einem Schlitz
  stage('rings', 'RING ESCAPE', 'violet', (b, c) => {
    const d = c.d, p = chute(b, c), cx = 960, cy = 560;
    b.track([[GATE[0], GATE[1]], [890, 282]]);
    b.wall([[cx - 0.8 * d, 315], [cx - 0.8 * d, cy - 0.6 * d]], { front: true }); b.wall([[cx + 0.8 * d, 210], [cx + 0.8 * d, cy - 0.6 * d]], { front: true });
    b.rings({ x: cx, y: cy, radii: [2.2 * d, 3.6 * d, 5.0 * d], rps: [0.2, -0.15, 0.1], slotW: 1.5 * d });
    const r2 = line(650, 830, 3); b.track([[650, 700], [650, 830], [1380, r2(1380)]]);
    p.push([cx, 260], [cx, cy], [cx, cy + 5.6 * d], over(c, 1100, r2(1100)));
    p.push(...finishBin(b, c, r2, 1380, 1));
    b.setPath(p);
  });

  // 10 · GRAND FINAL: Drehkreuze, Schanze auf die einstürzende Brücke, Wippe, Drehkreuz vor dem Ziel
  stage('final', 'GRAND FINAL', 'gold', (b, c) => {
    const d = c.d, p = chute(b, c);
    const r1 = row(b, GATE[0], GATE[1], 1655, 5);
    for (const x of [950, 1350]) turnstileOn(b, c, r1, x);
    turn(b, 1730, r1(1655) - 1.6 * d, 450);
    // Wie auf Bahn 4: flache Kante, die Brücke beginnt gut eine halbe Murmel dahinter und etwas tiefer (sonst fällt
    // jede Murmel in die Lücke, bevor die Brücke überhaupt einstürzt)
    const r2 = line(1730, 430, 6), xk = 1420, lipX = xk - 1.4 * d, lipY = r2(xk) - 0.3 * d;
    b.track([[1730, 430], [xk, r2(xk)], [lipX, lipY]]);
    const bx0 = Math.round(lipX - 0.6 * d), by0 = Math.round(lipY + 0.38 * d), bx1 = 674, by1 = 500;
    b.bridge({ x0: bx0, y0: by0, x1: bx1, y1: by1, n: 10, trigger: bx0 - 1.5 * d, count: Math.max(1, c.n - 1), delay: 0.8, interval: 0.45, sink: 2 * d });
    b.pit(640, 1380, 512, 600, { kill: true, depth: 1.0 * d });
    const r3 = row(b, bx1, by1, 215, 3); turn(b, 140, 480, 640);
    b.track([[140, 620], [290, 633]]);
    b.wall([[236, 690], [236, 830]]);
    // Wippe ohne Pfosten: links eine Wand, rechts der Ausgang; wer rechts unten ankommt, ist durch. Mit 0,26 rad und
    // 6 s Takt schafft es auch eine einzelne Murmel in einer Neigung bis zum Ende (vorher pendelte eine bis 25 s).
    b.tilt({ x: 520, y: 770, len: 12 * d, amp: 0.26, period: 6, lips: 0 });
    // Zielgerade mit 5° wie auf Bahn 2: Bei 3° schiebt das Drehkreuz eine langsame Murmel im Takt immer wieder zurück
    const r4 = line(820, 860, 5); b.track([[820, 860], [1350, r4(1350)]]);
    turnstileOn(b, c, r4, 1150);
    p.push(over(c, 1655, r1(1655)), [1700, 390], over(c, 1690, r2(1690)), over(c, xk, r2(xk)), [bx0, by0 - 0.8 * d], [bx1, by1 - 0.8 * d], over(c, 215, r3(215)),
      [170, 590], [290, 600], [520, 740], [790, 740], over(c, 840, r4(840)));
    p.push(...finishBin(b, c, r4, 1350, 1));
    b.setPath(p);
  }, { final: true });

  EBS.KnockoutStages = { long: L, short: { A: [], B: [], C: [] }, gallery: EBS.KnockoutGallery, helpers: { line, row, over, finishAt, finishBin, finishRail, turnstileOn } };
})(typeof window !== 'undefined' ? window : globalThis);
