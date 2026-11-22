(function () {
  'use strict';
  const F = EBS.Foerderduell;
  const { clamp, lerp } = EBS.util;
  const mix = (a,b,t) => [lerp(a[0],b[0],t),lerp(a[1],b[1],t)];
  const span = (a,b) => Math.hypot(b[0]-a[0],b[1]-a[1]);
  const unit = t => clamp(t,0,1);
  const smooth = t => { t=unit(t); return t*t*(3-2*t); };

  // Glas und Kugel verwenden dieselbe Mittellinie, auch in den engen Bögen der Fallrohre.
  function pipe(points, diameter) {
    const path=new Path2D(), samples=[points[0]], distances=[0];
    path.moveTo(...points[0]);
    function sample(p) {
      const d=span(samples.at(-1),p);
      if (d>0) { samples.push(p); distances.push(distances.at(-1)+d); }
    }
    for (let i=1;i<points.length-1;i++) {
      const a=points[i-1], b=points[i], c=points[i+1];
      const ab=span(a,b), bc=span(b,c), cut=Math.min(diameter*1.38,ab*.49,bc*.49);
      const entry=mix(b,a,cut/ab), exit=mix(b,c,cut/bc);
      path.lineTo(...entry); sample(entry); path.quadraticCurveTo(...b,...exit);
      for(let j=1;j<=16;j++) {
        const t=j/16;
        sample(mix(mix(entry,b,t),mix(b,exit,t),t));
      }
    }
    path.lineTo(...points.at(-1)); sample(points.at(-1));
    const length=distances.at(-1);
    function at(distance) {
      if(distance<=0) return samples[0];
      if(distance>=length) return samples.at(-1);
      let lo=0, hi=distances.length-1;
      while(hi-lo>1) {
        const mid=(lo+hi)>>1;
        if(distances[mid]<distance) lo=mid; else hi=mid;
      }
      return mix(samples[lo],samples[hi],(distance-distances[lo])/(distances[hi]-distances[lo]));
    }
    return {points,diameter,path,length,at};
  }

  const square = { w: 960, h: 960, r: 10, title: [480,90,54], feeder:[480,158], lanes:[
    {root:[390,570],head:[186,332],cup:[143,819],bends:[[119,382],[95,425],[95,515],[143,541]]},
    {root:[570,570],head:[774,332],cup:[817,819],bends:[[841,386],[865,425],[865,515],[817,541]]}
  ] };
  function layout(world) {
    const frame=world.w===world.h ? square : world.w>world.h ? F.frames.quer : F.frames.hoch;
    const r=frame.r, portrait=frame===F.frames.hoch;
    const lanes=frame.lanes.map((lane,i)=>{
      const side=i?1:-1, axes=F.laneAxes(lane), len=axes.length, rad=r*(i?F.pressRadius:3);
      const fx=frame.feeder[0]+side*r*(F.magazineWidth+F.magazineGap)/2, fy=frame.feeder[1]+r*10+7;
      const inletU=len*(i ? .53 : .17), outletU=len-12;
      const inlet=pipe([[fx,fy],[fx,fy+26],axes.at(inletU,-side*(rad+23)),axes.at(inletU,-side*rad)],r*2.38);
      const [cx,floor]=lane.cup, lip=floor-r*26.3;
      const outlet=pipe([axes.at(outletU,side*rad),axes.at(outletU,side*(rad+16)),...lane.bends,[cx,lip]],r*2.35);
      return {lane,side,axes,rad,inletU,outletU,inlet,outlet,fx,fy,lip,floor};
    });
    return {frame,lanes,portrait};
  }
  const slots=[0,-1,1,-2,0,2,-3,-1,1,3,-4,-2,0,2,4,-4,-2,0,2,4,-3,-1,1,3];
  function seat(i,r) {
    const row=i<1?0:i<3?1:i<6?2:i<10?3:i<15?4:i<20?5:6;
    return [slots[i]*r,-r*(.92+1.76*row)];
  }
  function stockSeat(rank,r,lane) {
    const i=clamp(rank,0,23), lo=Math.floor(i), p=mix(seat(lo,r),seat(Math.ceil(i),r),i-lo);
    return [lane.fx+p[0],lane.fy-7+p[1]];
  }
  function discharged(lane,beat) {
    let count=0;
    for(const ball of lane) {
      if(beat<=ball.depart) break;
      count+=smooth((beat-ball.depart)/.16);
    }
    return count;
  }
  const chamber=[[2,2],[2,0],[1,1],[1,-1],[0,2],[0,0],[0,-2]];
  function position(ball, balls, i, beat, layout, r, shifted) {
    const {side,axes,rad,inletU,outletU,inlet,outlet,lip,floor}=layout;
    const phase=F.stage(ball,beat);
    if(phase==='reserve') return null;
    if(phase==='hopper') {
      const batchIndex=ball.id-balls.findIndex(item=>item.ready===ball.ready);
      const start=ball.ready-1+batchIndex*.019, end=Math.min(ball.depart,start+.42);
      if(beat<start) return null;
      const target=stockSeat(ball.id-shifted,r,layout);
      const age=unit((beat-start)/(end-start));
      return [target[0],lerp(layout.fy-7-r*12.55,target[1],age*age),r];
    }
    if(phase==='feed') {
      const u=unit((beat-ball.depart)/(ball.enter-ball.depart));
      const p=u<.20 ? mix(stockSeat(ball.id-discharged(balls,ball.depart),r,layout),inlet.points[0],u/.20)
        : inlet.at(inlet.length*(u-.20)/.80);
      return [...p,r];
    }
    if(phase==='machine') {
      const u=unit((beat-ball.enter)/(ball.exit-ball.enter));
      if(i===0) {
        const low=side*rad*(.45+.07*Math.sin(u*Math.PI*4));
        const y=lerp(lerp(-side*rad,low,smooth(u/.15)),side*rad,smooth((u-.83)/.17));
        return [...axes.at(lerp(inletU,outletU,u),y),r];
      }
      const [row,col]=chamber[ball.slot];
      const seat=axes.at(axes.length*.48+r*(.22+F.chamberLens*(1+row*1.75)),col*r*F.chamberLens);
      const settle=smooth((beat-ball.enter)/.20);
      const shove=smooth((beat-Math.max(ball.enter,ball.stroke-.13))/(ball.exit-Math.max(ball.enter,ball.stroke-.13)));
      const p=mix(mix(inlet.points.at(-1),seat,settle),outlet.points[0],shove);
      return [...p,r*(1+(F.chamberLens-1)*settle*(1-shove))];
    }
    // Oberhalb der zwölften Kugel setzt sich der Stapel im angeschlossenen Fallrohr fort.
    const stop=outlet.length+(floor-r-lip)-2*r*ball.id;
    const u=unit((beat-ball.exit)/(ball.land-ball.exit));
    const d=stop*u*(.70+.30*u);
    const p=d<=outlet.length ? outlet.at(d) : [layout.lane.cup[0],lip+d-outlet.length];
    return [...p,r];
  }
  Object.assign(F,{layout,discharged,position,smooth});
})();
