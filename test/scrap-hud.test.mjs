import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launchBrowser, openExportPage } from '../lib/browser.mjs';

let browser;
before(async () => { browser = await launchBrowser({ gpu: process.env.EBS_GPU === '1' }); });
after(async () => { await browser?.close(); });

async function inspectHud(run) {
  const { page, errors } = await openExportPage(browser, { scenario: 'scrap', video: { resolution: 720 } });
  try {
    await page.evaluate(() => {
      window.scrapHudFixture = (params = {}, aspect = '16:9') => {
        const cfg = EBS.normalizeConfig({ scenario: 'scrap', seed: 42, params,
          video: { aspect, resolution: 720 }, view: { hud: true, camera: false } });
        const sc = EBS.getScenario('scrap'), world = EBS.ASPECTS[aspect];
        const sim = sc.create({ seed: cfg.seed, params: cfg.params, world, view: cfg.view, timeScale: 1 });
        const renderer = sc.createRenderer({ sim, world, view: cfg.view, renderScale: 2 / 3 });
        const paint = (method, ...args) => {
          const canvas = document.createElement('canvas'); canvas.width = world.w; canvas.height = world.h;
          const g = canvas.getContext('2d'), labels = [], drawText = g.fillText;
          g.fillText = function (value, ...rest) { labels.push(String(value)); drawText.call(this, value, ...rest); };
          renderer[method](g, ...args);
          return { labels, image: canvas.toDataURL() };
        };
        return { sim, renderer, paint, destroy() { renderer.destroy(); sim.destroy(); } };
      };
    });
    const result = await page.evaluate(run);
    assert.deepEqual(errors.map(e => e.message), []);
    return result;
  } finally { await page.close(); }
}

test('Scrap-HUD: englische Materialnamen, Waffenbestand und ausgeschiedene Roboter bleiben in beiden Formaten lesbar', async () => {
  const results = await inspectHud(() => ['16:9', '9:16'].map(aspect => {
    const f = scrapHudFixture({}, aspect), calls = [], weapon = f.renderer.arena._weapon;
    f.renderer.arena._weapon = function (g, kind, ...args) { calls.push(kind); return weapon.call(this, g, kind, ...args); };
    // Deliberately exercise four different states in a read-only view model.
    // The original simulation is left intact, including its alive counters.
    const robots = f.sim.roundSim.robots.map(r => ({ ...r }));
    robots[0].weapon = null; robots[1].alive = false; robots[1].hp = 0; robots[1].weapon = null;
    robots[2].weapon = { kind: 'blaster', ammo: 3, maxAmmo: 12 };
    robots[3].weapon = { kind: 'rocket', ammo: 1, maxAmmo: 2 };
    f.renderer.sim = { ...f.sim, roundSim: { ...f.sim.roundSim, robots } };
    const hash = f.sim.stateHash(), before = JSON.stringify(f.renderer.sim);
    const { labels } = f.paint('materialHud', false);
    const result = { aspect, labels, calls, unchanged: before === JSON.stringify(f.renderer.sim) && hash === f.sim.stateHash() };
    f.destroy(); return result;
  }));
  for (const result of results) {
    for (const label of ['WOOD', 'STONE', 'CONCRETE', 'KNOCKED OUT', '—', '3', '1']) assert.ok(result.labels.includes(label), label);
    assert.equal(result.labels.filter(s => /^★ \d+$/.test(s)).length, 4);
    assert.ok(result.labels.every(s => !/HOLZ|BETON|BLST|RKT|SEARCH/.test(s)));
    assert.deepEqual(result.calls, ['blaster', 'rocket']);
    assert.ok(result.unchanged);
  }
});

test('Scrap-Siegerbanner: Einblendung ist zeitbasiert, seek-sicher und endet auch ohne Folgerunden', async () => {
  const result = await inspectHud(() => {
    const f = scrapHudFixture(), { sim } = f;
    while (sim.phase === 'running' && sim.step < 100 * 60) sim.stepOnce();
    if (sim.phase !== 'pause') throw Error('Reference round did not reach its result pause.');
    const start = sim.step, samples = [];
    for (const ticks of [6, 15, 42]) {
      while (sim.step < start + ticks) sim.stepOnce();
      const hash = sim.stateHash(), events = JSON.stringify(sim.events), sample = f.paint('materialRoundBanner');
      samples.push({ ...sample, readOnly: hash === sim.stateHash() && events === JSON.stringify(sim.events) });
    }
    const sought = scrapHudFixture();
    while (sought.sim.step < start + 42) sought.sim.stepOnce();
    const direct = sought.paint('materialRoundBanner');
    // A draw has no single winner icon or winner name.
    f.renderer.sim = { ...sim, roundSim: { ...sim.roundSim, winner: null } };
    const draw = f.paint('materialRoundBanner');
    const stopped = scrapHudFixture({ repeatRounds: false });
    while (stopped.sim.phase === 'running' && stopped.sim.step < 100 * 60) stopped.sim.stepOnce();
    for (let i = 0; i < 60; i++) stopped.sim.stepOnce();
    const finished = stopped.paint('materialRoundBanner');
    const out = { entranceVisible: samples[0].image !== samples[1].image,
      settled: samples[1].image === samples[2].image, seekEqual: samples[2].image === direct.image,
      readonly: samples.every(s => s.readOnly), countdown: samples[2].labels.includes('ROUND 1 · NEXT ROUND IN 3s'),
      draw: draw.labels.includes('DRAW') && !draw.labels.some(s => / WINS$/.test(s)),
      stopped: finished.labels.includes('ROUND 1 · COMPLETE') && !finished.labels.some(s => /NEXT ROUND/.test(s)) };
    f.destroy(); sought.destroy(); stopped.destroy(); return out;
  });
  assert.deepEqual(result, { entranceVisible: true, settled: true, seekEqual: true, readonly: true, countdown: true, draw: true, stopped: true });
});

test('Scrap-Turnierfinale: vier Platzierungen und gemeinsame Sieger bleiben erhalten', async () => {
  const result = await inspectHud(() => {
    const f = scrapHudFixture({ episodeMode: 'tournament' }), { sim } = f;
    while (sim.phase !== 'outro' && sim.step < 1200 * 60) sim.stepOnce();
    if (sim.phase !== 'outro') throw Error('Reference tournament did not finish.');
    for (let i = 0; i < 30; i++) sim.stepOnce();
    const hash = sim.stateHash(), events = JSON.stringify(sim.events);
    const normal = f.paint('finale');
    const natural = sim.champions();
    f.renderer.sim = { ...sim, wins: [3, 3, 1, 1], draws: 0, champions: () => [0, 1] };
    const tied = f.paint('finale');
    const expectedTitle = natural.length === 1 ? `${sim.roundSim.robots[natural[0]].name} WINS` : 'TIED FOR FIRST';
    const out = { normalTitle: normal.labels.includes(expectedTitle),
      normalRows: sim.roundSim.robots.every(r => normal.labels.includes(r.name)),
      tiedTitle: tied.labels.includes('TIED FOR FIRST'), tiedStars: tied.labels.filter(s => s === '★').length,
      tiedRows: sim.roundSim.robots.every(r => tied.labels.includes(r.name)),
      summary: tied.labels.includes('8 ROUNDS  ·  FINAL STANDINGS'), readOnly: hash === sim.stateHash() && events === JSON.stringify(sim.events) };
    f.destroy(); return out;
  });
  assert.deepEqual(result, { normalTitle: true, normalRows: true, tiedTitle: true, tiedStars: 2, tiedRows: true, summary: true, readOnly: true });
});

test('Scrap-HUD: Sunny Yard und Legacy verwenden keine der neuen P5-Darstellungen', async () => {
  const result = await inspectHud(() => {
    const modes = [];
    for (const [rulesVersion, arena, aspect] of [
      ['classic', 'yard', '16:9'], ['v2', 'yard', '9:16'], ['v3', 'sunshine', '16:9'], ['v3', 'sunshine', '9:16'],
    ]) {
      const f = scrapHudFixture({ rulesVersion, arena }, aspect);
      for (const method of ['materialHudPolished', 'materialRoundBanner', 'materialFinale'])
        f.renderer[method] = () => { throw Error(`${method} reached outside dark V3.`); };
      while (f.sim.phase === 'running' && f.sim.step < 100 * 60) f.sim.stepOnce();
      const hash = f.sim.stateHash(), events = JSON.stringify(f.sim.events);
      f.renderer.draw(); f.paint('finale');
      modes.push(f.sim.checkInvariants().ok && hash === f.sim.stateHash() && events === JSON.stringify(f.sim.events));
      f.destroy();
    }
    return modes;
  });
  assert.deepEqual(result, [true, true, true, true]);
});
