#!/usr/bin/env node
// Casting für Scrap-Shorts (R40/S2). Reine Simulation ohne Bild und Ton, gerechnet in Chromium wie der Export:
// Node und Chromium liefern bei sin/cos leicht andere Werte, v4-Runden laufen deshalb bei einzelnen Seeds verschieden.
// Prüft je Seed, ob der Short seinen Bogen hat (Zeiten in Videosekunden):
//   1. erster K.o. bei 5–10 s          2. zweiter K.o. bei 12–20 s
//   3. Schlussduell mindestens 6 s      4. beide Duellanten beim Start des Duells unter 40 % Leben
//   5. Videolänge (Sieg + Abspann) 26–38 s
// Bevorzugt: Es gewinnt nicht der Roboter, der zuerst bewaffnet war.
//   node scripts/scrap-short-casting.mjs                       Seeds 1–300
//   node scripts/scrap-short-casting.mjs --from 1 --to 1200 --top 20 [--list] [--node]
//   --list: geprüfte Seeds für SHORT_SEEDS in src/scenarios/scrap/episode.js
//   --node: zum Vergleich in Node rechnen (nicht für die Auswahl verwenden)
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { launchBrowser, openExportPage } from '../lib/browser.mjs';

const NAMES = ['EMBER', 'AZURE', 'AMBER', 'MOSS'];

// Läuft im Browser (oder in Node): ein Short je Seed, Kennzahlen aus Ereignisprotokoll und Rundenzustand.
export function castSeeds(EBS, seeds) {
  const world = { w: 1080, h: 1920 }, rows = [];
  for (const seed of seeds) {
    const sim = new EBS.Scrap.Episode({ seed, params: { rulesVersion: 'v4', arena: 'sunshine', layout: 'short' }, world, view: { camera: false }, timeScale: 1 });
    const round = sim.roundSim, kos = []; let seq = 0, armed = null, duel = null;
    while (sim.phase === 'running' && sim.step < 95 * 60) {
      sim.stepOnce();
      for (const e of sim.events) if (e.seq >= seq) {
        seq = e.seq + 1;
        if (e.type === 'pickup' && armed === null) armed = e.team;
        if (e.type === 'ko') {
          kos.push({ t: e.step / 60, team: e.team });
          // Start des Schlussduells: Leben der beiden Übrigen (Anteil)
          if (kos.length === 2) duel = round.robots.filter(r => r.alive).map(r => r.hp / r.maxHp);
        }
      }
    }
    const end = sim.step / 60, winner = round.winner, last = kos.length === 3 ? kos[2].t : null;
    rows.push({ seed, kos, armed, winner, duel, end, length: end + EBS.Scrap.SHORT_END_SEC,
      duelSec: last !== null ? last - kos[1].t : null, winnerHp: winner === null ? null : round.robots[winner].hp / round.robots[winner].maxHp,
      ok: sim.checkInvariants().ok });
    sim.destroy();
  }
  return rows;
}

// Bewertet eine Zeile: die fünf Bedingungen, vollständig, Außenseiter (Sieger war nicht zuerst bewaffnet), Wertung.
export function judge(r) {
  const within = (v, lo, hi) => v !== null && v !== undefined && v >= lo && v <= hi;
  r.checks = [within(r.kos[0]?.t, 5, 10), within(r.kos[1]?.t, 12, 20), r.duelSec !== null && r.duelSec >= 6,
    !!r.duel && r.duel.length === 2 && r.duel.every(v => v < .4), within(r.length, 26, 38) && r.winner !== null];
  r.complete = r.checks.every(Boolean) && r.ok;
  r.underdog = r.winner !== null && r.winner !== r.armed;
  // Kleiner ist besser: Sieger nicht zuerst bewaffnet, knappes Ende, langes Duell
  r.score = (r.underdog ? 0 : 1) + (r.winnerHp ?? 1) - Math.min(r.duelSec ?? 0, 12) / 24;
  return r;
}

async function main() {
  const arg = (name, fallback) => { const i = process.argv.indexOf('--' + name); return i > 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : fallback; };
  const from = arg('from', 1), to = arg('to', 300), top = arg('top', 15), inNode = process.argv.includes('--node');
  const seeds = Array.from({ length: to - from + 1 }, (_, i) => from + i), rows = [];
  let where = 'Node';
  if (inNode) {
    const context = vm.createContext({}); context.window = context;
    for (const path of ['core.js', 'scenarios/scrap/simulation.js', 'scenarios/scrap/rules.js', 'scenarios/scrap/materials.js',
      'scenarios/scrap/tactics.js', 'scenarios/scrap/episode.js']) vm.runInContext(readFileSync(new URL('../src/' + path, import.meta.url), 'utf8'), context, { filename: path });
    rows.push(...castSeeds(context.EBS, seeds));
  } else {
    const browser = await launchBrowser({ gpu: false });
    try {
      where = `Chromium ${browser.version()}`;
      const { page, errors } = await openExportPage(browser, { scenario: 'scrap', seed: 1, video: { aspect: '9:16', resolution: 720 } });
      await page.addScriptTag({ content: `window.castSeeds = ${castSeeds.toString()};` });
      for (let i = 0; i < seeds.length; i += 20) {
        rows.push(...await page.evaluate(list => window.castSeeds(window.EBS, list), seeds.slice(i, i + 20)));
        if (errors.length) throw errors[0];
        if (process.stdout.isTTY) process.stdout.write(`\r  ${rows.length} von ${seeds.length} Seeds`);
      }
      if (process.stdout.isTTY) process.stdout.write('\r' + ' '.repeat(40) + '\r');
    } finally { await browser.close(); }
  }
  rows.forEach(judge);
  const good = rows.filter(r => r.complete).sort((a, b) => a.score - b.score || a.seed - b.seed);
  const pct = n => `${n} von ${rows.length} (${(n / rows.length * 100).toFixed(1)} %)`;
  const median = list => { const s = list.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };
  console.log(`Scrap-Short-Casting · Seeds ${from}–${to} · gerechnet in ${where}`);
  console.log(`  Bogen vollständig bei ${pct(good.length)}, davon gewinnt nicht der zuerst Bewaffnete: ${good.filter(r => r.underdog).length}`);
  ['erster K.o. 5–10 s', 'zweiter K.o. 12–20 s', 'Schlussduell ≥ 6 s', 'beide unter 40 % Leben', 'Länge 26–38 s'].forEach((l, i) =>
    console.log(`  ${l.padEnd(24)} ${pct(rows.filter(r => r.checks[i]).length)}`));
  console.log(`  Median: erster K.o. ${median(rows.map(r => r.kos[0]?.t)).toFixed(1)} s, zweiter ${median(rows.map(r => r.kos[1]?.t)).toFixed(1)} s, Länge ${median(rows.map(r => r.length)).toFixed(1)} s, Schlussduell ${median(rows.map(r => r.duelSec)).toFixed(1)} s`);
  console.log(`  ohne Sieger: ${rows.filter(r => r.winner === null).length} · Invarianten verletzt: ${rows.filter(r => !r.ok).length}`);
  console.log(`  Siege: ${NAMES.map((n, i) => `${n} ${rows.filter(r => r.winner === i).length}`).join(', ')}`);
  if (process.argv.includes('--list')) console.log('\nVollständige Seeds, bei denen nicht der zuerst Bewaffnete gewinnt (für SHORT_SEEDS in src/scenarios/scrap/episode.js):\n'
    + JSON.stringify(good.filter(r => r.underdog).map(r => r.seed).sort((a, b) => a - b)));
  const sec = v => (v === null || v === undefined ? '  –  ' : v.toFixed(1).padStart(5)), hp = v => `${Math.round(v * 100)}`.padStart(3) + ' %';
  if (top > 0) console.log('\n Seed | 1. K.o.        | 2. K.o.        | Sieg    | Duell   | Leben im Duell | Länge   | Sieger (Rest) | zuerst bewaffnet');
  for (const r of good.slice(0, top)) {
    console.log(`${String(r.seed).padStart(5)} | ${sec(r.kos[0].t)} s ${NAMES[r.kos[0].team].padEnd(6)} | ${sec(r.kos[1].t)} s ${NAMES[r.kos[1].team].padEnd(6)} | ${sec(r.kos[2].t)} s | ${sec(r.duelSec)} s | ${hp(r.duel[0])} / ${hp(r.duel[1])}  | ${sec(r.length)} s | ${NAMES[r.winner].padEnd(5)} (${hp(r.winnerHp)}) | ${NAMES[r.armed] ?? '–'}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
