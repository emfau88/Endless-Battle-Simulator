
/* SimCascade · Territory Wars — deterministic hex simulation, no dependencies.
   Unit accounting: production creates troops, dispatch moves them, attrition and
   local construction consume them. No ownership changes without arriving troops.
   Pointy axial hexes: radius 1; x = √3(q+r/2), z = 1.5r. */
(function (root) {
  'use strict';
  const TEAMS = Object.freeze([
    {id:0,name:'AZUR',color:'#36bfff',rgb:[.212,.749,1],title:'Die blaue Allianz'},
    {id:1,name:'EMBER',color:'#ff665c',rgb:[1,.4,.361],title:'Die rote Legion'},
    {id:2,name:'JADE',color:'#77d864',rgb:[.467,.847,.392],title:'Der grüne Bund'},
    {id:3,name:'SOLAR',color:'#f4c24e',rgb:[.957,.761,.306],title:'Das goldene Reich'}
  ]);
  const RULES = Object.freeze({step:.1,radius:7,bunkerCost:5,bunkerMinUnits:10,bunkerDefense:.60,hqDefense:.40,plainDefense:1,forestDefense:1.15,hillDefense:1.30,plainIncome:.22,forestIncome:.27,hillIncome:.20,outpostIncome:1.15,hqIncome:1.35,unitCap:100,hqCap:150});
  const PROFILES = Object.freeze({
    calm:Object.freeze({label:'Ruhiger Aufbau',filmTempo:.75,incomeMultiplier:.8,aggression:.25,offensiveInterval:6,marchDuration:2.8}),
    balanced:Object.freeze({label:'Gebietskrieg',filmTempo:.75,incomeMultiplier:1,aggression:.5,offensiveInterval:4,marchDuration:2.5}),
    intense:Object.freeze({label:'Intensive Front',filmTempo:1,incomeMultiplier:1.3,aggression:.8,offensiveInterval:2.5,marchDuration:2.2})
  });
  const DIRS = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
  const STARTS = [[-2,-4],[6,-4],[2,4],[-6,4]];
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const value=(v,fallback,min,max)=>Number.isFinite(Number(v))?clamp(Number(v),min,max):fallback;
  const normalizeConfig=(o={})=>({layout:o.layout==='portrait'?'portrait':'landscape',incomeMultiplier:value(o.incomeMultiplier,1,.5,2),aggression:value(o.aggression,.5,0,1),offensiveInterval:value(o.offensiveInterval,4,2,8),marchDuration:value(o.marchDuration,2.5,1.5,4)});
  class RNG { constructor(seed){this.s=seed>>>0;} next(){let t=this.s=(this.s+0x6d2b79f5)>>>0;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;} }
  const distance=(a,b)=>Math.max(Math.abs(a.q-b.q),Math.abs(a.r-b.r),Math.abs(a.q+a.r-b.q-b.r));
  class Sim {
    constructor(options={}) {this.config=normalizeConfig(typeof options==='number'?{}:options);this.reset(typeof options==='number'?options:(options.seed??42));}
    configure(changes={}){const old=this.config;this.config=normalizeConfig({...old,...changes,layout:old.layout});if(old.offensiveInterval!==this.config.offensiveInterval)for(const f of this.factions||[])f.nextOffensiveAt=Math.max(this.time,f.lastOffensiveAt+this.config.offensiveInterval);return {...this.config};}
    reset(seed=this.seed){
      this.seed=(Number(seed)||0)>>>0;this.rng=new RNG(this.seed^0x53ca11de);this.time=0;this.ticks=0;this.accumulator=0;this.phase='running';this.winner=null;this.moves=[];this.events=[];this.milestones=[];this.captureLogAt=[-100,-100,-100,-100];this.eventId=0;this.moveId=0;this.tiles=[];this.lookup=new Map();this.roundStats={captures:0,battles:0,bunkersBuilt:0,unitsProduced:0,unitsLost:0,constructionSpent:0,firstContact:null};
      const mapRand=new RNG(this.seed^0xa45f9211), terrainCache=new Map(),portrait=this.config.layout==='portrait';
      const halfU=portrait?6.25:12.8,halfV=portrait?17.25:8.7,angle=.16,ca=Math.cos(angle),sa=Math.sin(angle);
      this.mapBounds={halfU,halfV,angle};
      // Clip a regular axial lattice in camera-aligned axes. Format belongs to
      // the world configuration; resizing or reframing never regenerates it.
      for(let r=-18;r<=18;r++)for(let q=-28;q<=28;q++){
        const x=Math.sqrt(3)*(q+r/2),z=1.5*r,u=x*ca-z*sa,v=x*sa+z*ca;
        if(Math.abs(u)>halfU||Math.abs(v)>halfV||(Math.abs(u)>halfU-1.2&&Math.abs(v)>halfV-1.2))continue;
        const sign=q<0||(q===0&&r<0)?-1:1,key=`${q*sign},${r*sign}`;
        if(!terrainCache.has(key))terrainCache.set(key,mapRand.next());
        const n=terrainCache.get(key);let terrain=n<.23?'forest':n<.38?'hill':'plain';
        const sideRidge=Math.abs(u)>halfU-1.65&&Math.abs(v)>halfV*.18&&Math.abs(v)<halfV*.78;
        const endRidge=Math.abs(v)>halfV-1.55&&Math.abs(u)<halfU*.55;
        if((sideRidge&&n<.76)||endRidge)terrain='mountain';
        if(q===0&&r===0)terrain='outpost';
        const h=terrain==='mountain'?.57:.28;
        const t={id:this.tiles.length,q,r,x,z,terrain,height:h,owner:-1,units:terrain==='mountain'?0:terrain==='outpost'?9:terrain==='hill'?3:terrain==='forest'?2:1,hq:-1,bunker:false,neighbors:[],supplied:false,lastCapture:-100,lastBattle:-100,lastAttacker:-1,lastAttackAmount:0,cooldown:0,builtAt:-100};
        this.tiles.push(t);this.lookup.set(`${q},${r}`,t.id);
      }
      for(const t of this.tiles)t.neighbors=DIRS.map(([dq,dr])=>this.lookup.get(`${t.q+dq},${t.r+dr}`)).filter(id=>id!==undefined);
      // Preserve an open, connected continent instead of creating isolated
      // pockets with decorative edge mountains.
      this._connectMap();
      const desired=[[-.62,-.60],[.62,-.60],[.62,.60],[-.62,.60]];
      const starts=desired.map(([uu,vv])=>this.tiles.reduce((best,t)=>{const d=(t.x*ca-t.z*sa-uu*halfU)**2+(t.x*sa+t.z*ca-vv*halfV)**2,bd=(best.x*ca-best.z*sa-uu*halfU)**2+(best.x*sa+best.z*ca-vv*halfV)**2;return d<bd?t:best;}));
      const thinkOffsets=[.12,.25,.38,.51];for(let i=3;i>0;i--){const j=Math.floor(this.rng.next()*(i+1));[thinkOffsets[i],thinkOffsets[j]]=[thinkOffsets[j],thinkOffsets[i]];}
      this.factions=TEAMS.map((team,id)=>{
        const hq=starts[id];hq.hq=id;hq.terrain='plain';hq.height=.28;hq.owner=id;hq.units=24;
        for(const nid of hq.neighbors){const t=this.tiles[nid];t.terrain=t.terrain==='mountain'?'plain':t.terrain;t.height=.28;t.owner=id;t.units=4;}
        return {id,alive:true,hq:hq.id,thinkAt:thinkOffsets[id],goalAt:0,goal:-1,aggressionBias:.94+this.rng.next()*.12,pace:.63+this.rng.next()*.20,buildBias:this.rng.next(),captures:0,kills:0,eliminatedAt:null,focusTile:-1,focusUntil:0,lastOffensiveAt:-100,nextOffensiveAt:thinkOffsets[id]};
      });
      this._supply();this._event('start',-1,'Vier Hauptquartiere. Ein Kontinent.',this.lookup.get('0,0'));
      return this;
    }
    getTile(id){return this.tiles[id]||null;}
    _connectMap(){const home=this.lookup.get('0,0');for(let pass=0;pass<this.tiles.length;pass++){const reached=new Set([home]),queue=[home];for(let i=0;i<queue.length;i++)for(const n of this.tiles[queue[i]].neighbors)if(!reached.has(n)&&this.tiles[n].terrain!=='mountain'){reached.add(n);queue.push(n);}const isolated=this.tiles.find(t=>t.terrain!=='mountain'&&!reached.has(t.id));if(!isolated)return;const pathQueue=[isolated.id],prev=new Map([[isolated.id,-1]]);let end=-1;for(let i=0;i<pathQueue.length&&end<0;i++)for(const n of this.tiles[pathQueue[i]].neighbors){if(prev.has(n))continue;prev.set(n,pathQueue[i]);if(reached.has(n)){end=n;break;}pathQueue.push(n);}if(end<0)return;for(let n=end;n>=0;n=prev.get(n)){const t=this.tiles[n];if(t.terrain==='mountain'){t.terrain='plain';t.height=.28;t.units=1;}}}}
    defense(t){if(typeof t==='number')t=this.tiles[t];if(!t||t.terrain==='mountain')return Infinity;return (t.terrain==='forest'?RULES.forestDefense:t.terrain==='hill'?RULES.hillDefense:RULES.plainDefense)+(t.bunker?RULES.bunkerDefense:0)+(t.hq>=0?RULES.hqDefense:0);}
    income(t){if(typeof t==='number')t=this.tiles[t];if(!t||t.owner<0||!t.supplied||t.terrain==='mountain')return 0;return (t.hq>=0?RULES.hqIncome:t.terrain==='outpost'?RULES.outpostIncome:t.terrain==='forest'?RULES.forestIncome:t.terrain==='hill'?RULES.hillIncome:RULES.plainIncome)*this.config.incomeMultiplier;}
    cap(t){return t.hq>=0?RULES.hqCap:RULES.unitCap;}
    _event(type,team,text,tile,extra={}){const e={id:++this.eventId,time:this.time,type,team,text,tile,...extra};this.events.unshift(e);if(this.events.length>36)this.events.length=36;if(type!=='capture'){this.milestones.unshift(e);if(this.milestones.length>24)this.milestones.length=24;}return e;}
    _supply(){
      for(const t of this.tiles)t.supplied=false;
      for(const f of this.factions){if(!f.alive)continue;const home=this.tiles[f.hq];if(home.owner!==f.id)continue;const queue=[home.id];home.supplied=true;for(let i=0;i<queue.length;i++)for(const n of this.tiles[queue[i]].neighbors){const t=this.tiles[n];if(t.owner===f.id&&!t.supplied){t.supplied=true;queue.push(n);}}}
    }
    stats(){return this.factions.map(f=>{const cells=this.tiles.filter(t=>t.owner===f.id);const moving=this.moves.filter(m=>m.owner===f.id).reduce((s,m)=>s+m.amount,0);return {id:f.id,name:TEAMS[f.id].name,color:TEAMS[f.id].color,tiles:cells.length,units:cells.reduce((s,t)=>s+t.units,0)+moving,moving,income:cells.reduce((s,t)=>s+this.income(t),0),bunkers:cells.filter(t=>t.bunker).length,alive:f.alive,hq:f.hq,supplied:cells.filter(t=>t.supplied).length,captures:f.captures};});}
    step(dt){if(this.phase!=='running'||!Number.isFinite(dt)||dt<=0)return;this.accumulator+=dt;while(this.accumulator>=RULES.step-1e-9&&this.phase==='running'){this.accumulator-=RULES.step;this._tick();}}
    _tick(){
      this.ticks++;this.time=this.ticks*RULES.step;
      for(const t of this.tiles){if(t.owner>=0&&t.supplied){const gain=Math.min(this.income(t)*RULES.step,this.cap(t)-t.units);if(gain>0){t.units+=gain;this.roundStats.unitsProduced+=gain;}}}
      const arrived=this.moves.filter(m=>m.start+m.duration<=this.time+1e-8).sort((a,b)=>a.start+a.duration-b.start-b.duration||a.id-b.id);
      this.moves=this.moves.filter(m=>m.start+m.duration>this.time+1e-8);
      for(const m of arrived){if(this.factions[m.owner].alive)this._arrive(m);else this.roundStats.unitsLost+=m.amount;}
      if(arrived.length)this._supply();
      // The initial think offsets are seeded, and each faction keeps its own
      // clock; processing order rotates every tick to avoid a fixed first mover.
      for(let k=0;k<4;k++){const f=this.factions[(k+this.ticks)%4];if(f.alive&&this.time>=f.thinkAt){this._think(f);f.thinkAt=this.time+f.pace;}}
      const alive=this.factions.filter(f=>f.alive);
      if(alive.length===1){this.winner=alive[0].id;this.phase='finished';this._event('victory',this.winner,`${TEAMS[this.winner].name} vereint die vier Reiche.`,alive[0].hq);}
    }
    _dispatch(from,to,owner,amount,kind){
      const a=this.tiles[from],b=this.tiles[to];amount=Math.floor(amount);
      if(amount<1||a.owner!==owner||amount>a.units||!a.neighbors.includes(to)||b.terrain==='mountain')return false;
      a.units-=amount;a.cooldown=this.time+Math.max(1.1,Math.min(2.6,this.config.offensiveInterval*.5));
      this.moves.push({id:++this.moveId,owner,from,to,amount,start:this.time,duration:this.config.marchDuration+(b.terrain==='hill'?.20:b.terrain==='forest'?.1:0),kind:kind||(b.owner===owner?'supply':'attack')});return true;
    }
    _arrive(m){
      const t=this.tiles[m.to];
      if(t.owner===m.owner){t.units+=m.amount;return;}
      t.lastBattle=this.time;t.lastAttacker=m.owner;t.lastAttackAmount=m.amount;
      const previous=t.owner,def=this.defense(t),power=t.units*def;
      if(previous>=0){this.roundStats.battles++;if(this.roundStats.firstContact===null){this.roundStats.firstContact=this.time;this._event('contact',m.owner,`Erster Frontkontakt: ${TEAMS[m.owner].name} trifft ${TEAMS[previous].name}.`,t.id);}}
      if(m.amount>power+1e-8){
        const lost=power+t.units;this.roundStats.unitsLost+=lost;this.factions[m.owner].kills+=t.units;
        t.owner=m.owner;t.units=Math.max(0,m.amount-power);t.lastCapture=this.time;t.cooldown=this.time+.65;
        this.roundStats.captures++;this.factions[m.owner].captures++;
        if(t.hq>=0&&t.hq!==m.owner){const fallen=t.hq;t.hq=-1;t.bunker=false;this._eliminate(fallen,m.owner,t.id);}
        else if(t.terrain==='outpost')this._event('outpost',m.owner,`${TEAMS[m.owner].name} erobert die zentrale Zitadelle.`,t.id,{previous});
        else if(previous>=0&&this.time-this.captureLogAt[m.owner]>4){this.captureLogAt[m.owner]=this.time;this._event('capture',m.owner,`${TEAMS[m.owner].name} durchbricht die Front von ${TEAMS[previous].name}.`,t.id,{previous});}
      }else{
        const defendersLost=Math.min(t.units,m.amount/def);t.units=Math.max(0,t.units-defendersLost);this.roundStats.unitsLost+=m.amount+defendersLost;this.factions[m.owner].kills+=defendersLost;
      }
    }
    _eliminate(id,by,tile){
      const f=this.factions[id];if(!f.alive)return;f.alive=false;f.eliminatedAt=this.time;
      for(const t of this.tiles)if(t.owner===id){t.owner=-1;t.supplied=false;this.roundStats.unitsLost+=Math.max(0,t.units-3);t.units=Math.min(3,t.units);t.hq=-1;t.bunker=false;t.lastCapture=this.time;}
      for(const m of this.moves)if(m.owner===id)this.roundStats.unitsLost+=m.amount;
      this.moves=this.moves.filter(m=>m.owner!==id);this._event('hq',by,`${TEAMS[by].name} nimmt das Hauptquartier von ${TEAMS[id].name}.`,tile,{eliminated:id});
    }
    _think(f){
      const owned=this.tiles.filter(t=>t.owner===f.id),home=this.tiles[f.hq],cfg=this.config;
      if(!owned.length)return;
      const aggression=clamp(cfg.aggression*f.aggressionBias,0,1),batch=Math.round(10-4*aggression);
      if(this.time>=f.goalAt||f.goal<0||!this.factions[f.goal].alive){
        const stats=this.stats();let best=Infinity,goal=-1;
        for(const e of this.factions){if(!e.alive||e.id===f.id)continue;const nearest=Math.min(...owned.map(t=>distance(t,this.tiles[e.hq]))),s=nearest+stats[e.id].units*.007+stats[e.id].tiles*.025+this.rng.next()*2.8;if(s<best){best=s;goal=e.id;}}
        f.goal=goal;f.goalAt=this.time+12+this.rng.next()*6;
      }
      const goal=f.goal>=0?this.tiles[this.factions[f.goal].hq]:home;
      const pending=new Map();for(const m of this.moves)if(m.owner===f.id)pending.set(m.to,(pending.get(m.to)||0)+m.amount);
      const enemyFront=t=>t.neighbors.some(n=>this.tiles[n].owner>=0&&this.tiles[n].owner!==f.id);
      const frontier=owned.filter(t=>t.neighbors.some(n=>this.tiles[n].terrain!=='mountain'&&this.tiles[n].owner!==f.id));
      // The existing local bunker investment competes with the same troops.
      const maxBunkers=Math.min(7,Math.floor(owned.length/6)),count=owned.filter(t=>t.bunker).length;
      if(this.time>15&&count<maxBunkers&&this.rng.next()<.16){
        const candidates=frontier.filter(t=>!t.bunker&&t.hq<0&&t.units>=14&&enemyFront(t));
        candidates.sort((a,b)=>b.units-a.units||a.id-b.id);
        if(candidates.length){const t=candidates[0];t.units-=RULES.bunkerCost;t.bunker=true;t.builtAt=this.time;this.roundStats.bunkersBuilt++;this.roundStats.constructionSpent+=RULES.bunkerCost;this._event('build',f.id,`${TEAMS[f.id].name} befestigt die Front. −5 Einheiten.`,t.id);}
      }
      const reserve=t=>t.hq>=0?Math.ceil(7+(1-aggression)*7+Math.min(4,this.time*.025)):enemyFront(t)?Math.ceil(2+(1-aggression)*3):1;
      const targets=new Map();
      for(const a of frontier)for(const n of a.neighbors){const b=this.tiles[n];if(b.terrain==='mountain'||b.owner===f.id)continue;if(!targets.has(n))targets.set(n,[]);targets.get(n).push(a);}
      const options=[];
      for(const [id,allSources] of targets){
        const t=this.tiles[id],incoming=pending.get(id)||0,def=t.units*this.defense(t),need=Math.ceil(Math.max(0,def-incoming)*(1.34-.42*aggression)+2);
        const covered=incoming>=def+1;
        const minGroup=t.owner>=0?batch:Math.max(5,batch-2);
        const sources=allSources.filter(a=>a.cooldown<=this.time&&Math.floor(a.units-reserve(a))>=minGroup);
        const available=sources.reduce((sum,a)=>sum+Math.floor(a.units-reserve(a)),0);
        const potential=allSources.reduce((sum,a)=>sum+Math.max(0,Math.floor(a.units-reserve(a))),0);
        const enemy=t.owner>=0;
        const score=(enemy?7:3)+(t.hq>=0?20:0)+(t.terrain==='outpost'?5:0)-distance(t,goal)*.42-def*.05+this.rng.next()*.9;
        options.push({id,sources,score,need,available,potential,minGroup,covered});
      }
      options.sort((a,b)=>b.score-a.score||a.id-b.id);
      // One sustained, visible objective per faction. Its adjacent own fields
      // become the gathering points for genuine, locally conserved strength.
      let focus=options.find(o=>o.id===f.focusTile);
      const marchingToFocus=this.moves.some(m=>m.owner===f.id&&m.kind==='attack'&&m.to===f.focusTile&&this.tiles[m.to].owner!==f.id);
      if(!focus&&marchingToFocus)focus={id:f.focusTile,sources:[],available:0,potential:0,need:Infinity,minGroup:batch,covered:true};
      if(!focus||(this.time>=f.focusUntil&&!marchingToFocus)){
        focus=options.find(o=>!o.covered&&o.available>=Math.max(o.need,o.minGroup))||options.find(o=>!o.covered&&o.potential+8>=o.need)||options.find(o=>!o.covered)||options[0];
        f.focusTile=focus?focus.id:-1;f.focusUntil=this.time+Math.max(8,cfg.offensiveInterval*2);
      }
      if(focus&&!focus.covered&&this.time>=f.nextOffensiveAt&&focus.available>=Math.max(focus.need,focus.minGroup)){
        const t=this.tiles[focus.id],sources=[...focus.sources].sort((a,b)=>b.units-a.units||a.id-b.id);
        let required=Math.min(focus.available,Math.max(focus.need,focus.minGroup,Math.floor(focus.available*(t.owner>=0?.80+.18*aggression:.56+.18*aggression))));
        const plan=[];
        for(const a of sources){if(required<=0)break;const available=Math.floor(a.units-reserve(a)),amount=Math.min(available,Math.max(focus.minGroup,required));if(amount<focus.minGroup)continue;plan.push({from:a.id,amount});required-=amount;}
        if(required<=0&&plan.length){
          for(const order of plan)this._dispatch(order.from,focus.id,f.id,order.amount,'attack');
          f.lastOffensiveAt=this.time;f.nextOffensiveAt=this.time+cfg.offensiveInterval;
          f.focusUntil=Math.max(f.focusUntil,this.time+cfg.marchDuration+.6);
        }
      }
      // Batched reinforcements flow only through owned fields. The target bias
      // keeps supply feeding the chosen front without teleporting units.
      const focusTile=this.tiles[f.focusTile],dist=new Map(owned.map(t=>[t.id,Infinity])),queue=[];
      for(const t of frontier){const priority=distance(t,focusTile||goal)*.55+(enemyFront(t)?-.8:.6);dist.set(t.id,priority);queue.push(t.id);}
      while(queue.length){let bi=0;for(let i=1;i<queue.length;i++)if(dist.get(queue[i])<dist.get(queue[bi]))bi=i;const id=queue.splice(bi,1)[0],d=dist.get(id);for(const n of this.tiles[id].neighbors){const t=this.tiles[n];if(t.owner!==f.id)continue;if(d+1<dist.get(n)-1e-8){dist.set(n,d+1);queue.push(n);}}}
      for(const a of owned){
        if(a.cooldown>this.time)continue;const available=Math.floor(a.units-reserve(a));if(available<batch)continue;
        let best=null,bestD=dist.get(a.id);
        for(const n of a.neighbors){const b=this.tiles[n];if(b.owner!==f.id)continue;const d=dist.get(n);if(d<bestD-1e-8){bestD=d;best=b;}}
        if(best){const amount=Math.max(batch,Math.floor(available*.90));this._dispatch(a.id,best.id,f.id,Math.min(available,amount),'supply');}
      }
    }
    hash(){let h=2166136261;const mix=v=>{h^=v;h=Math.imul(h,16777619);};mix(this.seed);mix(this.ticks);for(const t of this.tiles){mix(t.owner+1);mix(Math.round(t.units*1e6));mix(t.bunker?1:0);}for(const m of this.moves){mix(m.owner);mix(m.from);mix(m.to);mix(m.amount);}return (h>>>0).toString(16).padStart(8,'0');}
  }
  root.HexSim={Sim,TEAMS,RULES,PROFILES,DIRS,STARTS,distance};
})(typeof globalThis!=='undefined'?globalThis:this);

