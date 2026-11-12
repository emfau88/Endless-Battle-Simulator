/* Scrap episode adapter. The supplied round simulation remains unchanged.
 * Physics: fixed 120 Hz. Host: 60 video ticks/s. Tempo is applied here once.
 * Events: unthrottled semantic events, global sequence, fractional video ticks.
 * The original ten-line UI feed is intentionally not the export event source. */
(function () {
  'use strict';
  const { clamp, num, bool, hashSeed, fnv1a } = EBS.util;
  const EVENT_LIMIT = 4096;
  const normalizeParams = (p = {}) => ({
    rulesVersion: p.rulesVersion === 'v2' ? 'v2' : 'classic',
    repeatRounds: bool(p.repeatRounds, true),
    endPauseSec: clamp(Math.round(num(p.endPauseSec, 3)), 2, 8),
  });
  function layout({ w, h }) {
    if (h > w) return { x: 40, y: 436, size: 1000, kind: 'portrait' };
    if (w > h) return { x: 460, y: 40, size: 1000, kind: 'landscape' };
    return { x: 190, y: 174, size: 700, kind: 'square' };
  }

  // Observe successful rule actions, never infer audio from transient particles.
  const observe = Base => class extends Base {
    _shoot(r) {
      const shots = this.stats.shots, kind = r.weapon?.kind;
      super._shoot(r);
      if (this.stats.shots !== shots) this.emit?.(kind === 'rocket' ? 'rocket' : 'blaster', r.x, r.y, { team: r.id });
    }
    _hurtRobot(r, amount, owner, x, y) {
      const hp = r.hp, alive = r.alive;
      super._hurtRobot(r, amount, owner, x, y);
      if (r.hp < hp) this.emit?.('hit', x, y, { team: r.id, owner, p: hp - r.hp });
      if (alive && !r.alive) this.emit?.('ko', r.x, r.y, { team: r.id, owner });
    }
    _hurtBlock(b, amount, color) {
      const hp = b.hp, alive = b.alive;
      super._hurtBlock(b, amount, color);
      if (b.hp < hp) this.emit?.('cover_hit', b.x + b.w / 2, b.y + b.h / 2, { block: b.id, p: hp - b.hp });
      if (alive && !b.alive) this.emit?.('break', b.x + b.w / 2, b.y + b.h / 2, { block: b.id });
    }
    _explode(p, directRobot, directBlock) {
      this.emit?.('blast', p.x, p.y, { owner: p.owner });
      super._explode(p, directRobot, directBlock);
    }
    _takePickup(r) {
      const armed = !!r.weapon;
      super._takePickup(r);
      if (!armed && r.weapon) this.emit?.('pickup', r.x, r.y, { team: r.id, kind: r.weapon.kind, ammo: r.weapon.ammo });
    }
    _drop(r, exhausted) {
      const weapon = r.weapon && { ...r.weapon };
      super._drop(r, exhausted);
      if (weapon) this.emit?.('drop', r.x, r.y, { team: r.id, kind: weapon.kind, ammo: weapon.ammo });
    }
    _addPickup(...args) {
      const p = super._addPickup(...args);
      this.emit?.('weapon_spawn', p.x, p.y, { id: p.id, kind: p.kind, ammo: p.ammo });
      return p;
    }
  };
  const ObservedRound = observe(ScrapArena.Sim), ImprovedRound = observe(EBS.ScrapRules.Round);

  class Episode {
    constructor({ seed, params, world, timeScale = 1 }) {
      this.seed = seed >>> 0; this.cfg = normalizeParams(params); this.world = world;
      this.timeScale = timeScale; this.unitsPerStep = Math.round(timeScale * 200);
      this.step = 0; this.t = 0; this.simTicks = 0; this.accumulator = 0;
      this.roundNumber = 0; this.completedRounds = 0; this.phase = 'running'; this.pauseUntil = 0;
      this.wins = [0, 0, 0, 0]; this.draws = 0;
      this.events = []; this.eventSeq = 0; this.eventDigest = 0; this.eventStep = 0;
      this._startRound();
    }
    _event(type, arenaX = 450, arenaY = 450, details = {}) {
      const l = layout(this.world);
      // The reference renderer includes 18 px of arena margin on each side.
      const x = l.x + l.size * (arenaX + 18) / 936;
      const y = l.y + l.size * (arenaY + 18) / 936;
      const e = { seq: this.eventSeq++, step: this.eventStep, type, x, y,
        arenaX, arenaY, round: this.roundNumber, roundSeed: this.roundSeed, roundTime: this.roundSim.t, ...details };
      this.eventDigest = fnv1a(this.eventDigest + '|' + JSON.stringify(e));
      this.events.push(e);
      if (this.events.length > EVENT_LIMIT) this.events.splice(0, 512);
    }
    _startRound() {
      this.roundNumber++;
      this.roundSeed = this.roundNumber === 1 ? this.seed : hashSeed('scrap-round-v1', this.seed, this.roundNumber);
      const Round = this.cfg.rulesVersion === 'classic' ? ObservedRound : ImprovedRound;
      this.roundSim = new Round({ seed: this.roundSeed, rulesVersion: this.cfg.rulesVersion });
      // Non-enumerable: JSON of the round stays byte-identical to the source.
      Object.defineProperty(this.roundSim, 'emit', { value: (...args) => this._event(...args) });
      this.phase = 'running'; this.pauseUntil = 0; this.accumulator = 0;
      this._event('round_start');
    }
    stepOnce() {
      this.step++;
      if (this.phase !== 'running') {
        if (this.phase === 'pause' && this.step >= this.pauseUntil) {
          this.eventStep = this.step; this._startRound();
        }
        return;
      }
      const before = this.accumulator;
      this.accumulator += this.unitsPerStep;
      let crossed = 100 - before;
      while (this.accumulator >= 100) {
        this.eventStep = this.step - 1 + crossed / this.unitsPerStep;
        crossed += 100;
        this.accumulator -= 100;
        this.roundSim.step(1 / 120); this.simTicks++; this.t = this.simTicks / 120;
        if (this.roundSim.phase === 'ended') {
          const winner = this.roundSim.winner;
          this.completedRounds++;
          if (winner === null) this.draws++; else this.wins[winner]++;
          this._event('round_end', 450, 450, { winner });
          this.phase = this.cfg.repeatRounds ? 'pause' : 'ended';
          this.pauseUntil = this.cfg.repeatRounds ? this.step + this.cfg.endPauseSec * 60 : 0;
          this.accumulator = 0;
          break;
        }
      }
    }
    snapshot() {
      const s = this.roundSim.snapshot();
      return { ...s, seed: this.seed, roundSeed: this.roundSeed, t: this.t, roundTime: s.t,
        videoTime: this.step / 60, step: this.step, phase: this.phase, roundPhase: s.phase,
        round: this.roundNumber, completedRounds: this.completedRounds, wins: [...this.wins], draws: this.draws,
        pauseRemaining: this.phase === 'pause' ? (this.pauseUntil - this.step) / 60 : 0,
        roundHash: this.roundSim.stateHash(), eventSeq: this.eventSeq,
        summary: `Runde ${this.roundNumber} · ${s.summary}` };
    }
    stateHash() {
      // Full round state (AI targets/cooldowns, both RNGs, objects, effects, UI
      // feed) plus episode scheduling and a rolling digest of ALL past events.
      const state = { version: 'scrap-episode-v1', seed: this.seed, cfg: this.cfg, world: this.world,
        timeScale: this.timeScale, unitsPerStep: this.unitsPerStep, step: this.step, simTicks: this.simTicks,
        accumulator: this.accumulator, round: this.roundNumber, roundSeed: this.roundSeed,
        phase: this.phase, pauseUntil: this.pauseUntil, completed: this.completedRounds,
        wins: this.wins, draws: this.draws, eventSeq: this.eventSeq, eventDigest: this.eventDigest,
        roundState: this.roundSim };
      return fnv1a(JSON.stringify(state, (_, v) => typeof v === 'number' && !Number.isFinite(v) ? String(v) : v)).toString(16).padStart(8, '0');
    }
    checkInvariants() {
      const errors = [...this.roundSim.checkInvariants().errors];
      const finiteState = (object, path) => {
        for (const [key, value] of Object.entries(object)) {
          if (typeof value === 'number' && !Number.isFinite(value)) {
            // Charged floor weapons deliberately have unlimited lifetime.
            const unlimitedPickup = key === 'ttl' && value === Infinity && !object.empty && this.roundSim.pickups.includes(object);
            if (!unlimitedPickup) errors.push(`Nicht endlicher Zustand: ${path}.${key}`);
          } else if (value && typeof value === 'object') finiteState(value, `${path}.${key}`);
        }
      };
      finiteState(this.roundSim, 'round');
      if (![this.step, this.simTicks, this.accumulator, this.roundNumber, this.pauseUntil, this.eventSeq, this.eventDigest].every(Number.isFinite)) errors.push('Episodenzeit/-zähler ungültig');
      if (this.wins.reduce((a, b) => a + b, this.draws) !== this.completedRounds) errors.push('Rundensummen inkonsistent');
      if (this.roundNumber !== this.completedRounds + (this.phase === 'running' ? 1 : 0)) errors.push('Rundenzähler inkonsistent');
      if (this.phase === 'running' && this.roundSim.phase !== 'running') errors.push('Aktive Runde bereits beendet');
      if (this.phase === 'pause' && this.pauseUntil <= this.step) errors.push('Rundenpause überschritten');
      if (this.events.length > EVENT_LIMIT) errors.push('Ereignispuffer zu groß');
      for (let i = 0; i < this.events.length; i++) {
        const e = this.events[i], prev = this.events[i - 1];
        if (![e.step, e.x, e.y, e.roundTime].every(Number.isFinite) || e.step > this.step ||
            (prev && (e.seq !== prev.seq + 1 || e.step < prev.step))) { errors.push('Ereignisfolge ungültig'); break; }
      }
      return { ok: !errors.length, errors };
    }
    destroy() { this.events.length = 0; }
  }
  EBS.Scrap = { Episode, normalizeParams, layout, EVENT_LIMIT };
})();
