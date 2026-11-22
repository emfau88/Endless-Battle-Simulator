import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
context.window = context;
for (const file of ['core.js', 'scenarios/foerderduell/simulation.js']) {
  vm.runInContext(readFileSync(new URL('../src/' + file, import.meta.url), 'utf8'), context);
}
const F = context.EBS.Foerderduell;
const make = (seed, supply, mode='single', timeScale=1) => new F.Simulation({seed, params:{supply,mode},timeScale});

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
