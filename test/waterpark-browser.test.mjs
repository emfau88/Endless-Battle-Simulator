// Waterpark browser integration: real rendering, controls, layout changes and settings round trips.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { INDEX, launchBrowser, openExportPage } from '../lib/browser.mjs';

let browser;
before(async () => { browser = await launchBrowser({ gpu: false }); });
after(async () => { await browser?.close(); });

const config = aspect => ({ scenario: 'waterpark', seed: 42, params: { mode: 'short' },
  video: { aspect, resolution: 720, fps: 30, durationSec: 30, tempo: 1 }, view: { hud: true, camera: false } });

test('Waterpark renders both layouts without changing simulation or 30/60 fps behavior', async () => {
  for (const aspect of ['16:9', '9:16']) {
    const { page, errors, info } = await openExportPage(browser, config(aspect));
    try {
      assert.equal(info.scenario, 'waterpark');
      assert.equal(info.supportsClips, true);
      assert.deepEqual([info.width, info.height], aspect === '16:9' ? [1280, 720] : [720, 1280]);
      const result = await page.evaluate(() => {
        const frames = exportAPI.renderFrames(30, .75);
        const drawn = { hash: exportAPI.hash(), events: exportAPI.events(0), snapshot: exportAPI.snapshot() };
        exportAPI.restart(); exportAPI.simulate(1);
        const simulated = { hash: exportAPI.hash(), events: exportAPI.events(0) };
        exportAPI.restart({ video: { fps: 60 } }); exportAPI.renderFrames(60, .1);
        return { drawn, simulated, sixty: { hash: exportAPI.hash(), events: exportAPI.events(0) },
          visibleMotion: frames[0] !== frames.at(-1), encodedFrameBytes: frames[0].length, check: exportAPI.check() };
      });
      assert.equal(result.drawn.hash, result.simulated.hash, `${aspect}: renderer changes simulation`);
      assert.equal(result.drawn.hash, result.sixty.hash, `${aspect}: frame rate changes simulation`);
      assert.deepEqual(result.drawn.events, result.simulated.events);
      assert.deepEqual(result.drawn.events, result.sixty.events);
      assert.ok(result.visibleMotion && result.encodedFrameBytes > 10000, 'Actual rendered scene must move');
      assert.equal(result.drawn.snapshot.animals, 4);
      assert.ok(result.drawn.snapshot.counts.route > 0, 'A visible ride must start');
      assert.ok(result.check.ok, result.check.errors.join('; '));
      assert.deepEqual(errors.map(error => error.message), []);
    } finally { await page.close(); }
  }
});

test('Waterpark seek rule: a frame after a jump in time equals the frame of a continuous run', async () => {
  // Park day with lift, slides, funnel, water play and guests; the comparison covers the whole picture pixel by pixel.
  const cfg = { scenario: 'waterpark', seed: 42, params: { mode: 'day', animals: 16, size: 36 },
    video: { aspect: '16:9', resolution: 720, fps: 30, durationSec: 600, tempo: 1 }, view: { hud: true, camera: false } };
  const { page, errors } = await openExportPage(browser, cfg);
  try {
    const same = await page.evaluate(() => {
      exportAPI.renderFrames(360, .1);                                   // continuous: every frame drawn
      const [continuous] = exportAPI.renderFrames(1, 1, 'image/png');
      const hash = exportAPI.hash();
      exportAPI.restart(); exportAPI.simulate(12);                       // jump: simulation only, then one frame
      const [jumped] = exportAPI.renderFrames(1, 1, 'image/png');
      return { equal: continuous === jumped, sameState: hash === exportAPI.hash(), bytes: jumped.length };
    });
    assert.ok(same.sameState, 'both runs must reach the same simulation step');
    assert.ok(same.bytes > 10000 && same.equal, 'picture after a jump differs from continuous playback');
    assert.deepEqual(errors.map(error => error.message), []);
  } finally { await page.close(); }
});

const range = (page, id, value) => page.locator(id).evaluate((element, next) => {
  element.value = String(next);
  element.dispatchEvent(new Event('input')); element.dispatchEvent(new Event('change'));
}, value);

test('Waterpark controls survive JSON save/load and aspect changes rebuild the matching layout', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(pathToFileURL(INDEX).href + '?scenario=waterpark&paused=1&resolution=720&fps=30');
    await page.waitForFunction(() => window.EBS?.app?.cfg.scenario === 'waterpark');
    await page.evaluate(() => EBS.app.setRunning(false));
    for (const key of ['mode', 'animals', 'route0', 'route1', 'route2', 'route3', 'ufo', 'ending', 'speed', 'waves']) {
      assert.equal(await page.locator('#p-' + key).count(), 1, `Missing control ${key}`);
    }
    await page.selectOption('#p-mode', 'relax');
    await range(page, '#p-animals', 12);
    await range(page, '#p-speed', 1.2);
    await range(page, '#p-waves', .4);
    await page.uncheck('#p-route2'); await page.uncheck('#p-ufo');
    await range(page, '#vol-master', 85);
    const before = await page.evaluate(() => {
      for (let i = 0; i < 120; i++) EBS.app.session.step();
      EBS.app.session.render();
      window.waterparkPreviousSim = EBS.app.sim;
      return { step: EBS.app.sim.step, aspect: EBS.app.cfg.video.aspect };
    });
    const target = before.aspect === '9:16' ? '16:9' : '9:16';
    await page.click(`#segFormat button[data-v="${target}"]`);
    const layout = await page.evaluate(() => ({ changed: EBS.app.sim !== window.waterparkPreviousSim,
      step: EBS.app.sim.step, world: EBS.app.session.world, aspect: EBS.app.cfg.video.aspect,
      width: EBS.app.sim.L.W, height: EBS.app.sim.L.H }));
    assert.ok(before.step > 0 && layout.changed, 'Format switch must rebuild the running layout');
    assert.equal(layout.step, 0);
    assert.equal(layout.aspect, target);
    assert.deepEqual([layout.width, layout.height], target === '16:9' ? [1920, 1080] : [1080, 1920]);
    const expected = await page.evaluate(() => EBS.app.cfg);
    assert.deepEqual([expected.params.mode, expected.params.animals, expected.params.speed, expected.params.waves,
      expected.params.route2, expected.params.ufo, expected.video.volume.master], ['relax', 12, 1.2, .4, false, false, 85]);
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#btnSaveCfg')]);
    const stream = await download.createReadStream(), chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const saved = Buffer.concat(chunks);
    assert.deepEqual(JSON.parse(saved.toString('utf8')), expected);
    await page.selectOption('#scenario', 'naval');
    await page.setInputFiles('#cfgFile', { name: 'waterpark-settings.json', mimeType: 'application/json', buffer: saved });
    await page.waitForFunction(() => window.EBS?.app?.cfg.scenario === 'waterpark');
    assert.deepEqual(await page.evaluate(() => EBS.app.cfg), expected);
    assert.equal(await page.inputValue('#p-mode'), 'relax');
    assert.equal(await page.isChecked('#p-route2'), false);
    assert.equal(await page.isChecked('#p-ufo'), false);
    assert.ok((await page.evaluate(() => EBS.app.sim.checkInvariants())).ok);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, '390 px preview must not overflow');
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});
