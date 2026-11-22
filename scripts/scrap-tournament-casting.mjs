#!/usr/bin/env node
// Casting für das Scrap-Langvideo (R40/L2): ganzes Turnier (8 Runden) je Seed, reine Simulation ohne Bild und Ton,
// gerechnet in Chromium wie der Export. Gesucht ist ein Turnier, das bis zur letzten Runde offen bleibt:
//   1. genau ein Turniersieger, keine Runde ohne Sieger
//   2. die Entscheidung fällt erst in Runde 8 (nach Runde 7 führt niemand mit mehr als einem Sieg Vorsprung)
//   3. jeder der vier Roboter gewinnt mindestens eine Runde
//   4. die Führung wechselt mindestens zweimal
//   5. jede Runde dauert 18–50 s, das Video 4:15–5:30 Minuten
//   6. kein Hänger ab 2 s (alle stehen, niemand schießt)
//   node scripts/scrap-tournament-casting.mjs --from 1 --to 150 --top 15
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { launchBrowser, openExportPage } from '../lib/browser.mjs';

const NAMES = ['EMBER', 'AZURE', 'AMBER', 'MOSS'];
export const PARAMS = { arena: 'sunshine', rulesVersion: 'v4', items: 'rockets', episodeMode: 'tournament', repeatRounds: true, endPauseSec: 4 };

// Läuft im Browser: ein Turnier je Seed, Kennzahlen aus Ereignisprotokoll und Rundenzustand.
export function castTournaments(EBS, seeds, params) {
  const world = { w: 1920, h: 1080 }, rows = [];
  for (const seed of seeds) {
    const sim = new EBS.Scrap.Episode({ seed, params, world, view: { camera: false }, timeScale: 1 });
    const rounds = []; let seq = 0, start = 0, shots = 0, still = 0, hang = 0, round = sim.roundSim, firstKo = null;
    while (sim.phase !== 'ended' && sim.step < 20 * 60 * 60) {
      sim.stepOnce();
      if (sim.roundSim !== round) { round = sim.roundSim; shots = 0; still = 0; }
      if (sim.phase === 'running') {
        const living = round.robots.filter(r => r.alive), fired = round.stats.shots !== shots; shots = round.stats.shots;
        still = !fired && living.length > 1 && living.every(r => !r.caged && Math.hypot(r.vx, r.vy) < 8) ? still + 1 : 0;
        hang = Math.max(hang, still / 60);
      }
      for (const e of sim.events) if (e.seq >= seq) {
        seq = e.seq + 1;
        if (e.type === 'round_start') { start = e.step; firstKo = null; }
        if (e.type === 'ko' && firstKo === null) firstKo = (e.step - start) / 60;
        if (e.type === 'round_end') rounds.push({ winner: e.winner, sec: (e.step - start) / 60, firstKo });
      }
    }
    rows.push({ seed, rounds, wins: [...sim.wins], draws: sim.draws, champions: sim.champions(), length: sim.step / 60, hang,
      ended: sim.phase === 'ended', ok: sim.checkInvariants().ok });
    sim.destroy?.();
  }
  return rows;
}

// Bewertet ein Turnier: Führungswechsel, Stand vor der letzten Runde, die sechs Bedingungen.
export function judge(r) {
  const wins = [0, 0, 0, 0]; let leader = null; r.changes = 0; r.before = null;
  r.rounds.forEach((round, i) => {
    if (i === 7) r.before = [...wins];
    if (round.winner !== null && round.winner !== undefined) wins[round.winner]++;
    const best = Math.max(...wins), top = wins.map((w, id) => w === best ? id : -1).filter(id => id >= 0);
    const now = top.length === 1 ? top[0] : null;
    if (now !== null && now !== leader) { if (leader !== null) r.changes++; leader = now; }
  });
  const sorted = r.before ? [...r.before].sort((a, b) => b - a) : [9, 0];
  r.open = sorted[0] - sorted[1] <= 1;
  r.checks = [r.champions.length === 1 && r.draws === 0, r.open, r.wins.every(w => w >= 1), r.changes >= 2,
    r.rounds.length === 8 && r.rounds.every(x => x.sec >= 18 && x.sec <= 50) && r.length >= 255 && r.length <= 330, r.hang < 2];
  r.complete = r.checks.every(Boolean) && r.ok && r.ended;
  // Kleiner ist besser: enger Endstand, viele Führungswechsel, Entscheidung zwischen zwei Gleichauf-Liegenden
  const final = [...r.wins].sort((a, b) => b - a);
  r.score = (final[0] - final[1]) - r.changes * .5 - (sorted[0] === sorted[1] ? 1 : 0);
  return r;
}

async function main() {
  const arg = (name, fallback) => { const i = process.argv.indexOf('--' + name); return i > 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : fallback; };
  const from = arg('from', 1), to = arg('to', 100), top = arg('top', 15);
  const seeds = Array.from({ length: to - from + 1 }, (_, i) => from + i), rows = [];
  const browser = await launchBrowser({ gpu: false });
  let where;
  try {
    where = `Chromium ${browser.version()}`;
    const { page, errors } = await openExportPage(browser, { scenario: 'scrap', seed: 1, video: { aspect: '16:9', resolution: 720 } });
    await page.addScriptTag({ content: `window.castTournaments = ${castTournaments.toString()};` });
    for (let i = 0; i < seeds.length; i += 5) {
      rows.push(...await page.evaluate(([list, params]) => window.castTournaments(window.EBS, list, params), [seeds.slice(i, i + 5), PARAMS]));
      if (errors.length) throw errors[0];
      if (process.stdout.isTTY) process.stdout.write(`\r  ${rows.length} von ${seeds.length} Seeds`);
    }
    if (process.stdout.isTTY) process.stdout.write('\r' + ' '.repeat(40) + '\r');
  } finally { await browser.close(); }
  rows.forEach(judge);
  const good = rows.filter(r => r.complete).sort((a, b) => a.score - b.score || a.seed - b.seed);
  const pct = n => `${n} von ${rows.length} (${(n / rows.length * 100).toFixed(1)} %)`;
  const median = list => { const s = list.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };
  const time = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  const all = rows.flatMap(r => r.rounds);
  console.log(`Scrap-Turnier-Casting · Seeds ${from}–${to} · gerechnet in ${where}`);
  console.log(`  alle Bedingungen erfüllt: ${pct(good.length)}`);
  ['ein Sieger, keine Runde ohne Sieger', 'offen bis Runde 8', 'jeder gewinnt eine Runde', 'Führung wechselt zweimal', 'Rundenlängen und Videolänge', 'kein Hänger ab 2 s'].forEach((l, i) =>
    console.log(`  ${l.padEnd(36)} ${pct(rows.filter(r => r.checks[i]).length)}`));
  console.log(`  Median: Videolänge ${time(median(rows.map(r => r.length)))}, Runde ${median(all.map(x => x.sec)).toFixed(1)} s, erster K.o. ${median(all.map(x => x.firstKo)).toFixed(1)} s`);
  console.log(`  Rundensiege: ${NAMES.map((n, i) => `${n} ${all.filter(x => x.winner === i).length}`).join(', ')}, ohne Sieger ${all.filter(x => x.winner === null).length}`);
  console.log(`  Turniersiege: ${NAMES.map((n, i) => `${n} ${rows.filter(r => r.champions.length === 1 && r.champions[0] === i).length}`).join(', ')}, geteilt ${rows.filter(r => r.champions.length > 1).length}`);
  console.log(`  Invarianten verletzt: ${rows.filter(r => !r.ok).length} · nicht beendet: ${rows.filter(r => !r.ended).length}`);
  if (top > 0) console.log('\n Seed | Länge | Sieger der Runden 1–8                         | Stand vor Runde 8 | Endstand E/Az/Am/M | Wechsel | Hänger | Turniersieger');
  for (const r of good.slice(0, top)) {
    console.log(`${String(r.seed).padStart(5)} | ${time(r.length).padStart(5)} | ${r.rounds.map(x => NAMES[x.winner].slice(0, 5).padEnd(5)).join(' ')} | ${r.before.join('/').padEnd(17)} | ${r.wins.join('/').padEnd(18)} | ${String(r.changes).padStart(7)} | ${r.hang.toFixed(1)} s  | ${NAMES[r.champions[0]]}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
