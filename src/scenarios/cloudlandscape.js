/* Eigenständiger Ablauf unter Cloud Wars. Short und Runden gehören weiter ihrer eigenen Anmeldung. */
(function () {
'use strict';
const L = EBS.CloudLandscape, id = 'cloudwars', mode = 'landscape';
const modeLabel = 'Landschaftsreise · 9 Minuten';
const durationSec = 540;
const videoDefaults = { aspect: '16:9', durationSec, resolution: 1080, fps: 30 };
const defaultVolume = { master: 100, water: 100 };
function presetForMode(selected, seed) {
  if (selected !== mode) return EBS.productionPreset(id, selected === 'rounds' ? 'long' : 'short', seed);
  return { version: 1, name: 'Cloud Wars – Landschaftsreise am Fluss', scenario: id, seed, params: { mode },
    video: { ...videoDefaults, tempo: 1, audio: true, volume: { ...defaultVolume },
      quality: { crf: 20, preset: 'medium', bitrate: null } }, view: { hud: false, camera: true } };
}
class LandscapeRenderer extends EBS.CanvasScene {
  constructor(ctx) {
    super(ctx);
    this.sim = ctx.sim; this.view = ctx.view;
    const c = this.sim.valley.camera(0, this.world);
    this.film = new L.Film(this.sim.valley, c.scale * this.scale);
  }
  paint(g) {
    const sim = this.sim;
    this.film.draw(g, this.world, sim.progress, sim.t, this.view.camera, this.view.hud, sim.duration * sim.timeScale);
  }
  destroy() { this.film.destroy(); super.destroy(); }
}
EBS.registerScenario({
  id, mode, modeLabel, presetForMode, title: 'Cloud Wars · Landschaftsreise', videoDefaults,
  defaults: { mode }, viewDefaults: { hud: false }, normalizeParams: () => ({ mode }),
  controls: [EBS.getScenario(id).controls.find(c => c.key === 'mode')],
  supportsCamera: true, supportsClips: true, restartOnDuration: true,
  create: ctx => new L.Simulation(ctx), createRenderer: ctx => new LandscapeRenderer(ctx),
  audio: {
    // Der vorhandene vorbereitete Wasserloop enthält bereits den nahtlosen Übergang.
    events: {}, defaultVolume, fixedGainDb: 0, ceilingDb: -3, aacNoPns: true,
    background: { file: 'pyramid-water-loop.wav', label: 'Fluss und See', volumeKey: 'water',
      gainDb: -8, referenceMaster: 100, loopStartSec: 4, loopEndSec: 67.2, fadeSec: 0.35 }
  },
  panelStats: sim => [{ key: 'reach', label: 'Strecke', value: Math.round(sim.progress * 100) + ' %' }],
  panelNote: sim => sim.snapshot().region
});
})();
