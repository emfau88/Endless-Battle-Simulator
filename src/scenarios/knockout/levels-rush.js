/* Marble Knockout · Gesamtlevel „Rush“ (R44): TRAP TOWER (Short, 9:16) und THE AVALANCHE (Langvideo, 16:9)
 *
 * Zweite Level-Reihe mit mehr Murmeln, mehr Ereignissen und kürzeren Wartezeiten. Gewählt über den Schalter
 * params.level = 'rush'; ohne ihn laufen THE TOWER und THE GAUNTLET unverändert (levels.js). Bauweise wie dort: jeder
 * Abschnitt ist eine Bauanleitung build(b, c) in Welt-Koordinaten, Rückgabe { path, sch, entry, exit }.
 * Plan: docs/MARBLE_KNOCKOUT_RUSH_PLAN_2026-11-27.md, Abschnitte 2 bis 6.
 *
 * Stand Paket R3: TRAP TOWER komplett. THE AVALANCHE mit den Abschnitten 1 bis 5 und einem Platzhalter danach; die
 * Abschnitte 6 bis 10, der Einstiegsflug und die Serie aus zwei Rennen folgen in R4.
 */
(function (global) {
  'use strict';
  const EBS = global.EBS;
  const { tand } = EBS.KnockoutHelpers;
  const { cos, PI } = EBS.KnockoutMath;
  const LV = EBS.KnockoutLevel;
  const { LEVELS, COLORS, BANDS, FIELD20, helpers } = EBS.KnockoutLevels;
  const { wallNoses } = helpers;

  // Acht neue Farben (Plan, Abschnitt 6); Farben mit ähnlichem Nachbarn tragen ein weißes Band. Die alten Felder
  // (FIELD16, FIELD20) nennen keine davon und bleiben gleich.
  // Nach der Farbtafel (R1): INDIGO ohne Band (mit Band sah es im Gedränge aus wie NAVY). Das Short nimmt die 20 Farben
  // aus THE GAUNTLET und die vier deutlichsten neuen; SAND (nah an PEACH und SILVER) und INDIGO nur im Langvideo.
  Object.assign(COLORS, {
    OLIVE: '#7a8a24', INDIGO: '#4338b0', PEACH: '#f7b98b', RUST: '#b5531c',
    MAGENTA: '#c2188f', SAND: '#d8c59a', FOREST: '#2d5a2f', ROSE: '#e8889f',
  });
  BANDS.push('RUST', 'FOREST', 'ROSE');
  const FIELD24 = [...FIELD20, 'OLIVE', 'PEACH', 'MAGENTA', 'RUST'];
  const FIELD28 = [...FIELD20, 'OLIVE', 'INDIGO', 'PEACH', 'RUST', 'MAGENTA', 'SAND', 'FOREST', 'ROSE'];

  // ======================================================================= TRAP TOWER (Short)
  // Maße wie THE TOWER: Turm so breit wie das Bild (1080), Wände bei 20 und 1060 (innen 30 bis 1050), r 28 (d 56).

  // 1 · TRAPDOORS (24 → TOP 14, Sturz zählt): Käfig mit zwei Reihen, kurzes Nagelfeld mit zwei Bumpern, darunter ein
  // Falltür-Boden aus sieben Platten (8° nach rechts) über einem Gefängnis. Am Ende des Bodens fällt man rechts in einen
  // Schacht auf die Rampe (10°) nach links in die Schleuse. Nach fünf Stürzen schließen die Falltüren (trapsAt), den
  // Rest entscheidet die Schleuse.
  // Abweichungen vom Plan nach Messung (je 8 Läufe): Mit 5°, Takt 0,7 s, offen 0,8 s und Schließen erst nach zehn
  // Stürzen fielen in jedem Lauf zehn, um die Schleuse kämpfte niemand mehr, und der Abschnitt dauerte 13,7 s. Mit 8°,
  // Takt 1,0 s, offen 0,6 s und Schließen nach fünf: Median 6 Stürze, 4 zu spät, Schleuse zu nach 9,8 s. Platten
  // 2,3 d statt 2,6 d breit (sieben zu 2,6 d füllten die ganze Breite, dann bliebe kein Ausgang zur Rampe). Käfigrand
  // 24 statt 12: Links klemmte eine Murmel zwischen Wand und erstem Scharnier.
  function trapDoors(b, c) {
    const d = c.d, cx = 540;
    b.wall([[20, 110], [20, c.H]]); b.wall([[1060, 110], [1060, c.H]]);   // Turmwände über alle Abschnitte
    b.dropShelf({ x0: 78, x1: 1002, y: 280, n: c.n, flaps: 8, pad: 24, rows: 2 });
    const bumpers = [[330, 630], [750, 630]];
    b.pegField({ x0: 120, y0: 490, cols: 11, rows: 6, dx: 84, dy: 70, rad: d * 0.16,
      skip: (x, y) => bumpers.some(([bx, by]) => (x - bx) ** 2 + (y - by) ** 2 < 90 * 90) });
    for (const [x, y] of bumpers) b.bumper(x, y);
    wallNoses(b, c, 20, 1060, [560, 700, 840]);                          // alle versetzten Reihen
    // Falltür-Boden: Scharnier links an der Wand, sieben Platten nach rechts abwärts
    const xs = 32, Fy = 1000, kF = tand(8), w = 2.3 * d, np = 7, xe = xs + np * w * cos(8 * PI / 180);
    const fl = (x) => Fy + (x - xs) * kF;
    b.trapdoors({ x0: xs, y: Fy, n: np, w, interval: 1.0, blink: 0.5, open: 0.6, start: 1.0, slope: 8 });
    // Gefängnis unter dem Boden (nach der Rückmeldung zu R1 statt eines schwarzen Abgrunds): Wer durch eine Klappe
    // fällt, ist raus (Tötungstiefe 1 d unter der Oberkante), bleibt aber hinter Gittern sichtbar liegen. Unsichtbarer
    // Grund mit 3° nach links und rechte Wand bis unter das Bodenende; die Gruben in zwei überlappenden Stücken unter dem
    // geneigten Boden, das letzte endet kurz vor dem Bodenende. Gezeichnet über decor 'jail' (art.js).
    // Gefangene liegen auf Ebene 4 (levelsim, fell): Grund und Wand unten gelten für beide Ebenen (Maske 5); die linke
    // Wand und der Teil der rechten über dem Bodenende nur für Gefangene, damit die anderen weiter über das Ende rollen.
    const xm = (xs + xe) / 2, xw = xe + 4, kJ = tand(3), jail = (x) => 1300 + (xw - x) * kJ;
    b.track([[30, jail(30)], [xw, jail(xw)]], { hidden: true, rest: 0.1, fric: 0.5, mask: 5 });
    b.track([[xw, fl(xe) + 8], [xw, jail(xw)]], { hidden: true, mask: 5 });
    b.track([[xw, fl(xe) - 80], [xw, fl(xe) + 8]], { hidden: true, mask: 4 });
    b.track([[30, fl(30) - 20], [30, jail(30)]], { hidden: true, mask: 4 });
    b.pit(xs, xm + 40, fl(xs) + 14, jail(xm + 40) - 4, { kill: true, depth: 1.0 * d, stripes: false, jail: true });
    b.pit(xm - 40, xe - 0.3 * d, fl(xm - 40) + 14, jail(xe) - 4, { kill: true, depth: 1.0 * d, stripes: false, jail: true });
    b.decor.push({ kind: 'jail', x0: 30, x1: xw, ya: fl(30), yb: fl(xw), ja: jail(30), jb: jail(xw) });
    // Rampe unter dem Gefängnis von der rechten Wand nach links (10°) in die Schleuse. Sie liegt 140 E tiefer als mit
    // dem Abgrund: Sonst stauten sich die Murmeln im Schacht zwischen Gefängnis und Turmwand.
    const kR = tand(10), ramp = (x) => 1440 + (1050 - x) * kR, ex = 680;
    b.track([[1050, ramp(1050)], [ex, ramp(ex)]]);
    const sch = LV.schleuse(b, c, { ex, ey: ramp(ex), dir: -1, slope: 10, keep: c.keep, outLen: 1.4 * d, pitW: 2.4, sign: 'out' });
    const o = 0.7 * d, xl = xe - 0.3 * d;
    const path = [[cx, 250], [cx, fl(cx) - o], [xl, fl(xl) - o], [990, ramp(990) - o], [ex + 0.5 * d, ramp(ex + 0.5 * d) - o], ...sch.path];
    return { path, sch, exit: [sch.cx, sch.floorY] };
  }
  // 2 · SWEEPERS (14 → TOP 7): zwei Simse übereinander über die ganze Breite, gegenläufig mit 8°. Jeder hat zwei
  // Lücken (Abkürzung nach unten, kein Abgrund) und einen Kehrarm (zwei Arme zu 3,6 d, 0,25 U/s). Darunter ein
  // Trichter in einen Mischkasten aus fünf Stiften, Rampe nach links in die Schleuse.
  // Abweichung vom Plan nach Messung (je 16 Läufe): Beide Arme kehrten zuerst gegen den Strom; oben stand dann eine
  // Schlange aus sieben Murmeln 2 bis 3 s vor dem Arm. Jetzt kehrt der obere mit dem Strom, der untere dagegen (wirft
  // eine Führende zurück); der Abschnitt ist gleich lang oder kürzer (Median 9,4 s, längster 10,1 s).
  // Maße: Der obere Kehrarm bleibt 200 E von den offenen Klappen der Schleuse darüber und 10 E von der Turmwand weg;
  // der untere schwingt knapp 50 E unter dem oberen Sims durch.
  function trapSweepers(b, c) {
    const d = c.d, [x0, y0] = c.prev.exit, k8 = tand(8), arm = 3.6 * d, gw = 1.5 * d;
    // Sims A nach rechts (Ende 90 vor der Wand), Sims B von der rechten Wand nach links (Ende 90 vor der Wand)
    const A = (x) => 2240 + (x - 30) * k8, B = (x) => 2640 + (1050 - x) * k8, aEnd = 960, bEnd = 120;
    const ledge = (at, xa, xb, gaps) => {                               // Bahn von xa nach xb mit Lücken (Mitten)
      const cuts = gaps.slice().sort((p, q) => (xa < xb ? p - q : q - p)), dir = xa < xb ? 1 : -1;
      let x = xa;
      for (const g of cuts) { const e = g - dir * gw / 2; b.track([[x, at(x)], [e, at(e)]]); x = g + dir * gw / 2; }
      b.track([[x, at(x)], [xb, at(xb)]]);
    };
    ledge(A, 30, aEnd, [560, 700]);
    ledge(B, 1050, bEnd, [700, 450]);
    // Kehrarme: Spitze knapp über der Bahn (wie in der Galerie); rps < 0 kehrt unten nach rechts, auf A also mit dem
    // Strom, auf B gegen ihn
    const sweep = (at, x, rps) => b.turnstile({ x, y: at(x) - b.rad - 0.15 * d - arm, arm, arms: 2, rps });
    sweep(A, 830, -0.25); sweep(B, 260, -0.25);
    // Trichter (12°) in den Mischkasten (innen 590 bis 910), fünf Stifte 2-1-2, 1,4 d bis zur Wand
    const Cy = 2860, k12 = tand(12), L = 590, R = 910, top = (x) => (x <= L ? Cy + (x - 30) * k12 : Cy + (1050 - x) * k12);
    b.track([[30, Cy], [L, top(L)]]); b.track([[1050, Cy], [R, top(R)]]);
    for (const [x, y] of [[687, 3020], [813, 3020], [750, 3095], [687, 3170], [813, 3170]]) b.peg(x, y, d * 0.16);
    // Rampe (10°) unter dem Kasten nach links in die Schleuse; die rechte Kastenwand ist der Anschlag
    const kR = tand(10), ramp = (x) => 3260 + (R - x) * kR, ex = 540;
    b.wall([[L, top(L)], [L, ramp(L) - 1.6 * d]]); b.wall([[R, top(R)], [R, ramp(R)]]);
    b.track([[R, ramp(R)], [ex, ramp(ex)]]);
    const sch = LV.schleuse(b, c, { ex, ey: ramp(ex), dir: -1, slope: 10, keep: c.keep, outLen: 1.4 * d, pitW: 2.4, sign: 'out' });
    const o = 0.7 * d;
    const path = [[x0, y0 + 10], [x0, A(x0) - o], [aEnd - 20, A(aEnd - 20) - o], [1000, B(1000) - o], [bEnd + 20, B(bEnd + 20) - o],
      [90, top(90) - o], [L, top(L) - o], [750, 3060], [750, 3220], [R - 0.8 * d, ramp(R - 0.8 * d) - o], ...sch.path];
    return { path, sch, entry: c.prev.exit, exit: [sch.cx, sch.floorY] };
  }

  // 3 · FINAL (7 → 1): Trichter über die ganze Breite (20°) in einen Kanal (innen 2,2 Murmeln breit), von vorn in die
  // Drehbühne (R 7 d, drei Ausgänge). Darunter wie im Turm: Fangbahn, Steilabfahrt mit zwei Mulden, offene Zielgerade
  // (5°) und die Schiene hinter dem Ziel.
  // Abweichung vom Plan nach Messung (je 16 bis 24 Läufe): Mit zwei inneren Ringen (0,66 und 0,36) und 0,12 U/s hielt
  // die Bühne die Erste im Median 2,8 s und bis 16 s fest, das Finale dauerte bis 21 s. Mit einem Ring (0,5), drei
  // Speichen und 0,2 U/s: Erste nach 2,2 s heraus (längstens 3,3 s), Finale 10 s (längstens 12,5 s).
  function trapFinal(b, c) {
    const d = c.d, cx = 540, [x0, y0] = c.prev.exit;
    const Fy = y0 + 120, k20 = tand(20), hw = 1.1 * d + b.rad, nl = cx - hw, nr = cx + hw, ny = Fy + (nl - 30) * k20;
    b.track([[30, Fy], [nl, ny]]); b.track([[1050, Fy], [nr, ny]]);
    const R = 7 * d, cy = ny + R + 90;
    b.wall([[nl, ny], [nl, cy - 0.6 * d]], { front: true }); b.wall([[nr, ny], [nr, cy - 0.6 * d]], { front: true });
    b.maze({ x: cx, y: cy, R, rps: 0.2, rings: [0.5], spokes: 3, exits: 3 });
    // Fangbahn unter der Bühne nach links (12°); am Ende 90 Luft zur Wand zum Durchfallen
    const kA = tand(12), yA = cy + R + 150, rowA = (x) => yA + (1050 - x) * kA, xa = 120;
    b.track([[1050, rowA(1050)], [xa, rowA(xa)]]);
    // Steilabfahrt nach rechts (13°) mit zwei Mulden (22°, Gegenhang 10°), endet 90 vor der Wand
    const kB = tand(13), kD = tand(22), kU = tand(10), Bp = [[30, rowA(xa) + 130]];
    const run = (x, kk) => { const [px, py] = Bp[Bp.length - 1]; Bp.push([x, py + (x - px) * kk]); };
    run(330, kB); run(400, kD); run(470, -kU); run(640, kB); run(710, kD); run(780, -kU); run(950, kB);
    b.track(Bp);
    const rowB = (x) => { for (let i = 1; i < Bp.length; i++) if (x <= Bp[i][0]) return Bp[i - 1][1] + (Bp[i][1] - Bp[i - 1][1]) * (x - Bp[i - 1][0]) / (Bp[i][0] - Bp[i - 1][0]); return Bp[Bp.length - 1][1]; };
    // Zielgerade nach links (5°), offen; Ziel bei xf, dahinter die Schiene bis an die Wand
    const kC = tand(5), yC = Bp[Bp.length - 1][1] + 120, rowC = (x) => yC + (1050 - x) * kC, xf = 460, xe = 60;
    b.track([[1050, rowC(1050)], [xf, rowC(xf)], [xe, rowC(xf) + (xf - xe) * tand(1.5)]]);
    b.wall([[xe, rowC(xf) + (xf - xe) * tand(1.5)], [xe, rowC(xf) - 1.4 * d]]);
    const lo = rowC(xf) - b.rad, hi = lo - 3 * d;
    b.finishLine({ ax: xf, ay: hi, bx: xf, by: lo });
    const o = 0.7 * d;
    const path = [[x0, y0 + 10], [cx, ny - 0.3 * d], [cx, cy], [cx, rowA(cx) - o], [xa, rowA(xa) - o], [60, rowB(60) - o],
      ...Bp.slice(1).map(([x]) => [x, rowB(x) - o]), [1000, rowC(1000) - o], [xf, rowC(xf) - o]];
    return { path, fin: b.finish, entry: c.prev.exit, exit: null };
  }

  // ======================================================================= THE AVALANCHE (Langvideo)
  // Turm-Prinzip quer: Die Welt ist so breit wie das Bild bei Zoom 0,85 (2256 E). Die Kamera steht waagerecht fest und
  // fährt nur senkrecht (spec.cam). Wände bei 120 und 2136 (innen 128 bis 2128), Mitte 1128; rechts neben der Wand
  // steht die Röhre OUT der Anzeige. r 24 (d 48), 28 Murmeln. Jeder Abschnitt ist etwa eine Bildhöhe (1270 E) hoch,
  // BIG DROP zwei.
  const AX = 1128, AL = 120, AR = 2136, IL = 128, IR = 2128;

  /** Gefängnis unter einem Falltür-Boden fl(x) von xa bis xb (wie in TRAP TOWER). low: Seite, an der die Murmeln den
   *  Boden verlassen ('left' oder 'right'); gy(x): Grund. Wände an der tiefen Seite unten für alle (Maske 5), sonst nur
   *  für Gefangene (Maske 4), damit die anderen über das Bodenende weiterrollen. */
  function jailUnder(b, c, { xa, xb, fl, low, gy }) {
    const d = c.d, xl = xa - 4, xr = xb + 4, xm = (xa + xb) / 2, lowX = low === 'right' ? xr : xl, highX = low === 'right' ? xl : xr;
    b.track([[xl, gy(xl)], [xr, gy(xr)]], { hidden: true, rest: 0.1, fric: 0.5, mask: 5 });
    b.track([[lowX, fl(lowX) + 8], [lowX, gy(lowX)]], { hidden: true, mask: 5 });
    b.track([[lowX, fl(lowX) - 80], [lowX, fl(lowX) + 8]], { hidden: true, mask: 4 });
    b.track([[highX, fl(highX) - 20], [highX, gy(highX)]], { hidden: true, mask: 4 });
    // Gruben in zwei überlappenden Stücken unter dem geneigten Boden; am tiefen Ende 0,3 d frei
    const a0 = low === 'left' ? xa + 0.3 * d : xa, b1 = low === 'right' ? xb - 0.3 * d : xb;
    for (const [p, q] of [[a0, xm + 40], [xm - 40, b1]]) {
      b.pit(p, q, Math.min(fl(p), fl(q)) + 14, Math.min(gy(p), gy(q)) - 4, { kill: true, depth: 1.0 * d, stripes: false, jail: true });
    }
    b.decor.push({ kind: 'jail', x0: xl, x1: xr, ya: fl(xl), yb: fl(xr), ja: gy(xl), jb: gy(xr) });
  }

  // 1 · THE AVALANCHE (28 → TOP 25): Käfig mit zwei Reihen zu je 14, Nagelwand mit 5 Reihen (72 × 54 wie in THE
  // GAUNTLET) und vier Bumpern, Abweiser an beiden Wänden. Drei Trichter (Hälse innen 2,6 d); die beiden äußeren
  // fallen auf eine Spur im V (9°) zur Mitte, der mittlere direkt in den Mischkasten (Stifte 2-1, Boden 18°). Rechts
  // unten aus dem Kasten (3,4 d offen), kurze Rampe nach rechts, Anschlag, Rampe zurück nach links in die Schleuse
  // (beide 11°).
  // Abweichung vom Plan nach Messung (je 4 bis 8 Läufe): Mit acht Reihen, Hälsen von 2,3 d und einer Spur nach rechts
  // über die ganze Breite dauerte der Abschnitt im Median 20,6 s; die Murmeln aus dem linken Trichter brauchten allein
  // 6,5 s über die Spur. Danach bremste der Kasten: alle 25 einzeln durch die Öffnung. Jetzt 13,6 bis 14,8 s.
  function avDrop(b, c) {
    const d = c.d;
    b.wall([[AL, 120], [AL, c.H]]); b.wall([[AR, 120], [AR, c.H]]);   // Wände über alle Abschnitte
    b.dropShelf({ x0: 528, x1: 1728, y: 220, n: c.n, flaps: 12, pad: 24, rows: 2 });
    const bumpers = [[528, 548], [928, 602], [1328, 548], [1728, 602]];
    b.pegField({ x0: 228, y0: 440, cols: 26, rows: 5, dx: 72, dy: 54, rad: d * 0.16,
      skip: (x, y) => bumpers.some(([bx, by]) => (x - bx) ** 2 + (y - by) ** 2 < 80 * 80) });
    for (const [x, y] of bumpers) b.bumper(x, y);
    wallNoses(b, c, AL, AR, [494, 602]);                                // alle versetzten Reihen
    // Drei Trichter mit Grat dazwischen; Hälse bei 600, 1128 und 1656
    const necks = [600, AX, 1656], hw = 1.3 * d + b.rad, top = 730, peak = 740, ny = 820;
    const pk = [(necks[0] + AX) / 2, (necks[2] + AX) / 2];
    b.track([[AL, top], [necks[0] - hw, ny]]);
    b.track([[necks[0] + hw, ny], [pk[0], peak], [necks[1] - hw, ny]]);
    b.track([[necks[1] + hw, ny], [pk[1], peak], [necks[2] - hw, ny]]);
    b.track([[necks[2] + hw, ny], [AR, top]]);
    // Spur im V unter den äußeren Hälsen (rund 2 d Luft), endet an den Wänden des Kastens
    const kV = tand(9), kl = 1000, kr = 1256, ly = ny + 110, lane = (x) => (x < AX ? ly + (x - necks[0]) * kV : ly + (necks[2] - x) * kV);
    b.track([[IL, lane(IL)], [kl, lane(kl)]]); b.track([[IR, lane(IR)], [kr, lane(kr)]]);
    // Mischkasten (innen 256 E, Stifte 2-1), Boden 18° nach rechts, rechts unten offen; dahinter die Rampe (11°)
    const kF = tand(11), kB = tand(18), yF = lane(kl) + 215, xt = 1440, xw = xt + 100;
    const F = (x) => (x < kr ? yF + (x - kl) * kB : yF + (kr - kl) * kB + (x - kr) * kF);
    b.wall([[kl, lane(kl)], [kl, F(kl)]]); b.wall([[kr, lane(kr)], [kr, F(kr) - 3.4 * d]]);
    for (const [x, y] of [[1064, yF - 140], [1192, yF - 140], [1128, yF - 80]]) b.peg(x, y, d * 0.16);
    b.track([[kl, F(kl)], [kr, F(kr)], [xt, F(xt)]]);
    // Anschlag und Rampe zurück nach links in die Schleuse; unter dem Ende der ersten Rampe 2,4 d Luft
    const yG = F(xt) - (xw - xt) * kF + 2.4 * d, G = (x) => yG + (xw - x) * kF, ex = 1100;
    b.wall([[xw, F(xt) - 2 * d], [xw, G(xw)]]);
    b.track([[xw, G(xw)], [ex, G(ex)]]);
    const sch = LV.schleuse(b, c, { ex, ey: G(ex), dir: -1, slope: 8, keep: c.keep, perLayer: 10, outLen: 1.4 * d, pitW: 2.0 });
    const o = 0.7 * d;
    const path = [[AX, 200], [AX, ny], [AX, yF - 40], [kr + d, F(kr + d) - o], [xt, F(xt) - o], [xw - 0.8 * d, G(xw - 0.8 * d) - o],
      [ex + 0.5 * d, G(ex + 0.5 * d) - o], ...sch.path];
    return { path, sch, exit: [sch.cx, sch.floorY], frame: { x0: 0, y0: 0, x1: 2256, y1: sch.floorY + 150 } };
  }

  // 2 · TRAPDOORS (25 → TOP 22, Sturz zählt): zwei Falltür-Böden im Zickzack, je mit Gefängnis darunter. Fangbahn unter
  // der Schleuse nach rechts auf Boden A (7° nach rechts), am Ende durch den Spalt an der Wand auf die Zufahrt zu
  // Boden B (7° nach links) unter dem Gefängnis von A, am Ende von B in die Schleuse. Nach drei Stürzen schließen alle
  // Falltüren (trapsAt). Abweichung vom Plan: Gefälle 7° statt 5°, Takt 0,8 s statt 0,6 s, je 8 Platten zu 2,4 d statt
  // 2,6 d (sonst bliebe an der Wand kein Spalt).
  function avTrapdoors(b, c) {
    const d = c.d, [x0, y0] = c.prev.exit, k7 = tand(7), k6 = tand(6), kJ = tand(3), w = 2.4 * d, np = 8, L = np * w * cos(7 * PI / 180);
    // Fangbahn (6°) unter dem ganzen Becken der Schleuse darüber; 230 E tief, denn die offenen Klappen hängen gut 100 E
    // unter den Boden (mit 170 E hielten sie am linken Ende Murmeln fest)
    const xc = 520, C = (x) => y0 + 230 + (x - xc) * k6, xa = 1100;
    b.wall([[xc, C(xc) - 2 * d], [xc, C(xc)]]); b.track([[xc, C(xc)], [xa, C(xa)]]);
    // Boden A: Scharnier links, acht Platten nach rechts abwärts; danach der Spalt (2 d) an der Wand
    const yA = C(xa), A = (x) => yA + (x - xa) * k7, xae = xa + L;
    b.trapdoors({ x0: xa, y: yA, n: np, w, interval: 0.8, blink: 0.5, open: 0.6, start: 1.0, slope: 7 });
    const gA = (x) => A(xae) + 170 + (xae - x) * kJ;
    jailUnder(b, c, { xa, xb: xae, fl: A, low: 'right', gy: gA });
    // Zufahrt von der Wand nach links (7°) unter dem Gefängnis von A bis zum hohen Ende von B
    const xbh = 978 + L, yL = gA(xbh) + 2.2 * d, Z = (x) => yL - (x - xbh) * k7;
    b.track([[IR, Z(IR)], [xbh, Z(xbh)]]);
    // Boden B: Scharnier links, Platten steigen nach rechts (die Murmeln rollen nach links)
    const xb = 978, yB0 = Z(xbh) + L * k7, B = (x) => yB0 - (x - xb) * k7;
    b.trapdoors({ x0: xb, y: yB0, n: np, w, interval: 0.8, blink: 0.5, open: 0.6, start: 1.0, slope: -7 });
    const gB = (x) => yB0 + 170 + (x - xb) * kJ;
    jailUnder(b, c, { xa: xb, xb: xbh, fl: B, low: 'left', gy: gB });
    // Auslauf in die Schleuse
    const ex = 900, ey = yB0 + (xb - ex) * k7;
    b.track([[xb, yB0], [ex, ey]]);
    const sch = LV.schleuse(b, c, { ex, ey, dir: -1, slope: 7, keep: c.keep, perLayer: 9, outLen: 1.4 * d, pitW: 2.0 });
    const o = 0.7 * d;
    const path = [[x0, y0 + 10], [x0, C(x0) - o], [xa, yA - o], [xae, A(xae) - o], [2080, A(xae) + 40], [2080, Z(2080) - o],
      [xbh, Z(xbh) - o], [xb, yB0 - o], [ex + 0.5 * d, ey - o], ...sch.path];
    return { path, sch, entry: c.prev.exit, exit: [sch.cx, sch.floorY], frame: { x0: 0, y0: y0 - 100, x1: 2256, y1: sch.floorY + 150 } };
  }

  // 3 · THE STAIRS (22 → TOP 19): fünf Treppen übereinander, jede steigt nach rechts ab (Stufe 3 d breit, 1 d tiefer als
  // die vorige, Lücke 1,4 d). Die Reihen sind um eine halbe Stufe versetzt: Wer durch eine Lücke fällt, landet auf der
  // Treppe darunter; viele springen gleichzeitig. Darunter eine Sammelbahn mit dem Gefälle der Treppen in die Schleuse.
  function avStairs(b, c) {
    // Oberste Reihe 200 E unter dem Becken darüber (Platz für die offenen Klappen)
    const d = c.d, [x0, y0] = c.prev.exit, P = 4.4 * d, H = 2.2 * d, kS = d / P, tilt = tand(3), Y0 = y0 + 200, X0 = 240;
    const rows = [[0, 6], [1, 5], [2, 6], [3, 5], [4, 6]];               // [Reihe, Stufen]
    const stepY = (j, k) => Y0 + j * H + k * d + (j % 2) * d / 2, stepX = (j, k) => X0 + k * P + (j % 2) * P / 2;
    for (const [j, n] of rows) for (let k = 0; k < n; k++) {
      const x = stepX(j, k), y = stepY(j, k);
      b.track([[x, y], [x + 3 * d, y + 3 * d * tilt]]);
    }
    // Sammelbahn unter der untersten Reihe, gleiches Gefälle, von der Wand bis in die Schleuse rechts
    const coll = (x) => stepY(4, 0) + H + d / 2 + (x - X0) * kS, ex = 1520;
    b.track([[IL, coll(IL)], [ex, coll(ex)]]);
    const sch = LV.schleuse(b, c, { ex, ey: coll(ex), dir: 1, slope: 8, keep: c.keep, perLayer: 8, outLen: 1.4 * d, pitW: 2.0 });
    const o = 0.7 * d, mid = (x) => stepY(2, 0) + (x - X0) * kS - o;
    const path = [[x0, y0 + 10], [x0, mid(x0) - 2 * H], [1460, mid(1460)], [1490, coll(1490) - o], [ex - 0.5 * d, coll(ex - 0.5 * d) - o], ...sch.path];
    return { path, sch, entry: c.prev.exit, exit: [sch.cx, sch.floorY], frame: { x0: 0, y0: y0 - 100, x1: 2256, y1: sch.floorY + 150 } };
  }

  // 4 · BIG DROP (19 → TOP 16): Fallschacht 14 d breit, rund zwei Bildhöhen tief, Stifte alle 3 d, sechs Bumper,
  // Abweiser an beiden Wänden. Boden 12° nach links in die Schleuse neben dem Schacht. Die Kamera fährt mit.
  function avBigDrop(b, c) {
    const d = c.d, [x0, y0] = c.prev.exit, xl = 1400, xr = 2072, xm = (xl + xr) / 2, top = y0 + 30;
    const k12 = tand(12), fyR = y0 + 2440, F = (x) => fyR + (xr - x) * k12, ex = xl, ey = F(ex);
    b.wall([[xr, top], [xr, fyR]]); b.wall([[xl, top], [xl, ey - 2.2 * d]]);
    b.track([[xr, fyR], [ex, ey]]);
    const y1 = y0 + 260, rowsN = 14, dy = 3 * d;
    const bumpers = [[1736, y1 + 3 * dy], [1592, y1 + 5 * dy], [1880, y1 + 7 * dy], [1736, y1 + 9 * dy], [1592, y1 + 11 * dy], [1880, y1 + 13 * dy]];
    b.pegField({ x0: xl + 120, y0: y1, cols: 4, rows: rowsN, dx: 3 * d, dy, rad: d * 0.16,
      skip: (x, y) => bumpers.some(([bx, by]) => (x - bx) ** 2 + (y - by) ** 2 < 40 * 40) });
    for (const [x, y] of bumpers) b.bumper(x, y);
    const noses = []; for (let j = 1; j < rowsN; j += 2) noses.push(y1 + j * dy);
    wallNoses(b, c, xl, xr, noses);
    const sch = LV.schleuse(b, c, { ex, ey, dir: -1, slope: 8, keep: c.keep, perLayer: 7, outLen: 1.4 * d, pitW: 2.0 });
    const o = 0.7 * d;
    const path = [[x0, y0 + 10], [xm, y1 - d], [xm, F(xm) - 2 * d], [xl + d, F(xl + d) - o], ...sch.path];
    return { path, sch, entry: c.prev.exit, exit: [sch.cx, sch.floorY], ride: true, frame: { x0: 0, y0: y0 - 100, x1: 2256, y1: sch.floorY + 150 } };
  }

  /** Sims at(x) von xa nach xb mit Löchern (Mitten holes, Breite hw) über einem Schacht; vor jedem Loch eine flache
   *  Kante wie in der Hammergasse. Unter jedem Loch ein Deckel, der beim Schließen der Fallen hochfährt. */
  function holeLedge(b, c, at, xa, xb, holes, hw) {
    const d = c.d, dir = xb > xa ? 1 : -1;
    let xs = xa;
    for (const h of holes.slice().sort((p, q) => dir * (p - q))) {
      const xe = h - dir * hw / 2;                                     // Kante vor dem Loch
      b.track([[xs, at(xs)], [xe - dir * 0.6 * d, at(xe - dir * 0.6 * d)], [xe, at(xe) - 0.12 * d]]);
      xs = h + dir * hw / 2;
      const ha = h - hw / 2, hb = h + hw / 2;
      b.pit(h - 2.2 * d, h + 2.2 * d, at(h) + 6, at(h) + 2.4 * d, { kill: true, depth: 1.1 * d, mouth: { xa: ha, ya: at(ha), xb: hb, yb: at(hb) } });
      b.lid({ x0: ha + b.rad, y0: at(ha), x1: hb - b.rad, y1: at(hb) });
    }
    b.track([[xs, at(xs)], [xb, at(xb)]]);
  }

  // 5 · SWEEPERS (16 → TOP 14, Sturz zählt): zwei Simse übereinander (7°, gegenläufig), drei Löcher mit Deckel über
  // einem Schacht, drei Kehrarme (Arme 3,6 d, 0,25 U/s). Oben nach rechts: ein Kehrarm mit dem Strom, ein Loch, ein
  // Kehrarm dagegen kurz vor dem Ende (wirft zurück ins Loch); durch den Spalt an der Wand auf den unteren Sims nach
  // links: zwei Löcher, ein Kehrarm mit dem Strom dazwischen. Nach zwei Stürzen schließen die Deckel (trapsAt), und der
  // Kehrarm gegen den Strom parkt schräg.
  // Abweichung vom Plan nach Messung (je 8 bis 16 Läufe): Kehrarme gegen den Strom ließen 16 Murmeln kaum durch; vor
  // dem unteren stand eine Schlange aus acht, und eine einzelne Murmel wurde im Takt des Arms immer wieder
  // zurückgeworfen (Zeitlimit in fast jedem Lauf). Jetzt nur noch einer dagegen, und der parkt. Die Simse liegen 230 E
  // unter dem Becken darüber (Klappen). Der Abschnitt bleibt mit rund 17 s im Median über dem Ziel von 15 s.
  function avSweepers(b, c) {
    const d = c.d, [x0, y0] = c.prev.exit, k7 = tand(7), arm = 3.6 * d, hw = 1.6 * d;
    const xa = 900, xae = 2030, A = (x) => y0 + 230 + (x - xa) * k7;
    b.wall([[xa, A(xa) - 2 * d], [xa, A(xa)]]);
    holeLedge(b, c, A, xa, xae, [1775], hw);
    const yB = y0 + 577, B = (x) => yB + (IR - x) * k7, ex = 700;
    holeLedge(b, c, B, IR, ex, [1650, 1000], hw);
    // Kehrarme: Spitze knapp über dem Sims (wie in TRAP TOWER); rps < 0 kehrt unten nach rechts; park beim Arm dagegen
    const sweep = (at, x, rps, park) => b.turnstile({ x, y: at(x) - b.rad - 0.15 * d - arm, arm, arms: 2, rps, park });
    sweep(A, 1600, -0.25); sweep(A, 1950, 0.25, true); sweep(B, 1300, 0.25);
    const sch = LV.schleuse(b, c, { ex, ey: B(ex), dir: -1, slope: 7, keep: c.keep, perLayer: 6, outLen: 1.4 * d, pitW: 2.0 });
    const o = 0.7 * d;
    const path = [[x0, y0 + 10], [x0, A(x0) - o], [xae, A(xae) - o], [2080, A(xae) + 40], [2080, B(2080) - o], [ex + 0.5 * d, B(ex + 0.5 * d) - o], ...sch.path];
    return { path, sch, entry: c.prev.exit, exit: [sch.cx, sch.floorY], frame: { x0: 0, y0: y0 - 100, x1: 2256, y1: sch.floorY + 150 } };
  }

  // Platzhalter (bis R4): Fangschale unter der Schleuse, das Video endet kurz danach
  function avSoon(b, c) {
    const x = c.prev.exit[0], y = c.prev.exit[1] + 300;
    b.track([[Math.max(IL, x - 500), y - 90], [x - 200, y], [x + 200, y], [x + 500, y - 90]]);
    b.sign(x, y - 140, 'TO BE CONTINUED', { size: 30, h: 10 });
    return { path: [[x, c.prev.exit[1] + 10], [x, y - 30]], entry: c.prev.exit };
  }

  LEVELS.avalanche = {
    id: 'avalanche', title: 'THE AVALANCHE', format: 'long',
    r: 24, T: 16, field: FIELD28, quota: [25, 22, 19, 16, 14, 14], stages: 10,
    // R3 noch ohne Einstiegsflug (kommt in R4 mit beiden Karten); quietStart: keine Einblendung in den ersten 2,3 s des
    // Rennens (28 Murmeln in der Nagelwand springen zufällig um viele Plätze)
    rules: { ready: 1.5, release: 0.6, look: 0.25, endHold: 2.6, lateMax: 4, quietStart: 3.8 },
    // Feste Breite: Zoom 0,85 zeigt genau die Welt (1920 / 0,85 = 2259 E); waagerecht steht die Kamera
    cam: { zmin: 0.85, zmax: 0.85, lockX: true },
    bounds: { x0: 0, y0: 0, x1: 2256, y1: 8700 },                      // R3: Abschnitte 1 bis 5 und Platzhalter
    sections: [
      { id: 'avalanche', title: 'THE AVALANCHE', world: 'night', build: avDrop },
      { id: 'trapdoors', title: 'TRAPDOORS', world: 'petrol', hazard: true, trapsAt: 3, build: avTrapdoors },
      { id: 'stairs', title: 'THE STAIRS', world: 'sand', build: avStairs },
      { id: 'bigdrop', title: 'BIG DROP', world: 'forest', build: avBigDrop },
      { id: 'sweepers', title: 'SWEEPERS', world: 'slate', hazard: true, trapsAt: 2, build: avSweepers },
      { id: 'soon', title: 'TO BE CONTINUED', world: 'dusk', placeholder: true, build: avSoon },
    ],
  };

  LEVELS.trap = {
    id: 'trap', title: 'TRAP TOWER', hook: 'PICK YOUR COLOR!', format: 'short',
    r: 28, T: 20, field: FIELD24, quota: [14, 7, 1],
    // quietStart: keine Einblendung, solange der Spruch zum Start steht (bis 3,2 s)
    rules: { ready: 0.4, release: 0.5, look: 0.22, endHold: 2.6, lateMax: 4, quietStart: 3.2 },
    // Unter dem Ziel rund 500 frei wie im Turm (das Ziel steht am Ende bei drei Vierteln der Bildhöhe)
    bounds: { x0: 0, y0: 0, x1: 1080, y1: 6140 },
    gold: [540, 5550, 1100],                                             // goldener Schimmer ums Ziel
    sections: [
      { id: 'trapdoors', title: 'TRAPDOORS', world: 'petrol', hazard: true, trapsAt: 5, build: trapDoors },
      { id: 'sweepers', title: 'SWEEPERS', world: 'plum', build: trapSweepers },
      { id: 'final', title: 'FINAL', world: 'gold', build: trapFinal },
    ],
  };

  Object.assign(EBS.KnockoutLevels, { FIELD24, FIELD28 });
})(typeof window !== 'undefined' ? window : globalThis);
