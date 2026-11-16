#!/usr/bin/env node
// Seed-Suche für Territory-Shorts ("Die letzte Krone"). Reine Simulation, kein Bild, kein Ton.
// Jeder Seed liefert dieselbe Geschichte; diese Suche zeigt, bei welchen Seeds die drei Höhepunkte
// am genauesten im Plan liegen und der Außenseiter am stärksten unter Druck gerät.
//   node scripts/territory-short-casting.mjs                    Seeds 1–200, beste 12
//   node scripts/territory-short-casting.mjs --from 1 --to 500 --top 20
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const arg = (name, fallback) => { const i = process.argv.indexOf('--' + name); return i > 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : fallback; };
const from = arg('from', 1), to = arg('to', 200), top = arg('top', 12);
const context = vm.createContext({}); context.window = context;
for (const file of ['core.js', 'canvas-scene.js', 'scenarios/territory/simulation.js', 'scenarios/territory/episode.js',
  'scenarios/territory/short.js', 'scenarios/territory.js', 'production-presets.js']) {
  vm.runInContext(readFileSync(new URL('../src/' + file, import.meta.url), 'utf8'), context, { filename: file });
}
const { EBS, HexSim } = context, beats = EBS.Territory.SHORT_BEATS, names = HexSim.TEAMS.map(t => t.name);
const world = { w: 1080, h: 1920 }, rows = [];

for (let seed = from; seed <= to; seed++) {
  const cfg = EBS.normalizeConfig(EBS.productionPreset('territory', 'short', seed)), tempo = cfg.video.tempo, length = cfg.params.storySec;
  const sim = EBS.getScenario('territory').create({ seed, params: cfg.params, world, timeScale: tempo });
  const round = sim.roundSim, story = round.story, hq = round.tiles[round.factions[story.hero].hq];
  let heroMin = Infinity, giantMax = 0, sieges = 0, lastBattle = -100, strongest = 1;
  while (sim.phase === 'running' && sim.step < length * 3 / tempo * 60) {
    sim.stepOnce();
    strongest = Math.max(strongest, ...round.mods.income);
    if (round.falls.length < 2) continue;
    if (hq.lastBattle > lastBattle) { lastBattle = hq.lastBattle; sieges++; }
    if (round.phase !== 'running') continue;
    const stats = round.stats();
    heroMin = Math.min(heroMin, stats[story.hero].tiles); giantMax = Math.max(giantMax, stats[story.villain].tiles);
  }
  const falls = round.falls, complete = round.phase === 'finished' && round.winner === story.hero && falls.length === 3
    && falls[0].id === story.rival && falls[1].id === story.prey && falls[2].id === story.villain && sim.checkInvariants().ok;
  if (!complete) { rows.push({ seed, complete, score: Infinity }); continue; }
  const off = [falls[0].time - beats.first * length, falls[1].time - beats.second * length, falls[2].time - beats.final * length];
  // Lower is better: beats on time, a small hero, no extreme help from the director.
  const score = Math.abs(off[0]) + Math.abs(off[1]) + 1.5 * Math.abs(off[2]) + Math.max(0, heroMin - 8) * .6 + Math.max(0, strongest - 3.2) * 2 - Math.min(sieges, 3) * .5;
  rows.push({ seed, complete, score, video: falls.map(f => f.time / tempo), end: sim.resultStep / 60 + cfg.params.endPauseSec, off,
    hero: names[story.hero], giant: names[story.villain], heroMin, giantMax, sieges, strongest,
    usable: round.tiles.filter(t => t.terrain !== 'mountain').length });
}

const good = rows.filter(r => r.complete).sort((a, b) => a.score - b.score || a.seed - b.seed), sec = v => v.toFixed(1).padStart(5);
console.log(`Seeds ${from}–${to}: Geschichte vollständig bei ${good.length} von ${rows.length}.`);
if (good.length < rows.length) console.log('Unvollständig: ' + rows.filter(r => !r.complete).map(r => r.seed).join(', '));
console.log('\n Seed | 1. Fall | 2. Fall |  Sieg | Videolänge | Held  | Riese | Held min. | Riese max. | Abwehr | Wertung');
for (const r of good.slice(0, top)) {
  console.log(`${String(r.seed).padStart(5)} | ${sec(r.video[0])} s | ${sec(r.video[1])} s |${sec(r.video[2])} s |   ${sec(r.end)} s | ${r.hero.padEnd(5)} | ${r.giant.padEnd(5)} | ${String(r.heroMin).padStart(4)} F.   | ${String(r.giantMax).padStart(2)} von ${r.usable}  | ${String(r.sieges).padStart(4)}   | ${r.score.toFixed(1)}`);
}
