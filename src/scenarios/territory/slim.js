/* Territory Wars · slim frame for Shorts. No title, no panels: the map fills
 * the picture. Only three things remain, all inside the area the Shorts
 * interface leaves free: a thin bar with the territory shares, short captions
 * at the story beats and a ring where a crown falls.
 * Pure presentation: everything is derived from the round state and the video
 * clock of the current frame, so a jump shows the same picture as playback. */
(function () {
  'use strict';
  const { clamp } = EBS.util, TEAMS = HexSim.TEAMS;
  const FONT = '"Segoe UI", system-ui, sans-serif';
  const INK = '#f3f7f4', PLATE = 'rgba(6,18,25,.80)';
  const ease = x => 1 - (1 - clamp(x, 0, 1)) ** 3;
  // Video seconds a caption stays. Victory stays until the video ends.
  const HOLD = { hook: 2.6, hq: 1.9, laststand: 2.3, surge: 1.7, victory: Infinity };

  function cuesOf(round) {
    if (round.cues) return round.cues;
    // Original maps: the bounded milestone list already holds falls and victory.
    return round.milestones.filter(e => e.type === 'hq' || e.type === 'victory')
      .map(e => ({ time: e.time, type: e.type, team: e.team, other: e.eliminated ?? -1, beat: null, tile: e.tile })).reverse();
  }
  /* Video seconds since a round time. After the result the round clock stands
   * still while the video runs on, measured in generator steps. */
  function videoClock(sim, remainder) {
    const r = sim.roundSim, hold = r.phase === 'finished' ? Math.max(0, sim.step - sim.resultStep) / 60 : 0;
    return t => (r.time + remainder - t) / sim.timeScale + hold;
  }
  function captionAt(sim, remainder) {
    const r = sim.roundSim, age = videoClock(sim, remainder), cues = cuesOf(r);
    for (let i = cues.length - 1; i >= 0; i--) {
      const c = cues[i], kind = c.type === 'story' ? c.beat : c.type, a = age(c.time);
      if (a < 0 || !(a < HOLD[kind])) continue;
      // The last crown falls and the victory is declared in the same tick.
      if (kind === 'hq' && r.phase === 'finished' && c.time === r.time) continue;
      const name = id => TEAMS[id] ? TEAMS[id].name : '';
      const parts = kind === 'victory' ? [[name(c.team), TEAMS[c.team].color], [' WINS', INK]]
        : kind === 'hq' ? [[name(c.other), TEAMS[c.other].color], [' FALLS', INK]]
        : kind === 'laststand' ? [['CAN ', INK], [name(c.team), TEAMS[c.team].color], [' SURVIVE?', INK]]
        : [[name(c.team), TEAMS[c.team].color], [' STRIKES BACK', INK]];
      return { kind, parts, age: a, hold: HOLD[kind], accent: TEAMS[kind === 'hq' ? c.other : c.team].color,
        sub: kind === 'victory' ? 'THE LAST CROWN' : '' };
    }
    const a = age(0);
    if (a < HOLD.hook) return { kind: 'hook', parts: [['4 KINGDOMS · 1 CROWN', INK]], age: a, hold: HOLD.hook, accent: '#cfe6dc', sub: 'PICK YOUR COLOR' };
    return null;
  }

  function plate(g, x, y, w, h, r, accent) {
    g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = PLATE; g.fill();
    g.lineWidth = 3; g.strokeStyle = accent + '8c'; g.stroke();
  }
  // top: upper edge of the plate (captions in the free strip above the map); the result is centred on y instead.
  function drawCaption(g, c, cx, y, top) {
    const big = c.kind === 'victory', size = big ? 104 : 58, subSize = big ? 34 : 27, cy = top ? y + size * .71 : y;
    // The opening line must be readable in the very first frame: no fade-in there.
    const pop = c.kind === 'hook' ? 1 : ease(c.age / .16), out = Number.isFinite(c.hold) ? clamp((c.hold - c.age) / .28, 0, 1) : 1;
    const scale = .88 + .12 * pop;
    g.save(); g.globalAlpha = Math.min(pop, out); g.translate(cx, cy); g.scale(scale, scale);
    g.font = `800 ${size}px ${FONT}`; g.textBaseline = 'middle'; g.textAlign = 'left';
    const widths = c.parts.map(([text]) => g.measureText(text).width), width = widths.reduce((a, b) => a + b, 0);
    g.font = `700 ${subSize}px ${FONT}`;
    const subWidth = c.sub ? g.measureText(c.sub).width + (big ? 0 : 0) : 0;
    const w = Math.max(width, subWidth) + size * .9, h = size * 1.42 + (c.sub ? subSize * 1.5 : 0);
    plate(g, -w / 2, -size * .71, w, h, size * .34, c.accent);
    g.font = `800 ${size}px ${FONT}`;
    let x = -width / 2;
    c.parts.forEach(([text, color], i) => { g.fillStyle = color; g.fillText(text, x, 2); x += widths[i]; });
    if (c.sub) {
      g.font = `700 ${subSize}px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#a9c3bd';
      g.fillText(c.sub, 0, size * .71 + subSize * .62);
    }
    g.restore();
  }
  function drawShares(g, round, cx, y, w) {
    const stats = round.stats(), usable = round.tiles.reduce((n, t) => n + (t.terrain !== 'mountain'), 0), h = 24, x0 = cx - w / 2;
    g.save();
    g.beginPath(); g.roundRect(x0 - 5, y - 5, w + 10, h + 10, (h + 10) / 2); g.fillStyle = PLATE; g.fill();
    g.beginPath(); g.roundRect(x0, y, w, h, h / 2); g.clip();
    g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(x0, y, w, h);
    let x = x0;
    for (const s of stats) {
      if (!s.alive || !s.tiles) continue;
      const part = s.tiles / usable * w;
      g.fillStyle = TEAMS[s.id].color; g.fillRect(x, y, part, h);
      g.fillStyle = 'rgba(6,18,25,.85)'; g.fillRect(x + part - 1.5, y, 3, h);
      x += part;
    }
    g.restore();
  }
  function drawRings(g, sim, remainder, view, layout) {
    const r = sim.roundSim, age = videoClock(sim, remainder);
    for (const c of cuesOf(r)) {
      if (c.type !== 'hq') continue;
      const a = age(c.time), t = r.tiles[c.tile];
      if (a < 0 || a >= .9 || !t) continue;
      const p = view.project(t.x, t.height + .6, t.z), k = a / .9, x = layout.x + p.x, y = layout.y + p.y;
      g.save();
      if (a < .25) { g.globalAlpha = .55 * (1 - a / .25); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, 60 + 180 * (a / .25), 0, Math.PI * 2); g.fill(); }
      g.globalAlpha = 1 - k; g.lineWidth = 16 * (1 - k) + 2; g.strokeStyle = TEAMS[c.team].color;
      g.beginPath(); g.arc(x, y, 50 + 430 * ease(k), 0, Math.PI * 2); g.stroke();
      g.restore();
    }
  }

  function drawNames(g, round, view, layout) {
    g.save(); g.font = `800 34px ${FONT}`; g.textBaseline = 'middle'; g.textAlign = 'center';
    for (const f of round.factions) {
      if (!f.alive) continue;
      const t = round.tiles[f.hq], p = view.project(t.x, t.height + 2.2, t.z), team = TEAMS[f.id];
      const w = g.measureText(team.name).width + 34, h = 50;
      // Keep the plate inside the picture even for a crown at the edge.
      const x = clamp(layout.x + p.x, w / 2 + 12, layout.x + layout.w - w / 2 - 12), y = layout.y + p.y - 14;
      g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, 12); g.fillStyle = PLATE; g.fill();
      g.lineWidth = 2.5; g.strokeStyle = team.color + 'b0'; g.stroke();
      g.fillStyle = team.color; g.fillText(team.name, x, y + 2);
    }
    g.restore();
  }

  /* layout: full frame { x, y, w, h, portrait }. remainder: unfinished part of a rule tick. */
  EBS.Territory.drawSlim = function (g, { sim, world, layout, view, remainder }) {
    const r = sim.roundSim, cx = world.w / 2, portrait = layout.portrait;
    drawNames(g, r, view, layout);
    drawRings(g, sim, remainder, view, layout);
    // Portrait: caption line at the very top, the share bar right below it, both above the map.
    drawShares(g, r, cx, portrait ? 180 : 46, portrait ? world.w * .76 : world.w * .42);
    const caption = sim.cfg.showWinner || r.phase !== 'finished' ? captionAt(sim, remainder) : null;
    if (!caption) return;
    if (caption.kind === 'victory') {
      // A soft veil keeps the result readable over a map in a single colour.
      const veil = g.createRadialGradient(cx, world.h * .46, 0, cx, world.h * .46, world.h * .62);
      veil.addColorStop(0, 'rgba(4,14,20,.42)'); veil.addColorStop(1, 'rgba(4,14,20,0)');
      g.save(); g.globalAlpha = ease(caption.age / .4); g.fillStyle = veil; g.fillRect(0, 0, world.w, world.h); g.restore();
    }
    if (caption.kind === 'victory') drawCaption(g, caption, cx, world.h * .46, false);
    else drawCaption(g, caption, cx, portrait ? 40 : 109, true);
  };
  EBS.Territory.captionAt = captionAt;
})();
