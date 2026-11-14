import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({}); context.window = context;
for (const file of ['src/core.js', 'src/scenarios/marble/production-simulation.js']) {
  vm.runInContext(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), context, { filename: file });
}
const { Simulation, WORLD } = context.EBS.MarbleProduction;
const make = (params = {}, extra = {}) => new Simulation({ seed: 42, params, ...extra });
const plain = object => JSON.parse(JSON.stringify(object));
function advance(sim, seconds, every = 600) {
  for (let i = 0; i < seconds * 60; i++) {
    sim.stepOnce();
    if (i % every === 0) assert.deepEqual(plain(sim.checkInvariants().errors), [], `t=${sim.t}`);
  }
  return sim.snapshot();
}
function finish(sim, limit = 1200) {
  for (let i = 0; i < limit * 60 && sim.completedAt === null; i++) {
    sim.stepOnce();
    if (i % 600 === 0) assert.ok(sim.checkInvariants().ok, sim.checkInvariants().errors.join('; '));
  }
  assert.ok(sim.completedAt !== null, JSON.stringify(sim.snapshot()));
  return sim.snapshot();
}

test('Progressive: complete 5–8 minute default order has real stages, two earned expansions and exact conservation', () => {
  const sim = make();
  assert.deepEqual(plain(WORLD), { w: 6000, h: 1500 });
  advance(sim, 35);
  assert.equal(sim.level, 0, 'Elapsed time alone must not unlock machines');
  assert.equal(sim.stations.polish[1].active, false);
  const s = finish(sim);
  assert.ok(s.completedAt >= 300 && s.completedAt <= 480, String(s.completedAt));
  assert.deepEqual([s.released, s.polished, s.coated, s.cooled, s.inspected, s.completed], [144, 144, 144, 144, 144, 144]);
  assert.deepEqual(plain(s.sorted), [24, 24, 24, 24, 24, 24]);
  assert.deepEqual(plain(s.milestones.map(m => [m.type, m.completed])), [['coating', 12], ['parallel', 36], ['complete', 144]]);
  assert.ok(s.maxQueue >= 8 && s.blockedTicks > 0, 'Demand must create a genuine bottleneck');
  assert.ok(s.parallelProcessed > 20, 'Second lane must carry real products');
  assert.ok(s.maxJump < 12, `Discontinuous transport: ${s.maxJump}`);
  assert.ok(sim.balls.every(b => b.polish === 1 && b.quality === 1 && b.temperature === 0 && b.bin === b.color));
  assert.ok(sim.balls.some(b => b.grade === 'clear') && sim.balls.some(b => b.grade === 'swirl'), 'Coating unlock must change the product');
  const final = plain(sim.stats), milestones = plain(sim.milestones), events = sim.eventSeq;
  advance(sim, 60);
  assert.deepEqual(plain(sim.stats), final);
  assert.deepEqual(plain(sim.milestones), milestones);
  assert.equal(sim.eventSeq, events, 'Finale must occur exactly once');
});

test('Progressive: seed, viewport, resolution, FPS and camera do not alter physical outcome', () => {
  const a = make({ cameraMode: 'auto' }, { world: { w: 1920, h: 1080 }, video: { fps: 60, resolution: 720 } });
  const b = make({ cameraMode: 'manual', cameraPosition: 83, cameraZoom: 1.5 }, { world: { w: 1080, h: 1920 }, video: { fps: 30, resolution: 2160 } });
  const c = make({}, { seed: 99 });
  advance(a, 110); advance(b, 110); advance(c, 110);
  assert.equal(a.stateHash(), b.stateHash());
  assert.notEqual(a.stateHash(), c.stateHash());
  b.setParam('cameraMode', 'overview'); b.setParam('cameraPosition', 0);
  assert.equal(a.stateHash(), b.stateHash());
  advance(a, 15); advance(b, 15);
  assert.equal(a.stateHash(), b.stateHash());
});

for (const material of ['glass', 'steel', 'rubber', 'mixed']) {
  test(`Progressive: ${material} completes with all stages, stable accounting, and material mechanics`, () => {
    const sim = make({ material, orderSize: 24, productionSpeed: 2, intensity: 2, product: 'pearl' });
    const s = finish(sim, 400);
    assert.equal(s.completed, 24);
    assert.equal(s.cooled, 24);
    assert.deepEqual(plain(s.sorted), [4, 4, 4, 4, 4, 4]);
    assert.equal(s.level, 2);
    assert.ok(s.parallelProcessed > 0);
    assert.ok(s.maxJump < 14, String(s.maxJump));
    assert.ok(sim.checkInvariants().ok, sim.checkInvariants().errors.join('; '));
    if (material === 'rubber') assert.ok(sim.balls.every(b => b.settleAge >= 1.1), 'Rubber must physically rebound before acceptance');
    if (material === 'mixed') assert.equal(new Set(sim.balls.map(b => b.material)).size, 3);
  });
}

test('Progressive: maximum order and feed pressure drain safely, bins retain every product', () => {
  const sim = make({ orderSize: 360, productionSpeed: 2, intensity: 2, material: 'mixed' });
  const s = finish(sim, 800);
  assert.equal(s.completed, 360);
  assert.deepEqual(plain(s.sorted), [60, 60, 60, 60, 60, 60]);
  assert.equal(sim.drops.length, 0);
  assert.equal(sim.pickup, null);
  assert.ok(sim.checkInvariants().ok);
  assert.ok(sim.balls.every(b => b.y > 900 && b.y < 1400));
});

test('Progressive: material and product variants change manufacturing duration, not just paint', () => {
  const glass = make({ orderSize: 24, material: 'glass', product: 'clear' });
  const steel = make({ orderSize: 24, material: 'steel', product: 'pearl' });
  const rubber = make({ orderSize: 24, material: 'rubber', product: 'swirl' });
  const durations = [finish(glass).completedAt, finish(steel).completedAt, finish(rubber).completedAt];
  assert.ok(durations[1] > durations[0] + 5, JSON.stringify(durations));
  assert.ok(durations[2] < durations[1] - 5, JSON.stringify(durations));
});

test('Progressive: live tempo change preserves monotonic time and export events use video ticks', () => {
  const sim = make({ orderSize: 24 });
  advance(sim, 10); const before = sim.t;
  sim.setTimeScale(0.64); sim.stepOnce();
  assert.ok(sim.t > before && sim.t < before + 0.02);
  advance(sim, 20);
  for (const event of sim.drainEvents()) assert.ok(Math.abs(event.t - event.step / 60) < 1e-12);
  sim.setTimeScale(NaN); assert.ok(Number.isFinite(sim.dt));
  assert.ok(sim.checkInvariants().ok);
});

test('Progressive: queued marbles keep physical clearance across machines, splitter and merge during every handoff', () => {
  const sim = make({ orderSize: 48, material: 'mixed', productionSpeed: 2, intensity: 2 });
  let occupiedQueueChecks = 0, outgoingChecks = 0, injected = false;
  for (let tick = 0; tick < 240 * 60 && sim.completedAt === null; tick++) {
    sim.stepOnce();
    const tr = sim.tracks;
    const boundaries = [
      ...sim.stations.polish.map((st, i) => [st, tr.polish[i], tr.coat[i]]),
      ...sim.stations.coat.map((st, i) => [st, tr.coat[i], tr.cool[i]]),
      ...sim.stations.anneal.map((st, i) => [st, tr.cool[i], tr.inspect[i]]),
      [sim.stations.inspect, tr.scan, tr.sort],
    ];
    for (const [st, input, output] of boundaries) {
      const incoming = input.balls[0], outgoing = output.balls.at(-1);
      const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
      if (incoming && st.ball) {
        occupiedQueueChecks++;
        assert.ok(distance(incoming, st.ball) >= 43.99, `Queue penetrates ${st.kind} at ${sim.t}`);
        if (!injected) {
          const x = incoming.x, y = incoming.y;
          incoming.x = st.ball.x; incoming.y = st.ball.y;
          assert.ok(sim.checkInvariants().errors.some(e => e.includes('Maschinenübergang')), 'Invariant must catch the original overlap regression');
          incoming.x = x; incoming.y = y; injected = true;
        }
      }
      if (incoming && outgoing && !st.ball) {
        outgoingChecks++;
        assert.ok(distance(incoming, outgoing) >= 43.99, `Output handoff overlaps at ${st.kind}`);
      }
    }
    if (tick % 6 === 0) assert.ok(sim.checkInvariants().ok, sim.checkInvariants().errors.join('; '));
  }
  assert.ok(sim.completedAt !== null);
  assert.ok(occupiedQueueChecks > 1000 && outgoingChecks > 100, 'Exercise held-machine and departing-ball boundaries');
  assert.equal(sim.stats.completed, 48);
});
