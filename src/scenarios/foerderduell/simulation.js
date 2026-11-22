// Eine Runde ist klein genug, um die Laufzeiten aller 48 Kugeln aus demselben Zulauf zu bestimmen.
(function () {
  'use strict';
  const F = EBS.Foerderduell = EBS.Foerderduell || {};
  const { hashSeed, fnv1a } = EBS.util;
  const STOCK = 24, GOAL = 12, CAPACITY = 7, BEAT = 54, HOLD = 90;
  const profiles = ['steady', 'bursts', 'packets'];
  const names = { steady: 'Einzeln', bursts: 'Zwei Schübe', packets: 'Wechselnde Portionen' };
  const labels = { auger: 'Schnecke', piston: 'Stempel', tie: 'Unentschieden' };

  function deliveries(profile, rng) {
    const supply = [];
    let tick = 0;
    while (supply.length < STOCK) {
      const portion = profile === 'steady' ? 1 : profile === 'bursts' ? 12 : rng.int(2, 8);
      for (let n = 0; n < portion && supply.length < STOCK; n++) supply.push(tick);
      tick += profile === 'steady' ? 1 : profile === 'bursts' ? 8 : rng.int(2, 7);
    }
    return supply;
  }

  function buildRound(seed, index, mode) {
    const offset = new EBS.RNG(hashSeed(seed, 'feed-order')).int(0, profiles.length - 1);
    const profile = mode === 'mixed' ? profiles[(offset + index) % profiles.length] : mode;
    const supply = deliveries(profile, new EBS.RNG(hashSeed(seed, index, 'feed')));
    const dye = new EBS.RNG(hashSeed(seed, index, 'glass'));
    const colors = supply.map(() => dye.int(0, 3));
    const auger = [], piston = [];
    let take = -1;
    for (const [id, ready] of supply.entries()) {
      take = Math.max(ready, take + 1);
      auger.push({ id, depart: take - .85, enter: take - .30, exit: take + 1.30, land: take + 2.68 });
    }
    // Ein Hub nimmt höchstens sieben der bereits gelieferten Kugeln in ihrer Eingangsreihenfolge mit.
    let previousDepart = -2, previousStroke = -2;
    const strokes = [];
    for (let tick = 4; piston.length < STOCK; tick += 6) {
      let slot = 0;
      while (slot < CAPACITY && piston.length < STOCK && supply[piston.length] <= tick) {
        const id = piston.length;
        const depart = Math.max(supply[id] - .90, previousStroke + .56, previousDepart + .09);
        piston.push({ id, slot, stroke: tick, depart, enter: depart + .36, exit: tick + .19 + slot * .053, land: tick + .55 + slot * .065 });
        previousDepart = depart;
        slot++;
      }
      strokes.push(tick);
      previousStroke = tick;
    }
    const lanes = [auger, piston];
    const crossings = lanes.map(lane => Math.floor(lane[GOAL-1].land));
    const winningTick = Math.min(...crossings);
    const winner = crossings[0] === crossings[1] ? 'tie' : crossings[0] < crossings[1] ? 'auger' : 'piston';
    // Beide Ziele werden am Ende desselben Maschinentakts gewertet, auch wenn Kugeln versetzt landen.
    const finish = winningTick + .98;
    const cues = [];
    for (const [side, lane] of lanes.entries()) for (const ball of lane) {
      cues.push({ beat: ball.land, type: 'glass', side, id: ball.id });
      if (side === 0) cues.push({ beat: ball.enter, type: 'turn', side, id: ball.id });
    }
    for (const stroke of strokes) cues.push({ beat: stroke + .32, type: 'stroke', side: 1, id: 0 });
    cues.sort((a,b) => a.beat - b.beat || a.side - b.side || a.id - b.id);
    return { profile, supply, colors, lanes, crossings, winner, finish, cues: cues.filter(cue => cue.beat <= finish) };
  }

  function stage(ball, beat) {
    if (beat < ball.depart) return 'hopper';
    if (beat < ball.enter) return 'feed';
    if (beat < ball.exit) return 'machine';
    return beat < ball.land ? 'outlet' : 'goal';
  }

  class Simulation {
    constructor({seed, params, timeScale = 1}) {
      this.seed = seed; this.cfg = params; this.timeScale = timeScale;
      this.step = 0; this.t = 0; this.roundIndex = 0; this.roundStart = 0;
      this.events = new Array(128); this.eventSeq = 0; this.audioWorldWidth = 1000;
      this.wins = { auger: 0, piston: 0, tie: 0 };
      this.startRound();
    }
    startRound() {
      this.round = buildRound(this.seed, this.roundIndex, this.cfg.supply);
      this.roundLength = (this.round.finish + 1) * BEAT + HOLD;
      this.beat = -1; this.cueIndex = 0; this.result = null; this.scores = [0,0];
    }
    stepOnce() {
      this.step++;
      const clock = this.step * this.timeScale;
      this.t = clock / EBS.PHYS_HZ;
      if (this.cfg.mode === 'series' && clock - this.roundStart >= this.roundLength) {
        this.roundStart += this.roundLength;
        this.roundIndex++;
        this.startRound();
      }
      this.beat = Math.min(this.round.finish, (clock - this.roundStart) / BEAT - 1);
      const cues = this.round.cues;
      while (this.cueIndex < cues.length && cues[this.cueIndex].beat <= this.beat) {
        const cue = cues[this.cueIndex++];
        if (cue.type === 'glass') this.scores[cue.side]++;
        const seq = this.eventSeq++;
        this.events[seq % this.events.length] = { seq, step: this.step, t: this.t, type: cue.type,
          x: cue.side ? 730 : 270, y: 0, p: cue.type === 'stroke' ? 1.1 : .8, c: this.round.colors[cue.id] };
      }
      if (!this.result && this.beat >= this.round.finish) {
        this.result = this.round.winner;
        this.wins[this.result]++;
      }
    }
    snapshot() {
      const counts = this.round.lanes.map(lane => {
        const bins = { hopper: 0, feed: 0, machine: 0, outlet: 0, goal: 0 };
        for (const ball of lane) bins[stage(ball, this.beat)]++;
        return bins;
      });
      return { t: this.t, step: this.step, round: this.roundIndex + 1, supply: this.round.profile, counts,
        scores: [...this.scores], result: this.result, wins: { ...this.wins },
        summary: 'Runde ' + (this.roundIndex+1) + ' · ' + names[this.round.profile] + ' · ' +
          (this.result ? labels[this.result] + (this.result === 'tie' ? '' : ' gewinnt') : this.scores.join(' zu ')) };
    }
    checkInvariants() {
      const errors = [];
      for (const [side, lane] of this.round.lanes.entries()) {
        if (lane.length !== STOCK || lane.some((b,i) => b.id !== i || !(b.depart < b.enter && b.enter < b.exit && b.exit < b.land)))
          errors.push('Kugelbestand oder Förderzeiten ungültig.');
        if (this.scores[side] !== lane.filter(b => b.land <= this.beat).length) errors.push('Zielglas und Zähler weichen ab.');
      }
      return { ok: !errors.length, errors };
    }
    stateHash() {
      return fnv1a(JSON.stringify([this.seed, this.cfg, this.timeScale, this.step, this.roundIndex, this.roundStart,
        this.beat, this.round.supply, this.round.colors, this.cueIndex, this.eventSeq, this.scores, this.result, this.wins])).toString(16);
    }
    destroy() {}
  }
  Object.assign(F, { STOCK, GOAL, BEAT, HOLD, buildRound, stage, Simulation });
})();
