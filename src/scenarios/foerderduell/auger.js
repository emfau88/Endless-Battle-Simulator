// Axiale Längen in Gewindesteigungen, Zeit in Maschinentakten, Winkel in Umdrehungen.
(function () {
  'use strict';
  const F = EBS.Foerderduell = EBS.Foerderduell || {};
  const turnsPerBeat = 2;
  const entryLead = .30, settlingTime = .26;
  const pocketGap = .75, outlet = 3;
  const rollingGravity = 6; // Hangabtrieb der rollenden Kugel in Steigungen pro Takt².
  const portFall = .16, chuteFall = .945;
  const runout = turnsPerBeat * portFall / 2;

  function turnsAt(beat) { return (beat + entryLead) * turnsPerBeat; }
  function beatAt(turns) { return turns / turnsPerBeat - entryLead; }

  // Untere Grenze des Kugelmittelpunkts an der bergseitigen Fläche derselben Windung.
  function support(turns, pocket) { return turns - pocket - pocketGap; }

  // Freier Lauf mit konstanter Hangabtriebskraft und einseitiger, unelastischer Flanke.
  // Zwischen zwei Drehzahländerungen kann der Stoß analytisch aufgelöst werden.
  function roll(x, speed, dt, oldTurns, newTurns, pocket) {
    const free = x + speed * dt - .5 * rollingGravity * dt * dt;
    const floor = support(newTurns, pocket);
    if (free > floor || dt <= 0) return { x: free, speed: speed - rollingGravity * dt, contact: false };
    return { x: floor, speed: (newTurns - oldTurns) / dt, contact: true };
  }

  function load(id, ready, take) {
    // Die Dosierung öffnet bei gleicher Wellenstellung jede zweite Tasche.
    const pocket = take * turnsPerBeat;
    const enter = beatAt(pocket);
    // Erst wenn die tragende Flanke den Kugelmittelpunkt über die Öffnung hebt, fällt er aus.
    const release = beatAt(pocket + pocketGap + outlet);
    const exit = release + portFall;
    return { id, ready, pocket, depart: take - .85, enter, release, exit, land: exit + chuteFall };
  }

  function pose(ball, beat) {
    const seated = ball.enter + settlingTime;
    if (beat < seated) {
      const t = Math.max(0, (beat - ball.enter) / settlingTime);
      return { x: 0, drop: t * t, spill: 0, contact: false };
    }
    const bead = roll(0, 0, beat - seated, turnsAt(seated), turnsAt(beat), ball.pocket);
    if (bead.x < outlet) return { x: bead.x, drop: 1, spill: 0, contact: bead.contact };
    const t = Math.max(0, Math.min(1, (beat - ball.release) / portFall));
    // Nach der letzten Flanke lenkt der Auslauf den Schwung ins Fallrohr um.
    // Die axiale Geschwindigkeit beginnt bei Wellenvorschub und endet am Rohr bei null.
    return { x: outlet + runout * t * (2-t), drop: 1, spill: t*t, contact: false };
  }

  F.Auger = { rulesVersion: 'contact-v2', turnsAt, support, load, roll, pose, outlet, span: outlet + runout, settlingTime };
})();
