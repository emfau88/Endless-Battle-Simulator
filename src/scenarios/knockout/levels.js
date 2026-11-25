/* Marble Knockout · Gesamtlevel: die Level (R43 Teil 2)
 *
 * THE TOWER (Short, 9:16) und THE GAUNTLET (Langvideo, 16:9). Jeder Abschnitt ist eine Bauanleitung build(b, c) in
 * Welt-Koordinaten; c = { W, H, r, d, T, n, short, keep, i, prev } (W, H: Größe der Welt, keep: Plätze in der
 * Schleuse, prev: Ergebnis des vorigen Abschnitts). Rückgabe { path, sch, entry, exit, frame }.
 *
 * Stand Paket G4: THE TOWER komplett (drei Abschnitte, Ziel und Sieger). THE GAUNTLET hat die Abschnitte 1 bis 5
 * (Nagelwand, Drehkreuze mit Fallschacht, Hebe-Rad, einstürzende Brücke, Kippbretter), danach eine Auffangschale
 * („TO BE CONTINUED“). Plan: docs/MARBLE_KNOCKOUT_GESAMTLEVEL_PLAN_2026-11-25.md, Abschnitte 2 und 3.
 * Maßregeln aus den Proben der Bahnen gelten weiter: zwischen Stift und Wand gut 1,4 d frei, unter einem Trichterhals
 * rund 2 d Luft, von oben beregnete Drehkreuze tragen ein Dach (sonst bleiben Murmeln darauf liegen).
 */
(function (global) {
  'use strict';
  const EBS = global.EBS;
  const { tand } = EBS.KnockoutHelpers;
  const { sin, cos, PI } = EBS.KnockoutMath;
  const LV = EBS.KnockoutLevel;

  // Murmeln (Plan 1.3): 16 im Short, 20 im Langvideo. Farben mit ähnlichem Nachbarn tragen ein weißes Band.
  const COLORS = {
    RED: '#e8343a', ORANGE: '#f7862a', YELLOW: '#f2ec3a', LIME: '#9ad83a', GREEN: '#1fa85a', MINT: '#6fe3bd',
    CYAN: '#22c4dc', BLUE: '#2f6be0', NAVY: '#22307e', PURPLE: '#8a4de0', PINK: '#f25fae', BROWN: '#8b5a32',
    WHITE: '#eef1f4', SILVER: '#b9c2ca', BLACK: '#2a2d33', GOLD: '#e3b23c',
    TEAL: '#128a86', SKY: '#86c8f4', LILAC: '#bba3ea', MAROON: '#7c1f36',
  };
  const BANDS = ['NAVY', 'SKY', 'LILAC', 'MAROON', 'TEAL'];
  const FIELD16 = ['RED', 'ORANGE', 'YELLOW', 'LIME', 'GREEN', 'MINT', 'CYAN', 'BLUE', 'NAVY', 'PURPLE', 'PINK', 'BROWN', 'WHITE', 'SILVER', 'BLACK', 'GOLD'];
  const FIELD20 = [...FIELD16, 'TEAL', 'SKY', 'LILAC', 'MAROON'];

  /** Drehkreuz über einer Bahn (Höhe at(x)) mit Dach darüber; rps > 0 schiebt unten nach links. raise: Nabe um so
   *  viele d höher (die Armspitzen enden dann über der Murmelmitte). */
  function turnstileOn(b, c, at, x, rps, raise = 0) {
    const arm = 1.25 * c.d, hy = at(x) - b.rad - (0.5 + raise) * c.d - arm;
    b.turnstile({ x, y: hy, arm, arms: 4, rps });
    LV.tent(b, x, hy - arm - 0.45 * c.d, arm + 0.6 * c.d, 0.5 * c.d);
  }
  /** Abweiser an beiden Wänden eines Nagelfelds: kurze Schrägen, die Murmeln aus der freien Rinne an der Wand zurück
   *  zwischen die Stifte schieben (sonst fällt eine Murmel dort ohne einen Stift zu berühren durch). Sie sitzen in den
   *  versetzten Reihen, wo der nächste Stift weiter von der Wand weg ist; Spitze bis Stift bleibt über 1,4 d frei. */
  function wallNoses(b, c, xl, xr, ys) {
    const d = c.d, w = 0.9 * d, h = 0.6 * d;
    for (const y of ys) { b.wall([[xl, y - h], [xl + w, y]]); b.wall([[xr, y - h], [xr - w, y]]); }
  }
  /** Auffangschale nach dem letzten gebauten Abschnitt (nur bis die Level fertig sind). */
  function catchTray(b, c, pts, sign, path) {
    b.track(pts);
    b.sign(sign[0], sign[1], 'TO BE CONTINUED', { size: c.short ? 30 : 26, h: 10 });
    return { path, entry: c.prev.exit };
  }

  // ======================================================================= THE TOWER (Short)
  // Turm genau so breit wie das Bild (1080), Wände bei 20 und 1060 (innen 30 bis 1050).

  // 1 · THE DROP (16 → TOP 8): Regal, Nagelfeld mit drei Bumpern über die ganze Breite, Dach mit zwei Spuren und je
  // einem Drehkreuz, zwei Rückläufe zum Trichter, kurze Rampe in die Schleuse.
  function towerDrop(b, c) {
    const d = c.d, cx = 540;
    // Turmwände über alle Abschnitte, bis zum unteren Rand der Welt
    b.wall([[20, 110], [20, 5560]]); b.wall([[1060, 110], [1060, 5560]]);
    b.dropShelf({ x0: 78, x1: 1002, y: 260, n: c.n, flaps: 8, pad: 12 });   // Rand: links klemmte sonst eine am Scharnier
    const bumpers = [[330, 750], [750, 750], [540, 1030]];
    b.pegField({ x0: 120, y0: 470, cols: 11, rows: 11, dx: 84, dy: 70, rad: d * 0.16,
      skip: (x, y) => bumpers.some(([bx, by]) => (x - bx) ** 2 + (y - by) ** 2 < 90 * 90) });
    for (const [x, y] of bumpers) b.bumper(x, y);
    wallNoses(b, c, 20, 1060, [540, 680, 820, 960, 1100]);              // alle versetzten Reihen
    // Dach: Wer links landet, rollt nach links, wer rechts landet, nach rechts; je ein Drehkreuz auf der Spur
    const apex = 1460, kF = tand(7), roof = (x) => apex + Math.abs(x - cx) * kF;
    b.track([[150, roof(150)], [cx, apex], [930, roof(930)]]);
    turnstileOn(b, c, roof, 345, 0.5); turnstileOn(b, c, roof, 735, -0.5);
    // Rückläufe zum Trichterhals bei x 400 (links kurz, rechts lang)
    const gy = 1640, kG = tand(8), xn = 400, hw = 1.25 * d;
    b.track([[30, gy], [xn - hw, gy + (xn - hw - 30) * kG]]);
    b.track([[1050, gy], [xn + hw, gy + (1050 - xn - hw) * kG]]);
    // Rampe in die Schleuse (10°: mit 6° stauten sich die Murmeln unter dem Hals), Anschlag links
    const kS = tand(10), ramp = (x) => 1830 + (x - 300) * kS, ex = 520;
    b.track([[300, ramp(300)], [ex, ramp(ex)]]); b.wall([[300, 1750], [300, ramp(300)]]);
    const sch = LV.schleuse(b, c, { ex, ey: ramp(ex), dir: 1, slope: 10, keep: c.keep, outLen: 1.4 * d, pitW: 2.4, sign: 'out' });
    const path = [[cx, 230], [cx, apex], [cx, 1720], [xn, 1790], ...sch.path];
    return { path, sch, exit: [sch.cx, sch.floorY] };
  }
  // 2 · FALLING FLOORS (8 → TOP 4): drei wandernde Böden zwischen zwei inneren Wänden. Jeder fällt zu einer Wand hin
  // ab und endet dort offen; die Lücke zur Wand geht mit dem Gleiten auf und zu. Die oberen zwei haben ein Loch als
  // Abkürzung. Darunter ein steiles Sims mit einem Loch (Sturz = raus; der Deckel schließt, sobald vier raus sind),
  // dann die Schleuse links.
  // Abweichungen vom Plan nach Messung (je 8 Läufe): vier Böden mit 8° dauerten im Median 28 s statt rund 10; ein
  // Pendelhammer über dem Sims staute in jeder Fassung das Feld und warf immer genau die ersten vier ins Loch. Ohne
  // Hammer, mit drei Böden zu 10° und einer flachen Kante am Loch: 9,4 s, meist ein bis zwei Stürze, kein Hänger.
  function towerFloors(b, c) {
    const d = c.d, cx = 540, [x0, y0] = c.prev.exit;
    // Abstand 250: An der Wand, wo ein Boden tief endet und der nächste hoch beginnt, muss eine Murmel durchpassen.
    const xl = 110, xr = 970, kF = tand(10), ys = [2370, 2620, 2870], dirs = [1, -1, 1];
    b.wall([[xl, 2200], [xl, ys[2] + 120]]); b.wall([[xr, 2200], [xr, ys[2] - 40]]);
    // Loch im obersten Boden im Landebereich, im mittleren kurz nach der Mitte; der unterste hat keins
    const holes = [3 * d, 1.5 * d, undefined];
    b.floors({ xl, xr, travel: 3 * d, periods: [1.8, 2.2, 2.6],
      levels: ys.map((y, i) => ({ y, dir: dirs[i], slope: 10, hole: holes[i] })) });
    const fl = (i, x) => ys[i] + dirs[i] * (x - cx) * kF;              // Oberfläche von Boden i (ohne Gleiten)
    // Sims von der rechten Wand nach links (10°), Loch mit flacher Kante (langsame Murmeln fallen hinein), Schleuse
    const Ly = ys[2] + 260, kL = tand(10), at = (x) => Ly + (1050 - x) * kL, h = 560, hw = 1.45 * d, ex = 430;
    b.track([[1050, at(1050)], [h + hw / 2 + 0.6 * d, at(h + hw / 2 + 0.6 * d)], [h + hw / 2, at(h + hw / 2) - 0.05 * d]]);
    b.track([[h - hw / 2, at(h - hw / 2)], [ex, at(ex)]]);
    b.pit(h - 2.2 * d, h + 2.2 * d, at(h) + 6, at(h) + 2.4 * d, { kill: true, depth: 1.1 * d });
    b.lid({ x0: h - hw / 2 + b.rad, y0: at(h - hw / 2), x1: h + hw / 2 - b.rad, y1: at(h + hw / 2) });
    const sch = LV.schleuse(b, c, { ex, ey: at(ex), dir: -1, slope: 6, keep: c.keep, outLen: 1.4 * d, pitW: 2.4, sign: 'out' });
    const o = 0.8 * d, pl = xl + 60, pr = xr - 60;
    const path = [[x0, y0 + 10], [x0, fl(0, x0) - o], [pr, fl(0, pr) - o], [pr, fl(1, pr) - o], [pl, fl(1, pl) - o],
      [pl, fl(2, pl) - o], [pr, fl(2, pr) - o], [pr, at(pr) - 0.7 * d], ...sch.path];
    return { path, sch, entry: c.prev.exit, exit: [sch.cx, sch.floorY] };
  }
  // 3 · FINAL (4 → 1): Trichter in einen Kanal von vorn in die Ringe (Ringausbruch), darunter eine Fangbahn, die
  // Steilabfahrt mit zwei Mulden (kleine Schanzen) und die offene Zielgerade ohne Engstelle. Hinter dem Ziel eine
  // Schiene, in der die Murmeln in Zielreihenfolge liegen bleiben.
  function towerFinal(b, c) {
    const d = c.d, cx = 540, [x0, y0] = c.prev.exit;
    // Trichter über die ganze Breite (12°) bis zum Kanal; Kanalwände vorn, bis in den innersten Ring
    const Fy = y0 + 120, k12 = tand(12), nl = cx - 0.8 * d, nr = cx + 0.8 * d, ny = Fy + (nl - 30) * k12;
    b.track([[30, Fy], [nl, ny]]); b.track([[1050, Fy], [nr, ny]]);
    const cy = ny + 5 * d + 80;
    b.wall([[nl, ny], [nl, cy - 0.6 * d]], { front: true }); b.wall([[nr, ny], [nr, cy - 0.6 * d]], { front: true });
    // Zwei Ringe, der äußere mit zwei Schlitzen: Drei Ringe mit je einem Schlitz hielten die Spitze 4 bis 8 s fest
    b.rings({ x: cx, y: cy, radii: [2.2 * d, 5.0 * d], rps: [0.3, -0.2], slots: [1, 2], slotW: 1.5 * d });
    // Fangbahn unter den Ringen nach links (12°); am Ende 80 Luft zur Wand zum Durchfallen
    const kA = tand(12), yA = cy + 300, rowA = (x) => yA + (1050 - x) * kA, xa = 120;
    b.track([[1050, rowA(1050)], [xa, rowA(xa)]]);
    // Steilabfahrt nach rechts (13°) mit zwei Mulden: kurz steiler (22°), dann ein kurzer Gegenhang (10°)
    // (endet 90 vor der Wand: mit 50 Luft klemmte dort eine Murmel zwischen Bahnende und Wand)
    const kB = tand(13), kD = tand(22), kU = tand(10), B = [[30, rowA(xa) + 130]];
    const run = (x, kk) => { const [px, py] = B[B.length - 1]; B.push([x, py + (x - px) * kk]); };
    run(330, kB); run(400, kD); run(470, -kU); run(640, kB); run(710, kD); run(780, -kU); run(950, kB);
    b.track(B);
    const rowB = (x) => { for (let i = 1; i < B.length; i++) if (x <= B[i][0]) return B[i - 1][1] + (B[i][1] - B[i - 1][1]) * (x - B[i - 1][0]) / (B[i][0] - B[i - 1][0]); return B[B.length - 1][1]; };
    // Zielgerade nach links (5°), offen; Ziel bei xf, dahinter die Schiene bis an die Wand (mit 3° und Ziel bei 380
    // war das Finale gut 1 s länger und die Einläufe seltener knapp)
    const kC = tand(5), yC = B[B.length - 1][1] + 120, rowC = (x) => yC + (1050 - x) * kC, xf = 460, xe = 60;
    b.track([[1050, rowC(1050)], [xf, rowC(xf)], [xe, rowC(xf) + (xf - xe) * tand(1.5)]]);
    b.wall([[xe, rowC(xf) + (xf - xe) * tand(1.5)], [xe, rowC(xf) - 1.4 * d]]);
    const lo = rowC(xf) - b.rad, hi = lo - 3 * d;
    b.finishLine({ ax: xf, ay: hi, bx: xf, by: lo });
    const o = 0.7 * d;
    const path = [[x0, y0 + 10], [cx, ny - 0.3 * d], [cx, cy], [cx, rowA(cx) - o], [xa, rowA(xa) - o], [60, rowB(60) - o],
      ...B.slice(1).map(([x]) => [x, rowB(x) - o]), [1000, rowC(1000) - o], [xf, rowC(xf) - o]];
    return { path, fin: b.finish, entry: c.prev.exit, exit: null };
  }

  // ======================================================================= THE GAUNTLET (Langvideo)
  // Ein Bildschirm (B) sind 1920 × 1080 E. Abschnitt 1 liegt oben links (Reihe 1, Spalte 1).

  // 1 · THE DROP (20 → 17): Regal, Nagelwand über die ganze Breite mit drei Bumpern, zwei Trichter auf eine gemeinsame
  // Spur (die Ströme treffen sich), Nagelkasten zum Mischen, kurze Rampe in die Schleuse rechts. Ein Drehkreuz auf der
  // gemeinsamen Spur staute in den ersten Proben das ganze Feld zehn Sekunden lang in einer Reihe.
  function gauntletDrop(b, c) {
    const d = c.d, cx = 960;
    b.wall([[96, 100], [96, 720]]); b.wall([[1824, 100], [1824, 1200]]);
    b.dropShelf({ x0: 360, x1: 1560, y: 180, n: c.n, flaps: 10 });
    const bumpers = [[528, 542], [960, 542], [1392, 542]];
    b.pegField({ x0: 204, y0: 380, cols: 22, rows: 6, dx: 72, dy: 54, rad: d * 0.16,
      skip: (x, y) => bumpers.some(([bx, by]) => (x - bx) ** 2 + (y - by) ** 2 < 80 * 80) });
    for (const [x, y] of bumpers) b.bumper(x, y);
    wallNoses(b, c, 96, 1824, [434, 542, 650]);                         // alle versetzten Reihen
    // Zwei Trichter mit gemeinsamem Grat in der Mitte; Hälse bei x 640 und 1280
    const top = 720, peak = 735, neck = 830, hw = 1.15 * d;
    b.track([[96, top], [640 - hw, neck]]);
    b.track([[640 + hw, neck], [cx, peak], [1280 - hw, neck]]);
    b.track([[1280 + hw, neck], [1824, top]]);
    // Gemeinsame Spur unter beiden Hälsen (5°), Anschlag links
    const kL = tand(5), lane = (x) => 935 + (x - 300) * kL, xe = 1480;
    b.track([[300, lane(300)], [xe, lane(xe)]]); b.wall([[300, 860], [300, lane(300)]]);
    // Nagelkasten zwischen Spurende und rechter Wand, darunter die Rampe (7°) unter der Wand hindurch zur Schleuse
    b.wall([[xe, lane(xe)], [xe, 1268]]);
    for (const x of [1580, 1652, 1724]) b.peg(x, 1100, d * 0.16);
    for (const x of [1616, 1688]) b.peg(x, 1160, d * 0.16);
    const kR = tand(7), ramp = (x) => 1268 + (x - xe) * kR, ex = 1880;
    b.track([[xe, ramp(xe)], [ex, ramp(ex)]]);
    const sch = LV.schleuse(b, c, { ex, ey: ramp(ex), dir: 1, slope: 7, keep: c.keep, perLayer: 6, outLen: 1.4 * d, pitW: 2.0 });
    const path = [[cx, 160], [cx, 700], [640, 800], [640, lane(640) - 0.7 * d], [xe, lane(xe) - 0.7 * d], [1650, 1150], [1700, ramp(1700) - 0.7 * d], ...sch.path];
    return { path, sch, exit: [sch.cx, sch.floorY], frame: { x0: 80, y0: 90, x1: 2420, y1: 1660 } };
  }
  // 2 · TURNSTILES (17 → 14): Ein Grat unter der Schleuse teilt das Feld auf zwei Spuren nach rechts, oben zwei
  // Drehkreuze, unten eins. Beide enden über dem BIG DROP: freier Fall durch einen Schacht mit Stiften und Bumpern,
  // unten links in die Schleuse.
  function gauntletTurnstiles(b, c) {
    const d = c.d, [x0, y0] = c.prev.exit, k4 = tand(7);
    // Grat bei xa: links kurz hinab (Absprung auf die untere Spur), rechts die obere Spur
    const xa = 2045, ya = 1820, U = (x) => ya + (x - xa) * k4;
    const xl = 4560, xr = 5020;                                          // Schachtwände
    b.track([[1850, ya + 195 * tand(12)], [xa, ya], [xl, U(xl)]]);
    const L = (x) => 2120 + (x - 1780) * k4;
    // Anschlag links hoch genug: Vom Grat springen die Murmeln sonst darüber
    b.track([[1780, L(1780)], [xl, L(xl)]]); b.wall([[1780, 1720], [1780, L(1780)]]);
    // Naben 0,15 d höher als im Turm: Mit 20 Murmeln stand vor den Kreuzen eine Schlange, und die Erste wurde von den
    // herabkommenden Armspitzen immer wieder zurückgestoßen (16 Läufe: 3 bis 8 Anstöße, so keiner)
    turnstileOn(b, c, U, 2900, -0.5, 0.15); turnstileOn(b, c, U, 3700, -0.5, 0.15); turnstileOn(b, c, L, 3300, -0.5, 0.15);
    // Schacht: rechte Wand ab Höhe der oberen Spur, linke ab dem Ende der unteren; Boden 12° nach links in die Schleuse
    const fy = 4100, kF = tand(12), ex = xl, ey = fy + (xr - xl) * kF;
    b.wall([[xr, 1850], [xr, fy]]); b.wall([[xl, L(xl)], [xl, ey - 2.2 * d]]);
    b.track([[xr, fy], [ex, ey]]);
    const bumpers = [[4790, 2758], [4718, 3190], [4862, 3478], [4790, 3766]];
    b.pegField({ x0: 4646, y0: 2470, cols: 3, rows: 11, dx: 144, dy: 144, rad: d * 0.16,
      skip: (x, y) => bumpers.some(([bx, by]) => (x - bx) ** 2 + (y - by) ** 2 < 40 * 40) });
    for (const [x, y] of bumpers) b.bumper(x, y);
    const noses = []; for (let y = 2614; y < 4000; y += 288) noses.push(y);
    wallNoses(b, c, xl, xr, noses);
    const sch = LV.schleuse(b, c, { ex, ey, dir: -1, slope: 8, keep: c.keep, perLayer: 6, outLen: 1.4 * d, pitW: 2.0 });
    const o = 0.7 * d, xm = (xl + xr) / 2;
    const path = [[x0, y0 + 10], [x0, U(x0) - o], [xl - d, U(xl - d) - o], [xm, 2300], [xm, fy - 2 * d], [xr - d, fy + d * kF - o], ...sch.path];
    return { path, sch, entry: c.prev.exit, exit: [sch.cx, sch.floorY], ride: true,
      frame: { x0: 1700, y0: 1650, x1: 5150, y1: 4650 } };
  }
  // 3 · THE WHEEL (14 → 12): Rampe unter der Schleuse nach links zum Hebe-Rad, einem Riesenrad mit 16 Gondeln. Das
  // Bahnende reicht in die Gondelbahn ganz rechts, wo die Gondeln senkrecht steigen: Wer am Anschlag wartet, wird
  // mitgenommen, vier bis fünf je Gondel. (Weiter unten fuhren die Gondeln schräg in die Schlange und schoben sie
  // zurück.) Hinter dem Scheitel laufen die Gondeln durch die Ausstiegsrinne; die Murmeln rollen nach links in die
  // Schleuse. Das Feld fährt so rund 800 E nach oben und behält die Richtung (ein Schaufelrad hätte es umgedreht, und
  // der Rest des Levels hätte zwischen Rad und Schacht keinen Platz gehabt).
  function gauntletWheel(b, c) {
    const d = c.d, [x0, y0] = c.prev.exit, deg = PI / 180;
    const cx = 3100, R = 18 * d, cw = 5 * d, k5 = tand(5), k7 = tand(7), ap = 0, ae = -110 * deg;
    // Zulauf von der Wand rechts unter der Schleuse (Klappen hängen bis gut 100 unter den Boden) bis zum Anschlag
    const xw = 4600, yw = y0 + 172, P = (x) => yw + (xw - x) * k5;
    const cy = P(cx + R * cos(ap)) - R * sin(ap), xs = cx + R * cos(ap) - cw / 2 + 0.3 * d;
    b.track([[xw, yw], [xs, P(xs)]]); b.wall([[xw, yw - 3 * d], [xw, yw]]); b.wall([[xs, P(xs)], [xs, P(xs) - 0.6 * d]]);
    b.ferris({ x: cx, y: cy, R, n: 16, rps: -0.07, cw, tilt: -6 * deg });
    // Ausstieg: Die Rinne liegt dort, wo die Gondel bei ae ihren Boden hat; sie beginnt in der Gondel und endet links
    // außerhalb der Gondelbahn an der Schleuse
    const ux = cx + R * cos(ae), uy = cy + R * sin(ae), xc = ux + cw / 2 - 0.3 * d, yc = uy - (xc - ux) * k7;
    const ex = cx - R - cw / 2 - 1.3 * d, ey = yc + (xc - ex) * k7;
    b.track([[xc, yc], [ex, ey]]);
    const sch = LV.schleuse(b, c, { ex, ey, dir: -1, slope: 7, keep: c.keep, outLen: 1.4 * d, pitW: 2.0 });
    const o = 0.7 * d, path = [[x0, y0 + 10], [x0, P(x0) - o], [xs + d, P(xs + d) - o]];
    for (let a = ap; a > ae; a -= 12 * deg) path.push([cx + R * cos(a), cy + R * sin(a) - o]);
    path.push([ux, uy - o], [ex + 0.5 * d, ey - o], ...sch.path);
    return { path, sch, entry: c.prev.exit, exit: [sch.cx, sch.floorY], ride: true };
  }
  // 4 · THE COLLAPSE (12 → 10, Sturz zählt): Unter der Schleuse beginnt die Einsturz-Strecke nach links über dem
  // Abgrund. Drei Sekunden nach der Ersten bricht sie hinter dem Feld weg, die Bruchkante wird schneller (300 → 800
  // E/s) und holt die Langsamen irgendwo auf der Brücke ein (mit 2 s und 650 E/s stürzten sie immer gleich am Anfang).
  // Am Ende eine Kehre hinab auf die untere Bahn nach rechts in die Schleuse.
  function gauntletCollapse(b, c) {
    const d = c.d, [x0, y0] = c.prev.exit, kA = tand(4), kB = tand(5), kS = tand(9);
    // Feste Fangbahn unter der Schleuse (9°, die Klappen hängen gut 100 unter den Boden), dann die Brücke von xb0 nach
    // xb1. Ohne feste Fangbahn lagen die zwei Langsamsten beim Losbrechen noch unter der Schleuse und stürzten immer.
    const xs = 2150, ys = y0 + 170, xb0 = 1700, yb0 = ys + (xs - xb0) * kS, xb1 = 300, A = (x) => yb0 + (xb0 - x) * kA, n = 15;
    b.wall([[xs + 8, ys - 4 * d], [xs + 8, ys + 0.6 * d]]); b.track([[xs, ys], [xb0, yb0]]);
    b.bridge({ x0: xb0, y0: yb0, x1: xb1, y1: A(xb1), n, trigger: xb0 - 2 * d, count: 1, delay: 3, speed: [300, 800], sink: 2 * d });
    // Abgrund in Stücken unter der geneigten Brücke (eine Grube ist ein Rechteck; Tötungstiefe unter der tiefsten Planke).
    // Die Stücke überlappen, damit ihre weichen Ränder keine hellen Fugen zeichnen.
    const seg = 4, w = (xb0 - xb1) / seg;
    for (let i = 0; i < seg; i++) {
      const xa = xb1 + i * w + (i === 0 ? 40 : -40), xe = xb1 + (i + 1) * w + (i === seg - 1 ? 0 : 40);
      b.pit(xa, xe, A(xa) + 14, A(xb1) + 260, { kill: true, depth: 1.0 * d, stripes: false });
    }
    // Kehre: Wand links, untere Bahn nach rechts (5°) in die Schleuse
    const xw = 180, yB = A(xb1) + 330, B = (x) => yB + (x - xw) * kB, ex = 1450;
    b.wall([[xw, A(xb1) - 9 * d], [xw, yB]]);
    b.track([[xw, yB], [ex, B(ex)]]);
    const sch = LV.schleuse(b, c, { ex, ey: B(ex), dir: 1, slope: 6, keep: c.keep, outLen: 1.4 * d, pitW: 2.0 });
    const o = 0.7 * d, path = [[x0, y0 + 10], [x0, ys + (xs - x0) * kS - o], [xb0, yb0 - o], [xb1, A(xb1) - o], [xw + d, A(xb1) + d], [xw + d, B(xw + d) - o], [ex - 0.5 * d, B(ex) - o], ...sch.path];
    return { path, sch, entry: c.prev.exit, exit: [sch.cx, sch.floorY], frame: { x0: 60, y0: ys - 600, x1: 2300, y1: yB + 500 } };
  }
  // 5 · TILT (10 → 8): Schiebetor auf der Fangbahn, dann zwei Kippbretter übereinander. Das obere ist rechts zu und
  // links offen, das untere links zu und rechts offen; wer unten rechts herunterfällt, rollt in die Schleuse. Beide
  // Bretter haben eine Grundneigung von 0,1 zum offenen Ende: Ohne sie rollten Murmeln auf dem unteren Brett 30 s und
  // länger hin und her, weil eine halbe Schwingung für die ganze Brettlänge nicht reichte.
  function gauntletTilt(b, c) {
    const d = c.d, [x0, y0] = c.prev.exit, deg = PI / 180, kC = tand(5), kE = tand(7);
    // Fangbahn unter der Schleuse nach links mit Schiebetor (lange offen: Mit 1,2 s von 3 s warteten die hinteren in der
    // Schlange länger als die Festliege-Grenze)
    const xw = 1850, yc = y0 + 190, C = (x) => yc + (xw - x) * kC, xe = 1150;
    b.wall([[xw, yc - 4 * d], [xw, yc]]); b.track([[xw, yc], [xe, C(xe)]]);
    b.gate({ x: 1350, y: C(1350), h: 0.84 * d, open: 1.6, period: 2.6 });
    // Oberes Brett: rechts ein mitkippender Rand (ein Pfosten am Ende), links offen. Eine feste Wand am Brettende
    // klemmte Murmeln zwischen Wand und Brett ein.
    const len = 20 * d, t1x = 760, t1y = C(xe) + 150, amp = 0.21, rise = len / 2 * sin(amp) + 2 * d, endPost = len / 2 - b.rad;
    b.tilt({ x: t1x, y: t1y, len, amp, period: 6.5, posts: [-3 * d, 3 * d, endPost], postH: 0.35, bias: -0.1 });
    // Unteres Brett: links reicht das Brettende in die Außenwand (bewegte Körper gehen durch feste Bahnen). Jede Lücke
    // zwischen Wand und Brettende wurde zur Kerbe, in der eine Murmel nur noch mit dem Brett auf und ab fuhr. Rechts offen.
    const t2x = 660, t2y = t1y + 330, xo = t2x - len / 2 - 4;
    b.tilt({ x: t2x, y: t2y, len, amp, period: 5.5, phase: 1.7, posts: [-2 * d, 4 * d], postH: 0.35, bias: 0.1 });
    b.wall([[xo, t1y - rise], [xo, t2y + rise + d]]);
    // Ausgang: Bahn nach rechts (7°) in die Schleuse
    const ya = t2y + rise + 1.5 * d, xa = t2x + len / 2 - 2 * d, E = (x) => ya + (x - xa) * kE, ex = 1750;
    b.track([[xa, ya], [ex, E(ex)]]); b.wall([[xa, ya - 2 * d], [xa, ya]]);
    const sch = LV.schleuse(b, c, { ex, ey: E(ex), dir: 1, slope: 7, keep: c.keep, outLen: 1.4 * d, pitW: 2.0 });
    const o = 0.8 * d, path = [[x0, y0 + 10], [x0, C(x0) - o], [xe, C(xe) - o], [t1x + len / 2 - d, t1y - o], [t1x - len / 2 + d, t1y - o],
      [t2x - len / 2 + d, t2y - o], [t2x + len / 2 - d, t2y - o], [xa + d, E(xa + d) - o], [ex - 0.5 * d, E(ex) - o], ...sch.path];
    void deg;
    return { path, sch, entry: c.prev.exit, exit: [sch.cx, sch.floorY], frame: { x0: 60, y0: y0 - 400, x1: 2300, y1: E(ex) + 600 } };
  }
  function gauntletSoon(b, c) {
    const [x, y] = c.prev.exit;
    // links eine hohe Wand: Aus dem Becken fallende Murmeln prallen ab und rollten sonst über den Rand
    const out = catchTray(b, c, [[x - 420, y + 20], [x - 400, y + 280], [x + 40, y + 290], [x + 150, y + 120]], [x - 540, y + 260], [[x, y + 10], [x, y + 260]]);
    out.frame = { x0: x - 700, y0: y - 600, x1: x + 400, y1: y + 400 };
    return out;
  }

  const LEVELS = {
    tower: {
      id: 'tower', title: 'THE TOWER', hook: 'PICK YOUR COLOR!', format: 'short',
      r: 28, T: 20, field: FIELD16, quota: [8, 4, 1],
      rules: { ready: 0.4, release: 0.5, look: 0.22, endHold: 2.6, lateMax: 5 },
      // Unter dem Ziel rund 500 frei: So steht das Ziel am Ende bei drei Vierteln der Bildhöhe, nicht am Rand
      bounds: { x0: 0, y0: 0, x1: 1080, y1: 5560 },
      gold: [540, 4960, 1100],                                             // goldener Schimmer ums Ziel
      sections: [
        { id: 'drop', title: 'THE DROP', world: 'dusk', build: towerDrop },
        { id: 'floors', title: 'FALLING FLOORS', world: 'ice', hazard: true, build: towerFloors },
        { id: 'final', title: 'FINAL', world: 'gold', build: towerFinal },
      ],
    },
    gauntlet: {
      id: 'gauntlet', title: 'THE GAUNTLET', format: 'long',
      r: 24, T: 16, field: FIELD20, quota: [17, 14, 12, 10, 8, 7, 6, 5, 3, 1], stages: 10,
      rules: { ready: 3.2, release: 1.2, look: 0.25, endHold: 2.6, lateMax: 6 },
      bounds: { x0: 0, y0: -200, x1: 5300, y1: 7400 },
      sections: [
        { id: 'drop', title: 'THE DROP', world: 'night', build: gauntletDrop },
        { id: 'turnstiles', title: 'TURNSTILES', world: 'forest', build: gauntletTurnstiles },
        { id: 'wheel', title: 'THE WHEEL', world: 'sand', build: gauntletWheel },
        { id: 'collapse', title: 'THE COLLAPSE', world: 'petrol', hazard: true, build: gauntletCollapse },
        { id: 'tilt', title: 'TILT', world: 'dusk', build: gauntletTilt },
        { id: 'soon', title: 'TO BE CONTINUED', world: 'petrol', placeholder: true, build: gauntletSoon },
      ],
    },
  };

  EBS.KnockoutLevels = { LEVELS, COLORS, BANDS, FIELD16, FIELD20 };
})(typeof window !== 'undefined' ? window : globalThis);
