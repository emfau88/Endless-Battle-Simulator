import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const context={EBS:{}};
for(const name of ['layout','story','simulation']) runInNewContext(readFileSync(new URL(`../src/scenarios/waterpark/${name}.js`,import.meta.url),'utf8'),context,{filename:`waterpark/${name}.js`});
const WP=context.EBS.Waterpark;
const worlds=[{w:1920,h:1080},{w:1080,h:1920}];
function simulate(sim,seconds,checkEvery=120){
  for(let i=0;i<Math.round(seconds*60);i++){
    sim.stepOnce();
    if(i%checkEvery===0){const c=sim.checkInvariants();assert.ok(c.ok,`t=${sim.videoTime}: ${c.errors.join('; ')}`);}
  }
  return sim.snapshot();
}
function create(params={},world=worlds[0],duration=300,seed=42,timeScale=1){return new WP.Simulation({seed,params,world,video:{durationSec:duration,tempo:timeScale},timeScale});}

for(const world of worlds){
  const format=world.w>world.h?'16:9':'9:16';
  test(`Vier-Tiere-Short ${format}: vier unterschiedliche Fahrten und natürliches Sammeln`,()=>{
    for(const duration of [25,30,40]){
      const sim=create({mode:'short'},world,duration),s=simulate(sim,duration);
      assert.equal(s.animals,4);assert.equal(s.rides,4);
      assert.deepEqual(Array.from(s.routeRides),[1,1,1,1]);
      assert.equal(s.counts.gather,4);assert.ok(s.finished);assert.ok(sim.finishedAt<=duration-2);
      for(const b of sim.animals)assert.equal(b.routeHistory.length,1);
    }
  });
  test(`Parktag ${format}: Öffnungsprogramm, Liftentleerung und ruhiger Schluss`,()=>{
    const sim=create({mode:'day',animals:24},world,300);
    assert.deepEqual(Array.from(sim.story.openRoutes),[true,false,false,false]);
    simulate(sim,30);assert.deepEqual(Array.from(sim.story.openRoutes),[true,true,false,false]);
    simulate(sim,75);assert.ok(sim.story.openRoutes.every(Boolean));
    simulate(sim,195);assert.equal(sim.snapshot().counts.gather,24);assert.ok(sim.story.finished);
    assert.ok(sim.finishedAt<=298);assert.equal(sim.snapshot().counts.lift,0);assert.equal(sim.snapshot().counts.platform,0);
    assert.ok(sim.routeRides.every(n=>n>0));
    const hash=sim.stateHash();simulate(sim,15);assert.equal(sim.rides,sim.animals.reduce((n,b)=>n+b.laps,0));
    assert.ok(sim.animals.every(b=>b.state==='gather'&&b.done));assert.notEqual(sim.stateHash(),hash,'Videouhr läuft für Wasser und Dekoration weiter');
  });
  test(`Dauerbetrieb ${format}: hohe Belegung und langsame Mechanik bleibt in Bewegung`,()=>{
    const sim=create({mode:'relax',animals:24,size:30,speed:.5,beltSpeed:.5,rollSpeed:.5,current:.5},world,600);
    simulate(sim,600);const s=sim.snapshot();assert.ok(s.minLaps>=1,JSON.stringify(s));assert.equal(s.counts.gather,0);assert.ok(s.rides>30);
  });
}

test('Abgewählte Attraktionen entfallen aus dem Parkprogramm; eine beliebige Einzelroute läuft',()=>{
  for(let route=0;route<4;route++){
    const params={mode:'relax',animals:12};for(let i=0;i<4;i++)params['route'+i]=i===route;
    const sim=create(params);simulate(sim,240);assert.ok(sim.rides>=10,`Route ${route} stockt`);
    for(let i=0;i<4;i++)assert.equal(sim.routeRides[i]>0,i===route);
    assert.ok(sim.snapshot().minLaps>=1,`Tier bleibt bei Route ${route} hängen`);
  }
  const sim=create({mode:'day',route0:false,route2:false},worlds[0],300);
  assert.deepEqual(Array.from(sim.story.openRoutes),[false,true,false,false]);
  simulate(sim,30);assert.deepEqual(Array.from(sim.story.openRoutes),[false,true,false,true]);
});

test('Seed-Replay und Darstellungsunabhängigkeit',()=>{
  const a=create({mode:'relax'},worlds[0],300,7),b=create({mode:'relax',decoDensity:0,ufo:false,fish:false,emotes:false,dayCycle:false},worlds[0],300,7),c=create({mode:'relax'},worlds[0],300,8);
  simulate(a,120);simulate(b,120);simulate(c,120);
  assert.equal(a.stateHash(),b.stateHash());assert.notEqual(a.stateHash(),c.stateHash());
  const replay=create({mode:'relax'},worlds[0],300,7);simulate(replay,120);assert.equal(a.stateHash(),replay.stateHash());
});

test('Erste Routenwahl nutzt alle vier offenen Attraktionen statt korrelierter Tier-IDs',()=>{
  const sim=create({mode:'relax',animals:16},worlds[0],300,42);
  const choices=sim.animals.slice(0,12).map(b=>sim._chooseRoute(b));
  assert.equal(new Set(choices).size,4,'Die ersten zwölf Gäste müssen alle vier offenen Routen bevorzugen');
  assert.ok(new Set(choices.slice(0,10)).size>1,'Die ersten zehn Gäste dürfen nicht dieselbe Rutsche bevorzugen');
});

test('30/60 fps und Exporttempo: Videouhr bleibt unabhängig vom Bewegungstempo',()=>{
  const a=create({mode:'day'},worlds[0],300,3,.64),b=create({mode:'day'},worlds[0],300,3,.64);
  for(let frame=0;frame<60*60;frame++)a.stepOnce();
  for(let frame=0;frame<60*30;frame++){b.stepOnce();b.stepOnce();}
  assert.equal(a.stateHash(),b.stateHash());assert.equal(a.videoTime,60);assert.ok(Math.abs(a.t-38.4)<1e-8);
  assert.deepEqual(Array.from(a.story.openRoutes),[true,true,false,false]);
});

test('Bahnanschlüsse sind stetig; Sprung und bewegliche Elemente sind keine festen Rutschensegmente',()=>{
  for(const world of worlds){
    const L=WP.createLayout(world,24);
    for(const r of L.routes){
      const q=WP.samplePath(r.path,r.path.length),p=WP.samplePath(L.pool.path,L.pool.joinS[r.id]);
      assert.ok(Math.hypot(q.x-p.x,q.y-p.y)<1e-6);
      for(const seg of r.drawSegments)assert.ok(!['funnel','seesaw','flight'].includes(seg.kind));
    }
    const p=WP.samplePath(L.pool.path,L.pool.path.length),q=WP.samplePath(L.lift.path,0);
    assert.ok(Math.hypot(p.x-q.x,p.y-q.y)<1e-6);
    const before=WP.samplePath(L.routes[3].path,L.jump.entryS-1),after=WP.samplePath(L.routes[3].path,L.jump.entryS+1);
    assert.ok(before.tx*after.tx>0,'Sprung setzt die horizontale Anfahrtrichtung fort');
    const spiral=L.routes[1].path.points.filter(p=>p.kind==='funnel');
    assert.ok(spiral.every(p=>Math.abs(p.x-L.funnel.x)<=L.funnel.rx-L.R*1.3&&Math.abs(p.y-L.funnel.y)<=L.funnel.ry-L.R*.6),'Tierzentrum bleibt im Trichterinneren');
  }
});

test('Zustandswechsel bewegen Tiere ohne Teleportation und Prüfer erkennt beschädigte Zustände',()=>{
  for(const world of worlds){
    const sim=create({mode:'day',animals:8},world,120);
    for(let step=0;step<120*60;step++){
      const previous=sim.animals.map(b=>sim.pose(b));sim.stepOnce();
      for(const b of sim.animals){const a=previous[b.id],p=sim.pose(b);assert.ok(Math.hypot(a.x-p.x,a.y-p.y)<20,`Sprung bei ${b.state}: ${Math.hypot(a.x-p.x,a.y-p.y)}`);}
    }
    const b=sim.animals[0],s=b.s;b.s=1e9;assert.ok(!sim.checkInvariants().ok);b.s=s;
    sim.animals.pop();assert.ok(!sim.checkInvariants().ok);
  }
});

test('Wippe folgt dem Gewicht: kippt zur belasteten Seite, schlägt an und das Tier hält nie auf dem Brett',()=>{
  for(const world of worlds){
    const sim=create({mode:'day',animals:16},world,300),f=sim.L.seesaw,m=f.maxAngle;
    let seq=0,knocks=0,rides=0;const on=new Map();
    for(let step=0;step<300*60;step++){
      sim.stepOnce();
      for(;seq<sim.eventSeq;seq++)if(sim.events[seq%sim.events.length].type==='seesaw')knocks++;
      assert.ok(Math.abs(sim.seesawAngle)<=m+1e-12,'Anschlag begrenzt die Neigung');
      for(const b of sim.animals){
        const board=b.state==='route'&&b.route===2&&b.s>=f.entryS&&b.s<=f.exitS;
        if(!board){if(on.has(b.id)){assert.ok(on.get(b.id).last>=m*.99,'Abstieg am Anschlag der Ausgangsseite');on.delete(b.id);rides++;}continue;}
        const u=(b.s-f.entryS)/(f.exitS-f.entryS),r=on.get(b.id)||{t:sim.t,last:0};on.set(b.id,r);r.last=sim.seesawAngle;
        assert.ok(b.v>0,`Tier hält auf dem Brett (u=${u.toFixed(2)})`);
        if(u>.08&&u<.35)assert.ok(sim.seesawAngle<0,'Einstiegsseite senkt sich unter dem Gewicht');
        if(u>.75)assert.ok(sim.seesawAngle>0,'Ausgangsseite senkt sich unter dem Gewicht');
        assert.ok(sim.t-r.t<3,'Fahrt über das Brett dauert höchstens 3 s');
      }
    }
    assert.ok(rides>=8,`genug Wippfahrten (${rides})`);
    assert.ok(knocks>=rides*2-1&&knocks<=rides*2+1,`zwei Anschläge je Fahrt (${knocks} bei ${rides})`);
  }
});

test('Dekoration ist begrenzt; Ton und sichtbare Ereignisse teilen den Auslösezeitpunkt',()=>{
  const sim=create({mode:'relax',decoDensity:2},worlds[0],600);
  for(let i=0;i<600*60;i++){
    sim.stepOnce();assert.ok(sim.decorations.length<=10);assert.ok(sim.recent.length<=72);
    for(const d of sim.decorations.filter(d=>d.start===sim.videoTime)){
      const type={ufo:'ufo',birds:'chirp',shootingStars:'twinkle',fish:'fish',emote:'emote'}[d.type];
      if(type)assert.ok(sim.recent.some(e=>e.type===type&&e.t===d.start));
    }
  }
});

test('Fontänen-/Feuerwerksfinale funktioniert auch ohne zufällige Dekoration',()=>{
  const sim=create({mode:'short',ending:'show',fireworks:true,decoDensity:0},worlds[0],30);
  simulate(sim,29);assert.ok(sim.story.show);assert.ok(sim.events.some(e=>e?.type==='firework'));assert.ok(sim.events.some(e=>e?.type==='launch'));
});

test('Exportvorprüfung behält die Dauer und blockiert ein unmögliches langsames Short',()=>{
  const cfg={seed:42,params:{mode:'short'},video:{durationSec:30,tempo:1}};
  const plan=WP.createExportPlan(cfg,worlds[0]);let result;
  do{result=plan.advance();}while(!result.done);
  assert.equal(result.durationSec,30);
  const slow=WP.createExportPlan({...cfg,params:{mode:'short',speed:.5,rollSpeed:.5,current:.5}},worlds[0]);
  assert.throws(()=>{let r;do{r=slow.advance();}while(!r.done);},/Schlussbild nicht rechtzeitig/);
});

test('Landebuchten reservieren Platz vor der Abfahrt und auch gegen benachbarte neue Landungen',()=>{
  for(const params of [{mode:'relax',animals:16},{mode:'relax',animals:24,size:30,current:.5}]){
    const sim=create(params,worlds[0],300);simulate(sim,120,1);
    assert.ok(sim.rides>15);
  }
  const portrait=create({mode:'day',animals:24,size:30},worlds[1],300);simulate(portrait,300,6);
  assert.ok(portrait.story.finished);assert.ok(portrait.finishedAt<298);
  const landscape=create({mode:'day',animals:24,size:30},worlds[0],300);simulate(landscape,300,6);
  assert.ok(landscape.story.finished);assert.ok(landscape.finishedAt<298);
});

test('Pausierte Vorschau übernimmt Tageszeit und Schlussdarstellung ohne Bewegungsänderung',()=>{
  const sim=create({mode:'relax',dayCycle:false,dayStart:.2});const before=sim.stateHash();
  sim.setParam('dayStart',.9);assert.equal(sim.story.dayPhase,.9);assert.equal(sim.stateHash(),before);
  sim._pendingGuest={type:'ufo',at:0,expires:100};sim.setParam('ufo',false);sim._updateDecorations();
  assert.equal(sim._pendingGuest,null);assert.ok(!sim.decorations.some(d=>d.type==='ufo'));
});
