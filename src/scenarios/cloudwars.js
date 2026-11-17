/*
 * Szenario „Cloud Wars“ (in Arbeit) – Plan: docs/CLOUD_WARS_PLAN_2026-11-18.md
 *
 * Stand Paket C1: Der Seed wählt einen festen Ausschnitt der Landschaft aus dem Prototyp „Wolkenflug“; er wird einmal
 * vorgezeichnet. Darüber treiben Team-Wolken und neutrale Wolken (Simulation: cloudwars/simulation.js). Die Wolken
 * sind bis Paket C2 nur einfache Scheiben.
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
  }
  paint(g) {
    const w = this.world, a = this.sim.area, k = this.sim.geScale;
    // Gelände einmal vorzeichnen, in der Schärfe des Ausgabebilds (Pixel je GE)
    if (!this.ground) this.ground = T.renderArea(a, k * this.scale);
    g.fillStyle = '#7f9b62'; g.fillRect(0, 0, w.w, w.h);
    g.drawImage(this.ground, 0, 0, a.w * k, a.h * k);
    // Platzhalter bis Paket C2: einfache Scheiben mit Teamfarbe, damit der Ablauf sichtbar ist
    g.save(); g.scale(k, k);
    for (const c of this.sim.clouds) {
      const r = S.radiusOf(c.mass);
      g.fillStyle = 'rgba(20,30,40,0.18)'; g.beginPath(); g.arc(c.x + r * 0.25, c.y + r * 0.4, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = c.team < 0 ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(c.x, c.y, r, 0, Math.PI * 2); g.fill();
      if (c.team >= 0) { g.strokeStyle = S.TEAMS[c.team].color; g.lineWidth = 3; g.stroke(); }
    }
    g.restore();
  }
  destroy() { if (this.ground) this.ground.width = this.ground.height = 1; super.destroy(); }
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
