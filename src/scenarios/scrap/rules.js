/* Versioned Scrap rules. The archived prototype and classic round stay intact. */
(function () {
  'use strict';
  class Round extends ScrapArena.Sim {
    constructor({ seed, rulesVersion = 'v2' }) {
      super({ seed });
      this.rulesVersion = rulesVersion;
      if (rulesVersion === 'v2') {
        // Second, bounded change: a 25% shorter supply cycle. Same two pads,
        // weapons, ammunition and global weapon cap as the original round.
        for (const pad of this.pads) pad.period *= .75;
      }
    }
    _think(robot) {
      super._think(robot);
      if (this.rulesVersion !== 'v2' || robot.weapon) return;
      // First change: compare travel + waiting cost, including incoming supply.
      // A directly reachable weapon wins over a similar blocked destination.
      let best = Infinity, goal = null;
      const candidates = this.pickups.filter(p => !p.empty && p.ammo > 0).concat(this.pads);
      for (const p of candidates) {
        const distance = Math.hypot(p.x - robot.x, p.y - robot.y);
        const cost = distance + Math.max(0, p.readyIn || 0) * robot.speed
          + (this._blocked(robot.x, robot.y, p.x, p.y, robot.r) ? 450 : 0);
        if (cost < best) { best = cost; goal = p; }
      }
      if (goal) { robot.goalX = goal.x; robot.goalY = goal.y; }
    }
  }
  EBS.ScrapRules = { Round };
})();
