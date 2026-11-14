import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launchBrowser, openExportPage } from '../lib/browser.mjs';

let browser;
before(async () => { browser = await launchBrowser({ gpu: process.env.EBS_GPU === '1' }); });
after(async () => { await browser?.close(); });

test('Scrap P4: freie dunkle Stationen zeigen Nachschub, belegte Stationen bleiben ohne Text', async () => {
  const { page, errors } = await openExportPage(browser, { scenario: 'scrap', video: { resolution: 720 } });
  try {
    const result = await page.evaluate(() => {
      const results = [];
      for (const kind of ['rocket', 'blaster']) for (const readyIn of [2.4, 0]) for (const occupied of [false, true]) {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 240;
        const g = canvas.getContext('2d', { willReadFrequently: true }), words = [], fillText = g.fillText;
        g.fillText = function (text, ...args) { words.push(text); return fillText.call(this, text, ...args); };
        const pad = Object.freeze({ x: 120, y: 120, kind, readyIn, period: 7.5 }), before = JSON.stringify(pad);
        EBS.ScrapMaterialArt.pad(g, pad, occupied);
        const pixels = g.getImageData(0, 0, 240, 240).data;
        results.push({ kind, readyIn, occupied, words, unchanged: before === JSON.stringify(pad),
          visible: pixels.some((value, index) => index % 4 === 3 && value > 0) });
      }
      return results;
    });
    for (const state of result) {
      assert.deepEqual(state.words, state.occupied ? [] : [state.readyIn ? '03' : 'READY', state.kind.toUpperCase()], JSON.stringify(state));
      assert.ok(state.unchanged && state.visible, JSON.stringify(state));
    }
    assert.deepEqual(errors.map(e => e.message), []);
  } finally { await page.close(); }
});

test('Scrap P4: Trümmer bleiben nach erneutem Zeichnen identisch und Sunny benutzt seine bisherige Kunst', async () => {
  const { page, errors } = await openExportPage(browser, { scenario: 'scrap', video: { resolution: 720 } });
  try {
    const results = await page.evaluate(() => {
      const art = EBS.ScrapMaterialArt;
      const capture = draw => {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 400;
        const g = canvas.getContext('2d', { willReadFrequently: true }); g.translate(200, 200); draw(g);
        return canvas.toDataURL();
      };
      return ['wood', 'stone', 'concrete'].map(material => {
        const block = Object.freeze({ id: 4, x: -40, y: -30, w: 80, h: 60, material, hp: 0, maxHp: 100 });
        const effect = Object.freeze({ seed: 42, x: 0, y: 0, size: 80, age: .4, ttl: 1, material, color: '#999999' });
        const before = JSON.stringify({ block, effect });
        const ground = capture(g => art.rubble(g, block)), flying = capture(g => art.breakEffect(g, effect, false));
        // Other blocks/effect times may populate caches but cannot change this
        // earlier instant when it is rendered again (as in a clip or seek).
        capture(g => art.rubble(g, { ...block, id: 7, w: 64 }));
        capture(g => art.breakEffect(g, { ...effect, age: .8 }, false));
        return { material, groundStable: ground === capture(g => art.rubble(g, block)),
          flyingStable: flying === capture(g => art.breakEffect(g, effect, false)),
          sunnyUnchanged: capture(g => art.rubble(g, block, true)) === capture(g => EBS.ScrapDaylightArt.rubble(g, block)),
          readOnly: before === JSON.stringify({ block, effect }) };
      });
    });
    for (const result of results) assert.ok(result.groundStable && result.flyingStable && result.sunnyUnchanged && result.readOnly, JSON.stringify(result));
    assert.deepEqual(errors.map(e => e.message), []);
  } finally { await page.close(); }
});
