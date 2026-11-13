/* Endless Mycelium: Canvas-Renderer, Bedienregler, Klangtabelle und Registrierung.
 * Das Bild ist eine reine Funktion des Simulationszustands (keine bildabhängigen Zwischenstände);
 * Zwischenspeicher halten nur Unveränderliches (Waldboden, Blattformen, Lichtkegel).
 */
(function () {
'use strict';
const M = EBS.Mycelium;
const { Simulation, normalizeParams, layout, leafHalf, CS, SKELETON_SEC } = M;
const TAU = Math.PI * 2;
const FONT = 'Bahnschrift, "Segoe UI", Arial, sans-serif';
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const easeOutBack = (x) => { x = clamp01(x); const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const WHITE = [255, 255, 255], ASH = [150, 120, 90], WITHER = [90, 70, 52];

// Farbfolgen der Generationen
const PALETTES = {
  cycle: [[110, 255, 190], [190, 140, 255], [255, 172, 84], [120, 205, 255]],
  mint: [[110, 255, 190]],
  cool: [[110, 255, 190], [120, 205, 255], [150, 165, 255], [190, 140, 255]],
  warm: [[255, 172, 84], [255, 122, 142], [255, 214, 110], [240, 140, 90]],
};
const LEAF_COLORS = ['#6e4423', '#7d3f1f', '#5d5124', '#80602a', '#6a2f1c', '#8a5a26'];
const NB = 11, widthOf = (b) => 0.45 + b * 0.5;
const BUILD_FRAMES = 18, FADE_TICKS = 24;
const PAD = 14;                                // Rand um ein Blatt für seinen weichen Schatten   // Zwischenspeicher der Fäden: Aufbau über 18 Bilder, Überblendung 0,4 s

class MyceliumRenderer extends EBS.CanvasScene {
  constructor(ctx) {
    super(ctx);
    this.sim = ctx.sim; this.view = ctx.view; this.s = ctx.renderScale;
    const { w, h } = this.world;
    this.ground = this._buffer(w, h, 1); this._paintGround(this.ground.g);
    this.shade = this._buffer(w, h, 1); this._paintShade(this.shade.g);
    // Leuchten in reduzierter Auflösung: breiter Schein (¼) und enger Schein (½) – weichgezeichnet sieht es gleich aus
    this.fresh = { glow: this._buffer(w, h, 0.25), glowB: this._buffer(w, h, 0.25) };
    this.glowTmp = this._buffer(w, h, 0.25);
    this.cache = { prev: this._entry(), cur: this._entry(), next: this._entry(), prevCut: 0, curCut: 0, ready: 0, build: null };
    this.leafCache = new Map(); this.sprites = new Map();
    this.capShadow = this._canvas(Math.ceil(80 * this.s), Math.ceil(80 * this.s));
    const cs = this.capShadow.getContext('2d'); cs.setTransform(this.s, 0, 0, this.s, 0, 0); cs.filter = `blur(${5 * this.s}px)`;
    cs.fillStyle = 'rgba(0,0,0,0.6)'; cs.beginPath(); cs.ellipse(40, 40, 21, 20, 0, 0, TAU); cs.fill();
    const box = Math.ceil(256 * this.s);
    this.scr = this._canvas(box, box); this.msk = this._canvas(box, box);
  }
  _canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  _buffer(w, h, f) {
    const c = this._canvas(Math.max(1, Math.round(w * this.s * f)), Math.max(1, Math.round(h * this.s * f)));
    const g = c.getContext('2d'); g.setTransform(this.s * f, 0, 0, this.s * f, 0, 0);
    return { c, g, k: this.s * f };
  }
  _clear(b) { b.g.setTransform(1, 0, 0, 1, 0, 0); b.g.globalCompositeOperation = 'source-over'; b.g.filter = 'none'; b.g.globalAlpha = 1; b.g.clearRect(0, 0, b.c.width, b.c.height); b.g.setTransform(b.k, 0, 0, b.k, 0, 0); }
  color(gen) { const p = PALETTES[this.sim.cfg.palette] || PALETTES.cycle; return p[((gen % p.length) + p.length) % p.length]; }
  sprite(rgb, size, core) {
    rgb = rgb.map((v) => Math.min(255, Math.round(v / 6) * 6));     // gerundet: gleitende Farbwechsel nutzen vorhandene Sprites
    const key = `${rgb.join(',')}|${size}|${core}`;
    let c = this.sprites.get(key);
    if (c) return c;
    const px = Math.max(2, Math.ceil(size * this.s));
    c = this._canvas(px, px);
    const g = c.getContext('2d'), gr = g.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px / 2);
    gr.addColorStop(0, rgba(mix(rgb, WHITE, core), 1)); gr.addColorStop(0.18, rgba(rgb, 0.85));
    gr.addColorStop(0.5, rgba(rgb, 0.22)); gr.addColorStop(1, rgba(rgb, 0));
    g.fillStyle = gr; g.fillRect(0, 0, px, px);
    if (this.sprites.size > 400) this.sprites.clear();
    this.sprites.set(key, c);
    return c;
  }

  // ------------------------------------------------------------ einmalig: Boden und Licht
  _paintGround(g) {
    const { w, h } = this.world, R = new EBS.RNG(EBS.util.hashSeed('myco-ground', this.sim.seed)), r = () => R.next();
    const bg = g.createRadialGradient(w * 0.45, h * 0.45, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
    bg.addColorStop(0, '#231913'); bg.addColorStop(1, '#0c0907'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const pal = ['#2c1f16', '#1b130e', '#35271c', '#140e0a', '#2a2018'];
    for (let i = 0; i < 2700; i++) {
      g.globalAlpha = 0.18 + r() * 0.4; g.fillStyle = pal[Math.floor(r() * pal.length)];
      g.beginPath(); g.ellipse(r() * w, r() * h, 6 + r() * 34, 4 + r() * 18, r() * TAU, 0, TAU); g.fill();
    }
    g.fillStyle = '#4a3a2c';
    for (let i = 0; i < 9000; i++) { g.globalAlpha = 0.15 + r() * 0.35; g.fillRect(r() * w, r() * h, 1 + r() * 1.6, 1 + r() * 1.6); }
    for (let k = 0; k < 9; k++) {                                   // Moos
      const mx = r() * w, my = r() * h, mr = 40 + r() * 70;
      for (let i = 0; i < 160; i++) {
        const a = r() * TAU, d = Math.sqrt(r()) * mr;
        g.globalAlpha = 0.35 + r() * 0.4; g.fillStyle = r() < 0.5 ? '#1f3a1c' : '#2c4a24';
        g.beginPath(); g.arc(mx + Math.cos(a) * d, my + Math.sin(a) * d * 0.8, 1.2 + r() * 2.4, 0, TAU); g.fill();
      }
    }
    g.lineCap = 'round';
    for (let i = 0; i < 200; i++) {                                  // Nadeln
      const x = r() * w, y = r() * h, a = r() * TAU, L = 22 + r() * 46;
      g.globalAlpha = 0.45 + r() * 0.35; g.strokeStyle = r() < 0.5 ? '#3d2b17' : '#4c3b1e'; g.lineWidth = 1.4 + r();
      g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a + 0.2) * L * 0.5, y + Math.sin(a + 0.2) * L * 0.5, x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
    }
    for (let i = 0; i < 38; i++) {                                   // Steinchen
      const x = r() * w, y = r() * h, rr = 4 + r() * 12;
      g.globalAlpha = 0.6; g.fillStyle = '#000'; g.beginPath(); g.ellipse(x + 3, y + 4, rr, rr * 0.8, 0, 0, TAU); g.fill();
      const pg = g.createRadialGradient(x - rr * 0.35, y - rr * 0.35, 0, x, y, rr); pg.addColorStop(0, '#6a625a'); pg.addColorStop(1, '#221e1b');
      g.globalAlpha = 0.95; g.fillStyle = pg; g.beginPath(); g.ellipse(x, y, rr, rr * 0.8, r(), 0, TAU); g.fill();
    }
    for (let i = 0; i < 6; i++) {                                    // Eicheln
      const x = r() * w, y = r() * h, rr = 10 + r() * 3, a = r() * TAU;
      g.save(); g.translate(x, y); g.rotate(a);
      g.globalAlpha = 0.5; g.fillStyle = '#000'; g.beginPath(); g.ellipse(3, 4, rr * 1.25, rr, 0, 0, TAU); g.fill();
      const ag = g.createRadialGradient(-rr * 0.4, -rr * 0.3, 0, 0, 0, rr * 1.3); ag.addColorStop(0, '#a77a3c'); ag.addColorStop(1, '#4a2e12');
      g.globalAlpha = 1; g.fillStyle = ag; g.beginPath(); g.ellipse(rr * 0.25, 0, rr * 1.1, rr * 0.85, 0, 0, TAU); g.fill();
      g.fillStyle = '#3e2c18'; g.beginPath(); g.ellipse(-rr * 0.55, 0, rr * 0.55, rr * 0.9, 0, 0, TAU); g.fill(); g.restore();
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'lighter';     // Mondlicht von links oben
    const m = g.createRadialGradient(w * 0.1, -h * 0.05, 0, w * 0.1, -h * 0.05, Math.max(w, h) * 0.9);
    m.addColorStop(0, 'rgba(110,140,200,0.13)'); m.addColorStop(1, 'rgba(110,140,200,0)'); g.fillStyle = m; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
  }
  _paintShade(g) {
    const { w, h } = this.world, v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.72)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
  }

  // ------------------------------------------------------------ Blätter
  _leafArt(f) {
    let a = this.leafCache.get(f.id);
    if (a) return a;
    const R = f.L * 0.62 + 6, bs = Math.ceil(R * 2), bx = Math.floor(f.x - R), by = Math.floor(f.y - R), px = Math.ceil(bs * this.s);
    const make = () => { const c = this._canvas(px, px), g = c.getContext('2d'); g.setTransform(this.s, 0, 0, this.s, 0, 0); g.translate(f.x - bx, f.y - by); g.rotate(f.rot); return [c, g]; };
    const path = (g) => {
      g.beginPath(); const N = 30;
      for (let i = 0; i <= N; i++) { const u = -f.L / 2 + f.L * i / N; g.lineTo(u, -leafHalf(u, f.L, f.Wd)); }
      for (let i = N; i >= 0; i--) { const u = -f.L / 2 + f.L * i / N; g.lineTo(u, leafHalf(u, f.L, f.Wd)); }
      g.closePath();
    };
    const [blade, bg] = make();
    path(bg); bg.fillStyle = LEAF_COLORS[f.color % LEAF_COLORS.length]; bg.fill();
    const sh = bg.createLinearGradient(0, -f.Wd / 2, 0, f.Wd / 2);
    sh.addColorStop(0, 'rgba(255,230,190,0.13)'); sh.addColorStop(0.5, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.28)');
    bg.fillStyle = sh; bg.fill();
    const [veins, vg] = make();
    vg.strokeStyle = '#b08a58'; vg.lineCap = 'round'; vg.lineWidth = 1.8;
    vg.beginPath(); vg.moveTo(-f.L / 2 - f.L * 0.13, 0); vg.lineTo(f.L * 0.46, 0); vg.stroke();
    vg.lineWidth = 1;
    for (let k = 1; k <= 7; k++) {
      const u = -f.L / 2 + f.L * k / 8.2, hh = leafHalf(u + f.L * 0.08, f.L, f.Wd) * 0.92;
      vg.beginPath(); vg.moveTo(u, 0); vg.quadraticCurveTo(u + f.L * 0.05, -hh * 0.5, u + f.L * 0.1, -hh);
      vg.moveTo(u, 0); vg.quadraticCurveTo(u + f.L * 0.05, hh * 0.5, u + f.L * 0.1, hh); vg.stroke();
    }
    a = { blade, veins, bx, by, bs, px };
    this.leafCache.set(f.id, a);
    return a;
  }
  _drawLeaves(g) {
    const sim = this.sim, t = sim.t;
    if (this.leafCache.size > sim.leaves.length + 16) {
      const ids = new Set(sim.leaves.map((f) => f.id));
      for (const id of this.leafCache.keys()) if (!ids.has(id)) this.leafCache.delete(id);
    }
    for (const f of sim.leaves) {
      if (t < f.t - 1.6) continue;
      const a = this._leafArt(f);
      if (!f.landed) {                         // im Fall: groß und unscharf, dreht sich, Schatten wandert heran
        const u = smooth((t - (f.t - 1.6)) / 1.6), sc = 1 + 1.25 * (1 - u), sway = Math.sin(u * Math.PI * 2.2) * 60 * (1 - u);
        const rot = f.spin * (1 - u) * (1 - u), ox = f.x - a.bx, oy = f.y - a.by;
        g.save(); g.globalAlpha = 0.45 * u; g.filter = `brightness(0) blur(${(4 + 14 * (1 - u)) * this.s}px)`;
        g.translate(f.x + 4 + 90 * (1 - u), f.y + 6 + 120 * (1 - u)); g.rotate(rot); g.drawImage(a.blade, -ox, -oy, a.bs, a.bs); g.restore();
        g.save(); g.globalAlpha = clamp01(u * 3); g.filter = `blur(${5 * (1 - u) * this.s}px)`;
        g.translate(f.x + sway, f.y - 40 * (1 - u)); g.rotate(rot); g.scale(sc, sc);
        g.drawImage(a.blade, -ox, -oy, a.bs, a.bs); g.globalAlpha *= 0.8; g.drawImage(a.veins, -ox, -oy, a.bs, a.bs); g.restore();
        continue;
      }
      const rem = f.total > 0 ? Math.max(0, f.remaining / f.total) : 0;
      const skel = f.doneT === null ? 1 : clamp01(1 - (t - f.doneT) / SKELETON_SEC);
      if (skel <= 0) continue;
      // Fertiges Blatt (Schatten + angefressene Fläche + Adern) nur neu zusammensetzen, wenn sich die Restmenge ändert
      const q = rem >= 0.999 ? 1 : Math.floor(rem * 200) / 200;     // in Schritten von 0,5 %
      if (!a.comp || a.rem !== q) this._composeLeaf(f, a, q);
      g.globalAlpha = skel; g.drawImage(a.comp, a.bx - PAD, a.by - PAD, a.cs, a.cs); g.globalAlpha = 1;
    }
  }
  _composeLeaf(f, a, rem) {
    const sim = this.sim, s = this.s, sg = this.scr.getContext('2d');
    sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = 'source-over'; sg.filter = 'none';
    sg.clearRect(0, 0, a.px, a.px); sg.drawImage(a.blade, 0, 0);
    if (rem < 0.999) {                       // angefressene Stellen über die Restmenge je Rasterzelle ausmaskieren
      const mg = this.msk.getContext('2d'), GW = sim.GW;
      mg.setTransform(1, 0, 0, 1, 0, 0); mg.clearRect(0, 0, a.px, a.px);
      for (const cell of f.cells) {
        if (sim.foodId[cell] !== f.id) continue;
        const v = sim.food[cell] / f.val;
        if (v <= 0.01) continue;
        mg.fillStyle = `rgba(255,255,255,${v.toFixed(3)})`;
        mg.fillRect(((cell % GW) * CS - a.bx - 1) * s, (((cell / GW) | 0) * CS - a.by - 1) * s, (CS + 2) * s, (CS + 2) * s);
      }
      sg.globalCompositeOperation = 'destination-in'; sg.filter = `blur(${2.2 * s}px)`; sg.drawImage(this.msk, 0, 0);
      sg.globalCompositeOperation = 'source-over'; sg.filter = 'none';
    }
    a.cs = a.bs + 2 * PAD;
    if (!a.comp) a.comp = this._canvas(Math.ceil(a.cs * s), Math.ceil(a.cs * s));
    const cg = a.comp.getContext('2d'), o = PAD * s;
    cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, a.comp.width, a.comp.height);
    cg.save(); cg.globalAlpha = 0.45; cg.filter = `brightness(0) blur(${4 * s}px)`; cg.drawImage(this.scr, 0, 0, a.px, a.px, o + 4 * s, o + 6 * s, a.px, a.px); cg.restore();
    cg.drawImage(this.scr, 0, 0, a.px, a.px, o, o, a.px, a.px);
    cg.globalAlpha = 0.3 + 0.6 * Math.sqrt(rem); cg.drawImage(a.veins, o, o); cg.globalAlpha = 1;
    a.rem = rem;
  }

  // ------------------------------------------------------------ Myzel
  // Zehntausende Segmente mit Leuchten (¼ und ½ Auflösung) und scharfen Linien (volle Auflösung) jedes Bild neu
  // zu zeichnen ist zu teuer. Das Netz liegt deshalb in zwei Zwischenspeichern, die abwechselnd über mehrere Bilder
  // verteilt neu entstehen und weich überblendet werden. Was seit dem älteren Speicher gewachsen ist, wird direkt
  // gezeichnet – alles additiv, damit sich Speicher und Neuzugänge exakt ergänzen.
  _colInfo() {
    const sim = this.sim, info = [];
    for (const c of sim.colonies) {
      if (!c) continue;
      const gen = sim.gens.find((x) => x.id === c.gen);
      info[c.ci] = { rgb: this.color(c.gen), growing: c.state === 'growing', live: c.state !== 'gone' && c.state !== 'removed',
        fp: c.state === 'fading' && gen ? clamp01((sim.t - gen.fadeT) / gen.fadeDur) : -1 };
    }
    return info;
  }
  /** Segmente [from, to) nach Kolonie, Verblassstufe und Dicke zu Pfaden bündeln; Narben getrennt nach Alter. */
  _collect(from, to, cnt, info, test, { partial = false, scars = true } = {}) {
    const sim = this.sim, paths = new Map(), head = sim.bio - 1, frac = sim.bioAcc, scar = sim.timing.scarSteps;
    const { sx0, sy0, sx1, sy1, sdead, sborn, scol, sband } = sim;
    for (let i = from; i < to; i++) {
      if (test && !test(i)) continue;
      let key, x1 = sx1[i], y1 = sy1[i];
      if (sdead[i] >= 0) {
        if (!scars) continue;
        const age = sim.bio - sdead[i];
        if (age > scar) continue;
        key = 1e7 + Math.min(2, Math.floor(age / (scar / 3)));
      } else {
        const ii = info[scol[i]];
        if (!ii || !ii.live) continue;
        const b = Math.min(NB - 1, Math.floor(Math.log2(1 + cnt[i]) * 0.95));
        // frisch gewachsene Spitze: das jüngste Segment wächst bis zum nächsten Schritt sichtbar nach
        if (partial && ii.growing && b === 0 && sborn[i] === head) { x1 = sx0[i] + (x1 - sx0[i]) * frac; y1 = sy0[i] + (y1 - sy0[i]) * frac; }
        key = scol[i] * 256 + (ii.fp >= 0 ? sband[i] & 6 : 0) * 16 + b;   // 4 Verblassstufen genügen fürs Bild
      }
      let p = paths.get(key);
      if (!p) paths.set(key, (p = new Path2D()));
      p.moveTo(sx0[i], sy0[i]); p.lineTo(x1, y1);
    }
    return paths;
  }
  _style(key, info) {
    const ci = Math.floor(key / 256), band = (key % 256) >> 4, b = key % 16, ii = info[ci];
    if (!ii) return null;
    const k = ii.fp >= 0 ? clamp01((ii.fp - band / 8 * 0.62) / 0.36) : 0;
    return { b, alpha: 1 - k, rgb: k > 0 ? mix(ii.rgb, ASH, k * 0.7) : ii.rgb };
  }
  _strokeCores(g, paths, info, mul) {
    if (mul <= 0) return;
    g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (const [key, p] of paths) {
      if (key >= 1e7) { g.strokeStyle = `rgba(150,122,92,${[0.26, 0.15, 0.07][key - 1e7] * mul})`; g.lineWidth = 0.9; g.stroke(p); continue; }
      const st = this._style(key, info);
      if (!st || st.alpha <= 0) continue;
      const tt = Math.min(1, st.b / (NB - 1));
      g.strokeStyle = rgba(mix(st.rgb, WHITE, 0.12 + tt * 0.55), Math.min(1, (0.3 + tt * 0.52) * st.alpha * mul));
      g.lineWidth = widthOf(st.b) * 0.62; g.stroke(p);
    }
  }
  _strokeGlow(buf, paths, info, mul) {
    if (mul <= 0) return;
    const glow = this.sim.cfg.glow, G = buf.g;
    G.lineCap = 'round'; G.globalCompositeOperation = 'lighter';
    for (const [key, p] of paths) {
      if (key >= 1e7) continue;                                   // Narben leuchten nicht
      const st = this._style(key, info);
      if (!st || st.alpha <= 0) continue;
      G.strokeStyle = rgba(st.rgb, Math.min(1, (0.05 + st.b * 0.025) * st.alpha * glow * mul));
      G.lineWidth = widthOf(st.b) * 4.5;
      G.stroke(p);
    }
  }
  _blur(src, dst, radius) {
    this._clear(dst); dst.g.setTransform(1, 0, 0, 1, 0, 0); dst.g.filter = `blur(${radius * src.k}px)`; dst.g.drawImage(src.c, 0, 0);
    dst.g.filter = 'none'; dst.g.setTransform(dst.k, 0, 0, dst.k, 0, 0);
  }
  _entry() {
    // Ein Speicher ist eine Ebene in voller Auflösung: scharfe Linien plus beim Fertigstellen eingerechnetes Leuchten.
    // (Jede bildschirmfüllende Ebene kostet bei 1440p spürbar Füllrate – deshalb nicht drei Ebenen je Speicher.)
    const { w, h } = this.world;
    return { core: this._buffer(w, h, 1), glow: this._buffer(w, h, 0.25) };
  }
  /** Leuchten aus dem ¼-Strichpuffer: breiter (14) und enger (3) Schein in einem Puffer zusammengefasst. */
  _glowLayer(src, dst) {
    this._clear(dst); const G = dst.g;
    G.setTransform(1, 0, 0, 1, 0, 0); G.globalCompositeOperation = 'lighter';
    G.filter = `blur(${14 * src.k}px)`; G.globalAlpha = 0.9; G.drawImage(src.c, 0, 0);
    G.filter = `blur(${3 * src.k}px)`; G.globalAlpha = 0.55; G.drawImage(src.c, 0, 0);
    G.filter = 'none'; G.globalAlpha = 1; G.globalCompositeOperation = 'source-over'; G.setTransform(dst.k, 0, 0, dst.k, 0, 0);
  }
  _show(g, e, alpha) {
    if (alpha <= 0) return;
    const { w, h } = this.world;
    g.globalAlpha = alpha; g.drawImage(e.core.c, 0, 0, w, h); g.globalAlpha = 1;
  }
  _drawHyphae(g) {
    const sim = this.sim, C = this.cache, sborn = sim.sborn, cnt = sim.counts(), info = this._colInfo();
    // 1) nächsten Zwischenspeicher (Leuchten + scharfe Fäden) ein Stück weiter aufbauen
    let b = C.build;
    if (!b || b.compactions !== sim.compactions || b.n0 > sim.NS) {
      this._clear(C.next.core); this._clear(C.next.glow);
      b = C.build = { cut: sim.bio - 1, n0: sim.NS, pos: 0, compactions: sim.compactions, chunk: Math.max(2500, Math.ceil(sim.NS / BUILD_FRAMES)) };
    }
    const end = Math.min(b.n0, b.pos + b.chunk), cut = b.cut;
    if (end > b.pos) {
      const paths = this._collect(b.pos, end, cnt, info, (i) => sborn[i] < cut);
      this._strokeCores(C.next.core.g, paths, info, 1);
      this._strokeGlow(C.next.glow, paths, info, 1);
    }
    b.pos = end;
    if (b.pos >= b.n0) {
      this._glowLayer(C.next.glow, this.glowTmp);                 // Leuchten einmalig in die Linienebene einrechnen
      const cg = C.next.core.g, { w, h } = this.world;
      cg.save(); cg.globalCompositeOperation = 'lighter'; cg.drawImage(this.glowTmp.c, 0, 0, w, h); cg.restore();
      const old = C.prev;
      C.prev = C.cur; C.cur = C.next; C.next = old; C.prevCut = C.curCut; C.curCut = cut; C.ready = sim.step; C.build = null;
    }
    // 2) älteren in neueren Speicher überblenden; was keiner der beiden enthält, direkt dazu (alles additiv)
    const u = clamp01((sim.step - C.ready) / FADE_TICKS);
    g.save(); g.globalCompositeOperation = 'lighter';
    this._show(g, C.prev, 1 - u); this._show(g, C.cur, u);
    let lo = 0, hi = sim.NS;                                       // erstes Segment, das jünger ist als der ältere Speicher
    while (lo < hi) { const m = (lo + hi) >> 1; if (sborn[m] < C.prevCut) lo = m + 1; else hi = m; }
    const curCut = C.curCut, F = this.fresh;
    const fresh = this._collect(lo, sim.NS, cnt, info, (i) => sborn[i] >= curCut, { partial: true });
    const fading = u < 1 ? this._collect(lo, sim.NS, cnt, info, (i) => sborn[i] < curCut, { partial: true }) : null;
    this._clear(F.glow);
    if (fading) this._strokeGlow(F.glow, fading, info, 1 - u);
    this._strokeGlow(F.glow, fresh, info, 1);
    this._glowLayer(F.glow, F.glowB);
    const { w, h } = this.world;
    g.drawImage(F.glowB.c, 0, 0, w, h);
    if (fading) this._strokeCores(g, fading, info, 1 - u);
    this._strokeCores(g, fresh, info, 1);
    g.restore();
    return cnt;
  }
  _drawTipsAndPulses(g, cnt) {
    const sim = this.sim, frac = sim.bioAcc;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const c of sim.colonies) {
      if (!c || (c.state !== 'growing' && c.state !== 'fruiting')) continue;
      const rgb = this.color(c.gen);
      if (c.state === 'growing') {
        const sp = this.sprite(rgb, 22, 0.8);
        for (const t of c.tips) {
          const i = t.seg, fresh = sim.sborn[i] === sim.bio - 1;
          const x = fresh ? sim.sx0[i] + (sim.sx1[i] - sim.sx0[i]) * frac : t.x, y = fresh ? sim.sy0[i] + (sim.sy1[i] - sim.sy0[i]) * frac : t.y;
          g.drawImage(sp, x - 11, y - 11, 22, 22);
        }
      }
      if (!sim.cfg.pulses) continue;
      // Nährstoffe wandern als Lichtpunkte von den Blättern zur Keimstelle
      const fed = [];
      for (const i of c.segs) if (sim.sdead[i] < 0 && sim.bio - sim.sfed[i] < 200) fed.push(i);
      if (!fed.length) continue;
      const big = this.sprite(mix(rgb, WHITE, 0.35), 30, 1), stride = Math.max(1, Math.floor(fed.length / 22));
      const pos = sim.t * 30, ip = Math.floor(pos), fp = pos - ip, used = new Set();
      for (let k = 0; k < fed.length; k += stride) {
        let i = fed[k], d = 0;
        const off = ip + k * 7;
        while (i >= 0 && d < 4000) {
          const p = sim.spar[i];
          if ((((d - off) % 48) + 48) % 48 === 0 && !used.has(i) && cnt[i] > 3 && p >= 0) {
            used.add(i);
            const x = sim.sx1[i] + (sim.sx1[p] - sim.sx1[i]) * fp, y = sim.sy1[i] + (sim.sy1[p] - sim.sy1[i]) * fp;
            g.drawImage(big, x - 15, y - 15, 30, 30);
          }
          i = p; d++;
        }
      }
    }
    g.restore();
  }
  _cap(g, x, y, r, rgb, glow, glowRgb = rgb) {
    g.drawImage(this.capShadow, x + 6 - r * 2, y + 9 - r * 2, r * 4, r * 4);   // vorgefertigter weicher Schatten
    const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.05, x, y, r);
    gr.addColorStop(0, rgba(mix(rgb, WHITE, 0.75), 1)); gr.addColorStop(0.45, rgba(mix(rgb, WHITE, 0.15), 1));
    gr.addColorStop(0.85, rgba(mix(rgb, [0, 0, 0], 0.45), 1)); gr.addColorStop(1, rgba(mix(rgb, [0, 0, 0], 0.7), 1));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.strokeStyle = rgba(mix(rgb, [0, 0, 0], 0.5), 0.5); g.lineWidth = 0.8; g.beginPath();
    for (let k = 0; k < 28; k++) { const a = k / 28 * TAU; g.moveTo(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78); g.lineTo(x + Math.cos(a) * r * 0.97, y + Math.sin(a) * r * 0.97); }
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.5)';
    for (let k = 0; k < 4; k++) { const a = 0.7 + k * 1.7, rr = r * (0.3 + 0.12 * k); g.beginPath(); g.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, r * 0.07, 0, TAU); g.fill(); }
    if (glow > 0) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = glow; const s = 64 * r / 20; g.drawImage(this.sprite(glowRgb, 64, 0.6), x - s / 2, y - s / 2, s, s); g.restore(); }
  }
  _drawMushrooms(g) {
    const sim = this.sim, t = sim.t, popDur = sim.timing.popDur;
    for (const gen of sim.gens) for (const m of gen.mushrooms) {
      if (t < m.growT) continue;
      const base = this.color(gen.id), s = easeOutBack((t - m.growT) / popDur), wither = clamp01((t - gen.fadeT - 1.2) / (gen.fadeDur * 0.66));
      if (wither >= 1) continue;
      const flash = t >= m.relT ? Math.exp(-(t - m.relT) * 3.2) : 0;
      const rgb = mix(mix(base, WHITE, flash * 0.6), WITHER, wither * 0.85);
      g.save(); g.globalCompositeOperation = 'lighter';
      const R = 170 * Math.max(0.2, s), ha = (0.32 + 0.5 * flash) * (1 - wither) * Math.min(1.4, this.sim.cfg.glow);
      const halo = g.createRadialGradient(m.x, m.y, 0, m.x, m.y, R);
      halo.addColorStop(0, rgba(base, ha)); halo.addColorStop(0.4, rgba(base, ha * 0.35)); halo.addColorStop(1, rgba(base, 0));
      g.fillStyle = halo; g.fillRect(m.x - R, m.y - R, R * 2, R * 2);
      const rt = t - m.relT;                              // Ringwelle beim Aufplatzen
      if (rt > 0 && rt < 0.9) { g.strokeStyle = rgba(mix(base, WHITE, 0.5), 0.7 * (1 - rt / 0.9)); g.lineWidth = 3; g.beginPath(); g.arc(m.x, m.y, 30 + rt * 240, 0, TAU); g.stroke(); }
      g.restore();
      g.save(); g.globalAlpha = 1 - wither;
      const sc = Math.max(0, s) * (1 - 0.25 * wither);
      for (const [dx, dy, r] of m.caps.slice().sort((a, b) => a[2] - b[2])) this._cap(g, m.x + dx * sc, m.y + dy * sc, Math.max(0.5, r * sc), rgb, (1 - wither) * (1 + flash), base);
      g.restore();
    }
  }
  _drawSpores(g) {
    const sim = this.sim, t = sim.t;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const s of sim.spores) {
      const age = t - s.born;
      if (age < 0 || age > s.life) continue;
      const u = age / s.life, alpha = Math.min(1, age / 0.3) * Math.pow(1 - u, 1.3);
      const q = Math.round(u * 8) / 8, rgb = mix(this.color(s.gen), this.color(s.gen + 1), q), size = (10 + 18 * u) * s.size;
      g.globalAlpha = alpha * 0.85; g.drawImage(this.sprite(rgb, 32, 0.9), s.x - size / 2, s.y - size / 2, size, size);
    }
    for (const gen of sim.gens) for (const L of gen.landings) {      // die Sporen, die landen und keimen
      if (t < L.depart || t > L.t + 1) continue;
      const to = this.color(gen.id), from = gen.id > 0 ? this.color(gen.id - 1) : mix(to, WHITE, 0.3);
      if (t <= L.t) {
        for (let k = 6; k >= 0; k--) {
          const u = smooth((t - k * 0.05 - L.depart) / (L.t - L.depart));
          if (u <= 0) continue;
          const x = (1 - u) * (1 - u) * L.fromX + 2 * (1 - u) * u * L.cx + u * u * L.x;
          const y = (1 - u) * (1 - u) * L.fromY + 2 * (1 - u) * u * L.cy + u * u * L.y;
          const size = (40 + 70 * Math.sin(Math.PI * u)) * (1 - k * 0.11);
          g.globalAlpha = (k === 0 ? 1 : 0.35 * (1 - k / 7)) * Math.min(1, (t - L.depart) / 0.3);
          g.drawImage(this.sprite(mix(from, to, Math.round(u * 8) / 8), 48, 1), x - size / 2, y - size / 2, size, size);
        }
      } else {
        const rt = t - L.t;
        g.globalAlpha = 1 - rt; g.strokeStyle = rgba(mix(to, WHITE, 0.5), 0.8); g.lineWidth = 2.5;
        g.beginPath(); g.arc(L.x, L.y, 10 + rt * 170, 0, TAU); g.stroke();
        const s = 90 * (1 - rt * 0.6); g.drawImage(this.sprite(to, 64, 1), L.x - s / 2, L.y - s / 2, s, s);
      }
    }
    g.restore();
  }

  // ------------------------------------------------------------ Anzeige (englisch, wie alle Videotexte)
  _glowText(g, txt, x, y, size, rgb, align = 'left') {
    g.save(); g.font = `700 ${size}px ${FONT}`; g.textAlign = align; g.textBaseline = 'alphabetic';
    if ('letterSpacing' in g) g.letterSpacing = `${size * 0.06}px`;
    g.shadowColor = rgba(rgb, 0.9); g.shadowBlur = size * 0.4 * this.s; g.fillStyle = rgba(mix(rgb, WHITE, 0.45), 1);
    g.fillText(txt, x, y); g.shadowBlur = size * 0.12 * this.s; g.fillText(txt, x, y); g.restore();
  }
  _label(g, txt, x, y, size, color, align = 'left') {
    g.save(); g.font = `600 ${size}px ${FONT}`; g.textAlign = align;
    if ('letterSpacing' in g) g.letterSpacing = `${size * 0.18}px`;
    g.fillStyle = color; g.fillText(txt, x, y); g.restore();
  }
  _hud(g) {
    const sim = this.sim, gen = sim.liveGeneration, t = sim.t;
    const k = gen && gen.id > 0 && t - gen.t0 < 1 ? clamp01(t - gen.t0) : 1;
    const rgb = gen ? (gen.id > 0 ? mix(this.color(gen.id - 1), this.color(gen.id), k) : this.color(gen.id)) : this.color(0);
    const line = `GENERATION ${gen ? gen.id + 1 : 1}   ·   LEAVES EATEN ${sim.leavesEaten}   ·   DAY ${1 + Math.floor(t / sim.timing.dayLen)}`;
    const panel = (x, y, w, h) => { g.save(); g.fillStyle = 'rgba(8,10,12,0.66)'; g.strokeStyle = 'rgba(160,190,200,0.2)'; g.lineWidth = 2; g.beginPath(); g.roundRect(x, y, w, h, 16); g.fill(); g.stroke(); g.restore(); };
    const kind = sim.field.kind, { w } = this.world;
    if (kind === 'portrait') {
      panel(70, 36, 940, 134);
      this._glowText(g, 'ENDLESS MYCELIUM', w / 2, 112, 66, rgb, 'center');
      this._label(g, line, w / 2, 150, 17, 'rgba(220,228,232,0.75)', 'center');
    } else if (kind === 'landscape') {
      panel(28, 24, 640, 112);
      this._glowText(g, 'ENDLESS MYCELIUM', 52, 90, 54, rgb);
      this._label(g, line.replace(/ {3}/g, '  '), 54, 122, 15, 'rgba(220,228,232,0.75)');
    } else {
      panel(40, 24, w - 80, 108);
      this._glowText(g, 'ENDLESS MYCELIUM', w / 2, 86, 52, rgb, 'center');
      this._label(g, line.replace(/ {3}/g, '  '), w / 2, 118, 15, 'rgba(220,228,232,0.75)', 'center');
    }
  }

  paint(g) {
    const { w, h } = this.world;
    g.imageSmoothingEnabled = true;
    g.drawImage(this.ground.c, 0, 0, w, h);
    this._drawLeaves(g);
    const cnt = this._drawHyphae(g);
    this._drawTipsAndPulses(g, cnt);
    this._drawMushrooms(g);
    this._drawSpores(g);
    g.drawImage(this.shade.c, 0, 0, w, h);
    if (this.view.hud) this._hud(g);
  }
  destroy() {
    const bufs = [this.ground, this.shade, this.glowTmp, ...Object.values(this.fresh)];
    for (const e of [this.cache.prev, this.cache.cur, this.cache.next]) bufs.push(...Object.values(e));
    for (const b of bufs) b.c.width = b.c.height = 1;
    this.leafCache.clear(); this.sprites.clear();
    super.destroy();
  }
}

M.Renderer = MyceliumRenderer; // für Messungen und Tests

const PHASES = { start: 'Start', landing: 'Spore fliegt', growing: 'Netz wächst', fruiting: 'Pilze wachsen', spores: 'Sporen fliegen' };
const x = (v) => `${String(v).replace('.', ',')}×`;
EBS.registerScenario({
  id: 'mycelium', title: 'Endless Mycelium',
  // YouTube-Standard für dieses Szenario: 1440p (YouTube vergibt ab 1440p den besseren Codec), 60 fps, hohe Qualität
  videoDefaults: { resolution: 1440, fps: 60, quality: { crf: 16, preset: 'medium' } },
  defaults: normalizeParams({}),
  controls: [
    { key: 'cycleSec', label: 'Dauer einer Generation', type: 'range', min: 12, max: 180, step: 2, restart: true, format: (v) => `${v} s` },
    { key: 'spread', label: 'Ausbreitung des Netzes', type: 'range', min: 0.4, max: 1.6, step: 0.05, restart: true, format: x },
    { key: 'branching', label: 'Verzweigung', type: 'range', min: 0.5, max: 1.6, step: 0.05, restart: true, format: x },
    { key: 'colonies', label: 'Neue Kolonien je Generation', type: 'range', min: 1, max: 3, step: 1, restart: true, format: (v) => String(v) },
    { key: 'startLeaves', label: 'Laub am Boden zu Beginn', type: 'range', min: 0, max: 16, step: 1, restart: true, format: (v) => `${v} Blätter` },
    { key: 'leafFall', label: 'Fallende Blätter je Generation', type: 'range', min: 0, max: 10, step: 1, restart: true, format: (v) => `${v} Blätter` },
    { key: 'digest', label: 'Verdauungstempo', type: 'range', min: 0.4, max: 2.5, step: 0.05, restart: true, format: x },
    { key: 'mushrooms', label: 'Pilze je Generation', type: 'range', min: 1, max: 6, step: 1, restart: true, format: (v) => String(v) },
    { key: 'spores', label: 'Sporen je Pilz', type: 'range', min: 0, max: 250, step: 10, restart: true, format: (v) => String(v) },
    { key: 'wind', label: 'Wind für die Sporen', type: 'range', min: 0, max: 2.5, step: 0.1, restart: true, format: x },
    { key: 'palette', label: 'Farben der Generationen', type: 'select',
      options: [['cycle', 'Wechselnd (Mint, Violett, Bernstein, Blau)'], ['mint', 'Nur Mint'], ['cool', 'Kühle Töne'], ['warm', 'Warme Töne']] },
    { key: 'glow', label: 'Leuchtstärke', type: 'range', min: 0.3, max: 1.8, step: 0.05, format: x },
    { key: 'pulses', label: 'Nährstoffpulse zeigen', type: 'check' },
  ],
  normalizeParams,
  create: (ctx) => new Simulation(ctx),
  createRenderer: (ctx) => new MyceliumRenderer(ctx),
  panelStats(sim) {
    const s = sim.snapshot();
    return [
      { key: 'generation', label: 'Generation', value: s.generation },
      { key: 'phase', label: 'Phase', value: PHASES[s.phase] || s.phase },
      { key: 'eaten', label: 'Blätter gefressen', value: s.leavesEaten },
      { key: 'ground', label: 'Blätter am Boden', value: s.leavesOnGround },
      { key: 'alive', label: 'Hyphen im Netz', value: EBS.util.fmtInt(s.alive) },
      { key: 'mush', label: 'Pilze', value: s.mushrooms },
    ];
  },
  panelNote: (sim) => {
    const s = sim.snapshot(), T = sim.timing;
    return `Generation ${s.generation} · ${PHASES[s.phase] || s.phase} · eine Generation dauert ${Math.round(T.C)} s Simulationszeit`;
  },
  // Independent AAC channels/no noise substitution, plus measured codec headroom.
  audio: { aacIndependent: true, ceilingDb: -3, events: {
    // Weiche, im Code erzeugte Töne (lib/audio.mjs) statt harter Glasklänge: ruhige Mischung ohne starkes Begrenzen
    spore_land: { label: 'Spore landet', samples: ['synth:myco-seed'], gain: 0.30, detune: 0.2 },
    leaf_land: { label: 'Blatt landet', samples: ['impactSoft_medium_000'], gain: 0.12, semis: 3, detune: 1 },
    // jedes gefressene Blatt einen Ton weiter auf der Dur-Pentatonik – es entsteht eine kleine Melodie
    leaf_eaten: { label: 'Blatt aufgefressen', samples: ['synth:myco-pling'], gain: 0.26, scale: [0, 2, 4, 7, 9, 12], detune: 0.05 },
    mushroom: { label: 'Pilz wächst', samples: ['synth:myco-pop'], gain: 0.42, detune: 1 },
    spore_burst: { label: 'Sporenwolke', samples: ['synth:myco-breeze'], gain: 0.32, detune: 0.5 },
    ambience: { label: 'Nachtluft', samples: ['synth:myco-night'], gain: 0.09 },
  } },
});
})();
