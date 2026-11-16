/*
 * Szenario „Marble Factory XL“ (in Arbeit) – Produktionslinie mit neun verschiedenen Stationen
 *
 * Stand: bewegter Entwurf. Die Halle und alle Maschinen zeichnet src/scenarios/marblexl/concept.js im Stil der
 * klassischen Kugelfabrik. Der Ablauf ist bewusst einfach: Alle 1,6 Sekunden startet eine Kugel und folgt
 * demselben Zeitplan durch die Stationen (noch ohne Warteschlangen und ohne echte Physik). Ort und Zustand jeder
 * Kugel hängen nur von der Zeit ab; deshalb ist jedes Bild nach einem Sprung sofort richtig (Seek-Regel).
 *
 * Ton: die weichen Klänge von Marble Works mit fester Mischung (keine Einmessung auf −14 LUFS) und begrenzter
 * Dichte. Die klirrenden Klänge der klassischen Fabrik hat der Nutzer am 16.11.2026 abgelehnt.
 */
(function () {
'use strict';
const { DT } = EBS;
const { clamp, fnv1a, fmtInt } = EBS.util;
const X = EBS.MarbleXLConcept;

// Klänge: Reihenfolge = Vorrang, wenn zu viel gleichzeitig geschieht (oben wichtig, unten Beiwerk)
const AUDIO_EVENTS = {
  xlLand: { label: 'Kugel landet in der Röhre', samples: ['mw-soft-glass-0', 'mw-soft-glass-1', 'mw-soft-glass-2'], gain: 0.46, semis: -2, detune: 0.25, minGap: 0.3, scale: [0, 0, 0.25, 0.25, 0.5, 0.5] },
  xlColourDone: { label: 'Farbstation · Kugel fertig', samples: ['mw-soft-glass-1'], gain: 0.26, semis: -4, detune: 0.15, minGap: 0.8 },
  xlColour: { label: 'Farbstation · Sprühen', samples: ['mw-soft-switch-0', 'mw-soft-switch-1'], gain: 0.2, semis: -1, detune: 0.2, minGap: 0.8 },
  xlPolish: { label: 'Polierer', samples: ['mw-soft-wood-1', 'mw-soft-wood-2'], gain: 0.34, semis: -1, detune: 0.25, minGap: 0.8 },
  xlRail: { label: 'Sortierschiene', samples: ['mw-soft-switch-1', 'mw-soft-wood-0'], gain: 0.28, detune: 0.25, minGap: 0.6 },
  xlFeed: { label: 'Zellenrad', samples: ['mw-soft-wood-0', 'mw-soft-wood-1'], gain: 0.3, detune: 0.2, minGap: 0.8 },
  xlKiln: { label: 'Ofen · Einlauf', samples: ['mw-soft-body-0', 'mw-soft-body-1'], gain: 0.24, semis: -5, detune: 0.2, minGap: 1.2 },
  xlDrum: { label: 'Waschtrommel', samples: ['mw-soft-body-0', 'mw-soft-body-1'], gain: 0.2, semis: 1, detune: 0.4, minGap: 1.0 },
  xlScan: { label: 'Prüfung', samples: ['mw-soft-switch-0', 'mw-soft-switch-1'], gain: 0.16, semis: 1, detune: 0.2, minGap: 1.2 },
  xlLift: { label: 'Radaufzug', samples: ['mw-soft-wood-0'], gain: 0.2, semis: -3, detune: 0.2, minGap: 1.2 },
  xlBelt: { label: 'Förderband', samples: ['mw-soft-glass-0', 'mw-soft-wood-0'], gain: 0.14, semis: -1, detune: 0.3, minGap: 1.4 },
  xlHopper: { label: 'Behälter', samples: ['mw-soft-body-0', 'mw-soft-body-1'], gain: 0.18, semis: 2, detune: 0.3, minGap: 1.4 },
};
const ORDER = Object.keys(AUDIO_EVENTS), KEY_SOUNDS = 5;        // die ersten fünf haben Vorrang
const OVERVIEW_GAIN = 0.7;                                     // Anteil je Klang in der Übersicht
/** Fester Mischplan: begrenzt die Dichte (höchstens zwei Klänge je 0,6 s) und verteilt nach Ort im Bild. */
function createAudioMixPlan(events, { cfg }) {
  const volume = (cfg.video && cfg.video.volume) || {}, decisions = new Map(), cand = [];
  for (const e of events) {
    const d = { seq: e.seq, gain: 0, pan: clamp((e.x / X.W - 0.5) * 0.7, -0.35, 0.35) }; decisions.set(e.seq, d);
    const def = AUDIO_EVENTS[e.type];
    if (!def || volume[e.type] === 0 || volume.master === 0) continue;
    cand.push({ e, d, minGap: def.minGap || 0, rank: ORDER.indexOf(e.type) });
  }
  cand.sort((a, b) => a.e.step - b.e.step || a.rank - b.rank || a.e.seq - b.e.seq);
  const taken = [], free = (step) => { let n = 0; for (let i = taken.length - 1; i >= 0 && n < 2; i--) if (Math.abs(taken[i] - step) < 0.3 * 60) n++; return n < 2; };
  for (const pass of [0, 1]) {
    const last = new Map();
    for (const { e, d, minGap, rank } of cand) {
      if ((rank < KEY_SOUNDS) !== (pass === 0)) continue;
      const prev = last.get(e.type);
      if ((prev !== undefined && e.step - prev < minGap * 60) || !free(e.step)) continue;
      d.gain = OVERVIEW_GAIN; last.set(e.type, e.step); taken.push(e.step);
    }
  }
  return { version: 1, profile: 'marbleworks-soft-v1', events: events.map((e) => decisions.get(e.seq)) };
}

class LineSim {
  constructor({ params, timeScale = 1 }) {
    this.cfg = { ...params };
    this.dt = DT * timeScale;
    this.step = 0; this.t = 0;
    this.events = new Array(1024); this.eventSeq = 0;
    this.audioWorldWidth = X.W;
  }
  setParam(k, v) { this.cfg[k] = v; }
  stepOnce() {
    const a = this.t % X.LOOP;
    this.step++; this.t = this.step * this.dt;
    const b = this.t % X.LOOP;
    if (b > a) X.eventsBetween(a, b, (type, _time, x, y, p, c) => {
      this.events[this.eventSeq % this.events.length] = { seq: this.eventSeq, step: this.step, t: this.t, type, x, y, p, c };
      this.eventSeq++;
    });
  }
  flow() { return X.flowAt(this.t % X.LOOP); }
  checkInvariants() {
    const errors = [];
    for (const m of this.flow().list) if (!(Number.isFinite(m.x) && Number.isFinite(m.y))) errors.push(`Kugel ${m.n}: kein gültiger Ort`);
    return { ok: errors.length === 0, errors, bodies: 0 };
  }
  snapshot() {
    const f = this.flow(), kinds = { raw: 0, washed: 0, clear: 0, color: 0 };
    for (const m of f.list) if (!m.landed) kinds[m.kind]++;
    return {
      summary: `${f.done} von 96 fertig · ${f.list.filter((m) => !m.landed).length} Kugeln unterwegs`,
      t: this.t, step: this.step, done: f.done, moving: f.list.filter((m) => !m.landed).length, ...kinds,
    };
  }
  stateHash() { const f = this.flow(); return fnv1a(this.step + '|' + f.done + '|' + f.list.map((m) => m.x.toFixed(3) + ',' + m.y.toFixed(3) + m.kind[0]).join(';')).toString(16).padStart(8, '0'); }
  destroy() {}
}

class LineRenderer extends EBS.CanvasScene {
  constructor({ sim, view, world, renderScale = 1 }) {
    super({ world, renderScale });
    this.sim = sim; this.view = view;
    // Der Hintergrund wird einmal vorgezeichnet; der Zoom der Ansicht bestimmt seine Schärfe
    this.bgScale = clamp((world.w >= world.h ? world.w / X.W : world.h / X.H) * renderScale, 0.5, 2);
  }
  paint(g) {
    const sim = this.sim, w = this.world, cam = X.cameraAt(sim.step * DT, w, !!this.view.camera);
    g.fillStyle = '#05070b'; g.fillRect(0, 0, w.w, w.h);
    g.save();
    g.translate(w.w / 2 - cam.cx * cam.s, w.h / 2 - cam.cy * cam.s); g.scale(cam.s, cam.s);
    X.drawScene(g, sim.t, cam.s * this.scale, this.bgScale);
    g.restore();
    X.vignette(g, w.w, w.h);
  }
}

EBS.registerScenario({
  id: 'marblexl',
  title: 'Marble Factory XL (in Arbeit)',
  defaults: {},
  controls: [],
  normalizeParams: () => ({}),
  create: (ctx) => new LineSim(ctx),
  createRenderer: (ctx) => new LineRenderer(ctx),
  panelStats(sim) {
    const s = sim.snapshot();
    return [
      { key: 'done', label: 'Fertig', value: `${s.done} / 96` },
      { key: 'moving', label: 'Unterwegs', value: fmtInt(s.moving) },
      { key: 'raw', label: 'Roh', value: s.raw }, { key: 'washed', label: 'Gewaschen', value: s.washed },
      { key: 'clear', label: 'Poliert', value: s.clear }, { key: 'color', label: 'Gefärbt', value: s.color },
    ];
  },
  panelNote: (sim) => sim.snapshot().summary,
  // Feste Mischung wie bei Marble Works (keine Lautheits-Einmessung): Grundpegel +12 dB, Spitzenschutz −6 dBFS.
  // Gemessen ergibt das rund −24 LUFS, also deutlich leiser als die −14 LUFS der übrigen Szenarien.
  audio: { events: AUDIO_EVENTS, mixProfile: 'marbleworks-soft-v1', fixedGainDb: 12, ceilingDb: -6 },
  createAudioMixPlan,
});
})();
