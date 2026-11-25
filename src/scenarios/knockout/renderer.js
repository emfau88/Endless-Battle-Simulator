/* Marble Knockout · Bild (R43/M5)
 *
 * Painter zeichnet ein Bild aus dem Zustand der Simulation: feste Teile aus einer Textur je Bahn, darüber bewegte
 * Elemente, Murmeln, Zulaufrinnen „vorn“, Ziel und die Texte. Alle Zeiten für Einblendungen kommen aus dem Zustand
 * (Phasenzeit, Zeitpunkt der Ereignisse), nichts hängt an der Zahl gezeichneter Bilder.
 */
(function (global) {
  'use strict';
  const EBS = global.EBS;
  const A = EBS.KnockoutArt;
  const TAU = Math.PI * 2;
  const fade = (age, inn, hold, out) => (age < 0 ? 0 : age < inn ? age / inn : age < inn + hold ? 1 : age < inn + hold + out ? 1 - (age - inn - hold) / out : 0);

  class Painter {
    constructor(sim, scale = 1) { this.sim = sim; this.scale = scale; this.cache = null; this.key = ''; }
    setSim(sim) { this.sim = sim; this.key = ''; }

    staticLayer() {
      const sim = this.sim, key = `${sim.stageNo}|${sim.galleryIndex}|${sim.stageSeedValue}|${sim.galleryStart}|${this.scale}`;
      if (key === this.key && this.cache) return this.cache;
      const c = this.cache || document.createElement('canvas');
      c.width = Math.round(sim.W * this.scale); c.height = Math.round(sim.H * this.scale);
      const g = c.getContext('2d'); g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
      A.paintStatic(g, sim, sim.stage, (sim.spec && sim.spec.world) || 'petrol');
      this.cache = c; this.key = key; return c;
    }

    paint(g) {
      const sim = this.sim, st = sim.stage, W = sim.W, H = sim.H, rt = sim.world.t, r = sim.r;
      g.drawImage(this.staticLayer(), 0, 0, W, H);
      if (st.finish) A.finishLine(g, st.finish, sim.T);
      for (const el of st.elements) A.drawElement(g, el, sim, rt, sim.t);
      // Murmeln: Klappe unter Ausgeschiedenen, dann die Murmeln (Führende zuletzt, damit sie oben liegt)
      const runners = sim.runners || [];
      for (const u of runners) if (u.hatchT >= 0) A.hatch(g, u.hx, u.hy, sim.t - u.hatchT, r);
      const racing = sim.phase === 'race' && !sim.final;
      const order = runners.slice().sort((a, b) => (b.rank || 0) - (a.rank || 0));
      for (const u of order) {
        const m = u.pm, M = sim.roster[u.rid];
        if (!m.active || !M) continue;
        if (m.y < -3 * r || m.y > H + 3 * r) continue;
        const lead = sim.mode !== 'gallery' && sim.phase === 'race' && sim.leader === u.rid && !u.out;
        const danger = racing && sim.lastPlace === u.rid && sim.needOut > sim.outHere ? 0.75 + 0.25 * Math.sin(sim.t * TAU * 1.6) : 0;
        A.marble(g, m.x, m.y, r, M.name, M.color, m.a, { crown: lead && sim.cfg.marks !== 'off', danger: sim.cfg.marks !== 'off' ? danger : 0, noShadow: !m.collide });
      }
      for (const tr of st.tracks) if (tr.front) A.drawTrack(g, tr);
      this.overlay(g);
    }

    overlay(g) {
      const sim = this.sim, W = sim.W, H = sim.H, short = sim.format === 'short';
      if (sim.mode === 'gallery') {
        A.text(g, sim.spec.title, W / 2, short ? 170 : 92, short ? 64 : 52, { align: 'center', weight: 900, spacing: 2 });
        return;
      }
      if (sim.cfg.display === 'off') return;
      const n = sim.list.length, no = sim.stageNo + 1, title = sim.spec.title, alive = sim.roster.filter((m) => m.alive).length;
      if (!short) {
        // Anzeige oben links und rechts, Röhre OUT rechts
        if (sim.phase !== 'podium' && sim.phase !== 'end') {
          A.text(g, sim.final ? 'GRAND FINAL' : `STAGE ${no}/${n}`, 56, 80, 46, { weight: 900, spacing: 1 });
          A.text(g, sim.final ? 'FOR GOLD, SILVER AND BRONZE' : sim.safe ? 'SAFE STAGE · NOBODY IS OUT' : title, 58, 122, 28, { weight: 800, spacing: 3, color: A.S.sub });
          A.text(g, `${alive} LEFT`, sim.mode === 'race' ? 1790 : 1886, 80, 46, { weight: 900, align: 'right', spacing: 1 });
        }
        if (sim.mode === 'race') A.outTube(g, sim, 1856, 178, 1012, 56);
        // Einstieg und Bahntitel
        if (sim.phase === 'intro') this.card(g, ['12 MARBLES. 10 STAGES.', 'THE LAST ONE IS OUT.'], fade(sim.phaseT, 0.4, 2.8, 0.5));
        if (sim.phase === 'ready') this.card(g, [sim.final ? 'GRAND FINAL' : `STAGE ${no}`, sim.final ? '3 MARBLES. ONE CROWN.' : title], fade(sim.phaseT, 0.2, sim.R.ready - 0.2, 0.4), true);
        if (sim.phase === 'race' && sim.world.t - sim.raceStart < 0.6) this.card(g, [sim.final ? 'GRAND FINAL' : `STAGE ${no}`, sim.final ? '3 MARBLES. ONE CROWN.' : title], 1 - (sim.world.t - sim.raceStart) / 0.6, true);
      } else {
        // Short: kein Rahmen; große Zeile zu Beginn jeder Bahn, Frage im ersten Bild
        const keep = sim.final ? 'FINAL' : `${alive} → TOP ${sim.keep}`;
        const since = sim.phase === 'ready' ? sim.phaseT : sim.phase === 'race' ? sim.R.ready + (sim.world.t - sim.raceStart) : 99;
        if (sim.stageNo === 0 && since < 3.2) {
          A.text(g, sim.hook || 'PICK YOUR COLOR!', W / 2, H * 0.42, 96, { align: 'center', weight: 900, spacing: 1, outline: true, alpha: fade(since, 0.01, 2.6, 0.5) });
        } else if (since < 2.2) {
          A.text(g, keep, W / 2, H * 0.42, 112, { align: 'center', weight: 900, spacing: 2, outline: true, alpha: fade(since, 0.15, 1.5, 0.5) });
          A.text(g, title, W / 2, H * 0.42 + 76, 40, { align: 'center', weight: 800, spacing: 5, color: A.S.sub, alpha: fade(since, 0.15, 1.5, 0.5) });
        }
      }
      // Einblendungen aus dem Zustand: wer raus ist, Fallen zu, Sieger
      const now = sim.t;
      const outs = sim.notes.filter((x) => x.kind === 'out' && now - x.t < 2.0);
      if (outs.length) {
        const names = outs.map((x) => sim.roster[x.rid].name), k = fade(now - outs[0].t, 0.15, 1.4, 0.45);
        const line = names.length === 1 ? `${names[0]} IS OUT` : names.length === 2 ? `${names[0]} & ${names[1]} ARE OUT` : `${names.length} ARE OUT`;
        A.text(g, line, W / 2, short ? H * 0.56 : H * 0.5, short ? 78 : 64, { align: 'center', weight: 900, spacing: 2, outline: true, alpha: k, color: '#ffd9d4' });
      }
      const traps = sim.notes.filter((x) => x.kind === 'traps' && now - x.t < 1.8);
      if (traps.length) A.text(g, 'TRAPS CLOSED', W / 2, short ? H * 0.62 : H * 0.58, short ? 56 : 40, { align: 'center', weight: 900, spacing: 3, color: '#b8f5c8', alpha: fade(now - traps[0].t, 0.15, 1.2, 0.45) });
      if (sim.final && sim.phase === 'result') {
        const win = sim.runners.find((u) => u.place === 1);
        if (win) A.text(g, `${sim.roster[win.rid].name} WINS!`, W / 2, short ? H * 0.42 : H * 0.46, short ? 120 : 96, { align: 'center', weight: 900, spacing: 2, outline: true, alpha: fade(sim.phaseT, 0.2, 9, 0.3), color: '#fff3c4' });
      }
      if (sim.phase === 'podium' || (sim.phase === 'end' && sim.podium)) this.podium(g);
    }

    card(g, lines, k, small) {
      if (k <= 0) return;
      const sim = this.sim, W = sim.W, H = sim.H;
      g.save(); g.globalAlpha = Math.min(1, k) * 0.55; g.fillStyle = '#000'; g.fillRect(0, H * 0.36, W, H * 0.24); g.restore();
      A.text(g, lines[0], W / 2, H * 0.47, small ? 84 : 76, { align: 'center', weight: 900, spacing: 3, alpha: Math.min(1, k) });
      A.text(g, lines[1], W / 2, H * 0.47 + 62, small ? 40 : 44, { align: 'center', weight: 800, spacing: 5, color: A.S.sub, alpha: Math.min(1, k) });
    }

    podium(g) {
      const sim = this.sim, W = sim.W, H = sim.H, k = Math.min(1, sim.phaseT / 0.5), p = sim.podium || [];
      g.save(); g.globalAlpha = 0.6 * k; g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.restore();
      const blocks = [[1, W / 2, 300, '#e3b23c'], [0, W / 2 - 260, 220, '#c8ced4'], [2, W / 2 + 260, 160, '#c58a52']];
      const base = H * 0.82, r = sim.r * 2.4;
      for (const [i, x, h, col] of blocks) {
        const id = p[i]; if (id === undefined) continue;
        const hh = h * A.S && k;
        g.save(); g.globalAlpha = k;
        g.fillStyle = col; g.beginPath(); g.roundRect(x - 120, base - h * k, 240, h * k, 10); g.fill();
        A.text(g, String(i + 1), x, base - h * k + 70, 64, { align: 'center', weight: 900, color: 'rgba(0,0,0,0.55)' });
        const M = sim.roster[id];
        A.marble(g, x, base - h * k - r - 4, r, M.name, M.color, 0.3 + i, { crown: i === 0 });
        A.text(g, M.name, x, base - h * k - 2 * r - 40, 40, { align: 'center', weight: 900, spacing: 2 });
        g.restore();
        void hh;
      }
      A.text(g, 'CHAMPION', W / 2, 150, 72, { align: 'center', weight: 900, spacing: 6, alpha: k, color: '#fff3c4' });
    }
  }

  EBS.KnockoutRender = { Painter };
})(typeof window !== 'undefined' ? window : globalThis);
