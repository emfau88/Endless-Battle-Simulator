/* Marble Knockout · Gesamtlevel: die Level (R43 Teil 2)
 *
 * THE TOWER (Short, 9:16) und THE GAUNTLET (Langvideo, 16:9). Jeder Abschnitt ist eine Bauanleitung build(b, c) in
 * Welt-Koordinaten; c = { W, H, r, d, T, n, short, keep, i, prev } (W, H: Größe der Welt, keep: Plätze in der
 * Schleuse, prev: Ergebnis des vorigen Abschnitts). Rückgabe { path, sch, entry, exit, frame }.
 *
 * Stand Paket G1: je Level der erste Abschnitt mit echter Physik und Schleuse, danach eine Auffangschale
 * („TO BE CONTINUED“). Plan: docs/MARBLE_KNOCKOUT_GESAMTLEVEL_PLAN_2026-11-25.md, Abschnitte 2 und 3.
 * Maßregeln aus den Proben der Bahnen gelten weiter: zwischen Stift und Wand gut 1,4 d frei, unter einem Trichterhals
 * rund 2 d Luft, von oben beregnete Drehkreuze tragen ein Dach (sonst bleiben Murmeln darauf liegen).
 */
(function (global) {
  'use strict';
  const EBS = global.EBS;
  const { tand } = EBS.KnockoutHelpers;
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

  /** Drehkreuz über einer Bahn (Höhe at(x)) mit Dach darüber; rps > 0 schiebt unten nach links. */
  function turnstileOn(b, c, at, x, rps) {
    const arm = 1.25 * c.d, hy = at(x) - b.rad - 0.5 * c.d - arm;
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
    b.wall([[20, 110], [20, 2560]]); b.wall([[1060, 110], [1060, 2560]]);
    b.dropShelf({ x0: 78, x1: 1002, y: 260, n: c.n, flaps: 8 });
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
  function towerSoon(b, c) {
    const x = c.prev.exit[0];
    return catchTray(b, c, [[30, 2380], [300, 2500], [860, 2510], [1050, 2380]], [290, 2390], [[x, c.prev.exit[1] + 10], [x, 2480]]);
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
  function gauntletSoon(b, c) {
    const x = c.prev.exit[0];
    // links eine hohe Wand: Aus dem Becken fallende Murmeln prallen ab und rollten sonst über den Rand
    const out = catchTray(b, c, [[1700, 1620], [1720, 1880], [2160, 1890], [2270, 1720]], [1560, 1860], [[x, c.prev.exit[1] + 10], [x, 1860]]);
    out.frame = { x0: 1450, y0: 1150, x1: 2450, y1: 1950 };
    return out;
  }

  const LEVELS = {
    tower: {
      id: 'tower', title: 'THE TOWER', hook: 'PICK YOUR COLOR!', format: 'short',
      r: 28, T: 20, field: FIELD16, quota: [8, 4, 1],
      rules: { ready: 0.4, release: 0.5, look: 0.22, endHold: 2.6, lateMax: 5 },
      bounds: { x0: 0, y0: 0, x1: 1080, y1: 2600 },
      sections: [
        { id: 'drop', title: 'THE DROP', world: 'dusk', build: towerDrop },
        { id: 'soon', title: 'TO BE CONTINUED', world: 'petrol', placeholder: true, build: towerSoon },
      ],
    },
    gauntlet: {
      id: 'gauntlet', title: 'THE GAUNTLET', format: 'long',
      r: 24, T: 16, field: FIELD20, quota: [17, 14, 12, 10, 8, 7, 6, 5, 3, 1], stages: 10,
      rules: { ready: 3.2, release: 1.2, look: 0.25, endHold: 2.6, lateMax: 6 },
      bounds: { x0: 0, y0: -200, x1: 2500, y1: 2000 },
      sections: [
        { id: 'drop', title: 'THE DROP', world: 'night', build: gauntletDrop },
        { id: 'soon', title: 'TO BE CONTINUED', world: 'petrol', placeholder: true, build: gauntletSoon },
      ],
    },
  };

  EBS.KnockoutLevels = { LEVELS, COLORS, BANDS, FIELD16, FIELD20 };
})(typeof window !== 'undefined' ? window : globalThis);
