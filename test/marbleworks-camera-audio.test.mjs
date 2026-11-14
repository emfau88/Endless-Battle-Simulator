import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({});context.window=context;
vm.runInContext(readFileSync(new URL('../vendor/three.min.js',import.meta.url),'utf8'),context);
const {OrthographicCamera,Vector3}=context.THREE;
for(const file of ['core.js','scenarios/marble/production-simulation.js','scenarios/marble/production-camera.js',
  'scenarios/marble/production-audio.js','scenarios/marble/production-audio-plan.js']) {
  vm.runInContext(readFileSync(new URL('../src/'+file,import.meta.url),'utf8'),context,{filename:file});
}
const P=context.EBS.MarbleProduction;
const plain=x=>JSON.parse(JSON.stringify(x));
const milestones=[{type:'coating',time:96.417},{type:'parallel',time:199.117},{type:'complete',time:465.883}];
const options=(params={},video={},world={w:1600,h:900})=>({
  cfg:{params:{cameraMode:'manual',cameraPosition:20,cameraZoom:1,...params},video:{tempo:1,...video},view:{camera:true}},
  world,sim:{milestones:[],completedAt:null},view:{camera:true},
});
const event=(seq=0,extra={})=>({seq,step:6000,type:'factoryImpact',x:1500,y:650,c:0,material:'glass',p:.8,...extra});

test('Marble camera extraction retains existing shots at opening, upgrades and finale',()=>{
  // Reference values captured from the pre-extraction renderer at f3cb8de.
  const reference=[
    [0,{x:0,y:2.5,z:.5,span:42.1875}],
    [8,{x:-16.373177842565596,y:3.288338192419825,z:-1.8650145772594748,span:27.823068513119537}],
    [11,{x:-27,y:3.8,z:-3.4,span:18.5}],
    [107,{x:-2.160000000000002,y:3.8,z:-3.4,span:19}],
    [206,{x:-8.506381476559184,y:3.8,z:-.20000000000000018,span:21.997099328836736}],
    [473,{x:-.07313458454718447,y:2.5440161851441387,z:.4762989772300791,span:41.40240362074637}],
  ];
  for(const [t,shot] of reference)assert.deepEqual(plain(P.cameraAt({cfg:{cameraMode:'auto'},t,milestones,completedAt:465.883},{},16/9)),shot);
});

test('Audio projection agrees with the actual Three orthographic camera in both formats and zoom levels',()=>{
  const points=[[650,470],[1500,650],[2800,1050],[3650,750],[4400,650],[5900,650]];
  for(const aspect of [16/9,9/16])for(const cameraPosition of [0,46,100])for(const cameraZoom of [.7,1.7]) {
    const shot=P.cameraAt({cfg:{cameraMode:'manual',cameraPosition,cameraZoom},t:250,milestones,completedAt:465.883},{},aspect);
    const camera=new OrthographicCamera(-shot.span*aspect/2,shot.span*aspect/2,shot.span/2,-shot.span/2,.1,300);
    camera.position.set(shot.x-33,shot.y+43,shot.z+58);camera.lookAt(shot.x,shot.y,shot.z);
    camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
    for(const [x,y] of points) {
      const point=P.stagePosition(x,y),expected=new Vector3(point.x,point.y,point.z).project(camera);
      const actual=P.projectStagePoint(point,shot,aspect);
      assert.ok(Math.abs(actual.x-expected.x)<1e-12,JSON.stringify({actual,expected}));
      assert.ok(Math.abs(actual.y-expected.y)<1e-12);
    }
  }
});

test('Only visible sound candidates consume spacing or density; global/per-sound mute is respected',()=>{
  const events=[event(0,{x:5900}),event(1)];
  const plan=P.createAudioMixPlan(events,options());
  assert.equal(plan.events[0].gain,0);
  assert.ok(plan.events[1].gain>.95,'offscreen predecessor must not consume same-type spacing');
  const active=['factoryFeed','factoryPress','factorySort','factoryImpact'].map((type,seq)=>event(seq,{type}));
  const muted=P.createAudioMixPlan(active,options({}, {volume:{factoryFeed:0}}));
  assert.equal(muted.events[0].gain,0);
  assert.equal(muted.stats.audible,3,'muted event must not occupy the three foreground places');
  assert.ok(P.createAudioMixPlan(active,options({}, {volume:{master:0}})).events.every(e=>e.gain===0));
});

test('Overview is quieter and sparser; simultaneous work cues take priority over incidental rolls',()=>{
  const events=['factoryRoll','factoryFeed','factoryImpact','factoryPress','factorySort','factoryScan','factoryUpgrade','factoryComplete']
    .map((type,seq)=>event(seq,{type}));
  const overview=P.createAudioMixPlan(events,options({cameraMode:'overview'}));
  const close=P.createAudioMixPlan(events,options());
  assert.equal(overview.stats.audible,2);assert.equal(close.stats.audible,3);
  assert.deepEqual(plain(overview.events.filter(e=>e.gain>0).map(e=>e.seq)),[6,7]);
  assert.ok(overview.events.every(e=>e.gain<=.420001));
  assert.ok(close.events.some(e=>e.gain>.9));
});

test('The camera feather changes smoothly, reaches actual silence, and follows portrait framing',()=>{
  const cfg=options({cameraMode:'auto'});
  let previous=null,maxDelta=0,hasSilence=false,hasForeground=false;
  for(let step=0;step<=140*60;step+=2) {
    const focus=P.audioFocusAt(event(0,{step}),cfg);
    assert.ok(Number.isFinite(focus.gain)&&focus.gain>=0&&focus.gain<=1);
    assert.ok(Math.abs(focus.pan)<=.350001);
    if(previous!==null)maxDelta=Math.max(maxDelta,Math.abs(focus.gain-previous));
    previous=focus.gain;hasSilence||=focus.gain===0;hasForeground||=focus.gain>.99;
  }
  assert.ok(maxDelta<.025,`camera gain discontinuity ${maxDelta}`);
  assert.ok(hasSilence&&hasForeground);
  const across=event(0,{x:2800});
  const landscape=P.audioFocusAt(across,options());
  const portrait=P.audioFocusAt(across,options({}, {},{w:900,h:1600}));
  assert.ok(landscape.gain>portrait.gain+.2,'portrait must not hear the full landscape width');
});

test('Camera smoothing uses video time times tempo, including the milestone clock',()=>{
  const original=P.cameraAt,observed=[];
  P.cameraAt=(sim,view,aspect)=>{observed.push(sim.t);return original(sim,view,aspect);};
  try {
    P.audioFocusAt(event(0,{step:1800}),options({cameraMode:'auto'},{tempo:2}));
    assert.deepEqual(observed,[59.3,59.65,60,60.35,60.7]);
  } finally {P.cameraAt=original;}
});

test('A complete episode plans every event beyond the ring buffer without changing production or event history',()=>{
  const sim=new P.Simulation({seed:42,params:{orderSize:144}}),events=[];
  let next=0;
  for(let i=0;i<600*60;i++) {
    sim.stepOnce();
    if(sim.step%60===0||sim.completedAt!==null) {
      const chunk=sim.drainEvents(next);events.push(...chunk);
      if(chunk.length)next=chunk.at(-1).seq+1;
    }
    if(sim.completedAt!==null)break;
  }
  assert.equal(sim.stats.completed,144);assert.ok(events.length>1024);
  const hash=sim.stateHash(),raw=JSON.stringify(events),state=JSON.stringify(sim.snapshot());
  const ctx=options({cameraMode:'auto'});ctx.sim=sim;
  const plan=P.createAudioMixPlan(events,ctx),again=P.createAudioMixPlan(events,ctx);
  assert.deepEqual(plain(again),plain(plan));
  assert.equal(plan.events.length,events.length);assert.equal(plan.events[0].seq,0);
  assert.ok(plan.stats.offscreen>0&&plan.stats.audible>0);
  P.createAudioMixPlan(events,{...ctx,world:{w:900,h:1600}});
  assert.equal(sim.stateHash(),hash);assert.equal(JSON.stringify(events),raw);assert.equal(JSON.stringify(sim.snapshot()),state);
  assert.equal(new Set(plan.events.map(e=>e.seq)).size,events.length);
});
