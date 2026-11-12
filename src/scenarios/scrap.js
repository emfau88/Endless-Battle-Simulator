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
  const palette = ['#ff725e', '#54dce8', '#ffce63', '#b0e779'];
  const colorOf = robot => palette[robot.id % 4];
  const path = (g, points) => { g.beginPath(); points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); };
  const circle = (g, x, y, radius) => { g.beginPath(); g.arc(x, y, radius, 0, Math.PI * 2); };
  class ArenaRenderer extends ScrapArena.Renderer {
    _bodyTexture(color, dead = false) {
      const id = palette.indexOf(color), key = `painted:${color}:${dead}`;
      if (this._bodies.has(key)) return this._bodies.get(key);
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 208;
      const g = canvas.getContext('2d'); g.scale(2, 2); g.translate(52, 52);
      const accent = dead ? '#68757a' : color;
      // Four cosmetic silhouettes share the original physical footprint.
      for (const y of [-27, 17]) {
        box(g, -25, y, 45, 11, 3); g.fillStyle = '#101923'; g.fill();
        g.strokeStyle = '#8397a3'; g.lineWidth = 1; g.stroke();
        for (let x = -22; x < 19; x += 6) { g.fillStyle = '#40515e'; g.fillRect(x, y + 2, 3, 7); }
      }
      const shapes = [
        [[-25,-16],[-15,-23],[13,-21],[27,-8],[27,8],[13,21],[-15,23],[-25,16]],
        [[-27,-9],[-17,-23],[9,-23],[25,-12],[25,12],[9,23],[-17,23],[-27,9]],
        [[-23,-23],[17,-23],[25,-15],[25,15],[17,23],[-23,23]],
        [[-24,-12],[-12,-24],[12,-24],[24,-12],[24,12],[12,24],[-12,24],[-24,12]],
      ];
      path(g, shapes[Math.max(0, id)]); g.fillStyle = '#111c24'; g.lineWidth = 5; g.strokeStyle = '#091118'; g.stroke();
      const paint = g.createLinearGradient(-24, -25, 24, 28);
      paint.addColorStop(0, dead ? '#849193' : '#e6edf0'); paint.addColorStop(.16, accent);
      paint.addColorStop(.68, accent); paint.addColorStop(1, '#263c46'); g.fillStyle = paint; g.fill();
      g.strokeStyle = dead ? '#7c898d' : '#eff5e8'; g.lineWidth = 1.1; g.stroke();
      if (id === 0) { path(g, [[-18,-16],[-6,-16],[14,0],[-6,16],[-18,16],[-1,0]]); g.fillStyle = '#722d30'; g.fill(); }
      if (id === 1) { for (const y of [-18, 12]) { box(g, -15, y, 27, 6, 2); g.fillStyle = '#d2f7fa'; g.fill(); } }
      if (id === 2) { for (const y of [-22, 13]) { g.fillStyle = '#58401e'; g.fillRect(-19, y, 37, 9); g.fillStyle = accent; g.fillRect(-11, y, 7, 9); g.fillRect(8, y, 7, 9); } }
      if (id === 3) { circle(g, -4, 0, 19); g.strokeStyle = '#3b642f'; g.lineWidth = 4; g.stroke(); }
      box(g, -24, -10, 6, 20, 2); g.fillStyle = '#132431'; g.fill();
      circle(g, -5, 0, 12); g.fillStyle = '#152936'; g.fill(); g.strokeStyle = '#e5eeed'; g.lineWidth = 1.2; g.stroke();
      circle(g, -5, 0, 7.5); g.fillStyle = accent; g.fill();
      circle(g, -7, -3, 2.7); g.fillStyle = dead ? '#86918a' : '#fffbe2'; g.fill();
      for (const [x,y] of [[-17,-17],[-17,17],[13,-15],[13,15]]) { circle(g, x, y, 1.6); g.fillStyle = '#d8e5e7'; g.fill(); }
      box(g, 19, -9, 7, 18, 2); g.fillStyle = '#263a45'; g.fill(); g.fillStyle = dead ? '#697378' : '#f4f9e7'; g.fillRect(24,-5,2,10);
      if (dead) { g.strokeStyle = '#11191c'; g.lineWidth = 3; g.beginPath(); g.moveTo(-18,-14); g.lineTo(11,12); g.lineTo(7,-8); g.stroke(); }
      this._bodies.set(key, canvas); return canvas;
    }
    _robot(g, robot, t) {
      const color = colorOf(robot);
      super._robot(g, { ...robot, color }, t);
      if (!robot.alive) return;
      g.save(); g.translate(robot.x, robot.y);
      const y = -robot.r - 25;
      box(g, -34, y - 8, 68, 15, 4); g.fillStyle = '#10202be8'; g.fill();
      text(g, robot.name, 0, y, 10, color, 'center', 800);
      g.restore();
    }
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
      const alive = robot.alive, color = alive ? colorOf(robot) : '#71818b';
      box(g, x, y, w, h, 12); g.fillStyle = '#152632'; g.fill();
      g.strokeStyle = alive ? color + '65' : '#34434b'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = color; g.fillRect(x + 1, y + 13, 4, h - 26);
      const icon = compact ? 52 : 84, left = x + icon + 18, right = x + w - 20;
      g.drawImage(this.arena._bodyTexture(colorOf(robot), !alive), x + 8, y + 4, icon, icon);
      text(g, robot.name, left, y + 30, compact ? 22 : 32, color);
      text(g, alive ? `${Math.ceil(robot.hp)}` : 'OUT', right, y + 30, compact ? 20 : 29, color, 'right');
      const bw = right - left;
      box(g, left, y + 53, bw, 8, 4); g.fillStyle = '#07131b'; g.fill();
      if (alive) { box(g, left, y + 53, bw * robot.hp / robot.maxHp, 8, 4); g.fillStyle = color; g.fill(); }
      const weapon = robot.weapon, label = !alive ? 'KNOCKED OUT' : weapon ? `${weapon.kind.toUpperCase()}  ${weapon.ammo}/${weapon.maxAmmo}` : 'SEARCHING';
      text(g, label, x + 20, y + h - 43, compact ? 15 : 21, alive ? '#dce8e9' : '#7a8f9a', 'left', 650);
      text(g, `${this.sim.wins[robot.id]} WINS`, right, y + h - 20, compact ? 14 : 18, color, 'right');
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
        text(g, 'SCRAP WARS', 54, 106, 56);
        text(g, `ROUND ${String(s.roundNumber).padStart(2, '0')}`, 56, 177, 30, '#f0bf7b');
        text(g, clock, 1024, 173, 52, '#dde9e9', 'right');
        this.card(g, r.robots[0], 54, 244, 468, 156);
        this.card(g, r.robots[1], 558, 244, 468, 156);
        this.card(g, r.robots[3], 54, 1468, 468, 156);
        this.card(g, r.robots[2], 558, 1468, 468, 156);
        text(g, status, 540, 1680, 28, '#c9d9dd', 'center');
        this.scores(g, 58, 1748, 980, true);
      } else if (l.kind === 'landscape') {
        text(g, 'SCRAP WARS', 46, 92, 49);
        text(g, 'FOUR BOTS. ONE ARENA.', 48, 139, 20, '#8da7b6');
        text(g, `ROUND ${String(s.roundNumber).padStart(2, '0')}`, 50, 252, 30, '#f0bf7b');
        text(g, clock, 46, 323, 68);
        this.scores(g, 52, 480, 340, false);
        text(g, s.phase === 'running' ? `${r.robots.filter(x => x.alive).length} BOTS ALIVE` : 'ROUND COMPLETE', 52, 914, 25, '#d4e4e6');
        text(g, s.phase === 'pause' ? `NEXT ROUND IN ${Math.ceil((s.pauseUntil - s.step) / 60)}s` : `${r.stats.destroyed} COVER LOST`, 52, 955, 21, '#91a9b5');
        text(g, 'CONTENDERS', 1516, 92, 22, '#91a9b5');
        r.robots.forEach((robot, i) => this.card(g, robot, 1496, 144 + i * 216, 376, 182));
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
