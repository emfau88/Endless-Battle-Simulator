// Standbild nach Maschinentakt 9. Die Reihenfolge der 24 Kugeln gilt für beide Bahnen.
(() => {
  'use strict';
  const canvas = document.querySelector('canvas'), g = canvas.getContext('2d');
  const tau = 2 * Math.PI;
  const magazineWidth = 10.4, magazineGap = 1.18;
  const auger = { dark: '#23484b', mid: '#498f89', light: '#a4e0cc', ink: '#77d6bd' };
  const piston = { dark: '#683b2f', mid: '#ba704e', light: '#edb28a', ink: '#f5aa7d' };
  const pearl = [['#fff4cd','#e2c888','#907445'], ['#d5fff1','#76c9b0','#32685e'],
    ['#ffe2ac','#eaa45d','#945832'], ['#ffdcc5','#df9273','#874c41']];
  const sequence = [0,2,1,3,2,0,1,0,3,2,1,0,2,3,0,1,1,2,0,3,1,2,3,0];
  const load = [
    { label: 'AUGER', color: auger, goal: 8, inMachine: 2 },
    { label: 'PISTON', color: piston, goal: 7, inMachine: 7 }
  ];
  const frames = {
    hoch: {
      w: 720, h: 1280, r: 11, title: [360, 141, 72], feeder: [360, 211],
      lanes: [
        { root: [281, 657], head: [162, 393], cup: [240, 1045], bends: [[79,431],[68,474],[68,646],[102,690],[240,734]] },
        { root: [439, 657], head: [558, 393], cup: [480, 1045], bends: [[641,431],[652,474],[652,646],[618,690],[480,734]] }
      ]
    },
    quer: {
      w: 1280, h: 720, r: 9.6, title: [640, 77, 54], feeder: [640, 117],
      lanes: [
        { root: [518, 463], head: [213, 239], cup: [135, 571], bends: [[154,281],[135,302]] },
        { root: [762, 463], head: [1067, 239], cup: [1145, 571], bends: [[1126,281],[1145,302]] }
      ]
    }
  };
  function linear(x, y, xx, yy, stops) {
    const fill = g.createLinearGradient(x, y, xx, yy);
    for (const [at, color] of stops) fill.addColorStop(at, color);
    return fill;
  }
  function radial(x, y, r, stops) {
    const fill = g.createRadialGradient(x, y, 0, x, y, r);
    for (const [at, color] of stops) fill.addColorStop(at, color);
    return fill;
  }
  function paint(path, fill, line, width = 1) {
    if (typeof path === 'string') path = new Path2D(path);
    if (fill) { g.fillStyle = fill; g.fill(path); }
    if (line) { g.strokeStyle = line; g.lineWidth = width; g.stroke(path); }
  }
  function box(x, y, w, h, radius, fill, line, width = 1) {
    const p = new Path2D(); p.roundRect(x, y, w, h, radius); paint(p, fill, line, width);
  }
  function oval(x, y, rx, ry, fill, line, width = 1) {
    const p = new Path2D(); p.ellipse(x,y,rx,ry,0,0,tau); paint(p, fill, line, width);
  }
  function segment(x, y, xx, yy, color, width) {
    const p = new Path2D(); p.moveTo(x,y); p.lineTo(xx,yy); paint(p,null,color,width);
  }
  function shine(y, height, c) {
    return linear(0,y,0,y+height,[[0,c.dark],[.09,c.mid],[.18,c.light],[.35,c.mid],[.73,c.dark],[.87,c.mid],[1,c.dark]]);
  }
  function steel(y, h) {
    return linear(0,y,0,y+h,[[0,'#2d4346'],[.12,'#91a7a5'],[.25,'#e1e2c9'],[.32,'#92a7a1'],[.64,'#576b6a'],[.84,'#30464a'],[1,'#778581']]);
  }
  function bolt(x, y, r) {
    oval(x,y+1.4,r+1,r+1,'#162a2e');
    const fill = linear(x-r,y-r,x+r,y+r,[[0,'#d7d4b8'],[.35,'#9bada3'],[1,'#526760']]);
    oval(x,y,r,r,fill,'#394e4e',.7);
    segment(x-r*.44,y+r*.25,x+r*.44,y-r*.25,'#435454',Math.max(1,r*.25));
  }
  function marble(x, y, r, id) {
    const p = pearl[sequence[id]];
    const fill = g.createRadialGradient(x-r*.41,y-r*.51,r*.03,x+r*.09,y+r*.1,r*1.12);
    [[0,'#fff9e6'],[.17,p[0]],[.50,p[1]],[.84,p[2]],[1,'#384a45']].forEach(([a,c])=>fill.addColorStop(a,c));
    oval(x,y+r*.11,r+.45,r,'rgba(9,24,24,.63)');
    oval(x,y,r,r,fill,'rgba(16,35,34,.72)',.75);
    oval(x-r*.30,y-r*.41,r*.23,r*.11,'rgba(255,255,242,.85)');
  }
  function shadow(fn, amount = 8) {
    g.save(); g.shadowColor='rgba(4,13,16,.68)'; g.shadowOffsetX=amount*.27; g.shadowOffsetY=amount*.65;
    g.shadowBlur=amount; fn(); g.restore();
  }
  function background(w,h) {
    g.fillStyle = linear(0,0,w,h,[[0,'#233a40'],[.45,'#1d3339'],[1,'#111f25']]);
    g.fillRect(0,0,w,h);
    g.fillStyle = radial(w*.49,h*.38,Math.max(w,h)*.70,[[0,'rgba(100,136,127,.23)'],[1,'rgba(4,15,19,.14)']]);
    g.fillRect(0,0,w,h);
    const tile=document.createElement('canvas'); tile.width=tile.height=96;
    const t=tile.getContext('2d'), pixels=t.createImageData(96,96), rng=new EBS.RNG(429);
    for(let i=0;i<pixels.data.length;i+=4) {
      const tone=rng.int(0,1)*255;
      pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=tone; pixels.data[i+3]=rng.int(0,9);
    }
    t.putImageData(pixels,0,0); g.fillStyle=g.createPattern(tile,'repeat'); g.fillRect(0,0,w,h);
  }
  function title([x,y,size]) {
    g.font='700 '+size+'px Bahnschrift, "Arial Narrow", Arial, sans-serif';
    g.textBaseline='alphabetic'; g.textAlign='left';
    const a='FIRST TO ', b='12', start=x-(g.measureText(a).width+g.measureText(b).width)/2;
    g.fillStyle='#efeede'; g.fillText(a,start,y);
    g.fillStyle='#f3c477'; g.fillText(b,start+g.measureText(a).width,y);
  }
  function route(points, corner) {
    const path = new Path2D(); path.moveTo(...points[0]);
    for(let i=1;i<points.length-1;i++) path.arcTo(...points[i],...points[i+1],corner);
    path.lineTo(...points.at(-1)); return path;
  }
  function glassPipe(points, diameter) {
    const p=route(points,diameter*1.38);
    shadow(()=>paint(p,null,'#253c40',diameter+3),5);
    paint(p,null,'#809e9a',diameter); paint(p,null,'#2e464a',diameter-3);
    paint(p,null,'#3b5557',diameter*.68);
    g.save(); g.translate(-diameter*.16,-1); paint(p,null,'rgba(202,225,209,.27)',diameter*.13); g.restore();
  }
  function mount(x,y,r) {
    shadow(()=>box(x-r,y-r*.64,r*2,r*1.3,9,'#35494a','#728280',1.3),7);
    bolt(x-r*.74,y+r*.32,3.8); bolt(x+r*.74,y+r*.32,3.8);
  }
  function drive(frame) {
    const [left,right]=frame.lanes.map(lane=>lane.root);
    const r=frame.r*2.35, x=left[0], y=left[1], end=right[0];
    shadow(()=>box(x-r-6,y-r-6,end-x+2*r+12,2*r+12,r+6,'#394f50','#697d78',1.5),7);
    box(x-r,y-r,end-x+2*r,2*r,r,'#203539','#14292c',2);
    for (const cx of [x,end]) {
      oval(cx,y,r-2,r-2,steel(y-r,r*2),'#81968c',1);
      bolt(cx,y,5);
    }
    // Der Zahnriemen verbindet die beiden Antriebe hinter den offenliegenden Maschinen.
    for (const yy of [y-r+2,y+r-2]) {
      segment(x,yy,end,yy,'#111f23',5);
      for (let tx=x+3;tx<end;tx+=6) segment(tx,yy-1.6,tx+1,yy+1.6,'#61706a',1.4);
    }
  }
  function laneAxes(lane) {
    const [x,y]=lane.root, dx=lane.head[0]-x, dy=lane.head[1]-y;
    const length=Math.hypot(dx,dy), c=dx/length, s=dy/length;
    return { length, angle:Math.atan2(dy,dx), at:(u,v)=>[x+u*c-v*s,y+u*s+v*c] };
  }
  function feedUnit(frame) {
    const [x,y]=frame.feeder, r=frame.r, width=r*magazineWidth, gap=r*magazineGap, h=r*10.0, d=(width+gap)/2;
    g.save(); g.translate(x,y);
    for(const [idx, side] of [-1,1].entries()) {
      const c=idx?piston:auger, cx=side*d;
      g.save(); g.translate(cx,0);
      const mouth=r*1.45, w=width/2;
      const walls=new Path2D('M'+(-w)+' 0H'+w+'V'+h*.62+'L'+mouth+' '+h+'H'+(-mouth)+'L'+(-w)+' '+h*.62+'Z');
      shadow(()=>paint(walls,linear(-w,0,w,h,[[0,'#4e696b'],[.38,'#283f44'],[.7,'#21363c'],[1,'#415b5e']]),'#7b9b97',2),6);
      const ids=load[idx].goal+load[idx].inMachine, count=sequence.length-ids;
      const rows=[[0],[-1,1],[-2,0,2],[-3,-1,1,3],[-4,-2,0,2,4]];
      let n=0;
      for (const [row,positions] of rows.entries()) {
        for(const offset of positions) {
          if(n<count) marble(offset*r,h-r*.92-row*1.76*r,r,ids+n++);
        }
      }
      g.save(); g.clip(walls);
      paint(walls,linear(-w,0,w,0,[[0,'#d5f3ed38'],[.10,'#b4d7cc11'],[.22,'#bbddd419'],[.3,'#ffffff00'],[.80,'#ffffff00'],[1,'#d3eee723']]));
      segment(-w+4,3,-w+4,h*.58,'#d2e7d5a8',2);
      g.restore();
      box(-mouth-3,h-2,2*mouth+6,10,3,shine(h-2,10,c),'#263a3c',1);
      g.restore();
    }
    const total=width*2+gap;
    shadow(()=>box(-total/2-5,-9,total+10,14,4,steel(-9,14),'#253a3a',1),3);
    bolt(-total/2+4,-2,3); bolt(total/2-4,-2,3);
    g.restore();
  }
  function sleeve(x,w,r,c) {
    box(x,-r,w,r*2,3,shine(-r,r*2,c),'#253b3c',1.4);
    segment(x+3,-r+4,x+3,r-4,'#e2e8cc77',1.2);
  }
  function tubeBack(start,end,r) {
    const fill=linear(0,-r,0,r,[[0,'#8da6a0'],[.075,'#607e7d'],[.18,'#304c50'],[.5,'#20393e'],[.84,'#314b50'],[1,'#799590']]);
    shadow(()=>box(start,-r,end-start,2*r,5,fill,'#243b3d',2),7);
  }
  function tubeFront(start,end,r) {
    const sheen=linear(0,-r,0,r,[[0,'#e0f7df18'],[.05,'#e4f7e653'],[.11,'#ffffff03'],[.7,'#ffffff00'],[.88,'#9cbeb11b'],[1,'#d8e6d453']]);
    box(start,-r,end-start,2*r,4,sheen);
    segment(start+4,-r+2,end-4,-r+2,'#d8eee0bc',1.5);
    segment(start+5,r-2,end-4,r-2,'#afc9bf98',1.2);
  }
  function helix(length,r) {
    const pitch=(length-37)/5.65, slices=260;
    const faces=[];
    function point(a,radius,thick=0) {
      return [16+pitch*a/tau+.18*radius*Math.sin(a)+thick,radius*Math.cos(a)];
    }
    function polygon(points,color) {
      const p=new Path2D(); p.moveTo(...points[0]); for(const v of points.slice(1))p.lineTo(...v);
      p.closePath(); paint(p,color,color,.48);
    }
    for(let i=0;i<slices;i++) {
      const a=i*5.65*tau/slices, b=(i+1)*5.65*tau/slices;
      const mid=(a+b)/2, z=Math.sin(mid), glow=(1+Math.cos(mid-.65))/2;
      const shade=Math.round(67+116*glow+13*Math.max(0,z));
      const face='rgb('+Math.round(shade*.79)+','+Math.min(255,shade+15)+','+(shade+9)+')';
      faces.push({z, draw() {
        polygon([point(a,r),point(b,r),point(b,r,3.3),point(a,r,3.3)],z>-.12?'#c4d2bf':'#637b74');
        polygon([point(a,6.6),point(a,r),point(b,r),point(b,6.6)],face);
      }});
    }
    for(const f of faces) if(f.z<0) f.draw();
    box(4,-6.8,length-11,13.6,4,steel(-6.8,13.6));
    for(const f of faces) if(f.z>=0) f.draw();
  }
  function augerMachine(length,r,side) {
    const radius=r*3.00;
    tubeBack(4,length,radius);
    helix(length,radius-4);
    // Zwei Kugeln im Förderweg, die anderen liegen im Magazin oder im Zielglas.
    marble(length*.38,side*radius*.52,r,load[0].goal+1);
    marble(length*.74,side*radius*.48,r,load[0].goal);
    tubeFront(4,length,radius);
    sleeve(1,11,radius+4,auger); sleeve(length-15,15,radius+5,auger);
    box(-49,-radius*.82,48,radius*1.64,8,shine(-radius*.82,radius*1.64,auger),'#233b3d',2);
    for(let x=-41;x<-6;x+=7) box(x,-radius*.9,3.8,radius*1.8,1.8,steel(-radius*.9,radius*1.8));
    box(-57,-radius*.51,10,radius*1.02,2,steel(-radius*.51,radius*1.02));
  }
  function pressMachine(length,r,side) {
    const radius=r*3.45, face=length*.52, wh=r*4.25;
    tubeBack(length*.28,length,radius);
    const rim=linear(-wh,-wh,wh,wh,[[0,'#f3c9a1'],[.32,'#cc8c67'],[.6,'#673c32'],[1,'#c68660']]);
    shadow(()=>oval(0,0,wh,wh,rim,'#352f2b',2.4),6);
    oval(0,0,wh-5,wh-5,radial(-wh*.25,-wh*.35,wh*1.65,[[0,'#cc825c'],[.7,'#98573e'],[1,'#543b34']]),'#edd3a48a',1);
    for(let i=0;i<5;i++) {
      const a=i*tau/5+.45, x=wh*.65*Math.cos(a), y=wh*.65*Math.sin(a);
      oval(x,y,r*.79,r*.79,'#303c3b','#dda079',1.4);
      oval(x+.7,y+1.3,r*.61,r*.62,'#1d3033');
    }
    bolt(0,0,r*.78);
    const pin=[wh*.24,-wh*.48], wrist=[length*.29,0];
    segment(...pin,...wrist,'#3c443e',r*1.15);
    segment(...pin,...wrist,'#b7bcb0',r*.81);
    bolt(...pin,r*.61); bolt(...wrist,r*.59);
    box(wrist[0],-r*.51,face-wrist[0],r*1.02,3,steel(-r*.51,r*1.02));
    sleeve(face-r*.72,r*1.02,radius-3,piston);
    const rows=[[-2,0,2],[-1,1],[0,2]];
    let id=load[1].goal;
    rows.forEach((cols,row)=>cols.forEach(v=>marble(face+1.36*r+row*1.75*r,side*v*r,r,id++)));
    tubeFront(length*.28,length,radius);
    sleeve(length*.28,10,radius+3,piston); sleeve(length-13,13,radius+4,piston);
    const gate=length-r*2.35;
    segment(gate,-radius+4,gate+r*.72,radius*.32,'#b8beb0',4);
    bolt(gate,-radius+4,3.3);
  }
  function target(frame, lane, side, count) {
    const [cx, floor]=lane.cup, r=frame.r, c=side<0?auger:piston;
    const goal=-24*r, lip=goal-r*2.3, rad=r*1.54;
    g.save(); g.translate(cx,floor);
    const backing=linear(-rad,0,rad,0,[[0,'#31494d'],[.32,'#1b3338'],[.8,'#2d4449'],[1,'#718a86']]);
    shadow(()=>box(-rad,lip,rad*2,-lip+2,rad*.58,backing,'#78918e',1.8),6);
    for(let i=0;i<count;i++) marble(0,-r-i*2*r,r,i);
    box(-rad+1,lip+2,rad*2-2,-lip-3,rad*.38,linear(-rad,0,rad,0,[[0,'#d5f1ed50'],[.10,'#e7fffc60'],[.17,'#e5ffff0a'],[.6,'#ffffff00'],[.86,'#abdcce16'],[1,'#efffea57']]));
    box(-rad-3,lip-2,rad*2+6,8,3,steel(lip-2,8));
    box(-rad-4,-2,rad*2+8,11,3,shine(-2,11,c));
    for(let i=1;i<=12;i++) {
      const yy=-2*i*r;
      segment(-side*(rad+5),yy,-side*(rad+(i%3===0?17:11)),yy,i===12?'#f5c773':'#8ca29d',i===12?3:1.6);
    }
    segment(-rad-3,goal,rad+3,goal,'#ffcc7c',2.6);
    const signX=side*(rad+13);
    paint('M'+signX+' '+goal+'l'+(side*9)+' -5v10Z','#f8c677');
    g.font='700 21px Bahnschrift, Arial, sans-serif'; g.textAlign=side<0?'right':'left'; g.fillStyle='#f8ca83';
    g.fillText('12',signX+side*15,goal+7);
    g.restore();
  }
  function score(x,y,side,value,scale) {
    const c=side<0?auger:piston, w=152*scale,h=66*scale;
    g.save(); g.translate(x,y);
    shadow(()=>box(-w/2,-h/2,w,h,7,'#253b3e','#677b75',1.3),4);
    box(-w/2+4,-h/2+4,w-8,h-8,4,linear(0,-h/2,0,h/2,[[0,'#33494a'],[1,'#223437']]),'#182e31',1);
    box(-w/2+10,-h/2+11,4,h-22,2,c.ink);
    g.textAlign='left'; g.fillStyle='#dfe6d7'; g.font='650 '+Math.round(19*scale)+'px Bahnschrift, Arial, sans-serif';
    g.fillText(side<0?'AUGER':'PISTON',-w/2+22*scale,7*scale);
    g.textAlign='right'; g.fillStyle=c.light; g.font='700 '+Math.round(40*scale)+'px Bahnschrift, Arial, sans-serif';
    g.fillText(String(value),w/2-13*scale,15*scale);
    g.restore();
  }
  function portraitStand(frame) {
    const [left,right]=frame.lanes.map(l=>l.cup);
    const [x,y]=left, end=right[0], mid=(x+end)/2;
    shadow(()=>box(x-30,y+3,end-x+60,19,6,steel(y+3,19),'#273c3e',1.5),6);
    bolt(x-21,y+12,3); bolt(end+21,y+12,3);
    const gaugeY=y-96;
    segment(x+15,gaugeY,end-15,gaugeY,'#71827a',5);
    shadow(()=>box(mid-94,gaugeY-44,188,88,7,'#23393d','#667c77',1.5),4);
    box(mid-89,gaugeY-39,178,78,4,'#293f42','#1a2e32',1);
    segment(mid,gaugeY-29,mid,gaugeY+28,'#506460',1.2);
    g.textAlign='center';
    for(const [i,entry] of load.entries()) {
      const xx=mid+(i?44:-44);
      g.font='650 19px Bahnschrift, Arial, sans-serif'; g.fillStyle='#e3e7d8'; g.fillText(entry.label,xx,gaugeY-12);
      g.font='700 43px Bahnschrift, Arial, sans-serif'; g.fillStyle=entry.color.light;
      g.fillText(String(entry.goal),xx,gaugeY+29);
    }
  }
  function draw(frame) {
    const {w,h,r}=frame, horizontal=w>h;
    canvas.width=w*1.5; canvas.height=h*1.5;
    g.setTransform(1.5,0,0,1.5,0,0); g.lineCap='round'; g.lineJoin='round';
    background(w,h); title(frame.title); drive(frame);
    if(!horizontal) portraitStand(frame);
    for(const [i,lane] of frame.lanes.entries()) {
      const side=i?1:-1, axes=laneAxes(lane), len=axes.length, rad=r*(i?3.45:3);
      const [x,y]=lane.root, [cx,floor]=lane.cup;
      const support=axes.at(len*.80,side*(rad+4));
      mount(x,y+15,r*4.3); mount(...support,r*2.5);
      const fx=frame.feeder[0]+side*r*(magazineWidth+magazineGap)/2, fy=frame.feeder[1]+r*10+7;
      const feed=axes.at(len*(i === 1 ? 0.54 : 0.17),-side*(rad+2));
      glassPipe([[fx,fy],[fx,fy+26],[feed[0]-side*23,feed[1]-26],feed],r*2.38);
      const outlet=axes.at(len-7,side*(rad-2));
      const lip=floor-r*26.3;
      glassPipe([outlet,...lane.bends,[cx,lip-8],[cx,lip]],r*2.35);
      g.save(); g.translate(x,y); g.rotate(axes.angle);
      if(i) pressMachine(len,r,side); else augerMachine(len,r,side);
      g.restore();
      target(frame,lane,side,load[i].goal);
      if(horizontal) score(cx,floor+49,side,load[i].goal,.95);
    }
    feedUnit(frame);
  }
  const format=new URLSearchParams(location.search).get('format');
  function fit() {
    const frame=Object.hasOwn(frames,format) ? frames[format] : (innerWidth>innerHeight?frames.quer:frames.hoch);
    if(canvas.width!==frame.w*1.5 || canvas.height!==frame.h*1.5) draw(frame);
    const s=Math.min(innerWidth/frame.w,innerHeight/frame.h);
    canvas.style.width=frame.w*s+'px'; canvas.style.height=frame.h*s+'px';
  }
  addEventListener('resize',fit); fit();
})();
