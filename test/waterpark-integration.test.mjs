// Waterpark: real UI settings, saved configurations, preset parity and a small MP4 with sound.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { INDEX, ROOT, launchBrowser, openExportPage } from '../lib/browser.mjs';
import { exportVideo, probeVideo, verifyResult } from '../lib/exporter.mjs';

const registration = vm.createContext({}); registration.window = registration;
for (const file of ['src/core.js', 'src/scenarios/waterpark.js', 'src/production-presets.js']) {
  vm.runInContext(readFileSync(join(ROOT, file), 'utf8'), registration, { filename: file });
}
const plain = value => JSON.parse(JSON.stringify(value));
const normalize = input => plain(registration.EBS.normalizeConfig({ scenario: 'waterpark', ...input }));
let browser;
before(async () => { browser = await launchBrowser({ gpu: false }); });
after(async () => { await browser?.close(); });

test('Waterpark settings keep four species and at least one usable route; short protects its four-route story', () => {
  assert.equal(normalize({}).params.mode, 'relax', 'initial scene must support the existing free video length');
  const fresh = normalize({}).params;
  assert.deepEqual([fresh.title, fresh.waterPlay, fresh.ending], [false, true, 'show'], 'no title card, water play on, a park day ends with the show');
  assert.equal(normalize({ params: { title: true, waterPlay: false, ending: 'quiet' } }).params.title, true);
  const cfg = normalize({ params: { mode: 'short', animals: 24, route0: false, route1: false, route2: false, route3: false,
    size: 100, speed: 0, decoDensity: 3 }, view: { camera: true } });
  assert.equal(cfg.params.animals, 4);
  assert.deepEqual([0, 1, 2, 3].map(i => cfg.params[`route${i}`]), [true, true, true, true]);
  assert.equal(cfg.params.size, 44); assert.equal(cfg.params.speed, 0.5); assert.equal(cfg.params.decoDensity, 2);
  assert.equal(cfg.view.camera, false);
  const custom = normalize({ params: { mode: 'relax', animals: 11, route0: false, route1: false, route2: false, route3: false } });
  assert.equal(custom.params.animals, 12);
  assert.equal(custom.params.route0, true);
  assert.deepEqual([1, 2, 3].map(i => custom.params[`route${i}`]), [false, false, false]);
});

test('Waterpark production files match the UI and provide short, day and quiet long videos', () => {
  for (const kind of ['short', 'long']) {
    const preset = plain(registration.EBS.productionPreset('waterpark', kind));
    const file = JSON.parse(readFileSync(join(ROOT, `presets/production/waterpark-${kind}.json`), 'utf8'));
    assert.deepEqual(file, preset);
    const cfg = normalize(preset);
    assert.equal(cfg.params.mode, kind === 'short' ? 'short' : 'day');
    assert.equal(cfg.video.durationSec, kind === 'short' ? 30 : 600);
    assert.equal(cfg.video.fps, 60); assert.equal(cfg.video.resolution, 1080);
    assert.equal(cfg.video.quality.crf, 18); assert.equal(cfg.video.volume.master, 70);
    assert.equal(cfg.video.volume.water, 100); assert.equal(cfg.view.camera, false);
  }
  for (const minutes of [5, 10, 20]) {
    const cfg = normalize(JSON.parse(readFileSync(join(ROOT, `presets/waterpark-day-${minutes}min.json`), 'utf8')));
    assert.equal(cfg.params.mode, 'day'); assert.equal(cfg.video.durationSec, minutes * 60);
    assert.equal(cfg.video.aspect, '16:9');
  }
  for (const minutes of [10, 20]) {
    const cfg = normalize(JSON.parse(readFileSync(join(ROOT, `presets/waterpark-relax-${minutes}min.json`), 'utf8')));
    assert.equal(cfg.params.mode, 'relax'); assert.equal(cfg.params.dayCycle, false);
    assert.equal(cfg.video.durationSec, minutes * 60); assert.equal(cfg.view.hud, false);
  }
  const ownLevels = normalize({ video: { volume: { master: 65, water: 30, splash: 87.25 } } });
  assert.deepEqual([ownLevels.video.volume.master, ownLevels.video.volume.water, ownLevels.video.volume.splash], [65, 30, 87.25]);
});

test('Waterpark UI loads short/long presets, protects route controls and restores its saved configuration', async t => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  t.after(() => context.close());
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(pathToFileURL(INDEX).href + '?scenario=waterpark&seed=731&paused=1');
  await page.waitForFunction(() => window.EBS?.app?.sim);
  assert.equal(await page.inputValue('#scenario'), 'waterpark');
  await page.click('#btnShortPreset');
  assert.equal(await page.inputValue('#durationText'), '30s');
  assert.equal(await page.isDisabled('#durationText'), false, 'fixed film duration remains editable despite export preflight');
  assert.equal(await page.inputValue('#p-mode'), 'short');
  for (let i = 0; i < 4; i++) {
    assert.equal(await page.isChecked(`#p-route${i}`), true);
    assert.equal(await page.isDisabled(`#p-route${i}`), true);
  }
  assert.equal(await page.isDisabled('#p-animals'), true);
  assert.match(await page.textContent('#audioHint'), /Wasserpark-Mischung.*Wasserloop/);
  assert.doesNotMatch(await page.textContent('#audioHint'), /−14 LUFS/);
  await page.click('#btnLongPreset');
  assert.equal(await page.inputValue('#durationText'), '10m');
  assert.equal(await page.isDisabled('#p-route1'), false);
  await page.uncheck('#p-route1');
  await page.selectOption('#p-ending', 'show');
  await page.check('#p-fireworks');
  await page.fill('#vol-water', '35'); await page.dispatchEvent('#vol-water', 'input');
  await page.evaluate(() => { for (let i = 0; i < 30; i++) EBS.app.sim.stepOnce(); });
  assert.equal(await page.evaluate(() => EBS.app.sim.step), 30);
  await page.fill('#durationText', '5m'); await page.dispatchEvent('#durationText', 'change');
  assert.equal(await page.evaluate(() => EBS.app.sim.step), 0, 'new duration starts a new park program');
  const expected = await page.evaluate(() => EBS.app.cfg);
  assert.equal(expected.seed, 731); assert.equal(expected.params.route1, false);
  assert.equal(expected.video.volume.water, 35); assert.equal(expected.params.fireworks, true);
  assert.equal(expected.video.durationSec, 300);
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#btnSaveCfg')]);
  const saved = readFileSync(await download.path());
  assert.deepEqual(JSON.parse(saved), expected);
  await page.click('#btnShortPreset');
  await page.setInputFiles('#cfgFile', { name: 'waterpark.json', mimeType: 'application/json', buffer: saved });
  await page.waitForFunction(() => EBS.app.cfg.params.mode === 'day' && EBS.app.cfg.video.volume.water === 35);
  assert.deepEqual(await page.evaluate(() => EBS.app.cfg), expected);
  await page.reload(); await page.waitForFunction(() => window.EBS?.app?.sim);
  assert.deepEqual(await page.evaluate(() => EBS.app.cfg), expected);
  await page.click('#btnVolumeReset');
  assert.equal(await page.inputValue('#vol-water'), '100');
  assert.deepEqual(errors, []);
});

for (const aspect of ['9:16', '16:9']) {
  test(`Waterpark ${aspect}: preview and captured frame use the same registered scene`, async () => {
    const { page, errors, info } = await openExportPage(browser, { scenario: 'waterpark',
      params: { mode: 'relax', animals: 12 }, video: { aspect, resolution: 720, fps: 30, durationSec: 3 } });
    try {
      assert.equal(info.scenario, 'waterpark');
      assert.equal(info.audio.mixProfile, 'waterpark-water-v1');
      assert.equal(info.supportsClips, false);
      assert.equal(info.requiresPreflight, false);
      const proof = await page.evaluate(() => {
        const frames = exportAPI.renderFrames(2, 0.8, 'image/png');
        return { size: frames[1].length, check: exportAPI.check(), snapshot: exportAPI.snapshot() };
      });
      assert.ok(proof.size > 10000, 'a real scene must render');
      assert.ok(proof.check.ok, proof.check.errors.join('; '));
      assert.equal(proof.snapshot.animals, 12);
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  });
}

test('Waterpark 3-second relaxed MP4 contains the requested frames, quiet water and complete metadata', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'ebs-waterpark-export-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const out = join(dir, 'waterpark.mp4');
  const config = { scenario: 'waterpark', seed: 42, params: { mode: 'relax', animals: 4 },
    video: { aspect: '16:9', resolution: 720, fps: 30, durationSec: 3, audio: true,
      quality: { crf: 23, preset: 'ultrafast' } }, view: { camera: false, hud: true } };
  await exportVideo(config, { out, gpu: false, log: () => {} });
  const probe = await probeVideo(out), metadata = JSON.parse(readFileSync(out.replace(/\.mp4$/, '.json'), 'utf8'));
  assert.deepEqual(verifyResult({ ...probe, audio: metadata.audio, expectedWidth: 1280,
    expectedHeight: 720, expectedFrames: 90, expectedFps: 30, expectedDuration: 3 }), []);
  assert.equal(metadata.config.scenario, 'waterpark');
  assert.equal(metadata.config.params.mode, 'relax');
  assert.equal(metadata.audio.lost, 0);
  assert.equal(probe.audioStream?.channels, 2, 'stereo audio was encoded');
  t.diagnostic(JSON.stringify({ frames: probe.frames, audio: metadata.audio.encoded, duration: probe.duration }));
});

test('Waterpark finite export preflight rejects too-short films before publishing an MP4', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'ebs-waterpark-preflight-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  await assert.rejects(exportVideo({ scenario: 'waterpark', params: { mode: 'short' },
    video: { durationSec: 2, resolution: 720, fps: 30, audio: false } },
  { out: join(dir, 'too-short.mp4'), gpu: false, log: () => {} }), /25 Sekunden|zu kurz|mindestens/);
  assert.equal(existsSync(join(dir, 'too-short.mp4')), false, 'invalid finite film must not publish a video');
  const { page, info } = await openExportPage(browser, { scenario: 'waterpark', params: { mode: 'short' },
    video: { durationSec: 30, resolution: 720, fps: 30 } });
  try {
    assert.equal(info.naturalDuration, false);
    assert.equal(info.requiresPreflight, true);
    const planned = await page.evaluate(() => {
      let result; do { result = exportAPI.planEpisode(); } while (!result.done);
      return { duration: result.durationSec, configDuration: exportAPI.config().video.durationSec };
    });
    assert.deepEqual(planned, { duration: 30, configDuration: 30 });
  } finally { await page.close(); }
});
