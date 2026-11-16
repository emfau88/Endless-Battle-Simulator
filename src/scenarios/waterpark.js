// Endless Waterpark: independent scenario, controls, production profiles and quiet water mix.
(function () {
'use strict';
const WP = EBS.Waterpark || (EBS.Waterpark = {});
const { clamp, num, bool, fmtInt } = EBS.util;
const pct = value => `${Math.round(value * 100)} %`;
const times = value => `${value.toFixed(2).replace('.', ',')}×`;
const normalMode = params => params.mode !== 'short';
const finiteMode = params => params.mode !== 'relax';
const defaults = {
  mode: 'relax', animals: 16, size: 36, speed: 1, beltSpeed: 1, rollSpeed: 1, current: 1,
  route0: true, route1: true, route2: true, route3: true,
  dayCycle: true, dayMinutes: 0, dayStart: 0.12, nightDark: 0.7,
  ending: 'quiet', fireworks: false, decoDensity: 1,
  ufo: true, balloon: true, birds: true, shootingStars: true, fish: true, emotes: true,
  fireflies: true, stars: true, sleepy: true,
  clouds: 0.7, rays: 0.7, reflection: 0.65, waves: 0.7, sparkle: 0.55, wiggle: 1,
};
const audio = {
  mixProfile: 'waterpark-water-v1', fixedGainDb: 7.95, actionAttenuationDb: -12,
  volumePrecision: 2, ceilingDb: -3, aacNoPns: true,
  defaultVolume: {
    master: 70, water: 100, scoop: 100, tip: 80, slide: 65, funnel: 75, seesaw: 70,
    spring: 80, splash: 100, cheer: 55, open: 60, gather: 50,
    ufo: 65, balloon: 45, twinkle: 55, chirp: 50, fish: 75, emote: 55, launch: 45, firework: 45,
  },
  background: {
    file: 'pyramid-water-loop.wav', label: 'Wasser in der Lagune', volumeKey: 'water',
    gainDb: -2.245527894223046, referenceMaster: 70,
    loopStartSec: 4, loopEndSec: 67.2, fadeSec: 0.05,
  },
  events: {
    scoop: { label: 'Aufzug: Einsteigen', samples: ['impactSoft_medium_000'], gain: 0.12, semis: 3, detune: 1, minGap: 0.12 },
    tip: { label: 'Aufzug: Startklappe', samples: ['impactMetal_light_000'], gain: 0.07, semis: 2, detune: 0.8, minGap: 0.12 },
    slide: { label: 'Rutsche: Wasser', samples: ['synth:splash'], gain: 0.035, semis: -5, detune: 1, minGap: 0.35 },
    funnel: { label: 'Trichter: Blubbern', samples: ['synth:myco-pop'], gain: 0.10, semis: -7, detune: 2, minGap: 0.2 },
    seesaw: { label: 'Wippe: Anschlag', samples: ['impactWood_medium_000', 'impactWood_medium_001'], gain: 0.11, semis: -2, detune: 1, minGap: 0.3 },
    spring: { label: 'Sprungbrett', samples: ['synth:boing'], gain: 0.12, semis: -2, detune: 1, minGap: 0.15 },
    splash: { label: 'Landung: Platscher', samples: ['synth:splash'], gain: 0.16, ref: 1, detune: 2, minGap: 0.1 },
    cheer: { label: 'Tierchen: Jubeln', samples: ['synth:squeak'], gain: 0.055, semis: -2, detune: 2, minGap: 0.3 },
    open: { label: 'Attraktion öffnet', samples: ['synth:chime'], gain: 0.08, scale: [0, 4, 7, 12], minGap: 1 },
    gather: { label: 'Abendruhe', samples: ['synth:myco-pling'], gain: 0.055, semis: -5, detune: 1, minGap: 2 },
    ufo: { label: 'Himmelsgast: UFO', samples: ['synth:ufo'], gain: 0.055, detune: 1 },
    balloon: { label: 'Himmelsgast: Ballon', samples: ['synth:myco-pling'], gain: 0.025, semis: -5 },
    twinkle: { label: 'Sternschnuppe', samples: ['synth:myco-pling'], gain: 0.04, semis: 12, detune: 1 },
    chirp: { label: 'Vögel', samples: ['synth:squeak'], gain: 0.025, semis: 5, detune: 3, minGap: 1 },
    fish: { label: 'Springender Fisch', samples: ['synth:splash'], gain: 0.04, semis: 9, detune: 2, minGap: 0.5 },
    emote: { label: 'Tierchen: Sprechblase', samples: ['synth:myco-pop'], gain: 0.05, semis: 12, detune: 2, minGap: 1 },
    launch: { label: 'Feuerwerk: Abschuss', samples: ['synth:launch'], gain: 0.045, detune: 1.5 },
    firework: { label: 'Feuerwerk', samples: ['synth:firework'], gain: 0.14, ref: 1.2, detune: 1.5, minGap: 0.15 },
  },
};
function normalizeParams(input) {
  const p = { ...defaults, ...input };
  const r = (key, min, max) => clamp(num(p[key], defaults[key]), min, max);
  const mode = ['short', 'day', 'relax'].includes(p.mode) ? p.mode : defaults.mode;
  const out = {
    mode, animals: mode === 'short' ? 4 : clamp(Math.round(num(p.animals, 16) / 4) * 4, 4, 24),
    size: r('size', 24, 44), speed: r('speed', 0.5, 1.5), beltSpeed: r('beltSpeed', 0.5, 1.5),
    rollSpeed: r('rollSpeed', 0.5, 1.5), current: r('current', 0.5, 1.5),
    dayCycle: bool(p.dayCycle, true), dayMinutes: r('dayMinutes', 0, 120),
    dayStart: r('dayStart', 0, 0.95), nightDark: r('nightDark', 0, 1),
    ending: p.ending === 'show' ? 'show' : 'quiet', fireworks: bool(p.fireworks, false),
    decoDensity: r('decoDensity', 0, 2), clouds: r('clouds', 0, 2), rays: r('rays', 0, 1.5),
    reflection: r('reflection', 0, 1), waves: r('waves', 0, 2), sparkle: r('sparkle', 0, 2), wiggle: r('wiggle', 0, 2),
  };
  for (let i = 0; i < 4; i++) out[`route${i}`] = mode === 'short' || bool(p[`route${i}`], true);
  if (![0, 1, 2, 3].some(i => out[`route${i}`])) out.route0 = true;
  for (const key of ['ufo', 'balloon', 'birds', 'shootingStars', 'fish', 'emotes', 'fireflies', 'stars', 'sleepy']) out[key] = bool(p[key], defaults[key]);
  return out;
}
const controls = [
  { key: 'mode', label: 'Videoablauf', type: 'select', restart: true,
    options: [['short', 'Vier Tiere · kurzer Film'], ['day', 'Ein Tag im Wasserpark'], ['relax', 'Ruhiger Dauerbetrieb']],
    sets: { short: { animals: 4, route0: true, route1: true, route2: true, route3: true, decoDensity: 0.5 },
      day: { animals: 16, decoDensity: 1 }, relax: { animals: 12, decoDensity: 0.5, fireworks: false } } },
  { key: 'animals', label: 'Tierchen', type: 'range', min: 4, max: 24, step: 4, restart: true, enabled: normalMode, format: value => String(value) },
  { key: 'size', label: 'Größe der Tierchen', type: 'range', min: 24, max: 44, step: 1, restart: true, format: value => `${value * 2} px` },
  ...[['speed', 'Gesamttempo'], ['beltSpeed', 'Tempo des Aufzugs'], ['rollSpeed', 'Tempo der Rutschen'], ['current', 'Strömung im Rücklauf']]
    .map(([key, label]) => ({ key, label, type: 'range', min: 0.5, max: 1.5, step: 0.05, format: times, restart: true })),
  { key: 'ending', label: 'Abschluss', type: 'select', restart: true, enabled: finiteMode, options: [['quiet', 'Abendruhe'], ['show', 'Kleine Fontänenshow']] },
  { key: 'dayMinutes', label: 'Länge eines Tages', type: 'select', options: [[0, 'Passend zur Videolänge'], [5, '5 Minuten'], [10, '10 Minuten'], [20, '20 Minuten'], [30, '30 Minuten'], [60, '60 Minuten']], restart: true },
  { key: 'dayStart', label: 'Tageszeit beim Start', type: 'range', min: 0, max: 0.95, step: 0.01, format: pct },
  { key: 'nightDark', label: 'Dunkelheit der Nacht', type: 'range', min: 0, max: 1, step: 0.05, format: pct },
  { key: 'decoDensity', label: 'Häufigkeit kleiner Ereignisse', type: 'range', min: 0, max: 2, step: 0.25, restart: true, format: times },
  ...[['clouds', 'Wolkentempo', 2], ['rays', 'Sonnenstrahlen', 1.5], ['reflection', 'Spiegelung im Wasser', 1],
    ['waves', 'Wellengang', 2], ['sparkle', 'Glitzern auf dem Wasser', 2], ['wiggle', 'Gezappel der Tierchen', 2]]
    .map(([key, label, max]) => ({ key, label, type: 'range', min: 0, max, step: 0.05, format: pct })),
  ...['Panoramarutsche', 'Trichterrutsche', 'Wippenbahn', 'Sprungrutsche'].map((label, i) => ({ key: `route${i}`, label, type: 'check', restart: true, enabled: normalMode })),
  { key: 'dayCycle', label: 'Tageslauf von morgens bis nachts', type: 'check' },
  { key: 'sleepy', label: 'Tierchen werden abends müde', type: 'check' },
  { key: 'fireworks', label: 'Feuerwerk bei der Fontänenshow', type: 'check', restart: true, enabled: p => finiteMode(p) && p.ending === 'show' },
  ...[['ufo', 'UFO'], ['balloon', 'Heißluftballon'], ['birds', 'Vögel'], ['shootingStars', 'Sternschnuppen'],
    ['stars', 'Sterne und Mond'], ['fish', 'Springende Fische'], ['emotes', 'Sprechblasen der Tierchen'], ['fireflies', 'Glühwürmchen']]
    .map(([key, label]) => ({ key, label, type: 'check' })),
];
EBS.registerScenario({
  id: 'waterpark', title: 'Endless Waterpark', defaults, controls, normalizeParams,
  supportsCamera: false, supportsClips: false, restartOnDuration: true,
  requiresPreflight: cfg => cfg.params.mode !== 'relax',
  videoDefaults: { resolution: 1080, fps: 60, quality: { crf: 18, preset: 'medium' } },
  create: ctx => new WP.Simulation(ctx),
  createRenderer: ctx => new WP.Renderer(ctx),
  createExportPlan: (cfg, world) => WP.createExportPlan(cfg, world),
  panelStats(sim) {
    const s = sim.snapshot(), c = s.counts;
    return [
      { key: 'rides', label: 'Beendete Fahrten', value: fmtInt(s.rides) },
      { key: 'routes', label: 'Auf den Rutschen', value: c.route },
      { key: 'lift', label: 'Im Aufzug / am Start', value: c.lift + c.platform },
      { key: 'water', label: 'In der Lagune', value: c.pool + c.gather },
    ];
  },
  panelNote(sim) {
    const s = sim.snapshot();
    if (s.preflight && !s.preflight.ok) return s.preflight.errors.join(' ') + ' Die Vorschau bleibt bedienbar.';
    return s.summary;
  },
  audio,
});
WP.defaults = defaults;
WP.normalizeParams = normalizeParams;
})();
