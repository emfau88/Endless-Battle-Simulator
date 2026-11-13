// Kern-Tests: Video-Einstellungen, Konfigurationsschema, Szenario-Registry, Unabhängigkeit der Physik vom Ausgabeformat.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { ROOT, launchBrowser, openExportPage } from '../lib/browser.mjs';

let browser, page;
before(async () => {
  browser = await launchBrowser({ gpu: false });
  ({ page } = await openExportPage(browser, { seed: 1, video: { resolution: 720 } }));
});
after(async () => { await browser?.close(); });

test('Video-Größen: alle Seitenverhältnisse × Auflösungen', async () => {
  const sizes = await page.evaluate(() => {
    const out = {};
    for (const a of Object.keys(EBS.ASPECTS)) for (const r of Object.keys(EBS.RESOLUTIONS)) out[`${a}@${r}`] = EBS.videoSize({ aspect: a, resolution: +r });
    return out;
  });
  const expect = {
    '9:16@720': [720, 1280], '9:16@1080': [1080, 1920], '9:16@1440': [1440, 2560], '9:16@2160': [2160, 3840],
    '16:9@720': [1280, 720], '16:9@1080': [1920, 1080], '16:9@1440': [2560, 1440], '16:9@2160': [3840, 2160],
    '1:1@720': [720, 720], '1:1@1080': [1080, 1080], '1:1@1440': [1440, 1440], '1:1@2160': [2160, 2160],
  };
  for (const [k, [w, h]] of Object.entries(expect)) {
    assert.deepEqual([sizes[k].width, sizes[k].height], [w, h], k);
    assert.equal(sizes[k].width % 2 + sizes[k].height % 2, 0, `${k} nicht gerade`);
  }
});

test('Konfiguration: flaches Phase-A-Format, verschachteltes Schema, Grenzwerte', async () => {
  const r = await page.evaluate(() => ({
    legacy: EBS.normalizeConfig({ seed: 7, format: 'landscape', ships: 3, hud: false, fps: 60, durationSec: 20 }),
    nested: EBS.normalizeConfig({ scenario: 'naval', seed: 8, params: { cannons: 2 }, video: { aspect: '1:1', resolution: 1440, quality: { bitrate: '8M' } } }),
    bad: EBS.normalizeConfig({ seed: -3, params: { ships: 99, intensity: 5 }, video: { aspect: '4:3', resolution: 999, fps: 24, durationSec: 1e9, quality: { crf: 99, preset: 'x' } } }),
    merged: EBS.mergeConfig(EBS.normalizeConfig({ seed: 1, params: { ships: 3 } }), { seed: 2, video: { fps: 60 } }),
    defaults: EBS.normalizeConfig({}),
    empty: EBS.normalizeConfig({ scenario: '' }).scenario,
    unknown: (() => { try { EBS.normalizeConfig({ scenario: 'gibtsnicht', seed: 3 }); return null; } catch (e) { return { code: e.code, scenario: e.scenario, message: e.message }; } })(),
  }));
  assert.equal(r.legacy.version, 1);
  assert.deepEqual([r.legacy.seed, r.legacy.video.aspect, r.legacy.params.ships, r.legacy.view.hud, r.legacy.video.fps, r.legacy.video.durationSec], [7, '16:9', 3, false, 60, 20]);
  assert.deepEqual([r.nested.video.aspect, r.nested.video.resolution, r.nested.video.quality.bitrate, r.nested.params.cannons], ['1:1', 1440, 8000, 2]);
  assert.equal(r.bad.scenario, 'naval');
  // Fehlende Szenario-Angabe -> Standard; ausdrücklich unbekannte ID -> Fehler statt stillem Rückfall
  assert.equal(r.empty, 'naval');
  assert.deepEqual([r.unknown && r.unknown.code, r.unknown && r.unknown.scenario], ['UNKNOWN_SCENARIO', 'gibtsnicht']);
  assert.match(r.unknown.message, /Unbekanntes Szenario "gibtsnicht"\. Verfügbar: naval, marble/);
  assert.deepEqual([r.bad.params.ships, r.bad.params.intensity], [4, 1]);
  assert.deepEqual([r.bad.video.aspect, r.bad.video.resolution, r.bad.video.fps, r.bad.video.durationSec], ['9:16', 1080, 30, 4 * 3600]);
  assert.deepEqual([r.bad.video.quality.crf, r.bad.video.quality.preset], [51, 'medium']);
  assert.deepEqual([r.merged.seed, r.merged.params.ships, r.merged.video.fps], [2, 3, 60]);
  // Standard: 2 Schiffe, 4 Kanonen, 35 %, 45 Sekunden (kurz, gegen versehentliche Langexporte), 30 fps, 1080×1920
  assert.deepEqual([r.defaults.params.ships, r.defaults.params.cannons, r.defaults.params.intensity, r.defaults.video.durationSec, r.defaults.video.fps, r.defaults.video.aspect, r.defaults.video.resolution],
    [2, 4, 0.35, 45, 30, '9:16', 1080]);
});

test('Physik ist unabhängig von Auflösung, Bildrate und Seitenformat-Skalierung', async () => {
  const b = await openExportPage(browser, { seed: 3, video: { resolution: 1080, fps: 30 } });
  // 720p @ 60 fps: 120 Frames = 2 s  |  1080p @ 30 fps: 60 Frames = 2 s
  await page.evaluate(() => window.exportAPI.restart({ seed: 3, video: { resolution: 720, fps: 60 } }));
  await page.evaluate(() => window.exportAPI.renderFrames(120, 0.5));
  await b.page.evaluate(() => window.exportAPI.renderFrames(60, 0.5));
  assert.equal(await page.evaluate(() => window.exportAPI.hash()), await b.page.evaluate(() => window.exportAPI.hash()));
  const info = await page.evaluate(() => window.exportAPI.info());
  assert.deepEqual([info.width, info.height, info.fps], [720, 1280, 60]);
  await b.page.close();
});

test('Quadrat 1:1 läuft stabil', async () => {
  await page.evaluate(() => window.exportAPI.restart({ seed: 4, video: { aspect: '1:1', resolution: 720, fps: 30 } }));
  const s = await page.evaluate(() => window.exportAPI.simulate(300));
  const c = await page.evaluate(() => window.exportAPI.check());
  assert.ok(c.ok, c.errors.join('; '));
  assert.ok(s.shots > 100 && s.hits > 30, `zu wenig Aktivität: ${s.shots}/${s.hits}`);
  const info = await page.evaluate(() => window.exportAPI.info());
  assert.deepEqual([info.width, info.height], [720, 720]);
});

test('Szenario-Registry: weiteres Szenario nachladen und mit derselben Technik rendern', async () => {
  await page.addScriptTag({ path: join(ROOT, 'test', 'fixtures', 'dummy-scenario.js') });
  const ids = (await page.evaluate(() => window.exportAPI.scenarios())).map((s) => s.id);
  assert.deepEqual(ids, ['naval', 'marble', 'scrap', 'mycelium', 'pyramid', 'dummy']);
  await page.evaluate(() => window.exportAPI.restart({ scenario: 'dummy', params: { speed: 500 }, video: { aspect: '16:9', resolution: 720 } }));
  const frames = await page.evaluate(() => window.exportAPI.renderFrames(3, 0.8));
  assert.equal(frames.length, 3);
  const info = await page.evaluate(() => window.exportAPI.info());
  assert.deepEqual([info.scenario, info.width, info.height, info.cfg.params.speed], ['dummy', 1280, 720, 500]);
  // zurück zur Seeschlacht
  await page.evaluate(() => window.exportAPI.restart({ scenario: 'naval' }));
  assert.equal((await page.evaluate(() => window.exportAPI.info())).scenario, 'naval');
});
