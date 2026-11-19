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

  class TacticalRound extends M.Round {
    constructor(options) {
      super(options);
      this.rulesVersion = 'v4';
      this.portraitView = !!options.portrait;
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
    _tick(dt) {
      super._tick(dt);
      if (this.phase === 'running') this._updateCrates();
    }
    _steer(r, dt) { if (!r.caged) super._steer(r, dt); }
    _shoot(r) { if (!r.caged) super._shoot(r); }
    _takePickup(r) { if (!r.caged) super._takePickup(r); }
    _hurtRobot(r, amount, owner, x, y) { if (!r.caged) super._hurtRobot(r, amount, owner, x, y); }
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
    _moveProjectiles(dt) {
      const crates = this._closedCrates();
      if (!crates.length) { super._moveProjectiles(dt); return; }
      // Geschosse prallen an geschlossenen Kisten ab, die Kiste nimmt keinen Schaden.
      const { w: W, h: H, edge } = this.bounds, keep = [];
      for (const p of this.projectiles) {
        const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
        let crateT = null;
        for (const c of crates) { const t = segmentBox(p.x, p.y, nx, ny, c, p.radius); if (t !== null && (crateT === null || t < crateT)) crateT = t; }
        if (crateT === null) { keep.push(p); continue; }
        let first = crateT;
        for (const b of this.blocks) if (b.alive) { const t = segmentBox(p.x, p.y, nx, ny, b, p.radius); if (t !== null && t < first) first = null; if (first === null) break; }
        if (first !== null) for (const r of this.robots) if (r.alive && !r.caged && r.id !== p.owner) {
          const t = segmentCircle(p.x, p.y, nx, ny, r, p.radius); if (t !== null && t < first) { first = null; break; }
        }
        const lo = edge + p.radius;
        if (first !== null && (nx < lo || nx > W - lo || ny < lo || ny > H - lo)) {
          const wall = Math.min(...[nx < lo ? (lo - p.x) / (nx - p.x) : 2, nx > W - lo ? (W - lo - p.x) / (nx - p.x) : 2,
            ny < lo ? (lo - p.y) / (ny - p.y) : 2, ny > H - lo ? (H - lo - p.y) / (ny - p.y) : 2]);
          if (wall < first) first = null;
        }
        if (first === null) { keep.push(p); continue; }
        p.px = p.x; p.py = p.y; p.x += (nx - p.x) * first; p.y += (ny - p.y) * first; p.life -= dt;
        if (p.kind === 'rocket') this._explode(p, null, null);
        else this._effect('hit', p.x, p.y, this.robots[p.owner].color, 17, .28);
      }
      this.projectiles = keep;
      super._moveProjectiles(dt);
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

  EBS.ScrapTactics = { Round: TacticalRound, CRATE };
})();
