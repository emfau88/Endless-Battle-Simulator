/*
 * Cloud Wars – Simulation (Paket C1): Team-Wolken, neutrale Wolken, Wind, Steuerung, Fressen, Runden.
 * Plan: docs/CLOUD_WARS_PLAN_2026-11-18.md, Abschnitt 3. Alle Längen in Geländeeinheiten (GE), Ursprung = linke obere
 * Ecke des Ausschnitts. Zufall nur aus zwei eigenen Strömen (Ablauf, festgehaltene Aussehenswerte).
 */
(function () {
'use strict';
const { fnv1a } = EBS.util;
const T = EBS.CloudWarsTerrain;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

const TEAMS = [
  { name: 'NIMBUS', color: '#ff725e' }, { name: 'CIRRUS', color: '#54dce8' },
  { name: 'CUMULUS', color: '#ffce63' }, { name: 'STRATUS', color: '#b0e779' },
];
// Startwerte aus dem Plan (Abschnitt 3)
const RULES = {
  radius: 12, startMass: 4, maxSpeed: 70, speedMass: 0.04,
  eatRatio: 1.1, teamEatRatio: { short: 1.1, rounds: 2.2 }, fleeRangeMode: { short: 3, rounds: 4 }, eatReach: 0.25, eatTime: 0.7, eatGain: 0.85, gainRef: 25, gainMin: 0.35,
  evapFrom: 12, evapRate: 0.006, waterGain: 0.3, waterUpTo: 20, massCap: 120,
  neutralMin: 0.6, neutralMax: 3, neutralPerArea: 18 / (771 * 1371), neutralLo: 10, neutralHi: 22, spawnRate: 1.5,
  wind: 10, windSwing: 0.6, windPeriod: 90,
  decide: 0.25, turnRate: Math.PI / 2, fleeRange: 3, preyBias: 80, enemyBonus: 1.5,
  tankBelow: 8, tankPreyRange: 300, edge: 60, roundLimit: 360, roundPause: 4,
};
const POOL = 4 * 3 + 28;                       // höchstens 12 Team-Wolken und 28 neutrale
const radiusOf = (m) => RULES.radius * Math.sqrt(m);
const speedOf = (m) => RULES.maxSpeed / Math.sqrt(1 + RULES.speedMass * m);

class CloudWarsSimulation {
  constructor({ seed, params, area, dt }) {
    this.seed = seed >>> 0; this.cfg = params; this.area = area; this.dt = dt;
    this.step = 0; this.t = 0;
    this.rngFlow = new EBS.RNG((this.seed ^ 0x9e3779b9) >>> 0);
    this.rngFx = new EBS.RNG((Math.imul(this.seed, 31) + 7) >>> 0);
    this.events = new Array(1024); this.eventSeq = 0;
    this.notes = [];                                               // Einblendungen (Paket C5), nur gelesen vom Renderer
    this.windBase = this.rngFlow.next() * TAU;
    this.teamsCount = 4;
    this.perTeam = params.mode === 'rounds' ? 2 : 1;
    this.teamRatio = RULES.teamEatRatio[params.mode] || RULES.eatRatio;
    this.fleeRange = RULES.fleeRangeMode[params.mode] || RULES.fleeRange;
    this.neutralTarget = Math.round(clamp(RULES.neutralPerArea * area.w * area.h, RULES.neutralLo, RULES.neutralHi));
    this.buildWater();
    this.initStorms();
    this.clouds = []; this.nextId = 1; this.eats = [];
    this.round = 1; this.scores = [0, 0, 0, 0]; this.winner = -1; this.roundStart = 0; this.endAt = -1;
    // Verdeckte Regie nur im Short (Paket C7); director 'off' schaltet sie für Vergleiche ab
    const St = EBS.CloudWarsStory;
    this.roles = params.mode === 'short' && params.director !== 'off' && St ? St.roles(this.seed) : null;
    this.mods = [0, 1, 2, 3].map(() => ({ speed: 1, flee: 1, prey: 1, rain: 1, gain: 1, evap: 1, bonus: [1, 1, 1, 1] }));
    this.startRound(true);
  }

  // ---------- Gelände: Wasserraster (24 GE) für „über Wasser“ und das Tanken ----------
  buildWater() {
    const a = this.area, c = 24, nx = Math.ceil(a.w / c), ny = Math.ceil(a.h / c);
    this.water = { c, nx, ny, grid: new Uint8Array(nx * ny), cells: [] };
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = (i + 0.5) * c, y = (j + 0.5) * c;
      if (T.isWaterAt(a.x + x, a.y + y)) { this.water.grid[j * nx + i] = 1; this.water.cells.push(x, y); }
    }
  }
  overWater(x, y) {
    const w = this.water, i = Math.floor(x / w.c), j = Math.floor(y / w.c);
    return i >= 0 && j >= 0 && i < w.nx && j < w.ny && w.grid[j * w.nx + i] === 1;
  }

  wind() {
    const ang = this.windBase + RULES.windSwing * Math.sin(this.t / RULES.windPeriod), v = RULES.wind * (this.weatherNow().wind || 1);
    return { x: Math.cos(ang) * v, y: Math.sin(ang) * v, ang };
  }

  emit(type, x, y, p, c) {
    this.events[this.eventSeq % this.events.length] = { seq: this.eventSeq, step: this.step, t: this.t, type, x, y, p, c };
    this.eventSeq++;
    if (c >= 0 && (type === 'storm' || type === 'eliminated' || type === 'win')) this.note(type, c);
  }

  /** Einblendung merken. Gewitter je Team höchstens alle 25 s, damit der Wechsel an der Schwelle nicht flackert. */
  note(type, team) {
    if (type === 'storm' && this.notes.some((n) => n.type === 'storm' && n.team === team && this.t - n.t < 25)) return;
    this.notes.push({ t: this.t, type, team, round: this.round });
    if (this.notes.length > 40) this.notes.shift();
  }

  addCloud(team, mass, x, y) {
    const c = {
      id: this.nextId++, team, mass, x, y, vx: 0, vy: 0, kind: 0, charged: 0, boltAt: 0, hx: 1, hy: 0, wander: this.rngFlow.next() * TAU,
      tx: 0, ty: 0, eat: null, dead: false, born: this.t, puffSeed: (this.rngFx.next() * 4294967296) >>> 0,
    };
    this.clouds.push(c);
    return c;
  }

  startRound(first) {
    const a = this.area, rng = this.rngFlow;
    if (!first) { this.round++; this.clouds = []; this.eats = []; this.resetStorms(); }
    if (this.cfg.mode === 'rounds') this.note('round', -1);
    this.winner = -1; this.endAt = -1; this.roundStart = this.t;
    // Team-Wolken gleichmäßig nahe dem Rand: vier Ecken, bei zwei je Team zusätzlich die Seitenmitten
    const spots = [[0.2, 0.15], [0.8, 0.85], [0.8, 0.15], [0.2, 0.85], [0.5, 0.08], [0.5, 0.92], [0.08, 0.5], [0.92, 0.5]];
    const order = [0, 1, 2, 3];                                    // Startplätze der Teams aus dem Seed mischen
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    if (this.roles) {
      // Regie: Das Opfer startet auf derselben Bildhälfte wie der Riese (Ecken 0/2 oben, 1/3 unten)
      const gi = order.indexOf(this.roles.giant), pi = [2, 3, 0, 1][gi], vi = order.indexOf(this.roles.victim);
      [order[pi], order[vi]] = [order[vi], order[pi]];
    }
    for (let k = 0; k < this.perTeam; k++) for (let ti = 0; ti < this.teamsCount; ti++) {
      const s = spots[k * 4 + ti];
      this.addCloud(order[ti], RULES.startMass * (this.roles && order[ti] === this.roles.giant ? EBS.CloudWarsStory.DIRECT.giantStart : 1), s[0] * a.w, s[1] * a.h);
    }
    // Neutrale Wolken über das ganze Bild verteilt
    for (let i = 0; i < this.neutralTarget; i++) {
      this.addCloud(-1, RULES.neutralMin + rng.next() * (RULES.neutralMax - RULES.neutralMin), (0.05 + 0.9 * rng.next()) * a.w, (0.05 + 0.9 * rng.next()) * a.h);
    }
  }

  spawnNeutral(massOverride) {
    const a = this.area, rng = this.rngFlow, w = this.wind(), ux = Math.cos(w.ang), uy = Math.sin(w.ang);
    const mass = massOverride || RULES.neutralMin + rng.next() * (RULES.neutralMax - RULES.neutralMin), r = radiusOf(mass);
    // Zufälliger Punkt im Bild, dann gegen den Wind bis vor den Rand zurückschieben
    let x = rng.next() * a.w, y = rng.next() * a.h;
    // Regie: anfangs wird der Riese gefüttert, in der Schlussphase der Außenseiter
    const D = EBS.CloudWarsStory && EBS.CloudWarsStory.DIRECT;
    const fed = this.roles && (this.t - this.roundStart >= D.feed ? this.roles.underdog : this.roles.giant);
    const giant = this.roles && this.clouds.find((c) => c.team === fed && !c.dead && !c.eat);
    if (giant && rng.next() < D.giantSpawnShare) {
      // Regie: Startpunkt im Kegel hinter dem Riesen; unten wird er wie sonst gegen den Wind vor den Rand geschoben,
      // die Wolke treibt ihm also von außen zu und taucht nicht mitten im Bild auf
      const off = Math.tan((rng.next() - 0.5) * D.giantCone) * 200;
      x = clamp(giant.x - uy * off, 0, a.w); y = clamp(giant.y + ux * off, 0, a.h);
    }
    const tx = ux > 1e-6 ? x / ux : ux < -1e-6 ? (x - a.w) / ux : Infinity;
    const ty = uy > 1e-6 ? y / uy : uy < -1e-6 ? (y - a.h) / uy : Infinity;
    const back = Math.min(tx, ty) + r + 20;
    x -= ux * back; y -= uy * back;
    const c = this.addCloud(-1, mass, x, y);
    c.vx = w.x + (rng.next() - 0.5) * 8; c.vy = w.y + (rng.next() - 0.5) * 8;
  }

  // ---------- Steuerung einer Team-Wolke ----------
  decide(c) {
    const R = radiusOf(c.mass), a = this.area, w = this.wind();
    let dx = 0, dy = 0, threat = null, td = Infinity;
    for (const o of this.clouds) {
      if (o.dead || o.eat || o.team === c.team) continue;
      // Gefahr: größere Gegner und neutrale Gewitter, die größer sind (sie schießen Blitze)
      if (o.team >= 0 ? o.mass < c.mass * this.teamRatio : !(o.kind && o.mass > c.mass)) continue;
      const d = Math.hypot(o.x - c.x, o.y - c.y);
      if (d < this.fleeRange * this.mods[c.team].flee * radiusOf(o.mass) && d < td) { td = d; threat = o; }
    }
    if (threat) {
      const d = td || 1, ax = (c.x - threat.x) / d, ay = (c.y - threat.y) / d, side = c.id % 2 ? 1 : -1;
      dx = ax - ay * 0.4 * side; dy = ay + ax * 0.4 * side;
      c.mode = 'flee';
    } else {
      let best = null, bs = 0;
      for (const o of this.clouds) {
        if (o === c || o.dead || o.eat || (o.team >= 0 && o.team === c.team) || c.mass < o.mass * this.ratio(o)) continue;
        const d = Math.hypot(o.x - c.x, o.y - c.y);
        const M = this.mods[c.team];
        if (o.team >= 0 && M.bonus[o.team] === 0) continue;          // Regie: dieses Team wird gerade nicht gejagt
        const s = (o.mass / (d + RULES.preyBias / M.prey)) * (o.team >= 0 ? RULES.enemyBonus : 1) * (o.team >= 0 ? M.bonus[o.team] : 1);
        if (s > bs && o.x > -20 && o.y > -20 && o.x < a.w + 20 && o.y < a.h + 20) { bs = s; best = o; }
      }
      const preyNear = best && Math.hypot(best.x - c.x, best.y - c.y) < RULES.tankPreyRange;
      if (c.mass < RULES.tankBelow && !preyNear && this.water.cells.length && !this.overWater(c.x, c.y)) {
        const cells = this.water.cells;
        let bx = 0, by = 0, bd = Infinity;
        for (let i = 0; i < cells.length; i += 2) { const d = (cells[i] - c.x) ** 2 + (cells[i + 1] - c.y) ** 2; if (d < bd) { bd = d; bx = cells[i]; by = cells[i + 1]; } }
        dx = bx - c.x; dy = by - c.y; c.mode = 'tank';
      } else if (best) {
        dx = best.x - c.x; dy = best.y - c.y; c.mode = 'hunt';
      } else {
        c.wander += (this.rngFlow.next() - 0.5) * 0.6;
        dx = Math.cos(c.wander) + Math.cos(w.ang) * 0.5; dy = Math.sin(c.wander) + Math.sin(w.ang) * 0.5; c.mode = 'drift';
      }
      const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    }
    // Weiches Abstoßen vom Bildrand (60 GE davor), gilt in jedem Zustand
    const e = RULES.edge + R * 0.5, push = (v) => clamp(v / e, 0, 1);
    dx += push(e - c.x) * 1.5 - push(c.x - (a.w - e)) * 1.5;
    dy += push(e - c.y) * 1.5 - push(c.y - (a.h - e)) * 1.5;
    const l = Math.hypot(dx, dy) || 1;
    c.tx = dx / l; c.ty = dy / l;
  }

  steer(c, dt) {
    // Kurs höchstens 90° je Sekunde drehen
    const cur = Math.atan2(c.hy, c.hx), want = Math.atan2(c.ty, c.tx);
    let d = want - cur; d -= Math.round(d / TAU) * TAU;
    const lim = RULES.turnRate * dt, ang = cur + clamp(d, -lim, lim);
    c.hx = Math.cos(ang); c.hy = Math.sin(ang);
    const v = speedOf(c.mass) * (c.team >= 0 ? this.mods[c.team].speed : 1), w = this.wind(), k = Math.min(1, dt * 2);
    c.vx += (c.hx * v + w.x - c.vx) * k; c.vy += (c.hy * v + w.y - c.vy) * k;
  }

  stepOnce() {
    const dt = this.dt, a = this.area;
    this.step++; this.t = this.step * dt;
    const t = this.t, decideEvery = Math.round(RULES.decide / EBS.DT);
    if (this.roles) {
      const mass = this.teamMass();
      for (let k = 0; k < 4; k++) this.mods[k] = EBS.CloudWarsStory.directFactors(this.roles, k, t - this.roundStart, mass);
      for (const c of this.clouds) if (c.team >= 0) c.rainFactor = this.mods[c.team].rain;
    }
    // Windhauch für den Hintergrundklang (Paket C6): alle 4 s, Stärke nach Wetter; nur ein Ereignis, kein Zufall
    if (this.step % Math.round(4 / dt) === 0) this.emit('gust', a.w / 2, a.h / 2, this.weatherNow().wind || 1, -1);
    // Runde zu Ende: kurze Pause, dann neue Runde (nur im Runden-Modus)
    if (this.endAt >= 0 && this.cfg.mode === 'rounds' && t - this.endAt >= RULES.roundPause) this.startRound(false);
    // Neutrale Wolken nachliefern
    let neutrals = 0;
    for (const c of this.clouds) if (c.team < 0 && !c.dead) neutrals++;
    if (neutrals < this.neutralTarget && this.clouds.length < POOL && this.rngFlow.next() < RULES.spawnRate * dt) this.spawnNeutral();
    // Bewegen
    for (const c of this.clouds) {
      if (c.dead) continue;
      if (c.eat) {
        const by = this.byId(c.eat.by), u = clamp((t - c.eat.t0) / RULES.eatTime, 0, 1);
        if (!by || by.dead) { c.eat = null; continue; }
        c.x += (by.x - c.x) * Math.min(1, u * 0.25); c.y += (by.y - c.y) * Math.min(1, u * 0.25);
        if (u >= 1) this.finishEat(c, by);
        continue;
      }
      if (c.team >= 0) {
        if ((this.step + c.id * 7) % decideEvery === 0) this.decide(c);
        this.steer(c, dt);
        // Verdunsten, Tanken über Wasser, Obergrenze
        if (c.mass > RULES.evapFrom) c.mass -= (c.mass - RULES.evapFrom) * RULES.evapRate * (this.weatherNow().evap || 1) * this.mods[c.team].evap * dt;
        if (c.mass < RULES.waterUpTo && this.overWater(c.x, c.y)) c.mass = Math.min(RULES.waterUpTo, c.mass + RULES.waterGain * dt);
        if (c.mass > RULES.massCap) c.mass -= (c.mass - RULES.massCap) * 0.2 * dt;
      }
      c.x += c.vx * dt; c.y += c.vy * dt;
      if (c.team >= 0) {
        // Team-Wolken bleiben großteils im Bild: Mittelpunkt mindestens 0,7 Radien vom Rand (höchstens ein Viertel des Bildes)
        const m = Math.min(radiusOf(c.mass) * 0.7, a.w / 4, a.h / 4);
        c.x = clamp(c.x, m, a.w - m); c.y = clamp(c.y, m, a.h - m);
      }
    }
    // Gewitter, Blitze, Feuer, Feuerwehr (storms.js)
    this.stepStorms(dt);
    // Fressen: nur Team-Wolken fressen
    for (const A of this.clouds) {
      if (A.dead || A.eat || A.team < 0) continue;
      const RA = radiusOf(A.mass);
      for (const B of this.clouds) {
        if (B === A || B.dead || B.eat || (B.team >= 0 && B.team === A.team) || A.mass < B.mass * this.ratio(B)) continue;
        const d = Math.hypot(B.x - A.x, B.y - A.y);
        if (d < RA + RULES.eatReach * radiusOf(B.mass)) {
          B.eat = { by: A.id, t0: t };
          this.eats.push({ t0: t, fromId: B.id, toId: A.id, mass: B.mass, x: B.x, y: B.y, team: B.team, puffSeed: B.puffSeed });
        }
      }
    }
    // Aufräumen: Gefressene, weit abgetriebene Neutrale, alte Fress-Aufzeichnungen
    this.clouds = this.clouds.filter((c) => !c.dead && !(c.team < 0 && !c.eat && (c.x < -150 || c.y < -150 || c.x > a.w + 150 || c.y > a.h + 150)));
    while (this.eats.length && t - this.eats[0].t0 > 1) this.eats.shift();
    this.checkRound();
  }

  /** Masseverhältnis, ab dem A die Wolke B fressen darf (Team gegen Team im Runden-Modus höher). */
  ratio(B) { return B.team >= 0 ? this.teamRatio : RULES.eatRatio; }

  byId(id) { for (const c of this.clouds) if (c.id === id) return c; return null; }

  finishEat(B, A) {
    const gain = RULES.eatGain * B.mass * clamp(RULES.gainRef / A.mass, RULES.gainMin, 1) * (A.team >= 0 ? this.mods[A.team].gain : 1);
    A.mass += gain; B.dead = true;
    this.chargeFrom(A, B);
    this.emit('absorb', A.x, A.y, B.mass, A.team);
    if (B.team >= 0 && !this.clouds.some((c) => c !== B && !c.dead && c.team === B.team)) this.emit('eliminated', B.x, B.y, 1, B.team);
  }

  teamMass() {
    const m = [0, 0, 0, 0];
    for (const c of this.clouds) if (!c.dead && c.team >= 0) m[c.team] += c.mass;
    return m;
  }

  checkRound() {
    if (this.endAt >= 0) return;
    const m = this.teamMass(), alive = m.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0);
    const timeUp = this.cfg.mode === 'rounds' && this.t - this.roundStart >= RULES.roundLimit;
    if (alive.length <= 1 || timeUp) {
      this.winner = alive.length ? alive.reduce((b, i) => (m[i] > m[b] ? i : b), alive[0]) : -1;
      if (this.winner >= 0) this.scores[this.winner]++;
      this.endAt = this.t;
      this.emit('win', this.area.w / 2, this.area.h / 2, timeUp ? 0 : 1, this.winner);
    }
  }

  checkInvariants() {
    const errors = [], a = this.area;
    if (this.clouds.length > POOL) errors.push(`zu viele Wolken: ${this.clouds.length}`);
    const perTeam = [0, 0, 0, 0];
    for (const c of this.clouds) {
      if (!(Number.isFinite(c.mass) && c.mass > 0)) errors.push(`Wolke ${c.id}: Masse ${c.mass}`);
      if (!(Number.isFinite(c.x) && Number.isFinite(c.y))) errors.push(`Wolke ${c.id}: kein gültiger Ort`);
      else if (c.x < -200 || c.y < -200 || c.x > a.w + 200 || c.y > a.h + 200) errors.push(`Wolke ${c.id} weit außerhalb`);
      if (c.team >= 0) perTeam[c.team]++;
    }
    if (perTeam.some((n) => n > this.perTeam)) errors.push(`mehr Team-Wolken als erlaubt: ${perTeam.join('/')}`);
    this.stormInvariants(errors);
    return { ok: errors.length === 0, errors, bodies: 0 };
  }

  stateHash() {
    const parts = [this.step, this.rngFlow.s, this.rngFx.s, this.round, this.scores.join(','), this.winner, this.nextId];
    for (const c of this.clouds) parts.push(`${c.id}:${c.team}:${c.mass}:${c.x}:${c.y}:${c.vx}:${c.vy}:${c.hx}:${c.eat ? c.eat.by + '@' + c.eat.t0 : ''}`);
    for (const e of this.eats) parts.push(`e${e.fromId}>${e.toId}@${e.t0}`);
    parts.push(...this.stormHashParts());
    return fnv1a(parts.join('|')).toString(16).padStart(8, '0');
  }
}

EBS.CloudWarsSim = { CloudWarsSimulation, TEAMS, RULES, POOL, radiusOf, speedOf };
})();
