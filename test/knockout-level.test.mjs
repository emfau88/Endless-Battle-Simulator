// Marble Knockout · Gesamtlevel (R43 Teil 2, ab Paket G1): Level-Bau, Schleuse mit Quote, Ziel und Sieger, Kamera
// und Wiederholbarkeit.
// Plan: docs/MARBLE_KNOCKOUT_GESAMTLEVEL_PLAN_2026-11-25.md, Abschnitte 4 bis 6. Läuft ohne Browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { FILES } from '../scripts/knockout-lab.mjs';

// Ein Zeichenkontext, der alles annimmt und nichts tut: Damit läuft der Painter in Node.
const stub = () => new Proxy(function () {}, {
  get: (_t, k) => (k === 'width' ? 10 : k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : stub()),
  set: () => true, apply: () => stub(),
});
const canvas = () => ({ width: 1, height: 1, getContext: () => stub() });

function load() {
  const context = vm.createContext({ console, document: { createElement: canvas } }); context.window = context;
  const root = new URL('../', import.meta.url);
  for (const p of [...FILES, 'src/canvas-scene.js', 'src/scenarios/knockout/art.js', 'src/scenarios/knockout/renderer.js', 'src/scenarios/knockout.js', 'src/production-presets.js']) {
    vm.runInContext(readFileSync(new URL(p, root), 'utf8'), context, { filename: p });
  }
  return context.EBS;
}
const EBS = load(), sc = EBS.getScenario('knockout'), CAM = EBS.KnockoutCamera;
const PORT = { w: 1080, h: 1920 }, LAND = { w: 1920, h: 1080 };
const create = (seed, params, world) => sc.create({ seed, params: sc.normalizeParams({ mode: 'level', ...params }), world, timeScale: 1 });

test('Einstellungen: Gesamtlevel mit Kamera-Fassung, Format wählt das Level', () => {
  assert.equal(sc.normalizeParams({ mode: 'level' }).cam, 'ride');
  assert.equal(sc.normalizeParams({ mode: 'level', cam: 'sections' }).cam, 'sections');
  assert.equal(sc.normalizeParams({ mode: 'level', cam: 'x' }).cam, 'ride');
  assert.equal(sc.normalizeParams({ mode: 'race', cam: 'sections' }).cam, undefined, 'Kamera-Schalter nur im Gesamtlevel');
  const t = create(1, {}, PORT), g = create(1, {}, LAND);
  assert.deepEqual([t.mode, t.level.id, t.roster.length, t.cam.mode], ['level', 'tower', 16, 'ride']);
  assert.deepEqual([g.mode, g.level.id, g.roster.length], ['level', 'gauntlet', 20]);
  // Short hat nur die Fahrt; „Abschnitte“ gilt im Querformat
  assert.equal(create(1, { cam: 'sections' }, PORT).cam.mode, 'ride');
  assert.equal(create(1, { cam: 'sections' }, LAND).cam.mode, 'sections');
});

test('Level-Bau: Abschnitte schließen an, Ideallinie steigt, jede Schleuse hat Platz für ihre Quote', () => {
  for (const world of [PORT, LAND]) {
    const s = create(3, {}, world), secs = s.sections;
    assert.ok(secs.length >= 2);
    for (let i = 0; i < secs.length; i++) {
      const sec = secs[i];
      assert.ok(sec.p1 > sec.p0, `${s.level.id} ${sec.id}: Ideallinie`);
      if (i > 0) assert.ok(sec.p0 >= secs[i - 1].p1 - 1e-6, 'Fortschritt fällt nicht zurück');
      if (sec.fin) {
        // Finale: Ziellinie statt Schleuse, nur als letzter Abschnitt
        assert.equal(i, secs.length - 1, `${s.level.id}: Finale ist der letzte Abschnitt`);
        assert.equal(sec.sch, null);
        assert.equal(sec.keep, 1);
      } else if (!sec.placeholder) {
        assert.ok(sec.els[1] > sec.els[0], `${s.level.id} ${sec.id}: Bausteine`);
        assert.ok(sec.sch, `${sec.id}: Schleuse`);
        assert.equal(sec.sch.lamps.length, sec.keep);
        assert.ok(sec.sch.sense.ay > sec.sch.mouthY, 'Lichtschranke unter der Öffnung');
      }
    }
    // Alles liegt innerhalb der Weltgrenzen
    const b = s.bounds;
    for (const p of s.lv.path.pts) assert.ok(p[0] >= b.x0 && p[0] <= b.x1 && p[1] >= b.y0 && p[1] <= b.y1, `Ideallinie ${p}`);
  }
});

/** Lauf bis zum Ende mit Prüfung von Ablauf und Kamera in jedem Schritt. */
function run(seed, params, world) {
  const s = create(seed, params, world), cam = s.cam, o = cam.o, dt = s.dt;
  const first = s.sections[0], n = s.roster.length, keep = Math.min(first.keep, n);
  let closedAt = -1, releasedAt = -1, alive0 = -1, px = cam.x, py = cam.y, pz = cam.z, maxV = 0;
  while (s.phase !== 'end' && s.t < 300) {
    s.stepOnce();
    // Einstiegsflug (Langvideo): eigene Bahn, eigener Test; hier nur: Bild in der Welt
    if (s.phase === 'intro') {
      const v = CAM.view(cam), b = s.bounds;
      assert.ok(v.x0 >= b.x0 - 1e-6 && v.x1 <= b.x1 + 1e-6 && v.y0 >= b.y0 - 1e-6 && v.y1 <= b.y1 + 1e-6, 'Flug außerhalb der Welt');
      px = cam.x; py = cam.y; pz = cam.z;
      continue;
    }
    // Kamera: Zoom im Rahmen und langsam, Tempo begrenzt, Bild nie außerhalb der Welt
    assert.ok(cam.z >= o.zmin - 1e-9 && cam.z <= o.zmax + 1e-9, `Zoom ${cam.z}`);
    assert.ok(Math.abs(cam.z - pz) <= o.zrate * dt + 1e-9, 'Zoom zu schnell');
    // erlaubter Weg: Höchsttempo plus die Verschiebung, die eine Zoomänderung an der Klemme bewirkt
    const shiftX = Math.abs(cam.W / (2 * cam.z) - cam.W / (2 * pz)), shiftY = Math.abs(cam.H / (2 * cam.z) - cam.H / (2 * pz));
    const vx = Math.abs(cam.x - px), vy = Math.abs(cam.y - py);
    assert.ok(vx <= o.vmax[0] * cam.W / Math.min(cam.z, pz) * dt + shiftX + 1e-6, `Kamera x zu schnell bei ${s.t.toFixed(2)} s`);
    assert.ok(vy <= o.vmax[1] * cam.H / Math.min(cam.z, pz) * dt + shiftY + 1e-6, `Kamera y zu schnell bei ${s.t.toFixed(2)} s`);
    maxV = Math.max(maxV, vx / dt, vy / dt);
    const v = CAM.view(cam), b = s.bounds;
    if (b.x1 - b.x0 >= v.x1 - v.x0) assert.ok(v.x0 >= b.x0 - 1e-6 && v.x1 <= b.x1 + 1e-6, 'Bild links/rechts außerhalb');
    else assert.ok(Math.abs(cam.x - (b.x0 + b.x1) / 2) < 1e-6, 'schmale Welt: Kamera mittig');
    if (b.y1 - b.y0 >= v.y1 - v.y0) assert.ok(v.y0 >= b.y0 - 1e-6 && v.y1 <= b.y1 + 1e-6, 'Bild oben/unten außerhalb');
    px = cam.x; py = cam.y; pz = cam.z;
    if (s.secNo === 0 && s.closeT >= 0 && closedAt < 0) {
      closedAt = s.t;
      // Beim Schließen sind genau keep Murmeln im Becken, alle anderen sind raus
      assert.equal(s.placeCount, Math.min(keep, n - s.outHere));
      assert.equal(s.roster.filter((m) => m.alive).length, s.placeCount, 'nur die im Becken sind weiter');
      alive0 = s.placeCount;
    }
    if (releasedAt < 0 && s.secNo === 1) releasedAt = s.t;
    if (s.step % 120 === 0) { const c = s.checkInvariants(); assert.ok(c.ok, `${s.t.toFixed(1)} s: ${c.errors.join(', ')}`); }
  }
  return { s, closedAt, releasedAt, alive0, maxV };
}

for (const [name, world, params, seeds] of [['Turm (9:16)', PORT, {}, [1, 2]], ['Gauntlet Fahrt (16:9)', LAND, {}, [1]], ['Gauntlet Abschnitte (16:9)', LAND, { cam: 'sections' }, [1]],
  ['Trap Tower (9:16, Rush)', PORT, { level: 'rush' }, [1, 2]]]) {
  test(`Ablauf ${name}: Schleuse schließt bei voller Quote, gibt frei, Kamera zeigt jedes Aus`, () => {
    for (const seed of seeds) {
      const { s, closedAt, releasedAt, alive0 } = run(seed, params, world);
      const keep = s.sections[0].keep, locks = s.sections.filter((x) => x.sch), fin = s.sections.find((x) => x.fin);
      const left = locks[locks.length - 1].keep;                        // so viele kommen hinter der letzten Schleuse an
      assert.equal(s.phase, 'end', `Seed ${seed} endet`);
      assert.ok(closedAt > 0, 'Schleuse geschlossen');
      assert.ok(releasedAt >= closedAt + s.R.release - 1e-9, 'Freigabe nach der Pause');
      assert.equal(alive0, keep, `Seed ${seed}: TOP ${keep}`);
      assert.equal(s.roster.filter((m) => m.alive).length, left);
      assert.equal(s.outList.length, s.roster.length - left);
      assert.equal(s.stats.stuck, 0, 'niemand bleibt hängen');
      assert.equal(s.stats.timeUp, 0, 'kein Zeitlimit nötig');
      assert.equal(s.camStats.outsIn, s.camStats.outs, 'jedes Aus im Bild');
      assert.ok(s.camStats.leaderIn / s.camStats.frames > 0.9, `Spitze im Bild ${(100 * s.camStats.leaderIn / s.camStats.frames).toFixed(0)} %`);
      assert.ok(s.cuts.length >= 1 && s.cuts.length <= locks.length);
      if (fin) {
        assert.ok(s.winner >= 0 && s.roster[s.winner].alive, `Seed ${seed}: Sieger`);
        if (s.R.podium) {
          // Langvideo (ab G5): Podest mit den drei im Ziel, das Video endet nach dem Podest
          assert.equal(s.podium.length, Math.min(3, left), 'drei auf dem Podest');
          assert.equal(s.podium[0], s.winner);
          assert.ok(s.podiumT >= s.winnerT && Math.abs(s.t - (s.podiumT + s.R.podium)) < 2 * s.dt, 'Ende nach dem Podest');
          assert.equal(s.runners.reduce((a, u) => a + u.nudges, 0), 0, 'kein Anstoß');
        } else {
          // Short: Das Video endet kurz nach dem Sieg, höchstens 45 s
          assert.ok(Math.abs(s.t - (s.winnerT + s.R.endHold)) < 2 * s.dt, 'Ende nach dem Halt');
          assert.ok(s.t < 45, `Länge ${s.t.toFixed(1)} s`);
        }
      } else assert.ok(s.t < 24 * locks.length, `Länge bis zur letzten fertigen Schleuse ${s.t.toFixed(1)} s`);
    }
  });
}

test('Einstiegsflug (G5): Kamera fliegt vom Ziel zum Start, die Welt steht still; abschaltbar, nur im Querformat', () => {
  const s = create(2, {}, LAND), ref = create(2, { intro: 'off' }, LAND), fin = s.sections[s.sections.length - 1].fin;
  assert.deepEqual([s.phase, ref.phase, create(2, {}, PORT).phase], ['intro', 'ready', 'ready']);
  const v = CAM.view(s.cam);
  assert.ok(fin.ax > v.x0 && fin.ax < v.x1 && fin.ay > v.y0 && fin.ay < v.y1, 'Ziel im ersten Bild');
  let zMin = 1;
  while (s.phase === 'intro') {
    s.stepOnce(); zMin = Math.min(zMin, s.cam.z);
    if (s.phase === 'intro') assert.equal(s.world.t, 0, 'Welt steht während des Flugs');
  }
  assert.ok(Math.abs(s.t - s.R.intro) < 2 * s.dt, `Flug ${s.t.toFixed(2)} s`);
  assert.ok(zMin < 0.65, 'unterwegs herausgezoomt');
  // Danach steht die Kamera wie ohne Flug beim Start
  assert.ok(Math.abs(s.cam.x - ref.cam.x) < 1 && Math.abs(s.cam.y - ref.cam.y) < 1 && Math.abs(s.cam.z - ref.cam.z) < 1e-6, 'Übergang ohne Sprung');
  // Kapitel: Intro bei 0, Stage 1 nach dem Flug
  assert.deepEqual(JSON.parse(JSON.stringify(s.chapterLog.slice(0, 2))), [{ t: 0, title: 'Intro' }, { t: s.R.intro, title: 'Stage 1: The Drop' }]);
});

test('Vorlage „Short“ (seit G3): der Turm auf einem geprüften Seed mit Fotofinish, Datei gleich Oberfläche', () => {
  const p = JSON.parse(JSON.stringify(EBS.productionPreset('knockout', 'short')));
  assert.deepEqual(p, JSON.parse(readFileSync(new URL('../presets/production/knockout-short.json', import.meta.url), 'utf8')));
  assert.equal(p.params.mode, 'level');
  assert.ok(EBS.Knockout.TOWER_CAST.includes(p.seed));
  const s = create(p.seed, p.params, PORT);
  while (s.phase !== 'end' && s.t < 60) s.stepOnce();
  assert.ok(s.t <= 40, `Länge ${s.t.toFixed(1)} s`);
  assert.ok(s.finalGap >= 0 && s.finalGap < 0.3 && s.notes.some((n) => n.kind === 'photo'), `Fotofinish ${s.finalGap.toFixed(3)} s`);
  assert.equal(s.runners.reduce((a, u) => a + u.nudges, 0), 0, 'kein Anstoß');
});

test('Ein Rennen (G6): THE GAUNTLET mit dem empfohlenen Drehbuch, die Geschichte hält', () => {
  const cast = EBS.Knockout.GAUNTLET_CAST[0];
  const s = create(cast.seed, { cam: 'ride', intro: 'on', script: cast.script }, LAND), id = (name) => s.roster.findIndex((m) => m.name === name);
  while (s.phase !== 'end' && s.t < 400) s.stepOnce();
  assert.equal(s.phase, 'end');
  assert.equal(s.runners.reduce((a, u) => a + u.nudges, 0) + s.stats.stuck + s.stats.timeUp, 0, 'kein Anstoß, niemand sitzt fest');
  const fins = s.runners.filter((u) => u.finished && !u.out).sort((a, b) => a.place - b.place).map((u) => u.rid);
  assert.ok(fins.slice(0, 2).includes(id(cast.underdog)), `${cast.underdog} im Fotofinish`);
  const L = s.roster[id(cast.leader)];
  assert.deepEqual([s.sections[L.outStage].id, L.how], ['hammers', 'fell'], `${cast.leader} stürzt in der Hammergasse`);
  assert.ok(s.finalGap >= 0 && s.finalGap < 0.15, `Fotofinish ${s.finalGap.toFixed(3)} s`);
  assert.equal(s.podium.length, 3);
});

test('Zwei Rennen (G9): Einstellungen nur im Gesamtlevel, Serie nur im Querformat', () => {
  assert.equal(sc.normalizeParams({ mode: 'level' }).series, 'one');
  assert.equal(sc.normalizeParams({ mode: 'race', series: 'two' }).series, undefined, 'nur im Gesamtlevel');
  const p = sc.normalizeParams({ mode: 'level', series: 'two', seed2: 7, script2: [1, 2] });
  assert.deepEqual([p.series, p.seed2, [...p.script2]], ['two', 7, [1, 2]]);
  assert.equal(sc.normalizeParams({ mode: 'level', seed2: 7 }).seed2, undefined, 'Rennen 2 nur mit zwei Rennen');
  assert.equal(sc.normalizeParams({ mode: 'level', series: 'two', script2: [1, -2] }).script2, undefined);
  assert.equal(create(1, { series: 'two' }, LAND).series, true);
  assert.equal(create(1, { series: 'two' }, PORT).series, undefined, 'Short bleibt ein Rennen durch den Turm');
  assert.equal(create(1, { series: 'two' }, LAND).cur.seed, 1);
  assert.equal(create(1, { series: 'two' }, LAND).plan[1].seed, 2, 'ohne seed2 der nächste Seed');
});

test('Vorlage „Langvideo“ (seit G9): zwei Rennen mit Gesamtwertung, die Geschichte hält, Datei gleich Oberfläche', () => {
  const p = JSON.parse(JSON.stringify(EBS.productionPreset('knockout', 'long')));
  assert.deepEqual(p, JSON.parse(readFileSync(new URL('../presets/production/knockout-long.json', import.meta.url), 'utf8')));
  const cast = JSON.parse(JSON.stringify(EBS.Knockout.castSeries(p.seed)));
  assert.deepEqual([p.params.mode, p.params.series, p.seed, p.params.script, p.params.seed2, p.params.script2],
    ['level', 'two', cast.seed, cast.script, cast.seed2, cast.script2]);
  const s = create(p.seed, p.params, LAND), seen = [];
  let seq = 0;
  while (s.phase !== 'end' && s.t < 900) {
    s.stepOnce();
    for (; seq < s.eventSeq; seq++) seen.push(s.events[seq % s.events.length]);
  }
  assert.equal(s.phase, 'end');
  assert.ok(s.t > 360 && s.t < 480, `Länge ${s.t.toFixed(1)} s (6 bis 8 min)`);
  const names = s.runs[0].roster.map((m) => m.name), name = (rid) => names[rid];
  // Jedes Rennen ohne Anstoß, mit Fotofinish; alle 20 gewertet, je 101 Punkte
  for (const r of s.runs) {
    assert.equal(r.runners.reduce((a, u) => a + u.nudges, 0) + r.stats.stuck + r.stats.timeUp, 0, 'kein Anstoß');
    assert.ok(r.finalGap >= 0 && r.finalGap < 0.3, `Fotofinish ${r.finalGap.toFixed(3)} s`);
  }
  for (const o of s.results) assert.deepEqual(o.slice().sort((a, b) => a - b), names.map((_, i) => i));
  assert.equal(s.tables[1].reduce((a, r) => a + r.total, 0), 2 * 101);
  // Geschichte: BLACK gewinnt Rennen 1, scheidet in Rennen 2 im ersten Abschnitt aus; GREEN (Rennen 1: Zehnte)
  // gewinnt Rennen 2 im Fotofinish und damit die Gesamtwertung mit einem Punkt Vorsprung
  assert.deepEqual([name(s.runs[0].winner), name(s.runs[1].winner)], ['BLACK', 'GREEN']);
  assert.equal(s.runs[1].roster[names.indexOf('BLACK')].outStage, 0);
  const [a, b] = s.tables[1];
  assert.deepEqual([name(a.rid), a.total, name(b.rid), b.total], ['GREEN', 26, 'BLACK', 25]);
  assert.equal(s.snapshot().winner, 'GREEN');
  // Als Zweite in Rennen 2 wäre GREEN nicht Gesamtsiegerin: Das Fotofinish entscheidet die Wertung
  assert.ok(a.p[0] + EBS.KnockoutSeries.POINTS[1] < b.total);
  // Ereignisse fortlaufend in der Zeit des ganzen Videos; Kapitel ab 0:00, je mindestens 10 s
  assert.ok(seen.every((e, i) => i === 0 || (e.seq === seen[i - 1].seq + 1 && e.step >= seen[i - 1].step)));
  assert.ok(seen.some((e) => e.type === 'winner' && e.step > s.runs[0].t * 60 + 60), 'Ton beim Sieg in Rennen 2 und beim Gesamtsieg');
  const ch = sc.chapters(s);
  assert.equal(ch[0].timeSec, 0);
  assert.ok(ch.every((c, i) => i === 0 || c.timeSec - ch[i - 1].timeSec >= 10), 'Kapitel je mindestens 10 s');
  assert.ok(s.t - ch[ch.length - 1].timeSec >= 10);
  for (const t of ['Standings After Race 1', 'Race 2 · Winner', 'Final Standings']) assert.ok(ch.some((c) => c.title === t), t);
  // Zeichnen verändert den Zustand nicht (Painter der Serie mit leerem Zeichenkontext, auch im letzten Bild)
  const painter = new EBS.KnockoutRender.SeriesPainter(s, 1), h = s.stateHash();
  painter.paint(stub()); painter.paint(stub());
  assert.equal(s.stateHash(), h);
  painter.dispose();
});

test('Gleicher Seed ergibt denselben Lauf samt Kamera, anderer Seed einen anderen', () => {
  const go = (seed, world) => { const s = create(seed, {}, world); for (let i = 0; i < 60 * 12; i++) s.stepOnce(); return [s.stateHash(), s.placeCount, s.outList.join()]; };
  assert.deepEqual(go(5, PORT), go(5, PORT));
  assert.deepEqual(go(5, LAND), go(5, LAND));
  assert.notEqual(go(5, PORT)[0], go(6, PORT)[0]);
});

test('Sichern und Laden: Weiterrechnen ergibt denselben Hash wie am Stück, auch nach einem Sprung zurück', () => {
  for (const world of [PORT, LAND]) {
    const a = create(9, {}, world);
    while (a.t < 6) a.stepOnce();
    const snap = a.saveState(), mid = a.stateHash();
    while (a.t < 13) a.stepOnce();
    const end = [a.stateHash(), a.outList.join(), a.notes.length, a.secNo];
    // in eine neue Simulation laden
    const b = create(9, {}, world);
    b.loadState(snap);
    assert.equal(b.stateHash(), mid, 'gleicher Zustand nach dem Laden');
    while (b.t < 13) b.stepOnce();
    assert.deepEqual([b.stateHash(), b.outList.join(), b.notes.length, b.secNo], end);
    // in dieselbe (schon weitergelaufene) Simulation zurückladen
    a.loadState(snap);
    while (a.t < 13) a.stepOnce();
    assert.deepEqual([a.stateHash(), a.outList.join(), a.notes.length, a.secNo], end);
  }
});

test('Drehbuch: ein anderer Seed für einen späteren Abschnitt ändert nichts davor', () => {
  const s1 = create(4, { script: [0, 11] }, PORT), s2 = create(4, { script: [0, 99] }, PORT);
  for (let i = 0; i < 60 * 9; i++) { s1.stepOnce(); s2.stepOnce(); }
  assert.equal(s1.stateHash(), s2.stateHash());
  assert.notEqual(create(4, { script: [5] }, PORT).sections.length, 0);
});

test('Zeichnen verändert den Zustand nicht (LevelPainter mit leerem Zeichenkontext)', () => {
  for (const world of [PORT, LAND]) {
    const sim = create(4, {}, world), painter = new EBS.KnockoutRender.LevelPainter(sim, 1), g = stub();
    // bis ins Finale (Turm: Ziel, Sieger, PHOTO FINISH aus dem Zustand)
    const check = (t) => {
      const before = sim.stateHash(), seq = sim.eventSeq;
      painter.paint(g); painter.paint(g);
      assert.equal(sim.stateHash(), before, `bei ${t} s`);
      assert.equal(sim.eventSeq, seq);
    };
    for (const t of [0.5, 5, 11, 14, 30, 39]) {
      while (sim.t < t && sim.phase !== 'end') sim.stepOnce();
      check(t);
    }
    // Gauntlet (ab G5): Starttor im Finale (FINAL SPRINT), Podest, letztes Bild
    if (world === LAND) {
      for (const at of [() => sim.holdAllT >= 0, () => sim.podiumOn, () => sim.phase === 'end']) {
        while (!at() && sim.phase !== 'end') sim.stepOnce();
        check(sim.t.toFixed(1));
      }
      assert.ok(sim.podiumOn && sim.notes.some((n) => n.kind === 'sprint'), 'Tor und Podest erreicht');
    }
    if (painter.dispose) painter.dispose();
  }
});

// ---------------------------------------------------------------- Rush (R44)
test('Rush (R44): Schalter „level“ nur im Gesamtlevel; ohne ihn und mit „standard“ bitgleich, quer bis R3 THE GAUNTLET', () => {
  assert.equal(sc.normalizeParams({ mode: 'level' }).level, 'standard');
  assert.equal(sc.normalizeParams({ mode: 'level', level: 'rush' }).level, 'rush');
  assert.equal(sc.normalizeParams({ mode: 'level', level: 'x' }).level, 'standard');
  assert.equal(sc.normalizeParams({ mode: 'race', level: 'rush' }).level, undefined, 'nur im Gesamtlevel');
  const go = (params, world) => { const s = new EBS.KnockoutLevelSim.KnockoutLevelSimulation({ seed: 7, params: { mode: 'level', ...params }, world }); for (let i = 0; i < 60 * 8; i++) s.stepOnce(); return [s.level.id, s.stateHash()]; };
  assert.deepEqual(go({ level: 'standard' }, PORT), go({}, PORT));
  assert.deepEqual(go({ level: 'standard' }, LAND), go({}, LAND));
  assert.deepEqual(go({ level: 'rush' }, LAND), go({}, LAND), 'THE AVALANCHE fehlt noch: Rush quer zeigt THE GAUNTLET');
  assert.equal(go({ level: 'rush' }, PORT)[0], 'trap');
});

test('TRAP TOWER (R44): 24 Farben, Käfig mit zwei Reihen ohne Überlappung, Falltür-Boden und Schleuse TOP 14', () => {
  const s = create(1, { level: 'rush' }, PORT), L = EBS.KnockoutLevels;
  assert.deepEqual([s.level.id, s.level.title, s.roster.length], ['trap', 'TRAP TOWER', 24]);
  assert.equal(new Set(s.roster.map((m) => m.name)).size, 24);
  assert.equal(new Set(s.roster.map((m) => m.color)).size, 24, 'jede Farbe einmal');
  assert.ok(s.roster.every((m) => /^#[0-9a-f]{6}$/.test(m.color)));
  assert.equal(L.FIELD28.length, 28); assert.equal(new Set(L.FIELD28).size, 28);
  assert.ok(L.FIELD28.every((n) => L.COLORS[n]), 'alle 28 Farben bekannt');
  // Startplätze: zwei Reihen im Käfig (78 bis 1002), keine zwei Murmeln überlappen
  const slots = s.stage.start.slots, r = s.r;
  assert.equal(slots.length, 24);
  assert.equal(new Set(slots.map((p) => p[1].toFixed(1))).size, 2, 'zwei Reihen');
  for (const [x] of slots) assert.ok(x - r >= 78 && x + r <= 1002, `Platz ${x} im Käfig`);
  for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) {
    assert.ok(Math.hypot(slots[i][0] - slots[j][0], slots[i][1] - slots[j][1]) >= 2 * r, `Plätze ${i} und ${j} überlappen`);
  }
  // Abschnitt 1: Gefahr mit Falltür-Boden aus sieben Platten, Schleuse TOP 14; danach der Platzhalter
  const [a, b] = s.sections, els = s.stage.elements.slice(a.els[0], a.els[1]);
  assert.deepEqual([a.id, a.hazard, a.keep, a.sch.lamps.length, b.placeholder], ['trapdoors', true, 14, 14, true]);
  assert.equal(els.filter((e) => e.type === 'trapdoors').map((e) => e.n).join(), '7');
  // Ohne Rush bleibt das Startregal der alten Level wie vorher: eine Reihe
  assert.equal(new Set(create(1, {}, PORT).stage.start.slots.map((p) => p[1])).size, 1);
});

test('TRAP TOWER (R44): Stürze auf dem Falltür-Boden, nach fünf schließen die Fallen, kein Anstoß', () => {
  for (const seed of [1, 2, 3]) {
    const s = create(seed, { level: 'rush' }, PORT);
    while (s.phase !== 'end' && s.t < 40) s.stepOnce();
    const falls = s.roster.filter((m) => m.how === 'fell').length;
    assert.equal(s.phase, 'end');
    assert.ok(falls >= 5 && falls <= 10, `Seed ${seed}: ${falls} Stürze`);
    assert.ok(s.notes.some((n) => n.kind === 'traps'), 'TRAPS CLOSED');
    // Gefängnis: Jede Gestürzte liegt am Ende sichtbar darin (aktiv, zwischen Boden und Grund), sonst niemand
    const j = s.stage.decor.find((q) => q.kind === 'jail');
    for (const u of s.runners) {
      const fell = s.roster[u.rid].how === 'fell', m = u.pm;
      assert.equal(!!u.jailed, fell, `Seed ${seed}: ${s.roster[u.rid].name} gefangen = gestürzt`);
      if (!fell) continue;
      assert.ok(m.active && m.x > j.x0 && m.x < j.x1 && m.y > Math.min(j.ya, j.yb) && m.y < Math.max(j.ja, j.jb), `Seed ${seed}: ${s.roster[u.rid].name} im Gefängnis (${m.x.toFixed(0)}, ${m.y.toFixed(0)})`);
    }
    assert.equal(s.runners.reduce((a, u) => a + u.nudges, 0) + s.stats.stuck + s.stats.timeUp, 0, 'kein Anstoß, niemand sitzt fest');
    assert.ok(s.sections[1].p0 > 0 && s.t < 16, `Länge ${s.t.toFixed(1)} s`);
    assert.ok(s.checkInvariants().ok);
  }
});

test('TRAP TOWER (R44): Zeichnen verändert den Zustand nicht', () => {
  const sim = create(2, { level: 'rush' }, PORT), painter = new EBS.KnockoutRender.LevelPainter(sim, 1), g = stub();
  for (const t of [0.2, 3.5, 5.5, 8, 11]) {
    while (sim.t < t && sim.phase !== 'end') sim.stepOnce();
    const before = sim.stateHash(), seq = sim.eventSeq;
    painter.paint(g); painter.paint(g);
    assert.equal(sim.stateHash(), before, `bei ${t} s`);
    assert.equal(sim.eventSeq, seq);
  }
  if (painter.dispose) painter.dispose();
});
