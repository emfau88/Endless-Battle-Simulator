// Common starting points for the five integrated scenarios. The JSON files in
// presets/production carry the same values for CLI use; tests check both paths.
(function () {
  'use strict';
  const labels = { naval: 'Seeschlacht', marble: 'Kugelfabrik', scrap: 'Scrap Wars', mycelium: 'Myzel', pyramid: 'Pyramide' };
  EBS.productionPreset = (scenario, kind, seed = 42) => {
    if (!Object.hasOwn(labels, scenario) || !['short', 'long'].includes(kind)) throw new Error('Unbekannte Produktionsvorlage.');
    const short = kind === 'short';
    return {
      version: 1,
      name: `${labels[scenario]} – ${short ? 'Short (1 Minute)' : 'Langvideo (10 Minuten)'}`,
      scenario, seed,
      params: scenario === 'scrap' ? { arena: 'sunshine', rulesVersion: 'v3', episodeMode: 'endless', repeatRounds: true }
        : scenario === 'pyramid' ? { dayMinutes: short ? 1 : 0 } : {},
      video: { aspect: short ? '9:16' : '16:9', resolution: 1080, fps: 30, durationSec: short ? 60 : 600,
        tempo: 1, audio: true, volume: { master: 100 }, quality: { crf: 20, preset: 'medium', bitrate: null } },
      view: { hud: true, camera: scenario !== 'scrap' },
    };
  };
})();
