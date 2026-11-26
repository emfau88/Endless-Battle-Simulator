// Marble Knockout (R43/M5): Prüfung im Browser. Plan: docs/MARBLE_KNOCKOUT_PLAN_2026-11-25.md, Abschnitt 9.
// Chromium rechnet dieselben Bits wie Node; das Bild nach einem Sprung gleicht dem nach durchgehender Wiedergabe.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
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

test('Short (M7): Chromium rechnet dieselben Hochformat-Rennen wie Node; Vorlagen-Dateien gleich Oberfläche', async () => {
  const EBS = loadKnockout();
  for (const [short, seed] of [['A', 3], ['B', 5], ['C', 7]]) {
    const sim = makeSim(EBS, { seed, aspect: '9:16', params: { short } }), node = [];
    for (const t of [12, 30]) { while (sim.step < t * 60) sim.stepOnce(); node.push(sim.stateHash()); }
    const page = await open(seed, '9:16', { short }), web = [];
    await page.evaluate(() => window.exportAPI.simulate(12)); web.push(await page.evaluate(() => window.exportAPI.hash()));
    await page.evaluate(() => window.exportAPI.simulate(18)); web.push(await page.evaluate(() => window.exportAPI.hash()));
    if (short === 'A') {
      for (const kind of ['short', 'long']) {
        const file = JSON.parse(readFileSync(new URL(`../presets/production/knockout-${kind}.json`, import.meta.url), 'utf8'));
        assert.deepEqual(await page.evaluate((k) => EBS.productionPreset('knockout', k), kind), file, `knockout/${kind}: Datei und Oberfläche`);
      }
      // Die Short-Vorlage ist seit G3 der Turm auf einem geprüften Casting-Seed
      assert.ok(await page.evaluate(() => EBS.Knockout.TOWER_CAST.includes(EBS.productionPreset('knockout', 'short', 1).seed)));
      // Die Langvideo-Vorlage ist seit G6 THE GAUNTLET mit gecastetem Drehbuch
      assert.ok(await page.evaluate(() => EBS.Knockout.GAUNTLET_CAST.some((c) => c.seed === EBS.productionPreset('knockout', 'long').seed)));
    }
    await page.close();
    assert.deepEqual(web, node, `Short ${short}`);
  }
});

test('Seek-Regel: Sprung und durchgehende Wiedergabe ergeben dasselbe Bild (zwölf Zeitpunkte)', async () => {
  const marks = [2, 5.5, 21, 44, 73, 98, 121, 147, 168, 196, 221, 247];
  // Durchgehend: vor jedem Zeitpunkt 0,2 s lang jedes Bild zeichnen (sechs Bilder). Mit einer ganzen Sekunde (30 Bilder
  // je Zeitpunkt) brauchte allein dieser Test in der CI ohne Grafikkarte mehr als 9 Minuten.
  const LEAD = 0.2;
  const a = await open(2, '16:9'), cont = [];
  let at = 0;
  for (const t of marks) {
    await a.evaluate((s) => window.exportAPI.simulate(s), t - LEAD - at);
    const frames = await a.evaluate((n) => window.exportAPI.renderFrames(n, 1, 'image/png'), Math.round(LEAD * FPS));
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

// Gesamtlevel (Teil 2): eigene Datei knockout-level-browser.test.mjs mit eigenem CI-Job.

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
