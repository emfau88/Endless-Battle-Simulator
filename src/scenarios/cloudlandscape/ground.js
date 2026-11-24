/* Bodengrafik: angrenzende Streifen benutzen dasselbe Weltraster und dieselben Formen. */
(function () {
'use strict';
const L = EBS.CloudLandscape, { line, poly, oval, rect, tree, building, boat, places, stream } = L;
const noise = EBS.CloudWarsTerrain.vnoise, mix = EBS.util.lerp;
const strip = 320, top = -620, height = 1240, bleed = 12;
const crops = ['#c8ad60','#c7b76c','#9ba55e','#ad895e','#889e64','#b9a875','#9faf73','#d4bd78'];
const woodland = (v,x,y) => noise(x/181+5,y/126+6,v.soil);
function pathPoints(lo, hi, fn, step = 8) {
  const pts = [];
  for (let x = lo; x <= hi; x += step) pts.push([x, fn(x)]);
  return pts;
}
function ribbon(g, lo, hi, upper, lower, color) {
  poly(g, pathPoints(lo,hi,upper).concat(pathPoints(lo,hi,lower).reverse()),color);
}
function parcel(v,i,j) {
  return [i*121+j*15+37*Math.sin(i*.65+j*.4+v.phase)+11*noise(i,j,v.soil),
    j*72+21*Math.sin(i*.63+j*.72+v.bend)+15*noise(i+9,j,v.soil)];
}
function fields(g,v,lo,hi) {
  for (let j=-11;j<=10;j++) for(let i=Math.floor((lo-j*15)/121)-2;i<=Math.ceil((hi-j*15)/121)+1;i++) {
    const corners=[parcel(v,i,j),parcel(v,i+1,j),parcel(v,i+1,j+1),parcel(v,i,j+1)];
    const x=(corners[0][0]+corners[2][0])/2, y=(corners[0][1]+corners[2][1])/2;
    if (x<lo-115 || x>hi+115) continue;
    const r=stream(v.seed,'parcel',i,j);
    if(woodland(v,x,y)>.57 || r.next()<.17 || (Math.abs(x-places.marsh)<380 && Math.abs(y-v.river(x))<150)) continue;
    const plot=corners.map(([px,py])=>[mix(px,x,.047),mix(py,y,.067)]);
    const crop=r.int(0,crops.length-1);
    poly(g,plot,crops[crop],'rgba(120,126,76,.62)',1.15);
    const across=r.next()<.42, count=across?23:17;
    for(let n=1;n<count;n++) {
      const t=n/count, a=plot[0], b=plot[across?1:3], c=plot[2], d=plot[across?3:1];
      line(g,[[mix(a[0],b[0],t),mix(a[1],b[1],t)],[mix(d[0],c[0],t),mix(d[1],c[1],t)]],
        n%4?'rgba(246,224,152,.21)':'rgba(107,105,67,.23)',n%4?.65:1.15);
    }
    const baleCount=crop===0 || crop===5 ? r.int(2,5) : 0;
    for(let n=0;n<baleCount;n++){
      const bx=mix(x,plot[n%4][0],r.range(.22,.62)),by=mix(y,plot[n%4][1],r.range(.2,.6));
      oval(g,bx+1,by+.8,2.4,1.3,'#9b8a57'); oval(g,bx,by,2,1.3,'#ddc47d');
    }
  }
}
function water(g,v,lo,hi) {
  const bank=(side,inset=0)=>x=>v.bank(x,side)-side*inset;
  ribbon(g,lo,hi,bank(-1,-6),bank(1,-6),'#96a477');
  ribbon(g,lo,hi,bank(-1,-2.5),bank(1,-2.5),'#d0c493');
  ribbon(g,lo,hi,bank(-1),bank(1),'#82ada0');
  ribbon(g,lo,hi,bank(-1,3),bank(1,3),'#679a94');
  ribbon(g,lo,hi,x=>v.river(x)-v.width(x)*.72,x=>v.river(x)+v.width(x)*.77,'#548a89');
  ribbon(g,lo,hi,x=>v.river(x)-v.width(x)*.40+2*Math.sin(x/34),x=>v.river(x)+v.width(x)*.54,'#4e8385');
  for(const mill of [true,false]){
    if(hi < (mill?-180:4640) || lo > (mill?415:5430)) continue;
    const a=mill?-170:4650,b=mill?405:5420;
    for(const [extra,color] of [[2.3,'#b9b78c'],[0,'#79a69b'],[-1.4,'#64938f']]){
      const pts=[];
      for(let x=Math.max(Math.floor(a/4)*4,lo);x<=Math.min(Math.ceil(b/4)*4,hi);x+=4){
        const q=v.branch(x,mill); pts.push([x,q.y,Math.max(0,q.w+extra)]);
      }
      if(pts.length>1) poly(g,pts.map(([x,y,d])=>[x,y-d]).concat(pts.map(([x,y,d])=>[x,y+d]).reverse()),color);
    }
  }
}
function paper(g,v) {
  const can=document.createElement('canvas'); can.width=can.height=128;
  const c=can.getContext('2d'), r=stream(v.seed,'fine-paper');
  for(let i=0;i<2400;i++){
    const x=r.range(0,128), y=r.range(0,128);
    rect(c,x,y,r.range(.4,1.8),r.range(.4,1.25), i%3?'rgba(64,67,48,.09)':'rgba(248,233,191,.19)');
  }
  return g.createPattern(can,'repeat');
}
function reeds(g,v,lo,hi) {
  for(let i=Math.floor(lo/11)-1;i<=Math.ceil(hi/11);i++){
    const r=stream(v.seed,'sedge',i),x=i*11+r.range(-3,3),marsh=Math.abs(x-places.marsh)<360;
    if(!marsh && r.next()>.32) continue;
    const side=r.next()<.5?-1:1, b=v.branch(x,false);
    const y=marsh&&r.next()<.55?b.y-b.w:v.bank(x,side);
    for(let j=0;j<(marsh?9:4);j++){
      const xx=x+r.range(-4,4),yy=y+r.range(-2,2);
      line(g,[[xx,yy+.8],[xx+r.range(-1.4,1.1),yy-r.range(1.7,4.6)]],j%3?'#798858':'#a3a165',.78);
    }
  }
  // Auf der Insel gehen sandige Bänke in Schilfpolster und etwas höheres Weidengebüsch über.
  for(let i=Math.floor(Math.max(lo-12,4660)/8);i<=Math.ceil(Math.min(hi+12,5410)/8);i++){
    const r=stream(v.seed,'reedbed',i),x=i*8+r.range(-3,3),b=v.branch(x,false);
    const near=v.bank(x,1)+4,far=b.y-b.w-4,space=far-near;
    if(space<5) continue;
    for(let k=0;k<4;k++){
      const y=mix(near,far,r.next()),rad=Math.min(space*.27,r.range(3,10));
      oval(g,x,y,rad,rad*.48,k%2?'#98a36c':'#a9ae76',-.14);
      for(let j=0;j<7;j++){
        const xx=x+r.range(-rad*.7,rad*.7),yy=y+r.range(-rad*.25,rad*.22);
        line(g,[[xx,yy],[xx+.7,yy-r.range(1.8,4.1)]],j%3?'#7b905f':'#c0be80',.63);
      }
    }
  }
}
function tracks(g,v,lo,hi) {
  if(hi<600 || lo>4400) return;
  const pts=pathPoints(lo,hi,x=>v.rail(x),4);
  line(g,pts,'#aa9c83',9); line(g,pts,'#7f7970',6);
  for(let i=Math.floor(lo/4.5);i<=Math.ceil(hi/4.5);i++){
    const x=i*4.5, y=v.rail(x), a=v.railAngle(x), s=Math.sin(a)*3.9,c=Math.cos(a)*3.9;
    line(g,[[x-s,y+c],[x+s,y-c]],'#665d50',1.45);
  }
  for(const dy of [-1.9,1.9]) line(g,pts.map(([x,y])=>[x,y+dy/Math.cos(v.railAngle(x))]),'#d5d0ba',.95);
}
function viaduct(g,v) {
  const cx=places.bridge, ax=cx-79,bx=cx+79;
  const pts=pathPoints(ax,bx,x=>v.rail(x),2);
  line(g,pts.map(([x,y])=>[x+4,y+12]),'rgba(36,59,57,.23)',14);
  for(let x=ax+6;x<=bx;x+=19){
    const y=v.rail(x); poly(g,[[x-3,y+1],[x+5,y-3],[x+6,y+9],[x-1,y+13]],'#9b9279');
    line(g,[[x-1,y+13],[x+6,y+9]],'#746f61',1);
  }
  line(g,pts,'#77786b',15); line(g,pts,'#d3c7a6',13); line(g,pts,'#969288',9.5);
}
function roads(g,v,lo,hi) {
  const tow=pathPoints(lo,hi,x=>v.bank(x,-1)-9);
  line(g,tow,'#b9b590',2.3);
  for(const l of v.lanes){
    if(l.pts[0][0]>hi+18 || l.pts[l.pts.length-1][0]<lo-18) continue;
    line(g,l.pts,'#ab9f7d',l.size+2); line(g,l.pts,'#d4c6a5',l.size);
    if(l.size>6) line(g,l.pts,'#dfcfaf',l.size*.58);
  }
  const x=places.town+62;
  if(x>=lo-12 && x<=hi+12){
    const y1=v.bank(x,-1)-4,y2=v.bank(x,1)+4;
    line(g,[[x+3,y1+4],[x+3,y2+4]],'rgba(55,76,67,.29)',13);
    rect(g,x-6.5,y1,13,y2-y1,'#716f61'); rect(g,x-5.7,y1,11.4,y2-y1,'#d6c6a3');
    rect(g,x-3.8,y1,7.6,y2-y1,'#b6a78f');
    for(let y=y1;y<y2;y+=8) for(const dx of [-5.7,5.7]) rect(g,x+dx-.65,y,1.3,1.8,'#887e69');
  }
}
function nearLane(v,x,y) {
  return v.lanes.some(l=>{
    if(x<l.pts[0][0]-10 || x>l.pts[l.pts.length-1][0]+10) return false;
    return l.pts.some(([px,py])=>Math.abs(px-x)<12 && Math.abs(py-y)<12);
  });
}
function woods(g,v,lo,hi) {
  const trees=[];
  for(let j=-38;j<=37;j++) for(let i=Math.floor(lo/20)-1;i<=Math.ceil(hi/20)+1;i++){
    const r=stream(v.seed,'crown',i,j), x=i*20+r.range(-7,7),y=j*17+r.range(-6,6);
    const grove=woodland(v,x,y), nearMarsh=Math.abs(x-places.marsh)<300;
    if(r.next() > (grove>.60 ? .88 : grove>.51 ? .32 : .022)) continue;
    if(v.wet(x,y,7) || Math.abs(y-v.rail(x))<13 || nearLane(v,x,y)) continue;
    if(nearMarsh && Math.abs(y-v.river(x))<105) continue;
    if(Math.abs(x-places.town)<240 && y>v.rail(x)-35 && y<v.bank(x,1)+96) continue;
    if(Math.abs(x-places.port)<165 && Math.abs(y-v.bank(x,1))<53) continue;
    if(v.houses.some(h=>Math.abs(h.x-x)<h.w*.56+8 && Math.abs(h.y-y)<h.h*.60+11)) continue;
    if(v.groves.some(o=>Math.abs(x-o.x)<o.cols*7+6 && Math.abs(y-o.y)<o.rows*7+7)) continue;
    trees.push([x,y,r.range(4.5,nearMarsh?8:11),r.int(0,7)]);
  }
  for(const o of v.groves){
    for(let j=0;j<o.rows;j++) for(let i=0;i<o.cols;i++){
      const x=o.x+(i-(o.cols-1)/2)*13.2, y=o.y+(j-(o.rows-1)/2)*12+i*.8;
      if(x>lo-10 && x<hi+10 && !v.wet(x,y,4)) trees.push([x,y,4.9,(i+j)%3,true]);
    }
  }
  trees.sort((a,b)=>a[1]-b[1] || a[0]-b[0]);
  for(const t of trees) tree(g,...t);
}
function fixedPlaces(g,v,lo,hi) {
  const { town,port,marsh,mill }=places;
  if(Math.abs((lo+hi)/2-town)<(hi-lo)/2+220){
    const y=v.bank(town,-1)-86;
    rect(g,town-48,y-29,96,59,'#a89f83'); rect(g,town-46,y-27,92,55,'#d5c6a7');
    for(let j=0;j<12;j++) for(let i=0;i<18;i++) rect(g,town-43+i*5+(j%2)*2,y-25+j*4.4,2.3,.65,'#c0b59b');
    for(let i=0;i<6;i++) {
      const x=town-29+(i%3)*21,sy=y+(i<3?-12:14);
      rect(g,x-5,sy-2,12,8,'rgba(81,70,54,.22)'); rect(g,x-5,sy-4,10,7,'#866f52');
      const color=['#a95d43','#5d8581','#c49b4f','#688b65','#b56b58','#73869a'][i];
      for(let k=0;k<6;k++) rect(g,x-6+k*2,sy-5,2.05,7.8,k%2?'#e7d8b8':color);
      line(g,[[x-6,sy-1.6],[x+6,sy-1.6]],'rgba(66,59,48,.28)',.75);
    }
    oval(g,town+30,y,6,5,'#aaa38b'); oval(g,town+30,y-.5,4.5,3.8,'#85a5a0');
    oval(g,town+30,y-.8,1.55,1.5,'#e1d9bd');
    for(const [dx,dy] of [[-42,-22],[-41,22],[41,-21],[41,22]]) {
      tree(g,town+dx,y+dy,4.1,1); rect(g,town+dx-2,y+dy+5.5,4.2,1.3,'#847258');
    }
    const station=pathPoints(town-50,town+50,x=>v.rail(x)-7,2);
    line(g,station,'#a28d72',6); line(g,station,'#d9c8a9',4); 
    for(const dx of [-39,-20,22,40]) rect(g,town+dx,v.rail(town+dx)-10,4.5,1.4,'#735e4c');
  }
  if(lo<port+165 && hi>port-175){
    const quay=pathPoints(port-135,port+141,x=>v.bank(x,1)+3,3);
    line(g,quay,'#8e8d75',10); line(g,quay,'#c7b69a',7);
    const berth=stream(v.seed,'moorings');
    for(const dx of [-105,-56,16,75,118]){
      const x=port+dx,y=v.bank(x,1)+3,len=dx===16?48:25;
      rect(g,x-2.8,y-len+2,7,len,'rgba(46,67,57,.30)'); rect(g,x-2.7,y-len,5.4,len,'#a88b65');
      for(let j=1;j<len;j+=3.1) line(g,[[x-2.5,y-j],[x+2.5,y-j]],'#c8ac83',.65);
      for(const s of [-1,1]) oval(g,x+s*2.7,y-len+.3,1.05,1,'#665b48');
      if(dx!==16) boat(g,x+6,y-len*.60,berth.range(1.42,1.63),berth.range(.60,.83),dx>0?'#ab694d':'#728c7f',dx%2===0);
    }
    const cx=port-62,cy=v.bank(cx,1)+7;
    for(let k=0;k<11;k++) { const xx=cx-22+(k%4)*3.9,yy=cy+3+Math.floor(k/4)*3;
      rect(g,xx,yy,3.3,2.6,k%2?'#a1825c':'#bb9b70'); line(g,[[xx,yy],[xx+3,yy+2.2]],'#907655',.45); }
    oval(g,cx,cy,3.2,2.5,'#81765f');
    line(g,[[cx,cy],[cx-1,cy-7],[cx-8,cy-15]],'#6c7165',1.8);
    line(g,[[cx,cy],[cx-8,cy-15],[cx-8,cy-6]],'#a39674',.8);
  }
  if(lo<marsh+30 && hi>marsh-50){
    const x=marsh-20,y=v.branch(x,false).y; rect(g,x-2,y-2,3.4,20,'#a58863');
    boat(g,x+2,y+2,1.39,.51,'#948263',false);
  }
  for(const h of v.houses) if(h.x>lo-39 && h.x<hi+39) building(g,h);
  if(lo<mill+20 && hi>mill-20) {
    const y=v.branch(mill,true).y;
    rect(g,mill-13,y-4,27,6.6,'#a28964');
    for(const dx of [-12,11]) rect(g,mill+dx,y-5.5,1.5,9,'#77644d');
  }
}
class Ground {
  constructor(v,density) {
    this.v=v; this.density=Math.round(Math.max(1,Math.min(3,density))*4)/4;
    this.tiles=new Map();
  }
  make(i) {
    const d=this.density,x0=i*strip, lo=x0-64,hi=x0+strip+64,v=this.v;
    const c=document.createElement('canvas'); c.width=(strip+bleed*2)*d; c.height=height*d;
    const g=c.getContext('2d',{alpha:false});
    g.setTransform(d,0,0,d,(-x0+bleed)*d,-top*d); g.lineCap='round'; g.lineJoin='round';
    rect(g,x0-bleed,top,strip+bleed*2,height,'#a9b382');
    for(let j=-8;j<9;j++) for(let k=Math.floor(lo/97)-1;k<=Math.ceil(hi/97)+1;k++){
      const r=stream(v.seed,'meadow',k,j),x=k*97+r.range(-22,22),y=j*82+r.range(-20,20);
      oval(g,x,y,r.range(47,87),r.range(23,50),'rgba(119,145,96,.14)',r.range(-.9,.9));
    }
    fields(g,v,lo,hi);
    for(let x=lo;x<=hi;x+=16) for(let y=top;y<top+height;y+=22) {
      const grove=woodland(v,x,y);
      if(grove>.60) oval(g,x,y,15,12,'rgba(78,116,76,'+Math.min(.5,(grove-.6)*2)+')',.18);
    }
    this.grain ||= paper(g,v); g.fillStyle=this.grain; g.fillRect(x0-bleed,top,strip+2*bleed,height);
    water(g,v,lo,hi); reeds(g,v,lo,hi);
    const town=places.town;
    if(lo<town+224 && hi>town-224){
      const a=Math.max(town-224,lo),b=Math.min(town+224,hi);
      ribbon(g,a,b,x=>v.bank(x,-1)-150,x=>v.bank(x,-1)-13,'#a9ad82');
      ribbon(g,a,b,x=>v.bank(x,1)+43,x=>v.bank(x,1)+83,'#a7ac7d');
    }
    if(lo<places.port+145 && hi>places.port-145){
      const a=Math.max(places.port-144,lo),b=Math.min(places.port+144,hi);
      ribbon(g,a,b,x=>v.bank(x,1),x=>v.bank(x,1)+29,'#c7b99b');
    }
    roads(g,v,lo,hi);
    if(lo<places.bridge+120 && hi>places.bridge-120) viaduct(g,v);
    tracks(g,v,lo,hi); fixedPlaces(g,v,lo,hi); woods(g,v,lo,hi);
    return c;
  }
  draw(g,left,right) {
    const first=Math.floor(left/strip),last=Math.floor(right/strip),d=this.density;
    for(let i=first;i<=last;i++){
      if(!this.tiles.has(i)) this.tiles.set(i,this.make(i));
      // Eine Welteinheit Überdeckung vermeidet feine Lücken bei Subpixel-Kamerapositionen.
      g.drawImage(this.tiles.get(i),(bleed-1)*d,0,(strip+2)*d,height*d,i*strip-1,top,strip+2,height);
    }
    for(const [i,tile] of this.tiles) if(i<first-1 || i>last+1) {
      this.tiles.delete(i); tile.width=tile.height=1;
    }
  }
  destroy() { for(const tile of this.tiles.values()) tile.width=tile.height=1; this.tiles.clear(); this.grain=null; }
}
Object.assign(L,{Ground});
})();
