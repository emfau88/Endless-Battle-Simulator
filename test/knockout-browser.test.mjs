// Marble Knockout (R43/M5): Prüfung im Browser. Plan: docs/MARBLE_KNOCKOUT_PLAN_2026-11-25.md, Abschnitt 9.
// Chromium rechnet dieselben Bits wie Node; das Bild nach einem Sprung gleicht dem nach durchgehender Wiedergabe.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { launchBrowser, openExportPage } from '../lib/browser.mjs';
import { loadKnockout, makeSim } from '../scripts/knockout-lab.mjs';

let browser;
before(async () => { browser = await launchBrowser({ gpu: false }); });
after(async () => { await browser?.close(); });

const FPS = 30;
const open = async (seed, aspect, params = {}) => (await openExportPage(browser, { scenario: 'knockout', seed, params, video: { resolution: 360, aspect, fps: FPS } })).page;
const sha = (b64) => createHash('sha256').update(b64).digest('hex');

test('Chromium rechnet dasselbe Rennen wie Node (Zustands-Hash an drei Zeitpunkten)', async () => {
  const EBS = loadKnockout(), sim = makeSim(EBS, { seed: 4 }), node = [];
  const marks = [20, 95, 170];
  for (const t of marks) { while (sim.step < t * 60) sim.stepOnce(); node.push(sim.stateHash()); }
  const page = await open(4, '16:9'), web = [];
  let at = 0;
  for (const t of marks) { await page.evaluate((s) => window.exportAPI.simulate(s), t - at); at = t; web.push(await page.evaluate(() => window.exportAPI.hash())); }
  await page.close();
  assert.deepEqual(web, node);
});

test('Seek-Regel: Sprung und durchgehende Wiedergabe ergeben dasselbe Bild (zwölf Zeitpunkte)', async () => {
  const marks = [2, 5.5, 21, 44, 73, 98, 121, 147, 168, 196, 221, 247];
  // Durchgehend: vor jedem Zeitpunkt eine Sekunde lang jedes Bild zeichnen
  const a = await open(2, '16:9'), cont = [];
  let at = 0;
  for (const t of marks) {
    await a.evaluate((s) => window.exportAPI.simulate(s), t - 1 - at);
    const frames = await a.evaluate((n) => window.exportAPI.renderFrames(n, 1, 'image/png'), FPS);
    cont.push(sha(frames[frames.length - 1])); at = t;
  }
  await a.close();
  // Sprung: nur rechnen, dann ein Bild
  const b = await open(2, '16:9'), jump = [];
  at = 0;
  for (const t of marks) {
    await b.evaluate((s) => window.exportAPI.simulate(s), t - 1 / FPS - at);
    jump.push(sha((await b.evaluate(() => window.exportAPI.renderFrames(1, 1, 'image/png')))[0])); at = t;
  }
  await b.close();
  marks.forEach((t, i) => assert.equal(jump[i], cont[i], `Bild bei ${t} s weicht ab`));
});

test('Beide Formate und das Quadrat zeichnen ohne Fehler; Anzeige aus lässt nur die Bahn stehen', async () => {
  for (const [aspect, params] of [['16:9', {}], ['1:1', {}], ['9:16', {}], ['16:9', { mode: 'gallery', element: 'drum' }], ['16:9', { mode: 'stage', stage: 3 }]]) {
    const page = await open(1, aspect, params);
    await page.evaluate(() => window.exportAPI.simulate(6));
    const [img] = await page.evaluate(() => window.exportAPI.renderFrames(1, 0.8));
    assert.ok(img.length > 2000, `${aspect} ${JSON.stringify(params)}: leeres Bild`);
    assert.ok((await page.evaluate(() => window.exportAPI.check())).ok);
    await page.close();
  }
  const on = await open(1, '16:9'), off = await open(1, '16:9', { display: 'off' });
  for (const p of [on, off]) await p.evaluate(() => window.exportAPI.simulate(8));
  const [x] = await on.evaluate(() => window.exportAPI.renderFrames(1, 1, 'image/png'));
  const [y] = await off.evaluate(() => window.exportAPI.renderFrames(1, 1, 'image/png'));
  assert.notEqual(sha(x), sha(y), 'Anzeige-Schalter wirkt nicht');
  assert.equal(await on.evaluate(() => window.exportAPI.hash()), await off.evaluate(() => window.exportAPI.hash()), 'Anzeige ändert die Simulation');
  await Promise.all([on.close(), off.close()]);
});
