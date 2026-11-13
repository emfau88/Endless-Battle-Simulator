import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const context = vm.createContext({}); context.window = context;
for (const path of ['core.js', 'canvas-scene.js', 'scenarios/scrap/simulation.js', 'scenarios/scrap/renderer.js', 'scenarios/scrap/rules.js', 'scenarios/scrap/episode.js', 'scenarios/scrap.js']) {
  vm.runInContext(read('src/' + path), context, { filename: path });
}
const { EBS } = context;
const make = (overrides = {}) => new EBS.Scrap.Episode({ seed: 42, params: {}, world: { w: 1080, h: 1920 }, ...overrides });
const advance = (s, seconds) => { for (let i = 0; i < Math.round(seconds * 60); i++) s.stepOnce(); };
const plain = o => JSON.parse(JSON.stringify(o));
const sha = data => createHash('sha256').update(data).digest('hex');

test('Scrap: Quelle und extrahierte Simulation/Renderer sind unverändert', () => {
  const source = readFileSync(new URL('../docs/reference/scrap-arena.source.html', import.meta.url));
  const manifest = JSON.parse(read('src/scenarios/scrap/SOURCE.json'));
  assert.equal(sha(source), manifest.sha256);
  const scripts = [...source.toString('utf8').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [i, name] of ['simulation', 'renderer'].entries()) {
    const normalize = s => s.replace(/\r\n/g, '\n').trim();
    const extracted = read(`src/scenarios/scrap/${name}.js`).split('\n').slice(1).join('\n');
    assert.equal(normalize(extracted), normalize(scripts[i][1]));
  }
});

test('Scrap: erste Runde entspricht drei Original-Seeds einschließlich vollständigem Zustand', () => {
  const fixture = JSON.parse(read('test/fixtures/scrap-prototype.json'));
  for (const { seed, checkpoints } of fixture.cases) {
    const s = make({ seed, params: { repeatRounds: false } });
    let previous = 0;
    for (const point of checkpoints) {
      advance(s, point.requestedSeconds - previous); previous = point.requestedSeconds;
      assert.equal(s.roundSim.stateHash(), point.stateHash, `Seed ${seed} / ${previous}s`);
      assert.equal(sha(JSON.stringify(s.roundSim)), point.completeStateSha256, `voller Zustand: ${seed} / ${previous}s`);
      assert.equal(s.checkInvariants().ok, true);
    }
  }
});

test('Scrap: semantische Ereignisse enthalten alle Schüsse, Aufnahmen, Abwürfe, KOs und zerstörten Deckungen', () => {
  const s = make({ params: { repeatRounds: false } }); advance(s, 90);
  const count = type => s.events.filter(e => e.type === type).length;
  assert.equal(count('blaster') + count('rocket'), s.roundSim.stats.shots);
  for (const [type, field] of [['pickup', 'pickups'], ['drop', 'drops'], ['break', 'destroyed']]) assert.equal(count(type), s.roundSim.stats[field]);
  assert.equal(count('ko'), s.roundSim.robots.filter(r => !r.alive).length);
  assert.equal(count('round_end'), 1); assert.equal(count('round_start'), 1);
  assert.ok(count('hit') > 10 && count('rocket') > 0 && count('blast') > 0);
  assert.equal(s.events.at(-1).seq, s.events.length - 1);
  assert.equal(s.roundSim.events.length, 10, 'UI-Meldungen bleiben unabhängig begrenzt');
});

test('Scrap: 30/60 fps liefern identische Zustände, Ereignisse und Folgerunden bei jedem Tempo', () => {
  for (const tempo of [1, .8, .64]) {
    const a = make({ timeScale: tempo }), b = make({ timeScale: tempo });
    for (let i = 0; i < 120 * 30; i++) { a.stepOnce(); a.stepOnce(); }
    advance(b, 120);
    assert.equal(a.stateHash(), b.stateHash()); assert.deepEqual(plain(a.events), plain(b.events));
    assert.ok(a.roundNumber >= 2);
    const end = a.events.find(e => e.type === 'round_end');
    const next = a.events.find(e => e.type === 'round_start' && e.round === 2);
    assert.ok(next.step - end.step >= 180 && next.step - end.step < 181);
    assert.equal(next.roundSeed, 1606261697, 'gesicherter Folgeseed der zweiten Runde');
    assert.ok(Math.abs(end.step / 60 - (6325 / 120) / tempo) < 1e-9);
  }
});

test('Scrap: Zeitlupe verändert nur die Zuordnung zur Videozeit, nicht die feste Physikfolge', () => {
  const fast = make(), slow = make({ timeScale: .64 });
  advance(fast, 16); advance(slow, 25);
  assert.equal(JSON.stringify(fast.roundSim), JSON.stringify(slow.roundSim));
  assert.equal(slow.simTicks, 16 * 120);
  const a = fast.events.filter(e => e.type !== 'round_start'), b = slow.events.filter(e => e.type !== 'round_start');
  assert.equal(a.length, b.length);
  a.forEach((event, i) => assert.ok(Math.abs(event.step / .64 - b[i].step) < 1e-9));
});

test('Scrap: Ergebnis bleibt ohne Wiederholung stehen; Pause verwendet Videozeit', () => {
  const s = make({ params: { repeatRounds: false } }); advance(s, 90);
  const result = JSON.stringify(s.roundSim), count = s.eventSeq;
  advance(s, 30);
  assert.equal(s.phase, 'ended'); assert.equal(s.roundNumber, 1);
  assert.equal(JSON.stringify(s.roundSim), result); assert.equal(s.eventSeq, count);
  const loop = make({ params: { endPauseSec: 5 }, timeScale: .64 });
  while (loop.phase === 'running') loop.stepOnce();
  const first = loop.roundSeed; advance(loop, 299 / 60); assert.equal(loop.roundSeed, first);
  loop.stepOnce(); assert.equal(loop.roundNumber, 2); assert.equal(loop.roundSim.t, 0);
});

test('Scrap: vollständiger Hash erfasst auch KI-/Zufallszustand und den Ereignisverlauf', () => {
  const s = make(); advance(s, 2);
  for (const change of [() => s.roundSim.robots[0].targetBias[1] += .01,
    () => s.roundSim.robots[0].cooldown += .01, () => s.roundSim.fxRng.s++, () => s.eventDigest++]) {
    const old = s.stateHash(); change(); assert.notEqual(s.stateHash(), old);
  }
  s.roundSim.robots[0].cooldown = NaN;
  assert.equal(s.checkInvariants().ok, false, 'nicht endlicher KI-Zustand darf nicht exportiert werden');
});

test('Scrap: 20 Minuten reine Simulation bleiben begrenzt, lückenlos abrufbar und reproduzierbar', () => {
  const a = make(), b = make(); let next = 0, digest = 0;
  for (let second = 0; second < 1200; second++) {
    advance(a, 1); advance(b, 1);
    const fresh = a.events.filter(e => e.seq >= next);
    for (const e of fresh) { assert.equal(e.seq, next++); digest = EBS.util.fnv1a(digest + '|' + JSON.stringify(e)); }
    if (second % 30 === 0) assert.equal(a.checkInvariants().ok, true, JSON.stringify(a.checkInvariants()));
  }
  assert.equal(a.stateHash(), b.stateHash()); assert.equal(a.eventDigest, digest);
  assert.ok(a.completedRounds >= 10); assert.ok(a.events.length <= EBS.Scrap.EVENT_LIMIT);
  assert.ok(a.events[0].seq > 0, 'Ringpuffer wurde tatsächlich durchlaufen');
  assert.equal(next, a.eventSeq);
});

test('Scrap: Parameter normalisieren und kollidieren nicht mit Video-/Tonwerten', () => {
  const cfg = EBS.normalizeConfig({ scenario: 'scrap', repeatRounds: 'false', endPauseSec: 7,
    video: { tempo: .8, volume: { rocket: 130, pickup: 65 } }, view: { camera: false, hud: true } });
  assert.equal(cfg.params.repeatRounds, false); assert.equal(cfg.params.endPauseSec, 7);
  assert.equal(cfg.video.volume.rocket, 130);
  assert.deepEqual(plain(EBS.normalizeConfig(plain(cfg))), plain(cfg));
  assert.deepEqual(plain(EBS.Scrap.normalizeParams({ endPauseSec: 99, repeatRounds: 'false' })), { rulesVersion: 'classic', episodeMode: 'endless', arena: 'yard', repeatRounds: false, endPauseSec: 8 });
});

test('Scrap-Turnier: genau acht Runden, echte fünf Sekunden Finale und gleiche UI-/Exportdauer', () => {
  for (const [tempo, fps] of [[1,30],[.8,60],[.64,30]]) {
    const cfg = EBS.normalizeConfig({ scenario: 'scrap', seed: 42, params: { rulesVersion: 'v2', episodeMode: 'tournament', repeatRounds: false }, video: { tempo, fps } });
    const s = make({ params: cfg.params, timeScale: tempo });
    while (s.phase !== 'outro') s.stepOnce();
    assert.equal(s.completedRounds, 8); assert.equal(s.roundResults.length, 8);
    assert.equal(s.events.filter(e => e.type === 'tournament_end').length, 1);
    assert.ok(s.champions().length >= 1);
    const end = s.step; advance(s, 299 / 60); assert.equal(s.phase, 'outro'); s.stepOnce(); assert.equal(s.phase, 'ended');
    const plan = EBS.Scrap.createExportPlan(cfg, s.world); let result;
    do { result = plan.advance(); } while (!result.done);
    assert.equal(result.durationSec, Math.ceil((end + 300) / 60 * fps) / fps);
    advance(s, 20); assert.equal(s.roundNumber, 8); assert.equal(s.checkInvariants().ok, true);
    s.wins = [2,2,2,2]; assert.deepEqual(plain(s.champions()), [0,1,2,3]);
  }
});

test('Scrap v2: drei Prüfseeds ohne lange Feuerpausen, reproduzierbar bei Zeitlupe', () => {
  for (const seed of [42, 7, 314]) {
    const s = make({ seed, params: { rulesVersion: 'v2', repeatRounds: false } });
    let shots = 0, last = 0, longest = 0;
    while (s.phase === 'running') {
      s.stepOnce();
      if (s.roundSim.stats.shots !== shots) {
        longest = Math.max(longest, s.t - last); last = s.t; shots = s.roundSim.stats.shots;
      }
    }
    assert.ok(Math.max(longest, s.t - last) < 3, `Seed ${seed}: Feuerpause`);
    assert.equal(s.checkInvariants().ok, true);
    const slow = make({ seed, params: s.cfg, timeScale: .64 });
    while (slow.phase === 'running') slow.stepOnce();
    assert.equal(JSON.stringify(s.roundSim), JSON.stringify(slow.roundSim));
  }
});

test('Scrap-Arenen: alle Starts und Waffen erreichbar; drei Seeds bleiben gültig, Duellkamera hält das Geschehen im Bild', () => {
  let maximumZoom = 1;
  for (const arena of ['yard','foundry','crossroads']) {
    const initial = make({ params: { arena, rulesVersion: 'v2' } }).roundSim;
    // Independent clearance-grid flood fill, not the robots' steering code.
    const free = (x,y) => !initial.blocks.some(b => Math.hypot(x - Math.max(b.x, Math.min(x,b.x+b.w)), y - Math.max(b.y,Math.min(y,b.y+b.h))) < 25);
    const cells = new Map();
    for (let x=60;x<=840;x+=20) for(let y=60;y<=840;y+=20) if(free(x,y)) cells.set(`${x},${y}`,{x,y});
    const queue = [cells.get('140,140')], seen = new Set(['140,140']);
    for (let i=0;i<queue.length;i++) for(const [dx,dy] of [[20,0],[-20,0],[0,20],[0,-20]]) {
      const key = `${queue[i].x+dx},${queue[i].y+dy}`;
      if(cells.has(key)&&!seen.has(key)) { seen.add(key); queue.push(cells.get(key)); }
    }
    for(const p of [...initial.robots,...initial.pickups,...initial.pads]) assert.ok(queue.some(c=>Math.hypot(c.x-p.x,c.y-p.y)<25), `${arena}: ${p.x},${p.y} erreichbar`);
    for(const seed of [42,7,314]) {
      const s=make({seed,params:{arena,rulesVersion:'v2',repeatRounds:false}});
      while(s.phase==='running') {
        s.stepOnce();
        maximumZoom=Math.max(maximumZoom,s.camera.zoom);
        if(s.step%60===0) assert.equal(s.checkInvariants().ok,true,`${arena}/${seed}: ${JSON.stringify(s.checkInvariants())}`);
        for(const r of s.roundSim.robots.filter(r=>r.alive)) {
          assert.ok(Math.abs(r.x-s.camera.x)*s.camera.zoom < 468-r.r, `${arena}: X im Bild`);
          assert.ok(Math.abs(r.y-s.camera.y)*s.camera.zoom < 468-r.r, `${arena}: Y im Bild`);
        }
      }
      assert.equal(s.roundSim.arena,arena);
      assert.equal(s.checkInvariants().ok,true);
    }
  }
  assert.ok(maximumZoom > 1.2, 'Kamera hat tatsächlich eingezoomt');
});
