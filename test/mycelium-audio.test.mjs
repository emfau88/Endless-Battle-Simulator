import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { aacOptions, loadSamples, renderTrack, measureEncodedAudio, SAMPLE_RATE } from '../lib/audio.mjs';
import { run, ffmpegBin } from '../lib/exporter.mjs';

const context = vm.createContext({}); context.window = context;
for (const file of ['core.js', 'canvas-scene.js', 'scenarios/mycelium/simulation.js', 'scenarios/mycelium.js']) {
  vm.runInContext(readFileSync(new URL('../src/' + file, import.meta.url), 'utf8'), context, { filename: file });
}
const scenario = context.EBS.getScenario('mycelium');
const audio = JSON.parse(JSON.stringify(scenario.audio)), samples = await loadSamples(audio);

test('Myzel-AAC: kurze Anläufe und vollständige dichte Zyklen halten die Tonspitzengrenze in beiden Formaten ein', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'ebs-myco-aac-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  assert.deepEqual(aacOptions({}), [], 'bestehende Szenarien behalten ihre Kodierung');
  for (const world of [{ w: 1080, h: 1920 }, { w: 1920, h: 1080 }]) {
    const cases = [
      { seconds: 2.5, params: {} }, { seconds: 12, params: {} }, { seconds: 20, params: {} },
      { seconds: 20, params: { cycleSec: 12, colonies: 3, leafFall: 10, mushrooms: 6, startLeaves: 16 } },
      { seconds: 20, params: { cycleSec: 12, colonies: 3, leafFall: 10, mushrooms: 6, startLeaves: 16 }, volume: { master: 200 } },
      { seconds: 20, params: { cycleSec: 12, colonies: 3, leafFall: 10, mushrooms: 6, startLeaves: 16 },
        volume: Object.fromEntries(['master', ...Object.keys(audio.events)].map(key => [key, 200])) },
    ];
    for (const [i, { seconds, params, volume }] of cases.entries()) {
      const sim = scenario.create({ seed: 42, params, world, timeScale: 1 });
      for (let step = 0; step < seconds * 60; step++) sim.stepOnce();
      if (params.cycleSec) assert.deepEqual(new Set(sim.events.map(e => e.type)), new Set(Object.keys(audio.events)));
      const wav = join(dir, `${world.w}-${i}.wav`), aac = wav + '.m4a';
      const mix = renderTrack(sim.events, audio, samples, { worldW: world.w, totalSamples: seconds * SAMPLE_RATE, file: wav, volume });
      if (!volume) assert.ok(Math.abs(mix.lufs + 14) <= .15, JSON.stringify(mix));
      const encoded = await run(ffmpegBin(), ['-y', '-v', 'error', '-i', wav, '-c:a', 'aac', '-b:a', '192k', ...aacOptions(audio), aac]);
      assert.equal(encoded.code, 0, encoded.stderr);
      const measured = await measureEncodedAudio(aac, { ffmpeg: ffmpegBin() });
      assert.equal(measured.silent, false);
      assert.ok(measured.truePeakDb <= -1, JSON.stringify({ world, seconds, params, volume, measured }));
      t.diagnostic(JSON.stringify({ world, seconds, dense: !!params.cycleSec, volume, measured }));
    }
  }
});
