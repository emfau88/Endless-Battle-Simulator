import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { INDEX, launchBrowser } from '../lib/browser.mjs';

let browser, page, lifecycle;
const errors = [];
const cfg = { scenario: 'marbleworks', seed: 42,
  params: { orderSize: 24, productionSpeed: 2, intensity: 2, exportLength: 'duration',
    cameraMode: 'manual', cameraPosition: 46, cameraZoom: 1.2 },
  video: { aspect: '16:9', resolution: 720, fps: 30, tempo: 1, audio: false },
  view: { hud: false, camera: true } };

before(async () => {
  browser = await launchBrowser({ gpu: process.env.EBS_GPU === '1' });
  page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(pathToFileURL(INDEX).href + '?scenario=marbleworks&paused=1');
  await page.waitForFunction(() => EBS.app?.session?.renderer?.effects);
  lifecycle = await page.evaluate(config => {
    const session = EBS.app.session;
    // Resolution is irrelevant to lifecycle checks; keep the few real shader
    // checkpoints affordable on CI's software renderer as well as local GPUs.
    session.fixedScale = .5;
    session.start(config);
    const sim = session.sim, renderer = session.renderer, effects = renderer.effects;
    const initial = { ...effects.stats };
    const capacities = { sprayParticles: 44, glints: 2, heatRibbons: 8 };
    const maxima = { sprayParticles: 0, glints: 0, heatRibbons: 0 }, checkpoints = {};
    const violations = [];
    let finishStep = null;
    for (let step = 0; step < 12000; step++) {
      session.step();
      if (sim.completedAt != null && finishStep == null) finishStep = sim.step;
      if (sim.step % 3 === 0) {
        const hash = sim.stateHash(), sequence = sim.eventSeq;
        const events = sim.step % 60 === 0 ? JSON.stringify(sim.events) : null;
        effects.update(sim, renderer.ballMeshes, renderer.camera3);
        if (hash !== sim.stateHash() || sequence !== sim.eventSeq || (events !== null && events !== JSON.stringify(sim.events))) {
          violations.push('Effect update changed production or events at step ' + sim.step);
        }
        const s = effects.stats;
        if (s.sprayParticles && (sim.level === 0 || !sim.stations.coat.some(st => st.ball?.finishLevel > 0 && st.progress > 0 && st.progress < 1))) {
          violations.push('Spray without earned, active colour processing at step ' + sim.step);
        }
        if (s.heatRibbons && !sim.stations.anneal.some(st => st.ball && st.ball.temperature > 0)) {
          violations.push('Thermal effect without hot workpiece at step ' + sim.step);
        }
        if (s.glints && !sim.balls.some(ball => ball.polishedOnce && ball.state === 'toCoat')) {
          violations.push('Glint without a freshly processed output at step ' + sim.step);
        }
        for (const key of Object.keys(capacities)) {
          if (!Number.isInteger(s[key]) || s[key] < 0 || s[key] > capacities[key]) violations.push('Unbounded ' + key);
          if (s[key] > maxima[key]) { maxima[key] = s[key]; checkpoints[key] = { step: sim.step, count: s[key] }; }
        }
        if (effects.root.children.length !== 3) violations.push('Particle batches grew over time');
        for (const mesh of effects.root.children) {
          for (const [name, attribute] of Object.entries(mesh.geometry.attributes)) {
            if (!name.startsWith('effect')) continue;
            const active = mesh.geometry.instanceCount * attribute.itemSize;
            for (let i = 0; i < active; i++) if (!Number.isFinite(attribute.array[i])) violations.push('Non-finite effect attribute');
          }
        }
      }
      if (finishStep != null && sim.step >= finishStep + 120) break;
    }
    session.render();
    return { initial, maxima, checkpoints, violations, complete: sim.stats.completed === sim.orderSize,
      final: { ...effects.stats }, visibleAfterCompletion: effects.root.visible, invariant: sim.checkInvariants() };
  }, cfg);
});
after(async () => { await page?.close(); await browser?.close(); });

test('Marble Works effects follow processing, remain bounded and leave production/audio events untouched', () => {
  assert.deepEqual(lifecycle.violations, []);
  assert.equal(lifecycle.complete, true);
  assert.equal(lifecycle.invariant.ok, true, lifecycle.invariant.errors.join('; '));
  for (const key of ['sprayParticles', 'glints', 'heatRibbons']) {
    assert.equal(lifecycle.initial[key], 0, key + ' must be absent in the idle factory');
    assert.ok(lifecycle.maxima[key] > 0, key + ' never appeared during the real order');
    assert.equal(lifecycle.final[key], 0, key + ' persisted after completion');
  }
  assert.equal(lifecycle.visibleAfterCompletion, false);
  assert.deepEqual(errors, []);
});

test('Active spray, polish glints and thermal effects render identically after seeking or intermediate draws', async () => {
  for (const [kind, aspect, cameraPosition] of [
    ['sprayParticles', '16:9', 46], ['glints', '16:9', 20], ['heatRibbons', '9:16', 63],
  ]) {
    const targetStep = lifecycle.checkpoints[kind].step;
    const result = await page.evaluate(({ config, targetStep, kind, aspect, cameraPosition }) => {
      const session = EBS.app.session;
      const current = { ...config, params: { ...config.params, cameraPosition }, video: { ...config.video, aspect } };
      const capture = withHistory => {
        session.start(current);
        const milestones = [Math.floor(targetStep / 3), Math.floor(targetStep * 2 / 3)];
        while (session.sim.step < targetStep) {
          session.step();
          if (withHistory && milestones.includes(session.sim.step)) session.render();
        }
        const hash = session.sim.stateHash(), events = JSON.stringify(session.sim.events);
        session.render();
        const image = session.renderer.canvas.toDataURL('image/png');
        session.render();
        const repeat = session.renderer.canvas.toDataURL('image/png');
        const renderer = session.renderer, effectRoot = renderer.effects.root;
        const batchIndex = ['sprayParticles', 'glints', 'heatRibbons'].indexOf(kind);
        const visibility = effectRoot.children.map(mesh => mesh.visible);
        effectRoot.children.forEach((mesh, i) => { mesh.visible = i === batchIndex; });
        renderer.gl.render(renderer.scene, renderer.camera3);
        const visibleEffect = renderer.gl.domElement.toDataURL('image/png');
        effectRoot.visible = false;
        renderer.gl.render(renderer.scene, renderer.camera3);
        const withoutEffect = renderer.gl.domElement.toDataURL('image/png');
        effectRoot.visible = true;
        effectRoot.children.forEach((mesh, i) => { mesh.visible = visibility[i]; });
        return { image, repeat, visiblyRendered: visibleEffect !== withoutEffect,
          stable: hash === session.sim.stateHash() && events === JSON.stringify(session.sim.events),
          hash: session.sim.stateHash(), count: session.renderer.effects.stats[kind] };
      };
      return { direct: capture(false), history: capture(true) };
    }, { config: cfg, targetStep, kind, aspect, cameraPosition });
    assert.ok(result.direct.count > 0, kind + ' must be active at its shader checkpoint');
    assert.equal(result.direct.visiblyRendered, true, kind + ' changes no visible pixels');
    assert.equal(result.direct.stable, true); assert.equal(result.history.stable, true);
    assert.equal(result.direct.hash, result.history.hash);
    assert.equal(result.direct.image, result.direct.repeat, kind + ' changed without a physics step');
    assert.equal(result.direct.image, result.history.image, kind + ' depends on render history');
  }
  assert.deepEqual(errors, []);
});
