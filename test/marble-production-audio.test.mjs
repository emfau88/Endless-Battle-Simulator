import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { loadSamples, buildVoices, renderTrack, measureEncodedAudio, SAMPLE_RATE, TARGET_LUFS, TRUE_PEAK_DB } from '../lib/audio.mjs';
import { ffmpegBin, run } from '../lib/exporter.mjs';

const context = vm.createContext({}); context.window = context;
for (const file of ['core.js', 'scenarios/marble/production-simulation.js', 'scenarios/marble/production-audio.js']) {
  vm.runInContext(readFileSync(new URL('../src/' + file, import.meta.url), 'utf8'), context, { filename: file });
}
const physicalWidth = context.EBS.MarbleProduction.WORLD.w;
const audio = { events: JSON.parse(JSON.stringify(context.EBS.MarbleProduction.audioEvents)) };
let samples;
before(async () => { samples = await loadSamples(audio, { ffmpeg: ffmpegBin() }); });

test('Production audio: glass, steel and rubber have distinct rolls and impacts with shared volume controls', () => {
  for (const type of ['factoryRoll', 'factoryImpact']) {
    const event = { seq: 3, step: 60, type, x: physicalWidth / 2, p: 1, c: 0 };
    const voices = ['glass', 'steel', 'rubber'].map(material => buildVoices([{ ...event, material }], audio, samples, { worldW: physicalWidth })[0]);
    assert.equal(new Set(voices.map(v => v.data)).size, 3, `${type}: each material must select a different sample`);
    assert.ok(voices[1].rate < voices[0].rate && voices[2].rate < voices[0].rate, 'steel and rubber sound lower than glass');
    const muted = buildVoices([{ ...event, material: 'steel' }], audio, samples, { volume: { [type]: 0 } });
    assert.equal(muted.length, 0);
    const half = buildVoices([{ ...event, material: 'steel' }], audio, samples, { worldW: physicalWidth, volume: { [type]: 50 } })[0];
    assert.equal(half.gl, voices[1].gl * .5);
    const gentle = buildVoices([{ ...event, material: 'steel', p: .5 }], audio, samples, { worldW: physicalWidth })[0];
    assert.equal(gentle.gl, voices[1].gl * .5, 'gentle transport and contact events stay quieter than full work');
    assert.deepEqual(buildVoices([{ ...event, material: 'unknown' }], audio, samples), buildVoices([{ ...event, material: 'glass' }], audio, samples));
  }
});

test('Production audio: every machine cue resolves, mixes deterministically and limits dense contacts', () => {
  const events = Object.keys(audio.events).map((type, i) => ({ seq: i, step: 30 + i * 60, type, x: physicalWidth / 2, p: 1, c: i % 6, material: 'glass' }));
  const voices = buildVoices(events, audio, samples, { worldW: physicalWidth });
  assert.equal(voices.length, events.length);
  assert.ok(voices.every(v => v.data.length > 0 && v.gl > 0 && v.gr > 0 && v.gl === v.gr));
  assert.deepEqual(buildVoices(events, audio, samples, { worldW: physicalWidth }), voices);
  for (const type of ['factoryRoll', 'factoryImpact', 'factoryPress', 'factorySort']) {
    const dense = Array.from({ length: 15 }, (_, seq) => ({ seq, step: 60 + seq, type, x: physicalWidth / 2, p: 1, c: 0, material: 'glass' }));
    assert.ok(buildVoices(dense, audio, samples).length < dense.length / 2, `${type} needs audible breathing room`);
  }
  const options = { worldW: physicalWidth, totalSamples: (events.length + 3) * SAMPLE_RATE };
  const mixed = renderTrack(events, audio, samples, options);
  assert.ok(Math.abs(mixed.lufs - TARGET_LUFS) <= .2, JSON.stringify(mixed));
  assert.ok(mixed.peakOutDb <= -1.99, JSON.stringify(mixed));
  assert.equal(renderTrack(events, audio, samples, options).digest, mixed.digest);
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
    'scenarios/marble/production-audio.js', 'scenarios/marble/production.js']) {
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
    const info = EBS.installExportAPI({ cfg, sim, world, scenario: EBS.getScenario('marbleworks'),
      app: { canvas: { width: world.w, height: world.h }, renderer: { name: 'test' } } }).info();
    assert.equal(info.audioWorldWidth, physicalWidth, 'the exporter receives fixed acoustic width');
    assert.equal(info.world.w, world.w, 'audio width must not override the requested viewport');
    assert.deepEqual(Object.keys(info.audio.events), Object.keys(audio.events), 'export metadata selects the production sound table');
    assert.ok(sim.checkInvariants().ok);
    return { events, seconds };
  };
  const landscape = record({ w: 1920, h: 1080 }), portrait = record({ w: 1080, h: 1920 });
  assert.deepEqual(portrait, landscape, 'format must not change the production event score');
  const { events, seconds } = landscape;
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
  const mixed = renderTrack(events, audio, samples, { worldW: physicalWidth, totalSamples: seconds * SAMPLE_RATE, file: wav });
  // With the sustained noise removed, this sparse score may reach the mixer's
  // bounded normalization gain before its exact target. Keep the same 1 LU
  // acceptance window as the encoded track and retain the strict peak ceiling.
  assert.ok(Math.abs(mixed.lufs - TARGET_LUFS) <= 1, JSON.stringify(mixed));
  assert.ok(mixed.peakOutDb <= -1.99, JSON.stringify(mixed));
  const encoded = await run(ffmpegBin(), ['-y', '-v', 'error', '-i', wav, '-c:a', 'aac', '-b:a', '192k', aac]);
  assert.equal(encoded.code, 0, encoded.stderr);
  const measured = await measureEncodedAudio(aac, { ffmpeg: ffmpegBin() });
  assert.equal(measured.silent, false);
  assert.ok(Math.abs(measured.lufs - TARGET_LUFS) <= 1, JSON.stringify(measured));
  assert.ok(measured.truePeakDb <= TRUE_PEAK_DB, JSON.stringify(measured));
  t.diagnostic(JSON.stringify({ seconds, events: events.length, pcmLufs: mixed.lufs, measured }));
});
