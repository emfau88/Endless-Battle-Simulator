/* Landschaftsreise: Weltkoordinaten, Ufer, Strecken und feste Orte. */
(function () {
'use strict';
const L = EBS.CloudLandscape = {};
const { clamp, lerp, hashSeed } = EBS.util;
const end = 6800, places = { mill: 180, bridge: 1780, town: 3410, marsh: 5020, port: 6440 };
const smooth = (a, b, x) => { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };
const bell = (center, reach, x) => 1 - smooth(0, reach, Math.abs(x - center));
const stream = (seed, name, ...coords) => new EBS.RNG(hashSeed(seed, name, ...coords));
const roofs = ['#aa5c46', '#b86c4d', '#93765e', '#687875', '#a76452', '#7b8380', '#9d513b'];

class Valley {
  constructor(seed) {
    this.seed = seed;
    const r = stream(seed, 'river');
    this.phase = r.range(0, Math.PI * 2); this.bend = r.range(-0.4, 0.4);
    this.soil = r.int(1, 20000);
    this.houses = []; this.lanes = []; this.groves = [];
    this.settlements();
  }
  river(x) {
    return 32 * Math.sin(x / 266 + this.phase) + 22 * Math.sin(x / 149 + this.bend)
      + 77 * bell(places.town, 490, x) + 44 * Math.sin((x - 4700) / 160) * bell(places.marsh, 620, x);
  }
  width(x) {
    return 16 + 17 * smooth(180, 3300, x) + 4 * Math.sin(x / 112 + this.phase)
      + 148 * smooth(5950, 6720, x) + 85 * smooth(6680, 7050, x);
  }
  bank(x, side) {
    const edge = 2.4 * Math.sin(x / 33 + side * this.phase) + 1.1 * Math.sin(x / 12 + side);
    return this.river(x) + side * (this.width(x) + edge);
  }
  // Ein Nebenarm teilt sich aus dem Hauptstrom und mündet weiter unten wieder ein.
  branch(x, mill) {
    const start = mill ? -170 : 4650, finish = mill ? 405 : 5420;
    const u = clamp((x - start) / (finish - start), 0, 1);
    const bulge = Math.sin(Math.PI * u) ** 2, side = mill ? -1 : 1;
    return { y: this.bank(x, side) + side * (mill ? 44 : 104) * bulge,
      w: (mill ? 6 : 12) * bulge, inside: x > start && x < finish };
  }
  wet(x, y, margin = 0) {
    if (Math.abs(y - this.river(x)) < this.width(x) + margin) return true;
    const b = this.branch(x, x < 1000);
    return b.inside && Math.abs(y - b.y) < b.w + margin;
  }
  rail(x) {
    return this.river(x) + 178 - 352 * smooth(1450, 2110, x)
      - 360 * smooth(3790, 4250, x) + 310 * (1 - smooth(760, 1250, x));
  }
  railAngle(x) { return Math.atan2(this.rail(x + 2) - this.rail(x - 2), 4); }
  lane(x0, x1, fn, size = 6) {
    const pts = [];
    const count = Math.ceil(Math.abs(x1 - x0) / 12);
    for (let i = 0; i <= count; i++) { const x = lerp(x0, x1, i / count); pts.push([x, fn(x)]); }
    this.lanes.push({ pts, size });
  }
  cross(x, y0, y1, size = 5, drift = 0) {
    this.lanes.push({ pts: [[x, y0], [x + drift * 0.4, (y0 + y1) / 2], [x + drift, y1]], size });
  }
  house(x, y, w, h, angle, kind = 'home') {
    const r = stream(this.seed, 'roof', Math.round(x), Math.round(y));
    this.houses.push({ x, y, w, h, angle, kind, color: roofs[r.int(0, roofs.length - 1)],
      garden: r.next(), details: r.int(0, 4) });
  }
  settlements() {
    const { mill, town, marsh, port } = places;
    const r = stream(this.seed, 'settlements');
    const millRoad = x => this.bank(x, -1) - 109 + 9 * Math.sin(x / 54);
    this.lane(mill - 490, mill + 430, millRoad);
    for (let i = -4; i <= 3; i++) {
      const x = mill + i * 47 + r.range(-4, 4);
      this.house(x, millRoad(x) - 17, r.range(15, 23), r.range(10, 15), r.range(-0.13, 0.13));
      if (i !== 0 && i % 2) this.house(x + 7, millRoad(x) + 16, 16, 12, 0.1);
    }
    const millY = this.branch(mill, true).y;
    this.cross(mill - 8, millRoad(mill - 8), millY - 17);
    this.house(mill - 1, millY - 17, 39, 23, 0, 'mill');
    this.groves.push({ x: mill - 115, y: millRoad(mill - 115) - 65, cols: 7, rows: 4 });

    const main = x => this.bank(x, -1) - 86;
    const back = x => main(x) - 43;
    this.lane(town - 530, town + 520, main, 10);
    this.lane(town - 167, town + 176, back, 5);
    this.lane(town - 126, town + 218, x => this.bank(x, -1) - 24, 4);
    for (const dx of [-153, -67, 63, 165]) this.cross(town + dx, back(town + dx), this.bank(town + dx, -1) - 22);
    this.cross(town + 62, main(town + 62), this.bank(town + 62, 1) + 119, 8);
    this.lane(town - 190, town + 312, x => this.bank(x, 1) + 77, 5);
    for (let i = -7; i <= 7; i++) {
      const x = town + i * 28;
      for (const row of [-1, 1]) {
        if (Math.abs(i) < 3 || Math.min(...[-153,-67,63,165].map(dx => Math.abs(x - town - dx))) < 9) continue;
        this.house(x, main(x) + row * 20, r.range(17, 23), r.range(12, 17), Math.atan2(main(x+1)-main(x-1), 2));
      }
      if (i >= -5 && i <= 5 && Math.abs(i) !== 2 && i !== -4) this.house(x + 2, this.bank(x, -1) - 38, r.range(16, 24), 12, -0.07);
      if (i % 2 && i !== 3) this.house(x, this.bank(x, 1) + 57, 21, 14, 0.1);
    }
    this.house(town - 6, main(town) - 43, 42, 17, 0, 'hall');
    this.house(town + 7, this.rail(town + 7) - 22, 38, 13, this.railAngle(town + 7), 'station');
    this.cross(town - 64, this.rail(town - 64) - 22, back(town - 64));
    this.house(marsh - 16, this.branch(marsh, false).y + 22, 22, 12, -0.17, 'boathouse');
    const quay = x => this.bank(x, 1) + 30;
    this.lane(port - 505, port + 430, quay, 7);
    for (let i = -3; i <= 3; i++) {
      const x = port + i * 48;
      this.house(x, quay(x) + 23, r.range(24, 32), r.range(14, 18), Math.atan2(quay(x+1)-quay(x-1),2), i % 2 ? 'store' : 'home');
    }
    // Lose Höfe gliedern die längeren Uferstrecken.
    for (const x of [815, 1210, 2390, 2760, 4020, 4400, 5660, 5940]) {
      const side = r.next() < 0.5 ? -1 : 1, off = r.range(84, 125);
      const path = t => this.bank(t, side) + side * (off + 13 * Math.sin((t - x) / 66));
      this.lane(x - 160, x + 141, path, 3.3);
      this.house(x - 9, path(x) + 14, 27, 16, -0.08, 'barn');
      this.house(x + 17, path(x + 17) - 11, 16, 10, 0.12);
      if (r.next() < 0.72) this.groves.push({ x: x + 49, y: path(x + 49) + 42, cols: 4, rows: 3 });
    }
  }
  camera(p, world, moving = true) {
    const u = clamp(p, 0, 1), ramp = .012;
    const dist = u < ramp ? u*u/(2*ramp) : u > 1-ramp ? 1-ramp-(1-u)**2/(2*ramp) : u-ramp/2;
    const x = moving ? end * dist / (1-ramp) : places.town;
    const portrait = world.h > world.w, pull = portrait ? 1 : 0.88;
    const y = this.river(x) - pull * (61 * bell(places.mill, 420, x) + 82 * bell(places.town, 475, x))
      + pull * (45 * bell(places.marsh, 430, x) + (this.width(x) - 12) * smooth(6020, 6410, x) * (1 - smooth(6480, 7000, x)));
    return { x, y, scale: portrait ? 2.45 : world.w === world.h ? 2.15 : 2.35 };
  }
  train(p) {
    const x = p < 0.36 ? lerp(970, 2680, smooth(0.16, 0.36, p)) :
      p < 0.56 ? lerp(2680, places.town, smooth(0.36, 0.465, p)) :
      lerp(places.town, 4370, smooth(0.56, 0.67, p));
    return { x, y: this.rail(x), angle: this.railAngle(x) };
  }
  ferry(p) {
    const run = smooth(0.925, 1.015, p), x = places.port + 32 + 350 * run;
    const y = this.bank(places.port + 16, 1) - 44 - 88 * run - 20 * run * run;
    const angle = -Math.atan((88 + 40 * run) / 350);
    return { x, y, angle, wake: smooth(0, 0.16, run) };
  }
}
Object.assign(L, { Valley, places, end, smooth, bell, stream });
})();
