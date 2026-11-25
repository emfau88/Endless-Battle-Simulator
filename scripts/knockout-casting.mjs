#!/usr/bin/env node
// Marble Knockout · Casting (R43/M7). Reine Simulation ohne Bild und Ton.
// Short: ganzes Rennen je Seed. Ein Seed ist vollständig, wenn
//   1. das Video höchstens 40 s lang ist         2. das Finale knapp ist (Platz 1 und 2 unter 0,8 s, Zeitlupe)
//   3. die Führung im Finale mindestens einmal wechselt
//   4. auf der Gefahrenbahn mindestens eine Murmel abstürzt (nur Fassungen mit Gefahrenbahn)
//   5. Fassung B: GOLD erreicht das Finale       6. keine Murmel sitzt fest und keine braucht einen Anstoß
// Reihenfolge: kurz und knapp zuerst (0,1 s Abstand im Finale wiegen wie 1 s Videolänge).
//   node scripts/knockout-casting.mjs --short A [--from 1 --to 200 --top 12 --list --best 24]
import { loadKnockout, makeSim } from './knockout-lab.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const short = arg('short', 'A'), from = Number(arg('from', 1)), to = Number(arg('to', 200)), top = Number(arg('top', 12));
const MAX_LEN = 40, GAP = 0.8;

const EBS = loadKnockout(), P = EBS.KnockoutSim.KnockoutSimulation.prototype;
// Anstöße und Festsitzen mitzählen (die Simulation selbst bleibt unverändert)
let nudges = 0;
const oN = P.nudge, oS = P.stuckOut;
P.nudge = function (u) { nudges++; return oN.call(this, u); };
P.stuckOut = function (u) { nudges += 10; return oS.call(this, u); };

const rows = [];
for (let seed = from; seed <= to; seed++) {
  nudges = 0;
  const sim = makeSim(EBS, { seed, aspect: '9:16', params: { short } });
  const hazard = sim.list.some((s) => s.hazard);
  let falls = 0, goldFinal = false, t1 = -1, t2 = -1, leads = 0, lastLead = -1, cand = -1, held = 0, sample = 0, seen = -1;
  while (sim.phase !== 'end' && sim.t < 120) {
    sim.stepOnce();
    if (sim.stageNo !== seen) {
      seen = sim.stageNo;
      if (sim.final) goldFinal = sim.runners.some((u) => sim.roster[u.rid].name === 'GOLD');
    }
    if (sim.phase === 'result' && sim.spec.hazard && !falls) falls = sim.runners.filter((u) => u.fell).length;
    if (!sim.final || sim.phase !== 'race') continue;
    const rt = sim.world.t - sim.raceStart;
    if (t1 < 0 && sim.placeCount >= 1) t1 = rt;
    if (t2 < 0 && sim.placeCount >= 2) t2 = rt;
    // Führung alle 0,25 s ab 1,5 s Rennzeit ansehen (das Gedränge am Start zählt nicht). Ein Wechsel zählt erst,
    // wenn die neue Spitze eine Sekunde lang vorn bleibt (in den Ringen springt die Rangfolge sonst hin und her).
    if (rt >= 1.5 && sim.placeCount === 0 && ++sample % 15 === 0) {
      if (sim.leader === cand) held++; else { cand = sim.leader; held = 1; }
      if (held === 4 && cand !== lastLead) { if (lastLead >= 0) leads++; lastLead = cand; }
    }
  }
  const len = sim.phase === 'end' ? sim.t : Infinity, gap = t1 >= 0 && t2 >= 0 ? t2 - t1 : Infinity;
  const win = sim.runners.find((u) => u.place === 1);
  const checks = [len <= MAX_LEN, gap < GAP || sim.slow.finalDone, leads >= 1, !hazard || falls >= 1, short !== 'B' || goldFinal, nudges === 0];
  rows.push({ seed, len, gap, leads, falls, goldFinal, slow: sim.slow.finalDone, nudges, winner: win ? sim.roster[win.rid].name : '-', checks, complete: checks.every(Boolean),
    ok: sim.checkInvariants().ok });
}

const good = rows.filter((r) => r.complete), pct = (n) => `${n} von ${rows.length} (${Math.round(n / rows.length * 100)} %)`;
console.log(`Short ${short}, Seeds ${from}–${to}: vollständig bei ${pct(good.length)}.`);
[`Länge bis ${MAX_LEN} s`, `Finale knapp (< ${GAP} s oder Zeitlupe)`, 'Führungswechsel im Finale', 'Sturz auf der Gefahrenbahn', 'GOLD im Finale (nur B)', 'ohne Anstoß und Festsitzen']
  .forEach((l, i) => console.log(`  ${l.padEnd(36)} ${pct(rows.filter((r) => r.checks[i]).length)}`));
const lens = rows.map((r) => r.len).filter(Number.isFinite).sort((a, b) => a - b);
console.log(`  Länge Median ${lens[lens.length >> 1]?.toFixed(1)} s (kürzeste ${lens[0]?.toFixed(1)} s) · Invarianten verletzt: ${rows.filter((r) => !r.ok).length}`);
// Beste zuerst: kurz und knapp (0,1 s Abstand im Finale wiegen wie 1 s Videolänge)
const score = (r) => r.len + 10 * Math.min(r.gap, 2);
good.sort((a, b) => score(a) - score(b));
// --list: die besten N vollständigen Seeds aufsteigend (für SHORT_CAST in src/scenarios/knockout.js)
const best = Number(arg('best', 24));
if (argv.includes('--list')) console.log(`\nBeste ${best} Seeds (für SHORT_CAST.${short} in src/scenarios/knockout.js):\n` + JSON.stringify(good.slice(0, best).map((r) => r.seed).sort((a, b) => a - b)));
const f = (v) => (Number.isFinite(v) ? v.toFixed(2).padStart(5) : '  –  ');
console.log('\n Seed | Länge | Abstand 1–2 | Wechsel | Stürze | Sieger');
for (const r of good.slice(0, top)) console.log(`${String(r.seed).padStart(5)} | ${r.len.toFixed(1).padStart(5)} | ${f(r.gap)} s${r.slow ? ' Z' : '  '}  | ${String(r.leads).padStart(7)} | ${String(r.falls).padStart(6)} | ${r.winner}`);
