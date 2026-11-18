#!/usr/bin/env node
// Casting für Cloud-Wars-Shorts ("Which cloud rules the sky?"). Reine Simulation ohne Bild und Ton.
// Prüft je Seed, ob die verdeckte Regie ihre Geschichte erzählt:
//   1. erstes Team-Gewitter vor Sekunde 12   2. ein Team scheidet vor Sekunde 22 aus
//   3. der Außenseiter gewinnt                4. Videolänge (Sieg + Ausklang) 24–38 s
//   node scripts/cloudwars-short-casting.mjs                      Seeds 1–300
//   node scripts/cloudwars-short-casting.mjs --from 1 --to 500 --top 20 [--off] [--list]
//   --off: ohne Regie zum Vergleich · --list: Liste der vollständigen Seeds für die Short-Vorlage
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const arg = (name, fallback) => { const i = process.argv.indexOf('--' + name); return i > 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : fallback; };
const from = arg('from', 1), to = arg('to', 300), top = arg('top', 12), off = process.argv.includes('--off');
const context = vm.createContext({}); context.window = context;
for (const file of ['core.js', 'canvas-scene.js', 'scenarios/cloudwars/terrain.js', 'scenarios/cloudwars/simulation.js',
  'scenarios/cloudwars/storms.js', 'scenarios/cloudwars/story.js', 'scenarios/cloudwars.js']) {
  vm.runInContext(readFileSync(new URL('../src/' + file, import.meta.url), 'utf8'), context, { filename: file });
}
const { EBS } = context, sc = EBS.getScenario('cloudwars'), names = EBS.CloudWarsSim.TEAMS.map((t) => t.name);
const OUTRO = EBS.CloudWars.SHORT.outroSec, [MIN, MAX] = EBS.CloudWars.SHORT.lengthSec;
const world = { w: 1080, h: 1920 }, rows = [];

for (let seed = from; seed <= to; seed++) {
  const sim = sc.create({ seed, params: sc.normalizeParams({ mode: 'short', director: off ? 'off' : 'on' }), world });
  const R = sim.roles || EBS.CloudWarsStory.roles(seed);
  let seq = 0, storm = null, out = [];
  while (sim.endAt < 0 && sim.t < 90) {
    sim.stepOnce();
    for (; seq < sim.eventSeq; seq++) {
      const e = sim.events[seq % sim.events.length];
      if (e.type === 'storm' && e.c >= 0 && storm === null) storm = e.t;
      if (e.type === 'eliminated') out.push({ t: e.t, team: e.c });
    }
  }
  const end = sim.endAt >= 0 ? sim.endAt + OUTRO : Infinity, checks = [storm !== null && storm < 12, out.length > 0 && out[0].t < 22,
    sim.winner === R.underdog, end >= MIN && end <= MAX];
  rows.push({ seed, complete: checks.every(Boolean), checks, storm, first: out[0], end, winner: sim.winner, R, victimFirst: out[0] && out[0].team === R.victim, ok: sim.checkInvariants().ok });
}

const good = rows.filter((r) => r.complete), pct = (n) => `${n} von ${rows.length} (${Math.round(n / rows.length * 100)} %)`;
console.log(`Seeds ${from}–${to}${off ? ' ohne Regie' : ''}: Geschichte vollständig bei ${pct(good.length)}.`);
['Gewitter vor 12 s', 'Ausscheiden vor 22 s', 'Außenseiter gewinnt', `Länge ${MIN}–${MAX} s`].forEach((l, i) => console.log(`  ${l.padEnd(22)} ${pct(rows.filter((r) => r.checks[i]).length)}`));
console.log(`  Opfer scheidet zuerst aus ${pct(rows.filter((r) => r.victimFirst).length)} · Invarianten verletzt: ${rows.filter((r) => !r.ok).length}`);
const ends = rows.filter((r) => Number.isFinite(r.end)).map((r) => r.end).sort((a, b) => a - b);
console.log(`  Länge Median ${ends[ends.length >> 1]?.toFixed(1)} s, zu kurz ${ends.filter((v) => v < MIN).length}, zu lang ${ends.filter((v) => v > MAX).length}, ohne Sieg in 90 s: ${rows.length - ends.length}`);
const lost = rows.filter((r) => !r.checks[2]), by = {};
for (const r of lost) { const k = ['giant', 'underdog', 'victim', 'follower'].find((x) => r.R[x] === r.winner) || 'none'; by[k] = (by[k] || 0) + 1; }
console.log('  Sieger statt Außenseiter: ' + JSON.stringify(by));
if (process.argv.includes('--list')) console.log('\nVollständige Seeds (für SHORT.seeds in src/scenarios/cloudwars.js):\n' + JSON.stringify(good.map((r) => r.seed)));
const s1 = (v) => (v == null ? '  –  ' : v.toFixed(1).padStart(5));
console.log('\n Seed | Gewitter | 1. raus        | Länge | Sieger   | Außenseiter');
for (const r of good.slice(0, top)) console.log(`${String(r.seed).padStart(5)} | ${s1(r.storm)} s  | ${s1(r.first.t)} s ${names[r.first.team].padEnd(8)}| ${s1(r.end)} | ${names[r.winner].padEnd(8)} | ${names[r.R.underdog]}`);
