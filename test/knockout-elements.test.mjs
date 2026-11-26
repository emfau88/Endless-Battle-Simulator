// Marble Knockout (R43/M2, M3): Baukasten und Element-Galerie. Plan: docs/MARBLE_KNOCKOUT_PLAN_2026-11-25.md, Abschnitt 2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadKnockout, makeSim } from '../scripts/knockout-lab.mjs';

const EBS = loadKnockout();
const ids = Object.keys(EBS.KnockoutGallery);

test('Galerie: jedes Element läuft 60 s mit sechs Murmeln ohne Hänger', () => {
  assert.ok(ids.length >= 20, `nur ${ids.length} Elemente`);
  for (const id of ids) {
    const sim = makeSim(EBS, { seed: 1, params: { mode: 'gallery', element: id } });
    const seen = new Map(), loops = new Map();
    let worst = 0;
    for (let i = 0; i < 60 * 60; i++) {
      sim.stepOnce();
      for (const m of sim.world.marbles) {
        if (loops.get(m.rid) !== m.loops) { loops.set(m.rid, m.loops); seen.set(m.rid, sim.t); }
        worst = Math.max(worst, sim.t - (seen.get(m.rid) || 0));
      }
      if (i % 120 === 0) { const c = sim.checkInvariants(); assert.ok(c.ok, `${id} bei ${sim.t.toFixed(1)} s: ${c.errors.join(', ')}`); }
    }
    // Jede Murmel kommt mindestens einmal durch; die Brücke baut sich alle 9 s neu auf
    for (const m of sim.world.marbles) assert.ok(m.loops >= 1, `${id}: Murmel ${m.rid} kommt in 60 s nie durch`);
    assert.ok(worst < 55, `${id}: eine Murmel braucht ${worst.toFixed(1)} s für eine Runde`);
  }
});

test('Galerie: gleicher Seed ergibt denselben Zustand, Elemente ändern ihn sichtbar', () => {
  for (const id of ['turnstile', 'gate', 'trapdoors', 'floors']) {
    const run = (seed) => { const s = makeSim(EBS, { seed, params: { mode: 'gallery', element: id } }); for (let i = 0; i < 600; i++) s.stepOnce(); return s.stateHash(); };
    assert.equal(run(5), run(5), `${id}: Hash schwankt`);
    assert.notEqual(run(5), run(6), `${id}: Seed wirkt nicht`);
  }
});

test('Simulation und Bahnen nutzen nur die eigenen Winkelfunktionen (Node = Chromium)', () => {
  for (const f of ['physics', 'elements', 'gallery', 'stages', 'simulation']) {
    const src = readFileSync(new URL(`../src/scenarios/knockout/${f}.js`, import.meta.url), 'utf8');
    const bad = src.match(/Math\.(sin|cos|tan|atan2?|asin|acos|exp|log|pow|random)\b|Date\.now|performance\.now/g);
    assert.equal(bad, null, `${f}.js nutzt ${bad && bad.join(', ')}`);
  }
});
