/* Versioned Scrap rules. The archived prototype and classic round stay intact. */
(function () {
  'use strict';
  const arenas = {
    yard: { name: 'SCRAPYARD', blocks: null },
    foundry: { name: 'FOUNDRY', blocks: [
      [260,290,60,60],[340,290,60,60],[500,290,60,60],[580,290,60,60],
      [260,550,60,60],[340,550,60,60],[500,550,60,60],[580,550,60,60],
      [205,380,60,60],[205,460,60,60],[635,380,60,60],[635,460,60,60],
    ] },
    crossroads: { name: 'CROSSROADS', blocks: [
      [345,345,60,60],[495,345,60,60],[345,495,60,60],[495,495,60,60],
      [190,255,90,50],[620,255,90,50],[190,595,90,50],[620,595,90,50],
    ] },
    sunshine: { name: 'SUNNY YARD', blocks: null },
  };
  const modules = {
    plating: { name: 'PLATING', note: '+15% ARMOR / -8% SPEED', hp: 1.15, speed: .92, cooldown: 1 },
    drive: { name: 'DRIVE', note: '+12% SPEED / -10% ARMOR', hp: .90, speed: 1.12, cooldown: 1 },
    capacitor: { name: 'CAPACITOR', note: '-12% RELOAD / -8% ARMOR', hp: .92, speed: 1, cooldown: .88 },
  };
  class Round extends ScrapArena.Sim {
    constructor({ seed, rulesVersion = 'v2', arena = 'yard', upgrades = [] }) {
      super({ seed });
      this.rulesVersion = rulesVersion;
      this.arena = arena;
      if (arenas[arena].blocks) {
        this.blocks = arenas[arena].blocks.map(([x,y,w,h], id) => ({ id,x,y,w,h,hp:50,maxHp:50,alive:true }));
      }
      if (rulesVersion === 'v2') {
        // Second, bounded change: a 25% shorter supply cycle. Same two pads,
        // weapons, ammunition and global weapon cap as the original round.
        for (const pad of this.pads) pad.period *= .75;
      }
      for (const robot of this.robots) {
        const key = upgrades[robot.id], module = modules[key];
        if (!module) continue;
        robot.module = key;
        robot.maxHp = robot.hp = 125 * module.hp;
        robot.speed *= module.speed; robot.vx *= module.speed; robot.vy *= module.speed;
      }
    }
    _shoot(robot) {
      const shots = this.stats.shots;
      super._shoot(robot);
      if (this.stats.shots !== shots && robot.module) robot.cooldown *= modules[robot.module].cooldown;
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
  EBS.ScrapRules = { Round, arenas, modules };
})();
