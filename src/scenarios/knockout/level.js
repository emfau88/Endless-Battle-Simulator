/* Marble Knockout · Gesamtlevel: Level-Bau und Schleuse (R43 Teil 2, Paket G1)
 *
 * Ein Gesamtlevel ist eine große, zusammenhängende Strecke in einer einzigen Physikwelt. Es besteht aus Abschnitten;
 * jeder Abschnitt wird mit demselben Builder (elements.js) in Welt-Koordinaten gebaut und endet in einer Schleuse.
 * Plan: docs/MARBLE_KNOCKOUT_GESAMTLEVEL_PLAN_2026-11-25.md, Abschnitte 1.1, 5 und 6.
 *
 * Schleuse (Baustein G1), Ansicht für dir = +1 (Murmeln rollen nach rechts):
 *
 *        Lampenreihe  ● ● ● ● ●           ┃  Rückwand (hebt sich nur zum Schließen, dann rollt man darüber)
 *   ═══════════════╗ - - - - - - - - - - -╋══════════╗   Zulauf, Deckel (fährt beim Schließen von rechts herein), Aus-Rinne
 *                  ║   Lichtschranke ···  ║          ╚═╗  ▓▓ OUT (Grube)
 *                  ║        Becken        ║            ▓▓
 *                  ╚══╧══╧══ Klappboden ══╝
 *
 * Wer durch die Lichtschranke fällt, ist weiter. Ist das Becken voll, fährt der Deckel über die Öffnung und die Rückwand
 * senkt sich: Alle, die noch kommen, rollen über den Deckel in die Aus-Rinne. Bei der Freigabe klappt der Boden auf.
 */
(function (global) {
  'use strict';
  const EBS = global.EBS;
  const { sin, cos, PI } = EBS.KnockoutMath;
  const { ease, lerp } = EBS.KnockoutElements;
  const { tand } = EBS.KnockoutHelpers;

  const LID_SEC = 0.3, FLOOR_SEC = 0.25;

  /** Schleuse am Ende eines Zulaufs (ex, ey) mit Neigung slope (Grad) in Richtung dir; keep = Plätze im Becken.
   *  o.outLen: Länge der Aus-Rinne; o.sign: Schild „TOP n“ über den Lampen (false: keins); o.wide: Murmeln je Lage. */
  function schleuse(b, c, { ex, ey, dir = 1, slope = 6, keep, outLen, pitW = 3.2, sign = true, perLayer }) {
    const d = c.d, rad = b.rad, k = tand(slope);
    const L = perLayer || Math.ceil(keep / 2.5), layers = Math.ceil(keep / L);
    const wi = (L + 0.4) * d, fx = ex + dir * (wi + 2 * rad), lidY = (x) => ey + Math.abs(x - ex) * k, fy = lidY(fx);
    // Boden: 6° zur Rückwand hin geneigt (die Erste liegt hinten an der Wand)
    const D = (layers * 0.9 + 2.6) * d, ybFar = fy + D, ybNear = ybFar - wi * tand(6);
    const xn = ex + dir * rad, xf = fx - dir * rad;                     // Innenkanten der Wände
    b.wall([[ex, ey], [ex, ybNear + rad]]);
    b.wall([[fx, fy], [fx, ybFar + rad]]);
    // Lichtschranke: waagerecht eine Murmel unter der tiefsten Stelle der Öffnung (unter dem Deckel)
    const sy = Math.max(ey, fy) + d, sense = { ax: Math.min(xn, xf), ay: sy, bx: Math.max(xn, xf), by: sy };
    // Rückwand über der Öffnung: hält schnelle Murmeln im Becken, senkt sich beim Schließen
    const back = b.gate({ x: fx, y: fy, h: 2.4 * d, mode: 'manual', open0: 0, kind: 'backstop' });
    // Aus-Rinne hinter der Rückwand, steiler (10°), danach die Grube OUT mit Anschlag und Boden
    const ol = outLen || 2 * d, ox = fx + dir * ol, oy = fy + ol * tand(10);
    b.track([[fx, fy], [ox, oy]]);
    const px0 = fx + dir * 0.4 * d, px1 = ox + dir * pitW * d, py0 = oy + 0.4 * d, py1 = py0 + 3.2 * d;
    b.pit(Math.min(px0, px1), Math.max(px0, px1), py0, py1, { kill: true, depth: 1.2 * d });
    b.wall([[px1, oy - 2.2 * d], [px1, py1]]);
    b.track([[px0, py1], [px1, py1]], { hidden: true });
    // sign: true = beide Schilder, 'out' = nur OUT, false = keins
    if (sign) b.sign((fx + ox) / 2 + dir * 1.4 * d, oy - 0.6 * d, 'OUT', { size: 22, h: 18 });

    const el = { type: 'schleuse', ex, ey, fx, fy, dir, keep, sense, back, closedAt: -1, openAt: -1, bodies: [], lid: null, flaps: [], out: { x: (px0 + px1) / 2, y: py0 } };
    // Deckel: liegt verborgen hinter der Rückwand und fährt beim Schließen von dort über die Öffnung (nur waagerecht
    // längs seiner Linie, hebt also nichts an)
    const lx = fx - ex, ly = fy - ey;
    const lidF = (t) => (el.closedAt < 0 ? 0 : ease((t - el.closedAt) / LID_SEC));
    el.lid = b._body([{ ax: 0, ay: 0, bx: lx, by: ly, rad }], (t) => { const s = 1.08 * (1 - lidF(t)); return { x: ex + lx * s, y: ey + ly * s, a: 0 }; }, { look: 'lid', tag: 'lid', enabled: false });
    el.bodies.push(el.lid);
    el.lidAt = lidF;
    // Klappboden: Platten von der Einlauf- zur Rückwand, Scharnier am Einlauf-Ende; offen klappen sie nach unten
    // Eine Klappe je gut zwei Murmelbreiten; ein kleines Becken (TOP 4) hat nur eine: Zwei offene Klappen hingen dort
    // so dicht nebeneinander, dass eine Murmel zwischen ihnen klemmte.
    const nf = Math.max(1, Math.round(wi / (2.2 * d))), fvx = (xf - xn) / nf, fvy = (ybFar - ybNear) / nf;
    const floorF = (t) => (el.openAt < 0 ? 0 : ease((t - el.openAt) / FLOOR_SEC));
    for (let i = 0; i < nf; i++) {
      const hx = xn + i * fvx, hy = ybNear + i * fvy, sx = fvx - dir * 2, sy2 = fvy * (fvx - dir * 2) / fvx;
      const body = b._body([{ ax: 0, ay: 0, bx: sx, by: sy2, rad }], (t) => ({ x: hx, y: hy, a: dir * 1.45 * floorF(t) }), { look: 'trap', tag: 'gate' });
      el.flaps.push(body); el.bodies.push(body);
    }
    el.floorAt = floorF;
    el.update = () => { el.lid.enabled = el.closedAt >= 0; };
    el.close = (t) => { if (el.closedAt >= 0) return; el.closedAt = t; back.setOpen(t, true); };
    el.release = (t) => { if (el.openAt < 0) el.openAt = t; };
    el.state = () => [el.closedAt, el.openAt];
    // Lampen über der Öffnung, eine je Platz
    const ly0 = Math.min(ey, fy) - 1.7 * d, span = Math.abs(xf - xn) - d * 0.6, step = Math.min(1.1 * d, span / Math.max(1, keep - 1));
    const lx0 = (xn + xf) / 2 - step * (keep - 1) / 2;
    el.lamps = []; for (let i = 0; i < keep; i++) el.lamps.push([lx0 + i * step, ly0]);
    el.lampR = Math.min(0.16 * d, step * 0.32);
    if (sign === true) b.sign((xn + xf) / 2, ly0 - 0.55 * d, `TOP ${keep}`, { size: 22, h: 8 });
    el.cx = (xn + xf) / 2; el.cy = (sy + ybFar) / 2; el.floorY = ybFar; el.mouthY = Math.min(ey, fy);
    el.box = { x0: Math.min(ex, px1) - d, y0: ly0 - 1.4 * d, x1: Math.max(ex, px1) + d, y1: Math.max(ybFar, py1) + d };
    b._add(el);
    // Ideallinie: über der Öffnung bis knapp unter die Lichtschranke
    el.path = [[ex - dir * 0.2 * d, ey - 0.7 * d], [el.cx, sy + 0.4 * d]];
    return el;
  }

  /** Baut ein Level (spec aus levels.js) mit dem Builder b. c = { W, H, r, d, T, short } (W, H: Größe der Welt).
   *  c.rngFor(i): eigener Zufall je Abschnitt (Versatz der bewegten Teile). So ändert ein anderer Abschnitts-Seed im
   *  Drehbuch nichts in den Abschnitten davor (Plan, Abschnitt 6).
   *  Gibt { sections, path, bounds } zurück; die Ideallinie liegt danach auch im Builder (b.path). */
  function build(spec, b, c) {
    const sections = [], pts = [];
    let prevExit = null, prev = null;
    spec.sections.forEach((s, i) => {
      const e0 = b.elements.length;
      if (c.rngFor) b.rng = c.rngFor(i);
      const out = s.build(b, { ...c, keep: spec.quota[i], i, prev }) || {};
      prev = out;
      // Anschluss: Der Eingang eines Abschnitts liegt genau unter dem Ausgang des vorigen (höchstens 1 E Abstand)
      if (prevExit && out.entry) {
        const dx = out.entry[0] - prevExit[0], dy = out.entry[1] - prevExit[1];
        if (dx * dx + dy * dy > 1) throw new Error(`Level ${spec.id}: Abschnitt ${s.id} schließt nicht an (${dx.toFixed(1)}, ${dy.toFixed(1)})`);
      }
      prevExit = out.exit || null;
      const from = pts.length;
      for (const p of out.path || []) {
        const q = pts[pts.length - 1];
        if (!q || q[0] !== p[0] || q[1] !== p[1]) pts.push(p);
      }
      // fin: Ziellinie statt Schleuse (letzter Abschnitt, Sieger)
      sections.push({ i, id: s.id, title: s.title, world: s.world, hazard: !!s.hazard, placeholder: !!s.placeholder,
        els: [e0, b.elements.length], sch: out.sch || null, fin: out.fin || null, frame: out.frame || null, from, to: pts.length - 1, keep: spec.quota[i] });
    });
    b.setPath(pts);
    const cum = b.path.cum;
    for (const sec of sections) { sec.p0 = cum[Math.min(sec.from, cum.length - 1)]; sec.p1 = cum[Math.max(sec.from, sec.to)]; }
    return { sections, path: b.path, bounds: spec.bounds };
  }

  /** Punkt der Ideallinie bei Fortschritt p (geklemmt). */
  function pointAt(path, p) {
    const cum = path.cum, pts = path.pts, n = cum.length;
    if (p <= 0) return pts[0].slice();
    if (p >= cum[n - 1]) return pts[n - 1].slice();
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= p) lo = m; else hi = m; }
    const u = (p - cum[lo]) / ((cum[hi] - cum[lo]) || 1);
    return [lerp(pts[lo][0], pts[hi][0], u), lerp(pts[lo][1], pts[hi][1], u)];
  }

  /** Kleines Dach über einem Drehkreuz, damit von oben fallende Murmeln seitlich abrollen (statt liegen zu bleiben). */
  function tent(b, x, y, half, rise) { b.wall([[x - half, y + rise], [x, y], [x + half, y + rise]]); }

  void sin; void cos; void PI;
  EBS.KnockoutLevel = { schleuse, build, pointAt, tent, LID_SEC, FLOOR_SEC };
})(typeof window !== 'undefined' ? window : globalThis);
