// Marble Knockout (R43/M4): Rennablauf und Anmeldung. Plan: docs/MARBLE_KNOCKOUT_PLAN_2026-11-25.md, Abschnitt 4.
// Läuft ohne Browser. Bildvergleich und Seek-Prüfung im Browser folgen mit der Darstellung (M5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { FILES } from '../scripts/knockout-lab.mjs';

// Ein Zeichenkontext, der alles annimmt und nichts tut: Damit läuft der Painter in Node.
const stub = () => new Proxy(function () {}, {
  get: (_t, k) => (k === 'width' ? 10 : k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : stub()),
  set: () => true, apply: () => stub(),
});
const canvas = () => ({ width: 1, height: 1, getContext: () => stub() });

function load() {
  const context = vm.createContext({ console, document: { createElement: canvas } }); context.window = context;
  const root = new URL('../', import.meta.url);
  for (const p of [...FILES, 'src/canvas-scene.js', 'src/scenarios/knockout/art.js', 'src/scenarios/knockout/renderer.js', 'src/scenarios/knockout.js']) {
    vm.runInContext(readFileSync(new URL(p, root), 'utf8'), context, { filename: p });
  }
  return context.EBS;
}
const EBS = load(), sc = EBS.getScenario('knockout');
const LAND = { w: 1920, h: 1080 };
const create = (seed, params = {}, world = LAND) => sc.create({ seed, params: sc.normalizeParams(params), world, timeScale: 1 });
const plain = (v) => JSON.parse(JSON.stringify(v));

test('Anmeldung: Name, Standardwerte und Prüfung der Einstellungen', () => {
  assert.equal(sc.title, 'Marble Knockout (in Arbeit)');
  assert.deepEqual(plain(sc.normalizeParams({})), { mode: 'race', short: 'A', stage: 0, element: 'all', slowmo: 'on', marks: 'on', display: 'on', videoEnd: 'finish' });
  const p = sc.normalizeParams({ mode: 'x', short: 'Z', stage: 42, element: 'nope', slowmo: 'off', script: [3, 4, 5], field: 99 });
  assert.deepEqual([p.mode, p.short, p.stage, p.element, p.slowmo, plain(p.script), p.field], ['race', 'A', 9, 'all', 'off', [3, 4, 5], undefined]);
  assert.equal(sc.normalizeParams({ script: [1, -2] }).script, undefined, 'Drehbuch nur mit ganzen Zahlen ≥ 0');
  // Quadrat rechnet im Querformat (die Bahnen sind für 16:9 gebaut)
  const sq = create(1, {}, { w: 1080, h: 1080 });
  assert.deepEqual([sq.W, sq.H, sq.format], [1920, 1080, 'long']);
});

test('Ganzes Rennen: alle zehn Bahnen enden, neun scheiden aus, drei im Finale, Podest und Kapitel', () => {
  const sim = create(2);
  let stages = 0, last = -1;
  while (sim.phase !== 'end' && sim.t < 900) {
    sim.stepOnce();
    if (sim.stageNo !== last) { last = sim.stageNo; stages++; }
    if (sim.step % 300 === 0) { const c = sim.checkInvariants(); assert.ok(c.ok, `${sim.t.toFixed(1)} s: ${c.errors.join(', ')}`); }
  }
  assert.equal(sim.phase, 'end');
  assert.equal(stages, 10);
  assert.equal(sim.outList.length, 9);
  assert.equal(sim.roster.filter((m) => m.alive).length, 3);
  assert.equal(new Set(sim.podium).size, 3);
  for (const id of sim.podium) assert.ok(sim.roster[id].alive, 'nur Finalisten auf dem Podest');
  const ch = sc.chapters(sim);
  assert.equal(ch.length, 11);
  assert.deepEqual([ch[0].timeSec, ch[0].title, ch[9].title, ch[10].title], [0, 'Stage 1: The Drop', 'Grand Final', 'Podium']);
  for (let i = 1; i < ch.length; i++) assert.ok(ch[i].timeSec > ch[i - 1].timeSec);
  assert.ok(sim.t > 180 && sim.t < 480, `Videolänge ${sim.t.toFixed(0)} s`);
});

test('Gleicher Seed ergibt dasselbe Rennen, anderer Seed ein anderes', () => {
  const run = (seed) => { const s = create(seed); for (let i = 0; i < 60 * 70; i++) s.stepOnce(); return [s.stateHash(), s.stageNo, s.outList.join()]; };
  assert.deepEqual(run(7), run(7));
  assert.notEqual(run(7)[0], run(8)[0]);
});

test('Zeichnen verändert den Zustand nicht (Painter mit leerem Zeichenkontext)', () => {
  const sim = create(3), painter = new EBS.KnockoutRender.Painter(sim, 1), g = stub();
  for (const t of [1, 6, 30, 70]) {
    while (sim.t < t) sim.stepOnce();
    const before = sim.stateHash(), seq = sim.eventSeq;
    painter.paint(g); painter.paint(g);
    assert.equal(sim.stateHash(), before, `bei ${t} s`);
    assert.equal(sim.eventSeq, seq);
  }
});

test('Export: Länge aus dem Ablauf bis zum Ende des Podests', () => {
  assert.equal(sc.hasNaturalDuration({ params: sc.normalizeParams({}) }), true);
  assert.equal(sc.hasNaturalDuration({ params: sc.normalizeParams({ videoEnd: 'free' }) }), false);
  const cfg = { seed: 2, params: sc.normalizeParams({}), video: { fps: 30, tempo: 1 } };
  const plan = sc.createExportPlan(cfg, LAND);
  let r; do r = plan.advance(); while (!r.done);
  const sim = create(2); while (sim.phase !== 'end') sim.stepOnce();
  assert.ok(Math.abs(r.durationSec - (sim.t + 0.5)) < 0.05, `${r.durationSec} gegen ${sim.t}`);
  assert.equal(sc.createExportPlan({ ...cfg, params: sc.normalizeParams({ mode: 'stage' }) }, LAND), null);
});
