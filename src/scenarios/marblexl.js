/*
 * Szenario „Marble Factory XL“ (in Arbeit) – Produktionslinie mit neun verschiedenen Stationen
 *
 * Stand: bewegter Entwurf. Die Halle und alle Maschinen zeichnet src/scenarios/marblexl/concept.js im Stil der
 * klassischen Kugelfabrik. Der Ablauf ist bewusst einfach: Alle 1,6 Sekunden startet eine Kugel und folgt
 * demselben Zeitplan durch die Stationen (noch ohne Warteschlangen und ohne echte Physik). Ort und Zustand jeder
 * Kugel hängen nur von der Zeit ab; deshalb ist jedes Bild nach einem Sprung sofort richtig (Seek-Regel).
 *
 * Ton: vorläufig die Klänge der klassischen Fabrik an passenden Stellen. Eigene Klänge für Trommel, Ofen und
 * Farbstation fehlen noch, ebenso die Lautstärke nach Bildausschnitt.
 */
(function () {
'use strict';
const { DT } = EBS;
const { clamp, fnv1a, fmtInt } = EBS.util;
const X = EBS.MarbleXLConcept;

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
    // Der Hintergrund wird einmal vorgezeichnet; höchster Zoom der Kamerafahrt bestimmt seine Schärfe
    this.bgScale = clamp((world.w >= world.h ? 0.75 : world.h / X.H) * renderScale, 0.5, 2);
  }
  paint(g) {
    const sim = this.sim, w = this.world, vt = sim.step * DT;
    const cam = X.cameraAt(vt, w, !!this.view.camera && sim.cfg.cameraMode !== 'overview');
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
  defaults: { cameraMode: 'auto' },
  controls: [
    { key: 'cameraMode', label: 'Kamera', type: 'select', options: [['auto', 'Automatische Fahrt'], ['overview', 'Nur Übersicht']] },
  ],
  normalizeParams: (p) => ({ cameraMode: p.cameraMode === 'overview' ? 'overview' : 'auto' }),
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
  audio: EBS.getScenario('marble').audio,
});
})();
