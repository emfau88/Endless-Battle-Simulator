#!/usr/bin/env node
// Marble Knockout · Labor (R43): Simulation in Node ohne Browser, für Galerie, einzelne Bahnen und ganze Rennen.
//   node scripts/knockout-lab.mjs gallery [--element turnstile|all] [--seconds 60] [--aspect 16:9]
//   node scripts/knockout-lab.mjs stage --stage 3 [--seed 1] [--runs 5] [--aspect 16:9]
//   node scripts/knockout-lab.mjs race [--seed 1] [--runs 1] [--aspect 16:9|9:16] [--short A]
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

export const FILES = ['src/core.js', 'src/scenarios/knockout/detmath.js', 'src/scenarios/knockout/physics.js', 'src/scenarios/knockout/elements.js',
  'src/scenarios/knockout/gallery.js', 'src/scenarios/knockout/stages.js', 'src/scenarios/knockout/simulation.js'];

/** Lädt die Knockout-Module in einen eigenen Kontext und gibt EBS zurück. */
export function loadKnockout(root = new URL('../', import.meta.url)) {
  const context = vm.createContext({ console }); context.window = context;
  for (const p of FILES) vm.runInContext(readFileSync(new URL(p, root), 'utf8'), context, { filename: p });
  return context.EBS;
}
export const WORLD = { '16:9': { w: 1920, h: 1080 }, '9:16': { w: 1080, h: 1920 } };
export function makeSim(EBS, { seed = 1, aspect = '16:9', params = {} } = {}) {
  const p = { mode: 'race', short: 'A', stage: 0, element: 'all', slowmo: 'on', ...params };
  return new EBS.KnockoutSim.KnockoutSimulation({ seed, params: p, world: WORLD[aspect] });
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const argv = process.argv.slice(2), cmd = argv[0] || 'race';
  const arg = (n, d) => { const i = argv.indexOf('--' + n); return i > 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
  const EBS = loadKnockout(), aspect = arg('aspect', '16:9');
  if (cmd === 'gallery') {
    const ids = arg('element', 'all') === 'all' ? Object.keys(EBS.KnockoutGallery) : [arg('element')];
    const seconds = Number(arg('seconds', 60));
    for (const id of ids) {
      const sim = makeSim(EBS, { seed: Number(arg('seed', 1)), aspect, params: { mode: 'gallery', element: id } });
      const t0 = Date.now(); let worstGap = 0, errors = [];
      const lastSeen = new Map();
      for (let i = 0; i < seconds * 60; i++) {
        sim.stepOnce();
        for (const m of sim.world.marbles) {
          if (!lastSeen.has(m.rid)) lastSeen.set(m.rid, 0);
          if (m.loops !== (lastSeen.get(m.rid + 100) || 0)) { lastSeen.set(m.rid + 100, m.loops); lastSeen.set(m.rid, sim.t); }
          worstGap = Math.max(worstGap, sim.t - lastSeen.get(m.rid));
        }
        if (i % 60 === 0) { const c = sim.checkInvariants(); if (!c.ok) errors.push(...c.errors.map((e) => `${sim.t.toFixed(1)}s ${e}`)); }
      }
      const loops = sim.world.marbles.map((m) => m.loops);
      console.log(`${id.padEnd(10)} Runden ${loops.join(',').padEnd(24)} längste Runde ${worstGap.toFixed(1)} s  ${errors.length ? 'FEHLER ' + errors.slice(0, 2).join(' | ') : 'ok'}  (${Date.now() - t0} ms)`);
    }
  } else if (cmd === 'stage' || cmd === 'race') {
    const runs = Number(arg('runs', 1)), seed0 = Number(arg('seed', 1));
    for (let k = 0; k < runs; k++) {
      const seed = seed0 + k, params = cmd === 'stage' ? { mode: 'stage', stage: Number(arg('stage', 0)) } : { mode: 'race', short: arg('short', 'A') };
      const sim = makeSim(EBS, { seed, aspect, params }), t0 = Date.now(), log = [];
      let stage = -1, stageT0 = 0, errors = [];
      while (sim.phase !== 'end' && sim.t < 1200) {
        sim.stepOnce();
        if (sim.stageNo !== stage) { stage = sim.stageNo; stageT0 = sim.t; }
        if (sim.phase === 'result' && sim.phaseT < sim.dt * 1.5) {
          const rs = sim.runners, fin = rs.filter((u) => u.finished && !u.out).sort((a, b) => a.place - b.place);
          const outs = rs.filter((u) => u.out).map((u) => sim.roster[u.rid].name + (u.fell ? '(fell)' : ''));
          const gap = fin.length > 1 ? (fin[1].finishT - fin[0].finishT).toFixed(2) : '-';
          const nudges = rs.reduce((s, u) => s + u.nudges, 0);
          log.push(`  ${String(stage + 1).padStart(2)} ${sim.spec.title.padEnd(18)} ${(sim.t - stageT0).toFixed(1).padStart(5)} s  rt ${sim.world.t.toFixed(1).padStart(5)}  out ${outs.join(',').padEnd(18)} 1-2 ${gap}  Führ.wechsel ${sim.leadChanges}  Stöße ${nudges}  Zeitlupe ${sim.stats.slowmo}`);
        }
        if (sim.step % 120 === 0) { const c = sim.checkInvariants(); if (!c.ok) errors.push(...c.errors.map((e) => `${sim.t.toFixed(1)}s ${e}`)); }
      }
      console.log(`Seed ${seed}: ${sim.t.toFixed(1)} s Video, Phase ${sim.phase}, ${Date.now() - t0} ms${errors.length ? '  FEHLER: ' + errors.slice(0, 3).join(' | ') : ''}`);
      for (const l of log) console.log(l);
      if (sim.podium) console.log('  Podest: ' + sim.podium.map((i) => sim.roster[i].name).join(', '));
    }
  }
}
