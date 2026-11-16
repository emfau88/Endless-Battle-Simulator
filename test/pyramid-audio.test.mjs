// Full-day regressions for the approved quiet mix, including water and finale.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { aacOptions, loadSamples, renderTrack, measureEncodedAudio, SAMPLE_RATE, TRUE_PEAK_DB, processTrack } from '../lib/audio.mjs';
import { mixBackgroundTrack } from '../lib/audio-background.mjs';
import { run, ffmpegBin } from '../lib/exporter.mjs';

const context = vm.createContext({}); context.window = context;
for (const file of ['core.js', 'canvas-scene.js', 'scenarios/shared/critter-art.js', 'scenarios/pyramid.js']) {
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
    assert.ok(config.video.audio);
    assert.deepEqual(JSON.parse(JSON.stringify(config.video.volume)), audio.defaultVolume);
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

    const wav = join(dir, 'actions.wav'), mixed = join(dir, 'full-day.wav'), aac = join(dir, 'full-day.m4a');
    const mix = renderTrack(events, audio, samples, { worldW: world.w, volume: config.video.volume,
      totalSamples: config.video.durationSec * SAMPLE_RATE, file: wav });
    assert.equal(mix.normalization, 'fixed'); assert.equal(mix.normGainDb, 7.95);
    assert.equal(mix.actionAttenuationDb, -12);
    assert.ok(mix.peakOutDb <= -18, 'Aktionsspitzen bleiben leise');
    await mixBackgroundTrack(audio, { input: wav, output: mixed, totalSamples: 60 * SAMPLE_RATE, volume: config.video.volume, ffmpeg: ffmpegBin() });
    const encoded = await run(ffmpegBin(), ['-y', '-v', 'error', '-i', mixed, '-c:a', 'aac', '-b:a', '192k', ...aacOptions(audio), aac]);
    assert.equal(encoded.code, 0, encoded.stderr);
    const measured = await measureEncodedAudio(aac, { ffmpeg: ffmpegBin() });
    assert.equal(measured.silent, false);
    assert.ok(measured.lufs < -20 && measured.lufs > -29, 'Ruhige Mischung bleibt ohne nachträgliche Lautheitsanhebung: ' + JSON.stringify(measured));
    assert.ok(measured.truePeakDb <= TRUE_PEAK_DB, JSON.stringify({ aspect, figure, measured }));
    t.diagnostic(JSON.stringify({ aspect, figure, seconds: config.video.durationSec, events: events.length, mixLufs: mix.lufs, measured }));
  });
}

test('Wasser läuft über mehrere Übergänge; Gesamt- und Wasserregler können es stummschalten', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'ebs-pyramid-water-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const silence = join(dir, 'silence.wav'), mixed = join(dir, 'water.wav');
  processTrack([], 150 * SAMPLE_RATE, { file: silence });
  await mixBackgroundTrack(audio, { input: silence, output: mixed, totalSamples: 150 * SAMPLE_RATE, ffmpeg: ffmpegBin() });
  const extract = async (file, start, end) => {
    const r = await run(ffmpegBin(), ['-v', 'error', '-i', file, '-af', `atrim=start=${start}:end=${end}`,
      '-f', 'f32le', '-ac', '2', '-'], { encoding: null });
    assert.equal(r.code, 0, r.stderr); return r.stdout;
  };
  // Identical windows around the first two actual loop joins: no gaps, phase reset or doubled fades.
  assert.ok((await extract(mixed, 66.2, 68.2)).equals(await extract(mixed, 129.4, 131.4)));
  const late = await extract(mixed, 140, 141);
  assert.equal(late.length, SAMPLE_RATE * 8);
  assert.ok(late.some(n => n !== 0), 'Hintergrund muss nach zwei Schleifen weiterlaufen');
  const reference = await run(ffmpegBin(), ['-v', 'error', '-i', fileURLToPath(new URL('../assets/audio/pyramid-water-loop.wav', import.meta.url)),
    '-af', 'atrim=start=10:end=11,volume=-2.245527894223046dB', '-f', 'f32le', '-ac', '2', '-'], { encoding: null });
  assert.equal(reference.code, 0, reference.stderr);
  assert.ok((await extract(mixed, 10, 11)).equals(reference.stdout), 'Freigegebener Wasserpegel bleibt bitgenau und zeitlich unverändert');
  for (const [name, volume] of [['master-off', { master: 0 }], ['water-off', { water: 0 }]]) {
    const out = join(dir, name + '.wav');
    await mixBackgroundTrack(audio, { input: silence, output: out, totalSamples: 2 * SAMPLE_RATE, volume, ffmpeg: ffmpegBin() });
    const pcm = await extract(out, 0, 2);
    assert.equal(pcm.length, 2 * SAMPLE_RATE * 8);
    assert.ok(pcm.every(n => n === 0), name + ' muss den Hintergrund vollständig stummschalten');
  }
  const loud = join(dir, 'raised-sliders.wav'), encoded = join(dir, 'raised-sliders.m4a');
  await mixBackgroundTrack(audio, { input: silence, output: loud, totalSamples: 70 * SAMPLE_RATE,
    volume: { master: 200, water: 200 }, ffmpeg: ffmpegBin() });
  const codec = await run(ffmpegBin(), ['-v', 'error', '-i', loud, '-c:a', 'aac', '-b:a', '192k', ...aacOptions(audio), encoded]);
  assert.equal(codec.code, 0, codec.stderr);
  const measured = await measureEncodedAudio(encoded, { ffmpeg: ffmpegBin() });
  assert.ok(measured.truePeakDb <= TRUE_PEAK_DB, 'Auch hohe Regler dürfen den fertigen Export nicht übersteuern: ' + JSON.stringify(measured));
});
