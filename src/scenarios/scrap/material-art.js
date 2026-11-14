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
  const floorStyles={
    yard:{top:'#424a4d',bottom:'#28353e',accent:'#cdbd8c',grid:130},
    foundry:{top:'#3a4247',bottom:'#262f35',accent:'#e08a3c',grid:104},
    crossroads:{top:'#3b3f42',bottom:'#2a3034',accent:'#e8e6dc',grid:0},
  };
  function floorSurface(g,seed,w,h,arena) {
    const style=floorStyles[arena];
    if(style.grid) {
      const d=style.grid;
      for(let row=0,y=18;y<h-18;y+=d,row++)for(let col=0,x=18;x<w-18;x+=d,col++) {
        const shade=(noise(seed+11,row*29+col)-.5)*.06;
        g.fillStyle=shade>0?`rgba(255,255,255,${shade})`:`rgba(0,0,0,${-shade})`;
        g.fillRect(x+1,y+1,d-1,d-1);
        line(g,x,y,x+d,y,'#0b141b70',1);line(g,x,y,x,y+d,'#0b141b70',1);
        line(g,x+1,y+1,x+d,y+1,'#97a4a72c',.5);line(g,x+1,y+1,x+1,y+d,'#97a4a72c',.5);
      }
    } else {
      // Asphalt has two expansion joints, never a tiled grid.
      for(const x of [w*.28,w*.72])line(g,x,18,x,h-18,'#121b2047',1);
    }
    const grain=arena==='crossroads'?7500:3500;
    for(let i=0;i<grain;i++) {
      g.fillStyle=i%3?'#c4ceca0b':'#030b1418';
      g.fillRect(18+noise(seed,i*2)*(w-36),18+noise(seed,i*2+1)*(h-36),
        arena==='crossroads'?.4+noise(seed+7,i)*.8:.7+noise(seed+7,i)*1.6,.6);
    }
    if(arena==='foundry') {
      // Flat diamond plate only in entry fields and the open middle cross.
      g.save();g.beginPath();
      for(const x of [18,w-138])for(const y of [18,h-138])g.rect(x,y,120,120);
      g.rect(80,h/2-43,w-160,86);g.rect(w/2-42,80,84,h-160);g.clip();
      for(let row=0,y=24;y<h;y+=13,row++)for(let x=22+(row%2)*9;x<w;x+=18)
        line(g,x,y,x+5,y-4,'#bdc6c712',1.2);
      g.restore();
      for(const y of [h/2-43,h/2+43]) {
        rect(g,80,y-3,w-160,6,.8,'#111b2147');
        line(g,80,y-3,w-80,y-3,'#77838519',.7);
        line(g,80,y+1,w-80,y+1,'#ff8a3d0f',2);
        for(let x=84;x<w-80;x+=7)line(g,x,y-2,x,y+2,'#6f777c40',1);
      }
    }
  }
  function startField(g,x,y,flipX,flipY,color) {
    g.save();g.translate(x,y);g.scale(flipX?-1:1,flipY?-1:1);g.translate(18,18);
    g.globalAlpha=.07;rect(g,0,0,120,120,2,color);
    g.save();g.beginPath();g.rect(110,0,10,120);g.rect(0,110,120,10);g.clip();
    g.globalAlpha=.20;
    for(let x=-128;x<240;x+=16) {
      polygon(g,[[x,0],[x+8,0],[x+128,120],[x+120,120]]);g.fillStyle=color;g.fill();
    }
    g.restore();g.globalAlpha=.25;
    g.beginPath();g.moveTo(83,101);g.lineTo(101,101);g.lineTo(101,83);
    g.strokeStyle=color;g.lineWidth=3;g.stroke();g.restore();
  }
  function floorMarkings(seed,w,h,arena,places) {
    const c=canvas(w*2,h*2),g=c.getContext('2d'),accent=floorStyles[arena].accent;g.scale(2,2);
    g.lineCap='butt';g.lineJoin='round';g.strokeStyle=accent;
    g.globalAlpha=.12;
    for(const [radius,width] of [[67,3],[52,1.5]]) {
      g.beginPath();g.arc(w/2,h/2,radius,0,Math.PI*2);g.lineWidth=width;g.stroke();
    }
    for(let i=0;i<8;i++) {
      const a=i*Math.PI/4;
      line(g,w/2+Math.cos(a)*57,h/2+Math.sin(a)*57,w/2+Math.cos(a)*64,h/2+Math.sin(a)*64,accent,1.5);
    }
    g.globalAlpha=.14;
    for(const y of [h/2-47,h/2+47])line(g,80,y,w-80,y,accent,3);
    if(arena==='crossroads') {
      g.globalAlpha=.16;g.setLineDash([18,22]);
      for(const [x,y,xx,yy] of [[80,h/2,w/2-80,h/2],[w/2+80,h/2,w-80,h/2],
        [w/2,80,w/2,h/2-80],[w/2,h/2+80,w/2,h-80]])line(g,x,y,xx,yy,accent,2);
      g.setLineDash([]);
      for(const side of [-1,1]) {
        line(g,w/2+side*94,h/2-43,w/2+side*94,h/2+43,accent,4);
        line(g,w/2-43,h/2+side*94,w/2+43,h/2+side*94,accent,4);
        // One six-bar crossing for each of the four approaches.
        for(let i=0;i<6;i++) {
          g.fillStyle=accent;g.fillRect(w/2+side*123-15,h/2-28+i*10,30,6);
          g.fillRect(w/2-28+i*10,h/2+side*123-15,6,30);
        }
      }
    }
    const colors=['#ff725e','#54dce8','#ffce63','#b0e779'];
    places.starts.forEach(([x,y],i)=>startField(g,x>w/2?w:0,y>h/2?h:0,x>w/2,y>h/2,colors[i]));
    g.globalAlpha=.12;
    for(const [x,y] of places.weapons) {
      g.setLineDash([4,6]);g.strokeStyle=accent;g.lineWidth=1;g.strokeRect(x-22,y-22,44,44);g.setLineDash([]);
      for(const dx of [-1,1])for(const dy of [-1,1]) {
        line(g,x+dx*22,y+dy*14,x+dx*22,y+dy*22,accent,1.6);
        line(g,x+dx*14,y+dy*22,x+dx*22,y+dy*22,accent,1.6);
      }
    }
    // Worn paint, not dashed UI borders: erase 360 bounded chips from this
    // transparent paint layer, concentrating on actual painted surfaces.
    g.globalAlpha=1;g.globalCompositeOperation='destination-out';
    for(let i=0;i<360;i++) {
      const a=noise(seed+31,i),b=noise(seed+37,i),d=noise(seed+41,i);let x,y;
      const area=i%5;
      if(area===0) {x=80+a*(w-160);y=h/2+(b>.5?47:-47)+(d-.5)*6;}
      else if(area===1) {
        const angle=a*Math.PI*2,r=(b>.5?67:52)+(d-.5)*5;x=w/2+Math.cos(angle)*r;y=h/2+Math.sin(angle)*r;
      } else if(area===2 || (area===4&&arena!=='crossroads')) {
        const [sx,sy]=places.starts[Math.floor(i/5)%4];x=sx>w/2?w-18-a*120:18+a*120;y=sy>h/2?h-18-b*120:18+b*120;
      } else if(area===3) {
        const [sx,sy]=places.weapons[(i>>2)%places.weapons.length];
        x=sx+(b>.5?22:-22);y=sy+(a-.5)*44;if(d>.5)[x,y]=[sx+(a-.5)*44,sy+(b>.5?22:-22)];
      } else {
        x=w/2+(b>.5?123:-123)+(a-.5)*30;y=h/2+(d-.5)*60;
        if(i%2)[x,y]=[w/2+(d-.5)*60,h/2+(b>.5?123:-123)+(a-.5)*30];
      }
      g.globalAlpha=i%7===0?.95:.6;
      g.fillStyle='#000';g.beginPath();g.ellipse(x,y,1+a*2,.7+b*1.6,d*Math.PI,0,Math.PI*2);g.fill();
    }
    g.globalCompositeOperation='source-over';return c;
  }
  function floorWear(g,seed,w,h,arena,pads) {
    g.save();g.beginPath();g.rect(18,18,w-36,h-36);
    // Pads are about 76 AE wide. Keep all wear at least 30 AE from their edges.
    for(const [x,y] of pads){g.moveTo(x+72,y);g.arc(x,y,72,0,Math.PI*2);}
    g.clip('evenodd');
    for(let i=0;i<8;i++) {
      let x,y,rx,ry;
      for(let attempt=0;attempt<32;attempt++) {
        const k=i*32+attempt;rx=9+noise(seed+63,k)*18.5;ry=rx*(.4+noise(seed+67,k)*.4);
        x=50+noise(seed+53,k)*(w-100);y=48+noise(seed+59,k)*(h-96);
        if(pads.every(([px,py])=>Math.hypot(x-px,y-py)>72+rx*1.4))break;
      }
      g.beginPath();
      for(let k=0;k<3+Math.floor(noise(seed+71,i)*3);k++) {
        const ox=(noise(seed+73,i*5+k)-.5)*rx,oy=(noise(seed+79,i*5+k)-.5)*ry;
        g.moveTo(x+ox+rx,y+oy);g.ellipse(x+ox,y+oy,rx*(.55+noise(seed+83,k)*.45),ry,noise(seed+89,k)*.6,0,Math.PI*2);
      }
      g.fillStyle=`rgba(11,15,18,${.18+noise(seed+97,i)*.10})`;g.fill();
    }
    for(let i=0;i<3;i++) {
      const radius=135+noise(seed+101,i)*65,length=150+noise(seed+103,i)*110;
      const x=w*(.18+i*.31),y=h/2+radius-13+(noise(seed+107,i)-.5)*38;
      const start=-Math.PI/2-length/radius*.5;
      for(const r of [radius-3,radius+3]) {
        g.beginPath();g.arc(x,y,r,start,start+length/radius);g.strokeStyle='#080e1414';g.lineWidth=1.5;g.stroke();
      }
    }
    const rust=arena==='foundry'?9:6;
    for(let i=0;i<rust;i++) {
      const side=i%4,t=.12+noise(seed+109,i)*.76;
      const x=side===0?28:side===1?w-28:t*w,y=side===2?28:side===3?h-28:t*h;
      const r=14+noise(seed+113,i)*18,shade=g.createRadialGradient(x,y,0,x,y,r);
      shade.addColorStop(0,'#7a55320d');shade.addColorStop(1,'#7a553200');
      g.fillStyle=shade;g.fillRect(x-r,y-r,r*2,r*2);
    }
    g.restore();
  }
  function floorRim(g,w,h,pads) {
    const steel=g.createLinearGradient(0,0,18,18);steel.addColorStop(0,'#2b3740');steel.addColorStop(1,'#1d272f');
    for(const [x,y,ww,hh] of [[2,2,w-4,12],[2,h-14,w-4,12],[2,14,12,h-28],[w-14,14,12,h-28]])rect(g,x,y,ww,hh,2,steel);
    line(g,4,3,w-4,3,'#6b7b8455',1);line(g,3,4,3,h-4,'#65778044',1);
    line(g,4,h-3,w-4,h-3,'#080f15',1);line(g,w-3,4,w-3,h-4,'#080f15',1);
    line(g,18,18,w-18,18,'#080e15',2);line(g,18,18,18,h-18,'#080e15',2);
    line(g,18,h-18,w-18,h-18,'#7d8b9080',1);line(g,w-18,18,w-18,h-18,'#7d8b9080',1);
    for(const [px,py] of pads) {
      const side=[px,w-px,py,h-py].indexOf(Math.min(px,w-px,py,h-py));
      g.save();g.translate(side<2?(side===0?8:w-8):px,side<2?py:(side===2?8:h-8));
      if(side<2)g.rotate(Math.PI/2);
      g.beginPath();g.rect(-30,-5,60,10);g.clip();g.globalAlpha=.55;g.fillStyle='#090e10';g.fillRect(-30,-5,60,10);
      for(let x=-46;x<42;x+=14){polygon(g,[[x,-5],[x+7,-5],[x+17,5],[x+10,5]]);g.fillStyle='#d9b14a';g.fill();}
      g.restore();
    }
    const screw=(x,y)=>{disc(g,x,y,2.2,'#5c6d76');disc(g,x-.6,y-.7,.7,'#a5b2b780');line(g,x-.8,y+.4,x+.8,y-.4,'#26343e',.6);};
    for(let x=50;x<w-30;x+=80){screw(x,8);screw(x,h-8);}
    for(let y=50;y<h-30;y+=80){screw(8,y);screw(w-8,y);}
  }
  function floor(seed,w,h,sunny=false,arena='yard') {
    if(sunny)return EBS.ScrapDaylightArt.floor(seed,w,h);
    arena=Object.hasOwn(floorStyles,arena)?arena:'yard';
    // A map is a stable place: neither the match seed nor round number changes
    // its painted marks, slabs, grime or wear. Sunny retains its original art.
    seed=EBS.util.hashSeed('scrap-floor-'+arena);
    const style=floorStyles[arena],portrait=h>w,wide=portrait?h:w,short=portrait?w:h;
    const places=EBS.ScrapMaterials.placements(arena,false),c=canvas(w*2,h*2),g=c.getContext('2d');g.scale(2,2);
    rect(g,0,0,w,h,11,'#0b141b');
    const light=g.createLinearGradient(0,0,w,h);light.addColorStop(0,style.top);light.addColorStop(1,style.bottom);
    g.fillStyle=light;g.fillRect(18,18,w-36,h-36);
    g.save();g.beginPath();g.rect(18,18,w-36,h-36);g.clip();
    g.save();if(portrait){g.translate(w,0);g.rotate(Math.PI/2);}
    floorSurface(g,seed,wide,short,arena);
    floorWear(g,seed,wide,short,arena,places.pads);
    const marks=floorMarkings(seed,wide,short,arena,places);g.drawImage(marks,0,0,wide,short);marks.width=marks.height=1;
    g.restore();
    // Illumination stays at screen top-left even when the authored map turns.
    const top=g.createLinearGradient(0,18,0,32);top.addColorStop(0,'#00000059');top.addColorStop(1,'#00000000');
    g.fillStyle=top;g.fillRect(18,18,w-36,14);
    const left=g.createLinearGradient(18,0,32,0);left.addColorStop(0,'#00000059');left.addColorStop(1,'#00000000');
    g.fillStyle=left;g.fillRect(18,18,14,h-36);
    for(const [x,y] of [[18,18],[w-18,18],[w-18,h-18],[18,h-18]]) {
      const shade=g.createRadialGradient(x,y,0,x,y,155);shade.addColorStop(0,'#00000024');shade.addColorStop(1,'#00000000');
      g.fillStyle=shade;g.fillRect(x-155,y-155,310,310);
    }
    g.restore();
    const pads=portrait?places.pads.map(([x,y])=>[EBS.ScrapMaterials.height-y,x]):places.pads;
    floorRim(g,w,h,pads);return c;
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
    // Tight contact shadow anchors the unchanged cover artwork to the floor.
    polygon(g,[[2,h+3],[w+3,h+3],[w+6,h+6],[4,h+6]]);g.fillStyle='#03090e4d';g.fill();
    polygon(g,[[w+2,3],[w+5,5],[w+6,h+6],[w+3,h+4]]);g.fillStyle='#03090e4d';g.fill();
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
