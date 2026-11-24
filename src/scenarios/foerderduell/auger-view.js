// Schrägansicht einer starren Schraubenfläche. Die Materialpunkte kreisen
// um feste Stellen auf der Welle. Die Stirnseite zeigt dieselbe Drehung.
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
    const {shaft,start,axleEnd,depthScale}=s;
    g.fillStyle=steel(g,shaft,[[0,'#44444a'],[.25,'#71747a'],[.64,'#c9cbcd'],[.76,'#e6e5e3'],[1,'#72747a']]);
    g.fillRect(start,-shaft,axleEnd-start,2*shaft);
    // Eine gefräste Längsnut verschwindet beim Drehen hinter der Welle.
    const angle=-tau*phase, depth=Math.sin(angle);
    if(depth>0) {
      const v=-shaft*Math.cos(angle), du=depthScale*shaft*depth;
      stroke(g,[[start+du,v],[axleEnd+du,v]],'#434247',shaft*.63*depth);
      stroke(g,[[start+du,v-.18*shaft*depth],[axleEnd+du,v-.18*shaft*depth]],'#e3d2b1',shaft*.19*depth);
    }
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
      stations.push([u,-Math.cos(angle),Math.sin(angle)]);
    }
    const edge=(radius,dx)=>stations.map(([u,v,z])=>[u+dx+s.depthScale*radius*z,radius*v]);
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

    // Ein längs aufgebrachter Farbstrich trifft jede Windung auf derselben Mantellinie.
    // Seine Abschnitte sitzen auf dem Metall und tauchen auf der Rückseite ab.
    const first=Math.ceil((left-s.origin)/pitch-.085);
    for(let n=first;s.origin+(n-.085)*pitch<right;n++) {
      const from=Math.max(left,s.origin+(n-.085)*pitch), to=Math.min(right,s.origin+(n+.085)*pitch);
      if(to<=from) continue;
      const stripe=(radius,dx)=>{
        const points=[];
        for(let i=0;i<=6;i++) {
          const u=from+(to-from)*i/6, a=angleAt(s,u,phase);
          points.push([u+dx+s.depthScale*radius*Math.sin(a),-radius*Math.cos(a)]);
        }
        return points;
      };
      const lip=stripe(tip,halfGauge);
      polyline(g,lip.concat(stripe(tip*.43,halfGauge).reverse()),true);
      g.fillStyle=front?'#dfb169':'#80633f'; g.fill();
      polyline(g,lip.concat(stripe(tip,-halfGauge).reverse()),true);
      g.fillStyle=front?'#f4d395':'#9b7952'; g.fill();
    }
  }

  // Offener Lagerdeckel am Auslauf. Der Ring und seine Schrauben sitzen am Gehäuse,
  // die drei Arme und die Nabe sind mit derselben Welle wie das Blatt verbunden.
  function drawEnd(g,s,turns) {
    const r=s.tip*1.14;
    g.save();
    g.translate(s.axleEnd,0);
    g.scale(s.depthScale,1);
    function disk(radius,fill) {
      g.beginPath(); g.arc(0,0,radius,0,tau); g.fillStyle=fill; g.fill();
    }
    disk(r+1,'#27282a');
    disk(r,steel(g,r,[[0,'#61646a'],[.32,'#d4d5d4'],[.63,'#7f8287'],[.91,'#bfc0c1'],[1,'#5b5e62']]));
    disk(r*.87,'#27292c');
    disk(r*.77,'#46484d');
    disk(r*.71,'#242528');
    for(let i=0;i<4;i++) {
      const a=i*tau/4+.37;
      g.beginPath(); g.arc(.935*r*Math.sin(a),-.935*r*Math.cos(a),r*.033,0,tau);
      g.fillStyle='#484a4d'; g.fill();
    }
    g.rotate(-tau*(turns-Math.floor(turns)));
    for(let i=0;i<3;i++) {
      g.save(); g.rotate(i*tau/3);
      g.beginPath(); g.moveTo(-.18*r,-.14*r);
      g.quadraticCurveTo(-.22*r,-.42*r,-.10*r,-.748*r);
      g.lineTo(.18*r,-.724*r);
      g.quadraticCurveTo(.075*r,-.44*r,.17*r,-.13*r);
      g.closePath(); g.fillStyle=i===0?'#e7b66a':'#a8acb1'; g.fill();
      stroke(g,[[-.085*r,-.71*r],[-.125*r,-.46*r]],i===0?'#ffe0a6':'#d7d9da',.066*r);
      g.restore();
    }
    disk(r*.26,'#242528'); disk(r*.205,'#bbbcb9'); disk(r*.11,'#48494b');
    g.restore();
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
  Object.assign(F,{drawAugerHalf:drawHalf,drawAugerEnd:drawEnd,augerAngle:angleAt});
})();
