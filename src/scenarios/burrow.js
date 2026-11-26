/*
 * Szenario „Endless Burrow“ (in Arbeit) – Würmer in der Erde, von oben gesehen. Groß frisst Klein.
 *
 * Paket P1 (25.11.2026): Simulation (burrow/simulation.js), Zeichnungen im Grundstil „Warme Erde“ (burrow/art.js) und
 * Darstellung (burrow/renderer.js). Noch ohne Ton, ohne Short-Drehbuch und ohne Voreinstellungen; Bericht:
 * docs/BURROW_2026-11-25.md.
 */
(function () {
'use strict';
const B = EBS.Burrow;
const { clamp, num, fmtInt } = EBS.util;
const times = (v) => `${Number(v).toFixed(2).replace('.', ',')}×`;

const defaults = { worms: 14, food: 1, growth: 1 };
function normalizeParams(input) {
  const p = { ...defaults, ...input };
  return {
    worms: clamp(Math.round(num(p.worms, defaults.worms)), 8, 20),
    food: clamp(num(p.food, defaults.food), 0.5, 2),
    growth: clamp(num(p.growth, defaults.growth), 0.5, 2),
  };
}
EBS.registerScenario({
  id: 'burrow',
  title: 'Endless Burrow (in Arbeit)',
  defaults,
  controls: [
    { key: 'worms', label: 'Würmer', type: 'range', min: 8, max: 20, step: 1, restart: true, format: (v) => String(v) },
    { key: 'food', label: 'Futtermenge', type: 'range', min: 0.5, max: 2, step: 0.1, format: times },
    { key: 'growth', label: 'Wachstum', type: 'range', min: 0.5, max: 2, step: 0.1, format: times },
  ],
  supportsCamera: false, supportsClips: true,   // Ausschnitte: der Renderer hält keinen Zustand zwischen Bildern
  normalizeParams,
  create: (ctx) => new B.Simulation(ctx),
  createRenderer: (ctx) => new B.Renderer(ctx),
  panelStats(sim) {
    const s = sim.snapshot();
    return [
      { key: 'alive', label: 'Würmer unterwegs', value: String(s.alive) },
      { key: 'leader', label: 'Größter Wurm', value: s.leader || '–' },
      { key: 'eaten', label: 'Gefressen', value: fmtInt(s.eaten) },
      { key: 'food', label: 'Futter liegt', value: fmtInt(s.food) },
    ];
  },
  panelNote: (sim) => sim.snapshot().summary,
});
B.defaults = defaults;
B.normalizeParams = normalizeParams;
})();
