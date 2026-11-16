import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Short map, rule version territory-short-v1: own map, hidden story, soft sound plan.
// Pure simulation in Node; no pictures and no export.
const context = vm.createContext({}); context.window = context;
for (const file of ['core.js', 'canvas-scene.js', 'scenarios/territory/simulation.js', 'scenarios/territory/episode.js',
  'scenarios/territory/short.js', 'scenarios/territory/slim.js', 'scenarios/territory.js', 'production-presets.js']) {
  vm.runInContext(readFileSync(new URL('../src/' + file, import.meta.url), 'utf8'), context, { filename: file });
}
const { EBS, HexSim } = context, { Episode, ShortRound, ObservedRound, normalizeParams, captionAt } = EBS.Territory;
const scenario = EBS.getScenario('territory'), world = { w: 1080, h: 1920 }, names = HexSim.TEAMS.map(t => t.name);
const plain = value => JSON.parse(JSON.stringify(value));
const preset = (seed = 42) => EBS.normalizeConfig(EBS.productionPreset('territory', 'short', seed));
const start = (seed = 42, params = {}) => { const cfg = preset(seed); return new Episode({ seed, params: { ...cfg.params, ...params }, world, timeScale: cfg.video.tempo }); };
const finish = sim => { while (sim.phase === 'running' && sim.step < 200 * 60) sim.stepOnce(); return sim; };

test('Territory Short: eigene Regelversion nur auf der Short-Karte; die Originalkarten behalten die archivierte Runde', () => {
  for (const layout of ['portrait', 'landscape']) {
    const sim = new Episode({ seed: 42, params: { layout }, world });
    assert.equal(sim.roundSim instanceof ShortRound, false); assert.equal(sim.roundSim instanceof ObservedRound, true);
    assert.equal(sim.roundSim.story, undefined); assert.equal(sim.roundSim.rules, undefined);
  }
  const round = start().roundSim;
  assert.equal(round instanceof ShortRound, true); assert.equal(round.rules, 'territory-short-v1');
  const usable = round.tiles.filter(t => t.terrain !== 'mountain');
  assert.ok(usable.length >= 50 && usable.length <= 64, 'kleine Karte: ' + usable.length);
  assert.equal(round.tiles[round.lookup.get('0,0')].terrain, 'outpost');
  // Four crowns in a diamond, each with its own ring, every seat used once.
  assert.deepEqual(plain([...round.story.seatOf].sort()), [0, 1, 2, 3]);
  for (const f of round.factions) {
    assert.equal(round.tiles[f.hq].owner, f.id);
    assert.ok(round.tiles.filter(t => t.owner === f.id).length >= 6);
  }
  const roles = [round.story.villain, round.story.rival, round.story.prey, round.story.hero];
  assert.deepEqual(plain([...roles].sort()), [0, 1, 2, 3], 'jede Fraktion hat genau eine Rolle');
  assert.ok([1, 3].includes(round.story.seatOf[round.story.villain]) && [0, 2].includes(round.story.seatOf[round.story.hero]));
});

test('Territory Short: gleicher Seed ergibt denselben Krieg; anderes Seed, andere Besetzung oder anderer Verlauf', () => {
  const a = finish(start(42)), b = finish(start(42)), c = finish(start(43));
  assert.equal(a.stateHash(), b.stateHash()); assert.deepEqual(plain(a.events), plain(b.events));
  assert.notEqual(a.stateHash(), c.stateHash());
  // 30 and 60 pictures per second step the same generator ticks.
  const thirty = start(42), sixty = start(42);
  for (let frame = 0; frame < 300; frame++) { thirty.stepOnce(); thirty.stepOnce(); }
  for (let frame = 0; frame < 600; frame++) sixty.stepOnce();
  assert.equal(thirty.stateHash(), sixty.stateHash());
});

test('Territory Short: Referenzverlauf der Vorlage (Seed 42) – drei Höhepunkte, Außenseiter gewinnt', () => {
  const sim = finish(start(42)), round = sim.roundSim, story = round.story;
  assert.equal(sim.phase, 'ended'); assert.deepEqual(plain(sim.checkInvariants()), { ok: true, errors: [] });
  // Fixed reference of rule version territory-short-v1. A wanted change needs a new rule version.
  assert.deepEqual(plain(round.falls.map(f => [names[f.id], names[f.by], +f.time.toFixed(1)])),
    [['EMBER', 'JADE', 19.4], ['AZUR', 'JADE', 30.6], ['JADE', 'SOLAR', 58.4]]);
  assert.equal(names[round.winner], 'SOLAR'); assert.equal(round.winner, story.hero);
  assert.deepEqual(plain(round.cues.map(c => c.type === 'story' ? c.beat : c.type)), ['hq', 'hq', 'laststand', 'surge', 'hq', 'victory']);
  assert.equal(round.hash(), '45d99b96');
  // The whole realm changes hands with its crown; nobody is left besides the winner.
  assert.ok(round.falls[2].fields >= 25, 'das Reich des Riesen fällt als Ganzes: ' + round.falls[2].fields);
  assert.equal(round.tiles.some(t => t.owner >= 0 && t.owner !== story.hero), false);
});

test('Territory Short: die Geschichte geht bei jedem Seed auf, Einheitenbilanz und Versorgung bleiben gültig', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const sim = start(seed), round = sim.roundSim, story = round.story;
    let heroMin = Infinity, giantMax = 0;
    while (sim.phase === 'running' && sim.step < 200 * 60) {
      sim.stepOnce();
      if (sim.step % 120 === 0) assert.deepEqual(plain(sim.checkInvariants()), { ok: true, errors: [] }, `Seed ${seed}, Schritt ${sim.step}`);
      if (round.falls.length === 2 && round.phase === 'running') {
        const stats = round.stats(); heroMin = Math.min(heroMin, stats[story.hero].tiles); giantMax = Math.max(giantMax, stats[story.villain].tiles);
      }
    }
    assert.deepEqual(plain(sim.checkInvariants()), { ok: true, errors: [] }, `Seed ${seed}`);
    assert.deepEqual(plain(round.falls.map(f => [f.id, f.by])),
      [[story.rival, story.villain], [story.prey, story.villain], [story.villain, story.hero]], `Seed ${seed}: Reihenfolge der Kronen`);
    assert.equal(round.winner, story.hero, `Seed ${seed}`);
    assert.ok(round.time > 40 && round.time < 90, `Seed ${seed}: Kriegsdauer ${round.time}`);
    assert.ok(giantMax > heroMin * 1.6, `Seed ${seed}: Riese ${giantMax} gegen Außenseiter ${heroMin}`);
    assert.ok(round.cues.length <= 12 && round.falls.length === 3);
  }
});

test('Territory Short: ohne Drehbuch gelten die Originalregeln unverändert weiter', () => {
  const sim = start(42, { story: 'none' }), round = sim.roundSim;
  for (let i = 0; i < 40 * 60; i++) sim.stepOnce();
  assert.equal(round.story.phase, 'free');
  assert.deepEqual(plain(round.mods.income), [1, 1, 1, 1]);
  assert.ok(plain(round.mods.hq).flat().every(v => v === 1) && plain(round.mods.field).flat().every(v => v === 1));
  assert.deepEqual(plain(sim.checkInvariants()), { ok: true, errors: [] });
});

test('Territory Short: Videoende nach dem Sieg wird aus dem Verlauf geplant', () => {
  const cfg = preset(42);
  assert.equal(scenario.hasNaturalDuration(cfg), true);
  const plan = scenario.createExportPlan(cfg, world); let result; do { result = plan.advance(); } while (!result.done);
  const sim = finish(start(42));
  assert.ok(Math.abs(result.durationSec - (sim.resultStep / 60 + cfg.params.endPauseSec)) < 1 / cfg.video.fps + 1e-9);
  assert.ok(result.durationSec > 28 && result.durationSec < 36, String(result.durationSec));
  assert.ok(Math.abs(result.durationSec * cfg.video.fps - Math.round(result.durationSec * cfg.video.fps)) < 1e-6, 'ganze Bilder');
  const free = EBS.normalizeConfig({ scenario: 'territory', params: { layout: 'portrait' } });
  assert.equal(scenario.hasNaturalDuration(free), false); assert.equal(scenario.createExportPlan(free, world), null);
});

test('Territory Short: leiser Tonplan – vollständige Entscheidungen, wichtige Ereignisse, begrenzte Dichte', () => {
  const cfg = preset(42), sim = finish(start(42)), events = plain(sim.events), audio = scenario.audioForParams(cfg.params);
  assert.equal(audio.mixProfile, 'marbleworks-soft-v1'); assert.ok(audio.fixedGainDb <= 0);
  assert.ok(Object.values(audio.events).every(e => e.samples.every(name => /^mw-soft-|^synth:myco-/.test(name))), 'nur weiche Klänge');
  const mix = scenario.createAudioMixPlan(events, { cfg, world });
  assert.equal(mix.version, 1); assert.equal(mix.profile, audio.mixProfile); assert.equal(mix.events.length, events.length);
  mix.events.forEach((decision, i) => {
    assert.equal(decision.seq, events[i].seq);
    assert.ok(decision.gain >= 0 && decision.gain <= 1 && Math.abs(decision.pan) <= .35);
  });
  const audible = events.filter((_, i) => mix.events[i].gain > 0), major = e => ['hq', 'story', 'victory'].includes(e.type);
  for (const type of ['hq', 'story', 'victory']) assert.equal(audible.filter(e => e.type === type).length, events.filter(e => e.type === type).length, type);
  assert.equal(audible.some(e => e.type === 'arrival' || (e.type === 'dispatch' && e.move.kind !== 'attack')), false, 'Nachschub bleibt stumm');
  // Never more than two ordinary sounds within half a video second.
  const ordinary = audible.filter(e => !major(e)).map(e => e.step);
  for (let i = 2; i < ordinary.length; i++) assert.ok(ordinary[i] - ordinary[i - 2] >= 30 - 1e-9, 'Dichte bei Schritt ' + ordinary[i]);
  const perSecond = audible.length / (sim.resultStep / 60);
  assert.ok(perSecond > 1 && perSecond < 3.2, 'Klänge je Videosekunde: ' + perSecond.toFixed(2));
  assert.deepEqual(plain(scenario.createAudioMixPlan(events, { cfg, world })), plain(mix), 'reproduzierbar');
  // The original maps keep their loudness-measured table and get no plan.
  const classic = EBS.normalizeConfig({ scenario: 'territory', params: { layout: 'portrait' } });
  assert.equal(scenario.createAudioMixPlan(events, { cfg: classic, world }), null);
  assert.equal(scenario.audioForParams(classic.params), scenario.audio); assert.equal(scenario.audio.mixProfile, undefined);
});

test('Territory Short: Einblendungen folgen allein aus Rundenzustand und Videouhr', () => {
  const sim = start(42), round = sim.roundSim, seen = [];
  const text = c => c && c.parts.map(p => p[0]).join('');
  assert.equal(text(captionAt(sim, 0)), '4 KINGDOMS · 1 CROWN', 'die Frage steht im ersten Bild');
  while (sim.phase === 'running' && sim.step < 200 * 60) {
    sim.stepOnce();
    const caption = text(captionAt(sim, 0)); if (caption && seen.at(-1) !== caption) seen.push(caption);
  }
  assert.deepEqual(seen, ['4 KINGDOMS · 1 CROWN', 'EMBER FALLS', 'AZUR FALLS', 'CAN SOLAR SURVIVE?', 'SOLAR STRIKES BACK', 'SOLAR WINS']);
  // The result stays while the video clock runs on; a second simulation at the same step shows the same caption.
  for (let i = 0; i < 150; i++) sim.stepOnce();
  assert.equal(text(captionAt(sim, 0)), 'SOLAR WINS'); assert.equal(round.phase, 'finished');
  const jump = start(42); while (jump.step < sim.step) jump.stepOnce();
  assert.deepEqual(plain(captionAt(jump, 0)), plain(captionAt(sim, 0)));
});

test('Territory: neue Anzeige- und Short-Einstellungen bleiben beim Speichern erhalten; Vorlage ist vollständig', () => {
  const params = { display: 'slim', story: 'none', storySec: 75, videoEnd: 'victory', layout: 'short', profile: 'blitz' };
  const normalized = plain(normalizeParams(plain(params)));
  for (const [key, value] of Object.entries(params)) assert.equal(normalized[key], value, key);
  assert.deepEqual([normalizeParams({}).display, normalizeParams({}).videoEnd, normalizeParams({}).layout], ['auto', 'free', 'landscape']);
  assert.equal(normalizeParams({ display: 'x', storySec: 999 }).storySec, 180);
  const cfg = preset(731);
  assert.deepEqual([cfg.seed, cfg.video.aspect, cfg.video.tempo, cfg.params.layout, cfg.params.story, cfg.params.videoEnd, cfg.params.repeatRounds, cfg.params.units],
    [731, '9:16', 2, 'short', 'crown', 'victory', false, 'soldiers']);
  assert.deepEqual([normalizeParams({}).units, normalizeParams({ units: 'soldiers' }).units, normalizeParams({ units: 'x' }).units], ['tanks', 'soldiers', 'tanks']);
  assert.deepEqual(plain(EBS.productionPreset('territory', 'short')), JSON.parse(readFileSync(new URL('../presets/production/territory-short.json', import.meta.url), 'utf8')));
});
