/* Optional Marble Works mix plan. Raw events remain the complete production score.
 * A short sound is weighted at its start and finishes naturally. No audio history,
 * render-frame count, mutable filter state or camera-dependent physics is used. */
(function () {
  'use strict';
  const P=EBS.MarbleProduction,{clamp}=EBS.util;
  const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
  const priority={factoryComplete:0,factoryUpgrade:1,factoryPress:2,factorySort:3,
    factoryImpact:4,factoryFeed:5,factoryScan:6,factoryRoll:7};
  const taps=[[-.35,1],[-.175,4],[0,6],[.175,4],[.35,1]];
  function contextFor({cfg,world,sim,view}) {
    const aspect=world.w/world.h;
    if(!Number.isFinite(aspect)||aspect<=0)throw new Error('Marble audio requires a valid viewport.');
    const tempo=cfg.video?.tempo??1;
    if(!Number.isFinite(tempo)||tempo<=0)throw new Error('Marble audio requires a valid tempo.');
    return {params:cfg.params,tempo,aspect,view:view||cfg.view||{},
      milestones:sim.milestones||[],completedAt:sim.completedAt??null};
  }
  function focusAt(event,ctx) {
    const point=P.audioSourcePosition(event),seconds=event.step/60;
    let gain=0,pan=0,wide=0;
    for(const [offset,weight] of taps) {
      // Events are timed in exported seconds; the visual camera uses scaled simulation time.
      const shot=P.cameraAt({cfg:ctx.params,t:Math.max(0,seconds+offset)*ctx.tempo,
        milestones:ctx.milestones,completedAt:ctx.completedAt},ctx.view,ctx.aspect);
      const screen=P.projectStagePoint(point,shot,ctx.aspect);
      const edge=(1-smooth((Math.abs(screen.x)-.72)/.58))*(1-smooth((Math.abs(screen.y)-.72)/.58));
      const closeSpan=ctx.aspect<1?17.5:18.5,overviewSpan=Math.max(40,75/ctx.aspect);
      const overview=smooth((shot.span-closeSpan)/(overviewSpan-closeSpan));
      gain+=edge*(1-.58*overview)*weight;
      pan+=clamp(screen.x*.30,-.35,.35)*weight;
      wide+=overview*weight;
    }
    gain/=16;pan/=16;wide/=16;
    // Keep a genuine silent region outside the feather, including during temporal smoothing.
    return {gain:gain<.002?0:gain,pan,wide};
  }
  function createAudioMixPlan(events,options) {
    const ctx=contextFor(options),volume=options.cfg.video.volume||{};
    const decisions=new Map(),candidates=[],stats={total:events.length,audible:0,offscreen:0,densitySuppressed:0,unmapped:0,muted:0};
    for(const event of events) {
      if(!Number.isInteger(event.seq)||!Number.isFinite(event.step)||!Number.isFinite(event.x)||!Number.isFinite(event.y))
        throw new Error('Invalid Marble Works audio event.');
      if(decisions.has(event.seq))throw new Error('Duplicate Marble Works audio event.');
      const decision={seq:event.seq,gain:0,pan:0};decisions.set(event.seq,decision);
      const base=P.audioEvents[event.type];
      if(!base){stats.unmapped++;continue;}
      if(volume[event.type]===0||volume.master===0){stats.muted++;continue;}
      const focus=focusAt(event,ctx);
      decision.pan=focus.pan;
      if(!focus.gain){stats.offscreen++;continue;}
      const variant=base.variants?.[event[base.variant]],definition=variant?{...base,...variant}:base;
      candidates.push({event,decision,focus,minGap:definition.minGap||0});
    }
    // For simultaneous events, foreground work wins over rolling detail. Keep the
    // overall chronological order, so no future event can change past decisions.
    candidates.sort((a,b)=>a.event.step-b.event.step||(priority[a.event.type]??99)-(priority[b.event.type]??99)||a.event.seq-b.event.seq);
    const lastStep=new Map(),active=[];
    for(const candidate of candidates) {
      const {event,decision,focus,minGap}=candidate;
      const last=lastStep.get(event.type);
      const overview=focus.wide>.5,windowSteps=(overview ? .70 : .40)*60,capacity=overview?2:3;
      // Retain the wider history even while close, so a transition into overview
      // cannot accidentally forget recent sounds and produce a burst.
      while(active.length&&event.step-active[0]>=.70*60)active.shift();
      const nearby=active.filter(step=>event.step-step<windowSteps).length;
      if((last!==undefined&&event.step-last<minGap*60)||nearby>=capacity){stats.densitySuppressed++;continue;}
      decision.gain=focus.gain;lastStep.set(event.type,event.step);active.push(event.step);stats.audible++;
    }
    return {version:1,profile:'marbleworks-soft-v1',events:events.map(event=>decisions.get(event.seq)),stats};
  }
  P.createAudioMixPlan=createAudioMixPlan;
  P.audioFocusAt=(event,options)=>focusAt(event,contextFor(options));
})();
