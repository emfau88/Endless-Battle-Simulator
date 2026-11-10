// Minimales Testszenario: zeigt, dass Kern, Renderer-Bühne und Export szenariounabhängig sind.
(function () {
  const { RNG, util } = EBS;
  class DummySim {
    constructor({ seed, params, world }) {
      this.cfg = { seed, ...params }; this.world = world; this.rng = new RNG(seed);
      this.step = 0; this.t = 0; this.x = world.w * this.rng.range(0.3, 0.7); this.v = params.speed;
    }
    stepOnce() {
      this.step++; this.t = this.step * EBS.DT; this.x += this.v * EBS.DT;
      if (this.x < 60 || this.x > this.world.w - 60) this.v = -this.v;
    }
    snapshot() { return { t: this.t, x: this.x, summary: 'Testszenario' }; }
    checkInvariants() { return { ok: this.x > 0 && this.x < this.world.w, errors: [] }; }
    stateHash() { return util.fnv1a(this.step + ':' + this.x.toFixed(4)).toString(16); }
    destroy() {}
  }
  class DummyRenderer {
    constructor({ sim }) { this.sim = sim; this.root = new PIXI.Container(); this.g = new PIXI.Graphics(); this.root.addChild(this.g); }
    draw() {
      const s = this.sim, w = s.world;
      this.g.clear().rect(0, 0, w.w, w.h).fill(0x12345a).circle(s.x, w.h / 2, 60).fill(0xffcc00);
    }
    destroy() { this.root.destroy({ children: true }); }
  }
  EBS.registerScenario({
    id: 'dummy', title: 'Testszenario', defaults: { speed: 300 },
    normalizeParams: (p) => ({ speed: util.clamp(util.num(p.speed, 300), 10, 2000) }),
    create: (c) => new DummySim(c), createRenderer: (c) => new DummyRenderer(c),
  });
})();
