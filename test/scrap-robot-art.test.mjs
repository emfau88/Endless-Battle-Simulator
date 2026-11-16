import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launchBrowser, openExportPage } from '../lib/browser.mjs';

let browser;
before(async () => { browser = await launchBrowser({ gpu: process.env.EBS_GPU === '1' }); });
after(async () => { await browser?.close(); });

async function inspectArt(run) {
  const { page, errors } = await openExportPage(browser, { scenario: 'scrap', video: { resolution: 720 } });
  try {
    await page.evaluate(() => {
      window.robotArtFixture = (params = {}, aspect = '16:9') => {
        const cfg = EBS.normalizeConfig({ scenario: 'scrap', seed: 42, params,
          video: { aspect, resolution: 720 }, view: { hud: true, camera: false } });
        const sc = EBS.getScenario('scrap'), world = EBS.ASPECTS[aspect];
        const sim = sc.create({ seed: cfg.seed, params: cfg.params, world, view: cfg.view, timeScale: 1 });
        const renderer = sc.createRenderer({ sim, world, view: cfg.view, renderScale: 2 / 3 });
        const paintRobot = robot => {
          // Crop out names, HP and ammo: visual differences must come from the
          // machine itself, not merely from the telemetry reporting its state.
          const canvas = document.createElement('canvas'); canvas.width = 260; canvas.height = 132;
          const g = canvas.getContext('2d'); g.translate(96, 66); g.scale(2, 2);
          renderer.arena._robot(g, { ...robot, x: 0, y: 0 }, sim.roundSim.t);
          return canvas.toDataURL();
        };
        return { sim, renderer, paintRobot, destroy() { renderer.destroy(); sim.destroy(); } };
      };
    });
    const result = await page.evaluate(run);
    assert.deepEqual(errors.map(e => e.message), []);
    return result;
  } finally { await page.close(); }
}

test('Scrap-Roboter: Körperzustände sind sichtbar verschieden, hochaufgelöst und auf 16 Texturen begrenzt', async () => {
  const result = await inspectArt(() => {
    const f = robotArtFixture(), { sim, renderer, paintRobot } = f, art = renderer.arena;
    const colors = ['#ff725e', '#54dce8', '#ffce63', '#b0e779'];
    const before = sim.stateHash(), events = JSON.stringify(sim.events);
    const variants = [], references = [];
    for (let id = 0; id < 4; id++) {
      const base = { ...sim.roundSim.robots[id], vx: 0, vy: 0, angle: 0, hurtUntil: 0, flashUntil: 0 };
      const views = [
        base,
        { ...base, weapon: null },
        { ...base, hp: base.maxHp * .5 },
        { ...base, hp: base.maxHp * .2 },
        { ...base, hp: 0, alive: false, weapon: null },
      ];
      variants.push(new Set(views.map(paintRobot)).size);
      for (const [dead, stage] of [[false, 0], [false, 1], [false, 2], [true, 2]]) {
        const texture = art._bodyTexture(colors[id], dead, stage);
        references.push({ id, dead, stage, texture });
      }
    }
    // Different fractional HP, names and times do not create per-frame cache
    // entries. Only identity and the finite set of body states may matter.
    for (let n = 0; n < 24; n++) for (const robot of sim.roundSim.robots)
      paintRobot({ ...robot, hp: robot.maxHp * (n + 1) / 25, name: `frame ${n}` });
    const out = { variants, cacheSize: art._bodies.size,
      highResolution: references.every(x => x.texture.width === 416 && x.texture.height === 416),
      reused: references.every(x => art._bodyTexture(colors[x.id], x.dead, x.stage) === x.texture),
      readOnly: sim.stateHash() === before && JSON.stringify(sim.events) === events };
    f.destroy(); return out;
  });
  assert.deepEqual(result, { variants: [5, 5, 5, 5], cacheSize: 16, highResolution: true, reused: true, readOnly: true });
});

test('Scrap-Roboter: KO-Rauch endet nach sechs Videosekunden auch während der Ergebnispause', async () => {
  const result = await inspectArt(() => {
    const f = robotArtFixture({ rulesVersion: 'v3', arena: 'yard', endPauseSec: 8 }), { sim, paintRobot } = f;
    while (sim.phase === 'running' && sim.step < 100 * 60) sim.stepOnce();
    const ko = sim.events.filter(e => e.type === 'ko' && e.round === sim.roundNumber).at(-1);
    if (!ko) throw new Error('The deterministic reference round did not produce a KO.');
    const robot = sim.roundSim.robots[ko.team], samples = [];
    for (const age of [5.5, 6.25, 7]) {
      const target = Math.ceil(ko.step + age * 60);
      while (sim.step < target) sim.stepOnce();
      const hash = sim.stateHash(), events = JSON.stringify(sim.events), frozenTime = sim.roundSim.t;
      const frame = paintRobot(robot);
      samples.push({ frame, frozenTime, phase: sim.phase, ok: sim.checkInvariants().ok,
        readOnly: hash === sim.stateHash() && events === JSON.stringify(sim.events) });
    }
    const out = { beforeDiffers: samples[0].frame !== samples[1].frame,
      stopped: samples[1].frame === samples[2].frame,
      allInPause: samples.every(s => s.phase === 'pause'),
      roundTimeFrozen: samples.every(s => s.frozenTime === samples[0].frozenTime),
      readOnlyAndValid: samples.every(s => s.readOnly && s.ok) };
    f.destroy(); return out;
  });
  assert.deepEqual(result, { beforeDiffers: true, stopped: true, allInPause: true, roundTimeFrozen: true, readOnlyAndValid: true });
});

test('Scrap-Roboter: Blaster bleiben pixelgleich zur Quelle; neue Körper laufen auch in Legacy und Sunny Yard', async () => {
  const result = await inspectArt(() => {
    const f = robotArtFixture(), weapon = (method, kind, loaded, miniature) => {
      const canvas = document.createElement('canvas'); canvas.width = 180; canvas.height = 100;
      const g = canvas.getContext('2d'); g.translate(20, 50); g.scale(2, 2);
      method.call(f.renderer.arena, g, kind, loaded, '#ffce63', miniature);
      return { image: canvas.toDataURL(), visible: g.getImageData(0, 0, 180, 100).data.some((n, i) => i % 4 === 3 && n > 0) };
    };
    const current = f.renderer.arena._weapon, source = ScrapArena.Renderer.prototype._weapon;
    const comparisons = [];
    for (const loaded of [false, true]) for (const miniature of [false, true]) {
      const a = weapon(current, 'blaster', loaded, miniature), b = weapon(source, 'blaster', loaded, miniature);
      comparisons.push(a.visible && b.visible && a.image === b.image);
    }
    const rocketChanged = weapon(current, 'rocket', true, false).image !== weapon(source, 'rocket', true, false).image;
    f.destroy();
    const modes = [];
    for (const [rulesVersion, arena, aspect] of [
      ['classic', 'yard', '16:9'], ['v2', 'yard', '9:16'], ['v3', 'yard', '16:9'],
      ['v3', 'sunshine', '16:9'], ['v3', 'sunshine', '9:16'],
    ]) {
      const scene = robotArtFixture({ rulesVersion, arena }, aspect);
      while (scene.sim.step < 8 * 60) scene.sim.stepOnce();
      const hash = scene.sim.stateHash(), events = JSON.stringify(scene.sim.events);
      scene.renderer.draw();
      modes.push({ rulesVersion, arena, aspect, ok: scene.sim.checkInvariants().ok,
        readOnly: hash === scene.sim.stateHash() && events === JSON.stringify(scene.sim.events),
        bodiesVisible: scene.renderer.arena._bodies.size > 0 });
      scene.destroy();
    }
    return { comparisons, rocketChanged, modes };
  });
  assert.deepEqual(result.comparisons, [true, true, true, true]);
  assert.ok(result.rocketChanged);
  for (const mode of result.modes) assert.ok(mode.ok && mode.readOnly && mode.bodiesVisible, JSON.stringify(mode));
});
