// Regression coverage for a readable, finite Pyramid short: build, finale and motion use distinct clocks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
context.window = context;
for (const file of ['core.js', 'canvas-scene.js', 'scenarios/shared/critter-art.js', 'scenarios/pyramid.js']) {
  vm.runInContext(readFileSync(new URL('../src/' + file, import.meta.url), 'utf8'), context, { filename: file });
}
const scenario = context.EBS.getScenario('pyramid');
const preset = JSON.parse(readFileSync(new URL('../presets/pyramid-desert-short-25s.json', import.meta.url), 'utf8'));
const config = (params = {}) => context.EBS.normalizeConfig({ ...preset, params: { ...preset.params, shortFilm: true, ...params } });
const state = (cfg, step) => scenario.storyState(cfg.params, cfg.video, step);

function simulation(cfg) {
  return scenario.create({ seed: cfg.seed, params: cfg.params, video: cfg.video, world: context.EBS.ASPECTS[cfg.video.aspect] });
}

function runDay(cfg) {
  const sim = simulation(cfg), events = [];
  let next = 0;
  for (let second = 0; second < cfg.video.durationSec; second++) {
    for (let step = 0; step < 60; step++) sim.stepOnce();
    const batch = sim.events.filter(event => event && event.seq >= next).sort((a, b) => a.seq - b.seq);
    for (const event of batch) {
      assert.equal(event.seq, next++, 'an audio event was lost');
      events.push(event);
    }
  }
  assert.ok(sim.checkInvariants().ok, JSON.stringify(sim.checkInvariants()));
  return { sim, events };
}

test('Finite short is opt-in and its production recipe retains normal playback', () => {
  const legacy = context.EBS.normalizeConfig({ scenario: 'pyramid' });
  assert.equal(legacy.params.shortFilm, false);
  assert.equal(state(legacy, 900), null);
  assert.equal(config({ shortFilm: 'false' }).params.shortFilm, false);
  assert.equal(preset.params.shortFilm, true);
  const cfg = config();
  assert.equal(cfg.video.durationSec, 25);
  assert.equal(cfg.video.tempo, 1, 'the short must not fast-forward the simulation');
  assert.ok(cfg.params.speed <= 1, 'the short must not accelerate the animals');
  assert.deepEqual([cfg.video.aspect, cfg.video.resolution, cfg.video.fps], ['9:16', 1080, 60]);
});

test('Construction progresses through the former eight-second gap in small steps and holds the finished pyramid', () => {
  const cfg = config(), samples = Array.from({ length: 1501 }, (_, step) => state(cfg, step));
  assert.equal(samples[0].lit, 0);
  assert.equal(samples[60].lit, 0, 'leave one second to understand the scene');
  for (let i = 1; i < samples.length; i++) {
    const previous = samples[i - 1], current = samples[i];
    assert.ok(Number.isFinite(current.lit) && current.lit >= 0 && current.lit <= 900);
    assert.ok(current.lit >= previous.lit, `construction moved backwards at frame ${i}`);
    assert.ok(current.lit - previous.lit <= 2, `large build jump at frame ${i}`);
  }
  // In the rejected film, no apex arrival occurred from 7.23s to 15.18s.
  // Every full second in that interval now has visible building progress.
  for (let sec = 8; sec <= 15; sec++) {
    assert.ok(samples[sec * 60].lit > samples[(sec - 1) * 60].lit, `construction stopped during second ${sec}`);
  }
  assert.equal(samples[19 * 60].lit, 900);
  assert.equal(samples[20 * 60].on, false, 'allow the complete structure to be seen before fireworks');
  assert.equal(samples[21 * 60].on, true);
  assert.equal(samples[1500].lit, 900, 'frame 1500 must not reset to scaffolding');
  const afterEnd = state(cfg, 1800);
  assert.equal(afterEnd.lit, 900);
  assert.equal(afterEnd.cycle, 0);
  assert.equal(afterEnd.v, 25);
});

test('The actual simulation emits one completion, only final fireworks and no extra cycle at 25s', () => {
  const { events } = runDay(config());
  const full = events.filter(event => event.type === 'full');
  const launches = events.filter(event => event.type === 'launch');
  const bursts = events.filter(event => event.type === 'firework');
  assert.equal(full.length, 1, 'completion must be independent of apex arrivals and occur only once');
  assert.ok(full[0].step / 60 >= 19 && full[0].step / 60 < 19.1);
  assert.ok(bursts.length >= 2 && bursts.length <= 4, 'keep the short finale readable');
  assert.equal(launches.length, bursts.length);
  assert.ok(launches.every(event => event.step / 60 >= 21), 'no intermediate milestone fireworks');
  assert.ok(bursts.every(event => event.step / 60 >= 21.6 && event.step / 60 <= 22.65));
  assert.ok(full[0].step < launches[0].step, 'celebration must follow the visible completed build');
  assert.ok(!runDay(config({ fill: false })).events.some(event => event.type === 'full'));
  assert.ok(!runDay(config({ finale: false })).events.some(event => ['launch', 'firework'].includes(event.type)));
});

test('Short presentation does not accelerate or otherwise change animal motion', () => {
  const a = simulation(config()), b = simulation(config({ shortFilm: false }));
  for (let second = 0; second < 25; second++) {
    for (let step = 0; step < 60; step++) { a.stepOnce(); b.stepOnce(); }
    assert.equal(a.stateHash(), b.stateHash(), `short mode changed animal motion at ${second + 1}s`);
  }
  assert.ok(a.checkInvariants().ok);
  assert.ok(b.checkInvariants().ok);
});

test('Short lighting stays readable, changes gently once and remains stable at the endpoint', () => {
  const cfg = config();
  const light = step => scenario.lightingState(cfg.params, cfg.video, step);
  const samples = Array.from({ length: 1501 }, (_, step) => light(step));
  assert.deepEqual(samples[0], samples[13 * 60], 'hold steady daylight for the first half of the film');
  for (let i = 1; i < samples.length; i++) {
    const previous = samples[i - 1], current = samples[i];
    assert.ok(current.night >= previous.night, `light reversed direction at frame ${i}`);
    assert.ok(current.night - previous.night < 0.002, `abrupt night transition at frame ${i}`);
    assert.ok(current.rays <= previous.rays);
    assert.ok(previous.rays - current.rays < 0.002);
    for (let channel = 0; channel < 3; channel++) {
      assert.ok(Number.isFinite(current.mult[channel]));
      assert.ok(current.mult[channel] <= previous.mult[channel]);
      assert.ok(previous.mult[channel] - current.mult[channel] <= 1, `color jump at frame ${i}`);
    }
  }
  assert.ok(samples[1500].night > 0 && samples[1500].night < 0.7, 'finish in readable evening light');
  assert.deepEqual(samples[1410], samples[1500], 'hold the final illumination during the last 1.5 seconds');
  assert.deepEqual(light(1501), samples[1500], 'no next-day reset after the last frame');
  const fixed = config({ dayCycle: false });
  const initial = scenario.lightingState(fixed.params, fixed.video, 0);
  for (const step of [780, 1200, 1500, 1800]) {
    assert.deepEqual(scenario.lightingState(fixed.params, fixed.video, step), initial, 'disabling the day cycle must hold the light');
  }
});
