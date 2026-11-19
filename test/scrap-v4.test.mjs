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
