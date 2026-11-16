/* Territory Wars · spearmen instead of the source tanks (presentation only).
 *
 * The archived renderer stays byte-identical. This view derives from it and,
 * when `units` is 'soldiers',
 *   - lets the original draw everything except its tanks (it sees garrisons
 *     below the tank threshold and no marching columns), and
 *   - draws small low-poly spearmen with shield and helmet in a second pass
 *     that uses the same shader, light, shadows and depth buffer.
 * Positions follow only from the round state and the picture time: a jump shows
 * the same soldiers as continuous playback. With 'tanks' nothing changes. */
(function (root) {
  'use strict';
  const Base = root.HexView;
  if (!Base || !root.EBS || !EBS.Territory) return;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), mix = (a, b, t) => a + (b - a) * t;
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return x - Math.floor(x); };
  // Linear colours like the source renderer (it applies gamma once in the shader).
  const col = h => [1, 3, 5].map(i => Math.pow(parseInt(h.slice(i, i + 2), 16) / 255, 2.2));
  const mul = (c, v) => c.map(x => x * v);
  const PALETTE = ['#28b3f3', '#ee594d', '#76c954', '#e7bb3c'].map(col);
  const SKIN = col('#e9c8a2'), STEEL = col('#d5dfe0'), BOOT = col('#27353b'), WOOD = col('#7d5f3d'), CLOTH = col('#f4eedd'), SHADE = col('#3f5a5c');
  const NO_MOVES = Object.freeze([]);

  // Ten floats per vertex as in the source: position, normal, colour, emission.
  class Geometry {
    constructor() { this.a = []; }
    quad(a, b, c, d, color, e, n) {
      for (const p of [a, b, c, a, c, d]) this.a.push(p[0], p[1], p[2], n[0], n[1], n[2], color[0], color[1], color[2], e);
    }
    /* Box standing on (x, y, z), turned by rot around the vertical axis, moved by (ox, oz) in its own frame. */
    box(x, y, z, rot, ox, oz, w, h, d, color, e = 0) {
      const co = Math.cos(rot), si = Math.sin(rot), xx = w / 2, zz = d / 2;
      const p = (a, b, c) => [x + (a + ox) * co + (c + oz) * si, y + b, z - (a + ox) * si + (c + oz) * co];
      const a = p(-xx, 0, -zz), b = p(xx, 0, -zz), c = p(xx, 0, zz), dd = p(-xx, 0, zz), A = p(-xx, h, -zz), B = p(xx, h, -zz), C = p(xx, h, zz), D = p(-xx, h, zz);
      this.quad(A, D, C, B, color, e, [0, 1, 0]);
      this.quad(a, A, B, b, color, e, [-si, 0, -co]); this.quad(b, B, C, c, color, e, [co, 0, -si]);
      this.quad(c, C, D, dd, color, e, [si, 0, co]); this.quad(dd, D, A, a, color, e, [-co, 0, si]);
    }
  }

  /* One spearman, about half a field tall. `stride` swings the legs while marching; 0 stands. */
  function spearman(g, x, y, z, rot, color, s, stride) {
    // Dark tunic and a bright shield: readable on a field of the same faction colour.
    const swing = Math.sin(stride) * .035 * s, tunic = mul(color, .42), bright = mul(color, 1.3);
    g.box(x, y - .013, z, rot, 0, 0, .17 * s, .014, .13 * s, SHADE);                            // contact shadow
    g.box(x, y, z, rot, -.036 * s, swing, .046 * s, .15 * s, .055 * s, BOOT);
    g.box(x, y, z, rot, .036 * s, -swing, .046 * s, .15 * s, .055 * s, BOOT);
    g.box(x, y + .15 * s, z, rot, 0, 0, .135 * s, .17 * s, .09 * s, tunic);
    g.box(x, y + .15 * s, z, rot, 0, .047 * s, .05 * s, .17 * s, .012 * s, CLOTH);          // tabard stripe on the chest
    g.box(x, y + .32 * s, z, rot, 0, 0, .09 * s, .085 * s, .09 * s, SKIN);
    g.box(x, y + .39 * s, z, rot, 0, 0, .108 * s, .045 * s, .108 * s, STEEL);
    g.box(x, y + .435 * s, z, rot, 0, 0, .026 * s, .04 * s, .10 * s, bright, .2);            // crest in the faction colour
    g.box(x, y + .16 * s, z, rot, -.088 * s, .02 * s, .028 * s, .16 * s, .125 * s, bright, .28); // shield
    g.box(x, y + .02 * s, z, rot, .09 * s, .03 * s, .018 * s, .58 * s, .018 * s, WOOD);       // spear
    g.box(x, y + .60 * s, z, rot, .09 * s, .03 * s, .034 * s, .075 * s, .034 * s, STEEL, .35);
  }

  class UnitView extends Base {
    constructor(canvas) {
      super(canvas);
      // Without WebGL2 the source returns its canvas fallback; that one keeps the tanks.
      if (this.gl) { this.units = 'tanks'; this.unitBuffer = this.gl.createBuffer(); this.unitCount = 0; this.ghosts = null; }
    }
    _withoutTanks(sim) {
      if (!this.ghosts || this.ghosts.tiles !== sim.tiles) {
        // Live views of the real fields: every value reads through, only the garrison looks empty.
        this.ghosts = { tiles: sim.tiles, list: sim.tiles.map(t => Object.create(t, { units: { value: 0 } })) };
      }
      return { tiles: this.ghosts.list, moves: NO_MOVES, events: sim.events };
    }
    _dynamic(sim, time, opts) {
      if (this.units !== 'soldiers' || !this.unitBuffer) return super._dynamic(sim, time, opts);
      super._dynamic(this._withoutTanks(sim), time, opts);
      const g = new Geometry(), size = 1.55;
      for (const t of sim.tiles) {
        // Guards where the source showed parked tanks: same threshold, same count.
        if (!(t.owner >= 0 && t.units >= 6 && t.terrain !== 'mountain' && t.hq < 0 && t.terrain !== 'outpost' && !t.bunker)) continue;
        const count = Math.min(3, Math.floor(t.units / 8) + 1);
        for (let i = 0; i < count; i++) {
          spearman(g, t.x + (i - (count - 1) / 2) * .33, t.height + .02, t.z + .34, .16 + (hash(t.id * 5 + i) - .5) * .5, PALETTE[t.owner], size * .92, 0);
        }
      }
      for (const move of sim.moves) {
        const a = sim.tiles[move.from], b = sim.tiles[move.to]; if (!a || !b) continue;
        const p = clamp((time - move.start) / move.duration, 0, 1), dx = b.x - a.x, dz = b.z - a.z, ang = Math.atan2(dx, dz);
        const n = Math.min(6, Math.max(1, Math.ceil(move.amount / 6)));
        for (let i = 0; i < n; i++) {
          // Two files, the ranks one behind the other along the march.
          const u = clamp(p - (Math.floor(i / 2) - (Math.ceil(n / 2) - 1) / 2) * .15, 0, 1), lane = (i % 2 ? 1 : -1) * (n > 1 ? .17 : 0);
          const step = time * 9 + i * 1.9 + move.id, moving = u > 0 && u < 1;
          const x = mix(a.x, b.x, u) + Math.cos(ang) * lane, z = mix(a.z, b.z, u) - Math.sin(ang) * lane;
          const y = mix(a.height, b.height, u) + .02 + (moving ? Math.abs(Math.sin(step)) * .03 : 0);
          spearman(g, x, y, z, ang, PALETTE[move.owner], size, moving ? step : 0);
        }
      }
      const gl = this.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.unitBuffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.a), gl.DYNAMIC_DRAW);
      this.unitCount = g.a.length / 10;
    }
    render(sim, time, opts = {}) {
      super.render(sim, time, opts);
      if (this.units !== 'soldiers' || !this.unitBuffer || !this.unitCount || !sim || !sim.tiles) return;
      // Second pass with the program, light and depth buffer the source just used.
      const gl = this.gl;
      gl.disable(gl.BLEND); gl.depthMask(true); gl.uniform1f(this.uniform.uGlow, 0);
      this._bind(this.unitBuffer); gl.drawArrays(gl.TRIANGLES, 0, this.unitCount);
    }
    destroy() { if (this.unitBuffer) this.gl.deleteBuffer(this.unitBuffer); super.destroy(); }
  }
  EBS.Territory.UnitView = UnitView;
})(typeof globalThis !== 'undefined' ? globalThis : this);
