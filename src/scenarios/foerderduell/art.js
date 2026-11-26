// Werkstoffe und Maschinengeometrie der freigegebenen Bildprobe.
(function () {
  'use strict';
  const EBS = window.EBS ||= {};
  const F = EBS.Foerderduell ||= {};
  const tau = 2 * Math.PI;
  const magazineWidth = 10.4, magazineGap = 1.18;
  const auger = { dark: '#42454a', mid: '#96999c', light: '#eeeef0', ink: '#cbd0d5' };
  const piston = { dark: '#61392d', mid: '#b67656', light: '#f8c5a1', ink: '#e5a078' };
  const pearl = [['#fffbef','#e1d6b7','#8c8169'], ['#e1f4ff','#669edc','#294876'],
    ['#fff0b8','#efab4f','#975c24'], ['#ffd5ba','#df8063','#884439']];
  const pressRadius = 4.25;
  const chamberLens = 1.18;
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
        { root: [518, 463], head: [213, 239], cup: [135, 571], bends: [[154,291],[135,307]] },
        { root: [762, 463], head: [1067, 239], cup: [1145, 571], bends: [[1128,300],[1145,311]] }
      ]
    }
  };
  function laneAxes(lane) {
    const [x,y]=lane.root, dx=lane.head[0]-x, dy=lane.head[1]-y;
    const length=Math.hypot(dx,dy), c=dx/length, s=dy/length;
    return { length, angle:Math.atan2(dy,dx), at:(u,v)=>[x+u*c-v*s,y+u*s+v*c] };
  }
  function art(g, sideLight) {
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
    // Das Flächenlicht sitzt für beide geneigten Maschinen fest links oben im Bild.
    function lightAtPositiveY() {
      if (sideLight !== undefined) return sideLight;
      const m = g.getTransform();
      return -.35 * m.c - .94 * m.d > 0;
    }
    function across(y, height, stops) {
      return lightAtPositiveY() ? linear(0,y+height,0,y,stops) : linear(0,y,0,y+height,stops);
    }
    function shine(y, height, c) {
      return across(y,height,[[0,c.dark],[.06,c.mid],[.16,c.light],[.27,c.mid],[.50,c.mid],[.78,c.dark],[.94,c.mid],[1,c.dark]]);
    }
    function steel(y, h) {
      return across(y,h,[[0,'#525357'],[.09,'#b4b5b7'],[.19,'#f5f5f3'],[.27,'#c7c7c8'],[.44,'#939597'],[.69,'#595b60'],[.87,'#35363a'],[1,'#96989a']]);
    }
    function bolt(x, y, r) {
      oval(x,y+1.4,r+1,r+1,'#121214');
      const fill = linear(x-r,y-r,x+r,y+r,[[0,'#e3e3df'],[.35,'#b0b0b1'],[1,'#606166']]);
      oval(x,y,r,r,fill,'#3b3c40',.7);
      const hex = new Path2D();
      for (let i=0;i<6;i++) {
        const a=i*tau/6, xx=x+r*.46*Math.cos(a), yy=y+r*.46*Math.sin(a);
        if (i===0) hex.moveTo(xx,yy); else hex.lineTo(xx,yy);
      }
      hex.closePath(); paint(hex,'#45464a');
    }
    function marble(x, y, r, color) {
      const p = pearl[color];
      g.save(); g.translate(x,y);
      const m=g.getTransform(); g.rotate(-Math.atan2(m.b,m.a));
      const fill=g.createRadialGradient(-r*.36,-r*.47,r*.02,r*.10,r*.14,r*1.14);
      [[0,'#fffdfa'],[.15,p[0]],[.47,p[1]],[.84,p[2]],[1,'#343236']].forEach(([a,c])=>fill.addColorStop(a,c));
      oval(r*.08,r*.13,r+.45,r,'rgba(10,9,12,.73)');
      oval(0,0,r,r,fill,'rgba(19,18,20,.78)',.8);
      g.save(); g.translate(-r*.29,-r*.47); g.rotate(-.43);
      oval(0,0,r*.26,r*.09,'rgba(255,255,255,.92)'); g.restore();
      oval(r*.50,r*.47,r*.19,r*.055,'rgba(255,250,242,.29)'); g.restore();
    }
    function shadow(fn, amount = 8) {
      g.save(); g.shadowColor='rgba(4,4,6,.83)'; g.shadowOffsetX=amount*.40; g.shadowOffsetY=amount*.76;
      g.shadowBlur=amount*.81; fn(); g.restore();
    }
    function background(w,h) {
      g.fillStyle = linear(0,0,w*.85,h,[[0,'#303033'],[.29,'#28282b'],[.71,'#1f1f22'],[1,'#18181b']]);
      g.fillRect(0,0,w,h);
    }
    function title([x,y,size]) {
      g.font='700 '+size+'px Bahnschrift, "Arial Narrow", Arial, sans-serif';
      g.textBaseline='alphabetic'; g.textAlign='left';
      const a='FIRST TO ', b='12', start=x-(g.measureText(a).width+g.measureText(b).width)/2;
      g.fillStyle='#f4f3ef'; g.fillText(a,start,y);
      g.fillStyle='#f0bd88'; g.fillText(b,start+g.measureText(a).width,y);
    }
    function route(points, corner) {
      const path = new Path2D(); path.moveTo(...points[0]);
      for(let i=1;i<points.length-1;i++) path.arcTo(...points[i],...points[i+1],corner);
      path.lineTo(...points.at(-1)); return path;
    }
    function glassPipe(points, diameter, p=route(points,diameter*1.38)) {
      const xs=points.map(point=>point[0]), ys=points.map(point=>point[1]);
      const x=Math.floor(Math.min(...xs)-diameter), y=Math.floor(Math.min(...ys)-diameter);
      const scale=g.getTransform().a;
      const layer=document.createElement('canvas');
      layer.width=Math.ceil((Math.max(...xs)+diameter-x)*scale);
      layer.height=Math.ceil((Math.max(...ys)+diameter-y)*scale);
      const rim=layer.getContext('2d');
      rim.setTransform(scale,0,0,scale,-x*scale,-y*scale); rim.lineJoin=rim.lineCap='round';
      const light=rim.createLinearGradient(x,y,x+layer.width/scale,y+layer.height/scale);
      light.addColorStop(0,'rgba(240,241,245,.75)'); light.addColorStop(1,'rgba(181,183,187,.46)');
      rim.lineWidth=diameter; rim.strokeStyle=light; rim.stroke(p);
      // Nur den Glasrand zeichnen. In der Mitte ist dieselbe Rückwand wie außerhalb des Rohres sichtbar.
      rim.save(); rim.translate(.55,.75); rim.globalCompositeOperation='destination-out';
      rim.strokeStyle='rgba(0,0,0,.80)'; rim.lineWidth=diameter-3.5; rim.stroke(p);
      rim.translate(.65,.95); rim.strokeStyle='rgba(0,0,0,.88)';
      rim.lineWidth=diameter-8.5; rim.stroke(p); rim.restore();
      rim.lineWidth=diameter-2; rim.strokeStyle='rgba(212,215,221,.045)'; rim.stroke(p);
      shadow(()=>g.drawImage(layer,x,y,layer.width/scale,layer.height/scale),4.4);
    }
    function mount(x,y,r) {
      shadow(()=>box(x-r,y-r*.64,r*2,r*1.3,9,linear(x-r,y-r,x+r,y+r,[[0,'#545559'],[.5,'#36373a'],[1,'#27282a']]),'#646568',1.1),7);
      bolt(x-r*.74,y+r*.32,3.8); bolt(x+r*.74,y+r*.32,3.8);
    }
    function drive(frame) {
      const [left,right]=frame.lanes.map(lane=>lane.root);
      const r=frame.r*2.35, x=left[0], y=left[1], end=right[0];
      shadow(()=>box(x-r-6,y-r-6,end-x+2*r+12,2*r+12,r+6,linear(x,y-r,x,y+r,[[0,'#535459'],[.4,'#36363a'],[1,'#27272a']]),'#69696c',1.2),7);
      box(x-r,y-r,end-x+2*r,2*r,r,'#242427','#151517',2);
      for (const cx of [x,end]) {
        oval(cx,y,r-2,r-2,steel(y-r,r*2),'#a1a2a4',1);
        bolt(cx,y,5);
      }
      // Der Zahnriemen verbindet die beiden Antriebe hinter den offenliegenden Maschinen.
      for (const yy of [y-r+2,y+r-2]) {
        segment(x,yy,end,yy,'#111113',5);
        for (let tx=x+3;tx<end;tx+=6) segment(tx,yy-1.6,tx+1,yy+1.6,'#656569',1.4);
      }
    }
    function feedUnit(frame, stock, roof=0, layer='both') {
      const [x,y]=frame.feeder, r=frame.r, width=r*magazineWidth, gap=r*magazineGap, h=r*10.0, d=(width+gap)/2;
      g.save(); g.translate(x,y);
      for(const [idx, side] of [-1,1].entries()) {
        const c=idx?piston:auger, cx=side*d;
        g.save(); g.translate(cx,0);
        const mouth=r*1.45, w=width/2;
        const walls=new Path2D('M'+(-w)+' '+(-roof)+'H'+w+'V'+h*.62+'L'+mouth+' '+h+'H'+(-mouth)+'L'+(-w)+' '+h*.62+'Z');
        if (layer!=='front') shadow(()=>paint(walls,linear(-w,0,w,h,[[0,'#434447'],[.38,'#2c2d30'],[.7,'#242528'],[1,'#37383b']]),'#8b8c90',1.5),6);
        if (layer==='back') { g.restore(); continue; }
        if (stock) stock(idx,h);
        g.save(); g.clip(walls);
        paint(walls,linear(-w,0,w,0,[[0,'#ffffff24'],[.12,'#ffffff03'],[.24,'#ffffff00'],[.92,'#ffffff00'],[1,'#ffffff17']]));
        segment(-w+3.5,4-roof,-w+3.5,h*.60,'#ffffffa6',1.4);
        segment(w-2.5,h*.14,w-2.5,h*.61,'#ffffff45',.9);
        g.restore();
        box(-mouth-3,h-2,2*mouth+6,10,3,shine(h-2,10,c),'#262629',1);
        g.restore();
      }
      if (layer==='back') { g.restore(); return; }
      const total=width*2+gap;
      shadow(()=>box(-total/2-5,-9-roof,total+10,14,4,steel(-9-roof,14),'#242427',1),3);
      bolt(-total/2+4,-2-roof,3); bolt(total/2-4,-2-roof,3);
      g.restore();
    }
    function sleeve(x,w,r,c) {
      box(x,-r,w,r*2,2.7,shine(-r,r*2,c),'#262528',1.4);
      segment(x+2.3,-r+3,x+2.3,r-3,'#fffaf482',1);
      segment(x+w-2,-r+3,x+w-2,r-3,'#211d213f',1.15);
    }
    function port(u, wallY, r, color) {
      g.save(); g.translate(u,wallY); g.rotate(Math.sign(wallY)*Math.PI/2);
      sleeve(-1.4,6.8,r*1.42,color);
      box(5.1,-r*1.27,2.4,r*2.54,1,steel(-r*1.27,r*2.54),'#303033',.65);
      g.restore();
    }
    function tubeBack(start,end,r) {
      const fill=across(-r,2*r,[[0,'#808186'],[.055,'#535459'],[.17,'#393a3e'],[.50,'#28292c'],[.83,'#242528'],[1,'#54555a']]);
      shadow(()=>box(start,-r,end-start,2*r,4,fill,'#202023',1.6),7);
    }
    function tubeFront(start,end,r) {
      const lit=lightAtPositiveY()?1:-1;
      const sheen=across(-r,2*r,[[0,'#ffffff0d'],[.055,'#ffffff39'],[.10,'#ffffff05'],[.20,'#ffffff00'],[.83,'#ffffff00'],[.94,'#ffffff10'],[1,'#ffffff38']]);
      box(start,-r,end-start,2*r,4,sheen);
      segment(start+4,lit*(r-1.6),end-4,lit*(r-1.6),'#ffffffe0',1.25);
      segment(start+5,-lit*(r-1.4),end-5,-lit*(r-1.4),'#ffffff6b',.95);
    }
    function helix(length,r,turns=5.65) {
      const pitch=(length-37)/turns;
      const lit=lightAtPositiveY()?1:-1;
      function point(a,radius) {
        return [16+pitch*a/tau+.18*radius*Math.sin(a),radius*Math.cos(a)];
      }
      function curve(start,end,radius) {
        const n=Math.ceil((end-start)*16);
        return Array.from({length:n+1},(_,i)=>point(start+(end-start)*i/n,radius));
      }
      function flight(start,end) {
        const outer=curve(start,end,r), inner=curve(start,end,6.6);
        const face=route(outer.concat(inner.reverse()),0); face.closePath();
        const lip=route(outer.concat(outer.map(([x,y])=>[x+3.4,y]).reverse()),0); lip.closePath();
        const x0=point(start,(r+6.6)/2)[0], x1=point(end,(r+6.6)/2)[0];
        const faceMetal=g.createLinearGradient(x0,0,x1,0), edgeMetal=g.createLinearGradient(x0,0,x1,0);
        for (let i=0;i<=16;i++) {
          const t=i/16, a=start+(end-start)*t, exposure=(1+lit*.82*Math.cos(a)+.57*Math.sin(a))/2;
          const shade=Math.round(59+100*exposure+80*exposure**7), edge=Math.round(93+141*exposure);
          faceMetal.addColorStop(t,'rgb('+(shade-1)+','+shade+','+(shade+3)+')');
          edgeMetal.addColorStop(t,'rgb('+edge+','+edge+','+(edge+2)+')');
        }
        paint(face,faceMetal);
        g.save(); g.clip(face);
        for(const fraction of [.43,.56,.67,.78,.87]) {
          paint(route(curve(start,end,6.6+(r-6.6)*fraction),0),null,'#ffffff28',.5);
        }
        g.restore();
        paint(lip,edgeMetal);
        paint(route(outer,0),null,'#ffffff70',.65);
      }
      // Jede halbe Windung hat eine geschlossene Metallfläche und durchlaufende Schliffspuren.
      function windings(firstHalf) {
        for(let half=firstHalf;half<turns*2;half+=2) flight(half*Math.PI,Math.min((half+1)*Math.PI,turns*tau));
      }
      windings(1);
      box(4,-6.8,length-11,13.6,4,steel(-6.8,13.6));
      windings(0);
    }
    function augerCover(length,radius) {
      tubeFront(4,length,radius);
      sleeve(1,11,radius+4,auger); sleeve(length-15,15,radius+5,auger);
    }
    function augerMachine(length,r,contents,cover=true) {
      const radius=r*3.00;
      tubeBack(4,length,radius);
      if (contents) contents(radius);
      if(cover) augerCover(length,radius);
      box(-49,-radius*.82,48,radius*1.64,8,shine(-radius*.82,radius*1.64,auger),'#27272a',2);
      for(let x=-41;x<-6;x+=7) box(x,-radius*.9,3.8,radius*1.8,1.8,steel(-radius*.9,radius*1.8));
      box(-57,-radius*.51,10,radius*1.02,2,steel(-radius*.51,radius*1.02));
    }
    function pressCover(length,radius,lit) {
      const start=length*.25, railY=-lit*(radius+2.5);
      tubeFront(start,length,radius);
      segment(start+4,railY,length-6,railY,'#454449',2.7);
      segment(start+4,railY-.55,length-6,railY-.55,'#a4a1a0',.8);
      sleeve(start,11,radius+4,piston); sleeve(length-14,14,radius+5,piston);
    }
    function pressMachine(length,r,contents,angle=0,push=0,gateOpen=0,cover=true) {
      const radius=r*pressRadius, face=length*(.48+.34*push), start=length*.25, wh=r*4.48;
      tubeBack(start,length,radius);
      const m=g.getTransform(), scale=Math.hypot(m.a,m.b);
      const lx=(-.35*m.a-.94*m.b)/scale, ly=(-.35*m.c-.94*m.d)/scale;
      const rim=linear(lx*wh,ly*wh,-lx*wh,-ly*wh,[[0,'#f3d9bd'],[.17,'#ca9979'],[.41,'#996247'],[.71,'#5d3c32'],[.93,'#b17f62'],[1,'#e1b395']]);
      shadow(()=>oval(0,0,wh,wh,rim,'#322b29',1.8),6);
      const copper=radial(lx*wh*.62,ly*wh*.62,wh*1.8,[[0,'#dfa382'],[.47,'#bb7956'],[.80,'#955b42'],[1,'#704638']]);
      oval(0,0,wh-4.3,wh-4.3,copper,'#553b30',1);
      const satin=g.createConicGradient(Math.atan2(ly,lx),0,0);
      for (const [at,color] of [[0,'#ffecdb24'],[.10,'#ffe9cf06'],[.23,'#43251830'],[.40,'#70423208'],[.52,'#ffdeb324'],[.62,'#ffe9cf09'],[.81,'#5130232b'],[1,'#ffecdb24']]) satin.addColorStop(at,color);
      oval(0,0,wh-4.8,wh-4.8,satin);
      for(let fraction=.33;fraction<.84;fraction+=.039) oval(0,0,wh*fraction,wh*fraction,null,'#ffdfbd17',.45);
      for (const fraction of [.86,.90,.94]) oval(0,0,wh*fraction,wh*fraction,null,'#fff1d635',.7);
      for(let i=0;i<5;i++) {
        const a=i*tau/5+.45+angle, x=wh*.65*Math.cos(a), y=wh*.65*Math.sin(a);
        const bore=r*.82;
        oval(x,y,bore,bore,linear(x+lx*bore,y+ly*bore,x-lx*bore,y-ly*bore,[[0,'#54382d'],[.55,'#986d55'],[1,'#efc7a6']]));
        oval(x+lx*.35,y+ly*.35,bore-1.6,bore-1.6,'#272628','#523e34',.65);
      }
      oval(0,0,r*1.19,r*1.19,rim,'#855a46',.8);
      bolt(0,0,r*.78);
      const pin=[wh*(.24*Math.cos(angle)+.48*Math.sin(angle)),wh*(.24*Math.sin(angle)-.48*Math.cos(angle))];
      const wrist=[start+r*1.05+length*.18*push,0];
      segment(...pin,...wrist,'#353539',r*1.29);
      segment(...pin,...wrist,'#b8b8b9',r*.94);
      segment(pin[0]+lx, pin[1]+ly, wrist[0]+lx, wrist[1]+ly,'#f1f0eb',1.4);
      box(wrist[0],-r*.52,face-wrist[0],r*1.04,3,steel(-r*.52,r*1.04));
      bolt(...pin,r*.61); bolt(...wrist,r*.59);
      const lensX=face+r*3.25, lit=ly>0?1:-1;
      const pool=radial(lensX,lit*radius*.32,r*5.7,[[0,'rgba(249,231,211,.23)'],[.53,'rgba(244,228,215,.12)'],[1,'rgba(244,228,215,0)']]);
      box(face,-radius+3,length-face-3,radius*2-6,3,pool);
      sleeve(face-r*1.10,r*1.24,radius-2.7,piston);
      for(const offset of [.66,.31]) box(face-offset*r,-radius+2.8,1.9,2*radius-5.6,.8,'#3a3434');
      if (contents) contents(face);
      if(cover) pressCover(length,radius,lit);
      const gate=length-r*2.35;
      segment(gate,-radius+4,gate+r*(.72+1.5*gateOpen),radius*(.32-.97*gateOpen),'#414145',4.7);
      segment(gate,-radius+4,gate+r*(.72+1.5*gateOpen),radius*(.32-.97*gateOpen),'#c2c1bf',2.6);
      bolt(gate,-radius+4,3.3);
    }
    function target(frame, lane, side, contents, layer='both') {
      const [cx, floor]=lane.cup, r=frame.r, c=side<0?auger:piston;
      const goal=-24*r, lip=goal-r*2.3, rad=r*1.54;
      g.save(); g.translate(cx,floor);
      const backing=linear(-rad,0,rad,0,[[0,'#535459'],[.16,'#3b3c40'],[.43,'#242528'],[.8,'#292a2d'],[1,'#5a5b60']]);
      if(layer!=='front') shadow(()=>box(-rad,lip,rad*2,-lip+2,rad*.58,backing,'#8b8c91',1.15),5);
      if(layer==='back') { g.restore(); return; }
      if (contents) contents();
      box(-rad+1,lip+2,rad*2-2,-lip-3,rad*.38,linear(-rad,0,rad,0,[[0,'#ffffff28'],[.14,'#ffffff0d'],[.26,'#ffffff00'],[.85,'#ffffff00'],[1,'#ffffff2e']]));
      segment(-rad+2.8,lip+7,-rad+2.8,-3,'#ffffff9c',1.05);
      segment(rad-2.1,lip+9,rad-2.1,-3,'#ffffff46',.8);
      box(-rad-3,lip-2,rad*2+6,8,3,steel(lip-2,8));
      box(-rad-4,-2,rad*2+8,11,3,shine(-2,11,c));
      for(let i=1;i<=12;i++) {
        const yy=-2*i*r;
        segment(-side*(rad+5),yy,-side*(rad+(i%3===0?17:11)),yy,i===12?'#edb975':'#9a9b9e',i===12?2.8:1.5);
      }
      segment(-rad-3,goal,rad+3,goal,'#f1bd79',2.6);
      const signX=side*(rad+13);
      paint('M'+signX+' '+goal+'l'+(side*9)+' -5v10Z','#efbb79');
      g.font='700 21px Bahnschrift, Arial, sans-serif'; g.textAlign=side<0?'right':'left'; g.fillStyle='#f1c48b';
      g.fillText('12',signX+side*15,goal+7);
      g.restore();
    }
    function plaque(w,h) {
      const edge=linear(-w/2,-h/2,w/2,h/2,[[0,'#999a9d'],[.26,'#616266'],[.58,'#47484c'],[1,'#3d3e42']]);
      shadow(()=>box(-w/2,-h/2,w,h,7,edge,'#222225',1.2),4);
      box(-w/2+1.6,-h/2+1.6,w-3.2,h-3.2,5.6,linear(0,-h/2,0,h/2,[[0,'#38383c'],[.66,'#2c2d30'],[1,'#27272a']]));
      segment(-w/2+8,-h/2+2.1,w/2-8,-h/2+2.1,'#ffffff23',.8);
    }
    function score(x,y,side,value,scale) {
      const c=side<0?auger:piston, w=152*scale,h=66*scale;
      g.save(); g.translate(x,y);
      box(-6,-43,12,16,2,linear(-6,0,6,0,[[0,'#535458'],[.27,'#aaa9aa'],[1,'#535457']]));
      plaque(w,h);
      box(-w/2+10,-h/2+11,4,h-22,2,c.ink);
      g.textAlign='left'; g.fillStyle='#eeedeb'; g.font='650 '+Math.round(19*scale)+'px Bahnschrift, Arial, sans-serif';
      g.fillText(side<0?'AUGER':'PISTON',-w/2+22*scale,7*scale);
      g.textAlign='right'; g.fillStyle=c.light; g.font='700 '+Math.round(40*scale)+'px Bahnschrift, Arial, sans-serif';
      g.fillText(String(value),w/2-13*scale,15*scale);
      g.restore();
    }
    function portraitStand(frame, scores) {
      const [left,right]=frame.lanes.map(l=>l.cup);
      const [x,y]=left, end=right[0], mid=(x+end)/2;
      shadow(()=>box(x-30,y+3,end-x+60,19,6,steel(y+3,19),'#27272b',1.5),6);
      bolt(x-21,y+12,3); bolt(end+21,y+12,3);
      const gaugeY=y-96;
      segment(x+15,gaugeY,end-15,gaugeY,'#85858a',4);
      g.save(); g.translate(mid,gaugeY); plaque(188,88); g.restore();
      segment(mid,gaugeY-29,mid,gaugeY+28,'#57575b',1);
      g.textAlign='center';
      for(const [i,material] of [auger,piston].entries()) {
        const xx=mid+(i?44:-44);
        g.font='650 19px Bahnschrift, Arial, sans-serif'; g.fillStyle='#eeedeb'; g.fillText(i?'PISTON':'AUGER',xx,gaugeY-12);
        g.font='700 43px Bahnschrift, Arial, sans-serif'; g.fillStyle=material.light;
        g.fillText(String(scores[i]),xx,gaugeY+29);
      }
    }
    return { marble, background, title, route, glassPipe, mount, drive, feedUnit, port, helix,
      augerMachine, augerCover, pressMachine, pressCover, target, score, portraitStand };
  }
  Object.assign(F, { art, frames, laneAxes, materials: [auger,piston], pressRadius, chamberLens, magazineWidth, magazineGap });
})();
