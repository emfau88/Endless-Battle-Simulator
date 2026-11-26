#!/usr/bin/env node
// Casting für das Drehbuch-Langvideo (R44/D2): sucht für jede Zeile des Drehbuchs einen Runden-Seed, der genau das
// liefert, was die Zeile festlegt. Gerechnet in Chromium wie der Export (Node rechnet sin/cos anders).
// Das Drehbuch selbst steht in src/scenarios/scrap/episode.js (SCRIPTS); hier stehen nur Suche und Prüfung.
//   node scripts/scrap-script-casting.mjs --script jungle-comeback --from 1 --to 3000
//     rechnet alle Seeds einzeln (reine Runde quer, ohne Bild und Ton) und schlägt je Zeile einen Seed vor
//   node scripts/scrap-script-casting.mjs --script jungle-comeback --check
//     spielt das ganze Drehbuch als Episode und prüft jede Runde gegen ihre Zeile
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { launchBrowser, openExportPage } from '../lib/browser.mjs';

export const NAMES = ['EMBER', 'AZURE', 'AMBER', 'MOSS'];
// Grundbedingungen jeder Runde: ein Sieger, Länge 24–56 s, erster K.o. ab 6 s, Schlussduell ab 5 s, kein Hänger ab 1,5 s.
// Knapp heißt: Der Sieger hat am Ende weniger als 20 % Leben.
export const RULES = { minSec: 24, maxSec: 56, firstKo: 6, duel: 5, hang: 1.5, close: .2 };
// Wunschlänge einer Runde (Sekunden); das Finale darf länger sein. Zwölf Runden mit 4 s Pause ergeben rund 9 Minuten.
const TARGET = { round: 40, final: 48 };

// Läuft im Browser: eine Runde je Seed mit den Optionen der Episode (quer, Raketen-Regeln). Die Messung hängt sich
// nur an die Instanz und ändert den Ablauf nicht.
export function castRounds(EBS, seeds, base) {
  const rows = [];
  for (const seed of seeds) {
    const round = new EBS.ScrapTactics.Round({ ...base, seed, upgrades: [null, null, null, null] });
    const proto = Object.getPrototypeOf(round), kos = [];
    let blast = 0;
    round._explode = function (...args) { blast++; try { return proto._explode.apply(this, args); } finally { blast--; } };
    round._hurtRobot = function (robot, ...args) {
      const alive = robot.alive, out = proto._hurtRobot.call(this, robot, ...args);
      if (alive && !robot.alive) kos.push({ id: robot.id, t: this.t, rocket: blast > 0 });
      return out;
    };
    let shots = 0, still = 0, hang = 0;
    while (round.phase === 'running' && round.t < 180) {
      round.step(1 / 120);
      const living = round.robots.filter(r => r.alive), fired = round.stats.shots !== shots; shots = round.stats.shots;
      still = !fired && living.length > 1 && living.every(r => !r.caged && Math.hypot(r.vx, r.vy) < 8) ? still + 1 : 0;
      hang = Math.max(hang, still / 120);
    }
    const winner = round.winner, w = winner === null ? null : round.robots[winner], last = kos[kos.length - 1];
    rows.push({ seed, winner, order: kos.map(k => k.id), sec: round.t, hang, ok: round.checkInvariants().ok,
      firstKo: kos[0] ? kos[0].t : null, duel: kos.length >= 3 ? round.t - kos[kos.length - 2].t : 0,
      hp: w ? w.hp / w.maxHp : 0, rocket: !!(last && last.rocket) });
  }
  return rows;
}

// Erfüllt eine Runde ihre Zeile? Liefert die Liste der verfehlten Punkte (leer = passt).
export function misses(line, row, rules = RULES) {
  const out = [];
  if (row.winner !== line.winner) out.push('Sieger');
  if (line.second !== undefined && row.order[2] !== line.second) out.push('Zweiter');
  if (line.firstOut !== undefined && row.order[0] !== line.firstOut) out.push('zuerst raus');
  if (line.close && !(row.hp < rules.close)) out.push('knapp');
  if (line.rocket && !row.rocket) out.push('Rakete');
  if (!(row.sec >= rules.minSec && row.sec <= rules.maxSec)) out.push('Länge');
  if (!(row.firstKo >= rules.firstKo)) out.push('erster K.o.');
  if (!(row.duel >= rules.duel)) out.push('Schlussduell');
  if (!(row.hang < rules.hang)) out.push('Hänger');
  if (!row.ok) out.push('Invarianten');
  return out;
}

// Je Zeile der passende Seed, der am nächsten an der Wunschlänge liegt; jeder Seed nur einmal.
export function assign(lines, rows) {
  const used = new Set();
  return lines.map((line, i) => {
    const target = i === lines.length - 1 ? TARGET.final : TARGET.round;
    const fits = rows.filter(r => !used.has(r.seed) && !misses(line, r).length).sort((a, b) => Math.abs(a.sec - target) - Math.abs(b.sec - target) || a.seed - b.seed);
    if (fits[0]) used.add(fits[0].seed);
    return { line, row: fits[0] || null, count: fits.length };
  });
}

// Läuft im Browser: das ganze Drehbuch als Episode; je Runde Sieger, K.o.-Reihenfolge und Länge aus dem Ereignisprotokoll.
export function playScript(EBS, params) {
  const sim = new EBS.Scrap.Episode({ seed: 1, params, world: { w: 1920, h: 1080 }, view: { camera: false }, timeScale: 1 });
  const rounds = []; let seq = 0, kos = [], start = 0;
  while (sim.phase !== 'ended' && sim.step < 20 * 60 * 60) {
    sim.stepOnce();
    for (const e of sim.events) if (e.seq >= seq) {
      seq = e.seq + 1;
      if (e.type === 'round_start') { kos = []; start = e.step; }
      if (e.type === 'ko') kos.push(e.team);
      if (e.type === 'round_end') rounds.push({ seed: e.roundSeed, winner: e.winner, order: kos, sec: (e.step - start) / 60 });
    }
  }
  const out = { rounds, wins: [...sim.wins], champions: sim.champions(), length: sim.step / 60, ended: sim.phase === 'ended', ok: sim.checkInvariants().ok, total: sim.totalRounds };
  sim.destroy();
  return out;
}

async function main() {
  const text = name => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : undefined; };
  const id = text('script') || 'jungle-comeback', from = Number(text('from') || 1), to = Number(text('to') || 600);
  const check = process.argv.includes('--check');
  const time = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  const describe = l => [NAMES[l.winner], l.second !== undefined ? `vor ${NAMES[l.second]}` : '', l.firstOut !== undefined ? `${NAMES[l.firstOut]} zuerst raus` : '',
    l.close ? 'knapp' : '', l.rocket ? 'Rakete' : ''].filter(Boolean).join(', ');
  const browser = await launchBrowser({ gpu: false });
  try {
    const { page, errors } = await openExportPage(browser, { scenario: 'scrap', seed: 1, video: { aspect: '16:9', resolution: 720 } });
    const script = await page.evaluate(id => EBS.Scrap.SCRIPTS[id], id);
    if (!script) throw new Error(`Unbekanntes Drehbuch: ${id}`);
    const params = { arena: script.arena, rulesVersion: 'v4', episodeMode: 'tournament', script: id, endPauseSec: 4 };
    console.log(`Scrap-Drehbuch „${id}“ · ${script.rounds.length} Runden · gerechnet in Chromium ${browser.version()}`);
    if (check) {
      await page.addScriptTag({ content: `window.playScript = ${playScript.toString()};` });
      const out = await page.evaluate(params => window.playScript(EBS, params), params);
      const base = { arena: script.arena, rulesVersion: 'v4', portrait: false, short: false, items: 'rockets' };
      await page.addScriptTag({ content: `window.castRounds = ${castRounds.toString()};` });
      const rows = await page.evaluate(([seeds, base]) => window.castRounds(EBS, seeds, base), [script.rounds.map(r => r.seed), base]);
      let bad = 0;
      script.rounds.forEach((line, i) => {
        const played = out.rounds[i], row = rows[i], miss = misses(line, row);
        const same = played && played.winner === row.winner && played.order.join() === row.order.join() && played.seed === line.seed;
        if (miss.length || !same) bad++;
        console.log(`  Runde ${String(i + 1).padStart(2)} · Seed ${String(line.seed).padStart(5)} · ${time(row.sec)} · ${describe(line).padEnd(40)} ${miss.length ? 'verfehlt: ' + miss.join(', ') : same ? 'passt' : 'Episode weicht ab'}`);
      });
      console.log(`  Endstand ${NAMES.map((n, i) => `${n} ${out.wins[i]}`).join(', ')} · Sieger ${out.champions.map(i => NAMES[i]).join(' + ')} · Video ${time(out.length)} · beendet ${out.ended} · Invarianten ${out.ok}`);
      if (bad || errors.length || !out.ended || !out.ok) process.exitCode = 1;
      return;
    }
    const base = { arena: script.arena, rulesVersion: 'v4', portrait: false, short: false, items: 'rockets' };
    await page.addScriptTag({ content: `window.castRounds = ${castRounds.toString()};` });
    const seeds = Array.from({ length: to - from + 1 }, (_, i) => from + i), rows = [];
    for (let i = 0; i < seeds.length; i += 20) {
      rows.push(...await page.evaluate(([list, base]) => window.castRounds(EBS, list, base), [seeds.slice(i, i + 20), base]));
      if (errors.length) throw errors[0];
      if (process.stdout.isTTY) process.stdout.write(`\r  ${rows.length} von ${seeds.length} Seeds`);
    }
    if (process.stdout.isTTY) process.stdout.write('\r' + ' '.repeat(40) + '\r');
    const pct = n => `${(n / rows.length * 100).toFixed(1)} %`;
    const median = list => { const s = list.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };
    const base0 = rows.filter(r => r.winner !== null && !misses({ winner: r.winner }, r).length);
    console.log(`  Seeds ${from}–${to}: Grundbedingungen erfüllt ${pct(base0.length)}, davon knapp ${(base0.filter(r => r.hp < RULES.close).length / base0.length * 100).toFixed(1)} %, ` +
      `letzter K.o. per Rakete ${(base0.filter(r => r.rocket).length / base0.length * 100).toFixed(1)} %; Runde im Median ${median(rows.map(r => r.sec)).toFixed(1)} s`);
    const picks = assign(script.rounds, rows);
    let sum = 0;
    picks.forEach(({ line, row, count }, i) => {
      if (row) sum += row.sec;
      console.log(`  Runde ${String(i + 1).padStart(2)} · ${describe(line).padEnd(40)} ${String(count).padStart(4)} passende Seeds · ${row ? `Seed ${row.seed}, ${row.sec.toFixed(1)} s, Sieger ${Math.round(row.hp * 100)} % Leben` : 'KEIN SEED'}`);
    });
    const length = sum + (script.rounds.length - 1) * 4 + 5;
    console.log(`  Videolänge rund ${time(length)} (Runden ${time(sum)}, Pausen 4 s, Abspann 5 s)`);
    if (picks.every(p => p.row)) console.log(`\nSeeds für SCRIPTS['${id}'] in src/scenarios/scrap/episode.js:\n  ${JSON.stringify(picks.map(p => p.row.seed))}`);
    else process.exitCode = 1;
  } finally { await browser.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
