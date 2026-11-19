/* Scrap Wars: Schuss-, Treffer-, Explosions- und K.o.-Effekte nach der Stilbibel im Ausbau-Plan (R40/E).
   Nur Darstellung und zustandslos: Alles folgt aus dem Effektalter, der Ereigniszeit und noise(seed, i).
   Auf hellen Karten feste Farben mit dunkler Kontur, Leuchten nur auf dunklen Karten und höchstens 30 %. */
(function () {
  'use strict';
  const TAU = Math.PI * 2, OUTLINE = '#0a1218';
  const noise = (seed, i) => {
    let n = Math.imul(seed + 1, 374761393) ^ Math.imul(i + 1, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const rgb = color => { const c = parseInt(color.slice(1), 16); return [c >> 16 & 255, c >> 8 & 255, c & 255]; };
  const rgba = (color, alpha) => { const [r, g, b] = rgb(color); return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`; };
  const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`; };
  const shade = (color, f) => `rgb(${rgb(color).map(v => Math.round(v * f)).join(',')})`;
  const easeOut = u => 1 - (1 - Math.min(1, Math.max(0, u))) ** 3;
  const circle = (g, x, y, r) => { g.beginPath(); g.arc(x, y, Math.max(0, r), 0, TAU); };
  const poly = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); };
  const glow = (g, x, y, radius, color, alpha) => {
    if (radius <= 0 || alpha <= 0) return;
    const gr = g.createRadialGradient(x, y, 0, x, y, radius);
    gr.addColorStop(0, rgba(color, alpha)); gr.addColorStop(1, rgba(color, 0));
    g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = gr; g.fillRect(x - radius, y - radius, radius * 2, radius * 2); g.restore();
  };
  // Vierzackiger Stern: lang entlang x, schmal entlang y
  const star = (g, cx, cy, long, wide, back = 1) => {
    const k = Math.min(long, wide) * .3;
    poly(g, [[cx + long, cy], [cx + k, cy + k], [cx, cy + wide], [cx - k, cy + k], [cx - long * back, cy], [cx - k, cy - k], [cx, cy - wide], [cx + k, cy - k]]);
  };
  const outlined = (g, fill, sunny, width = 1.2, alpha = .6) => {
    if (sunny) { g.strokeStyle = rgba(OUTLINE, alpha); g.lineWidth = width; g.stroke(); }
    g.fillStyle = fill; g.fill();
  };
  function spark(g, x0, y0, x1, y1, alpha, sunny, width = 1.6) {
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1);
    if (sunny) { g.strokeStyle = rgba(OUTLINE, .55 * alpha); g.lineWidth = width + 1.6; g.stroke(); }
    g.strokeStyle = rgba('#ffcf5a', alpha); g.lineWidth = width; g.stroke();
    g.beginPath(); g.moveTo((x0 + x1) / 2, (y0 + y1) / 2); g.lineTo(x1, y1);
    g.strokeStyle = rgba('#fff6d8', alpha); g.lineWidth = width * .55; g.stroke();
  }

  // E1 · Mündungsfeuer im Turm-Koordinatensystem (nach rotate(aim)); age = Sekunden seit dem Schuss
  function muzzle(g, x, age, color, sunny) {
    if (!(age >= 0 && age < .1)) return;
    const u = age / .1, f = 1 - .45 * u;
    g.save(); g.globalAlpha = 1 - u * u;
    if (!sunny) glow(g, x + 6, 0, 24, color, .3 * (1 - u));
    star(g, x + 5, 0, 9 * f, 4 * f, .55); g.lineJoin = 'round'; outlined(g, color, sunny, 1.4, .65);
    star(g, x + 5, 0, 5.5 * f, 2.3 * f, .55); g.fillStyle = '#fff4d6'; g.fill();
    g.restore();
  }
  // E1 · Rückstoß: Turm 6 AE, Chassis 1,5 AE, über 0,12 s zurückfedernd (Anteil 0..1)
  const recoil = age => !(age >= 0 && age < .12) ? 0 : age < .02 ? age / .02 : 1 - (age - .02) / .1;

  // E1 · Blaster-Geschoss: Kapsel 18 × 6 AE, weißer Kern, Rand in Teamfarbe, drei Nachzieher
  const capsule = (g, x, y, w, h) => { g.beginPath(); g.roundRect(x, y, w, h, h / 2); };
  function bolt(g, p, color, sunny) {
    const a = Math.atan2(p.vy, p.vx);
    g.save(); g.translate(p.x, p.y); g.rotate(a);
    if (!sunny) glow(g, 0, 0, 16, color, .3);
    for (let k = 3; k >= 1; k--) {
      const s = 1 - k * .18; g.globalAlpha = .55 - k * .13;
      capsule(g, -k * 9 - 12 * s, -3 * s, 16 * s, 6 * s); g.fillStyle = color; g.fill();
    }
    g.globalAlpha = 1;
    capsule(g, -14, -3, 18, 6); outlined(g, color, sunny, 1, .6);
    capsule(g, -11, -1.4, 13, 2.8); g.fillStyle = '#ffffff'; g.fill();
    g.restore();
  }

  // E2 · Treffer am Roboter (Effekt der Größe 24): Kontaktstern und 6–8 Funken mit Kontur, höchstens 0,35 s
  function robotHit(g, e, sunny) {
    const u = e.age / .35; if (u >= 1) return;
    const seed = e.seed >>> 0, n = 6 + Math.floor(noise(seed, 1) * 3);
    g.save(); g.translate(e.x, e.y); g.lineCap = 'round';
    if (u < .22) {
      const k = 1 - u / .22; g.save(); g.rotate(noise(seed, 2) * TAU);
      star(g, 0, 0, 10 * (.6 + .4 * k), 10 * (.6 + .4 * k)); outlined(g, '#ffe38f', sunny, 1.2, .6 * k);
      star(g, 0, 0, 5 * k, 5 * k); g.fillStyle = '#ffffff'; g.fill(); g.restore();
      if (!sunny) glow(g, 0, 0, 18, '#ffe5aa', .3 * k);
    }
    for (let i = 0; i < n; i++) {
      const a = noise(seed, i + 10) * TAU, d = (10 + 8 * noise(seed, i + 20)) * easeOut(u), len = (6 + 4 * noise(seed, i + 30)) * (1 - u) + 1.5;
      spark(g, Math.cos(a) * Math.max(0, d - len), Math.sin(a) * Math.max(0, d - len), Math.cos(a) * d, Math.sin(a) * d, 1 - u * u, sunny);
    }
    g.restore();
  }

  // E3 · Treffer an Deckung je Material. e.cover = Material, (e.nx, e.ny) = Richtung von der Deckung weg.
  // Unter v3 lebt der Effekt 0,28 s; längerer Staub braucht die Trefferstelle im Ereignis (erst v4).
  const COVER = {
    wood: { pieces: 5, colors: ['#c98a46', '#8a5a2b'], dust: '#e8d6b0', dustAlpha: .25, reach: [12, 24], shape: 'splinter' },
    stone: { pieces: 4, colors: ['#768b9c', '#5f7282'], dust: '#b9bdb7', dustAlpha: .4, reach: [10, 20], shape: 'chunk' },
    concrete: { pieces: 3, colors: ['#d0ccc0', '#a9a397'], dust: '#d8d2c4', dustAlpha: .5, reach: [8, 16], shape: 'chunk' },
  };
  function coverHit(g, e, sunny) {
    const u = e.age / e.ttl; if (u >= 1) return;
    const m = COVER[e.cover] || COVER.stone, seed = e.seed >>> 0, base = Math.atan2(e.ny || 0, e.nx || 1);
    g.save(); g.translate(e.x, e.y); g.lineJoin = 'round';
    // Staub
    const big = e.cover === 'concrete';
    for (let i = 0; i < (big ? 3 : 2); i++) {
      const a = base + (noise(seed, i + 40) - .5) * 1.4, d = (big ? 8 : 5) * easeOut(u) * (1 + i * .6);
      const r = (big ? 14 + 16 * easeOut(u) : 7 + 9 * easeOut(u)) * (1 - i * .25);
      circle(g, Math.cos(a) * d, Math.sin(a) * d, r); g.fillStyle = rgba(m.dust, m.dustAlpha * (1 - u) * (i ? .7 : 1)); g.fill();
    }
    // Stücke
    for (let i = 0; i < m.pieces; i++) {
      const a = base + (noise(seed, i) - .5) * 1.8, d = (m.reach[0] + (m.reach[1] - m.reach[0]) * noise(seed, i + 10)) * easeOut(u);
      const hop = Math.sin(Math.PI * Math.min(1, u * 1.2)) * 6, rot = noise(seed, i + 20) * TAU + u * 4;
      g.save(); g.translate(Math.cos(a) * d, Math.sin(a) * d - hop); g.rotate(rot); g.globalAlpha = 1 - u ** 3;
      if (m.shape === 'splinter') { g.beginPath(); g.rect(-3.5, -1, 7, 2); }
      else { const s = 2.6 + noise(seed, i + 30) * 1.4; poly(g, [[-s, -s * .7], [s * .8, -s], [s, s * .6], [-s * .5, s]]); }
      outlined(g, m.colors[i % 2], sunny, 1, .7); g.restore();
    }
    if (u < .25) { star(g, 0, 0, 6 * (1 - u / .25), 6 * (1 - u / .25)); g.fillStyle = rgba('#fff4d6', 1 - u / .25); g.fill(); }
    g.restore();
  }
  // Kleiner Einschlag ohne zugeordnete Deckung (z. B. ältere Arenen)
  function impact(g, e) {
    const u = e.age / e.ttl; if (u >= .3) return;
    g.save(); g.translate(e.x, e.y); star(g, 0, 0, 6 * (1 - u / .3), 6 * (1 - u / .3)); g.fillStyle = rgba('#fff4d6', 1 - u / .3); g.fill(); g.restore();
  }

  // E4 · Explosion in Stufen (Blitz, Feuerball, Staubring); E5 · K.o. = 1,25-fach plus 12 Funken
  function blast(g, e, under, sunny, ko = false) {
    const age = e.age, s = Math.min(150, Math.max(4, e.size || 60)) * (ko ? 1.25 : 1), seed = e.seed >>> 0;
    g.save(); g.translate(e.x, e.y);
    if (under) {
      if (age < .5) {
        const u = age / .5; circle(g, 0, 0, s * (.3 + .5 * easeOut(u)));
        g.strokeStyle = rgba('#cfc6b0', (sunny ? .35 : .22) * (1 - u)); g.lineWidth = s * .08 * (1 - u) + 1.5; g.stroke();
      }
      g.restore(); return;
    }
    if (age < .3) {
      const u = age / .3, R = s * (.18 + .16 * easeOut(u)), n = 5 + Math.floor(noise(seed, 1) * 3);
      const color = u < .5 ? mix('#ffd36b', '#ff8a3d', u / .5) : mix('#ff8a3d', '#d9472b', (u - .5) / .5);
      const blobs = Array.from({ length: n }, (_, i) => {
        const a = noise(seed, i + 30) * TAU, d = R * .5 * noise(seed, i + 40);
        return [Math.cos(a) * d, Math.sin(a) * d - u * R * .15, R * (.42 + .28 * noise(seed, i + 50)) * (1 - .2 * u)];
      });
      g.save(); g.globalAlpha = u < .5 ? 1 : 1 - (u - .5) / .5;
      if (!sunny) glow(g, 0, 0, R * 1.5, '#ffb347', .3 * (1 - u));
      if (sunny) for (const [x, y, r] of blobs) { circle(g, x, y, r + 2); g.fillStyle = rgba(OUTLINE, .55); g.fill(); }
      for (const [x, y, r] of blobs) { circle(g, x, y, r); g.fillStyle = color; g.fill(); }
      for (const [x, y, r] of blobs.slice(0, 3)) { circle(g, x - r * .15, y - r * .2, r * .5); g.fillStyle = mix('#fff4d6', '#ffb347', Math.min(1, u * 1.6)); g.fill(); }
      g.restore();
    }
    if (age < .05) { circle(g, 0, 0, s * .2); g.fillStyle = rgba('#ffffff', .9 * (1 - age / .05)); g.fill(); }
    if (ko && age < .5) {
      const u = age / .5; g.lineCap = 'round';
      for (let i = 0; i < 12; i++) {
        const a = noise(seed, i + 70) * TAU, d = (20 + 25 * noise(seed, i + 80)) * easeOut(u), len = (8 + 5 * noise(seed, i + 90)) * (1 - u) + 2;
        spark(g, Math.cos(a) * Math.max(0, d - len), Math.sin(a) * Math.max(0, d - len), Math.cos(a) * d, Math.sin(a) * d, 1 - u * u, sunny, 1.8);
      }
    }
    g.restore();
  }

  // Liegende Teile: Blechsplitter (E2), Trümmer (E4). Flug, dann bleiben sie bis Rundenende liegen.
  function debris(g, items, sunny) {
    g.save(); g.lineJoin = 'round';
    for (const d of items) {
      const u = Math.min(1, d.age / d.flight), k = easeOut(u), x = d.x + Math.cos(d.dir) * d.dist * k, y = d.y + Math.sin(d.dir) * d.dist * k;
      const hop = Math.sin(Math.PI * u) * d.hop, rot = d.rot + d.spin * k, s = d.size;
      const shape = () => d.kind === 'plank' ? poly(g, [[-s, -s * .2], [s * .9, -s * .26], [s, s * .2], [-s * .85, s * .24]])
        : d.kind === 'splinter' ? poly(g, [[-s, -s * .45], [s * .7, -s * .6], [s, s * .35], [-s * .6, s * .55]])
        : poly(g, [[-s, -s * .6], [-s * .1, -s], [s * .9, -s * .5], [s, s * .5], [0, s], [-s * .8, s * .7]]);
      g.save(); g.translate(x + 1.2, y + 1.8); g.rotate(rot); shape(); g.fillStyle = rgba(OUTLINE, sunny ? .22 : .35); g.fill(); g.restore();
      g.save(); g.translate(x, y - hop); g.rotate(rot); shape(); outlined(g, d.color, true, sunny ? 1 : .8, sunny ? .7 : .5); g.restore();
    }
    g.restore();
  }
  // E5 · Abgesprengter Turm: dreht sich 0,6 s, fliegt 30–50 AE und bleibt neben dem Wrack liegen
  function turret(g, t, sunny) {
    const u = Math.min(1, t.age / .6), k = easeOut(u), x = t.x + Math.cos(t.dir) * t.dist * k, y = t.y + Math.sin(t.dir) * t.dist * k;
    const hop = Math.sin(Math.PI * u) * 16 * t.scale, rot = t.rot + t.spin * k;
    g.save(); g.translate(x, y); g.scale(t.scale, t.scale);
    g.save(); g.translate(3, 5); g.rotate(rot); circle(g, 0, 0, 11); g.fillStyle = rgba(OUTLINE, .28); g.fill(); g.fillRect(4, -3, 22, 6); g.restore();
    g.translate(0, -hop / t.scale); g.rotate(rot);
    g.beginPath(); g.roundRect(4, -3.2, 24, 6.4, 2); outlined(g, '#2f3b42', true, 1.2, .8);
    circle(g, 0, 0, 10.5); const m = g.createLinearGradient(-6, -10, 8, 10);
    m.addColorStop(0, '#5f6d72'); m.addColorStop(1, '#1d282e'); outlined(g, m, true, 1.3, .85);
    circle(g, 0, 0, 6); g.strokeStyle = shade(t.color, .55); g.lineWidth = 2.2; g.stroke();
    circle(g, 0, 0, 2.4); g.fillStyle = '#11191e'; g.fill();
    g.restore();
  }
  // Rauch und Wölkchen: flache Wolken, weich ausblendend
  function puffs(g, list) {
    for (const p of list) { circle(g, p.x, p.y, p.r); g.fillStyle = rgba(p.color, p.alpha); g.fill(); }
  }
  // Weißes Aufblitzen der Roboter-Silhouette (E2): weiße Kopie der Körpertextur, einmal je Textur erzeugt
  const whites = new WeakMap();
  function whiteOf(canvas) {
    let w = whites.get(canvas);
    if (!w) {
      w = document.createElement('canvas'); w.width = canvas.width; w.height = canvas.height;
      // Nur der feste Körper wird weiß; weiche Ränder (Schatten, Schein) bleiben durchsichtig
      const c = w.getContext('2d'); c.drawImage(canvas, 0, 0);
      const img = c.getImageData(0, 0, w.width, w.height), px = img.data;
      for (let i = 0; i < px.length; i += 4) { const solid = px[i + 3] > 200; px[i] = px[i + 1] = px[i + 2] = 255; px[i + 3] = solid ? 255 : 0; }
      c.putImageData(img, 0, 0);
      whites.set(canvas, w);
    }
    return w;
  }

  EBS.ScrapEffectsArt = { noise, rgba, shade, easeOut, muzzle, recoil, bolt, robotHit, coverHit, impact, blast, debris, turret, puffs, whiteOf, COVER };
})();
