/* Procedural arena art: only reads simulation state. Texture noise is stateless. */
(function () {
  'use strict';
  const noise=(seed,i)=>{let n=Math.imul(seed+1,374761393)^Math.imul(i+1,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296;};
  const polygon=(g,p)=>{g.beginPath();p.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();};
  const line=(g,x,y,xx,yy,color,width=1)=>{g.beginPath();g.moveTo(x,y);g.lineTo(xx,yy);g.strokeStyle=color;g.lineWidth=width;g.stroke();};
  const rect=(g,x,y,w,h,r,color)=>{g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=color;g.fill();};
  const disc=(g,x,y,r,color)=>{g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fillStyle=color;g.fill();};
  const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=Math.ceil(w);c.height=Math.ceil(h);return c;};
  const sunnyColors={wood:'#b98a54',stone:'#7b8c92',concrete:'#cdcbbd'};
  function floor(seed,w,h,sunny=false) {
    if(sunny)return EBS.ScrapDaylightArt.floor(seed,w,h);
    const c=canvas(w*2,h*2),g=c.getContext('2d');g.scale(2,2);
    rect(g,0,0,w,h,11,'#111c22');
    const light=g.createLinearGradient(0,0,w,h);light.addColorStop(0,'#424a4d');light.addColorStop(.5,'#343e43');light.addColorStop(1,'#28353e');
    g.fillStyle=light;g.fillRect(18,18,w-36,h-36);
    g.save();g.beginPath();g.rect(18,18,w-36,h-36);g.clip();
    // A quiet open cross gives the eye a clear centre and readable routes.
    g.fillStyle='#b9baa007';g.fillRect(18,h/2-46,w-36,92);g.fillRect(w/2-50,18,100,h-36);
    for(let x=18;x<w;x+=130)line(g,x,18,x,h-18,'#101b2426');
    for(let y=18;y<h;y+=130)line(g,18,y,w-18,y,'#101b2426');
    for(let i=0;i<3500;i++) {
      g.fillStyle=i%3?'#cad0c009':'#040d1418';
      g.fillRect(18+noise(seed,i*2)*(w-36),18+noise(seed,i*2+1)*(h-36),.7+noise(seed+7,i)*1.6,.7);
    }
    g.setLineDash([11,15]);
    for(const yy of [h/2-47,h/2+47])line(g,80,yy,w-80,yy,'#cdbd8c21',1.4);
    g.setLineDash([]);
    g.beginPath();g.arc(w/2,h/2,67,0,Math.PI*2);g.strokeStyle='#b6c6bf16';g.lineWidth=2;g.stroke();
    g.textAlign='center';g.textBaseline='middle';g.font='800 20px "Segoe UI",sans-serif';g.fillStyle='#c8d2c710';g.fillText('SCRAP WARS',w/2,h/2);
    const colors=h>w?['#b0e779','#ff725e','#54dce8','#ffce63']:['#ff725e','#54dce8','#ffce63','#b0e779'];
    [[0,0],[w,0],[w,h],[0,h]].forEach(([x,y],i)=>{
      g.save();g.translate(x,y);g.scale(x?-1:1,y?-1:1);
      g.fillStyle=colors[i]+'0b';g.fillRect(18,18,148,148);
      line(g,42,125,42,42,colors[i]+'70',2);line(g,42,42,125,42,colors[i]+'70',2);
      g.restore();
    });
    g.restore();
    // Narrow containment lip; no surrounding panel or machinery props.
    line(g,19,19,w-19,19,'#070f17',5);line(g,19,19,19,h-19,'#0c1720',4);
    line(g,18,h-18,w-18,h-18,'#788589',2);line(g,w-18,18,w-18,h-18,'#536874',2);
    for(let x=50;x<w-30;x+=80){disc(g,x,8,2,'#61747e');disc(g,x,h-8,2,'#61747e');}
    for(let y=50;y<h-30;y+=80){disc(g,8,y,2,'#61747e');disc(g,w-8,y,2,'#61747e');}
    return c;
  }
  function block(b,cache,sunny=false) {
    if(sunny)return EBS.ScrapDaylightArt.block(b,cache);
    const {w,h,material}=b,stage=Math.min(3,Math.floor((1-b.hp/b.maxHp)*4)),variant=b.id%4;
    const key=`material:${material}:${w}:${h}:${stage}:${variant}`;
    if(cache.has(key))return cache.get(key);
    const pad=16,c=canvas((w+pad*2)*2,(h+pad*2)*2),g=c.getContext('2d');g.scale(2,2);g.translate(pad,pad);
    const wood=material==='wood',stone=material==='stone';
    g.shadowColor='#03090eb0';g.shadowBlur=8;g.shadowOffsetX=5;g.shadowOffsetY=8;
    rect(g,1,2,w,h,wood?2:5,'#131b20');g.shadowBlur=0;g.shadowOffsetX=g.shadowOffsetY=0;
    polygon(g,[[0,h-6],[w,h-6],[w+3,h+5],[4,h+5]]);g.fillStyle=wood?'#644224':stone?'#394d5a':'#777e7b';g.fill();
    polygon(g,[[w-7,0],[w+3,5],[w+3,h+5],[w-7,h-5]]);g.fillStyle=wood?'#78502c':stone?'#4d6372':'#939b96';g.fill();
    const outline=stone?[[7,-5],[w-9,-5],[w,-1],[w,h-14],[w-9,h-4],[6,h-4],[0,h-11],[0,3]]:[[3,-5],[w-3,-5],[w,-2],[w,h-8],[w-3,h-5],[3,h-5],[0,h-8],[0,-2]];
    polygon(g,outline);
    const top=g.createLinearGradient(0,-6,w,h);
    top.addColorStop(0,wood?'#dda25d':stone?'#9aabb6':'#e1dfd3');
    top.addColorStop(1,wood?'#ad6d34':stone?'#667e90':'#b1b7b0');g.fillStyle=top;g.fill();
    g.save();polygon(g,outline);g.clip();
    if(wood) {
      for(let y=9;y<h;y+=14) {
        line(g,0,y,w,y,'#714421',2);line(g,0,y+2,w,y+2,'#f0c281',.8);
        for(let i=0;i<3;i++){const x=noise(variant+i,y)*w;line(g,x,y-5,Math.min(w,x+15),y-6,'#643d2229',.8);}
      }
      for(const [a,z] of [[[6,1],[w-6,h-10]],[[w-6,1],[6,h-10]]]) {
        line(g,a[0]+1,a[1]+2,z[0]+1,z[1]+2,'#5b3c27',9);
        line(g,...a,...z,'#e1ad69',7);line(g,a[0],a[1]-1,z[0],z[1]-1,'#f2c786',1);
      }
      for(const x of [7,w-7])for(const y of [2,h-12])disc(g,x,y,1.5,'#55442f');
    } else if(stone) {
      polygon(g,[[0,h*.46],[w*.3,h*.27],[w*.68,h*.5],[w,h*.2],[w,h],[0,h]]);g.fillStyle='#4c65752c';g.fill();
      line(g,w*.3,-5,w*.37,h*.34,'#40596b',1.4);line(g,w*.37,h*.34,w*.7,h*.5,'#40596b',1.4);
      line(g,w*.7,h*.5,w,h*.35,'#40596b',1.4);line(g,w*.7,h*.5,w*.55,h,'#40596b',1.4);
      line(g,w*.37,h*.34,0,h*.6,'#40596b',1.4);
      polygon(g,[[0,3],[8,-5],[w-9,-5],[w,-1],[w-10,2],[10,2],[5,h-12],[0,h-11]]);g.fillStyle='#c0cdd251';g.fill();
    } else {
      rect(g,5,0,w-10,h-11,2,'#f8efcf15');
      for(const x of [w*.22,w*.78]){rect(g,x-4,h/2-8,8,5,2,'#68736b');line(g,x-3,h/2-8,x+3,h/2-8,'#48564f',1.5);}
      line(g,7,h-12,w-7,h-12,'#8b99904d',1);
    }
    if(!wood)for(let i=0;i<110;i++) {
      g.fillStyle=i%3?'#f4f1d72b':'#263b4532';
      g.fillRect(noise(variant+3,i*2)*w,noise(variant+3,i*2+1)*(h-6)-3,noise(variant+8,i)*1.8+.6,.8);
    }
    // Increasing fractures are fixed to the block, never fresh random scratches.
    for(let k=0;k<stage;k++) {
      const x=w*(.28+k*.22),y=4+noise(variant,k)*h*.2;
      g.beginPath();g.moveTo(x,-5);g.lineTo(x+4,y+6);g.lineTo(x-6,y+13);g.lineTo(x+5,h-8);
      g.strokeStyle=wood?'#50331f':'#37464b';g.lineWidth=1.5+stage*.7;g.stroke();
      line(g,x-6,y+13,x-16,y+20,wood?'#f3d08e':'#e9e5d5',1);
    }
    if(stage>=2) {
      polygon(g,[[w-17,-5],[w-9,10],[w-1,6],[w,22],[w,0]]);g.fillStyle=wood?'#633e21':'#596769';g.fill();
      if(!wood)line(g,w-10,1,w-3,5,'#e3e1ce',2);
    }
    if(stage===3&&!wood) {
      polygon(g,[[0,h-20],[12,h-15],[7,h-5],[0,h-5]]);g.fillStyle='#3d4d55';g.fill();
      if(!stone)for(let i=0;i<2;i++)line(g,2,h-15+i*4,15,h-13+i*4,'#78664a',1.6);
    }
    g.restore();line(g,7,-4,w-9,-4,wood?'#ffe0a3':stone?'#d0dbe0':'#faf6e5',1.5);
    const result={canvas:c,pad,width:w+pad*2,height:h+pad*2};
    if(cache.size>=160)cache.clear();cache.set(key,result);return result;
  }
  function rubble(g,b,sunny=false) {
    if(sunny)return EBS.ScrapDaylightArt.rubble(g,b);
    const wood=b.material==='wood',stone=b.material==='stone',seed=b.id+36;
    g.save();g.translate(b.x+b.w/2,b.y+b.h/2);
    const dust=g.createRadialGradient(3,4,0,3,4,Math.max(b.w,b.h)*.58);
    dust.addColorStop(0,wood?'#956d3828':'#cad2cc20');dust.addColorStop(1,'#59616400');
    g.beginPath();g.ellipse(3,4,b.w*.57,b.h*.48,0,0,Math.PI*2);g.fillStyle=dust;g.fill();
    // Low loose fragments leave the opened route visually distinct from a wall.
    for(let i=0;i<11;i++) {
      g.save();g.translate((noise(seed,i*2)-.5)*b.w,(noise(seed,i*2+1)-.5)*b.h);g.rotate(noise(seed,i+50)*Math.PI);
      const size=3+noise(seed,i+77)*6;
      g.fillStyle=wood?(i%2?'#a9753e':'#d39c59'):stone?(i%2?'#6a8291':'#8d9fab'):(i%2?'#a5afa8':'#d1d3c5');
      polygon(g,wood?[[-size,-2],[size,-1],[size-3,2],[-size+1,2]]:[[-size,-size*.4],[0,-size*.7],[size,0],[size*.5,size*.5],[-size*.6,size*.4]]);g.fill();
      line(g,-size,-size*.4,0,-size*.7,wood?'#e6b36b66':'#e5e8d866',.7);g.restore();
    }
    g.restore();
  }
  function breakEffect(g,e,under,sunny=false) {
    const u=e.age/e.ttl;if(u>=1)return;
    g.save();g.translate(e.x,e.y);
    if(under) {
      disc(g,0,0,e.size*(.25+u*.5),e.material==='wood'?`rgba(186,143,82,${(1-u)**2*.16})`:`rgba(172,186,184,${(1-u)**2*.19})`);
    } else for(let i=0;i<9;i++) {
      const a=noise(e.seed,i)*Math.PI*2,d=u*(20+noise(e.seed,i+12)*38),size=2+noise(e.seed,i+23)*4;
      g.save();g.translate(Math.cos(a)*d,Math.sin(a)*d-u*(1-u)*18);g.rotate(a+u*2);g.globalAlpha=1-u;
      g.fillStyle=sunny?sunnyColors[e.material]:e.color;g.fillRect(-size,-2,size*2,e.material==='wood'?3:5);g.restore();
    }
    g.restore();
  }
  EBS.ScrapMaterialArt={floor,block,rubble,breakEffect,sunnyPad:(g,pad)=>EBS.ScrapDaylightArt.pad(g,pad),sunnyColors};
})();
