import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launchBrowser, openExportPage } from '../lib/browser.mjs';

let browser;
before(async () => { browser = await launchBrowser({ gpu: process.env.EBS_GPU === '1' }); });
after(async () => { await browser?.close(); });

test('Scrap-Schilder: Rand und Gedränge bleiben lesbar; Wracks erhalten kein Schild', async () => {
  const { page, errors } = await openExportPage(browser, { scenario: 'scrap', video: { resolution: 720 } });
  try {
    const result = await page.evaluate(() => {
      const cfg = exportAPI.config(), world = exportAPI.info().world, sc = EBS.getScenario('scrap');
      const sim = sc.create({ seed: 42, params: cfg.params, world, view: cfg.view, timeScale: 1 });
      const renderer = sc.createRenderer({ sim, world, view: cfg.view, renderScale: 2 / 3 });
      const base = sim.roundSim.robots;
      const robots = [
        { ...base[0], x: 30, y: 42 }, { ...base[1], x: 78, y: 48 },
        { ...base[2], x: 75, y: 92 }, { ...base[3], alive: false, hp: 0, x: 80, y: 75 },
      ];
      const frozen = JSON.stringify(robots), labels = renderer.arena._labelLayout(robots, 540, 1040);
      const reverse = renderer.arena._labelLayout([...robots].reverse(), 540, 1040);
      const out = { count: labels.length, noWreck: labels.every(l => l.robot.alive),
        belowAtTop: labels[0].below, inside: labels.every(l => l.x >= 18 && l.y >= 18 && l.x + l.width <= 522 && l.y + l.height <= 1022),
        separated: labels.every((a, i) => labels.slice(i + 1).every(b => a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y)),
        ammoClear: labels.every(l => !l.below || l.ammoY >= l.y + l.height),
        deterministic: JSON.stringify(labels) === JSON.stringify(reverse), unchanged: frozen === JSON.stringify(robots) };
      renderer.destroy(); sim.destroy(); return out;
    });
    assert.deepEqual(result, { count: 3, noWreck: true, belowAtTop: true, inside: true, separated: true, ammoClear: true, deterministic: true, unchanged: true });
    assert.deepEqual(errors.map(e => e.message), []);
  } finally { await page.close(); }
});

test('Scrap-Schilder: ein gemeinsamer Durchgang liegt über Robotern und Effekten in V3, Sunny und Legacy', async () => {
  const { page, errors } = await openExportPage(browser, { scenario: 'scrap', video: { resolution: 720 } });
  try {
    const results = await page.evaluate(() => {
      const out = [];
      for (const [rulesVersion, arena, aspect] of [
        ['v3', 'yard', '16:9'], ['v3', 'yard', '9:16'], ['v3', 'sunshine', '16:9'],
        ['v3', 'sunshine', '9:16'], ['classic', 'yard', '16:9'], ['v2', 'yard', '9:16'],
      ]) {
        const cfg = EBS.normalizeConfig({ scenario: 'scrap', seed: 42, params: { rulesVersion, arena }, video: { aspect }, view: { hud: false, camera: false } });
        const world = EBS.ASPECTS[aspect], sc = EBS.getScenario('scrap');
        const sim = sc.create({ seed: 42, params: cfg.params, world, view: cfg.view, timeScale: 1 });
        while (sim.step < 436) sim.stepOnce();
        const renderer = sc.createRenderer({ sim, world, view: cfg.view, renderScale: 2 / 3 });
        const order = [], words = [], prototype = CanvasRenderingContext2D.prototype, fillText = prototype.fillText;
        for (const key of ['_robot', '_projectile', '_effect', '_labels']) {
          const method = renderer.arena[key]; renderer.arena[key] = function (...args) { order.push(key); return method.apply(this, args); };
        }
        const state = sim.stateHash(), events = JSON.stringify(sim.events);
        try {
          prototype.fillText = function (word, ...args) { words.push(String(word)); return fillText.call(this, word, ...args); };
          renderer.draw();
        } finally { prototype.fillText = fillText; }
        out.push({ rulesVersion, arena, aspect,
          last: order.at(-1), passes: order.filter(k => k === '_labels').length,
          eachNameOnce: sim.roundSim.robots.filter(r => r.alive).every(r => words.filter(w => w === r.name).length === 1),
          noUnarmed: !words.includes('UNARMED'), unchanged: state === sim.stateHash() && events === JSON.stringify(sim.events) });
        renderer.destroy(); sim.destroy();
      }
      return out;
    });
    for (const r of results) assert.ok(r.last === '_labels' && r.passes === 1 && r.eachNameOnce && r.noUnarmed && r.unchanged, JSON.stringify(r));
    assert.deepEqual(errors.map(e => e.message), []);
  } finally { await page.close(); }
});

test('Scrap-Bodenwaffen: leere Waffen sind grau, verblassen und behalten einen begrenzten Silhouetten-Cache', async () => {
  const { page, errors } = await openExportPage(browser, { scenario: 'scrap', params: { rulesVersion: 'v3' }, video: { resolution: 720 } });
  try {
    const result = await page.evaluate(() => {
      const cfg = exportAPI.config(), world = exportAPI.info().world, sc = EBS.getScenario('scrap');
      const sim = sc.create({ seed: 42, params: cfg.params, world, view: cfg.view, timeScale: 1 });
      const renderer = sc.createRenderer({ sim, world, view: cfg.view, renderScale: 2 / 3 }), art = renderer.arena;
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 160;
      const g = canvas.getContext('2d'), words = [], text = g.fillText.bind(g); let ellipses = 0;
      g.fillText = (value, ...args) => { words.push(String(value)); text(value, ...args); };
      g.ellipse = () => { ellipses++; };
      const pickup = { id: 42, x: 80, y: 80, kind: 'rocket', ammo: 0, empty: true, ttl: 3, age: 0 };
      const alpha = age => {
        g.clearRect(0, 0, 160, 160); art._pickup(g, { ...pickup, age }, 4);
        return g.getImageData(0, 0, 160, 160).data.reduce((sum, v, i) => sum + (i % 4 === 3 ? v : 0), 0);
      };
      const fresh = alpha(0), faded = alpha(3), noCount = words.length === 0;
      for (const kind of ['rocket', 'blaster']) for (const empty of [false, true]) art._pickupTexture(kind, empty);
      const sprite = art._pickupTexture('rocket', true).sprite, pixels = sprite.getContext('2d').getImageData(0, 0, 128, 128).data;
      let gray = true; for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] && (pixels[i] !== pixels[i + 1] || pixels[i + 1] !== pixels[i + 2])) gray = false;
      const out = { visible: faded > 0, fading: faded < fresh, gray, noCount, ellipses, cache: art._pickupTextures.size };
      renderer.destroy(); sim.destroy(); return out;
    });
    assert.deepEqual(result, { visible: true, fading: true, gray: true, noCount: true, ellipses: 0, cache: 4 });
    assert.deepEqual(errors.map(e => e.message), []);
  } finally { await page.close(); }
});
