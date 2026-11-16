/* Territory Wars · Short mode, rule version "territory-short-v1".
 *
 * A compact map for 9:16 Shorts plus a hidden director. The archived rules in
 * simulation.js stay byte-identical. This round only
 *   - builds its own small map with the four crowns in a diamond,
 *   - casts the four factions into story roles from the seed,
 *   - scales income, initiative, marching time and defense per faction on a
 *     fixed schedule, and
 *   - hands a fallen kingdom to its conqueror instead of turning it neutral.
 * Every unit still marches and fights by the original rules: nothing teleports
 * and a crown only changes hands when troops arrive there. The schedule is a
 * pure function of seed, round time and the round's own state. No renderer
 * state, no wall clock and no additional random draws while the round runs. */
(function () {
  'use strict';
  const { clamp } = EBS.util, Territory = EBS.Territory, Base = Territory.ObservedRound;
  const TEAMS = HexSim.TEAMS;
  const VERSION = 'territory-short-v1';
  // Camera-aligned half extents in hex units. Chosen for a 9:16 frame without bands.
  const MAP = Object.freeze({ halfU: 4.6, halfV: 9.8, angle: .16, corner: 4 });
  // Diamond: 0 top, 1 right, 2 bottom, 3 left (fractions of the half extents).
  const SEATS = Object.freeze([[0, -.62], [.62, 0], [0, .62], [-.62, 0]]);
  // Beat sheet as fractions of the story length (round seconds).
  const BEATS = Object.freeze({ first: .30, second: .58, surge: .70, final: .965, lead: .16 });
  const ARMOR = 40;
  const SCRIPTS = Object.freeze(['none', 'crown']);
  const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
  const grid = fill => [0, 1, 2, 3].map(() => [fill, fill, fill, fill]);
  const normalizeStory = (o = {}) => ({
    story: SCRIPTS.includes(o.story) ? o.story : 'crown',
    storySec: clamp(Number.isFinite(Number(o.storySec)) ? Number(o.storySec) : 60, 40, 180),
  });
  // Sim.reset() runs inside the base constructor, before a subclass may touch `this`.
  let pending = null;

  class ShortRound extends Base {
    constructor(options = {}) { pending = normalizeStory(options); super(options); pending = null; }

    reset(seed = this.seed) {
      const options = pending || this.options || normalizeStory();
      super.reset(seed);                       // original clocks, counters and statistics
      this.rules = VERSION; this.options = options;
      this.rng = new EBS.RNG(this.seed ^ 0x51a07e11);
      this.moves = []; this.events = []; this.milestones = []; this.eventId = 0;
      this.cues = []; this.falls = []; this._actor = -1; this._planning = false;
      this._buildMap();
      this._seatFactions();
      this._supply();
      this._event('start', -1, 'Four crowns. One map.', this.lookup.get('0,0'));
      this._direct();
      return this;
    }

    _buildMap() {
      const { halfU, halfV, angle, corner } = MAP, ca = Math.cos(angle), sa = Math.sin(angle);
      const noise = new EBS.RNG(this.seed ^ 0x0b5e55ed), cache = new Map();
      this.mapBounds = { halfU, halfV, angle };
      this.tiles = []; this.lookup = new Map();
      for (let r = -12; r <= 12; r++) for (let q = -14; q <= 14; q++) {
        const x = Math.sqrt(3) * (q + r / 2), z = 1.5 * r, u = x * ca - z * sa, v = x * sa + z * ca;
        // Rounded rectangle: soft corners show the table instead of dead tiles.
        if ((Math.abs(u) / halfU) ** corner + (Math.abs(v) / halfV) ** corner > 1) continue;
        // Point-symmetric terrain keeps opposite crowns on equal ground.
        const sign = q < 0 || (q === 0 && r < 0) ? -1 : 1, key = `${q * sign},${r * sign}`;
        if (!cache.has(key)) cache.set(key, noise.next());
        const n = cache.get(key);
        let terrain = n < .17 ? 'forest' : n < .28 ? 'hill' : 'plain';
        // Scenery only: the end rows sit under the Shorts interface anyway.
        const cap = Math.abs(v) > halfV - 1.75;
        const flank = Math.abs(u) > halfU - 1.3 && Math.abs(v) > halfV * .30 && Math.abs(v) < halfV * .50 && n < .62;
        if (cap || flank) terrain = 'mountain';
        if (q === 0 && r === 0) terrain = 'outpost';
        this.tiles.push({ id: this.tiles.length, q, r, x, z, terrain, height: terrain === 'mountain' ? .57 : .28, owner: -1,
          units: terrain === 'mountain' ? 0 : terrain === 'outpost' ? 9 : terrain === 'hill' ? 3 : terrain === 'forest' ? 2 : 1,
          hq: -1, bunker: false, neighbors: [], supplied: false, lastCapture: -100, lastBattle: -100, lastAttacker: -1,
          lastAttackAmount: 0, cooldown: 0, builtAt: -100 });
        this.lookup.set(`${q},${r}`, this.tiles.length - 1);
      }
      for (const t of this.tiles) t.neighbors = HexSim.DIRS.map(([dq, dr]) => this.lookup.get(`${t.q + dq},${t.r + dr}`)).filter(id => id !== undefined);
      this._connectMap();
    }

    _seatFactions() {
      const { halfU, halfV, angle } = MAP, ca = Math.cos(angle), sa = Math.sin(angle);
      const u = t => t.x * ca - t.z * sa, v = t => t.x * sa + t.z * ca;
      const seats = SEATS.map(([su, sv]) => this.tiles.reduce((best, t) =>
        (u(t) - su * halfU) ** 2 + (v(t) - sv * halfV) ** 2 < (u(best) - su * halfU) ** 2 + (v(best) - sv * halfV) ** 2 ? t : best));
      // Casting has its own stream: colours, seats and roles differ per seed,
      // while the decision stream below starts exactly like the original.
      const cast = new EBS.RNG(this.seed ^ 0xc0a57e11), seatOf = [0, 1, 2, 3];
      for (let i = 3; i > 0; i--) { const j = Math.floor(cast.next() * (i + 1)); [seatOf[i], seatOf[j]] = [seatOf[j], seatOf[i]]; }
      const at = seat => seatOf.indexOf(seat), villainSeat = cast.next() < .5 ? 1 : 3, heroSeat = cast.next() < .5 ? 0 : 2;
      const thinkOffsets = [.12, .25, .38, .51];
      for (let i = 3; i > 0; i--) { const j = Math.floor(this.rng.next() * (i + 1)); [thinkOffsets[i], thinkOffsets[j]] = [thinkOffsets[j], thinkOffsets[i]]; }
      this.factions = TEAMS.map((team, id) => {
        const hq = seats[seatOf[id]]; hq.hq = id; hq.terrain = 'plain'; hq.height = .28; hq.owner = id; hq.units = 24;
        for (const nid of hq.neighbors) { const t = this.tiles[nid]; if (t.terrain === 'mountain') t.terrain = 'plain'; t.height = .28; t.owner = id; t.units = 4; }
        return { id, alive: true, hq: hq.id, thinkAt: thinkOffsets[id], goalAt: 0, goal: -1, aggressionBias: .94 + this.rng.next() * .12,
          pace: .63 + this.rng.next() * .20, buildBias: this.rng.next(), captures: 0, kills: 0, eliminatedAt: null, focusTile: -1,
          focusUntil: 0, lastOffensiveAt: -100, nextOffensiveAt: thinkOffsets[id] };
      });
      const script = this.options.story;
      this.story = { script, length: this.options.storySec, seatOf: seatOf.slice(),
        villain: at(villainSeat), rival: at(4 - villainSeat), hero: at(heroSeat), prey: at(2 - heroSeat),
        phase: script === 'none' ? 'free' : 'clash', gate: -1, opensAt: 0, lastStandAt: null, surgeAt: null };
      this.mods = { income: [1, 1, 1, 1], pace: [1, 1, 1, 1], march: [1, 1, 1, 1], hq: grid(1), plan: grid(1), field: grid(1) };
    }

    /* The director. Runs once per rule tick before the original tick. It only
     * writes multipliers and long-term goals; the original AI still chooses
     * every single march. Beats that run late keep ramping until they happen.
     *   income[f]      income factor of faction f
     *   pace[f]        factor on the pause between two offensives of f
     *   march[f]       factor on the marching time of f's columns
     *   field[d][a]    defense factor of d's ordinary fields against attacker a
     *   hq[d][a]       true defense factor of d's crown against attacker a
     *   plan[d][a]     what attacker a expects there (differs only in the siege) */
    _direct() {
      const s = this.story; if (!s || s.script === 'none') return;
      const f = this.factions, t = this.time, G = s.length, { villain: V, rival: R, prey: P, hero: H } = s;
      const income = [1, 1, 1, 1], pace = [1, 1, 1, 1], march = [1, 1, 1, 1], hq = grid(ARMOR), plan = grid(ARMOR), field = grid(1), lead = BEATS.lead * G;
      const ramp = (target, from) => t <= from ? 0 : (t - from) / Math.max(1, target - from);
      // Rough marching time an attacker needs to reach a crown: fields between them times a hop.
      const reach = (a, d) => { const goal = this.tiles[f[d].hq]; let best = 99;
        for (const x of this.tiles) if (x.owner === a) best = Math.min(best, HexSim.distance(x, goal)); return 3 + 2.2 * Math.max(1, best); };
      const aim = (id, goal) => { if (f[id].alive && f[goal].alive) { f[id].goal = goal; f[id].goalAt = t + 30; } };
      const lastFall = this.falls.length ? this.falls[this.falls.length - 1].time : 0;
      if (f[V].alive && f[H].alive && (f[R].alive || f[P].alive)) {
        // Acts one and two: the giant takes its rival, then the far crown.
        const victim = f[R].alive ? R : P, first = victim === R && f[P].alive;
        const target = (first ? BEATS.first : BEATS.second) * G;
        // The gate opens once, as late as the remaining way allows; afterwards it stays open.
        if (s.gate !== victim && t >= Math.max(Math.min(target - 1.4 * reach(V, victim), target - .7 * lead), lastFall + .05 * G)) { s.gate = victim; s.opensAt = t; }
        const open = s.gate === victim, from = open ? s.opensAt : t, p = open ? ramp(Math.max(target, from + .5 * lead), from) : 0;
        s.phase = first ? 'clash' : 'giant';
        income[V] = 1.6 + .6 * Math.min(p, 1) + .6 * Math.max(0, p - 1);
        income[victim] = 1 - .5 * Math.min(p, 1);
        income[H] = .75; pace[V] = .45; pace[victim] = 1.4; pace[H] = 2;
        field[victim][V] = lerp(.75, .4, p);
        field[V][H] = 1.5;
        if (open) hq[victim][V] = plan[victim][V] = lerp(1.1, .3, p) / (1 + Math.max(0, p - 1) * 1.5);
        aim(V, victim); aim(victim, V); aim(H, V);
        if (first) aim(P, R);
      } else if (f[V].alive && f[H].alive) {
        // Act three: the last crown holds a siege, then turns the war around.
        if (s.lastStandAt === null) s.lastStandAt = lastFall + .05 * G;
        if (s.phase !== 'laststand' && s.phase !== 'surge' && t >= s.lastStandAt) {
          s.phase = 'laststand'; this._event('story', H, 'Last stand', f[H].hq, { beat: 'laststand' });
        }
        // The turn comes as late as the hero's way to the giant's crown allows.
        if (s.phase === 'laststand' && t >= Math.max(s.lastStandAt + .07 * G, Math.min(BEATS.final * G - 2 * reach(H, V), BEATS.surge * G))) {
          s.phase = 'surge'; s.surgeAt = t; this._event('story', H, 'Turn of the tide', f[H].hq, { beat: 'surge' });
        }
        const final = s.surgeAt === null ? 0 : Math.max(BEATS.final * G, s.surgeAt + .10 * G), p = s.surgeAt === null ? 0 : ramp(final, s.surgeAt);
        // The giant believes the last crown is within reach and bleeds at its walls.
        plan[H][V] = 1;
        if (p <= 0) {
          income[V] = 1.6; income[H] = .7; field[H][V] = .4; pace[V] = .35; pace[H] = 2;
        } else {
          pace[H] = .4; pace[V] = lerp(1, 1.6, p); march[H] = .65;
          income[H] = 2.2 + 1.3 * Math.min(p, 1) + 2 * Math.max(0, p - 1);
          income[V] = 1.1 - .6 * Math.min(p, 1);
          field[V][H] = lerp(.45, .25, p); field[H][V] = lerp(.9, 1.6, p);
          if (p > .45) hq[V][H] = plan[V][H] = lerp(1.2, .25, (p - .45) / .55) / (1 + Math.max(0, p - 1) * 2);
        }
        aim(V, H); aim(H, V);
      } else s.phase = 'free';
      // Initiative: how soon a faction may launch its next offensive.
      for (const x of f) if (x.alive && x.lastOffensiveAt > -50) x.nextOffensiveAt = x.lastOffensiveAt + this.config.offensiveInterval * pace[x.id];
      this.mods = { income, pace, march, hq, plan, field };
    }

    income(t) {
      if (typeof t === 'number') t = this.tiles[t];
      const base = super.income(t);
      return base && this.mods && t.owner >= 0 ? base * this.mods.income[t.owner] : base;
    }
    defense(t) {
      if (typeof t === 'number') t = this.tiles[t];
      const base = super.defense(t), a = this._actor;
      if (!this.mods || !t || t.owner < 0 || a === undefined || a < 0 || a === t.owner) return base;
      return base * (t.hq >= 0 ? (this._planning ? this.mods.plan : this.mods.hq)[t.owner][a] : this.mods.field[t.owner][a]);
    }
    _tick() { this._direct(); super._tick(); }
    _think(f) { this._actor = f.id; this._planning = true; try { super._think(f); } finally { this._actor = -1; this._planning = false; } }
    _dispatch(from, to, owner, amount, kind) {
      const k = this.mods ? this.mods.march[owner] : 1; if (k === 1) return super._dispatch(from, to, owner, amount, kind);
      const config = this.config, base = config.marchDuration;
      // Scaled only while this one column is created, so the event copy matches the march.
      config.marchDuration = base * k;
      try { return super._dispatch(from, to, owner, amount, kind); } finally { config.marchDuration = base; }
    }
    _arrive(move) { this._actor = move.owner; try { super._arrive(move); } finally { this._actor = -1; } }
    /* Short rule: whoever takes a crown takes the kingdom. The original turns the
     * fallen fields neutral; here they change to the conqueror's colour with the
     * same remaining garrison, so unit accounting stays exactly as before. */
    _eliminate(id, by, tile) {
      const alive = this.factions[id].alive, realm = alive ? this.tiles.filter(t => t.owner === id).map(t => t.id) : [];
      super._eliminate(id, by, tile);
      if (!alive) return;
      if (this.story.script !== 'none') for (const n of realm) this.tiles[n].owner = by;
      this.falls.push({ id, by, time: this.time, fields: realm.length });
    }
    _event(type, team, text, tile, extra = {}) {
      const event = super._event(type, team, text, tile, extra);
      // Bounded cue list for captions: fall, story turn and victory.
      if (this.cues && (type === 'hq' || type === 'story' || type === 'victory')) {
        this.cues.push({ time: this.time, type, team, other: extra.eliminated ?? -1, beat: extra.beat || null, tile: tile ?? -1 });
        if (this.cues.length > 12) this.cues.shift();
      }
      return event;
    }
  }

  Object.assign(Territory, { ShortRound, SHORT_VERSION: VERSION, SHORT_MAP: MAP, SHORT_BEATS: BEATS, SHORT_SCRIPTS: SCRIPTS, normalizeStory });
})();
