/* Marble Knockout · Gesamtlevel „Rush“ (R44): TRAP TOWER (Short, 9:16) und THE AVALANCHE (Langvideo, 16:9)
 *
 * Zweite Level-Reihe mit mehr Murmeln, mehr Ereignissen und kürzeren Wartezeiten. Gewählt über den Schalter
 * params.level = 'rush'; ohne ihn laufen THE TOWER und THE GAUNTLET unverändert (levels.js). Bauweise wie dort: jeder
 * Abschnitt ist eine Bauanleitung build(b, c) in Welt-Koordinaten, Rückgabe { path, sch, entry, exit }.
 * Plan: docs/MARBLE_KNOCKOUT_RUSH_PLAN_2026-11-27.md, Abschnitte 2 bis 6.
 *
 * Stand Paket R2: TRAP TOWER komplett (TRAPDOORS, SWEEPERS, FINAL). THE AVALANCHE folgt in R3 und R4; bis dahin zeigt
 * Rush im Querformat THE GAUNTLET.
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
