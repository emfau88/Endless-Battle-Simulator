/* Hex Dominion V0.3 labels, garrisons, highlighted marches and routes.
 * Functions below retain the original presentation algorithms. Their history is
 * owned by the renderer, never by gameplay; fixed ticks observe every march. */
(function () {
  'use strict';
  EBS.Territory.createOverlay = function (labels, view) {
    const ctx=labels.getContext('2d'), TEAMS=HexSim.TEAMS;
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    let sim, accum=0, size={w:1,h:1,dpr:1}, outputFormat='landscape';
    let selected=null, hover=null, garrisonMode='front';
    const frontUntil=new Map(), importantMoves=new Map();
    let observedMoveId=0, overlayTick=-1;
    let drawnGarrisons=[], drawnMovements=[], drawnRoutes=[];
  function roundRect(x,y,w,h,r){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else{ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}}
  function overlayScale(){return clamp(size.w/(outputFormat==='portrait'?390:1000),.72,3.2);}
  function badge(text,x,y,color,{small=false,hq=false,alpha=1,march=false}={}){
    ctx.save();ctx.globalAlpha=alpha;const scale=overlayScale(),px=(march?12:hq?10:9)*scale;ctx.font=`${hq||march?600:500} ${px}px ${hq?'"Segoe UI",system-ui,sans-serif':'ui-monospace,Consolas,monospace'}`;const w=ctx.measureText(text).width+(hq?15:march?15:8)*scale,h=(hq?19:march?20:14)*scale;
    roundRect(x-w/2,y-h/2,w,h,4*scale);ctx.fillStyle=march?'#081b24f5':hq?'#081b24ed':'#0a1b25e8';ctx.fill();ctx.strokeStyle=color+(march?'df':hq?'b5':'70');ctx.lineWidth=(march?1.1:.8)*scale;ctx.stroke();if(hq||march){ctx.fillStyle=color;ctx.fillRect(x-w/2+scale,y-h/2+3*scale,2*scale,h-6*scale);}ctx.fillStyle=hq?color:'#edf4ec';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,x+(hq||march?scale:0),y+.5*scale);ctx.restore();return {x:x-w/2,y:y-h/2,w,h};
  }
  function atFront(t) {return t.owner>=0&&t.neighbors.some(n=>sim.tiles[n].owner>=0&&sim.tiles[n].owner!==t.owner);}
  function syncOverlayState() {
    if(!sim||overlayTick===sim.ticks)return;overlayTick=sim.ticks;
    const live=new Set(sim.moves.map(m=>m.id));for(const id of importantMoves.keys())if(!live.has(id))importantMoves.delete(id);
    const fresh=sim.moves.filter(m=>m.id>observedMoveId);observedMoveId=sim.moveId;
    const ranked=fresh.map(m=>{const t=sim.tiles[m.to],enemy=t.owner>=0&&t.owner!==m.owner,attack=t.owner!==m.owner,front=atFront(t);const qualifies=(attack&&m.amount>=6)||(!attack&&m.amount>=10)||(enemy&&t.hq>=0);return {m,qualifies,score:m.amount+(enemy?24:attack?5:0)+(front?10:0)+(enemy&&t.hq>=0?100:0)+(t.terrain==='outpost'?12:0)};}).filter(x=>x.qualifies).sort((a,b)=>b.score-a.score||a.m.id-b.m.id);
    const limit=outputFormat==='portrait'?3:6;
    for(const {m} of ranked){if(importantMoves.size>=limit)break;
      // Keep the highlighted routes distinct. Ordinary movements stay visible
      // as vehicles, without turning the entire map into a web of arrows.
      const crowded=[...importantMoves.values()].some(v=>v.move.from===m.from||v.move.to===m.to||v.move.from===m.to||v.move.to===m.from);if(crowded)continue;
      importantMoves.set(m.id,{move:m,labelOffset:null});
    }
    for(const t of sim.tiles){if(t.terrain==='mountain')continue;if(atFront(t)||sim.time-t.lastBattle<1.5)frontUntil.set(t.id,sim.time+4);}
    for(const f of sim.factions)if(f.alive&&f.focusTile>=0&&f.focusUntil>=sim.time)frontUntil.set(f.focusTile,sim.time+4);
    for(const {move:m} of importantMoves.values()){frontUntil.set(m.from,sim.time+4);frontUntil.set(m.to,sim.time+4);}
    for(const [id,until] of frontUntil)if(until<sim.time)frontUntil.delete(id);
  }
  function overlaps(a,b,pad=2) {return a.x<b.x+b.w+pad&&a.x+a.w+pad>b.x&&a.y<b.y+b.h+pad&&a.y+a.h+pad>b.y;}
  function drawRoute(m) {
    const a=sim.tiles[m.from],b=sim.tiles[m.to],p=view.project(a.x,a.height+.13,a.z),q=view.project(b.x,b.height+.13,b.z);if(!p||!q)return;
    const dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy);if(len<1)return;const ux=dx/len,uy=dy/len,color=TEAMS[m.owner].color,scale=overlayScale();
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle='#071820c9';ctx.lineWidth=4*scale;ctx.stroke();ctx.strokeStyle=color+'c9';ctx.lineWidth=1.7*scale;ctx.stroke();
    ctx.beginPath();ctx.arc(p.x,p.y,3*scale,0,Math.PI*2);ctx.fillStyle='#10242b';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=1.25*scale;ctx.stroke();
    const arrow=5.7*scale;ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(q.x-ux*arrow-uy*arrow*.6,q.y-uy*arrow+ux*arrow*.6);ctx.lineTo(q.x-ux*arrow+uy*arrow*.6,q.y-uy*arrow-ux*arrow*.6);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.restore();drawnRoutes.push(m.id);
  }
  function drawFocusTargets(){
    const scale=overlayScale();ctx.save();ctx.lineWidth=1.2*scale;ctx.setLineDash([3*scale,3*scale]);
    for(const f of sim.factions){const t=sim.getTile(f.focusTile);if(!f.alive||!t||f.focusUntil<sim.time||t.owner===f.id)continue;ctx.beginPath();for(let k=0;k<6;k++){const a=Math.PI/6+k*Math.PI/3,p=view.project(t.x+Math.cos(a)*.77,t.height+.08,t.z+Math.sin(a)*.77);if(k===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.closePath();ctx.strokeStyle=TEAMS[f.id].color+'bd';ctx.stroke();}
    ctx.restore();
  }
  function drawLabels() {
    ctx.setTransform(size.dpr,0,0,size.dpr,0,0);ctx.clearRect(0,0,size.w,size.h);drawnGarrisons=[];drawnMovements=[];drawnRoutes=[];if(!sim||!view)return;syncOverlayState();const mobile=outputFormat==='portrait',scale=overlayScale();
    drawFocusTargets();
    for(const {move:m} of importantMoves.values())drawRoute(m);
    const garrisonRects=[],hqRects=[];
    if(garrisonMode!=='never')for(const t of sim.tiles){if(t.terrain==='mountain')continue;
      const show=garrisonMode==='always'||t.hq>=0||t.terrain==='outpost'||t.id===selected||t.id===hover||frontUntil.has(t.id);if(!show)continue;
      // A fixed place on the near edge of every tile; neither strength changes
      // nor re-ranking of other fields can move or remove this plaque.
      const az=view.camera?.azimuth||0,p=view.project(t.x+Math.sin(az)*.38,t.height+.06,t.z+Math.cos(az)*.38);if(!p)continue;
      garrisonRects.push(badge(String(Math.floor(t.units)),p.x,p.y+3*scale,t.owner>=0?TEAMS[t.owner].color:'#aab8a4',{small:mobile,alpha:t.owner>=0?1:.88}));drawnGarrisons.push(t.id);
    }
    for(const f of sim.factions){if(!f.alive)continue;const t=sim.tiles[f.hq],p=view.project(t.x,t.height+2.15,t.z);if(!p||!Number.isFinite(p.x))continue;hqRects.push(badge(TEAMS[f.id].name,p.x,p.y-8*scale,TEAMS[f.id].color,{hq:true,small:mobile}));}
    const occupied=[...hqRects],time=sim.time+(sim.phase==='running'?accum:0);
    for(const state of importantMoves.values()){
      const m=state.move,a=sim.tiles[m.from],b=sim.tiles[m.to],u=clamp((time-m.start)/m.duration,0,1),p=view.project(a.x+(b.x-a.x)*u,a.height+(b.height-a.height)*u+.19,a.z+(b.z-a.z)*u);if(!p)continue;
      const text='→ '+m.amount;ctx.font=`600 ${12*scale}px ui-monospace,Consolas,monospace`;const w=ctx.measureText(text).width+15*scale,h=20*scale;
      const choices=[[0,-23],[25,-28],[-25,-28],[0,-43],[37,-13],[-37,-13],[30,-46],[-30,-46],[0,-62]].map(([x,y])=>[x*scale,y*scale]);
      if(!state.labelOffset){let best=choices[0],bestScore=Infinity;for(let i=0;i<choices.length;i++){const [dx,dy]=choices[i],box={x:p.x+dx-w/2,y:p.y+dy-h/2,w,h};const score=occupied.filter(r=>overlaps(box,r,4)).length*100+garrisonRects.filter(r=>overlaps(box,r,1)).length*3+i*.2;if(score<bestScore){bestScore=score;best=choices[i];}}state.labelOffset=best;}
      let [dx,dy]=state.labelOffset,x=clamp(p.x+dx,w/2+5*scale,size.w-w/2-5*scale),y=clamp(p.y+dy,12*scale,size.h-18*scale);
      // Never suppress an already visible marching strength for a collision.
      // Resolve rare intersections outward and retain the new offset.
      for(let n=0;n<4&&occupied.some(r=>overlaps({x:x-w/2,y:y-h/2,w,h},r,3*scale));n++){dy-=22*scale;y=clamp(p.y+dy,12*scale,size.h-18*scale);state.labelOffset=[dx,dy];}
      ctx.save();ctx.strokeStyle=TEAMS[m.owner].color+'b5';ctx.lineWidth=scale;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(x,y+h/2-scale);ctx.stroke();ctx.beginPath();ctx.arc(p.x,p.y,2.1*scale,0,Math.PI*2);ctx.fillStyle=TEAMS[m.owner].color;ctx.fill();ctx.restore();
      occupied.push(badge(text,x,y,TEAMS[m.owner].color,{small:mobile,march:true}));drawnMovements.push(m.id);
    }
  }

    return {
      observe(next) {
        if(sim!==next) {
          sim=next; frontUntil.clear(); importantMoves.clear(); observedMoveId=0; overlayTick=-1;
          drawnGarrisons=[];drawnMovements=[];drawnRoutes=[];
        }
        syncOverlayState();
      },
      resize(w,h,dpr,format) {
        size={w,h,dpr};outputFormat=format;
        labels.width=Math.round(w*dpr);labels.height=Math.round(h*dpr);
        for(const state of importantMoves.values())state.labelOffset=null;
      },
      draw(remainder,params) {
        accum=remainder;garrisonMode=params.garrisonMode;
        drawLabels();
      },
      displayState() {
        return {garrisonMode,garrisonTileIds:[...drawnGarrisons],importantMoveIds:[...importantMoves.keys()],
          movementLabelIds:[...drawnMovements],routeMoveIds:[...drawnRoutes],
          observedMoveId,overlayTick,frontUntil:[...frontUntil],
          labelOffsets:[...importantMoves].map(([id,s])=>[id,s.labelOffset?.slice()||null])};
      }
    };
  };
})();
