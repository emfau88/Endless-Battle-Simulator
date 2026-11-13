// Endless Mycelium: Simulation ohne Browser (vm) – Regler, Determinismus, Kreislauf, Langlauf, Videostandards, Klänge.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import { AUDIO_DIR, synthSample } from '../lib/audio.mjs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const context = vm.createContext({}); context.window = context;
for (const path of ['core.js', 'canvas-scene.js', 'scenarios/mycelium/simulation.js', 'scenarios/mycelium.js']) {
  vm.runInContext(read('src/' + path), context, { filename: path });
}
const { EBS } = context;
const PORTRAIT = { w: 1080, h: 1920 }, LANDSCAPE = { w: 1920, h: 1080 };
const make = (o = {}) => new EBS.Mycelium.Simulation({ seed: 42, params: {}, world: PORTRAIT, timeScale: 1, ...o });
const advance = (s, seconds) => { for (let i = 0; i < Math.round(seconds * 60); i++) s.stepOnce(); };
const plain = (o) => JSON.parse(JSON.stringify(o));

test('Myzel: Regler werden begrenzt, Textwerte und Schalter bleiben erhalten', () => {
  const n = EBS.Mycelium.normalizeParams;
  const d = n({});
  assert.deepEqual(plain(d), { cycleSec: 24, spread: 1, branching: 1, colonies: 2, startLeaves: 8, leafFall: 5, digest: 1,
    mushrooms: 4, spores: 110, wind: 1, palette: 'cycle', glow: 1, pulses: true });
  const lo = n({ cycleSec: 1, spread: 0, branching: 0, colonies: 0, startLeaves: -3, leafFall: -1, digest: 0, mushrooms: 0, spores: -5, wind: -1, glow: 0 });
  assert.deepEqual([lo.cycleSec, lo.spread, lo.branching, lo.colonies, lo.startLeaves, lo.leafFall, lo.digest, lo.mushrooms, lo.spores, lo.wind, lo.glow],
    [12, 0.4, 0.5, 1, 0, 0, 0.4, 1, 0, 0, 0.3]);
  const hi = n({ cycleSec: 999, spread: 9, colonies: 9, startLeaves: 99, leafFall: 99, mushrooms: 99, spores: 999, wind: 9, glow: 9 });
  assert.deepEqual([hi.cycleSec, hi.spread, hi.colonies, hi.startLeaves, hi.leafFall, hi.mushrooms, hi.spores, hi.wind, hi.glow], [180, 1.6, 3, 16, 10, 6, 250, 2.5, 1.8]);
  assert.equal(n({ palette: 'warm' }).palette, 'warm');
  assert.equal(n({ palette: 'gibtsnicht' }).palette, 'cycle');
  assert.equal(n({ pulses: 'false' }).pulses, false);
  assert.equal(n({ cycleSec: '45', spread: '1.25' }).cycleSec, 45, 'Werte aus dem Teilen-Link sind Text');
  // Konfiguration: Parameternamen kollidieren nicht mit Video-/Ansichtsschlüsseln des Teilen-Links
  const reserved = ['aspect', 'resolution', 'fps', 'durationSec', 'tempo', 'audio', 'crf', 'preset', 'bitrate', 'hud', 'camera', 'version', 'name', 'description', 'scenario', 'seed', 'format'];
  for (const k of Object.keys(d)) assert.ok(!reserved.includes(k) && !k.startsWith('vol.'), k);
  const cfg = EBS.normalizeConfig({ scenario: 'mycelium', palette: 'cool', cycleSec: 60, 'vol.leaf_eaten': 150 });
  assert.equal(cfg.params.palette, 'cool'); assert.equal(cfg.params.cycleSec, 60); assert.equal(cfg.video.volume.leaf_eaten, 150);
});

test('Myzel: YouTube-Standard (1440p, 60 fps, CRF 16) nur für dieses Szenario und nur ohne eigene Angabe', () => {
  const m = EBS.normalizeConfig({ scenario: 'mycelium' });
  assert.deepEqual([m.video.resolution, m.video.fps, m.video.quality.crf, m.video.quality.preset], [1440, 60, 16, 'medium']);
  const own = EBS.normalizeConfig({ scenario: 'mycelium', video: { resolution: 1080, fps: 30, quality: { crf: 22, preset: 'fast' } } });
  assert.deepEqual([own.video.resolution, own.video.fps, own.video.quality.crf, own.video.quality.preset], [1080, 30, 22, 'fast']);
  for (const aspect of ['9:16', '16:9']) assert.equal(EBS.normalizeConfig({ scenario: 'mycelium', video: { aspect } }).video.aspect, aspect);
  // andere Szenarien behalten die allgemeinen Standards (hier: nur Myzel geladen, Standard-Szenario ist das erste registrierte)
  const other = EBS.normalizeConfig({});
  assert.equal(other.scenario, 'mycelium');
  const sc = EBS.getScenario('mycelium'), saved = sc.videoDefaults;
  try { sc.videoDefaults = undefined; const plainCfg = EBS.normalizeConfig({ scenario: 'mycelium' });
    assert.deepEqual([plainCfg.video.resolution, plainCfg.video.fps, plainCfg.video.quality.crf], [1080, 30, 20]); }
  finally { sc.videoDefaults = saved; }
});

test('Myzel: gleicher Seed ergibt denselben Ablauf, Darstellungsregler verändern ihn nicht', () => {
  const a = make(), b = make({ params: { palette: 'warm', glow: 1.6, pulses: false } }), c = make({ seed: 7 });
  advance(a, 70); advance(b, 70); advance(c, 70);
  assert.equal(a.stateHash(), b.stateHash());
  assert.notEqual(a.stateHash(), c.stateHash());
  b.setParam('glow', 0.5); b.setParam('palette', 'mint'); b.setParam('cycleSec', 99);   // Ablaufregler nur per Neustart
  assert.equal(b.cfg.glow, 0.5); assert.equal(b.cfg.palette, 'mint'); assert.equal(b.cfg.cycleSec, 24);
  assert.equal(a.stateHash(), b.stateHash());
  assert.deepEqual(plain(a.events), plain(b.events));
});

test('Myzel: Kreislauf läuft endlos – Generationen folgen aufeinander, Puffer bleiben begrenzt (10 Minuten)', () => {
  for (const world of [PORTRAIT, LANDSCAPE]) {
    const s = make({ world });
    let maxNS = 0;
    for (let k = 1; k <= 10; k++) {
      advance(s, 60);
      const chk = s.checkInvariants();
      assert.ok(chk.ok, `${world.w}x${world.h} nach ${k} min: ${chk.errors.join('; ')}`);
      maxNS = Math.max(maxNS, s.NS);
    }
    const snap = s.snapshot(), C = s.timing.C;
    // erste Spore landet nach 2,2 s, danach alle C Sekunden eine neue Generation
    assert.equal(snap.generation, Math.floor((600 - 2.2) / C) + 1, 'Generationen');
    assert.ok(snap.leavesEaten >= 3 * snap.generation, `zu wenig gefressen: ${snap.leavesEaten}`);
    assert.ok(snap.compactions >= snap.generation - 3, 'alte Generationen werden entfernt');
    assert.ok(maxNS < 120000, `Segmentpuffer wächst: ${maxNS}`);
    assert.ok(s.leaves.length <= 40 && s.gens.length <= 6 && s.spores.length <= 3000);
    const types = new Set(s.events.map((e) => e.type));
    for (const t of ['spore_land', 'leaf_land', 'leaf_eaten', 'mushroom', 'spore_burst', 'ambience']) assert.ok(types.has(t), t);
    for (let i = 1; i < s.events.length; i++) {
      assert.equal(s.events[i].seq, s.events[i - 1].seq + 1);
      assert.ok(s.events[i].step >= s.events[i - 1].step);
    }
    // Ton der Melodie läuft über die Tonleiter (0–5); Pilze je Generation höchstens wie eingestellt
    assert.ok(s.events.filter((e) => e.type === 'leaf_eaten').every((e) => e.c >= 0 && e.c < 6));
    const pops = {};
    for (const g of s.gens) pops[g.id] = g.mushrooms.length;
    assert.ok(Object.values(pops).every((n) => n <= s.cfg.mushrooms));
  }
});

test('Myzel: Extremwerte aller Ablaufregler laufen stabil', () => {
  const cases = [
    { cycleSec: 12, spread: 1.6, branching: 1.6, colonies: 3, leafFall: 10, startLeaves: 16, digest: 2.5, mushrooms: 6, spores: 250, wind: 2.5 },
    { cycleSec: 12, spread: 0.4, branching: 0.5, colonies: 1, leafFall: 0, startLeaves: 0, digest: 0.4, mushrooms: 1, spores: 0, wind: 0 },
    { cycleSec: 180, spread: 1, colonies: 2 },
  ];
  for (const params of cases) for (const world of [PORTRAIT, LANDSCAPE, { w: 1080, h: 1080 }]) {
    const s = make({ params, world }), seconds = params.cycleSec === 180 ? 400 : 75;
    for (let k = 0; k < seconds / 25; k++) {
      advance(s, 25);
      const chk = s.checkInvariants();
      assert.ok(chk.ok, `${JSON.stringify(params)} ${world.w}x${world.h}: ${chk.errors.join('; ')}`);
    }
    assert.ok(s.snapshot().generation >= 2, `${JSON.stringify(params)}: keine zweite Generation`);
  }
});

test('Myzel: Zeitlupe dehnt den Ablauf, ohne ihn zu verändern', () => {
  const a = make(), b = make({ timeScale: 0.8 });
  advance(a, 60); advance(b, 75);
  const sa = a.snapshot(), sb = b.snapshot();
  assert.ok(Math.abs(sa.t - sb.t) < 1e-9);
  assert.deepEqual([sb.generation, sb.phase], [sa.generation, sa.phase]);
  assert.ok(Math.abs(sb.leavesEaten - sa.leavesEaten) <= 1);
});

test('Myzel: Klangtabelle – alle Klänge vorhanden, erzeugte Klänge deterministisch und ohne Übersteuerung', () => {
  const events = EBS.getScenario('mycelium').audio.events;
  assert.deepEqual(Object.keys(events), ['spore_land', 'leaf_land', 'leaf_eaten', 'mushroom', 'spore_burst', 'ambience']);
  for (const [key, def] of Object.entries(events)) {
    assert.ok(def.label && def.gain > 0, key);
    for (const name of def.samples) {
      if (!name.startsWith('synth:')) { assert.ok(existsSync(`${AUDIO_DIR}/${name}.ogg`), name); continue; }
      const a = synthSample(name), b = synthSample(name);
      assert.ok(a.length > 1000 && a.every(Number.isFinite), name);
      assert.deepEqual(a, b, `${name} nicht deterministisch`);
      let peak = 0, sum = 0; for (const v of a) { peak = Math.max(peak, Math.abs(v)); sum += v * v; }
      assert.ok(peak > 0.05 && peak <= 1, `${name}: Spitze ${peak}`);
      assert.ok(Math.sqrt(sum / a.length) > 0.005, `${name} zu leise`);
    }
  }
  // Nachtluft: 12 s mit weicher Ein-/Ausblendung, damit die Auslösung alle 10 s nahtlos überblendet
  const night = synthSample('synth:myco-night');
  assert.equal(night.length, 12 * 48000);
  assert.ok(Math.abs(night[0]) < 1e-3 && Math.abs(night.at(-1)) < 1e-3);
  const s = make(); advance(s, 25);
  assert.deepEqual(plain(s.events.filter((e) => e.type === 'ambience').map((e) => e.step)), [1, 601, 1201]);
});
