/*
 * Szenario „Cloud Wars“ (in Arbeit) – Plan: docs/CLOUD_WARS_PLAN_2026-11-18.md
 *
 * Stand Paket C4: Der Seed wählt einen festen Ausschnitt der Landschaft aus dem Prototyp „Wolkenflug“; er wird einmal
 * vorgezeichnet. Darüber treiben Team-Wolken und neutrale Wolken (Simulation: cloudwars/simulation.js). Paket C2:
 * Wolken im Stil des Prototyps mit Teamfarbe, Augen, Namensschild und fliegenden Puffs (cloudwars/art.js).
 * Maßstab je Format (Wunsch des Nutzers: „auf Handy und PC jeweils passend“): Hochformat näher, 1 GE = 2,0 logische
 * Einheiten (1 080 × 1 920 → 540 × 960 GE); Querformat weiter, 1 GE = 1,4 (1 920 × 1 080 → 1 371 × 771 GE).
 */
(function () {
'use strict';
const T = EBS.CloudWarsTerrain, S = EBS.CloudWarsSim;
const scaleFor = (world) => (world.h > world.w ? 2.0 : 1.4);

const defaults = { mode: 'short' };
function normalizeParams(input) {
  const p = { ...defaults, ...input };
  return { mode: ['short', 'rounds'].includes(p.mode) ? p.mode : defaults.mode };
}

class CloudWarsSim extends EBS.CloudWarsSim.CloudWarsSimulation {
  constructor({ seed, params, world, timeScale = 1 }) {
    const cfg = normalizeParams(params), geScale = scaleFor(world);
    // Ausschnitt in Geländeeinheiten: die logische Welt geteilt durch den Maßstab
    const area = T.pickArea(seed >>> 0, Math.round(world.w / geScale), Math.round(world.h / geScale));
    super({ seed, params: cfg, area, dt: EBS.DT * timeScale });
    this.geScale = geScale; this.audioWorldWidth = world.w;
  }
  setParam(k, v) { this.cfg = normalizeParams({ ...this.cfg, [k]: v }); }
  checkInvariants() {
    const r = super.checkInvariants(), a = this.area;
    if (![a.x, a.y, a.w, a.h].every(Number.isFinite)) { r.errors.push('Ausschnitt ungültig'); r.ok = false; }
    return r;
  }
  snapshot() {
    const mass = this.teamMass(), teams = S.TEAMS.map((tm, i) => ({ name: tm.name, mass: mass[i], clouds: this.clouds.filter((c) => c.team === i).length }));
    const alive = teams.filter((tm) => tm.mass > 0).length, neutrals = this.clouds.filter((c) => c.team < 0).length;
    const maxMass = Math.max(0, ...this.clouds.filter((c) => c.team >= 0).map((c) => c.mass));
    return {
      t: this.t, step: this.step, area: { ...this.area }, round: this.round, scores: [...this.scores], winner: this.winner,
      ended: this.endAt >= 0, endAt: this.endAt, roundStart: this.roundStart, teams, alive, neutrals, maxMass,
      fires: this.fire.burning.length, burned: this.burnedShare(), trucks: this.trucks.length,
      storms: this.clouds.filter((c) => c.kind === 1 && c.team >= 0).length, neutralStorms: this.clouds.filter((c) => c.kind && c.team < 0).length,
      geScale: this.geScale, eats: this.eats.map((e) => ({ mass: e.mass, age: this.t - e.t0, x: e.x, y: e.y, team: e.team })),
      summary: `Runde ${this.round} · ${alive} Teams übrig · größte Wolke ${maxMass.toFixed(1)}`
        + (this.winner >= 0 ? ` · Sieger ${S.TEAMS[this.winner].name}` : ''),
    };
  }
  destroy() {}
}

class CloudWarsRenderer extends EBS.CanvasScene {
  constructor({ sim, view, world, renderScale = 1 }) {
    super({ world, renderScale });
    this.sim = sim; this.view = view; this.ground = null;
    this.art = new EBS.CloudWarsArt.CloudArt({ radiusOf: S.radiusOf, teams: S.TEAMS });
    this.fx = new EBS.CloudWarsEffects.Effects({ radiusOf: S.radiusOf, storms: EBS.CloudWarsStorms, lift: EBS.CloudWarsArt.STYLE.lift / sim.geScale });
    this.atmo = new EBS.CloudWarsAtmosphere.Atmosphere(sim);
  }
  paint(g) {
    const w = this.world, a = this.sim.area, k = this.sim.geScale;
    // Gelände einmal vorzeichnen, in der Schärfe des Ausgabebilds (Pixel je GE)
    if (!this.ground) this.ground = T.renderArea(a, k * this.scale);
    g.fillStyle = '#7f9b62'; g.fillRect(0, 0, w.w, w.h);
    g.drawImage(this.ground, 0, 0, a.w * k, a.h * k);
    const sim = this.sim, px = k * this.scale, St = EBS.CloudWarsStory, mode = sim.cfg.mode;
    const L = St.light(St.dayAt(sim.t, mode)), wx = St.weatherAt(sim.seed, sim.t, mode), night = L.night;
    // Abendschatten länger, nachts schwach (Paket C4)
    const eve = Math.max(0, Math.min(1, (L.day - 0.42) / 0.14)) * (L.day < 0.7 ? 1 : 0);
    const STY = EBS.CloudWarsArt.STYLE, shadow = { dx: STY.shadow[0] * (1 + 1.4 * eve), dy: STY.shadow[1] * (1 + 0.6 * eve), alpha: STY.shadowAlpha * (1 - 0.7 * night) };
    g.save(); g.scale(k, k);
    // Boden: Brandflächen, Feuer, Feuerwehr, Autos, Boote, Rauch (Pakete C3, C4)
    g.drawImage(this.fx.scarLayer(sim, px), 0, 0, a.w, a.h);
    if (wx.kind === 'heat') { g.fillStyle = `rgba(255,196,110,${0.08 * wx.fade})`; g.fillRect(0, 0, a.w, a.h); }
    this.fx.drawFires(g, sim, night);
    this.atmo.drawCars(g, sim, night);
    this.atmo.drawBoats(g, sim);
    this.fx.drawTrucks(g, sim);
    this.fx.drawSmoke(g, sim);
    this.atmo.drawBirds(g, sim);
    // Wolken mit Schatten; Regen zwischen Schatten und Wolken
    this.art.draw(g, sim, k, px, { shadow, beforeClouds: () => this.fx.drawRain(g, sim) });
    this.atmo.drawFog(g, sim, wx.kind === 'fog' ? wx.fade : 0);
    g.restore();
    // Tageslicht, danach Lichter und Blitze (sie leuchten auch nachts hell)
    this.atmo.tint(g, w, L);
    g.save(); g.scale(k, k);
    this.atmo.drawLights(g, sim, night);
    if (night > 0.05) { g.globalAlpha = night * 0.6; this.fx.drawFires(g, sim, night); g.globalAlpha = 1; }
    this.fx.drawBolts(g, sim, k);
    g.restore();
    const fl = this.fx.flash(sim);
    if (fl > 0) { g.fillStyle = `rgba(235,242,255,${fl})`; g.fillRect(0, 0, w.w, w.h); }
    this.art.drawLabels(g, sim, k);
  }
  destroy() { if (this.ground) this.ground.width = this.ground.height = 1; this.art.destroy(); this.fx.destroy(); super.destroy(); }
}

EBS.registerScenario({
  id: 'cloudwars',
  title: 'Cloud Wars (in Arbeit)',
  defaults,
  controls: [
    { key: 'mode', label: 'Ablauf', type: 'select', restart: true, options: [['short', 'Short (rund 30 s)'], ['rounds', 'Runden (Langvideo)']] },
  ],
  normalizeParams,
  create: (ctx) => new CloudWarsSim(ctx),
  createRenderer: (ctx) => new CloudWarsRenderer(ctx),
  panelStats(sim) {
    const a = sim.area, pct = (v) => `${Math.round(v * 100)} %`;
    const snap = sim.snapshot();
    return [
      ...snap.teams.map((tm, i) => ({ key: 'team' + i, label: tm.name, value: tm.mass > 0 ? tm.mass.toFixed(1) : 'raus' })),
      { key: 'round', label: 'Runde', value: String(snap.round) },
      { key: 'water', label: 'Wasser', value: pct(a.water) }, { key: 'forest', label: 'Wald', value: pct(a.forest) },
    ];
  },
  panelNote: (sim) => sim.snapshot().summary,
});
EBS.CloudWars = { scaleFor };
})();
