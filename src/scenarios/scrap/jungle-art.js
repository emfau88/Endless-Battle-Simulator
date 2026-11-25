/* D1 · Jungle Ruins: Boden, Blätterdach und Deckungen der Dschungel-Karte (Tageslicht wie Sunny Yard).
 * Alles wird einmal je Kartengröße gezeichnet und zwischengespeichert. Der kosmetische Zufall kommt aus einer festen
 * Rauschfunktion, nie aus der Simulation; Boden und Dach hängen nur von Kartengröße und Kartengeometrie ab. */
(function () {
  'use strict';
  const TAU = Math.PI * 2, EDGE = 18;
  // Farben für Trümmer und Bruchstücke; Namen für die Legende in der Kopfleiste (Video-Text englisch)
  const palette = { wood: '#a97c4c', stone: '#8b9a7e', concrete: '#d9c692' };
  const names = { wood: 'WOOD', stone: 'ROCK', concrete: 'TEMPLE' };
  const noise = (seed, i) => { let n = Math.imul(seed + 1, 374761393) ^ Math.imul(i + 1, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const stream = seed => { let i = 0; return () => noise(seed, i++); };
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.ceil(w * 2); c.height = Math.ceil(h * 2); return c; };
  const pick = (list, v) => list[Math.min(list.length - 1, Math.floor(v * list.length))];
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1, 7), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  function blob(g, x, y, r, color, alpha) {
    const t = g.createRadialGradient(x, y, 0, x, y, r);
    t.addColorStop(0, rgba(color, alpha)); t.addColorStop(.55, rgba(color, alpha * .6)); t.addColorStop(1, rgba(color, 0));
    g.fillStyle = t; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function poly(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); }
  function line(g, x, y, xx, yy, color, width = 1) { g.beginPath(); g.moveTo(x, y); g.lineTo(xx, yy); g.strokeStyle = color; g.lineWidth = width; g.stroke(); }
  function disc(g, x, y, r, color) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = color; g.fill(); }
  // Spitzes Blatt vom Ansatz (x, y) in Richtung ang
  function leaf(g, x, y, ang, len, wid, fill, rib) {
    g.save(); g.translate(x, y); g.rotate(ang);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * .45, -wid, len, 0); g.quadraticCurveTo(len * .45, wid, 0, 0); g.fillStyle = fill; g.fill();
    if (rib) { g.beginPath(); g.moveTo(len * .06, 0); g.lineTo(len * .9, 0); g.strokeStyle = rib; g.lineWidth = Math.max(.35, wid * .13); g.stroke(); }
    g.restore();
  }
  // Breites Blatt (Banane, Taro) mit Seitenadern
  function broad(g, x, y, ang, len, wid, fill, dark, light) {
    g.save(); g.translate(x, y); g.rotate(ang);
    g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(len * .15, -wid * 1.15, len * .75, -wid, len, 0); g.bezierCurveTo(len * .75, wid, len * .15, wid * 1.15, 0, 0);
    g.fillStyle = fill; g.fill();
    g.save(); g.clip();
    g.fillStyle = rgba(dark, .28); g.fillRect(0, 0, len, wid * 1.2);
    for (let i = 1; i < 9; i++) { const px = len * i / 9; line(g, px, 0, px + len * .1, -wid, rgba(dark, .35), .6); line(g, px, 0, px + len * .1, wid, rgba(dark, .35), .6); }
    g.restore();
    line(g, len * .03, 0, len * .95, 0, light, Math.max(.7, wid * .09));
    g.restore();
  }
  // Palmwedel: Mittelrippe mit Fiederblättern
  function frond(g, x, y, ang, len, fill, dark, bend = 0) {
    g.save(); g.translate(x, y); g.rotate(ang);
    const n = Math.max(6, Math.round(len / 3.6));
    for (let i = 1; i <= n; i++) {
      const u = i / n, px = u * len, py = bend * len * u * u, l = 3 + len * .3 * Math.sin(Math.PI * Math.pow(u, .75) * .93 + .12);
      for (const side of [-1, 1]) leaf(g, px, py, side * (1.05 - .5 * u) + bend * u * 1.4, l, Math.max(1, l * .17), side < 0 ? fill : dark);
    }
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * .5, bend * len * .25, len, bend * len); g.strokeStyle = dark; g.lineWidth = 1.5; g.stroke();
    g.restore();
  }
  // Farnrosette am Boden
  function rosette(g, x, y, size, R, greens) {
    const n = 6 + Math.floor(R() * 5), turn = R() * TAU;
    for (let i = 0; i < n; i++) leaf(g, x + 1.4, y + 2, turn + i * TAU / n + R() * .3, size * (.75 + R() * .3), size * .17, 'rgba(18,44,28,.28)');
    for (let i = 0; i < n; i++) leaf(g, x, y, turn + i * TAU / n + R() * .3, size * (.75 + R() * .3), size * (.15 + R() * .06), pick(greens, R()), 'rgba(214,232,150,.35)');
    disc(g, x, y, size * .1, '#31502f');
  }
  const GRASS = ['#8fa858', '#4f7040', '#a6b862', '#416240', '#6d8f4b'];
  const LEAVES = ['#2f7a3d', '#3e9348', '#256638', '#58a84e', '#1f5a34'];
  const FRONDS = ['#3e9348', '#2f7a3d', '#4aa04c', '#256638', '#2a6f3a'];
  const SLAB = ['#b6b097', '#a9a58e', '#c0baa0', '#9f9c88', '#b0ab8c'];

  // ---- Boden ---------------------------------------------------------------------------------------------------
  // geo: { blocks, pads } der Runde in Motorkoordinaten (quer). Hochkant wird das Querbild gedreht wie mapPoint.
  const floors = new Map();
  function floor(w, h, geo) {
    const key = `${w}:${h}`;
    if (floors.has(key)) return floors.get(key);
    let c;
    if (h > w) {
      const land = paintFloor(h, w, geo); c = canvas(w, h);
      const g = c.getContext('2d'); g.translate(c.width, 0); g.rotate(Math.PI / 2); g.drawImage(land, 0, 0);
    } else c = paintFloor(w, h, geo);
    if (floors.size >= 4) floors.clear();
    floors.set(key, c); return c;
  }
  function paintFloor(w, h, geo) {
    const seed = 9041, c = canvas(w, h), g = c.getContext('2d'), R = stream(seed); g.scale(2, 2); g.lineCap = 'round'; g.lineJoin = 'round';
    const cx = w / 2, cy = h / 2, k = w / 1352, blocks = geo.blocks, pads = geo.pads.map(p => [p.x, p.y]);
    const boxDistance = (x, y, b) => Math.hypot(x - Math.max(b.x, Math.min(x, b.x + b.w)), y - Math.max(b.y, Math.min(y, b.y + b.h)));
    const nearBlock = (x, y) => Math.min(...blocks.map(b => boxDistance(x, y, b)));
    const nearPad = (x, y) => Math.min(...pads.map(([px, py]) => Math.hypot(px - x, py - y)));
    const wallDistance = (x, y) => Math.min(x, y, w - x, h - y);
    // 1) Gras und Moos
    const base = g.createLinearGradient(0, 0, w, h); base.addColorStop(0, '#869a54'); base.addColorStop(.5, '#66844b'); base.addColorStop(1, '#4e6f49');
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) blob(g, R() * w, R() * h, 50 + R() * 130, pick(['#a9b55c', '#3a5a3d', '#5a7d45', '#34523a', '#93a655'], R()), .1 + R() * .14);
    // 2) Festgefahrene Erde: Wege durch die Tore, Lichtungen an Plattformen und Startecken
    const earth = [];
    for (let x = 70 * k; x <= w - 70 * k; x += 9) earth.push([x, cy + (R() - .5) * 14, 36]);
    for (let y = 50 * k; y <= h - 50 * k; y += 9) earth.push([cx + (R() - .5) * 14, y, 34]);
    const clearings = [[110, cy, 84], [w / k - 110, cy, 84], [200, 150, 96], [w / k - 200, 150, 96], [200, h / k - 150, 96], [w / k - 200, h / k - 150, 96],
      [cx / k, 96, 100], [cx / k, h / k - 96, 100], [430, 130, 70], [w / k - 430, 130, 70], [430, h / k - 130, 70], [w / k - 430, h / k - 130, 70]];
    for (const [px, py, r] of clearings) for (let i = 0; i < 14; i++) {
      const a = R() * TAU, d = R() * r * .7; earth.push([px * k + Math.cos(a) * d, py * k + Math.sin(a) * d * .8, r * (.35 + R() * .3)]);
    }
    for (const [x, y, r] of earth) blob(g, x, y, r * (1.1 + R() * .3), '#9c865c', .34);
    for (const [x, y, r] of earth) blob(g, x + (R() - .5) * 10, y + (R() - .5) * 10, r * .62, '#bda676', .3);
    for (const [x, y, r] of earth) for (let i = 0; i < 6; i++) {
      const a = R() * TAU, d = R() * r * .8, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d, size = .6 + R() * 1.5;
      g.beginPath(); g.ellipse(px, py, size * 1.3, size, R() * 3, 0, TAU); g.fillStyle = R() > .5 ? 'rgba(92,78,52,.4)' : 'rgba(226,210,166,.5)'; g.fill();
    }
    // 3) Grashalme
    for (let i = 0; i < 26000; i++) {
      const x = R() * w, y = R() * h, a = -Math.PI / 2 + (R() - .5) * 2.2, l = 2 + R() * 4.5;
      line(g, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, rgba(pick(GRASS, R()), .3 + R() * .35), .6 + R() * .6);
    }
    // 4) Steinplatten der Tempelruine, nach außen lückenhaft; Plattenwege durch die vier Tore
    const slabs = inside => {
      const cw = 36, ch = 30;
      for (let row = -1, y = 0; y < h; y += ch, row++) for (let col = -1, x = (row % 2 ? -cw / 2 : 0); x < w; x += cw, col++) {
        const mx = x + cw / 2, my = y + ch / 2, n = row * 131 + col * 17, keep = inside(mx, my);
        if (keep <= 0 || noise(seed + 5, n) > keep) continue;
        const j = i => (noise(seed + 9, n * 8 + i) - .5) * 5;
        const pts = [[x + 1.5 + j(0), y + 1.5 + j(1)], [x + cw - 1.5 + j(2), y + 1.5 + j(3)], [x + cw - 1.5 + j(4), y + ch - 1.5 + j(5)], [x + 1.5 + j(6), y + ch - 1.5 + j(7)]];
        g.save(); g.translate(1.2, 1.6); poly(g, pts); g.fillStyle = 'rgba(40,54,38,.55)'; g.fill(); g.restore();
        poly(g, pts); g.fillStyle = pick(SLAB, noise(seed + 6, n)); g.fill();
        g.save(); g.clip();
        g.fillStyle = noise(seed + 7, n) > .5 ? 'rgba(255,248,214,.10)' : 'rgba(60,80,62,.12)'; g.fillRect(x - 4, y - 4, cw + 8, ch + 8);
        for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? 'rgba(255,250,224,.3)' : 'rgba(70,80,64,.28)'; g.fillRect(x + noise(seed + 12, n * 16 + i) * cw, y + noise(seed + 13, n * 16 + i) * ch, .5 + noise(seed + 14, n + i) * 1.4, .6); }
        if (noise(seed + 15, n) > .62) blob(g, x + noise(seed + 16, n) * cw, y + noise(seed + 17, n) * ch, 9 + noise(seed + 18, n) * 12, '#5f8444', .6);
        if (noise(seed + 19, n) > .8) { const sx = x + 6 + noise(seed + 20, n) * (cw - 12); g.beginPath(); g.moveTo(sx, y); g.lineTo(sx + 3, y + ch * .4); g.lineTo(sx - 2, y + ch * .7); g.lineTo(sx + 2, y + ch); g.strokeStyle = 'rgba(64,72,58,.6)'; g.lineWidth = .8; g.stroke(); }
        g.restore();
        line(g, pts[0][0] + 1, pts[0][1] + .8, pts[1][0] - 1, pts[1][1] + .8, 'rgba(240,235,206,.55)', .8);
        line(g, pts[0][0] + .8, pts[0][1] + 1, pts[3][0] + .8, pts[3][1] - 1, 'rgba(240,235,206,.35)', .7);
      }
    };
    const a = 232 * k, b = 200 * k;
    slabs((x, y) => { const d = Math.max(Math.abs(x - cx) / a, Math.abs(y - cy) / b); return d > 1.12 ? 0 : d < .78 ? 1.2 : (1.12 - d) / .34; });
    slabs((x, y) => Math.abs(x - cx) < 40 && Math.abs(y - cy) > b * .9 ? .75 - Math.abs(Math.abs(y - cy) - b) / h * 1.6 : 0);
    slabs((x, y) => Math.abs(y - cy) < 36 && Math.abs(x - cx) > a * .9 ? .7 - Math.abs(Math.abs(x - cx) - a) / w * 1.3 : 0);
    // 5) Steinsockel unter den äußeren Plattformen, Sonnenrad unter der mittleren
    for (const [px, py] of pads) {
      if (Math.hypot(px - cx, py - cy) < 40) { emblem(g, px, py, 68 * Math.max(.9, k)); continue; }
      disc(g, px + 2, py + 3, 49, 'rgba(36,52,36,.45)');
      for (let i = 0; i < 10; i++) {
        const a0 = i * TAU / 10 + .04, a1 = (i + 1) * TAU / 10 - .04;
        g.beginPath(); g.arc(px, py, 48, a0, a1); g.arc(px, py, 30, a1, a0, true); g.closePath(); g.fillStyle = pick(SLAB, noise(seed + 30, i + px)); g.fill();
        g.beginPath(); g.arc(px, py, 47, a0 + .03, a1 - .03); g.strokeStyle = 'rgba(244,238,208,.5)'; g.lineWidth = .8; g.stroke();
      }
      blob(g, px - 30, py + 26, 20, '#5f8444', .65); blob(g, px + 34, py - 22, 16, '#5f8444', .55);
    }
    // 6) Wurzeln, die vom Rand hereinwachsen
    for (let i = 0; i < 14; i++) {
      const side = i % 4, u = .08 + R() * .84, len = 34 + R() * 46;
      let x = side === 0 ? u * w : side === 1 ? w - EDGE + 2 : side === 2 ? u * w : EDGE - 2, y = side === 0 ? EDGE - 2 : side === 1 ? u * h : side === 2 ? h - EDGE + 2 : u * h;
      let ang = [Math.PI / 2, Math.PI, -Math.PI / 2, 0][side] + (R() - .5) * 1.1;
      if (nearBlock(x, y) < 40) continue;
      const turn = (R() - .5) * .09, steps = Math.round(len / 3);
      for (let s = 0; s < steps; s++) {
        const wdt = 6.5 * (1 - s / steps) + 1.2, nx = x + Math.cos(ang) * 3, ny = y + Math.sin(ang) * 3;
        line(g, x + 1.2, y + 1.8, nx + 1.2, ny + 1.8, 'rgba(26,40,26,.35)', wdt); line(g, x, y, nx, ny, '#6a5238', wdt); line(g, x - .6, y - .8, nx - .6, ny - .8, 'rgba(176,146,102,.6)', wdt * .3);
        x = nx; y = ny; ang += turn + (R() - .5) * .22;
      }
    }
    // 7) Pflanzen am Boden: an Deckungen und am Rand dichter, freie Fahrwege bleiben ruhig
    for (let i = 0, placed = 0; i < 1400 && placed < 150; i++) {
      const x = EDGE + R() * (w - EDGE * 2), y = EDGE + R() * (h - EDGE * 2), size = 8 + R() * 9, near = Math.min(nearBlock(x, y), wallDistance(x, y) - EDGE + 6);
      if (near > 44 + R() * 30 || near < 3 || nearPad(x, y) < 56) continue;
      if (R() > .72) broad(g, x, y, R() * TAU, size * 1.5, size * .5, pick(LEAVES, R()), '#1c4a2c', 'rgba(190,226,140,.6)');
      else rosette(g, x, y, size, R, ['#4f8a45', '#3c7440', '#6aa350', '#2f6238']);
      placed++;
    }
    for (let i = 0; i < 70; i++) {   // kleine Blüten, bewusst nicht in den Teamfarben
      const x = EDGE + R() * (w - EDGE * 2), y = EDGE + R() * (h - EDGE * 2), color = pick(['#f4f1e0', '#c3a8ea', '#f3c1d3', '#f4f1e0'], R());
      if (nearPad(x, y) < 50) continue;
      for (let n = 0; n < 3 + R() * 5; n++) { const px = x + (R() - .5) * 16, py = y + (R() - .5) * 12; disc(g, px + .5, py + .7, 1.5, 'rgba(24,44,28,.3)'); disc(g, px, py, 1 + R() * .7, color); disc(g, px, py, .4, '#e9c95c'); }
    }
    for (let i = 0; i < 420; i++) {   // Laub
      const x = R() * w, y = R() * h;
      leaf(g, x, y, R() * TAU, 3 + R() * 3.5, 1 + R() * .7, rgba(pick(['#c9aa4e', '#8f7d3e', '#a8713c', '#d6c377', '#74813f'], R()), .75));
    }
    for (let i = 0; i < 90; i++) {   // Steine
      const x = EDGE + R() * (w - EDGE * 2), y = EDGE + R() * (h - EDGE * 2), r = 1.6 + R() * 3.6;
      if (nearPad(x, y) < 50) continue;
      g.beginPath(); g.ellipse(x + 1, y + 1.4, r * 1.2, r * .9, 0, 0, TAU); g.fillStyle = 'rgba(26,42,28,.35)'; g.fill();
      g.beginPath(); g.ellipse(x, y, r * 1.15, r * .85, R() * 3, 0, TAU); g.fillStyle = pick(['#9aa08c', '#84897a', '#b1b29c'], R()); g.fill();
      g.beginPath(); g.ellipse(x - r * .3, y - r * .3, r * .5, r * .3, 0, 0, TAU); g.fillStyle = 'rgba(244,240,214,.5)'; g.fill();
    }
    // 8) Licht: Sonnenflecken, kühle Schatten des Blätterdachs am Rand
    for (let i = 0; i < 60; i++) blob(g, R() * w, R() * h, 26 + R() * 70, '#fff2ae', .07 + R() * .1);
    for (let i = 0; i < 150; i++) {
      const u = R(), side = i % 4, x = side === 0 || side === 2 ? u * w : side === 1 ? w : 0, y = side === 0 ? 0 : side === 2 ? h : u * h;
      blob(g, x + (R() - .5) * 30, y + (R() - .5) * 30, 40 + R() * 60, '#0e2a1c', .2 + R() * .14);
    }
    const sun = g.createLinearGradient(0, 0, w, h); sun.addColorStop(0, 'rgba(255,226,150,.14)'); sun.addColorStop(.55, 'rgba(255,226,150,0)'); sun.addColorStop(1, 'rgba(20,60,70,.12)');
    g.fillStyle = sun; g.fillRect(0, 0, w, h);
    rim(g, w, h, R);
    return c;
  }
  // Sonnenrad: verwitterter Steinkreis mit Strahlenkranz aus Jade und Gold
  function emblem(g, x, y, r) {
    g.save(); g.translate(x, y);
    disc(g, 2, 3, r + 2, 'rgba(34,48,34,.5)');
    const t = g.createRadialGradient(-r * .3, -r * .3, r * .1, 0, 0, r); t.addColorStop(0, '#d2cbad'); t.addColorStop(1, '#aaa58c');
    disc(g, 0, 0, r, t);
    const ring = (rr, color, width) => { g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.strokeStyle = color; g.lineWidth = width; g.stroke(); };
    ring(r - 1.5, 'rgba(84,88,70,.8)', 1.6); ring(r - 3, 'rgba(246,240,212,.6)', .8);
    for (let i = 0; i < 16; i++) {
      const a = i * TAU / 16, a2 = a + TAU / 32, inner = r * .6, outer = r * .9;
      poly(g, [[Math.cos(a - .12) * inner, Math.sin(a - .12) * inner], [Math.cos(a) * outer, Math.sin(a) * outer], [Math.cos(a + .12) * inner, Math.sin(a + .12) * inner]]);
      g.fillStyle = i % 2 ? 'rgba(84,160,146,.75)' : 'rgba(206,168,76,.75)'; g.fill(); g.strokeStyle = 'rgba(70,74,58,.7)'; g.lineWidth = .7; g.stroke();
      line(g, Math.cos(a2) * inner, Math.sin(a2) * inner, Math.cos(a2) * (r - 4), Math.sin(a2) * (r - 4), 'rgba(84,88,70,.55)', .8);
    }
    ring(r * .58, 'rgba(84,88,70,.8)', 1.4); ring(r * .56, 'rgba(246,240,212,.5)', .7);
    blob(g, r * .55, r * .5, r * .42, '#5f8444', .7); blob(g, -r * .7, r * .1, r * .3, '#5f8444', .55);
    g.restore();
  }
  // Rand: niedrige Ruinenmauer, dicht bewachsen (im Bodenbild, also unter den Robotern)
  function rim(g, w, h, R) {
    g.fillStyle = '#26382b'; g.fillRect(0, 0, w, EDGE); g.fillRect(0, h - EDGE, w, EDGE); g.fillRect(0, 0, EDGE, h); g.fillRect(w - EDGE, 0, EDGE, h);
    const stone = (x, y, sw, sh) => {
      g.fillStyle = pick(['#8c927c', '#7b8371', '#9b9e86', '#6f7767'], R()); g.beginPath(); g.roundRect(x, y, sw, sh, 2); g.fill();
      line(g, x + 1.5, y + 1, x + sw - 1.5, y + 1, 'rgba(236,236,208,.5)', .8);
      if (R() > .5) blob(g, x + R() * sw, y + R() * sh, 8 + R() * 7, '#4f7a40', .8);
    };
    for (let x = 0; x < w;) { const l = 24 + R() * 26; stone(x + 1, 3, l - 2, EDGE - 5); x += l; }
    for (let x = 0; x < w;) { const l = 24 + R() * 26; stone(x + 1, h - EDGE + 2, l - 2, EDGE - 5); x += l; }
    for (let y = EDGE; y < h - EDGE;) { const l = 24 + R() * 26; stone(3, y + 1, EDGE - 5, l - 2); y += l; }
    for (let y = EDGE; y < h - EDGE;) { const l = 24 + R() * 26; stone(w - EDGE + 2, y + 1, EDGE - 5, l - 2); y += l; }
    // Schlagschatten der Mauer (Licht von links oben)
    let t = g.createLinearGradient(0, EDGE, 0, EDGE + 13); t.addColorStop(0, 'rgba(12,34,24,.42)'); t.addColorStop(1, 'rgba(12,34,24,0)'); g.fillStyle = t; g.fillRect(EDGE, EDGE, w - EDGE * 2, 13);
    t = g.createLinearGradient(EDGE, 0, EDGE + 11, 0); t.addColorStop(0, 'rgba(12,34,24,.38)'); t.addColorStop(1, 'rgba(12,34,24,0)'); g.fillStyle = t; g.fillRect(EDGE, EDGE, 11, h - EDGE * 2);
    line(g, EDGE, h - EDGE, w - EDGE, h - EDGE, 'rgba(232,230,196,.55)', 1.4); line(g, w - EDGE, EDGE, w - EDGE, h - EDGE, 'rgba(214,220,190,.4)', 1.2);
    // Bewuchs auf der Mauer
    const per = 2 * (w + h);
    for (let d = 0; d < per; d += 7 + R() * 9) {
      let x, y, inward;
      if (d < w) { x = d; y = 4 + R() * 12; inward = Math.PI / 2; } else if (d < w + h) { x = w - 4 - R() * 12; y = d - w; inward = Math.PI; }
      else if (d < 2 * w + h) { x = d - w - h; y = h - 4 - R() * 12; inward = -Math.PI / 2; } else { x = 4 + R() * 12; y = d - 2 * w - h; inward = 0; }
      const n = 3 + Math.floor(R() * 4);
      for (let i = 0; i < n; i++) {
        const a = inward + (R() - .5) * 2.6, l = 9 + R() * 12;
        leaf(g, x + 1.2, y + 1.8, a, l, l * .24, 'rgba(10,30,20,.3)');
        leaf(g, x, y, a, l, l * (.2 + R() * .08), pick(LEAVES, R()), 'rgba(170,214,120,.4)');
      }
    }
  }

  // ---- Blätterdach über den Robotern, unter den Namensschildern ------------------------------------------------
  // Ragt höchstens rund 12 Einheiten über die Fahrfläche; in den Ecken ein Fächer aus Wedeln und breiten Blättern.
  const canopies = new Map();
  function canopy(w, h) {
    const key = `${w}:${h}`;
    if (canopies.has(key)) return canopies.get(key);
    const top = canvas(w, h), g = top.getContext('2d'), R = stream(4177); g.scale(2, 2); g.lineCap = 'round';
    for (const [cx, cy, dir] of [[-6, -6, Math.PI / 4], [w + 6, -6, Math.PI * 3 / 4], [w + 6, h + 6, -Math.PI * 3 / 4], [-6, h + 6, -Math.PI / 4]]) {
      const n = 6;
      for (let i = 0; i < n; i++) {
        const a = dir + (i - (n - 1) / 2) * .34 + (R() - .5) * .1, len = 58 + R() * 18 - Math.abs(i - (n - 1) / 2) * 5;
        if (i % 2) broad(g, cx, cy, a, len * .9, len * .19, pick(LEAVES, R()), '#17462a', 'rgba(196,232,146,.75)');
        else frond(g, cx, cy, a, len, pick(['#3e9348', '#2f7a3d', '#4aa04c'], R()), '#1f5d33', (R() - .5) * .25);
      }
    }
    const per = 2 * (w + h);
    for (let d = 70 + R() * 30; d < per - 60; d += 62 + R() * 58) {
      let x, y, inward;
      if (d < w) { x = d; y = -5; inward = Math.PI / 2; } else if (d < w + h) { x = w + 5; y = d - w; inward = Math.PI; }
      else if (d < 2 * w + h) { x = d - w - h; y = h + 5; inward = -Math.PI / 2; } else { x = -5; y = d - 2 * w - h; inward = 0; }
      if (Math.min(Math.hypot(x, y), Math.hypot(w - x, y), Math.hypot(x, h - y), Math.hypot(w - x, h - y)) < 95) continue;
      const kind = R(), n = 2 + Math.floor(R() * 2);
      for (let i = 0; i < n; i++) {
        const a = inward + (i - (n - 1) / 2) * .7 + (R() - .5) * .3, reach = 34 / Math.max(.55, Math.cos(a - inward));
        const len = Math.min(46, reach) * (.82 + R() * .18);
        if (kind > .55) frond(g, x, y, a, len, pick(FRONDS, R()), '#1a4f2c', (R() - .5) * .3);
        else broad(g, x, y, a, len, len * .22, pick(LEAVES, R()), '#17462a', 'rgba(196,232,146,.75)');
      }
    }
    // Weicher Schatten des Dachs, nach rechts unten versetzt
    const out = canvas(w, h), og = out.getContext('2d'), mask = canvas(w, h), mg = mask.getContext('2d');
    mg.drawImage(top, 0, 0); mg.globalCompositeOperation = 'source-in'; mg.fillStyle = '#0a2416'; mg.fillRect(0, 0, mask.width, mask.height);
    og.filter = 'blur(5px)'; og.globalAlpha = .34; og.drawImage(mask, 11, 15); og.filter = 'none'; og.globalAlpha = 1;
    og.drawImage(top, 0, 0);
    mask.width = mask.height = 1; top.width = top.height = 1;
    if (canopies.size >= 4) canopies.clear();
    canopies.set(key, out); return out;
  }

  // ---- Deckungen: Tageslicht-Deckung, grüner getönt, mit Moos, Ranken und Tempel-Mäander -------------------------
  const TINT = { wood: '#d2c0a2', stone: '#c5d0ae', concrete: '#f1dca6' };
  const baseCache = new Map();
  function block(b, cache) {
    const { w, h, material } = b, stage = Math.min(3, Math.floor((1 - b.hp / b.maxHp) * 4)), seed = b.id % 8 + 17;
    const key = `jungle:${material}:${w}:${h}:${stage}:${seed}`;
    if (cache.has(key)) return cache.get(key);
    const base = EBS.ScrapDaylightArt.block(b, baseCache), c = document.createElement('canvas'); c.width = base.canvas.width; c.height = base.canvas.height;
    const g = c.getContext('2d'); g.drawImage(base.canvas, 0, 0);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = TINT[material]; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(base.canvas, 0, 0); g.globalCompositeOperation = 'source-over';
    g.scale(2, 2); g.translate(base.pad, base.pad); g.lineCap = 'round'; g.lineJoin = 'round';
    const R = stream(seed * 31 + w * 7 + h), bevel = material === 'wood' ? 2 : material === 'stone' ? 7 : 3;
    const outline = [[bevel, -7], [w - bevel, -7], [w, -7 + bevel], [w, h - 8 - bevel], [w - bevel, h - 8], [bevel, h - 8], [0, h - 8 - bevel], [0, -7 + bevel]];
    g.save(); poly(g, outline); g.clip();
    if (material === 'concrete') {
      // Tempelstein: eingemeißelter Rahmen und Stufenmäander
      const carve = pts => { for (const [dx, dy, color, width] of [[.8, .9, 'rgba(255,246,208,.7)', 1], [0, 0, 'rgba(112,90,52,.75)', 1.2]]) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x + dx, y + dy) : g.moveTo(x + dx, y + dy)); g.strokeStyle = color; g.lineWidth = width; g.stroke(); } };
      carve([[5, -2], [w - 5, -2], [w - 5, h - 13], [5, h - 13], [5, -2]]);
      const wide = w >= h, span = (wide ? w : h - 5) - 20, n = Math.max(1, Math.floor(span / 24)), step = span / n, mid = wide ? (h - 15) / 2 : w / 2;
      for (let i = 0; i < n; i++) {
        const o = 10 + i * step + step / 2, q = Math.min(8, step * .36, (wide ? h - 15 : w) * .28);
        const fret = [[-q, q], [-q, -q], [q, -q], [q, q * .45], [-q * .35, q * .45], [-q * .35, -q * .3], [q * .35, -q * .3]];
        carve(fret.map(([fx, fy]) => wide ? [o + fx, mid + fy] : [mid + fy, o - 5 + fx]));
      }
      for (const [px, py] of [[9, 2], [w - 9, 2], [9, h - 17], [w - 9, h - 17]]) { disc(g, px, py, 1.9, 'rgba(70,150,136,.9)'); disc(g, px - .5, py - .5, .7, 'rgba(214,244,226,.8)'); }
    }
    if (material === 'stone') for (let i = 0; i < 26; i++) { g.fillStyle = 'rgba(64,84,60,.22)'; g.fillRect(R() * w, -7 + R() * h, 2 + R() * 5, 1 + R() * 2); }
    // Moos von den Ecken her
    const mossy = material === 'stone' ? 3 : material === 'concrete' ? 2 : 1;
    for (let m = 0; m < mossy; m++) {
      const [mx, my] = pick([[0, -7], [w, -7], [0, h - 8], [w, h - 8], [w / 2, -7], [0, h / 2 - 8]], R()), spread = material === 'stone' ? 15 : 10;
      for (let i = 0; i < 16; i++) { const a = R() * TAU, d = R() * spread; disc(g, mx + Math.cos(a) * d, my + Math.sin(a) * d, 2 + R() * 3.4, pick(['#55883f', '#6aa04a', '#447536', '#7cae56'], R())); }
      for (let i = 0; i < 12; i++) { const a = R() * TAU, d = R() * spread; disc(g, mx + Math.cos(a) * d - .6, my + Math.sin(a) * d - .6, .7, 'rgba(206,232,150,.7)'); }
    }
    // Ranke quer über die Oberseite
    if (material !== 'concrete' || R() > .4) {
      const y0 = -7 + R() * (h - 4), y1 = -7 + R() * (h - 4), bulge = (R() - .5) * 16, steps = Math.max(5, Math.round(w / 7));
      const at = i => { const u = i / steps; return [u * w, y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * bulge + Math.sin(u * 9 + seed) * 1.6]; };
      g.beginPath(); for (let i = 0; i <= steps; i++) { const [x, y] = at(i); i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.strokeStyle = '#2f5d30'; g.lineWidth = 1.3; g.stroke();
      for (let i = 0; i <= steps; i++) { const [x, y] = at(i); leaf(g, x, y, (i % 2 ? 1 : -1) * (1 + R() * .5) + (R() - .5), 4.5 + R() * 3, 1.5 + R() * .7, pick(['#3f8a40', '#58a84e', '#2f6f38'], R()), 'rgba(196,232,146,.5)'); }
    }
    g.restore();
    // Farn am Fuß der Deckung
    if (w >= 50) for (let m = 0; m < 2; m++) { const x = 6 + R() * (w - 12); for (let i = 0; i < 5; i++) leaf(g, x, h + 3, -Math.PI / 2 + (i - 2) * .5 + (R() - .5) * .2, 8 + R() * 6, 1.8, pick(['#3f8a40', '#58a84e', '#2f6f38'], R()), 'rgba(196,232,146,.5)'); }
    if (baseCache.size >= 160) baseCache.clear();
    const result = { canvas: c, shadow: base.shadow, pad: base.pad, width: base.width, height: base.height };
    if (cache.size >= 160) cache.clear(); cache.set(key, result); return result;
  }
  EBS.ScrapJungleArt = { floor, canopy, block, palette, names };
})();
