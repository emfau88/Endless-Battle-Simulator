import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { INDEX, ROOT, launchBrowser } from '../lib/browser.mjs';
import { join } from 'node:path';

let browser;
before(async () => { browser = await launchBrowser({ gpu: false }); });
after(async () => { await browser?.close(); });
const base = pathToFileURL(INDEX).href;
const ready = page => page.waitForFunction(() => window.EBS?.app?.sim);
const ids = ['naval', 'marble', 'scrap', 'mycelium', 'pyramid'];

test('Einstellungsdatei bewahrt Qualitätswerte und Namen; der PC-Exportbefehl übernimmt die Qualität', async t => {
  const ctx = await browser.newContext(); t.after(() => ctx.close());
  const page = await ctx.newPage();
  await page.goto(base + '?scenario=mycelium&seed=42&paused=1&resolution=1080&fps=30&crf=21&preset=fast&bitrate=6000&name=Produktionsprobe');
  await ready(page);
  const expected = await page.evaluate(() => EBS.app.cfg);
  assert.equal(await page.locator('#shareLink, #btnCopy').count(), 0, 'keine Teilen-Funktion in der Oberfläche');
  await page.click('#btnExport');
  assert.match(await page.textContent('#exportMsg'), /--crf 21 --preset fast --bitrate 6000k/);
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#btnSaveCfg')]);
  const data = readFileSync(await download.path());
  assert.deepEqual(JSON.parse(data), expected);
  await ctx.close();
  const fresh = await browser.newContext(); t.after(() => fresh.close());
  const loaded = await fresh.newPage();
  await loaded.goto(base + '?paused=1'); await ready(loaded);
  await loaded.setInputFiles('#cfgFile', { name: 'settings.json', mimeType: 'application/json', buffer: data });
  await loaded.waitForFunction(() => EBS.app.cfg.name === 'Produktionsprobe');
  assert.deepEqual(await loaded.evaluate(() => EBS.app.cfg), expected);
});

test('Zehn Produktionsdateien entsprechen den UI-Vorlagen und definierten Videoeinstellungen', async t => {
  const ctx = await browser.newContext(); t.after(() => ctx.close());
  const page = await ctx.newPage(); await page.goto(base + '?paused=1'); await ready(page);
  assert.deepEqual(await page.locator('#scenario option').evaluateAll(options => options.map(o => o.value)), ids);
  for (const id of ids) for (const kind of ['short', 'long']) {
    const file = JSON.parse(readFileSync(join(ROOT, 'presets', 'production', `${id}-${kind}.json`), 'utf8'));
    const fromUi = await page.evaluate(([id, kind]) => EBS.productionPreset(id, kind), [id, kind]);
    assert.deepEqual(fromUi, file, `${id}/${kind}: Datei und Oberfläche`);
    const normalized = await page.evaluate(config => EBS.normalizeConfig(config), file);
    assert.deepEqual([normalized.scenario, normalized.video.aspect, normalized.video.durationSec, normalized.video.resolution,
      normalized.video.fps, normalized.video.audio, normalized.video.tempo],
    [id, kind === 'short' ? '9:16' : '16:9', kind === 'short' ? 60 : 600, 1080, 30, true, 1]);
    assert.deepEqual(normalized.video.quality, { crf: 20, preset: 'medium', bitrate: null });
    assert.ok(Object.values(normalized.video.volume).every(v => v === 100));
    if (id === 'pyramid') assert.equal(normalized.params.dayMinutes, kind === 'short' ? 1 : 0);
    if (id === 'scrap') assert.deepEqual([normalized.params.arena, normalized.params.episodeMode, normalized.view.camera], ['sunshine', 'endless', false]);
  }
});

test('Vorlagenknöpfe erhalten den Seed und laden alle fünf Szenarien mit speicherbaren Einstellungen', async t => {
  const ctx = await browser.newContext(); t.after(() => ctx.close());
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '?seed=731&paused=1'); await ready(page);
  for (const id of ids) {
    await page.selectOption('#scenario', id);
    for (const kind of ['short', 'long']) {
      await page.click(kind === 'short' ? '#btnShortPreset' : '#btnLongPreset');
      const expected = await page.evaluate(([id, kind]) => EBS.normalizeConfig(EBS.productionPreset(id, kind, 731)), [id, kind]);
      assert.deepEqual(await page.evaluate(() => EBS.app.cfg), expected);
      assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('ebs.cfg'))), expected);
      assert.equal(await page.inputValue('#scenario'), id);
      assert.equal(await page.inputValue('#durationText'), kind === 'short' ? '1m' : '10m');
      assert.equal(await page.isChecked('#audio'), true);
      const [download] = await Promise.all([page.waitForEvent('download'), page.click('#btnSaveCfg')]);
      assert.deepEqual(JSON.parse(readFileSync(await download.path(), 'utf8')), expected);
    }
  }
  await page.reload(); await ready(page);
  assert.deepEqual(await page.evaluate(() => [EBS.app.cfg.scenario, EBS.app.cfg.seed, EBS.app.cfg.video.durationSec]), ['pyramid', 731, 600]);
  assert.deepEqual(errors, []);
});
