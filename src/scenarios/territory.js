/* Territory Wars / Hex Dominion V0.3: original world and labels on the
 * existing CanvasScene/Pixi capture stage, with the source HUD in Canvas2D. */
(function () {
  'use strict';
  const { Episode, normalizeParams } = EBS.Territory;
  const TEAMS = HexSim.TEAMS;
  const FONT = '"Segoe UI", system-ui, sans-serif';
  const MONO = 'ui-monospace, Consolas, monospace';
  function text(g, value, x, y, size, color = '#e8f1ef', align = 'left', mono = false, weight = 500) {
    g.font = `${weight} ${size}px ${mono ? MONO : FONT}`;
    g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = color; g.fillText(String(value), x, y);
  }
  const box = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  // 'auto': slim Shorts frame in 9:16, full panels in 16:9 (nothing covers them there).
  const displayMode = (params, world) => params.display === 'auto' ? (world.h > world.w ? 'slim' : 'full') : params.display;
  function frameLayout(world, params) {
    const portrait = world.h > world.w, cards = params.showFactions, mode = displayMode(params, world);
    // Slim and off: no bands, the map fills the picture.
    // The slim portrait frame renders a slightly taller view and shows its upper part: the map sits a
    // little lower, clear of the caption line, while its lowest rows end under the Shorts interface.
    if (mode !== 'full') return { portrait, mode, x: 0, y: 0, w: world.w, h: world.h + (mode === 'slim' && portrait ? Math.round(world.h * .06) : 0),
      cardsX: 0, cardsY: 0, cardsW: 0 };
    const top = 105, bottom = portrait && cards ? 244 : 0;
    const side = !portrait && cards ? 332 : 0;
    return { portrait, mode, x: 0, y: top, w: world.w - side, h: world.h - top - bottom,
      cardsX: portrait ? 24 : world.w - side + 12, cardsY: portrait ? world.h - bottom + 18 : 120,
      cardsW: portrait ? world.w - 48 : side - 36 };
  }

  class TerritoryRenderer extends EBS.CanvasScene {
    constructor(ctx) {
      super(ctx);
      this.sim = ctx.sim; this.view = ctx.view; this.video = ctx.video;
      this.worldCanvas = document.createElement('canvas');
      this.labelCanvas = document.createElement('canvas');
      // Derived view: the source renderer plus optional spearmen instead of tanks (units.js).
      this.hexView = new (EBS.Territory.UnitView || HexView)(this.worldCanvas);
      if (this.sim.cfg.layout === 'wilds') {
        // The large map changes territory colour on capture. The archived view
        // normally blends from whichever colour the last rendered frame held.
        const view = this.hexView, tileColor = view._tileColor.bind(view);
        view._tileColor = (tile, time) => {
          if (view.tileCache.get(tile.id)?.owner !== tile.owner) view.tileCache.delete(tile.id);
          return tileColor(tile, time);
        };
      }
      this.overlay = EBS.Territory.createOverlay(this.labelCanvas, this.hexView);
      this.unsubscribe = this.sim.addTickObserver(round => this.overlay.observe(round));
      this.resize(ctx);
      this.overlay.observe(this.sim.roundSim);
    }
    resize({ world, renderScale, video }) {
      this.world = world; this.scale = renderScale; this.video = video;
      this.texture.source.resize(Math.round(world.w * renderScale), Math.round(world.h * renderScale));
      this.root.children[0].width = world.w; this.root.children[0].height = world.h;
      this.updateViewport(true);
    }
    updateViewport(force = false) {
      const p = this.sim.cfg, l = frameLayout(this.world, p);
      // The source quality switch changes pixel density, not geometry or rules.
      const dpr = Math.min(this.scale, p.highQuality ? 1.7 : 1);
      const key = [l.w, l.h, dpr, this.video.aspect, l.mode].join('|');
      this.layout = l;
      if (force || key !== this.viewportKey) {
        this.viewportKey = key;
        this.hexView.resize(l.w, l.h, dpr);
        this.overlay.resize(l.w, l.h, dpr, l.portrait ? 'portrait' : 'landscape');
      }
      this.hexView.mode = p.cameraMode; this.hexView.units = p.units;
      this.hexView.camera.azimuth = p.cameraMode === 'top' ? 0 : p.cameraAzimuth;
      this.hexView.camera.elevation = p.cameraMode === 'top' ? 1.48 : p.cameraElevation;
      this.hexView.camera.zoom = p.cameraZoom;
    }
    paint(g) {
      this.updateViewport();
      const s = this.sim, r = s.roundSim, p = s.cfg, l = this.layout;
      const remainder = r.phase === 'running' ? s.accumulator : 0;
      // The round clock stops with the result, the picture does not: colour changes of the
      // last conquest, flags and effects finish in video time (generator steps since the result).
      const after = r.phase === 'finished' ? Math.max(0, s.step - s.resultStep) / 60 * s.timeScale : 0;
      const reaction = !l.portrait && this.view.hud && l.mode !== 'off' ? s.hqReactions?.visible(s.step / 60) : null;
      if (p.layout === 'wilds') {
        const crater = r.meteor?.closed ? r.meteor.tile : -1;
        if (this.lastCrater !== crater) { this.hexView.lastSignature = ''; this.lastCrater = crater; }
      }
      this.overlay.observe(r);
      this.hexView.render(r, r.time + remainder + after, { selected: null, hover: null, showUnits: true, quality: p.highQuality ? 'high' : 'low' });
      g.fillStyle = '#09171f'; g.fillRect(0, 0, this.world.w, this.world.h);
      g.drawImage(this.worldCanvas, l.x, l.y, l.w, l.h);
      if (p.layout === 'wilds') {
        g.save(); g.translate(l.x, l.y);
        g.beginPath(); g.rect(0, 0, l.w, l.h); g.clip();
        EBS.Territory.drawWilds(g, r, this.hexView, r.time + remainder, after);
        g.restore();
      }
      // The slim frame draws its own, larger name plates; numbers and routes stay with the full view.
      if (l.mode !== 'slim') {
        this.overlay.draw(remainder, p, reaction);
        g.drawImage(this.labelCanvas, l.x, l.y, l.w, l.h);
      }
      if (l.mode === 'full') {
        if (this.view.hud) this.hud(g);
        if (p.showWinner && r.phase === 'finished') this.winner(g);
      } else if (l.mode === 'slim' && this.view.hud) {
        EBS.Territory.drawSlim(g, { sim: s, world: this.world, layout: l, view: this.hexView, remainder, reaction });
      }
    }
    hud(g) {
      const r = this.sim.roundSim, p = this.sim.cfg, l = this.layout;
      text(g, 'TERRITORY WARS', 28, 27, 12, '#8aa5ad', 'left', true);
      text(g, 'HEX DOMINION', 28, 57, 29, '#e4efe7');
      if (p.layout === 'wilds') {
        const notice = EBS.Territory.wildsNotice(r, r.time + this.sim.accumulator);
        if (notice) text(g, notice, l.w / 2, 55, 22, '#ffdb99', 'center', true, 650);
      }
      text(g, `WORLD ${String(r.seed).padStart(4, '0')} / FOUR CROWNS`, 29, 84, 12, '#77969f', 'left', true);
      if (p.showClock) {
        text(g, EBS.util.fmtTime(r.time), l.w - 28, 43, 29, '#d9e7e3', 'right', true);
        text(g, `ROUND ${String(this.sim.roundNumber).padStart(2, '0')}`, l.w - 28, 78, 13, '#718d96', 'right', true);
      }
      if (!p.showFactions) return;
      const stats = r.stats(), usable = r.tiles.filter(t => t.terrain !== 'mountain').length;
      const leader = [...stats].sort((a,b) => b.tiles - a.tiles || a.id - b.id)[0];
      const gap = 12, w = l.portrait ? (l.cardsW - gap * 3) / 4 : l.cardsW;
      const h = l.portrait ? 178 : 148;
      stats.forEach((s,i) => this.faction(g, s, leader.id, usable,
        l.cardsX + (l.portrait ? i * (w + gap) : 0), l.cardsY + (l.portrait ? 0 : i * (h + gap)), w, h));
      const y = l.portrait ? this.world.h - 28 : l.cardsY + 4 * (h + gap) + 18;
      let x = l.cardsX;
      for (const s of stats) {
        const w = s.tiles / usable * l.cardsW;
        g.fillStyle = TEAMS[s.id].color; g.fillRect(x, y, w, 5); x += w;
      }
      const neutral = r.tiles.filter(t => t.owner < 0 && t.terrain !== 'mountain').length;
      if (!l.portrait) {
        text(g, `${neutral} NEUTRAL`, l.cardsX, y + 27, 13, '#64828c', 'left', true);
        text(g, `${stats.filter(s => s.alive).length} HQ ACTIVE`, l.cardsX + l.cardsW, y + 27, 13, '#64828c', 'right', true);
      }
    }
    faction(g, s, leader, usable, x, y, w, h) {
      const team = TEAMS[s.id], portrait = this.layout.portrait;
      g.save(); if (!s.alive) g.globalAlpha = .4;
      const bg = g.createLinearGradient(x, y, x+w, y);
      bg.addColorStop(0, team.color + '12'); bg.addColorStop(1, '#10232d');
      box(g,x,y,w,h,10); g.fillStyle = bg; g.fill(); g.strokeStyle = '#ffffff12'; g.lineWidth = 1; g.stroke();
      g.fillStyle = team.color; g.fillRect(x,y+20,3,h-40);
      const mark = !s.alive ? ' ×' : s.id === leader && this.sim.roundSim.time > 3 ? ' ◆' : '';
      text(g, team.name + mark, x+18, y+29, portrait ? 22 : 24, '#e3eeeb', 'left', false, 650);
      text(g, `${Math.floor(s.units)} STRENGTH`, x+18, y+60, portrait ? 17 : 18, '#b3c7c9', 'left', true);
      text(g, `+${s.income.toFixed(1)}/s`, x+18, y+86, 17, '#7f9ba5', 'left', true);
      text(g, s.tiles, x+w-18, y+(portrait ? 118 : 83), portrait ? 40 : 43, team.color, 'right', true);
      text(g, 'TILES', x+w-18, y+(portrait ? 147 : 115), 12, '#698892', 'right', true);
      g.fillStyle = '#ffffff08'; g.fillRect(x+18,y+h-16,w-36,3);
      g.fillStyle = team.color; g.fillRect(x+18,y+h-16,(w-36)*s.tiles/usable,3);
      g.restore();
    }
    winner(g) {
      const s = this.sim, r = s.roundSim, l = this.layout, team = TEAMS[r.winner];
      if (!team) return;
      const w = Math.min(680,l.w-48), h = 154, x = l.x+(l.w-w)/2, y = l.y+l.h-h-40;
      box(g,x,y,w,h,14); g.fillStyle = '#0e2430ee'; g.fill(); g.strokeStyle = '#cceac941'; g.lineWidth = 2; g.stroke();
      text(g, 'ONE CROWN REMAINS', x+w/2,y+29,14,'#a9c2b9','center',true);
      text(g, `${team.name} WINS`, x+w/2,y+72,44,team.color,'center');
      const remaining = Math.max(0,Math.ceil((s.pauseUntil-s.step)/EBS.PHYS_HZ));
      const note = s.cfg.repeatRounds ? `NEXT ROUND IN ${remaining}s · VICTORY AFTER ${EBS.util.fmtTime(r.time)}`
        : `THE LAST FORTRESS STANDS · VICTORY AFTER ${EBS.util.fmtTime(r.time)}`;
      text(g,note,x+w/2,y+119,18,'#94b0b9','center');
    }
    presentationState() {
      return { overlay: this.overlay.displayState(), camera: { ...this.hexView.camera }, mode: this.hexView.mode,
        colors: [...this.hexView.tileCache].map(([id,c]) => [id, { owner:c.owner, current:c.current.slice(), from:c.from.slice(), at:c.at }]),
        lastBuild: this.hexView.lastBuild, previousSimTime: this.hexView.previousSimTime,
        backend: this.hexView.backend, layout: { ...this.layout } };
    }
    destroy() {
      this.unsubscribe?.(); this.hexView.destroy();
      this.worldCanvas.width = this.worldCanvas.height = this.labelCanvas.width = this.labelCanvas.height = 1;
      super.destroy();
    }
  }
  // Fast rules for the short map. Not part of the archived source profiles.
  const BLITZ = { label: 'Blitz (Short)', filmTempo: 2, incomeMultiplier: 2, aggression: 1, offensiveInterval: 2, marchDuration: 1.5 };
  const PROFILES = { ...HexSim.PROFILES, blitz: BLITZ };
  const FIELD_SOUNDS = {
    battle: { label: 'Gefecht', samples: ['impactMetal_light_000','impactMetal_light_001'], gain: .15, semis: -3, detune: .5 },
    capture: { label: 'Eroberung', samples: ['synth:scrap-pickup'], gain: .15, semis: -7 },
    build: { label: 'Bunkerbau', samples: ['impactWood_medium_000'], gain: .16, semis: -3 },
    hq: { label: 'Hauptquartier gefallen', samples: ['synth:scrap-stone-break'], gain: .26, semis: -4 },
    victory: { label: 'Sieg', samples: ['synth:myco-pling'], gain: .24, semis: -5 },
  };
  const CLASSIC_AUDIO = { ceilingDb: -3, events: {
    dispatch: { label: 'Marsch', samples: ['synth:chime'], gain: .09, semis: -12, detune: .3 },
    ...FIELD_SOUNDS,
  } };
  /* Short map: soft sounds at a fixed, quiet level (no loudness boost) and a
   * plan that lets only the important events sound. `gap` is the shortest
   * pause between two sounds of one kind in video seconds. */
  const SOFT_AUDIO = { ceilingDb: -6, mixProfile: 'marbleworks-soft-v1', fixedGainDb: -3, events: {
    dispatch: { label: 'Marsch', samples: ['mw-soft-wood-0', 'mw-soft-wood-1'], gain: .10, semis: -5, detune: .4, gap: .40 },
    battle: { label: 'Gefecht', samples: ['mw-soft-body-0', 'mw-soft-body-1'], gain: .20, semis: -4, detune: .5, gap: .24 },
    capture: { label: 'Eroberung', samples: ['mw-soft-switch-0', 'mw-soft-switch-1'], gain: .15, semis: -2, detune: .6, gap: .22 },
    build: { label: 'Bunkerbau', samples: ['mw-soft-wood-2'], gain: .16, semis: -3, gap: .5 },
    story: { label: 'Wendepunkt', samples: ['synth:myco-breeze'], gain: .30 },
    hq: { label: 'Krone gefallen', samples: ['synth:myco-pop'], gain: .50, semis: -9 },
    victory: { label: 'Sieg', samples: ['synth:myco-pling'], gain: .32, semis: -5 },
  } };
  const WILDS_AUDIO = { ceilingDb: -3, events: { ...FIELD_SOUNDS,
    capture: { label: 'Eroberung', samples: ['mw-soft-switch-0', 'mw-soft-switch-1'], gain: .12, semis: -4 },
    meteor_warning: { label: 'Meteor nähert sich', samples: ['synth:wind'], gain: .18, semis: -4 },
    meteor_impact: { label: 'Meteoreinschlag', samples: ['synth:thunder'], gain: .44, semis: -4 },
    giant_arrival: { label: 'Riese erscheint', samples: ['synth:thunder'], gain: .20, semis: -8 },
    giant_retreat: { label: 'Schritt des Riesen', samples: ['impactWood_heavy_000'], gain: .30, semis: -7, minGap: 1.5 },
  } };
  const audioFor = params => params?.layout === 'wilds' ? WILDS_AUDIO : params?.layout === 'short' ? SOFT_AUDIO : CLASSIC_AUDIO;
  const RANK = { victory: 0, hq: 1, story: 2, battle: 3, capture: 4, build: 5, dispatch: 6 };
  // Complete, chronological decisions: nothing later can change an earlier one.
  function shortMixPlan(events, { cfg, world }) {
    if (cfg.params.layout !== 'short') return null;
    const clamp = EBS.util.clamp, volume = cfg.video.volume || {}, decisions = new Map(), candidates = [];
    const stats = { total: events.length, audible: 0, unmapped: 0, minor: 0, densitySuppressed: 0, muted: 0 };
    for (const e of events) {
      if (!Number.isInteger(e.seq) || !Number.isFinite(e.step) || decisions.has(e.seq)) throw new Error('Territory: ungültiges Tonereignis.');
      const decision = { seq: e.seq, gain: 0, pan: clamp(((Number.isFinite(e.x) ? e.x : world.w / 2) / world.w - .5) * .5, -.35, .35) };
      decisions.set(e.seq, decision);
      const def = SOFT_AUDIO.events[e.type];
      if (!def) { stats.unmapped++; continue; }
      if (volume[e.type] === 0 || volume.master === 0) { stats.muted++; continue; }
      let weight = 1;
      if (e.type === 'dispatch') {
        // Only larger assault columns are heard; supply traffic stays silent.
        if (!e.move || e.move.kind !== 'attack' || e.move.amount < 12) { stats.minor++; continue; }
        weight = clamp(e.move.amount / 24, .45, 1);
      } else if (e.type === 'capture') weight = e.previous >= 0 ? 1 : .5;
      else if (e.type === 'battle') weight = clamp((e.p || 8) / 20, .5, 1);
      candidates.push({ e, decision, weight, gap: def.gap || 0 });
    }
    candidates.sort((a, b) => a.e.step - b.e.step || RANK[a.e.type] - RANK[b.e.type] || a.e.seq - b.e.seq);
    const last = new Map(), active = [];
    for (const { e, decision, weight, gap } of candidates) {
      while (active.length && e.step - active[0] >= 30) active.shift();        // half a video second
      const previous = last.get(e.type), major = RANK[e.type] <= 2;
      if (!major && ((previous !== undefined && e.step - previous < gap * 60) || active.length >= 2)) { stats.densitySuppressed++; continue; }
      decision.gain = weight; last.set(e.type, e.step); active.push(e.step); stats.audible++;
    }
    return { version: 1, profile: SOFT_AUDIO.mixProfile, events: events.map(e => decisions.get(e.seq)), stats };
  }
  // Plans a video that ends with the first result plus the chosen result hold.
  function victoryPlan(cfg, world) {
    if (cfg.params.videoEnd !== 'victory') return null;
    const sim = new Episode({ seed: cfg.seed, params: cfg.params, world, timeScale: cfg.video.tempo });
    return { advance() {
      for (let i = 0; i < 3600 && sim.completedRounds < 1; i++) sim.stepOnce();
      if (sim.step / 60 > EBS.MAX_DURATION - 20) throw new Error('Territory: Die Runde endet nicht innerhalb der maximalen Videolänge.');
      if (sim.completedRounds < 1) return { done: false };
      const durationSec = Math.ceil((sim.resultStep / 60 + sim.cfg.endPauseSec) * cfg.video.fps) / cfg.video.fps;
      sim.destroy();
      return { done: true, durationSec };
    } };
  }

  EBS.registerScenario({
    id: 'territory', title: 'Territory Wars · Hex Dominion',
    supportsClips: false, supportsCamera: false,
    tempoRange: { min: .25, max: 2, step: .05, default: .75 }, videoDefaults: { tempo: .75 },
    defaults: normalizeParams({}), normalizeParams,
    controls: [
      { key: 'profile', label: 'Spielprofil', type: 'select',
        options: [...Object.entries(PROFILES).map(([key,p]) => [key,p.label]), ['custom','Eigene Einstellungen']],
        presets: Object.fromEntries(Object.entries(PROFILES).map(([key,p]) => [key, {
          params: { profile:key, incomeMultiplier:p.incomeMultiplier, aggression:p.aggression, offensiveInterval:p.offensiveInterval, marchDuration:p.marchDuration },
          video: { tempo:p.filmTempo },
        }])) },
      { key: 'layout', label: 'Kartenform', type: 'select', options: [['landscape','Querformatkarte'],['portrait','Hochformatkarte'],['short','Short-Karte (klein, mit Drehbuch)'],
        ['wilds','Großkarte · Meteor und Riese (Langvideo 16:9)']], videoSets: { wilds: { aspect: '16:9' } },
        restart: true, rebuildUi: true, applyLabel: 'Karte anwenden' },
      { key: 'story', label: 'Drehbuch (Short-Karte)', type: 'select', options: [['crown','Die letzte Krone'],['none','Ohne Drehbuch']], restart: true, enabled: p => p.layout === 'short' },
      { key: 'storySec', label: 'Kriegsdauer (Short-Karte)', type: 'range', min: 40, max: 180, step: 5, restart: true, enabled: p => p.layout === 'short', format: v => `${v} s Spielzeit` },
      { key: 'videoEnd', label: 'Videoende', type: 'select', options: [['free','Freie Dauer'],['victory','Nach dem Sieg']], affectsDuration: true },
      { key: 'display', label: 'Anzeige', type: 'select', options: [['auto','Automatisch (hochkant schlank, quer voll)'],['full','Voll: Titel, Uhr, Fraktionskarten'],['slim','Schlank: Farbbalken und Einblendungen'],['off','Aus']] },
      { key: 'incomeMultiplier', label: 'Nachschub', type: 'range', min: .5, max: 2, step: .1, format: v => `${v}×` },
      { key: 'aggression', label: 'Offensivdrang', type: 'range', min: 0, max: 1, step: .05, format: v => `${Math.round(v*100)} %` },
      { key: 'offensiveInterval', label: 'Angriffsrhythmus', type: 'range', min: 2, max: 8, step: .5, format: v => `${v} s` },
      { key: 'marchDuration', label: 'Marschdauer', type: 'range', min: 1.5, max: 4, step: .1, format: v => `${v} s` },
      { key: 'garrisonMode', label: 'Garnisonen', type: 'select', options: [['front','An der Front'],['always','Immer'],['never','Nie']] },
      { key: 'units', label: 'Einheiten', type: 'select', options: [['tanks','Panzer (Original)'],['soldiers','Speerträger']] },
      { key: 'cameraMode', label: 'Kamerablick', type: 'select', options: [['perspective','Perspektive'],['top','Draufsicht']] },
      { key: 'cameraAzimuth', label: 'Kameradrehung', type: 'range', min: -3.14, max: 3.14, step: .01, enabled: p => p.cameraMode !== 'top', format: v => `${Math.round(v*180/Math.PI)}°` },
      { key: 'cameraElevation', label: 'Kamerahöhe', type: 'range', min: .48, max: 1.55, step: .01, enabled: p => p.cameraMode !== 'top', format: v => `${Math.round(v*180/Math.PI)}°` },
      { key: 'cameraZoom', label: 'Kamerazoom', type: 'range', min: .72, max: 1.8, step: .01, format: v => `${v.toFixed(2)}×` },
      { key: 'highQuality', label: 'Hohe Grafikauflösung', type: 'check' },
      { key: 'showFactions', label: 'Fraktionsstände anzeigen', type: 'check' },
      { key: 'showClock', label: 'Uhr und Runde anzeigen', type: 'check' },
      { key: 'showWinner', label: 'Sieger anzeigen', type: 'check' },
      { key: 'repeatRounds', label: 'Weitere Runden spielen', type: 'check' },
      { key: 'endPauseSec', label: 'Ergebnis zeigen', type: 'range', min: 2, max: 15, step: 1, format: v => `${v} s` },
    ],
    create: ctx => new Episode(ctx), createRenderer: ctx => new TerritoryRenderer(ctx),
    reframe: (renderer, ctx) => { ctx.sim.world = ctx.world; renderer.resize(ctx); },
    panelStats(sim) {
      const r = sim.roundSim;
      return [
        { key: 'round', label: 'Runde', value: sim.roundNumber },
        { key: 'roundTime', label: 'Rundenzeit', value: EBS.util.fmtTime(r.time) },
        { key: 'alive', label: 'Reiche aktiv', value: r.factions.filter(f => f.alive).length },
        { key: 'captures', label: 'Eroberungen', value: r.roundStats.captures },
        { key: 'battles', label: 'Gefechte', value: r.roundStats.battles },
        { key: 'marches', label: 'Märsche', value: r.moves.length },
      ];
    },
    panelNote: sim => sim.roundSim.phase === 'finished' ? `${TEAMS[sim.roundSim.winner].name} vereint die vier Reiche.`
      : 'Vier Hauptquartiere. Ein Kontinent. Ausgabewechsel erhält die Karte; „Karte anwenden“ startet neu.',
    audio: CLASSIC_AUDIO, audioForParams: audioFor, createAudioMixPlan: shortMixPlan,
    hasNaturalDuration: cfg => cfg.params.videoEnd === 'victory', createExportPlan: victoryPlan,
    durationLabel: { pending: 'Rundenverlauf wird berechnet …', complete: 'Automatisch: bis zum Sieg plus „Ergebnis zeigen“.' },
  });
})();
