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
const ids = ['naval', 'marble', 'scrap', 'mycelium', 'pyramid', 'territory'];

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

test('Bestehende Produktionsdateien entsprechen den UI-Vorlagen und definierten Videoeinstellungen', async t => {
  const ctx = await browser.newContext(); t.after(() => ctx.close());
  const page = await ctx.newPage(); await page.goto(base + '?paused=1'); await ready(page);
  assert.deepEqual(await page.locator('#scenario option').evaluateAll(options => options.map(o => o.value)), [...ids, 'marbleworks', 'waterpark', 'marblexl', 'cloudwars']);
  for (const id of ids) for (const kind of ['short', 'long']) {
    const file = JSON.parse(readFileSync(join(ROOT, 'presets', 'production', `${id}-${kind}.json`), 'utf8'));
    const fromUi = await page.evaluate(([id, kind]) => EBS.productionPreset(id, kind), [id, kind]);
    assert.deepEqual(fromUi, file, `${id}/${kind}: Datei und Oberfläche`);
    const normalized = await page.evaluate(config => EBS.normalizeConfig(config), file);
    // Territory Short: own short map with story; the length is planned up to the victory (33 s is the starting value).
    const story = id === 'territory' && kind === 'short';
    // Scrap Short: Short-Bild auf einem geprüften Casting-Seed; die Länge wird bis zum Sieg geplant (35 s ist der Startwert).
    const scrapShort = id === 'scrap' && kind === 'short';
    // Scrap Langvideo: Turnier mit acht Runden; die Länge wird bis zum Finale geplant (300 s ist der Startwert).
    const scrapLong = id === 'scrap' && kind === 'long';
    assert.deepEqual([normalized.scenario, normalized.video.aspect, normalized.video.durationSec, normalized.video.resolution,
      normalized.video.fps, normalized.video.audio, normalized.video.tempo],
    [id, kind === 'short' ? '9:16' : '16:9', story ? 33 : scrapShort ? 35 : scrapLong ? 300 : kind === 'short' ? 60 : 600, 1080, 30, true, story ? 2 : id === 'territory' ? .75 : 1]);
    if (scrapShort) assert.deepEqual([normalized.params.layout, normalized.params.rulesVersion, normalized.params.soundMix, file.seed], ['short', 'v4', 'soft-v1', 61]);
    if (story) assert.deepEqual([normalized.params.layout, normalized.params.story, normalized.params.videoEnd, normalized.params.repeatRounds],
      ['short', 'crown', 'victory', false]);
    assert.deepEqual(normalized.video.quality, { crf: 20, preset: 'medium', bitrate: null });
    if (id === 'pyramid') {
      assert.deepEqual(normalized.video.volume, { master: 70, scoop: 110, pulse: 55.25, tip: 110, cap: 100,
        splash: 110, boing: 100, wheee: 55, squeak: 110, full: 100, launch: 100, firework: 100,
        emote: 110, fish: 110, ufo: 110, twinkle: 110, chirp: 110, water: 100 });
    } else assert.ok(Object.values(normalized.video.volume).every(v => v === 100));
    if (id === 'pyramid') assert.equal(normalized.params.dayMinutes, kind === 'short' ? 1 : 0);
    if (id === 'scrap') assert.deepEqual([normalized.params.arena, normalized.params.rulesVersion, normalized.params.episodeMode, normalized.view.camera],
      ['sunshine', 'v4', scrapLong ? 'tournament' : 'endless', false]);
  }
});

test('Marble Works has its own complete-order presets without changing the Classic preset family', async t => {
  const ctx = await browser.newContext(); t.after(() => ctx.close());
  const page = await ctx.newPage(); await page.goto(base + '?scenario=marbleworks&seed=731&paused=1'); await ready(page);
  for (const kind of ['short', 'long']) {
    const file = JSON.parse(readFileSync(join(ROOT, 'presets', 'production', `marbleworks-${kind}.json`), 'utf8'));
    assert.deepEqual(await page.evaluate(kind => EBS.productionPreset('marbleworks', kind), kind), file);
    await page.click(kind === 'short' ? '#btnShortPreset' : '#btnLongPreset');
    await page.waitForFunction(() => document.querySelector('#durationOut').textContent !== '…');
    const actual = await page.evaluate(() => EBS.app.cfg);
    assert.equal(actual.scenario, 'marbleworks'); assert.equal(actual.seed, 731);
    assert.equal(actual.params.orderSize, kind === 'short' ? 24 : 144);
    assert.equal(actual.params.exportLength, 'order');
    assert.equal(actual.video.aspect, kind === 'short' ? '9:16' : '16:9');
    assert.equal(await page.isDisabled('#durationText'), true);
    assert.ok(actual.video.durationSec > 60 && actual.video.durationSec < 600);
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('ebs.cfg'))), actual);
  }
  await page.selectOption('#scenario', 'marble');
  await page.click('#btnShortPreset');
  assert.equal(await page.inputValue('#durationText'), '1m');
  assert.equal(await page.locator('#p-orderSize').count(), 0);
  assert.ok(await page.locator('#p-balls').isVisible());
});

test('Vorlagenknöpfe erhalten den Seed und laden alle sechs Szenarien mit speicherbaren Einstellungen', async t => {
  const ctx = await browser.newContext(); t.after(() => ctx.close());
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '?seed=731&paused=1'); await ready(page);
  // Der Seed bleibt erhalten; nur der Scrap-Short nimmt den nächsten geprüften Casting-Seed (731 → 733), der danach gilt.
  let seed = 731;
  for (const id of ids) {
    await page.selectOption('#scenario', id);
    for (const kind of ['short', 'long']) {
      await page.click(kind === 'short' ? '#btnShortPreset' : '#btnLongPreset');
      const expected = await page.evaluate(([id, kind, seed]) => EBS.normalizeConfig(EBS.productionPreset(id, kind, seed)), [id, kind, seed]);
      assert.equal(expected.seed, id === 'scrap' && kind === 'short' ? 733 : seed);
      seed = expected.seed;
      if ((id === 'territory' && kind === 'short') || id === 'scrap') {
        // The video ends with the victory (Scrap long: with the tournament): the planned length replaces the starting value of the preset.
        await page.waitForFunction(() => document.querySelector('#durationOut').textContent !== '…');
        expected.video.durationSec = await page.evaluate(() => EBS.app.cfg.video.durationSec);
        const [lo, hi] = kind === 'short' ? [25, 45] : [200, 420];
        assert.ok(expected.video.durationSec > lo && expected.video.durationSec < hi, String(expected.video.durationSec));
        assert.equal(await page.isDisabled('#durationText'), true);
      } else assert.equal(await page.inputValue('#durationText'), kind === 'short' ? '1m' : '10m');
      assert.deepEqual(await page.evaluate(() => EBS.app.cfg), expected);
      assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('ebs.cfg'))), expected);
      assert.equal(await page.inputValue('#scenario'), id);
      assert.equal(await page.isChecked('#audio'), true);
      const [download] = await Promise.all([page.waitForEvent('download'), page.click('#btnSaveCfg')]);
      assert.deepEqual(JSON.parse(readFileSync(await download.path(), 'utf8')), expected);
    }
  }
  await page.reload(); await ready(page);
  assert.deepEqual(await page.evaluate(() => [EBS.app.cfg.scenario, EBS.app.cfg.seed, EBS.app.cfg.video.durationSec]), ['territory', 731, 600]); // Seed aus der Adresse
  assert.deepEqual(errors, []);
});
