/* Private Grundstücke. Hausform, Nutzung des Gartens und Zugang zur Straße sind getrennt festgelegt. */
(function () {
'use strict';
const L=EBS.CloudLandscape, {rect,poly,oval,line,tree}=L;
const plaster=['#e5cd9f','#d9c4a4','#c5c8ae','#cfaa8a','#e3d8ba','#c5b7a0'];
const paint=['#466b67','#914f3d','#53677c','#aa8149','#5c7651','#886661'];
const flowers=['#bd684e','#ddb45f','#b9819a','#d7cba4','#8d749f','#d58e76'];

function boundary(g,h,a,y,d) {
  const edge=h.fence, color=['#6e8055','#947f5d','#a49e87','#818353'][edge];
  const sides=[[-a,y],[-a-1,y+d],[a-1,y+d+.7],[a,y+1]];
  if(edge===1 || edge===2) {
    line(g,sides,color,edge===1?1.05:1.55);
    line(g,sides.map(([x,yy])=>[x-.2,yy-.45]),edge===1?'#dac6a0':'#c6c1a8',.5);
    for(let x=-a;x<=a-1;x+=3.8) rect(g,x-.35,y+d-1.1,.7,1.7,'#8e8266');
  } else {
    line(g,sides,color,2);
    for(let x=-a;x<a-1;x+=2.9) oval(g,x,y+d,2,1.1,edge?'#889459':'#849863');
  }
}
function garden(g,h) {
  const a=h.w*(h.urban?.51:.62),y=h.h/2+1,d=h.depth;
  const soil=['#abb278','#b6ad82','#9ba777','#baad90','#9da76d','#b2b18a'][h.garden];
  g.save(); g.scale(1,-h.face);
  if(d<5) { oval(g,-a*.5,y+.7,1.45,1.2,'#9b795a');oval(g,-a*.5,y+.35,1.1,.9,'#7c9259');g.restore();return; }
  poly(g,[[-a,y],[a,y],[a-1,y+d+.3],[-a-1,y+d]],soil);
  if(h.garden!==2 || h.fence!==3) boundary(g,h,a,y,d);
  if(h.garden===0) {
    // Blumenstauden und Trittsteine vor einer Sitzbank.
    for(let i=0;i<11;i++) {
      const px=-a+2+(i%6)*(a*2-4)/6,py=y+d-2.7-Math.floor(i/6)*1.9;
      oval(g,px,py,1.5,1.2,'#708950'); oval(g,px-.25,py-.25,.76,.62,flowers[(i+h.accent)%6]);
    }
    for(let i=1;i<=3;i++) oval(g,a*.28+Math.sin(i)*1.4,y+i*d*.21,1.35,.8,'#d1c5a6');
    rect(g,-a+2,y+2,4.7,1.3,'#937457');
  } else if(h.garden===1) {
    // Kleine Hochbeete und ein verglastes Frühbeet.
    for(let i=0;i<h.bedCount;i++) {
      const by=y+1.6+i*(d-2)/h.bedCount;
      rect(g,-a+1.6,by,a*.92,1.95,'#896849');
      for(let j=0;j<4;j++) oval(g,-a+2.6+j*a*.19,by+.7,.64,.50,i%2?'#829652':'#acaa59');
    }
    rect(g,a*.17,y+2,a*.58,d*.59,'#6f9386');
    rect(g,a*.20,y+2.3,a*.49,d*.49,'#b3cec0');
    for(let i=1;i<=2;i++) line(g,[[a*.18,y+2+d*.16*i],[a*.69,y+2+d*.16*i]],'#f1e7c7',.5);
  } else if(h.garden===2) {
    tree(g,-a*.31,y+d*.58,Math.min(5.2,d*.4),h.accent%4,true);
    rect(g,a*.35,y+d*.35,3.8,1.15,'#896f4f');
    for(let i=0;i<4;i++) oval(g,a*.42+i*.7,y+d-.9,.65,.4,'#c7ab66');
  } else if(h.garden===3) {
    // Gepflasterter Hof mit Tisch, Stühlen und einzelnen Terrakottatöpfen.
    rect(g,-a+1,y+1,2*a-2,d-2,'#c7b99e');
    for(let i=0;i<3;i++) line(g,[[-a+1,y+2+i*2.7],[a-1,y+2+i*2.7]],'#b2a68d',.45);
    oval(g,0,y+d*.55,2.1,1.65,h.details%2?'#c19862':'#6d8d85');
    for(const dx of [-3.1,3.1]) rect(g,dx-.52,y+d*.52,.95,1.5,'#786954');
    for(const x of [-a+2,a-2]) {oval(g,x,y+d-2,1.45,1.28,'#a76d4b');oval(g,x-.15,y+d-2.3,1.05,.95,'#688454');}
  } else if(h.garden===4) {
    // Wäsche am Seil, Schatten der Pfosten und ein freier Rasen.
    const yy=y+d*.6;
    line(g,[[-a+2,yy],[a-2,yy+1]],'#7b7460',.48);
    for(let i=0;i<4;i++) rect(g,-a+3+i*(a*2-5)/4,yy+.15+i*.2,1.7,1.9,i%2?'#d9dfc9':paint[h.accent]);
    for(const xx of [-a+2,a-2]) rect(g,xx,yy-.5,.8,2.1,'#716953');
  } else {
    const sx=-a+1.5,sy=y+d*.37;
    rect(g,sx+1,sy+1,5.7,4.7,'#8d8464');rect(g,sx,sy,5.5,4.4,'#7b8575');
    line(g,[[sx,sy+2],[sx+5.5,sy+2]],'#b2b59b',.65);
    for(let i=0;i<3;i++) rect(g,a-5,y+2+i*1.35,3.8,1,'#a88a60');
  }
  g.restore();
}

// Kurze sichtbare Wand und Dachflächen geben auch bei kleinen Häusern eine klare Silhouette.
function roofPart(g,w,h,roof,wall,shape,accent) {
  const a=w/2,b=h/2, tall=shape==='gableEnd'?5.4:3.5;
  poly(g,[[-a,-b],[a+2,-b+2],[a+3.4,b+tall+1.9],[-a+2.5,b+tall+1.9]],'rgba(53,50,37,.23)');
  rect(g,-a,b-1,w,tall+1,wall);
  const sash=shape==='flat'?'#77785c':'#52625d';
  for(let i=0,n=Math.max(2,Math.floor(w/4.5));i<n;i++){
    const x=-a+(i+.5)*w/n; rect(g,x-.65,b+.65,1.3,1.5,sash);
    if(shape==='gableEnd') rect(g,x-.65,b+3,1.3,1.05,sash);
  }
  if(shape==='gableEnd'){
    poly(g,[[-a,b],[0,b-3.1],[a,b]],wall);
    poly(g,[[-a-1,-b],[0,-b-3.6],[0,b-3],[ -a-1,b+.1]],roof,'#615f51',.63);
    poly(g,[[0,-b-3.6],[a+1,-b],[a+1,b+.2],[0,b-3]],roof,'#615f51',.63);
    poly(g,[[-a-1,-b],[0,-b-3.6],[0,b-3],[-a-1,b+.1]],'rgba(255,230,177,.29)');
    for(let j=2.2;j<h-.4;j+=2.7){
      line(g,[[-a+.2,-b+j],[-.4,-b+j-3]],'rgba(88,74,57,.16)',.4);
      line(g,[[.4,-b+j-3],[a-.2,-b+j]],'rgba(70,63,51,.18)',.4);
    }
    line(g,[[0,-b-3.5],[0,b-3]],'#d5bc93',.74);
  } else {
    rect(g,-a-1,-b,w+2,h,roof);
    if(shape==='flat') {
      line(g,[[-a,-b+.5],[a,-b+.5],[a,b]],'#d0c8b3',1.2);
      for(let i=1;i<w/3;i++) line(g,[[-a+3*i,-b+1],[-a+3*i,b-1]],'#81908c',.48);
    } else {
      const inset=shape==='hip'?b*.75:0;
      poly(g,[[-a-1,-b],[a+1,-b],[a-inset,-.4],[-a+inset,-.4]],'rgba(255,228,173,.34)');
      poly(g,[[-a+inset,0],[a-inset,0],[a+1,b],[-a-1,b]],'rgba(61,50,41,.19)');
      for(let j=-b+1.9;j<b;j+=2.55) line(g,[[-a+.5,j],[a-.5,j]],'rgba(67,61,51,.18)',.52);
      line(g,[[-a+inset,-.3],[a-inset,-.3]],'#d8b593',.83);
    }
    line(g,[[-a-1,b],[a+1,b]],'#605e50',.8);
  }
  rect(g,w*.21,-b*.64,2.2,2.8,'#785d4a'); rect(g,w*.21-.45,-b*.64-.3,2.65,.85,'#d5c2a4');
  if(accent) rect(g,-1,b+.25,2,tall-.15,accent);
}
function home(g,h) {
  const {w,x,y,angle}=h,d=h.h,wall=plaster[h.accent],accent=paint[h.accent];
  const yard=h.form==='farm' || h.form==='wing';
  if(h.doorstep) line(g,[[x,y],h.doorstep],'#c4b799',yard?2.45:1.8);
  g.save();g.translate(x,y);g.rotate(angle);garden(g,h);
  switch(h.form) {
    case 'pair':
    case 'terrace': {
      const n=h.form==='pair'?2:3,unit=(w+1.5)/n;
      for(let i=0;i<n;i++) {
        g.save();g.translate((i-(n-1)/2)*unit,(i%2)*1.1);
        roofPart(g,unit-.55,d*(i%2?.86:1.05),i%2?paint[(h.accent+2)%6]:h.color,
          plaster[(h.accent+i)%6],'gableEnd',paint[(h.accent+i)%6]);g.restore();
      }
      break;
    }
    case 'wing':
    case 'farm':
      g.save();g.translate(-w*.14,-d*.10);roofPart(g,w*.74,d*.87,h.color,wall,'hip',accent);g.restore();
      g.save();g.translate(w*.26,d*.23);roofPart(g,w*.44,d*1.05,h.form==='farm'?'#8f8271':h.color,wall,'gableEnd',accent);g.restore();
      if(h.form==='farm') { for(let i=0;i<3;i++) rect(g,-w*.49+i*1.4,d*.55,1.1,2.5,'#a18358'); }
      break;
    case 'shop':
      roofPart(g,w,d,h.details%2?'#75857f':h.color,wall,h.details%2?'flat':'gableEnd',accent);
      for(let i=0;i<7;i++) rect(g,-w*.44+i*w*.125,d*.51,w*.126,3.45,i%2?'#e7d7b4':accent);
      rect(g,-w*.4,d*.51+3.5,w*.8,.55,'#896c51');break;
    case 'villa':
      roofPart(g,w*.91,d,h.color,wall,'hip',accent);
      g.save();g.translate(-w*.39,d*.23);
      poly(g,[[-3.4,-1.7],[-2.2,-3.3],[2.2,-3.3],[3.4,-1.7],[3.4,2.4],[2,3.8],[-2,3.8],[-3.4,2.4]],wall,'#827c68',.48);
      poly(g,[[-3.9,.4],[-2.5,-2.5],[0,-5.7],[3.6,-1.5],[3.9,.4],[2,1.7],[-1.9,1.7]],'#71847c');
      poly(g,[[-3.9,.4],[0,-5.7],[-.7,.9],[-1.9,1.7]],'#a0aa8d');
      rect(g,-.7,1.9,1.25,1.2,'#59716b');g.restore();
      rect(g,-3,d*.52,6,2.3,'#d4c6a9');break;
    case 'cottage':
      roofPart(g,w*.93,d*.87,h.details%3?'#ac8c55':h.color,'#e1d3b3','hip',accent);
      for(let i=0;i<4;i++) line(g,[[-w*.38+i*w*.24,d*.46],[-w*.33+i*w*.24,d*.46+2.7]],'#76654e',.75);
      break;
    default:
      roofPart(g,w*.78,d*1.11,h.color,wall,'gableEnd',accent);
      if(h.details%2) rect(g,-w*.29,-d*.26,2,3.1,'#93b0a7');
  }
  g.restore();
}
L.home=home;
})();
