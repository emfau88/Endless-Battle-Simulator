// Exporttests: echtes MP4 über Playwright + FFmpeg erzeugen und mit ffprobe prüfen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exportVideo, verifyResult } from '../lib/exporter.mjs';
import { ROOT, launchBrowser, openExportPage } from '../lib/browser.mjs';

const dir = mkdtempSync(join(tmpdir(), 'ebs-test-'));
process.on('exit', () => rmSync(dir, { recursive: true, force: true }));
const fast = { encoder: { preset: 'veryfast' } };

test('MP4-Export: Hochkant 1080p, 3 s, H.264, 30 fps, korrekte Auflösung und Frameanzahl', async () => {
  const r = await exportVideo({ seed: 5, durationSec: 3, format: 'portrait' }, { out: join(dir, 'p.mp4'), ...fast });
  assert.deepEqual(verifyResult(r), []);
  assert.equal(r.width, 1080); assert.equal(r.height, 1920); assert.equal(r.fps, 30); assert.equal(r.frames, 90);
  assert.equal(r.pixFmt, 'yuv420p'); assert.equal(r.colorSpace, 'bt709');
  assert.ok(r.sizeBytes > 100_000, 'Datei verdächtig klein');
  assert.ok(!existsSync(join(dir, 'p.part.mp4')), 'Temporärdatei nicht aufgeräumt');
});

test('MP4-Export: Querformat 1920×1080', async () => {
  const r = await exportVideo({ seed: 5, durationSec: 2, format: 'landscape' }, { out: join(dir, 'l.mp4'), ...fast });
  assert.deepEqual(verifyResult(r), []);
  assert.equal(r.width, 1920); assert.equal(r.height, 1080); assert.equal(r.frames, 60);
});

test('Vorbereitete Formate: 720p mit 60 fps, Quadrat mit fester Bitrate', async () => {
  const a = await exportVideo({ seed: 6, video: { aspect: '9:16', resolution: 720, fps: 60, durationSec: 1 } }, { out: join(dir, 'a.mp4'), ...fast });
  assert.deepEqual(verifyResult(a), []);
  assert.deepEqual([a.width, a.height, a.fps, a.frames], [720, 1280, 60, 60]);
  const b = await exportVideo({ seed: 6, video: { aspect: '1:1', resolution: 1080, durationSec: 2, quality: { bitrate: '3M', preset: 'veryfast' } } }, { out: join(dir, 'b.mp4') });
  assert.deepEqual(verifyResult(b), []);
  assert.deepEqual([b.width, b.height, b.encoder.bitrate], [1080, 1080, 3000]);
  assert.ok(b.bitrateKbps < 4500, `Bitrate ${b.bitrateKbps} kbit/s deutlich über dem Ziel`);
});

test('Vorbereitete Formate: 4K-Ausgabe (2160×3840)', async () => {
  const r = await exportVideo({ seed: 6, video: { resolution: 2160, durationSec: 1 } }, { out: join(dir, 'k.mp4'), encoder: { preset: 'ultrafast' } });
  assert.deepEqual(verifyResult(r), []);
  assert.deepEqual([r.width, r.height, r.frames], [2160, 3840, 30]);
});

test('Export ist reproduzierbar, entspricht der reinen Simulation und lässt sich aus seiner JSON-Datei wiederholen', async () => {
  const cfg = { seed: 99, durationSec: 2 };
  const r1 = await exportVideo(cfg, { out: join(dir, 'r1.mp4'), encoder: { preset: 'ultrafast' } });
  const side = JSON.parse(readFileSync(r1.sidecar, 'utf8'));
  assert.equal(side.config.seed, 99); assert.equal(side.stateHash, r1.stateHash); assert.equal(side.video.frames, 60);
  const r2 = await exportVideo(side.config, { out: join(dir, 'r2.mp4'), encoder: { preset: 'ultrafast' } });
  assert.equal(r2.stateHash, r1.stateHash, 'Export aus gespeicherter Konfiguration weicht ab');
  const b = await launchBrowser({ gpu: false });
  try {
    const { page } = await openExportPage(b, cfg);
    await page.evaluate(() => window.exportAPI.simulate(2));
    assert.equal(await page.evaluate(() => window.exportAPI.hash()), r1.stateHash, 'Export-Physik ≠ Simulations-Physik');
  } finally { await b.close(); }
});

test('Export eines nachgeladenen Szenarios nutzt dieselbe Pipeline', async () => {
  const r = await exportVideo({ scenario: 'dummy', seed: 2, video: { aspect: '16:9', resolution: 720, durationSec: 1 } },
    { out: join(dir, 'd.mp4'), scripts: [join(ROOT, 'test', 'fixtures', 'dummy-scenario.js')], ...fast });
  assert.deepEqual(verifyResult(r), []);
  assert.deepEqual([r.cfg.scenario, r.width, r.height, r.frames], ['dummy', 1280, 720, 30]);
});

test('Export lässt sich abbrechen und hinterlässt keine Dateien', async () => {
  const ac = new AbortController();
  const out = join(dir, 'cancel.mp4');
  await assert.rejects(
    exportVideo({ seed: 1, durationSec: 60 }, { out, signal: ac.signal, onProgress: (p) => { if (p.frame >= 30) ac.abort(); } }),
    (e) => e.name === 'AbortError',
  );
  assert.ok(!existsSync(out), 'Ausgabedatei existiert trotz Abbruch');
  assert.ok(!readdirSync(dir).some((f) => f.startsWith('cancel')), 'Teildatei nicht gelöscht');
});
