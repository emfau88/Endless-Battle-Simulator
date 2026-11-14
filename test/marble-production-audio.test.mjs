import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { loadSamples, buildVoices, renderTrack, measureEncodedAudio, aacOptions, SAMPLE_RATE, TRUE_PEAK_DB } from '../lib/audio.mjs';
import { ffmpegBin, run } from '../lib/exporter.mjs';

const context = vm.createContext({}); context.window = context;
for (const file of ['core.js', 'scenarios/marble/production-simulation.js', 'scenarios/marble/production-camera.js',
  'scenarios/marble/production-audio.js', 'scenarios/marble/production-audio-plan.js', 'scenarios/marble/production.js']) {
  vm.runInContext(readFileSync(new URL('../src/' + file, import.meta.url), 'utf8'), context, { filename: file });
}
const physicalWidth = context.EBS.MarbleProduction.WORLD.w;
const audio = JSON.parse(JSON.stringify(context.EBS.getScenario('marbleworks').audio));
const visiblePlan = events => ({ version: 1, profile: audio.mixProfile, events: events.map(e => ({ seq: e.seq, gain: 1, pan: 0 })) });
let samples;
before(async () => { samples = await loadSamples(audio, { ffmpeg: ffmpegBin() }); });

test('Production audio: glass, steel and rubber have distinct rolls and impacts with shared volume controls', () => {
  for (const type of ['factoryRoll', 'factoryImpact']) {
    const event = { seq: 3, step: 60, type, x: physicalWidth / 2, p: 1, c: 0 };
    const voices = ['glass', 'steel', 'rubber'].map(material => buildVoices([{ ...event, material }], audio, samples, { worldW: physicalWidth })[0]);
    assert.equal(new Set(voices.map(v => v.data)).size, 3, `${type}: each material must select a different sample`);
    // Material character now lives in separate softened source recordings;
    // transposition offsets alone no longer describe their relative pitch.
    assert.ok(voices.every(v => v.data.length / SAMPLE_RATE / v.rate < .4), 'contacts stay short including pitch variation');
    const muted = buildVoices([{ ...event, material: 'steel' }], audio, samples, { volume: { [type]: 0 } });
    assert.equal(muted.length, 0);
    const half = buildVoices([{ ...event, material: 'steel' }], audio, samples, { worldW: physicalWidth, volume: { [type]: 50 } })[0];
    assert.equal(half.gl, voices[1].gl * .5);
    const gentle = buildVoices([{ ...event, material: 'steel', p: .5 }], audio, samples, { worldW: physicalWidth })[0];
    assert.equal(gentle.gl, voices[1].gl * .5, 'gentle transport and contact events stay quieter than full work');
    assert.deepEqual(buildVoices([{ ...event, material: 'unknown' }], audio, samples), buildVoices([{ ...event, material: 'glass' }], audio, samples));
  }
});

test('Production audio: every machine cue resolves, mixes deterministically and limits dense contacts', t => {
  const events = Object.keys(audio.events).map((type, i) => ({ seq: i, step: 30 + i * 60, type, x: physicalWidth / 2, p: 1, c: i % 6, material: 'glass' }));
  const voices = buildVoices(events, audio, samples, { worldW: physicalWidth });
  assert.equal(voices.length, events.length);
  assert.ok(voices.every(v => v.data.length > 0 && v.gl > 0 && v.gr > 0 && v.gl === v.gr));
  assert.deepEqual(buildVoices(events, audio, samples, { worldW: physicalWidth }), voices);
  for (const type of ['factoryRoll', 'factoryImpact', 'factoryPress', 'factorySort']) {
    const dense = Array.from({ length: 15 }, (_, seq) => ({ seq, step: 60 + seq, type, x: physicalWidth / 2, p: 1, c: 0, material: 'glass' }));
    assert.ok(buildVoices(dense, audio, samples).length < dense.length / 2, `${type} needs audible breathing room`);
  }
  const dir = mkdtempSync(join(tmpdir(), 'ebs-soft-cues-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const options = { worldW: physicalWidth, totalSamples: (events.length + 3) * SAMPLE_RATE, mixPlan: visiblePlan(events) };
  const mixed = renderTrack(events, audio, samples, { ...options, file: join(dir, 'first.wav') });
  assert.equal(mixed.normalization, 'fixed'); assert.equal(mixed.normGainDb, 0);
  assert.equal(mixed.targetLufs, null); assert.ok(mixed.lufs < -22, JSON.stringify(mixed));
  assert.ok(mixed.peakOutDb <= -5.99, JSON.stringify(mixed)); assert.equal(mixed.limited, false);
  assert.equal(renderTrack(events, audio, samples, { ...options, file: join(dir, 'again.wav') }).digest, mixed.digest);
  assert.ok(readFileSync(join(dir, 'first.wav')).equals(readFileSync(join(dir, 'again.wav'))));
});

test('Production audio: removed polish/coating noise cannot return through legacy high volume settings', () => {
  const retained = ['factoryRoll', 'factoryImpact', 'factoryFeed', 'factoryPress', 'factoryScan', 'factorySort', 'factoryUpgrade', 'factoryComplete'];
  assert.deepEqual(Object.keys(audio.events), retained, 'all eight remaining sound layers stay available');
  assert.equal(samples.has('synth:myco-breeze'), false, 'removed noise is not loaded for production');
  const contacts = retained.map((type, i) => ({ seq: i * 3, step: 60 + i * 90, type, x: physicalWidth / 2, p: 1, c: i % 6, material: 'glass' }));
  const noise = contacts.flatMap(e => [
    { ...e, seq: e.seq + 1, step: e.step + 15, type: 'factoryPolish' },
    { ...e, seq: e.seq + 2, step: e.step + 30, type: 'factoryCoat' },
  ]);
  // Even an old sample cache and maximum saved sliders must not resurrect the
  // deleted mappings or change the timing/level/sample of the retained voices.
  const cachedSamples = new Map(samples);
  const oldNoise = new Float32Array([.5, -.5, .25, -.25]);
  cachedSamples.set('synth:myco-breeze', oldNoise);
  for (const volume of [null, { factoryPolish: 200, factoryCoat: 200, factoryImpact: 70, factoryComplete: 40 }]) {
    const options = { worldW: physicalWidth, volume };
    const expected = buildVoices(contacts, audio, cachedSamples, options);
    const actual = buildVoices([...contacts, ...noise], audio, cachedSamples, options);
    assert.equal(expected.length, retained.length);
    assert.deepEqual(actual, expected);
    assert.ok(actual.every(voice => voice.data !== oldNoise));
  }
});

test('Production audio: configuration keeps Classic voices intact and accepts material/machine volume settings', () => {
  const registered = vm.createContext({ Matter: {} }); registered.window = registered;
  for (const file of ['core.js', 'scenarios/marble.js', 'scenarios/marble/production-audio.js']) {
    vm.runInContext(readFileSync(new URL('../src/' + file, import.meta.url), 'utf8'), registered, { filename: file });
  }
  const classicScenario = registered.EBS.getScenario('marble');
  const classic = JSON.parse(JSON.stringify(classicScenario.audio.events));
  const originalDefaults = classicScenario.defaults, originalControls = classicScenario.controls;
  const originalCreate = classicScenario.create, originalRenderer = classicScenario.createRenderer;
  vm.runInContext(readFileSync(new URL('../src/scenarios/marble/production.js', import.meta.url), 'utf8'), registered);
  const scenario = registered.EBS.getScenario('marble');
  assert.equal(scenario, classicScenario, 'Classic registry identity must remain unchanged');
  assert.equal(scenario.defaults, originalDefaults);
  assert.equal(scenario.controls, originalControls);
  assert.equal(scenario.create, originalCreate);
  assert.equal(scenario.createRenderer, originalRenderer);
  for (const [key, definition] of Object.entries(classic)) assert.deepEqual(JSON.parse(JSON.stringify(scenario.audio.events[key])), definition);
  const cfg = registered.EBS.normalizeConfig({ scenario: 'marbleworks', params: { material: 'mixed' },
    video: { volume: { factoryImpact: 70, factoryComplete: 40, factoryPolish: 200, factoryCoat: 180, imaginary: 140 } } });
  assert.equal(cfg.scenario, 'marbleworks');
  assert.equal(cfg.params.material, 'mixed');
  assert.equal(cfg.video.volume.factoryImpact, 70);
  assert.equal(cfg.video.volume.factoryComplete, 40);
  assert.equal(cfg.video.volume.factoryPress, 100);
  assert.equal(Object.hasOwn(cfg.video.volume, 'factoryPolish'), false);
  assert.equal(Object.hasOwn(cfg.video.volume, 'factoryCoat'), false);
  assert.equal(cfg.video.volume.imaginary, undefined);
  const legacy = registered.EBS.normalizeConfig({ scenario: 'marble', params: { factoryMode: 'progressive' },
    video: { volume: { factoryPolish: 200, factoryCoat: 200, factoryImpact: 70 } } });
  assert.equal(legacy.scenario, 'marbleworks');
  assert.equal(Object.hasOwn(legacy.video.volume, 'factoryPolish'), false);
  assert.equal(Object.hasOwn(legacy.video.volume, 'factoryCoat'), false);
  assert.equal(legacy.video.volume.factoryImpact, 70);
  assert.deepEqual(JSON.parse(JSON.stringify(registered.EBS.normalizeConfig({ scenario: 'marble' }).params)), { balls: 35, buffer: 2, warmup: 30 });
});

test('Production audio: a complete mixed order preserves every event and produces bounded AAC audio', async t => {
  const runtime = vm.createContext({ Matter: {}, PIXI: { VERSION: 'test' } }); runtime.window = runtime;
  for (const file of ['core.js', 'scenarios/marble.js', 'scenarios/marble/production-simulation.js',
    'scenarios/marble/production-camera.js', 'scenarios/marble/production-audio.js',
    'scenarios/marble/production-audio-plan.js', 'scenarios/marble/production.js']) {
    vm.runInContext(readFileSync(new URL('../src/' + file, import.meta.url), 'utf8'), runtime, { filename: file });
  }
  const { EBS } = runtime;
  const cfg = EBS.normalizeConfig({ scenario: 'marbleworks', seed: 42,
    params: { orderSize: 24, material: 'mixed', productionSpeed: 2, intensity: 2 } });
  const record = world => {
    const sim = EBS.getScenario('marbleworks').create({ seed: cfg.seed, params: cfg.params, world, timeScale: 1, video: cfg.video });
    const events = []; let next = 0, finishedSecond = null, seconds = 0;
    while (seconds < 300) {
      for (let step = 0; step < 60; step++) sim.stepOnce();
      seconds++;
      for (const event of sim.events.filter(e => e && e.seq >= next).sort((a, b) => a.seq - b.seq)) {
        assert.equal(event.seq, next++, 'no sound event may disappear between exporter drains');
        events.push(event);
      }
      if (sim.stats.completed === cfg.params.orderSize && finishedSecond === null) finishedSecond = seconds;
      if (finishedSecond !== null && seconds >= finishedSecond + 4) break;
    }
    assert.equal(sim.stats.completed, cfg.params.orderSize, 'the production order must reach its audible finale');
    assert.equal(sim.eventSeq, next);
    assert.equal(sim.audioWorldWidth, physicalWidth, 'stereo positions use physical factory width');
    const api = EBS.installExportAPI({ cfg, sim, world, view: cfg.view, scenario: EBS.getScenario('marbleworks'),
      app: { canvas: { width: world.w, height: world.h }, renderer: { name: 'test' } } });
    const info = api.info(), beforeHash = sim.stateHash(), originalEvents = JSON.stringify(events);
    const mixPlan = JSON.parse(JSON.stringify(api.audioMixPlan(events)));
    assert.equal(info.hasAudioMixPlan, true);
    assert.equal(sim.stateHash(), beforeHash); assert.equal(JSON.stringify(events), originalEvents);
    assert.equal(info.audioWorldWidth, physicalWidth, 'the exporter receives fixed acoustic width');
    assert.equal(info.world.w, world.w, 'audio width must not override the requested viewport');
    assert.deepEqual(Object.keys(info.audio.events), Object.keys(audio.events), 'export metadata selects the production sound table');
    assert.ok(sim.checkInvariants().ok);
    return { events, seconds, mixPlan };
  };
  const landscape = record({ w: 1920, h: 1080 }), portrait = record({ w: 1080, h: 1920 });
  assert.deepEqual(portrait.events, landscape.events, 'format must not change the production event score');
  assert.equal(portrait.seconds, landscape.seconds);
  assert.notDeepEqual(portrait.mixPlan, landscape.mixPlan, 'the audible perspective follows the actual aspect');
  const { events, seconds, mixPlan } = landscape;
  for (const type of ['factoryPolish', 'factoryCoat']) assert.ok(events.some(e => e.type === type), 'logical production events are retained independently of sound mappings');
  for (const type of Object.keys(audio.events)) assert.ok(events.some(e => e.type === type), `${type} never sounds during actual production`);
  assert.equal(events.filter(e => e.type === 'factoryUpgrade').length, 2);
  assert.equal(events.filter(e => e.type === 'factoryComplete').length, 1);
  for (const material of ['glass', 'steel', 'rubber']) {
    for (const type of ['factoryRoll', 'factoryImpact']) assert.ok(events.some(e => e.type === type && e.material === material), `${material} ${type} missing`);
  }
  const dir = mkdtempSync(join(tmpdir(), 'ebs-factory-audio-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const wav = join(dir, 'order.wav'), aac = join(dir, 'order.m4a');
  const mixed = renderTrack(events, audio, samples, { worldW: physicalWidth, totalSamples: seconds * SAMPLE_RATE, file: wav, mixPlan });
  assert.equal(mixed.normalization, 'fixed'); assert.equal(mixed.normGainDb, 0);
  assert.ok(Number.isFinite(mixed.lufs) && mixed.lufs < -22, JSON.stringify(mixed));
  assert.ok(mixed.voices > 10 && mixed.voices < events.length, JSON.stringify(mixed));
  assert.ok(mixed.peakOutDb <= -5.99, JSON.stringify(mixed)); assert.equal(mixed.limited, false);
  const encoded = await run(ffmpegBin(), ['-y', '-v', 'error', '-i', wav, '-c:a', 'aac', '-b:a', '192k', ...aacOptions(audio), aac]);
  assert.equal(encoded.code, 0, encoded.stderr);
  const measured = await measureEncodedAudio(aac, { ffmpeg: ffmpegBin() });
  assert.equal(measured.silent, false);
  assert.ok(Math.abs(measured.lufs - mixed.lufs) <= 1, JSON.stringify(measured));
  assert.ok(measured.truePeakDb <= TRUE_PEAK_DB, JSON.stringify(measured));
  t.diagnostic(JSON.stringify({ seconds, events: events.length, pcmLufs: mixed.lufs, measured }));
});
