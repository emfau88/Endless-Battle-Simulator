import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { originalSimulation, fullState, sha, sourceSha } from '../scripts/territory-reference.mjs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const context = vm.createContext({}); context.window = context;
for (const file of ['src/core.js', 'src/scenarios/territory/simulation.js', 'src/scenarios/territory/episode.js']) vm.runInContext(read(file), context, { filename: file });
const { Episode, ObservedRound, roundSeed, normalizeParams } = context.EBS.Territory;
const make = (extra = {}) => new Episode({ seed: 42, params: {}, world: { w: 1920, h: 1080 }, ...extra });
const plain = o => JSON.parse(JSON.stringify(o));
const advance = (s, seconds, fps = 60) => {
  for (let frame = 0; frame < Math.round(seconds * fps); frame++) for (let tick = 0; tick < 60 / fps; tick++) s.stepOnce();
};
const check = s => assert.deepEqual(plain(s.checkInvariants()), { ok: true, errors: [] });

test('Territory: archived source checksum and extracted simulation are unchanged', () => {
  const { script } = originalSimulation();
  assert.equal(read('src/scenarios/territory/simulation.js'), script);
  assert.equal(JSON.parse(read('src/scenarios/territory/SOURCE.json')).sha256, sourceSha);
  assert.ok(!script.includes('requestAnimationFrame'));
  const scripts = [...read('docs/reference/territory-wars-hex-dominion-v0.3.source.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert.equal(read('src/scenarios/territory/renderer.js'), scripts[1].trim() + '\n');
  assert.ok(read('src/scenarios/territory/presentation.js').includes(scripts[2].slice(scripts[2].indexOf('  function roundRect('), scripts[2].indexOf('  function render()'))));
});

const fixture = JSON.parse(read('test/fixtures/territory-prototype.json'));
for (const entry of fixture.cases) test(`Territory: full original trajectory seed ${entry.options.seed}/${entry.options.layout}`, () => {
  const { Sim } = originalSimulation();
  const source = new Sim(entry.options), observed = new ObservedRound(entry.options), events = [];
  Object.defineProperty(observed, 'emit', { value: (...event) => events.push(event) });
  for (const expected of entry.states) {
    while (source.ticks < expected.requestedTick && source.phase === 'running') {
      source.step(.1); observed.step(.1);
      // Compare complete state every simulated second, plus fixed reference
      // checkpoints and victory below (never just ownership or the source hash).
      if (source.ticks % 10 === 0) assert.equal(fullState(observed), fullState(source), `tick ${source.ticks}`);
    }
    assert.equal(sha(fullState(source)), expected.sha256, 'fixed pre-adaptation reference');
    assert.equal(sha(fullState(observed)), expected.sha256);
  }
  assert.equal(events.filter(e => e[0] === 'dispatch').length, observed.moveId);
  assert.equal(events.filter(e => e[0] === 'capture').length, observed.roundStats.captures);
  assert.equal(events.filter(e => e[0] === 'battle').length, observed.roundStats.battles);
  assert.equal(events.filter(e => e[0] === 'build').length, observed.roundStats.bunkersBuilt);
  assert.equal(events.filter(e => e[0] === 'hq').length, 3);
  assert.equal(events.filter(e => e[0] === 'victory').length, 1);
});

test('Territory: 0.25–2× including 0.75× preserve 0.1-second rules at 30/60 fps', () => {
  const { Sim } = originalSimulation();
  for (const tempo of [.25, .5, .75, 1, 1.25, 1.5, 2]) {
    const runs = [30, 60].map(fps => {
      const e = make({ timeScale: tempo }); advance(e, 24, fps); check(e);
      const source = new Sim({ seed: 42 });
      for (let i = 0; i < Math.floor(24 * tempo / .1 + 1e-8); i++) source.step(.1);
      assert.equal(fullState(e.roundSim), fullState(source));
      assert.ok(Math.abs(e.accumulator) < 1e-8);
      for (const event of e.events) assert.ok(Math.abs(event.videoTime - event.roundTime / tempo) < 1e-8, 'event uses video time exactly once');
      return e;
    });
    assert.equal(runs[0].stateHash(), runs[1].stateHash());
    assert.deepEqual(plain(runs[0].events), plain(runs[1].events));
  }
});

test('Territory: live tempo/rule changes preserve the world and accumulator', () => {
  const { Sim } = originalSimulation();
  const e = make(), r = e.roundSim;
  advance(e, 1); assert.ok(Math.abs(e.accumulator - .05) < 1e-8);
  const saved = e.accumulator; e.setTimeScale(1.25);
  assert.equal(e.roundSim, r); assert.equal(e.accumulator, saved);
  e.setParam('incomeMultiplier', 1.3); e.setParam('offensiveInterval', 2.5);
  const source = new Sim({ seed: 42 });
  for (let i = 0; i < 7; i++) source.step(.1);
  source.configure({ incomeMultiplier: 1.3 }); source.configure({ offensiveInterval: 2.5 });
  advance(e, 1); for (let i = 0; i < 13; i++) source.step(.1);
  assert.equal(fullState(e.roundSim), fullState(source)); check(e);
  const future = e.events.filter(event => event.roundTime > .7);
  for (const event of future) assert.ok(Math.abs(event.videoTime - (1 + (event.roundTime - .75) / 1.25)) < 1e-8);
});

test('Territory: complete audio stream survives UI truncation, includes all dispatches and captures', () => {
  const e = make({ seed: 7, timeScale: 1, params: { repeatRounds: false } }); advance(e, 200);
  check(e); assert.equal(e.phase, 'ended');
  const r = e.roundSim;
  assert.equal(e.eventSeq, e.events.length);
  assert.equal(e.events.filter(x => x.type === 'dispatch').length, r.moveId);
  assert.equal(e.events.filter(x => x.type === 'capture').length, r.roundStats.captures);
  assert.equal(e.events.filter(x => x.type === 'battle').length, r.roundStats.battles);
  assert.equal(e.events.filter(x => x.type === 'build').length, r.roundStats.bunkersBuilt);
  assert.ok(r.events.length <= 36);
  const neutralCapture = e.events.find(x => x.type === 'capture' && x.previous === -1);
  assert.ok(neutralCapture, 'neutral captures are semantic events too');
  assert.equal(r.events.some(x => x.type === 'capture' && x.time === neutralCapture.roundTime && x.tile === neutralCapture.tile), false,
    'the UI feed cannot represent this real capture');
  assert.deepEqual(plain(e.events.map(x => x.seq)), Array.from({ length: e.eventSeq }, (_, i) => i));
  assert.ok(e.events.filter(x => x.type === 'dispatch').every(x => Object.keys(x.move).sort().join(',') === 'amount,duration,from,id,kind,owner,start,to'));
});

test('Territory: deterministic following round, result hold measured in video time, 600-second pure simulation', () => {
  const a = make({ seed: 7 }), b = make({ seed: 7 });
  while (a.phase === 'running') a.stepOnce();
  const finishStep = a.step, finishHash = fullState(a.roundSim), finishEvent = a.events.find(x => x.type === 'victory');
  assert.ok(Math.abs((a.pauseUntil - finishEvent.step) / 60 - 9) < 1e-8);
  advance(a, 8.5); assert.equal(a.roundNumber, 1); assert.equal(fullState(a.roundSim), finishHash);
  a.setTimeScale(2); // Tempo must not shorten an existing result pause.
  while (a.roundNumber === 1) a.stepOnce();
  assert.ok(Math.abs(a.step - finishStep - 9 * 60) <= 1);
  assert.equal(a.roundSeed, roundSeed(7, 2));
  const following = new context.HexSim.Sim({ seed: roundSeed(7, 2) });
  assert.equal(fullState(a.roundSim), fullState(following));
  // Replay the same tempo edit at precisely the same host step.
  while (b.step < finishStep + 510) b.stepOnce(); b.setTimeScale(2);
  while (a.step < 36000) a.stepOnce(); while (b.step < 36000) b.stepOnce();
  assert.equal(a.stateHash(), b.stateHash()); check(a); check(b);
  assert.ok(a.completedRounds >= 2);
  assert.ok(a.events.length > 4096, 'complete sequence is retained beyond old ring-buffer sizes');
  assert.equal(a.events.at(-1).seq, a.events.length - 1);
});

test('Territory: tick observation does not alter gameplay; initialisation and next round notify', () => {
  const e = make({ seed: 7, timeScale: 2 }), baseline = make({ seed: 7, timeScale: 2 });
  let count = 0, resets = 0;
  const off = e.addTickObserver((r, { newRound }) => { if (newRound) resets++; else count++; assert.ok(r.tiles.length); });
  advance(e, 120); advance(baseline, 120);
  assert.equal(e.stateHash(), baseline.stateHash()); assert.equal(count, e.simTicks); assert.equal(resets, 1);
  off(); const previous = count; advance(e, 1); assert.equal(count, previous);
});

test('Territory: following rounds can be disabled and resumed during the result hold', () => {
  const e = make({ seed: 7, timeScale: 2 });
  while (e.phase === 'running') e.stepOnce();
  e.setParam('repeatRounds', false); advance(e, 12);
  assert.equal(e.roundNumber, 1); assert.equal(e.phase, 'ended'); check(e);
  e.setParam('repeatRounds', true); check(e); e.stepOnce();
  assert.equal(e.roundNumber, 2); assert.equal(e.roundSeed, roundSeed(7, 2)); check(e);
});

test('Territory: live result duration changes retain the original result timestamp', () => {
  const e = make({ seed: 7, timeScale: 2 });
  while (e.phase === 'running') e.stepOnce();
  const endedAt = e.resultStep;
  e.setParam('endPauseSec', 12);
  assert.equal(e.pauseUntil, endedAt + 12 * 60);
  advance(e, 8); assert.equal(e.roundNumber, 1); check(e);
  e.setParam('endPauseSec', 2);
  assert.equal(e.resultStep, endedAt);
  assert.equal(e.pauseUntil, e.step + 1, 'an elapsed hold continues on the next generator step');
  check(e); e.stepOnce(); assert.equal(e.roundNumber, 2); check(e);
});

test('Territory: configuration preserves every rule, camera and display setting', () => {
  const params = { profile: 'custom', layout: 'portrait', incomeMultiplier: 1.7, aggression: .23, offensiveInterval: 6.5, marchDuration: 3.7,
    repeatRounds: false, endPauseSec: 12, garrisonMode: 'always', cameraMode: 'top', cameraAzimuth: -.8,
    cameraElevation: 1.2, cameraZoom: 1.4, highQuality: false, showFactions: false, showClock: false, showWinner: false };
  assert.deepEqual(plain(normalizeParams(JSON.parse(JSON.stringify(params)))), params);
});

test('Territory: state comparison and invariants detect RNG, clocks, decisions, supply and full march corruption', () => {
  const mutations = [
    s => { s.roundSim.rng.s = -1; },
    s => { s.accumulator = .2; },
    s => { s.roundSim.accumulator = .2; },
    s => { s.roundSim.factions[0].thinkAt = NaN; },
    s => { s.roundSim.factions[0].focusTile = 9999; },
    s => { s.roundSim.tiles[0].owner = 5; },
    s => { s.roundSim.tiles[0].supplied = !s.roundSim.tiles[0].supplied; },
    s => { s.roundSim.moves[0].duration = -1; },
    s => { s.roundSim.moves[0].start = 99999; },
    s => { s.roundSim.moves[0].amount = .5; },
    s => { s.roundSim.moves[0].kind = 'teleport'; },
    s => { s.roundSim.moves[0].from = -1; },
  ];
  for (const mutate of mutations) {
    const s = make(); advance(s, 5); const before = s.stateHash(); mutate(s);
    assert.notEqual(s.stateHash(), before);
    assert.equal(s.checkInvariants().ok, false);
  }
  // Valid finite future decisions must also change the stronger state comparison.
  for (const key of ['thinkAt', 'goalAt', 'focusUntil', 'lastOffensiveAt', 'nextOffensiveAt']) {
    const s = make(); const before = s.stateHash(); s.roundSim.factions[0][key] += .1; assert.notEqual(s.stateHash(), before);
  }
});
