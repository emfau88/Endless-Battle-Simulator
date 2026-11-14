// Keep real 3D encoding separate so each software-rendered CI file fits its time budget.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exportVideo, verifyResult } from '../lib/exporter.mjs';

const gpu = process.env.EBS_GPU === '1'; // Opt-in local hardware checks; CI defaults to software.
const config = (params = {}, video = {}) => ({ scenario: 'marbleworks', seed: 42,
  params: { exportLength: 'duration', ...params },
  video: { aspect: '16:9', resolution: 720, fps: 30, durationSec: 3, ...video } });

test('Progressive export: real landscape/portrait H.264/AAC and saved-recipe replay', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'ebs-progressive-video-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  // Export active production, and collect both prefix and tail audio through the
  // whole order. The short video keeps software CI affordable.
  const opts = { gpu, encoder: { preset: 'ultrafast' }, clip: { startSec: 39, durationSec: 3 } };
  const cfg = config({ orderSize: 24, productionSpeed: 2, intensity: 2 }, { durationSec: 84 });
  const a = await exportVideo(cfg, { ...opts, out: join(dir, 'landscape.mp4') });
  const b = await exportVideo({ ...cfg, video: { ...cfg.video, aspect: '9:16' } }, { ...opts, out: join(dir, 'portrait.mp4') });
  const saved = JSON.parse(readFileSync(a.sidecar, 'utf8'));
  const replay = await exportVideo(saved, { gpu, encoder: opts.encoder, out: join(dir, 'replay.mp4') });
  for (const result of [a, b, replay]) assert.deepEqual(verifyResult(result), []);
  assert.deepEqual([a.width, a.height, b.width, b.height], [1280, 720, 720, 1280]);
  assert.equal(a.stateHash, b.stateHash); assert.equal(a.stateHash, replay.stateHash);
  assert.equal(a.frames, 90);
  assert.equal(a.audio.eventHash, b.audio.eventHash, 'format never changes raw events');
  assert.equal(a.audio.eventHash, replay.audio.eventHash);
  assert.equal(a.audio.mixPlanHash, replay.audio.mixPlanHash, 'saved recipe reproduces camera mix');
  assert.equal(a.audio.digest, replay.audio.digest, 'full episode PCM is identical before clip trimming');
  assert.notEqual(a.audio.mixPlanHash, b.audio.mixPlanHash, 'different viewports have different acoustic focus');
  for (const r of [a, b, replay]) {
    assert.equal(r.audio.mixProfile, 'marbleworks-soft-v1');
    assert.equal(r.audio.normalization, 'fixed'); assert.equal(r.audio.normGainDb, 0);
    assert.equal(r.audio.measurementScope, 'full-episode');
    assert.equal(r.audio.episodeDurationSec, 84);
    assert.equal(r.audioMixPlan.events.length, r.audioEvents.length);
    assert(r.audioEvents.some(e => e.type === 'factoryComplete'), 'post-roll includes the finale');
    assert(r.audioEvents.some(e => e.t < 39), 'pre-roll includes earlier events');
    assert.equal(r.audio.encoded.silent, false); assert.equal(r.audio.limited, false);
  }
});
