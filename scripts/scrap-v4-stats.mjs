#!/usr/bin/env node
// Scrap Wars · Kennzahlen der Taktik-Arena (v4, R40/K5): reine Simulation, keine Bilder, kein Ton.
// Je Format eine Runde für jeden Seed; Zielwerte aus dem Ausbau-Plan, Abschnitt K5.
//   node scripts/scrap-v4-stats.mjs                      100 Seeds, Sunny Yard, quer und hochkant
//   node scripts/scrap-v4-stats.mjs --seeds 30 --arena yard --rules v3   Vergleich mit der Material-Arena
//   node scripts/scrap-v4-stats.mjs --layout short                       Short-Karte (nur hochkant)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import vm from 'node:vm';

const arg = (name, def) => { const i = process.argv.indexOf('--' + name); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : def; };
const root = fileURLToPath(new URL('../', import.meta.url));
const seeds = Number(arg('seeds', 100)), arena = arg('arena', 'sunshine'), rulesVersion = arg('rules', 'v4'), first = Number(arg('first', 1)), layout = arg('layout', '');
const context = vm.createContext({}); context.window = context;
for (const path of ['core.js', 'scenarios/scrap/simulation.js', 'scenarios/scrap/rules.js', 'scenarios/scrap/materials.js',
  'scenarios/scrap/tactics.js', 'scenarios/scrap/episode.js']) vm.runInContext(readFileSync(join(root, 'src', path), 'utf8'), context, { filename: path });
export const { EBS } = context; const NAMES = ['EMBER', 'AZURE', 'AMBER', 'MOSS'];
const median = list => { const s = [...list].sort((a, b) => a - b), n = s.length; return n ? n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2 : NaN; };
const pct = v => `${(v * 100).toFixed(1)} %`;

export function measure({ seeds, arena, rulesVersion, portrait, first = 1, layout = '' }) {
  const world = portrait ? { w: 1080, h: 1920 } : { w: 1920, h: 1080 };
  const out = { firstKo: [], duration: [], pairs: new Map(), hits15: 0, wins: [0, 0, 0, 0], draws: 0, invalid: 0,
    fire: { clear: 0, wood: 0, splash: 0, blocked: 0 }, stuck: 0, robotTime: 0, ms: 0, simSec: 0 };
  for (let seed = first; seed < first + seeds; seed++) {
    const sim = new EBS.Scrap.Episode({ seed, params: { rulesVersion, arena, repeatRounds: false, ...(layout ? { layout } : {}) }, world, view: { camera: false } });
    const t0 = performance.now(), round = sim.roundSim, moved = round.robots.map(r => ({ x: r.x, y: r.y, t: 0 }));
    while (sim.phase === 'running') {
      sim.stepOnce();
      // Festgefahren: weniger als 6 AE in 1 s, obwohl das Ziel weiter als 40 AE weg ist
      for (const r of round.robots) if (r.caged || (r.stuck && r.stuck.t === round.t)) Object.assign(moved[r.id], { x: r.x, y: r.y, t: round.t });
      for (const r of round.robots) if (r.alive && !r.caged && round.t - moved[r.id].t >= 1) {
        const m = moved[r.id], far = Math.hypot((r.goalX ?? r.x) - r.x, (r.goalY ?? r.y) - r.y) > 40;
        if (far && Math.hypot(r.x - m.x, r.y - m.y) < 6) out.stuck += round.t - m.t;
        out.robotTime += round.t - m.t; m.x = r.x; m.y = r.y; m.t = round.t;
      }
    }
    out.ms += performance.now() - t0; out.simSec += round.t;
    if (!sim.checkInvariants().ok) out.invalid++;
    const ko = sim.events.find(e => e.type === 'ko');
    if (ko) out.firstKo.push(ko.roundTime);
    out.duration.push(round.t);
    if (round.winner === null) out.draws++; else out.wins[round.winner]++;
    for (const e of sim.events) if (e.type === 'hit' && e.roundTime < 15 && e.owner !== e.team) {
      const key = [e.owner, e.team].sort().map(i => NAMES[i]).join('–');
      out.pairs.set(key, (out.pairs.get(key) || 0) + 1); out.hits15++;
    }
    if (round.fire) for (const k of Object.keys(out.fire)) out.fire[k] += round.fire[k];
  }
  return out;
}

function report(label, o, n) {
  const pairs = [...o.pairs.entries()].sort((a, b) => b[1] - a[1]), share = v => o.hits15 ? v / o.hits15 : 0;
  const top = pairs.slice(0, 2).map(([, v]) => share(v)), clear = o.fire.clear;
  console.log(`\n${label} · ${n} Seeds`);
  console.log(`  erster K.o.        Median ${median(o.firstKo).toFixed(1)} s (Ziel 10–16), ohne K.o.: ${n - o.firstKo.length}`);
  console.log(`  Rundendauer        Median ${median(o.duration).toFixed(1)} s (Ziel 30–45), längste ${Math.max(...o.duration).toFixed(1)} s (Ziel ≤ 75)`);
  console.log(`  Trefferpaare 15 s  ${pairs.map(([k, v]) => `${k} ${pct(share(v))}`).join(', ') || '–'}`);
  console.log(`                     häufigstes ${pct(top[0] || 0)} (Ziel < 30 %), zwei häufigste ${pct((top[0] || 0) + (top[1] || 0))} (Ziel < 50 %)`);
  if (clear + o.fire.wood + o.fire.splash) console.log(`  Schüsse            frei ${clear}, Holz ${o.fire.wood}, Rakete auf Deckung ${o.fire.splash}; freie Schüsse in Deckung ${pct(clear ? o.fire.blocked / clear : 0)} (Ziel < 10 %)`);
  console.log(`  festgefahren       ${pct(o.robotTime ? o.stuck / o.robotTime : 0)} der Roboterzeit (Ziel < 1 %)`);
  console.log(`  Siege              ${o.wins.map((w, i) => `${NAMES[i]} ${pct(w / n)}`).join(', ')} (Ziel je 20–30 %), unentschieden ${pct(o.draws / n)} (Ziel < 5 %)`);
  console.log(`  Rechenzeit         ${(o.ms / o.simSec).toFixed(2)} ms je Simulationssekunde${o.invalid ? `, ${o.invalid} Runden mit Invariantenfehler` : ''}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const portrait of layout === 'short' ? [true] : [false, true])
    report(`${rulesVersion} · ${arena}${layout ? ' · ' + layout : ''} · ${portrait ? 'hochkant' : 'quer'}`, measure({ seeds, arena, rulesVersion, portrait, first, layout }), seeds);
}
