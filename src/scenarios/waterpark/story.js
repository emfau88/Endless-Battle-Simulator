(function () {
'use strict';
const WP = (EBS.Waterpark = EBS.Waterpark || {});
const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
const enabled = cfg => [0,1,2,3].filter(i => cfg['route'+i] !== false);
/** Seconds before the end of the video at which the finale may begin: the fountain show gets more room than the quiet ending. */
WP.finaleLead = (cfg, D) => (cfg.mode || 'day') === 'short' ? 3 : cfg.ending === 'show' ? clamp(D * .05, 8, 30) : 8;
WP.storyState = function (cfg, video, step, timing = {}) {
  const mode = cfg.mode || 'day', D = Math.max(1, Number(video && video.durationSec) || (mode === 'short' ? 30 : 600));
  const time = Math.max(0, step/60), progress = clamp(time/D,0,1), selected = mode === 'short' ? [0,1,2,3] : enabled(cfg);
  const thresholds = [0,.10,.22,.35], openRoutes = [false,false,false,false];
  selected.forEach((id,i) => { openRoutes[id] = mode !== 'day' || progress >= thresholds[i]; });
  const closingAt = timing.closingAt == null ? Math.max(0,D-Math.max(32,Math.min(60,D*.12))) : timing.closingAt;
  const closing = mode === 'short' || (mode === 'day' && time >= closingAt);
  const finaleAt = timing.finaleAt == null ? Math.max(0,D-WP.finaleLead(cfg,D)) : timing.finaleAt;
  const dayD = cfg.dayMinutes > 0 ? cfg.dayMinutes*60 : D;
  let dayPhase;
  if (cfg.dayCycle === false) dayPhase = cfg.dayStart == null ? .35 : cfg.dayStart;
  else if (mode === 'short') dayPhase = .35 + .39*clamp((progress-.45)/.5,0,1);
  else if (mode === 'day') dayPhase = .08+.83*clamp(time/dayD,0,1);
  else dayPhase = ((cfg.dayStart||0)+time/dayD)%1;
  const night = clamp((dayPhase-.68)/.20,0,1), warm = Math.max(0,1-Math.abs(dayPhase-.66)/.17);
  const phase = mode==='relax' ? 'relax' : time>=finaleAt ? 'finale' : closing ? (mode==='short'?'rides':'closing') : progress<.1?'morning':progress<.35?'opening':progress<.65?'day':'evening';
  return { mode,time,duration:D,progress,phase,closing,closingAt,finaleAt,finished:false,openRoutes,night,warm,dayPhase,
    show: mode!=='relax' && cfg.ending==='show' && time>=finaleAt };
};
WP.preflight = function ({params:cfg={},video={},world={w:1920,h:1080},timeScale} = {}) {
  const mode = cfg.mode || 'day', L = WP.createLayout(world,cfg.size||36,cfg.jumpV2), n = mode==='short'?4:(cfg.animals||16);
  const tempo = Math.max(.05,(timeScale == null ? video.tempo||1 : timeScale)*(cfg.speed||1));
  const ride = Math.max(...L.routes.map(r => r.path.length/(190*Math.max(.1,cfg.rollSpeed||1))))/tempo;
  const lift = L.lift.path.length/(180*Math.max(.1,cfg.beltSpeed||1))/tempo;
  const pool = L.pool.path.length/(170*Math.max(.1,cfg.current||1))/tempo;
  const parking = L.gather.path.length/(190*Math.max(.1,cfg.current||1))/tempo;
  // Reservation handoffs and the quiet final tableau need their own wall-clock margin.
  const drainSeconds = Math.max(32,Math.min(180,ride+lift+pool+parking+Math.ceil(n/4)*2+12));
  const D = Math.max(1,Number(video.durationSec)||(mode==='short'?30:600)), errors=[];
  if (!enabled(cfg).length && mode!=='short') errors.push('Mindestens eine Rutsche muss geöffnet sein.');
  if (n*L.GAP > L.pool.path.length*.98) errors.push('Für diese Figurengröße ist der Rücklauf zu kurz; bitte weniger oder kleinere Tiere wählen.');
  if (mode==='short' && D<25) errors.push('Der Vier-Tiere-Film benötigt mindestens 25 Sekunden.');
  const minDuration = mode==='short' ? 25 : mode==='day' ? Math.ceil(drainSeconds+20) : 1;
  if (mode==='day' && D<minDuration) errors.push('Der Parktag ist für dieses Tempo zu kurz. Bitte die Dauer erhöhen oder den Vier-Tiere-Film wählen.');
  return {ok:errors.length===0,errors,drainSeconds,minDuration,closingAt:mode==='short'?0:Math.max(0,D-Math.max(drainSeconds,Math.min(60,D*.12))),finaleAt:Math.max(0,D-WP.finaleLead(cfg,D))};
};
})();
