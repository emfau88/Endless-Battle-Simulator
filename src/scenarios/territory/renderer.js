/* SimCascade · Living Hex Diorama. Original procedural WebGL2 renderer.
 * All geometry, materials, lighting and effects are generated in this file.
 * No images, libraries, models, fonts or network requests are required. */
(function(root){
'use strict';
const TAU=Math.PI*2, SQ3=Math.sqrt(3);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453123;return x-Math.floor(x);};
const col=h=>{if(Array.isArray(h))return h;return [1,3,5].map(i=>Math.pow(parseInt(h.slice(i,i+2),16)/255,2.2));};
const mul=(c,v)=>c.map(x=>x*v);
const blend=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
const PALETTE=['#28b3f3','#ee594d','#76c954','#e7bb3c'].map(col);
const NEUTRAL={plain:col('#7f9d75'),forest:col('#698969'),hill:col('#9b9f84'),mountain:col('#7e9998'),outpost:col('#aaa887')};
const stone=col('#b6ccd1'), stoneDark=col('#4c7082'), stoneMid=col('#809ca7');
const bg=col('#071b24');
const vsub=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};
function matmul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
function ortho(l,r,b,t,n,f){return new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]);}
function lookAt(e,c){const z=norm(vsub(e,c)),x=norm(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,e),-dot(y,e),-dot(z,e),1]);}
function transform(m,p){return [0,1,2,3].map(i=>m[i]*p[0]+m[i+4]*p[1]+m[i+8]*p[2]+m[i+12]);}

class Mesh{
 constructor(){this.a=[];}
 vertex(p,n,c,e=0){this.a.push(...p,...n,...c,e);}
 tri(a,b,c,color,e=0,normal){const n=normal||norm(cross(vsub(b,a),vsub(c,a)));this.vertex(a,n,color,e);this.vertex(b,n,color,e);this.vertex(c,n,color,e);}
 quad(a,b,c,d,color,e=0,normal){this.tri(a,b,c,color,e,normal);this.tri(a,c,d,color,e,normal);}
 box(x,y,z,w,h,d,color,rot=0,e=0){
  const co=Math.cos(rot),si=Math.sin(rot),p=(a,b,c)=>[x+a*co+c*si,y+b,z-a*si+c*co],xx=w/2,zz=d/2;
  const a=p(-xx,0,-zz),b=p(xx,0,-zz),c=p(xx,0,zz),dd=p(-xx,0,zz),A=p(-xx,h,-zz),B=p(xx,h,-zz),C=p(xx,h,zz),D=p(-xx,h,zz);
  this.quad(A,D,C,B,color,e,[0,1,0]);
  this.quad(a,A,B,b,color,e,[-si,0,-co]);this.quad(b,B,C,c,color,e,[co,0,-si]);
  this.quad(c,C,D,dd,color,e,[si,0,co]);this.quad(dd,D,A,a,color,e,[-co,0,si]);
 }
 cylinder(x,y,z,r0,r1,h,n,c,e=0,phase=0,cap=true){
  for(let i=0;i<n;i++){
   const a=phase+i*TAU/n,b=phase+(i+1)*TAU/n;
   const A=[x+Math.cos(a)*r0,y,z+Math.sin(a)*r0],B=[x+Math.cos(b)*r0,y,z+Math.sin(b)*r0];
   const C=[x+Math.cos(b)*r1,y+h,z+Math.sin(b)*r1],D=[x+Math.cos(a)*r1,y+h,z+Math.sin(a)*r1];
   const normal=norm([Math.cos((a+b)/2),(r0-r1)/Math.max(.001,h),Math.sin((a+b)/2)]);
   this.quad(A,B,C,D,c,e,normal);
   if(cap&&r1>0)this.tri([x,y+h,z],C,D,c,e,[0,1,0]);
  }
 }
 beam(a,b,width,c,e=0){
  const dx=b[0]-a[0],dz=b[2]-a[2],l=Math.hypot(dx,dz)||1,px=-dz/l*width/2,pz=dx/l*width/2;
  this.quad([a[0]+px,a[1],a[2]+pz],[b[0]+px,b[1],b[2]+pz],[b[0]-px,b[1],b[2]-pz],[a[0]-px,a[1],a[2]-pz],c,e,[0,1,0]);
 }
 ring(x,y,z,r,w,c,e=0,segments=36){for(let i=0;i<segments;i++){const a=i*TAU/segments,b=(i+1)*TAU/segments;this.beam([x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x+Math.cos(b)*r,y,z+Math.sin(b)*r],w,c,e);}}
}
function polyShadow(mesh,x,y,z,rx,rz,alpha=.28){
 // Tiny soft contact shadows are nested geometry, never transparent billboards.
 const c=mul(col('#405a55'),alpha);
 for(let j=3;j>=1;j--){const r=j/3;for(let i=0;i<12;i++){const a=i*TAU/12,b=(i+1)*TAU/12;mesh.tri([x,y,z],[x+Math.cos(b)*rx*r,y,z+Math.sin(b)*rz*r],[x+Math.cos(a)*rx*r,y,z+Math.sin(a)*rz*r],mul(c,1.6-r*.5),0,[0,1,0]);}}
}
function tree(m,x,y,z,s,seed){
 const brown=col('#5d6650');m.cylinder(x,y,z,.045*s,.033*s,.36*s,5,brown,0,seed);
 const green=col(['#456f3e','#4c803e','#5a9145','#3f743b'][Math.floor(hash(seed)*4)]);
 m.cylinder(x,y+.18*s,z,.29*s,.018*s,.59*s,5,mul(green,.82),0,.17+seed);
 m.cylinder(x,y+.43*s,z,.235*s,.01*s,.60*s,5,green,0,.35+seed);
 m.cylinder(x,y+.69*s,z,.17*s,0,.50*s,5,mul(green,1.13),0,.17+seed);
}
function rock(m,x,y,z,s,seed,snow=false){
 const n=5,phase=hash(seed)*TAU,rings=[];
 for(let ring=0;ring<3;ring++){let r=ring===0?s: ring===1?s*.48:s*.08,yy=y+(ring===0?0:ring===1?s*.91:s*1.64);const ps=[];for(let i=0;i<n;i++){const a=phase+i*TAU/n,rr=r*(.77+hash(seed+i*12+ring*4)*.4);ps.push([x+Math.cos(a)*rr+(ring?s*.12:0),yy+(ring===1?hash(seed+i*6)*.15*s:0),z+Math.sin(a)*rr]);}rings.push(ps);}
 for(let ring=0;ring<2;ring++)for(let i=0;i<n;i++){const j=(i+1)%n,c=col(snow&&ring===1?'#dfebde':'#8b9b96'),v=.73+hash(seed+i*4+ring*8)*.38;m.quad(rings[ring][i],rings[ring+1][i],rings[ring+1][j],rings[ring][j],mul(c,v));}
 const p=[x+s*.13,y+s*1.8,z];for(let i=0;i<n;i++)m.tri(rings[2][i],p,rings[2][(i+1)%n],col(snow?'#f1f0df':'#a2b1a6'));
}
function castle(m,t,color){
 const x=t.x,z=t.z,y=t.height+.02;
 // Foundation, four stout corner bastions, the central keep and crenellations.
 m.cylinder(x,y,z,.69,.64,.11,6,stoneDark,0,Math.PI/6);
 m.box(x,y+.10,z,1.02,.12,.94,stoneMid);
 m.box(x,y+.22,z,.72,.53,.64,stoneMid);
 m.box(x,y+.75,z,.83,.10,.75,stone);
 m.box(x,y+.855,z,.64,.045,.56,mul(color,.55));
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const tx=x+sx*.44,tz=z+sz*.39;
  m.box(tx,y+.17,tz,.30,.70,.30,stone);
  m.box(tx,y+.83,tz,.35,.10,.35,mul(stone,.84));
  m.box(tx,y+.94,tz,.23,.035,.23,mul(color,.85));
  for(const ax of [-1,1])for(const az of [-1,1])m.box(tx+ax*.12,y+.92,tz+az*.12,.105,.17,.105,stone);
  m.box(tx,y+.53,tz+.154,.075,.19,.008,col('#142c3b'));
  m.box(tx,y+.53,tz-.154,.075,.19,.008,col('#142c3b'));
  m.box(tx+.154,y+.53,tz,.008,.19,.075,col('#142c3b'));
  m.box(tx-.154,y+.53,tz,.008,.19,.075,col('#142c3b'));
 }
 // Front entrance, inset door, illuminated faction escutcheon and approach.
 m.box(x,y+.215,z+.329,.22,.32,.012,col('#183749'));
 m.box(x,y+.215,z+.35,.14,.255,.017,col('#2d5262'));
 m.box(x,y+.24,z+.46,.29,.055,.26,stone);
 m.box(x,y+.64,z+.335,.16,.16,.016,color,.0,.65);
 for(const sx of [-1,1])m.box(x+sx*.24,y+.53,z+.329,.065,.13,.015,col('#193846'));
 // Small crenellations on the main keep.
 for(let i=-1;i<=1;i++){m.box(x+i*.25,y+.85,z-.34,.12,.13,.12,stone);m.box(x+i*.25,y+.85,z+.34,.12,.13,.12,stone);}
 m.cylinder(x-.06,y+.86,z-.06,.024,.018,1.0,6,col('#d3e1dc'));
 m.cylinder(x-.06,y+1.84,z-.06,.044,0,.09,6,mul(color,1.6),.45);
}
function bunker(m,t,color){
 const x=t.x-.12,z=t.z-.1,y=t.height;
 m.cylinder(x,y+.015,z,.45,.37,.30,6,col('#859a99'),0,Math.PI/6);
 m.cylinder(x,y+.315,z,.42,.40,.065,6,col('#b4c1b3'),0,Math.PI/6);
 m.cylinder(x,y+.382,z,.19,.14,.10,6,mul(color,.8),.12);
 m.box(x,y+.18,z+.35,.28,.055,.012,col('#132e3a'));
 m.box(x+.32,y+.18,z,.015,.055,.16,col('#132e3a'));
 m.box(x-.32,y+.18,z,.015,.055,.16,col('#132e3a'));
 m.box(x,y+.41,z+.16,.055,.045,.29,col('#597985'));
}
function ruins(m,t){
 const x=t.x,z=t.z,y=t.height+.01;
 m.cylinder(x,y,z,.69,.64,.11,6,stoneDark,0,Math.PI/6);
 for(const sx of [-1,1])for(const sz of [-1,1])m.box(x+sx*.44,y+.11,z+sz*.39,.3,.16+(sx===sz?.17:0),.3,mul(stoneMid,.74));
 for(let i=0;i<7;i++){const a=i*2.399,r=.1+hash(t.id+i)*.42;rock(m,x+Math.cos(a)*r,y+.12,z+Math.sin(a)*r,.09+hash(i*13+t.id)*.08,i*9+t.id);}
}
function outpost(m,t,color){
 const x=t.x,z=t.z,y=t.height+.02,c=col('#d9b566');
 m.cylinder(x,y,z,.65,.62,.12,6,stoneDark,0,Math.PI/6);
 m.cylinder(x,y+.12,z,.52,.47,.08,6,stone,0,Math.PI/6);
 m.cylinder(x,y+.20,z,.25,.22,.36,6,stoneDark,0,Math.PI/6);
 m.cylinder(x,y+.56,z,.31,.25,.10,6,c,0,Math.PI/6);
 m.cylinder(x,y+.66,z,.16,.12,.40,6,mul(color,1.35),.7,Math.PI/6);
 m.cylinder(x,y+1.06,z,.12,0,.13,6,c,.2,Math.PI/6);
 for(let i=0;i<3;i++){const a=i*TAU/3,x1=x+Math.cos(a)*.41,z1=z+Math.sin(a)*.41;m.cylinder(x1,y+.18,z1,.075,.055,.38,5,stone);m.cylinder(x1,y+.56,z1,.095,.065,.09,5,c,.2);}
}
function tank(m,x,y,z,a,color,scale=1){
 const s=scale,co=Math.cos(a),si=Math.sin(a),p=(dx,dz)=>[x+dx*co+dz*si,z-dx*si+dz*co];
 for(const side of [-1,1]){const [xx,zz]=p(side*.073*s,0);m.box(xx,y,zz,.055*s,.045*s,.22*s,col('#273c43'),a);}
 m.box(x,y+.025*s,z,.15*s,.06*s,.21*s,mul(color,.8),a);
 m.box(x,y+.085*s,z,.10*s,.055*s,.115*s,color,a);
 const [bx,bz]=p(0,.11*s);m.box(bx,y+.11*s,bz,.027*s,.025*s,.18*s,col('#c2d5cf'),a);
}

function tableBounds(tiles){
 const angle=.16,co=Math.cos(angle),si=Math.sin(angle);let minU=Infinity,maxU=-Infinity,minV=Infinity,maxV=-Infinity;
 if(tiles)for(const t of tiles)for(let i=0;i<6;i++){const a=Math.PI/6+i*Math.PI/3,x=t.x+Math.cos(a),z=t.z+Math.sin(a),u=x*co-z*si,v=x*si+z*co;minU=Math.min(minU,u);maxU=Math.max(maxU,u);minV=Math.min(minV,v);maxV=Math.max(maxV,v);}
 if(!Number.isFinite(minU)){minU=-12.8;maxU=12.8;minV=-9;maxV=9;}
 return {angle,co,si,cu:(minU+maxU)/2,cv:(minV+maxV)/2,halfU:(maxU-minU)/2,halfV:(maxV-minV)/2};
}
function mapEnvelope(tiles,hqs,add){
 for(const t of tiles){
  for(let i=0;i<6;i++){const a=Math.PI/6+i*Math.PI/3,x=t.x+Math.cos(a),z=t.z+Math.sin(a);add(x,t.height,z);add(x,-1.12,z);}
  // Keep original HQ and prop envelopes after capture, for a steady camera.
  const isHQ=hqs&&hqs.has(t.id),height=isHQ?2.18:t.terrain==='mountain'?1.42:t.terrain==='forest'?.99:t.terrain==='outpost'?1.52:.82;
  const spread=isHQ?.65:t.terrain==='mountain'?.72:t.terrain==='forest'?.66:.67;
  for(const dx of [-spread,spread])for(const dz of [-spread,spread])add(t.x+dx,t.height+height,t.z+dz);
 }
}
function strategyTable(includeFloor=true,bounds=tableBounds()){
 // A close-fitting, quiet mount follows the actual landscape or portrait map.
 // None of this decorative surface participates in the playable hex grid.
 const m=new Mesh(),y=-1.79,b=bounds;let layerStart=0;m.layers=[];
 const point=(u,yy,v)=>{u+=b.cu;v+=b.cv;return [u*b.co+v*b.si,yy,-u*b.si+v*b.co];};
 const finishLayer=()=>{m.layers.push({start:layerStart,count:m.a.length-layerStart});layerStart=m.a.length;};
 const octagon=(hu,hv,cut)=>[[-hu,-hv+cut],[-hu+cut,-hv],[hu-cut,-hv],[hu,-hv+cut],[hu,hv-cut],[hu-cut,hv],[-hu+cut,hv],[-hu,hv-cut]];
 const prism=(shape,base,top,surface,rim)=>{for(let i=0;i<shape.length;i++){const a=shape[i],c=shape[(i+1)%shape.length];m.tri(point(0,top,0),point(a[0],top,a[1]),point(c[0],top,c[1]),surface,0,[0,1,0]);m.quad(point(a[0],top,a[1]),point(a[0],base,a[1]),point(c[0],base,c[1]),point(c[0],top,c[1]),rim);}};
 if(includeFloor)m.quad([-100,-2.18,-100],[-100,-2.18,100],[100,-2.18,100],[100,-2.18,-100],col('#102d39'),0,[0,1,0]);
 const hu=b.halfU+5,hv=b.halfV+5,shape=octagon(hu,hv,1.8);
 prism(shape,y-.18,y,col('#13303b'),col('#1d3e48'));finishLayer();
 for(let i=0;i<shape.length;i++){const a=shape[i],c=shape[(i+1)%shape.length];m.beam(point(a[0]*.985,y+.006,a[1]*.985),point(c[0]*.985,y+.006,c[1]*.985),.026,col('#35565e'),.04);}
 const engraving=col('#1c3b45');
 for(let u=Math.ceil((-hu+1)/3)*3;u<=hu-1;u+=3)m.beam(point(u,y+.003,-hv+1),point(u,y+.003,hv-1),.012,engraving);
 for(let v=Math.ceil((-hv+1)/3)*3;v<=hv-1;v+=3)m.beam(point(-hu+1,y+.004,v),point(hu-1,y+.004,v),.012,engraving);
 finishLayer();
 const mounting=octagon(b.halfU+.72,b.halfV+.72,.75);
 prism(mounting,y+.008,y+.225,col('#172e39'),col('#18313d'));finishLayer();
 const line=octagon(b.halfU+.56,b.halfV+.56,.72);
 for(let i=0;i<line.length;i++){const a=line[i],c=line[(i+1)%line.length];m.beam(point(a[0],y+.237,a[1]),point(c[0],y+.237,c[1]),.022,col('#355760'),.04);}
 for(const side of [-1,1])for(let v=Math.ceil(-b.halfV);v<=b.halfV;v++){
  const u=side*(b.halfU+3),len=v%5===0?.42:.17;
  m.beam(point(u,y+.008,v),point(u-side*len,y+.008,v),.018,col(v%5===0?'#42656d':'#294b57'),.04);
 }
 finishLayer();return m;
}

const VS=`#version 300 es
precision highp float;
layout(location=0)in vec3 aPosition;layout(location=1)in vec3 aNormal;layout(location=2)in vec3 aColor;layout(location=3)in float aEmission;
uniform mat4 uVP;uniform mat4 uLight;
out vec3 vNormal;out vec3 vColor;out vec3 vWorld;out vec4 vShadow;out float vEmission;
void main(){vNormal=aNormal;vColor=aColor;vWorld=aPosition;vShadow=uLight*vec4(aPosition,1.);vEmission=aEmission;gl_Position=uVP*vec4(aPosition,1.);}`;
const FS=`#version 300 es
precision highp float;
in vec3 vNormal;in vec3 vColor;in vec3 vWorld;in vec4 vShadow;in float vEmission;
uniform sampler2D uShadow;uniform vec3 uEye;uniform float uGlow;uniform float uShadowEnabled;
out vec4 outColor;
void main(){
 vec3 n=normalize(vNormal),light=normalize(vec3(-.58,1.,.56));
 float lambert=max(dot(n,light),0.);
 vec3 sp=vShadow.xyz/vShadow.w*.5+.5;float sh=1.;
 if(uShadowEnabled>.5&&sp.x>0.&&sp.x<1.&&sp.y>0.&&sp.y<1.){
  sh=0.;float bias=max(.00035,.0010*(1.-lambert));
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){float d=texture(uShadow,sp.xy+vec2(float(x),float(y))*.00049).r;sh+=(sp.z-bias>d?.34:1.)/9.;}
 }
 vec3 hemi=mix(vec3(.21,.30,.34),vec3(.50,.60,.66),n.y*.5+.5);
 vec3 lit=vColor*(hemi+vec3(1.10,.98,.78)*lambert*sh);
 vec3 eye=normalize(uEye-vWorld),halfdir=normalize(eye+light);
 float spec=pow(max(dot(n,halfdir),0.),48.)*.10*sh;
 lit+=vec3(spec)+vColor*vEmission*1.8;
 if(uGlow>.5)lit=vColor*1.0;
 float fog=smoothstep(17.,39.,length(vWorld.xz));
 lit=mix(lit,vec3(.00113,.00716,.01347),fog);
 vec3 rgb=pow(max(vec3(0.),lit),vec3(1./2.2));
 outColor=vec4(rgb,uGlow>.5?.10:1.);
}`;
const SHVS=`#version 300 es
precision highp float;layout(location=0)in vec3 aPosition;uniform mat4 uLight;void main(){gl_Position=uLight*vec4(aPosition,1.);}`;
const SHFS=`#version 300 es
precision highp float;void main(){}`;

class HexView{
 constructor(canvas){
  this.canvas=canvas;this.gl=canvas.getContext('webgl2',{alpha:false,antialias:true,depth:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  if(!this.gl)return new HexCanvasView(canvas);
  this.backend='webgl';
  this.width=canvas.clientWidth||960;this.height=canvas.clientHeight||650;
  this.camera={azimuth:.16,elevation:.78,zoom:1};this.mode='perspective';this.tileCache=new Map();this.lastSignature='';this.lastBuild=-100;this.lastTime=0;this.seed=null;
  const gl=this.gl;this.program=this._program(VS,FS);this.shadowProgram=this._program(SHVS,SHFS);
  this.uniform={};for(const n of ['uVP','uLight','uEye','uShadow','uGlow','uShadowEnabled'])this.uniform[n]=gl.getUniformLocation(this.program,n);
  this.shadowLight=gl.getUniformLocation(this.shadowProgram,'uLight');
  this.staticBuffer=gl.createBuffer();this.dynamicBuffer=gl.createBuffer();this.glowBuffer=gl.createBuffer();this.groundBuffer=gl.createBuffer();
  this.lightVP=matmul(ortho(-19,19,-19,19,.5,80),lookAt([-19,32,18],[0,0,0]));
  this.shadowTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.shadowTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,2048,2048,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  this.shadowFBO=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadowFBO);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,this.shadowTexture,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);this.shadowOK=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  this.groundCount=this._upload(this.groundBuffer,strategyTable());
  this.resize(this.width,this.height,Math.min(root.devicePixelRatio||1,2));
 }
 _program(vs,fs){const gl=this.gl;const shader=(type,text)=>{const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;}
 _upload(buffer,mesh,dynamic=false){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh.a),dynamic?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);return mesh.a.length/10;}
 _bind(buffer){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);for(let i=0;i<4;i++)gl.enableVertexAttribArray(i);gl.vertexAttribPointer(0,3,gl.FLOAT,false,40,0);gl.vertexAttribPointer(1,3,gl.FLOAT,false,40,12);gl.vertexAttribPointer(2,3,gl.FLOAT,false,40,24);gl.vertexAttribPointer(3,1,gl.FLOAT,false,40,36);}
 resize(w,h,dpr=1){this.width=Math.max(1,w);this.height=Math.max(1,h);this.dpr=Math.min(2,dpr);const ww=Math.round(w*this.dpr),hh=Math.round(h*this.dpr);if(this.canvas.width!==ww)this.canvas.width=ww;if(this.canvas.height!==hh)this.canvas.height=hh;this._camera();}
 setCamera(mode){this.mode=mode;if(mode==='top'){this.camera.elevation=1.48;this.camera.azimuth=0;}else{this.camera.elevation=.78;this.camera.azimuth=.16;}this.camera.zoom=1;this._camera();}
 _setMap(sim){
  if(this.mapTiles===sim.tiles)return;
  this.mapTiles=sim.tiles;this.mapHQs=new Set(sim.factions.map(f=>f.hq));this.tableExtent=tableBounds(sim.tiles);
  this.fitBounds=null;this.tileCache.clear();this.geometryCache?.clear();this.lastSignature='';this.lastBuild=-100;
  const ground=strategyTable(this.backend!=='canvas',this.tableExtent);
  if(this.backend==='canvas'){
   this.groundGeometry=ground.a;this.groundLayers=ground.layers;this.groundTriangles=null;this.backgroundCanvas=null;this.spriteCache.clear();this.spriteCamera='';
  }else{
   this.groundCount=this._upload(this.groundBuffer,ground);
   // Cover the complete elongated map with the same light and shadow quality.
   const lightView=lookAt([-19,32,18],[0,0,0]);let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity;
   mapEnvelope(this.mapTiles,this.mapHQs,(x,y,z)=>{const p=transform(lightView,[x,y,z]);left=Math.min(left,p[0]);right=Math.max(right,p[0]);bottom=Math.min(bottom,p[1]);top=Math.max(top,p[1]);});
   this.lightVP=matmul(ortho(left-1.4,right+1.4,bottom-1.4,top+1.4,.5,100),lightView);
  }
 }
 _camera(){
  const c=this.camera,aspect=this.width/this.height,e=clamp(c.elevation,.48,1.55),a=c.azimuth;
  this.eye=[Math.sin(a)*38*Math.cos(e),38*Math.sin(e),Math.cos(a)*38*Math.cos(e)];
  const view=lookAt(this.eye,[0,.15,0]);
  let cx=0,cy=0,halfW=13.4,halfH=this.mode==='top'?12.8:9.8;
  if(this.mapTiles){
   const key=`${a}:${e}`;
   if(!this.fitBounds||this.fitBounds.tiles!==this.mapTiles||this.fitBounds.key!==key){
    let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity;
    const add=(x,y,z)=>{const p=transform(view,[x,y,z]);left=Math.min(left,p[0]);right=Math.max(right,p[0]);bottom=Math.min(bottom,p[1]);top=Math.max(top,p[1]);};
    mapEnvelope(this.mapTiles,this.mapHQs,add);
    this.fitBounds={tiles:this.mapTiles,key,left,right,bottom,top};
   }
   const b=this.fitBounds;cx=(b.left+b.right)/2;cy=(b.bottom+b.top)/2;halfW=(b.right-b.left)/2;halfH=(b.top-b.bottom)/2;
   const padX=Math.max(10,Math.min(18,this.width*.018)),padY=Math.max(12,Math.min(18,this.height*.024));
   halfW/=Math.max(.5,1-2*padX/this.width);halfH/=Math.max(.5,1-2*padY/this.height);
  }
  const vertical=Math.max(halfH,halfW/aspect)/clamp(c.zoom,.72,1.7);
  this.vp=matmul(ortho(cx-vertical*aspect,cx+vertical*aspect,cy-vertical,cy+vertical,.1,100),view);
 }
 project(x,y,z){const p=transform(this.vp,[x,y,z]);return {x:(p[0]/p[3]*.5+.5)*this.width,y:(.5-p[1]/p[3]*.5)*this.height,depth:p[2]/p[3]};}
 pick(x,y,sim){let best=null,bd=Infinity;for(const t of sim.tiles){const pts=[];for(let i=0;i<6;i++){const a=Math.PI/6+i*Math.PI/3;pts.push(this.project(t.x+Math.cos(a)*.98,t.height,t.z+Math.sin(a)*.98));}let inside=false;for(let i=0,j=5;i<6;j=i++){if((pts[i].y>y)!==(pts[j].y>y)&&x<(pts[j].x-pts[i].x)*(y-pts[i].y)/(pts[j].y-pts[i].y)+pts[i].x)inside=!inside;}if(inside){const d=this.project(t.x,t.height,t.z).depth;if(d<bd){best=t.id;bd=d;}}}return best;}
 _tileColor(t,time){let cache=this.tileCache.get(t.id);const base=t.owner>=0?PALETTE[t.owner]:NEUTRAL[t.terrain]||NEUTRAL.plain;if(!cache){cache={owner:t.owner,current:base.slice(),from:base.slice(),at:time-.8};this.tileCache.set(t.id,cache);}if(cache.owner!==t.owner){cache.from=cache.current.slice();cache.at=Math.min(time,Number.isFinite(t.lastCapture)?t.lastCapture:time);cache.owner=t.owner;}const f=clamp((time-cache.at)/.7,0,1),u=f*f*(3-2*f);cache.current=blend(cache.from,base,u);return mul(cache.current,.91+hash(t.id+this.seed)*.16);}
 _build(sim,time){
  const m=new Mesh(),g=new Mesh(),ranges=[],lookup=new Map(sim.tiles.map(t=>[`${t.q},${t.r}`,t]));
  const software=this.backend==='canvas',cache=this.geometryCache||(this.geometryCache=new Map());
  for(const t of sim.tiles){
   const start=m.a.length,glowStart=g.a.length;
   const color=this._tileColor(t,time),x=t.x,z=t.z,h=t.height,bottom=-.88-hash(t.id*3)*.22;
   const key=`${sim.seed}:${t.x}:${t.z}:${t.terrain}:${h}:${t.owner}:${t.hq}:${+t.bunker}:${t.neighbors.map(n=>sim.tiles[n].owner).join(',')}:${color.map(v=>v.toFixed(4)).join(',')}`;
   const cached=cache.get(t.id);
   if(cached&&cached.key===key){
    if(software){ranges.push(cached);}
    else{m.a.push(...cached.data);g.a.push(...cached.glowData);ranges.push({...cached,start,glowStart,data:undefined,glowData:undefined});}
    continue;
   }
   this.geometryBuilds=(this.geometryBuilds||0)+1;
   m.cylinder(x,bottom,z,.90,.985,h-bottom-.075,6,blend(mul(color,.28),col('#2b5264'),.42),0,Math.PI/6);
   m.cylinder(x,h-.075,z,.985,.915,.075,6,mul(color,.88),0,Math.PI/6);
   // Subtle triangular color variations make each plate a physical object.
   for(let i=0;i<6;i++){const a=Math.PI/6+i*Math.PI/3,b=a+Math.PI/3;m.tri([x,h+.001,z],[x+Math.cos(b)*.915,h+.001,z+Math.sin(b)*.915],[x+Math.cos(a)*.915,h+.001,z+Math.sin(a)*.915],mul(color,.98+hash(t.id*7+i)*.05),0,[0,1,0]);}
   // Side strata break up the outer cliff without cluttering the top faces.
   if(t.neighbors.length<6){m.cylinder(x,bottom+.15,z,.905,.925,.10,6,blend(mul(color,.18),col('#426577'),.6),0,Math.PI/6,false);}
   if(t.owner>=0){
    const dirs=[[0,1],[-1,1],[-1,0],[0,-1],[1,-1],[1,0]];
    for(let i=0;i<6;i++){const nb=lookup.get(`${t.q+dirs[i][0]},${t.r+dirs[i][1]}`);if(nb&&nb.owner===t.owner)continue;
     const a=Math.PI/6+i*Math.PI/3,b=a+Math.PI/3,A=[x+Math.cos(a)*.948,h+.024,z+Math.sin(a)*.948],B=[x+Math.cos(b)*.948,h+.024,z+Math.sin(b)*.948];
     m.beam(A,B,.038,mul(PALETTE[t.owner],1.4),1.3);g.beam([A[0],h+.028,A[2]],[B[0],h+.028,B[2]],.19,PALETTE[t.owner],2);
    }
   }
   // Sparse terrain remains readable once the plate is recolored.
   const baseCount=m.a.length-start,seed=t.id*17+sim.seed;
   if(t.hq>=0){castle(m,t,PALETTE[t.owner]||PALETTE[t.hq]);}
   else if(sim.factions&&sim.factions.some(f=>f.hq===t.id&&!f.alive)){ruins(m,t);}
   else if(t.bunker){bunker(m,t,PALETTE[t.owner]||NEUTRAL.plain);}
   else if(t.terrain==='outpost'){outpost(m,t,t.owner>=0?PALETTE[t.owner]:col('#f1c65c'));}
   else if(t.terrain==='mountain'){
    rock(m,x-.14,h,z+.05,.71,seed,true);rock(m,x+.36,h,z-.19,.49,seed+22,true);rock(m,x-.42,h,z-.35,.34,seed+4,false);
   }else if(t.terrain==='forest'){
    const n=3+(hash(seed)>.5?1:0);for(let i=0;i<n;i++){const a=2.6+i*1.7,rr=.36+hash(seed+i*4)*.16;tree(m,x+Math.cos(a)*rr,h+.008,z+Math.sin(a)*rr,.55+hash(seed+i*10)*.20,seed+i);}
   }else if(t.terrain==='hill'){
    rock(m,x-.36,h,z-.28,.24,seed,false);rock(m,x-.06,h,z-.44,.14,seed+4,false);
   }else if(hash(seed)>.70){
    tree(m,x-.37,h,z-.30,.45+hash(seed+3)*.18,seed);
   }
   // Two tiny stone chips and grass strokes, kept to the rear of a field.
   if(t.terrain!=='mountain'&&t.hq<0&&hash(seed+4)>.58){for(let i=0;i<2;i++){const xx=x-.43+i*.12,zz=z+.29;rock(m,xx,h+.005,zz,.035+hash(seed+i)*.025,seed+i);}}
   const entry={id:t.id,start:0,count:m.a.length-start,baseCount,glowStart:0,glowCount:g.a.length-glowStart,key,data:m.a.slice(start),glowData:g.a.slice(glowStart)};
   cache.set(t.id,entry);
   if(software){ranges.push(entry);m.a.length=0;g.a.length=0;}
   else{ranges.push({...entry,start,glowStart,data:undefined,glowData:undefined});}
  }
  this.geometryRanges=ranges;
  this.staticCount=this._upload(this.staticBuffer,m);if(software)this.staticCount=ranges.reduce((n,r)=>n+r.count/10,0);this.staticGlowCount=this._upload(this.glowBuffer,g);this.staticGlowData=g.a;this.staticRebuilds=(this.staticRebuilds||0)+1;
  if(this.shadowOK){const gl=this.gl;gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadowFBO);gl.viewport(0,0,2048,2048);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.disable(gl.BLEND);gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(this.shadowProgram);gl.uniformMatrix4fv(this.shadowLight,false,this.lightVP);this._bind(this.staticBuffer);gl.drawArrays(gl.TRIANGLES,0,this.staticCount);gl.bindFramebuffer(gl.FRAMEBUFFER,null);}
 }
 _dynamic(sim,time,opts){
  const m=new Mesh(),g=new Mesh(),groups=[];
  for(const t of sim.tiles){
   const groupStart=m.a.length;
   // Every arriving assault gets feedback, including repelled attacks. This
   // follows engine state, independent of the deliberately sparse event log.
   const battleAge=time-(t.lastBattle??-100);
   if(battleAge>=0&&battleAge<.55){
    const fade=1-battleAge/.55,c=t.lastAttacker>=0?PALETTE[t.lastAttacker]:col('#e5dcb2');
    g.ring(t.x,t.height+.045,t.z,.15+battleAge*.72,.045*fade,mul(c,fade),1,18);
    for(let k=0;k<5;k++){const a=k*TAU/5+t.id*1.7,xx=t.x+Math.cos(a)*battleAge*.7,zz=t.z+Math.sin(a)*battleAge*.7,yy=t.height+.07+Math.sin(battleAge/.55*Math.PI)*(.18+hash(k+t.id)*.15);m.cylinder(xx,yy,zz,.02*fade,0,.05*fade,4,col('#f7ddac'),1.2);}
   }
   if(t.hq>=0){const y=t.height+.02,x=t.x-.06,z=t.z-.06,c=PALETTE[t.owner]||PALETTE[t.hq];
    const points=[];for(let i=0;i<=6;i++){const u=i/6,w=Math.sin(time*3.4+u*7+t.id)*.045*u;points.push([[x+u*.54,y+1.82+w,z+Math.sin(u*5+time*2.2)*.055*u],[x+u*.54,y+1.47+w+u*.025,z+Math.sin(u*5+time*2.2)*.055*u]]);}
    for(let i=0;i<6;i++){m.quad(points[i][0],points[i][1],points[i+1][1],points[i+1][0],mul(c,1.1),.2);if(i<2)m.quad([points[i][0][0],points[i][0][1]-.05,points[i][0][2]-.003],[points[i][0][0],points[i][0][1]-.085,points[i][0][2]-.003],[points[i+1][0][0],points[i+1][0][1]-.085,points[i+1][0][2]-.003],[points[i+1][0][0],points[i+1][0][1]-.05,points[i+1][0][2]-.003],col('#e3f2e6'),.2);}
   }
   if(t.owner>=0&&t.units>=6&&t.terrain!=='mountain'&&t.hq<0&&t.terrain!=='outpost'&&!t.bunker){
    const count=Math.min(3,Math.floor(t.units/8)+1);for(let i=0;i<count;i++)tank(m,t.x+.2+i*.19,t.height+.02,t.z+.28,Math.PI+(t.owner%2?-.4:.4),PALETTE[t.owner],.85);
   }
   if(t.terrain==='outpost'){
    const c=t.owner>=0?PALETTE[t.owner]:col('#f2c966');g.ring(t.x,t.height+1.32+Math.sin(time*1.1)*.09,t.z,.23+.03*Math.sin(time*2),.026,c,1,24);
   }
   if(m.a.length>groupStart)groups.push({start:groupStart,count:m.a.length-groupStart,x:t.x,y:t.height+.12,z:t.z});
  }
  for(const move of sim.moves){
   const groupStart=m.a.length,a=sim.tiles[move.from],b=sim.tiles[move.to];if(!a||!b)continue;
   const p=clamp((time-move.start)/move.duration,0,1),dx=b.x-a.x,dz=b.z-a.z,ang=Math.atan2(dx,dz),color=PALETTE[move.owner];
   const n=Math.min(6,Math.max(1,Math.ceil(move.amount/4)));
   for(let i=0;i<n;i++){
    const u=clamp(p-(i-(n-1)/2)*.065,0,1),lane=(i%2?1:-1)*.095;
    const x=mix(a.x,b.x,u)+Math.cos(ang)*lane,z=mix(a.z,b.z,u)-Math.sin(ang)*lane,y=mix(a.height,b.height,u)+.035+Math.sin(u*Math.PI)*.03;
    tank(m,x,y,z,ang,color,1.02);
    g.beam([x-dx*.08,y+.014,z-dz*.08],[x-dx*.23,y+.014,z-dz*.23],.035,color,.5);
   }
   groups.push({start:groupStart,count:m.a.length-groupStart,x:mix(a.x,b.x,p),y:mix(a.height,b.height,p)+.12,z:mix(a.z,b.z,p)});
  }
  for(const e of sim.events){
   const age=time-e.time;if(age<0||age>1.15||!['capture','contact','battle','hq','build','outpost'].includes(e.type))continue;
   const groupStart=m.a.length,t=sim.tiles[e.tile];if(!t)continue;const c=e.team>=0?PALETTE[e.team]:col('#f4d989'),r=.18+age*.65;
   g.ring(t.x,t.height+.05,t.z,r,.04*(1-age/1.2),mul(c,1-age/1.3),1,24);
   if(age<.6)for(let k=0;k<7;k++){const a=k*TAU/7+e.id,x=t.x+Math.cos(a)*age*.9,z=t.z+Math.sin(a)*age*.9,y=t.height+.1+Math.sin(age/.6*Math.PI)*(.25+hash(k+e.id)*.25);m.cylinder(x,y,z,.022,.0,.055,4,col('#f2dea5'),1.4);}
   if(m.a.length>groupStart)groups.push({start:groupStart,count:m.a.length-groupStart,x:t.x,y:t.height+.3,z:t.z});
  }
  for(const [id,isHover] of [[opts.selected,false],[opts.hover,true]]){
   if(id===null||id===undefined||isHover&&id===opts.selected)continue;const t=sim.tiles[id];if(!t)continue;const c=isHover?col('#b9e1d5'):col('#f5edca');
   for(let i=0;i<6;i++){const a=Math.PI/6+i*Math.PI/3,b=a+Math.PI/3,A=[t.x+Math.cos(a)*.88,t.height+.036,t.z+Math.sin(a)*.88],B=[t.x+Math.cos(b)*.88,t.height+.036,t.z+Math.sin(b)*.88];m.beam(A,B,isHover?.027:.042,c,.5);g.beam(A,B,.13,c,.5);}
  }
  this.dynamicGroups=groups;this.dynamicGlowData=g.a;
  this.dynamicCount=this._upload(this.dynamicBuffer,m,true);
  const combined=new Mesh();combined.a=this.staticGlowData.concat(g.a);this.glowCount=this._upload(this.glowBuffer,combined,true);
 }
 render(sim,time,opts={}){
  if(!sim||!sim.tiles)return;this.lastTime=time;this._setMap(sim);this._camera();
  if(this.seed!==sim.seed||sim.time<this.previousSimTime){this.seed=sim.seed;this.tileCache.clear();this.lastSignature='';this.lastBuild=-100;}
  this.previousSimTime=sim.time;
  const signature=sim.tiles.map(t=>`${t.owner}:${t.hq}:${+t.bunker}`).join('|');
  let changing=false;for(const t of sim.tiles){const c=this.tileCache.get(t.id);if(c&&(c.owner!==t.owner||time-c.at<.72)){changing=true;break;}}
  if(signature!==this.lastSignature||changing&&time-this.lastBuild>.10){this._build(sim,time);this.lastBuild=time;this.lastSignature=signature;}
  this._dynamic(sim,time,opts);
  const gl=this.gl;gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(7/255,27/255,36/255,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.useProgram(this.program);gl.uniformMatrix4fv(this.uniform.uVP,false,this.vp);gl.uniformMatrix4fv(this.uniform.uLight,false,this.lightVP);gl.uniform3fv(this.uniform.uEye,this.eye);gl.uniform1f(this.uniform.uGlow,0);gl.uniform1f(this.uniform.uShadowEnabled,this.shadowOK?1:0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.shadowTexture);gl.uniform1i(this.uniform.uShadow,0);
  this._bind(this.groundBuffer);gl.drawArrays(gl.TRIANGLES,0,this.groundCount);
  this._bind(this.staticBuffer);gl.drawArrays(gl.TRIANGLES,0,this.staticCount);
  this._bind(this.dynamicBuffer);gl.drawArrays(gl.TRIANGLES,0,this.dynamicCount);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.depthMask(false);gl.uniform1f(this.uniform.uGlow,1);this._bind(this.glowBuffer);gl.drawArrays(gl.TRIANGLES,0,this.glowCount);gl.depthMask(true);gl.disable(gl.BLEND);
 }
 destroy(){const gl=this.gl;for(const b of [this.staticBuffer,this.dynamicBuffer,this.glowBuffer,this.groundBuffer])gl.deleteBuffer(b);gl.deleteTexture(this.shadowTexture);gl.deleteFramebuffer(this.shadowFBO);gl.deleteProgram(this.program);gl.deleteProgram(this.shadowProgram);}
}
/* Software projection uses the SAME meshes and camera as the WebGL path.
 * Per-field sprites are rebuilt only when their ownership/material/camera
 * changes. Moving geometry is composited between those fields by depth. */
class HexCanvasView{
 constructor(canvas){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});
  if(!this.ctx)throw new Error('Dieser Browser kann die Zeichenfläche nicht öffnen. Bitte lade die HTML-Datei herunter und öffne sie in deinem Browser.');
  this.backend='canvas';this.gl=null;this.shadowOK=false;
  this.width=canvas.clientWidth||960;this.height=canvas.clientHeight||650;
  this.camera={azimuth:.16,elevation:.78,zoom:1};this.mode='perspective';this.tileCache=new Map();this.lastSignature='';this.lastBuild=-100;this.lastTime=0;this.seed=null;
  this.staticBuffer={data:[]};this.dynamicBuffer={data:[]};this.glowBuffer={data:[]};
  const ground=strategyTable(false);this.groundGeometry=ground.a;this.groundLayers=ground.layers;this.groundTriangles=null;
  this.spriteCache=new Map();this.spriteCamera='';this.light=norm([-.58,1,.56]);
  this.resize(this.width,this.height,Math.min(root.devicePixelRatio||1,2));
 }
 _upload(buffer,mesh){buffer.data=mesh.a;return mesh.a.length/10;}
 resize(w,h,dpr=1){HexView.prototype.resize.call(this,w,h,dpr);if(this.spriteCache)this.spriteCache.clear();this.spriteCamera='';}
 _triangles(data,start=0,count=data.length,glow=false){
  const triangles=[],viewDir=norm(this.eye),light=this.light;
  for(let i=start,end=start+count;i<end;i+=30){
   const nx=data[i+3],ny=data[i+4],nz=data[i+5],emission=data[i+9];
   if(!glow&&emission<.1&&nx*viewDir[0]+ny*viewDir[1]+nz*viewDir[2]<-.02)continue;
   const a=this.project(data[i],data[i+1],data[i+2]),b=this.project(data[i+10],data[i+11],data[i+12]),c=this.project(data[i+20],data[i+21],data[i+22]);
   const area=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);if(Math.abs(area)<.012)continue;
   const lam=Math.max(0,nx*light[0]+ny*light[1]+nz*light[2]),hemi=(ny+1)*.5;
   const lit=[.21+.29*hemi+1.10*lam,.30+.30*hemi+.98*lam,.34+.32*hemi+.78*lam];
   const rgb=[0,1,2].map(k=>Math.round(255*Math.pow(clamp(data[i+6+k]*(glow?1:lit[k]+emission*1.8),0,1),1/2.2)));
   triangles.push({a,b,c,depth:(a.depth+b.depth+c.depth)/3,color:`rgb(${rgb.join(',')})`});
  }
  triangles.sort((a,b)=>b.depth-a.depth);return triangles;
 }
 _paint(ctx,triangles,glow=false){
  ctx.lineJoin='round';ctx.lineWidth=.36;
  if(glow){ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.16;ctx.shadowBlur=5;}
  for(const t of triangles){
   ctx.beginPath();ctx.moveTo(t.a.x,t.a.y);ctx.lineTo(t.b.x,t.b.y);ctx.lineTo(t.c.x,t.c.y);ctx.closePath();ctx.fillStyle=t.color;
   if(glow){ctx.shadowColor=t.color;ctx.fill();}else{ctx.strokeStyle=t.color;ctx.fill();ctx.stroke();}
  }
  if(glow)ctx.restore();
 }
 _shadow(ctx,data,start,count,t){
  if(count<1)return;ctx.save();ctx.beginPath();
  for(let i=0;i<6;i++){const a=Math.PI/6+i*Math.PI/3,p=this.project(t.x+Math.cos(a)*.914,t.height+.009,t.z+Math.sin(a)*.914);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}ctx.closePath();ctx.clip();ctx.beginPath();
  for(let i=start,end=start+count;i<end;i+=30){
   if(Math.max(data[i+1],data[i+11],data[i+21])<t.height+.12)continue;
   const p=[];for(let k=0;k<3;k++){const off=i+k*10,dy=data[off+1]-t.height;p.push(this.project(data[off]+dy*.58,t.height+.01,data[off+2]-dy*.56));}
   const area=(p[1].x-p[0].x)*(p[2].y-p[0].y)-(p[1].y-p[0].y)*(p[2].x-p[0].x);if(area<0)[p[1],p[2]]=[p[2],p[1]];
   ctx.moveTo(p[0].x,p[0].y);ctx.lineTo(p[1].x,p[1].y);ctx.lineTo(p[2].x,p[2].y);ctx.closePath();
  }
  ctx.fillStyle='rgba(5,24,32,.23)';ctx.shadowBlur=1.8;ctx.shadowColor='rgba(3,21,28,.13)';ctx.fill();ctx.restore();
 }
 _sprite(range,sim){
  const old=this.spriteCache.get(range.id);if(old&&old.key===range.key)return old;
  const data=range.data||this.staticBuffer.data,t=sim.tiles[range.id],base=this._triangles(data,range.start,range.baseCount),props=this._triangles(data,range.start+range.baseCount,range.count-range.baseCount),glow=this._triangles(range.glowData||this.staticGlowData,range.glowStart,range.glowCount,true);
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const tris of [base,props,glow])for(const tr of tris)for(const p of [tr.a,tr.b,tr.c]){x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y);}
  x0=Math.floor(x0)-7;y0=Math.floor(y0)-7;x1=Math.ceil(x1)+7;y1=Math.ceil(y1)+7;
  const image=root.document.createElement('canvas'),w=Math.max(1,x1-x0),h=Math.max(1,y1-y0);image.width=Math.ceil(w*this.dpr);image.height=Math.ceil(h*this.dpr);const g=image.getContext('2d');g.setTransform(this.dpr,0,0,this.dpr,-x0*this.dpr,-y0*this.dpr);
  this._paint(g,base);this._shadow(g,data,range.start+range.baseCount,range.count-range.baseCount,t);this._paint(g,props);this._paint(g,glow,true);
  const sprite={key:range.key,image,x:x0,y:y0,w,h,depth:this.project(t.x,t.height,t.z).depth};this.spriteCache.set(range.id,sprite);return sprite;
 }
 _backdrop(){
  const w=this.width,h=this.height,image=root.document.createElement('canvas');image.width=Math.round(w*this.dpr);image.height=Math.round(h*this.dpr);const ctx=image.getContext('2d');ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
  const ground=ctx.createRadialGradient(w*.48,h*.42,0,w*.48,h*.45,Math.max(w,h)*.67);ground.addColorStop(0,'#173e4a');ground.addColorStop(.55,'#102e3a');ground.addColorStop(1,'#071b24');ctx.fillStyle=ground;ctx.fillRect(0,0,w,h);
  if(!this.groundTriangles)this.groundTriangles=this.groundLayers.map(r=>this._triangles(this.groundGeometry,r.start,r.count));for(const layer of this.groundTriangles)this._paint(ctx,layer);
  const vignette=ctx.createRadialGradient(w*.5,h*.48,Math.min(w,h)*.28,w*.5,h*.48,Math.max(w,h)*.7);vignette.addColorStop(0,'rgba(3,16,25,0)');vignette.addColorStop(1,'rgba(3,16,25,.34)');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
  // Match the contact shadow to the map footprint in either output format.
  if(this.mapTiles){ctx.save();ctx.shadowColor='rgba(0,8,15,.42)';ctx.shadowBlur=Math.max(8,Math.min(w,h)*.015);ctx.fillStyle='rgba(0,8,15,.10)';ctx.beginPath();const b=this.tableExtent;for(let i=0;i<4;i++){const u=b.cu+(i===0||i===3?-1:1)*b.halfU,v=b.cv+(i<2?-1:1)*b.halfV,p=this.project(u*b.co+v*b.si,-1.53,-u*b.si+v*b.co);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}ctx.closePath();ctx.fill();ctx.restore();}
  return image;
 }
 render(sim,time,opts={}){
  if(!sim||!sim.tiles)return;this.lastTime=time;this._setMap(sim);this._camera();
  if(this.seed!==sim.seed||sim.time<this.previousSimTime){this.seed=sim.seed;this.tileCache.clear();this.spriteCache.clear();this.lastSignature='';this.lastBuild=-100;}
  this.previousSimTime=sim.time;
  const cameraKey=[this.width,this.height,this.dpr,this.camera.azimuth,this.camera.elevation,this.camera.zoom,this.mode,sim.seed].join('|');
  if(cameraKey!==this.spriteCamera){this.spriteCache.clear();this.spriteCamera=cameraKey;this.groundTriangles=null;this.backgroundCanvas=null;}
  const signature=sim.tiles.map(t=>`${t.owner}:${t.hq}:${+t.bunker}`).join('|');
  let changing=false;for(const t of sim.tiles){const c=this.tileCache.get(t.id);if(c&&(c.owner!==t.owner||time-c.at<.72)){changing=true;break;}}
  if(signature!==this.lastSignature||changing&&time-this.lastBuild>.14){this._build(sim,time);this.lastBuild=time;this.lastSignature=signature;}
  this._dynamic(sim,time,opts);
  const ctx=this.ctx,w=this.width,h=this.height;ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  if(!this.backgroundCanvas)this.backgroundCanvas=this._backdrop();ctx.drawImage(this.backgroundCanvas,0,0,w,h);
  const layers=[];for(const r of this.geometryRanges){const sprite=this._sprite(r,sim);layers.push({depth:sprite.depth,kind:0,sprite});}
  for(const group of this.dynamicGroups){layers.push({depth:this.project(group.x,group.y,group.z).depth-.00002,kind:1,group});}
  layers.sort((a,b)=>b.depth-a.depth||a.kind-b.kind);
  for(const layer of layers){if(layer.sprite){const s=layer.sprite;ctx.drawImage(s.image,s.x,s.y,s.w,s.h);}else{const group=layer.group;this._paint(ctx,this._triangles(this.dynamicBuffer.data,group.start,group.count));}}
  if(this.dynamicGlowData.length)this._paint(ctx,this._triangles(this.dynamicGlowData,0,this.dynamicGlowData.length,true),true);
  // The thin selected-field outline remains readable over troop sprites.
  for(const [id,isHover] of [[opts.selected,false],[opts.hover,true]]){
   if(id==null||isHover&&id===opts.selected)continue;const t=sim.tiles[id];if(!t)continue;ctx.beginPath();for(let i=0;i<6;i++){const a=Math.PI/6+i*Math.PI/3,p=this.project(t.x+Math.cos(a)*.89,t.height+.035,t.z+Math.sin(a)*.89);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}ctx.closePath();ctx.strokeStyle=isHover?'#b9ddd7':'#fff0bc';ctx.lineWidth=isHover?1.2:2;ctx.stroke();
  }
 }
 destroy(){this.spriteCache.clear();this.tileCache.clear();}
}
for(const method of ['setCamera','_setMap','_camera','project','pick','_tileColor','_build','_dynamic'])HexCanvasView.prototype[method]=HexView.prototype[method];
root.HexView=HexView;
})(typeof globalThis!=='undefined'?globalThis:this);
