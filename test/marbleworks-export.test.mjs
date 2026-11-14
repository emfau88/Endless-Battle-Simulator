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
  const opts = { gpu, encoder: { preset: 'ultrafast' } };
  const cfg = config({ orderSize: 24, productionSpeed: 2, intensity: 2 });
  const a = await exportVideo(cfg, { ...opts, out: join(dir, 'landscape.mp4') });
  const b = await exportVideo({ ...cfg, video: { ...cfg.video, aspect: '9:16' } }, { ...opts, out: join(dir, 'portrait.mp4') });
  const saved = JSON.parse(readFileSync(a.sidecar, 'utf8'));
  const replay = await exportVideo(saved.config, { ...opts, out: join(dir, 'replay.mp4') });
  for (const result of [a, b, replay]) assert.deepEqual(verifyResult(result), []);
  assert.deepEqual([a.width, a.height, b.width, b.height], [1280, 720, 720, 1280]);
  assert.equal(a.stateHash, b.stateHash); assert.equal(a.stateHash, replay.stateHash);
  assert.equal(a.frames, 90);
});
