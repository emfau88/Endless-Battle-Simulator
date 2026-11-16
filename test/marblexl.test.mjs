// Tests für „Marble Factory XL“ (in Arbeit): bewegter Entwurf der Produktionslinie, Ablauf rein aus der Zeit.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launchBrowser, openExportPage } from '../lib/browser.mjs';

let browser;
before(async () => { browser = await launchBrowser({ gpu: false }); });
after(async () => { await browser?.close(); });

// 720p und kurze Bildfolgen: Die Halle wird ohne Grafikkarte gezeichnet, das kostet je Bild rund eine Sekunde.
// Die Vergleiche selbst sind unverändert streng (Zustand und Bild müssen exakt gleich sein).
const open = async (cfg = {}) => (await openExportPage(browser, { scenario: 'marblexl', seed: 42, ...cfg, video: { resolution: 720, ...(cfg.video || {}) } })).page;
const run = (page, sec) => page.evaluate((s) => window.exportAPI.simulate(s), sec);
const check = (page) => page.evaluate(() => window.exportAPI.check());
const hash = (page) => page.evaluate(() => window.exportAPI.hash());
const frame = (page) => page.evaluate(() => window.exportAPI.renderFrames(1, 1, 'image/png')[0]);

test('Linie läuft eine Minute: Kugeln in allen Zuständen, Zähler steigt, Tonereignisse entstehen', async () => {
  const page = await open();
  const start = await run(page, 2);
  const s = await run(page, 58);
  const c = await check(page);
  assert.ok(c.ok, c.errors.join('; '));
  assert.ok(s.done > start.done + 25, `Zähler steigt zu langsam: ${start.done} -> ${s.done}`);
  for (const kind of ['raw', 'washed', 'clear', 'color']) assert.ok(s[kind] > 0, `keine Kugel im Zustand ${kind}`);
  const events = await page.evaluate(() => window.exportAPI.events(0));
  const types = new Set(events.map((e) => e.type));
  for (const type of ['xlFeed', 'xlDrum', 'xlPolish', 'xlKiln', 'xlColour', 'xlColourDone', 'xlLift', 'xlRail', 'xlLand']) assert.ok(types.has(type), `Klang ${type} fehlt`);
  assert.ok(events.every((e, i) => e.seq === events[0].seq + i), 'Lücke in der Ereignisfolge');
  await page.close();
});

test('Gleiche Zeit ergibt denselben Zustand; Zeichnen und Kamera verändern ihn nicht', async () => {
  const drawn = await open({ video: { aspect: '9:16' } }), plain = await open({ view: { camera: false, hud: false } });
  await drawn.evaluate(() => { window.exportAPI.renderFrames(30, 0.1); });       // 1 s mit Bildern bei 30 fps
  await run(plain, 1);
  assert.equal(await hash(drawn), await hash(plain));
  await Promise.all([drawn.close(), plain.close()]);
});

test('Seek-Regel: Bild nach Sprung gleich Bild nach durchgehender Wiedergabe', async () => {
  const jump = await open(), cont = await open();
  await run(jump, 2 - 1 / 30);                                                    // Sprung bis kurz vor Sekunde 2
  await cont.evaluate(() => { window.exportAPI.renderFrames(59, 0.1); });        // 59 gezeichnete Bilder bei 30 fps
  const [a, b] = await Promise.all([frame(jump), frame(cont)]);
  assert.equal(await hash(jump), await hash(cont));
  assert.ok(a === b, 'Bild nach Sprung weicht vom Bild nach durchgehender Wiedergabe ab');
  await Promise.all([jump.close(), cont.close()]);
});

test('Läuft ohne Neubeginn: Zähler steigt durchgehend, Röhren fassen höchstens acht Kugeln und leeren sich nach jeder Charge', async () => {
  const page = await open();
  const sum = (s) => s.tubes.reduce((a, b) => a + b, 0);
  let prev = await run(page, 1), most = 0, emptied = 0;
  for (let t = 1; t < 170; t += 3) {                                             // reiner Simulationsvorlauf, keine Bilder
    const s = await run(page, 3);
    assert.ok(s.done >= prev.done, `Zähler läuft rückwärts: ${prev.done} -> ${s.done}`);
    most = Math.max(most, ...s.tubes);
    if (sum(s) < sum(prev) - 20) emptied++;
    prev = s;
  }
  assert.ok(prev.done > 95, `nach 170 s erst ${prev.done} Kugeln fertig`);
  assert.equal(most, 8, 'eine Röhre fasst je Charge genau acht Kugeln');
  assert.equal(emptied, 2, 'die Röhren leeren sich nach jeder Charge (zweimal in 170 s)');
  const c = await check(page);
  assert.ok(c.ok, c.errors.join('; '));
  const types = new Set((await page.evaluate(() => window.exportAPI.events(0))).map((e) => e.type));
  assert.ok(types.has('xlRelease'), 'Klang für das Leeren der Röhren fehlt');
  await page.close();
});
