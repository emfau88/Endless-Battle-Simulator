/* Endless Battle Simulator – Seeschlacht: Segelschäden (Modus „Ruhiges Duell“)
 *
 * Gemeinsame Geometrie für Simulation (Durchflug der Kugeln) und Darstellung (Tuch mit ausgestanzten Löchern).
 * Die Simulation hält je Segel nur Zahlen und eine Lochliste. Alles Sichtbare leitet die Darstellung daraus ab,
 * Schwingen ist eine reine Funktion der Zeit – das Bild hängt also nur vom Zustand ab (Seek-Regel).
 * Der Standardmodus der Seeschlacht benutzt diese Datei nicht.
 */
(function () {
'use strict';
const { RNG, canvasTex } = EBS;
const { clamp, lerp, lerpColor } = EBS.util;

const SAIL = {
  // Durchschüsse bis zur vollen Abnutzung je Segel: Großsegel, Großmarssegel, Focksegel, Vormarssegel, Klüver.
  // Gemessen im ruhigen Duell (Querformat, Seeds 42 und 7, 570 s): rund 40 / 28 / 117 / 43 / 155 Durchschüsse.
  // Eingestellt für einen 10-Minuten-Film: Die Bugsegel sind nach etwa 9½ Minuten voll abgenutzt, das Großmarssegel
  // erreicht etwa 75 %, das Wappensegel etwa 60 % (das Schiff bleibt erkennbar).
  fullHits: [72, 38, 116, 44, 150],
  maxHoles: [11, 6, 9, 5, 6],   // einzelne Löcher je Segel bei voller Schiffsgröße; weitere Durchschüsse vergrößern vorhandene
  minSpeed: 140,                // langsamere Kugeln (Roller an Deck) reißen kein Loch
  pad: 10, texScale: 2,         // Rand und Auflösung der Tuch-Textur
};

// ---------- Geometrie (Schiffskoordinaten; Ursprung eines Segels = Mitte der Rah bzw. Ecke des Klüver-Rahmens) ----------
function layout(g, len, f) {
  const mains = g.masts[0], fore = g.masts[1];
  const defs = [[mains, 0.22, 0.55, 0.44], [mains, 0.58, 0.8, 0.33], [fore, 0.2, 0.55, 0.36], [fore, 0.58, 0.82, 0.27]];
  const sails = defs.map(([m, a, b, w], idx) => {
    const hw = (w * len) / 2, hgt = m.h * (b - a);
    return { idx, kind: 'square', x: m.x, y: g.deckY - m.h * b, hw, hgt, bulge: f * hgt * 0.12, emblem: idx === 0 };
  });
  const tri = [g.bowsprit[1], [fore.x + f * fore.w, g.deckY - fore.h * 0.7], [fore.x + f * 0.14 * len, g.deckY - 0.12 * len]];
  const x0 = Math.min(tri[0][0], tri[1][0], tri[2][0]), y0 = Math.min(tri[0][1], tri[1][1], tri[2][1]);
  const x1 = Math.max(tri[0][0], tri[1][0], tri[2][0]), y1 = Math.max(tri[0][1], tri[1][1], tri[2][1]);
  sails.push({ idx: 4, kind: 'jib', x: x0, y: y0, w: x1 - x0, h: y1 - y0, tri: tri.map(([x, y]) => [x - x0, y - y0]), emblem: false });
  return sails;
}
/** Liegt der Punkt (relativ zum Segelursprung) im Tuch? */
function contains(s, x, y) {
  if (s.kind === 'jib') {
    const [a, b, c] = s.tri, sg = (p, q) => (x - q[0]) * (p[1] - q[1]) - (p[0] - q[0]) * (y - q[1]);
    const d1 = sg(a, b), d2 = sg(b, c), d3 = sg(c, a);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  }
  return y >= 0 && y <= s.hgt && Math.abs(x) <= s.hw * (1 - 0.08 * y / s.hgt);
}
const extent = (s) => (s.kind === 'jib' ? Math.min(s.w, s.h) : Math.min(2 * s.hw, s.hgt));
const bottomY = (sl, x) => sl.hgt * (0.96 + 0.08 * (1 - Math.min(1, (x / (sl.hw * 0.92)) ** 2)));

// ---------- Simulation: ein Durchschuss ----------
/** Segel eines Schiffs anlegen (seedOf(idx) liefert den festen Seed des Segels). */
function create(geo, len, facing, seedOf) {
  return layout(geo, len, facing).map((s) => ({ ...s, holes: [], hits: 0, wear: 0, seed: seedOf(s.idx) }));
}
/**
 * Eine Kugel durchschlägt das Segel an der Stelle (x, y). Erhöht die Abnutzung und setzt ein neues Loch oder
 * vergrößert das nächstgelegene. rng = eigener Zufallsstrom der Segel, R = Kugelradius, max = Löcher-Obergrenze.
 * Rückgabe: true, wenn ein neues Loch entstanden ist.
 */
function punch(s, x, y, rng, R, max) {
  const full = SAIL.fullHits[s.idx], ext = extent(s);
  s.hits++;
  s.wear = Math.min(1, s.hits / full);
  // Die Zahl der Löcher wächst mit der Abnutzung (voll bei 60 %); dazwischen vergrößern Durchschüsse das nächste Loch.
  const want = Math.max(1, Math.round(max * Math.pow(Math.min(1, s.wear / 0.6), 0.8)));
  let near = null, nd = Infinity;
  for (const h of s.holes) { const d = Math.hypot(h.x - x, h.y - y); if (d < nd) { nd = d; near = h; } }
  const r0 = R * rng.range(0.8, 1.08), k = rng.range(0.4, 1.6);
  if (s.holes.length < want && !(near && nd < near.r + r0 * 1.1)) {
    s.holes.push({ x, y, r: r0, tear: 0, ang: rng.range(-0.4, 0.4), seed: rng.int(1, 1e9) });
    return true;
  }
  if (near) {
    near.r = Math.min(R * 1.7, near.r + 0.6 * R * (max / full) * k);
    if (s.wear > 0.25) near.tear = Math.min(ext * 0.4, near.tear + ((1.4 * ext) / (0.75 * full)) * k);   // Risse: zusammen rund 1,4 Segelbreiten
  }
  return false;
}

// ---------- Darstellung: abgeleitete Schäden ----------
/** Ausgefranste Kante, lose Streifen, schiefe Rah: reine Funktion aus Abnutzung und Segel-Seed. */
function features(sl) {
  const r = new RNG(sl.seed), w = sl.wear, sm = (a, b) => clamp((w - a) / (b - a), 0, 1);
  const lo = sl.emblem ? 0.56 : 0.28, hi = sl.emblem ? 0.72 : 0.62;
  const c1 = r.range(lo, hi), c2 = r.range(lo, hi), side = r.next() < 0.5 ? -1 : 1;
  const w1 = r.range(0.3, 0.4), w2 = r.range(0.26, 0.34), h1 = r.range(0.45, 0.62), h2 = r.range(0.36, 0.52);
  const hangSide = r.next() < 0.5 ? -1 : 1, fraySeed = r.int(1, 1e9);
  const f = { fray: sl.kind === 'square' ? sm(0.35, 1) : 0, fraySeed, strips: [], hang: 0, hangSide };
  if (sl.kind !== 'square') return f;
  if (!sl.emblem && w > 0.6) f.strips.push({ cx: side * c1, w: w1, h: h1, k: sm(0.6, 0.7), gone: w > 0.93, seed: fraySeed + 1 });
  if (sl.idx === 2 && w > 0.82) f.strips.push({ cx: -side * c2, w: w2, h: h2, k: sm(0.82, 0.92), gone: false, seed: fraySeed + 2 });
  if (sl.idx === 3) f.hang = sm(0.8, 0.92);      // nur das Vormarssegel: die Rah bricht aus der Halterung und hängt schief
  return f;
}
function stripShape(sl, st) {
  const r = new RNG(st.seed), x0 = (st.cx - st.w / 2) * sl.hw, x1 = (st.cx + st.w / 2) * sl.hw, yT = sl.hgt * (1 - st.h);
  const n = 5, left = [], right = [];
  for (let k = 0; k <= n; k++) {
    const y = lerp(yT, sl.hgt, k / n);
    left.push([x0 + r.range(-1, 1) * sl.hw * 0.025, y]); right.push([x1 + r.range(-1, 1) * sl.hw * 0.025, y]);
  }
  return { x0, x1, yT, left, right };
}
const css = (c, a = 1) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
function holeOutline(hl, ox, oy) {
  const r = new RNG(hl.seed), n = 9, rot = r.range(0, 6.2832), pts = [];
  for (let k = 0; k < n; k++) {
    const a = rot + (k / n) * 6.2832, rr = hl.r * (r.next() < 0.25 ? r.range(0.64, 0.8) : r.range(0.9, 1.14));
    pts.push([ox + hl.x + Math.cos(a) * rr, oy + hl.y + Math.sin(a) * rr]);
  }
  return { pts, r };
}

/**
 * Segeltuch als Textur: erst das unversehrte Segel (Form und Farben wie im Standardmodus), dann werden Löcher,
 * Risse und Kanten ausgestanzt. sails = alle Segel des Schiffs (eine Kugel durchschlägt alle Lagen an einer Stelle).
 */
function texture(sl, sails, team, feat, R) {
  const P = SAIL.pad, sq = sl.kind === 'square';
  const w = (sq ? 2 * sl.hw : sl.w) + 2 * P, h = (sq ? sl.hgt * 1.08 : sl.h) + 2 * P;
  return canvasTex(w, h, (g) => {
    g.translate(P + (sq ? sl.hw : 0), P);
    g.lineJoin = 'round';
    const outline = () => {
      g.beginPath();
      if (sq) { g.moveTo(-sl.hw, 0); g.lineTo(sl.hw, 0); g.lineTo(sl.hw * 0.92, sl.hgt * 0.96); g.quadraticCurveTo(sl.bulge, sl.hgt * 1.12, -sl.hw * 0.92, sl.hgt * 0.96); }
      else { g.moveTo(sl.tri[0][0], sl.tri[0][1]); g.lineTo(sl.tri[1][0], sl.tri[1][1]); g.lineTo(sl.tri[2][0], sl.tri[2][1]); }
      g.closePath();
    };
    const poly = (pts) => { g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
    outline(); g.fillStyle = css(team.sail); g.fill();
    if (sq) {
      g.fillStyle = css(team.color, 0.85); g.fillRect(-sl.hw * 0.95, sl.hgt * 0.42, sl.hw * 1.9, sl.hgt * 0.13);
      if (sl.emblem) {
        g.beginPath(); g.arc(0, sl.hgt * 0.48, Math.min(sl.hw, sl.hgt) * 0.27, 0, 6.2832);
        g.fillStyle = css(team.color); g.fill(); g.lineWidth = 3; g.strokeStyle = css(team.sail); g.stroke();
      }
    }
    outline(); g.lineWidth = 2; g.strokeStyle = css(0x6e6252, sq ? 0.9 : 1); g.stroke();
    if (!sails.some((o) => o.holes.length)) return;

    const edge = css(0x54483a, 0.95);
    const cut = (build) => {      // Kante dunkel nachziehen, dann die Fläche ausstanzen (die halbe Linienbreite bleibt als Rand stehen)
      g.globalCompositeOperation = 'source-atop'; build(); g.lineWidth = 3.2; g.strokeStyle = edge; g.stroke();
      g.globalCompositeOperation = 'destination-out'; build(); g.fillStyle = '#000'; g.fill();
      g.globalCompositeOperation = 'source-over';
    };
    // 1) Schmauch um die Einschüsse, dazu mit der Zeit etwas Schmutz
    g.globalCompositeOperation = 'source-atop';
    for (const hl of sl.holes) {
      const rr = hl.r * 2.5, gr = g.createRadialGradient(hl.x, hl.y, hl.r * 0.5, hl.x, hl.y, rr);
      gr.addColorStop(0, 'rgba(46,36,28,.36)'); gr.addColorStop(1, 'rgba(46,36,28,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(hl.x, hl.y, rr, 0, 6.2832); g.fill();
    }
    if (sl.wear > 0.15) {
      const r = new RNG(feat.fraySeed + 7), ext = sq ? sl.hw : sl.w * 0.5;
      for (let k = 0; k < 5; k++) {
        const x = sq ? r.range(-sl.hw, sl.hw) : r.range(0, sl.w), y = r.range(0, sq ? sl.hgt : sl.h), rr = ext * r.range(0.3, 0.6);
        const gr = g.createRadialGradient(x, y, 0, x, y, rr), a = 0.2 * clamp((sl.wear - 0.15) / 0.85, 0, 1);
        gr.addColorStop(0, `rgba(52,44,36,${a})`); gr.addColorStop(1, 'rgba(52,44,36,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, 6.2832); g.fill();
      }
    }
    g.globalCompositeOperation = 'source-over';
    // 2) eigene Löcher und Risse
    for (const hl of sl.holes) {
      const { pts, r } = holeOutline(hl, 0, 0);
      cut(() => poly(pts));
      if (hl.tear > 0) {
        const dx = Math.sin(hl.ang), dy = Math.cos(hl.ang), nx = dy, ny = -dx, m = Math.max(4, Math.round(hl.tear / (R * 0.9)));
        const lf = [], rt = [];
        for (let k = 0; k <= m; k++) {
          const s = k / m, wd = hl.r * 0.62 * Math.pow(1 - s, 0.7) + (k < m ? 0.8 : 0), off = k ? r.range(-0.32, 0.32) * hl.r * (1 - s * 0.5) : 0;
          const cx = hl.x + dx * hl.tear * s + nx * off, cy = hl.y + dy * hl.tear * s + ny * off;
          lf.push([cx - nx * wd, cy - ny * wd]); rt.push([cx + nx * wd, cy + ny * wd]);
        }
        cut(() => poly([...lf, ...rt.reverse()]));
      }
    }
    // 3) Löcher der anderen Segel an gleicher Stelle: die Kugel hat alle Lagen durchschlagen
    for (const o of sails) {
      if (o === sl) continue;
      for (const hl of o.holes) { const { pts } = holeOutline(hl, o.x - sl.x, o.y - sl.y); cut(() => poly(pts)); }
    }
    if (!sq) return;
    // 4) ausgefranste Unterkante: die Zacken wachsen mit der Abnutzung
    if (feat.fray > 0) {
      const r = new RNG(feat.fraySeed), n = 2 * Math.round(sl.hw / (R * 1.5)) + 1, pts = [[-sl.hw * 1.15, sl.hgt * 1.3]];
      for (let k = 0; k <= n; k++) {
        const x = lerp(-sl.hw * 1.02, sl.hw * 1.02, k / n) + (k && k < n ? r.range(-0.3, 0.3) * sl.hw / n : 0);
        const big = r.next() < 0.25 + 0.3 * feat.fray;
        const d = k % 2 ? -4 + sl.hgt * feat.fray * r.range(0, 0.03) : 2 + sl.hgt * feat.fray * (big ? r.range(0.12, 0.24) : r.range(0.04, 0.1));
        pts.push([x, bottomY(sl, x) - d]);
      }
      pts.push([sl.hw * 1.15, sl.hgt * 1.3]);
      cut(() => poly(pts));
    }
    // 5) gelöste Stoffstreifen: Lücke im Tuch (der Streifen selbst hängt als eigenes Teil daran)
    for (const st of feat.strips) {
      const sh = stripShape(sl, st);
      cut(() => poly([...sh.left.slice().reverse(), ...sh.right, [sh.x1, sl.hgt * 1.3], [sh.x0, sl.hgt * 1.3]]));
    }
  }, SAIL.texScale);
}

/** Die fünf Segel eines Schiffs als PixiJS-Teile: Tuch (Textur), Rah und bis zu zwei lose Streifen je Segel. */
class SailsView {
  constructor(ship, L) {
    this.ship = ship; this.L = L; this.ver = -1; this.items = [];
    // Reihenfolge wie im Standardmodus: Klüver hinten, davor die vier Rahsegel
    for (const sl of [ship.sails[4], ...ship.sails.slice(0, 4)]) {
      const c = new PIXI.Container(); c.position.set(sl.x, sl.y);
      const cloth = new PIXI.Sprite();
      cloth.alpha = sl.kind === 'jib' ? 0.92 : 0.96;
      cloth.position.set(-SAIL.pad - (sl.kind === 'square' ? sl.hw : 0), -SAIL.pad);
      const rags = [new PIXI.Graphics(), new PIXI.Graphics()], yard = new PIXI.Graphics();
      c.addChild(cloth); c.addChild(rags[0]); c.addChild(rags[1]); c.addChild(yard);
      if (sl.kind === 'square') yard.moveTo(-sl.hw * 1.08, 0).lineTo(sl.hw * 1.08, 0).stroke({ width: Math.max(3, 0.012 * ship.len), color: 0x4a2f1b, cap: 'round' });
      this.items.push({ sl, c, cloth, rags, tex: null, feat: null, phase: sl.idx * 1.7 + ship.i * 0.9 });
    }
  }
  addTo(root) { for (const v of this.items) root.addChild(v.c); }
  draw(t) {
    const ship = this.ship;
    if (this.ver !== ship.sailVer) { this.ver = ship.sailVer; for (const v of this.items) this._redraw(v); }
    for (const v of this.items) {
      const sl = v.sl, f = v.feat;
      if (sl.kind === 'square') v.c.scale.set(1 + 0.025 * Math.sin(t * 1.3 + v.phase), 1 + 0.02 * Math.sin(t * 1.1 + v.phase * 1.3));
      if (f.hang > 0) { v.c.rotation = f.hangSide * f.hang * (0.4 + 0.02 * Math.sin(t * 1.4 + v.phase)); v.c.position.set(sl.x, sl.y + f.hang * sl.hgt * 0.16); }
      // lose Streifen wehen alle in Windrichtung (zum Bug)
      f.strips.forEach((st, k) => { if (!st.gone) v.rags[k].rotation = -ship.facing * st.k * (0.17 + 0.07 * Math.sin(t * 1.9 + v.phase + k * 2.1)); });
    }
  }
  // Tuch neu backen, sobald sich der Zustand der Segel ändert
  _redraw(v) {
    const sl = v.sl, team = this.ship.team, f = (v.feat = features(sl));
    const old = v.tex;
    v.tex = texture(sl, this.ship.sails, team, f, this.L.ballR);
    v.cloth.texture = v.tex;
    if (old) old.destroy(true);
    if (!(f.hang > 0)) { v.c.rotation = 0; v.c.position.set(sl.x, sl.y); }
    v.rags.forEach((g, k) => {
      const st = f.strips[k];
      g.clear(); g.visible = !!st && !st.gone;
      if (!g.visible) return;
      const sh = stripShape(sl, st), cx = (sh.x0 + sh.x1) / 2, yT = sh.yT, r = new RNG(st.seed + 11);
      const yb = (x, y) => Math.min(y, bottomY(sl, x) - 3) - yT;
      const pts = sh.left.map(([x, y]) => [x - cx + 1.5, yb(x, y)]);
      const [lx, ly] = pts[pts.length - 1], rx = sh.right[sh.right.length - 1][0] - cx - 1.5;
      for (let j = 1; j < 4; j++) pts.push([lerp(lx, rx, j / 4), ly - (j % 2 ? r.range(0.05, 0.14) * sl.hgt : -r.range(0, 0.03) * sl.hgt)]);
      for (const [x, y] of sh.right.slice().reverse()) pts.push([x - cx - 1.5, yb(x, y)]);
      const flat = pts.flatMap((p) => p);
      g.position.set(cx, yT);
      g.poly(flat).fill({ color: lerpColor(team.sail, 0x6e6252, 0.1), alpha: 0.96 });
      const b0 = Math.max(2, sl.hgt * 0.42 - yT), b1 = sl.hgt * 0.55 - yT;
      if (b1 > b0) g.rect(sh.x0 - cx + 3, b0, sh.x1 - sh.x0 - 6, b1 - b0).fill({ color: team.color, alpha: 0.85 });
      g.poly(flat).stroke({ width: 2, color: 0x6e6252, alpha: 0.9, join: 'round' });
    });
  }
  destroy() { for (const v of this.items) if (v.tex) { v.tex.destroy(true); v.tex = null; } }
}

EBS.NavalSails = { SAIL, layout, contains, extent, create, punch, features, View: SailsView };
})();
