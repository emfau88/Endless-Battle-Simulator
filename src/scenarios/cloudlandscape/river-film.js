/* Bewegte Einzelheiten und Licht. Jedes Bild ist eine Funktion von Seed, Zeit und Ausschnitt. */
(function () {
'use strict';
const L=EBS.CloudLandscape, { places, smooth, stream, line, oval, rect, poly, boat }=L;
const { lerp }=EBS.util, tau=Math.PI*2;
function ripples(g,v,lo,hi,t) {
  g.lineCap='round';
  for(let i=Math.floor(lo/19)-1;i<=Math.ceil(hi/19);i++) {
    const r=stream(v.seed,'waterlight',i),xx=i*19;
    const count=Math.ceil(v.width(xx)/12);
    for(let n=0;n<count;n++){
      const phase=r.range(0,tau),speed=r.range(.24,.53);
      const x=xx+r.range(-3,6)+Math.sin(t*speed*.21+phase)*4.2;
      const y=v.river(x)+v.width(x)*r.range(-.9,.9);
      const length=r.range(2,9), wave=.5+.5*Math.sin(t*speed+phase);
      if(Math.abs(x-places.town-62)<12 || Math.abs(y-v.rail(x))<12 || (Math.abs(x-places.port)<140 && y>v.bank(x,1)-49)) continue;
      line(g,[[x-length,y],[x,y-.45],[x+length*.54,y-.3]],'rgba(221,232,197,'+(.065+wave*.21)+')',.62+wave*.35);
    }
  }
}
function wheel(g,v,t) {
  const x=places.mill,y=v.branch(x,true).y;
  g.save(); g.translate(x,y); 
  oval(g,1,1,8.5,4.2,'#766445');
  for(let i=0;i<10;i++){
    const a=t*.72+i*tau/10,sy=Math.sin(a);
    line(g,[[Math.cos(a)*7,sy*3-2],[Math.cos(a)*7,sy*3+1.6]],sy>0?'#c19862':'#8c6844',1.8);
  }
  g.beginPath(); g.ellipse(0,0,7.2,3.8,0,0,tau); g.lineWidth=1.1; g.strokeStyle='#5e5543'; g.stroke();
  for(let i=0;i<4;i++){const a=t*.72+i*Math.PI/2; line(g,[[0,0],[Math.cos(a)*6.5,Math.sin(a)*3.3]],'#e0b778',.9);}
  oval(g,0,0,1.3,1,'#615039');
  for(let i=0;i<9;i++){
    const f=(t*.33+i*.111)%1;
    line(g,[[9+f*16,-1.7+i%4],[11+f*16,-1.9+i%4]],'rgba(218,231,201,'+(.65*(1-f))+')',.8);
  }
  g.restore();
}
function train(g,v,p) {
  const tr=v.train(p);
  for(const behind of [22,0]){
    const x=tr.x-behind*Math.cos(tr.angle),y=v.rail(x),a=v.railAngle(x);
    g.save(); g.translate(x,y); g.rotate(a);
    rect(g,-12,-2.5,24,7.1,'rgba(39,44,40,.34)');
    rect(g,-11.8,-3.6,23.2,7.2,'#643e37'); rect(g,-10.8,-3.4,21.7,6.6,'#ba4637');
    rect(g,-8.7,-2.45,17.4,4.4,'#c45b46'); rect(g,-7.2,-2.15,13.7,2.4,'#df8a66');
    for(let i=-8;i<8;i+=3.5) rect(g,i,2,2.2,1.1,'#394e50');
    rect(g,8,-2.6,1.55,4.7,'#4e6664');
    if(!behind) { rect(g,10.6,-2.2,1,1,'#ffe0a2');rect(g,10.6,1.1,1,1,'#ffe0a2'); }
    g.restore();
  }
}
function market(g,v,t) {
  const x=places.town,y=v.bank(x,-1)-86;
  for(let i=0;i<17;i++){
    const r=stream(v.seed,'marketgoer',i),phase=r.range(0,tau);
    const px=x+r.range(-42,39)+Math.sin(t*.047+phase)*4.3;
    const py=y+r.range(-21,22)+Math.sin(t*.074+phase)*2;
    oval(g,px+.6,py+1,1.2,.7,'rgba(70,61,44,.26)');
    oval(g,px,py,.95,.8,['#576e72','#a35e49','#64795d','#9d795a'][i%4]);
    oval(g,px-.15,py-.49,.55,.49,'#d0ac83');
  }
}
function ducks(g,v,t) {
  const x0=places.marsh+Math.sin(t*.027)*86;
  for(let i=0;i<6;i++) {
    const x=x0-i*4.8, b=v.branch(x,false), y=b.y+Math.sin(t*.2-i*.78)*1.25+(i%2)*2.1;
    const facing=Math.cos(t*.027)>=0?1:-1;
    line(g,[[x-5*facing,y-1.6],[x,y],[x-5*facing,y+1.6]],'rgba(205,226,204,.5)',.55);
    oval(g,x,y,i?1.15:1.75,i?.68:.93,i?'#9b8e63':'#e2dabc');
    oval(g,x+facing*(i?.84:1.34),y-.24,.58,.54,i?'#837956':'#355f54');
  }
}
function landing(g,v,p) {
  const f=v.ferry(p),port=places.port;
  if(f.wake) for(let j=1;j<=6;j++){
    const dx=j*4*f.wake, x=f.x-Math.cos(f.angle)*(17+dx),y=f.y-Math.sin(f.angle)*(17+dx);
    for(const side of [-1,1]) {
      const width=(3+dx*.23)*side;
      line(g,[[x+2,y+width],[x-4,y+width*1.14]],'rgba(216,229,206,'+(f.wake*(.64-j*.075))+')',1.15);
    }
  }
  boat(g,f.x,f.y,f.angle,1.87,'#a95d41');
  g.save(); g.translate(f.x,f.y); g.rotate(f.angle);
  rect(g,-11,-4.3,16,8.6,'#efe0b8');
  for(let i=0;i<4;i++) rect(g,-9.6+i*3.3,2.5,2.4,1.7,'#527779');
  rect(g,-7,-2.8,7.3,1.4,'#adb5a5');
  for(const yy of [-4.3,4.3]) { oval(g,7,yy,1.2,.95,'#ce7247'); oval(g,7,yy,.55,.42,'#e9d8b8'); }
  g.restore();
  for(let i=-3;i<=3;i++){
    const x=port+i*40,y=v.bank(x,1)+11;
    line(g,[[x+.5,y+1],[x-1.2,y-2.7]],'#625e4f',.9);
    const power=smooth(.91+(i+3)*.008,.925+(i+3)*.008,p);
    if(power) {
      const light=g.createRadialGradient(x-1,y-3,0,x-1,y-3,11);
      light.addColorStop(0,'rgba(255,217,127,'+(.84*power)+')'); light.addColorStop(.38,'rgba(255,190,103,'+(.35*power)+')'); light.addColorStop(1,'rgba(255,213,122,0)');
      oval(g,x-1,y-3,11,11,light);
    }
    oval(g,x-1.2,y-3,1.1,1.05,power>.45?'#ffe5a0':'#b3a78a');
  }
}
function sky(g,v,c,width,height,t) {
  // Wolken sind in der Welt verankert. Ihr Schatten wandert langsam über Land und Wasser.
  const drift=t*1.65;
  for(let i=Math.floor((c.x-width/2-drift)/580)-1;i<=Math.ceil((c.x+width/2-drift)/580);i++){
    const r=stream(v.seed,'cloud',i),x=i*580+r.range(-90,90)+drift;
    const y=r.range(-242,237)+23*Math.sin(t*.010+i);
    const n=r.int(4,6),size=r.range(.8,1.27),hasCloud=r.next()<.54;
    if(Math.abs(x-c.x)>width/2+92 || Math.abs(y-c.y)>height/2+85) continue;
    for(let j=0;j<n;j++){
      const dx=(j-(n-1)/2)*9*size,dy=r.range(-6,6),rad=r.range(12,21)*size;
      const sx=x+dx+23,sy=y+dy+36;
      const sh=g.createRadialGradient(sx,sy,0,sx,sy,rad*1.6);
      sh.addColorStop(0,'rgba(54,75,82,.095)'); sh.addColorStop(1,'rgba(54,75,82,0)');
      oval(g,sx,sy,rad*1.6,rad*1.6,sh);
      if(hasCloud){
        const cx=x+dx,cy=y+dy, grad=g.createRadialGradient(cx-rad*.22,cy-rad*.29,0,cx,cy,rad);
        grad.addColorStop(0,'rgba(255,249,228,.55)');grad.addColorStop(.63,'rgba(248,246,227,.38)');grad.addColorStop(1,'rgba(239,239,222,0)');
        oval(g,cx,cy,rad,rad,grad);
      }
    }
  }
}
class Film {
  constructor(v,density) { this.valley=v; this.ground=new L.Ground(v,density); }
  draw(g,world,p,t,moving,hud) {
    const v=this.valley,c=v.camera(p,world,moving),w=world.w/c.scale,h=world.h/c.scale,lo=c.x-w/2,hi=c.x+w/2;
    g.save(); g.translate(world.w/2,world.h/2); g.scale(c.scale,c.scale);g.translate(-c.x,-c.y);
    this.ground.draw(g,lo,hi); ripples(g,v,lo,hi,t);
    if(lo<places.mill+29 && hi>places.mill-29) wheel(g,v,t);
    if(lo<places.town+52 && hi>places.town-52) market(g,v,t);
    if(lo<places.marsh+120 && hi>places.marsh-120) ducks(g,v,t);
    if(hi>places.port-160) landing(g,v,p);
    const tr=v.train(p); if(tr.x+20>lo && tr.x-40<hi) train(g,v,p);
    sky(g,v,c,w,h,t); g.restore();
    // Morgendunst löst sich auf. Gegen Abend wird das Ufer warm, die Schatten bleiben kühl.
    const dusk=smooth(.70,1,p);
    const air=g.createLinearGradient(0,0,world.w,world.h);
    air.addColorStop(0,'rgba(255,195,120,'+(.09*(1-smooth(0,.27,p))+.30*dusk)+')');
    air.addColorStop(.52,'rgba(203,143,96,'+(.15*dusk)+')');
    air.addColorStop(1,'rgba(66,69,106,'+(.45*dusk)+')'); g.fillStyle=air;g.fillRect(0,0,world.w,world.h);
    if(hud && p<.025){
      const a=smooth(0,.004,p)*(1-smooth(.015,.025,p)); g.save();g.globalAlpha=a;
      const x=world.w*.055,y=world.h*.88, portrait=world.h>world.w;
      g.font='italic '+(portrait?54:51)+'px Georgia, serif'; g.fillStyle='#fffae5';
      g.shadowColor='rgba(38,51,43,.9)'; g.shadowBlur=6;g.shadowOffsetY=2;g.fillText('Along the River',x,y);g.restore();
    }
  }
  destroy() { this.ground.destroy(); }
}
L.Film=Film;
})();
