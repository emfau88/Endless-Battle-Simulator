/*
 * Szenario „Marble Knockout“ (in Arbeit) – Plan: docs/MARBLE_KNOCKOUT_PLAN_2026-11-25.md (R43)
 *
 * Murmel-Ausscheidungsrennen: Langvideo (16:9) mit 12 Murmeln über 10 Bahnen, auf jeder Bahn scheidet die letzte
 * aus; Short (9:16) mit 8 Murmeln über 3 Bahnen. Dazu die Element-Galerie und eine einzelne Bahn zum Ansehen.
 * Physik: knockout/physics.js, Bausteine: knockout/elements.js, Bahnen: knockout/stages.js, Ablauf:
 * knockout/simulation.js, Bild: knockout/art.js und knockout/renderer.js.
 * Quadrat 1:1 zeigt das Querformat mit Rand oben und unten (die Bahnen sind für 16:9 gebaut).
 */
(function () {
'use strict';
const { DT } = EBS;
const { fmtInt } = EBS.util;
const KS = EBS.KnockoutSim;

// Ton (M6): weiche Marble-Works-Klänge, feste Mischung ohne Einmessung (Plan: rund −24 LUFS). Reihenfolge = Vorrang.
const AUDIO_EVENTS = {
  winner: { label: 'Sieger', samples: ['synth:fanfare'], gain: 0.2, semis: -3, detune: 0, minGap: 2 },
  knockout: { label: 'Aus (Klappe oder Sturz)', samples: ['synth:myco-pop'], gain: 0.34, semis: -5, detune: 0.2, minGap: 0.4 },
  finish: { label: 'Ziel (je Platz tiefer)', samples: ['synth:chime'], gain: 0.14, semis: 2, detune: 0, minGap: 0.08, scale: [0, -2, -3, -5, -7, -8, -10, -12, -14, -15, -17, -19] },
  gate: { label: 'Starttor', samples: ['mw-soft-wood-2'], gain: 0.42, semis: -6, detune: 0.1, minGap: 0.5 },
  plank: { label: 'Planke löst sich', samples: ['mw-soft-wood-1', 'mw-soft-wood-0'], gain: 0.3, semis: -7, detune: 0.6, minGap: 0.2 },
  traps: { label: 'Fallen zu', samples: ['synth:myco-pling'], gain: 0.14, semis: -2, detune: 0, minGap: 1 },
  podium: { label: 'Podest', samples: ['synth:myco-seed'], gain: 0.24, semis: 0, detune: 0, minGap: 2 },
  fall: { label: 'Sturz im Finale', samples: ['synth:myco-pop'], gain: 0.3, semis: -8, detune: 0.2, minGap: 0.5 },
  hit_track: { label: 'Murmel auf Holz', samples: ['mw-soft-wood-0', 'mw-soft-wood-1', 'mw-soft-wood-2'], gain: 0.34, ref: 0.6, detune: 0.8, minGap: 0.03 },
  hit_marble: { label: 'Murmel an Murmel', samples: ['mw-soft-glass-0', 'mw-soft-glass-1', 'mw-soft-glass-2'], gain: 0.2, ref: 0.6, semis: 1, detune: 0.6, minGap: 0.085 },
  peg: { label: 'Stift', samples: ['mw-soft-glass-1', 'mw-soft-glass-2'], gain: 0.12, ref: 0.6, semis: 5, detune: 1.5, minGap: 0.05 },
  bumper: { label: 'Bumper', samples: ['mw-soft-body-0', 'mw-soft-body-1'], gain: 0.26, ref: 0.6, detune: 0.5, minGap: 0.1 },
  flip: { label: 'Weiche', samples: ['mw-soft-switch-1'], gain: 0.16, detune: 0.3, minGap: 0.15 },
  nudge: { label: 'Rütteln', samples: ['mw-soft-switch-0'], gain: 0.12, semis: -3, detune: 0.3, minGap: 0.5 },
};
const AUDIO_ORDER = Object.keys(AUDIO_EVENTS), AUDIO_KEY = 8;     // die ersten acht haben Vorrang
/** Fester Mischplan: höchstens drei Klänge je 0,3 s (wichtige zuerst), Stereo nach Ort im Bild. */
function createAudioMixPlan(events, { cfg }) {
  const volume = (cfg.video && cfg.video.volume) || {}, decisions = new Map(), cand = [];
  const W = cfg.video && cfg.video.aspect === '9:16' ? 1080 : 1920;
  for (const e of events) {
    const d = { seq: e.seq, gain: 0, pan: Math.max(-0.35, Math.min(0.35, ((e.x || 0) / W - 0.5) * 0.7)) }; decisions.set(e.seq, d);
    const def = AUDIO_EVENTS[e.type];
    if (!def || volume[e.type] === 0 || volume.master === 0) continue;
    // Gesamtlevel (Ereignisse mit Welt-Lage wx): außerhalb des Bildes leiser, eine halbe Bildbreite daneben 25 %,
    // weiter weg 10 % (Plan Teil 2, Abschnitt 4). Der bisherige Ablauf bleibt unverändert.
    const H = W === 1080 ? 1920 : 1080, ox = Math.max(0, -(e.x || 0), (e.x || 0) - W) / W, oy = Math.max(0, -(e.y || 0), (e.y || 0) - H) / H;
    const far = e.wx === undefined ? 1 : Math.max(ox, oy) === 0 ? 1 : Math.max(ox, oy) <= 0.5 ? 0.25 : 0.1;
    cand.push({ e, d, far, minGap: def.minGap || 0, rank: AUDIO_ORDER.indexOf(e.type) });
  }
  cand.sort((a, b) => a.e.step - b.e.step || a.rank - b.rank || a.e.seq - b.e.seq);
  const taken = [], free = (step) => { let n = 0; for (let i = taken.length - 1; i >= 0 && n < 3; i--) if (Math.abs(taken[i] - step) < 0.3 * 60) n++; return n < 3; };
  for (const pass of [0, 1]) {
    const last = new Map();
    for (const { e, d, far, minGap, rank } of cand) {
      if ((rank < AUDIO_KEY) !== (pass === 0)) continue;
      const prev = last.get(e.type);
      if ((prev !== undefined && e.step - prev < minGap * 60) || !free(e.step)) continue;
      d.gain = (rank < AUDIO_KEY ? 1 : 0.8) * far; last.set(e.type, e.step); taken.push(e.step);
    }
  }
  return { version: 1, profile: 'marbleworks-soft-v1', events: events.map((e) => decisions.get(e.seq)) };
}

const GALLERY = Object.values(EBS.KnockoutStages.gallery).map((g) => [g.id, g.label]);
const LONG = EBS.KnockoutStages.long;
const defaults = { mode: 'race', short: 'A', stage: 0, element: 'all', slowmo: 'on', marks: 'on', display: 'on', videoEnd: 'finish' };

function normalizeParams(input) {
  const p = { ...defaults, ...input }, stage = Math.round(Number(p.stage));
  const out = {
    mode: ['race', 'level', 'stage', 'gallery'].includes(p.mode) ? p.mode : defaults.mode,
    short: ['A', 'B', 'C'].includes(p.short) ? p.short : defaults.short,
    stage: Number.isFinite(stage) ? Math.max(0, Math.min(LONG.length - 1, stage)) : 0,
    element: p.element === 'all' || GALLERY.some(([id]) => id === p.element) ? p.element : 'all',
    slowmo: p.slowmo === 'off' ? 'off' : 'on',
    marks: p.marks === 'off' ? 'off' : 'on',
    display: p.display === 'off' ? 'off' : 'on',
    videoEnd: p.videoEnd === 'free' ? 'free' : 'finish',
  };
  // Drehbuch: feste Seeds je Bahn (aus dem Casting, Paket M8); nur ganze Zahlen
  if (Array.isArray(p.script) && p.script.every((v) => Number.isInteger(v) && v >= 0)) out.script = p.script.slice(0, 16);
  if (Number.isInteger(p.field) && p.field >= 2 && p.field <= 12) out.field = p.field;
  // Gesamtlevel (Teil 2): Kamera im Querformat als Fahrt oder in festen Abschnitten (nur in diesem Ablauf gesetzt)
  if (out.mode === 'level') out.cam = p.cam === 'sections' ? 'sections' : 'ride';
  return out;
}

/** Simulationswelt: Querformat 1920 × 1080, Hochformat 1080 × 1920; das Quadrat rechnet im Querformat. */
const simWorld = (world) => (world.h > world.w ? { w: 1080, h: 1920 } : { w: 1920, h: 1080 });

class KnockoutScenarioSim extends KS.KnockoutSimulation {
  constructor({ seed, params, world, timeScale = 1 }) {
    const w = simWorld(world);
    super({ seed, params: normalizeParams(params), world: w });
    this.dt = DT * timeScale; this.timeScale = timeScale;
    this.audioWorldWidth = w.w;
  }
  // Nur Darstellungsschalter wirken sofort; alles andere startet neu
  setParam(k, v) { this.cfg = normalizeParams({ ...this.cfg, [k]: v }); }
  setTimeScale(s) { this.dt = DT * s; this.timeScale = s; }
}
/** Gesamtlevel mit Kamerafahrt (R43 Teil 2, in Arbeit): THE TOWER hochkant, THE GAUNTLET quer. */
class KnockoutLevelScenarioSim extends EBS.KnockoutLevelSim.KnockoutLevelSimulation {
  constructor({ seed, params, world, timeScale = 1 }) {
    const w = simWorld(world);
    super({ seed, params: normalizeParams(params), world: w });
    this.dt = DT * timeScale; this.timeScale = timeScale;
    this.audioWorldWidth = w.w;
  }
  setParam(k, v) { this.cfg = normalizeParams({ ...this.cfg, [k]: v }); }
  setTimeScale(s) { this.dt = DT * s; this.timeScale = s; }
}
const createSim = (ctx) => (normalizeParams(ctx.params).mode === 'level' ? new KnockoutLevelScenarioSim(ctx) : new KnockoutScenarioSim(ctx));

class KnockoutRenderer extends EBS.CanvasScene {
  constructor({ sim, view, world, renderScale = 1 }) {
    super({ world, renderScale });
    this.sim = sim; this.view = view;
    // Quadrat: Querformat einpassen, Rand oben und unten
    this.fit = Math.min(world.w / sim.W, world.h / sim.H);
    this.ox = (world.w - sim.W * this.fit) / 2; this.oy = (world.h - sim.H * this.fit) / 2;
    const R = EBS.KnockoutRender;
    this.painter = sim.mode === 'level' ? new R.LevelPainter(sim, renderScale * this.fit) : new R.Painter(sim, renderScale * this.fit);
  }
  paint(g) {
    const w = this.world;
    this.painter.hud = this.view.hud !== false && this.sim.cfg.display !== 'off';
    if (this.fit !== 1) { g.fillStyle = '#05070b'; g.fillRect(0, 0, w.w, w.h); }
    g.save();
    g.translate(this.ox, this.oy); g.scale(this.fit, this.fit);
    this.painter.paint(g);
    g.restore();
  }
  destroy() {
    for (const c of [this.painter.cache, this.painter.front]) if (c) c.width = c.height = 1;
    if (this.painter.dispose) this.painter.dispose();
    super.destroy();
  }
}

/** Ganzes Rennen oder Gesamtlevel: Videolänge aus dem Ablauf (bis zum Ende des Podests). */
function racePlan(cfg, world) {
  if (!['race', 'level'].includes(cfg.params.mode) || cfg.params.videoEnd !== 'finish') return null;
  const sim = createSim({ seed: cfg.seed, params: cfg.params, world, timeScale: cfg.video.tempo });
  if (sim.mode !== 'race' && sim.mode !== 'level') return null;
  return { advance() {
    for (let i = 0; i < 3600 && sim.phase !== 'end'; i++) sim.stepOnce();
    if (sim.phase !== 'end' && sim.t < 1500) return { done: false };
    if (sim.phase !== 'end') throw new Error(`Marble Knockout: Seed ${cfg.seed} endet nicht in 25 Minuten.`);
    const fps = cfg.video.fps, tempo = cfg.video.tempo || 1;
    return { done: true, durationSec: Math.ceil((sim.t / tempo + 0.5) * fps) / fps };
  } };
}

EBS.registerScenario({
  id: 'knockout',
  title: 'Marble Knockout (in Arbeit)',
  defaults,
  controls: [
    { key: 'mode', label: 'Ablauf', type: 'select', restart: true, rebuildUi: true,
      options: [['race', 'Ganzes Rennen (Bahn für Bahn)'], ['level', 'Gesamtlevel mit Kamerafahrt (in Arbeit)'], ['stage', 'Eine Bahn'], ['gallery', 'Galerie der Bausteine']] },
    { key: 'cam', label: 'Kamera im Querformat (Gesamtlevel)', type: 'select', restart: true, visible: (p) => p.mode === 'level',
      options: [['ride', 'Fahrt: folgt dem Feld'], ['sections', 'Abschnitte: fest, gleitet zum nächsten']] },
    { key: 'short', label: 'Short-Bahnen (hochkant)', type: 'select', restart: true, enabled: (p) => p.mode === 'race' || p.mode === 'stage',
      options: [['A', 'A: Pick your color'], ['B', 'B: Follow the gold one'], ['C', 'C: Who survives the floors']] },
    { key: 'stage', label: 'Bahn (Eine Bahn, quer)', type: 'select', restart: true, enabled: (p) => p.mode === 'stage',
      options: LONG.map((s, i) => [i, `${i + 1}. ${s.title}`]) },
    { key: 'element', label: 'Baustein (Galerie)', type: 'select', restart: true, enabled: (p) => p.mode === 'gallery',
      options: [['all', 'Alle nacheinander'], ...GALLERY] },
    { key: 'slowmo', label: 'Zeitlupe bei knappen Entscheidungen', type: 'select', restart: true, options: [['on', 'An'], ['off', 'Aus']] },
    { key: 'marks', label: 'Krone und Warnring', type: 'select', options: [['on', 'An'], ['off', 'Aus']] },
    { key: 'display', label: 'Anzeige', type: 'select', options: [['on', 'An'], ['off', 'Aus (nur Bahn)']] },
    { key: 'videoEnd', label: 'Videoende', type: 'select', affectsDuration: true, options: [['finish', 'Mit dem Rennende (Länge automatisch)'], ['free', 'Freie Länge']] },
  ],
  supportsCamera: false, supportsClips: true,                     // Der Renderer hält keinen Zustand zwischen Bildern
  audio: { events: AUDIO_EVENTS, mixProfile: 'marbleworks-soft-v1', fixedGainDb: 1, ceilingDb: -6 },
  createAudioMixPlan,
  hasNaturalDuration: (cfg) => ['race', 'level'].includes(cfg.params.mode) && cfg.params.videoEnd === 'finish',
  createExportPlan: (cfg, world) => racePlan(cfg, world),
  durationLabel: { pending: 'Länge des Rennens wird berechnet …', complete: 'Automatisch: bis zum Ende des Rennens.' },
  chapters: (sim) => (sim.chapterLog || []).map((c) => ({ timeSec: c.t / (sim.timeScale || 1), title: c.title })),
  normalizeParams,
  create: createSim,
  createRenderer: (ctx) => new KnockoutRenderer(ctx),
  panelStats(sim) {
    if (sim.mode === 'gallery') return [{ key: 'element', label: 'Baustein', value: sim.spec.label }];
    const s = sim.snapshot();
    return [
      { key: 'stage', label: 'Bahn', value: `${s.stage + 1} / ${s.stages} · ${s.title}` },
      { key: 'alive', label: 'Im Rennen', value: fmtInt(s.alive) },
      { key: 'lead', label: 'Vorne', value: s.order[0] || '–' },
      { key: 'out', label: 'Raus', value: s.out.length ? s.out.join(', ') : '–' },
      // Drehbuch (M8): feste Seeds je Bahn aus dem Casting; gilt nur mit seinem Grund-Seed
      { key: 'script', label: 'Drehbuch', value: sim.cfg.script ? (EBS.Knockout.LONG_CAST.some((c) => c.seed === sim.seed) ? 'an' : 'an (anderer Seed)') : 'aus' },
    ];
  },
  panelNote: (sim) => sim.snapshot().summary,
});

// Short-Casting (M7, scripts/knockout-casting.mjs --list, Seeds 1–200): je Fassung die besten vollständigen Seeds
// (höchstens 40 s, knappes Finale, Führungswechsel, Sturz auf der Gefahrenbahn, bei B GOLD im Finale, niemand hängt).
// A: 134 vollständig, davon die besten 24; B: alle 15; C: alle 23.
const SHORT_CAST = {
  A: [3, 35, 47, 50, 51, 74, 87, 97, 103, 107, 122, 131, 137, 139, 141, 160, 163, 167, 171, 175, 177, 192, 193, 196],
  B: [23, 32, 55, 57, 71, 81, 82, 88, 98, 104, 136, 149, 173, 177, 190],
  C: [15, 32, 42, 53, 56, 58, 64, 69, 81, 95, 99, 104, 105, 106, 128, 131, 133, 136, 139, 160, 182, 185, 199],
};
/** Nächster geprüfter Short-Seed ab seed (sonst der erste der Liste). */
const castShortSeed = (seed, short = 'A') => { const list = SHORT_CAST[short] || SHORT_CAST.A; return list.find((s) => s >= seed) ?? list[0]; };

// Gesamtlevel THE TOWER (G3, scripts/knockout-casting.mjs --level tower, Seeds 1–200): 23 vollständig (höchstens 40 s,
// knappe Schleuse oder Sturz, knappes Finale, Führungswechsel im Finale, niemand braucht einen Anstoß). Davon hier
// die mit echtem Fotofinish (Platz 1 und 2 unter 0,3 s, Einblendung PHOTO FINISH).
const TOWER_CAST = [4, 9, 59, 109, 125, 137, 149, 182];
/** Nächster geprüfter Turm-Seed ab seed (sonst der erste der Liste). */
const castTowerSeed = (seed) => TOWER_CAST.find((s) => s >= seed) ?? TOWER_CAST[0];

// Langvideo-Drehbücher (M8, scripts/knockout-casting.mjs --long): je Grund-Seed ein Seed pro Bahn. Geschichte: Die
// Außenseiterin entkommt dreimal knapp und kommt ins Finale, der frühe Spitzenreiter stürzt auf Bahn 7 am Hammer,
// das Finale entscheidet ein Fotofinish (unter 0,3 s). Das Drehbuch gilt nur zusammen mit seinem Grund-Seed
// (Aufstellung). Der erste Eintrag ist die Empfehlung für die Vorlage: ohne Stoß, und die dritte knappe Rettung
// kommt erst in der Mitte des Videos.
const LONG_CAST = [
  // YELLOW entkommt auf Bahn 1, 2 und 6 knapp, RED stürzt auf Bahn 7, Fotofinish 0,277 s, Podest GOLD, ORANGE, YELLOW
  { seed: 3, script: [3933459010, 2179995249, 158089584, 2882867000, 1028737525, 3419242489, 3721404399, 4281868964, 280307425, 2009495816], underdog: 'YELLOW', leader: 'RED' },
  // GREEN entkommt auf Bahn 1, 2 und 3 knapp, RED stürzt auf Bahn 7, Fotofinish 0,257 s, Podest BLACK, GREEN, PINK
  { seed: 2, script: [1296469324, 3194329758, 1671238307, 688202754, 4285078904, 1618655811, 2544194846, 1031947465, 3733490268, 1428153327], underdog: 'GREEN', leader: 'RED' },
  // GOLD entkommt auf Bahn 1, 3 und 6 knapp, CYAN stürzt auf Bahn 7, Fotofinish 0,234 s, Podest PURPLE, LIME, GOLD; ein Stoß auf Bahn 1
  { seed: 1, script: [3132729028, 276461215, 3979003516, 2074541184, 3217042755, 3738335172, 1063340469, 776204934, 3160761223, 3041406069], underdog: 'GOLD', leader: 'CYAN' },
];
/** Drehbuch zum Grund-Seed (sonst das erste, die Empfehlung). */
const castLong = (seed) => LONG_CAST.find((c) => c.seed === seed) || LONG_CAST[0];

EBS.Knockout = { normalizeParams, simWorld, SHORT_CAST, castShortSeed, TOWER_CAST, castTowerSeed, LONG_CAST, castLong };
})();
