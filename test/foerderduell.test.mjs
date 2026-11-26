import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
context.window = context;
for (const file of ['core.js', 'scenarios/foerderduell/auger.js', 'scenarios/foerderduell/simulation.js']) {
  vm.runInContext(readFileSync(new URL('../src/' + file, import.meta.url), 'utf8'), context);
}
const F = context.EBS.Foerderduell;
const make = (seed, supply, mode='single', timeScale=1) => new F.Simulation({seed, params:{supply,mode},timeScale});

test('Erst die Flanke fördert bergauf, eine Umdrehung trägt genau eine Steigung', () => {
  const {load,pose,turnsAt,support,outlet,span}=F.Auger;
  for(const take of [0,5,21]) {
    const b=load(take,take,take);
    const intake=pose(b,b.enter+.12), loose=pose(b,b.enter+.30);
    assert.ok(intake.drop>0 && intake.drop<1 && intake.x===0);
    assert.ok(loose.x<0 && !loose.contact);
    const from=b.enter+.52, carried=pose(b,from);
    assert.ok(carried.contact);
    for(let i=0;i<60;i++) {
      const t=from+i/60, p=pose(b,t);
      assert.ok(p.contact);
      assert.ok(Math.abs(p.x-support(turnsAt(t),b.pocket))<1e-10);
    }
    assert.ok(Math.abs(pose(b,from+.5).x-carried.x-1)<1e-10);
    assert.ok(pose(b,b.release-.001).x<outlet && pose(b,b.release-.001).contact);
    assert.ok(pose(b,b.release+.001).x>outlet && !pose(b,b.release+.001).contact);
    assert.ok(Math.abs(pose(b,b.exit).x-span)<1e-10);
  }
});

test('Bei stillstehender Welle rollt die Kugel zur Flanke zurück und wird erst beim Anfahren weitergeschoben', () => {
  const {roll,support}=F.Auger, stoppedAt=1.75, pocket=0;
  const rest=support(stoppedAt,pocket), dt=1/54;
  let state={x:rest,speed:2}, peak=rest;
  for(let step=0;step<80;step++) {
    state=roll(state.x,state.speed,dt,stoppedAt,stoppedAt,pocket);
    peak=Math.max(peak,state.x);
    assert.ok(state.x>=rest);
  }
  assert.ok(peak>rest+.30 && peak<rest+.35);
  assert.deepEqual([state.x,state.speed,state.contact],[rest,0,true]);
  const restart=roll(state.x,state.speed,dt,stoppedAt,stoppedAt+2*dt,pocket);
  assert.ok(restart.contact && restart.x>rest && Math.abs(restart.speed-2)<1e-10);
});

for (const [supply, seed, ticks, winner] of [
  ['steady',42,[13,16],'auger'], ['bursts',42,[13,10],'piston'], ['packets',24,[22,22],'tie']
]) {
  test(supply + ' erreicht die Zielmarke zum berechneten Takt', () => {
    const sim = make(seed,supply);
    assert.deepEqual(Array.from(sim.round.crossings),ticks);
    let freeze, seenLead=false;
    for (let step=0;step<2200;step++) {
      sim.stepOnce();
      assert.equal(sim.checkInvariants().ok,true);
      if (sim.scores[0]===8 && sim.scores[1]===7) seenLead=true;
      if (sim.result && !freeze) freeze=[sim.beat,sim.eventSeq,...sim.scores];
    }
    assert.equal(sim.result,winner);
    assert.deepEqual(freeze,[sim.beat,sim.eventSeq,...sim.scores]);
    assert.equal(sim.wins[winner],1);
    if (supply==='bursts') assert.ok(seenLead);
  });
}
test('Serien wechseln den Zulauf, erhalten alle Kugeln und bleiben beim selben Seed reproduzierbar', () => {
  const a=make(42,'mixed','series'), b=make(42,'mixed','series');
  const profiles=new Set();
  for(let step=0;step<60*600;step++) {
    a.stepOnce(); b.stepOnce();
    if(step%30===0) {
      profiles.add(a.round.profile);
      for(const lane of a.snapshot().counts) assert.equal(Object.values(lane).reduce((x,y)=>x+y),24);
      assert.equal(a.checkInvariants().ok,true);
      assert.equal(a.stateHash(),b.stateHash());
    }
  }
  assert.equal(profiles.size,3);
  assert.ok(a.roundIndex>30 && a.wins.auger>0 && a.wins.piston>0);
  assert.equal(a.events.length,128);
  assert.notDeepEqual(Array.from(F.buildRound(1,0,'packets').supply),Array.from(F.buildRound(2,0,'packets').supply));
});
test('Zeitlupe verschiebt den Filmzeitpunkt der gleichen Landungen', () => {
  const normal=make(42,'bursts'), slow=make(42,'bursts','single',.8);
  for(let i=0;i<720;i++) normal.stepOnce();
  for(let i=0;i<900;i++) slow.stepOnce();
  assert.equal(slow.beat,normal.beat);
  const hits=sim=>sim.events.filter(Boolean).filter(e=>e.type==='glass');
  assert.equal(hits(normal).length,hits(slow).length);
  assert.ok(hits(slow)[0].step>hits(normal)[0].step);
});
