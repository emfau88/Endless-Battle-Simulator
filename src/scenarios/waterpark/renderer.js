/* Waterpark artwork: original Pyramid characters and foliage, deterministic frame rendering. */
(function () {
'use strict';
const WP = EBS.Waterpark = EBS.Waterpark || {};
const { clamp, hashSeed } = EBS.util;
const TAU = Math.PI * 2;
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * clamp(k, 0, 1)));
const rgb = c => `rgb(${c.join(',')})`;
const xy = p => Array.isArray(p) ? p : [p.x, p.y];
function poly(g, points, close = true) {
  g.beginPath(); points.forEach((p, i) => { const [x,y] = xy(p); i ? g.lineTo(x,y) : g.moveTo(x,y); }); if (close) g.closePath();
}
function ellipse(g, x, y, rx, ry, color) { g.fillStyle=color; g.beginPath(); g.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU); g.fill(); }
function rounded(g,x,y,w,h,r,color) { g.fillStyle=color; g.beginPath(); g.roundRect(x,y,w,h,r); g.fill(); }
function stroke(g, points, width, color) { if (points.length < 2) return; poly(g,points,false);g.lineWidth=width;g.strokeStyle=color;g.lineCap='round';g.lineJoin='round';g.stroke(); }
function shine(g,x,y,r,color='#fff7c7',alpha=.5) {
  const grad=g.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,color);grad.addColorStop(1,'rgba(255,240,170,0)');g.save();g.globalAlpha=alpha;g.fillStyle=grad;g.fillRect(x-r,y-r,r*2,r*2);g.restore();
}

class WaterparkRenderer extends EBS.CanvasScene {
  constructor(ctx) {
    super(ctx); this.sim=ctx.sim;this.view=ctx.view;this.video=ctx.video;this.L=ctx.sim.L;
    this.art=EBS.PyramidArt;this.critters=EBS.CritterArt;this.seed=ctx.sim.seed;
    const rng=new EBS.RNG(hashSeed('waterpark-art',this.seed));
    this.sprites=this.critters.SPECIES.map((_,i)=>this.critters.critterSprite(i, Math.min(2,this.scale), this.L.R));
    this.clouds=Array.from({length:this.L.land?7:6},(_,i)=>{
      const w=rng.range(140,260), sp=this.art.cloudSprite(rng,w,Math.min(1.5,this.scale));
      return {...sp,x:rng.range(-100,this.L.W),y:rng.range(90,this.L.horizon*.75),speed:rng.range(2,6)};
    });
    this.stars=Array.from({length:130},()=>[rng.range(0,this.L.W),rng.range(35,this.L.horizon),rng.range(.7,2),rng.range(0,TAU)]);
    this.ripples=Array.from({length:85},()=>[rng.next(),rng.next(),rng.range(16,90),rng.range(0,TAU)]);
    this.moon=this.art.moonSprite(Math.min(2,this.scale),33);
    this.scenery=this.layer(g=>this.drawScenery(g));
    this.structures=this.layer(g=>this.drawStructures(g));
  }
  layer(draw) {
    const c=document.createElement('canvas');c.width=Math.round(this.L.W*this.scale);c.height=Math.round(this.L.H*this.scale);
    const g=c.getContext('2d');g.scale(this.scale,this.scale);draw(g);return c;
  }
  time() {return this.sim.videoTime ?? this.sim.step/60;}
  day() {
    const st=this.sim.story||{},cfg=this.sim.cfg,t=this.time(),D=this.video?.durationSec||600;
    const phase=st.dayPhase ?? (cfg.dayCycle ? clamp(t/(cfg.dayMinutes>0?cfg.dayMinutes*60:D),0,1) : cfg.dayStart);
    const night=st.night ?? clamp((phase-.66)/.24,0,1),warm=st.warm ?? Math.max(0,1-Math.abs(phase-.68)/.22);
    return {phase,night,warm};
  }
  paint(g) {
    const L=this.L,t=this.time(),day=this.day();this.dayState=day;
    this.drawSky(g,t,day);
    this.drawGuests(g,t,day);
    g.drawImage(this.scenery,0,0,L.W,L.H);
    this.drawWater(g,t,day);
    g.drawImage(this.structures,0,0,L.W,L.H);
    this.drawLift(g,t);
    this.drawMovingWater(g,t);
    this.drawSpringboard(g,t);
    this.drawSeesaw(g,t);
    this.drawWaterwheel(g,t);
    this.drawNightGrade(g,day);
    this.drawLights(g,t,day);
    this.drawAnimals(g,t,day);
    this.drawSplash(g,t);
    this.drawSmallLife(g,t,day);
    this.drawFinale(g,t,day);
    if(this.view.hud)this.drawHud(g,t);
  }
  drawSky(g,t,day) {
    const L=this.L,cfg=this.sim.cfg;
    const zen=mix(mix([32,119,216],[62,58,117],day.warm*.65),[8,20,52],day.night*.94);
    const hor=mix(mix([183,226,246],[255,190,125],day.warm*.75),[49,80,125],day.night*.9);
    const grad=g.createLinearGradient(0,0,0,L.waterY);grad.addColorStop(0,rgb(zen));grad.addColorStop(1,rgb(hor));g.fillStyle=grad;g.fillRect(0,0,L.W,L.H);
    const sx=L.W*.72,sy=95+(L.horizon-125)*day.phase;
    if(day.night<.9){
      g.save();g.globalAlpha=1-day.night;shine(g,sx,sy,220,'#fff1b2',.35);
      if(cfg.rays>0){g.save();g.translate(sx,sy);g.rotate(t*.004);for(let i=0;i<12;i++){g.rotate(TAU/12);g.fillStyle=`rgba(255,249,204,${.035*cfg.rays})`;poly(g,[[0,0],[L.H,-90],[L.H,90]]);g.fill();}g.restore();}
      ellipse(g,sx,sy,28,28,'#fff7dc');g.restore();
    }
    if(cfg.stars&&day.night>.05){
      g.save();g.globalAlpha=day.night;for(const [x,y,r,p] of this.stars){g.globalAlpha=day.night*(.45+.45*Math.sin(t*.8+p)**2);ellipse(g,x,y,r,r,'#eef5ff');}
      g.globalAlpha=day.night;g.drawImage(this.moon.c,L.W*.83-37,90,74,74);g.restore();
    }
    g.save();g.globalAlpha=1-day.night*.65;
    for(const c of this.clouds){const x=((c.x+t*c.speed*(cfg.clouds??1)+c.w)%(L.W+c.w*2))-c.w;g.drawImage(c.c,x,c.y,c.w,c.h);}g.restore();
    if(cfg.birds&&day.night<.8){g.save();g.globalAlpha=(1-day.night)*.7;g.strokeStyle='#fbfeff';g.lineWidth=2.3;for(let i=0;i<4;i++){const x=(L.W*.68+i*49+t*8)%(L.W+200)-100,y=L.horizon*.47+i%2*17,w=9;g.beginPath();g.moveTo(x-w,y+Math.sin(t*3+i)*3);g.quadraticCurveTo(x-w*.3,y-5,x,y);g.quadraticCurveTo(x+w*.3,y-5,x+w,y+Math.sin(t*3+i)*3);g.stroke();}g.restore();}
  }
  drawScenery(g) {
    const L=this.L,rng=new EBS.RNG(hashSeed('waterpark-shore',this.seed)),Y=L.waterY,coast=Y-(L.land?125:210);
    // Distant coastline and a planted retaining wall, kept behind the clear routes.
    g.fillStyle='#89bcc1';poly(g,[[0,coast+15],[L.W*.16,coast-17],[L.W*.34,coast+35],[L.W*.58,coast-8],[L.W*.83,coast+28],[L.W,coast-22],[L.W,Y],[0,Y]]);g.fill();
    const greenery=g.createLinearGradient(0,coast+30,0,Y);greenery.addColorStop(0,'#76ac78');greenery.addColorStop(1,'#2c7549');g.fillStyle=greenery;g.fillRect(0,coast+55,L.W,Y-coast-55);
    for(let i=0;i<45;i++){const x=rng.range(0,L.W),y=rng.range(coast+65,Y-50);ellipse(g,x,y,rng.range(20,50),rng.range(12,28),i%3?'#67a953':'#3b8748');}
    this.art.foliage(g,rng,[[0,Y-36],[L.W,Y-36]],14,28,()=>true,{dens:1,rMin:5,rMax:12,flowers:.04});
    g.fillStyle='#c6b791';g.fillRect(0,Y-23,L.W,33);g.fillStyle='#f4e7c5';g.fillRect(0,Y-27,L.W,9);
    g.strokeStyle='#a59470';g.lineWidth=1.4;for(let x=0;x<L.W;x+=90){g.beginPath();g.moveTo(x,Y-18);g.lineTo(x+5,Y+6);g.stroke();}
    for(const [x,h,lean] of (L.land?[[45,305,.15],[185,190,-.1],[L.W-155,240,.1],[L.W-35,345,-.22]]:[[20,320,.1],[L.W-50,300,-.15],[L.W-155,200,.05]]))this.art.palm(g,rng,x,Y-22,h,lean);
    this.parasol(g,L.land?180:112,Y-125,L.land?65:52);
    if(L.land)this.parasol(g,L.W-220,Y-120,58);
    // Small side waterfall, away from the splash bays.
    const wx=L.W-65,wy=Y-155;rounded(g,wx-40,wy-25,95,180,18,'#909f8a');rounded(g,wx-28,wy-35,70,28,8,'#cbd1b6');
    const waterfall=g.createLinearGradient(wx-25,0,wx+25,0);waterfall.addColorStop(0,'#cdfcf4');waterfall.addColorStop(.4,'#4fc8c6');waterfall.addColorStop(1,'#efffff');g.fillStyle=waterfall;g.fillRect(wx-25,wy-10,48,165);
    for(let i=0;i<7;i++){g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=2;g.beginPath();g.moveTo(wx-23+i*7,wy);g.lineTo(wx-18+i*7,Y-7);g.stroke();}
  }
  parasol(g,x,y,r) {
    stroke(g,[[x,y-10],[x,y+110]],5,'#976946');g.fillStyle='#dfc18b';g.beginPath();g.moveTo(x-r,y+17);g.quadraticCurveTo(x-r*.55,y-12,x,y-r*.5);g.quadraticCurveTo(x+r*.55,y-12,x+r,y+17);g.closePath();g.fill();
    for(let i=-3;i<=3;i++)stroke(g,[[x,y-r*.5],[x+i*r/3,y+16]],1.5,'rgba(135,97,53,.4)');
    rounded(g,x-r+9,y+70,r*.7,10,4,'#e8c892');rounded(g,x+15,y+80,r*.7,10,4,'#e8c892');
  }
  segments(route) {
    return (route.drawSegments||[]).map(s=>Array.isArray(s)?s:s.points).filter(s=>s?.length>1);
  }
  drawStructures(g) {
    const L=this.L,R=L.R,Y=L.waterY;
    // Supporting posts first, then the platform and flowing tracks.
    for(const route of L.routes)for(const seg of this.segments(route)){
      for(let i=1;i<seg.length;i+=Math.max(1,Math.floor(seg.length/4))){const [x,y]=xy(seg[i]);if(y>Y-45)continue;
        stroke(g,[[x+8,y+R+10],[x+8,Y-12]],12,'#785c3c');stroke(g,[[x+5,y+R+10],[x+5,Y-12]],6,'#b18b56');
        if(y<Y-140)stroke(g,[[x+8,y+90],[Math.min(L.W-30,x+90),y+R+18]],7,'#a17b49');
      }
    }
    const lx=L.lift.x,top=L.lift.top,bottom=L.lift.bottom;
    // Glass lift shaft: transparent rear, light framing and a small pyramid canopy.
    const shaft=g.createLinearGradient(lx-52,0,lx+52,0);shaft.addColorStop(0,'rgba(36,143,181,.55)');shaft.addColorStop(.45,'rgba(163,240,249,.25)');shaft.addColorStop(1,'rgba(24,102,153,.65)');
    g.fillStyle=shaft;g.fillRect(lx-52,top-18,104,bottom-top+44);
    for(const x of [lx-54,lx+54]){stroke(g,[[x,top-20],[x,bottom+25]],7,'#e1e9db');stroke(g,[[x+2,top-20],[x+2,bottom+25]],2,'#ffffff');}
    stroke(g,[[lx-40,top],[lx-40,bottom]],3,'rgba(231,255,255,.6)');
    const roofY=top-80;g.fillStyle='#a4e8ed';poly(g,[[lx-76,top-24],[lx,roofY-28],[lx+76,top-24]]);g.fill();g.strokeStyle='#397f9a';g.lineWidth=3;g.stroke();
    g.fillStyle='#42a8c8';poly(g,[[lx,roofY-28],[lx+76,top-24],[lx+7,top-34]]);g.fill();
    stroke(g,[[lx-75,top-24],[lx,roofY-28],[lx+6,top-34],[lx-75,top-24]],2,'#e3ffff');rounded(g,lx-78,top-29,156,16,3,'#f5e9cd');
    const p=L.platformPath?.points||[];
    if(p.length){const xs=p.map(v=>xy(v)[0]),ys=p.map(v=>xy(v)[1]);const x0=Math.min(...xs,lx),x1=Math.max(...xs),py=Math.min(...ys)+R;
      rounded(g,x0-24,py,x1-x0+55,22,4,'#ae8855');rounded(g,x0-24,py,x1-x0+55,7,3,'#f0dbb7');
      for(let x=x0;x<x1+20;x+=85){stroke(g,[[x,py],[x,py-58]],5,'#956332');ellipse(g,x,py-60,4,4,'#ebc989');}stroke(g,[[x0,py-53],[x1+18,py-53]],5,'#ba8f4e');
    }
    // The four fixed troughs.
    for(const route of L.routes)for(const seg of this.segments(route)){
      if(seg.kind==='tube'){
        stroke(g,seg,R*2+19,'#9cc6c4');stroke(g,seg,R*2+13,'rgba(203,251,249,.85)');stroke(g,seg,R*2+3,'rgba(67,188,207,.55)');stroke(g,seg,3,'rgba(239,255,254,.85)');
      }else this.drawTrough(g,seg,R);
    }
    this.drawFunnel(g);
    // Green planters on the launch platform and sparse ledges.
    const rng=new EBS.RNG(hashSeed('waterpark-planters',this.seed));
    if(p.length>2){const a=xy(p[Math.floor(p.length*.4)]),b=xy(p[Math.floor(p.length*.8)]);this.art.foliage(g,rng,[[a[0],a[1]+R+20],[b[0],b[1]+R+20]],0,18,()=>true,{dens:1,rMin:3,rMax:7,flowers:.06});}
    // Shore lights; their warm glow is drawn after night grading.
    for(const x of [L.W*.07,L.W*.93]){stroke(g,[[x,Y-8],[x,Y-120]],5,'#75634c');rounded(g,x-10,Y-130,20,29,5,'#aa8750');rounded(g,x-6,Y-125,12,18,3,'#ffe5a2');}
  }
  drawTrough(g,pts,R) {
    stroke(g,pts,R*2+27,'rgba(48,74,69,.22)');stroke(g,pts,R*2+19,'#bba985');stroke(g,pts,R*2+13,'#fff0d0');stroke(g,pts,R*2-2,'#176f8b');stroke(g,pts,R*2-6,'#58cbd0');stroke(g,pts,R*2-15,'#80dedb');
  }
  feature(index) {return this.L.routes[index]?.feature||{};}
  drawFunnel(g) {
    const f=this.feature(1);if(!Number.isFinite(f.x))return;
    const {x,y}=f,rx=f.rx||125,ry=f.ry||45;
    const grad=g.createLinearGradient(0,y,0,y+ry*2.1);grad.addColorStop(0,'#f2e2bd');grad.addColorStop(1,'#b6a382');
    g.fillStyle=grad;g.beginPath();g.moveTo(x-rx,y);g.bezierCurveTo(x-rx*.65,y+ry*2,x+rx*.65,y+ry*2,x+rx,y);g.closePath();g.fill();
    ellipse(g,x,y,rx+5,ry+5,'#fef1d7');ellipse(g,x,y,rx-9,ry-5,'#42bbc9');ellipse(g,x,y+ry*.24,rx*.23,ry*.22,'#19768e');
    g.strokeStyle='rgba(240,255,255,.75)';g.lineWidth=2.5;for(let i=1;i<4;i++){g.beginPath();g.ellipse(x,y+ry*.12,rx*i/4,ry*i/4,0,.05,Math.PI*1.8);g.stroke();}
    stroke(g,[[x-rx*.55,y+ry*.76],[x-rx*.36,y+ry*1.45]],2,'rgba(122,103,67,.25)');stroke(g,[[x+rx*.55,y+ry*.76],[x+rx*.36,y+ry*1.45]],2,'rgba(122,103,67,.25)');
  }
  drawSpringboard(g,t) {
    const f=this.feature(3);if(!Number.isFinite(f.x))return;const {x,y}=f;
    const launch=[...(this.sim.recent||[])].reverse().find(e=>e.type==='spring');
    const age=launch?t-launch.t:99;
    const rebound=age>=0&&age<1.1 ? -Math.sin(age*14)*Math.exp(-age*3.8)*7 : 0;
    const loaded=this.sim.animals.some(b=>b.state==='route'&&b.route===3&&b.s<f.entryS&&f.entryS-b.s<35);
    const boardY=y+(loaded?5:rebound);
    stroke(g,[[x-25,y+29],[x+25,y+29]],8,'#887d68');
    const coil=[];for(let i=0;i<=12;i++)coil.push([x+(i%2?12:-12),boardY+4+i*(y+27-boardY-4)/12]);stroke(g,coil,3,'#5e7e88');
    rounded(g,x-34,boardY-4,68,10,5,'#e9c96d');stroke(g,[[x-26,boardY-2],[x+24,boardY-2]],3,'#fff0af');
  }
  drawMovingWater(g,t) {
    const L=this.L,cfg=this.sim.cfg,open=this.sim.story?.openRoutes||[true,true,true,true];
    for(const route of L.routes){
      const active=open[route.id];g.save();
      if(active){g.strokeStyle='rgba(241,255,255,.68)';g.lineWidth=2;g.setLineDash([15,35,6,57]);g.lineDashOffset=-t*32*cfg.rollSpeed;
        for(const seg of this.segments(route)){poly(g,seg,false);g.stroke();}}
      else {g.globalAlpha=.3;for(const seg of this.segments(route))stroke(g,seg,L.R*2-8,'#97a8a0');}
      g.restore();
      const [x,y]=xy(route.start||route.path.points[0]);
      if(!active){stroke(g,[[x-20,y-22],[x+20,y+19]],7,'#b88952');ellipse(g,x,y-5,13,13,'#f6e4bd');stroke(g,[[x-7,y-5],[x+7,y-5]],3,'#a85b40');}
    }
    // Flow traces and turning water wheel have independent presentation rates.
    const f=this.feature(1);if(f.x&&open[1]){g.save();g.strokeStyle='rgba(240,255,255,.72)';g.lineWidth=2;for(let j=0;j<3;j++){const a=t*1.4+j*2;g.beginPath();g.ellipse(f.x,f.y,(f.rx||120)*(.4+j*.2),(f.ry||45)*(.4+j*.2),0,a,a+.9);g.stroke();}g.restore();}
  }
  drawSeesaw(g) {
    const f=this.feature(2);if(!Number.isFinite(f.x))return;
    const a=this.sim.seesawAngle??-.12,len=f.length||170;
    g.fillStyle='#b18c55';poly(g,[[f.x-40,f.y+75],[f.x,f.y+4],[f.x+40,f.y+75]]);g.fill();g.strokeStyle='#806645';g.lineWidth=3;g.stroke();
    g.save();g.translate(f.x,f.y);g.rotate(a);
    this.drawTrough(g,[[-len/2,0],[len/2,0]],this.L.R);
    stroke(g,[[-len/2+7,-this.L.R+4],[len/2-7,-this.L.R+4]],2,'#fffdf0');
    g.restore();ellipse(g,f.x,f.y+15,15,15,'#e4be79');ellipse(g,f.x,f.y+15,8,8,'#9c7440');
  }
  drawLift(g,t) {
    const L=this.L,{x,top,bottom}=L.lift,R=L.R;
    stroke(g,[[x-23,top],[x-23,bottom]],8,'#486e77');stroke(g,[[x+23,top],[x+23,bottom]],8,'#486e77');
    for(const y of [top,bottom]){ellipse(g,x,y,29,29,'#c2d4cf');ellipse(g,x,y,22,22,'#69939e');ellipse(g,x,y,8,8,'#dce7de');
      g.save();g.translate(x,y);g.rotate((this.sim.t||t)*.8*this.sim.cfg.beltSpeed);stroke(g,[[-18,0],[18,0]],3,'#adc9c7');g.restore();}
    const phase=(this.sim.t||t)*70*this.sim.cfg.beltSpeed,span=bottom-top;
    for(let i=0;i<Math.floor(span/90);i++){const y=bottom-((phase+i*90)%Math.max(1,span));stroke(g,[[x+19,y-8],[x+32,y-8],[x+29,y+8],[x+19,y+8]],2,'rgba(221,249,244,.52)');}
    for(const b of this.sim.animals){if(b.state!=='lift')continue;const p=this.sim.pose(b);g.fillStyle='#accad0';poly(g,[[p.x-R-9,p.y+R*.35],[p.x+R+9,p.y+R*.35],[p.x+R*.7,p.y+R+17],[p.x-R*.7,p.y+R+17]]);g.fill();stroke(g,[[p.x-R-9,p.y+R*.35],[p.x+R+9,p.y+R*.35]],4,'#f3ffff');}
  }
  drawWater(g,t,day) {
    const L=this.L,Y=L.waterY,cfg=this.sim.cfg;
    const grad=g.createLinearGradient(0,Y,0,L.H);grad.addColorStop(0,rgb(mix([46,186,192],[21,68,111],day.night*.8)));grad.addColorStop(.55,rgb(mix([42,159,184],[15,49,92],day.night*.8)));grad.addColorStop(1,rgb(mix([18,104,155],[9,34,69],day.night*.8)));g.fillStyle=grad;g.fillRect(0,Y,L.W,L.H-Y);
    if(cfg.reflection>0){g.save();g.globalAlpha=.17*cfg.reflection;g.translate(0,Y*2);g.scale(1,-1);g.drawImage(this.scenery,0,0,L.W,L.H);g.drawImage(this.structures,0,0,L.W,L.H);g.restore();}
    for(const [u,v,w,p]of this.ripples){const y=Y+v*(L.H-Y),x=u*L.W+Math.sin(t*.7+p)*8*cfg.waves;
      g.strokeStyle=`rgba(190,252,248,${(.08+.1*Math.sin(t*.5+p)**2)*(1-day.night*.5)})`;g.lineWidth=1.7;g.beginPath();g.moveTo(x-w/2,y);g.quadraticCurveTo(x,y+2*cfg.waves,x+w/2,y);g.stroke();}
    if(cfg.sparkle>0)for(let i=0;i<24;i++){const u=(i*.618)%1,v=(i*.371)%1,a=Math.max(0,Math.sin(t*1.3+i*2.7))**18*.65*cfg.sparkle;if(a<.02)continue;g.save();g.globalAlpha=a;const x=u*L.W,y=Y+15+v*(L.H-Y-30);stroke(g,[[x-5,y],[x+5,y]],1.5,'#d4fffa');stroke(g,[[x,y-3],[x,y+3]],1,'#d4fffa');g.restore();}
    // A subdued trace explains the return current without adding an artificial pipe.
    const pp=L.pool?.path?.points;if(pp){g.save();g.globalAlpha=.12;g.setLineDash([15,28]);g.lineDashOffset=-t*30*cfg.current;stroke(g,pp,2,'#ecffef');g.restore();}
  }
  drawWaterwheel(g,t) {
    const L=this.L,x=L.land?85:65,y=L.waterY-22,r=38;
    g.save();g.translate(x,y);g.rotate((this.sim.t||t)*.5*this.sim.cfg.current);
    g.lineWidth=8;g.strokeStyle='#89633e';g.beginPath();g.arc(0,0,r,0,TAU);g.stroke();g.lineWidth=3;g.strokeStyle='#d6b17a';g.beginPath();g.arc(0,0,r+2,0,TAU);g.stroke();
    for(let i=0;i<8;i++){g.rotate(TAU/8);stroke(g,[[0,0],[r,0]],5,'#ae8350');rounded(g,r-5,-10,11,22,2,'#ceaa70');}ellipse(g,0,0,8,8,'#e6c493');g.restore();
    // Short arched bridge over the visible return near the intake.
    const bx=x+74,by=L.waterY+2;g.strokeStyle='#9b754b';g.lineWidth=8;g.beginPath();g.moveTo(bx-27,by+5);g.quadraticCurveTo(bx+10,by-35,bx+52,by+5);g.stroke();g.lineWidth=3;g.strokeStyle='#e8c892';g.beginPath();g.moveTo(bx-27,by-18);g.quadraticCurveTo(bx+10,by-58,bx+52,by-18);g.stroke();
  }
  drawNightGrade(g,day) {
    const L=this.L;
    if(day.warm>.02){const gr=g.createLinearGradient(0,0,0,L.waterY);gr.addColorStop(0,'rgba(249,156,72,0)');gr.addColorStop(1,`rgba(249,156,72,${day.warm*.1})`);g.fillStyle=gr;g.fillRect(0,0,L.W,L.H);}
    if(day.night>.01){const gr=g.createLinearGradient(0,0,0,L.waterY);gr.addColorStop(0,'rgba(12,27,74,0)');gr.addColorStop(1,`rgba(12,27,74,${day.night*(this.sim.cfg.nightDark??.65)*.55})`);g.fillStyle=gr;g.fillRect(0,0,L.W,L.H);}
  }
  drawLights(g,t,day) {
    if(day.night<.03)return;const L=this.L,Y=L.waterY,n=day.night;
    for(const x of [L.W*.07,L.W*.93]){shine(g,x,Y-116,70,'#ffe2a0',n*.45);ellipse(g,x,Y-116,5,8,'#ffe8ad');}
    shine(g,L.lift.x,L.lift.top+30,100,'#9be2ef',n*.16);
    for(let i=0;i<5;i++){const x=L.W*(.15+i*.18),y=Y+35;shine(g,x,y,60,'#77e8d3',n*.18);ellipse(g,x,y,3,2,'#acf5e5');}
    if(this.sim.cfg.fireflies)for(let i=0;i<12;i++){const x=(i*.754%1)*L.W+Math.sin(t*.7+i)*12,y=Y-35-Math.sin(t*.35+i*1.9)*22,a=n*(.25+.65*Math.sin(t+i*3)**2);shine(g,x,y,10,'#d3f987',a*.5);ellipse(g,x,y,1.5,1.5,`rgba(225,255,146,${a})`);}
  }
  drawAnimals(g,t,day) {
    const L=this.L,cfg=this.sim.cfg,st=this.sim.story||{};
    const order=this.sim.animals.map(b=>({b,p:this.sim.pose(b)})).sort((a,b)=>a.p.y-b.p.y);
    for(const {b,p}of order){
      if(!Number.isFinite(p.x+p.y))continue;const water=p.mode==='pool';
      if(water){g.strokeStyle='rgba(208,255,250,.65)';g.lineWidth=2;g.beginPath();g.ellipse(p.x,p.y+L.R*.5,L.R*1.45,L.R*.36,0,0,TAU);g.stroke();}
      else if(p.mode!=='fall')ellipse(g,p.x+3,p.y+L.R,L.R*.8,4,'rgba(15,65,77,.21)');
      const idleSleep=cfg.sleepy&&b.state==='gather'&&cfg.ending==='quiet';
      const mood={cap:idleSleep&&(day.night>.3||st.finished),sleep:idleSleep&&st.finished,yawn:idleSleep&&!st.finished?Math.max(0,Math.sin(t*1.2+b.id)):0,cheer:b.state==='gather'&&st.show};
      g.save();if(water){g.beginPath();g.rect(p.x-L.R*3,p.y-L.R*3,L.R*6,L.R*3.65);g.clip();}
      this.critters.drawCritter(g,this.sprites[b.kind],b.kind,b.id,p.x,p.y,p.angle||0,p.mode,t,p.speed||0,p.look||[1,0],cfg.wiggle??1,L.R,mood);g.restore();
      if(water){g.strokeStyle='rgba(217,255,251,.9)';g.lineWidth=2.4;g.beginPath();g.ellipse(p.x,p.y+L.R*.65,L.R*.91,L.R*.13,0,0,Math.PI);g.stroke();}
    }
  }
  drawSplash(g,t) {
    const R=this.L.R;
    for(const ev of this.sim.recent||[]){if(ev.type!=='splash')continue;const age=t-ev.t;if(age<0||age>1.3)continue;const a=1-age/1.3;
      g.save();g.globalAlpha=a*.7;g.strokeStyle='#e9fffb';g.lineWidth=2.5;g.beginPath();g.ellipse(ev.x,ev.y+R*.4,R*(1+age*2),R*(.25+age*.5),0,0,TAU);g.stroke();
      for(let i=0;i<9;i++){const dx=(i-4)*8*age,dy=-Math.sin(age/1.3*Math.PI)*(20+((i*7)%4)*13);ellipse(g,ev.x+dx,ev.y+dy,2.4,4,'#d7fffc');}g.restore();
    }
  }
  drawGuests(g,t,day) {
    const L=this.L;
    for(const e of this.sim.decorations||[]){const age=t-e.start,d=e.duration||8,u=age/d;if(u<0||u>1||this.sim.cfg[e.type]===false)continue;
      const x=e.x??(-100+(L.W+200)*u),y=e.y??(L.horizon*.48+Math.sin(u*Math.PI)*24);
      if(e.type==='ufo'){
        const ux=e.x??(-100+(L.W+200)*(u*u*(3-2*u))),uy=y+Math.sin(age*1.7)*6;
        g.save();g.translate(ux,uy);shine(g,0,0,65,'#9bf6ef',.3);ellipse(g,0,5,50,13,'#63afc3');ellipse(g,0,0,52,12,'#d1e8e7');ellipse(g,0,-10,25,17,'#6cbacb');ellipse(g,-8,-14,10,5,'#e2ffff');stroke(g,[[-43,6],[43,6]],3,'#a6f4f0');for(let i=0;i<5;i++)ellipse(g,-32+i*16,7,2,2,'#e6fff8');
        if(age>d*.35&&age<d*.6){const beam=g.createLinearGradient(0,12,0,150);beam.addColorStop(0,'rgba(171,249,236,.18)');beam.addColorStop(1,'rgba(171,249,236,0)');g.fillStyle=beam;poly(g,[[-9,12],[9,12],[65,150],[-65,150]]);g.fill();}g.restore();
      }else if(e.type==='balloon'){
        const col=['#e9ae6c','#8dc5bb','#e1b5ac'][Math.abs(e.seed||0)%3];ellipse(g,x,y,27,34,col);ellipse(g,x-8,y-6,9,25,'rgba(255,255,255,.2)');stroke(g,[[x-16,y+26],[x-9,y+48],[x+9,y+48],[x+16,y+26]],1.5,'#806748');rounded(g,x-10,y+45,20,13,2,'#a37d4f');
      }else if(e.type==='shootingStars'){
        const su=(age%2)/2,sx=L.W*.25+su*L.W*.35,sy=90+su*130;g.save();g.globalAlpha=Math.sin(su*Math.PI);stroke(g,[[sx-65,sy-28],[sx,sy]],2,'#eef7ff');ellipse(g,sx,sy,3,3,'#ffffff');g.restore();
      }else if(e.type==='birds'){
        g.strokeStyle='#eefaff';g.lineWidth=2;for(let i=0;i<6;i++){const bx=x+i*25,by=y+Math.abs(i-2)*12;g.beginPath();g.moveTo(bx-8,by-3*Math.sin(age*5+i));g.quadraticCurveTo(bx-3,by-6,bx,by);g.quadraticCurveTo(bx+3,by-6,bx+8,by-3*Math.sin(age*5+i));g.stroke();}
      }
    }
  }
  drawSmallLife(g,t) {
    const L=this.L;
    for(const e of this.sim.decorations||[]){const age=t-e.start,u=age/(e.duration||1);if(u<0||u>1||this.sim.cfg[e.type==='emote'?'emotes':e.type]===false)continue;
      if(e.type==='fish'){
        const x=(e.x??L.W*.85)+u*65,y=(e.y??L.waterY+45)-Math.sin(u*Math.PI)*46;
        g.save();g.translate(x,y);g.rotate(-.55+u);ellipse(g,0,0,9,4,'#a3d7c7');g.fillStyle='#72b4ac';poly(g,[[-8,0],[-15,-6],[-15,6]]);g.fill();ellipse(g,4,-1,1,1,'#1f6274');g.restore();
      }else if(e.type==='emote'){
        const b=this.sim.animals.find(a=>a.id===e.id);if(!b)continue;const p=this.sim.pose(b);g.save();g.globalAlpha=Math.sin(u*Math.PI);rounded(g,p.x+12,p.y-L.R-36,31,29,12,'rgba(255,255,243,.95)');g.font='bold 20px sans-serif';g.textAlign='center';g.fillStyle='#bf8b60';g.fillText(['♥','!','♪','?'][b.kind],p.x+27,p.y-L.R-14);g.restore();
      }
    }
  }
  drawFinale(g,t) {
    const st=this.sim.story||{},cfg=this.sim.cfg,L=this.L;
    if(!st.show||cfg.mode==='relax')return;
    const age=t-st.finaleAt;if(age>8)return;
    const alpha=Math.min(1,age)*Math.min(1,8-age);g.save();g.globalAlpha=alpha;
    for(let j=0;j<3;j++){const x=L.W*(.33+j*.17),y=L.waterY+32,h=35+20*Math.sin(age*1.4+j);g.strokeStyle='rgba(177,247,235,.75)';g.lineWidth=3;
      for(const d of [-1,1]){g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+d*20,y-h*2,x+d*55,y);g.stroke();}}
    g.restore();
    if(cfg.fireworks)for(const e of this.sim.decorations||[]){if(e.type!=='firework')continue;const a=t-e.start;if(a<0||a>2.5)continue;const x=e.x??L.W*.5,y=e.y??L.horizon*.4;g.save();g.globalAlpha=Math.max(0,1-a/2.5);for(let i=0;i<24;i++){const angle=i/24*TAU,r=a*80;stroke(g,[[x+Math.cos(angle)*r*.8,y+Math.sin(angle)*r*.8+a*a*13],[x+Math.cos(angle)*r,y+Math.sin(angle)*r+a*a*13]],2,['#f9d87e','#a5e6ec','#edb3d2'][i%3]);}g.restore();}
  }
  drawHud(g) {
    const L=this.L,st=this.sim.story||{},size=L.land?29:34;
    g.save();g.textAlign='left';g.textBaseline='top';g.font=`800 ${size}px system-ui,sans-serif`;g.shadowColor='rgba(12,39,78,.24)';g.shadowBlur=5;g.shadowOffsetY=2;g.fillStyle='#f8fcff';g.fillText('ENDLESS WATERPARK',L.land?36:45,L.land?28:38);g.shadowBlur=0;g.shadowOffsetY=0;
    g.font=`600 ${L.land?11:14}px system-ui,sans-serif`;g.fillStyle='rgba(235,250,255,.87)';
    const modes={short:'VIER FREUNDE · EIN WASSERPARK',day:'EIN TAG IM WASSERPARK',relax:'RUHIGER DAUERBETRIEB'};g.fillText(modes[this.sim.cfg.mode],L.land?38:46,L.land?67:84);
    if(this.sim.cfg.mode!=='short'){
      g.textAlign='right';g.font=`600 ${L.land?12:15}px system-ui,sans-serif`;g.fillText('FAHRTEN',L.W-38,L.land?30:42);g.font=`800 ${L.land?24:30}px system-ui,sans-serif`;g.fillStyle='#ffdf91';g.fillText(String(this.sim.stats?.rides??this.sim.animals.reduce((n,b)=>n+b.laps,0)),L.W-38,L.land?46:65);
    }
    if((st.closing&&this.sim.cfg.mode!=='short')||st.finished){const text=st.finished?(this.sim.cfg.ending==='show'?'EIN SCHÖNER TAG!':'GUTE NACHT, KLEINE FREUNDE'):'DIE LETZTE RUNDE';g.textAlign='center';g.font=`700 ${L.land?21:25}px system-ui,sans-serif`;g.fillStyle='#fff1c6';g.shadowColor='#1a436b';g.shadowBlur=7;g.fillText(text,L.W/2,L.land?85:124);}
    g.restore();
  }
  destroy() {
    for(const c of [this.scenery,this.structures,this.moon.c,...this.clouds.map(c=>c.c),...this.sprites.map(s=>s.c)])c.width=c.height=1;
    super.destroy();
  }
}
WP.Renderer=WaterparkRenderer;
})();
