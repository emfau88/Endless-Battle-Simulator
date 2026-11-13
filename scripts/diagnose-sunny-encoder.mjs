// Third and final diagnostic round: identical recorded bytes/options, two delivery schedules.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { ffmpegBin, run } from '../lib/exporter.mjs';

const source = resolve('output/frozen-inputs/exports');
const root = resolve('output/sunny-replay'), out = join(root, 'exports');
mkdirSync(out, { recursive: true });
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const results = [];
for (const aspect of ['16x9', '9x16']) {
  const original = join(source, `sunny-${aspect}.mp4`);
  const recorded = JSON.parse(readFileSync(original + '.input.json'));
  const bytes = readFileSync(original + '.input.mjpeg');
  const wav = readFileSync(original + '.input.wav');
  assert.equal(sha256(wav), recorded.pcm, 'Recorded PCM is intact');
  let offset = 0;
  const frames = recorded.frames.map(frame => {
    const bytesForFrame = bytes.subarray(offset, offset + frame.bytes); offset += frame.bytes;
    assert.equal(sha256(bytesForFrame), frame.sha256, 'Recorded JPEG is intact');
    return bytesForFrame;
  });
  assert.equal(offset, bytes.length);
  assert.equal(frames.length, 60);
  const originalJson = JSON.parse(readFileSync(original.replace(/\.mp4$/, '.json')));
  assert.equal(originalJson.config.video.durationSec, 2);
  for (const suffix of ['', '.input.json', '.input.mjpeg', '.input.wav']) {
    copyFileSync(original + suffix, join(root, `source-${aspect}.mp4${suffix}`));
  }
  const outputs = [];
  for (const mode of ['burst', 'paced']) {
    const name = `${mode === 'burst' ? 'sunny-' : 'sunny-replay-'}${aspect}`;
    const file = join(out, name + '.mp4');
    const work = join(out, '.ebs-export-' + name);
    mkdirSync(work, { recursive: true });
    const video = join(work, 'video.mp4'), audio = join(work, 'audio.wav'), mux = join(work, 'mux.mp4');
    writeFileSync(audio, wav);
    const videoArgs = [...recorded.videoArgs]; videoArgs[videoArgs.length - 1] = video;
    let input = 0;
    const muxArgs = recorded.muxArgs.map((arg, i, all) => {
      if (all[i - 1] === '-i') return input++ === 0 ? video : audio;
      return i === all.length - 1 ? mux : arg;
    });
    const child = spawn(ffmpegBin(), videoArgs, { stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true });
    let errors = '';
    child.stderr.on('data', bytes => { errors += bytes; });
    child.stdin.on('error', () => {});
    const closed = new Promise((res, rej) => { child.once('error', rej); child.once('close', code => code === 0 ? res() : rej(new Error(errors || `FFmpeg ${code}`))); });
    closed.catch(() => {});
    const died = closed.then(() => { throw new Error('Encoder closed before input finished'); }); died.catch(() => {});
    try {
      for (let i = 0; i < frames.length; i++) {
        if (mode === 'paced' && i > 0 && i % 10 === 0) await delay(2000);
        if (!child.stdin.write(frames[i])) await Promise.race([once(child.stdin, 'drain'), died]);
      }
      child.stdin.end(); await closed;
    } finally {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    }
    const muxed = await run(ffmpegBin(), muxArgs);
    assert.equal(muxed.code, 0, muxed.stderr);
    copyFileSync(mux, file);
    writeFileSync(file.replace(/\.mp4$/, '.json'), JSON.stringify({ ...originalJson,
      diagnosticReplay: { sourceRun: 43470899791, sourceCommit: '1bad1b599f54b3084d2b5a79695d2a2f9395d71c',
        mode, batchFrames: 10, delayMs: mode === 'paced' ? 2000 : 0, commit: process.env.GITHUB_SHA },
    }, null, 2));
    writeFileSync(file + '.input.json', JSON.stringify({ ...recorded, videoArgs, muxArgs }, null, 2));
    outputs.push({ mode, sha256: sha256(readFileSync(file)) });
  }
  const baseline = sha256(readFileSync(original));
  results.push({ aspect, baseline, outputs, sameAcrossSchedules: outputs[0].sha256 === outputs[1].sha256,
    sameAsRecordedExport: outputs.every(output => output.sha256 === baseline) });
}
writeFileSync(join(root, 'encoder-timing.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
assert.ok(results.every(result => result.sameAcrossSchedules && result.sameAsRecordedExport), 'Frozen-input encoding differs');
