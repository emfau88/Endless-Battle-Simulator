import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const context = vm.createContext({}); context.window = context;
for (const path of ['core.js', 'canvas-scene.js', 'scenarios/scrap/simulation.js', 'scenarios/scrap/renderer.js', 'scenarios/scrap/rules.js', 'scenarios/scrap/materials.js', 'scenarios/scrap/material-art.js', 'scenarios/scrap/episode.js', 'scenarios/scrap.js']) {
  vm.runInContext(read('src/' + path), context, { filename: path });
}
const { EBS } = context;
const make = (overrides = {}) => new EBS.Scrap.Episode({ seed: 42, params: {}, world: { w: 1080, h: 1920 }, ...overrides });
const advance = (s, seconds) => { for (let i = 0; i < Math.round(seconds * 60); i++) s.stepOnce(); };
const plain = o => JSON.parse(JSON.stringify(o));
const sha = data => createHash('sha256').update(data).digest('hex');

test('Scrap v3: Holz, Stein und Beton brauchen 2/5/10 Blaster oder 1/1/2 direkte Raketen; zerstörte Deckung gibt Wege frei', () => {
  for(const [material,blaster,rocket] of [['wood',2,1],['stone',5,1],['concrete',10,2]])for(const [kind,hits] of [['blaster',blaster],['rocket',rocket]]) {
    const s=make({params:{rulesVersion:'v3',repeatRounds:false}}),r=s.roundSim;
    const b={...r.blocks.find(b=>b.material===material),x:200,y:200,w:64,h:64};r.blocks=[b];
    for(let shot=1;shot<=hits;shot++) {
      r.projectiles=[{id:100+shot,x:140,y:232,px:140,py:232,vx:1000,vy:0,kind,owner:0,life:2,radius:kind==='rocket'?7:4}];
      r._moveProjectiles(1); // crosses the entire block in one step: swept collision required
      assert.equal(b.alive,shot<hits,`${material}/${kind}/${shot}`);
      assert.equal(r.projectiles.length,0);
      assert.equal(r._blocked(140,232,320,232,24),shot<hits,'echte Kollisionsdeckung, nach Zerstörung passierbar');
    }
    assert.equal(r.stats.destroyed,1);assert.equal(s.events.filter(e=>e.type==='break').length,1);
    assert.equal(r.effects.find(e=>e.type==='break').material,material);
  }
  const r=make({params:{rulesVersion:'v3'}}).roundSim;
  r.projectiles=[{id:100,x:950,y:270,px:950,py:270,vx:650,vy:0,kind:'blaster',owner:0,life:2,radius:4}];
  r._moveProjectiles(.05);assert.equal(r.projectiles.length,1,'östlich der alten 900er-Grenze frei');
  r._moveProjectiles(.1);assert.equal(r.projectiles.length,0,'neue Außenwand stoppt Projektil');
  r.robots[0].x=1100;assert.equal(r.checkInvariants().ok,false,'Rechteckgrenze tatsächlich geprüft');
});

test('Scrap v3: alle vier Karten begehbar, drei Seeds kollisionsfrei, Kamera hält aktive Roboter im Bild', () => {
  for(const arena of ['yard','foundry','crossroads','sunshine']) {
    const initial=make({params:{rulesVersion:'v3',arena}}).roundSim;
    const free=(x,y)=>!initial.blocks.some(b=>Math.hypot(x-Math.max(b.x,Math.min(x,b.x+b.w)),y-Math.max(b.y,Math.min(y,b.y+b.h)))<25);
    const cells=new Map();for(let x=50;x<=990;x+=10)for(let y=50;y<=490;y+=10)if(free(x,y))cells.set(`${x},${y}`,{x,y});
    const queue=[cells.get('110,80')],seen=new Set(['110,80']);
    for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[10,0],[-10,0],[0,10],[0,-10]]) {
      const key=`${queue[i].x+dx},${queue[i].y+dy}`;if(cells.has(key)&&!seen.has(key)){seen.add(key);queue.push(cells.get(key));}
    }
    assert.equal(seen.size,cells.size,`${arena}: keine abgetrennte begehbare Zelle`);
    for(const p of [...initial.robots,...initial.pickups,...initial.pads])assert.ok(queue.some(c=>Math.hypot(c.x-p.x,c.y-p.y)<15),`${arena}: Start/Nachschub erreichbar`);
    for(const seed of [42,7,314]) {
      const s=make({seed,params:{rulesVersion:'v3',arena,repeatRounds:false}});
      while(s.phase==='running') {
        s.stepOnce();
        if(s.step%30===0)assert.equal(s.checkInvariants().ok,true,`${arena}/${seed}: ${JSON.stringify(s.checkInvariants())}`);
        for(const r of s.roundSim.robots.filter(r=>r.alive)) {
          assert.ok(Math.abs(r.x-s.camera.x)*s.camera.zoom<=520-r.r,`${arena}/${seed}: X im Bild`);
          assert.ok(Math.abs(r.y-s.camera.y)*s.camera.zoom<=270-r.r,`${arena}/${seed}: Y im Bild`);
        }
      }
      assert.equal(s.checkInvariants().ok,true);
      assert.ok(s.roundSim.stats.destroyed>0,`${arena}/${seed}: Zerstörung findet statt`);
    }
  }
});

test('Scrap v3: 90% Arena im Querformat; Hochformat, Tempo und Turnierplanung ändern weder Rundenausgang noch Module', () => {
  const params={rulesVersion:'v3',episodeMode:'tournament',workshop:true},world={w:1920,h:1080};
  const l=EBS.Scrap.layout(world,params);
  assert.ok(l.width*l.height/(world.w*world.h)>.89);
  const a=make({params,world}),b=make({params,timeScale:.64});
  while(a.phase!=='ended')a.stepOnce();while(b.phase!=='ended')b.stepOnce();
  assert.equal(a.completedRounds,8);assert.equal(a.roundNumber,8);
  assert.equal(JSON.stringify(a.roundSim),JSON.stringify(b.roundSim));
  assert.deepEqual(plain(a.roundResults),plain(b.roundResults));assert.deepEqual(plain(a.workshop),plain(b.workshop));
  assert.equal(a.checkInvariants().ok,true);assert.equal(b.checkInvariants().ok,true);
  const cfg=EBS.normalizeConfig({scenario:'scrap',params,video:{aspect:'16:9',fps:30}});
  const plan=EBS.Scrap.createExportPlan(cfg,world);let progress;do{progress=plan.advance();}while(!progress.done);
  assert.equal(progress.durationSec,Math.ceil(a.step/60*30)/30);
  const low=make({params,world:{w:1920,h:1080},view:{camera:false}}),portrait=make({params,view:{camera:false}});
  advance(low,12);advance(portrait,12);
  const lp=EBS.Scrap.layout(portrait.world,params);
  low.events.forEach((e,i)=>{
    const p=portrait.events[i];assert.equal(e.type,p.type);assert.equal(e.arenaX,p.arenaX);assert.equal(e.arenaY,p.arenaY);
    assert.ok(Math.abs((e.x-l.x)/l.width-(p.y-lp.y)/lp.height)<1e-9);
    assert.ok(Math.abs((e.y-l.y)/l.height+(p.x-lp.x)/lp.width-1)<1e-9);
  });
});

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
  assert.deepEqual(plain(EBS.Scrap.normalizeParams({ endPauseSec: 99, repeatRounds: 'false' })), { rulesVersion: 'classic', episodeMode: 'endless', arena: 'yard', workshop: false, repeatRounds: false, endPauseSec: 8 });
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

test('Scrap-Werkstatt: drei Module, ein Slot, spätere Wirkung, Reset und reproduzierbare Turniere', () => {
  assert.equal(EBS.Scrap.normalizeParams({workshop:true}).workshop,false);
  const used = new Set();
  for(const seed of [42,7,314]) {
    const options={seed,params:{rulesVersion:'v2',episodeMode:'tournament',workshop:true}};
    const a=make(options), b=make({...options,timeScale:.8});
    while(a.phase!=='ended') {
      a.stepOnce();
      if(a.step%60===0) assert.equal(a.checkInvariants().ok,true);
      if(a.phase==='running') a.roundSim.robots.forEach(r=>{
        const module=a.workshop.modules[r.id];
        assert.equal(r.module||null,module);
        if(module) {
          used.add(module);
          const spec=EBS.ScrapRules.modules[module];
          assert.equal(r.maxHp,125*spec.hp);
          assert.ok(r.speed>=118*.92 && r.speed<=132*1.12);
        }
      });
    }
    while(b.phase!=='ended') b.stepOnce();
    assert.deepEqual(plain(a.workshop.installed),[1,1,1,1]);
    assert.deepEqual(plain(a.workshop),plain(b.workshop));
    assert.deepEqual(plain(a.roundResults),plain(b.roundResults));
    assert.equal(JSON.stringify(a.roundSim),JSON.stringify(b.roundSim));
    const reset=make(options);
    assert.deepEqual(plain(reset.workshop.installed),[0,0,0,0]);
    assert.equal(reset.roundSim.robots.some(r=>r.module),false);
  }
  assert.equal(used.size,3);
  for(const module of Object.values(EBS.ScrapRules.modules)) {
    assert.ok(module.hp<1 || module.speed<1, 'jedes Modul hat einen Nachteil');
    assert.ok(module.hp>1 || module.speed>1 || module.cooldown<1, 'jedes Modul hat einen Vorteil');
  }
});
