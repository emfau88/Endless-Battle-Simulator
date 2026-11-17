// Tests für „Cloud Wars“ (in Arbeit), Paket C0: Gerüst und Gelände. Plan: docs/CLOUD_WARS_PLAN_2026-11-18.md
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { launchBrowser, openExportPage } from '../lib/browser.mjs';

let browser;
before(async () => { browser = await launchBrowser({ gpu: false }); });
after(async () => { await browser?.close(); });

const open = async (seed, aspect) => (await openExportPage(browser, { scenario: 'cloudwars', seed, video: { resolution: 720, aspect } })).page;
const frameHash = async (page) => createHash('sha256').update(await page.evaluate(() => window.exportAPI.renderFrames(1, 1, 'image/png')[0])).digest('hex');

test('Ausschnitt erfüllt die Geländeregeln in beiden Formaten', async () => {
  for (const aspect of ['9:16', '16:9']) for (const seed of [42, 7, 2026]) {
    const page = await open(seed, aspect);
    const { area } = await page.evaluate(() => window.exportAPI.snapshot());
    assert.equal(area.miss, 0, `Seed ${seed} ${aspect}: ${JSON.stringify(area)}`);
    assert.ok((await page.evaluate(() => window.exportAPI.check())).ok);
    await page.close();
  }
});

test('Gleicher Seed ergibt dasselbe Gelände, anderer Seed ein anderes; Zeichnen ändert den Zustand nicht', async () => {
  // Nacheinander öffnen: Gleichzeitig zeichnende Seiten wichen ohne Grafikkarte in Einzelpixeln voneinander ab
  const a = await open(42, '9:16'), ha = await frameHash(a);
  const b = await open(42, '9:16'), hb = await frameHash(b);
  const c = await open(7, '9:16'), hc = await frameHash(c);
  assert.equal(ha, hb, 'Gelände bei gleichem Seed nicht pixelgleich');
  assert.notEqual(ha, hc, 'anderer Seed ergibt dasselbe Bild');
  await b.evaluate(() => window.exportAPI.renderFrames(9, 0.5));               // 10 Bilder gezeichnet
  await c.evaluate(() => window.exportAPI.restart({ seed: 42 }));
  await c.evaluate(() => window.exportAPI.simulate(10 / 30));                  // gleiche Zeit ohne Bilder
  assert.equal(await b.evaluate(() => window.exportAPI.hash()), await c.evaluate(() => window.exportAPI.hash()));
  await Promise.all([a.close(), b.close(), c.close()]);
});
