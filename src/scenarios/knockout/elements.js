/* Marble Knockout · Baukasten (R43/M2, M3)
 *
 * Ein Builder setzt eine Bahn aus Bausteinen zusammen: feste Bahnstücke (Kapseln im Physik-Kern) und bewegte
 * Elemente (kinematische Körper). Jedes bewegte Teil ist eine reine Funktion der Bahnzeit t oder hängt an einem
 * Ereignis, dessen Zeitpunkt im Zustand des Elements steht (Weiche, Brücke, Tore, Fallen). Geschwindigkeiten der
 * Körper kommen aus zentralen Differenzen der Lage, damit Schieben und Mitnehmen stimmen.
 *
 * Maße in Welt-Einheiten. r = Murmelradius, d = 2r, rad = halbe Bahnstärke. Winkel im Bogenmaß, y zeigt nach unten:
 * Ein positiver Winkel dreht im Bild im Uhrzeigersinn.
 *
 * Masken: Bit 1 ist die Grundbahn. Trommel, Ringe und Labyrinth liegen auf Bit 2; eine Murmel stößt erst mit ihnen
 * zusammen, wenn sie in deren Innenraum angekommen ist (Zone). So fällt sie „von vorn“ hinein wie in eine offene Trommel.
 */
(function (global) {
  'use strict';
  const EBS = global.EBS;
  const { sin, cos, PI, TAU } = EBS.KnockoutMath;
  const HD = 1e-4;
  const clamp01 = (u) => (u < 0 ? 0 : u > 1 ? 1 : u);
  const ease = (u) => { u = clamp01(u); return u * u * (3 - 2 * u); };
  const fmod = (a, m) => a - Math.floor(a / m) * m;
  const lerp = (a, b, u) => a + (b - a) * u;

  /** Pose mit Geschwindigkeiten aus zentralen Differenzen; fn(t) → { x, y, a }. */
  function kin(fn) {
    return (t) => {
      const p = fn(t), q0 = fn(t - HD), q1 = fn(t + HD);
      return { x: p.x, y: p.y, a: p.a, vx: (q1.x - q0.x) / (2 * HD), vy: (q1.y - q0.y) / (2 * HD), w: (q1.a - q0.a) / (2 * HD) };
    };
  }
  /** Kreisbogen als Punktliste (48 Teile je Vollkreis). */
  function arcPts(cx, cy, R, a0, a1, segs) {
    const n = segs || Math.max(2, Math.ceil(Math.abs(a1 - a0) / TAU * 48)), out = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push([cx + R * cos(a), cy + R * sin(a)]); }
    return out;
  }
  /** Kreis mit Lücken als lokale Kapseln; gaps = [{ at, w }] (Winkel, Bogenlänge). */
  function ringShapes(R, rad, gaps, mask, segs = 48) {
    const out = [], step = TAU / segs;
    const inGap = (a) => gaps.some((g) => { const d = Math.abs(fmod(a - g.at + PI, TAU) - PI); return d < g.w / 2 / R; });
    for (let i = 0; i < segs; i++) {
      const a0 = i * step, a1 = a0 + step;
      if (inGap(a0) || inGap(a1) || inGap((a0 + a1) / 2)) continue;
      out.push({ ax: R * cos(a0), ay: R * sin(a0), bx: R * cos(a1), by: R * sin(a1), rad, mask });
    }
    return out;
  }

  class Builder {
    /** o: { r, T, W, H, rng (EBS.RNG oder null), jitter (Anteil der Periode, Standard 0.1) } */
    constructor(world, o) {
      this.world = world; this.r = o.r; this.d = 2 * o.r; this.T = o.T; this.rad = o.T / 2; this.W = o.W; this.H = o.H;
      this.rng = o.rng || null; this.jit = o.jitter === undefined ? 0.1 : o.jitter;
      this.tracks = []; this.pegs = []; this.elements = []; this.zones = []; this.pits = []; this.signs = []; this.decor = [];
      this.path = null; this.start = null; this.finish = null; this.knockoutY = o.H + 3 * o.r;
    }
    /** Zufälliger Takt-Versatz (±jitter der Periode) aus dem Bahn-Seed. */
    phase(period) { return this.rng ? (this.rng.next() * 2 - 1) * this.jit * period : 0; }

    // ---------------------------------------------------------------- feste Teile
    /** Bahnstück als Polylinie. o: { rad, kind: 'track'|'wall'|'net'|'glass', rest, fric, mask, tag, front, hidden } */
    track(pts, o = {}) {
      const rad = o.rad || this.rad, shapes = [];
      for (let i = 0; i < pts.length - 1; i++) {
        shapes.push(this.world.addStatic({ ax: pts[i][0], ay: pts[i][1], bx: pts[i + 1][0], by: pts[i + 1][1], rad,
          rest: o.rest, fric: o.fric, mask: o.mask || 1, tag: o.tag || o.kind || 'track' }));
      }
      if (!o.hidden) this.tracks.push({ pts, w: 2 * rad, kind: o.kind || 'track', front: !!o.front });
      return shapes;
    }
    wall(pts, o = {}) { return this.track(pts, { ...o, kind: 'wall' }); }
    /** Fangnetz: weich, kaum Rückprall, viel Reibung. */
    net(pts, o = {}) { return this.track(pts, { rest: 0.02, fric: 0.8, ...o, kind: 'net', tag: 'net' }); }
    peg(x, y, rad) {
      rad = rad || this.d * 0.15;
      this.world.addStatic({ ax: x, ay: y, bx: x, by: y, rad, tag: 'peg', rest: 0.35 });
      this.pegs.push({ x, y, rad, kind: 'peg' });
    }
    /** Nagelfeld im Dreiecksraster: Reihen ab (x0, y0), Abstand dx, Reihenabstand dy; jede zweite Reihe versetzt. */
    pegField({ x0, y0, cols, rows, dx, dy, rad, skip }) {
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols - (j % 2); i++) {
        const x = x0 + i * dx + (j % 2) * dx / 2, y = y0 + j * dy;
        if (!skip || !skip(x, y, i, j)) this.peg(x, y, rad);
      }
    }
    bumper(x, y, rad) {
      rad = rad || this.d * 0.45;
      this.world.addStatic({ ax: x, ay: y, bx: x, by: y, rad, tag: 'bumper', rest: 1.0, kick: 420 });
      this.pegs.push({ x, y, rad, kind: 'bumper' });
    }
    /** Grube (nur Bild): weicher dunkler Bereich, optional mit Warnstreifen am Rand. */
    pit(x0, x1, y0, y1, o = {}) { this.pits.push({ x0, x1, y0, y1, stripes: o.stripes !== false }); }
    sign(x, y, text, o = {}) { this.signs.push({ x, y, text, size: o.size || 24, h: o.h || 50 }); }
    /** Ideallinie für Fortschritt und Rangfolge. */
    setPath(pts) {
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.sqrt((pts[i][0] - pts[i - 1][0]) ** 2 + (pts[i][1] - pts[i - 1][1]) ** 2));
      this.path = { pts, cum, length: cum[cum.length - 1] };
    }
    /** Zone für Trommel, Ringe, Labyrinth: Wer innerhalb R ankommt, stößt nur noch mit Ebene inner zusammen (also
     *  nicht mit der Zulaufrinne davor); wer außerhalb Rout wieder herauskommt, bekommt outer (Grundbahn und Element). */
    zone(x, y, R, Rout, inner = 2, outer = 3) { this.zones.push({ id: this.zones.length, x, y, R, Rout, inner, outer }); }

    _add(el) { el.id = this.elements.length; this.elements.push(el); return el; }
    _body(shapes, fn, o = {}) {
      const b = this.world.addBody({ shapes, pose: kin(fn), tag: o.tag || '', enabled: o.enabled });
      b.look = o.look || 'metal'; b.hub = o.hub || 0; b.front = !!o.front;
      return b;
    }

    // ---------------------------------------------------------------- Start und Ziel
    /** Startrinne mit Tor: Murmeln liegen hinter (x, y) bergauf; dir = +1 nach rechts. Gibt die Bodenlinie zurück. */
    startChute({ x, y, dir = 1, slope = 6, n = 12, gap = 2, lead = 0 }) {
      const r = this.r, s = slope * PI / 180, len = (2 * r + gap) * n + r + 24;
      const ux = dir * cos(s), uy = sin(s);                           // bergab
      const back = [x - ux * len, y - uy * len], front = [x + ux * lead, y + uy * lead];
      this.track([back, front]);
      const nrm = dir > 0 ? [uy, -cos(s)] : [-uy, -cos(s)];            // Normale nach oben
      this.wall([[back[0] - ux * 2, back[1] - uy * 2], [back[0] - ux * 2 + nrm[0] * 3.2 * r, back[1] - uy * 2 + nrm[1] * 3.2 * r]]);
      const lift = r + this.rad + 0.5, slots = [];
      for (let i = 0; i < n; i++) {
        const k = r + 6 + i * (2 * r + gap);
        slots.push([x - ux * k + nrm[0] * lift, y - uy * k + nrm[1] * lift]);
      }
      const gate = this.gate({ x: x + ux * 2, y: y + uy * 2, h: 1.5 * r, mode: 'manual', open0: 0, kind: 'start' });
      this.start = { x, y, dir, slots, gate, floor: [back, front], ux, uy };
      return front;
    }
    /** Ziel: Lichtschranke von a nach b (Murmeln kreuzen sie in Fahrtrichtung). Ein Tor dahinter schließt beim Aus. */
    finishLine({ ax, ay, bx, by, gate }) {
      this.finish = { ax, ay, bx, by, gate: gate ? this.gate({ ...gate, mode: 'manual', open0: 1, kind: 'finish' }) : null };
    }

    // ---------------------------------------------------------------- B · Drehen
    /** B1 Drehkreuz: arms Arme der Länge arm um (x, y); rps < 0 schiebt unten nach rechts. */
    turnstile({ x, y, arm, arms = 4, rps = -0.5, phase = 0, rad }) {
      rad = rad || this.rad * 0.75;
      const shapes = [];
      for (let i = 0; i < arms; i++) { const a = i * TAU / arms; shapes.push({ ax: 0, ay: 0, bx: arm * cos(a), by: arm * sin(a), rad }); }
      const ph = phase + this.phase(1 / Math.abs(rps)) * TAU * Math.abs(rps), w = TAU * rps;
      const body = this._body(shapes, (t) => ({ x, y, a: ph + w * t }), { look: 'arm', hub: rad * 1.9, tag: 'turnstile' });
      return this._add({ type: 'turnstile', x, y, arm, arms, rps, bodies: [body] });
    }
    /** B2 Schaufelrad mit Nabe und Schaufeln; casing: [a0, a1] fester Mantel außen (Bogen in Drehrichtung). */
    wheel({ x, y, R, hubR, paddles = 8, rps = -0.15, casing, casingGap }) {
      const rad = this.rad * 0.7, shapes = [{ ax: 0, ay: 0, bx: 0, by: 0, rad: hubR }];
      for (let i = 0; i < paddles; i++) { const a = i * TAU / paddles; shapes.push({ ax: hubR * cos(a), ay: hubR * sin(a), bx: R * cos(a), by: R * sin(a), rad }); }
      const ph = this.phase(1 / Math.abs(rps)) * TAU * Math.abs(rps), w = TAU * rps;
      const body = this._body(shapes, (t) => ({ x, y, a: ph + w * t }), { look: 'wheel', hub: hubR, tag: 'wheel' });
      let casingPts = null;
      if (casing) { const Rc = R + (casingGap || this.d + 6) + this.rad; casingPts = arcPts(x, y, Rc, casing[0], casing[1]); this.track(casingPts); }
      return this._add({ type: 'wheel', x, y, R, hubR, paddles, rps, bodies: [body], casing: casingPts });
    }
    /** B3 Drehtrommel: Ring mit Lücken und Rippen innen; Eintritt von vorn über eine Zone. */
    drum({ x, y, R, gaps = [0], gapW, rps = 0.15, fins = 6, finL }) {
      const rad = this.rad * 0.8, gw = gapW || this.d * 1.4;
      const shapes = ringShapes(R, rad, gaps.map((at) => ({ at, w: gw + 2 * rad })), 2);
      const fl = finL || this.d * 0.7;
      for (let i = 0; i < fins; i++) {
        const a = (i + 0.5) * TAU / fins + gaps[0];
        shapes.push({ ax: (R - rad) * cos(a), ay: (R - rad) * sin(a), bx: (R - rad - fl) * cos(a), by: (R - rad - fl) * sin(a), rad: rad * 0.8, mask: 2 });
      }
      const ph = this.phase(1 / Math.abs(rps)) * TAU * Math.abs(rps), w = TAU * rps;
      const body = this._body(shapes, (t) => ({ x, y, a: ph + w * t }), { look: 'drum', tag: 'drum' });
      this.zone(x, y, R - rad - fl - this.r - 2, R + rad + this.r + 4);
      return this._add({ type: 'drum', x, y, R, gaps, gapW: gw, rps, bodies: [body] });
    }
    /** B4 Ringausbruch: Ringe mit je einem Schlitz, gegeneinander drehend; Eintritt von vorn in den innersten. */
    rings({ x, y, radii, rps = [0.2, -0.15, 0.1], slotW, phases }) {
      const rad = this.rad * 0.7, sw = slotW || this.d * 1.5, bodies = [];
      radii.forEach((R, i) => {
        const shapes = ringShapes(R, rad, [{ at: 0, w: sw + 2 * rad }], 2, Math.max(36, Math.round(R / 7)));
        const ph = (phases ? phases[i] : i * 2.1) + this.phase(1 / Math.abs(rps[i])) * TAU * Math.abs(rps[i]), w = TAU * rps[i];
        bodies.push(this._body(shapes, (t) => ({ x, y, a: ph + w * t }), { look: 'ring', tag: 'ring' }));
      });
      this.zone(x, y, radii[0] - rad - this.r - 2, radii[radii.length - 1] + rad + this.r + 4);
      return this._add({ type: 'rings', x, y, radii, rps, slotW: sw, bodies });
    }
    /** B6 Flip-Flop-Weiche: Balken um (x, y), kippt nach jeder Murmel auf die andere Seite. */
    flipflop({ x, y, len, ang = 0.42, side = 1, flip = 0.15 }) {
      const rad = this.rad * 0.8;
      const el = { type: 'flipflop', x, y, len, ang, side, from: -side, at: -1, flip, cool: 0, bodies: [] };
      const angAt = (t) => (el.at < 0 ? el.side * ang : lerp(el.from * ang, el.side * ang, ease((t - el.at) / flip)));
      el.bodies.push(this._body([{ ax: -len / 2, ay: 0, bx: len / 2, by: 0, rad }], (t) => ({ x, y, a: angAt(t) }), { look: 'arm', hub: rad * 1.6, tag: 'flipflop' }));
      // Auslöser: Murmel fällt unter den Balken (Kreuzung der Linie y + r) im Bereich des Balkens
      el.update = (st) => {
        const lineY = y + st.r * 1.2 + rad;
        for (const m of st.marbles) {
          if (!m.active || st.t < el.cool) continue;
          if (m.py < lineY && m.y >= lineY && Math.abs(m.x - x) < len * 0.62 + st.r) {
            el.from = el.side; el.side = -el.side; el.at = st.t; el.cool = st.t + flip + 0.12; st.emit('flip', x, y, 1, m.id);
          }
        }
      };
      el.state = () => [el.side, el.at];
      return this._add(el);
    }

    // ---------------------------------------------------------------- C · Takt
    /** C1 Tor, das aus der Bahn hochfährt. mode 'timed': offen `open` s alle `period` s; 'manual': Zustand open0,
     *  Umschalten über setOpen(t, offen). (x, y) = Bahnoberfläche, h = Höhe über der Bahn. */
    gate({ x, y, h, open = 1.2, period = 3, phase = 0, mode = 'timed', open0 = 0, kind = 'gate', ramp = 0.18 }) {
      // (x, y) liegt auf der Mittellinie der Bahn. Zu: oberes Ende h über der Oberfläche. Offen: ganz unter ihr.
      const rad = this.rad * 0.7, top = y - this.rad - h, depth = h + this.rad + rad + 3;
      const el = { type: 'gate', kind, x, y, h, mode, period, open, ph: phase + (mode === 'timed' ? this.phase(period) : 0), s0: open0, s1: open0, at: -1, bodies: [] };
      el.frac = (t) => {
        if (el.mode === 'manual') return el.at < 0 ? el.s1 : lerp(el.s0, el.s1, ease((t - el.at) / ramp));
        const u = fmod(t + el.ph, el.period);
        return u < ramp ? ease(u / ramp) : u < el.open ? 1 : u < el.open + ramp ? 1 - ease((u - el.open) / ramp) : 0;
      };
      el.setOpen = (t, on) => { const f = el.frac(t); el.s0 = f; el.s1 = on ? 1 : 0; el.at = t; };
      el.bodies.push(this._body([{ ax: 0, ay: 0, bx: 0, by: h + this.rad + 30, rad }], (t) => ({ x, y: top + depth * el.frac(t), a: 0 }), { look: 'gate', tag: 'gate' }));
      el.state = () => [el.s0, el.s1, el.at];
      return this._add(el);
    }
    /** C2 Pendelhammer: Drehpunkt (px, py), Länge L, Ausschlag amp, Takt period. Parkt nach dem Schließen der Fallen. */
    hammer({ px, py, L, amp = 0.87, period = 2.4, phase = 0, headW, headR }) {
      const hw = headW || this.d * 1.1, hr = headR || this.d * 0.42, rad = this.rad * 0.5;
      const el = { type: 'hammer', px, py, L, amp, period, ph: phase + this.phase(period), closedAt: -1, park: 0, bodies: [] };
      const swing = (t) => amp * sin(TAU * (t + el.ph) / period);
      el.angle = (t) => {
        if (el.closedAt < 0 || t < el.closedAt) return swing(t);
        return lerp(swing(el.closedAt), el.park, ease((t - el.closedAt) / 0.9));
      };
      el.bodies.push(this._body([
        { ax: 0, ay: 0, bx: 0, by: L - hr, rad },
        { ax: -hw / 2, ay: L, bx: hw / 2, by: L, rad: hr },
      ], (t) => ({ x: px, y: py, a: el.angle(t) }), { look: 'hammer', hub: rad * 2.4, tag: 'hammer' }));
      el.closeTraps = (t) => { if (el.closedAt < 0) { el.closedAt = t; const a = swing(t); el.park = (a >= 0 ? 1 : -1) * 1.45; } };
      el.state = () => [el.closedAt, el.park];
      return this._add(el);
    }
    /** C3 Kolben: schiebt längs (dx, dy) um stroke; Platte quer zur Richtung, Breite w. */
    piston({ x, y, dx, dy, stroke, period = 1, phase = 0, w, len, push = 0.15, tilt = 0 }) {
      const n = Math.sqrt(dx * dx + dy * dy), ux = dx / n, uy = dy / n, rad = this.rad * 0.9, pw = w || this.d * 1.2, rl = len || this.d * 1.5;
      const ph = phase + this.phase(period), hold = push + 0.15, back = Math.min(0.95, hold + 0.35);
      const prof = (t) => { const u = fmod(t + ph, period) / period; return u < push ? ease(u / push) : u < hold ? 1 : u < back ? 1 - ease((u - hold) / (back - hold)) : 0; };
      // Platte quer zur Richtung, um tilt gedreht (schräger Stoß bei senkrechtem Hub)
      const ct = cos(tilt), st = sin(tilt), px = -uy * ct - ux * st, py = ux * ct - uy * st;
      const shapes = [
        { ax: px * pw / 2, ay: py * pw / 2, bx: -px * pw / 2, by: -py * pw / 2, rad },
        { ax: -ux * rl, ay: -uy * rl, bx: 0, by: 0, rad: rad * 0.6 },
      ];
      const body = this._body(shapes, (t) => { const f = prof(t) * stroke; return { x: x + ux * f, y: y + uy * f, a: 0 }; }, { look: 'piston', tag: 'piston' });
      return this._add({ type: 'piston', x, y, ux, uy, stroke, bodies: [body] });
    }
    /** C4 Plattform nach Schlüsselbildern [[t, x, y, a], …] über eine Periode (weich dazwischen). */
    mover({ shapes, keys, period, look = 'platform', phase = 0 }) {
      const ph = phase + this.phase(period) * 0.5;
      const at = (t) => {
        const u = fmod(t + ph, period);
        let i = 0; while (i < keys.length - 1 && keys[i + 1][0] <= u) i++;
        const k0 = keys[i], k1 = keys[(i + 1) % keys.length], t1 = i + 1 < keys.length ? k1[0] : period;
        const f = ease((u - k0[0]) / Math.max(1e-6, t1 - k0[0]));
        return { x: lerp(k0[1], k1[1], f), y: lerp(k0[2], k1[2], f), a: lerp(k0[3], k1[3], f) };
      };
      const body = this._body(shapes.map((s) => ({ rad: this.rad, ...s })), at, { look, tag: 'platform' });
      return this._add({ type: 'mover', bodies: [body] });
    }
    /** C5 Förderband: Bahnstück, dessen Oberfläche mit v läuft und alle half Sekunden die Richtung wechselt. */
    conveyor({ pts, v = 420, half = 4, phase = 0, constant = false }) {
      const shapes = this.track(pts, { kind: 'belt', fric: 0.5, tag: 'belt' });
      const ph = phase + this.phase(2 * half);
      const el = { type: 'conveyor', pts, v, pos: 0, speed: 0, bodies: [], shapes };
      el.speedAt = (t) => {
        if (constant) return v;
        const u = fmod(t + ph, 2 * half), ramp = (q) => (q < 0.6 ? -1 + 2 * ease(q / 0.6) : 1);
        return v * (u < half ? ramp(u) : -ramp(u - half));
      };
      el.update = (st, dt) => { el.speed = el.speedAt(st.t); for (const s of shapes) s.speed = el.speed; el.pos += el.speed * dt; };
      el.speed = el.speedAt(0); for (const s of shapes) s.speed = el.speed;
      el.state = () => [el.pos];
      return this._add(el);
    }
    /** C6 Falltüren: n Platten ab (x0, y) mit Breite w, Scharnier links; sie klappen in Seed-Reihenfolge auf. */
    trapdoors({ x0, y, n = 6, w, interval = 0.9, blink = 0.6, open = 1.0, start = 1.0, slope = 0 }) {
      const rad = this.rad, order = [];
      for (let i = 0; i < n; i++) order.push(i);
      if (this.rng) for (let i = n - 1; i > 0; i--) { const j = Math.floor(this.rng.next() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      const cycle = n * interval, el = { type: 'trapdoors', x0, y, n, w, order, interval, blink, open, start, closedAt: -1, bodies: [] };
      const slot = order.map((_, i) => order.indexOf(i));                // Platte i öffnet als slot[i]-te
      // Öffnungsgrad 0..1 der Platte i zur Zeit t (ohne Schließen der Fallen)
      const raw = (i, t) => {
        if (t < start) return 0;
        const u = fmod(t - start - slot[i] * interval, cycle);
        return u < blink ? 0 : u < blink + 0.2 ? ease((u - blink) / 0.2) : u < blink + 0.2 + open ? 1 : u < blink + 0.5 + open ? 1 - ease((u - blink - 0.2 - open) / 0.3) : 0;
      };
      el.openAt = (i, t) => (el.closedAt >= 0 && t >= el.closedAt ? raw(i, el.closedAt) * (1 - ease((t - el.closedAt) / 0.3)) : raw(i, t));
      el.warnAt = (i, t) => {
        if (t < start || (el.closedAt >= 0 && t >= el.closedAt)) return 0;
        const u = fmod(t - start - slot[i] * interval, cycle);
        return u < blink ? 1 : 0;
      };
      const sl = slope * PI / 180;
      for (let i = 0; i < n; i++) {
        const hx = x0 + i * w * cos(sl), hy = y + i * w * sin(sl);
        el.bodies.push(this._body([{ ax: 0, ay: 0, bx: w - 2, by: 0, rad }], (t) => ({ x: hx, y: hy, a: sl + 1.35 * el.openAt(i, t) }), { look: 'trap', tag: 'trap' }));
      }
      el.closeTraps = (t) => { if (el.closedAt < 0) el.closedAt = t; };
      el.state = () => [el.closedAt];
      return this._add(el);
    }

    // ---------------------------------------------------------------- D · Das Level verändert sich
    /** D1 Kippbrett um (x, y), Länge len, Ausschlag amp, volle Periode period; holes: [[von, bis]] in lokalem x;
     *  posts: [x] kleine Stifte auf dem Brett; lips: Höhe der Endkanten (0 = offen). */
    tilt({ x, y, len, amp = 0.21, period = 7, phase = 0, holes = [], posts = [], lips = 0 }) {
      const rad = this.rad, shapes = [], cuts = [[-len / 2, len / 2]];
      for (const [h0, h1] of holes) {
        const k = cuts.findIndex(([a, b]) => h0 > a && h1 < b);
        if (k >= 0) { const [a, b] = cuts[k]; cuts.splice(k, 1, [a, h0], [h1, b]); }
      }
      for (const [a, b] of cuts) shapes.push({ ax: a + rad, ay: 0, bx: b - rad, by: 0, rad });
      for (const px of posts) shapes.push({ ax: px, ay: -rad - this.r * 0.55, bx: px, by: 0, rad: rad * 0.6 });
      if (lips) for (const s of [-1, 1]) shapes.push({ ax: s * (len / 2 - rad), ay: -lips, bx: s * (len / 2 - rad), by: 0, rad: rad * 0.8 });
      const ph = phase + this.phase(period);
      const body = this._body(shapes, (t) => ({ x, y, a: amp * sin(TAU * (t + ph) / period) }), { look: 'tilt', hub: rad * 2.2, tag: 'tilt' });
      return this._add({ type: 'tilt', x, y, len, amp, period, holes, bodies: [body] });
    }
    /** D2 Einstürzende Brücke von (x0, y0) nach (x1, y1) mit n Planken. Der Einsturz beginnt bei `start` (Bahnzeit)
     *  oder, mit trigger = x, wenn die erste Murmel x überquert (+ delay). Von hinten (x0) nach vorn. */
    bridge({ x0, y0, x1, y1, n = 10, start = 4, trigger, delay = 0, interval = 0.5, wobble = 0.4, g = 1600 }) {
      const rad = this.rad, dx = (x1 - x0) / n, dy = (y1 - y0) / n, pitch = Math.sqrt(dx * dx + dy * dy);
      const ux = dx / pitch, uy = dy / pitch;
      const el = { type: 'bridge', x0, y0, x1, y1, n, pitch, ux, uy, startT: trigger === undefined ? start : -1, trigger, interval, wobble, closedAt: -1, bodies: [], homes: [] };
      const deckA = 0;                                                 // Planken liegen lokal schon längs der Brücke
      const rel = (i) => (el.startT < 0 ? Infinity : el.startT + i * interval);
      const fall = (i, t, hx, hy) => {
        const ti = rel(i), seedA = ((i * 7919) % 13) / 13 - 0.5;
        if (t < ti - wobble) return { x: hx, y: hy, a: deckA };
        if (t < ti) { const u = t - (ti - wobble); return { x: hx, y: hy + 1.5 * u / wobble, a: deckA + 0.05 * sin(TAU * 9 * u) * (0.4 + u / wobble) }; }
        const u = t - ti;
        return { x: hx + seedA * 60 * u, y: hy + 1.5 + 0.5 * g * 1.12 * u * u, a: deckA + seedA * 2.4 * u * u + (seedA > 0 ? 0.3 : -0.3) * u };
      };
      for (let i = 0; i < n; i++) {
        const hx = x0 + dx * (i + 0.5), hy = y0 + dy * (i + 0.5);
        el.homes.push([hx, hy]);
        const pose = (t) => {
          const ti = rel(i);
          if (el.closedAt < 0 || t < el.closedAt) return fall(i, t, hx, hy);
          if (ti > el.closedAt) return { x: hx, y: hy, a: deckA };           // nicht gelöst: bleibt (Wackeln endet)
          const tr = el.closedAt + 0.25, f = fall(i, Math.min(t, tr), hx, hy);
          if (t <= tr) return f;
          const k = ease((t - tr) / 0.6);
          return { x: lerp(f.x, hx, k), y: lerp(f.y, hy, k), a: lerp(f.a, deckA, k) };
        };
        el.bodies.push(this._body([{ ax: -ux * pitch / 2, ay: -uy * pitch / 2, bx: ux * pitch / 2, by: uy * pitch / 2, rad }], pose, { look: 'plank', tag: 'plank' }));
      }
      el.released = (i, t) => t >= rel(i) && (el.closedAt < 0 || rel(i) <= el.closedAt);
      el.wobbling = (i, t) => t >= rel(i) - wobble && t < rel(i) && (el.closedAt < 0 || t < el.closedAt);
      el.update = (st) => {
        if (el.startT < 0 && el.trigger !== undefined) {
          for (const m of st.marbles) if (m.active && m.collide && (ux > 0 ? m.x > el.trigger : m.x < el.trigger)) { el.startT = st.t + delay; break; }
        }
        // Fallende Planken weit unten abschalten, zurückkehrende wieder einschalten
        el.bodies.forEach((b, i) => { b.enabled = !(el.released(i, st.t) && el.closedAt < 0 && st.t - rel(i) > 1.5); });
        for (let i = 0; i < n; i++) if (rel(i) <= st.t && rel(i) > st.t - st.dt - 1e-9 && (el.closedAt < 0 || rel(i) <= el.closedAt)) st.emit('plank', el.homes[i][0], el.homes[i][1], i, -1);
      };
      el.closeTraps = (t) => { if (el.closedAt < 0) el.closedAt = t; };
      el.state = () => [el.startT, el.closedAt];
      return this._add(el);
    }
    /** D3 Wandernde Böden zwischen den Wänden xl..xr: je Boden eine Höhe y, Neigung (+ fällt nach rechts), ein Loch
     *  bei hole (lokales x ab Mitte) und ein offenes Ende an der tiefen Seite. Die Böden gleiten um ±travel/2. */
    floors({ xl, xr, levels, travel, periods, holeW, endGap }) {
      const rad = this.rad, hw = holeW || this.d * 1.45, eg = endGap === undefined ? travel / 2 + this.d * 0.2 : endGap, bodies = [];
      const half = (xr - xl) / 2;
      levels.forEach((lv, i) => {
        // Lokales x: 0 in der Mitte zwischen den Wänden. Oberfläche y(x) = dir · x · tan(Neigung): tiefer zum offenen Ende.
        const dir = lv.dir, s = lv.slope * PI / 180, k = sin(s) / cos(s);
        const low = dir * (half - rad - eg), high = -dir * (half + travel / 2 + 2 * rad);
        const [lo, hi] = low < high ? [low, high] : [high, low], shapes = [];
        const segs = lv.hole === undefined ? [[lo, hi]] : [[lo, lv.hole - hw / 2], [lv.hole + hw / 2, hi]];
        for (const [a, b] of segs) shapes.push({ ax: a + rad, ay: dir * (a + rad) * k, bx: b - rad, by: dir * (b - rad) * k, rad });
        const P = periods[i % periods.length], ph = this.phase(P) + (lv.phase || 0), cx = (xl + xr) / 2;
        bodies.push(this._body(shapes, (t) => ({ x: cx + (travel / 2) * sin(TAU * (t + ph) / P), y: lv.y, a: 0 }), { look: 'floor', tag: 'floor' }));
      });
      return this._add({ type: 'floors', xl, xr, levels, travel, bodies });
    }
    /** D4 Drehende Bühne: großer Ring mit Ausgang, innen ein Labyrinth aus Ringstücken und Speichen; Eintritt von
     *  vorn in die Mitte. */
    maze({ x, y, R, rps = 0.08, rings = [0.66, 0.36], spokes = 3, gapW, exits = 2 }) {
      const rad = this.rad * 0.75, gw = gapW || this.d * 1.6, ex = [];
      for (let i = 0; i < exits; i++) ex.push({ at: PI / 2 + i * TAU / exits, w: gw + 2 * rad });
      const shapes = [...ringShapes(R, rad, ex, 2, 64)];
      const rnd = () => (this.rng ? this.rng.next() : 0.5);
      rings.forEach((f, k) => {
        const Ri = R * f, Ro = k === 0 ? R : R * rings[k - 1], a0 = rnd() * TAU;
        const gaps = [{ at: a0, w: gw + 2 * rad }, { at: a0 + PI * (0.8 + 0.4 * rnd()), w: gw + 2 * rad }];
        shapes.push(...ringShapes(Ri, rad, gaps, 2, Math.max(24, Math.round(64 * f))));
        // Speichen im Ring außerhalb: abwechselnd innen und außen angesetzt, 60 % der Breite, damit man vorbeikommt
        for (let s = 0; s < spokes; s++) {
          const a = a0 + PI / spokes + s * TAU / spokes + 0.3 * rnd(), inner = s % 2 === 0;
          const r0 = inner ? Ri + rad : Ro - rad, r1 = inner ? Ri + 0.6 * (Ro - Ri) : Ro - 0.6 * (Ro - Ri);
          shapes.push({ ax: r0 * cos(a), ay: r0 * sin(a), bx: r1 * cos(a), by: r1 * sin(a), rad: rad * 0.9, mask: 2 });
        }
      });
      const ph = this.phase(1 / Math.abs(rps)) * TAU * Math.abs(rps), w = TAU * rps;
      const body = this._body(shapes, (t) => ({ x, y, a: ph + w * t }), { look: 'maze', tag: 'maze' });
      this.zone(x, y, R * rings[rings.length - 1] - rad - this.r - 2, R + rad + this.r + 4);
      return this._add({ type: 'maze', x, y, R, rps, bodies: [body] });
    }

    /** Ergebnis für Simulation und Darstellung. */
    result() {
      return { tracks: this.tracks, pegs: this.pegs, elements: this.elements, zones: this.zones, pits: this.pits, signs: this.signs,
        decor: this.decor, path: this.path, start: this.start, finish: this.finish, knockoutY: this.knockoutY, r: this.r, T: this.T };
    }
  }

  EBS.KnockoutElements = { Builder, kin, arcPts, ringShapes, ease, fmod, lerp, clamp01 };
})(typeof window !== 'undefined' ? window : globalThis);
