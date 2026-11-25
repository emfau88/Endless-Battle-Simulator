// Endless Burrow: Simulation ohne Browser (Wiederholbarkeit, Grenzen, Fressen und Schlüpfen).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const context = { EBS: {} };
runInNewContext(readFileSync(new URL('../src/scenarios/burrow/simulation.js', import.meta.url), 'utf8'), context, { filename: 'burrow/simulation.js' });
const B = context.EBS.Burrow;
const worlds = [{ w: 1920, h: 1080 }, { w: 1080, h: 1920 }];
const create = (seed = 42, params = {}, world = worlds[0]) => new B.Simulation({ seed, params, world });
function run(sim, seconds, every = 300) {
  for (let i = 1; i <= Math.round(seconds * 60); i++) {
    sim.stepOnce();
    if (i % every === 0) { const c = sim.checkInvariants(); assert.ok(c.ok, `t=${sim.videoTime}: ${c.errors.join('; ')}`); }
  }
  return sim;
}
const types = (sim) => new Set(sim.events.filter(Boolean).map((e) => e.type));

test('Gleicher Seed ergibt denselben Ablauf, anderer Seed einen anderen', () => {
  const a = run(create(7), 60), b = run(create(7), 60), c = run(create(8), 60);
  assert.equal(a.stateHash(), b.stateHash());
  assert.notEqual(a.stateHash(), c.stateHash());
  assert.equal(a.eventSeq, b.eventSeq);
});

for (const world of worlds) {
  const format = world.w > world.h ? '16:9' : '9:16';
  test(`${format}: fünf Minuten Dauerlauf bleiben in Grenzen, es wird gefressen und geschlüpft`, () => {
    const sim = create(42, {}, world);
    assert.equal(sim.step, 0, 'Vorlauf zählt nicht mit');
    assert.equal(sim.eaten, 0);
    run(sim, 300);
    const s = sim.snapshot();
    assert.ok(s.eaten >= 40, `zu wenig gefressen: ${s.eaten}`);
    assert.ok(s.hatched >= 30, `zu wenig geschlüpft: ${s.hatched}`);
    assert.ok(s.alive >= 5, `zu wenige Würmer unterwegs: ${s.alive}`);
    assert.ok(sim.food.length <= B.RULES.foodCap);
    const seen = types(sim);
    for (const t of ['eat', 'gulp', 'hatch']) assert.ok(seen.has(t), `Ereignis ${t} fehlt`);
    // die Größten bleiben nicht für immer an der Obergrenze
    const top = Math.max(...sim.worms.map((w) => w.mass));
    assert.ok(top <= B.RULES.maxMass);
  });
}

test('Die Führung wechselt im Lauf eines längeren Videos', () => {
  const sim = create(42), leaders = new Set();
  for (let s = 0; s < 600; s += 5) { run(sim, 5); leaders.add(sim.leader()?.name); }
  assert.ok(leaders.size >= 2, `immer derselbe Anführer: ${[...leaders]}`);
});

test('Einstellungen: Zahl der Würmer und Futtermenge wirken', () => {
  assert.equal(create(1, { worms: 8 }).worms.length, 8);
  assert.equal(create(1, { worms: 20 }).worms.length, 20);
  const few = run(create(3, { food: 0.5 }), 20), many = run(create(3, { food: 2 }), 20);
  const garden = (sim) => sim.food.filter((f) => f.kind !== B.CHUNK).length;
  assert.ok(garden(many) > garden(few) * 1.5, `${garden(few)} / ${garden(many)}`);
});

test('Biss: Jäger wächst, Beute verschwindet, Bröckchen in ihrer Farbe bleiben liegen', () => {
  const sim = create(5);
  const before = sim.food.length;
  const [a, b] = [sim.worms[0], sim.worms[1]];
  a.mass = 200; b.mass = 40;
  sim._devour(a, b);
  assert.equal(b.alive, false);
  assert.ok(a.mass > 200);
  const chunks = sim.food.slice(before).filter((f) => f.kind === B.CHUNK);
  assert.ok(chunks.length >= 3 && chunks.every((f) => f.c === b.id));
  assert.equal(sim.bites.at(-1).victim, b.id);
  run(sim, B.RULES.respawnMax + 0.5);
  assert.equal(b.alive, true, 'Beute schlüpft wieder');
  assert.ok(b.mass < 40);
});
