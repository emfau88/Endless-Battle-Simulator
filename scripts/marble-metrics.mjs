#!/usr/bin/env node
// Messwerte der Kugelfabrik für Vorher/Nachher-Vergleiche (Trichterstau, Durchsatz, Verweildauer).
//   node scripts/marble-metrics.mjs [--seeds 42,1,2,3,4,5,6,7] [--minutes 10] [--tempo 1]
// Gibt eine Markdown-Tabelle aus. Läuft ohne Rendering; je Lauf 10 Minuten Simulationszeit in wenigen Sekunden.
import { pathToFileURL } from 'node:url';
import { INDEX, launchBrowser } from '../lib/browser.mjs';

const arg = (name, def) => { const i = process.argv.indexOf('--' + name); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : def; };
const seeds = arg('seeds', '42,1,2,3,4,5,6,7').split(',').map(Number), minutes = Number(arg('minutes', 10)), tempo = Number(arg('tempo', 1));

const browser = await launchBrowser({ gpu: false });
try {
  const page = await browser.newPage();
  const rows = [], sum = {};
  for (const aspect of ['16:9', '9:16']) for (const seed of seeds) {
    await page.goto(pathToFileURL(INDEX).href + `?scenario=marble&aspect=${aspect}&seed=${seed}&tempo=${tempo}&paused=1`);
    await page.waitForFunction(() => window.EBS && EBS.app && EBS.app.sim);
    const r = await page.evaluate((simSec) => {
      const sim = EBS.app.sim;
      let maxAge = 0, pause = 0, last = 0, lastT = 0, i = 0;
      while (sim.t < simSec) {
        sim.stepOnce(); i++;
        if (sim.stats.cycles !== last) { last = sim.stats.cycles; pause = Math.max(pause, sim.t - lastT); lastT = sim.t; }
        if (i % 30 === 0) for (const b of sim.balls) if (b.state === 'hopper') maxAge = Math.max(maxAge, sim.clock - b.hopT);
      }
      const laps = sim.balls.map((b) => b.laps), c = sim.checkInvariants(), st = sim.stats;
      return { tempo: EBS.app.cfg.video.tempo, cycles: st.cycles, min: Math.min(...laps), max: Math.max(...laps), shakes: st.shakes, kicks: st.kicks, maxAge, pause: Math.max(pause, sim.t - lastT), jump: st.maxJump, ok: c.ok };
    }, minutes * 60);
    if (r.tempo !== tempo) throw new Error(`Tempo ${tempo} wurde nicht übernommen`);
    rows.push(`| ${aspect} | ${seed} | ${r.cycles} | ${r.min}–${r.max} | ${r.shakes} | ${r.kicks} | ${r.maxAge.toFixed(0)} | ${r.pause.toFixed(1)} | ${r.jump.toFixed(1)} | ${r.ok ? 'OK' : 'FEHLER'} |`);
    const s = (sum[aspect] = sum[aspect] || { cycles: [], shakes: [], kicks: [], age: [], pause: [], minLaps: [] });
    s.cycles.push(r.cycles); s.shakes.push(r.shakes); s.kicks.push(r.kicks); s.age.push(r.maxAge); s.pause.push(r.pause); s.minLaps.push(r.min);
  }
  const rng = (a, d = 0) => `${Math.min(...a).toFixed(d)}–${Math.max(...a).toFixed(d)}`, avg = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
  console.log(`Kugelfabrik: ${minutes} Minuten Simulationszeit je Lauf, Tempo ${tempo}, Seeds ${seeds.join(', ')}\n`);
  console.log('| Format | Seed | Umläufe | Umläufe je Kugel | Rütteln | Brückenbrecher | längste Verweildauer im Behälter (s) | längste Pause (s) | größter Schritt | Prüfung |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');
  console.log(rows.join('\n'));
  console.log('\n| Format | Umläufe | Rütteln (Spanne / Mittel) | Brückenbrecher (Spanne / Mittel) | Verweildauer (s) | längste Pause (s) | wenigste Umläufe einer Kugel |');
  console.log('|---|---|---|---|---|---|---|');
  for (const [a, s] of Object.entries(sum)) console.log(`| ${a} | ${rng(s.cycles)} | ${rng(s.shakes)} / ${avg(s.shakes)} | ${rng(s.kicks)} / ${avg(s.kicks)} | ${rng(s.age)} | ${rng(s.pause, 1)} | ${Math.min(...s.minLaps)} |`);
} finally { await browser.close(); }
