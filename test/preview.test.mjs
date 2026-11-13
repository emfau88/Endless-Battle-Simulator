// A paused live preview must release the renderer without hiding subsequent UI changes.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { INDEX, launchBrowser } from '../lib/browser.mjs';

let browser;
before(async () => { browser = await launchBrowser({ gpu: false }); });
after(async () => { await browser?.close(); });

const settle = page => page.evaluate(() => new Promise(resolve => {
  let frames = 4;
  const next = () => --frames ? requestAnimationFrame(next) : resolve();
  requestAnimationFrame(next);
}));
const state = page => page.evaluate(() => ({
  renders: window.previewRenders, hash: EBS.app.sim.stateHash(), time: EBS.app.sim.t,
}));

test('Pausierte Vorschau ruht; Regler, Ansicht, Dauer und Neustarts bleiben sichtbar; Fortsetzen läuft weiter', async t => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  t.after(() => ctx.close());
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(INDEX).href + '?scenario=pyramid&seed=42&paused=1&durationSec=600');
  await page.waitForFunction(() => window.EBS?.app?.sim);
  await settle(page);
  await page.evaluate(() => {
    const session = EBS.app.session, render = session.render.bind(session);
    window.previewRenders = 0;
    session.render = () => { window.previewRenders++; render(); };
    window.previewSim = session.sim;
  });
  const idle = await state(page);
  await settle(page);
  assert.deepEqual(await state(page), idle, 'Pause darf weder zeichnen noch die Physik weiterrechnen');

  const changed = async action => {
    const before = await page.evaluate(() => window.previewRenders);
    await action();
    await page.waitForFunction(n => window.previewRenders > n, before);
    await settle(page);
    const stopped = await state(page);
    await settle(page);
    assert.deepEqual(await state(page), stopped, 'nach einer Änderung muss die pausierte Vorschau wieder ruhen');
  };
  const canvas = page.locator('#stage canvas');
  const orbs = await canvas.screenshot();
  await changed(() => page.selectOption('#p-figure', '1'));
  assert.equal(await page.evaluate(() => EBS.app.sim === window.previewSim), true, 'Darstellung ohne Simulationsneustart');
  assert.equal((await state(page)).hash, idle.hash);
  assert.equal((await state(page)).time, idle.time);
  assert.ok(!orbs.equals(await canvas.screenshot()), 'Figurenwechsel muss auch in Pause im Bild ankommen');

  const withHud = await canvas.screenshot();
  await changed(() => page.uncheck('#hud'));
  assert.ok(!withHud.equals(await canvas.screenshot()), 'HUD wird in Pause ausgeblendet');
  await changed(() => page.uncheck('#camera'));

  // Advance simulation only, then compare the same moment with two day lengths.
  await page.evaluate(() => {
    for (let i = 0; i < 60 * EBS.PHYS_HZ; i++) EBS.app.session.step();
    EBS.app.session.render();
  });
  const longDay = await canvas.screenshot(), beforeDuration = await state(page);
  await changed(async () => {
    await page.fill('#durationText', '300s');
    await page.dispatchEvent('#durationText', 'change');
  });
  assert.equal((await state(page)).hash, beforeDuration.hash, 'Videodauer startet die Simulation nicht neu');
  assert.ok(!longDay.equals(await canvas.screenshot()), 'die neue Tageslänge wird bei gleicher Simulationszeit gezeichnet');

  await changed(() => page.click('#btnRestart'));
  assert.equal(await page.evaluate(() => EBS.app.sim === window.previewSim), false);
  assert.equal((await state(page)).time, idle.time);
  await changed(() => page.click('#segFormat button[data-v="16:9"]'));
  assert.deepEqual(await canvas.evaluate(el => [el.width, el.height]), [1920, 1080]);
  await changed(() => page.setViewportSize({ width: 1100, height: 800 }));

  const imported = { scenario: 'pyramid', seed: 731, params: { figure: 0 }, video: { aspect: '9:16', durationSec: 600 } };
  await changed(() => page.setInputFiles('#cfgFile', {
    name: 'preview.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imported)),
  }));
  assert.deepEqual(await page.evaluate(() => [EBS.app.cfg.seed, EBS.app.cfg.params.figure, EBS.app.cfg.video.aspect]), [731, 0, '9:16']);
  assert.deepEqual(await canvas.evaluate(el => [el.width, el.height]), [1080, 1920]);
  await changed(() => page.click('#btnShortPreset'));
  assert.equal(await page.evaluate(() => EBS.app.cfg.video.durationSec), 60);
  await changed(() => page.selectOption('#scenario', 'marble'));
  assert.equal(await page.evaluate(() => EBS.app.cfg.scenario), 'marble');

  const paused = await state(page);
  await page.click('#btnPlay');
  await page.waitForFunction(time => EBS.app.sim.t > time, paused.time);
  await page.click('#btnPlay');
  await settle(page);
  const resumed = await state(page);
  assert.ok(resumed.renders > paused.renders && resumed.time > paused.time, 'Fortsetzen zeichnet und simuliert');
  await settle(page);
  assert.deepEqual(await state(page), resumed, 'erneute Pause hält Bild und Simulation an');
  assert.deepEqual(errors, []);
});

test('Myzel: ein einzelnes Pausenbild aktualisiert auch bereits zwischengespeicherte Hyphenfarben und Leuchten', async t => {
  const ctx = await browser.newContext();
  t.after(() => ctx.close());
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(INDEX).href + '?scenario=mycelium&seed=42&paused=1&hud=false');
  await page.waitForFunction(() => window.EBS?.app?.sim);
  await settle(page);
  const prepared = await page.evaluate(() => {
    const session = EBS.app.session;
    for (let i = 0; i < 4 * EBS.PHYS_HZ; i++) session.step();
    window.previewSim = session.sim;
    const render = session.render.bind(session);
    window.previewRenders = 0;
    session.render = () => { window.previewRenders++; render(); };
    for (let i = 0; i < 40 && session.renderer.cache.prevCut <= 0; i++) session.render();
    return { segments: session.sim.NS, cached: session.renderer.cache.prevCut > 0 };
  });
  assert.ok(prepared.segments > 10 && prepared.cached, 'die Probe enthält gewachsene, bereits gecachte Hyphen');
  const initial = await state(page);

  for (const [key, value] of [['palette', 'warm'], ['glow', '0.3']]) {
    const before = await page.evaluate(() => ({
      renders: window.previewRenders, pixels: EBS.app.session.renderer.canvas.toDataURL(),
    }));
    if (key === 'palette') await page.selectOption('#p-palette', value);
    else await page.locator('#p-glow').evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input')); }, value);
    await page.waitForFunction(n => window.previewRenders > n, before.renders);
    await settle(page);
    const result = await page.evaluate(oldPixels => {
      const session = EBS.app.session, actual = session.renderer.canvas.toDataURL();
      // A freshly drawn reference has no stale cached colours. Compare all pixels, not just recoloured tips/HUD.
      const fresh = EBS.getScenario('mycelium').createRenderer({
        sim: session.sim, world: session.world, renderScale: session.renderScale, view: session.view,
      });
      try {
        fresh.draw();
        return { changed: actual !== oldPixels, current: actual === fresh.canvas.toDataURL(), sameSim: session.sim === window.previewSim };
      } finally { fresh.destroy(); }
    }, before.pixels);
    assert.deepEqual(result, { changed: true, current: true, sameSim: true }, `${key}: ein Bild muss die vollständige neue Darstellung zeigen`);
    const after = await state(page);
    assert.equal(after.renders, before.renders + 1, 'genau ein neues Live-Bild');
    assert.equal(after.hash, initial.hash); assert.equal(after.time, initial.time);
    await settle(page);
    assert.deepEqual(await state(page), after, 'keine laufende Renderlast nach der Änderung');
    // Fill both caches again before the next independent appearance change.
    await page.evaluate(() => {
      const session = EBS.app.session;
      for (let i = 0; i < 40 && session.renderer.cache.prevCut <= 0; i++) session.render();
    });
  }
  assert.deepEqual(errors, []);
});
