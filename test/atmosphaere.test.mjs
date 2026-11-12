// Seeschlacht: Himmelsverlauf, seltene Ereignisse (Sternschnuppe, Wal) und goldene Kugel – reine Darstellung, an die
// Videolänge gekoppelt, einzeln schalt- und einstellbar; der Physikverlauf bleibt unverändert.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { INDEX, launchBrowser, openExportPage } from '../lib/browser.mjs';

let browser;
before(async () => { browser = await launchBrowser({ gpu: false }); });
after(async () => { await browser?.close(); });

const OFF = { goldenBall: false, sky: false, meteors: false, whales: false };

test('Standardwerte und Grenzen: alles an, Morgengrauen automatisch, Sternschnuppe ≈ 75 s, Wal ≈ 3½ min', async () => {
  const { page } = await openExportPage(browser, { seed: 1 });
  const r = await page.evaluate(() => [
    EBS.normalizeConfig({}).params,
    EBS.normalizeConfig({ params: { skyMinutes: 999, meteorEvery: 1, whaleEvery: 99999, goldenBall: 'false', sky: 0 } }).params,
    EBS.normalizeConfig({ meteors: 'false', whaleEvery: '120' }).params,
  ]);
  const pick = (p) => ['goldenBall', 'sky', 'skyMinutes', 'meteors', 'meteorEvery', 'whales', 'whaleEvery'].map((k) => p[k]);
  assert.deepEqual(pick(r[0]), [true, true, 0, true, 75, true, 210]);
  assert.deepEqual(pick(r[1]), [false, false, 240, true, 20, true, 1800]);
  assert.deepEqual([r[2].meteors, r[2].whaleEvery], [false, 120], 'flache Angabe (Teilen-Link) wird übernommen');
  await page.close();
});

test('Fahrplan je Videolänge: Short hat eine Sternschnuppe und keinen Wal, 10 Minuten haben mehrere von beiden', async () => {
  const { page } = await openExportPage(browser, { seed: 1 });
  const plan = (seed, params, dur) => page.evaluate(([s, p, d]) => {
    const sc = EBS.getScenario('naval'), q = EBS.normalizeConfig({ params: p }).params, e = sc.eventPlan(s, q, d);
    return { m: e.meteors.filter((x) => x.t < d).map((x) => x.t), w: e.whales.filter((x) => x.t < d).map((x) => x.t) };
  }, [seed, params, dur]);
  for (const seed of [1, 42, 2024, 777]) {
    const short = await plan(seed, {}, 20);
    assert.ok(short.m.some((t) => t > 2 && t < 18), `Seed ${seed}: keine Sternschnuppe im 20-s-Short (${short.m})`);
    assert.equal(short.w.length, 0, `Seed ${seed}: Wal im Short, obwohl er selten sein soll`);
    const long = await plan(seed, {}, 600);
    assert.ok(long.m.length >= 5 && long.m.length <= 14, `Seed ${seed}: ${long.m.length} Sternschnuppen in 10 Minuten`);
    assert.ok(long.w.length >= 2 && long.w.length <= 4, `Seed ${seed}: ${long.w.length} Wale in 10 Minuten`);
  }
  assert.deepEqual(await plan(42, {}, 600), await plan(42, {}, 600), 'Fahrplan nicht reproduzierbar');
  assert.deepEqual(await plan(42, { meteors: false, whales: false }, 600), { m: [], w: [] }, 'abgeschaltet, aber Ereignisse geplant');
  assert.ok((await plan(42, { whaleEvery: 30 }, 20)).w.length >= 1, 'häufiger gestellter Wal erscheint auch im Short');
  const often = await plan(42, { meteorEvery: 20 }, 600), rare = await plan(42, { meteorEvery: 300 }, 600);
  assert.ok(often.m.length > 3 * rare.m.length, `Häufigkeit wirkt nicht: ${often.m.length} gegen ${rare.m.length}`);
  // Himmelsverlauf: Morgengrauen am Ende eines langen Videos, im Short praktisch keine Änderung
  const sky = await page.evaluate(() => {
    const f = EBS.getScenario('naval').skyProgress, p = EBS.normalizeConfig({}).params;
    return [f(p, 600, 600), f(p, 20, 20), f(p, 1800, 3600), f({ ...p, skyMinutes: 5 }, 300, 20), f({ ...p, sky: false }, 600, 600)];
  });
  assert.ok(sky[0] > 0.999 && sky[1] < 0.01 && Math.abs(sky[2] - 0.5) < 1e-9 && sky[3] > 0.999 && sky[4] === 0, `Himmelsverlauf: ${sky}`);
  await page.close();
});

test('Goldene Kugel: fliegt auch im Short mehrmals, wird gezählt; Schalter ändern den Physikverlauf nicht', async () => {
  const run = async (params) => {
    const { page } = await openExportPage(browser, { seed: 42, params, video: { durationSec: 20 } });
    const g20 = (await page.evaluate(() => window.exportAPI.simulate(20))).golden;
    const s = await page.evaluate(() => window.exportAPI.simulate(100));
    const h = await page.evaluate(() => window.exportAPI.hash());
    await page.close();
    return { g20, g: s.golden, shots: s.shots, h };
  };
  const on = await run({}), off = await run(OFF);
  assert.ok(on.g20.fired >= 2, `goldene Kugel in 20 s nur ${on.g20.fired}× abgefeuert`);
  assert.ok(on.g.fired >= 8 && on.g.fired < on.shots / 4, `goldene Kugel in 120 s ${on.g.fired}× von ${on.shots} Schüssen`);
  assert.equal(on.h, off.h, 'Atmosphäre oder goldene Kugel verändern den Physikverlauf');
});

test('Darstellung: Morgengrauen, Sternschnuppe, Wal und goldene Kugel rendern fehlerfrei in beiden Formaten', async () => {
  for (const aspect of ['9:16', '16:9']) {
    const { page, errors } = await openExportPage(browser, { seed: 42, params: { whaleEvery: 30, meteorEvery: 20 }, video: { aspect, resolution: 720, durationSec: 60 } });
    const plan = await page.evaluate(() => { const c = window.exportAPI.config(); return EBS.getScenario('naval').eventPlan(c.seed, c.params, 60); });
    const at = [plan.meteors[0].t + 0.3, plan.whales[0].t + 3, 59];
    let now = 0;
    for (const t of at.sort((a, b) => a - b)) {
      await page.evaluate((s) => window.exportAPI.simulate(s), t - now); now = t;
      const frames = await page.evaluate(() => window.exportAPI.renderFrames(2, 0.5));
      assert.equal(frames.length, 2);
    }
    assert.deepEqual(errors.map(String), [], `${aspect}: Fehler beim Rendern`);
    await page.close();
  }
});

test('Oberfläche: Schalter und Regler für Atmosphäre und goldene Kugel wirken sofort und bleiben gespeichert', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } }), page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const ready = () => page.waitForFunction(() => window.EBS && window.EBS.app && window.EBS.app.sim, null, { timeout: 30000 });
  const params = () => page.evaluate(() => {
    const p = window.EBS.app.cfg.params, s = window.EBS.app.sim.cfg;
    return ['goldenBall', 'sky', 'skyMinutes', 'meteors', 'meteorEvery', 'whales', 'whaleEvery'].map((k) => [p[k], s[k]]);
  });
  await page.goto(pathToFileURL(INDEX).href); await ready();
  assert.deepEqual(await params(), [[true, true], [true, true], [0, 0], [true, true], [75, 75], [true, true], [210, 210]]);
  await page.uncheck('#p-goldenBall'); await page.uncheck('#p-whales');
  await page.selectOption('#p-skyMinutes', '20');
  await page.fill('#p-meteorEvery', '40'); await page.dispatchEvent('#p-meteorEvery', 'input');
  assert.equal(await page.textContent('#o-meteorEvery'), '40 s');
  const want = [[false, false], [true, true], [20, 20], [true, true], [40, 40], [false, false], [210, 210]];
  assert.deepEqual(await params(), want, 'Änderung kommt nicht in der laufenden Simulation an');
  await page.reload(); await ready();
  assert.deepEqual(await params(), want, 'Einstellungen nach Neuladen verloren');
  assert.equal(await page.isChecked('#p-goldenBall'), false);
  assert.deepEqual(errors, []);
  await ctx.close();
});
