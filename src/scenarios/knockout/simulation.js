/* Marble Knockout · Rennablauf (R43/M4)
 *
 * Eine Simulation führt durch ein ganzes Video: Langvideo (16:9) mit 12 Murmeln und 10 Bahnen, Short (9:16) mit 8
 * Murmeln und 3 Bahnen, dazu die Element-Galerie und eine einzelne Bahn zum Ansehen.
 * Videozeit t und Bahnzeit rt sind getrennt: In der Zeitlupe läuft die Bahnzeit langsamer (Auslöser aus dem Zustand).
 * Jede Bahn baut einen eigenen Physik-Kern; die Murmeln behalten ihre Kennung über alle Bahnen.
 */
(function (global) {
  'use strict';
  const EBS = global.EBS;
  const P = EBS.KnockoutPhysics, E = EBS.KnockoutElements;

  const COLORS = {
    RED: '#e8343a', ORANGE: '#f7862a', YELLOW: '#f5cf2a', LIME: '#9ad83a', GREEN: '#1fa85a', CYAN: '#22c4dc',
    BLUE: '#2f6be0', PURPLE: '#8a4de0', PINK: '#f25fae', WHITE: '#eef1f4', BLACK: '#2a2d33', GOLD: '#e3b23c',
  };
  const LONG_FIELD = ['RED', 'ORANGE', 'YELLOW', 'LIME', 'GREEN', 'CYAN', 'BLUE', 'PURPLE', 'PINK', 'WHITE', 'BLACK', 'GOLD'];
  const SHORT_FIELD = {
    A: ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'CYAN', 'BLUE', 'PURPLE', 'PINK'],
    B: ['RED', 'ORANGE', 'GREEN', 'CYAN', 'BLUE', 'PURPLE', 'PINK', 'GOLD'],
    C: ['RED', 'ORANGE', 'YELLOW', 'LIME', 'CYAN', 'BLUE', 'PURPLE', 'PINK'],
  };
  const RULES = {
    long: { r: 22, T: 16, intro: 4, ready: 1.6, result: 2.2, podium: 8, keep: null },
    short: { r: 30, T: 20, intro: 0, ready: 0.35, result: 1.1, podium: 2.4, keep: [5, 3, 1] },
    slowRate: 0.35, slowMax: 2, slowCount: 3, slowRamp: 0.25, slowZone: 4, slowGap: 0.35, slowGapFinal: 0.8,
    stuckWindow: 3, stuckMin: 5, stuckOut: 12, stillSpeed: 40, stageLimit: 90,
    gallery: { marbles: 6, cycle: 14 },
  };
  const PHYS = { gravity: 1600, maxSpeed: 1500 };

  class KnockoutSimulation {
    constructor({ seed, params, world }) {
      this.seed = seed >>> 0; this.cfg = params; this.view = world;
      this.W = world.w; this.H = world.h; this.portrait = world.h > world.w;
      this.format = this.portrait ? 'short' : 'long';
      const R = RULES[this.format];
      this.R = R; this.r = R.r; this.T = R.T;
      this.dt = EBS.DT; this.step = 0; this.t = 0;
      this.events = new Array(512); this.eventSeq = 0;
      this.stages = EBS.KnockoutStages;
      this.mode = params.mode;
      this.slow = { on: false, from: 0, until: 0, count: 0, rate: 1, finalDone: false };
      this.notes = [];                                        // Einblendungen { kind, text, t, c }
      this.outList = [];                                      // Langvideo: Reihenfolge in der Röhre (Roster-Index)
      if (this.mode === 'gallery') { this.initGallery(); return; }
      // Feld
      let names = this.format === 'long' ? LONG_FIELD : SHORT_FIELD[params.short] || SHORT_FIELD.A;
      // Einzelne Bahn: so viele Murmeln, wie im Rennen dort ankommen (oder field)
      if (this.mode === 'stage') {
        const i = params.stage | 0, k = params.field || (this.format === 'long' ? 12 - i : [8, 5, 3][i] || 3);
        names = names.slice(0, Math.max(2, Math.min(names.length, k)));
      }
      this.roster = names.map((name, i) => ({ id: i, name, color: COLORS[name], alive: true, outStage: -1, how: '', place: 0 }));
      const rng = new EBS.RNG(EBS.util.hashSeed(this.seed, 'lineup'));
      const order = this.roster.map((m) => m.id);
      for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      this.lineup = order;
      this.list = this.mode === 'stage' ? [this.stageSpecs()[params.stage] || this.stageSpecs()[0]] : this.stageSpecs();
      // Short: Lockruf am Anfang (je Fassung eigener Satz, steht an der Bahnliste)
      this.hook = this.format === 'short' ? this.stageSpecs().hook || '' : '';
      this.stageNo = -1; this.safeNext = false; this.podium = null;
      this.enterStage(0);
      this.phase = this.format === 'long' && this.mode === 'race' ? 'intro' : 'ready'; this.phaseT = 0;
    }

    stageSpecs() {
      const S = this.stages;
      return this.format === 'long' ? S.long : S.short[this.cfg.short] || S.short.A;
    }

    // ------------------------------------------------------------ Bahn aufbauen
    stageSeed(i) {
      const script = this.cfg.script;
      if (script && script[i] !== undefined) return script[i] >>> 0;
      return EBS.util.hashSeed(this.seed, 'stage', i, this.mode === 'stage' ? this.cfg.stage : '');
    }
    newWorld() { return new P.World(PHYS); }
    builder(world, seed) {
      return new E.Builder(world, { r: this.r, T: this.T, W: this.W, H: this.H, rng: new EBS.RNG(seed) });
    }
    ctxFor(n) { return { W: this.W, H: this.H, r: this.r, d: 2 * this.r, T: this.T, n, short: this.format === 'short' }; }

    enterStage(i) {
      const spec = this.list[i], seed = this.stageSeed(i);
      this.stageNo = i; this.spec = spec; this.stageSeedValue = seed;
      const world = this.newWorld(), b = this.builder(world, seed), alive = this.lineup.filter((id) => this.roster[id].alive);
      spec.build(b, this.ctxFor(alive.length));
      this.world = world; this.stage = b.result();
      const jr = new EBS.RNG(EBS.util.hashSeed(seed, 'jitter'));
      this.runners = alive.map((rid, k) => {
        const [sx, sy] = this.stage.start.slots[k];
        const jx = this.stage.start.dir === 0 ? 5 : 1.5;              // Regal: etwas mehr Streuung, sonst liegt man auf Stiften
        const pm = world.addMarble({ x: sx + (jr.next() * 2 - 1) * jx, y: sy, r: this.r });
        pm.rid = rid; pm.px = pm.x; pm.py = pm.y; pm.zone = -1;
        return { rid, pm, seg: 0, prog: 0, best: 0, idle: 0, finished: false, finishT: 0, place: 0, hatchT: -1, out: false, fell: false, nudges: 0, nudgeT: -1, nx: 0, ny: 0 };
      });
      this.killPits = this.stage.pits.filter((p) => p.kill);
      if (this.stage.path) this.runners.forEach((u) => { this.progress(u); u.best = u.prog; });
      // Wieviele scheiden hier aus?
      const n = alive.length, last = i === this.list.length - 1;
      let keep;
      if (this.format === 'short') keep = this.R.keep[Math.min(i, this.R.keep.length - 1)];
      else keep = last || this.safeNext ? n : n - 1;
      if (this.mode === 'stage') keep = spec.final ? n : n - 1;
      this.safe = this.format === 'long' && this.safeNext && !last;
      this.safeNext = false;
      this.final = spec.final || (this.format === 'short' && i === this.list.length - 1);
      this.keep = this.final ? (this.format === 'short' ? 1 : n) : keep;
      this.needOut = this.final ? 0 : Math.max(0, n - keep);
      this.outHere = 0; this.trapsClosed = this.safe; this.finishedCount = 0; this.placeCount = 0; this.dnfCount = 0; this.stageEnd = -1; this.hatchAt = -1;
      if (this.safe) for (const el of this.stage.elements) if (el.closeTraps) el.closeTraps(0);
      this.leader = -1; this.lastPlace = -1; this.leadChanges = 0;
      this.stats = { nearMiss: 0, slowmo: 0, stuck: 0, timeUp: 0 };
      // Kapitel für die Videobeschreibung (Langvideo): Bahnbeginn in Videozeit
      (this.chapterLog || (this.chapterLog = [])).push({ t: this.t, title: this.final ? 'Grand Final' : `Stage ${i + 1}: ${titleCase(spec.title)}` });
      this.emit('stage', this.W / 2, this.H / 2, i, -1);
    }

    // ------------------------------------------------------------ Schritt
    stepOnce() {
      const dt = this.dt;
      if (this.mode === 'gallery') { this.galleryStep(dt); this.t += dt; this.step++; return; }
      switch (this.phase) {
        case 'intro':
          this.physics(dt);
          if (this.phaseT >= this.R.intro) this.setPhase('ready');
          break;
        case 'ready':
          this.physics(dt);
          if (this.phaseT >= this.R.ready) {
            this.stage.start.gate.setOpen(this.world.t, true);
            this.emit('gate', this.stage.start.x, this.stage.start.y, 0, -1);
            this.raceStart = this.world.t; this.setPhase('race');
          }
          break;
        case 'race': {
          const rate = this.slowRate();
          this.physics(dt * rate);
          this.raceLogic(dt * rate);
          break;
        }
        case 'result':
          this.physics(dt);
          if (this.phaseT >= this.resultSec()) this.nextStage();
          break;
        case 'podium':
          if (this.phaseT >= this.R.podium) this.setPhase('end');
          break;
        default: break;
      }
      this.t += dt; this.step++; this.phaseT += dt;
    }
    setPhase(p) { this.phase = p; this.phaseT = 0; }
    resultSec() { return this.final && this.format === 'short' ? this.R.podium : this.R.result; }

    nextStage() {
      // Aufstellung der nächsten Bahn: Zielreihenfolge der Überlebenden
      const done = this.runners.filter((u) => !u.out).sort((a, b) => a.place - b.place).map((u) => u.rid);
      this.lineup = done;
      if (this.final) {
        if (this.format === 'long' && this.mode === 'race') {
          this.podium = done.slice(0, 3); this.setPhase('podium'); this.emit('podium', this.W / 2, this.H / 2, 0, done[0]);
          this.chapterLog.push({ t: this.t, title: 'Podium' });
        }
        else this.setPhase('end');
        return;
      }
      if (this.stageNo + 1 >= this.list.length) { this.setPhase('end'); return; }
      this.enterStage(this.stageNo + 1); this.setPhase('ready');
    }

    /** Physik für Bahnzeit h, danach Elemente, Zonen und Stöße. */
    physics(h) {
      const W = this.world;
      for (const m of W.marbles) { m.px = m.x; m.py = m.y; }
      W.step(h);
      const st = this.elCtx || (this.elCtx = { r: this.r, emit: (...a) => this.emit(...a) });
      st.t = W.t; st.dt = h; st.marbles = W.marbles;
      for (const el of this.stage.elements) if (el.update) el.update(st, h);
      for (const z of this.stage.zones) for (const m of W.marbles) {
        if (!m.active) continue;
        const dx = m.x - z.x, dy = m.y - z.y, d2 = dx * dx + dy * dy;
        if (m.zone !== z.id && d2 < z.R * z.R) { m.mask = z.inner; m.zone = z.id; }
        else if (m.zone === z.id && d2 > z.Rout * z.Rout) { m.mask = z.outer; m.zone = -1; }
      }
      this.sounds(W.impacts);
    }

    sounds(list) {
      if (!list.length) return;
      // Höchstens drei Stöße je Schritt, die stärksten zuerst (feste Reihenfolge bei Gleichstand)
      const pick = list.filter((s) => s.speed > 90).sort((a, b) => b.speed - a.speed || a.i - b.i || a.j - b.j).slice(0, 3);
      for (const s of pick) {
        const type = s.tag === 'marble' ? 'hit_marble' : s.tag === 'peg' ? 'peg' : s.tag === 'bumper' ? 'bumper' : 'hit_track';
        const rid = this.world.marbles[s.i] && this.world.marbles[s.i].rid;
        this.emit(type, s.x, s.y, Math.min(1, s.speed / 900), rid === undefined ? -1 : rid);
      }
    }

    // ------------------------------------------------------------ Zeitlupe
    slowRate() {
      const s = this.slow;
      if (s.on && this.t >= s.until) s.on = false;
      return this.slowAt(this.t);
    }
    /** Tempo der Zeitlupe zur Videozeit t, ohne den Zustand zu ändern (auch für das Bild). */
    slowAt(t) {
      const s = this.slow;
      if (!s.on || t >= s.until) return 1;
      const ramp = RULES.slowRamp, a = Math.min(1, (t - s.from) / ramp), b = Math.min(1, (s.until - t) / ramp), k = Math.min(a, b);
      return 1 - (1 - RULES.slowRate) * E.ease(k);
    }
    triggerSlow(kind) {
      const s = this.slow;
      if (s.on || this.cfg.slowmo === 'off') return;
      // Das Finale hat eine eigene Zeitlupe, unabhängig davon, wie viele es vorher gab
      if (this.final ? s.finalDone : s.count >= RULES.slowCount) return;
      if (this.final) s.finalDone = true;
      s.on = true; s.from = this.t; s.until = this.t + RULES.slowMax; s.count++; this.stats.slowmo++;
      this.emit('slowmo', this.W / 2, this.H / 2, 0, -1); void kind;
    }

    // ------------------------------------------------------------ Rennen
    raceLogic(h) {
      const st = this.stage, rt = this.world.t, R = this.r;
      const fin = st.finish;
      for (const u of this.runners) {
        const m = u.pm;
        if (u.out || !m.active) continue;
        // Ziel: Kreuzung der Lichtschranke in diesem Schritt (Zeit genau interpoliert)
        if (!u.finished && fin && m.collide) {
          const s = fin.sense || fin, f = crossing(m.px, m.py, m.x, m.y, s.ax, s.ay, s.bx, s.by);
          if (f >= 0) {
            u.finished = true; u.finishT = rt - h + f * h; this.finishedCount++;
            // c = Platz − 1: Der Zielton wird je Platz etwas tiefer (Tonleiter im Ton-Eintrag `finish`)
            u.place = ++this.placeCount; this.emit('finish', m.x, m.y, u.place, u.place - 1);
            if (this.final && u.place === 1) this.emit('winner', m.x, m.y, 1, u.rid);
          }
        }
        // Fortschritt und Hängenbleiben: Nur wer langsam ist und nicht vorankommt, sammelt Wartezeit. In Trommel,
        // Ringen und Labyrinth (Zone) zählt sie nicht, dort ist Kreisen gewollt.
        if (!u.finished && st.path) {
          this.progress(u);
          const v2 = m.vx * m.vx + m.vy * m.vy;
          if (u.prog > u.best + RULES.stuckMin) { u.best = u.prog; u.idle = 0; }
          else if (m.collide && m.zone < 0 && v2 < RULES.stillSpeed * RULES.stillSpeed) u.idle += h;
          if (m.collide && u.idle > RULES.stuckWindow * (u.nudges + 1) && u.nudges < 3) { u.nudges++; this.nudge(u); }
          if (m.collide && u.idle > RULES.stuckOut) this.stuckOut(u);
        }
        // Gestürzt: aus dem Bild oder in eine Grube
        if (m.y > st.knockoutY || m.x < -4 * R || m.x > this.W + 4 * R) { this.fell(u); continue; }
        if (m.collide) for (const p of this.killPits) if (m.x > p.x0 && m.x < p.x1 && m.y > p.y0 + p.depth && m.y < p.y1) { this.fell(u); break; }
      }
      // Durch die Klappe gefallene Murmeln verschwinden unten
      for (const u of this.runners) if (u.hatchT >= 0 && u.pm.active && u.pm.y > this.H + 3 * R) u.pm.active = false;
      this.ranking();
      // Letzte(r) raus: alle bis auf die Auszuscheidenden sind im Ziel
      const alive = this.runners.filter((u) => !u.out);
      const waiting = alive.filter((u) => !u.finished);
      if (this.stageEnd < 0) {
        if (!this.final && this.needOut > this.outHere && this.finishedCount >= this.keep && waiting.length) {
          for (const u of waiting) this.hatch(u);
          if (st.finish && st.finish.gate) st.finish.gate.setOpen(rt, false);
        }
        if (this.final && this.format === 'short' && this.placeCount >= 1) this.stageEnd = this.t + 0.6;
        if (!waiting.length && (this.final || this.outHere >= this.needOut)) this.stageEnd = this.t;
        if (rt - this.raceStart > RULES.stageLimit) this.timeUp();
        this.checkSlow(waiting);
      }
      if (this.stageEnd >= 0 && this.t >= this.stageEnd) this.setPhase('result');
    }

    progress(u) {
      const p = this.stage.path, m = u.pm, pts = p.pts, n = pts.length - 1;
      let best = Infinity, bi = u.seg, bt = 0;
      const lo = Math.max(0, u.seg - 2), hi = Math.min(n - 1, u.seg + 6);
      for (let i = lo; i <= hi; i++) {
        const ax = pts[i][0], ay = pts[i][1], ex = pts[i + 1][0] - ax, ey = pts[i + 1][1] - ay, ll = ex * ex + ey * ey;
        let t = ll > 0 ? ((m.x - ax) * ex + (m.y - ay) * ey) / ll : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const dx = m.x - ax - ex * t, dy = m.y - ay - ey * t, d2 = dx * dx + dy * dy;
        if (d2 < best) { best = d2; bi = i; bt = t; }
      }
      u.seg = bi; u.prog = p.cum[bi] + (p.cum[bi + 1] - p.cum[bi]) * bt;
    }
    nudge(u) {
      const m = u.pm, p = this.stage.path, i = Math.min(u.seg, p.pts.length - 2);
      const ex = p.pts[i + 1][0] - p.pts[i][0], ey = p.pts[i + 1][1] - p.pts[i][1], l = Math.sqrt(ex * ex + ey * ey) || 1;
      // Längs der Ideallinie und immer etwas zur Seite (sonst hüpft eine Murmel auf einem Stift nur auf und ab)
      const side = (u.rid + u.nudges) % 2 ? 1 : -1;
      m.vx += ex / l * 160 + side * 110; m.vy += ey / l * 160 - 260;
      u.nudgeT = this.t; u.nx = m.x; u.ny = m.y + this.r;            // für das Bild: Rütteln an dieser Stelle
      this.emit('nudge', m.x, m.y + this.r, u.nudges, u.rid);
    }
    stuckOut(u) {
      this.stats.stuck++;
      if (!this.final && this.outHere < this.needOut) { this.hatch(u); return; }
      // Quote schon erfüllt (oder Finale): Die Murmel zählt als durch, ganz hinten, damit die Bahn endet
      u.finished = true; u.finishT = Infinity; this.finishedCount++; u.place = 500 + this.finishedCount;
    }
    hatch(u) {
      if (u.out) return;
      u.out = true; u.hatchT = this.t; u.hx = u.pm.x; u.hy = u.pm.y + this.r; u.pm.collide = false; u.pm.vy = Math.max(u.pm.vy, 60);
      this.markOut(u, 'last');
      this.emit('knockout', u.pm.x, u.pm.y, 0, u.rid);
    }
    fell(u) {
      const m = u.pm;
      if (u.out || u.finished) { m.active = false; return; }
      m.active = false; u.fell = true;
      if (this.final || this.safe) {
        // Finale und sichere Bahn: Sturz zählt als letzter Platz (hinter allen, die noch ins Ziel kommen)
        u.finished = true; u.finishT = Infinity; this.finishedCount++; u.place = 1000 + ++this.dnfCount; u.dnf = true;
        this.emit('fall', m.x, this.H, 0, u.rid);
        return;
      }
      u.out = true; this.markOut(u, 'fell');
      this.emit('knockout', m.x, this.H, 1, u.rid);
      if (this.outHere >= this.needOut && !this.trapsClosed) this.closeTraps();
      if (this.outHere > this.needOut && this.format === 'long') this.safeNext = true;
    }
    markOut(u, how) {
      const M = this.roster[u.rid];
      M.alive = false; M.outStage = this.stageNo; M.how = how; this.outHere++;
      this.outList.push(u.rid);
      this.notes.push({ kind: 'out', rid: u.rid, t: this.t });
    }
    closeTraps() {
      this.trapsClosed = true;
      for (const el of this.stage.elements) if (el.closeTraps) el.closeTraps(this.world.t);
      if (this.stage.elements.some((el) => el.closeTraps)) { this.emit('traps', this.W / 2, this.H / 2, 0, -1); this.notes.push({ kind: 'traps', t: this.t }); }
    }
    timeUp() {
      const waiting = this.runners.filter((u) => !u.out && !u.finished).sort((a, b) => b.prog - a.prog);
      const need = Math.max(0, this.needOut - this.outHere);
      this.stats.timeUp++;
      waiting.slice(waiting.length - need).forEach((u) => this.hatch(u));
      waiting.slice(0, waiting.length - need).forEach((u, k) => { u.finished = true; this.finishedCount++; u.place = 500 + k; u.finishT = Infinity; });
      this.stageEnd = this.t;
    }
    ranking() {
      const list = this.runners.filter((u) => !u.out).sort((a, b) =>
        (a.finished !== b.finished ? (a.finished ? -1 : 1) : a.finished ? a.place - b.place : b.prog - a.prog) || a.rid - b.rid);
      list.forEach((u, i) => { u.rank = i + 1; });
      const lead = list.length ? list[0].rid : -1;
      if (lead !== this.leader && this.leader >= 0 && this.phase === 'race') this.leadChanges++;
      this.leader = lead; this.lastPlace = list.length > 1 && !this.final ? list[list.length - 1].rid : -1;
      this.order = list.map((u) => u.rid);
    }
    checkSlow(waiting) {
      if (!this.stage.path || this.cfg.slowmo === 'off') return;
      // Zielbereich 4 d, Abstand unter 0,35 s (mit 3 d und 0,15 s löste sie in zehn Rennen kein einziges Mal aus)
      const end = this.stage.path.length, D = RULES.slowZone * 2 * this.r;
      // Knapper Kampf um das Weiterkommen (letzte zwei) oder um den Sieg im Finale
      let pair = null;
      // (placeCount statt finishedCount: Ein Sturz im Finale zählt dort mit, soll den Kampf um Platz 1 aber nicht beenden)
      if (this.final && this.placeCount === 0) pair = waiting.slice().sort((a, b) => b.prog - a.prog).slice(0, 2);
      else if (!this.final && waiting.length === this.needOut - this.outHere + 1 && waiting.length >= 2) pair = waiting.slice().sort((a, b) => b.prog - a.prog).slice(-2);
      if (!pair || pair.length < 2) return;
      const [a, b] = pair, va = Math.sqrt(a.pm.vx ** 2 + a.pm.vy ** 2) + 1;
      // Im Finale großzügiger: Platz 1 und 2 liegen im Median 0,8 s auseinander
      const gap = this.final ? RULES.slowGapFinal : RULES.slowGap;
      if (end - a.prog < D && end - b.prog < D && (a.prog - b.prog) / va < gap) this.triggerSlow('close');
    }

    // ------------------------------------------------------------ Galerie
    initGallery() {
      const G = this.stages.gallery, ids = Object.keys(G);
      this.galleryIds = this.cfg.element === 'all' ? ids : [G[this.cfg.element] ? this.cfg.element : ids[0]];
      this.galleryIndex = -1; this.roster = []; this.phase = 'gallery'; this.phaseT = 0;
      this.nextGallery();
    }
    nextGallery() {
      this.galleryIndex = (this.galleryIndex + 1) % this.galleryIds.length;
      const id = this.galleryIds[this.galleryIndex], spec = this.stages.gallery[id], seed = EBS.util.hashSeed(this.seed, 'gallery', id, this.step);
      const world = this.newWorld(), b = this.builder(world, seed);
      const out = spec.build(b, this.ctxFor(RULES.gallery.marbles)) || {};
      this.world = world; this.stage = b.result(); this.spec = spec; this.galleryStart = this.t;
      this.spawn = out.spawn || [this.W / 2, -this.r * 2]; this.galleryCycle = out.cycle || (this.galleryIds.length > 1 ? 10 : 0);
      const names = LONG_FIELD.slice(0, RULES.gallery.marbles);
      if (!this.roster.length) this.roster = names.map((name, i) => ({ id: i, name, color: COLORS[name], alive: true }));
      this.runners = names.map((_, i) => {
        const pm = world.addMarble({ x: this.spawn[0], y: this.spawn[1] - i * 3 * this.r, r: this.r });
        pm.rid = i; pm.px = pm.x; pm.py = pm.y; pm.zone = -1; pm.wait = i * 0.5; pm.active = false; pm.loops = 0; pm.lastLoop = 0;
        return { rid: i, pm, finished: false, out: false };
      });
      this.emit('stage', this.W / 2, this.H / 2, this.galleryIndex, -1);
    }
    galleryStep(dt) {
      if (this.galleryCycle && this.t - this.galleryStart >= this.galleryCycle) this.nextGallery();
      this.physics(dt);
      const W = this.world, [sx, sy] = this.spawn;
      for (const m of W.marbles) {
        if (m.active && (m.y > this.H + 3 * this.r || m.x < -4 * this.r || m.x > this.W + 4 * this.r)) { m.active = false; m.wait = 0.4; m.loops++; m.lastLoop = W.t; }
        if (!m.active) {
          m.wait -= dt;
          const free = W.marbles.every((o) => !o.active || (o.x - sx) ** 2 + (o.y - sy) ** 2 > (2.2 * this.r) ** 2);
          if (m.wait <= 0 && free) {
            const x = sx + (((m.loops * 7 + m.rid * 3) % 5) - 2) * 0.24 * this.r;
            m.active = true; m.x = x; m.y = sy; m.vx = 0; m.vy = 0; m.w = 0; m.mask = 1; m.zone = -1; m.collide = true; m.px = x; m.py = sy; m.still = 0;
          }
        } else {
          // Liegt eine Murmel 3 s still, bekommt sie einen kleinen Stoß (wie im Rennen)
          m.still = m.vx * m.vx + m.vy * m.vy < 25 ? (m.still || 0) + dt : 0;
          if (m.still > 3) { m.still = 0; m.vy -= 260; m.vx += m.rid % 2 ? 120 : -120; this.emit('nudge', m.x, m.y + this.r, 1, m.rid); }
        }
      }
      this.order = this.runners.map((u) => u.rid);
    }

    // ------------------------------------------------------------ Ereignisse, Prüfung, Hash
    emit(type, x, y, p, c) {
      this.events[this.eventSeq % this.events.length] = { seq: this.eventSeq, step: this.step, t: this.t, type, x, y, p, c };
      this.eventSeq++;
    }
    checkInvariants() {
      const errors = [];
      if (this.mode !== 'gallery') {
        const alive = this.roster.filter((m) => m.alive).length, out = this.roster.length - alive;
        if (out !== this.outList.length) errors.push(`Aus-Liste ${this.outList.length} ≠ ${out}`);
      }
      for (const m of this.world.marbles) {
        if (!m.active) continue;
        if (![m.x, m.y, m.vx, m.vy].every(Number.isFinite)) errors.push(`Murmel ${m.rid}: ungültige Zahl`);
        if (m.collide && this.world.clearance(m) < -this.r * 0.5 && !this.world.lifted(m)) errors.push(`Murmel ${m.rid} steckt in der Bahn`);
      }
      return { ok: errors.length === 0, errors };
    }
    stateNumbers() {
      const out = [this.step, this.stageNo, this.world.t, this.slow.count, this.outHere || 0, this.finishedCount || 0];
      for (const m of this.world.marbles) out.push(m.x, m.y, m.vx, m.vy, m.a, m.w, m.mask, m.active ? 1 : 0, m.collide ? 1 : 0);
      for (const el of this.stage.elements) if (el.state) out.push(...el.state());
      return out;
    }
    stateHash() { return P.hashNumbers(this.stateNumbers()); }
    snapshot() {
      const rt = this.world ? this.world.t : 0;
      if (this.mode === 'gallery') return { t: this.t, mode: 'gallery', element: this.galleryIds[this.galleryIndex], summary: `Galerie · ${this.spec.label}` };
      const alive = this.roster.filter((m) => m.alive).length;
      return {
        t: this.t, step: this.step, phase: this.phase, stage: this.stageNo, stages: this.list.length, title: this.spec.title,
        alive, rt, out: this.outList.map((i) => this.roster[i].name), order: (this.order || []).map((i) => this.roster[i].name),
        ended: this.phase === 'end',
        summary: `Bahn ${this.stageNo + 1}/${this.list.length} · ${this.spec.title} · ${alive} im Rennen`,
      };
    }
    destroy() {}
  }

  const titleCase = (s) => s.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, a, b) => a + b.toUpperCase());

  /** Anteil 0..1 entlang p→q, an dem die Strecke a–b gekreuzt wird (in Richtung links→rechts der Linie), sonst −1. */
  function crossing(px, py, qx, qy, ax, ay, bx, by) {
    const ex = bx - ax, ey = by - ay;
    const s0 = ex * (py - ay) - ey * (px - ax), s1 = ex * (qy - ay) - ey * (qx - ax);
    if (!(s0 < 0 && s1 >= 0)) return -1;
    const f = s0 / (s0 - s1), x = px + (qx - px) * f, y = py + (qy - py) * f;
    const along = ((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey);
    return along >= -0.05 && along <= 1.05 ? f : -1;
  }

  EBS.KnockoutSim = { KnockoutSimulation, COLORS, LONG_FIELD, SHORT_FIELD, RULES, crossing };
})(typeof window !== 'undefined' ? window : globalThis);
