#!/usr/bin/env node
// Marble Knockout · Aktionswerte der Gesamtlevel (R44): nur Simulation in Node, kein Bild.
//   node scripts/knockout-action.mjs --level tower|gauntlet|trap|avalanche [--seeds 1-8] [--script 3,0,7] [--intro off]
//
// Je Lauf und als Median über die Läufe:
//   im Spiel        Murmeln, die noch nicht ausgeschieden sind (Durchschnitt über das Rennen bis zum Sieg)
//   bewegt im Bild  davon im Bildausschnitt der Kamera, schneller als 120 E/s und nicht im Becken
//   ruhig           Summe der halben Sekunden im Rennen mit weniger als zwei bewegten Murmeln im Bild
//   Anstöße         Läufe, in denen eine Murmel angestoßen werden musste (Hänger)
// Gezählt wird nur in der Phase „race“ bis zum Sieg; Platzhalter-Abschnitte (in Arbeit) zählen nicht mit.
// Für THE TOWER und THE GAUNTLET (Seeds 1 bis 8, ohne Drehbuch) gibt das Skript die Ausgangswerte des Plans wieder:
// docs/MARBLE_KNOCKOUT_RUSH_PLAN_2026-11-27.md, Abschnitt 1.
import { loadKnockout, makeSim } from './knockout-lab.mjs';

const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const LEVEL = { tower: ['9:16', 'standard'], trap: ['9:16', 'rush'], gauntlet: ['16:9', 'standard'], avalanche: ['16:9', 'rush'] };
const id = arg('level', 'tower');
if (!LEVEL[id]) { console.error(`Unbekanntes Level ${id}; erlaubt: ${Object.keys(LEVEL).join(', ')}`); process.exit(1); }
const [aspect, level] = LEVEL[id];
const [from, to = from] = String(arg('seeds', '1-8')).split('-').map(Number);
const script = arg('script') ? arg('script').split(',').map(Number) : null;

const EBS = loadKnockout(), CAM = EBS.KnockoutCamera;
const med = (a) => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN; };
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : '–');

/** Ein Lauf: Aktionswerte gesamt und je Abschnitt. */
function measure(sim) {
  let n = 0, live = 0, mIn = 0, quiet = 0, qN = 0, qSum = 0, sec = sim.secNo;
  const per = sim.sections.map((s) => ({ id: s.id, title: s.title, placeholder: s.placeholder, t0: -1, t1: -1, n: 0, mIn: 0, falls: 0 }));
  per[0].t0 = sim.t;
  while (sim.phase !== 'end' && sim.t < 420) {
    sim.stepOnce();
    if (sim.secNo !== sec) { per[sec].t1 = sim.t; sec = sim.secNo; per[sec].t0 = sim.t; }
    if (per[sec].t0 < 0) per[sec].t0 = sim.t;
    if (sim.phase !== 'race' || sim.winnerT >= 0 || sim.sec.placeholder) continue;
    const vw = CAM.view(sim.cam);
    let l = 0, mi = 0;
    for (const u of sim.runners) {
      if (u.out || !u.pm.active) continue;
      l++;
      if (u.finished) continue;
      const m = u.pm;
      if (m.vx * m.vx + m.vy * m.vy > 120 * 120 && m.x > vw.x0 && m.x < vw.x1 && m.y > vw.y0 && m.y < vw.y1) mi++;
    }
    n++; live += l; mIn += mi; per[sec].n++; per[sec].mIn += mi;
    qSum += mi; qN++;
    if (qN === 30) { if (qSum / qN < 2) quiet += 0.5; qSum = 0; qN = 0; }
  }
  const end = sim.winnerT >= 0 ? sim.winnerT : sim.t;
  if (per[sec].t1 < 0) per[sec].t1 = end;
  for (const m of sim.roster) if (m.how === 'fell' && m.outStage >= 0) per[m.outStage].falls++;
  return {
    len: sim.phase === 'end' ? sim.t : Infinity, live: live / n, mIn: mIn / n, quiet,
    nudges: sim.runners.reduce((a, u) => a + u.nudges, 0), stuck: sim.stats.stuck, timeUp: sim.stats.timeUp,
    falls: sim.roster.filter((m) => m.how === 'fell').length, gap: sim.finalGap, ok: sim.checkInvariants().ok,
    secs: per.map((p) => ({ ...p, dur: p.t1 - p.t0, mIn: p.n ? p.mIn / p.n : NaN })),
  };
}

const rows = [];
for (let seed = from; seed <= to; seed++) {
  const params = { mode: 'level', level, slowmo: 'on', intro: arg('intro', 'on'), cam: 'ride' };
  if (script) params.script = script;
  const r = measure(makeSim(EBS, { seed, aspect, params }));
  rows.push({ seed, ...r });
  console.log(`  seed ${String(seed).padStart(3)} | Video ${f1(r.len)} s | im Spiel ${f1(r.live)} | bewegt im Bild ${f1(r.mIn)} | ruhig ${f1(r.quiet)} s | `
    + `Anstöße ${r.nudges} fest ${r.stuck} Zeit ${r.timeUp} | Stürze ${r.falls} | 1–2 ${r.gap >= 0 ? r.gap.toFixed(2) : '–'} s | ok ${r.ok}`);
}
const real = rows[0].secs.filter((s) => !s.placeholder);
console.log(`\n${id} (${level}, ${aspect}), Seeds ${from}–${to}${script ? `, Drehbuch ${script.join(',')}` : ''}`);
console.log(`  Median: Video ${f1(med(rows.map((r) => r.len)))} s · im Spiel ${f1(med(rows.map((r) => r.live)))} · bewegt im Bild ${f1(med(rows.map((r) => r.mIn)))}`
  + ` · ruhig ${f1(med(rows.map((r) => r.quiet)))} s · Läufe mit Anstoß ${rows.filter((r) => r.nudges).length}/${rows.length}`);
console.log('  Abschnitt              | Dauer (Median) | längster Lauf | bewegt im Bild | Stürze (Median)');
real.forEach((s, i) => {
  const d = rows.map((r) => r.secs[i].dur);
  console.log(`  ${`${i + 1} ${s.title}`.padEnd(22)} | ${f1(med(d)).padStart(12)} s | ${f1(Math.max(...d)).padStart(11)} s | ${f1(med(rows.map((r) => r.secs[i].mIn))).padStart(14)} | ${f1(med(rows.map((r) => r.secs[i].falls))).padStart(5)}`);
});
const longest = med(rows.map((r) => Math.max(...r.secs.filter((s) => !s.placeholder).map((s) => s.dur))));
console.log(`  Längster Abschnitt je Lauf (Median): ${f1(longest)} s`);
