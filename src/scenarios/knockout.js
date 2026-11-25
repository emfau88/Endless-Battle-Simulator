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

const GALLERY = Object.values(EBS.KnockoutStages.gallery).map((g) => [g.id, g.label]);
const LONG = EBS.KnockoutStages.long;
const defaults = { mode: 'race', short: 'A', stage: 0, element: 'all', slowmo: 'on', marks: 'on', display: 'on', videoEnd: 'finish' };

function normalizeParams(input) {
  const p = { ...defaults, ...input }, stage = Math.round(Number(p.stage));
  const out = {
    mode: ['race', 'stage', 'gallery'].includes(p.mode) ? p.mode : defaults.mode,
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
  return out;
}

/** Simulationswelt: Querformat 1920 × 1080, Hochformat 1080 × 1920; das Quadrat rechnet im Querformat. */
const simWorld = (world) => (world.h > world.w ? { w: 1080, h: 1920 } : { w: 1920, h: 1080 });
/** Solange die Short-Bahnen fehlen (Paket M7), zeigt das Hochformat die Galerie. */
const shortReady = (short) => (EBS.KnockoutStages.short[short] || []).length > 0;

class KnockoutScenarioSim extends KS.KnockoutSimulation {
  constructor({ seed, params, world, timeScale = 1 }) {
    const cfg = normalizeParams(params), w = simWorld(world);
    if (w.h > w.w && cfg.mode !== 'gallery' && !shortReady(cfg.short)) cfg.mode = 'gallery';
    super({ seed, params: cfg, world: w });
    this.dt = DT * timeScale; this.timeScale = timeScale;
    this.audioWorldWidth = w.w;
  }
  // Nur Darstellungsschalter wirken sofort; alles andere startet neu (die Galerie-Umleitung bleibt erhalten)
  setParam(k, v) { const mode = this.cfg.mode; this.cfg = { ...normalizeParams({ ...this.cfg, [k]: v }), mode }; }
  setTimeScale(s) { this.dt = DT * s; this.timeScale = s; }
}

class KnockoutRenderer extends EBS.CanvasScene {
  constructor({ sim, view, world, renderScale = 1 }) {
    super({ world, renderScale });
    this.sim = sim; this.view = view;
    // Quadrat: Querformat einpassen, Rand oben und unten
    this.fit = Math.min(world.w / sim.W, world.h / sim.H);
    this.ox = (world.w - sim.W * this.fit) / 2; this.oy = (world.h - sim.H * this.fit) / 2;
    this.painter = new EBS.KnockoutRender.Painter(sim, renderScale * this.fit);
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
  destroy() { if (this.painter.cache) this.painter.cache.width = this.painter.cache.height = 1; super.destroy(); }
}

/** Ganzes Rennen: Videolänge aus dem Ablauf (bis zum Ende des Podests). */
function racePlan(cfg, world) {
  if (cfg.params.mode !== 'race' || cfg.params.videoEnd !== 'finish') return null;
  const sim = new KnockoutScenarioSim({ seed: cfg.seed, params: cfg.params, world, timeScale: cfg.video.tempo });
  if (sim.mode !== 'race') return null;
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
    { key: 'mode', label: 'Ablauf', type: 'select', restart: true, rebuildUi: true, options: [['race', 'Ganzes Rennen'], ['stage', 'Eine Bahn'], ['gallery', 'Galerie der Bausteine']] },
    { key: 'short', label: 'Short-Bahnen (hochkant)', type: 'select', restart: true, enabled: (p) => p.mode !== 'gallery',
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
  hasNaturalDuration: (cfg) => cfg.params.mode === 'race' && cfg.params.videoEnd === 'finish',
  createExportPlan: (cfg, world) => racePlan(cfg, world),
  durationLabel: { pending: 'Länge des Rennens wird berechnet …', complete: 'Automatisch: bis zum Ende des Rennens.' },
  chapters: (sim) => (sim.chapterLog || []).map((c) => ({ timeSec: c.t / (sim.timeScale || 1), title: c.title })),
  normalizeParams,
  create: (ctx) => new KnockoutScenarioSim(ctx),
  createRenderer: (ctx) => new KnockoutRenderer(ctx),
  panelStats(sim) {
    if (sim.mode === 'gallery') return [{ key: 'element', label: 'Baustein', value: sim.spec.label }];
    const s = sim.snapshot();
    return [
      { key: 'stage', label: 'Bahn', value: `${s.stage + 1} / ${s.stages} · ${s.title}` },
      { key: 'alive', label: 'Im Rennen', value: fmtInt(s.alive) },
      { key: 'lead', label: 'Vorne', value: s.order[0] || '–' },
      { key: 'out', label: 'Raus', value: s.out.length ? s.out.join(', ') : '–' },
    ];
  },
  panelNote: (sim) => sim.snapshot().summary,
});

EBS.Knockout = { normalizeParams, simWorld };
})();
