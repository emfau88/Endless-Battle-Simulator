#!/usr/bin/env node
// Marble Knockout · Labor (R43): Simulation in Node ohne Browser, für Galerie, einzelne Bahnen und ganze Rennen.
//   node scripts/knockout-lab.mjs gallery [--element turnstile|all] [--seconds 60] [--aspect 16:9]
//   node scripts/knockout-lab.mjs stage --stage 3 [--seed 1] [--runs 5] [--aspect 16:9]
//   node scripts/knockout-lab.mjs race [--seed 1] [--runs 1] [--aspect 16:9|9:16] [--short A]
//   node scripts/knockout-lab.mjs check [--seed 1] [--runs 100]      (viele freie Rennen, Zusammenfassung)
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

export const FILES = ['src/core.js', 'src/scenarios/knockout/detmath.js', 'src/scenarios/knockout/physics.js', 'src/scenarios/knockout/elements.js',
  'src/scenarios/knockout/gallery.js', 'src/scenarios/knockout/stages.js', 'src/scenarios/knockout/simulation.js',
  'src/scenarios/knockout/camera.js', 'src/scenarios/knockout/level.js', 'src/scenarios/knockout/levels.js', 'src/scenarios/knockout/levelsim.js',
  'src/scenarios/knockout/series.js'];

/** Lädt die Knockout-Module in einen eigenen Kontext und gibt EBS zurück. */
export function loadKnockout(root = new URL('../', import.meta.url)) {
  const context = vm.createContext({ console }); context.window = context;
  for (const p of FILES) vm.runInContext(readFileSync(new URL(p, root), 'utf8'), context, { filename: p });
  return context.EBS;
}
/** Dazu Bild und Szenario (knockout.js mit den Casting-Listen), mit einem Zeichenkontext, der nichts tut. */
export function loadKnockoutScenario(root = new URL('../', import.meta.url)) {
  const stub = () => new Proxy(function () {}, {
    get: (_t, k) => (k === 'width' ? 10 : k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : stub()),
    set: () => true, apply: () => stub(),
  });
  const context = vm.createContext({ console, document: { createElement: () => ({ width: 1, height: 1, getContext: () => stub() }) } });
  context.window = context;
  for (const p of [...FILES, 'src/canvas-scene.js', 'src/scenarios/knockout/art.js', 'src/scenarios/knockout/renderer.js', 'src/scenarios/knockout.js']) {
    vm.runInContext(readFileSync(new URL(p, root), 'utf8'), context, { filename: p });
  }
  return context.EBS;
}
export const WORLD ={ '16:9': { w: 1920, h: 1080 }, '9:16': { w: 1080, h: 1920 } };
export function makeSim(EBS, { seed = 1, aspect = '16:9', params = {} } = {}) {
  const p = { mode: 'race', short: 'A', stage: 0, element: 'all', slowmo: 'on', ...params };
  // Zwei Rennen mit Gesamtwertung (G9): nur im Querformat
  if (p.mode === 'level' && p.series === 'two' && aspect !== '9:16') return new EBS.KnockoutSeries.KnockoutSeriesSimulation({ seed, params: p, world: WORLD[aspect] });
  if (p.mode === 'level') return new EBS.KnockoutLevelSim.KnockoutLevelSimulation({ seed, params: p, world: WORLD[aspect] });
  return new EBS.KnockoutSim.KnockoutSimulation({ seed, params: p, world: WORLD[aspect] });
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const argv = process.argv.slice(2), cmd = argv[0] || 'race';
  const arg = (n, d) => { const i = argv.indexOf('--' + n); return i > 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
  const EBS = loadKnockout(), aspect = arg('aspect', '16:9');
  if (cmd === 'gallery') {
    const ids = arg('element', 'all') === 'all' ? Object.keys(EBS.KnockoutGallery) : [arg('element')];
    const seconds = Number(arg('seconds', 60));
    for (const id of ids) {
      const sim = makeSim(EBS, { seed: Number(arg('seed', 1)), aspect, params: { mode: 'gallery', element: id } });
      const t0 = Date.now(); let worstGap = 0, errors = [];
      const lastSeen = new Map();
      for (let i = 0; i < seconds * 60; i++) {
        sim.stepOnce();
        for (const m of sim.world.marbles) {
          if (!lastSeen.has(m.rid)) lastSeen.set(m.rid, 0);
          if (m.loops !== (lastSeen.get(m.rid + 100) || 0)) { lastSeen.set(m.rid + 100, m.loops); lastSeen.set(m.rid, sim.t); }
          worstGap = Math.max(worstGap, sim.t - lastSeen.get(m.rid));
        }
        if (i % 60 === 0) { const c = sim.checkInvariants(); if (!c.ok) errors.push(...c.errors.map((e) => `${sim.t.toFixed(1)}s ${e}`)); }
      }
      const loops = sim.world.marbles.map((m) => m.loops);
      console.log(`${id.padEnd(10)} Runden ${loops.join(',').padEnd(24)} längste Runde ${worstGap.toFixed(1)} s  ${errors.length ? 'FEHLER ' + errors.slice(0, 2).join(' | ') : 'ok'}  (${Date.now() - t0} ms)`);
    }
  } else if (cmd === 'check') {
    // Viele freie Rennen: Ende erreicht, 9 Aus, 3 im Finale, Podest, keine Fehler; Zeiten je Bahn und Auffälliges
    const runs = Number(arg('runs', 100)), seed0 = Number(arg('seed', 1)), t0 = Date.now();
    const per = new Map(), lengths = [], problems = [], finalGaps = [];
    let falls = 0, stuck = 0, timeUps = 0, nudges = 0, safe = 0;
    for (let k = 0; k < runs; k++) {
      const seed = seed0 + k, sim = makeSim(EBS, { seed, aspect, params: { mode: 'race', short: arg('short', 'A') } });
      let stage = -1, stageT0 = 0; const errs = [];
      while (sim.phase !== 'end' && sim.t < 1500) {
        sim.stepOnce();
        if (sim.stageNo !== stage) { stage = sim.stageNo; stageT0 = sim.t; }
        if (sim.phase === 'result' && sim.phaseT < sim.dt * 1.5) {
          const s = per.get(stage) || per.set(stage, { title: sim.spec.title, times: [], outs: 0, falls: 0, stuck: 0, timeUp: 0 }).get(stage);
          s.times.push(sim.world.t); s.stuck += sim.stats.stuck; s.timeUp += sim.stats.timeUp;
          stuck += sim.stats.stuck; timeUps += sim.stats.timeUp; safe += sim.safe ? 1 : 0;
          nudges += sim.runners.reduce((a, u) => a + u.nudges, 0);
          for (const u of sim.runners) if (u.out) { s.outs++; if (u.fell) { s.falls++; falls++; } }
          if (sim.final) {
            const fin = sim.runners.filter((u) => u.place < 500).sort((a, b) => a.place - b.place);
            if (fin.length > 1) finalGaps.push(fin[1].finishT - fin[0].finishT);
            if (!fin.length) problems.push(`Seed ${seed}: niemand kommt im Finale ins Ziel`);
          }
          if (sim.stats.stuck || sim.stats.timeUp) problems.push(`Seed ${seed}: Bahn ${stage + 1} ${sim.spec.title} hängt (${sim.stats.stuck} festgefahren, ${sim.stats.timeUp} Zeitlimit)`);
        }
        if (sim.step % 300 === 0) { const c = sim.checkInvariants(); if (!c.ok) errs.push(`${sim.t.toFixed(1)}s ${c.errors[0]}`); }
      }
      const outs = sim.outList.length, alive = sim.roster.filter((m) => m.alive).length;
      if (sim.phase !== 'end') problems.push(`Seed ${seed}: kein Ende nach ${sim.t.toFixed(0)} s`);
      if (outs !== 9 || alive !== 3) problems.push(`Seed ${seed}: ${outs} Aus, ${alive} im Finale`);
      if (!sim.podium || sim.podium.length !== 3) problems.push(`Seed ${seed}: kein Podest`);
      if (errs.length) problems.push(`Seed ${seed}: ${errs.slice(0, 2).join(' | ')}`);
      lengths.push(sim.t);
    }
    const st = (a) => { const s = a.slice().sort((x, y) => x - y); return `${s[0].toFixed(1)} / ${s[Math.floor(s.length / 2)].toFixed(1)} / ${s[s.length - 1].toFixed(1)}`; };
    console.log(`${runs} Rennen ab Seed ${seed0} in ${((Date.now() - t0) / 1000).toFixed(0)} s · Video min/Median/max ${st(lengths)} s`);
    for (const [i, s] of [...per.entries()].sort((a, b) => a[0] - b[0])) {
      console.log(`  ${String(i + 1).padStart(2)} ${s.title.padEnd(18)} Bahnzeit ${st(s.times)} s  Aus ${s.outs} (davon gestürzt ${s.falls})  festgefahren ${s.stuck}  Zeitlimit ${s.timeUp}`);
    }
    const g = finalGaps.slice().sort((a, b) => a - b);
    console.log(`  Stürze ${falls} · festgefahren ${stuck} · Zeitlimit ${timeUps} · Stöße ${nudges} · sichere Bahnen ${safe} · Finale 1-2 Median ${g.length ? g[Math.floor(g.length / 2)].toFixed(2) : '-'} s, unter 1 s: ${g.filter((x) => x < 1).length}/${g.length}`);
    console.log(problems.length ? `  Auffällig (${problems.length}):\n    ` + problems.slice(0, 40).join('\n    ') : '  Keine Auffälligkeiten.');
  } else if (cmd === 'level') {
    // Gesamtlevel (Teil 2): je Lauf Schleusen, Aus, Schnittkampf, Platz- und Führungswechsel, Kamera-Kennzahlen
    const runs = Number(arg('runs', 1)), seed0 = Number(arg('seed', 1)), sum = { stuck: 0, nudges: 0, errs: 0, close: [], gap: [], swaps: [], quiet: [], leadIn: [], outsIn: 0, outs: 0 };
    for (let k = 0; k < runs; k++) {
      const seed = seed0 + k, sim = makeSim(EBS, { seed, aspect, params: { mode: 'level', cam: arg('cam', 'ride') } }), t0 = Date.now();
      const errors = []; let prev = null, swaps = 0, lastSwap = -1, quiet = 0, closeT = -1;
      while (sim.phase !== 'end' && sim.t < 300) {
        sim.stepOnce();
        if (sim.phase === 'race' && sim.closeT < 0 && sim.step % 30 === 0) {
          // Platzwechsel: alle 0,5 s die Rangfolge vergleichen (Summe der Rangsprünge / 2 = Überholungen),
          // längste Zeit ohne jeden Wechsel
          const now = new Map(sim.order.map((rid, i) => [rid, i]));
          if (lastSwap < 0) lastSwap = sim.t;
          if (prev) {
            let s = 0; for (const [rid, i] of now) if (prev.has(rid)) s += Math.abs(prev.get(rid) - i);
            if (s > 0) { swaps += s / 2; quiet = Math.max(quiet, sim.t - lastSwap); lastSwap = sim.t; }
          }
          prev = now;
        }
        if (sim.closeT >= 0 && closeT < 0) closeT = sim.t;
        if (sim.step % 120 === 0) { const c = sim.checkInvariants(); if (!c.ok) errors.push(...c.errors.map((e) => `${sim.t.toFixed(1)}s ${e}`)); }
      }
      const raceT = closeT - sim.R.ready, outs = sim.outList.map((i) => sim.roster[i].name + (sim.roster[i].how !== 'late' ? `(${sim.roster[i].how})` : ''));
      const nudges = sim.runners.reduce((s, u) => s + u.nudges, 0), cut = sim.cuts[0], cs = sim.camStats;
      // Weitere Schleusen und Finale (ab G3)
      if (sim.cuts.length > 1) sum.later = (sum.later || []).concat(sim.cuts.slice(1).map((c) => c.gap));
      const more = sim.cuts.slice(1).map((c) => `S${c.sec + 1} zu ${c.t.toFixed(1)} s (Schnitt ${c.gap.toFixed(2)} d)`).join(', ');
      const win = sim.winner >= 0 ? `Sieger ${sim.roster[sim.winner].name} bei ${sim.winnerT.toFixed(1)} s, Abstand ${sim.finalGap >= 0 ? sim.finalGap.toFixed(2) + ' s' : '-'}` : 'kein Sieger';
      if (sim.winner >= 0) { (sum.win = sum.win || []).push(sim.winnerT); if (sim.finalGap >= 0) (sum.fgap = sum.fgap || []).push(sim.finalGap); }
      console.log(`Seed ${seed}: Schleuse zu bei ${closeT.toFixed(1)} s${more ? ', ' + more : ''}, ${win}, Ende ${sim.t.toFixed(1)} s, ${Date.now() - t0} ms · Aus ${outs.join(',')} · Schnitt ${cut ? cut.gap.toFixed(2) + ' d' : '-'} · ` +
        `Platzwechsel ${swaps} (${(swaps / Math.max(1, raceT) * 10).toFixed(0)} je 10 s, längste Ruhe ${quiet.toFixed(1)} s) · Führungswechsel ${sim.leadChanges} · Stöße ${nudges} · festgefahren ${sim.stats.stuck} · Zeitlupe ${sim.stats.slowmo} · ` +
        `Führende im Bild ${(100 * cs.leaderIn / Math.max(1, cs.frames)).toFixed(0)} % · Aus im Bild ${cs.outsIn}/${cs.outs}${errors.length ? '  FEHLER: ' + errors.slice(0, 3).join(' | ') : ''}`);
      sum.stuck += sim.stats.stuck; sum.nudges += nudges; sum.errs += errors.length; sum.close.push(closeT); if (cut) sum.gap.push(cut.gap);
      sum.swaps.push(swaps / Math.max(1, raceT) * 10); sum.quiet.push(quiet); sum.leadIn.push(cs.leaderIn / Math.max(1, cs.frames)); sum.outs += cs.outs; sum.outsIn += cs.outsIn;
    }
    if (runs > 1) {
      const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
      console.log(`${runs} Läufe: Schleuse zu Median ${med(sum.close).toFixed(1)} s · Schnitt Median ${med(sum.gap).toFixed(2)} d, unter 1 d: ${sum.gap.filter((g) => g < 1).length}/${sum.gap.length} · ` +
        `Platzwechsel je 10 s Median ${med(sum.swaps).toFixed(0)} · längste Ruhe max ${Math.max(...sum.quiet).toFixed(1)} s · Führende im Bild Median ${(100 * med(sum.leadIn)).toFixed(0)} % · ` +
        `Aus im Bild ${sum.outsIn}/${sum.outs} · Stöße ${sum.nudges} · festgefahren ${sum.stuck} · Fehler ${sum.errs}`);
      if (sum.win) console.log(`  Sieg (Median) ${med(sum.win).toFixed(1)} s, längster ${Math.max(...sum.win).toFixed(1)} s · Abstand 1–2 Median ${med(sum.fgap || []).toFixed(2)} s, unter 0,3 s: ${(sum.fgap || []).filter((g) => g < 0.3).length}/${sum.win.length}` +
        (sum.later ? ` · spätere Schleusen: Schnitt Median ${med(sum.later).toFixed(2)} d, unter 1 d: ${sum.later.filter((g) => g < 1).length}/${sum.later.length}` : ''));
    }
  } else if (cmd === 'stage' || cmd === 'race') {
    const runs = Number(arg('runs', 1)), seed0 = Number(arg('seed', 1));
    for (let k = 0; k < runs; k++) {
      const seed = seed0 + k, params = cmd === 'stage' ? { mode: 'stage', stage: Number(arg('stage', 0)), field: Number(arg('field', 0)) || undefined, short: arg('short', 'A') } : { mode: 'race', short: arg('short', 'A') };
      const sim = makeSim(EBS, { seed, aspect, params }), t0 = Date.now(), log = [];
      let stage = -1, stageT0 = 0, errors = [];
      while (sim.phase !== 'end' && sim.t < 1200) {
        sim.stepOnce();
        if (sim.stageNo !== stage) { stage = sim.stageNo; stageT0 = sim.t; }
        if (sim.phase === 'result' && sim.phaseT < sim.dt * 1.5) {
          const rs = sim.runners, fin = rs.filter((u) => u.finished && !u.out).sort((a, b) => a.place - b.place);
          const outs = rs.filter((u) => u.out).map((u) => sim.roster[u.rid].name + (u.fell ? '(fell)' : ''));
          const gap = fin.length > 1 ? (fin[1].finishT - fin[0].finishT).toFixed(2) : '-';
          const nudges = rs.reduce((s, u) => s + u.nudges, 0);
          log.push(`  ${String(stage + 1).padStart(2)} ${sim.spec.title.padEnd(18)} ${(sim.t - stageT0).toFixed(1).padStart(5)} s  rt ${sim.world.t.toFixed(1).padStart(5)}  out ${outs.join(',').padEnd(18)} 1-2 ${gap}  Führ.wechsel ${sim.leadChanges}  Stöße ${nudges}  Zeitlupe ${sim.stats.slowmo}`);
        }
        if (sim.step % 120 === 0) { const c = sim.checkInvariants(); if (!c.ok) errors.push(...c.errors.map((e) => `${sim.t.toFixed(1)}s ${e}`)); }
      }
      console.log(`Seed ${seed}: ${sim.t.toFixed(1)} s Video, Phase ${sim.phase}, ${Date.now() - t0} ms${errors.length ? '  FEHLER: ' + errors.slice(0, 3).join(' | ') : ''}`);
      for (const l of log) console.log(l);
      if (sim.podium) console.log('  Podest: ' + sim.podium.map((i) => sim.roster[i].name).join(', '));
    }
  }
}
