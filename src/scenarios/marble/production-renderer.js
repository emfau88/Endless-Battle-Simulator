/* Solid, illuminated diorama; a pure projection of deterministic production. */
(function () {
  'use strict';
  const P = EBS.MarbleProduction, T = THREE;
  const { clamp } = EBS.util;
  const R = .238, mix = (a,b,f) => a+(b-a)*f;
  const smooth = x => { x=clamp(x,0,1); return x*x*(3-2*x); };
  const X = x => (x-3000)*.0108;
  function position(x,y) {
    if(x<=1180) return new T.Vector3(X(x),3.8+Math.max(0,(650-y)/180)*1.1,-3.6);
    return new T.Vector3(X(x),3.8+smooth((x-4400)/340)*2.5,(y-850)*.018);
  }
  function rawPosition(b) {
    const i=b.id%60;
    return new T.Vector3(-28.1+(i%5-2)*.47,5.6+Math.floor(i/20)*.47,-3.6+(Math.floor(i/5)%4-1.5)*.47);
  }
  function collectedPosition(b) {
    const i=b.binSlot;
    return new T.Vector3(X(P.BIN_X[b.bin])+(i%3-1)*.51,1.24+Math.floor(i/9)*.5,6.2+(Math.floor(i/3)%3-1)*.51);
  }
  function cameraAt(sim,view,aspect) {
    const cfg=sim.cfg,t=sim.t,portrait=aspect<1;
    const overview={x:0,y:2.5,z:.5,span:Math.max(40,75/aspect)};
    if(cfg.cameraMode==='overview'||view.camera===false) return overview;
    const expansion=sim.milestones.find(e=>e.type==='parallel');
    const laneFocus=expansion?smooth((t-expansion.time)/6):0;
    const focusZ=mix(-3.4,-.2,laneFocus);
    if(cfg.cameraMode==='manual') return {x:mix(-27,27,cfg.cameraPosition/100),y:3.8,z:cfg.cameraPosition>85?2.5:focusZ,span:(portrait?17:18)/cfg.cameraZoom};
    const marks=[-27,-16.2,-2.16,7.02,15.12,26,7.02,-2.16,-16.2],phase=Math.max(0,t-11)/24;
    const i=Math.floor(phase)%marks.length,f=smooth((phase%1-.22)/.78);
    const shot={x:mix(marks[i],marks[(i+1)%marks.length],f),y:3.8,z:focusZ,span:portrait?17.5:18.5};
    shot.z=mix(shot.z,2.5,smooth((shot.x-18)/6));
    for(const event of sim.milestones) {
      const age=t-event.time;
      if(age>=0&&age<33) {
        const weight=smooth(age/7)*(1-smooth((age-24)/9));
        shot.x=mix(shot.x,event.type==='parallel'?-8.5:-2.16,weight);
        shot.span=mix(shot.span,event.type==='parallel'?22:19,weight);
      }
    }
    let weight=1-smooth((t-4)/7);
    if(sim.completedAt!=null) weight=Math.max(weight,smooth((t-sim.completedAt)/8));
    for(const key of ['x','y','z','span']) shot[key]=mix(shot[key],overview[key],weight);
    return shot;
  }
  class ProductionRenderer extends EBS.CanvasScene {
    constructor(ctx) {
      super(ctx); this.sim=ctx.sim; this.view=ctx.view||{}; this.kit=P.createDioramaKit(); this.owned=[];
      this.scene=new T.Scene(); this.scene.background=new T.Color(0xe8e5dd); this.scene.fog=new T.Fog(0xe8e5dd,130,280);
      this.camera3=new T.OrthographicCamera(-1,1,1,-1,.1,300);
      this.gl=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
      this.gl.setPixelRatio(1); this.gl.setSize(this.canvas.width,this.canvas.height,false);
      this.gl.outputColorSpace=T.SRGBColorSpace; this.gl.toneMapping=T.ACESFilmicToneMapping; this.gl.toneMappingExposure=.86;
      this.gl.shadowMap.enabled=true; this.gl.shadowMap.type=T.PCFSoftShadowMap;
      this._lighting(); this._stage(); this._tracks(); this.machines=P.buildMachines3D(this.kit,this.scene,this.sim);
      this._collectors(); this._balls();
    }
    _own(value) { this.owned.push(value); return value; }
    _lighting() {
      this.scene.add(new T.HemisphereLight(0xfff5e6,0x83919c,.65));
      const sun=new T.DirectionalLight(0xffe9cd,2.8); sun.position.set(-24,45,32); sun.castShadow=true;
      Object.assign(sun.shadow.camera,{left:-47,right:47,top:27,bottom:-27,near:.5,far:120});
      sun.shadow.mapSize.set(2048,2048); sun.shadow.normalBias=.025; sun.shadow.bias=-.0001; sun.shadow.radius=3; this.scene.add(sun);
      const fill=new T.DirectionalLight(0xc5e2ee,.55); fill.position.set(12,14,-28); this.scene.add(fill);
      const room=new T.Scene(); room.background=new T.Color(0x4e5962);
      const geo=new T.PlaneGeometry(1,1),mat=new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide});
      for(const [x,y,z,w,h] of [[0,18,0,32,20],[-20,8,4,12,15],[14,7,-12,20,9],[0,5,15,32,4]]) {
        const panel=new T.Mesh(geo,mat); panel.position.set(x,y,z); panel.scale.set(w,h,1); panel.lookAt(0,2,0); room.add(panel);
      }
      const pmrem=new T.PMREMGenerator(this.gl); this.env=pmrem.fromScene(room,.04); this.scene.environment=this.env.texture;
      pmrem.dispose(); geo.dispose(); mat.dispose();
    }
    _stage() {
      const k=this.kit,m=k.mat,root=this.scene;
      k.box(root,360,.1,360,0,-1,0,k.material(0xe1dfd7,.9),0);
      k.box(root,73,.72,20.8,0,-.55,0,m.navy,.3);
      k.box(root,72.6,.26,20.4,0,-.08,0,m.brass,.16);
      k.box(root,72.2,.38,20,0,.17,0,m.ivory,.14);
      const zones=[[-28.1,6.6,'01  RAW GLASS'],[-16.2,6.6,'02  POLISH'],[-2.16,8.6,'03  INFUSE'],[7.02,6.6,'04  ANNEAL'],[15.12,6.6,'05  INSPECT'],[26,14.6,'06  COLLECT']];
      const floor=k.material(0xd7d9cf,.68);
      for(const [x,w,name] of zones) {
        k.box(root,w,.12,14.8,x,.42,.15,m.tealLight,.15); k.box(root,w-.2,.04,14.6,x,.5,.15,floor,.1);
        const label=k.label(root,name,x,.38,8.9,Math.min(w-.5,4.7),.65); label.rotation.x=-Math.PI/2;
      }
      for(const z of [-8.6,9.5]) k.box(root,68,.022,.075,0,.38,z,m.brass,0);
      for(const z of [-7.3,-7.65]) k.pipe(root,[[-31,1.4,z],[0,1.4,z],[28,1.4,z]],.065,m.brass);
      for(let x=-31;x<30;x+=5) k.box(root,.13,.5,.65,x,1.16,-7.5,m.teal);
      for(const x of [-21,3.5]) {
        k.cylinder(root,.65,.65,3.3,x,2.6,-6.7,m.ivory); k.sphere(root,.65,x,4.25,-6.7,m.ivory);
        for(const y of [1.1,3.8]) k.torus(root,.66,.05,x,y,-6.7,m.brass,'y');
        k.pipe(root,[[x,4.9,-6.7],[x,5.2,-6.7],[x+1.4,5.2,-6.7],[x+1.4,1.4,-7.3]],.07,m.steel);
      }
    }
    _tracks() {
      const c=document.createElement('canvas'); c.width=128;c.height=64;const g=c.getContext('2d');
      g.fillStyle='#37494a';g.fillRect(0,0,128,64);g.fillStyle='#526463';
      for(let x=0;x<128;x+=16) g.fillRect(x,0,2,64);
      this.beltTexture=this._own(new T.CanvasTexture(c));this.beltTexture.colorSpace=T.SRGBColorSpace;
      this.beltTexture.wrapS=this.beltTexture.wrapT=T.RepeatWrapping;
      const material=this._own(new T.MeshStandardMaterial({map:this.beltTexture,roughness:.83,side:T.DoubleSide}));
      this.secondTracks=new T.Group();this.scene.add(this.secondTracks);
      const p=P.PATHS;this._track(P.path([[650,650],[1180,650]]),this.scene,material);
      for(const key of ['polish','coat','cool','inspect']) for(let lane=0;lane<2;lane++) this._track(p[key][lane],lane?this.secondTracks:this.scene,material);
      this._track(p.scan,this.scene,material);this._track(p.sort,this.scene,material);
    }
    _track(path,parent,material) {
      const points=path.points.map(p=>position(p.x??p[0],p.y??p[1]));
      const k=this.kit,m=k.mat,verts=[],normals=[],uv=[],indices=[],left=[],right=[];
      let length=0;
      for(let i=0;i<points.length;i++) {
        const p=points[i],tangent=points[Math.min(i+1,points.length-1)].clone().sub(points[Math.max(0,i-1)]).normalize();
        const side=new T.Vector3(-tangent.z,0,tangent.x).normalize();
        if(i) length+=p.distanceTo(points[i-1]);
        for(const sign of [-1,1]) {const v=p.clone().addScaledVector(side,sign*.44);verts.push(v.x,v.y-R,v.z);normals.push(0,1,0);uv.push(length,(sign+1)/2);}
        left.push(p.clone().addScaledVector(side,-.51).add(new T.Vector3(0,-.08,0)).toArray());
        right.push(p.clone().addScaledVector(side,.51).add(new T.Vector3(0,-.08,0)).toArray());
        if(i) {const a=(i-1)*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
      }
      const geo=this._own(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);
      const belt=new T.Mesh(geo,material);belt.receiveShadow=true;parent.add(belt);
      k.pipe(parent,left,.047,m.steel);k.pipe(parent,right,.047,m.steel);
      for(let i=1;i<points.length;i++) {
        const a=points[i-1],b=points[i],distance=a.distanceTo(b),tangent=b.clone().sub(a).normalize(),side=new T.Vector3(-tangent.z,0,tangent.x).normalize();
        for(let u=.18;u<distance;u+=.58) {const p=a.clone().lerp(b,u/distance),roller=k.cylinder(parent,.105,.105,1.02,p.x,p.y-R-.11,p.z,m.dark);roller.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),side);}
        for(let u=.4;u<distance;u+=3.3) {
          const p=a.clone().lerp(b,u/distance),h=p.y-R-.62;
          for(const sign of [-1,1]) {const v=p.clone().addScaledVector(side,sign*.65);k.box(parent,.13,h,.13,v.x,.54+h/2,v.z,m.teal);k.box(parent,.45,.1,.5,v.x,.56,v.z,m.steel);}
          const cross=k.box(parent,.15,.17,1.5,p.x,p.y-R-.27,p.z,m.ivory);cross.rotation.y=-Math.atan2(tangent.z,tangent.x);
        }
      }
    }
    _collectors() {
      const k=this.kit,m=k.mat;this.sortGates=[];this.dropCurves=[];const colors=this.sim.colors||P.COLORS;
      const chuteGlass=this._own(new T.MeshPhysicalMaterial({color:0x9ec9c8,roughness:.12,transparent:true,opacity:.22,depthWrite:false,side:T.DoubleSide,clearcoat:1}));
      for(let i=0;i<6;i++) {
        const x=X(P.BIN_X[i]),color=k.material(colors[i].hex,.27,.1);
        k.box(this.scene,1.95,.36,2.05,x,1,6.2,m.teal);
        k.box(this.scene,1.77,4.1,1.77,x,3.18,6.2,m.glass,0);
        for(const dx of [-.89,.89]) for(const dz of [-.89,.89]) k.cylinder(this.scene,.035,.035,4.35,x+dx,3.15,6.2+dz,m.steel);
        for(const z of [5.3,7.1]) k.box(this.scene,1.94,.14,.12,x,5.32,z,m.ivory);
        for(const dx of [-.91,.91]) k.box(this.scene,.12,.14,1.8,x+dx,5.32,6.2,m.ivory);
        k.box(this.scene,1.55,.09,.2,x,1.24,7.15,color);k.label(this.scene,colors[i].name||String(i+1),x,1.03,7.24,1.5,.25);
        const tubePoints=[[x,6.3,-3.6],[x,6.3,-2.2],[x,6.1,3],[x,5.7,5.2],[x,5.35,6.2]];
        const curve=new T.CatmullRomCurve3(tubePoints.map(p=>new T.Vector3(...p)),false,'centripetal');this.dropCurves.push(curve);
        k.pipe(this.scene,tubePoints,.32,chuteGlass);
        for(const q of [.15,.58,.85]) {
          const p=curve.getPointAt(q),ring=k.torus(this.scene,.33,.035,p.x,p.y,p.z,m.steel);
          ring.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),curve.getTangentAt(q));
          if(q===.58) {k.cylinder(this.scene,.04,.04,p.y-.6,x,p.y/2+.3,p.z,m.teal);k.box(this.scene,.4,.08,.4,x,.56,p.z,m.steel);}
        }
        k.cylinder(this.scene,.14,.14,1.25,x,6.2,-3.6,color,'z');
        this.sortGates.push(k.box(this.scene,.08,.38,.78,x,6.3,-3.6,m.brass));
      }
    }
    _balls() {
      this.ballMeshes=[];const shellGeo=this._own(new T.SphereGeometry(R,32,24));
      // A tapered glass ribbon stays completely inside the shell. Unlike a fat
      // cylindrical helix, its ends cannot protrude and its silhouette survives
      // the small marble size in a production shot.
      const vertices=[],indices=[];
      for(let i=0;i<=48;i++) {
        const t=i/48,angle=t*Math.PI*2.2,width=.125*Math.pow(Math.sin(Math.PI*t),.75);
        for(let j=0;j<=4;j++) {const d=(j/2-1)*width;vertices.push(Math.cos(angle)*d,(t-.5)*.37,Math.sin(angle)*d);}
        if(i)for(let j=0;j<4;j++){const a=(i-1)*5+j;indices.push(a,a+1,a+5,a+1,a+6,a+5);}
      }
      const coreGeo=this._own(new T.BufferGeometry());coreGeo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));coreGeo.setIndex(indices);coreGeo.computeVertexNormals();
      const pearlGeo=this._own(new T.SphereGeometry(.175,24,16));
      const filamentMaterial=this._own(new T.MeshPhysicalMaterial({color:0xfff3d6,roughness:.24,clearcoat:.65,side:T.DoubleSide}));
      for(const b of this.sim.balls) {
        const group=new T.Group();this.scene.add(group);
        const material=this._own(new T.MeshPhysicalMaterial({color:0x8a9e9d,roughness:.5,transmission:b.material==='glass'?.001:0,clearcoat:b.material==='glass'?.001:0,iridescence:b.pattern==='pearl'?.001:0,thickness:.10,ior:1.45,envMapIntensity:.72,attenuationColor:0xffffff,attenuationDistance:1.8}));
        const shell=new T.Mesh(shellGeo,material);shell.castShadow=true;shell.receiveShadow=true;group.add(shell);
        const tint=new T.Color((this.sim.colors||P.COLORS)[b.color].hex);
        const coreColor=b.pattern==='pearl'?new T.Color(0xfff5e2).lerp(tint,.25):tint.clone().multiplyScalar(.65);
        const coreMaterial=this._own(new T.MeshPhysicalMaterial({color:coreColor,roughness:b.pattern==='pearl'?.3:.22,clearcoat:.6,side:T.DoubleSide}));
        const core=new T.Mesh(b.pattern==='pearl'?pearlGeo:coreGeo,coreMaterial),other=new T.Mesh(coreGeo,filamentMaterial);other.rotation.y=1.45;group.add(core,other);
        this.ballMeshes.push({group,material,core,other,target:new T.Color((this.sim.colors||P.COLORS)[b.color].hex)});
      }
    }
    _updateBalls() {
      const sim=this.sim;
      for(let i=0;i<sim.balls.length;i++) {
        const b=sim.balls[i],v=this.ballMeshes[i];v.group.visible=b.state!=='raw'||b.id<sim.rawCursor+60-(sim.pickup?1:0);
        let p;
        if(b.state==='raw') p=rawPosition(b);
        else if(sim.pickup===b) {const q=smooth(b.s/b.route.len);p=rawPosition(b).lerp(position(650,470),q);p.y+=Math.sin(q*Math.PI)*.35;}
        else if(b.bin>=0) {
          const target=collectedPosition(b);
          if(b.state==='finished') p=target;
          else {const q=clamp(b.s/b.route.len,0,1),mouth=new T.Vector3(X(P.BIN_X[b.bin]),5.35,6.2);p=q<.62?this.dropCurves[b.bin].getPointAt(q/.62):mouth.lerp(target,(q-.62)/.38);}
          if(b.material==='rubber'&&b.settleAge!=null) p.y+=Math.abs(Math.sin(b.settleAge*11))*Math.max(0,1-b.settleAge/1.1)*.25;
        } else p=position(b.x,b.y);
        v.group.position.copy(p);v.group.rotation.set(b.rot||0,0,(b.rot||0)*.15);
        let squash=b.squash||1;if(b.material==='rubber'&&b.state==='polishing') squash=1-Math.sin((sim.stations.polish[b.lane]?.progress||0)*Math.PI)*.18;
        v.group.scale.set(1/Math.sqrt(squash),squash,1/Math.sqrt(squash));
        const finish=smooth((b.coating-.18)/.82),polished=b.polish||0;
        const glassTint=b.pattern==='clear'?.42:.12;
        v.material.color.setHex(0x91a09c).lerp(new T.Color(0xf4fbf9),polished).lerp(v.target,finish*(b.material==='glass'?glassTint:b.material==='steel'?.45:.9));
        v.material.attenuationColor.setHex(0xffffff).lerp(v.target,finish*.45);
        v.material.roughness=b.material==='rubber'?.85:mix(.6,b.material==='steel'?.19:.028,polished);
        v.material.metalness=b.material==='steel'?.96:0;v.material.transmission=b.material==='glass'?Math.max(.001,polished*.96):0;
        v.material.clearcoat=b.material==='glass'?Math.max(.001,polished):0;v.material.iridescence=b.pattern==='pearl'?Math.max(.001,finish*.65):0;
        v.core.visible=b.material==='glass'&&b.pattern!=='clear'&&finish>.02;
        v.other.visible=v.core.visible&&b.pattern==='swirl';
        v.core.scale.setScalar(finish);v.other.scale.set(finish*.28,finish,finish*.28);
      }
      for(let i=0;i<this.sortGates.length;i++) this.sortGates[i].rotation.y=sim.balls.some(b=>b.bin===i&&b.state==='sorting')?-.7:0;
    }
    resize(world,scale) {
      this.world=world;this.scale=scale;this.canvas.width=Math.round(world.w*scale);this.canvas.height=Math.round(world.h*scale);
      this.texture.source.resize(this.canvas.width,this.canvas.height);if(this.gl)this.gl.setSize(this.canvas.width,this.canvas.height,false);
      const sprite=this.root.children[0];sprite.width=world.w;sprite.height=world.h;
    }
    _hud(g,w,h) {
      const sim=this.sim,pad=Math.max(22,w*.022),fs=Math.max(12,Math.min(w,h)*.019);
      g.fillStyle='#f3f0e8dc';g.fillRect(w-pad-fs*7.6,pad-fs*.35,fs*7.8,fs*2.1);
      g.fillStyle='#28474c';g.textAlign='right';g.font='600 '+(fs*1.3)+'px Arial';g.fillText(sim.stats.completed+' / '+sim.orderSize,w-pad,pad+fs);
      g.textAlign='left';g.font='500 '+(fs*.86)+'px Arial';
      const phase=sim.completedAt!=null?'COLLECTION COMPLETE':['I · THE FIRST MARBLE','II · COLOUR INFUSION','III · PARALLEL PRODUCTION'][sim.level];
      const textWidth=g.measureText(phase).width;g.fillStyle='#f3f0e8dc';g.fillRect(pad-fs*.4,h-pad-fs*1.05,textWidth+fs*.8,fs*1.5);g.fillStyle='#28474c';g.fillText(phase,pad,h-pad);
    }
    paint(g) {
      const w=this.world.w,h=this.world.h,aspect=w/h,view=this.view,shot=cameraAt(this.sim,view,aspect);
      Object.assign(this.camera3,{left:-shot.span*aspect/2,right:shot.span*aspect/2,top:shot.span/2,bottom:-shot.span/2});
      this.camera3.position.set(shot.x-33,shot.y+43,shot.z+58);this.camera3.lookAt(shot.x,shot.y,shot.z);this.camera3.updateProjectionMatrix();
      this.beltTexture.offset.x=-this.sim.workTime*.55;this.secondTracks.visible=this.sim.level>=2;
      this._updateBalls();this.machines.update(this.sim);this.gl.render(this.scene,this.camera3);
      g.drawImage(this.gl.domElement,0,0,w,h);if(view.hud!==false)this._hud(g,w,h);
    }
    destroy() {this.machines?.dispose();this.owned.forEach(x=>x.dispose());this.kit?.dispose();this.env?.dispose();this.gl?.dispose();this.gl?.forceContextLoss();super.destroy();}
  }
  P.cameraAt=cameraAt;P.Renderer=ProductionRenderer;
})();
