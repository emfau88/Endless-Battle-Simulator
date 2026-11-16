// Tests für „Marble Factory XL“ (in Arbeit): bewegter Entwurf der Produktionslinie, Ablauf rein aus der Zeit.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launchBrowser, openExportPage } from '../lib/browser.mjs';

let browser;
before(async () => { browser = await launchBrowser({ gpu: false }); });
after(async () => { await browser?.close(); });

const open = async (cfg = {}) => (await openExportPage(browser, { scenario: 'marblexl', seed: 42, ...cfg })).page;
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
  for (const type of ['pick', 'tick', 'belt', 'valve', 'lift', 'rail', 'clink']) assert.ok(types.has(type), `Klang ${type} fehlt`);
  assert.ok(events.every((e, i) => e.seq === events[0].seq + i), 'Lücke in der Ereignisfolge');
  await page.close();
});

test('Gleiche Zeit ergibt denselben Zustand; Zeichnen und Kamera verändern ihn nicht', async () => {
  const drawn = await open({ video: { aspect: '9:16' } }), plain = await open({ view: { camera: false, hud: false } });
  await drawn.evaluate(() => { window.exportAPI.renderFrames(60, 0.1); });       // 2 s mit Bildern bei 30 fps
  await run(plain, 2);
  assert.equal(await hash(drawn), await hash(plain));
  await Promise.all([drawn.close(), plain.close()]);
});

test('Seek-Regel: Bild nach Sprung gleich Bild nach durchgehender Wiedergabe (während der Kamerafahrt)', async () => {
  const jump = await open(), cont = await open();
  await run(jump, 6 - 1 / 30);                                                    // Sprung bis kurz vor Sekunde 6
  await cont.evaluate(() => { window.exportAPI.renderFrames(179, 0.1); });       // 179 gezeichnete Bilder bei 30 fps
  const [a, b] = await Promise.all([frame(jump), frame(cont)]);
  assert.equal(await hash(jump), await hash(cont));
  assert.ok(a === b, 'Bild nach Sprung weicht vom Bild nach durchgehender Wiedergabe ab');
  await Promise.all([jump.close(), cont.close()]);
});
