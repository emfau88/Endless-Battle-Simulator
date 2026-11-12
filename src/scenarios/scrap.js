/* Scrap Wars: source Canvas renderer + native episode/config/audio integration. */
(function () {
  'use strict';
  const { Episode, normalizeParams, layout } = EBS.Scrap;
  const FONT = '"Segoe UI", Arial, sans-serif';
  const text = (g, value, x, y, size, color = '#e0e9e9', align = 'left', weight = 700) => {
    g.font = `${weight} ${size}px ${FONT}`; g.fillStyle = color;
    g.textAlign = align; g.textBaseline = 'middle'; g.fillText(String(value), x, y);
  };
  function box(g, x, y, w, h, radius = 14) {
    g.beginPath(); g.roundRect(x, y, w, h, radius);
  }
  class ArenaRenderer extends ScrapArena.Renderer {
    _result(g, round) {
      // Preserve the source result banner; enlarge and move it into the arena
      // centre, where it remains legible in a phone-sized portrait export.
      g.save(); g.translate(450, 430); g.scale(2.3, 2.3); g.translate(-450, -112.5);
      super._result(g, round); g.restore();
    }
  }
  class ScrapRenderer extends EBS.CanvasScene {
    constructor(ctx) {
      super(ctx);
      this.sim = ctx.sim; this.view = ctx.view; this.layout = layout(ctx.world);
      this.arenaCanvas = document.createElement('canvas');
      this.arena = new ArenaRenderer(this.arenaCanvas, { dpr: 1, quality: 1 });
      const size = Math.round(this.layout.size * ctx.renderScale);
      this.arena.setSize(size, size);
    }
    card(g, robot, x, y, w, h, compact = false) {
      const alive = robot.alive, color = alive ? robot.color : '#71818b';
      box(g, x, y, w, h); g.fillStyle = '#15212c'; g.fill();
      g.strokeStyle = alive ? '#34434b' : '#25323a'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = color; g.fillRect(x + 1, y + 18, 4, h - 36);
      const pad = compact ? 16 : 24, nameSize = compact ? 23 : 32;
      text(g, robot.name, x + pad, y + h * .24, nameSize, color);
      text(g, alive ? `${Math.ceil(robot.hp)}` : 'OUT', x + w - pad, y + h * .24, nameSize, color, 'right');
      const bw = w - pad * 2;
      g.fillStyle = '#080f16'; g.fillRect(x + pad, y + h * .46, bw, 7);
      g.fillStyle = color; g.fillRect(x + pad, y + h * .46, bw * robot.hp / robot.maxHp, 7);
      const weapon = robot.weapon;
      const label = !alive ? `${this.sim.wins[robot.id]} WINS` : weapon ? `${weapon.kind.toUpperCase()}  ${weapon.ammo}/${weapon.maxAmmo}` : 'SEEKING WEAPON';
      text(g, label, x + pad, y + h * .73, compact ? 17 : 24, alive ? '#b4c5ca' : '#71818b', 'left', 600);
    }
    scores(g, x, y, w, horizontal) {
      text(g, 'MATCH WINS', x, y, 20, '#8096a2');
      this.sim.roundSim.robots.forEach((r, i) => {
        const xx = horizontal ? x + i * w / 4 : x;
        const yy = horizontal ? y + 46 : y + 58 + i * 58;
        text(g, horizontal ? `${r.name} ${this.sim.wins[i]}` : r.name, xx, yy, horizontal ? 24 : 26, r.color);
        if (!horizontal) text(g, this.sim.wins[i], x + w, yy, 30, r.color, 'right');
      });
    }
    paint(g) {
      const s = this.sim, r = s.roundSim, l = this.layout, { w, h } = this.world;
      const bg = g.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#1c2b36'); bg.addColorStop(.5, '#101a24'); bg.addColorStop(1, '#080f17');
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      // Let the final sparks fade during the end pause without changing the
      // preserved round state, RNGs or event history.
      const elapsed = s.phase === 'pause' ? s.cfg.endPauseSec - (s.pauseUntil - s.step) / 60 : 0;
      const renderState = elapsed > 0 ? { ...r, effects: r.effects.map(e => ({ ...e, age: e.age + elapsed })) } : r;
      this.arena.draw(renderState, { hud: false, cinematic: !!this.view.camera });
      g.drawImage(this.arenaCanvas, l.x, l.y, l.size, l.size);
      if (!this.view.hud) return;
      const clock = EBS.util.fmtTime(Math.ceil(Math.max(0, r.duration - r.t)));
      const status = s.phase === 'running' ? `${r.robots.filter(x => x.alive).length} BOTS ALIVE  /  ${r.stats.destroyed} COVER LOST`
        : s.phase === 'pause' ? `NEXT ROUND IN ${Math.ceil((s.pauseUntil - s.step) / 60)}s` : 'MATCH COMPLETE';
      if (l.kind === 'portrait') {
        text(g, 'SCRAP WARS', 54, 105, 76);
        text(g, `ROUND ${String(s.roundNumber).padStart(2, '0')}`, 56, 183, 32, '#f0bf7b');
        text(g, clock, 1024, 174, 62, '#dde9e9', 'right');
        this.card(g, r.robots[0], 54, 246, 468, 158);
        this.card(g, r.robots[1], 558, 246, 468, 158);
        this.card(g, r.robots[3], 54, 1468, 468, 158);
        this.card(g, r.robots[2], 558, 1468, 468, 158);
        text(g, status, 540, 1680, 28, '#c9d9dd', 'center');
        this.scores(g, 58, 1748, 980, true);
      } else if (l.kind === 'landscape') {
        text(g, 'SCRAP', 48, 120, 76); text(g, 'WARS', 48, 202, 76);
        text(g, `ROUND ${String(s.roundNumber).padStart(2, '0')}`, 52, 306, 30, '#f0bf7b');
        text(g, clock, 48, 388, 86);
        this.scores(g, 52, 522, 340, false);
        text(g, s.phase === 'running' ? `${r.robots.filter(x => x.alive).length} BOTS ALIVE` : 'ROUND COMPLETE', 52, 900, 26, '#b6c9ce');
        text(g, s.phase === 'pause' ? `NEXT ROUND IN ${Math.ceil((s.pauseUntil - s.step) / 60)}s` : `${r.stats.destroyed} COVER LOST`, 52, 944, 23, '#8096a2');
        r.robots.forEach((robot, i) => this.card(g, robot, 1496, 52 + i * 250, 376, 226));
      } else {
        text(g, 'SCRAP WARS', 40, 60, 48);
        text(g, `ROUND ${s.roundNumber}  /  ${clock}`, 1040, 60, 29, '#f0bf7b', 'right');
        r.robots.forEach((robot, i) => this.card(g, robot, 24 + i * 264, 900, 240, 132, true));
        text(g, status, 540, 133, 24, '#b4c5ca', 'center');
      }
    }
    destroy() { this.arena.destroy(); this.arenaCanvas.width = this.arenaCanvas.height = 1; super.destroy(); }
  }
  EBS.registerScenario({
    id: 'scrap', title: 'Scrap Wars',
    supportsClips: true,
    defaults: { repeatRounds: true, endPauseSec: 3 },
    controls: [
      { key: 'repeatRounds', label: 'Weitere Runden spielen', type: 'check', restart: true },
      { key: 'endPauseSec', label: 'Ergebnis zeigen', type: 'range', min: 2, max: 8, step: 1, restart: true, format: v => `${v} s` },
    ],
    normalizeParams,
    create: ctx => new Episode(ctx),
    createRenderer: ctx => new ScrapRenderer(ctx),
    panelStats(sim) {
      const s = sim.snapshot();
      return [
        { key: 'round', label: 'Runde', value: s.round },
        { key: 'roundTime', label: 'Rundenzeit', value: EBS.util.fmtTime(s.roundTime) },
        { key: 'alive', label: 'Roboter aktiv', value: s.alive },
        { key: 'cover', label: 'Deckung zerstört', value: s.stats.destroyed },
        { key: 'shots', label: 'Schüsse', value: s.stats.shots },
        { key: 'pickups', label: 'Waffen aufgenommen', value: s.stats.pickups },
      ];
    },
    panelNote: sim => sim.phase === 'pause' ? `Ergebnis · nächste Runde in ${Math.ceil((sim.pauseUntil - sim.step) / 60)} s` : sim.snapshot().summary,
    audio: { events: {
      blaster: { label: 'Blaster', samples: ['synth:scrap-blaster'], gain: .24, detune: .7 },
      rocket: { label: 'Raketenstart', samples: ['synth:scrap-rocket'], gain: .36, detune: .4 },
      hit: { label: 'Robotertreffer', samples: ['impactMetal_light_000', 'impactMetal_light_001'], gain: .20, ref: 6, detune: 1 },
      cover_hit: { label: 'Deckungstreffer', samples: ['impactPlate_light_000'], gain: .13, ref: 19, detune: 1, minGap: .035 },
      blast: { label: 'Explosion', samples: ['synth:cannon'], gain: .48, semis: 2 },
      break: { label: 'Deckung zerstört', samples: ['impactWood_heavy_000'], gain: .30, detune: .8 },
      pickup: { label: 'Waffenaufnahme', samples: ['synth:scrap-pickup'], gain: .22 },
      drop: { label: 'Waffenabwurf', samples: ['impactTin_medium_000'], gain: .12, detune: .8 },
      ko: { label: 'Roboter ausgeschaltet', samples: ['synth:cannon'], gain: .52, semis: -5 },
    } },
  });
})();
