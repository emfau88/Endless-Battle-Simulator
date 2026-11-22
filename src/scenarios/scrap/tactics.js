/* Tactical arena (v4, in Arbeit). Builds on the material arena (v3); the archived
 * prototype, v2 and v3 stay bit-identical. Everything that changes the flow of a
 * round lives here: start crates (K1), target choice and line of fire (K2),
 * path finding (K3), tank driving and behaviour (K4). Seeded randomness only. */
(function () {
  'use strict';
  const { clamp } = EBS.util;
  const M = EBS.ScrapMaterials;
  const distanceToBox = (x, y, b) => Math.hypot(x - clamp(x, b.x, b.x + b.w), y - clamp(y, b.y, b.y + b.h));
  // Wie in der Material-Arena, aber ohne Hilfsfelder je Aufruf (wird in v4 sehr oft gerufen)
  function segmentBox(x0, y0, x1, y1, b, pad) {
    let near = 0, far = 1;
    const dx = x1 - x0, dy = y1 - y0, lx = b.x - pad, hx = b.x + b.w + pad, ly = b.y - pad, hy = b.y + b.h + pad;
    if (Math.abs(dx) < 1e-9) { if (x0 < lx || x0 > hx) return null; }
    else { let a = (lx - x0) / dx, z = (hx - x0) / dx; if (a > z) { const t = a; a = z; z = t; } if (a > near) near = a; if (z < far) far = z; if (near > far) return null; }
    if (Math.abs(dy) < 1e-9) { if (y0 < ly || y0 > hy) return null; }
    else { let a = (ly - y0) / dy, z = (hy - y0) / dy; if (a > z) { const t = a; a = z; z = t; } if (a > near) near = a; if (z < far) far = z; if (near > far) return null; }
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
  // K2 · Zielwahl, Schusslinie, Kampftempo. Startwerte aus dem Plan, in K5 abgestimmt (Rakete 30 → 26).
  const FIGHT = { blaster: 6, rocket: 26, turn: 5, aimTol: .08, woodRange: 300, splash: .8, range: 690,
    score: { distance: 600, sight: .35, weak: .25, revenge: .30, revengeSec: 4, loyal: .20, loyalSec: 1.5, noise: .10 } };
  // K4 · Charaktere, fest je Roboter (Ember, Azure, Amber, Moss). K5: Ember −15 % statt −30 % Abstand und Deckung
  // ab 25 % Leben, Amber Raketen 15 % statt 25 % günstiger (sonst gewannen Ember zu selten, Amber zu oft).
  const CHARACTERS = [
    { key: 'rusher', range: .85, coverHp: .25, aimTol: .08, rocketCost: 1, flankAfter: 2 },
    { key: 'sniper', range: 1.25, coverHp: .35, aimTol: .04, rocketCost: 1, flankAfter: 2 },
    { key: 'collector', range: 1, coverHp: .35, aimTol: .08, rocketCost: .85, flankAfter: 2 },
    { key: 'flanker', range: 1, coverHp: .35, aimTol: .08, rocketCost: 1, flankAfter: 1 },
  ];
  const WEAPONS = ScrapArena.WEAPONS, angleDiff = EBS.util.angleDiff, ROBOT_R = 24;
  // K3 · Wegfindung
  const PATH = { cell: 8, margin: 1, reach: 20, replanDistance: 40, replanSec: .6, repel: 70, slideLoss: .3,
    stuckSec: 1, stuckMove: 6, stuckGoal: 40, reverseSec: .4, jam: 80, yieldSec: .5, smooth: 6, close: 8, around: 1.2 };
  // K4 · Panzerfahren und Verhalten
  const DRIVE = { turn: 3.2, spinAngle: Math.PI / 3, spinSpeed: .3, accel: 260, brake: 420, reverse: .5 };
  const BEHAVIOUR = { range: { blaster: [220, 340], rocket: [260, 420] }, coverNear: 60, coverSec: 3, coverMax: 6, coverPause: 4, claimed: 300 };
  // S1 · Short-Karte (nur v4 hochkant, layout short): 540 × 700 statt 540 × 1040, 12 Deckungen (6 Holz, 3 Stein,
  // 3 Beton), zwei Plattformen für Raketen (siehe SHORT_ITEMS). Entworfen in Hochformat-Bildkoordinaten, punktsymmetrisch um die Mitte;
  // die Mittelinsel ist halb Stein, halb Beton. Umrechnung in die Motorkoordinaten wie bei den Hochformatkarten.
  const SHORT = { w: 540, h: 700,
    half: [[222, 104, 96, 36, 'concrete'], [96, 200, 60, 44, 'wood'], [384, 200, 60, 44, 'wood'], [186, 236, 56, 40, 'wood'], [330, 270, 60, 44, 'stone']],
    centre: [[230, 330, 40, 40, 'stone'], [270, 330, 40, 40, 'concrete']],
    pads: [[100, 350], [440, 350]],
    starts: [[100, 90], [440, 90], [440, 610], [100, 610]] };
  // S2 · Short-Balance (nur auf der Short-Karte), gemessen statt des Startwerts „überall ×1,5“: Solange alle vier
  // leben, zählt Schaden an Robotern ×2,5 (erster K.o. im Median nach 8 s statt 14 s), zu dritt ×0,5, im Schlussduell
  // ×0,9 (seit den Raketen-Regeln; vorher beides ×0,55). Im Duell nimmt der Schwächere 20 % weniger, damit es knapp wird. Die Kisten brechen innerhalb von 1,2 s statt
  // 2,4 s auf. Deckung: nur 0,5 s statt 3 s warten, höchstens 2,5 s unterwegs, danach 6 s Pause. Mit 3 s standen nach
  // dem ersten K.o. oft alle gleichzeitig still (Hänger bei 51 % der Seeds, jetzt 3 %); der kleinere Schaden gleicht
  // aus, dass die Runde ohne das Warten sonst nach 22 s vorbei wäre. v4 ohne Short rechnet unverändert.
  const SHORT_FIGHT = { opening: 2.5, damage: .5, duel: .9, underdog: .8, crateSpread: 1.2, coverSec: .5, coverMax: 2.5, coverPause: 6 };
  // S2 · Waffen im Short: Der Blaster ist die Grundwaffe und lädt nach `reload` Sekunden von selbst nach;
  // niemand ist je unbewaffnet, nichts fällt zu Boden. Das einzige Item ist die Rakete, und sie kommt nur von den zwei
  // Plattformen: zum ersten Mal nach `first` Sekunden, danach `period` Sekunden nach der Aufnahme. Wer nur den Blaster
  // hat, holt eine Rakete, wenn der Weg höchstens `fetch` AE lang ist und kein anderer näher dran ist. Nach drei
  // Raketen ist nach `swap` Sekunden wieder der Blaster da.
  const SHORT_ITEMS = { reload: 1.4, swap: .5, first: [6, 7.5], period: 9, fetch: 320, fetchWait: 1.2 };
  // L2 · Dieselben Waffenregeln auf den großen Karten, als eigener Schalter (items: 'rockets', z. B. im Turnier):
  // Blaster lädt nach, Raketen nur von den zwei Stationen, kurze Deckung wie im Short. Schaden gemessen auf Sunny
  // Yard quer (120 Runden): ×2, solange alle vier leben, zu dritt ×0,45, im Duell ×0,8, der Schwächere 15 % weniger.
  // Im Duell steigt der Schaden je Sekunde um 6 % (höchstens ×3): Duelle über 20 s gibt es damit in 4 % statt
  // 19 % der Runden. Der erste K.o. fällt im Median nach 10 s statt 15 s, der zweite nach 20 s, die Runde dauert
  // 31,5 s (klassisch 31 s); Hänger in unter 1 % statt 28 % der Runden. Acht Runden ergeben rund 4:45 Minuten.
  const ARENA_ITEMS = { reload: 1.4, swap: .5, first: [6, 7.5], period: 9, fetch: 320, fetchWait: 1.2 };
  const ARENA_FIGHT = { opening: 2, damage: .45, duel: .8, underdog: .85, duelRamp: .06, duelMax: 3, coverSec: .5, coverMax: 2.5, coverPause: 6 };
  // Zwischenspeicher außerhalb des Simulationszustands (Raster, Suchpuffer, Hindernisliste)
  const NAV = new WeakMap(), OBSTACLES = new WeakMap();
  class TacticalRound extends M.Round {
    constructor(options) {
      super(options);
      this.rulesVersion = 'v4';
      this.portraitView = !!options.portrait;
      if (options.short && this.portraitView) this._shortMap();
      else if (options.items === 'rockets') this._rocketRules(ARENA_ITEMS, ARENA_FIGHT);
      this.fire = { clear: 0, wood: 0, splash: 0, blocked: 0 };
      for (const r of this.robots) {
        r.targetId = null; r.targetSince = 0; r.hitBy = this.robots.map(() => -99);
        r.path = null; r.pathIndex = 0; r.planX = r.planY = r.planAt = 0; r.planKey = -1;
        r.stuck = { x: 0, y: 0, t: 0 }; r.stuckCount = 0; r.reverseUntil = 0;
        r.mode = 'search'; r.hiddenSince = null; r.coverSince = 0; r.coverUntil = null; r.coverBlock = 0;
      }
      this._placeCrates();
      for (const r of this.robots) r.heading = r.angle;
    }

    // ---- S1 · Short-Karte -------------------------------------------------
    _shortMap() {
      const { w: W, h: H } = SHORT, point = ([x, y]) => [y, W - x];
      const pieces = [...SHORT.half, ...SHORT.half.map(([x, y, w, h, m]) => [W - x - w, H - y - h, w, h, m]), ...SHORT.centre];
      this.shortMap = true; this.bounds = { w: H, h: W, edge: M.edge };
      this.blocks = pieces.map(([x, y, w, h, material], id) => {
        const hp = M.materials[material].hp;
        return { id, x: y, y: W - x - w, w: h, h: w, material, hp, maxHp: hp, alive: true };
      });
      SHORT.pads.forEach((p, i) => { [this.pads[i].x, this.pads[i].y] = point(p); });
      this._rocketRules(SHORT_ITEMS, SHORT_FIGHT);
      // Ersatz-Startplätze, falls keine Kistenaufstellung passt
      for (const r of this.robots) { [r.x, r.y] = point(SHORT.starts[r.id]); r.lastX = r.x; r.lastY = r.y; }
    }

    // Raketen-Regeln einschalten (Short-Karte oder Schalter items: 'rockets'): keine freien Startwaffen, beide
    // Stationen liefern Raketen. items = Waffenwerte, pace = Schaden und Deckungszeiten.
    _rocketRules(items, pace) {
      this.items = items; this.pace = pace;
      this.pads.forEach((pad, i) => { pad.kind = 'rocket'; pad.readyIn = items.first[i]; pad.period = items.period; });
      this.pickups = [];
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
      const times = this.robots.map(() => CRATE.open + rng.next() * (this.shortMap ? SHORT_FIGHT.crateSpread : CRATE.spread));
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
      const loaded = this.pickups.filter(p => !p.empty && p.ammo > 0), weapons = loaded.length ? loaded : this.pads;
      const d = pick.map(([x, y]) => Math.min(...weapons.map(p => this._travel(x, y, p.x, p.y))));
      const sorted = [...d].sort((a, b) => a - b), median = (sorted[1] + sorted[2]) / 2;
      return d.every(v => v >= CRATE.fair[0] * median && v <= CRATE.fair[1] * median);
    }
    _obstacleCache() {
      const key = this._navKey(), cached = OBSTACLES.get(this);
      if (cached && cached.key === key) return cached;
      const crates = (this.crates || []).filter(c => c.landed && !c.open), entry = { key, crates, list: this.blocks.filter(b => b.alive).concat(crates) };
      OBSTACLES.set(this, entry);
      return entry;
    }
    _closedCrates() { return this._obstacleCache().crates; }
    _obstacles() { return this._obstacleCache().list; }
    _updateCrates() {
      for (const c of this.crates) {
        if (!c.landed && this.t >= c.landAt - 1e-9) {
          c.landed = true;
          this.emit?.('crate_land', c.x + c.w / 2, c.y + c.h / 2, { team: c.id });
        }
        if (!c.open && this.t >= c.openAt - 1e-9) {
          c.open = true;
          const r = this.robots[c.id];
          r.caged = false; r.thinkIn = 0; r.stuck = { x: r.x, y: r.y, t: this.t };
          this.emit?.('crate_break', c.x + c.w / 2, c.y + c.h / 2, { team: c.id });
        }
      }
    }
    _takePickup(r) { if (!r.caged) super._takePickup(r); }
    _blocked(x0, y0, x1, y1, pad = 0) {
      for (const b of this._obstacles()) if (segmentBox(x0, y0, x1, y1, b, pad) !== null) return true;
      return false;
    }
    // Wie die Material-Arena, aber geschlossene Kisten sind ebenfalls Hindernisse
    _resolveRobot(r) {
      super._resolveRobot(r);
      const crates = this._closedCrates();
      if (crates.length) for (let pass = 0; pass < 2; pass++) for (const b of crates) {
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
    _nearestEnemy(r) { return this._target(r); }
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
      // Short: Die Plattform lädt erst, wenn ihre Rakete geholt ist
      if (this.items) for (const pad of this.pads) if (this._padLoaded(pad)) pad.readyIn = pad.period + dt;
      super._tick(dt);
      if (this.phase === 'running') this._updateCrates();
    }
    // ---- S2 · Waffen im Short ----------------------------------------------
    _padLoaded(pad) { return this.pickups.some(p => !p.empty && p.ammo > 0 && Math.hypot(p.x - pad.x, p.y - pad.y) < 40); }
    // Leeres Magazin: Blaster lädt nach, leerer Raketenwerfer wird wieder zum Blaster. Nichts fällt zu Boden, auch nicht beim K.o.
    _drop(r, exhausted = false) {
      if (!this.items) { super._drop(r, exhausted); return; }
      if (!r.weapon) return;
      if (!r.alive) { r.weapon = null; return; }
      const pause = r.weapon.kind === 'rocket' ? this.items.swap : this.items.reload;
      r.weapon = this._weapon('blaster'); r.cooldown = Math.max(r.cooldown, pause); r.reloadUntil = this.t + r.cooldown; r.thinkIn = 0;
    }
    // Aufnahme: Wer den Blaster trägt, tauscht ihn gegen die Rakete
    _takePickup(r) {
      if (!this.items) { super._takePickup(r); return; }
      if (!r.weapon || r.weapon.kind !== 'blaster') return;
      for (let i = 0; i < this.pickups.length; i++) {
        const p = this.pickups[i];
        if (p.empty || p.ammo <= 0 || p.age < .22 || Math.hypot(p.x - r.x, p.y - r.y) > r.r + 15) continue;
        r.weapon = this._weapon(p.kind, p.ammo); r.cooldown = Math.max(r.cooldown, .28); r.reloadUntil = 0;
        this.pickups.splice(i, 1); this.stats.pickups++; r.thinkIn = 0;
        this._effect('pickup', r.x, r.y, r.color, 49, .7);
        this._event('pickup', `${r.name}: Raketenwerfer`, r.id);
        return;
      }
    }
    // Rakete holen: nächste geladene (oder gleich fertige) Plattform in Reichweite, die kein näherer Roboter ansteuert.
    // Für alle vier gleich weit: Mit Ambers Raketen-Vorliebe gewann Amber 360 von 1200 Shorts, Moss nur 248.
    _rocketGoal(r) {
      if (!r.weapon || r.weapon.kind !== 'blaster') return null;
      let best = null, cost = this.items.fetch;
      for (const pad of this.pads) {
        if (!this._padLoaded(pad) && pad.readyIn > this.items.fetchWait) continue;
        const mine = Math.hypot(pad.x - r.x, pad.y - r.y);
        if (this.robots.some(o => o !== r && o.alive && !o.caged && o.mode === 'fetch' && Math.hypot(o.goalX - pad.x, o.goalY - pad.y) < 30 && Math.hypot(pad.x - o.x, pad.y - o.y) < mine)) continue;
        const c = this._travel(r.x, r.y, pad.x, pad.y);
        if (c < cost) { cost = c; best = pad; }
      }
      return best;
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
      if (this.pace && r.alive && amount > 0) {
        const living = this.robots.filter(o => o.alive);
        const P = this.pace;
        amount *= living.length >= 4 ? P.opening : living.length === 2 ? P.duel : P.damage;
        if (living.length === 2) {
          const other = living[0] === r ? living[1] : living[0];
          if (r.hp / r.maxHp < other.hp / other.maxHp) amount *= P.underdog;
          // Große Karte: Ein langes Schlussduell wird härter (ab dem ersten Treffer im Duell je Sekunde mehr Schaden)
          if (P.duelRamp) { this.duelSince ??= this.t; amount *= Math.min(P.duelMax, 1 + P.duelRamp * (this.t - this.duelSince)); }
        }
      }
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
    // ---- K3 · Wegfindung ----------------------------------------------------
    // Raster 8 AE; frei ist eine Zelle mit Roboterradius + 1 AE Abstand zu Wand, lebenden Blöcken und geschlossenen Kisten
    // (mit 16 AE und + 4 AE fielen 60 AE breite Gassen der Karten weg). A* mit 8 Nachbarn, Diagonale √2, ohne Ecken zu
    // schneiden; Gleichstand fest nach f, dann h, dann Zellnummer. Bei freier Fahrt entfällt die Suche (Luftlinie).
    _navKey() {
      let landed = 0, open = 0;
      for (const c of this.crates || []) { landed += c.landed; open += c.open; }
      return this.stats.destroyed * 64 + landed * 8 + open;
    }
    _nav() {
      let cache = NAV.get(this);
      const key = this._navKey();
      if (cache && cache.key === key) return cache;
      const { w, h, edge } = this.bounds, size = PATH.cell, cols = Math.ceil(w / size), rows = Math.ceil(h / size), n = cols * rows;
      const free = new Uint8Array(n), clear = ROBOT_R + PATH.margin;
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        const x = (col + .5) * size, y = (row + .5) * size;
        free[row * cols + col] = x >= edge + clear && x <= w - edge - clear && y >= edge + clear && y <= h - edge - clear ? 1 : 0;
      }
      for (const b of this._obstacles()) {
        const c0 = Math.max(0, Math.floor((b.x - clear) / size)), c1 = Math.min(cols - 1, Math.floor((b.x + b.w + clear) / size));
        const r0 = Math.max(0, Math.floor((b.y - clear) / size)), r1 = Math.min(rows - 1, Math.floor((b.y + b.h + clear) / size));
        for (let row = r0; row <= r1; row++) for (let col = c0; col <= c1; col++)
          if (distanceToBox((col + .5) * size, (row + .5) * size, b) < clear) free[row * cols + col] = 0;
      }
      // Suchpuffer werden über Stempel wiederverwendet statt je Suche neu angelegt
      const old = cache && cache.n === n ? cache : null;
      cache = { key, cols, rows, n, free, stamp: old ? old.stamp : 0,
        g: old ? old.g : new Float64Array(n), heapCell: old ? old.heapCell : new Int32Array(1024),
        heapF: old ? old.heapF : new Float64Array(1024), heapH: old ? old.heapH : new Float64Array(1024),
        prev: old ? old.prev : new Int32Array(n), seen: old ? old.seen : new Int32Array(n), closed: old ? old.closed : new Int32Array(n),
        searches: new Map(), tick: -1 };
      NAV.set(this, cache);
      return cache;
    }
    _cellOf(nav, x, y) {
      const col = clamp(Math.floor(x / PATH.cell), 0, nav.cols - 1), row = clamp(Math.floor(y / PATH.cell), 0, nav.rows - 1);
      return row * nav.cols + col;
    }
    _center(nav, cell) { return [(cell % nav.cols + .5) * PATH.cell, (Math.floor(cell / nav.cols) + .5) * PATH.cell]; }
    // Nächste freie Zelle, Ringe nach außen in fester Reihenfolge
    _nearestFree(nav, x, y) {
      const home = this._cellOf(nav, x, y);
      if (nav.free[home]) return home;
      const c0 = home % nav.cols, r0 = Math.floor(home / nav.cols);
      let best = -1, bestD = Infinity;
      for (let ring = 1; ring <= 12 && best < 0; ring++) for (let dr = -ring; dr <= ring; dr++) for (let dc = -ring; dc <= ring; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
        const col = c0 + dc, row = r0 + dr;
        if (col < 0 || row < 0 || col >= nav.cols || row >= nav.rows) continue;
        const cell = row * nav.cols + col; if (!nav.free[cell]) continue;
        const [cx, cy] = this._center(nav, cell), d = Math.hypot(cx - x, cy - y);
        if (d < bestD - 1e-9 || (Math.abs(d - bestD) <= 1e-9 && cell < best)) { bestD = d; best = cell; }
      }
      return best;
    }
    // A* zwischen zwei freien Zellen; Ergebnis (Länge und Zellfolge) je Simulationsschritt zwischengespeichert
    _search(nav, start, goal) {
      if (nav.tick !== this.ticks) { nav.searches.clear(); nav.tick = this.ticks; }
      const key = start * nav.n + goal, cached = nav.searches.get(key);
      if (cached) return cached;
      const result = { dist: Infinity, cells: null };
      nav.searches.set(key, result);
      if (start < 0 || goal < 0) return result;
      this.navSearches = (this.navSearches || 0) + 1;
      const { cols, rows, free, g, prev, seen, closed } = nav, size = PATH.cell, stamp = ++nav.stamp;
      const gc = goal % cols, gr = (goal - gc) / cols, D = Math.SQRT2 - 1, diag = Math.SQRT2 * size;
      // Binärer Heap in festen Puffern: Schlüssel f, dann h, dann Zellnummer
      let hc = nav.heapCell, hf = nav.heapF, hh = nav.heapH, len = 0;
      const push = (cell, fv, hv) => {
        if (len === hc.length) {
          const c = new Int32Array(len * 2), a = new Float64Array(len * 2), b = new Float64Array(len * 2);
          c.set(hc); a.set(hf); b.set(hh); hc = nav.heapCell = c; hf = nav.heapF = a; hh = nav.heapH = b;
        }
        let i = len++;
        while (i > 0) {
          const p = (i - 1) >> 1, pf = hf[p], ph = hh[p];
          if (fv > pf + 1e-9 || (fv >= pf - 1e-9 && (hv > ph + 1e-9 || (hv >= ph - 1e-9 && cell > hc[p])))) break;
          hc[i] = hc[p]; hf[i] = pf; hh[i] = ph; i = p;
        }
        hc[i] = cell; hf[i] = fv; hh[i] = hv;
      };
      const pop = () => {
        const top = hc[0]; len--;
        if (len > 0) {
          const cell = hc[len], fv = hf[len], hv = hh[len];
          let i = 0;
          for (;;) {
            const l = 2 * i + 1; if (l >= len) break;
            let m = l;
            const r = l + 1;
            if (r < len) {
              const df = hf[r] - hf[l];
              if (df < -1e-9 || (df <= 1e-9 && (hh[r] < hh[l] - 1e-9 || (hh[r] <= hh[l] + 1e-9 && hc[r] < hc[l])))) m = r;
            }
            const df = hf[m] - fv;
            if (df > 1e-9 || (df >= -1e-9 && (hh[m] > hv + 1e-9 || (hh[m] >= hv - 1e-9 && hc[m] > cell)))) break;
            hc[i] = hc[m]; hf[i] = hf[m]; hh[i] = hh[m]; i = m;
          }
          hc[i] = cell; hf[i] = fv; hh[i] = hv;
        }
        return top;
      };
      const heur = cell => { const c = cell % cols, dx = c > gc ? c - gc : gc - c, rr = (cell - c) / cols, dy = rr > gr ? rr - gr : gr - rr; return size * (dx > dy ? dx + D * dy : dy + D * dx); };
      g[start] = 0; prev[start] = -1; seen[start] = stamp; { const h0 = heur(start); push(start, h0, h0); }
      while (len > 0) {
        const cell = pop();
        if (closed[cell] === stamp) continue;
        closed[cell] = stamp;
        if (cell === goal) break;
        const col = cell % cols, row = (cell - col) / cols, base = g[cell];
        const left = col > 0, right = col < cols - 1, up = row > 0, down = row < rows - 1;
        const fl = left && free[cell - 1], fr = right && free[cell + 1], fu = up && free[cell - cols], fd = down && free[cell + cols];
        for (let k = 0; k < 8; k++) {
          let next, cost;
          switch (k) {
            case 0: if (!fr) continue; next = cell + 1; cost = size; break;
            case 1: if (!fl) continue; next = cell - 1; cost = size; break;
            case 2: if (!fd) continue; next = cell + cols; cost = size; break;
            case 3: if (!fu) continue; next = cell - cols; cost = size; break;
            case 4: if (!fr || !fd) continue; next = cell + cols + 1; cost = diag; break;
            case 5: if (!fl || !fd) continue; next = cell + cols - 1; cost = diag; break;
            case 6: if (!fr || !fu) continue; next = cell - cols + 1; cost = diag; break;
            default: if (!fl || !fu) continue; next = cell - cols - 1; cost = diag;
          }
          if (!free[next] || closed[next] === stamp) continue;
          const ng = base + cost;
          if (seen[next] !== stamp || ng < g[next] - 1e-9) {
            g[next] = ng; prev[next] = cell; seen[next] = stamp; const hv = heur(next); push(next, ng + hv, hv);
          }
        }
      }
      if (closed[goal] === stamp) {
        result.dist = g[goal]; result.cells = [];
        for (let c = goal; c >= 0; c = prev[c]) { result.cells.push(c); if (c === start) break; }
        result.cells.reverse();
      }
      return result;
    }
    // Weglänge zwischen zwei Punkten: Luftlinie bei freier Fahrt, sonst A*; unerreichbar = Luftlinie + 600
    _travel(x0, y0, x1, y1) {
      const straight = Math.hypot(x1 - x0, y1 - y0);
      if (this._walkable(x0, y0, x1, y1)) return straight;
      const nav = this._nav(), a = this._nearestFree(nav, x0, y0), b = this._nearestFree(nav, x1, y1);
      const d = this._search(nav, a, b).dist;
      if (!Number.isFinite(d)) return straight + 600;
      const [ax, ay] = this._center(nav, a), [bx, by] = this._center(nav, b);
      return d + Math.hypot(ax - x0, ay - y0) + Math.hypot(x1 - bx, y1 - by);
    }
    // Freie Fahrt für einen Roboterkörper; extra = zusätzlicher Abstand (Wege halten an Ecken etwas mehr Luft)
    _walkable(x0, y0, x1, y1, extra = 0) {
      for (const b of this._obstacles()) if (segmentBox(x0, y0, x1, y1, b, ROBOT_R + extra) !== null) return false;
      return true;
    }
    // Neuer Weg nur bei gewandertem Ziel (über 40 AE), nach 0,6 s oder wenn sich Hindernisse geändert haben.
    // Liegt das Ziel nicht frei (z. B. in Deckung), wird der nächste erreichbare Punkt zum Ziel.
    _plan(r, force = false) {
      const key = this._navKey();
      if (!force && r.path && r.planKey === key && Math.hypot(r.goalX - r.planX, r.goalY - r.planY) <= PATH.replanDistance && this.t - r.planAt < PATH.replanSec) return;
      r.planX = r.goalX; r.planY = r.goalY; r.planAt = this.t; r.planKey = key; r.pathIndex = 0;
      if (this._walkable(r.x, r.y, r.goalX, r.goalY, PATH.smooth)) { r.path = [[r.goalX, r.goalY]]; return; }
      const nav = this._nav(), start = this._nearestFree(nav, r.x, r.y), goal = this._nearestFree(nav, r.goalX, r.goalY);
      const found = this._search(nav, start, goal);
      if (!found.cells) { r.path = [[r.goalX, r.goalY]]; return; }
      const points = found.cells.map(c => this._center(nav, c)), last = points.at(-1);
      if (this._walkable(last[0], last[1], r.goalX, r.goalY)) points.push([r.goalX, r.goalY]);
      else { r.goalX = last[0]; r.goalY = last[1]; }
      // Glätten: Abkürzung, sobald freie Fahrt besteht
      const path = []; let ax = r.x, ay = r.y, i = 0;
      while (i < points.length) {
        let j = i;
        while (j + 1 < points.length && this._walkable(ax, ay, points[j + 1][0], points[j + 1][1], PATH.smooth)) j++;
        path.push([Number(points[j][0].toFixed(2)), Number(points[j][1].toFixed(2))]);
        [ax, ay] = points[j]; i = j + 1;
      }
      r.path = path;
    }
    // Richtung zum nächsten Wegpunkt plus sanfte Abstoßung von Robotern unter 70 AE; steht einer im Weg, seitlich
    // vorbei (weg von seiner Seite). Tempo 0 am Ziel.
    _desired(r) {
      let dx = 0, dy = 0, speed = 0;
      if (r.path && r.path.length) {
        // Wegpunkt erreicht unter 20 AE, aber weiter erst, wenn der nächste frei anzufahren ist (sonst bis auf 8 AE heran)
        while (r.pathIndex < r.path.length - 1) {
          const [px, py] = r.path[r.pathIndex], d = Math.hypot(px - r.x, py - r.y), [nx, ny] = r.path[r.pathIndex + 1];
          if (d < PATH.close || (d < PATH.reach && this._walkable(r.x, r.y, nx, ny))) r.pathIndex++; else break;
        }
        const [wx, wy] = r.path[r.pathIndex], d = Math.hypot(wx - r.x, wy - r.y), final = r.pathIndex === r.path.length - 1;
        if (!(final && d < PATH.reach)) { dx = (wx - r.x) / d; dy = (wy - r.y) / d; speed = final ? Math.min(1, d / 60) : 1; }
      }
      const px = dx, py = dy;
      for (const o of this.robots) if (o !== r && o.alive && !o.caged) {
        const ox = r.x - o.x, oy = r.y - o.y, d = Math.hypot(ox, oy);
        if (d > 1e-6 && d < PATH.repel) {
          const k = (PATH.repel - d) / PATH.repel, ax = ox / d, ay = oy / d;
          dx += ax * k; dy += ay * k; speed = Math.max(speed, .5 * k);
          if (-(ax * px + ay * py) > .3) { const side = -py * ax + px * ay >= 0 ? 1 : -1; dx += -py * side * PATH.around * k; dy += px * side * PATH.around * k; }
        }
      }
      const len = Math.hypot(dx, dy);
      return len > 1e-6 ? { dx: dx / len, dy: dy / len, speed } : { dx: 0, dy: 0, speed: 0 };
    }
    // Gleiten statt Abprallen: Geschwindigkeit entlang der Kante, 30 % Verlust
    _reflect(r, nx, ny) {
      const along = r.vx * nx + r.vy * ny;
      if (along < 0) { r.vx = (r.vx - along * nx) * (1 - PATH.slideLoss); r.vy = (r.vy - along * ny) * (1 - PATH.slideLoss); }
    }
    // Festgefahren: unter 6 AE in 1 s bei Ziel über 40 AE → 0,4 s zurücksetzen, dann neuer Weg
    _checkStuck(r) {
      const s = r.stuck;
      if (this.t - s.t < PATH.stuckSec) return;
      if (Math.hypot(r.goalX - r.x, r.goalY - r.y) > PATH.stuckGoal && Math.hypot(r.x - s.x, r.y - s.y) < PATH.stuckMove) {
        // Stau zweier Roboter: der mit der höheren Nummer setzt länger zurück und macht Platz
        const jam = this.robots.some(o => o !== r && o.alive && !o.caged && o.id < r.id && Math.hypot(o.x - r.x, o.y - r.y) < PATH.jam);
        const back = PATH.reverseSec + (jam ? PATH.yieldSec : 0);
        r.reverseUntil = this.t + back; r.stuckCount++; r.path = null; r.thinkIn = back;
      }
      s.x = r.x; s.y = r.y; s.t = this.t;
    }
    // ---- K4 · Fahren und Kampfverhalten ------------------------------------
    // Suchen: Waffe mit den geringsten Kosten (Weg + Wartezeit), Amber zahlt für Raketen 25 % weniger
    _weaponGoal(r) {
      let best = null, cost = Infinity;
      const discount = CHARACTERS[r.id % 4].rocketCost;
      for (const p of this.pickups.filter(p => !p.empty && p.ammo > 0).concat(this.pads)) {
        let c = this._travel(r.x, r.y, p.x, p.y) + Math.max(0, p.readyIn || 0) * r.speed;
        if (p.kind === 'rocket') c *= discount;
        // Schon beansprucht: ein anderer suchender Roboter will dorthin und ist näher dran
        const mine = Math.hypot(p.x - r.x, p.y - r.y);
        if (this.robots.some(o => o !== r && o.alive && !o.caged && !o.weapon && Math.hypot(o.goalX - p.x, o.goalY - p.y) < 30 && Math.hypot(p.x - o.x, p.y - o.y) < mine)) c += BEHAVIOUR.claimed;
        if (c < cost) { cost = c; best = p; }
      }
      return best;
    }
    _freeAt(x, y) {
      const { w, h, edge } = this.bounds, m = ROBOT_R + 6;
      if (x < edge + m || x > w - edge - m || y < edge + m || y > h - edge - m) return false;
      const nav = this._nav();
      return !!nav.free[this._cellOf(nav, x, y)];
    }
    // Angreifen: einer von 12 Punkten auf einem Kreis um das Ziel, nach freier Sicht, Deckung in der Nähe und Weg.
    // Flanke: bevorzugt Punkte seitlich der bisherigen Linie. Ohne Sicht von keinem Punkt (auch auf zwei engeren
    // Kreisen) fährt der Roboter auf das Ziel zu, bis sich eine Schusslinie öffnet.
    _attackGoal(r, target, flank) {
      const band = BEHAVIOUR.range[r.weapon.kind], scale = CHARACTERS[r.id % 4].range;
      const lo = band[0] * scale, hi = band[1] * scale, now = Math.hypot(r.x - target.x, r.y - target.y);
      const radius = clamp(now, lo, hi), bearing = Math.atan2(r.y - target.y, r.x - target.x), blocks = this.blocks.filter(b => b.alive);
      let best = null, score = Infinity, seen = false;
      for (const [ring, extra] of [[radius, 0], [radius * .65, .25], [Math.max(90, lo * .45), .5]]) for (let k = 0; k < 12; k++) {
        const off = k <= 6 ? k : k - 12, a = bearing + off * Math.PI / 6, x = target.x + Math.cos(a) * ring, y = target.y + Math.sin(a) * ring;
        if (!this._freeAt(x, y)) continue;
        const hidden = this._blocked(x, y, target.x, target.y, WEAPONS.blaster.radius);
        let v = Math.hypot(x - r.x, y - r.y) / 300 + extra;
        if (hidden) v += flank ? 1.6 : 1; else seen = true;
        if (blocks.some(b => distanceToBox(x, y, b) < BEHAVIOUR.coverNear)) v -= .2;
        if (flank) v += .5 * Math.abs(Math.cos(off * Math.PI / 6));
        if (off * r.turnBias > 0 && Math.abs(off) <= 2) v -= .1;
        if (Math.hypot(x - r.goalX, y - r.goalY) < 40) v -= .15;
        if (v < score - 1e-9) { score = v; best = [x, y]; }
      }
      return seen && best ? best : [target.x, target.y];
    }
    // Deckung: Punkt hinter einem Block, vom stärksten Gegner aus gesehen
    _coverGoal(r) {
      let threat = null;
      for (const e of this.robots) if (e.alive && !e.caged && e.id !== r.id && (!threat || (!!e.weapon - !!threat.weapon || e.hp - threat.hp) > 0)) threat = e;
      if (!threat) return null;
      let best = null, cost = Infinity;
      for (const b of this.blocks) if (b.alive) {
        const cx = b.x + b.w / 2, cy = b.y + b.h / 2, dx = cx - threat.x, dy = cy - threat.y, d = Math.hypot(dx, dy) || 1;
        const reach = Math.hypot(b.w, b.h) / 2 + ROBOT_R + 10, x = cx + dx / d * reach, y = cy + dy / d * reach;
        if (!this._freeAt(x, y) || !this._blocked(threat.x, threat.y, x, y, WEAPONS.blaster.radius)) continue;
        const c = Math.hypot(x - r.x, y - r.y) - b.hp * .3;
        if (c < cost) { cost = c; best = [x, y]; }
      }
      return best;
    }
    _think(r) {
      r.thinkIn = .38 + this.rng.next() * .22;
      const target = this._chooseTarget(r), { w, h, edge } = this.bounds, now = this.t, character = CHARACTERS[r.id % 4];
      let goal = null;
      const rocket = this.items ? this._rocketGoal(r) : null;
      if (!r.weapon) { r.mode = 'search'; const g = this._weaponGoal(r); if (g) goal = [g.x, g.y]; }
      else if (rocket) { r.mode = 'fetch'; goal = [rocket.x, rocket.y]; }
      else if (target) {
        const hidden = this._blocked(r.x, r.y, target.x, target.y, WEAPONS.blaster.radius);
        r.hiddenSince = hidden ? (r.hiddenSince ?? now) : null;
        // Short: kürzere Deckung (Zeiten in SHORT_FIGHT), sonst stehen nach dem ersten K.o. alle gleichzeitig still
        const B = this.pace || BEHAVIOUR;
        const low = r.hp / r.maxHp < character.coverHp || r.weapon.ammo <= 2;
        if (r.mode === 'cover') {
          if (r.coverUntil === null && Math.hypot(r.goalX - r.x, r.goalY - r.y) < 30) r.coverUntil = now + B.coverSec;
          if ((r.coverUntil !== null && now >= r.coverUntil) || now - r.coverSince > B.coverMax) { r.mode = 'attack'; r.coverBlock = now + B.coverPause; }
          else goal = [r.goalX, r.goalY];
        } else if (low && now >= r.coverBlock) {
          const c = this._coverGoal(r);
          if (c) { r.mode = 'cover'; r.coverSince = now; r.coverUntil = null; goal = c; }
        }
        if (!goal) {
          const flank = r.hiddenSince !== null && now - r.hiddenSince >= character.flankAfter;
          r.mode = flank ? 'flank' : 'attack';
          goal = this._attackGoal(r, target, flank);
        }
      } else r.mode = 'idle';
      if (goal) { r.goalX = goal[0]; r.goalY = goal[1]; }
      r.goalX = clamp(r.goalX, edge + r.r + 5, w - edge - r.r - 5); r.goalY = clamp(r.goalY, edge + r.r + 5, h - edge - r.r - 5);
      this._plan(r, !r.path);
    }
    // Fahren wie ein Panzer: Fahrtrichtung dreht höchstens 3,2 rad/s, über 60° Abweichung erst drehen (30 % Tempo),
    // beschleunigen 260 AE/s², bremsen 420 AE/s², Anhalten erlaubt. Beim Befreien rückwärts mit halbem Tempo.
    _steer(r, dt) {
      if (r.caged) return;
      if (r.thinkIn <= 0) this._think(r);
      r.thinkIn -= dt;
      const want = this._desired(r);
      // Wer anhalten will (am Ziel), gilt nicht als festgefahren
      if (want.speed <= 0 && this.t >= r.reverseUntil) { r.stuck.x = r.x; r.stuck.y = r.y; r.stuck.t = this.t; }
      const along = r.vx * Math.cos(r.heading) + r.vy * Math.sin(r.heading);
      // Tempo = Betrag mit Vorzeichen der Fahrtrichtung: Gleiten an einer Kante bremst, wird aber nicht zum Kriechen
      let drive = (along < 0 ? -1 : 1) * Math.hypot(r.vx, r.vy), target = 0;
      if (this.t < r.reverseUntil) target = -DRIVE.reverse * r.speed;
      else if (want.speed > 0) {
        const diff = angleDiff(Math.atan2(want.dy, want.dx), r.heading), turn = DRIVE.turn * dt;
        r.heading += clamp(diff, -turn, turn);
        if (r.heading > Math.PI) r.heading -= 2 * Math.PI; else if (r.heading < -Math.PI) r.heading += 2 * Math.PI;
        target = r.speed * want.speed * (Math.abs(diff) > DRIVE.spinAngle ? DRIVE.spinSpeed : 1);
      }
      drive = drive < target ? Math.min(target, drive + DRIVE.accel * dt) : Math.max(target, drive - DRIVE.brake * dt);
      r.vx = Math.cos(r.heading) * drive; r.vy = Math.sin(r.heading) * drive;
      r.x += r.vx * dt; r.y += r.vy * dt;
      this._resolveRobot(r);
      this._checkStuck(r);
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

  EBS.ScrapTactics = { Round: TacticalRound, CRATE, FIGHT, CHARACTERS, PATH, DRIVE, BEHAVIOUR, SHORT, SHORT_FIGHT, SHORT_ITEMS, ARENA_ITEMS, ARENA_FIGHT };
})();
