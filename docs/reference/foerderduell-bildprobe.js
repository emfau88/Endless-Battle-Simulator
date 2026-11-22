// Standbild nach Maschinentakt 9. Die Reihenfolge der 24 Kugeln gilt für beide Bahnen.
(() => {
  'use strict';
  const canvas = document.querySelector('canvas'), g = canvas.getContext('2d');
  const F=EBS.Foerderduell, {frames, magazineWidth, magazineGap, pressRadius, chamberLens, laneAxes}=F;
  const [auger,piston]=F.materials;
  const {marble, background, title, glassPipe, mount, drive, feedUnit, port, helix,
    augerMachine, pressMachine, target, score, portraitStand}=F.art(g);
  const sequence = [0,2,1,3,2,0,1,0,3,2,1,0,2,3,0,1,1,2,0,3,1,2,3,0];
  const load = [
    { label: 'AUGER', color: auger, goal: 8, inMachine: 2 },
    { label: 'PISTON', color: piston, goal: 7, inMachine: 7 }
  ];
  function draw(frame) {
    const {w,h,r}=frame, horizontal=w>h;
    canvas.width=w*1.5; canvas.height=h*1.5;
    g.setTransform(1.5,0,0,1.5,0,0); g.lineCap='round'; g.lineJoin='round';
    background(w,h); title(frame.title); drive(frame);
    if(!horizontal) portraitStand(frame,load.map(lane=>lane.goal));
    for(const [i,lane] of frame.lanes.entries()) {
      const side=i?1:-1, axes=laneAxes(lane), len=axes.length, rad=r*(i?pressRadius:3);
      const [x,y]=lane.root, [cx,floor]=lane.cup;
      const support=axes.at(len*.80,side*(rad+4));
      mount(x,y+15,r*4.3); mount(...support,r*2.5);
      const fx=frame.feeder[0]+side*r*(magazineWidth+magazineGap)/2, fy=frame.feeder[1]+r*10+7;
      const inletU=len*(i ? .53 : .17), outletU=len-12;
      const feed=axes.at(inletU,-side*rad), approach=axes.at(inletU,-side*(rad+23));
      glassPipe([[fx,fy],[fx,fy+26],approach,feed],r*2.38);
      const outlet=axes.at(outletU,side*rad), exit=axes.at(outletU,side*(rad+16));
      const lip=floor-r*26.3;
      glassPipe([outlet,exit,...lane.bends,[cx,lip]],r*2.35);
      g.save(); g.translate(x,y); g.rotate(axes.angle);
      if(i) pressMachine(len,r,face=>{
        g.save(); g.translate(face+.22*r,0); g.scale(chamberLens,chamberLens);
        let id=7;
        [[-2,0,2],[-1,1],[0,2]].forEach((cols,row)=>cols.forEach(v=>marble((1+row*1.75)*r,v*r,r,sequence[id++])));
        g.restore();
      }); else augerMachine(len,r,radius=>{
        helix(len,radius-4);
        marble(len*.38,side*radius*.52,r,sequence[9]); marble(len*.74,side*radius*.48,r,sequence[8]);
      });
      port(inletU,-side*rad,r,load[i].color); port(outletU,side*(rad+2.7),r,load[i].color);
      g.restore();
      target(frame,lane,side,()=>{ for(let n=0;n<load[i].goal;n++) marble(0,-r-n*2*r,r,sequence[n]); });
      if(horizontal) score(cx,floor+49,side,load[i].goal,.95);
    }
    feedUnit(frame,(idx,h)=>{
      let id=load[idx].goal+load[idx].inMachine;
      [[0],[-1,1],[-2,0,2],[-3,-1,1,3],[-4,-2,0,2,4]].forEach((row,n)=>{
        for(const offset of row) if(id<sequence.length) marble(offset*r,h-r*.92-n*1.76*r,r,sequence[id++]);
      });
    });
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
