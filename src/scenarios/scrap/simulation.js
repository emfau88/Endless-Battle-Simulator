// Extracted unchanged from docs/reference/scrap-arena.source.html. See SOURCE.json.
/* Scrap Arena: deterministic, dependency-free 2D simulation.
 * Positions are in a 900 × 900 world; time, cooldowns and lifetimes are seconds.
 * Visual effects use a separate RNG and can never alter the match outcome.
 */
(function (global) {
  'use strict';
  const API = global.ScrapArena = global.ScrapArena || {};
  const SIZE = 900, EDGE = 28, ROBOT_R = 24, MAX_WEAPONS = 10;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sq = v => v * v;
  const finite = (...v) => v.every(Number.isFinite);
  const TEAMS = [
    { name: 'EMBER', color: '#f26b59' }, { name: 'AZURE', color: '#54d6dc' },
    { name: 'AMBER', color: '#f3c65d' }, { name: 'MOSS', color: '#a5d66f' },
  ];
  const WEAPONS = {
    blaster: { ammo: 9, cooldown: .64, speed: 650, life: 1.7, radius: 4, damage: 3, blockDamage: 19 },
    rocket: { ammo: 3, cooldown: 1.45, speed: 265, life: 3.8, radius: 7, damage: 18, blockDamage: 95, blastRadius: 106 },
  };
  class RNG {
    constructor(seed) { this.s = seed >>> 0; }
    next() {
      let t = this.s = (this.s + 0x6d2b79f5) >>> 0;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
    range(a, b) { return a + (b - a) * this.next(); }
  }
  function segmentBox(x0, y0, x1, y1, x, y, w, h, pad = 0) {
    let near = 0, far = 1;
    const dx = x1 - x0, dy = y1 - y0;
    for (const [p, d, lo, hi] of [[x0, dx, x - pad, x + w + pad], [y0, dy, y - pad, y + h + pad]]) {
      if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return null; }
      else {
        let a = (lo - p) / d, b = (hi - p) / d;
        if (a > b) [a, b] = [b, a];
        near = Math.max(near, a); far = Math.min(far, b);
        if (near > far) return null;
      }
    }
    return near >= 0 && near <= 1 ? near : null;
  }
  function segmentCircle(x0, y0, x1, y1, x, y, r) {
    const dx = x1 - x0, dy = y1 - y0, fx = x0 - x, fy = y0 - y;
    const a = dx * dx + dy * dy, c = fx * fx + fy * fy - r * r;
    if (c <= 0) return 0;
    if (a < 1e-12) return null;
    const b = 2 * (fx * dx + fy * dy), d = b * b - 4 * a * c;
    if (d < 0) return null;
    const t = (-b - Math.sqrt(d)) / (2 * a);
    return t >= 0 && t <= 1 ? t : null;
  }
  function distanceToBox(x, y, b) {
    return Math.hypot(x - clamp(x, b.x, b.x + b.w), y - clamp(y, b.y, b.y + b.h));
  }

  class Sim {
    constructor({ seed = 42 } = {}) { this.reset(seed); }
    reset(seed = this.seed) {
      this.seed = Math.abs(Math.floor(Number(seed) || 0)) >>> 0;
      this.rng = new RNG(this.seed ^ 0x4b19d2a1);
      this.fxRng = new RNG(this.seed ^ 0xe17b8e73);
      this.t = 0; this.ticks = 0; this.duration = 90;
      this.phase = 'running'; this.winner = null;
      this.nextId = 1; this.eventSeq = 0;
      this.projectiles = []; this.effects = []; this.events = []; this.pickups = [];
      this.stats = { destroyed: 0, shots: 0, pickups: 0, drops: 0 };
      const starts = [[145, 145], [755, 145], [755, 755], [145, 755]];
      this.robots = TEAMS.map((team, id) => {
        const [x, y] = starts[id], a = Math.atan2(450 - y, 450 - x) + this.rng.range(-.35, .35);
        return { id, ...team, x, y, vx: Math.cos(a) * 125, vy: Math.sin(a) * 125,
          r: ROBOT_R, hp: 125, maxHp: 125, alive: true, angle: a,
          weapon: this._weapon('blaster'), kills: 0, damage: 0,
          hurtUntil: 0, flashUntil: 0, cooldown: this.rng.range(.3, .9),
          speed: this.rng.range(118, 132), turnBias: id % 2 ? -1 : 1,
          thinkIn: 0, goalX: 450, goalY: 450, bounceUntil: 0, stuckTime: 0,
          lastX: x, lastY: y, lastCheck: 0, targetBias: starts.map(() => this.rng.range(.94, 1.06)) };
      });
      // Each obstacle is an independent physical block. Gaps and the outer ring
      // are wider than a robot; no starting position or supply pad is enclosed.
      const layout = [
        [246, 246, 66, 54], [318, 246, 60, 54], [522, 246, 60, 54], [588, 246, 66, 54],
        [246, 600, 66, 54], [318, 600, 60, 54], [522, 600, 60, 54], [588, 600, 66, 54],
        [246, 366, 54, 66], [246, 468, 54, 66], [600, 366, 54, 66], [600, 468, 54, 66],
        [396, 366, 48, 48], [456, 486, 48, 48],
      ];
      this.blocks = layout.map(([x, y, w, h], id) => ({ id, x, y, w, h, hp: 50, maxHp: 50, alive: true }));
      this.pads = [{ x: 450, y: 130, kind: 'rocket', readyIn: 3, period: 10 },
        { x: 450, y: 770, kind: 'blaster', readyIn: 5, period: 8 }];
      this._addPickup(155, 450, 'rocket');
      this._addPickup(745, 450, 'rocket');
      this._addPickup(450, 330, 'blaster');
      this._addPickup(450, 570, 'blaster');
      this._event('start', 'Vier Roboter · eine Arena', null);
      return this;
    }
    _weapon(kind, ammo) { return { kind, ammo: ammo ?? WEAPONS[kind].ammo, maxAmmo: WEAPONS[kind].ammo }; }
    _event(kind, text, team) {
      this.events.push({ seq: this.eventSeq++, t: this.t, kind, text, team });
      if (this.events.length > 10) this.events.shift();
    }
    _effect(type, x, y, color, size, ttl, angle = 0) {
      this.effects.push({ type, x, y, age: 0, ttl, color, size, angle, seed: (this.fxRng.next() * 4294967296) >>> 0 });
      if (this.effects.length > 140) this.effects.shift();
    }
    _addPickup(x, y, kind, ammo = WEAPONS[kind].ammo, empty = false) {
      const p = { id: this.nextId++, x, y, kind, ammo: empty ? 0 : ammo, maxAmmo: WEAPONS[kind].ammo,
        empty: empty || ammo <= 0, age: 0, ttl: empty || ammo <= 0 ? 3 : Infinity };
      this.pickups.push(p);
      return p;
    }
    _weaponCount() {
      return this.pickups.filter(p => !p.empty && p.ammo > 0).length + this.robots.filter(r => r.alive && r.weapon).length;
    }
    _safeDrop(r) {
      // Prefer beside the robot, then its already-valid centre. Never bury a
      // charged weapon inside intact cover or outside the arena.
      for (let i = 0; i < 8; i++) {
        const a = r.angle + Math.PI / 2 + i * Math.PI / 4;
        const x = r.x + Math.cos(a) * 27, y = r.y + Math.sin(a) * 27;
        if (x > EDGE + 12 && x < SIZE - EDGE - 12 && y > EDGE + 12 && y < SIZE - EDGE - 12 &&
            !this.blocks.some(b => b.alive && distanceToBox(x, y, b) < 13)) return { x, y };
      }
      return { x: r.x, y: r.y };
    }
    _drop(r, exhausted = false) {
      if (!r.weapon) return;
      const w = r.weapon, at = this._safeDrop(r);
      this._addPickup(at.x, at.y, w.kind, w.ammo, exhausted || w.ammo <= 0);
      r.weapon = null; r.thinkIn = 0;
      this.stats.drops++;
      this._effect('drop', at.x, at.y, r.color, 27, .65, r.angle);
      if (exhausted) this._event('drop', `${r.name}: Magazin leer`, r.id);
    }
    _nearestEnemy(r) {
      let found = null, best = Infinity;
      for (const other of this.robots) if (other.alive && other.id !== r.id) {
        const d = (sq(r.x - other.x) + sq(r.y - other.y)) * r.targetBias[other.id];
        if (d < best) { best = d; found = other; }
      }
      return found;
    }
    _blocked(x0, y0, x1, y1, pad = 0) {
      return this.blocks.some(b => b.alive && segmentBox(x0, y0, x1, y1, b.x, b.y, b.w, b.h, pad) !== null);
    }
    _think(r) {
      r.thinkIn = .38 + this.rng.next() * .22;
      if (!r.weapon) {
        let goal = null, score = Infinity;
        for (const p of this.pickups) if (!p.empty && p.ammo > 0) {
          const d = Math.hypot(p.x - r.x, p.y - r.y);
          const cost = d + (this._blocked(r.x, r.y, p.x, p.y, r.r) ? 145 : 0);
          if (cost < score) { score = cost; goal = p; }
        }
        if (!goal) goal = this.pads.reduce((a, b) =>
          Math.hypot(b.x - r.x, b.y - r.y) + b.readyIn * 24 < Math.hypot(a.x - r.x, a.y - r.y) + a.readyIn * 24 ? b : a);
        r.goalX = goal.x; r.goalY = goal.y;
      } else {
        const enemy = this._nearestEnemy(r);
        if (!enemy) return;
        const dx = enemy.x - r.x, dy = enemy.y - r.y, dist = Math.hypot(dx, dy) || 1;
        // Circle at a useful firing range, approach distant opponents and avoid
        // pushing stationary bodies against each other at point-blank range.
        const chase = dist > 350 ? .85 : dist < 165 ? -.8 : .18;
        const side = .65 * r.turnBias;
        r.goalX = r.x + (dx * chase - dy * side) / dist * 160;
        r.goalY = r.y + (dy * chase + dx * side) / dist * 160;
      }
      r.goalX = clamp(r.goalX, EDGE + r.r + 5, SIZE - EDGE - r.r - 5);
      r.goalY = clamp(r.goalY, EDGE + r.r + 5, SIZE - EDGE - r.r - 5);
    }
    _steer(r, dt) {
      if (r.thinkIn <= 0) this._think(r);
      r.thinkIn -= dt;
      let dx = r.goalX - r.x, dy = r.goalY - r.y, len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      // Local obstacle avoidance selects a visible detour corner; unlike a
      // cosmetic animation, destroyed blocks disappear from these decisions.
      const blocked = this.blocks.find(b => b.alive && segmentBox(r.x, r.y, r.x + dx * 76, r.y + dy * 76, b.x, b.y, b.w, b.h, r.r + 3) !== null);
      if (blocked) {
        const gap = r.r + 12, b = blocked;
        const corners = [[b.x - gap, b.y - gap], [b.x + b.w + gap, b.y - gap],
          [b.x - gap, b.y + b.h + gap], [b.x + b.w + gap, b.y + b.h + gap]];
        let waypoint = null, best = Infinity;
        for (const [x, y] of corners) {
          if (this._blocked(r.x, r.y, x, y, r.r + 1)) continue;
          const cost = Math.hypot(x - r.x, y - r.y) + Math.hypot(r.goalX - x, r.goalY - y);
          if (cost < best) { best = cost; waypoint = { x, y }; }
        }
        if (waypoint) { dx = waypoint.x - r.x; dy = waypoint.y - r.y; len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len; }
        else { const old = dx; dx = -dy * r.turnBias; dy = old * r.turnBias; }
      }
      if (this.t >= r.bounceUntil) {
        const blend = 1 - Math.exp(-dt * (r.weapon ? 2.1 : 4.2));
        r.vx += (dx * r.speed - r.vx) * blend;
        r.vy += (dy * r.speed - r.vy) * blend;
      }
      const speed = Math.hypot(r.vx, r.vy);
      if (speed < r.speed * .55) {
        if (speed > .01) { r.vx *= r.speed * .55 / speed; r.vy *= r.speed * .55 / speed; }
        else { r.vx = dx * r.speed; r.vy = dy * r.speed; }
      }
      r.x += r.vx * dt; r.y += r.vy * dt;
      this._resolveRobot(r);
    }
    _reflect(r, nx, ny) {
      const along = r.vx * nx + r.vy * ny;
      if (along < 0) { r.vx -= 1.65 * along * nx; r.vy -= 1.65 * along * ny; }
      r.bounceUntil = this.t + .2;
    }
    _resolveRobot(r) {
      const lo = EDGE + r.r, hi = SIZE - EDGE - r.r;
      if (r.x < lo) { r.x = lo; this._reflect(r, 1, 0); }
      if (r.x > hi) { r.x = hi; this._reflect(r, -1, 0); }
      if (r.y < lo) { r.y = lo; this._reflect(r, 0, 1); }
      if (r.y > hi) { r.y = hi; this._reflect(r, 0, -1); }
      for (let pass = 0; pass < 2; pass++) for (const b of this.blocks) if (b.alive) {
        const cx = clamp(r.x, b.x, b.x + b.w), cy = clamp(r.y, b.y, b.y + b.h);
        let dx = r.x - cx, dy = r.y - cy, d = Math.hypot(dx, dy), penetration;
        if (d >= r.r) continue;
        if (d < .0001) {
          const sides = [[r.x - b.x, -1, 0], [b.x + b.w - r.x, 1, 0], [r.y - b.y, 0, -1], [b.y + b.h - r.y, 0, 1]];
          sides.sort((a, z) => a[0] - z[0]);
          dx = sides[0][1]; dy = sides[0][2]; penetration = r.r + sides[0][0] + .01;
        } else { dx /= d; dy /= d; penetration = r.r - d + .01; }
        r.x += dx * penetration; r.y += dy * penetration;
        this._reflect(r, dx, dy);
      }
    }
    _robotContacts() {
      for (let i = 0; i < this.robots.length; i++) for (let j = i + 1; j < this.robots.length; j++) {
        const a = this.robots[i], b = this.robots[j];
        if (!a.alive || !b.alive) continue;
        let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d >= a.r + b.r) continue;
        if (d < .001) { dx = 1; dy = 0; d = .001; } else { dx /= d; dy /= d; }
        const push = (a.r + b.r - d + .02) / 2;
        a.x -= dx * push; a.y -= dy * push; b.x += dx * push; b.y += dy * push;
        this._reflect(a, -dx, -dy); this._reflect(b, dx, dy);
        this._resolveRobot(a); this._resolveRobot(b);
      }
    }
    _takePickup(r) {
      if (r.weapon) return;
      for (let i = 0; i < this.pickups.length; i++) {
        const p = this.pickups[i];
        if (p.empty || p.ammo <= 0 || p.age < .22 || Math.hypot(p.x - r.x, p.y - r.y) > r.r + 15) continue;
        r.weapon = this._weapon(p.kind, p.ammo); r.cooldown = Math.max(r.cooldown, .28);
        this.pickups.splice(i, 1); this.stats.pickups++; r.thinkIn = 0;
        this._effect('pickup', r.x, r.y, r.color, 49, .7);
        this._event('pickup', `${r.name}: ${p.kind === 'rocket' ? 'Raketenwerfer' : 'Blaster'}`, r.id);
        return;
      }
    }
    _shoot(r) {
      const target = this._nearestEnemy(r);
      if (!target) return;
      const distance = Math.hypot(target.x - r.x, target.y - r.y);
      if (!r.weapon) { r.angle = Math.atan2(r.vy, r.vx); return; }
      const spec = WEAPONS[r.weapon.kind], lead = Math.min(.6, distance / spec.speed) * .58;
      const aim = Math.atan2(target.y + target.vy * lead - r.y, target.x + target.vx * lead - r.x);
      r.angle = aim;
      if (r.cooldown > 0 || distance > 690) return;
      const kind = r.weapon.kind, angle = aim + this.rng.range(-.025, .025);
      // Start at the body centre so a muzzle touching cover cannot spawn a shot
      // on its far side. Owner exclusion prevents self-hits.
      this.projectiles.push({ id: this.nextId++, x: r.x, y: r.y, px: r.x, py: r.y,
        vx: Math.cos(angle) * spec.speed, vy: Math.sin(angle) * spec.speed,
        kind, owner: r.id, life: spec.life, radius: spec.radius });
      r.weapon.ammo--; r.cooldown = spec.cooldown; r.flashUntil = this.t + .11;
      this.stats.shots++;
      this._effect('shot', r.x + Math.cos(angle) * 31, r.y + Math.sin(angle) * 31, r.color, kind === 'rocket' ? 30 : 19, .16, angle);
      if (r.weapon.ammo <= 0) this._drop(r, true);
    }
    _hurtRobot(r, amount, owner, x, y) {
      if (!r.alive || amount <= 0) return;
      const dealt = Math.min(r.hp, amount);
      r.hp = Math.max(0, r.hp - amount); r.hurtUntil = this.t + .22;
      if (this.robots[owner]) this.robots[owner].damage += dealt;
      this._effect('hit', x, y, r.color, 24, .36);
      if (r.hp > 0) return;
      r.alive = false; r.vx = 0; r.vy = 0;
      this._drop(r);
      if (this.robots[owner] && owner !== r.id) this.robots[owner].kills++;
      this._effect('ko', r.x, r.y, r.color, 92, 1.5);
      this._event('ko', `${r.name} ausgeschaltet`, r.id);
    }
    _hurtBlock(b, amount, color) {
      if (!b.alive || amount <= 0) return;
      b.hp = Math.max(0, b.hp - amount);
      if (b.hp > 0) return;
      b.alive = false; this.stats.destroyed++;
      this._effect('break', b.x + b.w / 2, b.y + b.h / 2, color, Math.max(b.w, b.h), 1);
      this._event('break', 'Deckung zerstört · Weg frei', null);
    }
    _explode(p, directRobot = null, directBlock = null) {
      const spec = WEAPONS.rocket, color = this.robots[p.owner].color;
      this._effect('blast', p.x, p.y, color, spec.blastRadius, .8);
      for (const r of this.robots) if (r.alive && r.id !== p.owner) {
        const d = Math.max(0, Math.hypot(p.x - r.x, p.y - r.y) - r.r);
        if (d < spec.blastRadius || r.id === directRobot) {
          // Exactly one damage call per target; a direct hit does not add a
          // second explosion hit on top of the rocket's stated damage.
          const f = r.id === directRobot ? 1 : Math.max(.12, 1 - d / spec.blastRadius);
          this._hurtRobot(r, spec.damage * f, p.owner, r.x, r.y);
        }
      }
      for (const b of this.blocks) if (b.alive) {
        const d = distanceToBox(p.x, p.y, b);
        if (d < spec.blastRadius || b.id === directBlock) {
          this._hurtBlock(b, spec.blockDamage * (b.id === directBlock ? 1 : 1 - d / spec.blastRadius), color);
        }
      }
    }
    _moveProjectiles(dt) {
      const keep = [];
      for (const p of this.projectiles) {
        p.px = p.x; p.py = p.y;
        const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
        let hitT = 1.00001, robot = null, block = null, hit = false;
        const lo = EDGE + p.radius, hi = SIZE - EDGE - p.radius;
        if (nx < lo || nx > hi || ny < lo || ny > hi) {
          const candidates = [];
          if (nx < lo) candidates.push((lo - p.x) / (nx - p.x));
          if (nx > hi) candidates.push((hi - p.x) / (nx - p.x));
          if (ny < lo) candidates.push((lo - p.y) / (ny - p.y));
          if (ny > hi) candidates.push((hi - p.y) / (ny - p.y));
          hitT = Math.max(0, Math.min(...candidates)); hit = true;
        }
        for (const b of this.blocks) if (b.alive) {
          const t = segmentBox(p.x, p.y, nx, ny, b.x, b.y, b.w, b.h, p.radius);
          if (t !== null && t < hitT) { hitT = t; block = b; robot = null; hit = true; }
        }
        for (const r of this.robots) if (r.alive && r.id !== p.owner) {
          const t = segmentCircle(p.x, p.y, nx, ny, r.x, r.y, r.r + p.radius);
          if (t !== null && t < hitT) { hitT = t; robot = r; block = null; hit = true; }
        }
        p.life -= dt;
        if (hit) {
          p.x += (nx - p.x) * hitT; p.y += (ny - p.y) * hitT;
          if (p.kind === 'rocket') this._explode(p, robot?.id ?? null, block?.id ?? null);
          else {
            const spec = WEAPONS.blaster, color = this.robots[p.owner].color;
            if (robot) this._hurtRobot(robot, spec.damage, p.owner, p.x, p.y);
            if (block) this._hurtBlock(block, spec.blockDamage, color);
            this._effect('hit', p.x, p.y, color, 17, .28);
          }
        } else {
          p.x = nx; p.y = ny;
          if (p.life <= 0 && p.kind === 'rocket') this._explode(p);
          else if (p.life > 0) keep.push(p);
        }
      }
      this.projectiles = keep;
    }
    _tick(dt) {
      this.t += dt; this.ticks++;
      for (const f of this.effects) f.age += dt;
      this.effects = this.effects.filter(f => f.age < f.ttl);
      for (const p of this.pickups) p.age += dt;
      this.pickups = this.pickups.filter(p => p.age < p.ttl);
      for (const pad of this.pads) {
        pad.readyIn = Math.max(0, pad.readyIn - dt);
        if (pad.readyIn <= 0 && this._weaponCount() < MAX_WEAPONS &&
            !this.pickups.some(p => !p.empty && Math.hypot(p.x - pad.x, p.y - pad.y) < 40)) {
          this._addPickup(pad.x, pad.y, pad.kind); pad.readyIn = pad.period;
          this._effect('pickup', pad.x, pad.y, '#e6dfb9', 48, .8);
        }
      }
      for (const r of this.robots) if (r.alive) {
        r.cooldown = Math.max(0, r.cooldown - dt);
        this._steer(r, dt);
      }
      this._robotContacts();
      for (const r of this.robots) if (r.alive) { this._takePickup(r); this._shoot(r); }
      this._moveProjectiles(dt);
      const living = this.robots.filter(r => r.alive);
      if (living.length <= 1 || this.t >= this.duration - 1e-8) {
        this.phase = 'ended'; this.winner = living.length === 1 ? living[0].id : null;
        const drawText = living.length === 0 ? 'Alle ausgeschaltet · Unentschieden' : 'Zeit abgelaufen · Unentschieden';
        this._event('end', this.winner === null ? drawText : `${living[0].name} gewinnt die Runde`, this.winner);
      }
    }
    step(dt = 1 / 60) {
      if (this.phase !== 'running') return this;
      dt = Number(dt);
      if (!Number.isFinite(dt) || dt <= 0) return this;
      // Small deterministic substeps make circle/cover contacts robust; swept
      // projectile tests independently prevent tunnelling at high speed.
      dt = Math.min(dt, .1, this.duration - this.t);
      const n = Math.max(1, Math.ceil(dt / (1 / 120) - 1e-9)), h = dt / n;
      for (let i = 0; i < n && this.phase === 'running'; i++) this._tick(h);
      return this;
    }
    snapshot() {
      const alive = this.robots.filter(r => r.alive).length;
      return { seed: this.seed, t: this.t, duration: this.duration, remaining: Math.max(0, this.duration - this.t),
        phase: this.phase, winner: this.winner, alive, stats: { ...this.stats },
        robots: this.robots.map(r => ({ id: r.id, name: r.name, color: r.color, x: r.x, y: r.y,
          hp: r.hp, maxHp: r.maxHp, alive: r.alive, weapon: r.weapon ? { ...r.weapon } : null, kills: r.kills, damage: r.damage })),
        blocksAlive: this.blocks.filter(b => b.alive).length,
        weaponsOnFloor: this.pickups.filter(p => !p.empty).length,
        projectiles: this.projectiles.length,
        summary: this.phase === 'ended' ? this.winner === null ? 'Unentschieden' : `${this.robots[this.winner].name} gewinnt` : `${alive} Roboter · ${this.stats.destroyed} Deckungen zerstört` };
    }
    stateHash() {
      const f = n => Number(n.toFixed(7));
      const state = { seed: this.seed, t: f(this.t), ticks: this.ticks, phase: this.phase, winner: this.winner,
        rng: this.rng.s, nextId: this.nextId, stats: this.stats,
        robots: this.robots.map(r => [r.id, f(r.x), f(r.y), f(r.vx), f(r.vy), f(r.hp), r.alive, r.weapon,
          f(r.cooldown), f(r.thinkIn), f(r.goalX), f(r.goalY), f(r.bounceUntil), r.kills, f(r.damage)]),
        blocks: this.blocks.map(b => [b.id, f(b.hp), b.alive]),
        pickups: this.pickups.map(p => [p.id, p.x, p.y, p.kind, p.ammo, p.empty, f(p.age)]),
        pads: this.pads.map(p => f(p.readyIn)),
        projectiles: this.projectiles.map(p => [p.id, f(p.x), f(p.y), p.vx, p.vy, p.kind, p.owner, f(p.life)]) };
      const s = JSON.stringify(state); let h = 0x811c9dc5;
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
      return (h >>> 0).toString(16).padStart(8, '0');
    }
    checkInvariants() {
      const errors = [];
      if (this.robots.length !== 4) errors.push('Robot count changed');
      for (const r of this.robots) {
        if (!finite(r.x, r.y, r.vx, r.vy, r.hp)) errors.push(`Robot ${r.id}: non-finite state`);
        if (r.hp < 0 || r.hp > r.maxHp || r.alive !== (r.hp > 0)) errors.push(`Robot ${r.id}: invalid health`);
        if (r.x < EDGE + r.r - .05 || r.x > SIZE - EDGE - r.r + .05 || r.y < EDGE + r.r - .05 || r.y > SIZE - EDGE - r.r + .05) errors.push(`Robot ${r.id}: outside arena`);
        if (r.weapon && (!WEAPONS[r.weapon.kind] || r.weapon.ammo <= 0 || r.weapon.ammo > r.weapon.maxAmmo)) errors.push(`Robot ${r.id}: invalid weapon`);
        if (!r.alive && r.weapon) errors.push(`Robot ${r.id}: KO retained weapon`);
        if (r.alive && this.blocks.some(b => b.alive && distanceToBox(r.x, r.y, b) < r.r - .1)) errors.push(`Robot ${r.id}: inside cover`);
      }
      for (const b of this.blocks) if (!finite(b.hp) || b.hp < 0 || b.hp > b.maxHp || b.alive !== (b.hp > 0)) errors.push(`Block ${b.id}: invalid health`);
      for (const p of this.pickups) if (!finite(p.x, p.y, p.ammo, p.age) || p.ammo < 0 || p.ammo > p.maxAmmo || p.empty !== (p.ammo === 0)) errors.push(`Pickup ${p.id}: invalid ammunition`);
      for (const p of this.projectiles) if (!finite(p.x, p.y, p.vx, p.vy, p.life) || !WEAPONS[p.kind] || !this.robots[p.owner]) errors.push(`Projectile ${p.id}: invalid state`);
      if (this._weaponCount() > MAX_WEAPONS) errors.push('Weapon supply cap exceeded');
      if (this.effects.length > 140 || this.events.length > 10 || this.projectiles.length > 80 || this.pickups.length > 30) errors.push('Object pool grew beyond limit');
      if (this.winner !== null && (this.phase !== 'ended' || !this.robots[this.winner]?.alive || this.robots.filter(r => r.alive).length !== 1)) errors.push('Invalid winner');
      return { ok: errors.length === 0, errors, robots: this.robots.length, projectiles: this.projectiles.length, weapons: this._weaponCount() };
    }
  }
  API.Sim = Sim;
  API.WEAPONS = WEAPONS;
  API.WORLD_SIZE = SIZE;
  API.ARENA_EDGE = EDGE;
})(typeof window !== 'undefined' ? window : globalThis);
