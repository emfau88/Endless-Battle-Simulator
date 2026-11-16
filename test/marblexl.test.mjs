// Tests für „Marble Factory XL“, Stufe 1: mehrere klassische Linien in einer Halle, Kamera rein aus der Videozeit.
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

for (const aspect of ['16:9', '9:16']) {
  test(`Vier Linien ${aspect}: zwei Minuten ohne verlorene Kugel, jede Linie arbeitet`, async () => {
    const page = await open({ video: { aspect } });
    let s;
    for (let i = 0; i < 6; i++) {
      s = await run(page, 20);
      const c = await check(page);
      assert.ok(c.ok, `t=${s.t}: ${c.errors.join('; ')}`);
      assert.equal(s.ballsTotal, 132, 'Kugelanzahl hat sich verändert');
      assert.equal(s.ballsTotal, s.ballsExpected);
    }
    assert.equal(s.lines.length, 4);
    for (const line of s.lines) assert.ok(line.cycles >= 60, `Linie ${line.name} läuft zu langsam: ${line.cycles} Umläufe`);
    await page.close();
  });
}

test('Gleicher Seed ergibt denselben Zustand, anderer Seed einen anderen', async () => {
  const a = await open(), b = await open(), c = await open({ seed: 7 });
  await Promise.all([run(a, 30), run(b, 30), run(c, 30)]);
  const [ha, hb, hc] = await Promise.all([hash(a), hash(b), hash(c)]);
  assert.equal(ha, hb);
  assert.notEqual(ha, hc);
  await Promise.all([a.close(), b.close(), c.close()]);
});

test('Zeichnen und Kamera verändern die Simulation nicht', async () => {
  const drawn = await open(), plain = await open({ view: { camera: false, hud: false } });
  await drawn.evaluate(() => { window.exportAPI.renderFrames(90, 0.1); });       // 3 s mit Bildern bei 30 fps
  await run(plain, 3);
  assert.equal(await hash(drawn), await hash(plain));
  await Promise.all([drawn.close(), plain.close()]);
});

test('Seek-Regel: Bild nach Sprung gleich Bild nach durchgehender Wiedergabe (während einer Kamerafahrt)', async () => {
  const jump = await open(), cont = await open();
  await run(jump, 10 - 1 / 30);                                                   // Sprung bis kurz vor Sekunde 10 (Übergang zur Nahaufnahme)
  await cont.evaluate(() => { window.exportAPI.renderFrames(299, 0.1); });       // 299 gezeichnete Bilder bei 30 fps
  const [a, b] = await Promise.all([frame(jump), frame(cont)]);
  assert.equal(await hash(jump), await hash(cont));
  assert.ok(a === b, 'Bild nach Sprung weicht vom Bild nach durchgehender Wiedergabe ab');
  await Promise.all([jump.close(), cont.close()]);
});
