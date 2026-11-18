// Cloud Wars Short: verdeckte Regie, geprüfte Seeds, natürliche Länge und Vorlagen. Reine Simulation ohne Browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({}); context.window = context;
for (const file of ['core.js', 'canvas-scene.js', 'scenarios/cloudwars/terrain.js', 'scenarios/cloudwars/simulation.js',
  'scenarios/cloudwars/storms.js', 'scenarios/cloudwars/story.js', 'scenarios/cloudwars.js', 'production-presets.js']) {
  vm.runInContext(readFileSync(new URL('../src/' + file, import.meta.url), 'utf8'), context, { filename: file });
}
const { EBS } = context, sc = EBS.getScenario('cloudwars'), plain = (v) => JSON.parse(JSON.stringify(v));
const world = { w: 1080, h: 1920 };
const run = (seed, director = 'on') => {
  const sim = sc.create({ seed, params: sc.normalizeParams({ mode: 'short', director }), world });
  let seq = 0, storm = null, first = null;
  while (sim.endAt < 0 && sim.t < 90) {
    sim.stepOnce();
    for (; seq < sim.eventSeq; seq++) {
      const e = sim.events[seq % sim.events.length];
      if (e.type === 'storm' && e.c >= 0 && storm === null) storm = e.t;
      if (e.type === 'eliminated' && !first) first = e;
    }
  }
  return { sim, storm, first };
};

test('Rollen: vier verschiedene Teams je Seed, gleich bei gleichem Seed', () => {
  for (const seed of [1, 42, 999]) {
    const R = EBS.CloudWarsStory.roles(seed);
    assert.deepEqual([R.giant, R.underdog, R.victim, R.follower].sort(), [0, 1, 2, 3]);
    assert.deepEqual(plain(EBS.CloudWarsStory.roles(seed)), plain(R));
  }
});

test('Geprüfte Seeds erzählen die ganze Geschichte (erste fünf der Liste)', () => {
  const [lo, hi] = EBS.CloudWars.SHORT.lengthSec;
  for (const seed of EBS.CloudWars.SHORT.seeds.slice(0, 5)) {
    const { sim, storm, first } = run(seed), end = sim.endAt + EBS.CloudWars.SHORT.outroSec;
    assert.ok(storm !== null && storm < 12, `Seed ${seed}: Gewitter ${storm}`);
    assert.ok(first && first.t < 22, `Seed ${seed}: erstes Ausscheiden`);
    assert.equal(sim.winner, sim.roles.underdog, `Seed ${seed}: Sieger`);
    assert.ok(end >= lo && end <= hi, `Seed ${seed}: Länge ${end}`);
    assert.ok(sim.checkInvariants().ok);
  }
});

test('Regie aus: anderer Ablauf, keine Rollen; Runden-Modus ohne Regie', () => {
  const on = run(2), off = run(2, 'off');
  assert.equal(off.sim.roles, null);
  assert.notEqual(on.sim.stateHash(), off.sim.stateHash());
  const rounds = sc.create({ seed: 2, params: sc.normalizeParams({ mode: 'rounds' }), world: { w: 1920, h: 1080 } });
  assert.equal(rounds.roles, null);
});

test('Natürliche Länge: geprüfter Seed ergibt 24–38 s, ungeeigneter Seed bricht mit Hinweis ab', () => {
  const cfg = (seed) => EBS.normalizeConfig({ ...EBS.productionPreset('cloudwars', 'short', seed), seed });
  assert.equal(sc.hasNaturalDuration(cfg(44)), true);
  const finish = (plan) => { let r; do r = plan.advance(); while (!r.done); return r; };
  const r = finish(sc.createExportPlan(cfg(44), world));
  assert.ok(r.durationSec >= 24 && r.durationSec <= 38, String(r.durationSec));
  const bad = [...Array(60).keys()].map((i) => i + 1).find((s) => !EBS.CloudWars.SHORT.seeds.includes(s) && (() => {
    const { sim } = run(s), end = sim.endAt + 1.5; return sim.endAt >= 0 && (end < 24 || end > 38);
  })());
  assert.throws(() => finish(sc.createExportPlan(cfg(bad), world)), /erlaubt 24–38 s/);
  assert.equal(sc.hasNaturalDuration(EBS.normalizeConfig({ ...cfg(44), params: { ...cfg(44).params, videoEnd: 'free' } })), false);
});

test('Vorlagen: JSON-Dateien stimmen mit der Oberfläche überein; Short wählt einen geprüften Seed', () => {
  for (const kind of ['short', 'long']) {
    const file = JSON.parse(readFileSync(new URL(`../presets/production/cloudwars-${kind}.json`, import.meta.url), 'utf8'));
    assert.deepEqual(plain(EBS.productionPreset('cloudwars', kind)), file);
  }
  assert.equal(EBS.productionPreset('cloudwars', 'short', 42).seed, 44);
  assert.equal(EBS.productionPreset('cloudwars', 'short', 44).seed, 44);
  assert.equal(EBS.productionPreset('cloudwars', 'long', 7).seed, 7);
});

test('Langvideo: 30 Minuten Runden ohne Bilder ohne Verletzung der Invarianten', () => {
  const sim = sc.create({ seed: 42, params: sc.normalizeParams({ mode: 'rounds' }), world: { w: 1920, h: 1080 } });
  let maxMass = 0, bad = null;
  for (let s = 0; s < 1800; s++) {
    for (let i = 0; i < 60; i++) sim.stepOnce();
    for (const c of sim.clouds) if (c.team >= 0) maxMass = Math.max(maxMass, c.mass);
    if (s % 30 === 0) { const r = sim.checkInvariants(); if (!r.ok) { bad = `${s} s: ${r.errors.join('; ')}`; break; } }
  }
  assert.equal(bad, null);
  assert.ok(sim.checkInvariants().ok);
  assert.ok(sim.round >= 6, `nur ${sim.round} Runden`);
  assert.ok(maxMass < 120);
  assert.ok(sim.notes.length <= 40);
});
