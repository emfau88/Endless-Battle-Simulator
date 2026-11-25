// Endless Burrow im Browser: beide Formate, Renderer verändert die Simulation nicht, Sprung-Regel.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launchBrowser, openExportPage } from '../lib/browser.mjs';

let browser;
before(async () => { browser = await launchBrowser({ gpu: false }); });
after(async () => { await browser?.close(); });

const config = (aspect, extra = {}) => ({ scenario: 'burrow', seed: 42, params: {},
  video: { aspect, resolution: 720, fps: 30, durationSec: 60, tempo: 1 }, view: { hud: true, camera: false }, ...extra });

test('Burrow zeichnet beide Formate, ohne Simulation oder Bildrate zu beeinflussen', async () => {
  for (const aspect of ['16:9', '9:16']) {
    const { page, errors, info } = await openExportPage(browser, config(aspect));
    try {
      assert.equal(info.scenario, 'burrow');
      assert.equal(info.supportsClips, true);
      assert.deepEqual([info.width, info.height], aspect === '16:9' ? [1280, 720] : [720, 1280]);
      const r = await page.evaluate(() => {
        const frames = exportAPI.renderFrames(30, 0.75);
        const drawn = { hash: exportAPI.hash(), events: exportAPI.events(0) };
        exportAPI.restart(); exportAPI.simulate(1);
        const simulated = { hash: exportAPI.hash(), events: exportAPI.events(0) };
        exportAPI.restart({ video: { fps: 60 } }); exportAPI.renderFrames(60, 0.1);
        return { drawn, simulated, sixty: { hash: exportAPI.hash() }, moved: frames[0] !== frames.at(-1), bytes: frames[0].length, check: exportAPI.check() };
      });
      assert.equal(r.drawn.hash, r.simulated.hash, `${aspect}: Renderer verändert die Simulation`);
      assert.equal(r.drawn.hash, r.sixty.hash, `${aspect}: Bildrate verändert die Simulation`);
      assert.deepEqual(r.drawn.events, r.simulated.events);
      assert.ok(r.moved && r.bytes > 10000, 'Bild muss sich bewegen');
      assert.ok(r.check.ok, r.check.errors.join('; '));
      assert.deepEqual(errors.map((e) => e.message), []);
    } finally { await page.close(); }
  }
});

test('Burrow Sprung-Regel: Bild nach einem Zeitsprung gleicht dem Bild bei durchgehender Wiedergabe', async () => {
  const { page, errors } = await openExportPage(browser, config('9:16'));
  try {
    const r = await page.evaluate(() => {
      exportAPI.renderFrames(240, 0.1);                       // durchgehend: jedes Bild gezeichnet (mit Bissen und Schlüpfen)
      const [continuous] = exportAPI.renderFrames(1, 1, 'image/png');
      const hash = exportAPI.hash();
      exportAPI.restart(); exportAPI.simulate(240 / 30);      // Sprung: nur Simulation, dann ein Bild (rechnet selbst einen Frame)
      const [jumped] = exportAPI.renderFrames(1, 1, 'image/png');
      return { equal: continuous === jumped, same: hash === exportAPI.hash(), bytes: jumped.length };
    });
    assert.ok(r.same, 'beide Läufe müssen denselben Schritt erreichen');
    assert.ok(r.bytes > 10000 && r.equal, 'Bild nach Sprung weicht ab');
    assert.deepEqual(errors.map((e) => e.message), []);
  } finally { await page.close(); }
});
