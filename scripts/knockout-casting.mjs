#!/usr/bin/env node
// Marble Knockout · Casting (R43/M7, M8). Reine Simulation ohne Bild und Ton.
//
// Short (M7): ganzes Rennen je Seed. Ein Seed ist vollständig, wenn
//   1. das Video höchstens 40 s lang ist         2. das Finale knapp ist (Platz 1 und 2 unter 0,8 s, Zeitlupe)
//   3. die Führung im Finale mindestens einmal wechselt
//   4. auf der Gefahrenbahn mindestens eine Murmel abstürzt (nur Fassungen mit Gefahrenbahn)
//   5. Fassung B: GOLD erreicht das Finale       6. keine Murmel sitzt fest und keine braucht einen Anstoß
// Reihenfolge: kurz und knapp zuerst (0,1 s Abstand im Finale wiegen wie 1 s Videolänge).
//   node scripts/knockout-casting.mjs --short A [--from 1 --to 200 --top 12 --list --best 24]
//
// Langvideo (M8): Drehbuch Bahn für Bahn für die Geschichte aus dem Plan (Abschnitt 4), je Grund-Seed:
//   node scripts/knockout-casting.mjs --long [--from 1 --to 3 --tries 30]
//
// Gesamtlevel (R43 Teil 2): ganzes Level je Seed, Prüfpunkte unten bei castLevelMain:
//   node scripts/knockout-casting.mjs --level tower [--from 1 --to 200]
import { loadKnockout, makeSim } from './knockout-lab.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const from = Number(arg('from', 1)), to = Number(arg('to', argv.includes('--long') ? 3 : 200)), top = Number(arg('top', 12));

const EBS = loadKnockout(), P = EBS.KnockoutSim.KnockoutSimulation.prototype;
// Anstöße und Festsitzen mitzählen (die Simulation selbst bleibt unverändert)
let nudges = 0, nudgeAt = {};
const oN = P.nudge, oS = P.stuckOut;
P.nudge = function (u) { nudges++; nudgeAt[this.stageNo] = (nudgeAt[this.stageNo] || 0) + 1; return oN.call(this, u); };
P.stuckOut = function (u) { nudges += 10; return oS.call(this, u); };

// ===================================================================== Short (M7)
function castShortMain() {
  const short = arg('short', 'A'), MAX_LEN = 40, GAP = 0.8, rows = [];
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
}

// ===================================================================== Langvideo: Drehbuch Bahn für Bahn (M8)
// Geschichte: Eine Außenseiterin entkommt dreimal knapp und erreicht das Finale (Podest), der frühe Spitzenreiter
// stürzt auf Bahn 7 am Hammer, das Finale entscheidet ein Fotofinish. Je Bahn werden Kandidaten-Seeds der Reihe nach
// probiert; das Rennen davor steht durch das Drehbuch fest (gleiche Seeds, gleiche Bits). Pflicht auf jeder Bahn:
// niemand sitzt fest, kein Zeitlimit, höchstens ein Stoß.
//   Außenseiterin: die erste knapp Gerettete auf Bahn 1 bis 3 (als Letzte durch, weniger als 2,5 Murmelbreiten vor
//                  der Ausgeschiedenen); danach muss sie noch zweimal so knapp entkommen
//   Spitzenreiter: eine der drei besten Platzsummen auf Bahn 1 bis 3 (ohne die Außenseiterin), stürzt auf Bahn 7
//   Fotofinish:    Platz 1 und 2 im Finale weniger als 0,3 s auseinander. Knapper wird es kaum: In 80 Finals lag
//                  der kleinste Abstand bei 0,23 s, weil das Drehkreuz vor dem Ziel das Feld auseinanderzieht.
const ESCAPE_D = 2.5, PHOTO = 0.3, HAZARD = [3, 6];

/** Rennen mit dem Drehbuch bis zum Beginn von Bahn i (Vorlage für alle Kandidaten dieser Bahn). */
function stageStart(base, script, i) {
  const sim = makeSim(EBS, { seed: base, params: { script } });
  while (sim.stageNo < i && sim.phase !== 'end') sim.stepOnce();
  return sim;
}
/** Neues Rennen mit Kandidaten-Seed, das genau dort weitermacht, wo die Vorlage Bahn i betreten hat. Zwischen den
 *  Bahnen trägt das Rennen nur Aufstellung, Ausgeschiedene, Zeit und Zeitlupen-Zähler; die Bahn wird neu gebaut.
 *  Die Gegenprobe am Ende rechnet das ganze Rennen am Stück und prüft die Geschichte noch einmal. */
function fork(tpl, base, script, i) {
  const sim = makeSim(EBS, { seed: base, params: { script } }), copy = (v) => JSON.parse(JSON.stringify(v));
  sim.roster = copy(tpl.roster); sim.lineup = tpl.lineup.slice(); sim.outList = tpl.outList.slice(); sim.notes = copy(tpl.notes);
  sim.slow = copy(tpl.slow); sim.t = tpl.t; sim.step = tpl.step; sim.safeNext = tpl.safe; sim.chapterLog = copy(tpl.chapterLog.slice(0, -1));
  sim.enterStage(i); sim.phase = tpl.phase; sim.phaseT = tpl.phaseT;
  return sim;
}
/** Kennzahlen von Bahn i für einen Kandidaten (tpl: Rennen am Beginn von Bahn i, oder null für Bahn 1). */
function runStage(base, script, i, tpl) {
  nudgeAt = {};
  const sim = tpl ? fork(tpl, base, script, i) : makeSim(EBS, { seed: base, params: { script } }), d = 2 * sim.r;
  let gapD = Infinity, lastSurv = -1;
  while (sim.phase !== 'end' && sim.t < 900) {
    sim.stepOnce();
    if (sim.stageNo < i) continue;
    if (sim.stageNo > i) return null;
    // Knapp entkommen: Abstand in Murmelbreiten zwischen der letzten Überlebenden und der Ausgeschiedenen im Moment
    // des Aus durch die Klappe
    if (sim.phase === 'race' && gapD === Infinity) {
      const hatched = sim.runners.filter((u) => u.out && !u.fell);
      if (hatched.length) {
        const fin = sim.runners.filter((u) => u.finished && !u.out && u.place < 500).sort((a, b) => b.place - a.place)[0];
        if (fin) { lastSurv = fin.rid; gapD = (fin.prog - Math.max(...hatched.map((u) => u.prog))) / d; }
      }
    }
    if (sim.phase === 'result' || sim.phase === 'podium') {
      const fin = sim.runners.filter((u) => !u.out).sort((a, b) => a.place - b.place);
      return {
        order: fin.map((u) => u.rid), out: sim.runners.filter((u) => u.out).map((u) => ({ rid: u.rid, how: sim.roster[u.rid].how })),
        stuck: sim.stats.stuck, timeUp: sim.stats.timeUp, nudges: nudgeAt[i] || 0, safe: sim.safe,
        lastSurv, gapD, photo: sim.final && fin.length > 1 ? fin[1].finishT - fin[0].finishT : Infinity,
      };
    }
  }
  return null;
}

// Rückschau: Wer am Hammer stürzt und wie knapp das Finale wird, hängt vor allem an der Aufstellung, also an der
// Zielreihenfolge der Bahn davor. Scheitert Bahn 7 oder das Finale, probiert die Suche darum auf Bahn 6 bzw. Bahn 9
// weitere gültige Varianten (BRANCH). Höchstens BUDGET Probeläufe je Grund-Seed.
const BRANCH = { 5: 6, 8: 10 }, BUDGET = 2500;

function castLong(base, K) {
  const name = (rid) => EBS.KnockoutSim.LONG_FIELD[rid];
  let tried = 0, deepest = 0;
  /** Gültige Kandidaten für Bahn i im Zustand st, beste zuerst. */
  function candidates(st, i) {
    // Sturz am Hammer und Fotofinish sind selten: dort viermal so viele Versuche
    const tpl = i ? stageStart(base, st.script, i) : null, tries = i === 6 || i === 9 ? 4 * K : K, list = [];
    const want = st.escapes < 3 && i < 9 && !HAZARD.includes(i) ? 12 : 2, many = (BRANCH[i] || 1) > 1;
    for (let k = 0; k < tries && tried < BUDGET; k++) {
      const cand = EBS.util.hashSeed(base, 'cast', i, k) >>> 0, rec = runStage(base, [...st.script, cand], i, tpl);
      tried++;
      if (!rec || rec.stuck || rec.timeUp || rec.nudges > 1) continue;
      if (st.U >= 0 && !rec.order.includes(st.U)) continue;                               // Außenseiterin überlebt
      if (i >= 3 && i <= 5 && !st.L.some((rid) => rec.order.includes(rid))) continue;      // ein Spitzenreiter bleibt
      const fallen = i === 6 ? st.L.filter((rid) => rec.out.some((o) => o.rid === rid && o.how === 'fell')) : [];
      if (i === 6 && !fallen.length) continue;                                            // Bahn 7: Sturz am Hammer
      if (i === 9 && !(rec.photo < PHOTO)) continue;                                      // Fotofinish
      // Knappe Rettung der Außenseiterin; die erste auf Bahn 1 bis 3 bestimmt, wer sie ist
      const esc = rec.gapD < ESCAPE_D && (st.U < 0 ? i <= 2 : rec.lastSurv === st.U);
      let s = (rec.nudges ? 0 : 2) + (esc && st.escapes < 3 ? 10 : 0);
      if (i === 9) s += 5 * (PHOTO - rec.photo) / PHOTO;
      list.push({ cand, rec, s, esc, fallen });
      if (!many && s >= want) break;
    }
    return list.sort((a, b) => b.s - a.s);
  }
  /** Zustand nach Bahn i mit Kandidat c (neue Kopie; der alte bleibt für die Rückschau). */
  function apply(st, i, c) {
    const n = { ...st, script: [...st.script, c.cand], sum: { ...st.sum }, expectOut: { ...st.expectOut }, log: [...st.log] }, r = c.rec;
    if (n.U < 0 && c.esc) n.U = r.lastSurv;
    if (c.esc) n.escapes++;
    r.out.forEach((o) => { n.expectOut[o.rid] = i; });
    if (i <= 2) r.order.forEach((rid, p) => { n.sum[rid] = (n.sum[rid] || 0) + p + 1; });
    // Frühe Spitzenreiter: die drei besten Platzsummen auf Bahn 1 bis 3 (ohne die Außenseiterin)
    if (i === 2) n.L = r.order.filter((rid) => rid !== n.U).sort((a, b) => n.sum[a] - n.sum[b] || a - b).slice(0, 3);
    if (i === 6) n.leader = c.fallen.slice().sort((a, b) => n.sum[a] - n.sum[b] || a - b)[0];
    n.log.push(`Bahn ${String(i + 1).padStart(2)}: Seed ${c.cand}${c.esc ? ` · ${name(n.U)} entkommt (${r.gapD.toFixed(1)} Breiten)` : ''}`
      + `${r.out.length ? ' · raus ' + r.out.map((o) => `${name(o.rid)} (${o.how})`).join(', ') : ''}${r.safe ? ' · sichere Bahn' : ''}`
      + `${i === 2 ? ` · frühe Spitze ${n.L.map(name).join(', ')}` : ''}${i === 6 ? ` · ${name(n.leader)} stürzt am Hammer` : ''}`
      + `${i === 9 ? ` · Fotofinish ${r.photo.toFixed(3)} s, Sieger ${name(r.order[0])}` : ''}${r.nudges ? ' · 1 Stoß' : ''}`);
    return n;
  }
  function dfs(st, i) {
    if (i === 10) return st.escapes >= 3 ? st : null;
    if (i === 3 && st.U < 0) return null;
    deepest = Math.max(deepest, i);
    for (const c of candidates(st, i).slice(0, BRANCH[i] || 1)) {
      const r = dfs(apply(st, i, c), i + 1);
      if (r || tried >= BUDGET) return r;
    }
    return null;
  }
  const done = dfs({ script: [], U: -1, L: [], leader: -1, escapes: 0, sum: {}, expectOut: {}, log: [] }, 0);
  if (!done) return { ok: false, failedAt: deepest + 1, tried, log: [] };
  return { ok: true, script: done.script, underdog: name(done.U), leader: name(done.leader), escapes: done.escapes, log: done.log, tried, expectOut: done.expectOut };
}

/** Gegenprobe: ganzes Rennen am Stück mit Drehbuch; dieselben Ausgeschiedenen je Bahn und die Geschichte. */
function verifyLong(base, r) {
  nudges = 0;
  const sim = makeSim(EBS, { seed: base, params: { script: r.script } }), errors = [];
  let stuck = 0;
  while (sim.phase !== 'end' && sim.t < 900) {
    sim.stepOnce();
    if (sim.phase === 'result' && sim.phaseT < sim.dt * 1.5) stuck += sim.stats.stuck + sim.stats.timeUp;
  }
  sim.roster.forEach((m) => { if ((r.expectOut[m.id] ?? -1) !== m.outStage) errors.push(`${m.name}: raus auf Bahn ${m.outStage + 1} statt ${(r.expectOut[m.id] ?? -1) + 1}`); });
  const id = (n) => sim.roster.findIndex((m) => m.name === n), L = sim.roster[id(r.leader)];
  const fin = sim.runners.filter((u) => !u.out).sort((a, b) => a.place - b.place), photo = fin[1].finishT - fin[0].finishT;
  if (!sim.podium || !sim.podium.includes(id(r.underdog))) errors.push('Außenseiterin nicht auf dem Podest');
  if (L.outStage !== 6 || L.how !== 'fell') errors.push('Spitzenreiter stürzt nicht auf Bahn 7');
  if (!(photo < PHOTO)) errors.push(`kein Fotofinish (${photo.toFixed(3)} s)`);
  if (stuck) errors.push(`${stuck} festgefahren oder Zeitlimit`);
  return { errors, len: sim.t, nudges, photo, podium: (sim.podium || []).map((i) => sim.roster[i].name) };
}

function castLongMain() {
  const K = Number(arg('tries', 30));
  for (let base = from; base <= to; base++) {
    const r = castLong(base, K);
    console.log(`\nGrund-Seed ${base}: ${r.ok ? 'Geschichte vollständig' : r.failedAt ? `scheitert auf Bahn ${r.failedAt}` : `nur ${r.escapes} knappe Rettungen`} (${r.tried} Probeläufe)`);
    for (const l of r.log) console.log('  ' + l);
    if (r.ok) {
      const v = verifyLong(base, r);
      console.log(`  Gegenprobe am Stück: ${v.errors.length ? 'FEHLER ' + v.errors.join('; ') : 'Geschichte hält'} · Video ${v.len.toFixed(1)} s, Stöße ${v.nudges}, Fotofinish ${v.photo.toFixed(3)} s, Podest ${v.podium.join(', ')}`);
      if (!v.errors.length) console.log(`  { seed: ${base}, script: ${JSON.stringify(r.script)}, underdog: '${r.underdog}', leader: '${r.leader}' },`);
    }
  }
}

// ===================================================================== Gesamtlevel (R43 Teil 2, G3 und G6)
// Ein Seed ist vollständig, wenn
//   1. das Video höchstens 40 s lang ist (Short)   2. eine Schleuse knapp schließt (unter CUT d) oder jemand stürzt
//   3. das Finale knapp ist (Platz 1 und 2 unter 0,8 s oder Zeitlupe)   4. die Führung im Finale wechselt
//   5. niemand einen Anstoß braucht oder festsitzt     6. mit --gold: GOLD erreicht das Finale
//   node scripts/knockout-casting.mjs --level tower [--from 1 --to 200 --top 12 --cut 1.5 --gold --list --best 24]
function castLevelMain() {
  const id = arg('level', 'tower'), spec = EBS.KnockoutLevels.LEVELS[id], aspect = spec.format === 'short' ? '9:16' : '16:9';
  const MAX_LEN = spec.format === 'short' ? 40 : 600, GAP = 0.8, CUT = Number(arg('cut', 1.5)), gold = argv.includes('--gold'), rows = [];
  for (let seed = from; seed <= to; seed++) {
    const sim = makeSim(EBS, { seed, aspect, params: { mode: 'level' } });
    const last = sim.sections.length - 1;
    let leads = 0, lastLead = -1, cand = -1, held = 0, sample = 0, f0 = -1;
    while (sim.phase !== 'end' && sim.t < 120) {
      sim.stepOnce();
      if (sim.secNo !== last || sim.winnerT >= 0) continue;
      if (f0 < 0) f0 = sim.t;
      // Führung alle 0,25 s ab 1,5 s im Finale; ein Wechsel zählt, wenn die neue Spitze 1 s vorn bleibt (wie M7)
      if (sim.t - f0 >= 1.5 && ++sample % 15 === 0) {
        if (sim.leader === cand) held++; else { cand = sim.leader; held = 1; }
        if (held === 4 && cand !== lastLead) { if (lastLead >= 0) leads++; lastLead = cand; }
      }
    }
    const len = sim.phase === 'end' ? sim.t : Infinity, gap = sim.finalGap >= 0 ? sim.finalGap : Infinity;
    const falls = sim.roster.filter((m) => m.how === 'fell').length, cut = Math.min(...sim.cuts.map((c) => c.gap), Infinity);
    const nudges = sim.runners.reduce((a, u) => a + u.nudges, 0) + 10 * (sim.stats.stuck + sim.stats.timeUp);
    const goldIn = sim.roster.some((m) => m.name === 'GOLD' && m.alive);
    const checks = [len <= MAX_LEN, cut < CUT || falls >= 1, gap < GAP || sim.slow.finalDone, leads >= 1, nudges === 0, !gold || goldIn];
    rows.push({ seed, len, gap, cut, leads, falls, goldIn, slow: sim.slow.finalDone, winner: sim.winner >= 0 ? sim.roster[sim.winner].name : '-', checks, complete: checks.every(Boolean), ok: sim.checkInvariants().ok });
  }
  const good = rows.filter((r) => r.complete), pct = (n) => `${n} von ${rows.length} (${Math.round(n / rows.length * 100)} %)`;
  console.log(`Gesamtlevel ${spec.title}, Seeds ${from}–${to}: vollständig bei ${pct(good.length)}.`);
  [`Länge bis ${MAX_LEN} s`, `knapper Schnitt (< ${CUT} d) oder Sturz`, `Finale knapp (< ${GAP} s oder Zeitlupe)`, 'Führungswechsel im Finale', 'ohne Anstoß und Festsitzen', 'GOLD im Finale (nur --gold)']
    .forEach((l, i) => console.log(`  ${l.padEnd(36)} ${pct(rows.filter((r) => r.checks[i]).length)}`));
  const lens = rows.map((r) => r.len).filter(Number.isFinite).sort((a, b) => a - b);
  console.log(`  Länge Median ${lens[lens.length >> 1]?.toFixed(1)} s (kürzeste ${lens[0]?.toFixed(1)} s) · Invarianten verletzt: ${rows.filter((r) => !r.ok).length}`);
  const score = (r) => r.len + 10 * Math.min(r.gap, 2);
  good.sort((a, b) => score(a) - score(b));
  const best = Number(arg('best', 24));
  if (argv.includes('--list')) console.log(`\nBeste ${best} Seeds:\n` + JSON.stringify(good.slice(0, best).map((r) => r.seed).sort((a, b) => a - b)));
  const f = (v) => (Number.isFinite(v) ? v.toFixed(2).padStart(5) : '  –  ');
  console.log('\n Seed | Länge | Abstand 1–2 | Schnitt | Wechsel | Stürze | GOLD | Sieger');
  for (const r of good.slice(0, top)) console.log(`${String(r.seed).padStart(5)} | ${r.len.toFixed(1).padStart(5)} | ${f(r.gap)} s${r.slow ? ' Z' : '  '}  | ${f(r.cut)} d | ${String(r.leads).padStart(7)} | ${String(r.falls).padStart(6)} | ${r.goldIn ? ' ja ' : ' –  '} | ${r.winner}`);
}

if (argv.includes('--long')) castLongMain(); else if (argv.includes('--level')) castLevelMain(); else castShortMain();
