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
// ---------- Verdeckte Regie für das Short (Paket C7) ----------
// Vier Rollen aus dem Seed. Die Regie ändert nur Faktoren je Team, nie die Regeln.
const DIRECT = {
  giantStart: 2.5,                        // Riese startet größer
  giantSpawnShare: 0.7,                   // Anteil neuer neutraler Wolken, die dem Gefütterten zutreiben
  giantCone: 40 * Math.PI / 180,
  giantGain: 1.8, giantGainUntil: 12,     // Riese wächst anfangs schneller …
  giantSafe: 12, giantFlee: 1.3,          // … und wird bis Sekunde 12 von den anderen kaum gejagt
  giantHunt: 4,                           // jagt bevorzugt das Opfer
  spare: 0,                               // Gewicht 0: wird nicht gejagt (Außenseiter bis zur Schlussphase, Riese anfangs)
  feed: 18,                               // ab hier werden neue Wolken dem Außenseiter zugetrieben
  late: 20,                               // Schlussphase
  giantRainFrom: 18, giantRain: 3, giantLate: 0.8, giantLateGain: 0.5, giantEvap: 15,
  underdogFlee: 2, underdogTeams: 0.3,   // bis zur Schlussphase meidet der Außenseiter Kämpfe
  underdogGain: 2, underdogHunt: 3, underdogLate: 1.3,     // in der Schlussphase jagt er Riese und Mitläufer
  followerLate: 0.4,                      // Mitläufer flieht in der Schlussphase schlechter und wird auch vom Riesen gejagt
  victimSpeed: 0.85, victimFlee: 0.5,
};
function roles(seed) {
  const rng = mulberry32((seed ^ 0x2545f491) >>> 0), p = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  return { giant: p[0], underdog: p[1], victim: p[2], follower: p[3] };
}
/** Faktoren je Team zur Zeit t (seit Rundenbeginn). bonus[k]: Gewicht von Team k als Beute. mass: Masse je Team. */
function directFactors(R, team, t, mass) {
  const D = DIRECT, late = t >= D.late;
  const f = { speed: 1, flee: 1, prey: 1, rain: 1, gain: 1, evap: 1, bonus: [1, 1, 1, 1] };
  f.bonus[R.underdog] = D.spare;                // niemand jagt den Außenseiter
  if (t < D.giantSafe) f.bonus[R.giant] = D.spare;
  if (team === R.giant) {
    f.bonus[R.victim] = D.giantHunt;
    if (t < D.giantSafe) f.flee = D.giantFlee;
    if (t < D.giantGainUntil) f.gain = D.giantGain;
    if (t >= D.giantRainFrom) { f.rain = D.giantRain; f.speed = D.giantLate; f.gain = D.giantLateGain; f.evap = D.giantEvap; f.bonus[R.follower] = 2; }
  } else if (team === R.underdog) {
    f.gain = D.underdogGain;
    f.flee = late && mass && mass[team] > 1.1 * mass[R.giant] ? 0.7 : D.underdogFlee;   // mutig erst, wenn stärker als der Riese
    if (late) { f.bonus[R.giant] = D.underdogHunt; f.bonus[R.follower] = D.underdogHunt; f.speed = D.underdogLate; }
    else for (let k = 0; k < 4; k++) f.bonus[k] = D.underdogTeams;
  } else if (team === R.victim) { f.speed = D.victimSpeed; f.flee = D.victimFlee; }
  else if (team === R.follower && late) { f.flee = D.followerLate; f.speed = D.giantLate; }
  return f;
}

/** Alle Wetterwechsel bis t (für Einblendungen). */
function weatherChanges(seed, t, mode) {
  if (mode !== 'rounds') return [];
  const p = plan(seed >>> 0); extend(p, t);
  return p.segs.filter((s) => s.t0 <= t);
}

EBS.CloudWarsStory = { DAY, SKY, WEATHER, dayAt, light, weatherAt, weatherChanges, DIRECT, roles, directFactors };
})();
