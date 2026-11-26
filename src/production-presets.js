// Common starting points for the integrated scenarios. The JSON files in
// presets/production carry the same values for CLI use; tests check both paths.
(function () {
  'use strict';
  const labels = { naval: 'Seeschlacht', marble: 'Kugelfabrik', scrap: 'Scrap Wars', mycelium: 'Myzel', pyramid: 'Pyramide', territory: 'Territory Wars / Hex Dominion', marbleworks: 'Marble Works', waterpark: 'Wasserpark', cloudwars: 'Cloud Wars', knockout: 'Marble Knockout' };
  EBS.productionPreset = (scenario, kind, seed = 42) => {
    if (!Object.hasOwn(labels, scenario) || !['short', 'long'].includes(kind)) throw new Error('Unbekannte Produktionsvorlage.');
    if (scenario === 'marbleworks') return EBS.MarbleProduction.preset(kind, seed);
    const short = kind === 'short';
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
    // Marble Knockout: Short als Gesamtlevel THE TOWER (16 Murmeln, eine Fahrt durch den Turm, Ziel mit Fotofinish)
    // auf einem geprüften Casting-Seed (seit G3); Langvideo als Gesamtlevel THE GAUNTLET (20 Murmeln, zehn Abschnitte,
    // Kamerafahrt, Einstiegsflug, Podest) nach einem gecasteten Drehbuch (seit G6). Das Rennen Bahn für Bahn bleibt
    // über „Ablauf“ wählbar. Seit G9 sind es im Langvideo zwei Rennen mit Gesamtwertung (rund 7 Minuten, gecastete
    // Paarung mit Drehbüchern); ein einzelnes Rennen bleibt über „Rennen im Querformat“ wählbar. Beide enden mit dem
    // Rennende (40 s und 420 s sind nur Startwerte). Das Langvideo exportiert in 1440p mit 60 fps und CRF 16: Ab 1440p
    // vergibt YouTube den besseren Codec, und die Murmeln laufen mit 60 fps flüssiger (seit G9, wie Myzel).
    if (scenario === 'knockout') {
      const cast = short ? null : EBS.Knockout.castSeries(seed);
      return {
        version: 1, name: `${labels[scenario]} – ${short ? 'Short (The Tower)' : 'Langvideo (The Gauntlet, zwei Rennen)'}`,
        scenario, seed: short ? EBS.Knockout.castTowerSeed(seed) : cast.seed,
        params: short ? { mode: 'level', slowmo: 'on', marks: 'on', display: 'on', videoEnd: 'finish' }
          : { mode: 'level', cam: 'ride', intro: 'on', series: 'two', slowmo: 'on', marks: 'on', display: 'on', videoEnd: 'finish',
            script: cast.script, seed2: cast.seed2, script2: cast.script2 },
        video: { aspect: short ? '9:16' : '16:9', resolution: short ? 1080 : 1440, fps: short ? 30 : 60, durationSec: short ? 40 : 420,
          tempo: 1, audio: true, volume: { master: 100 }, quality: { crf: short ? 20 : 16, preset: 'medium', bitrate: null } },
        view: { hud: true, camera: false },
      };
    }
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
    // Scrap Short: Taktik-Arena auf Sunny Yard im Short-Bild (kleine Karte, keine Kopfleiste, verdeckte Regie) auf
    // einem im Browser geprüften Casting-Seed. Das Video endet 2,5 s nach dem Sieg; 35 s ist nur der Startwert.
    if (scenario === 'scrap' && short) return {
      version: 1, name: `${labels[scenario]} – Short (4 Bots, 1 Survivor)`, scenario, seed: EBS.Scrap.castSeed(seed),
      params: { arena: 'sunshine', rulesVersion: 'v4', layout: 'short', episodeMode: 'endless', repeatRounds: true, soundMix: 'soft-v1' },
      video: { aspect: '9:16', resolution: 1080, fps: 30, durationSec: 35, tempo: 1, audio: true, volume: { master: 100 },
        quality: { crf: 20, preset: 'medium', bitrate: null } },
      view: { hud: true, camera: false },
    };
    // Scrap Langvideo: Turnier mit acht Runden und Rangliste in der Taktik-Arena. Das Video endet 5 s nach der
    // letzten Runde (rund 4 bis 5,5 Minuten); 300 s ist nur der Startwert. Der Export schreibt Kapitelzeiten.
    // Waffen wie im Short: Blaster lädt nach, Raketen nur von den zwei Stationen (items: 'rockets'). Die Vorlage
    // nimmt einen geprüften Turnier-Seed, bei dem die Entscheidung erst in der letzten Runde fällt.
    if (scenario === 'scrap') return {
      version: 1, name: `${labels[scenario]} – Langvideo (Turnier, 8 Runden)`, scenario, seed: EBS.Scrap.castTournamentSeed(seed),
      params: { arena: 'sunshine', rulesVersion: 'v4', items: 'rockets', episodeMode: 'tournament', repeatRounds: true, endPauseSec: 4, soundMix: 'soft-v1' },
      video: { aspect: '16:9', resolution: 1080, fps: 30, durationSec: 300, tempo: 1, audio: true, volume: { master: 100 },
        quality: { crf: 20, preset: 'medium', bitrate: null } },
      view: { hud: true, camera: false },
    };
    return {
      version: 1,
      name: `${labels[scenario]} – ${short ? 'Short (1 Minute)' : 'Langvideo (10 Minuten)'}`,
      scenario, seed,
      params:
        // Pyramide: Tierchen; hochkant so groß wie möglich, quer die größte Größe, bei der die Bahn fünf Schienen behält
        scenario === 'pyramid' ? { dayMinutes: short ? 1 : 0, figure: 1, size: short ? 24 : 18, wiggle: 1.2 }
        : scenario === 'territory' ? { layout: short ? 'portrait' : 'landscape', repeatRounds: true } : {},
      video: { aspect: short ? '9:16' : '16:9', resolution: 1080, fps: 30, durationSec: short ? 60 : 600,
        tempo: scenario === 'territory' ? .75 : 1, audio: true,
        volume: scenario === 'pyramid' ? { ...EBS.getScenario('pyramid').audio.defaultVolume } : { master: 100 },
        quality: { crf: 20, preset: 'medium', bitrate: null } },
      view: { hud: true, camera: !['scrap', 'territory'].includes(scenario) },
    };
  };
})();
