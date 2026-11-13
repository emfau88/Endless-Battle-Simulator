// Endless Mycelium im Browser: Rendern in allen Formaten, 30/60 fps, Einstellungsdateien und echte kurze MP4s.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { INDEX, launchBrowser, openExportPage } from '../lib/browser.mjs';
import { exportVideo, verifyResult } from '../lib/exporter.mjs';

const dir = mkdtempSync(join(tmpdir(), 'ebs-myco-'));
let browser;
before(async () => { browser = await launchBrowser({ gpu: false }); });
after(async () => { await browser?.close(); rmSync(dir, { recursive: true, force: true }); });
const config = (video = {}, params = {}) => ({ scenario: 'mycelium', seed: 42, params,
  video: { aspect: '9:16', resolution: 720, fps: 30, durationSec: 3, ...video } });

test('Myzel: alle Formate, 30/60 fps und Rendern verändern weder Ablauf noch Ereignisse', async () => {
  for (const aspect of ['9:16', '16:9', '1:1']) {
    const { page, errors } = await openExportPage(browser, config({ aspect }));
    try {
      const info = await page.evaluate(() => exportAPI.info());
      assert.equal(info.scenario, 'mycelium');
      const drawn = await page.evaluate(() => { exportAPI.renderFrames(20); return { hash: exportAPI.hash(), events: exportAPI.events(0) }; });
      await page.evaluate(() => { exportAPI.restart({ video: { fps: 60 } }); exportAPI.renderFrames(40); });
      assert.equal(await page.evaluate(() => exportAPI.hash()), drawn.hash, `${aspect}: 30 vs 60 fps`);
      assert.deepEqual(await page.evaluate(() => exportAPI.events(0)), drawn.events);
      await page.evaluate(() => { exportAPI.restart({ video: { fps: 30 } }); exportAPI.simulate(20 / 30); });
      assert.equal(await page.evaluate(() => exportAPI.hash()), drawn.hash, `${aspect}: Rendern verändert den Zustand`);
      if (aspect !== '9:16') { assert.deepEqual(errors.map((e) => e.message), []); continue; }
      // Renderer liest nur: in jeder Phase (Wachsen, Pilze/Sporen, Verblassen, neue Generation) bleibt der Zustand gleich
      const readOnly = await page.evaluate(() => {
        const cfg = exportAPI.config(), world = exportAPI.info().world, sc = EBS.getScenario('mycelium');
        const sim = sc.create({ seed: cfg.seed, params: cfg.params, world, timeScale: cfg.video.tempo });
        const renderer = sc.createRenderer({ sim, world, renderScale: 0.5, view: cfg.view });
        const out = [];
        for (const sec of [8, 21, 23, 27]) {
          while (sim.t < sec) sim.stepOnce();
          const before = sim.stateHash(); for (let i = 0; i < 8; i++) renderer.draw();
          out.push({ phase: sim.snapshot().phase, same: before === sim.stateHash() });
        }
        renderer.destroy();
        return out;
      });
      assert.ok(readOnly.every((r) => r.same), JSON.stringify(readOnly));
      assert.deepEqual(new Set(readOnly.map((r) => r.phase)), new Set(['growing', 'fruiting', 'spores']));
      assert.deepEqual(errors.map((e) => e.message), []);
    } finally { await page.close(); }
  }
});

test('Myzel: Bedienfeld – YouTube-Standard beim Wechsel, Farbauswahl ohne Neustart, Einstellungsdatei vollständig', async (t) => {
  const source = await browser.newContext({ viewport: { width: 390, height: 844 } });
  t.after(() => source.close());
  const page = await source.newPage();
  // direkter Link, während noch eine Seeschlacht mit 1080p30 gespeichert ist
  await page.goto(pathToFileURL(INDEX).href + '?scenario=naval&resolution=1080&fps=30');
  await page.waitForFunction(() => window.EBS?.app?.cfg.scenario === 'naval');
  await page.goto(pathToFileURL(INDEX).href + '?scenario=mycelium');
  await page.waitForFunction(() => window.EBS?.app?.cfg.scenario === 'mycelium');
  const viaLink = await page.evaluate(() => EBS.app.cfg.video);
  assert.deepEqual([viaLink.resolution, viaLink.fps, viaLink.quality.crf], [1440, 60, 16], 'YouTube-Standard per Link');
  // Wechsel über die Auswahlliste
  await page.goto(pathToFileURL(INDEX).href + '?scenario=naval&resolution=1080&fps=30&crf=20');
  await page.waitForFunction(() => window.EBS?.app?.cfg.scenario === 'naval' && EBS.app.cfg.video.resolution === 1080);
  await page.selectOption('#scenario', 'mycelium');
  await page.waitForFunction(() => EBS.app.cfg.scenario === 'mycelium');
  const v = await page.evaluate(() => EBS.app.cfg.video);
  assert.deepEqual([v.resolution, v.fps, v.quality.crf], [1440, 60, 16], 'YouTube-Standard beim Szenariowechsel');
  assert.equal(await page.inputValue('#resolution'), '1440');
  for (const key of ['cycleSec', 'spread', 'branching', 'colonies', 'startLeaves', 'leafFall', 'digest', 'mushrooms', 'spores', 'wind', 'palette', 'glow', 'pulses']) {
    assert.equal(await page.locator('#p-' + key).count(), 1, `Regler ${key} fehlt`);
  }
  const hash0 = await page.evaluate(() => { EBS.app.setRunning(false); return EBS.app.sim.stateHash(); });
  await page.selectOption('#p-palette', 'warm');
  await page.locator('#p-glow').evaluate((el) => { el.value = '1.4'; el.dispatchEvent(new Event('input')); });
  await page.uncheck('#p-pulses');
  const live = await page.evaluate(() => ({ cfg: EBS.app.cfg.params, sim: EBS.app.sim.cfg, hash: EBS.app.sim.stateHash() }));
  assert.deepEqual([live.cfg.palette, live.cfg.glow, live.cfg.pulses], ['warm', 1.4, false]);
  assert.deepEqual([live.sim.palette, live.sim.glow, live.sim.pulses], ['warm', 1.4, false], 'Darstellung wirkt sofort');
  assert.equal(live.hash, hash0, 'Darstellungsregler starten nicht neu');
  await page.locator('#p-cycleSec').evaluate((el) => { el.value = '60'; el.dispatchEvent(new Event('change')); });
  await page.locator('#vol-leaf_eaten').evaluate((el) => { el.value = '140'; el.dispatchEvent(new Event('input')); });
  const expected = await page.evaluate(() => EBS.app.cfg);
  assert.equal(expected.params.cycleSec, 60); assert.equal(expected.video.volume.leaf_eaten, 140);
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#btnSaveCfg')]);
  const settings = join(dir, 'mycelium-settings.json'); await download.saveAs(settings);
  assert.deepEqual(JSON.parse(readFileSync(settings, 'utf8')), expected);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  // Preserve every assertion, but release the first WebGL preview before opening the import target.
  await source.close();
  assert.equal(browser.contexts().length, 0, 'Quellvorschau vor dem Import vollständig schließen');
  const target = await browser.newContext();
  t.after(() => target.close());
  const loaded = await target.newPage();
  await loaded.goto(pathToFileURL(INDEX).href + '?paused=1');
  await loaded.waitForFunction(() => window.EBS?.app?.sim);
  await loaded.setInputFiles('#cfgFile', settings);
  await loaded.waitForFunction(() => window.EBS?.app?.cfg.scenario === 'mycelium');
  assert.deepEqual(await loaded.evaluate(() => EBS.app.cfg), expected);
});

test('Myzel: echte kurze MP4s beider Formate mit Ton entsprechen der Simulation', async () => {
  for (const aspect of ['9:16', '16:9']) {
    const c = config({ aspect, durationSec: 2.5, audio: true });
    const r = await exportVideo(c, { out: join(dir, aspect.replace(':', 'x') + '.mp4'), gpu: false, encoder: { preset: 'ultrafast' } });
    assert.deepEqual(verifyResult(r), []);
    assert.equal(r.audio.lost, 0); assert.ok(r.audio.voices >= 2, 'Nachtluft und landende Spore');
    assert.ok(Math.abs(r.audio.lufs - -14) < 0.5, `Lautheit ${r.audio.lufs}`);
    const { page } = await openExportPage(browser, c);
    try {
      await page.evaluate(() => exportAPI.simulate(2.5));
      assert.equal(await page.evaluate(() => exportAPI.hash()), r.stateHash);
      assert.deepEqual(await page.evaluate(() => exportAPI.events(0)), r.audioEvents);
    } finally { await page.close(); }
    assert.equal(JSON.parse(readFileSync(r.sidecar, 'utf8')).config.scenario, 'mycelium');
  }
});
