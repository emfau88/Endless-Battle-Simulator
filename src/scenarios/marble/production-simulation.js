/* Progressive Marble Factory: finite stock, deterministic transport, real work queues.
 * The physical world is deliberately independent of viewport, camera and export FPS.
 * Like Classic, visible machines constrain marbles to mechanical transport paths.
 */
(function () {
  'use strict';
  const { DT, RNG } = EBS;
  const { clamp, fnv1a, hashSeed } = EBS.util;
  const WORLD = Object.freeze({ w: 6000, h: 1500 });
  const COLORS = [
    { name: 'Cyan', hex: 0x36dce8 }, { name: 'Blue', hex: 0x557dff },
    { name: 'Rose', hex: 0xef6ca7 }, { name: 'Amber', hex: 0xf1a44d },
    { name: 'Gold', hex: 0xf1d773 }, { name: 'Jade', hex: 0x66d7a3 },
  ];
  const PALETTES = {
    spectrum: COLORS,
    ocean: [0x9aece4, 0x61cfde, 0x32a9c9, 0x4589c6, 0x6276c9, 0xa3a9e8].map((hex, i) => ({ name: ['Ice', 'Aqua', 'Lagoon', 'Azure', 'Indigo', 'Mist'][i], hex })),
    ember: [0xffe1a0, 0xf9c56b, 0xf6a052, 0xea794d, 0xcc5b5c, 0xa16687].map((hex, i) => ({ name: ['Honey', 'Gold', 'Apricot', 'Copper', 'Garnet', 'Plum'][i], hex })),
  };
  const MATERIALS = Object.freeze({
    glass: { speed: 1, polishTime: 1, coatTime: 1, restitution: 0.38, mass: 1 },
    steel: { speed: 0.86, polishTime: 1.22, coatTime: 1.12, restitution: 0.14, mass: 2.8 },
    rubber: { speed: 1.08, polishTime: 0.82, coatTime: 0.86, restitution: 0.8, mass: 0.65 },
  });
  const LANE_Y = [650, 1050], BIN_X = [4900, 5100, 5300, 5500, 5700, 5900];
  const GAP = 48;
  const smooth = v => v * v * (3 - 2 * v);

  // Rounded mechanical paths, sampled once; arc length yields constant transport speed.
  function path(points, radius = 36) {
    const raw = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
      const a = points[i - 1], b = points[i], c = points[i + 1];
      const la = Math.hypot(b[0] - a[0], b[1] - a[1]), lb = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const cut = Math.min(radius, la * 0.35, lb * 0.35);
      const p = [b[0] + (a[0] - b[0]) * cut / la, b[1] + (a[1] - b[1]) * cut / la];
      const q = [b[0] + (c[0] - b[0]) * cut / lb, b[1] + (c[1] - b[1]) * cut / lb];
      raw.push(p);
      for (let j = 1; j <= 12; j++) {
        const t = j / 12, u = 1 - t;
        raw.push([u * u * p[0] + 2 * u * t * b[0] + t * t * q[0], u * u * p[1] + 2 * u * t * b[1] + t * t * q[1]]);
      }
    }
    raw.push(points[points.length - 1]);
    const lengths = [0];
    for (let i = 1; i < raw.length; i++) lengths.push(lengths[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
    return { points: raw, lengths, len: lengths[lengths.length - 1] };
  }
  function pathAt(p, distance, out = {}) {
    const s = clamp(distance, 0, p.len);
    let lo = 0, hi = p.lengths.length - 1;
    while (lo + 1 < hi) { const mid = (lo + hi) >> 1; if (p.lengths[mid] <= s) lo = mid; else hi = mid; }
    const a = p.points[lo], b = p.points[hi], len = p.lengths[hi] - p.lengths[lo] || 1, u = (s - p.lengths[lo]) / len;
    out.x = a[0] + (b[0] - a[0]) * u; out.y = a[1] + (b[1] - a[1]) * u;
    out.tx = (b[0] - a[0]) / len; out.ty = (b[1] - a[1]) / len;
    return out;
  }
  const PATHS = {
    feed: path([[650, 470], [650, 650], [1180, 650]]),
    polish: [path([[1180, 650], [1500, 650]]), path([[1180, 650], [1230, 1050], [1500, 1050]])],
    coat: LANE_Y.map(y => path([[1500, y], [2800, y]])),
    cool: LANE_Y.map(y => path([[2800, y], [3150, y], [3200, y + 100], [3500, y + 100], [3550, y], [3650, y]])),
    inspect: [path([[3650, 650], [4050, 650]]), path([[3650, 1050], [3950, 1050], [4050, 650]])],
    scan: path([[4050, 650], [4400, 650]]),
    sort: path([[4400, 650], [5920, 650]]),
  };

  class Simulation {
    constructor({ seed = 42, params = {}, timeScale = 1 } = {}) {
      this.isProduction = true;
      this.audioWorldWidth = WORLD.w;
      this.cfg = { factoryMode: 'progressive', material: 'glass', product: 'swirl', palette: 'spectrum',
        orderSize: 144, productionSpeed: 1, intensity: 1, cameraMode: 'auto', cameraPosition: 50, cameraZoom: 1, ...params, seed };
      this.orderSize = clamp(Math.round(this.cfg.orderSize), 24, 360);
      this.cfg.orderSize = this.orderSize;
      this.dt = DT * timeScale;
      this.rng = new RNG(hashSeed(seed, 'progressive-marble-v1'));
      this.world = WORLD; this.colors = PALETTES[this.cfg.palette] || COLORS;
      this.t = 0; this.step = 0; this.workTime = 0; this.level = 0; this.completedAt = null;
      this.unlockAt = [Math.max(3, Math.round(this.orderSize / 12)), Math.max(8, Math.round(this.orderSize / 4))];
      this.milestones = [];
      this.events = new Array(1024); this.eventSeq = 0;
      this.stats = { released: 0, polished: 0, coated: 0, inspected: 0, completed: 0,
        cooled: 0, sorted: [0, 0, 0, 0, 0, 0], maxQueue: 0, blockedTicks: 0, parallelProcessed: 0, missorted: 0, maxJump: 0 };
      this.reserved = [0, 0, 0, 0, 0, 0]; this.releaseCool = 0; this.pickup = null;
      this.balls = Array.from({ length: this.orderSize }, (_, id) => {
        const material = this.cfg.material === 'mixed' ? ['glass', 'steel', 'rubber'][id % 3] : this.cfg.material;
        return { id, x: 340 + (id % 6) * 42 + (Math.floor(id / 6) % 2) * 7, y: 314 + Math.floor((id % 30) / 6) * 39,
          rot: this.rng.next() * Math.PI * 2, r: 22, displayR: 22, material: MATERIALS[material] ? material : 'glass',
          color: id % 6, state: 'raw', polish: 0, coating: 0, quality: 0, lane: 0, bin: -1, finishedAt: null,
          pattern: this.cfg.product, variation: 0.94 + this.rng.next() * 0.12, s: 0, v: 0, tr: null, route: null,
          grade: 'raw', polishedOnce: false, coatedOnce: false, cooledOnce: false, inspectedOnce: false, temperature: 0, squash: 1 };
      });
      // Balanced collection, seed-dependent order and material assignment remain visible differences.
      for (let i = this.balls.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng.next() * (i + 1));
        [this.balls[i].color, this.balls[j].color] = [this.balls[j].color, this.balls[i].color];
      }
      this.rawCursor = 0;
      this.previousPositions = new Float64Array(this.orderSize * 2);
      const track = (name, route, state, speed = 178) => ({ name, path: route, balls: [], state, speed });
      this.tracks = {
        feed: track('feed', PATHS.feed, 'feed', 170),
        polish: PATHS.polish.map((p, i) => track('polish' + i, p, 'polishQueue', 170)),
        coat: PATHS.coat.map((p, i) => track('coat' + i, p, 'toCoat', 178)),
        cool: PATHS.cool.map((p, i) => track('cool' + i, p, 'toCool', 184)),
        inspect: PATHS.inspect.map((p, i) => track('inspect' + i, p, 'toInspect', 190)),
        scan: track('scan', PATHS.scan, 'toInspect', 174), sort: track('sort', PATHS.sort, 'sorting', 194),
      };
      const station = (kind, lane, x, y) => ({ kind, lane, x, y, ball: null, progress: 0, elapsed: 0, duration: 0, active: lane === 0 });
      this.stations = { polish: LANE_Y.map((y, i) => station('polish', i, 1500, y)),
        coat: LANE_Y.map((y, i) => station('coat', i, 2800, y)),
        anneal: LANE_Y.map((y, i) => station('anneal', i, 3650, y)), inspect: station('inspect', 0, 4400, 650) };
      this.drops = [];
      this.binLayout = this._binLayout();
    }

    _binLayout() {
      const max = Math.ceil(this.orderSize / 6), cols = Math.ceil(Math.sqrt(max * 180 / 430));
      const radius = Math.min(19, 180 / (2 * cols + 0.4), 430 / (2 * Math.ceil(max / cols) + 0.4));
      return { cols, radius, spacing: radius * 2 + 0.6, floor: 1378 };
    }
    _event(type, b, p = 1, x, y) {
      const e = { seq: this.eventSeq, step: this.step, t: this.step * DT, type,
        x: x ?? b?.x ?? 2800, y: y ?? b?.y ?? 650, p, c: b?.color ?? 0, material: b?.material || 'glass' };
      this.events[this.eventSeq++ % this.events.length] = e;
    }
    drainEvents(since = 0) { return this.events.filter(e => e && e.seq >= since).sort((a, b) => a.seq - b.seq); }
    setParam(key, value) { this.cfg[key] = value; }
    setTimeScale(value) { if (Number.isFinite(value) && value > 0) this.dt = DT * clamp(value, 0.1, 2); }
    _room(tr) { return !tr.balls.length || tr.balls[tr.balls.length - 1].s >= GAP; }
    _enter(tr, b) {
      if (!this._room(tr)) return false;
      b.tr = tr; b.state = tr.state; b.s = 0; b.v = 0; b.route = null;
      pathAt(tr.path, 0, b); tr.balls.push(b); return true;
    }
    _move(tr, dt, exit, target = null) {
      for (let i = 0; i < tr.balls.length;) {
        const b = tr.balls[i], old = b.s, end = target ? target(b) : tr.path.len;
        const limit = Math.min(end, i ? tr.balls[i - 1].s - GAP : Infinity);
        const speed = tr.speed * MATERIALS[b.material].speed;
        b.v = Math.min(speed, b.v + dt * 170);
        b.s = Math.max(old, Math.min(limit, old + b.v * dt));
        if (b.s < old + b.v * dt - 0.001) b.v = 0;
        pathAt(tr.path, b.s, b); b.rot += (b.s - old) / b.r;
        if (b.s >= end - 1e-7 && exit(b)) tr.balls.splice(i, 1); else i++;
      }
    }
    _start(st, b) {
      if (!st.active || st.ball) return false;
      st.ball = b; st.elapsed = 0; st.progress = 0;
      b.tr = null; b.s = 0; b.v = 0; b.lane = st.lane;
      b.x = st.x; b.y = st.y;
      const m = MATERIALS[b.material];
      if (st.kind === 'polish') {
        b.state = 'polishing'; st.duration = 4.25 * m.polishTime * b.variation;
        this._event(b.material === 'rubber' ? 'factoryPress' : 'factoryPolish', b);
      } else if (st.kind === 'coat') {
        b.state = 'coating';
        st.duration = (this.level ? 3.2 : 2.1) * m.coatTime * ({ clear: 0.7, swirl: 1, pearl: 1.16 }[this.cfg.product] || 1);
        b.finishLevel = this.level;
        this._event('factoryCoat', b, this.level ? 1 : 0.6);
      } else if (st.kind === 'anneal') {
        b.state = 'cooling'; st.duration = { glass: 4.3, steel: 2.2, rubber: 1.5 }[b.material];
        this._event('factoryRoll', b, 0.35);
      } else { b.state = 'inspecting'; st.duration = b.material === 'steel' ? 1.9 : 1.5; this._event('factoryScan', b); }
      return true;
    }
    _work(st, dt, out) {
      if (!st.ball) return;
      const b = st.ball;
      st.elapsed = Math.min(st.duration, st.elapsed + dt); st.progress = st.elapsed / st.duration;
      if (st.kind === 'polish') {
        b.polish = smooth(st.progress); b.rot += dt * (b.material === 'rubber' ? 0.6 : 4.4);
        if (st.progress === 1 && !b.polishedOnce) { b.polishedOnce = true; this.stats.polished++; if (st.lane === 1) this.stats.parallelProcessed++; b.grade = 'polished'; }
      } else if (st.kind === 'coat') {
        b.coating = smooth(st.progress) * (b.finishLevel ? 1 : 0.18); b.rot += dt * 1.5; b.temperature = smooth(st.progress);
        if (st.progress === 1 && !b.coatedOnce) { b.coatedOnce = true; this.stats.coated++; b.grade = b.finishLevel ? this.cfg.product : 'clear'; }
      } else if (st.kind === 'anneal') {
        b.temperature = 1 - smooth(st.progress); b.rot += dt * 0.45;
        if (st.progress === 1 && !b.cooledOnce) { b.cooledOnce = true; this.stats.cooled++; }
      } else {
        b.quality = smooth(st.progress);
        if (st.progress === 1 && !b.inspectedOnce) { b.inspectedOnce = true; this.stats.inspected++; }
      }
      if (st.progress === 1 && this._enter(out, b)) {
        st.ball = null; st.progress = 0;
        if (st.kind === 'inspect') this._event('factorySort', b);
        else this._event('factoryRoll', b, 0.7);
      }
    }
    _release(dt) {
      this.releaseCool = Math.max(0, this.releaseCool - dt);
      if (this.pickup) {
        const b = this.pickup, old = b.s;
        b.s = Math.min(b.route.len, b.s + dt * 152 * MATERIALS[b.material].speed);
        pathAt(b.route, b.s, b); b.rot += (b.s - old) / b.r;
        if (b.s >= b.route.len && this._enter(this.tracks.feed, b)) { this.pickup = null; this._event('factoryFeed', b); }
      }
      // A pilot lot must pass quality control before the remaining order is released.
      // Even a 24-piece short order therefore still has real work for the second line.
      const releasedLot = this.level < 2 ? Math.max(16, Math.ceil(this.orderSize * 0.6)) : this.orderSize;
      if (!this.pickup && !this.releaseCool && this.rawCursor < releasedLot && this.rawCursor < this.balls.length && this._room(this.tracks.feed)) {
        const b = this.balls[this.rawCursor++];
        b.route = path([[b.x, b.y], [625, 550], [650, 470]], 22); b.state = 'feed'; b.s = 0;
        this.pickup = b; this.stats.released++;
        this.releaseCool = 1.45 / clamp(this.cfg.intensity, 0.5, 2);
        this._event('factoryImpact', b, 0.45);
      }
    }
    _drop(b) {
      const index = this.reserved[b.color]++, l = this.binLayout;
      const col = index % l.cols, row = Math.floor(index / l.cols);
      const x = BIN_X[b.color] + (col - (l.cols - 1) / 2) * l.spacing;
      const y = l.floor - l.radius - row * l.spacing;
      b.bin = b.color; b.binSlot = index; b.tr = null; b.s = 0;
      // Steel is pulled into the sorter by an electromagnetic pickup; rubber rebounds below the lip.
      const magnet = b.material === 'steel' ? -42 : 0;
      b.route = path([[b.x, b.y], [BIN_X[b.color], 890 + magnet], [x, 950], [x, y]], 22);
      b.settleAge = 0; b.impactPlayed = false;
      this.drops.push(b); this._event('factorySort', b, 0.55); return true;
    }
    _advanceDrops(dt) {
      for (let i = 0; i < this.drops.length;) {
        const b = this.drops[i], old = b.s;
        b.v = Math.min(330 * MATERIALS[b.material].speed, b.v + dt * (b.material === 'steel' ? 750 : 520));
        b.s = Math.min(b.route.len, b.s + b.v * dt); pathAt(b.route, b.s, b); b.rot += (b.s - old) / b.r;
        const recess = smooth(clamp((b.y - 900) / 100, 0, 1));
        b.displayR = b.r + (this.binLayout.radius - b.r) * recess;
        if (b.s >= b.route.len) {
          if (!b.impactPlayed) { this._event('factoryImpact', b, b.material === 'rubber' ? 0.55 : 0.8); b.impactPlayed = true; }
          if (b.material === 'rubber' && b.settleAge < 1.1) {
            b.settleAge += dt;
            b.y -= 38 * Math.abs(Math.sin(b.settleAge * Math.PI / 0.37)) * Math.exp(-b.settleAge * 2.6);
            b.squash = 1 - 0.13 * Math.exp(-b.settleAge * 2.6) * Math.cos(b.settleAge * Math.PI * 2 / 0.37);
            i++; continue;
          }
          b.state = 'finished'; b.finishedAt = this.t; b.route = null; b.v = 0; b.displayR = this.binLayout.radius;
          b.squash = 1;
          this.stats.completed++; this.stats.sorted[b.color]++;
          this.drops.splice(i, 1); this._progress();
        } else i++;
      }
    }
    _progress() {
      if (this.level === 0 && this.stats.completed >= this.unlockAt[0]) {
        this.level = 1;
        this.milestones.push({ type: 'coating', time: this.t, completed: this.stats.completed, x: 2800 });
        this._event('factoryUpgrade', null, 0.8, 2800, 500);
      }
      if (this.level === 1 && this.stats.completed >= this.unlockAt[1]) {
        this.level = 2; this.stations.polish[1].active = this.stations.coat[1].active = this.stations.anneal[1].active = true;
        this.milestones.push({ type: 'parallel', time: this.t, completed: this.stats.completed, x: 2300 });
        this._event('factoryUpgrade', null, 1, 1500, 1050);
      }
      if (this.stats.completed === this.orderSize && this.completedAt === null) {
        this.completedAt = this.t;
        this.milestones.push({ type: 'complete', time: this.t, completed: this.stats.completed, x: 5400 });
        this._event('factoryComplete', null, 0.7, 5400, 1200);
      }
    }

    stepOnce() {
      this.step++; this.t += this.dt;
      if (this.completedAt !== null) return;
      const dt = this.dt * clamp(this.cfg.productionSpeed, 0.5, 2);
      this.workTime += dt;
      const oldPositions = this.previousPositions;
      for (let i = 0; i < this.balls.length; i++) { oldPositions[i * 2] = this.balls[i].x; oldPositions[i * 2 + 1] = this.balls[i].y; }
      const tr = this.tracks;
      this._advanceDrops(dt);
      this._move(tr.sort, dt, b => this._drop(b), b => BIN_X[b.color] - 4400);
      this._work(this.stations.inspect, dt, tr.sort);
      this._move(tr.scan, dt, b => this._start(this.stations.inspect, b));
      // A deterministic zipper alternates the merge priority; neither lane can starve.
      const order = Math.floor(this.workTime / 3) % 2 ? [1, 0] : [0, 1];
      for (const i of order) this._move(tr.inspect[i], dt, b => this._enter(tr.scan, b));
      for (let i = 0; i < 2; i++) {
        this._work(this.stations.anneal[i], dt, tr.inspect[i]);
        this._move(tr.cool[i], dt, b => this._start(this.stations.anneal[i], b));
        this._work(this.stations.coat[i], dt, tr.cool[i]);
        this._move(tr.coat[i], dt, b => this._start(this.stations.coat[i], b));
        this._work(this.stations.polish[i], dt, tr.coat[i]);
        this._move(tr.polish[i], dt, b => this._start(this.stations.polish[i], b));
      }
      this._move(tr.feed, dt, b => {
        const lanes = this.level === 2 ? [0, 1] : [0];
        lanes.sort((a, z) => (tr.polish[a].balls.length + !!this.stations.polish[a].ball) - (tr.polish[z].balls.length + !!this.stations.polish[z].ball));
        for (const i of lanes) if (this._room(tr.polish[i])) { b.lane = i; return this._enter(tr.polish[i], b); }
        return false;
      });
      this._release(dt);
      const queue = tr.feed.balls.length + tr.polish.reduce((n, q) => n + q.balls.length, 0);
      this.stats.maxQueue = Math.max(this.stats.maxQueue, queue);
      if (tr.feed.balls.some(b => b.v === 0)) this.stats.blockedTicks++;
      for (let i = 0; i < this.balls.length; i++) {
        const b = this.balls[i], x = oldPositions[i * 2], y = oldPositions[i * 2 + 1];
        this.stats.maxJump = Math.max(this.stats.maxJump, Math.hypot(b.x - x, b.y - y));
      }
    }
    counts() {
      const out = {};
      for (const b of this.balls) out[b.state] = (out[b.state] || 0) + 1;
      return out;
    }
    snapshot() {
      return { t: this.t, step: this.step, mode: 'progressive', level: this.level, orderSize: this.orderSize,
        completedAt: this.completedAt, complete: this.completedAt !== null, ...this.stats, sorted: [...this.stats.sorted],
        counts: this.counts(), ballsTotal: this.balls.length, ballsExpected: this.orderSize,
        unlockAt: [...this.unlockAt], milestones: this.milestones.map(m => ({ ...m })),
        inHopper: this.orderSize - this.stats.released, moving: this.stats.released - this.stats.completed,
        throughput: this.t ? this.stats.completed * 60 / this.t : 0,
        summary: this.completedAt !== null ? `Auftrag abgeschlossen · ${this.orderSize} Produkte · ${this.level} Ausbauten`
          : `${this.stats.completed} / ${this.orderSize} Produkte · Ausbau ${this.level} / 2 · ${this.stats.released - this.stats.completed} in Bearbeitung` };
    }
    checkInvariants() {
      const errors = [], seen = new Set();
      const mark = (b, label) => { if (seen.has(b.id)) errors.push(`Kugel ${b.id} doppelt: ${label}`); seen.add(b.id); };
      const tracks = [this.tracks.feed, ...this.tracks.polish, ...this.tracks.coat, ...this.tracks.cool, ...this.tracks.inspect, this.tracks.scan, this.tracks.sort];
      for (const tr of tracks) tr.balls.forEach((b, i) => {
        mark(b, tr.name);
        if (b.tr !== tr || b.state !== tr.state) errors.push(`Bahnzuordnung ${b.id}`);
        if (b.s < 0 || b.s > tr.path.len + 1e-6) errors.push(`Bahnposition ${b.id}`);
        if (i && tr.balls[i - 1].s - b.s < GAP - 0.01) errors.push(`Überlappung ${tr.name}: ${b.id}`);
      });
      for (const st of [...this.stations.polish, ...this.stations.coat, ...this.stations.anneal, this.stations.inspect]) if (st.ball) {
        mark(st.ball, st.kind);
        if (!st.active || st.ball.tr) errors.push(`Maschinenzuordnung ${st.ball.id}`);
      }
      if (this.pickup) mark(this.pickup, 'pickup');
      for (const b of this.drops) mark(b, 'drop');
      for (const b of this.balls) {
        if (b.state === 'raw' || b.state === 'finished') mark(b, b.state);
        if (![b.x, b.y, b.rot, b.polish, b.coating, b.quality].every(Number.isFinite)) errors.push(`Ungültige Kugel ${b.id}`);
        if (b.x < 0 || b.x > WORLD.w || b.y < 0 || b.y > WORLD.h) errors.push(`Außerhalb Anlage ${b.id}`);
        if (b.state === 'finished' && (b.bin !== b.color || !b.polishedOnce || !b.coatedOnce || !b.cooledOnce || !b.inspectedOnce)) errors.push(`Unfertiges/falsches Produkt ${b.id}`);
      }
      if (seen.size !== this.orderSize || this.balls.length !== this.orderSize) errors.push('Bestandsbilanz stimmt nicht');
      const count = predicate => this.balls.filter(predicate).length;
      for (const [key, predicate] of [
        ['released', b => b.state !== 'raw'], ['polished', b => b.polishedOnce], ['coated', b => b.coatedOnce], ['cooled', b => b.cooledOnce],
        ['inspected', b => b.inspectedOnce], ['completed', b => b.state === 'finished'],
      ]) if (this.stats[key] !== count(predicate)) errors.push(`Zähler ${key}`);
      if (this.stats.sorted.reduce((a, b) => a + b, 0) !== this.stats.completed) errors.push('Sortierbilanz');
      for (let i = 0; i < 6; i++) if (this.stats.sorted[i] !== count(b => b.state === 'finished' && b.color === i)) errors.push(`Behälterbilanz ${i}`);
      if (this.completedAt !== null && this.stats.completed !== this.orderSize) errors.push('Vorzeitiger Abschluss');
      if (this.level > 0 && this.stats.completed < this.unlockAt[0]) errors.push('Vorzeitige Veredelung');
      if (this.level > 1 && this.stats.completed < this.unlockAt[1]) errors.push('Vorzeitige Parallelstraße');
      return { ok: errors.length === 0, errors, bodies: 0, balls: this.balls.length };
    }
    stateHash() {
      const fixed = x => Number(x.toFixed(6));
      // Presentation settings, world size and render calls are intentionally absent.
      return fnv1a(JSON.stringify({ step: this.step, t: fixed(this.t), dt: this.dt, level: this.level, completedAt: this.completedAt,
        parameters: [this.cfg.material, this.cfg.product, this.cfg.productionSpeed, this.cfg.intensity],
        stats: this.stats, reserved: this.reserved, releaseCool: fixed(this.releaseCool), rng: this.rng.s,
        balls: this.balls.map(b => [b.id, b.state, b.material, b.color, b.lane, fixed(b.x), fixed(b.y), fixed(b.s), fixed(b.v), fixed(b.rot), fixed(b.polish), fixed(b.coating), fixed(b.quality), b.binSlot, b.finishLevel, fixed(b.temperature), b.settleAge]),
        stations: [...this.stations.polish, ...this.stations.coat, ...this.stations.anneal, this.stations.inspect].map(st => [st.ball?.id, fixed(st.elapsed), fixed(st.duration)]),
        events: this.eventSeq, milestones: this.milestones })).toString(16).padStart(8, '0');
    }
    destroy() { this.events.length = 0; }
  }
  EBS.MarbleProduction = { Simulation, WORLD, COLORS, PALETTES, MATERIALS, PATHS, LANE_Y, BIN_X, path, pathAt };
})();
