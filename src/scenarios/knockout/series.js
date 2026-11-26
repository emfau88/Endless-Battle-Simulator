/* Marble Knockout · Zwei Rennen mit Gesamtwertung (R43 Teil 2, Paket G9)
 *
 * Langvideo aus zwei Läufen durch THE GAUNTLET mit denselben 20 Murmeln: Rennen 1 (Grund-Seed und Drehbuch), danach
 * die Tabelle STANDINGS AFTER RACE 1, Rennen 2 mit eigener Aufstellung (seed2, script2), dann FINAL STANDINGS und das
 * Podest des Gesamtsiegers. Punkte wie in der Formel 1 für die ersten zehn (25, 18, 15, 12, 10, 8, 6, 4, 2, 1). Bei
 * Gleichstand zählt der bessere Platz im zweiten Rennen.
 *
 * Jedes Rennen ist ein unveränderter Ablauf aus levelsim.js; diese Hülle reicht nur weiter und zählt. Rennen 2 rechnet
 * mit Einstiegsflug (wie beim Casting): Der Flug läuft hinter der Tabelle, darum stimmt der Lauf mit dem gecasteten
 * überein. Ereignisse, Kapitel und Zeiten werden auf die Zeit des ganzen Videos umgerechnet.
 * Platzierung im Rennen: erst die im Ziel (Zielreihenfolge), dann wer noch fährt (weiteste vorn), dann die
 * Ausgeschiedenen vom letzten Abschnitt zum ersten; im selben Abschnitt zuerst die beim Schließen Draußengebliebenen
 * (weiteste vorn), danach Gestürzte und Hängengebliebene (später raus ist besser).
 */
(function (global) {
  'use strict';
  const EBS = global.EBS;
  const P = EBS.KnockoutPhysics;
  const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
  // Sekunden: Tabelle nach Rennen 1 vor dem Wechsel (danach läuft der Flug von Rennen 2 hinter ihr), Schlusstabelle,
  // Podest des Gesamtsiegers
  const HOLD1 = 4, TABLE2 = 9, CHAMP = 8;
  // Schlusstabelle: Zeilen erscheinen von Platz 10 bis Platz 1 (Beginn, Abstand)
  const REVEAL0 = 0.8, REVEAL_GAP = 0.38;
  const PHASES = ['race1', 'table1', 'race2', 'table2', 'champion', 'end'];

  /** Platzierung eines Rennens: Murmel-Nummern (rid) von Platz 1 bis zuletzt. */
  function classify(sim) {
    const fin = sim.runners.filter((u) => u.finished && !u.out).sort((a, b) => a.place - b.place).map((u) => u.rid);
    const live = sim.runners.filter((u) => !u.finished && !u.out).sort((a, b) => b.prog - a.prog || a.rid - b.rid).map((u) => u.rid);
    const idx = new Map(sim.outList.map((rid, i) => [rid, i]));
    const outs = sim.outList.slice().sort((a, b) => {
      const A = sim.roster[a], B = sim.roster[b];
      if (A.outStage !== B.outStage) return B.outStage - A.outStage;
      const la = A.how === 'late', lb = B.how === 'late';
      if (la !== lb) return la ? -1 : 1;
      return la ? idx.get(a) - idx.get(b) : idx.get(b) - idx.get(a);
    });
    return [...fin, ...live, ...outs];
  }

  class KnockoutSeriesSimulation {
    /** make(seed, params): ein Rennen (Standard: KnockoutLevelSimulation in derselben Welt). */
    constructor({ seed, params, world, make }) {
      this.seed = seed >>> 0; this.cfg = params; this.view = world;
      this.make = make || ((s, p) => new EBS.KnockoutLevelSim.KnockoutLevelSimulation({ seed: s, params: p, world }));
      this.series = true; this.mode = 'level'; this.points = POINTS;
      const seed2 = Number.isInteger(params.seed2) ? params.seed2 >>> 0 : (this.seed + 1) >>> 0;
      this.plan = [{ seed: this.seed, script: params.script }, { seed: seed2, script: params.script2 }];
      this.events = new Array(512); this.eventSeq = 0;
      this.step = 0; this.t = 0; this.phase = 'race1'; this.phaseT = 0;
      this.runs = []; this.offs = []; this.seen = 0; this.results = []; this.tables = []; this.marks = [];
      this.revealed = 0;
      this.begin(0);
    }
    // Weitergereicht an das laufende Rennen (Renderer, Anzeige, Ton)
    get cur() { return this.runs[this.runs.length - 1]; }
    get raceNo() { return this.runs.length - 1; }
    get W() { return this.cur.W; }
    get H() { return this.cur.H; }
    get r() { return this.cur.r; }
    get dt() { return this.cur.dt; }
    get roster() { return this.cur.roster; }
    get format() { return this.cur.format; }

    /** Rennen i beginnen. Ereignisse ab hier zählen ab dem aktuellen Schritt. */
    begin(i) {
      const plan = this.plan[i], p = { ...this.cfg, script: plan.script };
      delete p.series; delete p.seed2; delete p.script2;
      if (!p.script) delete p.script;
      if (i > 0) p.intro = 'on';                                    // Flug hinter der Tabelle, wie beim Casting
      const sim = this.make(plan.seed, p);
      this.runs.push(sim); this.offs.push({ step: this.step, t: this.t }); this.seen = 0;
      sim.labels = this.labelsFor(i);
      this.pull();
    }
    /** Einblendungen des Rennens (nur Darstellung; englisch wie alle Texte im Video). */
    labelsFor(i) {
      const n = this.cur.roster.length;
      if (i === 0) {
        return { tag: 'RACE 1 · ', win: ' RACE 1', podium: 'RACE 1 · PODIUM',
          intro: [`${n} MARBLES. TWO RACES.`, 'POINTS DECIDE THE CHAMPION.'], ready: ['THE GAUNTLET', 'RACE 1 OF 2 · 10 STAGES'] };
      }
      const top = this.tables[0][0], name = this.runs[0].roster[top.rid].name;
      return { tag: 'RACE 2 · ', win: ' RACE 2', podium: 'RACE 2 · PODIUM', ready: ['RACE 2 OF 2', `${name} LEADS WITH ${top.total} POINTS`] };
    }
    /** Neue Ereignisse des laufenden Rennens in den eigenen Ring (Schritt und Zeit des ganzen Videos). */
    pull() {
      const sim = this.cur, off = this.offs[this.offs.length - 1];
      for (; this.seen < sim.eventSeq; this.seen++) {
        const e = sim.events[this.seen % sim.events.length];
        this.put({ ...e, step: e.step + off.step, t: e.t + off.t });
      }
    }
    put(e) { e.seq = this.eventSeq; this.events[this.eventSeq % this.events.length] = e; this.eventSeq++; }
    emit(type, x, y, p, c) { this.put({ step: this.step, t: this.t, type, x, y, p, c }); }

    stepOnce() {
      const sim = this.cur, dt = sim.dt;
      sim.stepOnce(); this.pull();
      this.t += dt; this.step++; this.phaseT += dt;
      switch (this.phase) {
        case 'race1':
          if (sim.phase === 'end') this.finishRace(0, 'table1', 'Standings After Race 1');
          break;
        case 'table1':
          if (this.runs.length === 1 && this.phaseT >= HOLD1) this.begin(1);
          else if (this.runs.length === 2 && sim.phase !== 'intro') this.setPhase('race2');
          break;
        case 'race2':
          if (sim.phase === 'end') this.finishRace(1, 'table2', 'Final Standings');
          break;
        case 'table2': {
          // Zeilen erscheinen von Platz 10 bis Platz 1, je mit einem Ton (höher, je besser der Platz)
          const rows = Math.min(10, this.tables[1].length);
          while (this.revealed < rows && this.phaseT >= REVEAL0 + this.revealed * REVEAL_GAP) {
            const place = rows - this.revealed++;
            this.emit('finish', this.W / 2, 250 + (place - 1) * 66, place, Math.min(11, place - 1));
          }
          if (this.phaseT >= TABLE2) { this.setPhase('champion'); this.emit('winner', this.W / 2, this.H / 2, 1, this.tables[1][0].rid); }
          break;
        }
        case 'champion':
          if (this.phaseT >= CHAMP) this.setPhase('end');
          break;
        default: break;
      }
    }
    setPhase(p) { this.phase = p; this.phaseT = 0; }
    finishRace(i, next, title) {
      this.results[i] = classify(this.cur);
      this.tables[i] = this.standings();
      this.marks.push({ t: this.t, title });
      this.setPhase(next);
    }
    /** Gesamtwertung nach den bisher beendeten Rennen: [{ rid, p: [Punkte je Rennen], total, q: [Platz je Rennen − 1] }]. */
    standings() {
      const res = this.results;
      return this.runs[0].roster.map((m) => {
        const q = res.map((o) => o.indexOf(m.id)), p = q.map((k) => POINTS[k] || 0);
        return { rid: m.id, p, q, total: p.reduce((a, b) => a + b, 0) };
      }).sort((a, b) => b.total - a.total || a.q[a.q.length - 1] - b.q[b.q.length - 1] || a.rid - b.rid);
    }

    /** Kapitel: Rennen 1 und 2 je mit Abschnitten und Sieg (das Podest gleich danach nicht), dazu die Tabellen. Ein
     *  Kapitel, auf das schon nach weniger als 10 s Videozeit das nächste folgt, entfällt (YouTube verlangt 10 s); das
     *  erste bei 0:00 bleibt und übernimmt dann den Titel des nächsten (Intro · Race 1 · Stage 1). */
    get chapterLog() {
      const all = [];
      this.runs.forEach((sim, i) => {
        const off = this.offs[i].t;
        for (const c of sim.chapterLog) {
          if (c.title === 'Podium' || (c.title === 'Intro' && i > 0)) continue;
          all.push({ t: c.t + off, title: c.title === 'Intro' ? 'Intro' : `Race ${i + 1} · ${c.title}` });
        }
      });
      all.push(...this.marks);
      all.sort((a, b) => a.t - b.t);
      const out = [], min = 10 * (this.timeScale || 1), first = { ...all[0] };
      for (let i = all.length - 1; i >= 1; i--) if (!out.length || out[0].t - all[i].t >= min) out.unshift(all[i]);
      while (out.length && out[0].t - first.t < min) first.title = `${first.title} · ${out.shift().title}`;
      return [first, ...out];
    }

    setParam(k, v) {
      this.cfg = { ...this.cfg, [k]: v };
      for (const sim of this.runs) { if (sim.setParam) sim.setParam(k, v); else sim.cfg = { ...sim.cfg, [k]: v }; }
    }
    setTimeScale(s) { for (const sim of this.runs) if (sim.setTimeScale) sim.setTimeScale(s); this.timeScale = s; }
    stateNumbers() { return [this.step, this.raceNo, PHASES.indexOf(this.phase), this.revealed, ...this.cur.stateNumbers()]; }
    stateHash() { return P.hashNumbers(this.stateNumbers()); }
    checkInvariants() { return this.cur.checkInvariants(); }
    snapshot() {
      const s = this.cur.snapshot(), done = this.phase === 'champion' || this.phase === 'end';
      const tab = this.tables[this.tables.length - 1], names = this.runs[0].roster;
      const lead = tab ? `${names[tab[0].rid].name} ${tab[0].total} P.` : '';
      return {
        ...s, t: this.t, step: this.step, phase: this.phase, race: this.raceNo + 1, races: 2, ended: this.phase === 'end',
        raceWinner: s.winner, winner: done ? names[tab[0].rid].name : null,
        standings: tab ? tab.map((r) => ({ name: names[r.rid].name, points: r.p.slice(), total: r.total })) : [],
        summary: `Zwei Rennen · Rennen ${this.raceNo + 1} von 2 · ${s.summary}${lead ? ` · Gesamt vorn: ${lead}` : ''}`,
      };
    }
    destroy() {}
  }

  EBS.KnockoutSeries = { KnockoutSeriesSimulation, classify, POINTS, HOLD1, TABLE2, CHAMP, REVEAL0, REVEAL_GAP };
})(typeof window !== 'undefined' ? window : globalThis);
