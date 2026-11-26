/* Zeichenbausteine der Flusslandschaft. Alle Maße sind Weltkoordinaten. */
(function () {
'use strict';
const L = EBS.CloudLandscape, TAU = Math.PI * 2;
function poly(g, pts, fill, stroke, width = 1) {
  g.beginPath(); g.moveTo(...pts[0]);
  for (let i = 1; i < pts.length; i++) g.lineTo(...pts[i]);
  g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = width; g.stroke(); }
}
function line(g, pts, color, width = 1) {
  g.beginPath(); g.moveTo(...pts[0]);
  for (let i = 1; i < pts.length; i++) g.lineTo(...pts[i]);
  g.strokeStyle = color; g.lineWidth = width; g.stroke();
}
function oval(g, x, y, rx, ry, color, angle = 0) {
  g.beginPath(); g.ellipse(x, y, rx, ry, angle, 0, TAU); g.fillStyle = color; g.fill();
}
function rect(g, x, y, w, h, color) { g.fillStyle = color; g.fillRect(x, y, w, h); }
function tree(g, x, y, size, type, orchard = false) {
  const tones = [
    ['#43634d','#668554','#82995b','#a5aa64'], ['#526b49','#799051','#96a55d','#b6b674'],
    ['#3e6657','#587c5c','#759369','#99a879'], ['#536c47','#80905a','#9ca466','#b5b676']
  ][type % 4];
  oval(g, x + size * .48, y + size * .62, size * 1.12, size * .68, 'rgba(42,57,43,.22)', .32);
  rect(g, x - .8, y, 1.8, size * .65, '#635b42');
  if (!orchard && type === 7) {
    for (let tier=0;tier<3;tier++) {
      const base = y + size*(.43-tier*.47), width=size*(.78-tier*.18);
      poly(g,[[x-width,base],[x,base-size*1.35],[x+width,base],[x+width*.22,base+size*.12]],'#416755');
      poly(g,[[x-width,base],[x,base-size*1.35],[x-width*.12,base-size*.13]],tier===2?'#819671':'#6a8969');
    }
    return;
  }
  if (!orchard && type === 5) {
    oval(g,x,y-size*.34,size*.55,size*1.13,'#526e50',.13);
    oval(g,x-size*.12,y-size*.48,size*.40,size*.91,'#849b61',.12);
    oval(g,x-size*.18,y-size*.75,size*.24,size*.49,'#abba78',.15);
    return;
  }
  const lobes = [[-.44,.12,.55], [.04,.28,.66], [.49,-.13,.53], [-.24,-.39,.62], [.21,-.41,.57]];
  for (let i = 0; i < lobes.length; i++) {
    const [dx,dy,k] = lobes[i], cx = x + dx * size, cy = y + dy * size;
    oval(g,cx,cy,k*size,k*size*.9,tones[i < 2 ? 0 : 1]);
    oval(g,cx-k*size*.12,cy-k*size*.2,k*size*.85,k*size*.67,tones[i < 2 ? 1 : 2]);
  }
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4 + type, d = (i % 3 + 1) * size * .16;
    oval(g, x + Math.cos(a)*d - size*.12, y + Math.sin(a)*d - size*.32, size*.12, size*.065,
      orchard && i % 2 ? '#c98456' : tones[3], -.5);
  }
}
function building(g, h) {
  if (h.kind === 'home') { L.home(g,h); return; }
  const { w, x, y, angle, kind } = h, d = h.h, a = w / 2, b = d / 2;
  g.save(); g.translate(x, y); g.rotate(angle);
  const height = kind === 'mill' || kind === 'hall' ? 5 : 3.2;
  poly(g,[[-a,-b],[a+3,-b+2],[a+5,b+height+3],[-a+3,b+height+3]],'rgba(47,45,36,.23)');
  rect(g,-a,b-2,w,height+2,kind === 'store' ? '#9a7958' : '#d8c8a9');
  for (let i = 0; i < Math.floor(w/6); i++) rect(g,-a+2.6+i*6,b-.1,2.1,2.6,'#526363');
  rect(g,-.9,b-.1,2.2,height,'#79614d');
  const roof = kind === 'station' ? '#617a78' : kind === 'hall' ? '#708381' : h.color;
  poly(g,[[-a-1,-b],[a+1,-b],[a+1,b],[-a-1,b]],roof,'#665b4c',.85);
  poly(g,[[-a-1,-b],[a+1,-b],[a-b*.53,0],[-a+b*.55,0]],'rgba(255,230,173,.34)');
  poly(g,[[-a+b*.55,0],[a-b*.53,0],[a+1,b],[-a-1,b]],'rgba(65,46,38,.22)');
  for (let j = 2; j < d; j += 2.75) line(g,[[-a+.8,j-b],[a-.8,j-b]],'rgba(61,56,46,.18)',.52);
  line(g,[[-a+b*.55,0],[a-b*.53,0]],'#dfb589',1);
  line(g,[[-a-1,b],[a+1,b]],'#5a5d50',.85);
  rect(g,-a+w*.72,-b*.61,2.9,3.8,'#68594e'); rect(g,-a+w*.72-.5,-b*.61-.5,3.4,1.4,'#c7ac92');
  if (kind === 'hall') {
    rect(g,-4,-5,8,9,'#ded0ad');
    poly(g,[[-5,-2],[0,-9],[5,-2],[0,2]],'#536b69');
    oval(g,0,1.5,1.2,1.2,'#efe0b3'); line(g,[[0,.7],[0,1.65],[.8,1.65]],'#554c3e',.4);
  }
  if (kind === 'mill') { rect(g,-a+2,b,w-4,2,'#987752'); for(let i=-a+3;i<a;i+=6) rect(g,i,b,1.1,4.2,'#705a43'); }
  if (kind === 'store' || kind === 'barn') {
    rect(g,-a+2,b-1,w*.33,3.8,'#685c49');
    poly(g,[[-a+1,b-1],[-a+w*.42,b-1],[-a+w*.4,b+1.5],[-a,b+1.5]],'#b49a74');
    for(let i=0;i<3;i++) rect(g,a-7+i*2.7,b+2.4,2.1,2.4,i%2?'#8a6e4f':'#bd9b69');
  }
  g.restore();
}
function boat(g,x,y,angle,size,hull,cabin = true) {
  g.save(); g.translate(x,y); g.rotate(angle); g.scale(size,size);
  const shape=[[-10,-3],[-5,-4],[5,-3.6],[11,0],[5,3.6],[-6,4],[-10,2.5]];
  g.save(); g.translate(1,1.4); poly(g,shape,'rgba(24,62,64,.28)'); g.restore();
  poly(g,shape,hull,'#36595b',.65);
  poly(g,[[-7.8,-2.5],[4.5,-2.7],[8.6,0],[4.5,2.7],[-7.8,2.4]],'#d5bc8a');
  if (cabin) {
    rect(g,-4,-2.55,7.7,5.1,'#47696a'); rect(g,-3.5,-2.1,6.7,4.2,'#ede3c3');
    rect(g,-2.2,-1.45,3.2,.95,'#92aba6'); rect(g,4,-2,1,1.1,'#c76640');
  } else { for (const k of [-4,0,4]) rect(g,k,-2.35,.8,4.7,'#8d7151'); }
  g.restore();
}
Object.assign(L,{poly,line,oval,rect,tree,building,boat});
})();
