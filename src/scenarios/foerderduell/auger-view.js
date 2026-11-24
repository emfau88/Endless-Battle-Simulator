// Seitenansicht einer starren Schraubenfläche. Jeder Materialpunkt behält seine
// axiale Position. Nur sein Winkel um die Welle ändert sich.
(function () {
  'use strict';
  const F=EBS.Foerderduell, tau=2*Math.PI;
  const angleAt=(s,u,turns)=>tau*((u-s.origin)/s.pitch-turns);

  function polyline(g,points,close=false) {
    g.beginPath();
    g.moveTo(...points[0]);
    for(let i=1;i<points.length;i++) g.lineTo(...points[i]);
    if(close) g.closePath();
  }
  function stroke(g,points,color,width) {
    polyline(g,points);
    g.strokeStyle=color; g.lineWidth=width; g.stroke();
  }
  function steel(g,r,stops) {
    const grad=g.createLinearGradient(0,-r,0,r);
    for(const [at,color] of stops) grad.addColorStop(at,color);
    return grad;
  }
  function axle(g,s,phase) {
    const {shaft,start,axleEnd}=s;
    g.fillStyle=steel(g,shaft,[[0,'#44444a'],[.25,'#71747a'],[.64,'#c9cbcd'],[.76,'#e6e5e3'],[1,'#72747a']]);
    g.fillRect(start,-shaft,axleEnd-start,2*shaft);
    const x=start+2.35*shaft, width=1.7*shaft, r=1.55*shaft;
    g.fillStyle=steel(g,r,[[0,'#37383b'],[.42,'#86888b'],[.68,'#dad9d7'],[1,'#55585d']]);
    g.fillRect(x,-r,width,2*r);
    for(const offset of [0,.5]) {
      const angle=tau*(offset-phase);
      if(Math.sin(angle)<=0) continue;
      const v=-r*Math.cos(angle);
      stroke(g,[[x+1,v],[x+width-1,v]],offset?'#5c5a57':'#f3d09a',Math.max(.7,shaft*.40*Math.sin(angle)));
    }
  }

  function flight(g,s,phase,left,right,front) {
    const {pitch,shaft,tip,halfGauge}=s;
    const steps=Math.max(2,Math.ceil((right-left)/pitch*42));
    const stations=[];
    for(let j=0;j<=steps;j++) {
      const u=left+(right-left)*j/steps;
      const angle=angleAt(s,u,phase);
      stations.push([u,-Math.cos(angle)]);
    }
    const edge=(radius,dx)=>stations.map(([u,dir])=>[u+dx,radius*dir]);
    const outer=edge(tip,halfGauge), inner=edge(shaft,halfGauge);
    const metal=g.createLinearGradient(left,0,right,0);
    for(let j=0;j<=8;j++) {
      const angle=angleAt(s,left+(right-left)*j/8,phase);
      const light=(1-.78*Math.cos(angle)+.60*Math.sin(angle))/2;
      const k=Math.round(front ? 64+96*light+59*light**6 : 46+57*light);
      metal.addColorStop(j/8,'rgb('+k+','+(k+1)+','+(k+4)+')');
    }
    polyline(g,outer.concat(inner.reverse()),true);
    g.fillStyle=metal; g.fill();
    for(const fraction of [.56,.84]) stroke(g,edge(shaft+(tip-shaft)*fraction,halfGauge),front?'#ffffff35':'#ffffff16',.6);
    polyline(g,outer.concat(edge(tip,-halfGauge).reverse()),true);
    g.fillStyle=front?'#b8babd':'#777a80'; g.fill();
    stroke(g,outer,front?'#e4e6e7':'#9b9da1',front?1:.7);

    // Kurzer Messingeinsatz an einer festen Stelle des äußeren Blatts.
    const mark=s.start+(s.end-s.start)*.52;
    const from=Math.max(left,mark-pitch*.030), to=Math.min(right,mark+pitch*.030);
    if(to>from) {
      const dir=u=>-Math.cos(angleAt(s,u,phase));
      const d0=dir(from), d1=dir(to);
      polyline(g,[[from+halfGauge,tip*d0],[to+halfGauge,tip*d1],
        [to+halfGauge,.73*tip*d1],[from+halfGauge,.73*tip*d0]],true);
      g.fillStyle=front?'#dbad6c':'#806544'; g.fill();
      stroke(g,[[from+halfGauge,tip*d0],[to+halfGauge,tip*d1]],front?'#ffe5ac':'#a48c63',1.8);
    }
  }

  function drawHalf(g,s,turns,front) {
    const phase=turns-Math.floor(turns);
    const halfPitch=s.pitch/2, bottom=s.origin+phase*s.pitch;
    const first=Math.floor((s.start-bottom)/halfPitch);
    for(let n=first;bottom+n*halfPitch<s.end;n++) {
      if((n%2===0)!==front) continue;
      const left=Math.max(s.start,bottom+n*halfPitch);
      const right=Math.min(s.end,bottom+(n+1)*halfPitch);
      if(right-left>.001) flight(g,s,phase,left,right,front);
    }
    if(!front) axle(g,s,phase);
  }
  Object.assign(F,{drawAugerHalf:drawHalf,augerAngle:angleAt});
})();
