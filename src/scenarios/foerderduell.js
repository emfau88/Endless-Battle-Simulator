(function () {
  'use strict';
  const F=EBS.Foerderduell;
  const defaults={mode:'single',supply:'bursts'};
  const audio={
    limiterReleaseMs:25,
    events:{
      turn:{label:'Förderschnecke',samples:['synth:auger-turn'],gain:.26,detune:.12},
      stroke:{label:'Kolbenanschlag',samples:['mw-soft-wood-0','mw-soft-wood-2'],gain:.5,semis:-4,detune:.4},
      glass:{label:'Kugeln im Zielglas',samples:['mw-soft-glass-0','mw-soft-glass-1','mw-soft-glass-2'],gain:.34,scale:[0,2,4,7],detune:.5}
    }
  };
  EBS.registerScenario({
    id:'foerderduell',title:'Schnecke gegen Stempel',defaults,
    normalizeParams(p) {
      return { mode:p.mode==='series'?'series':'single',
        supply:['mixed','bursts','steady','packets'].includes(p.supply)?p.supply:defaults.supply };
    },
    controls:[
      {key:'mode',label:'Rennmodus',type:'select',restart:true,
        options:[['single','Eine Runde bis zum Ziel'],['series','Fortlaufende Runden']]},
      {key:'supply',label:'Gemeinsamer Zulauf',type:'select',restart:true,
        options:[['bursts','Zwei Schübe zu zwölf'],['steady','Eine Kugel je Takt'],['packets','Wechselnde Portionen'],['mixed','Je Runde wechseln (Seed)']]}
    ],
    supportsCamera:false,supportsClips:true,
    videoDefaults:{resolution:1080,fps:30,quality:{crf:20,preset:'medium'}},
    hasNaturalDuration:cfg=>cfg.params.mode==='single',
    durationLabel:{pending:'Zieleinlauf wird berechnet …',complete:'Eine vollständige Runde mit 1,5 Sekunden Ergebnis bei Normaltempo.'},
    createExportPlan(cfg) {
      if(cfg.params.mode!=='single') return null;
      const sim=new F.Simulation({seed:cfg.seed,params:cfg.params,timeScale:cfg.video.tempo});
      const steps=Math.ceil(sim.roundLength/cfg.video.tempo);
      const durationSec=Math.ceil(steps*cfg.video.fps/EBS.PHYS_HZ)/cfg.video.fps;
      return {advance:()=>({done:true,durationSec})};
    },
    create:ctx=>new F.Simulation(ctx),createRenderer:ctx=>new F.Renderer(ctx),audio,
    panelStats(sim) {
      return [
        {key:'round',label:'Runde',value:sim.roundIndex+1},
        {key:'auger',label:'Zielglas Schnecke',value:sim.scores[0]},
        {key:'piston',label:'Zielglas Stempel',value:sim.scores[1]},
        {key:'wins',label:'Siege Schnecke / Stempel',value:sim.wins.auger+' / '+sim.wins.piston}
      ];
    },
    panelNote:sim=>sim.snapshot().summary
  });
})();
