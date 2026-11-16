(function () {
'use strict';
const WP = (EBS.Waterpark = EBS.Waterpark || {}), DT = 1/60;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const hash = (...parts) => { let h=2166136261; const s=parts.join('|'); for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);} return h>>>0; };
const random = (...parts) => hash(...parts)/4294967296;
const MODES = new Set(['pool','lift','platform','route','gather']);
class Simulation {
  constructor({seed=42,params={},world={w:1920,h:1080},timeScale=1,video={durationSec:600}}={}) {
    this.seed=seed>>>0; this.cfg={mode:'day',animals:16,size:24,speed:1,beltSpeed:1,rollSpeed:1,current:1,
      route0:true,route1:true,route2:true,route3:true,dayCycle:true,ending:'quiet',decoDensity:1,ufo:true,balloon:true,birds:true,shootingStars:true,fish:true,emotes:true,...params};
    this.world=world; this.video=video; this.timeScale=timeScale||1; this.L=WP.createLayout(world,this.cfg.size);
    this.step=0; this.t=0; this.videoTime=0; this.events=new Array(1024); this.eventSeq=0; this.recent=[]; this.decorations=[];
    this.rides=0; this.routeRides=[0,0,0,0]; this.animals=[]; this.lastDispatch=-99; this.lastLift=-99;this.gatherCount=0;
    this.landingReservations=[null,null,null,null];
    this.seesawAngle=0; this.seesawState='ready'; this.seesawResetUntil=0; this.finishedAt=null;
    this.preflight=WP.preflight({params:this.cfg,video,world,timeScale}); this.timing={...this.preflight};
    this.story=WP.storyState(this.cfg,this.video,0,this.timing); this.previousOpen=[...this.story.openRoutes];
    this._decoSlots={major:-1,fish:-1,emote:-1}; this._pendingGuest=null; this._forcedUfo=false; this._showStarted=false;
    const n=this.cfg.mode==='short'?4:clamp(Math.round(this.cfg.animals/4)*4,4,24), L=this.L;this.expectedAnimals=n;
    const shift=hash('routes',this.seed)%4;
    for(let i=0;i<n;i++) this.animals.push({id:i,kind:i%4,state:this.cfg.mode==='short'?'platform':'pool',
      route:(i+shift)%4,s:this.cfg.mode==='short'?Math.max(0,L.platformPath.length-i*L.GAP):L.pool.path.length*(1-(i+.5)/n),
      v:0,laps:0,launchAt:.4+i*2,done:false,routeHistory:[],gatherPath:null});
    this._refreshStory();
  }
  setParam(key,value) { this.cfg[key]=value;this._refreshStory(); }
  _list(state,route) { return this.animals.filter(b=>b.state===state&&(route==null||b.route===route)).sort((a,b)=>(b.s-a.s)||(a.id-b.id)); }
  _emit(type,x,y,c=-1,p=1) {
    const e={seq:this.eventSeq,step:this.step,t:this.videoTime,type,x,y,c,p};
    this.events[this.eventSeq%this.events.length]=e; this.eventSeq++; this.recent.push(e);
    if(this.recent.length>72)this.recent.shift();
  }
  _refreshStory() {
    this.story=WP.storyState(this.cfg,this.video,this.step,this.timing);
    const all=this.animals.every(b=>b.state==='gather'&&b.done);
    if(this.cfg.mode!=='relax'&&all&&this.finishedAt==null)this.finishedAt=this.videoTime;
    this.story.finished=this.finishedAt!=null;
    this.story.settled=all; this.story.finishedAt=this.finishedAt;
    this.story.show=this.story.show&&all;
    this.story.phase=all&&this.cfg.mode!=='relax'?(this.story.show?'show':'rest'):this.story.phase;
  }
  _routeFree(id) {
    const row=this._list('route',id);
    if(id!==0&&row.length)return false;
    if(id===2&&this.t<this.seesawResetUntil)return false;
    return !row.length||row[row.length-1].s>this.L.GAP*1.3;
  }
  _chooseRoute(b) {
    if(this.cfg.mode==='short')return this._routeFree(b.route)?b.route:-1;
    const preferred=(b.id+b.laps+(hash('route-choice',this.seed,b.id,b.laps)>>>30))%4;
    for(let k=0;k<4;k++){const r=(preferred+k)%4;if(this.story.openRoutes[r]&&this._routeFree(r))return r;}
    return -1;
  }
  _poolHasSpace(s,ignore,clearance=this.L.GAP) {
    return this.animals.every(b=>b===ignore||b.state!=='pool'||Math.abs(b.s-s)>=clearance);
  }
  _gather(b,from) {
    b.state='gather'; b.s=0; b.v=0; b.done=false;
    if(this.cfg.mode==='short') {
      // Four separate landing bays retain their four guests: no crossing through an already resting friend.
      b.gatherPath=WP.makePath([{points:[[from.x,from.y],[from.x,from.y+(this.L.land?78:125)]],smooth:false,kind:'pool'}]);
      b.gatherTarget=b.gatherPath.length;
    } else {
      b.gatherPath=this.L.gather.path;b.gatherTarget=b.gatherPath.length-this.gatherCount*this.L.GAP;this.gatherCount++;
    }
  }
  _arrive(b) {
    const r=this.L.routes[b.route]; b.laps++; this.rides++; this.routeRides[b.route]++;
    this.landingReservations[b.route]=null;
    this._emit('splash',r.end[0],r.end[1],b.kind,Math.max(.25,b.v/230));
    if(this.cfg.mode==='short')this._gather(b,{x:r.end[0],y:r.end[1]});
    else {b.state='pool';b.s=this.L.pool.joinS[b.route];b.v=150;}
  }
  stepOnce() {
    this.step++; this.videoTime=this.step/60;
    const cfg=this.cfg,L=this.L,dt=DT*this.timeScale*Math.max(.05,cfg.speed); this.t+=dt;
    this._refreshStory();
    for(let i=0;i<4;i++)if(this.story.openRoutes[i]&&!this.previousOpen[i])this._emit('open',L.origin[0],L.origin[1],i);
    this.previousOpen=[...this.story.openRoutes];
    // Returned animals keep moving to the visible lift inlet. Closing redirects that same inlet to the lagoon.
    let ahead=null;
    for(const b of this._list('pool')) {
      let cap=ahead?ahead.s-L.GAP:L.pool.path.length;const old=b.s;
      for(let i=0;i<4;i++)if(this.landingReservations[i]!=null){const stop=L.pool.joinS[i]-L.GAP*2.5;if(b.s<=stop+1e-7)cap=Math.min(cap,stop);}
      b.s=Math.min(cap,b.s+170*cfg.current*dt); b.v=Math.max(0,(b.s-old)/dt);
      if(!ahead&&b.s>=L.pool.path.length-1e-7) {
        if(this.story.closing) {
          const parking=this._list('gather'),last=parking[parking.length-1];
          if(!last||last.s>=L.GAP){this._gather(b,L.pool.pickup);continue;}
        }
        const lift=this._list('lift'), last=lift[lift.length-1];
        if(!this.story.closing&&(!last||last.s>=L.GAP)&&this.t-this.lastLift>=L.GAP/(180*cfg.beltSpeed)) {
          b.state='lift';b.s=0;b.v=0;this.lastLift=this.t;this._emit('scoop',L.lift.x,L.lift.bottom,b.kind);continue;
        }
      }
      ahead=b;
    }
    // Lift passengers are allowed to finish after closing; only intake is stopped.
    ahead=null;
    for(const b of this._list('lift')) {
      const cap=ahead?ahead.s-L.GAP:L.lift.path.length, old=b.s;
      b.s=Math.min(cap,b.s+180*cfg.beltSpeed*dt);b.v=Math.max(0,(b.s-old)/dt);
      if(!ahead&&b.s>=L.lift.path.length-1e-7){
        const platform=this._list('platform'),last=platform[platform.length-1];
        if(!last||last.s>=L.GAP){b.state='platform';b.s=0;b.v=0;this._emit('tip',L.lift.x,L.lift.top,b.kind);continue;}
      }
      ahead=b;
    }
    ahead=null;
    for(const b of this._list('platform')) {
      const cap=ahead?ahead.s-L.GAP:L.platformPath.length, old=b.s;
      b.s=Math.min(cap,b.s+210*dt);b.v=Math.max(0,(b.s-old)/dt);
      if(!ahead&&b.s>=L.platformPath.length-1e-7&&this.t-this.lastDispatch>=.65&&
          (cfg.mode!=='short'||this.videoTime>=b.launchAt)) {
        const route=this._chooseRoute(b);
        if(route>=0){b.state='route';b.route=route;b.s=0;b.v=190;b.routeHistory.push(route);if(b.routeHistory.length>12)b.routeHistory.shift();
          this.lastDispatch=this.t;this._emit('slide',L.origin[0],L.origin[1],b.kind);continue;}
      }
      ahead=b;
    }
    this.seesawAngle=0;this.seesawState=this.t<this.seesawResetUntil?'returning':'ready';
    for(let id=0;id<4;id++) {
      ahead=null;const r=L.routes[id];
      for(const b of this._list('route',id)) {
        const q=WP.samplePath(r.path,b.s),profile=q.kind==='seesaw'?.65:q.kind==='flight'?1.15:q.kind==='funnel'?.95:1+.6*Math.max(0,q.ty);
        const target=190*cfg.rollSpeed*profile;
        const acceleration=240*cfg.rollSpeed*dt;
        const speed=b.v+clamp(target-b.v,-acceleration,acceleration);
        const old=b.s;let cap=ahead?ahead.s-L.GAP:r.path.length;
        // Reserve a real landing gap before the last descent, and before launching a jump.
        // Water guests upstream wait outside that gap until the arriving guest joins their lane.
        if(cfg.mode!=='short'){
          const gate=id===3?Math.max(0,r.feature.entryS-L.R):Math.max(0,r.path.length-L.GAP*4);
          if(b.s+speed*dt>=gate&&this.landingReservations[id]!==b.id){
            const adjacentBay=this.landingReservations.some((owner,j)=>j!==id&&owner!=null&&Math.abs(L.pool.joinS[j]-L.pool.joinS[id])<L.GAP*2.5);
            if(!adjacentBay&&this.landingReservations[id]==null&&this._poolHasSpace(L.pool.joinS[id],b,L.GAP*2.5))this.landingReservations[id]=b.id;
            else cap=Math.min(cap,gate);
          }
        }
        b.s=Math.min(cap,b.s+speed*dt);b.v=Math.max(0,(b.s-old)/dt);
        const f=r.feature;
        if(f&&old<f.entryS&&b.s>=f.entryS)this._emit(id===1?'funnel':id===2?'seesaw':'spring',f.x,f.y,b.kind);
        if(id===2&&b.s>=f.entryS&&b.s<=f.exitS){const u=(b.s-f.entryS)/(f.exitS-f.entryS);this.seesawAngle=f.maxAngle*Math.sin(Math.PI*u);this.seesawState=u<.2?'loaded':u<.8?'tipping':'returning';}
        if(id===2&&old<f.exitS&&b.s>=f.exitS)this.seesawResetUntil=this.t+.6;
        if(b.s>=r.path.length-1e-7&&(cfg.mode==='short'||this._poolHasSpace(L.pool.joinS[id],b))){this._arrive(b);continue;}
        ahead=b;
      }
    }
    ahead=null;
    for(const b of this._list('gather')) {
      const old=b.s,cap=cfg.mode==='short'||!ahead?b.gatherTarget:Math.min(b.gatherTarget,ahead.s-L.GAP);
      b.s=Math.min(cap,b.s+190*cfg.current*dt);b.v=Math.max(0,(b.s-old)/dt);
      if(!b.done&&b.s>=b.gatherTarget-1e-7){b.done=true;const q=this.pose(b);this._emit('cheer',q.x,q.y,b.kind,.35);}
      ahead=b;
    }
    this._refreshStory(); this._updateDecorations();
    this.recent=this.recent.filter(e=>this.videoTime-e.t<4);
  }
  pose(b) {
    const L=this.L;let q,mode='pool',angle=0;
    if(b.state==='lift'){q=WP.samplePath(L.lift.path,b.s);mode='lift';}
    else if(b.state==='platform'){q=WP.samplePath(L.platformPath,b.s);mode='lift';}
    else if(b.state==='route'){
      const r=L.routes[b.route];q=WP.samplePath(r.path,b.s);mode=q.kind==='flight'?'fall':'roll';
      angle=q.kind==='funnel'?.22*Math.sin(b.s/L.R):b.s/L.R;
      if(q.kind==='seesaw'){const offset=b.s-r.feature.entryS-r.feature.length/2;q.x=r.feature.x+Math.cos(this.seesawAngle)*offset;q.y=r.feature.y+Math.sin(this.seesawAngle)*offset;angle=this.seesawAngle;}
      if(b.s>=r.path.length-1e-7){mode='pool';angle=0;}
    } else if(b.state==='gather')q=WP.samplePath(b.gatherPath,b.s);
    else q=WP.samplePath(L.pool.path,b.s);
    return {x:q.x,y:q.y,angle,ang:angle,mode,speed:b.v,look:[q.tx,q.ty]};
  }
  _addDecoration(type,duration,extra={}) {
    const e={type,start:this.videoTime,duration,seed:hash(type,this.seed,this.step),...extra};this.decorations.push(e);
    const audio={ufo:'ufo',balloon:null,birds:'chirp',shootingStars:'twinkle',fish:'fish',emote:'emote',firework:'firework'}[type];
    if(audio)this._emit(audio,e.x==null?this.L.W*.7:e.x,e.y==null?this.L.H*.18:e.y,e.id==null?-1:this.animals[e.id].kind,.4);
  }
  _updateDecorations() {
    const cfg=this.cfg,L=this.L,t=this.videoTime,d=Math.max(0,Number(cfg.decoDensity)||0);
    this.decorations=this.decorations.filter(e=>t<e.start+e.duration);
    if(this.story.show&&!this._showStarted){this._showStarted=true;this._emit('cheer',L.W*.5,L.waterY,-1,.5);}
    if(this.story.show&&cfg.fireworks){const k=Math.floor((t-this.story.finaleAt)/2);if(k>=0&&k<3&&this._fireworkIndex!==k){this._fireworkIndex=k;const x=L.W*(.3+.2*k),y=L.H*(.16+.03*(k%2));this._emit('launch',x,L.waterY,k,.4);this._addDecoration('firework',2,{x,y});}}
    if(!d)return;
    const nearOpening=this.previousOpen.some((v,i)=>v&&this.recent.some(e=>e.type==='open'&&e.c===i&&t-e.t<3));
    const flying=this.animals.some(b=>b.state==='route'&&b.route===3&&b.s>=L.jump.entryS);
    const calm=!flying&&!nearOpening&&!this.story.show&&(!this.story.closing||cfg.mode==='short');
    const interval=(cfg.mode==='relax'?170:125)/d,slot=Math.floor(Math.max(0,t-12)/interval);
    if(t>=12&&slot>this._decoSlots.major){
      this._decoSlots.major=slot;
      if(cfg.mode!=='short'||slot===0){const choices=this.story.night>.5?['ufo','shootingStars']:['balloon','birds','ufo'];
        const allowed=choices.filter(k=>cfg[k]);
        if(allowed.length)this._pendingGuest={type:allowed[hash(this.seed,'guest',slot)%allowed.length],at:t,expires:t+8};}
    }
    if(cfg.mode==='day'&&cfg.ufo&&!this._forcedUfo&&t>=this.story.duration*.68){this._forcedUfo=true;this._pendingGuest={type:'ufo',at:t,expires:t+16};}
    if(this._pendingGuest){if(t>this._pendingGuest.expires||!cfg[this._pendingGuest.type])this._pendingGuest=null;
      else if(calm&&!this.decorations.some(e=>['ufo','balloon','birds','shootingStars'].includes(e.type))){const type=this._pendingGuest.type;this._addDecoration(type,type==='shootingStars'?2.4:9);this._pendingGuest=null;}}
    for(const type of ['fish','emote']) {
      if(!cfg[type==='emote'?'emotes':'fish'])continue;
      const period=(type==='fish'?19:13)/d, k=Math.floor(t/period);
      if(k>this._decoSlots[type]){this._decoSlots[type]=k;if(k>0&&!this.story.show){
        if(type==='fish')this._addDecoration('fish',1.2,{x:L.W*(.12+random(this.seed,'fish',k)*.2),y:L.H*.89});
        else{const id=hash(this.seed,'emote',k)%this.animals.length,q=this.pose(this.animals[id]);this._addDecoration('emote',2,{id,x:q.x,y:q.y});}
      }}
    }
  }
  snapshot() {
    const counts={pool:0,lift:0,platform:0,route:0,gather:0};for(const b of this.animals)counts[b.state]++;
    return {t:this.t,videoTime:this.videoTime,animals:this.animals.length,counts,rides:this.rides,routeRides:[...this.routeRides],
      minLaps:Math.min(...this.animals.map(b=>b.laps)),maxLaps:Math.max(...this.animals.map(b=>b.laps)),phase:this.story.phase,finished:this.story.finished,
      summary:this.story.finished?'Alle Tiere sind in der Lagune.':`${this.rides} Fahrten · ${counts.route} auf den Rutschen`,preflight:this.preflight};
  }
  checkInvariants() {
    const errors=[],ids=new Set();
    if(this.animals.length!==this.expectedAnimals)errors.push('Tierzahl hat sich verändert');
    for(const b of this.animals){if(ids.has(b.id))errors.push('Doppelte Tier-ID');ids.add(b.id);
      if(!MODES.has(b.state))errors.push('Unbekannter Zustand');
      if(!Number.isFinite(b.s)||b.s<-.001||!Number.isFinite(b.v))errors.push(`Ungültige Position von Tier ${b.id}`);
      const path=b.state==='pool'?this.L.pool.path:b.state==='lift'?this.L.lift.path:b.state==='platform'?this.L.platformPath:b.state==='route'?this.L.routes[b.route]?.path:b.gatherPath;
      if(!path||b.s>path.length+.001)errors.push(`Tier ${b.id} liegt außerhalb seines Wegs`);
      if(b.kind<0||b.kind>3||!Number.isInteger(b.kind)||b.laps<0||!Number.isInteger(b.laps))errors.push('Ungültige Tierart oder Fahrtenzahl');
      const q=this.pose(b);if(!Number.isFinite(q.x)||!Number.isFinite(q.y))errors.push('Ungültige Darstellung');
    }
    for(const state of ['pool','lift','platform',...(this.cfg.mode==='short'?[]:['gather'])]){const row=this._list(state);for(let i=1;i<row.length;i++)if(row[i-1].s-row[i].s<this.L.GAP-1e-4)errors.push(`Abstand in ${state} zu klein`);}
    for(let route=0;route<4;route++){const row=this._list('route',route);for(let i=1;i<row.length;i++)if(row[i-1].s-row[i].s<this.L.GAP-1e-4)errors.push('Rutschenabstand zu klein');if(route&&row.length>1)errors.push('Attraktion doppelt belegt');}
    const pool=this._list('pool');for(const b of this._list('route'))if(this.L.routes[b.route].path.length-b.s<this.L.GAP*3){const p=this.pose(b);for(const other of pool){const q=this.pose(other);if(Math.hypot(p.x-q.x,p.y-q.y)<this.L.R*2-.1)errors.push('Landebucht durch ein schwimmendes Tier belegt');}}
    const parking=this._list('gather');for(let i=0;i<parking.length;i++)for(let j=i+1;j<parking.length;j++){const p=this.pose(parking[i]),q=this.pose(parking[j]);if(Math.hypot(p.x-q.x,p.y-q.y)<this.L.R*2-.1)errors.push('Tiere überlappen beim Sammeln');}
    if(this.rides!==this.animals.reduce((s,b)=>s+b.laps,0))errors.push('Fahrtenzähler stimmt nicht');
    return {ok:errors.length===0,errors};
  }
  stateHash() {
    return hash(JSON.stringify({step:this.step,t:+this.t.toFixed(6),rides:this.rides,lastDispatch:this.lastDispatch,seesawResetUntil:this.seesawResetUntil,landingReservations:this.landingReservations,
      animals:this.animals.map(b=>[b.id,b.kind,b.state,b.route,+b.s.toFixed(6),+b.v.toFixed(6),b.laps,b.done])})).toString(16).padStart(8,'0');
  }
  destroy() {this.decorations.length=0;this.recent.length=0;this.events.length=0;}
}
WP.Simulation=Simulation;
WP.createExportPlan=function(cfg,world) {
  const p=WP.preflight({params:cfg.params,video:cfg.video,world,timeScale:cfg.video.tempo});
  if(!p.ok)throw new Error('Wasserpark: '+p.errors.join(' '));
  if(cfg.params.mode==='relax')return{advance:()=>({done:true,durationSec:cfg.video.durationSec})};
  const sim=new Simulation({seed:cfg.seed,params:cfg.params,video:cfg.video,world,timeScale:cfg.video.tempo}),steps=Math.round(cfg.video.durationSec*60);
  return {advance(){const stop=Math.min(steps,sim.step+1800);while(sim.step<stop)sim.stepOnce();
    if(sim.step<steps)return{done:false,progress:sim.step/steps};
    const check=sim.checkInvariants();if(!check.ok)throw new Error('Wasserpark-Vorprüfung: '+check.errors.join('; '));
    if(!sim.story.finished||sim.finishedAt>cfg.video.durationSec-2)throw new Error('Wasserpark: Die Tiere erreichen bei diesem Tempo das Schlussbild nicht rechtzeitig. Bitte Dauer oder Tempo erhöhen bzw. weniger Tiere wählen.');
    return{done:true,durationSec:cfg.video.durationSec};}};
};
})();
