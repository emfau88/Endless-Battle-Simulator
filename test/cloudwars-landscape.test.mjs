import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { INDEX, launchBrowser, openExportPage } from '../lib/browser.mjs';
import { defaultFileName } from '../lib/exporter.mjs';

const preset = JSON.parse(await readFile(new URL('../presets/production/cloudwars-landscape.json', import.meta.url), 'utf8'));
let browser;
before(async () => { browser = await launchBrowser({ gpu: false }); });
after(async () => { await browser?.close(); });

test('Cloud-Menü, Produktionsvorlage, Kamera und Rückweg zu den bisherigen Abläufen', async t => {
  const page = await browser.newPage();
  t.after(() => page.close());
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(pathToFileURL(INDEX).href + '?scenario=cloudwars&seed=42&paused=1');
  await page.waitForFunction(() => window.EBS?.app?.sim);
  assert.deepEqual(await page.locator('#p-mode option').evaluateAll(opts => opts.map(o => o.value)), ['short', 'rounds', 'landscape']);
  await page.selectOption('#p-mode', 'landscape');
  const read = () => page.evaluate(() => EBS.app.cfg);
  assert.deepEqual(await read(), preset);
  assert.deepEqual(await page.evaluate(() => EBS.productionPreset('cloudwars', 'landscape', 42)), preset);
  assert.ok(await page.locator('#camera').isChecked());
  await page.uncheck('#camera');
  assert.equal((await read()).view.camera, false);
  await page.click('#btnLongPreset');
  assert.deepEqual(await read(), preset);
  await page.selectOption('#p-mode', 'rounds');
  assert.equal((await read()).params.mode, 'rounds');
  assert.ok(await page.locator('#camera').isDisabled());
  await page.selectOption('#p-mode', 'short');
  assert.equal((await read()).params.mode, 'short');
  await page.goto(pathToFileURL(INDEX).href + '?scenario=cloudwars&mode=landscape&seed=83&aspect=9:16&durationSec=480&paused=1');
  await page.waitForFunction(() => window.EBS?.app?.sim);
  const direct = await read();
  assert.deepEqual([direct.params.mode, direct.seed, direct.video.aspect, direct.video.durationSec, direct.view.camera],
    ['landscape', 83, '9:16', 480, true]);
  assert.match(defaultFileName(preset), /^cloudwars-landscape_seed42_/);
  assert.match(defaultFileName({ ...preset, params: { mode: 'rounds' } }), /^cloudwars_seed42_/);
  assert.deepEqual(errors, []);
});

test('Acht, neun und zehn Minuten erreichen mit jedem Seed alle fünf Orte und dieselbe Bahnlinie', async t => {
  const { page, errors } = await openExportPage(browser, preset);
  t.after(() => page.close());
  const runs = await page.evaluate(() => {
    const results = [];
    for (const [seed, durationSec, timeScale] of [[42, 480, 1], [83, 540, .8], [0, 600, .64]]) {
      const sim = new EBS.CloudLandscape.Simulation({ seed, video: { durationSec }, timeScale });
      const valley = sim.valley, places = EBS.CloudLandscape.places, visited = new Set();
      for (let second = 0; second < durationSec; second++) {
        for (let i = 0; i < 60; i++) sim.stepOnce();
        visited.add(sim.snapshot().region);
      }
      const world = { w: 1080, h: 1920 }, station = valley.train(.51), bridge = valley.train(.26);
      const start = valley.ferry(.92), finish = valley.ferry(1);
      results.push({ visited: [...visited], progress: sim.progress, ok: sim.checkInvariants().ok,
        cameraEnd: valley.camera(1, world).x,
        held: valley.camera(0, world, false).x === valley.camera(1, world, false).x,
        bridgeSeen: Math.abs(bridge.x - places.bridge) < 70 && Math.abs(bridge.y - valley.river(bridge.x)) < 45,
        stopped: station.x === places.town && valley.train(.47).x === station.x && valley.train(.55).x === station.x,
        ferryAfloat: valley.wet(start.x, start.y) && valley.wet(finish.x, finish.y) && finish.x > start.x + 200 });
    }
    return results;
  });
  for (const run of runs) {
    assert.deepEqual(run.visited, ['Mühlendorf','Flusswiesen und Bahnbrücke','Marktstadt','Altarm und Schilfinsel','Seehafen']);
    assert.equal(run.progress, 1); assert.equal(run.cameraEnd, 6800);
    for (const key of ['ok','held','bridgeSeen','stopped','ferryAfloat']) assert.equal(run[key], true, key);
  }
  assert.deepEqual(errors, []);
});

const digest = value => createHash('sha256').update(value, 'base64').digest('hex');
test('Hausformen, Gärten und Straßenverkehr gehören zum Seed und zur Straßenführung', async t => {
  const { page, errors } = await openExportPage(browser, preset);
  t.after(() => page.close());
  const rows = await page.evaluate(() => [42, 7, 83].map(seed => {
    const L = EBS.CloudLandscape, valley = new L.Valley(seed), x = L.places.town + 62;
    const homes = valley.houses.filter(h => h.urban && h.kind === 'home');
    const layouts = () => homes.map(h => [h.x, h.y, h.form, h.garden, h.face]);
    const a = valley.traffic.positions(270, 270), b = valley.traffic.positions(271, 270);
    const van = a.find(v => v.type === 'post'), moved = b.find(v => v.type === 'post');
    const bikes = a.filter(v => v.type === 'bike' && Math.abs(v.x - L.places.town) < 150);
    const plaza = valley.bank(L.places.town, -1) - 86;
    let crossesStalls = false;
    for (let sec = 0; sec <= 540; sec += 2) {
      for (const car of valley.traffic.positions(sec, 270, L.places.town-48, L.places.town+48)) {
        if (car.type !== 'bike' && Math.abs(car.x-L.places.town)<46 && Math.abs(car.y-plaza)<28) crossesStalls = true;
      }
    }
    return { homes: homes.length, forms: new Set(homes.map(h => h.form)).size, gardens: new Set(homes.map(h => h.garden)).size,
      oriented: homes.every(h => h.doorstep && Math.abs(h.face) === 1), signature: JSON.stringify(layouts()),
      onBridge: Math.abs(van.x-x) < 3 && Math.abs(van.y-valley.river(x)) < 1,
      moved: Math.hypot(moved.x-van.x, moved.y-van.y) > 8,
      towpath: bikes.some(bike => Math.abs(bike.y-(valley.bank(bike.x,-1)-9))<1), crossesStalls };
  }));
  for (const row of rows) {
    assert.ok(row.homes >= 20 && row.forms >= 5 && row.gardens >= 5);
    assert.ok(row.oriented && row.onBridge && row.moved && row.towpath);
    assert.equal(row.crossesStalls, false);
  }
  assert.equal(new Set(rows.map(r => r.signature)).size, rows.length);
  assert.deepEqual(errors, []);
});

for (const aspect of ['16:9','9:16']) {
  test('Bild nach Sprung über die Streifengrenzen entspricht der Wiedergabe in ' + aspect, async t => {
    const cfg = { ...preset, video: { ...preset.video, aspect, durationSec: 8, resolution: 720 } };
    const { page, errors } = await openExportPage(browser, cfg);
    t.after(() => page.close());
    const frame = () => page.evaluate(() => window.exportAPI.renderFrames(1, 1, 'image/png')[0]);
    // Der Zug erreicht in der kurzen Testdauer die Brücke nach gut zwei Sekunden.
    await page.evaluate(() => window.exportAPI.simulate(62 / 30));
    const jump = digest(await frame()), hash = await page.evaluate(() => window.exportAPI.hash());
    await page.evaluate(c => window.exportAPI.restart(c), cfg);
    await page.evaluate(() => { for (let i = 0; i < 62; i++) window.exportAPI.renderFrames(1, .2); });
    assert.equal(digest(await frame()), jump);
    assert.equal(await page.evaluate(() => window.exportAPI.hash()), hash);
    await page.evaluate(() => window.exportAPI.restart({ seed: 7 }));
    await page.evaluate(() => window.exportAPI.simulate(62 / 30));
    assert.notEqual(digest(await frame()), jump);
    assert.deepEqual(errors, []);
  });
}
