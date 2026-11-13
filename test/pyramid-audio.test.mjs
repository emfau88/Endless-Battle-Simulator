// Full-day audio regressions: normalize the entire 60-second production mix,
// including the finale. No video rendering and no separately normalized clips.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { aacOptions, loadSamples, renderTrack, measureEncodedAudio, SAMPLE_RATE, TARGET_LUFS, TRUE_PEAK_DB } from '../lib/audio.mjs';
import { run, ffmpegBin } from '../lib/exporter.mjs';

const context = vm.createContext({}); context.window = context;
for (const file of ['core.js', 'canvas-scene.js', 'scenarios/pyramid.js']) {
  vm.runInContext(readFileSync(new URL('../src/' + file, import.meta.url), 'utf8'), context, { filename: file });
}
const scenario = context.EBS.getScenario('pyramid');
const audio = JSON.parse(JSON.stringify(scenario.audio));
let samples;
before(async () => { samples = await loadSamples(audio, { ffmpeg: ffmpegBin() }); });

for (const aspect of ['9:16', '16:9']) for (const figure of [0, 1]) {
  test(`Pyramid-AAC ${aspect}, ${figure ? 'Tierchen' : 'Leuchtkugeln'}: kompletter 60-s-Tag mit Finale bei Standardlautstärke`, async t => {
    const dir = mkdtempSync(join(tmpdir(), 'ebs-pyramid-aac-'));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    assert.deepEqual(aacOptions(audio), ['-aac_pns', '0']);
    assert.deepEqual(aacOptions({}), [], 'Naval/Marble/Scrap behalten ihre Kodierung');
    assert.deepEqual(aacOptions({ aacIndependent: true }), ['-aac_ms', '0', '-aac_is', '0', '-aac_pns', '0'], 'Myzel-Profil bleibt unverändert');

    const config = context.EBS.normalizeConfig({ scenario: 'pyramid', seed: 42,
      params: { figure, dayMinutes: 1 }, video: { aspect, durationSec: 60 } });
    assert.ok(config.video.audio && Object.values(config.video.volume).every(value => value === 100));
    const world = context.EBS.ASPECTS[aspect];
    const sim = scenario.create({ seed: config.seed, params: config.params, world, video: config.video });
    const events = [];
    let next = 0;
    // Drain the bounded event buffer throughout the day, as the exporter does.
    for (let second = 0; second < config.video.durationSec; second++) {
      for (let step = 0; step < context.EBS.PHYS_HZ; step++) sim.stepOnce();
      const batch = sim.events.filter(event => event && event.seq >= next).sort((a, b) => a.seq - b.seq);
      for (const event of batch) {
        assert.equal(event.seq, next++, 'kein Tonereignis darf verloren gehen');
        events.push(event);
      }
    }
    assert.equal(next, sim.eventSeq);
    for (const type of ['full', 'launch', 'firework']) assert.ok(events.some(event => event.type === type), `${type} fehlt im Finale`);
    assert.ok(events.some(event => event.type === 'firework' && event.step / context.EBS.PHYS_HZ > 58 && event.p >= 1.8), 'abschließender Feuerwerksknall fehlt');

    const wav = join(dir, 'full-day.wav'), aac = join(dir, 'full-day.m4a');
    const mix = renderTrack(events, audio, samples, { worldW: world.w, volume: config.video.volume,
      totalSamples: config.video.durationSec * SAMPLE_RATE, file: wav });
    assert.ok(Math.abs(mix.lufs - TARGET_LUFS) <= .15, JSON.stringify(mix));
    const encoded = await run(ffmpegBin(), ['-y', '-v', 'error', '-i', wav, '-c:a', 'aac', '-b:a', '192k', ...aacOptions(audio), aac]);
    assert.equal(encoded.code, 0, encoded.stderr);
    const measured = await measureEncodedAudio(aac, { ffmpeg: ffmpegBin() });
    assert.equal(measured.silent, false);
    assert.ok(Math.abs(measured.lufs - TARGET_LUFS) <= 1, JSON.stringify(measured));
    assert.ok(measured.truePeakDb <= TRUE_PEAK_DB, JSON.stringify({ aspect, figure, measured }));
    t.diagnostic(JSON.stringify({ aspect, figure, seconds: config.video.durationSec, events: events.length, mixLufs: mix.lufs, measured }));
  });
}
