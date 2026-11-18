/*
 * Cloud Wars – Tageslauf und Wetterplan (Paket C4). Reine Funktionen aus Seed, Zeit und Modus; die Simulation liest
 * daraus Faktoren (Verdunsten, Wind, neutrale Gewitter), der Renderer Licht und Nebel.
 * Runden-Modus: Tag von 12 Minuten, Wetterabschnitte von 60–120 s, nie zweimal dieselbe Phase hintereinander,
 * Nebel nur am Morgen; der erste Abschnitt ist Morgennebel. Short: heller Nachmittag, immer klar.
 */
(function () {
'use strict';
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = { length: 720, start: 0.04, short: 0.3 };
// Tagesanteil → Multiplikationsfarbe, warmer Schein (rgba), Nachtanteil (aus dem Prototyp)
const SKY = [
  [0.00, [255, 255, 255], [255, 240, 210, 0.00], 0],
  [0.40, [255, 255, 255], [255, 240, 210, 0.00], 0],
  [0.50, [255, 226, 186], [255, 170, 90, 0.10], 0],
  [0.58, [240, 196, 182], [255, 130, 90, 0.07], 0.2],
  [0.66, [140, 148, 196], [90, 100, 170, 0.02], 0.7],
  [0.80, [112, 124, 176], [60, 70, 140, 0.00], 1],
  [0.90, [206, 184, 204], [255, 190, 170, 0.08], 0.35],
  [1.00, [255, 255, 255], [255, 240, 210, 0.00], 0],
];
const WEATHER = {
  clear: { evap: 1, wind: 1, storms: 0, text: null },
  heat: { evap: 2, wind: 1, storms: 0, text: 'HEAT WAVE' },
  front: { evap: 1, wind: 1.6, storms: 2, text: 'STORM FRONT' },
  fog: { evap: 1, wind: 0.7, storms: 0, text: 'MORNING FOG' },
};

function dayAt(t, mode) {
  return mode === 'rounds' ? (DAY.start + t / DAY.length) % 1 : DAY.short;
}
function light(day) {
  let i = 1;
  while (i < SKY.length - 1 && SKY[i][0] < day) i++;
  const a = SKY[i - 1], b = SKY[i], u = clamp((day - a[0]) / Math.max(1e-6, b[0] - a[0]), 0, 1);
  const mix = (p, q) => p.map((v, k) => v + (q[k] - v) * u);
  return { mul: mix(a[1], b[1]), glow: mix(a[2], b[2]), night: a[3] + (b[3] - a[3]) * u, day };
}
const isMorning = (day) => day > 0.86 || day < 0.1;

// Wetterabschnitte je Seed, einmal berechnet und dann verlängert
const plans = new Map();
function plan(seed) {
  let p = plans.get(seed);
  if (!p) {
    const rng = mulberry32((seed ^ 0x5bd1e995) >>> 0);
    p = { rng, segs: [{ kind: 'fog', t0: 0, t1: 45 + rng() * 30 }] };      // das Langvideo beginnt mit Morgennebel
    plans.set(seed, p);
  }
  return p;
}
function extend(p, t) {
  while (p.segs[p.segs.length - 1].t1 <= t) {
    const last = p.segs[p.segs.length - 1], t0 = last.t1, day = dayAt(t0, 'rounds');
    const options = ['clear', 'heat', 'front', 'fog'].filter((k) => k !== last.kind && (k !== 'fog' || isMorning(day)) && (k !== 'heat' || (day > 0.12 && day < 0.36)));
    const kind = options[Math.floor(p.rng() * options.length)];
    p.segs.push({ kind, t0, t1: t0 + 60 + p.rng() * 60 });
  }
}
/** Wetter zur Zeit t. fade: 0..1 Übergang (8 s ein- und ausblenden), nur für die Darstellung. */
function weatherAt(seed, t, mode) {
  if (mode !== 'rounds') return { kind: 'clear', ...WEATHER.clear, fade: 0, t0: 0 };
  const p = plan(seed >>> 0);
  extend(p, t);
  let lo = 0, hi = p.segs.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (p.segs[m].t1 <= t) lo = m + 1; else hi = m; }
  const s = p.segs[lo], fade = clamp(Math.min(t - s.t0, s.t1 - t) / 8, 0, 1);
  return { kind: s.kind, ...WEATHER[s.kind], fade, t0: s.t0 };
}
/** Alle Wetterwechsel bis t (für Einblendungen). */
function weatherChanges(seed, t, mode) {
  if (mode !== 'rounds') return [];
  const p = plan(seed >>> 0); extend(p, t);
  return p.segs.filter((s) => s.t0 <= t);
}

EBS.CloudWarsStory = { DAY, SKY, WEATHER, dayAt, light, weatherAt, weatherChanges };
})();
