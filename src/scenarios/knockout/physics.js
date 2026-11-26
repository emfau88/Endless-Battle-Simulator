/* Marble Knockout · Physik-Kern (R43/M1)
 *
 * Kreise (Murmeln) gegen Kapseln (Bahnstücke, Arme, Planken: Strecke mit Radius) und Murmeln untereinander.
 * - Feste Teilschritte (Standard 4 je Simulationsschritt, also 240 Hz).
 * - Spekulative Kontakte: Eine Murmel darf sich einer Fläche nur so weit nähern, wie der Abstand es erlaubt.
 *   Deshalb fällt keine Murmel durch eine Bahn, auch nicht bei Höchstgeschwindigkeit.
 * - Sequenzielle Impulse mit Rollreibung (Vollkugel, I = 2/5·m·r²): Murmeln rollen, statt zu rutschen, und ihr
 *   Drehwinkel ist echt.
 * - Bewegte Teile sind kinematisch: Ihre Lage ist eine Funktion der Zeit (pose(t)). Sie schieben Murmeln mit der
 *   richtigen Oberflächengeschwindigkeit, werden aber selbst nicht bewegt.
 * Rechnet nur mit +, −, ×, ÷, Math.sqrt und den Winkelfunktionen aus detmath.js. Node und Chromium ergeben so
 * dieselben Bits.
 */
(function (global) {
  'use strict';
  const EBS = global.EBS;
  const { sin, cos } = EBS.KnockoutMath;

  const DEFAULTS = {
    gravity: 1600, substeps: 4, iterations: 8, maxSpeed: 1500,
    restitution: 0.25, marbleRestitution: 0.45, friction: 0.25, bounceMin: 70,
    slop: 0.4, correct: 0.45, linearDamping: 0.02, angularDamping: 0.08,
    cell: 64, reach: 44,                       // Rasterweite; Zugabe beim Einsortieren (größter Radius + Spielraum)
  };
  const MT = 1 / (1 + 2.5);                    // wirksame Masse quer zur Fläche bei rollender Vollkugel (m = 1)

  /** Nächster Punkt auf der Strecke a–b zu p; schreibt in out[0], out[1]. */
  function closest(ax, ay, bx, by, px, py, out) {
    const ex = bx - ax, ey = by - ay, ll = ex * ex + ey * ey;
    let t = ll > 0 ? ((px - ax) * ex + (py - ay) * ey) / ll : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    out[0] = ax + ex * t; out[1] = ay + ey * t;
  }

  class World {
    constructor(opt = {}) {
      this.o = { ...DEFAULTS, ...opt };
      this.t = 0; this.marbles = []; this.statics = []; this.bodies = [];
      this.grid = new Map(); this.contacts = []; this.n = 0; this.impacts = [];
      this._p = [0, 0];
    }

    // ------------------------------------------------------------ Aufbau
    /** Murmel { x, y, r }; gibt das Objekt zurück, das die Simulation weiter liest und setzt.
     *  mask: Ebenen, mit denen sie zusammenstößt (Bit 1 = Grundbahn; Trommel und Ringe liegen auf Bit 2). */
    addMarble({ x, y, r, vx = 0, vy = 0, mask = 1 }) {
      const m = { id: this.marbles.length, x, y, vx, vy, a: 0, w: 0, r, mask, active: true, collide: true, touch: 0 };
      this.marbles.push(m); return m;
    }
    /** Feste Kapsel { ax, ay, bx, by, rad, rest?, fric?, speed?, kick?, mask?, tag? }; speed = Förderband längs a→b,
     *  kick = Mindest-Abprallgeschwindigkeit (Bumper). */
    addStatic(s) {
      const dx = s.bx - s.ax, dy = s.by - s.ay, len = Math.sqrt(dx * dx + dy * dy) || 1;
      const sh = { ...s, ux: dx / len, uy: dy / len, speed: s.speed || 0, kick: s.kick || 0, mask: s.mask || 1, wax: s.ax, way: s.ay, wbx: s.bx, wby: s.by, body: null };
      this.statics.push(sh); this._insert(sh); return sh;
    }
    /** Kinematischer Körper { shapes: [lokale Kapseln], pose(t) → { x, y, a, vx, vy, w }, tag }. */
    addBody(def) {
      let reach = 0;
      for (const s of def.shapes) for (const [x, y] of [[s.ax, s.ay], [s.bx, s.by]]) reach = Math.max(reach, Math.sqrt(x * x + y * y) + s.rad);
      const b = { tag: def.tag || '', pose: def.pose, enabled: def.enabled !== false, reach, x: 0, y: 0, a: 0, vx: 0, vy: 0, w: 0, c: 1, s: 0,
        shapes: def.shapes.map((s) => ({ ...s, speed: s.speed || 0, kick: s.kick || 0, mask: s.mask || 1, wax: 0, way: 0, wbx: 0, wby: 0, ux: 0, uy: 0, body: null })) };
      for (const s of b.shapes) s.body = b;
      this.bodies.push(b); this._pose(b, this.t); return b;
    }
    /** Entfernt alle Bahnteile (Bahnwechsel). Murmeln bleiben. */
    clearTrack() { this.statics = []; this.bodies = []; this.grid = new Map(); }

    _key(cx, cy) { return (cx + 2048) + (cy + 2048) * 8192; }
    _insert(sh) {
      const g = this.o.cell, pad = sh.rad + this.o.reach;
      const x0 = Math.floor((Math.min(sh.ax, sh.bx) - pad) / g), x1 = Math.floor((Math.max(sh.ax, sh.bx) + pad) / g);
      const y0 = Math.floor((Math.min(sh.ay, sh.by) - pad) / g), y1 = Math.floor((Math.max(sh.ay, sh.by) + pad) / g);
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
        const k = this._key(cx, cy); let list = this.grid.get(k);
        if (!list) this.grid.set(k, (list = [])); list.push(sh);
      }
    }

    _pose(b, t) {
      const p = b.pose(t);
      b.x = p.x; b.y = p.y; b.a = p.a || 0; b.vx = p.vx || 0; b.vy = p.vy || 0; b.w = p.w || 0;
      b.c = cos(b.a); b.s = sin(b.a);
      for (const s of b.shapes) {
        s.wax = b.x + b.c * s.ax - b.s * s.ay; s.way = b.y + b.s * s.ax + b.c * s.ay;
        s.wbx = b.x + b.c * s.bx - b.s * s.by; s.wby = b.y + b.s * s.bx + b.c * s.by;
        const dx = s.wbx - s.wax, dy = s.wby - s.way, len = Math.sqrt(dx * dx + dy * dy) || 1;
        s.ux = dx / len; s.uy = dy / len;
      }
    }
    _poses(t) { for (const b of this.bodies) if (b.enabled) this._pose(b, t); }

    // ------------------------------------------------------------ Schritt
    /** Rechnet die Zeit dt in festen Teilschritten. impacts sammelt harte Stöße für den Ton. */
    step(dt) {
      const o = this.o, h = dt / o.substeps;
      this.impacts.length = 0;
      this._poses(this.t);                     // Körper, die seit dem letzten Schritt ein- oder umgeschaltet wurden
      for (let k = 0; k < o.substeps; k++) {
        const lin = 1 - o.linearDamping * h, ang = 1 - o.angularDamping * h;
        for (const m of this.marbles) if (m.active) { m.vy += o.gravity * h; m.vx *= lin; m.vy *= lin; m.w *= ang; m.touch = 0; }
        this._collect(h);
        for (let it = 0; it < o.iterations; it++) this._solve(h);
        this._restitution();
        const vmax2 = o.maxSpeed * o.maxSpeed;
        for (const m of this.marbles) {
          if (!m.active) continue;
          const v2 = m.vx * m.vx + m.vy * m.vy;
          if (v2 > vmax2) { const f = o.maxSpeed / Math.sqrt(v2); m.vx *= f; m.vy *= f; }
          m.x += m.vx * h; m.y += m.vy * h; m.a += m.w * h;
        }
        this.t += h; this._poses(this.t);
        this._correct(); this._correct();
      }
    }

    _contact() {
      let c = this.contacts[this.n];
      if (!c) this.contacts.push((c = { i: 0, j: -1, sh: null, nx: 0, ny: 0, gap: 0, svx: 0, svy: 0, rest: 0, fric: 0, jn: 0, jt: 0, vn0: 0 }));
      this.n++; return c;
    }

    _shapeContact(m, sh, h, margin) {
      if (!(sh.mask & m.mask)) return;
      const p = this._p;
      closest(sh.wax, sh.way, sh.wbx, sh.wby, m.x, m.y, p);
      const dx = m.x - p[0], dy = m.y - p[1], d = Math.sqrt(dx * dx + dy * dy), gap = d - m.r - sh.rad;
      if (gap > margin || d === 0) return;
      const c = this._contact(), o = this.o;
      c.i = m.id; c.j = -1; c.sh = sh; c.nx = dx / d; c.ny = dy / d; c.gap = gap; c.jn = 0; c.jt = 0;
      c.rest = sh.rest !== undefined ? sh.rest : o.restitution; c.fric = sh.fric !== undefined ? sh.fric : o.friction;
      // Geschwindigkeit der Fläche am Berührpunkt: Drehung des Körpers und Förderband
      let svx = sh.speed * sh.ux, svy = sh.speed * sh.uy;
      const b = sh.body;
      if (b) { svx += b.vx - b.w * (p[1] - b.y); svy += b.vy + b.w * (p[0] - b.x); }
      c.svx = svx; c.svy = svy;
      c.vn0 = (m.vx - svx) * c.nx + (m.vy - svy) * c.ny;
    }

    _collect(h) {
      this.n = 0;
      const o = this.o, M = this.marbles, g = o.cell;
      for (let i = 0; i < M.length; i++) {
        const m = M[i];
        if (!m.active || !m.collide) continue;
        const speed = Math.sqrt(m.vx * m.vx + m.vy * m.vy), margin = speed * h + 2;
        const list = this.grid.get(this._key(Math.floor(m.x / g), Math.floor(m.y / g)));
        if (list) for (const sh of list) this._shapeContact(m, sh, h, margin);
        for (const b of this.bodies) {
          if (!b.enabled) continue;
          const dx = m.x - b.x, dy = m.y - b.y, vb = Math.sqrt(b.vx * b.vx + b.vy * b.vy) + (b.w < 0 ? -b.w : b.w) * b.reach;
          const lim = b.reach + m.r + margin + vb * h;
          if (dx * dx + dy * dy > lim * lim) continue;
          for (const sh of b.shapes) this._shapeContact(m, sh, h, margin + vb * h);
        }
        for (let j = i + 1; j < M.length; j++) {
          const n = M[j];
          if (!n.active || !n.collide) continue;
          const dx = m.x - n.x, dy = m.y - n.y, rr = m.r + n.r;
          const rel = Math.sqrt((m.vx - n.vx) * (m.vx - n.vx) + (m.vy - n.vy) * (m.vy - n.vy)) * h + 2;
          if (dx > rr + rel || dx < -rr - rel || dy > rr + rel || dy < -rr - rel) continue;
          const d = Math.sqrt(dx * dx + dy * dy), gap = d - rr;
          if (gap > rel || d === 0) continue;
          const c = this._contact();
          c.i = i; c.j = j; c.sh = null; c.nx = dx / d; c.ny = dy / d; c.gap = gap; c.jn = 0; c.jt = 0;
          c.rest = o.marbleRestitution; c.fric = 0; c.svx = 0; c.svy = 0;
          c.vn0 = (m.vx - n.vx) * c.nx + (m.vy - n.vy) * c.ny;
        }
      }
    }

    _solve(h) {
      const M = this.marbles, C = this.contacts;
      for (let k = 0; k < this.n; k++) {
        const c = C[k], A = M[c.i], target = c.gap > 0 ? -c.gap / h : 0;
        if (c.j < 0) {
          const vn = (A.vx - c.svx) * c.nx + (A.vy - c.svy) * c.ny;
          const old = c.jn; c.jn = Math.max(0, old + (target - vn)); const dj = c.jn - old;
          A.vx += dj * c.nx; A.vy += dj * c.ny;
          if (c.jn > 0) A.touch = 1;
          // Reibung am Berührpunkt (rollende Vollkugel)
          const tx = -c.ny, ty = c.nx;
          const vt = (A.vx - c.svx) * tx + (A.vy - c.svy) * ty - A.w * A.r;
          const lim = c.fric * c.jn, oldT = c.jt;
          let jt = oldT - vt * MT; jt = jt < -lim ? -lim : jt > lim ? lim : jt;
          c.jt = jt; const djt = jt - oldT;
          A.vx += djt * tx; A.vy += djt * ty; A.w -= djt * 2.5 / A.r;
        } else {
          const B = M[c.j];
          const vn = (A.vx - B.vx) * c.nx + (A.vy - B.vy) * c.ny;
          const old = c.jn; c.jn = Math.max(0, old + (target - vn) * 0.5); const dj = c.jn - old;
          A.vx += dj * c.nx; A.vy += dj * c.ny; B.vx -= dj * c.nx; B.vy -= dj * c.ny;
        }
      }
    }

    /** Rückprall einmal nach dem Lösen: nur bei echten Stößen, nicht bei ruhendem Kontakt. */
    _restitution() {
      const M = this.marbles, C = this.contacts, o = this.o;
      for (let k = 0; k < this.n; k++) {
        const c = C[k], kick = c.j < 0 ? c.sh.kick : 0;
        if (c.jn <= 0 || (c.vn0 > -o.bounceMin && !kick)) continue;
        const A = M[c.i];
        if (c.j < 0) {
          const want = Math.max(-c.rest * c.vn0, kick), vn = (A.vx - c.svx) * c.nx + (A.vy - c.svy) * c.ny;
          if (vn < want) { const dj = want - vn; A.vx += dj * c.nx; A.vy += dj * c.ny; }
          this.impacts.push({ i: c.i, j: -1, tag: c.sh.tag || '', speed: Math.max(-c.vn0, kick), x: A.x - c.nx * A.r, y: A.y - c.ny * A.r });
        } else {
          const B = M[c.j], want = -c.rest * c.vn0, vn = (A.vx - B.vx) * c.nx + (A.vy - B.vy) * c.ny;
          if (vn < want) { const dj = (want - vn) * 0.5; A.vx += dj * c.nx; A.vy += dj * c.ny; B.vx -= dj * c.nx; B.vy -= dj * c.ny; }
          this.impacts.push({ i: c.i, j: c.j, tag: 'marble', speed: -c.vn0, x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 });
        }
      }
    }

    /** Lagekorrektur nach dem Bewegen: schiebt eingedrungene Murmeln heraus (mit frischer Geometrie). */
    _correct() {
      const M = this.marbles, C = this.contacts, o = this.o, p = this._p;
      for (let k = 0; k < this.n; k++) {
        const c = C[k], A = M[c.i];
        if (c.j < 0) {
          const sh = c.sh;
          closest(sh.wax, sh.way, sh.wbx, sh.wby, A.x, A.y, p);
          const dx = A.x - p[0], dy = A.y - p[1], d = Math.sqrt(dx * dx + dy * dy), pen = A.r + sh.rad - d;
          if (pen <= o.slop || d === 0) continue;
          const push = o.correct * (pen - o.slop);
          A.x += dx / d * push; A.y += dy / d * push;
        } else {
          const B = M[c.j], dx = A.x - B.x, dy = A.y - B.y, d = Math.sqrt(dx * dx + dy * dy), pen = A.r + B.r - d;
          if (pen <= o.slop || d === 0) continue;
          const push = 0.5 * o.correct * (pen - o.slop), nx = dx / d, ny = dy / d;
          A.x += nx * push; A.y += ny * push; B.x -= nx * push; B.y -= ny * push;
        }
      }
    }

    /** Kleinster Abstand einer Murmel zu allen Bahnteilen (für Tests und Invarianten). */
    clearance(m) {
      const p = this._p; let best = Infinity;
      const test = (sh) => { if (!(sh.mask & m.mask)) return; closest(sh.wax, sh.way, sh.wbx, sh.wby, m.x, m.y, p); const dx = m.x - p[0], dy = m.y - p[1]; best = Math.min(best, Math.sqrt(dx * dx + dy * dy) - sh.rad - m.r); };
      for (const sh of this.statics) test(sh);
      for (const b of this.bodies) if (b.enabled) for (const sh of b.shapes) test(sh);
      return best;
    }
    /** Liegt die Murmel gerade in einer Gondel (Hebe-Rad)? Die Gondel hebt sie beim Einsteigen gewollt durch die feste
     *  Plattform; dabei steckt sie für wenige Schritte in der Bahn (nur für die Invarianten-Prüfung). */
    lifted(m) {
      const p = this._p;
      for (const b of this.bodies) {
        if (!b.enabled || b.tag !== 'cup') continue;
        for (const sh of b.shapes) { closest(sh.wax, sh.way, sh.wbx, sh.wby, m.x, m.y, p); if (Math.hypot(m.x - p[0], m.y - p[1]) - sh.rad - m.r < 2) return true; }
      }
      return false;
    }
  }

  /** Prüfsumme über Zahlen (Bits der 64-Bit-Werte, FNV-1a über 32-Bit-Wörter). */
  function hashNumbers(values) {
    const f = new Float64Array(values), u = new Uint32Array(f.buffer);
    let h = 0x811c9dc5;
    for (let i = 0; i < u.length; i++) { h ^= u[i]; h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  EBS.KnockoutPhysics = { World, DEFAULTS, closest, hashNumbers };
})(typeof window !== 'undefined' ? window : globalThis);
