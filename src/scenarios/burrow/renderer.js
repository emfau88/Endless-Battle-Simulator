/*
 * Endless Burrow – Darstellung (Paket P1)
 *
 * Liest die Simulation nur. Der Boden wird einmal gezeichnet; Tunnel, Futter, Würmer und Effekte entstehen in jedem
 * Bild neu aus dem Zustand der Simulation (Seek-Regel: kein Zustand, der von der Zahl gezeichneter Bilder abhängt).
 *
 * Tunnel: Zwei Felder in halber Auflösung, gebildet als Maximum über Kreisstempel entlang der Spur (Mischmodus
 * „lighten“ bzw. „darken“, daher keine Nähte). Der helle Rand wird mit „screen“, der dunkle Kern mit „multiply“ auf den
 * Boden gelegt. Frisch gegrabene Stellen sind kräftig, ältere verblassen bis zur Tunnellänge.
 */
(function () {
'use strict';
const B = (EBS.Burrow = EBS.Burrow || {});
const A = B.art;
const { clamp } = EBS.util;
const smooth = (u) => u * u * (3 - 2 * u);
const FOOD_SIZE = [5.5, 5.2, 6, 6.5, 6.5];
const RIM = [154, 107, 66], CORE = [46, 26, 13];

class BurrowRenderer extends EBS.CanvasScene {
  constructor(ctx) {
    super(ctx);
    this.sim = ctx.sim; this.view = ctx.view || {}; this.video = ctx.video;
    const W = (this.W = ctx.world.w), H = (this.H = ctx.world.h), s = this.scale;
    this.land = W > H;
    this.looks = B.ROSTER.map(A.look);
    this.soil = A.canvas(W, H, s);
    A.paintSoil(this.soil.getContext('2d'), W, H, this.land ? 5 : 6, s);
    A.paintVignette(this.soil.getContext('2d'), W, H, 0.42);   // Vignette nur im Boden: spart ein ganzes Bild je Frame
    this.fs = s * 0.5;
    this.rimF = A.canvas(W, H, this.fs); this.coreF = A.canvas(W, H, this.fs);
    this.ss = s / 8;   // Schatten in Achtel-Auflösung; das Hochskalieren macht die Kanten weich
    this.shadowL = A.canvas(W, H, this.ss);
    this.foodSprites = new Map(); this.chunkSprites = new Map(); this.turned = new Map();
    this.frame = A.canvas(W, H, 1);   // ganzes Bild im Hauptspeicher, dann eine Kopie auf die Bühne
    this.frame.width = this.canvas.width; this.frame.height = this.canvas.height;
  }
  draw() {
    const c = this.frame.getContext('2d');
    c.save(); c.setTransform(this.scale, 0, 0, this.scale, 0, 0); this.paint(c); c.restore();
    this.ctx.drawImage(this.frame, 0, 0);
    this.texture.source.update();
  }

  // ----------------------------------------------------------- Bausteine
  foodSprite(kind, v) {
    const key = kind * 8 + v;
    let sp = this.foodSprites.get(key);
    if (!sp) {
      const size = FOOD_SIZE[kind] * this.sim.k, name = B.FOOD[kind].kind, rnd = A.mulberry(1000 + key * 7919);
      sp = A.sprite(size * 1.7, this.scale, (g) => A.FOOD_ART[name](g, size, rnd));
      this.foodSprites.set(key, sp);
    }
    return sp;
  }
  chunkSprite(id, v) {
    const key = id * 8 + v;
    let sp = this.chunkSprites.get(key);
    if (!sp) {
      const lk = this.looks[id], size = (7 + v * 0.7) * this.sim.k, rnd = A.mulberry(5000 + key * 104729);
      sp = A.sprite(size, this.scale, (g) => A.chunkArt(g, size, lk.c, lk.pc || lk.saddle, rnd));
      this.chunkSprites.set(key, sp);
    }
    return sp;
  }
  /** Futterbild in einer von 16 Drehungen, Schatten fest nach unten rechts (nur gerade Bildkopien je Frame). */
  turnedSprite(key, base, a) {
    const bin = ((Math.round((a / A.TAU) * 16) % 16) + 16) % 16, k = key + '|' + bin;
    let c = this.turned.get(k);
    if (!c) {
      const h = base.half, ang = (bin / 16) * A.TAU;
      c = A.canvas(h * 2, h * 2, this.scale);
      const q = c.getContext('2d');
      q.save(); q.translate(h + 2, h + 3); q.rotate(ang); q.drawImage(base.shadow, -h, -h, h * 2, h * 2); q.restore();
      q.save(); q.translate(h, h); q.rotate(ang); q.drawImage(base.img, -h, -h, h * 2, h * 2); q.restore();
      this.turned.set(k, c);
    }
    return c;
  }
  poseOf(w) {
    const sim = this.sim, grow = clamp((sim.t - w.bornT) / 0.5, 0, 1), k = 0.55 + 0.45 * smooth(grow);
    return A.pose({ ...this.looks[w.id] }, (d) => sim.pointAt(w, d), sim.radiusOf(w.mass) * k, sim.lengthOf(w.mass), w.a);
  }

  // ----------------------------------------------------------- Bild
  paint(g) {
    const sim = this.sim, W = this.W, H = this.H;
    g.drawImage(this.soil, 0, 0, W, H);
    this.drawTunnels(g);
    this.drawFood(g);
    const alive = sim.worms.filter((w) => w.alive).sort((a, b) => (a.mass - b.mass) || (a.id - b.id));
    const poses = alive.map((w) => this.poseOf(w));
    this.drawShadows(g, poses);
    const lead = sim.leader();
    alive.forEach((w, i) => {
      const t = sim.t + w.id * 1.37, ph = t % 4.3;
      const blink = ph < 0.16 ? Math.sin((ph / 0.16) * Math.PI) : 0;
      A.drawWorm(g, poses[i], { biting: sim.t - w.biteT < 0.45, crown: w === lead && alive.length > 1, blink });
    });
    this.drawHatches(g, alive);
    this.drawBites(g);
    if (this.view.hud !== false) this.land ? this.drawHudLand(g) : this.drawHudPortrait(g);
  }

  drawTunnels(g) {
    const sim = this.sim, W = this.W, H = this.H, tl = sim.tunnelLength();
    const rim = this.rimF.getContext('2d'), core = this.coreF.getContext('2d');
    rim.save(); rim.setTransform(1, 0, 0, 1, 0, 0); rim.fillStyle = '#000'; rim.fillRect(0, 0, this.rimF.width, this.rimF.height); rim.restore();
    core.save(); core.setTransform(1, 0, 0, 1, 0, 0); core.fillStyle = '#fff'; core.fillRect(0, 0, this.coreF.width, this.coreF.height); core.restore();
    // Alle Stempel aller Würmer nach Stärke sortiert: schwache zuerst, starke darüber. Normales Übermalen ergibt so das
    // Maximum, ohne teure Mischmodi je Kreis.
    const LEVELS = 20, buckets = Array.from({ length: LEVELS + 1 }, () => []);
    for (const w of sim.worms) {
      if (!w.tx.length) continue;
      const r = sim.radiusOf(w.mass), len = sim.lengthOf(w.mass), total = Math.min(sim.trailLength(w), len + tl);
      const fade = w.alive ? 1 : clamp(1 - (sim.t - w.deadT) / 4, 0, 1);
      if (fade <= 0) continue;
      const step = Math.max(4, r * 0.6) * sim.k, rc = r * 1.25;
      for (let d = 0; d <= total; d += step) {
        const v = fade * (d <= len ? 1 : Math.pow(1 - (d - len) / tl, 1.3));
        if (v <= 0.03) continue;
        const p = sim.pointAt(w, d);
        buckets[Math.min(LEVELS, Math.ceil(v * LEVELS))].push(p.x, p.y, rc);
      }
    }
    for (let lv = 1; lv <= LEVELS; lv++) {
      const P = buckets[lv];
      if (!P.length) continue;
      const v = lv / LEVELS, kr = v * 0.3, kc = v * 0.52;
      rim.fillStyle = `rgb(${Math.round(RIM[0] * kr)},${Math.round(RIM[1] * kr)},${Math.round(RIM[2] * kr)})`;
      core.fillStyle = `rgb(${Math.round(255 + (CORE[0] - 255) * kc)},${Math.round(255 + (CORE[1] - 255) * kc)},${Math.round(255 + (CORE[2] - 255) * kc)})`;
      rim.beginPath(); core.beginPath();
      for (let i = 0; i < P.length; i += 3) {
        const x = P[i], y = P[i + 1], rc = P[i + 2], rr = rc + 6;
        rim.moveTo(x + rr, y); rim.arc(x, y, rr, 0, A.TAU); core.moveTo(x + rc, y); core.arc(x, y, rc, 0, A.TAU);
      }
      rim.fill(); core.fill();
    }
    g.save();
    g.imageSmoothingEnabled = true;
    g.globalCompositeOperation = 'screen'; g.drawImage(this.rimF, 0, 0, W, H);
    g.globalCompositeOperation = 'multiply'; g.drawImage(this.coreF, 0, 0, W, H);
    g.restore();
  }

  drawFood(g) {
    const sim = this.sim;
    for (const f of sim.food) {
      const age = sim.t - f.born;
      let k = age < 0.35 ? smooth(clamp(age / 0.35, 0, 1)) : 1, alpha = 1;
      if (f.kind === B.CHUNK) {
        const left = B.RULES.chunkLife - age;
        if (left < 5) alpha = clamp(left / 5, 0, 1);
        k = age < 0.25 ? 0.6 + 0.4 * smooth(clamp(age / 0.25, 0, 1)) : 1;
      }
      if (k <= 0.01 || alpha <= 0) continue;
      const chunk = f.kind === B.CHUNK, base = chunk ? this.chunkSprite(f.c, f.v) : this.foodSprite(f.kind, f.v);
      const img = this.turnedSprite((chunk ? 'c' + f.c : 'f' + f.kind) + '|' + f.v, base, f.a), h = base.half * k;
      g.globalAlpha = alpha;
      g.drawImage(img, f.x - h, f.y - h, h * 2, h * 2);
      g.globalAlpha = 1;
    }
  }

  drawShadows(g, poses) {
    const a = this.shadowL.getContext('2d');
    a.save(); a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, this.shadowL.width, this.shadowL.height); a.restore();
    a.fillStyle = '#120804';
    for (const p of poses) A.drawShadow(a, p, 7, 9);
    g.save(); g.globalAlpha = 0.4; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'medium';
    g.drawImage(this.shadowL, 0, 0, this.W, this.H); g.restore();
  }

  /** Frisch geschlüpfte Würmer: Erdkrümel fliegen ringförmig auseinander. */
  drawHatches(g, alive) {
    const sim = this.sim;
    for (const w of alive) {
      const age = sim.t - w.bornT;
      if (age < 0 || age > 0.8) continue;
      const u = age / 0.8, rnd = A.mulberry(w.id * 977 + Math.round(w.bornT * 60));
      g.save(); g.globalAlpha = 1 - u;
      for (let i = 0; i < 14; i++) {
        const a = rnd() * A.TAU, dist = (18 + rnd() * 26) * smooth(Math.min(1, u * 1.6)) * sim.k + 8;
        g.fillStyle = i % 3 ? '#3a2212' : '#b68858';
        A.circle(g, w.bornX + Math.cos(a) * dist, w.bornY + Math.sin(a) * dist, (2 + rnd() * 3) * (1 - u * 0.5));
      }
      g.restore();
    }
  }

  /** Biss: Krümel, Strahlen und Punktzahl am Ort der Beute, nur abhängig vom Alter des Bisses. */
  drawBites(g) {
    const sim = this.sim;
    for (const b of sim.bites) {
      const age = sim.t - b.t;
      if (age < 0 || age > 1.4) continue;
      const eater = sim.worms[b.by], victim = this.looks[b.victim], rnd = A.mulberry(b.seed * 7919 + 13);
      const r = sim.radiusOf(eater.mass), base = rnd() * A.TAU;
      if (age < 0.6) {
        const u = age / 0.6;
        g.save(); g.globalAlpha = 1 - u;
        for (let i = 0; i < 12; i++) {
          const a = rnd() * A.TAU, dist = r * (0.8 + rnd() * 1.6) * (0.4 + smooth(u));
          const x = b.x + Math.cos(a) * dist, y = b.y + Math.sin(a) * dist;
          if (i < 6) { g.fillStyle = victim.c; A.circle(g, x, y, (3.5 + rnd() * 2.5) * (1 - u * 0.4)); }
          else { g.fillStyle = '#3a2212'; A.circle(g, x, y, 2 + rnd() * 3); }
        }
        g.strokeStyle = '#fff6e0'; g.lineWidth = 3.5; g.lineCap = 'round';
        for (let i = 0; i < 7; i++) {
          const a = base + i * (A.TAU / 7), r0 = r * 1.2 + u * 20, r1 = r0 + 12 + (i % 2) * 10;
          g.beginPath(); g.moveTo(b.x + Math.cos(a) * r0, b.y + Math.sin(a) * r0); g.lineTo(b.x + Math.cos(a) * r1, b.y + Math.sin(a) * r1); g.stroke();
        }
        g.restore();
      }
      const lift = smooth(Math.min(1, age / 1.4)) * 46, alpha = age < 1 ? 1 : 1 - (age - 1) / 0.4;
      const size = clamp(26 + b.gain * 0.25, 28, 44) * sim.k;
      A.hudText(g, `+${b.gain * 3}`, b.x, b.y - r * 2.2 - lift, size, 900, 'center', { alpha: clamp(alpha, 0, 1) });
    }
  }

  // ----------------------------------------------------------- Anzeige
  drawHudLand(g) {
    const sim = this.sim, W = this.W, H = this.H;
    A.hudText(g, 'ENDLESS BURROW', 52, 58, 40, 900, 'left', { spacing: '2px' });
    A.hudText(g, 'EAT  ·  GROW  ·  RULE THE UNDERGROUND', 54, 100, 16, 800, 'left', { spacing: '3px', alpha: 0.75 });
    const ranked = sim.ranking().slice(0, 5);
    const pw = 340, ph = 78 + ranked.length * 44, px = W - 48 - pw, py = 36;
    g.fillStyle = 'rgba(28,14,6,0.55)'; g.beginPath(); g.roundRect(px, py, pw, ph, 18); g.fill();
    A.hudText(g, 'BIGGEST WORMS', px + 26, py + 36, 16, 800, 'left', { spacing: '3px', alpha: 0.7 });
    ranked.forEach((w, i) => {
      const y = py + 82 + i * 44, lk = this.looks[w.id];
      A.hudText(g, String(i + 1), px + 34, y, 20, 800, 'center', { alpha: 0.6 });
      A.miniHead(g, px + 72, y, lk);
      A.hudText(g, w.name + (i === 0 ? '  ♛' : ''), px + 96, y, 21, 800, 'left', { color: i === 0 ? '#ffd77a' : undefined });
      A.hudText(g, sim.score(w).toLocaleString('en-US'), px + pw - 26, y, 21, 800, 'right');
    });
    const alive = sim.worms.reduce((n, w) => n + (w.alive ? 1 : 0), 0);
    A.hudText(g, `ALIVE ${alive}    EATEN ${sim.eaten}    ${EBS.util.fmtTime(sim.videoTime)}`, 54, H - 46, 17, 800, 'left', { spacing: '2px', alpha: 0.7 });
  }
  drawHudPortrait(g) {
    const vt = this.sim.videoTime, alpha = vt < 3.5 ? 1 : clamp(1 - (vt - 3.5) / 0.8, 0, 1);
    if (alpha <= 0) return;
    const W = this.W, H = this.H, y = 0.205 * H;
    A.hudText(g, 'WHO WILL RULE', W / 2, y - 44, 76, 900, 'center', { spacing: '2px', alpha });
    A.hudText(g, 'THE BURROW?', W / 2, y + 44, 76, 900, 'center', { spacing: '2px', color: '#ffd77a', alpha });
  }

  destroy() {
    for (const c of [this.soil, this.rimF, this.coreF, this.shadowL, this.frame]) c.width = c.height = 1;
    this.foodSprites.clear(); this.chunkSprites.clear(); this.turned.clear();
    super.destroy();
  }
}
B.Renderer = BurrowRenderer;
})();
