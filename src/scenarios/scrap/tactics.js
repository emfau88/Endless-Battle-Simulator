/* Tactical arena (v4, in Arbeit). Builds on the material arena (v3); the archived
 * prototype, v2 and v3 stay bit-identical. Everything that changes the flow of a
 * round lives here: start crates (K1), target choice and line of fire (K2),
 * path finding (K3), tank driving and behaviour (K4). Seeded randomness only. */
(function () {
  'use strict';
  const { clamp } = EBS.util;
  const M = EBS.ScrapMaterials;
  const distanceToBox = (x, y, b) => Math.hypot(x - clamp(x, b.x, b.x + b.w), y - clamp(y, b.y, b.y + b.h));
  function segmentBox(x0, y0, x1, y1, b, pad) {
    let near = 0, far = 1;
    for (const [p, d, lo, hi] of [[x0, x1 - x0, b.x - pad, b.x + b.w + pad], [y0, y1 - y0, b.y - pad, b.y + b.h + pad]]) {
      if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return null; }
      else { let a = (lo - p) / d, z = (hi - p) / d; if (a > z) [a, z] = [z, a]; near = Math.max(near, a); far = Math.min(far, z); if (near > far) return null; }
    }
    return near >= 0 && near <= 1 ? near : null;
  }
  function segmentCircle(x0, y0, x1, y1, r, pad) {
    const dx = x1 - x0, dy = y1 - y0, fx = x0 - r.x, fy = y0 - r.y, a = dx * dx + dy * dy, c = fx * fx + fy * fy - (r.r + pad) ** 2;
    if (c <= 0) return 0; if (a < 1e-12) return null;
    const b = 2 * (fx * dx + fy * dy), d = b * b - 4 * a * c; if (d < 0) return null;
    const t = (-b - Math.sqrt(d)) / (2 * a); return t >= 0 && t <= 1 ? t : null;
  }

  // K1 · Startkisten: Schatten 0–1,2 s, Aufschlag 1,2 s, Ausbruch ab 1,6 s + Seed 0–2,4 s, mindestens 0,4 s Abstand.
  const CRATE = { size: 64, land: 1.2, open: 1.6, spread: 2.4, gap: .4, grid: 20, cover: 60, wall: 60, supply: 90,
    pair: 260, pairPortrait: 240, tries: 200, fair: [.6, 1.6] };
  // K2 · Zielwahl, Schusslinie, Kampftempo. Startwerte aus dem Plan, Abstimmung in K5.
  const FIGHT = { blaster: 6, rocket: 30, turn: 5, aimTol: .08, woodRange: 300, splash: .8, range: 690,
    score: { distance: 600, sight: .35, weak: .25, revenge: .30, revengeSec: 4, loyal: .20, loyalSec: 1.5, noise: .10 } };
  // K4 · Charaktere, fest je Roboter (Ember, Azure, Amber, Moss)
  const CHARACTERS = [
    { key: 'rusher', range: .7, coverHp: .20, aimTol: .08, rocketCost: 1, flankAfter: 2 },
    { key: 'sniper', range: 1.25, coverHp: .35, aimTol: .04, rocketCost: 1, flankAfter: 2 },
    { key: 'collector', range: 1, coverHp: .35, aimTol: .08, rocketCost: .75, flankAfter: 2 },
    { key: 'flanker', range: 1, coverHp: .35, aimTol: .08, rocketCost: 1, flankAfter: 1 },
  ];
  const WEAPONS = ScrapArena.WEAPONS, angleDiff = EBS.util.angleDiff;

  class TacticalRound extends M.Round {
    constructor(options) {
      super(options);
      this.rulesVersion = 'v4';
      this.portraitView = !!options.portrait;
      this.fire = { clear: 0, wood: 0, splash: 0, blocked: 0 };
      for (const r of this.robots) { r.targetId = null; r.targetSince = 0; r.hitBy = this.robots.map(() => -99); }
      this._placeCrates();
    }

    // ---- K1 · Startkisten ------------------------------------------------
    // Eigener Zufallsstrom nur für die Aufstellung: Die Kampf-Zufallszahlen bleiben unberührt.
    _placeCrates() {
      const rng = new EBS.RNG((this.seed ^ 0x5c7a3e19) >>> 0), { w, h, edge } = this.bounds;
      const supplies = [...this.pickups, ...this.pads].map(p => [p.x, p.y]);
      const spots = [];
      for (let y = edge + CRATE.wall; y <= h - edge - CRATE.wall + 1e-9; y += CRATE.grid)
        for (let x = edge + CRATE.wall; x <= w - edge - CRATE.wall + 1e-9; x += CRATE.grid) {
          if (this.blocks.some(b => distanceToBox(x, y, b) < CRATE.cover)) continue;
          if (supplies.some(([px, py]) => Math.hypot(px - x, py - y) < CRATE.supply)) continue;
          spots.push([x, y]);
        }
      const pair = this.portraitView ? CRATE.pairPortrait : CRATE.pair;
      let chosen = null;
      this.crateTries = 0;
      for (let attempt = 0; attempt < CRATE.tries && !chosen; attempt++) {
        this.crateTries = attempt + 1;
        const pick = [];
        for (let i = 0; i < this.robots.length; i++) {
          const open = spots.filter(([x, y]) => pick.every(([px, py]) => Math.hypot(px - x, py - y) >= pair));
          if (!open.length) break;
          pick.push(open[Math.floor(rng.next() * open.length)]);
        }
        if (pick.length === this.robots.length && this._fairStarts(pick)) chosen = pick;
      }
      this.crateFallback = !chosen;
      if (!chosen) chosen = this.robots.map(r => [r.x, r.y]);
      // Ausbruchszeiten: Seed-Zufall, danach in zeitlicher Reihenfolge mindestens 0,4 s Abstand
      const times = this.robots.map(() => CRATE.open + rng.next() * CRATE.spread);
      const order = times.map((t, i) => i).sort((a, b) => times[a] - times[b] || a - b);
      for (let k = 1; k < order.length; k++) times[order[k]] = Math.max(times[order[k]], times[order[k - 1]] + CRATE.gap);
      const s = CRATE.size;
      this.crates = this.robots.map((r, i) => {
        const [x, y] = chosen[i];
        r.x = r.lastX = x; r.y = r.lastY = y; r.vx = r.vy = 0; r.caged = true;
        r.goalX = w / 2; r.goalY = h / 2; r.angle = Math.atan2(h / 2 - y, w / 2 - x);
        return { id: i, x: x - s / 2, y: y - s / 2, w: s, h: s, landAt: CRATE.land, openAt: Number(times[i].toFixed(4)), landed: false, open: false };
      });
    }
    // Fairness: Weg zur nächsten Waffe je Startpunkt zwischen 0,6- und 1,6-mal dem Median
    _fairStarts(pick) {
      const weapons = this.pickups.filter(p => !p.empty && p.ammo > 0);
      const d = pick.map(([x, y]) => Math.min(...weapons.map(p => this._travel(x, y, p.x, p.y))));
      const sorted = [...d].sort((a, b) => a - b), median = (sorted[1] + sorted[2]) / 2;
      return d.every(v => v >= CRATE.fair[0] * median && v <= CRATE.fair[1] * median);
    }
    _travel(x0, y0, x1, y1) { return Math.hypot(x1 - x0, y1 - y0); }
    _closedCrates() { return (this.crates || []).filter(c => c.landed && !c.open); }
    _obstacles() { return this.blocks.filter(b => b.alive).concat(this._closedCrates()); }
    _updateCrates() {
      for (const c of this.crates) {
        if (!c.landed && this.t >= c.landAt - 1e-9) {
          c.landed = true;
          this.emit?.('crate_land', c.x + c.w / 2, c.y + c.h / 2, { team: c.id });
        }
        if (!c.open && this.t >= c.openAt - 1e-9) {
          c.open = true;
          const r = this.robots[c.id];
          r.caged = false; r.thinkIn = 0;
          this.emit?.('crate_break', c.x + c.w / 2, c.y + c.h / 2, { team: c.id });
        }
      }
    }
    _steer(r, dt) { if (!r.caged) super._steer(r, dt); }
    _takePickup(r) { if (!r.caged) super._takePickup(r); }
    _blocked(x0, y0, x1, y1, pad = 0) {
      return this._obstacles().some(b => segmentBox(x0, y0, x1, y1, b, pad) !== null);
    }
    // Wie die Material-Arena, aber geschlossene Kisten sind ebenfalls Hindernisse
    _resolveRobot(r) {
      super._resolveRobot(r);
      for (let pass = 0; pass < 2; pass++) for (const b of this._closedCrates()) {
        let dx = r.x - clamp(r.x, b.x, b.x + b.w), dy = r.y - clamp(r.y, b.y, b.y + b.h), d = Math.hypot(dx, dy), push;
        if (d >= r.r) continue;
        if (d < .0001) {
          const sides = [[r.x - b.x, -1, 0], [b.x + b.w - r.x, 1, 0], [r.y - b.y, 0, -1], [b.y + b.h - r.y, 0, 1]].sort((a, z) => a[0] - z[0]);
          dx = sides[0][1]; dy = sides[0][2]; push = r.r + sides[0][0] + .01;
        } else { dx /= d; dy /= d; push = r.r - d + .01; }
        r.x += dx * push; r.y += dy * push; this._reflect(r, dx, dy);
      }
    }
    // ---- K2 · Zielwahl und Schusslinie ---------------------------------------
    // Kleinster Wert gewinnt: Weg, freie Sicht, geschwächter Gegner, Rache, Treue, Seed-Rauschen.
    _chooseTarget(r, force = false) {
      const now = this.t, S = FIGHT.score, current = r.targetId === null ? null : this.robots[r.targetId];
      const valid = e => e && e.alive && !e.caged && e.id !== r.id;
      if (!force && valid(current) && now - r.targetSince < S.loyalSec) return current;
      let best = null, score = Infinity;
      for (const e of this.robots) if (valid(e)) {
        let v = this._travel(r.x, r.y, e.x, e.y) / S.distance;
        if (!this._blocked(r.x, r.y, e.x, e.y, WEAPONS.blaster.radius)) v -= S.sight;
        v -= S.weak * (1 - e.hp / e.maxHp);
        if (now - r.hitBy[e.id] < S.revengeSec) v -= S.revenge;
        if (e === current) v -= S.loyal;
        v += this.rng.range(-S.noise, S.noise);
        if (v < score) { score = v; best = e; }
      }
      const id = best ? best.id : null;
      if (id !== r.targetId) { r.targetId = id; r.targetSince = now; }
      return best;
    }
    _target(r) {
      const t = r.targetId === null ? null : this.robots[r.targetId];
      return t && t.alive && !t.caged ? t : this._chooseTarget(r, true);
    }
    // Die bisherige Bewegung (bis K4) folgt dem gewählten Ziel statt dem nächsten Gegner
    _nearestEnemy(r) { return this._target(r); }
    _think(r) { this._chooseTarget(r); super._think(r); }
    // Freie Linie, absichtlicher Schuss durch Holz (Ziel unter 300 AE) oder Rakete auf Deckung neben dem Ziel
    _fireLine(r, target, ax, ay, kind) {
      const pad = WEAPONS[kind].radius, hits = [];
      for (const b of this._obstacles()) { const t = segmentBox(r.x, r.y, ax, ay, b, pad); if (t !== null) hits.push([t, b]); }
      if (!hits.length) return 'clear';
      const distance = Math.hypot(target.x - r.x, target.y - r.y);
      if (kind === 'blaster' && distance < FIGHT.woodRange && hits.every(([, b]) => b.material === 'wood')) return 'wood';
      if (kind === 'rocket') {
        hits.sort((p, q) => p[0] - q[0]);
        if (hits[0][1].material && distanceToBox(target.x, target.y, hits[0][1]) < FIGHT.splash * WEAPONS.rocket.blastRadius) return 'splash';
      }
      return null;
    }
    _tick(dt) {
      this.tickDt = dt;
      super._tick(dt);
      if (this.phase === 'running') this._updateCrates();
    }
    // Der Turm dreht höchstens 5 rad/s; geschossen wird erst, wenn er auf den Vorhaltepunkt zeigt.
    _shoot(r) {
      if (r.caged) return;
      const dt = this.tickDt || 1 / 120, character = CHARACTERS[r.id % 4];
      const target = r.weapon ? this._target(r) : null;
      let desired = r.angle, ax = 0, ay = 0, distance = Infinity;
      if (target) {
        const spec = WEAPONS[r.weapon.kind];
        distance = Math.hypot(target.x - r.x, target.y - r.y);
        const lead = Math.min(.6, distance / spec.speed) * .58;
        ax = target.x + target.vx * lead; ay = target.y + target.vy * lead;
        desired = Math.atan2(ay - r.y, ax - r.x);
      } else if (Number.isFinite(r.heading)) desired = r.heading;
      else if (Math.hypot(r.vx, r.vy) > 1) desired = Math.atan2(r.vy, r.vx);
      const off = angleDiff(desired, r.angle), step = FIGHT.turn * dt;
      r.angle = Math.abs(off) <= step ? desired : r.angle + Math.sign(off) * step;
      if (!target || r.cooldown > 0 || distance > FIGHT.range || Math.abs(angleDiff(desired, r.angle)) > character.aimTol) return;
      const kind = r.weapon.kind, line = this._fireLine(r, target, ax, ay, kind);
      if (!line) return;
      const spec = WEAPONS[kind], angle = r.angle + this.rng.range(-.025, .025);
      this.projectiles.push({ id: this.nextId++, x: r.x, y: r.y, px: r.x, py: r.y,
        vx: Math.cos(angle) * spec.speed, vy: Math.sin(angle) * spec.speed,
        kind, owner: r.id, life: spec.life, radius: spec.radius, line });
      r.weapon.ammo--; r.cooldown = spec.cooldown; r.flashUntil = this.t + .11;
      if (r.module) r.cooldown *= EBS.ScrapRules.modules[r.module].cooldown;
      this.stats.shots++; this.fire[line]++;
      this._effect('shot', r.x + Math.cos(angle) * 31, r.y + Math.sin(angle) * 31, r.color, kind === 'rocket' ? 30 : 19, .16, angle);
      if (r.weapon.ammo <= 0) this._drop(r, true);
    }
    _hurtRobot(r, amount, owner, x, y) {
      if (r.caged) return;
      if (r.alive && amount > 0 && owner !== r.id && this.robots[owner]) r.hitBy[owner] = this.t;
      super._hurtRobot(r, amount, owner, x, y);
    }
    // Kampftempo v4: Blaster 6, Rakete 30. Kisten halten Geschosse auf, nehmen aber keinen Schaden.
    _moveProjectiles(dt) {
      const keep = [], { w: W, h: H, edge } = this.bounds, crates = this._closedCrates();
      for (const p of this.projectiles) {
        p.px = p.x; p.py = p.y;
        const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt, lo = edge + p.radius, hiX = W - lo, hiY = H - lo;
        let hitT = 1.00001, robot = null, block = null, hit = false;
        if (nx < lo || nx > hiX || ny < lo || ny > hiY) {
          const candidates = [];
          if (nx < lo) candidates.push((lo - p.x) / (nx - p.x)); if (nx > hiX) candidates.push((hiX - p.x) / (nx - p.x));
          if (ny < lo) candidates.push((lo - p.y) / (ny - p.y)); if (ny > hiY) candidates.push((hiY - p.y) / (ny - p.y));
          hitT = Math.max(0, Math.min(...candidates)); hit = true;
        }
        for (const b of this.blocks) if (b.alive) { const t = segmentBox(p.x, p.y, nx, ny, b, p.radius); if (t !== null && t < hitT) { hitT = t; block = b; robot = null; hit = true; } }
        for (const c of crates) { const t = segmentBox(p.x, p.y, nx, ny, c, p.radius); if (t !== null && t < hitT) { hitT = t; block = null; robot = null; hit = true; } }
        for (const r of this.robots) if (r.alive && !r.caged && r.id !== p.owner) {
          const t = segmentCircle(p.x, p.y, nx, ny, r, p.radius); if (t !== null && t < hitT) { hitT = t; robot = r; block = null; hit = true; }
        }
        p.life -= dt;
        if (hit) {
          p.x += (nx - p.x) * hitT; p.y += (ny - p.y) * hitT;
          if (block && p.line === 'clear') this.fire.blocked++;
          if (p.kind === 'rocket') this._explode(p, robot?.id ?? null, block?.id ?? null);
          else {
            const color = this.robots[p.owner].color;
            if (robot) this._hurtRobot(robot, FIGHT.blaster, p.owner, p.x, p.y);
            if (block) this._hurtBlock(block, WEAPONS.blaster.blockDamage, color, { x: p.x, y: p.y });
            this._effect('hit', p.x, p.y, color, 17, .28);
          }
        } else {
          p.x = nx; p.y = ny;
          if (p.life <= 0 && p.kind === 'rocket') this._explode(p); else if (p.life > 0) keep.push(p);
        }
      }
      this.projectiles = keep;
    }
    _explode(p, directRobot = null, directBlock = null) {
      const spec = WEAPONS.rocket, color = this.robots[p.owner].color;
      this._effect('blast', p.x, p.y, color, spec.blastRadius, .8);
      for (const r of this.robots) if (r.alive && r.id !== p.owner) {
        const d = Math.max(0, Math.hypot(p.x - r.x, p.y - r.y) - r.r);
        if (d < spec.blastRadius || r.id === directRobot) this._hurtRobot(r, FIGHT.rocket * (r.id === directRobot ? 1 : Math.max(.12, 1 - d / spec.blastRadius)), p.owner, r.x, r.y);
      }
      for (const b of this.blocks) if (b.alive) {
        const d = distanceToBox(p.x, p.y, b);
        if (d < spec.blastRadius || b.id === directBlock)
          this._hurtBlock(b, spec.blockDamage * (b.id === directBlock ? 1 : 1 - d / spec.blastRadius), color, { x: clamp(p.x, b.x, b.x + b.w), y: clamp(p.y, b.y, b.y + b.h) });
      }
    }
    checkInvariants() {
      const result = super.checkInvariants();
      if (!Array.isArray(this.crates) || this.crates.length !== this.robots.length) result.errors.push('Crates: invalid count');
      for (const r of this.robots) {
        const c = this.crates?.[r.id];
        if (r.caged && (!c || c.open || Math.hypot(r.x - c.x - c.w / 2, r.y - c.y - c.h / 2) > .01)) result.errors.push(`Robot ${r.id}: outside its crate`);
        if (r.alive && !r.caged && this._closedCrates().some(b => distanceToBox(r.x, r.y, b) < r.r - .1)) result.errors.push(`Robot ${r.id}: inside crate`);
      }
      result.ok = !result.errors.length; return result;
    }
  }

  EBS.ScrapTactics = { Round: TacticalRound, CRATE, FIGHT, CHARACTERS };
})();
