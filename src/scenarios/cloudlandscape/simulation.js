/* Die Fahrt wird in Videosekunden geplant. Auch in Zeitlupe kommt die Fähre am Filmende ins Bild. */
(function () {
'use strict';
const L = EBS.CloudLandscape;
const regions = ['Mühlendorf', 'Flusswiesen und Bahnbrücke', 'Marktstadt', 'Altarm und Schilfinsel', 'Seehafen'];
const boundaries = [.14, .38, .62, .852];

class LandscapeSimulation {
  constructor({ seed, video, timeScale = 1 }) {
    this.seed = seed;
    this.valley = new L.Valley(seed);
    this.duration = video.durationSec;
    this.timeScale = timeScale;
    this.step = 0;
  }
  stepOnce() { this.step++; }
  get t() { return this.step * EBS.DT * this.timeScale; }
  get progress() { return Math.min(1, this.step / (EBS.PHYS_HZ * this.duration)); }
  snapshot() {
    const p = this.progress;
    let region = 0;
    while (region < boundaries.length && p >= boundaries[region]) region++;
    return { t: this.t, step: this.step, progress: p, region: regions[region],
      train: this.valley.train(p), ferry: this.valley.ferry(p), summary: regions[region] };
  }
  checkInvariants() {
    const errors = [];
    if (!Number.isSafeInteger(this.step) || this.step < 0 || !Number.isFinite(this.t)) errors.push('Ungültige Reisezeit.');
    if (!(this.duration > 0 && this.progress >= 0 && this.progress <= 1)) errors.push('Ungültige Strecke.');
    return { ok: !errors.length, errors };
  }
  stateHash() { return EBS.util.hashSeed('cloud-landscape-v1', this.seed, this.step, this.duration, this.timeScale).toString(16); }
  destroy() {}
}
L.Simulation = LandscapeSimulation;
})();
