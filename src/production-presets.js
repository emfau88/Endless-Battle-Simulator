// Common starting points for the integrated scenarios. The JSON files in
// presets/production carry the same values for CLI use; tests check both paths.
(function () {
  'use strict';
  const labels = { naval: 'Seeschlacht', marble: 'Kugelfabrik', scrap: 'Scrap Wars', mycelium: 'Myzel', pyramid: 'Pyramide', territory: 'Territory Wars / Hex Dominion', marbleworks: 'Marble Works', waterpark: 'Wasserpark' };
  EBS.productionPreset = (scenario, kind, seed = 42) => {
    if (!Object.hasOwn(labels, scenario) || !['short', 'long'].includes(kind)) throw new Error('Unbekannte Produktionsvorlage.');
    if (scenario === 'marbleworks') return EBS.MarbleProduction.preset(kind, seed);
    const short = kind === 'short';
    if (scenario === 'waterpark') return {
      version: 1, name: `Wasserpark – ${short ? 'Vier Tiere (30 Sekunden)' : 'Ein Parktag (10 Minuten)'}`,
      scenario, seed,
      params: { mode: short ? 'short' : 'day', animals: short ? 4 : 16, size: 24, ending: 'quiet', fireworks: false, dayMinutes: 0, decoDensity: short ? 0.5 : 1 },
      video: { aspect: short ? '9:16' : '16:9', resolution: 1080, fps: 60, durationSec: short ? 30 : 600,
        tempo: 1, audio: true, volume: { ...EBS.getScenario('waterpark').audio.defaultVolume },
        quality: { crf: 18, preset: 'medium', bitrate: null } },
      view: { hud: true, camera: false },
    };
    return {
      version: 1,
      name: `${labels[scenario]} – ${short ? 'Short (1 Minute)' : 'Langvideo (10 Minuten)'}`,
      scenario, seed,
      params: scenario === 'scrap' ? { arena: 'sunshine', rulesVersion: 'v3', episodeMode: 'endless', repeatRounds: true }
        // Pyramide: Tierchen; hochkant so groß wie möglich, quer die größte Größe, bei der die Bahn fünf Schienen behält
        : scenario === 'pyramid' ? { dayMinutes: short ? 1 : 0, figure: 1, size: short ? 24 : 18, wiggle: 1.2 }
        : scenario === 'territory' ? { layout: short ? 'portrait' : 'landscape', repeatRounds: true } : {},
      video: { aspect: short ? '9:16' : '16:9', resolution: 1080, fps: 30, durationSec: short ? 60 : 600,
        tempo: scenario === 'territory' ? .75 : 1, audio: true,
        volume: scenario === 'pyramid' ? { ...EBS.getScenario('pyramid').audio.defaultVolume } : { master: 100 },
        quality: { crf: 20, preset: 'medium', bitrate: null } },
      view: { hud: true, camera: !['scrap', 'territory'].includes(scenario) },
    };
  };
})();
