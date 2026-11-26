/* Durchgehende Wege mit Bogenlängen. Dieselbe Straße führt durch das Dorf und über die Stadtbrücke. */
(function () {
'use strict';
const L = EBS.CloudLandscape, { line, rect, oval, poly } = L;
const { lerp } = EBS.util;
const mod = (x, length) => ((x % length) + length) % length;

function sampleStreet(points, from, to, yAt) {
  const count = Math.ceil((to - from) / 8);
  for (let i=0; i<=count; i++) {
    const x = lerp(from, to, i/count);
    points.push([x, yAt(x)]);
  }
}
function turn(points, corner, end) {
  const [x,y] = points[points.length - 1];
  for (let i=1; i<=5; i++) {
    const t=i/5, u=1-t;
    points.push([u*u*x+2*u*t*corner[0]+t*t*end[0], u*u*y+2*u*t*corner[1]+t*t*end[1]]);
  }
}
class Route {
  constructor(points) {
    this.points = points;
    this.distance = [0];
    for (let i=1; i<points.length; i++) {
      const [x,y]=points[i], [lastX,lastY]=points[i-1];
      this.distance.push(this.distance[i-1]+Math.hypot(x-lastX,y-lastY));
    }
    this.length = this.distance[this.distance.length-1];
  }
  at(distance, direction, offset) {
    const s = mod(distance, this.length);
    let first=0, last=this.points.length-1;
    while (last-first>1) {
      const mid=(last+first)>>1;
      if (this.distance[mid]<=s) first=mid; else last=mid;
    }
    const [x0,y0]=this.points[first], [x1,y1]=this.points[last];
    const f=(s-this.distance[first])/(this.distance[last]-this.distance[first]);
    const angle=Math.atan2(y1-y0,x1-x0)+(direction<0?Math.PI:0);
    return { x:lerp(x0,x1,f)-Math.sin(angle)*offset, y:lerp(y0,y1,f)+Math.cos(angle)*offset, angle };
  }
}
class RoadTraffic {
  constructor(v) {
    const cx=L.places.town+62, ny=v.northRoad(cx), sy=v.southRoad(cx), street=[];
    sampleStreet(street,-1200,cx-5,x=>v.northRoad(x));
    turn(street,[cx,ny],[cx,ny+5]);
    const bridgeIndex=street.length;
    street.push([cx,v.river(cx)], [cx,sy-5]);
    turn(street,[cx,sy],[cx+5,v.southRoad(cx+5)]);
    sampleStreet(street,cx+6,8000,x=>v.southRoad(x));
    this.street=new Route(street);
    const towpath=[];
    sampleStreet(towpath,-1200,8000,x=>v.bank(x,-1)-9);
    this.towpath=new Route(towpath);
    this.fleet=[];
    for(const direction of [1,-1]) {
      const r=L.stream(v.seed,'road-users',direction);
      const n=direction===1?10:8, gap=this.street.length/n;
      for(let i=0;i<n;i++) {
        const delivery=i===0 && direction===1;
        const start=this.street.distance[bridgeIndex]+i*gap+(delivery?0:direction<0?gap*.40+r.range(-55,55):r.range(-82,82));
        this.fleet.push({ type:delivery?'post':r.next()<.17?'van':'car', direction,
          start, speed:direction===1?10.3:11.2, color:r.int(0,5) });
      }
      const cycles=direction===1?6:4;
      const townPath=this.towpath.distance[towpath.findIndex(([x])=>x>=L.places.town-90)];
      for(let i=0;i<cycles;i++) this.fleet.push({type:'bike',direction,
        start:townPath+(i+(direction===1 && i===0 ? 0 : r.range(.16,.68)))*this.towpath.length/cycles,
        speed:direction===1?4.8:5.2,color:r.int(0,5)});
    }
  }
  positions(t, middle, left=-Infinity, right=Infinity) {
    const vehicles=[];
    for(const f of this.fleet) {
      const bike=f.type==='bike', route=bike?this.towpath:this.street;
      const s=f.start+(t-middle)*f.speed*f.direction;
      const pos=route.at(s,f.direction,bike?.45:1.75);
      if(pos.x>left-9 && pos.x<right+9) vehicles.push({...pos,type:f.type,color:f.color});
    }
    return vehicles;
  }
}
const colors=['#b4644c','#60838b','#e2d6b7','#476b67','#b49a65','#7c8794'];
function drawVehicle(g, v, t, dusk) {
  g.save(); g.translate(v.x,v.y); g.rotate(v.angle);
  if (v.type==='bike') {
    g.scale(1.22,1.22);
    for(const x of [-1.4,1.4]) oval(g,x,.32,.88,.36,'#454e48');
    line(g,[[-1.42,.25],[-.65,-.42],[.4,.34],[1.44,.15]],'#ba975f',.48);
    line(g,[[.72,-.78],[.95,.81]],'#6c7167',.38);
    oval(g,-.24,0,.92,.61,colors[v.color]);
    oval(g,.19,-.15,.54,.49,'#dec29b');
    oval(g,-.52,Math.sin(t*4.4)*.46,.38,.28,'#646451');
  } else {
    const long=v.type!=='car', half=long?4.25:3.35, w=long?1.67:1.44;
    for(const wheel of [-half*.58,half*.57]) rect(g,wheel-.56,-w-.16,1.05,w*2+.32,'#414943');
    const outline=[[-half,-w+.3],[-half+.7,-w],[half-.9,-w],[half,-w+.63],[half,w-.48],[half-.8,w],[-half+.4,w],[-half,w-.34]];
    g.save();g.translate(.48,.65);poly(g,outline,'rgba(49,50,37,.32)');g.restore();
    poly(g,outline,v.type==='post'?'#d3a751':colors[v.color],'#525a50',.30);
    rect(g,half*.16,-w+.25,half*.35,w*2-.55,'#566e72');
    rect(g,-half+.72,-w+.23,long?half*1.03:half*.83,w*2-.52,long?'#e1d3af':colors[v.color]);
    if(!long) rect(g,-half*.55,-w+.22,.64,w*2-.48,'#678182');
    if(v.type==='post') rect(g,-2.4,-.55,1.8,1.1,'#a4793c');
    for(const side of [-1,1]) rect(g,half-.39,side*w*.67-.19,.52,.45,dusk>.5?'#ffdd8f':'#e8d8ae');
  }
  g.restore();
}
Object.assign(L,{RoadTraffic,drawVehicle});
})();
