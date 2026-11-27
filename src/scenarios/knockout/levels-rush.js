/* Marble Knockout · Gesamtlevel „Rush“ (R44): TRAP TOWER (Short, 9:16) und THE AVALANCHE (Langvideo, 16:9)
 *
 * Zweite Level-Reihe mit mehr Murmeln, mehr Ereignissen und kürzeren Wartezeiten. Gewählt über den Schalter
 * params.level = 'rush'; ohne ihn laufen THE TOWER und THE GAUNTLET unverändert (levels.js). Bauweise wie dort: jeder
 * Abschnitt ist eine Bauanleitung build(b, c) in Welt-Koordinaten, Rückgabe { path, sch, entry, exit }.
 * Plan: docs/MARBLE_KNOCKOUT_RUSH_PLAN_2026-11-27.md, Abschnitte 2 bis 6.
 *
 * Stand Paket R1: TRAP TOWER mit Abschnitt 1 (TRAPDOORS) in echter Physik, danach ein Platzhalter. THE AVALANCHE folgt
 * in R3 und R4; bis dahin zeigt Rush im Querformat THE GAUNTLET.
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
  // Falltür-Boden aus sieben Platten (8° nach rechts) über dem Abgrund. Am Ende des Bodens fällt man rechts in einen
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
    // Abgrund in zwei Stücken unter dem geneigten Boden (Tötungstiefe 1 d unter der Oberkante jedes Stücks); sie
    // überlappen, damit die weichen Ränder keine helle Fuge zeichnen. Das letzte Stück endet kurz vor dem Bodenende.
    const yb = 1250, xm = (xs + xe) / 2;
    b.pit(xs, xm + 40, fl(xs) + 14, yb, { kill: true, depth: 1.0 * d, stripes: false });
    b.pit(xm - 40, xe - 0.3 * d, fl(xm - 40) + 14, yb, { kill: true, depth: 1.0 * d, stripes: false });
    // Rampe unter dem Abgrund von der rechten Wand nach links (10°) in die Schleuse
    const kR = tand(10), ramp = (x) => 1300 + (1050 - x) * kR, ex = 680;
    b.track([[1050, ramp(1050)], [ex, ramp(ex)]]);
    const sch = LV.schleuse(b, c, { ex, ey: ramp(ex), dir: -1, slope: 10, keep: c.keep, outLen: 1.4 * d, pitW: 2.4, sign: 'out' });
    const o = 0.7 * d, xl = xe - 0.3 * d;
    const path = [[cx, 250], [cx, fl(cx) - o], [xl, fl(xl) - o], [990, ramp(990) - o], [ex + 0.5 * d, ramp(ex + 0.5 * d) - o], ...sch.path];
    return { path, sch, exit: [sch.cx, sch.floorY] };
  }
  // Platzhalter (bis R2): Fangschale unter der Schleuse, das Video endet kurz danach
  function trapSoon(b, c) {
    const x = c.prev.exit[0], y = c.prev.exit[1] + 300;
    b.track([[30, y - 90], [300, y], [800, y + 10], [1050, y - 90]]);
    b.sign(290, y - 110, 'TO BE CONTINUED', { size: 30, h: 10 });
    return { path: [[x, c.prev.exit[1] + 10], [x, y - 30]], entry: c.prev.exit };
  }

  LEVELS.trap = {
    id: 'trap', title: 'TRAP TOWER', hook: 'PICK YOUR COLOR!', format: 'short',
    r: 28, T: 20, field: FIELD24, quota: [14, 7, 1],
    // quietStart: keine Einblendung, solange der Spruch zum Start steht (bis 3,2 s)
    rules: { ready: 0.4, release: 0.5, look: 0.22, endHold: 2.6, lateMax: 4, quietStart: 3.2 },
    bounds: { x0: 0, y0: 0, x1: 1080, y1: 2300 },                     // R1: Abschnitt 1 und Platzhalter
    sections: [
      { id: 'trapdoors', title: 'TRAPDOORS', world: 'petrol', hazard: true, trapsAt: 5, build: trapDoors },
      { id: 'soon', title: 'TO BE CONTINUED', world: 'plum', placeholder: true, build: trapSoon },
    ],
  };

  Object.assign(EBS.KnockoutLevels, { FIELD24, FIELD28 });
})(typeof window !== 'undefined' ? window : globalThis);
