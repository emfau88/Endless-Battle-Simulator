// Scrap Wars · Dschungel-Karte „Jungle Ruins“ (R44/D1): eigene Arena der Taktik-Arena, immer mit den Raketen-Regeln.
// Die bisherigen Karten prüfen scripts/scrap-map-hashes.mjs, npm run golden und test/scrap-v4.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const context = vm.createContext({}); context.window = context;
for (const path of ['core.js', 'scenarios/scrap/simulation.js', 'scenarios/scrap/rules.js', 'scenarios/scrap/materials.js',
  'scenarios/scrap/tactics.js', 'scenarios/scrap/episode.js']) vm.runInContext(read('src/' + path), context, { filename: path });
const { EBS } = context, T = EBS.ScrapTactics;
const round = (seed, portrait = false) => new T.Round({ seed, rulesVersion: 'v4', arena: 'jungle', portrait, upgrades: [null, null, null, null] });
const gap = (a, b) => Math.hypot(Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w)), Math.max(0, a.y - (b.y + b.h), b.y - (a.y + a.h)));

test('Jungle Ruins: nur Taktik-Arena mit Raketen-Regeln; andere Arenen unverändert', () => {
  const n = p => JSON.parse(JSON.stringify(EBS.Scrap.normalizeParams(p)));
  for (const rulesVersion of ['classic', 'v2', 'v3', 'v4', undefined]) {
    const out = n({ arena: 'jungle', rulesVersion });
    assert.deepEqual([out.arena, out.rulesVersion, out.items], ['jungle', 'v4', 'rockets'], String(rulesVersion));
  }
  assert.equal(n({ arena: 'jungle', layout: 'short', rulesVersion: 'v4' }).layout, undefined, 'kein Short auf der Dschungel-Karte');
  assert.deepEqual(n({ arena: 'sunshine' }), { rulesVersion: 'v3', episodeMode: 'endless', arena: 'sunshine', workshop: false, repeatRounds: true, endPauseSec: 3 });
  assert.equal(n({ arena: 'sunshine', rulesVersion: 'v4' }).items, undefined, 'Sunny Yard ohne Schalter weiter klassisch');
  assert.equal(EBS.ScrapRules.arenas.jungle.name, 'JUNGLE RUINS');
  assert.deepEqual({ ...T.arenaSize('jungle') }, { w: 1352, h: 702 });
  for (const arena of ['yard', 'foundry', 'crossroads', 'sunshine']) assert.deepEqual({ ...T.arenaSize(arena) }, { w: 1040, h: 540 });
});

test('Jungle Ruins: Karte 30 % größer, 28 Deckungen an beiden Achsen gespiegelt, Durchfahrten ab 96 AE, alles erreichbar', () => {
  for (const portrait of [false, true]) {
    const r = round(7, portrait), { w, h, edge } = r.bounds;
    assert.deepEqual([w, h, edge, r.jungleMap], [1352, 702, 18, true]);
    const count = m => r.blocks.filter(b => b.material === m).length;
    assert.deepEqual([r.blocks.length, count('wood'), count('stone'), count('concrete')], [28, 12, 8, 8]);
    const key = b => `${b.x},${b.y},${b.w},${b.h},${b.material}`, all = new Set(r.blocks.map(key));
    for (const b of r.blocks) {
      assert.ok(b.x >= edge && b.y >= edge && b.x + b.w <= w - edge && b.y + b.h <= h - edge, key(b));
      assert.ok(all.has(key({ ...b, x: w - b.x - b.w })) && all.has(key({ ...b, y: h - b.y - b.h })), `nicht gespiegelt: ${key(b)}`);
      // Zwischen zwei Deckungen und zur Wand: entweder berührt (eine Insel) oder mindestens 96 AE Platz
      for (const o of r.blocks) if (o !== b) { const d = gap(b, o); assert.ok(d === 0 || d >= 96 - 1e-9, `${key(b)} ↔ ${key(o)}: ${d.toFixed(1)}`); }
      for (const d of [b.x - edge, b.y - edge, w - edge - b.x - b.w, h - edge - b.y - b.h]) assert.ok(d === 0 || d >= 96 - 1e-9, `${key(b)} zur Wand ${d}`);
    }
    assert.deepEqual(JSON.parse(JSON.stringify(r.pads.map(p => [p.x, p.y, p.kind, p.readyIn, p.period]))), [[110, 351, 'rocket', 6, 9], [1242, 351, 'rocket', 7.5, 9], [676, 351, 'rocket', 11, 9]]);
    assert.equal(r.pickups.length, 0); assert.equal(r.crateFallback, false); assert.ok(r.checkInvariants().ok);
    // Von jeder Startkiste zu jeder Plattform und zu jeder anderen Kiste gibt es einen Weg
    const nav = r._nav(), cell = (x, y) => r._nearestFree(nav, x, y);
    const spots = r.robots.map(o => [o.x, o.y]);
    for (const [x, y] of spots) for (const [tx, ty] of [...r.pads.map(p => [p.x, p.y]), ...spots])
      assert.ok(Number.isFinite(r._search(nav, cell(x, y), cell(tx, ty)).dist), `kein Weg ${x},${y} → ${tx},${ty}`);
  }
});

test('Jungle Ruins: Runden enden mit Sieger, alle drei Plattformen liefern Raketen, keine Hänger, niemand unbewaffnet', () => {
  const used = new Set();
  for (const portrait of [false, true]) for (const seed of [1, 2, 3, 4]) {
    const r = round(seed, portrait);
    let still = 0, hang = 0, shots = 0;
    while (r.phase === 'running' && r.t < 120) {
      const loaded = r.pads.map(p => r._padLoaded(p));
      r.step(1 / 120);
      r.pads.forEach((p, i) => { if (loaded[i] && !r._padLoaded(p)) used.add(i); });
      for (const o of r.robots) assert.equal(!!o.weapon, o.alive);
      assert.ok(r.pickups.every(p => p.kind === 'rocket' && !p.empty));
      const living = r.robots.filter(o => o.alive), fired = r.stats.shots !== shots; shots = r.stats.shots;
      still = !fired && living.length > 1 && living.every(o => !o.caged && Math.hypot(o.vx, o.vy) < 8) ? still + 1 : 0;
      hang = Math.max(hang, still / 120);
    }
    assert.ok(r.winner !== null && r.stats.drops === 0 && r.checkInvariants().ok, `Seed ${seed}: ${JSON.stringify({ winner: r.winner, t: r.t })}`);
    assert.ok(r.t > 15 && r.t < 75, `Seed ${seed}: Runde ${r.t.toFixed(1)} s`);
    assert.ok(hang < 2, `Seed ${seed}: Hänger ${hang.toFixed(2)} s`);
  }
  assert.deepEqual([...used].sort(), [0, 1, 2], 'jede Plattform wurde mindestens einmal geleert');
});

test('Jungle Ruins: Bild füllt die Breite unter der Kopfleiste, hochkant gedreht; Episode wiederholbar', () => {
  const quer = EBS.Scrap.layout({ w: 1920, h: 1080 }, { rulesVersion: 'v4', arena: 'jungle' });
  assert.deepEqual([quer.arenaW, quer.arenaH, quer.kind, Math.round(quer.width)], [1352, 702, 'landscape', 1896]);
  const hoch = EBS.Scrap.layout({ w: 1080, h: 1920 }, { rulesVersion: 'v4', arena: 'jungle' });
  assert.deepEqual([hoch.arenaW, hoch.arenaH, hoch.kind], [702, 1352, 'portrait']);
  const sunny = EBS.Scrap.layout({ w: 1920, h: 1080 }, { rulesVersion: 'v4', arena: 'sunshine' });
  assert.deepEqual([sunny.arenaW, sunny.arenaH], [1040, 540]);
  const run = () => {
    const sim = new EBS.Scrap.Episode({ seed: 11, params: { arena: 'jungle', episodeMode: 'tournament' }, world: { w: 1920, h: 1080 }, view: { camera: false } });
    while (sim.step < 50 * 60) sim.stepOnce();
    const out = [sim.cfg.items, sim.roundSim.items === T.JUNGLE_ITEMS, sim.roundSim.pace === T.JUNGLE_FIGHT, sim.stateHash(), sim.roundNumber];
    sim.destroy(); return out;
  };
  const first = run();
  assert.deepEqual(first.slice(0, 3), ['rockets', true, true]);
  assert.deepEqual(run(), first);
});
