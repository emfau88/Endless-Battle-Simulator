/* Marble Knockout · Ablauf Gesamtlevel (R43 Teil 2, Paket G1)
 *
 * Ein Lauf durch ein großes Level in einer einzigen Physikwelt: THE TOWER im Hochformat, THE GAUNTLET im Querformat.
 * Jeder Abschnitt endet in einer Schleuse mit Quote (level.js): Wer durch die Lichtschranke ins Becken fällt, ist
 * weiter; ist das Becken voll, schließt der Deckel, und alle übrigen sind raus. Nach der Freigabe fällt das Feld in den
 * nächsten Abschnitt. Der bisherige Ablauf „Bahn für Bahn“ (simulation.js) bleibt unberührt.
 *
 * Die Kamera ist Simulationszustand (camera.js) und folgt dem Rennstand: in der ersten Hälfte eines Abschnitts der
 * Spitzengruppe mit Vorschau, in der zweiten Hälfte dem Kampf an der Schnittlinie samt Becken, beim Schließen hält sie
 * auf der Schleuse. Querformat wahlweise „Abschnitte“: feste Einstellung je Abschnitt, Gleiten bei der Freigabe.
 * Ereignisse tragen ihre Lage im Bild (für das Stereo-Panorama), die Welt-Lage steht in wx, wy.
 */
(function (global) {
  'use strict';
  const EBS = global.EBS;
  const P = EBS.KnockoutPhysics, E = EBS.KnockoutElements, KS = EBS.KnockoutSim, LV = EBS.KnockoutLevel, CAM = EBS.KnockoutCamera;
  const { LEVELS, COLORS, BANDS } = EBS.KnockoutLevels;
  const BASE = KS.KnockoutSimulation.prototype, RULES = KS.RULES, crossing = KS.crossing;
  const PHYS = { gravity: 1600, maxSpeed: 1500 };

  class KnockoutLevelSimulation {
    constructor({ seed, params, world }) {
      this.seed = seed >>> 0; this.cfg = params; this.view = world;
      this.W = world.w; this.H = world.h; this.portrait = world.h > world.w;
      this.format = this.portrait ? 'short' : 'long';
      const spec = this.portrait ? LEVELS.tower : LEVELS.gauntlet;
      this.level = spec; this.R = spec.rules; this.r = spec.r; this.T = spec.T;
      this.dt = EBS.DT; this.step = 0; this.t = 0;
      this.events = new Array(512); this.eventSeq = 0;
      this.mode = 'level';
      this.slow = { on: false, from: 0, until: 0, count: 0, rate: 1, finalDone: false };
      this.notes = []; this.outList = []; this.chapterLog = []; this.hook = spec.hook || '';
      this.stats = { nearMiss: 0, slowmo: 0, stuck: 0, timeUp: 0 };
      this.camStats = { frames: 0, leaderIn: 0, outs: 0, outsIn: 0 };
      this.cuts = [];                                            // je Schleuse: Abstand Letzte drinnen ↔ Erste draußen
      // Feld und Aufstellung
      this.roster = spec.field.map((name, i) => ({ id: i, name, color: COLORS[name], band: BANDS.includes(name), alive: true, outStage: -1, how: '', place: 0 }));
      const rng = new EBS.RNG(EBS.util.hashSeed(this.seed, 'lineup')), order = this.roster.map((m) => m.id);
      for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      this.lineup = order;
      // Welt: alle Abschnitte in einem Physik-Kern
      const bo = spec.bounds, d = 2 * this.r, wld = new P.World(PHYS);
      const b = new E.Builder(wld, { r: this.r, T: this.T, W: bo.x1, H: bo.y1, rng: new EBS.RNG(EBS.util.hashSeed(this.seed, 'level', spec.id)) });
      // Drehbuch: ein Seed je Abschnitt (params.script); ohne Eintrag gilt der Grund-Seed
      const script = Array.isArray(params.script) ? params.script : null;
      this.script = script;
      const rngFor = (i) => new EBS.RNG(EBS.util.hashSeed(this.seed, 'section', spec.id, i, script && script[i] !== undefined ? script[i] : ''));
      this.lv = LV.build(spec, b, { W: bo.x1, H: bo.y1, r: this.r, d, T: this.T, n: this.roster.length, short: this.format === 'short', rngFor });
      this.world = wld; this.stage = b.result(); this.sections = this.lv.sections; this.bounds = bo;
      this.killPits = this.stage.pits.filter((p) => p.kill);
      const jr = new EBS.RNG(EBS.util.hashSeed(this.seed, 'jitter'));
      this.runners = order.map((rid, k) => {
        const [sx, sy] = this.stage.start.slots[k];
        const pm = wld.addMarble({ x: sx + (jr.next() * 2 - 1), y: sy, r: this.r });
        pm.rid = rid; pm.px = pm.x; pm.py = pm.y; pm.zone = -1;
        return { rid, pm, seg: 0, prog: 0, best: 0, idle: 0, finished: false, finishT: 0, place: 0, rank: 0, hatchT: -1, out: false, late: false, fell: false, nudges: 0, nudgeT: -1, nx: 0, ny: 0 };
      });
      this.runners.forEach((u) => { this.progress(u); u.best = u.prog; });
      this.leader = -1; this.leadChanges = 0; this.order = []; this.cut = Infinity; this.endAt = -1; this.noteLeader = -2; this.leaderSince = 0;
      this.cam = null; this.phase = 'ready'; this.phaseT = 0; this.raceStart = 0;
      this.enterSection(0);
      // Kamera: steht zu Beginn schon richtig (kein Anfahren im ersten Bild)
      const mode = this.format === 'long' && params.cam === 'sections' ? 'sections' : 'ride';
      // „Abschnitte“ zeigt einen ganzen Abschnitt auf einmal und darf dafür weiter herauszoomen (bis 0,62)
      const co = mode === 'sections' ? { ...CAM.PRESETS.long, zmin: 0.62 } : CAM.PRESETS[this.format];
      this.cam = CAM.create({ W: this.W, H: this.H, bounds: bo, o: co, x: bo.x0, y: bo.y0, z: 1 });
      this.cam.mode = mode;
      const f = this.focus();
      this.cam.z = Math.max(this.cam.o.zmin, Math.min(this.cam.o.zmax, f.z)); this.cam.x = f.x; this.cam.y = f.y;
      CAM.fit(this.cam); this.cam.gx = this.cam.x; this.cam.gy = this.cam.y;
      this.ranking();
    }

    // ------------------------------------------------------------ Abschnitte
    enterSection(i) {
      const sec = this.sections[i];
      this.secNo = i; this.stageNo = i; this.sec = sec; this.spec = sec;
      const n = this.runners.filter((u) => !u.out).length;
      this.nIn = n; this.keep = sec.placeholder ? n : Math.min(sec.keep, n); this.needOut = n - this.keep;
      this.outHere = 0; this.placeCount = 0; this.closeT = -1; this.releaseT = -1;
      this.secT = this.t; this.secRt = this.world.t; this.final = false;
      this.sampleNo = -1; for (const u of this.runners) u.hist = [];  // Ränge der letzten 2 s (für `+n PLACES!`)
      this.trapsClosed = this.needOut === 0;
      if (this.trapsClosed) this.closeTrapsOf(sec);
      if (sec.placeholder) this.endAt = this.t + this.R.endHold;
      else this.chapterLog.push({ t: this.t, title: `Stage ${i + 1}: ${titleCase(sec.title)}` });
      this.emit('stage', this.camX(), this.camY(), i, -1);
    }
    closeTrapsOf(sec) {
      const els = this.stage.elements.slice(sec.els[0], sec.els[1]);
      for (const el of els) if (el.closeTraps) el.closeTraps(this.world.t);
      return els.some((el) => el.closeTraps);
    }

    // ------------------------------------------------------------ Schritt
    stepOnce() {
      const dt = this.dt;
      switch (this.phase) {
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
        default: break;
      }
      this.camera(dt);
      this.t += dt; this.step++; this.phaseT += dt;
    }
    setPhase(p) { this.phase = p; this.phaseT = 0; }

    raceLogic(h) {
      const sec = this.sec, sch = sec.sch, rt = this.world.t, R = this.r;
      for (const u of this.runners) {
        const m = u.pm;
        if (!m.active) continue;
        if (u.out) {
          // Ausgeschiedene: verschwinden in der Grube OUT, am Rand der Welt oder unter ihrer Klappe
          if (u.hatchT >= 0 ? m.y > u.hy + 3 * R : this.inKill(m) || this.outside(m)) m.active = false;
          continue;
        }
        // Ankunft: Kreuzung der Lichtschranke im Becken
        if (!u.finished && sch && m.collide) {
          const s = sch.sense, f = crossing(m.px, m.py, m.x, m.y, s.ax, s.ay, s.bx, s.by);
          if (f >= 0) {
            if (this.closeT >= 0) { this.hatch(u, 'late'); continue; }   // erst nach dem Schließen hineingefallen (selten)
            u.finished = true; u.finishT = rt - h + f * h; u.place = ++this.placeCount;
            this.emit('finish', m.x, m.y, u.place, Math.min(11, u.place - 1));
          }
        }
        if (!u.finished) {
          this.progress(u);
          const v2 = m.vx * m.vx + m.vy * m.vy;
          if (u.prog > u.best + RULES.stuckMin) { u.best = u.prog; u.idle = 0; }
          else if (m.collide && m.zone < 0 && v2 < RULES.stillSpeed * RULES.stillSpeed) u.idle += h;
          if (m.collide && u.idle > RULES.stuckWindow * (u.nudges + 1) && u.nudges < 3) { u.nudges++; this.nudge(u); }
          if (m.collide && u.idle > RULES.stuckOut) { this.stats.stuck++; this.hatch(u, 'stuck'); continue; }
        }
        if (this.inKill(m) || this.outside(m)) this.fell(u);
      }
      this.ranking();
      this.headlines();
      if (sch && this.closeT < 0) {
        if (this.placeCount >= this.cut) this.close();
        else if (rt - this.secRt > RULES.stageLimit) { this.stats.timeUp++; this.close(); }
        else this.checkSlow();
      }
      if (sch && this.closeT >= 0 && this.releaseT < 0 && this.t >= this.closeT + this.R.release) this.release();
      // Nachzügler, die lange nach dem Schließen noch unterwegs sind, verschwinden durch eine Klappe
      if (this.closeT >= 0) for (const u of this.runners) if (u.late && u.hatchT < 0 && u.pm.active && this.t > this.closeT + this.R.lateMax) this.hatch(u, 'late');
      if (this.endAt >= 0 && this.t >= this.endAt) this.setPhase('end');
    }
    inKill(m) {
      if (!m.collide) return false;
      for (const p of this.killPits) if (m.x > p.x0 && m.x < p.x1 && m.y > p.y0 + p.depth && m.y < p.y1) return true;
      return false;
    }
    outside(m) { const b = this.bounds, R = this.r; return m.y > b.y1 + 3 * R || m.x < b.x0 - 4 * R || m.x > b.x1 + 4 * R; }

    /** Becken voll (oder Zeit um): Deckel zu, alle Übrigen sind raus und rollen über den Deckel ins Aus. */
    close() {
      const sch = this.sec.sch;
      this.closeT = this.t; sch.close(this.world.t);
      this.emit('gate', sch.fx, sch.mouthY, 0, -1);
      const late = this.runners.filter((u) => !u.out && !u.finished).sort((a, b) => b.prog - a.prog);
      const lastIn = this.runners.filter((u) => u.finished && !u.out).sort((a, b) => b.place - a.place)[0];
      // Schnittkampf: wie weit lag die Erste draußen hinter der Letzten drinnen (in Murmeln Ideallinie)?
      if (lastIn && late.length) this.cuts.push({ sec: this.secNo, gap: (this.sec.p1 - late[0].prog) / (2 * this.r), t: this.t });
      for (const u of late) { u.out = true; u.late = true; this.markOut(u, 'late'); }
      if (late.length) this.emit('knockout', late[0].pm.x, late[0].pm.y, 0, late[0].rid);
      this.ranking();
    }
    /** Freigabe: Boden auf, das Feld fällt in den nächsten Abschnitt. */
    release() {
      const sch = this.sec.sch;
      this.releaseT = this.t; sch.release(this.world.t);
      this.emit('gate', sch.cx, sch.floorY, 1, -1);
      for (const u of this.runners) if (!u.out) { u.finished = false; u.place = 0; u.idle = 0; u.best = u.prog; }
      if (this.secNo + 1 < this.sections.length) this.enterSection(this.secNo + 1);
      this.ranking();
    }
    fell(u) {
      const m = u.pm;
      m.active = false;
      if (u.out) return;
      u.fell = true; u.out = true; this.markOut(u, 'fell');
      this.emit('knockout', m.x, m.y, 1, u.rid);
      if (this.outHere >= this.needOut && !this.trapsClosed) {
        this.trapsClosed = true;
        if (this.closeTrapsOf(this.sec)) { this.emit('traps', this.camX(), this.camY(), 0, -1); this.notes.push({ kind: 'traps', t: this.t }); }
      }
    }
    hatch(u, how) {
      const m = u.pm;
      if (u.hatchT >= 0) return;
      if (!u.out) { u.out = true; this.markOut(u, how); this.emit('knockout', m.x, m.y, 0, u.rid); }
      u.hatchT = this.t; u.hx = m.x; u.hy = m.y + this.r; m.collide = false; m.vy = Math.max(m.vy, 60);
    }
    markOut(u, how) {
      BASE.markOut.call(this, u, how);
      // Kamera-Kennzahl: Ist das Aus im Bild?
      if (this.cam) {
        const v = CAM.view(this.cam), m = u.pm;
        this.camStats.outs++;
        if (m.x > v.x0 && m.x < v.x1 && m.y > v.y0 && m.y < v.y1) this.camStats.outsIn++;
      }
    }
    ranking() {
      const list = this.runners.filter((u) => !u.out).sort((a, b) =>
        (a.finished !== b.finished ? (a.finished ? -1 : 1) : a.finished ? a.place - b.place : b.prog - a.prog) || a.rid - b.rid);
      list.forEach((u, i) => { u.rank = i + 1; });
      const lead = list.length ? list[0].rid : -1;
      if (lead !== this.leader && this.leader >= 0 && this.phase === 'race') this.leadChanges++;
      if (lead !== this.leader) this.leaderSince = this.t;
      this.leader = lead; this.order = list.map((u) => u.rid);
      this.cut = this.sec.sch && this.closeT < 0 ? Math.min(this.keep, this.nIn - this.outHere) : Infinity;
      this.lastPlace = list.length > 1 ? list[list.length - 1].rid : -1;
    }
    /** Kurze Einblendungen (Plan 1.2, Regel 10): `NEW LEADER: BLUE` oder `+6 PLACES!`, höchstens eine je 4 s, nur
     *  solange die Schleuse offen ist. Ränge werden alle 0,5 s verglichen (Sprung = Gewinn über die letzten 2 s). */
    headlines() {
      if (this.phase !== 'race' || this.closeT >= 0 || this.sec.placeholder) return;
      const no = Math.floor((this.t - this.secT) / 0.5);
      if (no === this.sampleNo) return;
      this.sampleNo = no;
      const live = this.runners.filter((u) => !u.out);
      let jump = null;
      for (const u of live) {
        u.hist.push(u.rank); if (u.hist.length > 5) u.hist.shift();
        const gain = u.hist.length === 5 ? u.hist[0] - u.rank : 0;
        if (!u.finished && gain >= (this.format === 'short' ? 4 : 5) && (!jump || gain > jump.gain)) jump = { rid: u.rid, gain };
      }
      const last = this.notes.reduce((m, x) => (x.kind === 'leader' || x.kind === 'jump' ? Math.max(m, x.t) : m), -99);
      if (this.t - last < 4 || this.t - this.secT < 1.5) return;
      if (this.leader >= 0 && this.leader !== this.noteLeader && this.t - this.leaderSince >= 1) {
        if (this.noteLeader !== -2) this.notes.push({ kind: 'leader', t: this.t, rid: this.leader });
        this.noteLeader = this.leader;
      } else if (jump) this.notes.push({ kind: 'jump', t: this.t, rid: jump.rid, n: jump.gain });
    }

    /** Zeitlupe, wenn um den letzten freien Platz zwei Murmeln knapp vor dem Becken liegen. */
    checkSlow() {
      if (this.cfg.slowmo === 'off') return;
      const free = this.cut - this.placeCount;
      if (free < 1) return;
      const waiting = this.runners.filter((u) => !u.out && !u.finished).sort((a, b) => b.prog - a.prog);
      if (waiting.length <= free) return;
      const a = waiting[free - 1], b = waiting[free], end = this.sec.p1, D = RULES.slowZone * 2 * this.r;
      const va = Math.sqrt(a.pm.vx * a.pm.vx + a.pm.vy * a.pm.vy) + 1;
      if (end - a.prog < D && end - b.prog < D && (a.prog - b.prog) / va < RULES.slowGap) this.triggerSlow('cut');
    }

    // ------------------------------------------------------------ Kamera
    camX() { return this.cam ? this.cam.x : this.bounds.x1 / 2; }
    camY() { return this.cam ? this.cam.y : this.H / 2; }
    /** Brennpunkt { x, y, z, hold, lag } aus dem Rennstand (Plan Abschnitt 4). */
    focus() {
      const sec = this.sec, sch = sec.sch, path = this.lv.path, cam = this.cam;
      const zfit = (w, h) => CAM.zoomFor(cam || { W: this.W, H: this.H }, w, h, 1.05);
      if (cam && cam.mode === 'sections') {
        const fr = sec.frame || sch.box;
        return { x: (fr.x0 + fr.x1) / 2, y: (fr.y0 + fr.y1) / 2, z: zfit(fr.x1 - fr.x0, fr.y1 - fr.y0), hold: true, lag: 0.75 };
      }
      const span = this.format === 'long' ? this.W : this.H, look = this.R.look * span;
      if (this.phase === 'ready' || this.phase === 'race' && this.world.t - this.raceStart < 0.8) {
        // Start: Regal und Anfang der Strecke
        // (Querformat: das Regal steht ein Viertel unter dem oberen Rand, frei von der Anzeige oben)
        const s = this.stage.start, [px] = LV.pointAt(path, look);
        return { x: (s.x + px) / 2, y: s.y + 0.25 * this.H, z: 1, hold: false };
      }
      if (sch && this.closeT >= 0 && this.releaseT < 0) {
        const bx = sch.box;
        return { x: (bx.x0 + bx.x1) / 2, y: (bx.y0 + bx.y1) / 2, z: Math.min(1, zfit(bx.x1 - bx.x0, bx.y1 - bx.y0)), hold: true };
      }
      const live = this.runners.filter((u) => !u.out && !u.finished && u.pm.active).sort((a, b) => b.prog - a.prog);
      if (!live.length) {
        if (sch) return { x: sch.cx, y: sch.cy, z: 1, hold: false };
        const [ex, ey] = LV.pointAt(path, sec.p1);
        return { x: ex, y: ey, z: 1, hold: false };
      }
      const top = live.slice(0, 3), lp = top.reduce((s, u) => s + u.prog, 0) / top.length;
      if (!sch || lp < (sec.p0 + sec.p1) / 2) {
        const [x, y] = LV.pointAt(path, Math.min(lp + look, sec.p1));
        return { x, y, z: 1, hold: false };
      }
      // Zweite Hälfte: Kampf um den letzten freien Platz, Becken und Schnittlinie zugleich im Bild
      const free = Math.max(1, this.cut - this.placeCount), pair = live.slice(Math.max(0, free - 1), free + 1);
      const cp = pair.reduce((s, u) => s + u.prog, 0) / pair.length, [qx, qy] = LV.pointAt(path, cp);
      const bx = sch.box, x0 = Math.min(qx, bx.x0), x1 = Math.max(qx, bx.x1), y0 = Math.min(qy, bx.y0), y1 = Math.max(qy, bx.y1);
      return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: Math.min(1, zfit(x1 - x0, y1 - y0)), hold: false };
    }
    camera(dt) {
      const f = this.focus(), cam = this.cam;
      CAM.update(cam, f.x, f.y, f.z, dt, f.hold, f.lag);
      if (this.phase === 'race') {
        this.camStats.frames++;
        const u = this.runners.find((q) => q.rid === this.leader), v = CAM.view(cam);
        if (u && u.pm.active && u.pm.x > v.x0 && u.pm.x < v.x1 && u.pm.y > v.y0 && u.pm.y < v.y1) this.camStats.leaderIn++;
      }
    }

    // ------------------------------------------------------------ Ereignisse, Prüfung, Hash
    /** Ereignis in Welt-Koordinaten; gespeichert wird die Lage im Bild (x, y) und in der Welt (wx, wy). */
    emit(type, x, y, p, c) {
      const cam = this.cam, sx = cam ? (x - cam.x) * cam.z + this.W / 2 : x, sy = cam ? (y - cam.y) * cam.z + this.H / 2 : y;
      this.events[this.eventSeq % this.events.length] = { seq: this.eventSeq, step: this.step, t: this.t, type, x: sx, y: sy, p, c, wx: x, wy: y };
      this.eventSeq++;
    }
    stateNumbers() {
      const out = [this.step, this.secNo, this.world.t, this.slow.count, this.outHere, this.placeCount, this.closeT, this.releaseT];
      for (const m of this.world.marbles) out.push(m.x, m.y, m.vx, m.vy, m.a, m.w, m.mask, m.active ? 1 : 0, m.collide ? 1 : 0);
      for (const el of this.stage.elements) if (el.state) out.push(...el.state());
      out.push(...CAM.state(this.cam));
      return out;
    }
    stateHash() { return P.hashNumbers(this.stateNumbers()); }

    /** Zustand sichern (Plan, Abschnitt 6): Murmeln, Rennstand, Kamera, Zustand der Bausteine und der bewegten
     *  Körper. Zum Laden in eine neue Simulation mit demselben Grund-Seed; die Abschnitte ab dem aktuellen dürfen
     *  dort andere Drehbuch-Seeds haben (gesichert werden nur Zustandswerte, nie Bauwerte wie der Takt-Versatz). */
    saveState() {
      const json = (v) => JSON.parse(JSON.stringify(v));
      return {
        sim: prim(this), slow: { ...this.slow }, stats: { ...this.stats }, camStats: { ...this.camStats },
        notes: json(this.notes), outList: this.outList.slice(), chapterLog: json(this.chapterLog), cuts: json(this.cuts),
        order: this.order.slice(), roster: this.roster.map((m) => ({ ...m })),
        runners: this.runners.map((u) => ({ ...prim(u), hist: u.hist.slice() })),
        marbles: this.world.marbles.map((m) => prim(m)), worldT: this.world.t,
        bodies: this.world.bodies.map((b) => [b.enabled, b.x, b.y, b.a, b.vx, b.vy, b.w, b.c, b.s, b.shapes.map((s) => [s.wax, s.way, s.wbx, s.wby, s.ux, s.uy, s.speed])]),
        elements: this.stage.elements.map((el) => stateOf(el)),
        cam: prim(this.cam), events: this.events.map((e) => (e ? { ...e } : e)),
      };
    }
    loadState(s) {
      Object.assign(this, s.sim);
      this.slow = { ...s.slow }; this.stats = { ...s.stats }; this.camStats = { ...s.camStats };
      this.notes = JSON.parse(JSON.stringify(s.notes)); this.outList = s.outList.slice(); this.chapterLog = JSON.parse(JSON.stringify(s.chapterLog));
      this.cuts = JSON.parse(JSON.stringify(s.cuts)); this.order = s.order.slice(); this.roster = s.roster.map((m) => ({ ...m }));
      this.runners.forEach((u, i) => { Object.assign(u, s.runners[i]); u.hist = s.runners[i].hist.slice(); });
      this.world.marbles.forEach((m, i) => Object.assign(m, s.marbles[i]));
      this.world.t = s.worldT;
      this.world.bodies.forEach((b, i) => {
        const q = s.bodies[i];
        [b.enabled, b.x, b.y, b.a, b.vx, b.vy, b.w, b.c, b.s] = q;
        b.shapes.forEach((sh, k) => { [sh.wax, sh.way, sh.wbx, sh.wby, sh.ux, sh.uy, sh.speed] = q[9][k]; });
      });
      this.stage.elements.forEach((el, i) => Object.assign(el, s.elements[i]));
      Object.assign(this.cam, s.cam);
      this.events = s.events.map((e) => (e ? { ...e } : e));
      this.sec = this.spec = this.sections[this.secNo];
    }
    snapshot() {
      const alive = this.roster.filter((m) => m.alive).length;
      return {
        t: this.t, step: this.step, phase: this.phase, stage: this.secNo, stages: this.level.stages || this.sections.length, title: this.sec.title,
        alive, rt: this.world.t, out: this.outList.map((i) => this.roster[i].name), order: this.order.map((i) => this.roster[i].name),
        ended: this.phase === 'end', level: this.level.id,
        summary: `Gesamtlevel ${this.level.title} (in Arbeit) · Abschnitt ${this.secNo + 1} · ${this.sec.title} · ${alive} im Rennen`,
      };
    }
    destroy() {}
  }
  // Aus dem bisherigen Ablauf übernommen (rechnen mit this.stage.path, this.world, this.slow, this.roster)
  for (const k of ['physics', 'sounds', 'slowRate', 'slowAt', 'triggerSlow', 'progress', 'nudge', 'checkInvariants']) KnockoutLevelSimulation.prototype[k] = BASE[k];

  const titleCase = (s) => s.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, a, b) => a + b.toUpperCase());
  /** Alle einfachen Werte eines Objekts (Zahlen, Wahrheitswerte, Texte). */
  const prim = (o) => {
    const r = {};
    for (const k of Object.keys(o)) { const v = o[k], t = typeof v; if (v === null || t === 'number' || t === 'boolean' || t === 'string') r[k] = v; }
    return r;
  };
  /** Zustandswerte je Baustein-Art. Bauwerte (Lage, Takt, Versatz) bleiben aus der neuen Welt. Eine neue Art mit
   *  Zustand muss hier eingetragen werden, sonst bricht das Sichern ab. */
  const STATE_KEYS = {
    gate: ['s0', 's1', 'at'], lid: ['closedAt'], flipflop: ['side', 'from', 'at', 'cool'], hammer: ['closedAt', 'park'],
    conveyor: ['pos', 'speed'], trapdoors: ['closedAt'], bridge: ['startT', 'closedAt', 'passed', 'npassed'],
    schleuse: ['closedAt', 'openAt'],
  };
  const stateOf = (el) => {
    const keys = STATE_KEYS[el.type];
    if (!keys) { if (el.state || el.update) throw new Error(`Sichern: Baustein „${el.type}“ hat Zustand, aber keine Liste`); return {}; }
    const r = {}; for (const k of keys) r[k] = el[k]; return r;
  };

  EBS.KnockoutLevelSim = { KnockoutLevelSimulation };
})(typeof window !== 'undefined' ? window : globalThis);
