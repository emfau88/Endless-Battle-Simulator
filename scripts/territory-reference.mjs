// Read-only reference capture. The archived prototype is the sole simulation source.
// Generate once before adaptation; tests compare adapter states with these fixed values.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';

export const sourcePath = new URL('../docs/reference/territory-wars-hex-dominion-v0.3.source.html', import.meta.url);
export const sourceSha = '4bdee96025a22bab270c2575eaf71c49a81bb50938f90d1ad11c1d4028c91ea8';
export const sha = value => createHash('sha256').update(value).digest('hex');
export function originalSimulation() {
  const bytes = readFileSync(sourcePath);
  if (sha(bytes) !== sourceSha) throw new Error('Territory reference source checksum mismatch');
  const script = [...bytes.toString('utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
  const context = vm.createContext({});
  vm.runInContext(script, context);
  return { Sim: context.HexSim.Sim, script };
}
// Includes every own simulation field, including Map lookup, RNG, accumulator,
// faction decision clocks/goals, supply flags, UI history and complete marches.
export function fullState(sim) {
  return JSON.stringify(sim, (_, value) => value && Object.prototype.toString.call(value) === '[object Map]'
    ? { entries: [...value] } : value);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { Sim } = originalSimulation();
  const checkpoints = [0, 100, 600, 1800, 6000];
  const cases = [42, 7, 2026].flatMap(seed => ['landscape', 'portrait'].map(layout => ({ seed, layout,
    ...(seed === 2026 ? { incomeMultiplier: 1.3, aggression: .8, offensiveInterval: 2.5, marchDuration: 2.2 } : {}) })));
  const fixture = { sourceSha, state: 'All own fields; Map entries explicit; original 0.1 second steps', checkpoints,
    cases: cases.map(options => {
      const sim = new Sim(options), states = [];
      for (const tick of checkpoints) {
        while (sim.ticks < tick && sim.phase === 'running') sim.step(.1);
        states.push({ requestedTick: tick, ticks: sim.ticks, sha256: sha(fullState(sim)), phase: sim.phase,
          winner: sim.winner, rng: sim.rng.s, moveId: sim.moveId, captures: sim.roundStats.captures });
      }
      return { options, states };
    }) };
  writeFileSync(new URL('../test/fixtures/territory-prototype.json', import.meta.url), JSON.stringify(fixture, null, 2) + '\n');
  console.log(JSON.stringify(fixture.cases.map(c => ({ ...c.options, final: c.states.at(-1) })), null, 2));
}
