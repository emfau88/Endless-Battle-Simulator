/*
 * Szenario „Cloud Wars“ (in Arbeit) – Plan: docs/CLOUD_WARS_PLAN_2026-11-18.md
 *
 * Stand Paket C8: Der Seed wählt einen festen Ausschnitt der Landschaft aus dem Prototyp „Wolkenflug“; er wird einmal
 * vorgezeichnet. Darüber treiben Team-Wolken und neutrale Wolken (Simulation: cloudwars/simulation.js). Paket C2:
 * Wolken im Stil des Prototyps mit Teamfarbe, Augen, Namensschild und fliegenden Puffs (cloudwars/art.js).
 * Maßstab je Format (Wunsch des Nutzers: „auf Handy und PC jeweils passend“): Hochformat näher, 1 GE = 2,0 logische
 * Einheiten (1 080 × 1 920 → 540 × 960 GE); Querformat weiter, 1 GE = 1,4 (1 920 × 1 080 → 1 371 × 771 GE).
 */
(function () {
'use strict';
const T = EBS.CloudWarsTerrain, S = EBS.CloudWarsSim;
const scaleFor = (world) => (world.h > world.w ? 2.0 : 1.4);

const defaults = { mode: 'short', display: 'auto', director: 'on', videoEnd: 'victory' };
// Short: Ausklang nach dem Sieg, erlaubte Länge (Vorprüfung beim Export) und die Seeds, bei denen die verdeckte Regie
// ihre ganze Geschichte erzählt (aus `node scripts/cloudwars-short-casting.mjs --list`, Seeds 1–300; Paket C7).
// Nach jeder Änderung an Simulation oder Regie neu erzeugen; der Test prüft die ersten Einträge.
const SHORT = {
  outroSec: 1.5, lengthSec: [24, 38],
  seeds: [2,4,5,8,12,14,15,16,18,20,28,31,35,36,39,41,44,45,48,52,53,54,58,61,63,66,73,74,75,76,77,80,81,82,83,85,87,88,89,90,93,99,101,102,104,108,109,110,111,116,118,119,129,130,131,132,133,135,136,140,142,143,146,149,150,151,156,158,164,168,169,172,173,174,178,179,183,188,191,192,196,202,204,206,207,208,215,216,217,218,219,222,224,232,233,234,235,237,238,243,246,247,248,249,252,253,261,262,263,265,266,269,273,274,280,281,282,283,284,286,287,288,289,296,297,300],
};
/** Nächster geprüfter Short-Seed ab seed (ringsum). */
const castSeed = (seed) => SHORT.seeds.find((s) => s >= seed) ?? SHORT.seeds[0];

// Ton (Paket C6): weiche Klänge, feste Mischung wie Marble XL (fester Grundpegel, kein Nachnormalisieren).
const AUDIO_EVENTS = {
  win: { label: 'Sieg', samples: ['synth:fanfare'], gain: 0.22, semis: -3, detune: 0, minGap: 2 },
  eliminated: { label: 'Team scheidet aus', samples: ['synth:chime'], gain: 0.2, semis: -7, detune: 0.2, minGap: 1 },
  storm: { label: 'Wird Gewitter', samples: ['synth:myco-night'], gain: 0.26, semis: -5, detune: 0.3, minGap: 2 },
  strike: { label: 'Donner (Bodenblitz)', samples: ['synth:thunder'], gain: 0.5, ref: 1, detune: 1.5, minGap: 1.2 },
  zap: { label: 'Donner (Treffer)', samples: ['synth:thunder'], gain: 0.55, semis: 1, detune: 1.5, minGap: 1.2 },
  absorb: { label: 'Wolke frisst', samples: ['synth:myco-pop'], gain: 0.16, semis: 2, detune: 2, minGap: 0.25, scale: [0, 2, 4, 7] },
  charged: { label: 'Aufgeladen', samples: ['synth:myco-pling'], gain: 0.1, semis: -5, detune: 0.3, minGap: 2 },
  fire: { label: 'Feuer knistert', samples: ['synth:scrap-pickup'], gain: 0.05, semis: -14, detune: 2, minGap: 1.5 },
  extinguish: { label: 'Feuer gelöscht', samples: ['synth:splash'], gain: 0.06, semis: -4, detune: 2, minGap: 1.5 },
  truck: { label: 'Feuerwehr', samples: ['synth:squeak'], gain: 0.05, semis: -9, detune: 0.5, minGap: 4 },
  gust: { label: 'Wind', samples: ['synth:wind'], gain: 0.2, ref: 1, detune: 1, minGap: 3 },
};
const AUDIO_ORDER = Object.keys(AUDIO_EVENTS), AUDIO_KEY = 6;     // die ersten sechs haben Vorrang
/** Fester Mischplan: höchstens zwei Klänge je 0,6 s (Wind zählt nicht mit), Stereo nach Ort im Ausschnitt. */
function createAudioMixPlan(events, { cfg }) {
  const volume = (cfg.video && cfg.video.volume) || {}, decisions = new Map(), cand = [];
  const W = ({ '9:16': 540, '1:1': 771 })[cfg.video && cfg.video.aspect] || 1371;     // Ausschnittbreite in GE je Format
  for (const e of events) {
    const d = { seq: e.seq, gain: 0, pan: Math.max(-0.35, Math.min(0.35, ((e.x || 0) / W - 0.5) * 0.7)) }; decisions.set(e.seq, d);
    const def = AUDIO_EVENTS[e.type];
    if (!def || volume[e.type] === 0 || volume.master === 0) continue;
    if (e.type === 'gust') { d.gain = 1; d.pan = 0; continue; }
    cand.push({ e, d, minGap: def.minGap || 0, rank: AUDIO_ORDER.indexOf(e.type) });
  }
  cand.sort((a, b) => a.e.step - b.e.step || a.rank - b.rank || a.e.seq - b.e.seq);
  const taken = [], free = (step) => { let n = 0; for (let i = taken.length - 1; i >= 0 && n < 2; i--) if (Math.abs(taken[i] - step) < 0.3 * 60) n++; return n < 2; };
  for (const pass of [0, 1]) {
    const last = new Map();
    for (const { e, d, minGap, rank } of cand) {
      if ((rank < AUDIO_KEY) !== (pass === 0)) continue;
      const prev = last.get(e.type);
      if ((prev !== undefined && e.step - prev < minGap * 60) || !free(e.step)) continue;
      d.gain = 0.8; last.set(e.type, e.step); taken.push(e.step);
    }
  }
  return { version: 1, profile: 'marbleworks-soft-v1', events: events.map((e) => decisions.get(e.seq)) };
}
function normalizeParams(input) {
  const p = { ...defaults, ...input };
  return {
    mode: ['short', 'rounds'].includes(p.mode) ? p.mode : defaults.mode,
    display: ['auto', 'full', 'slim', 'off'].includes(p.display) ? p.display : defaults.display,
    director: p.director === 'off' ? 'off' : 'on',
    videoEnd: p.videoEnd === 'free' ? 'free' : 'victory',
  };
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
      banners: EBS.CloudWarsLayout ? EBS.CloudWarsLayout.banners(this, S.TEAMS).map((x) => ({ text: x.text, age: this.t - x.start })) : [],
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
    this.layout = new EBS.CloudWarsLayout.Layout({ teams: S.TEAMS, world });
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
    // Anzeige und Einblendungen (Paket C5)
    this.layout.draw(g, sim, w, sim.cfg, this.view || {});
  }
  destroy() { if (this.ground) this.ground.width = this.ground.height = 1; this.art.destroy(); this.fx.destroy(); super.destroy(); }
}

EBS.registerScenario({
  id: 'cloudwars',
  title: 'Cloud Wars (in Arbeit)',
  defaults,
  controls: [
    { key: 'mode', label: 'Ablauf', type: 'select', restart: true, options: [['short', 'Short (rund 30 s)'], ['rounds', 'Runden (Langvideo)']] },
    { key: 'videoEnd', label: 'Short-Ende', type: 'select', affectsDuration: true, options: [['victory', 'Mit dem Sieg (Länge automatisch)'], ['free', 'Freie Länge']] },
    { key: 'director', label: 'Regie (Short)', type: 'select', restart: true, options: [['on', 'An: verdeckte Rollen'], ['off', 'Aus: freier Ablauf']] },
    { key: 'display', label: 'Anzeige', type: 'select', options: [['auto', 'Automatisch (hochkant schlank, quer voll)'], ['full', 'Voll: Punktestand, Runde, Uhrzeit'], ['slim', 'Schlank: Farbpunkte und Einblendungen'], ['off', 'Aus']] },
  ],
  supportsCamera: false, supportsClips: true,                      // Ausschnitte: der Renderer hält keinen Zustand zwischen Bildern
  audio: { events: AUDIO_EVENTS, mixProfile: 'marbleworks-soft-v1', fixedGainDb: 3, ceilingDb: -6 },
  createAudioMixPlan,
  hasNaturalDuration: (cfg) => cfg.params.mode === 'short' && cfg.params.videoEnd === 'victory',
  createExportPlan: (cfg, world) => shortPlan(cfg, world),
  durationLabel: { pending: 'Ablauf des Shorts wird berechnet …', complete: 'Automatisch: bis zum Sieg plus 1,5 s Ausklang (24–38 s).' },
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
/** Short: Länge aus dem Ablauf (Sieg + Ausklang); außerhalb von 24–38 s bricht die Vorprüfung mit einem Hinweis ab. */
function shortPlan(cfg, world) {
  if (cfg.params.mode !== 'short' || cfg.params.videoEnd !== 'victory') return null;
  const sim = new CloudWarsSim({ seed: cfg.seed, params: cfg.params, world, timeScale: cfg.video.tempo });
  return { advance() {
    for (let i = 0; i < 1800 && sim.endAt < 0; i++) sim.stepOnce();
    if (sim.endAt < 0 && sim.t < 90) return { done: false };
    if (sim.endAt < 0) throw new Error(`Cloud Wars: Seed ${cfg.seed} findet in 90 s keinen Sieger. Passende Seeds: node scripts/cloudwars-short-casting.mjs --list`);
    const fps = cfg.video.fps, durationSec = Math.ceil((sim.endAt / (cfg.video.tempo || 1) + SHORT.outroSec) * fps) / fps;
    const [lo, hi] = SHORT.lengthSec;
    if (durationSec < lo || durationSec > hi) {
      throw new Error(`Cloud Wars: Seed ${cfg.seed} ergibt ein Short von ${durationSec.toFixed(1)} s (erlaubt ${lo}–${hi} s). Die Short-Vorlage wählt geprüfte Seeds, z. B. ${castSeed(cfg.seed + 1)}.`);
    }
    return { done: true, durationSec };
  } };
}

EBS.CloudWars = { scaleFor, SHORT, castSeed };
})();
