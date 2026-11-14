import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildVoices, renderTrack, SAMPLE_RATE } from '../lib/audio.mjs';
import { renderTrackAsync } from '../lib/audio-job.mjs';

const PROFILE = 'marbleworks-soft-v1';
// Exact binary fractions keep the baseline independent of source decoders and
// platform-specific trigonometric rounding. This fixture predates the new path.
const wave = [0, .125, .25, .375, .5, .375, .25, .125, 0, -.125, -.25, -.375, -.5, -.375, -.25, -.125];
const samples = new Map([
  ['one', Float32Array.from({ length: 4800 }, (_, i) => wave[i % 16])],
  ['two', Float32Array.from({ length: 7200 }, (_, i) => wave[(i * 3) % 16] * .5)],
]);
const legacy = { events: { a: { samples: ['one', 'two'], gain: .2, minGap: .2, detune: .5 }, b: { samples: ['two'], gain: .3 } } };
const audio = { ...legacy, mixProfile: PROFILE, fixedGainDb: 0, ceilingDb: -6 };
const events = [
  { seq: 0, step: 30, type: 'a', x: 0 }, { seq: 1, step: 31, type: 'a', x: 200 },
  { seq: 2, step: 70, type: 'b', x: 100 }, { seq: 3, step: 100, type: 'a', x: 200 },
];
const plan = (gain = 1, pan = 0, source = events) => ({ version: 1, profile: PROFILE, events: source.map(e => ({ seq: e.seq, gain, pan })) });
function files(t) {
  const dir = mkdtempSync(join(tmpdir(), 'ebs-camera-audio-'));
  t.after(() => { for (const name of readdirSync(dir)) unlinkSync(join(dir, name)); rmdirSync(dir); });
  return name => join(dir, name + '.wav');
}

test('Camera mix opt-in: existing PCM, normalization and density remain unchanged for other scenarios', t => {
  const file = files(t), options = { worldW: 200, totalSamples: 3 * SAMPLE_RATE };
  const before = renderTrack(events, legacy, samples, { ...options, file: file('old') });
  assert.deepEqual(before, {
    voices: 3, lufs: -14, peakInDb: -7.57, peakOutDb: -7.57, maxReductionDb: 0, limited: false,
    digest: '362fcec5', targetLufs: -14, standardLufs: -14, normGainDb: 15.36,
  });
  const accidental = renderTrack(events, { ...legacy, fixedGainDb: -50 }, samples,
    { ...options, mixPlan: { malformed: true }, file: file('other') });
  assert.deepEqual(accidental, before);
  assert.deepEqual(readFileSync(file('old')), readFileSync(file('other')));
  assert.deepEqual(buildVoices(events, legacy, samples, { mixPlan: plan(0) }), buildVoices(events, legacy, samples));
});

test('Camera plan selects visible candidates before density and changes only gain/pan', () => {
  const score = structuredClone(events), mixed = plan();
  mixed.events[0].gain = 0;
  mixed.events[1].pan = -.3;
  const voices = buildVoices(score, audio, samples, { worldW: 200, mixPlan: mixed });
  assert.deepEqual(voices.map(v => v.start), [31, 70, 100].map(step => step * SAMPLE_RATE / 60));
  const reference = buildVoices([score[1]], audio, samples, { worldW: 200 })[0];
  assert.equal(voices[0].data, reference.data);
  assert.equal(voices[0].rate, reference.rate);
  assert.ok(voices[0].gl > voices[0].gr, 'left-screen event should sound left, despite its old world-x');
  const lower = structuredClone(mixed); lower.events[1].gain = .25;
  const softened = buildVoices(score, audio, samples, { worldW: 200, mixPlan: lower })[0];
  assert.equal(softened.gl, voices[0].gl * .25);
  assert.equal(softened.gr, voices[0].gr * .25);
  assert.deepEqual(score, events, 'raw simulation score must remain unchanged');
  assert.deepEqual(buildVoices(score, audio, samples, { worldW: 200, mixPlan: { ...mixed, events: [...mixed.events].reverse() } }), voices);
});

test('Camera plan validation rejects mismatches, duplicates, omitted events and nonfinite/out-of-range decisions', () => {
  const check = value => assert.throws(() => buildVoices(events, audio, samples, { mixPlan: value }), /Tonplan/);
  check({ ...plan(), profile: 'another-scenario' });
  check({ ...plan(), version: 2 });
  check({ ...plan(), events: plan().events.slice(1) });
  check({ ...plan(), events: [...plan().events, { seq: 9, gain: 0, pan: 0 }] });
  for (const patch of [{ seq: 0 }, { seq: 99 }, { gain: NaN }, { gain: Infinity }, { gain: -.1 }, { gain: 1.1 }, { pan: NaN }, { pan: -.41 }, { pan: .41 }]) {
    const invalid = plan(); Object.assign(invalid.events[1], patch); check(invalid);
  }
  assert.throws(() => buildVoices([...events, events[0]], audio, samples, { mixPlan: { ...plan(), events: [...plan().events, plan().events[0]] } }), /Tonplan/);
  assert.throws(() => renderTrack(events, audio, samples, { totalSamples: SAMPLE_RATE }), /Kameratonplan/);
  for (const fixedGainDb of [undefined, NaN, Infinity, -61, 13]) {
    assert.throws(() => renderTrack(events, { ...audio, fixedGainDb }, samples,
      { mixPlan: plan(), totalSamples: SAMPLE_RATE }), /Grundpegel/);
  }
});

test('Fixed camera mix preserves attenuation and silence instead of normalizing them back up', t => {
  const file = files(t), opts = { worldW: 200, totalSamples: 3 * SAMPLE_RATE };
  const go = (name, gain) => renderTrack(events, audio, samples, { ...opts, mixPlan: plan(gain), file: file(name) });
  const normal = go('normal', 1), quiet = go('quiet', .25), silent = go('silent', 0);
  assert.deepEqual([normal.normalization, normal.normGainDb, normal.targetLufs, normal.standardLufs], ['fixed', 0, null, null]);
  assert.equal(normal.limited, false);
  assert.ok(Math.abs(normal.lufs - quiet.lufs - 12.04) < .03);
  assert.ok(Math.abs(normal.peakOutDb - quiet.peakOutDb - 12.04) < .03);
  assert.equal(quiet.normGainDb, normal.normGainDb);
  assert.equal(silent.voices, 0);
  assert.equal(silent.lufs, -Infinity);
  assert.equal(silent.peakOutDb, -Infinity);
  assert.ok(readFileSync(file('silent')).subarray(44).every(value => value === 0));
  assert.deepEqual(go('again', 1), normal);
  assert.deepEqual(readFileSync(file('again')), readFileSync(file('normal')));
});

test('Fixed camera mix preserves volume controls, scheduled starts and natural tails', t => {
  const file = files(t), source = events.filter(e => e.seq !== 1);
  const opts = { totalSamples: 3 * SAMPLE_RATE, mixPlan: plan(1, 0, source) };
  const go = (name, volume) => renderTrack(source, audio, samples, { ...opts, volume, file: file(name) });
  const normal = go('normal', null), master = go('master', { master: 50 });
  assert.ok(Math.abs(normal.lufs - master.lufs - 6.02) < .03);
  const allHalf = go('half', { a: 50, b: 50 });
  assert.ok(Math.abs(normal.lufs - allHalf.lufs - 6.02) < .03);
  const muted = go('muted', { a: 0 });
  assert.equal(muted.voices, 1);
  const bytes = readFileSync(file('muted')).subarray(44);
  const start = Math.round(source[1].step * SAMPLE_RATE / 60);
  assert.ok(bytes.subarray(0, start * 4).every(v => v === 0), 'start must stay sample accurate');
  assert.ok(bytes.subarray((start + 6000) * 4, (start + 7000) * 4).some(v => v !== 0), 'short sample tail should not be cut');
  assert.ok(bytes.subarray((start + 7200) * 4).every(v => v === 0));
});

test('Camera mix plan and fixed-gain options survive the existing worker boundary unchanged', async t => {
  const file = files(t), options = { totalSamples: 3 * SAMPLE_RATE, mixPlan: plan(.6, .2), volume: { master: 80 } };
  const sync = renderTrack(events, audio, samples, { ...options, file: file('sync') });
  const progress = [];
  const worker = await renderTrackAsync(events, audio, samples, { ...options, file: file('worker'), onProgress: p => progress.push(p) });
  assert.deepEqual(worker, sync);
  assert.deepEqual(readFileSync(file('worker')), readFileSync(file('sync')));
  assert.equal(progress.at(-1), 1);
});
