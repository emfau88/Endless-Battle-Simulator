import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { INDEX, launchBrowser, openExportPage } from '../lib/browser.mjs';
import { exportVideo } from '../lib/exporter.mjs';

const dir = mkdtempSync(join(tmpdir(), 'ebs-territory-'));
let browser;
before(async () => { browser = await launchBrowser({ gpu: false }); });
after(async () => { await browser?.close(); rmSync(dir, { recursive: true, force: true }); });
const config = (video = {}, params = {}) => ({ scenario: 'territory', seed: 42, params,
  video: { aspect: '9:16', resolution: 720, fps: 30, durationSec: 3, tempo: .75, ...video } });
const settle = page => page.evaluate(() => new Promise(resolve => {
  let n = 4; const frame = () => --n ? requestAnimationFrame(frame) : resolve(); requestAnimationFrame(frame);
}));
async function live(t) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  t.after(() => context.close());
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(pathToFileURL(INDEX).href + '?scenario=territory&seed=42&paused=1');
  await page.waitForFunction(() => window.EBS?.app?.cfg.scenario === 'territory');
  await settle(page);
  return { page, errors };
}
const range = (page, id, value) => page.locator(id).evaluate((el, value) => {
  el.value = String(value); el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change'));
}, value);

test('Territory: 0,25/0,75/2× bewahren Simulation und vollständige Ereignisse bei 30/60 fps', async () => {
  for (const tempo of [.25, .75, 2]) {
    const { page, errors, info } = await openExportPage(browser, config({ tempo }));
    try {
      assert.equal(info.cfg.video.tempo, tempo); assert.equal(info.supportsClips, false);
      const render = () => page.evaluate(() => {
        const frames = exportAPI.renderFrames(12, 1, 'image/png');
        return { hash: exportAPI.hash(), events: exportAPI.events(0), frame: frames.at(-1), snapshot: exportAPI.snapshot() };
      });
      const thirty = await render();
      await page.evaluate(() => exportAPI.restart());
      assert.deepEqual(await render(), thirty, 'identisches Frameraster reproduziert Bild, Zustand und Tonereignisse');
      await page.evaluate(() => { exportAPI.restart({ video: { fps: 60 } }); exportAPI.renderFrames(24); });
      assert.equal(await page.evaluate(() => exportAPI.hash()), thirty.hash);
      assert.deepEqual(await page.evaluate(() => exportAPI.events(0)), thirty.events);
      await page.evaluate(() => { exportAPI.restart({ video: { fps: 30 } }); exportAPI.simulate(.4); });
      assert.equal(await page.evaluate(() => exportAPI.hash()), thirty.hash, 'Rendern beeinflusst die Simulation nicht');
      assert.equal((await page.evaluate(() => exportAPI.check())).ok, true);
      assert.ok(thirty.frame.length > 10000, 'Capture enthält die gezeichnete Welt');
      assert.deepEqual(errors.map(e => e.message), []);
    } finally { await page.close(); }
  }
  await assert.rejects(exportVideo(config(), { out: join(dir, 'forbidden-clip.mp4'), gpu: false,
    clip: { startSec: 0, durationSec: 1 } }), /noch nicht freigegeben/);
});

test('Territory: Ausgabeformat erhält die laufende Welt; nur Karte anwenden erzeugt die gewählte Kartenform', async t => {
  const { page, errors } = await live(t);
  const before = await page.evaluate(() => {
    const s = EBS.app.session;
    for (let i = 0; i < 600; i++) s.step();
    s.render();
    window.territoryBefore = { sim: s.sim, round: s.sim.roundSim, renderer: s.renderer, view: s.renderer.hexView };
    return { hash: s.sim.stateHash(), layout: s.cfg.params.layout, aspect: s.cfg.video.aspect };
  });
  const target = before.aspect === '9:16' ? '16:9' : '9:16';
  await page.click(`#segFormat button[data-v="${target}"]`); await settle(page);
  assert.deepEqual(await page.evaluate(() => {
    const s = EBS.app.session, old = window.territoryBefore;
    return { sim: s.sim === old.sim, round: s.sim.roundSim === old.round, renderer: s.renderer === old.renderer,
      view: s.renderer.hexView === old.view, worldMatches: s.sim.world === s.world,
      hash: s.sim.stateHash(), layout: s.cfg.params.layout };
  }), { sim: true, round: true, renderer: true, view: true, worldMatches: true, hash: before.hash, layout: before.layout });
  const layout = before.layout === 'portrait' ? 'landscape' : 'portrait';
  await page.selectOption('#p-layout', layout); await settle(page);
  assert.equal(await page.evaluate(() => EBS.app.sim.stateHash()), before.hash, 'Auswahl allein wendet die Karte nicht an');
  assert.equal(await page.evaluate(() => EBS.app.cfg.params.layout), before.layout, 'gespeichert bleibt die tatsächlich laufende Karte');
  await page.click('#p-layout-apply'); await settle(page);
  assert.deepEqual(await page.evaluate(() => ({ changed: EBS.app.sim !== window.territoryBefore.sim,
    ticks: EBS.app.sim.roundSim.ticks, layout: EBS.app.sim.roundSim.config.layout, aspect: EBS.app.cfg.video.aspect })),
  { changed: true, ticks: 0, layout, aspect: target });
  assert.deepEqual(errors, []);
});

test('Territory: Filmtempo, Kamera, Anzeige und Regeln überstehen JSON-Speichern/Laden vollständig', async t => {
  const { page, errors } = await live(t);
  await page.evaluate(() => { window.territoryProfileSim = EBS.app.sim; });
  for (const [profile, values] of [['intense', [1, 1.3, .8, 2.5, 2.2]], ['calm', [.75, .8, .25, 6, 2.8]], ['balanced', [.75, 1, .5, 4, 2.5]]]) {
    await page.selectOption('#p-profile', profile);
    assert.deepEqual(await page.evaluate(() => {
      const c = EBS.app.cfg;
      return [c.video.tempo, c.params.incomeMultiplier, c.params.aggression, c.params.offensiveInterval, c.params.marchDuration];
    }), values, 'Originalprofil ' + profile);
    assert.equal(await page.evaluate(() => EBS.app.sim === window.territoryProfileSim), true, 'Profilwechsel konfiguriert die laufende Welt');
  }
  await range(page, '#filmTempo', .75);
  await range(page, '#p-cameraAzimuth', .4); await range(page, '#p-cameraElevation', 1.2); await range(page, '#p-cameraZoom', 1.3);
  await page.selectOption('#p-cameraMode', 'top');
  for (const key of ['cameraAzimuth', 'cameraElevation']) assert.equal(await page.isDisabled('#p-' + key), true);
  await page.selectOption('#p-cameraMode', 'perspective');
  for (const key of ['cameraAzimuth', 'cameraElevation']) assert.equal(await page.isDisabled('#p-' + key), false);
  await page.selectOption('#p-cameraMode', 'top');
  await page.selectOption('#p-garrisonMode', 'always');
  for (const id of ['highQuality', 'showFactions', 'showClock', 'showWinner', 'repeatRounds']) await page.uncheck('#p-' + id);
  for (const [id, value] of [['incomeMultiplier', 1.4], ['aggression', .8], ['offensiveInterval', 6], ['marchDuration', 3.2], ['endPauseSec', 5]]) {
    await range(page, '#p-' + id, value);
  }
  await range(page, '#vol-master', 80);
  const expected = await page.evaluate(() => EBS.app.cfg);
  assert.equal(expected.video.tempo, .75); assert.equal(expected.video.volume.master, 80);
  const changed = { cameraMode: 'top', cameraAzimuth: .4, cameraElevation: 1.2, cameraZoom: 1.3,
    garrisonMode: 'always', highQuality: false, showFactions: false, showClock: false, showWinner: false,
    repeatRounds: false, incomeMultiplier: 1.4, aggression: .8, offensiveInterval: 6, marchDuration: 3.2, endPauseSec: 5 };
  for (const [key, value] of Object.entries(changed)) assert.equal(expected.params[key], value, key + ' aus Oberfläche');
  assert.equal(expected.params.profile, 'custom', 'abweichende Regeln werden als eigene Einstellungen gespeichert');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#btnSaveCfg')]);
  const file = join(dir, 'territory-settings.json'); await download.saveAs(file);
  assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), expected);
  await page.selectOption('#scenario', 'naval'); await page.setInputFiles('#cfgFile', file);
  await page.waitForFunction(() => EBS.app.cfg.scenario === 'territory'); await settle(page);
  assert.deepEqual(await page.evaluate(() => EBS.app.cfg), expected);
  assert.equal(await page.inputValue('#filmTempo'), '0.75');
  assert.equal(await page.inputValue('#p-cameraZoom'), '1.3'); assert.equal(await page.isChecked('#p-showWinner'), false);
  const hash = await page.evaluate(() => EBS.app.sim.stateHash());
  await range(page, '#filmTempo', 2); await settle(page);
  assert.equal(await page.evaluate(() => EBS.app.cfg.video.tempo), 2);
  assert.equal(await page.evaluate(() => EBS.app.sim.roundSim.ticks), 0, 'Tempoänderung simuliert keine verdeckte Echtzeitschleife');
  assert.ok(hash);
  await page.selectOption('#scenario', 'naval');
  assert.equal(await page.locator('#filmTempo').count(), 0, 'bestehende Szenarien behalten ihre segmentierte Tempoauswahl');
  assert.deepEqual(await page.locator('#segSpeed button').evaluateAll(nodes => nodes.map(n => n.dataset.v)), ['0.64', '0.8', '1', '2', '5', '10']);
  assert.deepEqual(errors, []);
});

test('Territory: Pause hält die Simulation an, Fortsetzen bleibt reproduzierbar', async t => {
  const { page, errors } = await live(t);
  const state = () => page.evaluate(() => ({ hash: EBS.app.sim.stateHash(), step: EBS.app.sim.step }));
  const paused = await state(); await settle(page); assert.deepEqual(await state(), paused);
  await page.click('#btnPlay'); await page.waitForFunction(() => EBS.app.sim.step >= 12);
  await page.click('#btnPlay'); await settle(page);
  const resumed = await state(); assert.ok(resumed.step >= 12); await settle(page); assert.deepEqual(await state(), resumed);
  const replay = await page.evaluate(() => {
    const s = EBS.app.session, cfg = s.cfg;
    const replay = EBS.getScenario('territory').create({ seed: cfg.seed, params: cfg.params, world: s.world, view: cfg.view, timeScale: cfg.video.tempo });
    for (let i = 0; i < s.sim.step; i++) replay.stepOnce();
    const result = { same: replay.stateHash() === s.sim.stateHash(), events: JSON.stringify(replay.events) === JSON.stringify(s.sim.events) };
    replay.destroy(); return result;
  });
  assert.deepEqual(replay, { same: true, events: true }); assert.deepEqual(errors, []);
});

test('Territory: Welt, Beschriftungen, Fraktionen, Uhr und Sieger liegen gemeinsam auf der Capture-Textur', async t => {
  const { page, errors } = await live(t);
  const result = await page.evaluate(() => {
    const s = EBS.app.session, r = s.renderer, originalText = CanvasRenderingContext2D.prototype.fillText;
    const texts = [], images = [], originalDraw = r.ctx.drawImage;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) { texts.push(String(text)); return originalText.call(this, text, ...args); };
    r.ctx.drawImage = function (image, ...args) { images.push(image); return originalDraw.call(this, image, ...args); };
    try {
      for (let i = 0; i < 600; i++) s.step();
      const before = s.sim.stateHash(); s.render(); s.render(); const after = s.sim.stateHash();
      const normal = { before, after, texts: [...texts], world: images.includes(r.worldCanvas), labels: images.includes(r.labelCanvas),
        uploaded: r.texture.source.resource === r.canvas, pixels: r.canvas.toDataURL().length,
        presentation: r.presentationState() };
      // Pure simulation reaches a real result; only its result image is drawn.
      // This does not create a long film or alter the rules to force a winner.
      const cfg = s.cfg, fixture = EBS.getScenario('territory').create({ seed: 7, params: cfg.params, world: s.world, view: cfg.view, timeScale: 2 });
      while (fixture.phase === 'running' && fixture.step < 36000) fixture.stepOnce();
      const resultPhase = fixture.roundSim.phase;
      const view = EBS.getScenario('territory').createRenderer({ sim: fixture, world: s.world, view: cfg.view, renderScale: .25, video: cfg.video });
      texts.length = 0; view.draw(); const winner = [...texts]; view.destroy(); fixture.destroy();
      return { normal, winner, resultPhase };
    } finally { CanvasRenderingContext2D.prototype.fillText = originalText; r.ctx.drawImage = originalDraw; }
  });
  assert.equal(result.normal.before, result.normal.after, 'Rendern verändert weder RNG noch Regeln oder Entscheidungen');
  assert.equal(result.normal.world, true); assert.equal(result.normal.labels, true); assert.equal(result.normal.uploaded, true);
  assert.ok(result.normal.pixels > 10000); assert.ok(result.normal.presentation);
  const overlay = result.normal.presentation.overlay;
  assert.ok(overlay.garrisonTileIds.length >= 4, 'Garnisonen liegen auf dem Beschriftungscanvas');
  assert.ok(overlay.movementLabelIds.length > 0 && overlay.routeMoveIds.length > 0, 'Marschstärken und Routen sind gezeichnet');
  assert.deepEqual(overlay.movementLabelIds, overlay.routeMoveIds, 'hervorgehobene Märsche behalten Stärke und Route');
  for (const name of ['AZUR', 'EMBER', 'JADE', 'SOLAR']) assert.ok(result.normal.texts.some(text => text.includes(name)), name + ' im Capture-HUD');
  assert.ok(result.normal.texts.some(text => /\d{2}:\d{2}/.test(text)), 'Uhr im Capture-HUD');
  assert.equal(result.resultPhase, 'finished', 'reiner Simulationsvorlauf erreicht den natürlichen Sieger');
  assert.ok(result.winner.some(text => /AZUR|EMBER|JADE|SOLAR/.test(text)) && result.winner.some(text => /SIEG|WIN|vereint/i.test(text)), 'Sieger im Capture-HUD');
  assert.deepEqual(errors, []);
});
