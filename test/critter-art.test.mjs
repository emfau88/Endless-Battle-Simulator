// Shared scene artwork must be reusable without mutating cached sprites or Canvas state.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { ROOT, launchBrowser } from '../lib/browser.mjs';

let browser, page;
before(async () => {
  browser = await launchBrowser({ gpu: false });
  page = await browser.newPage();
  for (const file of ['core.js', 'scenarios/shared/critter-art.js']) {
    await page.addScriptTag({ path: join(ROOT, 'src', file) });
  }
});
after(async () => { await browser?.close(); });

test('Each shared animal supports every motion and mood without changing its sprite or caller state', async () => {
  const result = await page.evaluate(() => {
    const { SPECIES, critterSprite, drawCritter } = EBS.CritterArt;
    const cases = [
      ['roll', 150, null], ['roll', 450, null], ['fall', 420, null],
      ['lift', 0, null], ['pool', 65, null], ['lift', 0, { yawn: 0.8 }],
      ['pool', 65, { cap: true, sleep: true }], ['lift', 0, { cap: true, cheer: true }],
    ];
    const issues = [], images = [];
    for (let kind = 0; kind < SPECIES.length; kind++) {
      const sprite = critterSprite(kind, 1.25, 24), cached = sprite.c.toDataURL();
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
      const g = canvas.getContext('2d', { willReadFrequently: true });
      for (const [mode, speed, mood] of cases) {
        const render = () => {
          g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 128, 128); g.beginPath();
          g.translate(3, 5); g.globalAlpha = 0.85; g.lineWidth = 7; g.fillStyle = '#123456';
          const initial = [g.getTransform().toString(), g.globalAlpha, g.lineWidth, g.fillStyle];
          drawCritter(g, sprite, kind, 7 + kind, 60, 59, mode === 'roll' ? 0.4 : 0, mode, 2.17, speed, [0.6, 0.8], 1.5, 24, mood);
          const final = [g.getTransform().toString(), g.globalAlpha, g.lineWidth, g.fillStyle];
          if (JSON.stringify(initial) !== JSON.stringify(final)) issues.push(`${kind}/${mode}: Canvas state leaked`);
          const data = g.getImageData(0, 0, 128, 128).data;
          let visible = 0;
          for (let i = 3; i < data.length; i += 4) if (data[i]) visible++;
          if (visible < 500) issues.push(`${kind}/${mode}: animal missing`);
          return canvas.toDataURL();
        };
        images.push(render());
      }
      if (cached !== sprite.c.toDataURL()) issues.push(`${kind}: cached body changed`);
    }
    return { names: SPECIES.map(s => s.name), issues, distinct: new Set(images).size, cases: images.length };
  });
  assert.deepEqual(result.names, ['Küken', 'Pinguin', 'Schweinchen', 'Frosch']);
  assert.deepEqual(result.issues, []);
  assert.equal(result.cases, 32);
  assert.equal(result.distinct, 32, 'motion and mood remain visible for every species');
});

test('Shared scenery repeats exactly with a seeded RNG and leaves random ownership with the caller', async () => {
  const result = await page.evaluate(() => {
    const { palm, foliage, cloudSprite, moonSprite } = EBS.PyramidArt;
    const render = (seed) => {
      const rng = new EBS.RNG(seed), canvas = document.createElement('canvas');
      canvas.width = 480; canvas.height = 320;
      const g = canvas.getContext('2d');
      palm(g, rng, 100, 300, 130, -0.08);
      foliage(g, rng, [[170, 295], [280, 280], [450, 290]], 8, 14, (_x, y) => y > 0, { flowers: 0.2 });
      const cloud = cloudSprite(rng, 180, 1.25);
      g.drawImage(cloud.c, 140, 25, cloud.w, cloud.h);
      const moon = moonSprite(1.25, 28);
      g.drawImage(moon.c, 400 - moon.r, 70 - moon.r, moon.r * 2, moon.r * 2);
      return { pixels: canvas.toDataURL(), state: rng.s };
    };
    const first = render(42), repeat = render(42), alternate = render(43);
    return {
      samePixels: first.pixels === repeat.pixels,
      sameState: first.state === repeat.state,
      differentPixels: first.pixels !== alternate.pixels,
      advanced: first.state !== new EBS.RNG(42).s,
    };
  });
  assert.deepEqual(result, { samePixels: true, sameState: true, differentPixels: true, advanced: true });
});
