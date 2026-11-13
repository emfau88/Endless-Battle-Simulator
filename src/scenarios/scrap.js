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
  const damageStage = robot => robot.hp / robot.maxHp > 2 / 3 ? 0 : robot.hp / robot.maxHp > 1 / 3 ? 1 : 2;
  const path = (g, points) => { g.beginPath(); points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); };
  const circle = (g, x, y, radius) => { g.beginPath(); g.arc(x, y, radius, 0, Math.PI * 2); };
  class ArenaRenderer extends ScrapArena.Renderer {
    _pickup(g, p, t) {
      if (this.sunny) EBS.ScrapDaylightArt.pickup(g, p, t, this);
      else super._pickup(g, p, t);
    }
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
      super._robot(g, { ...robot, color, name:this.materialArena?' ':robot.name }, t);
      if (!robot.alive) return;
      g.save(); g.translate(robot.x, robot.y);
      const stage = damageStage(robot);
      if (stage) {
        g.save(); g.rotate(Math.hypot(robot.vx, robot.vy) > 8 ? Math.atan2(robot.vy, robot.vx) : robot.angle);
        // Fixed scars preserve team paint and weapon readability. Damage is a
        // view of HP, never an extra physics state or a source of random calls.
        g.strokeStyle = '#17212ce0'; g.lineWidth = 3;
        for (let i = 0; i < stage + 1; i++) {
          g.beginPath(); g.moveTo(-18 + i * 12, -19); g.lineTo(-13 + i * 12, -13); g.lineTo(-17 + i * 12, -5); g.stroke();
        }
        if (stage === 2) {
          box(g, -23, 9, 18, 10, 2); g.fillStyle = '#281c19'; g.fill();
          g.strokeStyle = '#eaa56a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-21, 11); g.lineTo(-12, 16); g.lineTo(-7, 11); g.stroke();
        }
        g.restore();
      }
      if (stage === 2) {
        // Three analytic puffs at most per robot; no accumulating particle pool.
        for (let i = 0; i < 3; i++) {
          const age = (t * .7 + i / 3 + robot.id * .13) % 1;
          circle(g, -14 + Math.sin(age * 4 + i) * 5, -9 - age * 35, 4 + age * 9);
          g.fillStyle = `rgba(126,137,143,${(1 - age) * .28})`; g.fill();
        }
      }
      if (robot.module) {
        // One visible attachment per robot, below the name and outside the gun.
        g.save(); g.rotate(Math.atan2(robot.vy, robot.vx));
        if (robot.module === 'plating') {
          path(g,[[-24,-13],[-17,-17],[-17,17],[-24,13]]); g.fillStyle = '#d6e0df'; g.fill();
        } else if (robot.module === 'drive') {
          for(const y of [-22,22]) { box(g,-27,y-4,13,8,2); g.fillStyle='#8fe0e5';g.fill(); }
        } else {
          box(g,-29,-8,10,16,3);g.fillStyle='#ffce63';g.fill();g.fillStyle='#394452';g.fillRect(-27,-4,6,8);
        }
        g.restore();
      }
      const y = this.materialArena && robot.y < 62 ? robot.r + 31 : -robot.r - 25;
      box(g, -34, y - 8, 68, 15, 4); g.fillStyle = '#10202be8'; g.fill();
      text(g, robot.name, 0, y, 10, color, 'center', 800);
      g.restore();
    }
    _effect(g, e, under = false) {
      if(e.type==='break'&&e.material) { EBS.ScrapMaterialArt.breakEffect(g,e,under,this.sunny);return; }
      if (e.type === 'shot') return; // The weapon already supplies its muzzle flash.
      if (e.type !== 'hit') { super._effect(g, e, under); return; }
      if (under || e.age >= e.ttl) return;
      const u = e.age / e.ttl;
      g.save(); g.translate(e.x, e.y); g.globalAlpha = (1 - u) ** 2;
      g.strokeStyle = '#ffe5aa'; g.lineWidth = 1.8;
      for (let i = 0; i < 3; i++) {
        const a = (e.seed % 628) / 100 + i * 2.1, d = 2 + u * 13;
        g.beginPath(); g.moveTo(Math.cos(a) * d, Math.sin(a) * d);
        g.lineTo(Math.cos(a) * (d + 5), Math.sin(a) * (d + 5)); g.stroke();
      }
      g.restore();
    }
    _result(g, round) {
      if (this.skipResult) return;
      // Preserve the source result banner; enlarge and move it into the arena
      // centre, where it remains legible in a phone-sized portrait export.
      g.save(); g.translate(450, 430); g.scale(2.3, 2.3); g.translate(-450, -112.5);
      super._result(g, round); g.restore();
    }
  }
  class ScrapRenderer extends EBS.CanvasScene {
    constructor(ctx) {
      super(ctx);
      this.sim = ctx.sim; this.view = ctx.view; this.layout = layout(ctx.world, ctx.sim.cfg);
      this.arenaCanvas = document.createElement('canvas');
      this.arena = new ArenaRenderer(this.arenaCanvas, { dpr: 1, quality: 1 });
      this.arena.materialArena=!!this.layout.full;
      this.arena.sunny=ctx.sim.cfg.arena==='sunshine';
      const size = this.layout.full ? 1 : Math.round(this.layout.size * ctx.renderScale);
      this.arena.setSize(size, size);
    }
    overlayLayout() {
      const l=this.layout;
      return l.full?{...l,x:l.x+(l.width-l.size)/2,y:l.y+(l.height-l.size)/2}:l;
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
      if (!compact && alive) text(g, ['ARMOR INTACT', 'DAMAGED', 'CRITICAL'][damageStage(robot)], x + 20, y + h - 74, 15,
        damageStage(robot) === 2 ? '#ffac7d' : '#91a7b4', 'left', 650);
      const weapon = robot.weapon, label = !alive ? 'KNOCKED OUT' : this.sim.phase !== 'running' ? 'SURVIVED' : weapon ? `${weapon.kind.toUpperCase()}  ${weapon.ammo}/${weapon.maxAmmo}` : 'SEARCHING';
      text(g, label, x + 20, y + h - 43, compact ? 15 : 21, alive ? '#dce8e9' : '#7a8f9a', 'left', 650);
      text(g, `${this.sim.wins[robot.id]} WINS`, right, y + h - 20, compact ? 14 : 18, color, 'right');
      if (this.sim.cfg.workshop) {
        const module = robot.module || this.sim.workshop.modules[robot.id];
        const label = module ? EBS.ScrapRules.modules[module].name + (robot.module ? '' : ' NEXT') : `${this.sim.workshop.balances[robot.id]}/4 SCRAP`;
        text(g, label, x + 20, y + h - 20, compact ? 12 : 15, '#d3bc91', 'left');
      }
    }
    scores(g, x, y, w, horizontal) {
      text(g, this.sim.cfg.episodeMode === 'tournament' ? 'TOURNAMENT WINS · FIRST = LEADER' : 'MATCH WINS', x, y, 17, '#8096a2');
      const robots = [...this.sim.roundSim.robots].sort((a,b) => this.sim.wins[b.id] - this.sim.wins[a.id] || a.id - b.id);
      robots.forEach((r, i) => {
        const xx = horizontal ? x + i * w / 4 : x;
        const yy = horizontal ? y + 46 : y + 58 + i * 58;
        text(g, horizontal ? `${r.name} ${this.sim.wins[r.id]}` : r.name, xx, yy, horizontal ? 24 : 26, colorOf(r));
        if (!horizontal) text(g, this.sim.wins[r.id], x + w, yy, 30, colorOf(r), 'right');
      });
    }
    finale(g) {
      const s = this.sim, l = this.overlayLayout(), champions = s.champions();
      const rows = [...s.roundSim.robots].sort((a,b) => s.wins[b.id] - s.wins[a.id] || a.id - b.id);
      g.save(); g.translate(l.x, l.y); g.scale(l.size / 1000, l.size / 1000);
      g.fillStyle = '#07131bb8'; g.fillRect(0, 0, 1000, 1000);
      box(g, 100, 150, 800, 700, 26); g.fillStyle = '#132532f5'; g.fill();
      g.strokeStyle = '#ebc37c'; g.lineWidth = 2; g.stroke();
      text(g, 'TOURNAMENT COMPLETE', 500, 214, 26, '#c1d4df', 'center');
      text(g, champions.length === 1 ? `${rows[0].name} WINS` : 'TIED FOR FIRST', 500, 282, 52, '#ffce63', 'center', 800);
      text(g, '8 ROUNDS  ·  FINAL STANDINGS', 500, 337, 23, '#9eb4bf', 'center');
      rows.forEach((r, i) => {
        const y = 425 + i * 84, leading = champions.includes(r.id);
        box(g, 158, y - 30, 684, 65, 10); g.fillStyle = leading ? '#2d3e42' : '#1b303c'; g.fill();
        text(g, leading ? '★' : '·', 185, y, 24, '#ffce63');
        text(g, r.name, 232, y, 32, colorOf(r));
        text(g, `${s.wins[r.id]} WINS`, 808, y, 28, colorOf(r), 'right');
      });
      text(g, `${s.draws} DRAW${s.draws === 1 ? '' : 'S'}  ·  SEE YOU IN THE NEXT ARENA`, 500, 793, 21, '#9eb4bf', 'center');
      g.restore();
    }
    workshopPanel(g) {
      const s=this.sim, l=this.overlayLayout();
      if (!s.cfg.workshop || s.phase !== 'pause' || !s.workshop.lastAwards.length) return;
      g.save(); g.translate(l.x,l.y); g.scale(l.size/1000,l.size/1000);
      const awards=s.workshop.lastAwards, height=80+awards.length*58, y=940-height;
      box(g,120,y,760,height,14);g.fillStyle='#132633f5';g.fill();g.strokeStyle='#e0bc73';g.lineWidth=1.5;g.stroke();
      text(g,'WORKSHOP · READY NEXT ROUND',500,y+33,22,'#ffce63','center');
      awards.forEach((a,i)=>{
        const robot=s.roundSim.robots[a.team], mod=EBS.ScrapRules.modules[a.module], yy=y+77+i*58;
        text(g,`${robot.name} + ${mod.name}`,150,yy,23,colorOf(robot));
        text(g,mod.note,150,yy+23,16,'#b7cbd4','left',550);
      });
      g.restore();
    }
    paint(g) {
      if(this.layout.full) { this.paintMaterialArena(g);return; }
      const s = this.sim, r = s.roundSim, l = this.layout, { w, h } = this.world;
      const bg = g.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#1c2b36'); bg.addColorStop(.5, '#101a24'); bg.addColorStop(1, '#080f17');
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      // Let the final sparks fade during the end pause without changing the
      // preserved round state, RNGs or event history.
      const final = s.cfg.episodeMode === 'tournament' && s.completedRounds === 8;
      const elapsed = s.phase === 'pause' ? s.cfg.endPauseSec - (s.pauseUntil - s.step) / 60 : final ? 5 - (s.outroUntil - s.step) / 60 : 0;
      const renderState = elapsed > 0 || final ? { ...r, phase: final ? 'running' : r.phase, effects: r.effects.map(e => ({ ...e, age: e.age + elapsed })) } : r;
      this.arena.skipResult = true;
      this.arena.draw(renderState, { hud: false, cinematic: false });
      this.arena.skipResult = false;
      const camera = this.view.camera ? s.camera : { x:450,y:450,zoom:1 }, size = this.arenaCanvas.width;
      const crop = size / camera.zoom;
      g.drawImage(this.arenaCanvas, (camera.x + 18) / 936 * size - crop / 2, (camera.y + 18) / 936 * size - crop / 2,
        crop, crop, l.x, l.y, l.size, l.size);
      if (!final && r.phase === 'ended') {
        g.save(); g.translate(l.x + l.size * 18 / 936, l.y + l.size * 18 / 936); g.scale(l.size / 936, l.size / 936);
        this.arena._result(g, r); g.restore();
      }
      if (final) this.finale(g);
      else this.workshopPanel(g);
      if (!this.view.hud) return;
      const clock = final ? 'END' : EBS.util.fmtTime(Math.ceil(Math.max(0, r.duration - r.t)));
      const roundLabel = s.cfg.episodeMode === 'tournament' ? `ROUND ${s.roundNumber}/8${s.roundNumber === 8 ? ' · FINAL' : ''}` : `ROUND ${String(s.roundNumber).padStart(2, '0')}`;
      const arenaName = EBS.ScrapRules.arenas[s.cfg.arena].name;
      const status = s.phase === 'running' ? `${r.robots.filter(x => x.alive).length} BOTS ALIVE  /  ${r.stats.destroyed} COVER LOST`
        : s.phase === 'pause' ? `NEXT ROUND IN ${Math.ceil((s.pauseUntil - s.step) / 60)}s` : 'MATCH COMPLETE';
      if (l.kind === 'portrait') {
        text(g, 'SCRAP WARS', 54, 106, 56);
        text(g, roundLabel, 56, 177, 30, '#f0bf7b');
        text(g, clock, 1024, 173, 52, '#dde9e9', 'right');
        text(g, arenaName, 56, 211, 18, '#8da7b6');
        this.card(g, r.robots[0], 54, 244, 468, 156);
        this.card(g, r.robots[1], 558, 244, 468, 156);
        this.card(g, r.robots[3], 54, 1468, 468, 156);
        this.card(g, r.robots[2], 558, 1468, 468, 156);
        text(g, status, 540, 1680, 28, '#c9d9dd', 'center');
        this.scores(g, 58, 1748, 980, true);
      } else if (l.kind === 'landscape') {
        text(g, 'SCRAP WARS', 46, 92, 49);
        text(g, `${arenaName} · FOUR CONTENDERS`, 48, 139, 17, '#8da7b6');
        text(g, roundLabel, 50, 252, 26, '#f0bf7b');
        text(g, clock, 46, 323, 68);
        this.scores(g, 52, 480, 340, false);
        text(g, s.phase === 'running' ? `${r.robots.filter(x => x.alive).length} BOTS ALIVE` : 'ROUND COMPLETE', 52, 914, 25, '#d4e4e6');
        text(g, s.phase === 'pause' ? `NEXT ROUND IN ${Math.ceil((s.pauseUntil - s.step) / 60)}s` : `${r.stats.destroyed} COVER LOST`, 52, 955, 21, '#91a9b5');
        text(g, 'CONTENDERS', 1516, 92, 22, '#91a9b5');
        r.robots.forEach((robot, i) => this.card(g, robot, 1496, 144 + i * 216, 376, 182));
      } else {
        text(g, 'SCRAP WARS', 40, 60, 48);
        text(g, `${roundLabel}  /  ${clock}`, 1040, 60, 26, '#f0bf7b', 'right');
        r.robots.forEach((robot, i) => this.card(g, robot, 24 + i * 264, 900, 240, 132, true));
        text(g, status, 540, 133, 24, '#b4c5ca', 'center');
      }
    }
    paintMaterialArena(g) {
      const s=this.sim,r=s.roundSim,l=this.layout,art=EBS.ScrapMaterialArt,portrait=l.kind==='portrait';
      const final=s.cfg.episodeMode==='tournament'&&s.completedRounds===8;
      const elapsed=s.phase==='pause'?s.cfg.endPauseSec-(s.pauseUntil-s.step)/60:final?Math.max(0,5-(s.outroUntil-s.step)/60):0;
      const mapPoint=p=>portrait?{...p,x:r.bounds.h-p.y,y:p.x,
        ...('vx' in p?{vx:-p.vy,vy:p.vx}:{}),...('angle' in p?{angle:p.angle+Math.PI/2}:{}),
        ...('px' in p?{px:r.bounds.h-p.py,py:p.px}:{})}:p;
      const robots=r.robots.map(mapPoint),effects=r.effects.slice(-100).map(e=>({...mapPoint(e),age:e.age+elapsed}));
      const blocks=portrait?r.blocks.map(b=>({...b,x:r.bounds.h-b.y-b.h,y:b.x,w:b.h,h:b.w})):r.blocks;
      const c=this.view.camera?s.camera:{x:r.bounds.w/2,y:r.bounds.h/2,zoom:1};
      const cx=portrait?r.bounds.h-c.y:c.x,cy=portrait?c.x:c.y;
      g.fillStyle='#10191f';g.fillRect(0,0,this.world.w,this.world.h);
      g.save();box(g,l.x,l.y,l.width,l.height,16);g.clip();
      g.translate(l.x+l.width/2,l.y+l.height/2);g.scale(l.scale*c.zoom,l.scale*c.zoom);g.translate(-cx,-cy);
      g.lineCap='round';g.lineJoin='round';g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
      const sunny=s.cfg.arena==='sunshine',floorKey=`${r.seed}:${l.arenaW}:${l.arenaH}:${s.cfg.arena}`;
      if(this.materialFloorKey!==floorKey) {this.materialFloor=art.floor(r.seed,l.arenaW,l.arenaH,sunny);this.materialFloorKey=floorKey;}
      g.drawImage(this.materialFloor,0,0,l.arenaW,l.arenaH);
      if(sunny)for(const b of blocks)if(b.alive) {
        const t=art.block(b,this.arena._blocks,true);g.drawImage(t.shadow,b.x-t.pad,b.y-t.pad,t.width,t.height);
      }
      for(const b of blocks)if(!b.alive)art.rubble(g,b,sunny);
      r.pads.forEach((p,i)=>sunny?art.sunnyPad(g,mapPoint(p)):this.arena._pad(g,mapPoint(p),r.t,i));
      for(const e of effects)this.arena._effect(g,e,true);
      for(const p of r.pickups)this.arena._pickup(g,mapPoint(p),r.t);
      for(const b of blocks)if(b.alive) {
        const t=art.block(b,this.arena._blocks,sunny);g.drawImage(t.canvas,b.x-t.pad,b.y-t.pad,t.width,t.height);
      }
      for(const robot of [...robots.filter(p=>!p.alive),...robots.filter(p=>p.alive)])this.arena._robot(g,robot,r.t);
      for(const p of r.projectiles)this.arena._projectile(g,mapPoint(p));
      for(const e of effects)this.arena._effect(g,e);
      g.restore();
      if(final)this.finale(g);
      else if(r.phase==='ended') {
        const winner=r.robots.find(p=>p.id===r.winner),xx=l.x+l.width/2,yy=l.y+l.height/2;
        box(g,xx-260,yy-62,520,124,12);g.fillStyle='#101e29ed';g.fill();g.strokeStyle=winner?colorOf(winner):'#c2c9c6';g.lineWidth=2;g.stroke();
        text(g,winner?`${winner.name} WINS`:'DRAW',xx,yy-13,34,winner?colorOf(winner):'#d1d9d5','center');
        text(g,s.phase==='pause'?`NEXT ROUND IN ${Math.ceil((s.pauseUntil-s.step)/60)}s`:'ROUND COMPLETE',xx,yy+30,17,'#aabfc8','center');
        this.workshopPanel(g);
      }
      if(this.view.hud)this.materialHud(g,final);
    }
    materialHud(g,final) {
      const s=this.sim,r=s.roundSim,portrait=this.layout.kind==='portrait',wide=this.world.w>1500;
      const round=s.cfg.episodeMode==='tournament'?`ROUND ${s.roundNumber}/8`:`ROUND ${String(s.roundNumber).padStart(2,'0')}`;
      const clock=final?'END':EBS.util.fmtTime(Math.ceil(Math.max(0,r.duration-r.t)));
      text(g,'SCRAP WARS',24,27,24,'#edf1e5');
      text(g,EBS.ScrapRules.arenas[s.cfg.arena].name,25,52,12,'#a1b2b9');
      text(g,round,wide?240:this.world.w-210,26,19,'#dec598');
      text(g,clock,wide?436:this.world.w-24,26,22,'#edf1e5','right');
      const legendX=wide?240:this.world.w-326;
      ['wood','stone','concrete'].forEach((key,i)=>{
        const m=EBS.ScrapMaterials.materials[key],x=legendX+i*72;
        box(g,x,46,9,9,1);g.fillStyle=s.cfg.arena==='sunshine'?EBS.ScrapMaterialArt.sunnyColors[key]:m.color;g.fill();text(g,m.name,x+14,51,10,'#9caeb6');
      });
      const start=wide?480:12,y=wide?9:70,gap=12,ww=(this.world.w-start-12-gap*3)/4;
      r.robots.forEach((robot,i)=>{
        const x=start+i*(ww+gap),color=robot.alive?colorOf(robot):'#66777e';
        box(g,x,y,ww,54,6);g.fillStyle='#1b2a32';g.fill();
        g.fillStyle=color;g.fillRect(x,y+10,3,30);
        text(g,robot.name,x+13,y+17,wide?17:16,color);
        text(g,`${s.wins[robot.id]} W`,x+ww-12,y+17,14,color,'right');
        const weapon=robot.weapon,info=!robot.alive?'OUT':weapon?`${weapon.kind==='rocket'?'RKT':'BLST'} ${weapon.ammo}`:'SEARCH';
        text(g,info,x+ww-12,y+35,11,'#a9bac1','right',600);
        const barWidth=ww-98;
        box(g,x+13,y+32,barWidth,5,2);g.fillStyle='#0b141b';g.fill();
        if(robot.alive) {box(g,x+13,y+32,barWidth*robot.hp/robot.maxHp,5,2);g.fillStyle=color;g.fill();}
        if(s.cfg.workshop) {
          const key=robot.module||s.workshop.modules[robot.id];
          text(g,key?EBS.ScrapRules.modules[key].name:`${s.workshop.balances[robot.id]}/4`,x+13,y+46,8,'#c8ba92','left',600);
        }
      });
    }
    destroy() { this.materialFloor=null;this.arena.destroy(); this.arenaCanvas.width = this.arenaCanvas.height = 1; super.destroy(); }
  }
  EBS.registerScenario({
    id: 'scrap', title: 'Scrap Wars',
    supportsClips: true,
    supportsCamera: false,
    defaults: { rulesVersion: 'v3', episodeMode: 'endless', arena: 'yard', workshop: false, repeatRounds: true, endPauseSec: 3 },
    controls: [
      { key: 'episodeMode', label: 'Format', type: 'select', options: [['endless', 'Freie Videolänge'], ['tournament', 'Turnier · 8 Runden + Finale']], restart: true },
      { key: 'rulesVersion', label: 'Arena / Kampfregeln', type: 'select', enabled: p => p.arena !== 'sunshine', options: [['v3', 'Große Arena · Holz, Stein, Beton'], ['v2', 'Bisherige Arena · flüssiger Kampf'], ['classic', 'Originalprototyp']], restart: true },
      { key: 'arena', label: 'Arena', type: 'select', options: [['yard', 'Scrapyard · ausgewogen'], ['foundry', 'Foundry · Deckungsgassen'], ['crossroads', 'Crossroads · offenes Zentrum'], ['sunshine', 'Sunny Yard · Tageslicht / Deckungsgassen']], restart: true },
      { key: 'workshop', label: 'Werkstatt (experimentell, ein Modul je Roboter)', type: 'check', enabled: p => p.episodeMode === 'tournament', restart: true },
      { key: 'repeatRounds', label: 'Weitere Runden spielen', type: 'check', enabled: p => p.episodeMode !== 'tournament', restart: true },
      { key: 'endPauseSec', label: 'Ergebnis zeigen', type: 'range', min: 2, max: 8, step: 1, restart: true, format: v => `${v} s` },
    ],
    normalizeParams,
    hasNaturalDuration: cfg => cfg.params.episodeMode === 'tournament',
    createExportPlan: EBS.Scrap.createExportPlan,
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
    // Short combat transients recover sooner; Marble/Naval retain their 60 ms release.
    audio: { ceilingDb: -3, limiterReleaseMs: 20, events: {
      blaster: { label: 'Blaster', samples: ['synth:scrap-blaster'], gain: .60, detune: .7, minGap: .055 },
      rocket: { label: 'Raketenstart', samples: ['synth:scrap-rocket'], gain: .60, detune: .4 },
      hit: { label: 'Robotertreffer', samples: ['impactMetal_light_000', 'impactMetal_light_001'], gain: .09, ref: 6, detune: 1, minGap: .07 },
      cover_hit: { label: 'Deckungstreffer', samples: ['impactPlate_light_000'], gain: .045, ref: 19, detune: 1, minGap: .09,
        variant: 'material', variants: {
          wood: { samples: ['impactWood_medium_000', 'impactWood_medium_001'] },
          stone: { samples: ['synth:scrap-stone-hit'], gain: .23 },
          concrete: { samples: ['synth:scrap-concrete-hit'], gain: .27 },
        } },
      blast: { label: 'Explosion', samples: ['synth:scrap-blast'], gain: .50, semis: 2, minGap: .10 },
      break: { label: 'Deckung zerstört', samples: ['impactWood_heavy_000'], gain: .12, detune: .8, minGap: .055,
        variant: 'material', variants: {
          wood: { samples: ['impactWood_heavy_000'] },
          stone: { samples: ['synth:scrap-stone-break'], gain: .32 },
          concrete: { samples: ['synth:scrap-concrete-break'], gain: .38 },
        } },
      pickup: { label: 'Waffenaufnahme', samples: ['synth:scrap-pickup'], gain: .22 },
      upgrade: { label: 'Werkstattmodul', samples: ['synth:scrap-pickup'], gain: .28, semis: -2, minGap: .12 },
      drop: { label: 'Waffenabwurf', samples: ['impactTin_medium_000'], gain: .08, detune: .8 },
      ko: { label: 'Roboter ausgeschaltet', samples: ['impactMetal_light_003'], gain: .18, semis: -5 },
    } },
  });
})();
