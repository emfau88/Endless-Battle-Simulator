// Common starting points for the integrated scenarios. The JSON files in
// presets/production carry the same values for CLI use; tests check both paths.
(function () {
  'use strict';
  const labels = { naval: 'Seeschlacht', marble: 'Kugelfabrik', scrap: 'Scrap Wars', mycelium: 'Myzel', pyramid: 'Pyramide', territory: 'Territory Wars / Hex Dominion', marbleworks: 'Marble Works', waterpark: 'Wasserpark', cloudwars: 'Cloud Wars', foerderduell: 'Schnecke gegen Stempel' };
  EBS.productionPreset = (scenario, kind, seed = 42) => {
    if (!Object.hasOwn(labels, scenario) || !['short', 'long'].includes(kind)) throw new Error('Unbekannte Produktionsvorlage.');
    if (scenario === 'marbleworks') return EBS.MarbleProduction.preset(kind, seed);
    const short = kind === 'short';
    if (scenario === 'foerderduell') return {
      version: 1, name: short ? 'Schnecke gegen Stempel – Zwei Schübe' : 'Schnecke gegen Stempel – Rennserie',
      scenario, seed, params: { mode: short ? 'single' : 'series', supply: short ? 'bursts' : 'mixed' },
      video: { aspect: short ? '9:16' : '16:9', resolution: 1080, fps: 30, durationSec: short ? 12.3 : 600,
        tempo: 1, audio: true, volume: { master: 100 }, quality: { crf: 20, preset: 'medium', bitrate: null } },
      view: { hud: true, camera: false },
    };
    if (scenario === 'waterpark') return {
      version: 1, name: `Wasserpark – ${short ? 'Vier Tiere (30 Sekunden)' : 'Ein Parktag (10 Minuten)'}`,
      scenario, seed,
      // A park day ends with the fountain show; the four-animal short keeps its quiet ending.
      params: { mode: short ? 'short' : 'day', animals: short ? 4 : 16, size: short ? 38 : 36, ending: short ? 'quiet' : 'show', fireworks: !short, dayMinutes: 0, decoDensity: short ? 0.5 : 1 },
      video: { aspect: short ? '9:16' : '16:9', resolution: 1080, fps: 60, durationSec: short ? 30 : 600,
        tempo: 1, audio: true, volume: { ...EBS.getScenario('waterpark').audio.defaultVolume },
        quality: { crf: 18, preset: 'medium', bitrate: null } },
      view: { hud: true, camera: false },
    };
    // Cloud Wars: Short mit verdeckter Regie auf einem geprüften Seed (Länge aus dem Ablauf, 24–60 s);
    // Langvideo im Runden-Modus mit Tageslauf und Wetter, feste Übersicht.
    if (scenario === 'cloudwars') return {
      version: 1, name: `Cloud Wars – ${short ? 'Short (Which cloud rules the sky?)' : 'Langvideo (10 Minuten, Runden)'}`,
      scenario, seed: short ? EBS.CloudWars.castSeed(seed) : seed,
      params: { mode: short ? 'short' : 'rounds', display: 'auto', director: 'on', videoEnd: 'victory' },
      video: { aspect: short ? '9:16' : '16:9', resolution: 1080, fps: 30, durationSec: short ? 30 : 600, tempo: 1, audio: true,
        volume: { master: 100 }, quality: { crf: 20, preset: 'medium', bitrate: null } },
      view: { hud: true, camera: false },
    };
    // Territory Short: small map with the hidden story "The last crown"; the video ends three
    // seconds after the result (length is planned from the seed, about half a minute).
    if (scenario === 'territory' && short) return {
      version: 1, name: `${labels[scenario]} – Short (Die letzte Krone)`, scenario, seed,
      params: { layout: 'short', profile: 'blitz', incomeMultiplier: 2, aggression: 1, offensiveInterval: 2, marchDuration: 1.5,
        repeatRounds: false, endPauseSec: 3, cameraElevation: 1, story: 'crown', storySec: 60, videoEnd: 'victory', units: 'soldiers' },
      video: { aspect: '9:16', resolution: 1080, fps: 30, durationSec: 33, tempo: 2, audio: true, volume: { master: 100 },
        quality: { crf: 20, preset: 'medium', bitrate: null } },
      view: { hud: true, camera: false },
    };
    return {
      version: 1,
      name: `${labels[scenario]} – ${short ? 'Short (1 Minute)' : 'Langvideo (10 Minuten)'}`,
      scenario, seed,
      params: scenario === 'scrap' ? { arena: 'sunshine', rulesVersion: 'v4', episodeMode: 'endless', repeatRounds: true, soundMix: 'soft-v1' }
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
