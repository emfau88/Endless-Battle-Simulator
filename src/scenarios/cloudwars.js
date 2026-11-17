/*
 * Szenario „Cloud Wars“ (in Arbeit) – Plan: docs/CLOUD_WARS_PLAN_2026-11-18.md
 *
 * Stand Paket C0: Gerüst und Gelände. Der Seed wählt einen festen Ausschnitt der Landschaft aus dem Prototyp
 * „Wolkenflug“ (Wald, Felder, Seen, Straßen, Dörfer); er wird einmal vorgezeichnet. Noch keine Wolken.
 * Maßstab: 1 Geländeeinheit (GE) = 1,4 logische Einheiten (Hochformat 1 080 × 1 920 → 771 × 1 371 GE).
 */
(function () {
'use strict';
const { fnv1a } = EBS.util;
const T = EBS.CloudWarsTerrain;
const GE_SCALE = 1.4;

const defaults = { mode: 'short' };
function normalizeParams(input) {
  const p = { ...defaults, ...input };
  return { mode: ['short', 'rounds'].includes(p.mode) ? p.mode : defaults.mode };
}

class CloudWarsSim {
  constructor({ seed, params, world, timeScale = 1 }) {
    this.seed = seed >>> 0; this.cfg = normalizeParams(params);
    this.dt = EBS.DT * timeScale; this.step = 0; this.t = 0;
    this.events = new Array(256); this.eventSeq = 0;
    // Ausschnitt in Geländeeinheiten: Die logische Welt geteilt durch den Maßstab
    this.area = T.pickArea(this.seed, Math.round(world.w / GE_SCALE), Math.round(world.h / GE_SCALE));
    this.audioWorldWidth = world.w;
  }
  setParam(k, v) { this.cfg = normalizeParams({ ...this.cfg, [k]: v }); }
  stepOnce() { this.step++; this.t = this.step * this.dt; }
  checkInvariants() {
    const a = this.area, errors = [];
    if (![a.x, a.y, a.w, a.h].every(Number.isFinite)) errors.push('Ausschnitt ungültig');
    return { ok: errors.length === 0, errors, bodies: 0 };
  }
  snapshot() {
    const a = this.area, pct = (v) => Math.round(v * 100);
    return {
      t: this.t, step: this.step, area: { ...a },
      summary: `Gelände: Wasser ${pct(a.water)} %, Wald ${pct(a.forest)} %, Felder ${pct(a.field)} %, ${a.villages} Dorf/Dörfer`
        + (a.miss ? ` · ${a.miss} Regel(n) verfehlt` : ''),
    };
  }
  stateHash() { const a = this.area; return fnv1a(`${this.step}|${a.x}|${a.y}|${a.w}|${a.h}`).toString(16).padStart(8, '0'); }
  destroy() {}
}

class CloudWarsRenderer extends EBS.CanvasScene {
  constructor({ sim, view, world, renderScale = 1 }) {
    super({ world, renderScale });
    this.sim = sim; this.view = view; this.ground = null;
  }
  paint(g) {
    const w = this.world, a = this.sim.area;
    // Gelände einmal vorzeichnen, in der Schärfe des Ausgabebilds (Pixel je GE)
    if (!this.ground) this.ground = T.renderArea(a, GE_SCALE * this.scale);
    g.fillStyle = '#7f9b62'; g.fillRect(0, 0, w.w, w.h);
    g.drawImage(this.ground, 0, 0, a.w * GE_SCALE, a.h * GE_SCALE);
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
    return [
      { key: 'water', label: 'Wasser', value: pct(a.water) }, { key: 'forest', label: 'Wald', value: pct(a.forest) },
      { key: 'field', label: 'Felder', value: pct(a.field) }, { key: 'villages', label: 'Dörfer', value: String(a.villages) },
    ];
  },
  panelNote: (sim) => sim.snapshot().summary,
});
EBS.CloudWars = { GE_SCALE };
})();
