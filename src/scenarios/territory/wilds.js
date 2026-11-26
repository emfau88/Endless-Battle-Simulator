/* Optional large map. The original Hex Dominion simulation owns combat, income,
 * troop dispatches and victory. Only this round builds a larger board and
 * schedules a crater and a neutral traveller. All clocks are round seconds. */
(function () {
  'use strict';
  const T = EBS.Territory;
  const { distance, DIRS } = HexSim;
  const SCALE = Math.sqrt(1.3);
  const VERSION = 'territory-wilds-v1';
  const WARNING = 6; // Longer than the longest legal march, including hill terrain.
  const SEATS = [[-.62, -.60], [.62, -.60], [.62, .60], [-.62, .60]];

  function mapNeighbors(r, tile) {
    return DIRS.map(([dq, dr]) => r.lookup.get((tile.q + dq) + ',' + (tile.r + dr))).filter(id => id !== undefined);
  }

  function buildBoard(r) {
    const halfU = 12.8 * SCALE, halfV = 8.7 * SCALE;
    const angle = .16, co = Math.cos(angle), si = Math.sin(angle);
    const noise = new EBS.RNG(r.seed ^ 0xa45f9211), samples = new Map();
    const u = tile => tile.x * co - tile.z * si, v = tile => tile.x * si + tile.z * co;
    r.mapBounds = { halfU, halfV, angle };
    r.tiles = []; r.lookup = new Map();
    for (let row = -18; row <= 18; row++) for (let q = -28; q <= 28; q++) {
      const tile = { id: r.tiles.length, q, r: row, x: Math.sqrt(3) * (q + row / 2), z: 1.5 * row };
      const a = Math.abs(u(tile)), b = Math.abs(v(tile));
      if (a > halfU || b > halfV || (a > halfU - 1.2 && b > halfV - 1.2)) continue;
      const sign = q < 0 || (q === 0 && row < 0) ? -1 : 1, pair = (q * sign) + ',' + (row * sign);
      if (!samples.has(pair)) samples.set(pair, noise.next());
      const n = samples.get(pair);
      let terrain = n < .23 ? 'forest' : n < .38 ? 'hill' : 'plain';
      if ((a > halfU - 1.65 && b > halfV * .18 && b < halfV * .78 && n < .76) ||
          (b > halfV - 1.55 && a < halfU * .55)) terrain = 'mountain';
      if (!q && !row) terrain = 'outpost';
      const units = { plain: 1, forest: 2, hill: 3, mountain: 0, outpost: 9 }[terrain];
      Object.assign(tile, { terrain, height: terrain === 'mountain' ? .57 : .28, owner: -1, units,
        hq: -1, bunker: false, neighbors: [], supplied: false, lastCapture: -100,
        lastBattle: -100, lastAttacker: -1, lastAttackAmount: 0, cooldown: 0, builtAt: -100 });
      r.tiles.push(tile); r.lookup.set(q + ',' + row, tile.id);
    }
    for (const tile of r.tiles) tile.neighbors = mapNeighbors(r, tile);
    r._connectMap();
    // Keep the four original faction clocks, personalities and decision RNG state.
    for (const faction of r.factions) {
      const [su, sv] = SEATS[faction.id];
      const cost = t => (u(t) - su * halfU) ** 2 + (v(t) - sv * halfV) ** 2;
      const hq = r.tiles.reduce((best, t) => cost(t) < cost(best) ? t : best);
      faction.hq = hq.id;
      Object.assign(hq, { hq: faction.id, terrain: 'plain', height: .28, owner: faction.id, units: 24 });
      for (const id of hq.neighbors) {
        const t = r.tiles[id];
        if (t.terrain === 'mountain') t.terrain = 'plain';
        Object.assign(t, { height: .28, owner: faction.id, units: 4 });
      }
    }
    r._supply();
  }

  function path(r, from, to, avoid) {
    const parent = new Map([[from.id, -1]]), queue = [from.id];
    for (let i = 0; i < queue.length && !parent.has(to.id); i++) {
      for (const id of r.tiles[queue[i]].neighbors) {
        const t = r.tiles[id];
        if (parent.has(id) || t.terrain === 'mountain' || t.hq >= 0 || id === avoid) continue;
        parent.set(id, queue[i]); queue.push(id);
      }
    }
    if (!parent.has(to.id)) return [];
    const result = [];
    for (let id = to.id; id !== -1; id = parent.get(id)) result.push(id);
    return result.reverse();
  }

  const giantGround = r => r.tiles.filter(t => t.terrain !== 'mountain' && t.hq < 0 && t.id !== r.meteor?.tile);

  function giantEnds(bounds, ground, angle) {
    const co = Math.cos(bounds.angle), si = Math.sin(bounds.angle);
    const u = .86 * bounds.halfU * Math.cos(angle), v = .86 * bounds.halfV * Math.sin(angle);
    const x = u * co + v * si, z = -u * si + v * co;
    const nearest = (x, z) => ground.reduce((best, t) =>
      (t.x-x)**2 + (t.z-z)**2 < (best.x-x)**2 + (best.z-z)**2 ? t : best);
    return [nearest(-x, -z), nearest(x, z)];
  }

  function giantRoute(r) {
    const rng = r.giantRng, ground = giantGround(r), avoid = r.meteor?.tile;
    const [entry, exit] = giantEnds(r.mapBounds, ground, rng.range(0, Math.PI * 2));
    const center = r.tiles[r.lookup.get('0,0')];
    const front = ground.filter(t => distance(t, center) <= 5 && t.owner >= 0 &&
      t.neighbors.some(id => r.tiles[id].owner >= 0 && r.tiles[id].owner !== t.owner));
    const via = front.length ? front[rng.int(0, front.length-1)] : center;
    const first = path(r, entry, via, avoid), second = path(r, via, exit, avoid);
    return first.length && second.length ? first.concat(second.slice(1)) : [];
  }

  class WildsRound extends T.ObservedRound {
    giantEntryTile() {
      // The approach is visible just before the first garrison can react.
      // Reading the upcoming heading must never advance the encounter stream.
      const preview = new EBS.RNG(this.giantRng.s);
      return giantEnds(this.mapBounds, giantGround(this), preview.range(0, Math.PI * 2))[0];
    }
    reset(seed = this.seed) {
      super.reset(seed);
      buildBoard(this);
      this.rules = VERSION;
      this.giant = null; this.meteor = null;
      this.giantRng = new EBS.RNG(EBS.util.hashSeed(VERSION, this.seed, 'giant'));
      this.meteorRng = new EBS.RNG(EBS.util.hashSeed(VERSION, this.seed, 'meteor'));
      this.nextGiant = this.giantRng.range(9, 15);
      this.nextMeteor = this.meteorRng.range(78, 105);
      this.events = []; this.milestones = []; this.eventId = 0;
      this._event('start', -1, 'Four kingdoms on the great map.', this.lookup.get('0,0'));
      return this;
    }
    _tick() {
      super._tick();
      if (this.phase !== 'running') return;
      this._advanceMeteor();
      this._advanceGiant();
    }
    _advanceMeteor() {
      const m = this.meteor;
      if (!m) {
        if (this.time < this.nextMeteor) return;
        const center = this.tiles[this.lookup.get('0,0')], route = this.giant?.route || [];
        const eligible = this.tiles.filter(t => {
          const d = distance(t, center);
          return d > 0 && d <= 3 && t.terrain !== 'mountain' && t.hq < 0 &&
            t.neighbors.length >= 4 && !route.includes(t.id) &&
            this.factions.every(f => distance(t, this.tiles[f.hq]) >= 2);
        });
        if (!eligible.length) { this.nextMeteor = this.time + 5; return; }
        const frontier = eligible.filter(t => t.owner >= 0 && t.neighbors.some(id => this.tiles[id].owner !== t.owner));
        const pool = frontier.length ? frontier : eligible, target = pool[this.meteorRng.int(0, pool.length - 1)];
        const impact = this.time + WARNING;
        this.meteor = { tile: target.id, start: this.time, impact, until: impact + this.meteorRng.int(20, 28), closed: false };
        this._event('meteor_warning', -1, 'Meteor incoming', target.id);
        return;
      }
      const tile = this.tiles[m.tile];
      if (!m.closed && this.time + 1e-8 >= m.impact) {
        // The six-second warning stopped new orders through here. All previous
        // columns have arrived. Both the AI and supply now see the actual detour.
        for (const id of tile.neighbors) this.tiles[id].neighbors = this.tiles[id].neighbors.filter(n => n !== tile.id);
        tile.neighbors = []; m.closed = true;
        this._supply(); this._event('meteor_impact', -1, 'Crater blocks the pass', tile.id);
      } else if (m.closed && this.time + 1e-8 >= m.until) {
        tile.neighbors = mapNeighbors(this, tile);
        for (const id of tile.neighbors) this.tiles[id].neighbors = mapNeighbors(this, this.tiles[id]);
        this._supply(); this._event('meteor_clear', -1, 'Pass open', tile.id);
        this.meteor = null;
        this.nextMeteor = this.time + this.meteorRng.range(135, 195);
      }
    }
    _dispatch(from, to, owner, amount, kind) {
      const m = this.meteor;
      if (m && (from === m.tile || to === m.tile)) return false;
      return super._dispatch(from, to, owner, amount, kind);
    }
    _advanceGiant() {
      if (!this.giant) {
        if (this.time < this.nextGiant) return;
        const route = giantRoute(this);
        if (route.length < 2) { this.nextGiant = this.time + 8; return; }
        this.giant = { start: this.time, stride: this.giantRng.range(4.5, 6), route, visited: -1 };
        this._event('giant_arrival', -1, 'A stone giant appears', route[0]);
      }
      const g = this.giant, index = Math.floor((this.time - g.start + 1e-8) / g.stride);
      if (index >= g.route.length) {
        this.giant = null; this.nextGiant = this.time + this.giantRng.range(66, 104);
      } else if (index > g.visited) {
        g.visited = index;
        const tile = this.tiles[g.route[index]], amount = Math.floor(tile.units * .65);
        if (tile.owner < 0 || tile.hq >= 0 || amount < 1) return;
        // A retreat is a real march to an owned neighbour. Isolated garrisons
        // stay in place. No units are created and the giant takes no territory.
        const safe = tile.neighbors.map(id => this.tiles[id]).filter(t =>
          t.owner === tile.owner && t.id !== this.meteor?.tile);
        safe.sort((a, b) => Number(a.id === g.route[index+1]) - Number(b.id === g.route[index+1]) || a.units - b.units || a.id-b.id);
        if (safe.length && this._dispatch(tile.id, safe[0].id, tile.owner, amount, 'supply')) {
          this._event('giant_retreat', -1, 'Garrison retreats', tile.id, { faction: tile.owner, to: safe[0].id, amount });
        }
      }
    }
  }
  // Cosmetic decisions use the observed event and video clock. A skipped
  // render frame, the export speed and the four factions' RNGs play no part.
  class HqReactions {
    constructor() {
      this.last = null;
      this.lastFor = [];
      this.giantSeen = false;
    }

    observe(e, r) {
      if (e.type === 'giant_arrival') this.giantSeen = false;
      if (this.last && e.videoTime - this.last.at < 65) return;
      let team, kind, target = e.tile;
      const tile = r.tiles[e.tile];
      switch (e.type) {
        case 'giant_retreat':
          if (this.giantSeen || e.amount < 4) return;
          team = e.faction; kind = 'watch';
          break;
        case 'meteor_warning': {
          // A neutral, empty pass has nobody to warn. A column already on
          // this road can still belong to a different faction than the tile.
          const traffic = r.moves.filter(m => m.from === tile.id || m.to === tile.id);
          const column = traffic.sort((a, b) => b.amount - a.amount || a.id - b.id)[0];
          team = tile.supplied && tile.owner >= 0 ? tile.owner : column?.owner;
          kind = 'alarm';
          break;
        }
        case 'dispatch': {
          if (e.move.kind !== 'attack') return;
          const home = r.tiles[e.move.to];
          if (home.hq < 0 || home.hq === e.team || e.move.amount < Math.max(6, home.units * r.defense(home))) return;
          team = home.hq; kind = 'alarm'; target = e.move.from;
          break;
        }
        case 'battle':
          if (tile.hq < 0 || tile.hq !== e.previous || tile.owner !== e.previous || tile.units > 4 || e.p < 6) return;
          team = tile.hq; kind = 'relief'; target = e.move.from;
          break;
        case 'outpost': {
          if (e.previous < 0) return;
          const holdings = [0, 0, 0, 0];
          for (const t of r.tiles) if (t.owner >= 0) holdings[t.owner]++;
          if (holdings[e.team] >= holdings[e.previous]) return;
          team = e.team; kind = 'smirk';
          break;
        }
        case 'hq':
          team = e.team; kind = 'smirk';
          break;
        default: return;
      }
      if (!r.factions[team]?.alive || e.videoTime - (this.lastFor[team] ?? -Infinity) < 95) return;
      this.last = { team, kind, target, at: e.videoTime };
      this.lastFor[team] = e.videoTime;
      if (e.type === 'giant_retreat') this.giantSeen = true;
    }

    visible(videoTime) {
      if (!this.last) return null;
      const age = videoTime - this.last.at;
      if (age < 0 || age >= 2.2) return null;
      const opacity = Math.min(1, age / .14, (2.2 - age) / .24);
      return { ...this.last, opacity, zoom: .88 + .12 * Math.min(1, age / .18) };
    }
  }
  T.WildsRound = WildsRound;
  T.HqReactions = HqReactions;
})();
