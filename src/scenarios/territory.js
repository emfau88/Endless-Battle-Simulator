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
  function frameLayout(world, params) {
    const portrait = world.h > world.w, cards = params.showFactions;
    const top = 105, bottom = portrait && cards ? 244 : 0;
    const side = !portrait && cards ? 332 : 0;
    return { portrait, x: 0, y: top, w: world.w - side, h: world.h - top - bottom,
      cardsX: portrait ? 24 : world.w - side + 12, cardsY: portrait ? world.h - bottom + 18 : 120,
      cardsW: portrait ? world.w - 48 : side - 36 };
  }

  class TerritoryRenderer extends EBS.CanvasScene {
    constructor(ctx) {
      super(ctx);
      this.sim = ctx.sim; this.view = ctx.view; this.video = ctx.video;
      this.worldCanvas = document.createElement('canvas');
      this.labelCanvas = document.createElement('canvas');
      this.hexView = new HexView(this.worldCanvas);
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
      const key = [l.w, l.h, dpr, this.video.aspect].join('|');
      this.layout = l;
      if (force || key !== this.viewportKey) {
        this.viewportKey = key;
        this.hexView.resize(l.w, l.h, dpr);
        this.overlay.resize(l.w, l.h, dpr, l.portrait ? 'portrait' : 'landscape');
      }
      this.hexView.mode = p.cameraMode;
      this.hexView.camera.azimuth = p.cameraMode === 'top' ? 0 : p.cameraAzimuth;
      this.hexView.camera.elevation = p.cameraMode === 'top' ? 1.48 : p.cameraElevation;
      this.hexView.camera.zoom = p.cameraZoom;
    }
    paint(g) {
      this.updateViewport();
      const s = this.sim, r = s.roundSim, p = s.cfg, l = this.layout;
      const remainder = r.phase === 'running' ? s.accumulator : 0;
      this.overlay.observe(r);
      this.hexView.render(r, r.time + remainder, { selected: null, hover: null, showUnits: true, quality: p.highQuality ? 'high' : 'low' });
      this.overlay.draw(remainder, p);
      g.fillStyle = '#09171f'; g.fillRect(0, 0, this.world.w, this.world.h);
      g.drawImage(this.worldCanvas, l.x, l.y, l.w, l.h);
      g.drawImage(this.labelCanvas, l.x, l.y, l.w, l.h);
      if (this.view.hud) this.hud(g);
      if (p.showWinner && r.phase === 'finished') this.winner(g);
    }
    hud(g) {
      const r = this.sim.roundSim, p = this.sim.cfg, l = this.layout;
      text(g, 'TERRITORY WARS', 28, 27, 12, '#8aa5ad', 'left', true);
      text(g, 'HEX DOMINION', 28, 57, 29, '#e4efe7');
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
  EBS.registerScenario({
    id: 'territory', title: 'Territory Wars · Hex Dominion',
    supportsClips: false, supportsCamera: false,
    tempoRange: { min: .25, max: 2, step: .05, default: .75 }, videoDefaults: { tempo: .75 },
    defaults: normalizeParams({}), normalizeParams,
    controls: [
      { key: 'profile', label: 'Spielprofil', type: 'select',
        options: [...Object.entries(HexSim.PROFILES).map(([key,p]) => [key,p.label]), ['custom','Eigene Einstellungen']],
        presets: Object.fromEntries(Object.entries(HexSim.PROFILES).map(([key,p]) => [key, {
          params: { profile:key, incomeMultiplier:p.incomeMultiplier, aggression:p.aggression, offensiveInterval:p.offensiveInterval, marchDuration:p.marchDuration },
          video: { tempo:p.filmTempo },
        }])) },
      { key: 'layout', label: 'Kartenform', type: 'select', options: [['landscape','Querformatkarte'],['portrait','Hochformatkarte']], restart: true, applyLabel: 'Karte anwenden' },
      { key: 'incomeMultiplier', label: 'Nachschub', type: 'range', min: .5, max: 2, step: .1, format: v => `${v}×` },
      { key: 'aggression', label: 'Offensivdrang', type: 'range', min: 0, max: 1, step: .05, format: v => `${Math.round(v*100)} %` },
      { key: 'offensiveInterval', label: 'Angriffsrhythmus', type: 'range', min: 2, max: 8, step: .5, format: v => `${v} s` },
      { key: 'marchDuration', label: 'Marschdauer', type: 'range', min: 1.5, max: 4, step: .1, format: v => `${v} s` },
      { key: 'garrisonMode', label: 'Garnisonen', type: 'select', options: [['front','An der Front'],['always','Immer'],['never','Nie']] },
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
    audio: { ceilingDb: -3, events: {
      dispatch: { label: 'Marsch', samples: ['synth:chime'], gain: .09, semis: -12, detune: .3 },
      battle: { label: 'Gefecht', samples: ['impactMetal_light_000','impactMetal_light_001'], gain: .15, semis: -3, detune: .5 },
      capture: { label: 'Eroberung', samples: ['synth:scrap-pickup'], gain: .15, semis: -7 },
      build: { label: 'Bunkerbau', samples: ['impactWood_medium_000'], gain: .16, semis: -3 },
      hq: { label: 'Hauptquartier gefallen', samples: ['synth:scrap-stone-break'], gain: .26, semis: -4 },
      victory: { label: 'Sieg', samples: ['synth:myco-pling'], gain: .24, semis: -5 },
    } },
  });
})();
