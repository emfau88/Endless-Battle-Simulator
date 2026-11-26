import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launchBrowser, openExportPage } from '../lib/browser.mjs';

let browser;
before(async () => { browser = await launchBrowser({ gpu: process.env.EBS_GPU === '1' }); });
after(async () => { await browser?.close(); });

test('Scrap-Optik: Bilder nach Seek entsprechen laufendem Zeichnen, auch über den Rundenwechsel', async () => {
  const { page, errors } = await openExportPage(browser, { scenario: 'scrap', seed: 42, video: { resolution: 720 } });
  try {
    const results = await page.evaluate(() => {
      const results = [];
      for (const [rulesVersion, arena, aspect] of [
        ['v3', 'yard', '16:9'], ['v3', 'yard', '9:16'], ['v3', 'sunshine', '16:9'],
        ['v3', 'sunshine', '9:16'], ['classic', 'yard', '16:9'], ['v2', 'yard', '9:16'],
        ['v4', 'sunshine', '16:9'], ['v4', 'sunshine', '9:16'],
      ]) {
        const cfg = EBS.normalizeConfig({ scenario: 'scrap', seed: 42, params: { rulesVersion, arena },
          video: { aspect, resolution: 720 }, view: { hud: true, camera: false } });
        const world = aspect === '9:16' ? { w: 1080, h: 1920 } : { w: 1920, h: 1080 };
        const sc = EBS.getScenario('scrap');
        const create = () => {
          const sim = sc.create({ seed: 42, params: cfg.params, world, view: cfg.view, timeScale: 1 });
          const renderer = sc.createRenderer({ sim, world, view: cfg.view, renderScale: 2 / 3 });
          return { sim, renderer };
        };
        // Map geometry changes round timing. Find the actual explosion/end so
        // these assertions still cover the pause and transition in each map.
        const probe = create();
        while (probe.sim.phase === 'running' && probe.sim.step < 91 * 60) probe.sim.stepOnce();
        if (probe.sim.phase !== 'pause') throw Error('Expected first round to finish');
        const endStep = probe.sim.step;
        const blastStep = probe.sim.events.find(e => e.type === 'blast')?.step ?? 430;
        // v4: Kisten im Wackeln nach der Landung und kurz nach dem ersten Ausbruch (Bretter, Staub)
        const crateTargets = rulesVersion === 'v4' ? ['crate_land', 'crate_break']
          .map(type => Math.ceil((probe.sim.events.find(e => e.type === type).step + 8) / 2) * 2) : [];
        probe.renderer.destroy(); probe.sim.destroy();
        const targets = [Math.ceil((blastStep + 6) / 2) * 2, Math.ceil((endStep + 42) / 2) * 2,
          Math.ceil((endStep + 210) / 2) * 2];
        targets.push(...crateTargets); // hinten anfügen: targets[2] bleibt die nächste Runde
        const longSeek = rulesVersion === 'v3' && arena === 'yard' && aspect === '16:9';
        if (longSeek) targets.push(2100); // Explicit simulate(20) -> 35 s regression.
        // Include a fresh explosion, an end pause and the next round. Drawing
        // AND reading each frame matches the real export path. Rendering-only
        // can switch Chromium's Canvas backend and differs even on the baseline.
        for (const target of targets) {
          const continuous = create();
          const start = longSeek && target === 2100 ? 1200
            : target === targets[2] ? Math.max(0, endStep - 60) : Math.max(0, target - 60);
          while (continuous.sim.step < start) continuous.sim.stepOnce();
          let frame;
          while (continuous.sim.step < target) {
            continuous.sim.stepOnce();
            if (continuous.sim.step % 2 === 0) {
              continuous.renderer.draw(); frame = continuous.renderer.canvas.toDataURL();
            }
          }
          const sought = create();
          while (sought.sim.step < target) sought.sim.stepOnce();
          const before = JSON.stringify(sought.sim.events), hash = sought.sim.stateHash();
          sought.renderer.draw();
          results.push({ rulesVersion, arena, aspect, target,
            samePixels: frame === sought.renderer.canvas.toDataURL(),
            sameState: continuous.sim.stateHash() === hash && sought.sim.stateHash() === hash,
            readOnlyEvents: before === JSON.stringify(sought.sim.events), ok: sought.sim.checkInvariants().ok });
          sought.renderer.destroy(); sought.sim.destroy();
          continuous.renderer.destroy(); continuous.sim.destroy();
        }
      }
      return results;
    });
    for (const result of results) {
      assert.ok(result.samePixels, JSON.stringify(result));
      assert.ok(result.sameState && result.readOnlyEvents && result.ok, JSON.stringify(result));
    }
    assert.deepEqual(errors.map(e => e.message), []);
  } finally { await page.close(); }
});

test('Scrap-Optik: Brandflecken sind auf 24 Ereignisse der aktuellen Runde begrenzt', async () => {
  const { page, errors } = await openExportPage(browser, { scenario: 'scrap', video: { resolution: 720 } });
  try {
    const result = await page.evaluate(() => {
      const cfg = exportAPI.config(), world = exportAPI.info().world, sc = EBS.getScenario('scrap');
      const sim = sc.create({ seed: 42, params: cfg.params, world, view: cfg.view, timeScale: 1 });
      const renderer = sc.createRenderer({ sim, world, view: cfg.view, renderScale: 2 / 3 });
      sim.events = Array.from({ length: 70 }, (_, i) => ({ seq: i, round: i < 30 ? 0 : 1,
        roundSeed: 42, roundTime: 0, type: i % 2 ? 'blast' : 'ko', arenaX: 100 + i, arenaY: 200 }));
      const before = JSON.stringify(sim.events), marks = renderer.arena._scorchEvents();
      const out = { count: marks.length, first: marks[0].seq, last: marks.at(-1).seq,
        currentRound: marks.every(e => e.round === sim.roundNumber), unchanged: before === JSON.stringify(sim.events) };
      sim.roundNumber = 2;
      out.nextRoundCount = renderer.arena._scorchEvents().length;
      renderer.destroy(); sim.destroy(); return out;
    });
    assert.deepEqual(result, { count: 24, first: 46, last: 69, currentRound: true, unchanged: true, nextRoundCount: 0 });
    assert.deepEqual(errors.map(e => e.message), []);
  } finally { await page.close(); }
});

test('Scrap-Optik: dunkle Karten behalten ihren Boden über Seeds und Folgerunden; Sunny bleibt erhalten', async () => {
  const { page, errors } = await openExportPage(browser, { scenario: 'scrap', video: { resolution: 720 } });
  try {
    const result = await page.evaluate(() => {
      const art = EBS.ScrapMaterialArt, maps = ['yard', 'foundry', 'crossroads'];
      // Keep this seed/identity comparison on one Canvas2D raster backend.
      // Chromium's accelerated path can change antialiasing after warm-up:
      // Foundry's thin diagonal strokes differ even for two seed-42 renders.
      // Explicit CPU contexts avoid that backend change; equality stays exact.
      const getContext = HTMLCanvasElement.prototype.getContext;
      let images, seedsStable, portraitStable, sunny;
      try {
        HTMLCanvasElement.prototype.getContext = function (type, options) {
          return getContext.call(this, type, type === '2d' ? { ...options, willReadFrequently: true } : options);
        };
        images = maps.map(arena => art.floor(42, 1040, 540, false, arena).toDataURL());
        seedsStable = maps.every((arena, i) => art.floor(314, 1040, 540, false, arena).toDataURL() === images[i]);
        portraitStable = maps.every(arena => art.floor(42, 540, 1040, false, arena).toDataURL()
          === art.floor(314, 540, 1040, false, arena).toDataURL());
        sunny = art.floor(42, 1040, 540, true, 'sunshine').toDataURL()
          === EBS.ScrapDaylightArt.floor(42, 1040, 540).toDataURL();
      } finally {
        HTMLCanvasElement.prototype.getContext = getContext;
      }
      const cfg = EBS.normalizeConfig({ scenario: 'scrap', seed: 42, params: { rulesVersion: 'v3', arena: 'yard' },
        video: { aspect: '16:9' }, view: { hud: true, camera: false } });
      const sc = EBS.getScenario('scrap'), world = { w: 1920, h: 1080 };
      const sim = sc.create({ seed: 42, params: cfg.params, world, view: cfg.view, timeScale: 1 });
      const renderer = sc.createRenderer({ sim, world, view: cfg.view, renderScale: 2 / 3 });
      renderer.draw(); const firstFloor = renderer.materialFloor;
      while (sim.roundNumber === 1 && sim.step < 100 * 60) sim.stepOnce();
      renderer.draw();
      const result = { seedsStable, portraitStable, distinct: new Set(images).size, sunny,
        cachedAcrossRounds: firstFloor === renderer.materialFloor, round: sim.roundNumber, ok: sim.checkInvariants().ok };
      renderer.destroy(); sim.destroy(); return result;
    });
    assert.deepEqual(result, { seedsStable: true, portraitStable: true, distinct: 3, sunny: true, cachedAcrossRounds: true, round: 2, ok: true });
    assert.deepEqual(errors.map(e => e.message), []);
  } finally { await page.close(); }
});

test('Scrap-Optik: der letzte KO-Brandfleck blendet auch bei eingefrorenem Rundenergebnis ein', async () => {
  const { page, errors } = await openExportPage(browser, { scenario: 'scrap', video: { resolution: 720 } });
  try {
    const result = await page.evaluate(() => {
      const cfg = EBS.normalizeConfig({ scenario: 'scrap', seed: 42, params: { rulesVersion: 'v3', repeatRounds: false },
        video: { aspect: '16:9' }, view: { camera: false } });
      const sc = EBS.getScenario('scrap'), world = { w: 1920, h: 1080 };
      const sim = sc.create({ seed: 42, params: cfg.params, world, view: cfg.view, timeScale: 1 });
      while (sim.phase === 'running' && sim.step < 100 * 60) sim.stepOnce();
      const renderer = sc.createRenderer({ sim, world, view: cfg.view, renderScale: 2 / 3 });
      const last = renderer.arena._scorchEvents().at(-1), time = sim.roundSim.t;
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 100;
      const g = canvas.getContext('2d');
      const ink = () => {
        g.clearRect(0, 0, 100, 100); renderer.arena._drawScorches(g, () => ({ x: 50, y: 50 }), [last]);
        return g.getImageData(0, 0, 100, 100).data.filter((_, i) => i % 4 === 3).reduce((a, b) => a + b, 0);
      };
      const initial = ink(); for (let i = 0; i < 30; i++) sim.stepOnce();
      const out = { type: last.type, phase: sim.phase, frozenRound: time === sim.roundSim.t, initial, visible: ink(), ok: sim.checkInvariants().ok };
      renderer.destroy(); sim.destroy(); return out;
    });
    assert.equal(result.type, 'ko'); assert.equal(result.phase, 'ended');
    assert.ok(result.frozenRound && result.ok);
    assert.ok(result.visible > 0 && result.visible > result.initial, JSON.stringify(result));
    assert.deepEqual(errors.map(e => e.message), []);
  } finally { await page.close(); }
});
