// Scrap Wars · Taktik-Arena (Regelversion v4, R40): Kisten, Wegsuche, Wiederholbarkeit.
// classic, v2 und v3 prüfen test/scrap.test.mjs und scripts/scrap-map-hashes.mjs; die Seek-Bilder test/scrap-optics.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const context = vm.createContext({}); context.window = context;
for (const path of ['core.js', 'scenarios/scrap/simulation.js', 'scenarios/scrap/rules.js', 'scenarios/scrap/materials.js',
  'scenarios/scrap/tactics.js', 'scenarios/scrap/episode.js']) vm.runInContext(read('src/' + path), context, { filename: path });
const { EBS } = context, { Round, CRATE, PATH } = EBS.ScrapTactics;
const round = (seed, portrait = false) => new Round({ seed, rulesVersion: 'v4', arena: 'sunshine', portrait, upgrades: [null, null, null, null] });
const episode = (seed, portrait) => new EBS.Scrap.Episode({ seed, params: { rulesVersion: 'v4', arena: 'sunshine', repeatRounds: false },
  world: portrait ? { w: 1080, h: 1920 } : { w: 1920, h: 1080 }, view: { camera: false } });
const toBox = (x, y, b) => Math.hypot(x - Math.max(b.x, Math.min(x, b.x + b.w)), y - Math.max(b.y, Math.min(y, b.y + b.h)));

test('Scrap v4: Kisten zufällig, mit Abstand, fair und gestaffelt; eigener Zufallsstrom', () => {
  for (const portrait of [false, true]) {
    const layouts = new Set();
    for (let seed = 1; seed <= 20; seed++) {
      const r = round(seed, portrait), { w, h, edge } = r.bounds, pair = portrait ? CRATE.pairPortrait : CRATE.pair;
      assert.equal(r.rulesVersion, 'v4'); assert.equal(r.crates.length, 4); assert.equal(r.crateFallback, false, `Seed ${seed}`);
      const centres = r.crates.map(c => [c.x + c.w / 2, c.y + c.h / 2]);
      layouts.add(JSON.stringify(centres));
      centres.forEach(([x, y], i) => {
        assert.ok(x >= edge + CRATE.wall - 1e-9 && x <= w - edge - CRATE.wall + 1e-9 && y >= edge + CRATE.wall - 1e-9 && y <= h - edge - CRATE.wall + 1e-9);
        assert.ok(r.blocks.every(b => toBox(x, y, b) >= CRATE.cover), `Seed ${seed}: Kiste ${i} zu nah an Deckung`);
        assert.ok([...r.pickups, ...r.pads].every(p => Math.hypot(p.x - x, p.y - y) >= CRATE.supply), `Seed ${seed}: Kiste ${i} auf Nachschub`);
        centres.slice(i + 1).forEach(([px, py]) => assert.ok(Math.hypot(px - x, py - y) >= pair, `Seed ${seed}: Kisten zu dicht`));
        const robot = r.robots[i];
        assert.ok(robot.caged && robot.x === x && robot.y === y && robot.heading === robot.angle);
      });
      const times = r.crates.map(c => c.openAt).sort((a, b) => a - b);
      assert.ok(times[0] >= CRATE.open && times.at(-1) <= CRATE.open + CRATE.spread + 3 * CRATE.gap + 1e-9);
      times.slice(1).forEach((t, k) => assert.ok(t - times[k] >= CRATE.gap - 1e-4, `Seed ${seed}: Ausbrüche zu dicht`));
      // Aufstellung zieht keine Zahlen aus dem Kampf-Zufall und ist bei erneutem Aufruf gleich
      const rng = JSON.stringify(r.rng), crates = JSON.stringify(r.crates);
      r._placeCrates();
      assert.equal(JSON.stringify(r.rng), rng); assert.equal(JSON.stringify(r.crates), crates);
    }
    assert.ok(layouts.size >= 19, `${layouts.size} verschiedene Aufstellungen bei 20 Seeds`);
  }
});

test('Scrap v4: in der Kiste kein Schaden, keine Fahrt, keine Waffe; Ausbruch einzeln nach Plan', () => {
  const s = episode(7, false), r = s.roundSim, robot = r.robots[0], start = [robot.x, robot.y], hp = robot.hp;
  const weapon = JSON.stringify(robot.weapon), supplies = JSON.stringify(r.pickups);
  r._hurtRobot(robot, 50, 1, robot.x, robot.y);
  assert.equal(robot.hp, hp, 'eingeschlossen unverwundbar');
  const firstOpen = Math.min(...r.crates.map(c => c.openAt));
  while (r.t < firstOpen - .05) s.stepOnce();
  assert.ok(r.robots.every(x => x.caged));
  assert.equal(JSON.stringify(r.pickups.map(p => p.empty)), JSON.stringify(JSON.parse(supplies).map(p => p.empty)), 'keine Aufnahme aus der Kiste');
  assert.equal(s.events.filter(e => e.type === 'crate_land').length, 4);
  while (r.t < r.crates[0].openAt - .05) s.stepOnce();
  assert.deepEqual([robot.x, robot.y], start); assert.equal(JSON.stringify(robot.weapon), weapon); assert.ok(robot.caged);
  while (r.crates.some(c => !c.open)) s.stepOnce();
  const breaks = s.events.filter(e => e.type === 'crate_break');
  assert.equal(JSON.stringify(breaks.map(e => e.team).sort()), '[0,1,2,3]');
  breaks.forEach(e => assert.ok(Math.abs(e.roundTime - r.crates[e.team].openAt) < 1 / 60 + 1e-6, 'Ausbruch zur geplanten Zeit'));
  assert.ok(r.robots.every(x => !x.caged));
});

test('Scrap v4: A* liefert die kürzesten Rasterwege, Gleichstände fest, geglättete Wege frei von Hindernissen', () => {
  for (const portrait of [false, true]) {
    const r = round(11, portrait);
    for (const c of r.crates) { c.landed = true; c.open = true; } // Kisten offen: Hinderniswechsel erzwingt ein neues Raster
    for (const robot of r.robots) robot.caged = false;
    const nav = r._nav(), { cols, rows, free } = nav, size = PATH.cell;
    // Vergleich: einfache Dijkstra-Suche mit denselben Regeln (8 Nachbarn, Diagonale √2, keine Ecken schneiden)
    const dijkstra = start => {
      const dist = new Float64Array(cols * rows).fill(Infinity), done = new Uint8Array(cols * rows), open = [start];
      dist[start] = 0;
      while (open.length) {
        let k = 0; for (let i = 1; i < open.length; i++) if (dist[open[i]] < dist[open[k]]) k = i;
        const cell = open.splice(k, 1)[0]; if (done[cell]) continue; done[cell] = 1;
        const col = cell % cols, row = (cell - col) / cols;
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
          const c = col + dc, w = row + dr, next = w * cols + c;
          if (c < 0 || w < 0 || c >= cols || w >= rows || !free[next] || done[next]) continue;
          if (dc && dr && (!free[row * cols + c] || !free[w * cols + col])) continue;
          const d = dist[cell] + (dc && dr ? Math.SQRT2 : 1) * size;
          if (d < dist[next] - 1e-9) { dist[next] = d; open.push(next); }
        }
      }
      return dist;
    };
    const rng = new EBS.RNG(99), cells = []; let compared = 0, planned = 0;
    for (let i = 0; i < cols * rows; i++) if (free[i]) cells.push(i);
    for (let k = 0; k < 4; k++) {
      const a = cells[Math.floor(rng.next() * cells.length)], dist = dijkstra(a);
      for (let j = 0; j < 6; j++) {
        const b = cells[Math.floor(rng.next() * cells.length)];
        r.ticks++; const found = r._search(nav, a, b);
        if (!Number.isFinite(dist[b])) { assert.equal(found.cells, null); continue; }
        compared++;
        assert.ok(Math.abs(found.dist - dist[b]) < 1e-6, `${portrait ? 'hoch' : 'quer'} ${a}→${b}: ${found.dist} statt ${dist[b]}`);
        r.ticks++; assert.equal(JSON.stringify(r._search(nav, a, b).cells), JSON.stringify(found.cells), 'gleicher Weg bei Wiederholung');
        // Zellfolge zusammenhängend und frei
        found.cells.forEach((c, i) => {
          assert.equal(free[c], 1);
          if (i) { const p = found.cells[i - 1]; assert.ok(Math.abs(c % cols - p % cols) <= 1 && Math.abs(Math.floor(c / cols) - Math.floor(p / cols)) <= 1); }
        });
      }
    }
    // Geglätteter Weg eines Roboters: jeder Abschnitt mit Roboterbreite frei
    const robot = r.robots[0], blocks = r.blocks.filter(b => b.alive);
    for (let k = 0; k < 12; k++) {
      const from = cells[Math.floor(rng.next() * cells.length)], to = cells[Math.floor(rng.next() * cells.length)];
      r.ticks++; if (!r._search(nav, from, to).cells) continue; // getrennte Taschen der Karte
      [robot.x, robot.y] = r._center(nav, from); [robot.goalX, robot.goalY] = r._center(nav, to);
      r.ticks++; r._plan(robot, true); planned++;
      let [x, y] = [robot.x, robot.y];
      for (const [px, py] of robot.path) {
        for (let s = 0; s <= 20; s++) {
          const qx = x + (px - x) * s / 20, qy = y + (py - y) * s / 20;
          assert.ok(blocks.every(b => toBox(qx, qy, b) >= robot.r - 1e-6), `Weg schneidet Deckung bei ${qx.toFixed(1)}, ${qy.toFixed(1)}`);
        }
        [x, y] = [px, py];
      }
      assert.equal(JSON.stringify(robot.path.at(-1)), JSON.stringify([robot.goalX, robot.goalY]));
    }
    assert.ok(compared >= 20 && planned >= 8, `${compared} Suchen, ${planned} Wege geprüft`);
  }
});

test('Scrap v4: drei Seeds je Format gültig, mit K.o. und Sieger, Ereignisbeobachtung ändert nichts', () => {
  for (const portrait of [false, true]) for (const seed of [1, 2, 3]) {
    const runs = [episode(seed, portrait), episode(seed, portrait)];
    for (const s of runs) {
      let checked = 0;
      while (s.phase === 'running') {
        s.stepOnce();
        if (s.step % 30 === 0) { const inv = s.checkInvariants(); assert.ok(inv.ok, `Seed ${seed}: ${inv.errors?.join(', ')}`); checked++; }
      }
      assert.ok(checked > 20);
    }
    const [a, b] = runs, r = a.roundSim;
    assert.equal(a.stateHash(), b.stateHash(), `Seed ${seed} ${portrait ? 'hoch' : 'quer'} reproduzierbar`);
    assert.ok(a.events.some(e => e.type === 'ko'));
    assert.ok(r.winner !== null && r.t < 75, `Seed ${seed}: Runde ${r.t.toFixed(1)} s ohne Sieger`);
    // Gleiche Runde ohne Beobachtung: vollständiger Zustand gleich
    const raw = round(seed, portrait);
    for (let i = 0; i < a.simTicks; i++) raw.step(1 / 120);
    assert.equal(JSON.stringify(raw), JSON.stringify(r));
  }
});

test('Scrap v4 Short (S1, Simulation): eigene Karte nur hochkant, 2,5 s Abspann, Video endet von selbst', () => {
  const { normalizeParams, hasNaturalEnd, createExportPlan, SHORT_END_SEC } = EBS.Scrap;
  const short = { rulesVersion: 'v4', arena: 'sunshine', layout: 'short' };
  // Ohne Short fehlt der Schlüssel (gleiche Zustands-Hashes); auf anderen Regeln/Karten wird er verworfen
  assert.equal('layout' in normalizeParams({ rulesVersion: 'v4', arena: 'sunshine' }), false);
  assert.equal('layout' in normalizeParams({ ...short, rulesVersion: 'v3' }), false);
  assert.equal('layout' in normalizeParams({ ...short, arena: 'yard' }), false);
  const video = aspect => ({ aspect, fps: 30, tempo: 1 });
  assert.equal(hasNaturalEnd({ params: short, video: video('9:16') }), true);
  assert.equal(hasNaturalEnd({ params: short, video: video('16:9') }), false);
  assert.equal(hasNaturalEnd({ params: { ...short, rulesVersion: 'v3' }, video: video('9:16') }), false);
  const wide = new EBS.Scrap.Episode({ seed: 1, params: short, world: { w: 1920, h: 1080 }, view: { camera: false } });
  assert.equal(wide.short, false); assert.equal(wide.roundSim.shortMap, undefined);
  for (const seed of [1, 2, 3]) {
    const s = new EBS.Scrap.Episode({ seed, params: short, world: { w: 1080, h: 1920 }, view: { camera: false } }), r = s.roundSim;
    assert.equal(s.short, true); assert.equal(r.shortMap, true);
    assert.deepEqual([r.bounds.w, r.bounds.h], [700, 540]); assert.equal(r.crates.length, 4); assert.equal(r.crateFallback, false);
    while (s.phase === 'running') s.stepOnce();
    const end = s.step;
    assert.equal(s.phase, 'outro'); assert.ok(r.winner !== null, `Seed ${seed}: kein Sieger`);
    while (s.phase !== 'ended' && s.step < end + 400) s.stepOnce();
    assert.equal(s.phase, 'ended'); assert.equal(s.step - end, SHORT_END_SEC * 60);
    assert.ok(s.checkInvariants().ok); assert.equal(s.roundNumber, 1);
    // Exportplan rechnet dieselbe Länge vorab
    const plan = createExportPlan({ seed, params: short, video: video('9:16') }, { w: 1080, h: 1920 });
    let step; do step = plan.advance(); while (!step.done);
    assert.equal(step.durationSec, Math.ceil(s.step / 60 * 30) / 30);
  }
});

test('Scrap v4 Short (S2, Balance): Schaden ×2,5 bis zum ersten K.o., danach ×0,55; im Schlussduell nimmt der Schwächere 20 % weniger; ohne Short unverändert', () => {
  const { SHORT_FIGHT } = EBS.ScrapTactics;
  assert.deepEqual({ ...SHORT_FIGHT }, { opening: 2.5, damage: .55, underdog: .8, crateSpread: 1.2, coverSec: .5, coverMax: 2.5, coverPause: 6 });
  const make = short => {
    const r = new Round({ seed: 5, rulesVersion: 'v4', arena: 'sunshine', portrait: true, short, upgrades: [null, null, null, null] });
    for (const robot of r.robots) robot.caged = false;
    return r;
  };
  // auf 1e-9 gerundet: 0,55 und 0,8 sind keine glatten Binärzahlen
  const hit = (r, id, amount = 10) => { const hp = r.robots[id].hp; r._hurtRobot(r.robots[id], amount, (id + 1) % 4, 0, 0); return Number((hp - r.robots[id].hp).toFixed(9)); };
  for (const short of [false, true]) {
    const r = make(short), f = short ? SHORT_FIGHT : { opening: 1, damage: 1, underdog: 1 };
    const want = v => Number(v.toFixed(9));
    assert.equal(hit(r, 0), want(10 * f.opening), 'alle vier leben');
    r.robots[3].alive = false;
    assert.equal(hit(r, 0), want(10 * f.damage), 'nach dem ersten K.o.');
    r.robots[2].alive = false;
    // Schlussduell: Roboter 0 ist angeschlagen, Roboter 1 unverletzt
    assert.equal(hit(r, 0), want(10 * f.damage * f.underdog), 'der Schwächere');
    assert.equal(hit(r, 1), want(10 * f.damage), 'der Stärkere');
    r.robots[0].hp = r.robots[1].hp;
    assert.equal(hit(r, 0), want(10 * f.damage), 'Gleichstand: keine Schonung');
  }
  // Kisten brechen im Short dichter nacheinander auf
  for (let seed = 1; seed <= 20; seed++) {
    const times = make(true), last = Math.max(...new Round({ seed, rulesVersion: 'v4', arena: 'sunshine', portrait: true, short: true, upgrades: [null, null, null, null] }).crates.map(c => c.openAt));
    assert.ok(times && last <= CRATE.open + SHORT_FIGHT.crateSpread + 3 * CRATE.gap + 1e-9, `Seed ${seed}: letzter Ausbruch ${last}`);
  }
});

test('Scrap v4 Short (S2, Deckung): höchstens 0,5 s warten, kaum Hänger (alle stehen, niemand schießt); ohne Short bleiben 3 s', () => {
  const { SHORT_FIGHT, BEHAVIOUR } = EBS.ScrapTactics;
  assert.deepEqual([BEHAVIOUR.coverSec, BEHAVIOUR.coverMax, BEHAVIOUR.coverPause], [3, 6, 4]);
  let hangs = 0, covers = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const r = new Round({ seed, rulesVersion: 'v4', arena: 'sunshine', portrait: true, short: true, upgrades: [null, null, null, null] });
    let shots = 0, still = 0, longest = 0; const since = r.robots.map(() => null);
    while (r.phase === 'running' && r.t < 90) {
      r.step(1 / 120);
      const living = r.robots.filter(o => o.alive), fired = r.stats.shots !== shots; shots = r.stats.shots;
      still = !fired && living.length > 1 && living.every(o => !o.caged && Math.hypot(o.vx, o.vy) < 8) ? still + 1 : 0;
      longest = Math.max(longest, still / 120);
      // Kein Roboter bleibt länger als coverMax (plus eine Denkpause) am Stück im Modus Deckung
      for (const o of r.robots) {
        if (o.alive && o.mode === 'cover') { if (since[o.id] === null) { since[o.id] = r.t; covers++; } assert.ok(r.t - since[o.id] <= SHORT_FIGHT.coverMax + .7, `Seed ${seed}: Roboter ${o.id} ${(r.t - since[o.id]).toFixed(2)} s in Deckung`); }
        else since[o.id] = null;
      }
    }
    assert.ok(r.winner !== null, `Seed ${seed}: kein Sieger`);
    hangs += longest >= 1.5;
  }
  assert.ok(covers > 30, `Deckung wird weiter genutzt (${covers}-mal)`);
  assert.ok(hangs <= 3, `${hangs} von 30 Seeds mit einem Hänger ab 1,5 s`);
});

test('Scrap v4 Short (S2, Waffen): Die vier Waffen liegen wie ohne Short von Anfang an da, nichts fällt vom Himmel', () => {
  assert.equal(EBS.ScrapTactics.SUPPLY, undefined);
  for (const seed of [1, 2, 3, 84]) {
    const s = new EBS.Scrap.Episode({ seed, params: { rulesVersion: 'v4', arena: 'sunshine', layout: 'short' }, world: { w: 1080, h: 1920 }, view: { camera: false } });
    const r = s.roundSim;
    assert.equal(r.supply, undefined); assert.equal(r.pickups.length, 4, 'vier Waffen am Start');
    assert.equal(r.pickups.map(p => p.kind).sort().join(), 'blaster,blaster,rocket,rocket');
    assert.ok(r.pickups.every(p => p.age === 0 && p.sky === undefined && !p.empty));
    assert.equal(r.pads.map(pad => pad.readyIn).join(), '3,5', 'Stationen liefern wie ohne Short');
    assert.equal(r._weaponCount(), 8);
    let seq = 0;
    while (s.phase === 'running' && r.t < 8) {
      s.stepOnce();
      assert.ok(r.pickups.every(p => p.age >= 0 && p.sky === undefined), `Seed ${seed}: fallende Waffe`);
      for (const e of s.events) if (e.seq >= seq) { seq = e.seq + 1; assert.ok(!e.sky, `Seed ${seed}: Abwurf-Ereignis`); }
    }
    assert.ok(s.checkInvariants().ok);
  }
});

test('Scrap v4 Short (S2, Zeitlupe): vorab berechneter Tempoplan, letzter K.o. am geplanten Schritt, Szenenzeit stetig; ohne Short kein Plan', () => {
  const { SLOW, SHORT_END_SEC } = EBS.Scrap, params = { rulesVersion: 'v4', arena: 'sunshine', layout: 'short' };
  assert.deepEqual({ ...SLOW }, { tempo: .35, beforeSec: .3, afterSec: .2 });
  assert.equal(episode(1, true).slow, null); assert.equal(episode(1, false).slow, null);
  for (const seed of [1, 2, 3]) {
    const make = () => new EBS.Scrap.Episode({ seed, params, world: { w: 1080, h: 1920 }, view: { camera: false } });
    const s = make(), plan = { ...s.slow }, perStep = [];
    assert.deepEqual([plan.units, plan.startStep, plan.endStep, plan.endTick - plan.fromTick], [70, null, null, 13]);
    while (s.phase === 'running') { const before = s.simTicks; s.stepOnce(); perStep.push(s.simTicks - before); }
    const { startStep: start, endStep: end } = s.slow, last = s.events.filter(e => e.type === 'ko').at(-1);
    assert.equal(s.simTicks, plan.endTick, `Seed ${seed}: letzter K.o. am vorab berechneten Schritt`);
    assert.equal(end, s.step); assert.ok(last.step > end - 1 && last.step <= end);
    // Vor der Zeitlupe zwei Simulationsschritte je Videoschritt, darin höchstens einer; rund 0,3 s Videozeit
    assert.ok(perStep.slice(0, start).every(n => n === 2)); assert.ok(perStep.slice(start).every(n => n <= 1));
    assert.ok(end - start >= 17 && end - start <= 20, `Seed ${seed}: Zeitlupe ${end - start} Videoschritte`);
    // Szenenzeit: stetig; Tempo 0,35 von Beginn der Zeitlupe bis 0,2 s nach dem K.o., sonst 1
    const rate = v => (s.sceneTime(v + 1) - s.sceneTime(v)) * 60;
    for (const [v, want] of [[start - 5, 1], [start + 3, .35], [end + 5, .35], [end + SLOW.afterSec * 60 + 2, 1]]) assert.ok(Math.abs(rate(v) - want) < 1e-9, `Seed ${seed}: Tempo ${rate(v)} bei ${v}`);
    for (let v = start - 3; v < end + 20; v += .5) assert.ok(s.sceneTime(v + .5) > s.sceneTime(v) && s.sceneTime(v + .5) - s.sceneTime(v) < .5 / 60 + 1e-9);
    // Abspann, Wiederholbarkeit, Exportlänge mit Zeitlupe
    while (s.phase !== 'ended') s.stepOnce();
    assert.equal(s.step - end, SHORT_END_SEC * 60); assert.ok(s.checkInvariants().ok);
    const again = make(); while (again.phase !== 'ended') again.stepOnce();
    assert.equal(again.stateHash(), s.stateHash());
    const exportPlan = EBS.Scrap.createExportPlan({ seed, params, video: { aspect: '9:16', fps: 30, tempo: 1 } }, { w: 1080, h: 1920 });
    let step; do step = exportPlan.advance(); while (!step.done);
    assert.equal(step.durationSec, Math.ceil(s.step / 60 * 30) / 30);
  }
});
