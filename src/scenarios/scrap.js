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
  // Stateless art variation: never consume the combat generator.
  const noise = (seed, i) => {
    let n = Math.imul(seed + 1, 374761393) ^ Math.imul(i + 1, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const rgba = (color, alpha) => {
    const c = parseInt(color.slice(1), 16);
    return `rgba(${c >> 16 & 255},${c >> 8 & 255},${c & 255},${Math.max(0, Math.min(1, alpha))})`;
  };
  const stroke = (g, x, y, xx, yy, color, width = 1) => {
    g.beginPath(); g.moveTo(x, y); g.lineTo(xx, yy); g.strokeStyle = color; g.lineWidth = width; g.stroke();
  };
  const glow = (g, x, y, radius, color, alpha) => {
    if (radius <= 0 || alpha <= 0) return;
    const gradient = g.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, rgba(color, alpha)); gradient.addColorStop(.45, rgba(color, alpha * .6));
    gradient.addColorStop(1, rgba(color, 0)); g.fillStyle = gradient;
    g.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  };
  class ArenaRenderer extends ScrapArena.Renderer {
    _scorchEvents() {
      const s = this.episode, marks = [];
      if (!s) return marks;
      for (let i = s.events.length - 1; i >= 0 && marks.length < 24; i--) {
        const e = s.events[i];
        if (e.round < s.roundNumber) break;
        if (e.round === s.roundNumber && (e.type === 'blast' || e.type === 'ko')) marks.push(e);
      }
      return marks.reverse();
    }
    _drawScorches(g, mapPoint = p => p, marks = this._scorchEvents()) {
      if (!marks.length) return;
      this._scorchTextures ||= new Map();
      for (const e of marks) {
        const key = `${e.roundSeed}:${e.seq}:${this.sunny}`;
        let texture = this._scorchTextures.get(key);
        if (!texture) {
          const radius = e.type === 'ko' ? 28 : 22, pad = 40;
          texture = document.createElement('canvas'); texture.width = texture.height = pad * 4;
          const ctx = texture.getContext('2d'); ctx.scale(2, 2); ctx.translate(pad, pad);
          const color = this.sunny ? '#2a2620' : '#0a0c0d';
          ctx.save();
          path(ctx, Array.from({ length: 15 }, (_, i) => {
            const a = i / 15 * Math.PI * 2, r = radius * (.8 + noise(e.seq, i) * .4);
            return [Math.cos(a) * r, Math.sin(a) * r];
          }));
          ctx.clip(); glow(ctx, 0, 0, radius * 1.2, color, 1); ctx.restore();
          for (let i = 0; i < 7; i++) {
            const a = noise(e.seq, i + 20) * Math.PI * 2, d = radius * (.6 + noise(e.seq, i + 40) * .6);
            stroke(ctx, Math.cos(a) * d * .5, Math.sin(a) * d * .5, Math.cos(a) * d,
              Math.sin(a) * d, rgba(color, .18 / .38), 1.4);
          }
          if (this._scorchTextures.size >= 48) this._scorchTextures.clear();
          this._scorchTextures.set(key, texture);
        }
        // The killing hit can end the round at age zero. Global video ticks
        // keep its fade-in moving even while the round's physics is frozen.
        const age = Math.max(0, (this.episode.step - e.step) / 60) * this.episode.timeScale;
        const p = mapPoint({ x: e.arenaX, y: e.arenaY });
        g.save(); g.globalAlpha = Math.min(1, age / .15) * (.38 - .10 * Math.min(1, age / 15)) * (this.sunny ? .65 : 1);
        g.drawImage(texture, p.x - 40, p.y - 40, 80, 80); g.restore();
      }
    }
    _getFloor(seed, scale) {
      const base = super._getFloor(seed, scale), marks = this._scorchEvents();
      if (!marks.length) return base;
      // The archived draw path has no floor hook. Composite a disposable view
      // of its cached floor so scars stay BELOW rubble, supplies and robots.
      this._scorchedFloor ||= document.createElement('canvas');
      const c = this._scorchedFloor;
      if (c.width !== base.width || c.height !== base.height) { c.width = base.width; c.height = base.height; }
      const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.drawImage(base, 0, 0);
      g.save(); g.scale(c.width / 940, c.height / 940); g.translate(20, 20); this._drawScorches(g, p => p, marks); g.restore();
      return c;
    }
    _pickup(g, p, t) {
      if (this.sunny) { EBS.ScrapDaylightArt.pickup(g, p, t, this); return; }
      if (!this.materialArena) { super._pickup(g, p, t); return; }
      const empty = !!p.empty || p.ammo <= 0, color = p.kind === 'rocket' ? '#eeb779' : '#7cdbef';
      const { sprite, shadow } = this._pickupTexture(p.kind, empty), angle = (noise(p.id, 13) - .5) * 1.5;
      g.save(); g.translate(p.x, p.y);
      if (empty) g.globalAlpha = .5 - .2 * Math.max(0, Math.min(1, (p.age || 0) / (p.ttl || 3)));
      else for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + .16;
        g.beginPath(); g.arc(0, 0, 24, a, a + .4); g.strokeStyle = rgba(color, .55); g.lineWidth = 1.3; g.stroke();
      }
      // Offset in arena coordinates first: every silhouette casts the same
      // down-right shadow, independent of the weapon's orientation.
      g.save(); g.translate(3, 5); g.rotate(angle); g.drawImage(shadow, -32, -32, 64, 64); g.restore();
      g.save(); g.rotate(angle); g.drawImage(sprite, -32, -32, 64, 64); g.restore();
      if (!empty) {
        box(g, -10, 18, 20, 10, 2); g.fillStyle = '#0b1721'; g.fill();
        text(g, Math.max(0, Math.ceil(p.ammo)), 0, 23, 7, color, 'center');
      }
      g.restore();
    }
    _pickupTexture(kind, empty) {
      this._pickupTextures ||= new Map();
      const key = `${kind}:${empty}`;
      if (this._pickupTextures.has(key)) return this._pickupTextures.get(key);
      const source = document.createElement('canvas'); source.width = source.height = 128;
      const ctx = source.getContext('2d'); ctx.scale(2, 2); ctx.translate(18, 31);
      this._weapon(ctx, kind, !empty, kind === 'rocket' ? '#eeb779' : '#7cdbef', true);
      const sprite = document.createElement('canvas'); sprite.width = sprite.height = 128;
      const sg = sprite.getContext('2d'); if (empty) sg.filter = 'grayscale(1)'; sg.drawImage(source, 0, 0);
      const mask = document.createElement('canvas'); mask.width = mask.height = 128;
      const mg = mask.getContext('2d'); mg.drawImage(sprite, 0, 0); mg.globalCompositeOperation = 'source-in';
      mg.fillStyle = rgba('#03090e', .45); mg.fillRect(0, 0, 128, 128);
      const shadow = document.createElement('canvas'); shadow.width = shadow.height = 128;
      const bg = shadow.getContext('2d'); bg.filter = 'blur(3px)'; bg.drawImage(mask, 0, 0);
      const result = { sprite, shadow }; this._pickupTextures.set(key, result); return result;
    }
    _labelLayout(robots, width, height) {
      const labels = [], h = 16.5, margin = 18;
      const overlaps = (a, b) => a.x < b.x + 60 && a.x + 60 > b.x && a.y < b.y + h + 2 && a.y + h + 2 > b.y;
      // Sorting a copy keeps this pass independent of draw history and physics.
      for (const robot of robots.filter(r => r.alive !== false && r.hp > 0).slice().sort((a, b) => a.y - b.y || a.id - b.id)) {
        const radius = Math.max(12, robot.r || 24), x = Math.max(margin, Math.min(width - margin - 58, robot.x - 29));
        const top = robot.y - radius - 6 - h, bottom = robot.y + radius + 10;
        const candidates = [top, bottom, top - 20, bottom + 20, top - 40, bottom + 40];
        let y = candidates.find(yy => yy >= margin && yy + h <= height - margin && !labels.some(b => overlaps({ x, y: yy }, b)));
        if (y === undefined) y = Math.max(margin, Math.min(height - margin - h, top));
        labels.push({ robot, x, y, width: 58, height: h, below: y > robot.y,
          ammoY: y > robot.y ? y + h + 4 : robot.y + radius + 12 });
      }
      return labels;
    }
    _labels(g, robots, width, height) {
      const labels = this._labelLayout(robots, width, height);
      g.save();
      // Magazine pips stay below the machine; a lower nameplate moves them
      // beneath that plate so the two indicators never occupy the same row.
      for (const { robot, ammoY } of labels) if (robot.weapon) {
        const rocket = robot.weapon.kind === 'rocket', max = Math.max(1, robot.weapon.maxAmmo || (rocket ? 2 : 12));
        const count = Math.min(12, max), n = Math.max(0, Math.min(1, robot.weapon.ammo / max)) * count;
        const gap = (rocket ? 4 : 1.8) * .8, wide = (rocket ? 9 : 3) * .8, total = count * wide + (count - 1) * gap;
        for (let i = 0; i < count; i++) {
          box(g, robot.x - total / 2 + i * (wide + gap), ammoY, wide, 3.2, .8);
          g.fillStyle = i < n ? (rocket ? '#f1b773' : '#bbdee7') : '#273b47'; g.fill();
        }
      }
      for (const { robot, x, y } of labels) {
        const color = colorOf(robot), hp = Math.max(0, Math.min(1, robot.hp / Math.max(1, robot.maxHp)));
        box(g, x, y, 58, 13, 3); g.fillStyle = rgba('#0c1820', .88); g.fill();
        text(g, robot.name, x + 29, y + 6.5, 9, color, 'center', 800);
        box(g, x + 5, y + 13, 48, 3.5, 1.2); g.fillStyle = '#050c11'; g.fill();
        if (hp > 0) {
          box(g, x + 5, y + 13, 48 * hp, 3.5, Math.min(1.2, 24 * hp));
          g.fillStyle = hp < .25 ? '#f48562' : color; g.fill();
        }
      }
      g.restore();
    }
    draw(round, options) {
      // The archived path calls _result after all effects, providing the same
      // final label pass for Classic/V2 without editing the archived renderer.
      this._sourceLabelPass = true;
      try { super.draw(round, options); } finally { this._sourceLabelPass = false; }
    }
    _bodyTexture(color, dead = false, stage = 0) {
      const id = Math.max(0, palette.indexOf(color));
      stage = dead ? 2 : Math.max(0, Math.min(2, stage));
      const key = `painted-p3:${color}:${dead ? 'wreck' : stage}`;
      if (this._bodies.has(key)) return this._bodies.get(key);
      const blend = (a, b, amount) => {
        const aa = parseInt(a.slice(1), 16), bb = parseInt(b.slice(1), 16);
        return '#' + [16, 8, 0].map(shift => Math.round(((aa >> shift) & 255) * (1 - amount)
          + ((bb >> shift) & 255) * amount).toString(16).padStart(2, '0')).join('');
      };
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 416;
      const g = canvas.getContext('2d'); g.scale(4, 4); g.translate(52, 52);
      const accent = dead ? blend(color, '#1c2226', .75) : color;
      // Each silhouette keeps its original nose and rear shape. The narrower
      // hull exposes eight units of track without changing the physical body.
      for (const y of [-29, 19]) {
        g.save();
        if (dead && y > 0) g.translate(3, 3);
        box(g, -27, y, 50, 10, 4); g.fillStyle = '#141c22'; g.fill();
        g.strokeStyle = '#0a1015'; g.lineWidth = 1.5; g.stroke();
        for (let x = -24; x < 22; x += 5) stroke(g, x, y + 1.3, x, y + 8.7, '#34434d', 2);
        for (const x of [-23, 19]) {
          circle(g, x, y + 5, 4); g.fillStyle = '#26333c'; g.fill();
          circle(g, x, y + 5, 1.5); g.fillStyle = '#45535d'; g.fill();
        }
        stroke(g, -22, y + 1, 18, y + 1, rgba('#6c7e88', dead ? .3 : .6), .8);
        g.restore();
      }
      const shapes = [
        [[-25,-16],[-15,-23],[13,-21],[27,-8],[27,8],[13,21],[-15,23],[-25,16]],
        [[-27,-9],[-17,-23],[9,-23],[25,-12],[25,12],[9,23],[-17,23],[-27,9]],
        [[-23,-23],[17,-23],[25,-15],[25,15],[17,23],[-23,23]],
        [[-24,-12],[-12,-24],[12,-24],[24,-12],[24,12],[12,24],[-12,24],[-24,12]],
      ];
      const hull = shapes[id].map(([x, y]) => [x, y * 21 / 24]);
      g.save(); g.translate(1.5, 2.5); path(g, hull); g.fillStyle = '#132029'; g.fill(); g.restore();
      path(g, hull);
      const paint = g.createLinearGradient(-24, -22, 24, 24);
      paint.addColorStop(0, blend(accent, '#ffffff', dead ? .06 : .18));
      paint.addColorStop(.35, accent); paint.addColorStop(.7, accent);
      paint.addColorStop(1, blend(accent, '#0d1a22', .35));
      g.fillStyle = paint; g.fill(); g.strokeStyle = '#0a1218'; g.lineWidth = 2.5; g.stroke();
      // Narrow bevels replace the old white wash over the entire body.
      for (let i = 0; i < hull.length; i++) {
        const a = hull[i], b = hull[(i + 1) % hull.length], dx = b[0] - a[0], dy = b[1] - a[1];
        const light = dx - dy > 0;
        stroke(g, a[0] * .97, a[1] * .97, b[0] * .97, b[1] * .97,
          light ? blend(accent, '#ffffff', dead ? .12 : .45) : blend(accent, '#0d1a22', .55), 1);
      }
      // Existing identifying motifs: Ember intake, Azure windows, Amber warning
      // plates and Moss ring. Their placement follows the reduced hull height.
      if (id === 0) {
        path(g, [[-18,-14],[-6,-14],[14,0],[-6,14],[-18,14],[-1,0]]);
        g.fillStyle = dead ? '#3e3031' : '#722d30'; g.fill();
      }
      if (id === 1) for (const y of [-16, 11]) {
        box(g, -15, y, 27, 5, 2); g.fillStyle = dead ? '#506067' : '#b2dde1'; g.fill();
        stroke(g, -13, y + 1, 9, y + 1, dead ? '#647174' : '#d2f7fa', .7);
      }
      if (id === 2) for (const y of [-19, 12]) {
        g.fillStyle = dead ? '#383529' : '#58401e'; g.fillRect(-19, y, 37, 7);
        g.fillStyle = accent; g.fillRect(-11, y, 7, 7); g.fillRect(8, y, 7, 7);
      }
      if (id === 3) {
        circle(g, -4, 0, 17); g.strokeStyle = dead ? '#364431' : '#3b642f'; g.lineWidth = 4; g.stroke();
      }
      for (const sign of [-1, 1]) {
        g.beginPath(); g.moveTo(-19, sign * 10); g.lineTo(-10, sign * 12); g.lineTo(12, sign * 10);
        g.strokeStyle = rgba('#000000', .3); g.lineWidth = 1; g.stroke();
      }
      for (const y of [-6, 0, 6]) stroke(g, -23, y, -16, y + 1, '#132431', 2);
      circle(g, -5, 0, 12); g.fillStyle = '#152936'; g.fill();
      g.strokeStyle = dead ? '#596565' : '#b9cac9'; g.lineWidth = 1.2; g.stroke();
      circle(g, -5, 0, 7.5); g.fillStyle = accent; g.fill();
      if (!dead) { circle(g, -7, -3, 2.7); g.fillStyle = '#fffbe2'; g.fill(); }
      for (const [x, y] of [[-17,-15],[-17,15],[13,-13],[13,13]]) {
        circle(g, x, y, 1.6); g.fillStyle = dead ? '#717b7c' : '#d8e5e7'; g.fill();
        stroke(g, x - .7, y, x + .7, y, '#43525a', .6);
      }
      box(g, 19, -8, 7, 16, 2); g.fillStyle = '#263a45'; g.fill();
      g.fillStyle = dead ? '#53605f' : '#d9e5d7'; g.fillRect(24, -4, 2, 8);
      if (stage >= 1) {
        for (let i = 0; i < 2; i++) {
          const x = -14 + noise(id + 61, i) * 23, y = -12 + noise(id + 67, i) * 24;
          g.beginPath(); g.ellipse(x, y, 3, 2, -.2, 0, Math.PI * 2);
          g.fillStyle = blend(accent, '#0d1a22', .4); g.fill();
          stroke(g, x - 2, y + 1.6, x + 2, y + 1.6, blend(accent, '#ffffff', .3), .7);
        }
        for (let i = 0; i < (stage === 2 ? 7 : 4); i++) {
          const x = -20 + noise(id + 79, i) * 31, y = -14 + noise(id + 83, i) * 27;
          const length = 5 + noise(id + 89, i) * 4;
          stroke(g, x, y, x + Math.cos(.35) * length, y + Math.sin(.35) * length, rgba('#d9e2e4', dead ? .35 : .8), 1);
        }
      }
      if (stage === 2) {
        glow(g, dead ? -2 : -15, dead ? 0 : 4, dead ? 25 : 10, '#12161a', dead ? .72 : .55);
        box(g, -23, 8, 16, 9, 2); g.fillStyle = '#281c19'; g.fill();
        path(g, [[-23,8],[-20,4],[-7,7],[-7,10]]); g.fillStyle = blend(accent, '#0d1a22', .3); g.fill();
        g.strokeStyle = '#152027'; g.lineWidth = .8; g.stroke();
        stroke(g, -21, 11, -13, 15, dead ? '#87644a' : '#eaa56a', 1.4);
        stroke(g, -13, 15, -9, 10, dead ? '#87644a' : '#eaa56a', 1.4);
      }
      // Cache a soft silhouette as well. Rotation happens at draw time while
      // the lighting offset stays in arena coordinates, never in robot space.
      const mask = document.createElement('canvas'); mask.width = mask.height = 416;
      const mg = mask.getContext('2d'); mg.drawImage(canvas, 0, 0);
      mg.globalCompositeOperation = 'source-in'; mg.fillStyle = rgba('#03090e', .6); mg.fillRect(0, 0, 416, 416);
      const shadow = document.createElement('canvas'); shadow.width = shadow.height = 416;
      const sg = shadow.getContext('2d'); sg.filter = 'blur(16px)'; sg.drawImage(mask, 0, 0);
      canvas.scrapShadow = shadow;
      this._bodies.set(key, canvas); return canvas;
    }
    _weapon(g, kind, loaded, color = '#84c9df', miniature = false) {
      if (kind !== 'rocket') { super._weapon(g, kind, loaded, color, miniature); return; }
      g.save(); if (miniature) g.scale(.65, .65);
      box(g, 8, -9, 11, 18, 3); g.fillStyle = '#263841'; g.fill();
      g.strokeStyle = '#0a1218'; g.lineWidth = 1; g.stroke();
      g.fillStyle = color; g.fillRect(10, -7, 2, 14);
      for (const y of [-9, 2]) {
        box(g, 17, y, 22, 7, 2);
        const metal = g.createLinearGradient(0, y, 0, y + 7);
        metal.addColorStop(0, '#5c6a70'); metal.addColorStop(1, '#2c383e');
        g.fillStyle = metal; g.fill(); g.strokeStyle = '#0a1218'; g.lineWidth = 1; g.stroke();
        stroke(g, 19, y + 1, 35, y + 1, '#91a1a5', .7);
        box(g, 36, y - .5, 4, 8, 1.2); g.fillStyle = '#1a272f'; g.fill();
        box(g, 37, y + 1, 2, 5, .7); g.fillStyle = '#0b0f12'; g.fill();
        if (loaded) { g.strokeStyle = '#d88459'; g.lineWidth = .8; g.stroke(); }
        stroke(g, 21, y + .5, 21, y + 6.5, '#24323a', 1.2);
      }
      box(g, 23, -2, 8, 4, 1); g.fillStyle = '#34464e'; g.fill();
      g.restore();
    }
    _robot(g, robot, t) {
      const finite = (v, fallback = 0) => Number.isFinite(v) ? v : fallback;
      const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
      const color = colorOf(robot), dead = robot.alive === false || finite(robot.hp, 1) <= 0;
      const speed = Math.hypot(finite(robot.vx), finite(robot.vy));
      const chassisAngle = speed > 8 ? Math.atan2(robot.vy, robot.vx) : finite(robot.angle);
      const aim = finite(robot.angle), radius = Math.max(12, finite(robot.r, 24)), bodyScale = radius / 24;
      const stage = dead ? 2 : damageStage(robot), body = this._bodyTexture(color, dead, stage);
      g.save(); g.translate(finite(robot.x), finite(robot.y));
      if (!dead) glow(g, 0, 5, 40 * bodyScale, color, .10);
      g.save(); g.translate(5 * bodyScale, 8 * bodyScale); g.rotate(chassisAngle); g.scale(bodyScale, bodyScale);
      g.drawImage(body.scrapShadow, -52, -52, 104, 104); g.restore();
      g.save(); g.rotate(chassisAngle); g.scale(bodyScale, bodyScale);
      g.drawImage(body, -52, -52, 104, 104);
      if (!dead && speed > 8) {
        const travel = (((finite(robot.x) + finite(robot.y)) * .28) % 5 + 5) % 5;
        for (const y of [-28, 20]) for (let x = -22; x < 17; x += 5)
          stroke(g, x + travel, y, x + travel, y + 6, rgba('#a8bcc4', .28), .7);
      }
      if (robot.module) {
        // Attachments use exactly the chassis rotation (including at rest),
        // rather than atan2(0, 0), and sit beside the newly exposed tracks.
        if (dead) g.globalAlpha = .5;
        if (robot.module === 'plating') {
          path(g, [[-27,-13],[-20,-17],[-20,17],[-27,13]]); g.fillStyle = '#d6e0df'; g.fill();
        } else if (robot.module === 'drive') {
          for (const y of [-24, 24]) { box(g, -27, y - 4, 13, 8, 2); g.fillStyle = '#8fe0e5'; g.fill(); }
        } else {
          box(g, -29, -8, 10, 16, 3); g.fillStyle = '#ffce63'; g.fill();
          g.fillStyle = '#394452'; g.fillRect(-27, -4, 6, 8);
        }
        g.globalAlpha = 1;
      }
      g.restore();
      if (!dead && robot.weapon) {
        g.save(); g.rotate(aim); g.scale(bodyScale, bodyScale);
        circle(g, 7, 0, 10.5);
        const mount = g.createLinearGradient(-4, -12, 16, 12);
        mount.addColorStop(0, '#93a6af'); mount.addColorStop(.32, '#536c7b'); mount.addColorStop(1, '#1a303f');
        g.fillStyle = mount; g.fill(); g.strokeStyle = '#122431'; g.lineWidth = 1.3; g.stroke();
        const recoil = clamp((finite(robot.flashUntil) - t) * 32, 0, 4); g.translate(-recoil, 0);
        this._weapon(g, robot.weapon.kind, robot.weapon.ammo > 0, color);
        circle(g, 6, 0, 5.5); g.fillStyle = '#293f4c'; g.fill();
        circle(g, 6, 0, 2.1); g.fillStyle = '#7e9098'; g.fill(); stroke(g, 4.9, 0, 7.1, 0, '#1c2c36', .8);
        if (robot.flashUntil > t) {
          const rocket = robot.weapon.kind === 'rocket', muzzle = rocket ? 40 : 47;
          const length = 9 + clamp((robot.flashUntil - t) * 100, 0, 14);
          g.globalCompositeOperation = 'screen';
          path(g, [[muzzle,-3],[muzzle+8,-6],[muzzle+5+length,0],[muzzle+8,6],[muzzle,3]]);
          g.fillStyle = rocket ? '#ffd0a0' : '#d8f6ff'; g.fill();
          glow(g, muzzle + 2, 0, 23, rocket ? '#ffb15c' : '#81d9ee', .34);
        }
        g.restore();
      } else {
        g.save(); g.rotate(aim); g.scale(bodyScale, bodyScale);
        circle(g, 7, 0, 9); g.fillStyle = '#22323c'; g.fill();
        g.strokeStyle = '#5d727d'; g.lineWidth = 1.2; g.stroke();
        for (let i = 0; i < 4; i++) {
          const a = Math.PI / 4 + i * Math.PI / 2;
          circle(g, 7 + Math.cos(a) * 6.2, Math.sin(a) * 6.2, 1.2); g.fillStyle = '#0b151c'; g.fill();
        }
        if (!dead) { circle(g, 7, 0, 2.5); g.fillStyle = '#3b4d58'; g.fill(); }
        g.restore();
      }
      const rearX = -14 * Math.cos(chassisAngle) * bodyScale, rearY = -14 * Math.sin(chassisAngle) * bodyScale;
      if (dead) {
        glow(g, -3, 0, 18, '#d38944', .08);
        // Global event ticks keep the six-second plume advancing in end pauses
        // and tournament finales, while roundSim.t is intentionally frozen.
        const episode = this.episode, events = episode?.events || [];
        let ko = null;
        for (let i = events.length - 1; i >= 0; i--) {
          const e = events[i];
          if (e.round < episode.roundNumber) break;
          if (e.type === 'ko' && e.round === episode.roundNumber && e.team === robot.id) { ko = e; break; }
        }
        const age = ko ? Math.max(0, (episode.step - ko.step) / 60) : Infinity;
        if (age < 6) for (let i = 0; i < 2; i++) {
          const phase = (age * .38 + i * .47) % 1, height = (16 + phase * 22) * bodyScale;
          const drift = Math.sin(age * 1.6 + i * 2.4) * 5 * bodyScale;
          const x = rearX + (i * 5 - 2.5) * bodyScale;
          g.beginPath(); g.moveTo(x, rearY - 1);
          g.bezierCurveTo(x - drift, rearY - height * .32, x + drift * 1.6, rearY - height * .7, x + drift, rearY - height);
          g.strokeStyle = rgba('#7e898f', .18 * Math.min(1, age / .15) * (1 - age / 6));
          g.lineWidth = (2 + phase * 1.2) * bodyScale; g.stroke();
        }
        g.restore(); return;
      }
      if (stage === 2) {
        for (let i = 0; i < 3; i++) {
          const age = (t * .7 + i / 3 + robot.id * .13) % 1;
          circle(g, rearX + Math.sin(age * 4 + i) * 5, rearY - 5 - age * 35, 4 + age * 9);
          g.fillStyle = rgba('#7e898f', (1 - age) * .28); g.fill();
        }
        const period = 1.1 + noise(robot.id + 97, 0) * .5, shifted = t + noise(robot.id + 101, 0) * period;
        const sparkAge = shifted % period;
        if (sparkAge < .12) {
          const u = sparkAge / .12, cycle = Math.floor(shifted / period);
          g.save(); g.globalCompositeOperation = 'screen';
          for (let i = 0; i < 3; i++) {
            const angle = -Math.PI + noise(robot.id + cycle, i + 109) * Math.PI;
            const x = rearX + Math.cos(angle) * (2 + 8 * u), y = rearY + Math.sin(angle) * (2 + 8 * u);
            stroke(g, x, y, x + Math.cos(angle) * 4, y + Math.sin(angle) * 4, rgba('#ffd38a', 1 - u), 1);
          }
          g.restore();
        }
      }
      if (robot.hurtUntil > t) {
        circle(g, 0, 0, radius + 7); g.strokeStyle = rgba('#ffe6cf', clamp((robot.hurtUntil - t) * 5, 0, .8));
        g.lineWidth = 2; g.stroke();
      }
      g.restore();
    }
    _projectile(g, p) {
      const a = Math.atan2(p.vy, p.vx), ux = Math.cos(a), uy = Math.sin(a);
      g.save();
      if (p.kind === 'rocket') {
        // Keep the source rocket silhouette, with eight denser smoke puffs.
        for (let k = 8; k > 0; k--) {
          const dist = 10 + k * 6, jitter = noise(p.id, k) * Math.PI * 2;
          circle(g, p.x - ux * dist + Math.sin(jitter) * k * .9, p.y - uy * dist + Math.cos(jitter) * k * .9, 2 + k * 1.3);
          g.fillStyle = `rgba(144,144,130,${(9 - k) * .016 * 1.6})`; g.fill();
        }
        glow(g, p.x - ux * 9, p.y - uy * 9, 19, '#ffb25b', .29);
        g.translate(p.x, p.y); g.rotate(a);
        path(g, [[-11,-3],[-21,0],[-11,3],[-5,0]]); g.fillStyle = '#ffbb62'; g.fill();
        path(g, [[-10,-1.5],[-16,0],[-10,1.5],[-6,0]]); g.fillStyle = '#fff1c3'; g.fill();
        path(g, [[-7,-3],[-10,-6],[-3,-4],[7,-3],[11,0],[7,3],[-3,4],[-10,6],[-7,3]]);
        const metal = g.createLinearGradient(0, -5, 0, 5);
        metal.addColorStop(0, '#d1d1b9'); metal.addColorStop(.5, '#8e9e9c'); metal.addColorStop(1, '#465e69');
        g.fillStyle = metal; g.fill(); path(g, [[6,-3],[11,0],[6,3]]); g.fillStyle = '#d88459'; g.fill();
        stroke(g, -4, -2, 5, -2, '#eff3da', .8);
      } else {
        const len = 26 + noise(p.id, 0) * 8;
        g.globalCompositeOperation = 'screen'; g.lineCap = 'round';
        stroke(g, p.x - ux * len, p.y - uy * len, p.x, p.y, '#6fd3ef40', 7);
        const beam = g.createLinearGradient(p.x - ux * len, p.y - uy * len, p.x, p.y);
        beam.addColorStop(0, '#f2fdff00'); beam.addColorStop(.25, '#f2fdffbb'); beam.addColorStop(1, '#f2fdff');
        stroke(g, p.x - ux * len, p.y - uy * len, p.x, p.y, beam, 3);
        glow(g, p.x, p.y, 10, '#6fd3ef', .35);
      }
      g.restore();
    }
    _effect(g, e, under = false) {
      if (e.type === 'break' && e.material) { EBS.ScrapMaterialArt.breakEffect(g, e, under, this.sunny); return; }
      if (e.type === 'shot') return; // The weapon supplies its muzzle flash.
      if (!['hit', 'blast', 'ko'].includes(e.type)) { super._effect(g, e, under); return; }
      if (under || e.age >= e.ttl) return;
      const u = Math.max(0, e.age / e.ttl), seed = e.seed >>> 0, tau = Math.PI * 2;
      g.save(); g.translate(e.x, e.y);
      if (e.type === 'hit') {
        g.globalCompositeOperation = 'screen';
        if (u < .25) { circle(g, 0, 0, 6); g.fillStyle = rgba('#ffffff', .7 * (1 - u / .25)); g.fill(); }
        glow(g, 0, 0, 10, '#ffe5aa', .3 * (1 - u));
        for (let i = 0; i < 6; i++) {
          const a = noise(seed, i) * tau, d = 2 + u * 13, len = (6 + noise(seed, i + 10) * 4) * (1 - u);
          stroke(g, Math.cos(a) * d, Math.sin(a) * d, Math.cos(a) * (d + len), Math.sin(a) * (d + len), rgba('#ffe5aa', (1 - u) ** 2), 1.5);
        }
      } else {
        const s = Math.min(150, Math.max(4, e.size || 60)) * (e.type === 'ko' ? 1.25 : 1);
        for (let i = 0; i < 6; i++) {
          const a = noise(seed, i) * tau, d = s * (.12 + noise(seed, i + 10) * .18 + u * .15);
          glow(g, Math.cos(a) * d, Math.sin(a) * d - u * 12, s * (.20 + u * .25), '#2c2e2d', .4 * (1 - u));
        }
        g.globalCompositeOperation = 'screen';
        if (u < .35) {
          const radius = s * (.35 + .30 * u / .35), fire = g.createRadialGradient(0, 0, 0, 0, 0, radius);
          fire.addColorStop(0, rgba('#ffb347', .85 * (1 - u / .35)));
          fire.addColorStop(.5, rgba('#ff7a2e', .72 * (1 - u / .35))); fire.addColorStop(1, '#ff7a2e00');
          g.fillStyle = fire; g.fillRect(-radius, -radius, radius * 2, radius * 2);
        }
        if (u < .12) glow(g, 0, 0, s * .30, '#fff4d6', 1 - u / .12);
        if (u < .4) {
          circle(g, 0, 0, s * (.4 + .7 * u / .4)); g.strokeStyle = rgba('#ffe2b0', .45 * (1 - u / .4));
          g.lineWidth = 2 - 1.5 * u / .4; g.stroke();
        }
        const radius = s * (.18 + (1 - (1 - u) ** 3) * .8);
        for (let i = 0; i < 11; i++) {
          const a = noise(seed + 3, i) * tau, d = radius * (.7 + noise(seed + 7, i) * .6), len = (1 - u) * (3 + noise(seed + 9, i) * 10);
          stroke(g, Math.cos(a) * d, Math.sin(a) * d, Math.cos(a) * (d + len), Math.sin(a) * (d + len), rgba('#ffe2a5', (1 - u) * .8), 1.2);
        }
        if (e.type === 'ko') {
          g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1 - u;
          const c = parseInt((e.color || '#8c969a').slice(1), 16);
          g.fillStyle = `rgb(${Math.round((c >> 16 & 255) * .7)},${Math.round((c >> 8 & 255) * .7)},${Math.round((c & 255) * .7)})`;
          for (let i = 0; i < 6; i++) {
            const a = noise(seed, i + 50) * tau, d = u * (30 + noise(seed, i + 60) * 20);
            g.save(); g.translate(Math.cos(a) * d, Math.sin(a) * d); g.rotate(a + u * 5);
            path(g, [[-3,-2],[2,-3],[4,1],[-2,3]]); g.fill(); g.restore();
          }
        }
      }
      g.restore();
    }
    destroy() {
      this._scorchTextures?.clear(); this._scorchedFloor = null; this.episode = null;
      this._pickupTextures?.clear();
      super.destroy();
    }
    _result(g, round) {
      if (this._sourceLabelPass) this._labels(g, round.robots || [], 900, 900);
      if (this.skipResult || round.phase !== 'ended') return;
      // Preserve the source result banner; enlarge and move it into the arena
      // centre, where it remains legible in a phone-sized portrait export.
      g.save(); g.translate(450, 430); g.scale(2.3, 2.3); g.translate(-450, -112.5);
      const winner = typeof round.winner === 'object' && round.winner !== null ? round.winner
        : (round.robots || []).find(r => r.id === round.winner);
      const color = winner ? winner.color || colorOf(winner) : '#c5b18e';
      // Keep the archived banner geometry/font. Its thin vertical stroke can
      // rasterize differently on the first Canvas draw after a seek; an equal
      // filled rectangle is stable, including under software rendering.
      g.beginPath(); g.moveTo(293, 91); g.lineTo(607, 91); g.quadraticCurveTo(615, 91, 615, 99);
      g.lineTo(615, 126); g.quadraticCurveTo(615, 134, 607, 134); g.lineTo(293, 134);
      g.quadraticCurveTo(285, 134, 285, 126); g.lineTo(285, 99); g.quadraticCurveTo(285, 91, 293, 91); g.closePath();
      g.fillStyle = 'rgba(9,18,25,.96)'; g.fill(); g.strokeStyle = rgba(color, .65); g.lineWidth = 1; g.stroke();
      g.fillStyle = color; g.fillRect(300.75, 102, 2.5, 21);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '700 6px "Inter", "Segoe UI", Arial, sans-serif'; g.fillStyle = '#8ba0a9'; g.fillText('ROUND COMPLETE', 450, 103);
      const c = parseInt(color.slice(1), 16), bright = [c >> 16 & 255, c >> 8 & 255, c & 255].map(v => Math.round(v + (255 - v) * .3));
      g.font = '800 13px "Inter", "Segoe UI", Arial, sans-serif'; g.fillStyle = `rgb(${bright.join(',')})`;
      g.fillText(winner ? `${winner.name || ['EMBER', 'AZURE', 'AMBER', 'MOSS'][winner.id % 4]} WINS` : 'DRAW', 450, 119);
      g.restore();
    }
  }
  class ScrapRenderer extends EBS.CanvasScene {
    constructor(ctx) {
      super(ctx);
      this.sim = ctx.sim; this.view = ctx.view; this.layout = layout(ctx.world, ctx.sim.cfg);
      this.arenaCanvas = document.createElement('canvas');
      this.arena = new ArenaRenderer(this.arenaCanvas, { dpr: 1, quality: 1 });
      this.arena.episode = this.sim;
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
      if (this._usesDarkMaterialArt()) { this.materialFinale(g); return; }
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
      const sunny=s.cfg.arena==='sunshine',floorKey=`${sunny?r.seed:'map'}:${l.arenaW}:${l.arenaH}:${s.cfg.arena}`;
      if(this.materialFloorKey!==floorKey) {this.materialFloor=art.floor(r.seed,l.arenaW,l.arenaH,sunny,s.cfg.arena);this.materialFloorKey=floorKey;}
      g.drawImage(this.materialFloor,0,0,l.arenaW,l.arenaH);
      this.arena._drawScorches(g,mapPoint);
      if(sunny)for(const b of blocks)if(b.alive) {
        const t=art.block(b,this.arena._blocks,true);g.drawImage(t.shadow,b.x-t.pad,b.y-t.pad,t.width,t.height);
      }
      for(const b of blocks)if(!b.alive)art.rubble(g,b,sunny);
      for(const pad of r.pads) {
        const occupied=r.pickups.some(p=>!p.empty&&p.ammo>0&&Math.hypot(p.x-pad.x,p.y-pad.y)<40);
        if(sunny)art.sunnyPad(g,mapPoint(pad));else art.pad(g,mapPoint(pad),occupied);
      }
      for(const e of effects)this.arena._effect(g,e,true);
      for(const p of r.pickups)this.arena._pickup(g,mapPoint(p),r.t);
      for(const b of blocks)if(b.alive) {
        const t=art.block(b,this.arena._blocks,sunny);g.drawImage(t.canvas,b.x-t.pad,b.y-t.pad,t.width,t.height);
      }
      for(const robot of [...robots.filter(p=>!p.alive),...robots.filter(p=>p.alive)])this.arena._robot(g,robot,r.t);
      for(const p of r.projectiles)this.arena._projectile(g,mapPoint(p));
      for(const e of effects)this.arena._effect(g,e);
      this.arena._labels(g,robots,l.arenaW,l.arenaH);
      g.restore();
      if(final)this.finale(g);
      else if(r.phase==='ended') {
        if (this._usesDarkMaterialArt()) this.materialRoundBanner(g);
        else {
          const winner=r.robots.find(p=>p.id===r.winner),xx=l.x+l.width/2,yy=l.y+l.height/2;
          box(g,xx-260,yy-62,520,124,12);g.fillStyle='#101e29ed';g.fill();g.strokeStyle=winner?colorOf(winner):'#c2c9c6';g.lineWidth=2;g.stroke();
          text(g,winner?`${winner.name} WINS`:'DRAW',xx,yy-13,34,winner?colorOf(winner):'#d1d9d5','center');
          text(g,s.phase==='pause'?`NEXT ROUND IN ${Math.ceil((s.pauseUntil-s.step)/60)}s`:'ROUND COMPLETE',xx,yy+30,17,'#aabfc8','center');
        }
        this.workshopPanel(g);
      }
      if(this.view.hud)this.materialHud(g,final);
    }
    _usesDarkMaterialArt() {
      return this.sim.cfg.rulesVersion === 'v3' && this.sim.cfg.arena !== 'sunshine';
    }
    _materialResultProgress(final = false) {
      const s = this.sim;
      let elapsed;
      if (final) elapsed = 5 - (s.outroUntil - s.step) / 60;
      else if (s.phase === 'pause') elapsed = s.cfg.endPauseSec - (s.pauseUntil - s.step) / 60;
      else {
        // With repeatRounds=false there is no future pause deadline. The
        // retained round-end event gives the same analytic entrance instead.
        let end = null;
        for (let i = s.events.length - 1; i >= 0; i--) {
          const event = s.events[i];
          if (event.round < s.roundNumber) break;
          if (event.type === 'round_end' && event.round === s.roundNumber) { end = event; break; }
        }
        elapsed = end ? (s.step - end.step) / 60 : .25;
      }
      return Math.max(0, Math.min(1, elapsed / .25));
    }
    _materialResultIcon(g, robot, x, y, size = 64) {
      if (robot) {
        const body = this.arena._bodyTexture(colorOf(robot), false, damageStage(robot));
        // Crop only transparent padding; the complete chassis and tracks fit.
        g.drawImage(body, 64, 64, 288, 288, x, y, size, size);
      } else {
        box(g, x + 5, y + 5, size - 10, size - 10, 8);
        g.strokeStyle = '#899ba3'; g.lineWidth = 2; g.stroke();
        text(g, '=', x + size / 2, y + size / 2 - 1, 35, '#c2c9c6', 'center', 700);
      }
    }
    materialRoundBanner(g) {
      const s = this.sim, r = s.roundSim, l = this.layout;
      const winner = r.robots.find(robot => robot.id === r.winner), color = winner ? colorOf(winner) : '#c2c9c6';
      const progress = this._materialResultProgress();
      if (progress <= 0) return;
      const width = Math.min(560, l.width - 32), height = 136;
      g.save(); g.translate(l.x + l.width / 2, l.y + l.height / 2);
      g.scale(.94 + .06 * progress, .94 + .06 * progress); g.globalAlpha *= progress;
      g.shadowColor = rgba(color, .35); g.shadowBlur = 18;
      box(g, -width / 2, -height / 2, width, height, 12); g.fillStyle = '#101e29ed'; g.fill();
      g.shadowBlur = 0; g.shadowColor = 'transparent'; g.strokeStyle = color; g.lineWidth = 2; g.stroke();
      this._materialResultIcon(g, winner, -width / 2 + 23, -32);
      const left = -width / 2 + 108;
      text(g, winner ? `${winner.name} WINS` : 'DRAW', left, -16, 34, color);
      const status = s.phase === 'pause'
        ? `NEXT ROUND IN ${Math.max(0, Math.ceil((s.pauseUntil - s.step) / 60))}s` : 'COMPLETE';
      text(g, `ROUND ${s.roundNumber} · ${status}`, left, 25, 17, '#aabfc8');
      g.restore();
    }
    materialFinale(g) {
      const s = this.sim, l = this.overlayLayout(), champions = s.champions();
      const rows = [...s.roundSim.robots].sort((a, b) => s.wins[b.id] - s.wins[a.id] || a.id - b.id);
      const winner = champions.length === 1 ? rows[0] : null, color = winner ? colorOf(winner) : '#c2c9c6';
      const progress = this._materialResultProgress(true);
      g.save(); g.translate(l.x, l.y); g.scale(l.size / 1000, l.size / 1000);
      g.fillStyle = '#07131bb8'; g.fillRect(0, 0, 1000, 1000);
      if (progress <= 0) { g.restore(); return; }
      g.translate(500, 500); g.scale(.94 + .06 * progress, .94 + .06 * progress); g.translate(-500, -500);
      g.globalAlpha *= progress;
      g.shadowColor = rgba(color, .35); g.shadowBlur = 18;
      box(g, 100, 150, 800, 700, 26); g.fillStyle = '#132532f5'; g.fill();
      g.shadowBlur = 0; g.shadowColor = 'transparent'; g.strokeStyle = color; g.lineWidth = 2; g.stroke();
      text(g, 'TOURNAMENT COMPLETE', 500, 214, 26, '#c1d4df', 'center');
      const title = winner ? `${winner.name} WINS` : 'TIED FOR FIRST';
      g.font = `700 46px ${FONT}`;
      const left = 500 - (82 + g.measureText(title).width) / 2;
      this._materialResultIcon(g, winner, left, 250);
      text(g, title, left + 82, 282, 46, color);
      text(g, '8 ROUNDS  ·  FINAL STANDINGS', 500, 337, 23, '#9eb4bf', 'center');
      rows.forEach((robot, i) => {
        const y = 425 + i * 84, leading = champions.includes(robot.id), team = colorOf(robot);
        box(g, 158, y - 30, 684, 65, 10); g.fillStyle = leading ? '#2d3e42' : '#1b303c'; g.fill();
        text(g, leading ? '★' : '·', 185, y, 24, leading ? team : '#80949d');
        text(g, robot.name, 232, y, 32, team);
        const wins = s.wins[robot.id];
        text(g, `${wins} ${wins === 1 ? 'WIN' : 'WINS'}`, 808, y, 28, team, 'right');
      });
      text(g, `${s.draws} DRAW${s.draws === 1 ? '' : 'S'}  ·  SEE YOU IN THE NEXT ARENA`, 500, 793, 21, '#9eb4bf', 'center');
      g.restore();
    }
    // Weapon icon and ammo count in the status card; shared by the dark and the Sunny header.
    _hudWeapon(g, robot, x, y, width, color) {
      if (robot.weapon) {
        g.save(); g.translate(x + width - 72, y + 35); g.scale(.8, .8);
        this.arena._weapon(g, robot.weapon.kind, robot.weapon.ammo > 0, color, true); g.restore();
      } else {
        // An empty silhouette makes the missing weapon visible without
        // adding another word to the compact status row.
        g.save(); g.translate(x + width - 59, y + 35);
        path(g, [[-9,-4],[2,-4],[2,-2],[12,-2],[12,2],[2,2],[2,5],[-9,5]]);
        g.strokeStyle = '#8096a2'; g.lineWidth = 1.1; g.stroke(); g.restore();
      }
      text(g, robot.weapon ? Math.max(0, Math.ceil(robot.weapon.ammo)) : '—', x + width - 12, y + 35, 13, '#c4d1d6', 'right', 650);
    }
    materialHudPolished(g, final) {
      const s = this.sim, r = s.roundSim, wide = this.world.w > 1500;
      const round = s.cfg.episodeMode === 'tournament' ? `ROUND ${s.roundNumber}/8` : `ROUND ${String(s.roundNumber).padStart(2, '0')}`;
      const clock = final ? 'END' : EBS.util.fmtTime(Math.ceil(Math.max(0, r.duration - r.t)));
      text(g, 'SCRAP WARS', 24, 27, 24, '#edf1e5');
      text(g, EBS.ScrapRules.arenas[s.cfg.arena].name, 25, 52, 12, '#a1b2b9');
      text(g, round, wide ? 240 : this.world.w - 210, 26, 19, '#dec598');
      text(g, clock, wide ? 436 : this.world.w - 24, 26, 22, '#edf1e5', 'right');
      const legendX = wide ? 240 : this.world.w - 326;
      for (const [i, key] of ['wood', 'stone', 'concrete'].entries()) {
        const x = legendX + i * 72, material = EBS.ScrapMaterials.materials[key];
        box(g, x, 46, 9, 9, 1); g.fillStyle = material.color; g.fill();
        text(g, key.toUpperCase(), x + 14, 51, 10, '#9caeb6');
      }
      const start = wide ? 480 : 12, y = wide ? 9 : 70, gap = 12, width = (this.world.w - start - 12 - gap * 3) / 4;
      r.robots.forEach((robot, i) => {
        const x = start + i * (width + gap), color = robot.alive ? colorOf(robot) : '#718087';
        box(g, x, y, width, 54, 6); g.fillStyle = robot.alive ? '#1b2a32' : '#1b252b'; g.fill();
        g.fillStyle = color; g.fillRect(x, y + 10, 3, 30);
        text(g, robot.name, x + 13, y + 17, wide ? 17 : 16, color);
        text(g, `★ ${s.wins[robot.id]}`, x + width - 12, y + 17, 14, color, 'right');
        const barWidth = width - 112;
        box(g, x + 13, y + 32, barWidth, 7, 3.5); g.fillStyle = '#0b141b'; g.fill();
        if (robot.alive) {
          const hp = Math.max(0, Math.min(1, robot.hp / robot.maxHp)), fillWidth = barWidth * hp;
          if (fillWidth > 0) {
            box(g, x + 13, y + 32, fillWidth, 7, Math.min(3.5, fillWidth / 2)); g.fillStyle = color; g.fill();
          }
          this._hudWeapon(g, robot, x, y, width, color);
        } else text(g, 'KNOCKED OUT', x + width - 12, y + 35, 10, '#87969d', 'right', 650);
        if (s.cfg.workshop) {
          const key = robot.module || s.workshop.modules[robot.id];
          text(g, key ? EBS.ScrapRules.modules[key].name : `${s.workshop.balances[robot.id]}/4`, x + 13, y + 46, 8,
            robot.alive ? '#c8ba92' : '#87969d', 'left', 600);
        }
      });
    }
    materialHud(g,final) {
      if (this._usesDarkMaterialArt()) { this.materialHudPolished(g, final); return; }
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
        box(g,x,46,9,9,1);g.fillStyle=s.cfg.arena==='sunshine'?EBS.ScrapMaterialArt.sunnyColors[key]:m.color;g.fill();text(g,key.toUpperCase(),x+14,51,10,'#9caeb6');
      });
      const start=wide?480:12,y=wide?9:70,gap=12,ww=(this.world.w-start-12-gap*3)/4;
      r.robots.forEach((robot,i)=>{
        const x=start+i*(ww+gap),color=robot.alive?colorOf(robot):'#66777e';
        box(g,x,y,ww,54,6);g.fillStyle='#1b2a32';g.fill();
        g.fillStyle=color;g.fillRect(x,y+10,3,30);
        text(g,robot.name,x+13,y+17,wide?17:16,color);
        text(g,`${s.wins[robot.id]} W`,x+ww-12,y+17,14,color,'right');
        if(robot.alive)this._hudWeapon(g,robot,x,y,ww,color);
        else text(g,'KNOCKED OUT',x+ww-12,y+35,10,'#87969d','right',650);
        const barWidth=ww-112;
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
