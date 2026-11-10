// Simulationstests (laufen im echten Chromium, aber ohne Rendering – deshalb schnell).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launchBrowser, openExportPage } from '../lib/browser.mjs';

let browser;
before(async () => { browser = await launchBrowser({ gpu: false }); });
after(async () => { await browser?.close(); });

const sim = async (cfg = {}) => (await openExportPage(browser, { seed: 42, ...cfg })).page;
const run = (page, sec) => page.evaluate((s) => window.exportAPI.simulate(s), sec);
const check = (page) => page.evaluate(() => window.exportAPI.check());
const hash = (page) => page.evaluate(() => window.exportAPI.hash());

test('Kugeln bleiben im geschlossenen Kreislauf (10 Minuten, Prüfung alle 15 s)', async () => {
  const page = await sim();
  let s;
  for (let i = 0; i < 40; i++) {
    s = await run(page, 15);
    const c = await check(page);
    assert.ok(c.ok, c.errors.join('; '));
    assert.equal(s.ballsTotal, s.ballsExpected, 'Kugelanzahl hat sich verändert');
    assert.equal(s.inFlight + s.inRecycle + s.inMag, s.ballsExpected);
    // jeder abgefeuerte Schuss ist entweder unterwegs, im Recycling oder schon zurück im Magazin
    assert.equal(s.shots - s.recycled, s.inFlight + s.inRecycle, 'Bilanz Schüsse/Recycling stimmt nicht');
    // jede Kugel, die nicht mehr fliegt, hat das Wasser erreicht
    assert.equal(s.splashes, s.shots - s.inFlight, 'Kugel hat Flugphase ohne Wasserkontakt verlassen');
  }
  assert.ok(s.shots > 1000, `zu wenige Schüsse: ${s.shots}`);
  assert.ok(s.recycled > s.shots - s.ballsExpected - 1, 'Kugeln kommen nicht zurück');
  await page.close();
});

test('Treffer und Wasserkollisionen funktionieren zuverlässig', async () => {
  const page = await sim({ seed: 3 });
  const s = await run(page, 300);
  const ratio = s.hits / s.shots;
  assert.ok(s.hits > 200, `zu wenige Treffer: ${s.hits}`);
  assert.ok(ratio > 0.35 && ratio < 0.95, `unplausible Trefferquote ${ratio.toFixed(2)}`);
  assert.ok(s.splashes > s.shots * 0.95, 'zu wenige Wasserkontakte');
  assert.ok(s.ships.every((x) => x.hitsTaken > 50), 'ein Schiff wird kaum getroffen');
  assert.ok(s.forced < s.shots * 0.02, `zu viele Notfall-Rückführungen: ${s.forced}`);
  await page.close();
});

test('Schaden wächst langsam, bleibt begrenzt; Speicher und Objektzahl bleiben stabil (60 Minuten)', async () => {
  const page = await sim();
  const heap0 = await page.evaluate(() => window.exportAPI.heap());
  const at = {};
  let prev = 0;
  for (const m of [1, 5, 10, 30, 60]) {
    at[m] = await run(page, (m - prev) * 60); prev = m;
    const c = await check(page);
    assert.ok(c.ok, `${m} min: ${c.errors.join('; ')}`);
    assert.ok(at[m].inFlight <= at[m].ballsExpected);
    assert.ok(at[m].particlesActive <= at[m].particleCap);
  }
  const d = (m) => Math.max(...at[m].ships.map((x) => x.damage));
  const dMin = (m) => Math.min(...at[m].ships.map((x) => x.damage));
  console.log('  Schaden (max) nach 1/5/10/30/60 min:', [1, 5, 10, 30, 60].map((m) => (d(m) * 100).toFixed(1) + ' %').join(' / '));
  assert.ok(dMin(1) > 0 && d(1) < 0.08, `nach 1 min: ${d(1)}`);
  assert.ok(d(5) > d(1) && d(10) > d(5) && d(30) > d(10), 'Schaden wächst nicht stetig');
  assert.ok(d(30) < 0.65, `nach 30 min zu hoch: ${d(30)}`);
  assert.ok(d(60) < 0.85, `nach 60 min zu hoch: ${d(60)}`);
  assert.ok(at[60].ships.every((x) => x.health > 0.15), 'Schiff fast zerstört');
  const holes = (m) => Math.min(...at[m].ships.map((x) => x.holes));
  assert.ok(holes(10) > holes(1) && holes(60) >= holes(10), 'sichtbare Schäden nehmen nicht zu');
  assert.ok(at[60].shots > 8000, 'Simulation läuft nach langer Zeit nicht mehr');
  const heap1 = await page.evaluate(() => window.exportAPI.heap());
  if (heap0 && heap1) {
    const growMB = (heap1 - heap0) / 1048576;
    console.log(`  JS-Heap: ${(heap0 / 1048576).toFixed(1)} MB -> ${(heap1 / 1048576).toFixed(1)} MB`);
    assert.ok(growMB < 30, `Heap wächst um ${growMB.toFixed(1)} MB`);
  }
  await page.close();
});

test('Gleicher Seed => identischer Ablauf, anderer Seed => anderer Ablauf', async () => {
  const a = await sim({ seed: 1234 }), b = await sim({ seed: 1234 }), c = await sim({ seed: 1235 });
  await Promise.all([run(a, 180), run(b, 180), run(c, 180)]);
  const [ha, hb, hc] = await Promise.all([hash(a), hash(b), hash(c)]);
  assert.equal(ha, hb, 'zwei Läufe mit gleichem Seed unterscheiden sich');
  assert.notEqual(ha, hc, 'unterschiedliche Seeds ergeben denselben Ablauf');
  // Neustart in derselben Seite (Matter-interne Zähler werden zurückgesetzt)
  await a.evaluate(() => window.exportAPI.restart({ seed: 1234 }));
  await run(a, 180);
  assert.equal(await hash(a), ha, 'Neustart in derselben Seite weicht ab');
  await Promise.all([a.close(), b.close(), c.close()]);
});

test('Rendering beeinflusst die Physik nicht', async () => {
  const a = await sim({ seed: 77 }), b = await sim({ seed: 77 });
  await a.evaluate(() => window.exportAPI.renderFrames(150, 0.5)); // 5 s mit Rendering (30 fps)
  await run(b, 5);                                                  // 5 s ohne Rendering
  assert.equal(await hash(a), await hash(b));
  await Promise.all([a.close(), b.close()]);
});

for (const cfg of [
  { ships: 3, cannons: 3 }, { ships: 4, cannons: 2 }, { cannons: 1 }, { cannons: 6, fireRate: 3 },
  { format: 'landscape', intensity: 1, projectileSpeed: 1.6 }, { projectileSpeed: 0.8, fireRate: 0.25, intensity: 0 },
]) {
  test(`Konfiguration ${JSON.stringify(cfg)} bleibt stabil (10 Minuten)`, async () => {
    const page = await sim({ seed: 9, ...cfg });
    const s = await run(page, 600);
    const c = await check(page);
    assert.ok(c.ok, c.errors.join('; '));
    assert.ok(s.shots > 20, `keine Schüsse: ${s.shots}`);
    assert.equal(s.shots - s.recycled, s.inFlight + s.inRecycle);
    assert.ok(s.ships.every((x) => x.damage <= 0.9 + 1e-9));
    if (cfg.intensity === 0) assert.ok(s.ships.every((x) => x.damage === 0));
    await page.close();
  });
}

test('Zeitlupe (tempo 0.8): kleinerer Zeitschritt, Kreislauf bleibt geschlossen, Treffer funktionieren (5 Minuten)', async () => {
  const page = await sim({ seed: 3, video: { tempo: 0.8 } });
  assert.equal((await page.evaluate(() => window.exportAPI.config())).video.tempo, 0.8);
  const s = await run(page, 300);
  const c = await check(page);
  assert.ok(c.ok, c.errors.join('; '));
  assert.equal(s.ballsTotal, s.ballsExpected);
  assert.equal(s.shots - s.recycled, s.inFlight + s.inRecycle);
  assert.ok(s.hits > 100 && s.hits / s.shots > 0.3, `Treffer ${s.hits}/${s.shots}`);
  // 300 s Video entsprechen 240 s Simulationszeit
  assert.equal(s.step, 300 * 60);
  assert.ok(Math.abs(s.t - 240) < 1e-6, `Simulationszeit ${s.t}`);
  await page.close();
});
