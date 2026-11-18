/*
 * Cloud Wars – Anzeige und Einblendungen je Format (Paket C5). Reine Darstellung in logischen Einheiten.
 * Hochformat (Short): kein Rahmen und keine Leisten, nur Einblendungen auf einer festen Zeile am oberen Rand (6,5 % der Höhe),
 * zwischen den Symbolen der Plattform in den Ecken (Nachtrag 18.11.); die rechten 14 % bleiben frei (Bedienung der Plattform). Die
 * schlanke Anzeige (Farbpunkte mit Massebalken) bleibt wählbar.
 * Querformat: Punktestand oben links (Name, Siege, Massebalken), Runde und Uhrzeit oben rechts; Einblendungen bei 18 %.
 * Einblendungen kommen aus sim.notes (Gewitter, raus, Sieg, Runde) und dem Wetterplan; alles nur aus t berechnet.
 * Alle Texte im Video englisch.
 */
(function () {
'use strict';
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const FONT = '"Segoe UI", Roboto, Arial, sans-serif';
const BANNER = { show: 2.6, fadeIn: 0.25, fadeOut: 0.5, stale: 4, portraitY: 0.065 };
const INK = '#2b3a4f';

function displayMode(params, world) {
  const d = params.display || 'auto';
  return d === 'auto' ? (world.h > world.w ? 'clean' : 'full') : d;
}

/** Texte der Einblendungen in zeitlicher Reihenfolge; überlappende rücken nach, zu alte fallen weg. */
function banners(sim, teams) {
  const St = EBS.CloudWarsStory, mode = sim.cfg.mode, t = sim.t, list = [];
  if (mode === 'short') list.push({ t: 0.4, text: 'WHICH CLOUD RULES THE SKY?', color: null, show: 3.2 });
  else list.push({ t: 0.4, text: 'ROUND 1', color: null });
  for (const n of sim.notes) {
    const tm = teams[n.team];
    if (n.type === 'storm') list.push({ t: n.t, text: `${tm.name} IS A STORM!`, color: tm.color });
    else if (n.type === 'eliminated') list.push({ t: n.t, text: `${tm.name} IS GONE`, color: tm.color });
    else if (n.type === 'win') list.push({ t: n.t, text: `${tm.name} RULES THE SKY!`, color: tm.color, show: 3.6, big: true });
    else if (n.type === 'round') list.push({ t: n.t + 0.2, text: `ROUND ${n.round}`, color: null });
  }
  for (const s of St.weatherChanges(sim.seed, t, mode)) {
    const W = St.WEATHER[s.kind];
    if (W.text) list.push({ t: s.t0 + (s.t0 === 0 ? 3.2 : 0.5), text: W.text, color: null, weather: true });
  }
  list.sort((a, b) => a.t - b.t || (a.big ? -1 : 0));
  let end = -1;
  const out = [];
  for (const b of list) {
    if (b.t > t) break;
    const start = Math.max(b.t, end), show = b.show || BANNER.show;
    if (start - b.t > BANNER.stale && !b.big) continue;          // zu spät: weglassen statt nachreichen
    end = start + show;
    out.push({ ...b, start, end });
  }
  return out.filter((b) => t >= b.start && t < b.end);
}

class Layout {
  constructor({ teams, world }) {
    this.teams = teams; this.portrait = world.h > world.w;
  }

  draw(g, sim, world, params, view) {
    const mode = displayMode(params, world);
    if (mode === 'off') return;
    if (view.hud !== false && mode !== 'clean') {
      if (mode === 'full') this.full(g, sim, world);
      else this.slim(g, sim, world);
    }
    for (const b of banners(sim, this.teams)) this.banner(g, sim, world, b);
  }

  share(sim) {
    const m = sim.teamMass(), tot = m.reduce((s, v) => s + v, 0) || 1;
    return m.map((v) => v / tot);
  }

  /** Schlank: vier Punkte mit Balken oben, ohne Rahmen. */
  slim(g, sim, world) {
    const sh = this.share(sim), useW = world.w * (this.portrait ? 0.86 : 1), n = this.teams.length;
    const top = this.portrait ? 40 : 24, cellW = Math.min(200, useW / n), x0 = (useW - cellW * n) / 2;
    for (let i = 0; i < n; i++) {
      const tm = this.teams[i], cx = x0 + cellW * (i + 0.5), out = sh[i] <= 0;
      g.globalAlpha = out ? 0.35 : 1;
      g.fillStyle = 'rgba(20,28,40,0.35)'; g.beginPath(); g.roundRect(cx - cellW * 0.36, top + 26, cellW * 0.72, 10, 5); g.fill();
      g.fillStyle = tm.color; g.beginPath(); g.roundRect(cx - cellW * 0.36, top + 26, Math.max(10, cellW * 0.72 * sh[i]), 10, 5); g.fill();
      g.beginPath(); g.arc(cx, top + 8, 13, 0, Math.PI * 2); g.fill();
      g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.stroke();
      if (sim.winner === i) { g.fillStyle = '#fff'; g.font = `900 16px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★', cx, top + 9); }
    }
    g.globalAlpha = 1;
  }

  /** Voll (Querformat): Punktestand oben links, Runde und Uhrzeit oben rechts. */
  full(g, sim, world) {
    const sh = this.share(sim), rounds = sim.cfg.mode === 'rounds';
    const x = 28, y = 26, rowH = 34, w = 300;
    g.fillStyle = 'rgba(18,26,38,0.42)'; g.beginPath(); g.roundRect(x - 12, y - 12, w + 24, rowH * this.teams.length + 14, 14); g.fill();
    g.textBaseline = 'middle';
    this.teams.forEach((tm, i) => {
      const cy = y + rowH * i + rowH / 2 - 4, out = sh[i] <= 0;
      g.globalAlpha = out ? 0.4 : 1;
      g.fillStyle = tm.color; g.beginPath(); g.arc(x + 9, cy, 9, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.font = `800 19px ${FONT}`; g.textAlign = 'left'; g.fillText(tm.name, x + 26, cy);
      // Siege als Punkte, ab sechs als Zahl
      const wins = sim.scores[i], wx = x + 132;
      if (rounds) {
        if (wins > 5) { g.font = `800 17px ${FONT}`; g.fillText(`${wins}×`, wx, cy); }
        else for (let k = 0; k < wins; k++) { g.beginPath(); g.arc(wx + 5 + k * 12, cy, 4, 0, Math.PI * 2); g.fill(); }
      }
      const bx = x + 200, bw = w - 200;
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.roundRect(bx, cy - 5, bw, 10, 5); g.fill();
      g.fillStyle = tm.color; g.beginPath(); g.roundRect(bx, cy - 5, Math.max(10, bw * sh[i]), 10, 5); g.fill();
    });
    g.globalAlpha = 1;
    if (rounds) {
      const St = EBS.CloudWarsStory, day = St.dayAt(sim.t, 'rounds'), mins = Math.floor(((6 + day * 24) % 24) * 60);
      const clock = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(Math.floor(mins / 10) * 10 % 60).padStart(2, '0')}`;
      const text = `ROUND ${sim.round}   ${clock}`;
      g.font = `800 19px ${FONT}`; const tw = g.measureText(text).width;
      g.fillStyle = 'rgba(18,26,38,0.42)'; g.beginPath(); g.roundRect(world.w - tw - 52, 14, tw + 24, 36, 14); g.fill();
      g.fillStyle = '#fff'; g.textAlign = 'right'; g.fillText(text, world.w - 40, 33);
    }
  }

  banner(g, sim, world, b) {
    const age = sim.t - b.start, len = b.end - b.start;
    const a = clamp(age / BANNER.fadeIn, 0, 1) * clamp((len - age) / BANNER.fadeOut, 0, 1);
    if (a <= 0) return;
    const pop = 0.82 + 0.18 * (1 - Math.pow(1 - clamp(age / BANNER.fadeIn, 0, 1), 3));
    const portrait = this.portrait, fs0 = portrait ? (b.big ? 70 : 58) : (b.big ? 64 : 56);
    const cx = portrait ? world.w * 0.43 : world.w / 2, cy = world.h * (portrait ? BANNER.portraitY : 0.18), maxW = world.w * (portrait ? 0.8 : 0.7);
    g.save(); g.translate(cx, cy); g.scale(pop, pop); g.globalAlpha = a;
    let fs = fs0; g.font = `900 ${fs}px ${FONT}`;
    let tw = g.measureText(b.text).width;
    if (tw > maxW) { fs = Math.floor(fs * maxW / tw); g.font = `900 ${fs}px ${FONT}`; tw = g.measureText(b.text).width; }
    const padX = fs * 0.55, h = fs * 1.5;
    g.fillStyle = 'rgba(255,255,255,0.93)'; g.beginPath(); g.roundRect(-tw / 2 - padX, -h / 2, tw + padX * 2, h, h / 2); g.fill();
    if (b.color) { g.lineWidth = Math.max(4, fs * 0.08); g.strokeStyle = b.color; g.stroke(); }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = INK;
    g.fillText(b.text, 0, fs * 0.04);
    g.restore();
  }
}

EBS.CloudWarsLayout = { Layout, banners, displayMode, BANNER };
})();
