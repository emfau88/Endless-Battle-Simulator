import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { loadSamples, buildVoices, renderTrack, measureEncodedAudio, SAMPLE_RATE } from '../lib/audio.mjs';
import { run, ffmpegBin } from '../lib/exporter.mjs';

const context = vm.createContext({}); context.window = context;
for (const file of ['core.js', 'canvas-scene.js', 'scenarios/territory/simulation.js',
  'scenarios/territory/episode.js', 'scenarios/territory.js']) {
  vm.runInContext(readFileSync(new URL('../src/' + file, import.meta.url), 'utf8'), context, { filename: file });
}
const { EBS } = context, audio = JSON.parse(JSON.stringify(EBS.getScenario('territory').audio));
const samples = await loadSamples(audio, { ffmpeg: ffmpegBin() });
const cases = ['portrait', 'landscape'].map(layout => {
  const world = layout === 'portrait' ? { w: 1080, h: 1920 } : { w: 1920, h: 1080 };
  const sim = new EBS.Territory.Episode({ seed: 42, params: { layout }, world, timeScale: .75 });
  for (let i = 0; i < 120 * 60; i++) sim.stepOnce();
  return { layout, world, events: JSON.parse(JSON.stringify(sim.events)) };
});

test('Territory-Ton: jedes konfigurierte Ereignis wird ohne Drosselung am exakten Videozeitpunkt gemischt', () => {
  for (const { events, world } of cases) {
    events.forEach((event, i) => {
      assert.equal(event.seq, i);
      assert.equal(event.videoTime, event.step / 60);
      if (i) assert.ok(event.step >= events[i - 1].step - 1e-8);
    });
    const expected = events.filter(e => audio.events[e.type]).map(e => ({
      type: e.type, start: Math.round(e.videoTime * SAMPLE_RATE),
    }));
    const voices = buildVoices(events, audio, samples, { worldW: world.w });
    assert.deepEqual(voices.map(({ type, start }) => ({ type, start })), expected);
    assert.equal(buildVoices(events, audio, samples, { worldW: world.w, volume: { dispatch: 0 } }).length,
      expected.filter(e => e.type !== 'dispatch').length);
  }
  // Rare headquarters/victory cues are covered without inventing game outcomes.
  const events = Object.keys(audio.events).map((type, seq) => ({ type, seq, step: seq * 60 + .25, x: 960 }));
  const voices = buildVoices(events, audio, samples);
  assert.equal(voices.length, events.length);
  const half = buildVoices(events, audio, samples, { volume: { victory: 50 } });
  assert.equal(half.at(-1).gl, voices.at(-1).gl * .5);
});

test('Territory-Ton: kurze Anläufe und 120 Sekunden mit echten Gefechten treffen −14 LUFS ohne extreme Begrenzung', t => {
  for (const { layout, world, events } of cases) {
    assert.ok(events.some(e => e.type === 'battle') && events.some(e => e.type === 'build'));
    for (const duration of [3, 120]) {
      const input = events.filter(e => e.videoTime <= duration);
      const mix = renderTrack(input, audio, samples, { worldW: world.w, totalSamples: duration * SAMPLE_RATE });
      assert.ok(Math.abs(mix.lufs + 14) <= .15, JSON.stringify(mix));
      assert.ok(mix.peakOutDb <= -3, JSON.stringify(mix));
      // The initial dry impact needed >30 dB limiting even in a three-second
      // opening. The sustained existing chime must stay below 10 dB here.
      assert.ok(mix.maxReductionDb >= -10, JSON.stringify(mix));
      assert.equal(mix.voices, input.filter(e => audio.events[e.type] && e.videoTime < duration).length);
      t.diagnostic(JSON.stringify({ layout, duration, lufs: mix.lufs, maxReductionDb: mix.maxReductionDb, voices: mix.voices }));
    }
  }
});

test('Territory-Ton: echte 20-Sekunden-Gefechtsfenster bestehen die abschließende AAC-Spitzenprüfung', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'ebs-territory-audio-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const { layout, world, events } of cases) {
    const input = events.filter(e => e.videoTime >= 100 && e.videoTime < 120).map(e => ({ ...e, step: e.step - 6000 }));
    assert.ok(input.some(e => e.type === 'battle'), 'Fenster enthält tatsächliche Gefechte');
    const wav = join(dir, layout + '.wav'), aac = join(dir, layout + '.m4a');
    renderTrack(input, audio, samples, { worldW: world.w, totalSamples: 20 * SAMPLE_RATE, file: wav });
    const result = await run(ffmpegBin(), ['-y', '-v', 'error', '-i', wav, '-c:a', 'aac', '-b:a', '192k', aac]);
    assert.equal(result.code, 0, result.stderr);
    const encoded = await measureEncodedAudio(aac, { ffmpeg: ffmpegBin() });
    assert.equal(encoded.silent, false); assert.ok(encoded.truePeakDb <= -1, JSON.stringify(encoded));
    assert.ok(Math.abs(encoded.lufs + 14) <= .3, JSON.stringify(encoded));
    t.diagnostic(JSON.stringify({ layout, encoded }));
  }
});
