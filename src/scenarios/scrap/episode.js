/* Scrap episode adapter. The supplied round simulation remains unchanged.
 * Physics: fixed 120 Hz. Host: 60 video ticks/s. Tempo is applied here once.
 * Events: unthrottled semantic events, global sequence, fractional video ticks.
 * The original ten-line UI feed is intentionally not the export event source. */
(function () {
  'use strict';
  const { clamp, num, bool, hashSeed, fnv1a } = EBS.util;
  const EVENT_LIMIT = 4096;
  const normalizeParams = (p = {}) => ({
    rulesVersion: p.arena === 'sunshine' ? 'v3' : ['v2','v3'].includes(p.rulesVersion) ? p.rulesVersion : 'classic',
    episodeMode: p.episodeMode === 'tournament' ? 'tournament' : 'endless',
    arena: Object.hasOwn(EBS.ScrapRules.arenas, p.arena) ? p.arena : 'yard',
    workshop: p.episodeMode === 'tournament' && bool(p.workshop, false),
    repeatRounds: bool(p.repeatRounds, true),
    endPauseSec: clamp(Math.round(num(p.endPauseSec, 3)), 2, 8),
  });
  function layout({ w, h }, params = {}) {
    if (params.rulesVersion === 'v3') {
      const portrait=h>w, aw=portrait?EBS.ScrapMaterials.height:EBS.ScrapMaterials.width;
      const ah=portrait?EBS.ScrapMaterials.width:EBS.ScrapMaterials.height, top=portrait?132:80;
      const scale=Math.min((w-24)/aw,(h-top-12)/ah),width=aw*scale,height=ah*scale;
      return { x:(w-width)/2,y:top+(h-top-12-height)/2,width,height,size:Math.min(width,height),
        scale,arenaW:aw,arenaH:ah,full:true,kind:portrait?'portrait':w>h?'landscape':'square' };
    }
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
  const ObservedRound = observe(ScrapArena.Sim), ImprovedRound = observe(EBS.ScrapRules.Round), MaterialRound = observe(EBS.ScrapMaterials.Round);

  class Episode {
    constructor({ seed, params, world, view = { camera: true }, timeScale = 1 }) {
      this.seed = seed >>> 0; this.cfg = normalizeParams(params); this.world = world;
      this.view = view; this.camera = { x: 450, y: 450, zoom: 1 };
      this.timeScale = timeScale; this.unitsPerStep = Math.round(timeScale * 200);
      this.step = 0; this.t = 0; this.simTicks = 0; this.accumulator = 0;
      this.roundNumber = 0; this.completedRounds = 0; this.phase = 'running'; this.pauseUntil = 0;
      this.wins = [0, 0, 0, 0]; this.draws = 0;
      this.roundResults = []; this.outroUntil = 0;
      this.workshop = { balances: [0,0,0,0], modules: [null,null,null,null], installed: [0,0,0,0], lastAwards: [] };
      this.events = []; this.eventSeq = 0; this.eventDigest = 0; this.eventStep = 0;
      this._startRound();
    }
    _event(type, arenaX, arenaY, details = {}) {
      const bounds=this.roundSim.bounds||{w:900,h:900};
      arenaX ??= bounds.w/2; arenaY ??= bounds.h/2;
      const l = layout(this.world, this.cfg);
      // The reference renderer includes 18 px of arena margin on each side.
      const camera = this.view.camera ? this.camera : { x: bounds.w/2, y: bounds.h/2, zoom: 1 };
      const px=(arenaX-camera.x)*camera.zoom,py=(arenaY-camera.y)*camera.zoom;
      const x = l.full ? l.x+l.width*(.5+(l.kind==='portrait'?-py/bounds.h:px/bounds.w)) : l.x+l.size*(.5+px/936);
      const y = l.full ? l.y+l.height*(.5+(l.kind==='portrait'?px/bounds.w:py/bounds.h)) : l.y+l.size*(.5+py/936);
      const e = { seq: this.eventSeq++, step: this.eventStep, type, x, y,
        arenaX, arenaY, round: this.roundNumber, roundSeed: this.roundSeed, roundTime: this.roundSim.t, ...details };
      this.eventDigest = fnv1a(this.eventDigest + '|' + JSON.stringify(e));
      this.events.push(e);
      if (this.events.length > EVENT_LIMIT) this.events.splice(0, 512);
    }
    _startRound() {
      this.roundNumber++;
      this.roundSeed = this.roundNumber === 1 ? this.seed : hashSeed('scrap-round-v1', this.seed, this.roundNumber);
      const Round = this.cfg.rulesVersion === 'v3' ? MaterialRound : this.cfg.rulesVersion === 'classic' && this.cfg.arena === 'yard' && !this.cfg.workshop ? ObservedRound : ImprovedRound;
      this.roundSim = new Round({ seed: this.roundSeed, rulesVersion: this.cfg.rulesVersion, arena: this.cfg.arena, upgrades: this.workshop.modules });
      // Non-enumerable: JSON of the round stays byte-identical to the source.
      Object.defineProperty(this.roundSim, 'emit', { value: (...args) => this._event(...args) });
      this.phase = 'running'; this.pauseUntil = 0; this.accumulator = 0;
      this.camera = { x: (this.roundSim.bounds?.w||900)/2, y: (this.roundSim.bounds?.h||900)/2, zoom: 1 };
      this._event('round_start');
    }
    stepOnce() {
      this.step++;
      this._updateCamera();
      if (this.phase !== 'running') {
        if (this.phase === 'outro' && this.step >= this.outroUntil) this.phase = 'ended';
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
          this.roundResults.push({ round: this.roundNumber, winner });
          if (this.roundResults.length > 8) this.roundResults.shift();
          this._event('round_end', undefined, undefined, { winner });
          if (this.cfg.workshop && this.completedRounds < 8) this._awardModules();
          const tournament = this.cfg.episodeMode === 'tournament';
          if (tournament && this.completedRounds === 8) {
            this.phase = 'outro'; this.outroUntil = this.step + 5 * 60;
            this._event('tournament_end', undefined, undefined, { champions: this.champions(), wins: [...this.wins] });
          } else {
            this.phase = tournament || this.cfg.repeatRounds ? 'pause' : 'ended';
            this.pauseUntil = this.phase === 'pause' ? this.step + this.cfg.endPauseSec * 60 : 0;
          }
          this.accumulator = 0;
          break;
        }
      }
    }
    _awardModules() {
      const w = this.workshop, keys = Object.keys(EBS.ScrapRules.modules);
      w.lastAwards = [];
      for (const robot of this.roundSim.robots) {
        const id = robot.id;
        if (w.modules[id]) continue;
        // Participation plus one damage milestone, not a winner-only jackpot.
        // Four credits buys the only slot; no balance accumulates afterwards.
        w.balances[id] = Math.min(4, w.balances[id] + 1 + (robot.damage >= 100 ? 1 : 0));
        if (w.balances[id] < 4) continue;
        const module = keys[(hashSeed('scrap-module-v1', this.seed) + id) % keys.length];
        w.modules[id] = module; w.installed[id]++; w.balances[id] = 0;
        w.lastAwards.push({ team: id, module });
        this._event('upgrade', robot.x, robot.y, { team: id, module, appliesFromRound: this.roundNumber + 1 });
      }
    }
    _updateCamera() {
      if(this.roundSim.bounds) { this._updateMaterialCamera();return; }
      const living = this.roundSim.robots.filter(r => r.alive), c = this.camera;
      const points = this.phase === 'running' && living.length === 2
        ? living.concat(this.roundSim.projectiles, living.filter(r => !r.weapon).map(r => ({ x:r.goalX, y:r.goalY }))) : [];
      let zoom = 1, x = 450, y = 450;
      if (points.length) {
        const xs = points.map(p => p.x), ys = points.map(p => p.y);
        const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
        zoom = clamp(936 / Math.max(maxX - minX + 240, maxY - minY + 240), 1, 1.4);
        x = (minX + maxX) / 2; y = (minY + maxY) / 2;
        // Safety wins over smoothing: never crop a competitor or live projectile.
        c.zoom = Math.min(c.zoom, zoom);
      }
      c.zoom += clamp(zoom - c.zoom, -.008, .002);
      const half = 468 / c.zoom;
      x = clamp(x, half - 18, 918 - half); y = clamp(y, half - 18, 918 - half);
      c.x += clamp((x - c.x) * .025, -.75, .75); c.y += clamp((y - c.y) * .025, -.75, .75);
      if (points.length) {
        c.x = clamp(c.x, Math.max(...points.map(p => p.x)) + 70 - half, Math.min(...points.map(p => p.x)) - 70 + half);
        c.y = clamp(c.y, Math.max(...points.map(p => p.y)) + 70 - half, Math.min(...points.map(p => p.y)) - 70 + half);
      }
      c.x = clamp(c.x, half - 18, 918 - half); c.y = clamp(c.y, half - 18, 918 - half);
    }
    _updateMaterialCamera() {
      const {w,h}=this.roundSim.bounds,c=this.camera,living=this.roundSim.robots.filter(r=>r.alive);
      const points=this.phase==='running'&&living.length===2?living.concat(this.roundSim.projectiles,living.filter(r=>!r.weapon).map(r=>({x:r.goalX,y:r.goalY}))):[];
      let zoom=1,x=w/2,y=h/2,minX,maxX,minY,maxY;
      if(points.length) {
        minX=Math.min(...points.map(p=>p.x));maxX=Math.max(...points.map(p=>p.x));
        minY=Math.min(...points.map(p=>p.y));maxY=Math.max(...points.map(p=>p.y));
        zoom=clamp(Math.min(w/(maxX-minX+160),h/(maxY-minY+160)),1,1.25);
        x=(minX+maxX)/2;y=(minY+maxY)/2;c.zoom=Math.min(c.zoom,zoom);
      }
      c.zoom+=clamp(zoom-c.zoom,-.008,.002);
      const hx=w/2/c.zoom,hy=h/2/c.zoom;
      x=clamp(x,hx,w-hx);y=clamp(y,hy,h-hy);
      c.x+=clamp((x-c.x)*.025,-.75,.75);c.y+=clamp((y-c.y)*.025,-.75,.75);
      if(points.length&&c.zoom>1) {c.x=clamp(c.x,maxX+64-hx,minX-64+hx);c.y=clamp(c.y,maxY+64-hy,minY-64+hy);}
      c.x=clamp(c.x,hx,w-hx);c.y=clamp(c.y,hy,h-hy);
    }
    champions() {
      const best = Math.max(...this.wins);
      return this.wins.map((score, id) => score === best ? id : -1).filter(id => id >= 0);
    }
    snapshot() {
      const s = this.roundSim.snapshot();
      return { ...s, seed: this.seed, roundSeed: this.roundSeed, t: this.t, roundTime: s.t,
        videoTime: this.step / 60, step: this.step, phase: this.phase, roundPhase: s.phase,
        round: this.roundNumber, completedRounds: this.completedRounds, wins: [...this.wins], draws: this.draws,
        roundResults: this.roundResults.map(r => ({ ...r })), champions: this.champions(),
        tournament: this.cfg.episodeMode === 'tournament', outroUntil: this.outroUntil,
        arena: this.cfg.arena, camera: { ...this.camera },
        workshop: JSON.parse(JSON.stringify(this.workshop)),
        pauseRemaining: this.phase === 'pause' ? (this.pauseUntil - this.step) / 60 : 0,
        roundHash: this.roundSim.stateHash(), eventSeq: this.eventSeq,
        summary: this.cfg.episodeMode === 'tournament' && this.completedRounds === 8
          ? `Turnier beendet · ${this.champions().map(id => this.roundSim.robots[id].name).join(' + ')} · ${Math.max(...this.wins)} Siege`
          : `Runde ${this.roundNumber} · ${s.summary}` };
    }
    stateHash() {
      // Full round state (AI targets/cooldowns, both RNGs, objects, effects, UI
      // feed) plus episode scheduling and a rolling digest of ALL past events.
      const state = { version: this.cfg.rulesVersion==='v3'?'scrap-episode-v3':'scrap-episode-v2', seed: this.seed, cfg: this.cfg, world: this.world,
        timeScale: this.timeScale, unitsPerStep: this.unitsPerStep, step: this.step, simTicks: this.simTicks,
        accumulator: this.accumulator, round: this.roundNumber, roundSeed: this.roundSeed,
        phase: this.phase, pauseUntil: this.pauseUntil, completed: this.completedRounds,
        wins: this.wins, draws: this.draws, roundResults: this.roundResults, outroUntil: this.outroUntil,
        eventSeq: this.eventSeq, eventDigest: this.eventDigest,
        camera: this.camera,
        workshop: this.workshop,
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
      if (this.cfg.episodeMode === 'tournament' && (this.completedRounds > 8 || this.roundNumber > 8)) errors.push('Turnier hat mehr als acht Runden');
      if (![this.camera.x,this.camera.y,this.camera.zoom].every(Number.isFinite) || this.camera.zoom < 1 || this.camera.zoom > 1.4) errors.push('Kamerazustand ungültig');
      if (this.workshop.installed.some(n => !Number.isInteger(n) || n < 0 || n > 1) || this.workshop.balances.some(n => !Number.isInteger(n) || n < 0 || n > 3) ||
          this.workshop.modules.some(m => m !== null && !Object.hasOwn(EBS.ScrapRules.modules, m))) errors.push('Werkstattgrenzen verletzt');
      if (!this.cfg.workshop && this.workshop.installed.some(Boolean)) errors.push('Werkstatt unerwartet aktiv');
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
  // Same pure simulation in live UI and export preflight. Bounded chunks allow
  // UI updates/cancellation; no images or audio are created during planning.
  function createExportPlan(cfg, world) {
    if (cfg.params.episodeMode !== 'tournament') return null;
    const sim = new Episode({ seed: cfg.seed, params: cfg.params, world, timeScale: cfg.video.tempo });
    return { advance() {
      for (let i = 0; i < 1200 && sim.phase !== 'ended'; i++) sim.stepOnce();
      if (sim.step > 1200 * 60) throw new Error('Turnier überschreitet die maximale Laufzeit.');
      const done = sim.phase === 'ended';
      if (done && !sim.checkInvariants().ok) throw new Error('Turnierprüfung fehlgeschlagen.');
      return { done, round: sim.roundNumber,
        durationSec: done ? Math.ceil(sim.step / 60 * cfg.video.fps) / cfg.video.fps : null };
    } };
  }
  EBS.Scrap = { Episode, normalizeParams, layout, EVENT_LIMIT, createExportPlan };
})();
