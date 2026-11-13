/* Hex Dominion V0.3 adapter. Original rules stay in simulation.js unchanged.
 * Host: 60 video steps/s. Hex: fixed 0.1 simulation seconds; tempo applied once.
 * Observation never consumes random numbers or edits rule state. The complete
 * event stream is separate from the source's shortened/throttled UI feed. */
(function () {
  'use strict';
  const { clamp, num, bool, hashSeed, fnv1a } = EBS.util;
  const ruleKeys = ['incomeMultiplier', 'aggression', 'offensiveInterval', 'marchDuration'];
  const normalizeParams = (p = {}) => ({
    profile: ['calm', 'balanced', 'intense', 'custom'].includes(p.profile) ? p.profile : 'balanced',
    layout: p.layout === 'portrait' ? 'portrait' : 'landscape',
    incomeMultiplier: clamp(num(p.incomeMultiplier, 1), .5, 2),
    aggression: clamp(num(p.aggression, .5), 0, 1),
    offensiveInterval: clamp(num(p.offensiveInterval, 4), 2, 8),
    marchDuration: clamp(num(p.marchDuration, 2.5), 1.5, 4),
    repeatRounds: bool(p.repeatRounds, true),
    endPauseSec: clamp(num(p.endPauseSec, 9), 2, 15),
    garrisonMode: ['front', 'always', 'never'].includes(p.garrisonMode) ? p.garrisonMode : 'front',
    cameraMode: p.cameraMode === 'top' ? 'top' : 'perspective',
    cameraAzimuth: clamp(num(p.cameraAzimuth, .16), -Math.PI, Math.PI),
    cameraElevation: clamp(num(p.cameraElevation, .78), .48, 1.55),
    cameraZoom: clamp(num(p.cameraZoom, 1), .72, 1.8),
    highQuality: bool(p.highQuality, true),
    showFactions: bool(p.showFactions, true),
    showClock: bool(p.showClock, true),
    showWinner: bool(p.showWinner, true),
  });
  const roundSeed = (seed, round) => round === 1 ? seed >>> 0 : hashSeed('territory-round-v1', seed >>> 0, round);
  const serializeRound = sim => JSON.stringify(sim, (_, value) => value instanceof Map ? { entries: [...value] } : value);
  const totalUnits = sim => sim.tiles.reduce((sum, t) => sum + t.units, 0) + sim.moves.reduce((sum, m) => sum + m.amount, 0);

  class ObservedRound extends HexSim.Sim {
    _dispatch(...args) {
      const sent = super._dispatch(...args);
      if (sent) {
        const move = this.moves[this.moves.length - 1];
        this.emit?.('dispatch', move.from, { team: move.owner, move: { ...move }, p: move.amount });
      }
      return sent;
    }
    _arrive(move) {
      const tile = this.tiles[move.to], previous = tile.owner;
      this.emit?.('arrival', tile.id, { team: move.owner, previous, move: { ...move }, p: move.amount });
      super._arrive(move);
      if (previous >= 0 && previous !== move.owner) this.emit?.('battle', tile.id, { team: move.owner, previous, move: { ...move }, p: move.amount });
      // Every capture, including neutral fields and captures suppressed by the UI cooldown.
      if (tile.owner !== previous) this.emit?.('capture', tile.id, { team: move.owner, previous, move: { ...move }, p: move.amount });
    }
    _event(type, team, text, tile, extra = {}) {
      const result = super._event(type, team, text, tile, extra);
      // Capture observation comes from the actual ownership change above.
      if (type !== 'capture' && type !== 'start') this.emit?.(type, tile, { team, ...extra });
      return result;
    }
  }

  class Episode {
    constructor({ seed, params, world, view = {}, timeScale = .75 }) {
      this.seed = seed >>> 0; this.cfg = normalizeParams(params); this.world = world; this.view = view;
      this.timeScale = clamp(num(timeScale, .75), .25, 2);
      this.step = 0; this.t = 0; this.simTicks = 0; this.accumulator = 0;
      this.roundNumber = 0; this.completedRounds = 0; this.phase = 'running'; this.pauseUntil = 0; this.resultStep = 0;
      this.wins = [0, 0, 0, 0]; this.roundResults = [];
      this.events = []; this.eventSeq = 0; this.eventDigest = 0; this.eventStep = 0;
      this.tickObservers = new Set();
      this._startRound();
    }
    addTickObserver(fn) { this.tickObservers.add(fn); return () => this.tickObservers.delete(fn); }
    _notify(newRound = false) { for (const fn of this.tickObservers) fn(this.roundSim, { newRound }); }
    _event(type, tileId, details = {}) {
      const tile = this.roundSim.tiles[tileId];
      const bounds = this.roundSim.mapBounds, angle = bounds.angle;
      const u = tile ? tile.x * Math.cos(angle) - tile.z * Math.sin(angle) : 0;
      const v = tile ? tile.x * Math.sin(angle) + tile.z * Math.cos(angle) : 0;
      const e = { seq: this.eventSeq++, step: this.eventStep, videoTime: this.eventStep / 60, type,
        x: clamp(.5 + u / (2 * bounds.halfU), 0, 1) * this.world.w,
        y: clamp(.5 + v / (2 * bounds.halfV), 0, 1) * this.world.h,
        tile: tileId ?? null, round: this.roundNumber, roundSeed: this.roundSeed, roundTime: this.roundSim.time, ...details };
      this.eventDigest = fnv1a(this.eventDigest + '|' + JSON.stringify(e));
      this.events.push(e);
    }
    _startRound() {
      this.roundNumber++;
      this.roundSeed = roundSeed(this.seed, this.roundNumber);
      this.roundSim = new ObservedRound({ seed: this.roundSeed, ...this.cfg });
      Object.defineProperty(this.roundSim, 'emit', { value: (...args) => this._event(...args) });
      this.initialUnits = totalUnits(this.roundSim);
      this.phase = 'running'; this.pauseUntil = 0; this.resultStep = 0; this.accumulator = 0;
      this._event('round_start');
      this._notify(true);
    }
    stepOnce() {
      this.step++;
      if (this.phase !== 'running') {
        if (this.phase === 'pause' && this.step >= this.pauseUntil - 1e-9) {
          this.eventStep = this.step; this._startRound();
        }
        return;
      }
      const delta = this.timeScale / 60, before = this.accumulator;
      this.accumulator += delta;
      let crossed = HexSim.RULES.step - before;
      while (this.accumulator >= HexSim.RULES.step - 1e-9) {
        this.eventStep = Math.min(this.step, this.step - 1 + crossed / delta);
        crossed += HexSim.RULES.step;
        this.accumulator = Math.max(0, this.accumulator - HexSim.RULES.step);
        this.roundSim.step(HexSim.RULES.step); this.simTicks++; this.t = this.simTicks * HexSim.RULES.step;
        this._notify();
        if (this.roundSim.phase === 'finished') {
          const winner = this.roundSim.winner;
          this.completedRounds++; this.wins[winner]++;
          this.roundResults.push({ round: this.roundNumber, seed: this.roundSeed, winner, time: this.roundSim.time });
          this.phase = this.cfg.repeatRounds ? 'pause' : 'ended';
          this.resultStep = this.eventStep;
          this.pauseUntil = this.resultStep + this.cfg.endPauseSec * 60;
          this.accumulator = 0;
          break;
        }
      }
    }
    setParam(key, value) {
      this.cfg = normalizeParams({ ...this.cfg, [key]: value });
      if (ruleKeys.includes(key)) this.roundSim.configure({ [key]: this.cfg[key] });
      if (this.roundSim.phase === 'finished') {
        if (key === 'repeatRounds') this.phase = this.cfg.repeatRounds ? 'pause' : 'ended';
        if (key === 'endPauseSec') this.pauseUntil = this.resultStep + this.cfg.endPauseSec * 60;
        if (this.phase === 'pause' && this.pauseUntil <= this.step) this.pauseUntil = this.step + 1;
      }
    }
    setTimeScale(value) { this.timeScale = clamp(num(value, this.timeScale), .25, 2); }
    snapshot() {
      const r = this.roundSim;
      return { seed: this.seed, roundSeed: this.roundSeed, step: this.step, t: this.t, videoTime: this.step / 60,
        round: this.roundNumber, roundTime: r.time, phase: this.phase, roundPhase: r.phase, winner: r.winner,
        completedRounds: this.completedRounds, wins: [...this.wins], roundResults: this.roundResults.map(r => ({ ...r })),
        alive: r.factions.filter(f => f.alive).length, tiles: r.tiles.length, moves: r.moves.length,
        factions: r.stats(), stats: { ...r.roundStats }, accumulator: this.accumulator,
        pauseRemaining: this.phase === 'pause' ? Math.max(0, (this.pauseUntil - this.step) / 60) : 0,
        eventSeq: this.eventSeq, summary: `Runde ${this.roundNumber} · ${r.factions.filter(f => f.alive).length} Hauptquartiere aktiv` };
    }
    stateHash() {
      return fnv1a(JSON.stringify({ version: 'territory-episode-v1', seed: this.seed, cfg: this.cfg,
        timeScale: this.timeScale, step: this.step, simTicks: this.simTicks, accumulator: this.accumulator,
        roundNumber: this.roundNumber, roundSeed: this.roundSeed, phase: this.phase, pauseUntil: this.pauseUntil, resultStep: this.resultStep,
        completedRounds: this.completedRounds, wins: this.wins, roundResults: this.roundResults,
        eventSeq: this.eventSeq, eventDigest: this.eventDigest, roundState: serializeRound(this.roundSim) }))
        .toString(16).padStart(8, '0');
    }
    checkInvariants() {
      const errors = [], r = this.roundSim;
      const integer = (n, min = 0) => Number.isInteger(n) && n >= min;
      const finite = (value, path) => {
        for (const [key, item] of Object.entries(value)) {
          if (typeof item === 'number' && !Number.isFinite(item)) errors.push(`Nicht endlicher Zustand: ${path}.${key}`);
          else if (item && typeof item === 'object') finite(item, `${path}.${key}`);
        }
      };
      finite(r, 'round');
      if (!integer(r.rng.s) || r.rng.s > 0xffffffff) errors.push('RNG-Zustand ungültig');
      if (!integer(this.step) || !integer(this.simTicks) || !Number.isFinite(this.accumulator) || this.accumulator < 0 || this.accumulator >= .1 + 1e-9) errors.push('Episodenzeit/-akkumulator ungültig');
      if (!integer(r.ticks) || r.time !== r.ticks * .1 || r.accumulator < -1e-9 || r.accumulator >= .1 + 1e-9) errors.push('Hex-Zeit/-akkumulator ungültig');
      if (this.wins.reduce((a, b) => a + b, 0) !== this.completedRounds || this.roundNumber !== this.completedRounds + (this.phase === 'running' ? 1 : 0)) errors.push('Rundenzähler inkonsistent');
      if ((this.phase === 'running') !== (r.phase === 'running') || (r.phase === 'finished' && (!integer(r.winner) || r.winner > 3))) errors.push('Rundenphase ungültig');
      if (this.phase === 'pause' && this.pauseUntil <= this.step - 1e-9) errors.push('Ergebnispause überschritten');
      const supply = new Set();
      for (const f of r.factions) {
        if (!integer(f.id) || f.id > 3 || !r.tiles[f.hq] || !integer(f.goal, -1) || f.goal > 3 || !integer(f.focusTile, -1) || f.focusTile >= r.tiles.length) errors.push('Fraktionsentscheidung ungültig');
        if (!f.alive) continue;
        if (r.tiles[f.hq].owner !== f.id || r.tiles[f.hq].hq !== f.id) errors.push('Lebendes Hauptquartier ohne Besitzer');
        const queue = [f.hq]; supply.add(f.hq);
        for (let i = 0; i < queue.length; i++) for (const n of r.tiles[queue[i]].neighbors) if (r.tiles[n].owner === f.id && !supply.has(n)) { supply.add(n); queue.push(n); }
      }
      for (const t of r.tiles) {
        if (r.tiles[t.id] !== t || r.lookup.get(`${t.q},${t.r}`) !== t.id || !integer(t.owner, -1) || t.owner > 3 || t.units < -1e-8) errors.push(`Feldzustand ungültig: ${t.id}`);
        if (t.owner >= 0 && !r.factions[t.owner]?.alive) errors.push(`Besitz ausgeschiedener Fraktion: ${t.id}`);
        if (t.supplied !== supply.has(t.id)) errors.push(`Versorgung inkonsistent: ${t.id}`);
        if (t.terrain === 'mountain' && (t.owner !== -1 || t.units !== 0)) errors.push(`Gebirge besetzt: ${t.id}`);
        if (t.neighbors.some(n => !r.tiles[n]?.neighbors.includes(t.id))) errors.push(`Nachbarschaft ungültig: ${t.id}`);
      }
      const ids = new Set();
      for (const m of r.moves) {
        if (!integer(m.id, 1) || ids.has(m.id) || m.id > r.moveId || !integer(m.owner) || m.owner > 3 || !r.factions[m.owner]?.alive ||
          !r.tiles[m.from]?.neighbors.includes(m.to) || r.tiles[m.to]?.terrain === 'mountain' || !integer(m.amount, 1) ||
          !(m.duration > 0) || m.start > r.time + 1e-8 || m.start + m.duration <= r.time - 1e-8 || !['attack', 'supply'].includes(m.kind)) errors.push('Marschzustand ungültig');
        ids.add(m.id);
      }
      const expected = this.initialUnits + r.roundStats.unitsProduced - r.roundStats.unitsLost - r.roundStats.constructionSpent;
      if (Math.abs(totalUnits(r) - expected) > 1e-6) errors.push('Einheitenbilanz inkonsistent');
      if (this.events.length !== this.eventSeq) errors.push('Ereignisse verloren');
      for (let i = 0; i < this.events.length; i++) {
        const e = this.events[i], previous = this.events[i - 1];
        if (e.seq !== i || ![e.step, e.videoTime, e.x, e.y, e.roundTime].every(Number.isFinite) || e.step > this.step + 1e-8 ||
          Math.abs(e.step / 60 - e.videoTime) > 1e-10 || (previous && e.step < previous.step - 1e-8)) { errors.push('Ereignisfolge ungültig'); break; }
      }
      return { ok: !errors.length, errors };
    }
    destroy() { this.tickObservers.clear(); this.events.length = 0; }
  }
  EBS.Territory = { Episode, ObservedRound, normalizeParams, roundSeed, serializeRound };
})();
