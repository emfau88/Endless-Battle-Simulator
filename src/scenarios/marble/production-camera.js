/* Shared deterministic camera/projection for Marble Works picture and sound.
 * Plain numbers only: audio planning never needs a renderer or advances physics. */
(function () {
  'use strict';
  const P = EBS.MarbleProduction, { clamp } = EBS.util;
  const mix = (a,b,f) => a+(b-a)*f;
  const smooth = x => { x=clamp(x,0,1); return x*x*(3-2*x); };
  const X = x => (x-3000)*.0108;
  const offset = Object.freeze({ x:-33, y:43, z:58 });
  function position(x,y) {
    if(x<=1180) return {x:X(x),y:3.8+Math.max(0,(650-y)/180)*1.1,z:-3.6};
    return {x:X(x),y:3.8+smooth((x-4400)/340)*2.5,z:(y-850)*.018};
  }
  // Extracted without changing the existing shot timings, angles or framing.
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
  // Same view basis as THREE.Camera.lookAt(target) with the renderer's fixed offset.
  const horizontal = Math.hypot(offset.x,offset.z), distance = Math.hypot(offset.x,offset.y,offset.z);
  const right = {x:offset.z/horizontal,y:0,z:-offset.x/horizontal};
  const back = {x:offset.x/distance,y:offset.y/distance,z:offset.z/distance};
  const up = {x:back.y*right.z,y:back.z*right.x-back.x*right.z,z:-back.y*right.x};
  function project(point,shot,aspect) {
    const x=point.x-shot.x,y=point.y-shot.y,z=point.z-shot.z;
    return {x:(x*right.x+y*right.y+z*right.z)/(shot.span*aspect/2),
      y:(x*up.x+y*up.y+z*up.z)/(shot.span/2)};
  }
  function audioSourcePosition(event) {
    // Collection impacts belong to the transparent bins, whose 3D placement is
    // independent of the simulation's compact 2D packing coordinates.
    if(event.type==='factoryComplete'||(event.type==='factoryImpact'&&event.x>=4800&&event.y>950)) {
      const x=event.type==='factoryComplete'?event.x:(P.BIN_X[event.c]??event.x);
      return {x:X(x),y:2.4,z:6.2};
    }
    return position(event.x,event.y);
  }
  P.cameraAt=cameraAt;P.cameraOffset=offset;P.stagePosition=position;
  P.projectStagePoint=project;P.audioSourcePosition=audioSourcePosition;
})();
