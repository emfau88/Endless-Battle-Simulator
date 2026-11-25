/* Marble Knockout · Winkelfunktionen mit festem Ergebnis (R43/M1)
 *
 * Math.sin und Math.cos dürfen je nach Laufzeit leicht andere Werte liefern (bei Scrap wichen Node und Chromium
 * voneinander ab). Diese Fassung nutzt nur +, −, × und Math.round und liefert deshalb überall dieselben Bits.
 * Bereichsreduktion auf [−π/4, π/4] mit geteiltem π/2 (Cody-Waite), danach die Polynome aus fdlibm.
 * Genauigkeit gegenüber Math.sin/Math.cos: besser als 1e-15 für |x| < 1e5.
 */
(function (global) {
  'use strict';
  const EBS = global.EBS;

  const PIO2_HI = 1.57079632673412561417e+00, PIO2_LO = 6.07710050650619224932e-11, INV_PIO2 = 6.36619772367581382433e-01;
  const S1 = -1.66666666666666324348e-01, S2 = 8.33333333332248946124e-03, S3 = -1.98412698298579493134e-04,
    S4 = 2.75573137070700676789e-06, S5 = -2.50507602534068634195e-08, S6 = 1.58969099521155010221e-10;
  const C1 = 4.16666666666666019037e-02, C2 = -1.38888888888741095749e-03, C3 = 2.48015872894767294178e-05,
    C4 = -2.75573143513906633035e-07, C5 = 2.08757232129817482790e-09, C6 = -1.13596475577881948265e-11;

  const ks = (x) => { const z = x * x; return x + x * z * (S1 + z * (S2 + z * (S3 + z * (S4 + z * (S5 + z * S6))))); };
  const kc = (x) => { const z = x * x; return 1 - 0.5 * z + z * z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6))))); };

  /** Liefert Quadrant (0–3) und Rest r mit x = n·π/2 + r. */
  function reduce(x) {
    const n = Math.round(x * INV_PIO2), r = (x - n * PIO2_HI) - n * PIO2_LO;
    return [((n % 4) + 4) % 4, r];
  }
  function sin(x) {
    const [q, r] = reduce(x);
    return q === 0 ? ks(r) : q === 1 ? kc(r) : q === 2 ? -ks(r) : -kc(r);
  }
  function cos(x) {
    const [q, r] = reduce(x);
    return q === 0 ? kc(r) : q === 1 ? -ks(r) : q === 2 ? -kc(r) : ks(r);
  }

  EBS.KnockoutMath = { sin, cos, PI: Math.PI, TAU: 2 * Math.PI };
})(typeof window !== 'undefined' ? window : globalThis);
