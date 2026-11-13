/* Sunlit courtyard. Cached procedural surfaces and geometry-matched cover.
 * All texture variation is stateless; rendering never consumes the match RNG. */
(function () {
  'use strict';
  const colors={wood:'#b98a54',stone:'#7b8c92',concrete:'#cdcbbd'};
  const noise=(seed,i)=>{let n=Math.imul(seed+1,374761393)^Math.imul(i+1,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296;};
  const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=Math.ceil(w*2);c.height=Math.ceil(h*2);return c;};
  const polygon=(g,p)=>{g.beginPath();p.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();};
  const rect=(g,x,y,w,h,r,color)=>{g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=color;g.fill();};
  const line=(g,x,y,xx,yy,color,width=1)=>{g.beginPath();g.moveTo(x,y);g.lineTo(xx,yy);g.strokeStyle=color;g.lineWidth=width;g.stroke();};
  const ellipse=(g,x,y,rx,ry,color)=>{g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fillStyle=color;g.fill();};
  const gradient=(g,x,y,w,h,a,b)=>{const t=g.createLinearGradient(x,y,x+w,y+h);t.addColorStop(0,a);t.addColorStop(1,b);return t;};
  function planter(g,x,y,seed) {
    // Shallow trough entirely on the retaining rim, outside the playable floor.
    rect(g,x+1,y+2,64,12,2,'#2c463d40');rect(g,x,y,64,12,2,'#7f8980');
    rect(g,x+2,y+2,60,8,1,'#4a4536');line(g,x+1,y,x+62,y,'#c8c8ad',1);
    for(let i=0;i<18;i++) {
      const xx=x+5+noise(seed,i)*54,yy=y+3+noise(seed+2,i)*6;
      const a=noise(seed+3,i)*Math.PI*2;
      g.save();g.translate(xx,yy);g.rotate(a);
      ellipse(g,0,0,1.4,3.6,i%3?'#647d48':'#86955d');line(g,0,-2,0,2,'#b0ad6f77',.4);
      if(i%6===0){ellipse(g,0,-2,1.5,1.2,'#c9bdba');ellipse(g,.4,-2,.45,.45,'#d9c98c');}
      g.restore();
    }
  }
  function floor(seed,w,h) {
    const c=canvas(w,h),g=c.getContext('2d');g.scale(2,2);
    rect(g,0,0,w,h,9,'#4c605f');
    g.fillStyle=gradient(g,18,18,w,h,'#d0c6ab','#9eafa7');g.fillRect(18,18,w-36,h-36);
    g.save();g.beginPath();g.rect(18,18,w-36,h-36);g.clip();
    // Cast slabs, fine expansion joints and aggregate, rather than a tiled game board.
    for(let row=0,y=18;y<h-18;y+=104,row++)for(let col=0,x=18;x<w-18;x+=146,col++) {
      const k=row*29+col,n=noise(seed+11,k);
      g.fillStyle=n>.5?`rgba(255,246,219,${(n-.5)*.065})`:`rgba(49,74,77,${(.5-n)*.075})`;
      g.fillRect(x+1,y+1,144,102);
      line(g,x,y,x+146,y,'#354c4c24',.8);line(g,x,y,x,y+104,'#354c4c21',.8);
      line(g,x+1,y+1,x+145,y+1,'#fbefcc24',.5);
    }
    // The centre and flanks share a quiet, worn mineral finish.
    g.fillStyle='#5a817b16';g.fillRect(18,h/2-48,w-36,96);
    g.fillStyle='#64837d0d';g.fillRect(w/2-68,18,136,h-36);
    for(let i=0;i<11000;i++) {
      const x=18+noise(seed+7,i*2)*(w-36),y=18+noise(seed+7,i*2+1)*(h-36);
      g.fillStyle=i%3?'#fff8e411':'#4b5d5b17';g.fillRect(x,y,.5+noise(seed+8,i)*1.2,.6);
    }
    for(let i=0;i<60;i++) {
      const x=42+noise(seed+40,i*2)*(w-84),y=42+noise(seed+40,i*2+1)*(h-84);
      line(g,x,y,x+7+noise(seed+49,i)*20,y+(noise(seed+51,i)-.5)*12,'#586e6714',.65);
    }
    // Restrained lane ends mark routes without competing with projectiles.
    for(const x of [78,w-78])for(const y of [h/2-48,h/2+48])line(g,x-14,y,x+14,y,'#f2ebd294',2);
    g.setLineDash([7,10]);
    for(const y of [64,h-64])line(g,192,y,w-192,y,'#f7eedb48',1.2);
    g.setLineDash([]);
    const teams=['#d58771','#75b7c0','#d4b564','#a5ca87'];
    [[0,0],[w,0],[w,h],[0,h]].forEach(([x,y],i)=>{
      g.save();g.translate(x,y);g.scale(x?-1:1,y?-1:1);
      line(g,45,101,45,45,teams[i]+'a0',3);line(g,45,45,119,45,teams[i]+'a0',3);
      line(g,45,108,45,124,'#f0e8cf6b',1.3);g.restore();
    });
    // Recessed drainage at the perimeter; no props in a traversable lane.
    for(const x of [29,w-35]) {
      rect(g,x,h/2-91,6,182,1,'#5f726b');
      for(let y=h/2-87;y<h/2+88;y+=6)line(g,x+1,y,x+5,y,'#344c4b',1.5);
    }
    const sun=g.createLinearGradient(0,0,w,h);
    sun.addColorStop(0,'#ffdf9626');sun.addColorStop(.58,'#ead9ad00');sun.addColorStop(1,'#315e7313');
    g.fillStyle=sun;g.fillRect(18,18,w-36,h-36);
    polygon(g,[[w-18,18],[w-18,99],[w-130,18]]);g.fillStyle='#3455540b';g.fill();
    g.restore();
    // Bevelled retaining rim, flush fasteners and a warm sun-facing edge.
    rect(g,2,2,w-4,12,3,'#88938a');rect(g,2,h-14,w-4,12,3,'#a2aaa0');
    line(g,18,19,w-18,19,'#415954',4);line(g,19,19,19,h-18,'#546961',3);
    line(g,18,h-18,w-18,h-18,'#e8dfc5',2);line(g,w-18,18,w-18,h-18,'#c9d0bf',1.5);
    for(let x=76;x<w-40;x+=118)for(const y of [7,h-7]){ellipse(g,x,y,1.5,1.5,'#586c66');line(g,x-1,y-1,x+1,y-1,'#d9d9c5',.7);}
    for(const x of [w*.28-32,w*.72-32]) {
      planter(g,x,2,seed+Math.round(x));planter(g,x,h-14,seed+Math.round(x)+61);
    }
    return c;
  }
  function block(b,cache) {
    const {w,h,material}=b,stage=Math.min(3,Math.floor((1-b.hp/b.maxHp)*4)),seed=b.id%8+17;
    const key=`daylight2:${material}:${w}:${h}:${stage}:${seed}`;
    if(cache.has(key))return cache.get(key);
    const pad=26,width=w+pad*2,height=h+pad*2,c=canvas(width,height),g=c.getContext('2d');g.scale(2,2);g.translate(pad,pad);
    const wood=material==='wood',stone=material==='stone',bevel=wood?2:stone?7:3;
    const outline=[[bevel,-7],[w-bevel,-7],[w,-7+bevel],[w,h-8-bevel],[w-bevel,h-8],[bevel,h-8],[0,h-8-bevel],[0,-7+bevel]];
    // Separate shadow texture lets every shadow sit below every obstacle and pickup.
    const shadow=canvas(width,height),sg=shadow.getContext('2d');sg.scale(2,2);sg.translate(pad,pad);
    sg.shadowColor='#23434035';sg.shadowBlur=8;sg.shadowOffsetX=2;sg.shadowOffsetY=3;
    polygon(sg,[[0,2],[w,2],[w+14,h+15],[14,h+15]]);sg.fillStyle='#25444342';sg.fill();
    rect(g,-1,1,w+5,h+5,3,'#30484055');
    polygon(g,[[0,h-12],[w,h-12],[w+4,h+3],[4,h+3]]);
    g.fillStyle=gradient(g,0,h-12,0,15,wood?'#976638':stone?'#52656c':'#8f9991',wood?'#694e33':stone?'#3b515b':'#6f807a');g.fill();
    polygon(g,[[w-7,-5],[w+4,3],[w+4,h+3],[w-7,h-12]]);g.fillStyle=wood?'#86613d':stone?'#4c626c':'#a7afa1';g.fill();
    polygon(g,outline);g.fillStyle=gradient(g,0,-7,w,h,wood?'#d0a46a':stone?'#97a1a1':'#e0dfcf',wood?'#a47643':stone?'#687e88':'#bfc4b6');g.fill();
    g.save();polygon(g,outline);g.clip();
    if(wood) {
      for(let x=2,board=0;x<w;x+=13,board++) {
        const shade=noise(seed,board);
        g.fillStyle=shade>.5?'#ebc28016':'#4f3b2210';g.fillRect(x,-7,12,h);
        line(g,x,-7,x,h-8,'#60472c9c',.8);line(g,x+1,-7,x+1,h-8,'#f2cd8e74',.65);
        for(let i=0;i<8;i++) {
          const gx=x+1+noise(seed+board,i)*10,gy=-5+noise(seed+3,i+board*9)*(h-10);
          g.beginPath();g.moveTo(gx,gy);g.bezierCurveTo(gx+2,gy+5,gx-2,gy+10,gx+1,gy+18);
          g.strokeStyle=i%2?'#65432140':'#edca8e3b';g.lineWidth=.45;g.stroke();
        }
      }
      for(let i=0;i<2;i++) {
        const x=10+noise(seed,i)*Math.max(1,w-20),y=9+noise(seed+1,i)*Math.max(1,h-29);
        ellipse(g,x,y,2,4,'#6b4b2e55');ellipse(g,x,y,1,2,'#62482e66');
      }
      for(const y of [-5,h-18]) {
        rect(g,1,y,w-2,10,1,'#b98a50');line(g,2,y,w-2,y,'#f2cc8d',1);line(g,2,y+10,w-2,y+10,'#6c4f32a0',1);
        for(let i=0;i<4;i++){const x=noise(seed+4,i)*w;line(g,x,y+4,Math.min(w,x+18),y+4.5,'#79512f42',.6);}
      }
      for(const x of [7,w-10]) {
        rect(g,x,-6,4,h-2,1,'#546368');line(g,x,-5,x,h-10,'#b5bcb0',.8);
        for(const y of [0,h-13]){ellipse(g,x+2,y,1.3,1.3,'#293c45');ellipse(g,x+1.6,y-.4,.6,.6,'#cbd0b9');}
      }
      rect(g,w*.42,h*.4,11,8,.4,'#d8c5a27a');
      for(let x=w*.42+2;x<w*.42+9;x+=2)line(g,x,h*.4+2,x,h*.4+6,'#6f654b80',.6);
    } else {
      for(let i=0;i<Math.min(480,w*h/9);i++) {
        const x=noise(seed,i*2)*w,y=noise(seed,i*2+1)*(h-1)-7,n=noise(seed+10,i);
        g.fillStyle=i%3?'#fff5d340':'#314c4b30';g.fillRect(x,y,.4+n*1.5,.4+n*.7);
      }
      if(stone) {
        for(let i=0;i<16;i++) {
          const x=noise(seed+2,i)*w,y=noise(seed+5,i)*(h-12)-4;
          line(g,x,y,Math.min(w,x+7+noise(seed+8,i)*29),y+noise(seed+9,i)*3,'#d0d2bb25',.65);
        }
        polygon(g,[[0,0],[bevel,-7],[w-bevel,-7],[w,-1],[w-8,-2],[8,0],[5,h-15],[0,h-15]]);g.fillStyle='#d7d9c642';g.fill();
        polygon(g,[[w-10,8],[w,3],[w,h-15],[w-7,h-8],[w-12,h-14]]);g.fillStyle='#354c5b20';g.fill();
      } else {
        line(g,5,h*.31,w-5,h*.31,'#7e928123',.75);line(g,5,h*.31+1,w-5,h*.31+1,'#f7eddc55',.7);
        for(const x of [w*.25,w*.75]){ellipse(g,x,h*.56,3.6,2.2,'#e7e6d3');ellipse(g,x+.5,h*.56+.4,2.8,1.4,'#6c7f75');}
        rect(g,6,-4,3,h-11,.5,'#67918a90');
        for(let i=0;i<7;i++)rect(g,6,-4+noise(seed,i)*Math.max(1,h-14),3,1,0,'#e2dfc4');
      }
    }
    // Stable cracks cut through the actual material; chipped corners expose depth.
    for(let k=0;k<stage;k++) {
      const x=w*(.24+k*.22),y=4+noise(seed,k)*h*.18;
      const pts=[[x,-7],[x+3,y],[x-6,y+9],[x+5,y+18],[x+1,h-8]];
      g.beginPath();pts.forEach(([xx,yy],i)=>i?g.lineTo(xx,yy):g.moveTo(xx,yy));
      g.strokeStyle=wood?'#62452c':'#435753';g.lineWidth=1+stage*.55;g.stroke();
      g.save();g.translate(-.7,0);g.strokeStyle=wood?'#f0c98299':'#f4eed28c';g.lineWidth=.5;g.stroke();g.restore();
      line(g,x-6,y+9,x-15,y+16,wood?'#765235':'#5b6e66',.7+stage*.3);
    }
    if(stage>=2) {
      polygon(g,[[w-17,-7],[w-13,1],[w-7,0],[w-4,10],[w,14],[w,-7]]);g.fillStyle=wood?'#674c31':stone?'#465e66':'#7d8c80';g.fill();
      line(g,w-15,-4,w-12,1,wood?'#e5bb7c':'#ece7cd',1);
    }
    if(stage===3) {
      polygon(g,[[0,h-24],[8,h-22],[13,h-13],[7,h-8],[0,h-8]]);g.fillStyle=wood?'#775032':'#61736e';g.fill();
      if(!wood&&!stone)for(let i=0;i<2;i++)line(g,2,h-19+i*4,13,h-17+i*4,'#8b7555',1.2);
    }
    g.restore();line(g,bevel+2,-6,w-bevel-2,-6,wood?'#f6d89f':stone?'#d9dfd7':'#f9f2d9',1.1);
    const result={canvas:c,shadow,pad,width,height};if(cache.size>=160)cache.clear();cache.set(key,result);return result;
  }
  function rubble(g,b) {
    const wood=b.material==='wood',seed=b.id+71;
    g.save();g.translate(b.x+b.w/2,b.y+b.h/2);
    const dust=g.createRadialGradient(0,0,0,0,0,Math.max(b.w,b.h)*.58);dust.addColorStop(0,'#596d5b17');dust.addColorStop(1,'#596d5b00');
    g.fillStyle=dust;g.fillRect(-b.w*.65,-b.h*.65,b.w*1.3,b.h*1.3);
    for(let i=0;i<11;i++) {
      g.save();g.translate((noise(seed,i*2)-.5)*b.w,(noise(seed,i*2+1)-.5)*b.h);
      const angle=noise(seed,i+30)*Math.PI;
      const size=3+noise(seed,i+40)*6;
      const pts=wood?[[-size*1.3,-2],[size*1.3,-1],[size,2],[-size,2]]:[[-size,-size*.4],[0,-size*.6],[size*.8,0],[size*.4,size*.4],[-size*.5,size*.5]];
      g.save();g.translate(1.4,1.8);g.rotate(angle);polygon(g,pts);g.fillStyle='#3f554b35';g.fill();g.restore();
      g.rotate(angle);
      polygon(g,pts);g.fillStyle=colors[b.material];g.fill();line(g,-size,-size*.4,0,-size*.6,'#ece8cb70',.7);
      if(wood)line(g,-size,0,size,0,'#79562e5c',.55);g.restore();
    }
    g.restore();
  }
  function pad(g,pad) {
    const color=pad.kind==='rocket'?'#d6b66e':'#92c9d2';
    g.save();g.translate(pad.x,pad.y);
    rect(g,-31,-27,68,65,5,'#43595035');rect(g,-33,-33,66,66,4,'#5f7678');
    rect(g,-31,-31,62,62,3,'#344a53');line(g,-29,-31,29,-31,'#cbd2c0',1);
    for(const x of [-26,26])for(const y of [-26,26]){ellipse(g,x,y,1.8,1.8,'#8fa2a1');line(g,x-1,y,x+1,y,'#354c54',.7);}
    ellipse(g,0,0,23,23,'#253b45');
    g.beginPath();g.arc(0,0,25,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-Math.min(1,pad.readyIn/pad.period)));g.strokeStyle=color;g.lineWidth=2;g.stroke();
    g.textAlign='center';g.textBaseline='middle';g.font='700 13px "Segoe UI",sans-serif';g.fillStyle='#e9e5d5';
    g.fillText(pad.readyIn<=0?'READY':String(Math.ceil(pad.readyIn)).padStart(2,'0'),0,-2);
    g.font='600 5px "Segoe UI",sans-serif';g.fillStyle=color;g.fillText(pad.kind.toUpperCase(),0,13);
    g.restore();
  }
  function pickupSprites(renderer,kind,loaded) {
    const cache=renderer._daylightPickups||(renderer._daylightPickups=new Map()),key=kind+':'+loaded;
    if(cache.has(key))return cache.get(key);
    const sprite=canvas(64,64),g=sprite.getContext('2d');g.scale(2,2);g.translate(18,31);
    renderer._weapon(g,kind,loaded,kind==='rocket'?'#d6b66e':'#92c9d2',true);
    // The actual weapon silhouette casts the shadow; there is no generic oval.
    const shadow=canvas(64,64),sg=shadow.getContext('2d');sg.drawImage(sprite,0,0);
    sg.globalCompositeOperation='source-in';sg.fillStyle='#233d3652';sg.fillRect(0,0,shadow.width,shadow.height);
    const result={sprite,shadow};cache.set(key,result);return result;
  }
  function pickup(g,p,t,renderer) {
    const empty=!!p.empty||p.ammo<=0,color=p.kind==='rocket'?'#d6b66e':'#92c9d2';
    const angle=(noise(p.id,13)-.5)*1.5,{sprite,shadow}=pickupSprites(renderer,p.kind,!empty);
    g.save();g.translate(p.x,p.y);
    if(empty)g.globalAlpha=Math.max(.15,Math.min(.68,.68-(p.age||0)*.13));
    else {
      // Fine circular pickup brackets are UI paint, separate from the cast shadow.
      for(let i=0;i<4;i++) {
        const a=i*Math.PI/2+.16;
        g.beginPath();g.arc(0,0,24,a,a+.4);g.strokeStyle=color+'a6';g.lineWidth=1.3;g.stroke();
      }
    }
    // Translate in arena space BEFORE rotating the silhouette. Every weapon has
    // the same down-right light vector, irrespective of its own orientation.
    g.save();g.translate(3,4);g.rotate(angle);g.drawImage(shadow,-32,-32,64,64);g.restore();
    g.save();g.rotate(angle);g.drawImage(sprite,-32,-32,64,64);g.restore();
    if(!empty) {
      rect(g,-10,18,20,10,2,'#172c32');g.textAlign='center';g.textBaseline='middle';
      g.font='700 7px "Segoe UI",sans-serif';g.fillStyle=color;g.fillText(String(Math.max(0,Math.ceil(p.ammo))),0,23);
    }
    g.restore();
  }
  EBS.ScrapDaylightArt={floor,block,rubble,pad,pickup,colors};
})();
