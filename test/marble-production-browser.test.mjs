import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { INDEX, launchBrowser, openExportPage } from '../lib/browser.mjs';

let browser;
const gpu = process.env.EBS_GPU === '1'; // Opt-in local hardware checks; CI remains deterministic software rendering.
before(async () => { browser = await launchBrowser({ gpu }); });
after(async () => { await browser?.close(); });
const config = (params = {}, video = {}) => ({ scenario: 'marbleworks', seed: 42,
  params: { exportLength: 'duration', ...params },
  video: { aspect: '16:9', resolution: 720, fps: 30, durationSec: 3, ...video } });

test('Progressive production: a complete default episode, useful unlocks and exact collection', async t => {
  const { page, errors, info } = await openExportPage(browser, config()); t.after(() => page.close());
  assert.equal(info.supportsClips, true);
  let state;
  for (let i = 0; i < 48; i++) {
    state = await page.evaluate(() => exportAPI.simulate(10));
    const check = await page.evaluate(() => exportAPI.check());
    assert.ok(check.ok, check.errors.join('; '));
    if (state.complete) break;
  }
  assert.equal(state.completed, 144);
  assert.equal(state.polished, 144); assert.equal(state.coated, 144); assert.equal(state.inspected, 144);
  assert.equal(state.cooled, 144);
  assert.deepEqual(state.sorted, [24, 24, 24, 24, 24, 24]);
  assert.equal(state.level, 2); assert.ok(state.parallelProcessed > 0);
  assert.ok(state.blockedTicks > 0, 'production pressure must visibly build a bottleneck');
  assert.ok(state.completedAt >= 300 && state.completedAt <= 480, `default duration ${state.completedAt}`);
  assert.deepEqual(state.milestones.slice(0, 2).map(m => m.completed), state.unlockAt);
  await page.evaluate(() => exportAPI.renderFrames(1));
  assert.deepEqual(errors, []);
});

test('Progressive production: camera, aspect, render cadence and resolution cannot change outcomes or audio', async t => {
  const pages = [];
  for (const [aspect, resolution, fps, cameraMode] of [['16:9', 720, 60, 'auto'], ['9:16', 1080, 30, 'manual'], ['1:1', 720, 30, 'overview']]) {
    const { page, errors } = await openExportPage(browser, config({ cameraMode }, { aspect, resolution, fps }));
    pages.push(page); t.after(() => page.close());
    await page.evaluate(() => exportAPI.simulate(100));
    // Six 60-fps or three 30-fps frames exercise different render cadences over
    // the same six physics ticks without repeating a second of expensive 3D draws.
    await page.evaluate(n => exportAPI.renderFrames(n, .5), fps / 10);
    assert.deepEqual(errors, []);
  }
  const outputs = await Promise.all(pages.map(page => page.evaluate(() => ({ hash: exportAPI.hash(), events: exportAPI.events(0) }))));
  assert.deepEqual(outputs[0], outputs[1]); assert.deepEqual(outputs[1], outputs[2]);
});

test('Progressive renderer: direct seeking matches intermediate rendering across upgrades and finale', async t => {
  const { page, errors } = await openExportPage(browser, config({ orderSize: 24, productionSpeed: 2, intensity: 2 }));
  t.after(() => page.close());
  const checkpoints = [0, 18, 40, 100], expected = new Map();
  for (const at of checkpoints) {
    await page.evaluate(() => exportAPI.restart({}));
    await page.evaluate(s => exportAPI.simulate(s), at);
    expected.set(at, await page.evaluate(() => ({ image: exportAPI.renderFrames(1, 1, 'image/png'), hash: exportAPI.hash() })));
  }
  const milestones = await page.evaluate(() => exportAPI.snapshot().milestones);
  assert.deepEqual(milestones.map(m => m.type), ['coating', 'parallel', 'complete']);
  // One continuous physics history, with draws between checkpoints and on both
  // sides of every earned upgrade/completion. Rendering every second mostly
  // repeated the same shader work and restarted that history four times.
  const renderTimes = new Set(checkpoints);
  for (let i = 1; i < checkpoints.length; i++) renderTimes.add((checkpoints[i - 1] + checkpoints[i]) / 2);
  for (const milestone of milestones) for (const offset of [-1, 0, 1]) {
    const at = Math.floor(milestone.time) + offset;
    if (at >= 0 && at <= checkpoints.at(-1)) renderTimes.add(at);
  }
  await page.evaluate(() => exportAPI.restart({}));
  let elapsedTicks = 0;
  for (const at of [...renderTimes].sort((a, b) => a - b)) {
    const tick = at * 60, capture = expected.has(at);
    const actual = await page.evaluate(({ remainingTicks, capture }) => {
      exportAPI.simulate(remainingTicks / 60);
      const image = exportAPI.renderFrames(1, capture ? 1 : .1, capture ? 'image/png' : 'image/jpeg');
      return capture ? { image, hash: exportAPI.hash() } : null;
    }, { remainingTicks: tick - elapsedTicks, capture });
    // renderFrames itself advances two 60-Hz physics ticks at the configured 30 fps.
    elapsedTicks = tick + 2;
    if (capture) {
      assert.equal(actual.hash, expected.get(at).hash);
      assert.deepEqual(actual.image, expected.get(at).image, `render after seek differs at ${at}s`);
    }
  }
  t.diagnostic(`${renderTimes.size} history frames plus ${checkpoints.length} direct PNG checkpoints`);
  assert.deepEqual(errors, []);
});

test('Progressive UI: switch from Classic, preserve live state on reframe and save camera/material settings', async t => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); t.after(() => page.close());
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(pathToFileURL(INDEX).href + '?scenario=marble&paused=1');
  await page.waitForFunction(() => EBS.app?.sim);
  assert.equal(await page.inputValue('#scenario'), 'marble');
  assert.equal(await page.locator('#p-factoryMode').count(), 0);
  assert.ok(await page.locator('#p-balls').isVisible());
  await page.selectOption('#scenario', 'marbleworks');
  assert.equal(await page.locator('#p-balls').count(), 0);
  assert.ok(await page.locator('#p-orderSize').isVisible());
  assert.ok(await page.locator('#stat-completed').count());
  await page.selectOption('#p-material', 'mixed');
  await page.evaluate(() => { for (let i = 0; i < 7200; i++) EBS.app.session.step(); EBS.app.session.render(); });
  const hash = await page.evaluate(() => EBS.app.sim.stateHash());
  await page.selectOption('#p-cameraMode', 'manual');
  await page.fill('#p-cameraPosition', '80'); await page.dispatchEvent('#p-cameraPosition', 'input');
  await page.click('#segFormat button[data-v="9:16"]');
  await page.click('#segFormat button[data-v="16:9"]');
  assert.equal(await page.evaluate(() => EBS.app.sim.stateHash()), hash);
  assert.equal(await page.evaluate(() => EBS.app.cfg.params.cameraPosition), 80);
  // Reopen without the initial Classic URL override to exercise saved settings.
  await page.goto(pathToFileURL(INDEX).href + '?paused=1'); await page.waitForFunction(() => EBS.app?.sim);
  assert.equal(await page.inputValue('#scenario'), 'marbleworks');
  assert.equal(await page.inputValue('#p-material'), 'mixed');
  await page.selectOption('#p-exportLength', 'duration');
  assert.equal(await page.locator('#durationText').isDisabled(), false);
  await page.selectOption('#p-exportLength', 'order');
  assert.equal(await page.locator('#durationText').isDisabled(), true);
  assert.match(await page.textContent('#durationHint'), /Produktionsdauer|Auftrag/);
  await page.click('#btnShortPreset');
  assert.equal(await page.inputValue('#scenario'), 'marbleworks');
  assert.equal(await page.inputValue('#p-orderSize'), '24');
  await page.selectOption('#scenario', 'marble');
  assert.ok(await page.locator('#stat-cycles').count());
  assert.equal(await page.locator('#p-orderSize').count(), 0);
  assert.equal(await page.locator('#p-factoryMode').count(), 0);
  assert.equal(await page.evaluate(() => EBS.app.sim.L.land), false);
  assert.deepEqual(errors, []);
});

for (const tempo of [1, .64]) test(`Progressive export: natural length includes the complete order and finale at tempo ${tempo}`, async t => {
  const { page } = await openExportPage(browser, config({ exportLength: 'order', orderSize: 24, productionSpeed: 2, intensity: 2 }, { tempo }));
  t.after(() => page.close());
  assert.equal(await page.evaluate(() => exportAPI.info().naturalDuration), true);
  let plan;
  do { plan = await page.evaluate(() => exportAPI.planEpisode()); } while (!plan.done);
  const result = await page.evaluate(s => exportAPI.simulate(s), plan.durationSec);
  assert.equal(result.complete, true); assert.ok(plan.durationSec - result.completedAt / tempo >= 12 / tempo - 1e-6);
  assert.ok(await page.evaluate(() => exportAPI.check().ok));
});
