// Marble Knockout · Gesamtlevel (R43 Teil 2, Paket G1): Level-Bau, Schleuse mit Quote, Kamera und Wiederholbarkeit.
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
  for (const p of [...FILES, 'src/canvas-scene.js', 'src/scenarios/knockout/art.js', 'src/scenarios/knockout/renderer.js', 'src/scenarios/knockout.js']) {
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
      if (!sec.placeholder) {
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
  while (s.phase !== 'end' && s.t < 120) {
    s.stepOnce();
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

for (const [name, world, params, seeds] of [['Turm (9:16)', PORT, {}, [1, 2]], ['Gauntlet Fahrt (16:9)', LAND, {}, [1]], ['Gauntlet Abschnitte (16:9)', LAND, { cam: 'sections' }, [1]]]) {
  test(`Ablauf ${name}: Schleuse schließt bei voller Quote, gibt frei, Kamera zeigt jedes Aus`, () => {
    for (const seed of seeds) {
      const { s, closedAt, releasedAt, alive0 } = run(seed, params, world);
      const keep = s.sections[0].keep;
      assert.equal(s.phase, 'end', `Seed ${seed} endet`);
      assert.ok(closedAt > 0, 'Schleuse geschlossen');
      assert.ok(releasedAt >= closedAt + s.R.release - 1e-9, 'Freigabe nach der Pause');
      assert.equal(alive0, keep, `Seed ${seed}: TOP ${keep}`);
      assert.equal(s.roster.filter((m) => m.alive).length, keep);
      assert.equal(s.outList.length, s.roster.length - keep);
      assert.equal(s.stats.stuck, 0, 'niemand bleibt hängen');
      assert.equal(s.stats.timeUp, 0, 'kein Zeitlimit nötig');
      assert.equal(s.camStats.outsIn, s.camStats.outs, 'jedes Aus im Bild');
      assert.ok(s.camStats.leaderIn / s.camStats.frames > 0.9, `Spitze im Bild ${(100 * s.camStats.leaderIn / s.camStats.frames).toFixed(0)} %`);
      assert.ok(s.t < 40, `Länge erster Abschnitt ${s.t.toFixed(1)} s`);
      assert.equal(s.cuts.length, 1);
    }
  });
}

test('Gleicher Seed ergibt denselben Lauf samt Kamera, anderer Seed einen anderen', () => {
  const go = (seed, world) => { const s = create(seed, {}, world); for (let i = 0; i < 60 * 12; i++) s.stepOnce(); return [s.stateHash(), s.placeCount, s.outList.join()]; };
  assert.deepEqual(go(5, PORT), go(5, PORT));
  assert.deepEqual(go(5, LAND), go(5, LAND));
  assert.notEqual(go(5, PORT)[0], go(6, PORT)[0]);
});

test('Zeichnen verändert den Zustand nicht (LevelPainter mit leerem Zeichenkontext)', () => {
  for (const world of [PORT, LAND]) {
    const sim = create(4, {}, world), painter = new EBS.KnockoutRender.LevelPainter(sim, 1), g = stub();
    for (const t of [0.5, 5, 11, 14]) {
      while (sim.t < t && sim.phase !== 'end') sim.stepOnce();
      const before = sim.stateHash(), seq = sim.eventSeq;
      painter.paint(g); painter.paint(g);
      assert.equal(sim.stateHash(), before, `bei ${t} s`);
      assert.equal(sim.eventSeq, seq);
    }
    if (painter.dispose) painter.dispose();
  }
});
