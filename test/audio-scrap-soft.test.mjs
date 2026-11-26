// Scrap Wars · Ton „soft-v1“ (R40, T2): Schalter, gebackene Klänge, Mischplan und Pegel.
// Der bisherige Ton (classic) prüft test/audio-materials.test.mjs; die Klangdateien baut scripts/build-scrap-audio.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { loadSamples, renderTrack, SAMPLE_RATE, AUDIO_DIR } from '../lib/audio.mjs';
import { mixBackgroundTrack } from '../lib/audio-background.mjs';
import { run, ffmpegBin } from '../lib/exporter.mjs';

const context = vm.createContext({}); context.window = context;
for (const file of ['core.js', 'canvas-scene.js', ...['simulation', 'renderer', 'rules', 'materials', 'tactics', 'daylight-art', 'material-art', 'episode']
  .map(f => `scenarios/scrap/${f}.js`), 'scenarios/scrap.js', 'production-presets.js']) {
  vm.runInContext(readFileSync(new URL('../src/' + file, import.meta.url), 'utf8'), context, { filename: file });
}
const { EBS } = context, sc = EBS.getScenario('scrap'), plain = v => JSON.parse(JSON.stringify(v));
const manifest = JSON.parse(readFileSync(join(AUDIO_DIR, 'SCRAP_AUDIO.json'), 'utf8'));
const sha = file => createHash('sha256').update(readFileSync(join(AUDIO_DIR, file))).digest('hex');
const config = (params = {}, video = {}) => EBS.normalizeConfig({ scenario: 'scrap', params: { arena: 'sunshine', rulesVersion: 'v4', ...params }, video });
const soft = config({ soundMix: 'soft-v1' }), classic = config();
const run40 = (seed, world, sec = 40) => {
  const sim = new EBS.Scrap.Episode({ seed, params: soft.params, world, view: { camera: false } });
  while (sim.step < sec * 60) sim.stepOnce();
  return plain(sim.events);
};
const QUER = { w: 1920, h: 1080 }, HOCH = { w: 1080, h: 1920 };

test('Scrap-Ton soft-v1: Schalter, Klangtabelle und gebackene Dateien', () => {
  // Fehlt der Schalter, bleibt alles beim bisherigen Ton.
  assert.equal(EBS.normalizeConfig({ scenario: 'scrap' }).params.soundMix, 'classic');
  assert.equal(config({ soundMix: 'unbekannt' }).params.soundMix, 'classic');
  assert.equal(sc.audioForParams(classic.params), sc.audio); assert.equal(sc.audio.mixProfile, undefined);
  assert.equal(sc.createAudioMixPlan([{ seq: 0, step: 1, type: 'ko', x: 1 }], { cfg: classic, world: QUER }), null);
  const audio = sc.audioForParams(soft.params);
  assert.equal(audio.mixProfile, 'marbleworks-soft-v1'); assert.equal(audio.ceilingDb, -6); assert.equal(audio.fixedGainDb, 4.5);
  // Gleiche Regler wie bisher, gleiche deutsche Beschriftungen, dazu der Wind.
  assert.deepEqual(Object.keys(audio.events), Object.keys(sc.audio.events));
  for (const [key, def] of Object.entries(audio.events)) assert.equal(def.label, sc.audio.events[key].label, key);
  assert.deepEqual(Object.keys(soft.video.volume), ['master', ...Object.keys(audio.events), 'wind']);
  assert.equal(audio.background.label, 'Wind');
  // Jede Datei ist die gebackene, im Manifest verzeichnete Fassung.
  const names = new Set(Object.values(audio.events).flatMap(e => [e, ...Object.values(e.variants || {})]).flatMap(v => v.samples || []));
  assert.equal(names.size, manifest.samples.length);
  for (const name of names) {
    const entry = manifest.samples.find(s => s.name === name);
    assert.ok(entry, name); assert.equal(sha(name + '.ogg'), entry.oggSha256, name);
  }
  const wind = manifest.wind, bed = audio.background;
  assert.equal(bed.file, wind.file); assert.equal(sha(wind.file), wind.oggSha256);
  assert.deepEqual([bed.gainDb, bed.loopStartSec, bed.loopEndSec], [wind.gainDb, wind.loopStartSec, wind.loopEndSec]);
  for (const s of manifest.sourceFiles) assert.equal(sha(s.file), s.sha256, s.file);
  // Die Simulation sieht den Schalter nicht: gleicher Zustand mit und ohne soft-v1.
  const a = new EBS.Scrap.Episode({ seed: 7, params: soft.params, world: QUER }), b = new EBS.Scrap.Episode({ seed: 7, params: classic.params, world: QUER });
  for (let i = 0; i < 600; i++) { a.stepOnce(); b.stepOnce(); }
  assert.equal('soundMix' in a.cfg, false); assert.equal(a.stateHash(), b.stateHash());
  // Die Vorlagen nutzen den neuen Ton.
  for (const kind of ['short', 'long']) {
    assert.equal(EBS.productionPreset('scrap', kind).params.soundMix, 'soft-v1');
    assert.equal(JSON.parse(readFileSync(new URL(`../presets/production/scrap-${kind}.json`, import.meta.url), 'utf8')).params.soundMix, 'soft-v1');
  }
});

test('Scrap-Ton soft-v1: Rangfolge, Dichte, Ducking, Stereo und Stummschalten (feste Erwartungen)', () => {
  const ev = [
    { seq: 0, step: 100, type: 'cover_hit', x: 0, p: 5, material: 'wood' }, { seq: 1, step: 100, type: 'blaster', x: 960, team: 0 },
    { seq: 2, step: 100, type: 'hit', p: 6, team: 1 }, { seq: 3, step: 100, type: 'pickup', x: 1920, team: 2 },
    { seq: 4, step: 100, type: 'ko', x: 960, team: 1 }, { seq: 5, step: 140, type: 'blaster', x: 960, team: 0 },
    { seq: 6, step: 150, type: 'blaster', x: 960, team: 0 }, { seq: 7, step: 151, type: 'blaster', x: 960, team: 1 },
    { seq: 8, step: 152, type: 'blaster', x: 960, team: 2 }, { seq: 9, step: 153, type: 'round_end', x: 960 },
  ];
  const plan = sc.createAudioMixPlan(ev, { cfg: soft, world: QUER });
  assert.equal(plan.version, 1); assert.equal(plan.profile, 'marbleworks-soft-v1');
  assert.deepEqual(plan.events.map(d => d.seq), ev.map(e => e.seq));
  // K.o. immer hörbar; Treffer vor Blaster; dann ist die halbe Sekunde voll. Nach dem K.o. 0,3 s lang halbe Lautstärke.
  assert.deepEqual(plan.events.map(d => d.gain), [0, .5, .5, 0, 1, 1, 0, 1, 0, 0]);
  assert.deepEqual(plan.events.slice(0, 4).map(d => d.pan), [-.35, 0, 0, .35], 'Stereo ±0,35, ohne Position mittig');
  assert.deepEqual(plain(plan.stats), { total: 10, audible: 5, unmapped: 1, muted: 0, densitySuppressed: 3, blasterSuppressed: 1, ducked: 2 });
  const muted = sc.createAudioMixPlan(ev, { cfg: config({ soundMix: 'soft-v1' }, { volume: { blaster: 0 } }), world: QUER });
  assert.ok(muted.events.every((d, i) => ev[i].type !== 'blaster' || d.gain === 0)); assert.equal(muted.stats.muted, 5);
  assert.equal(muted.events[3].gain, 0, 'Waffenaufnahme bleibt hinter dem Treffer');
  assert.ok(sc.createAudioMixPlan(ev, { cfg: config({ soundMix: 'soft-v1' }, { volume: { master: 0 } }), world: QUER }).events.every(d => d.gain === 0));
  assert.throws(() => sc.createAudioMixPlan([ev[0], ev[0]], { cfg: soft, world: QUER }), /ungültiges Tonereignis/);
});

test('Scrap-Ton soft-v1: echte Runden in beiden Formaten halten die Regeln ein', () => {
  for (const [world, seed] of [[QUER, 7], [QUER, 13], [HOCH, 7], [HOCH, 42]]) {
    const events = run40(seed, world), plan = sc.createAudioMixPlan(events, { cfg: soft, world }), tag = `${world.w}x${world.h} Seed ${seed}`;
    assert.deepEqual(plain(sc.createAudioMixPlan(events, { cfg: soft, world })), plain(plan), 'reproduzierbar');
    const audible = events.map((e, i) => ({ ...e, gain: plan.events[i].gain, pan: plan.events[i].pan })).filter(e => e.gain > 0);
    assert.ok(plan.events.every(d => d.gain >= 0 && d.gain <= 1 && Math.abs(d.pan) <= .35));
    for (const type of ['ko', 'blast']) assert.equal(audible.filter(e => e.type === type).length, events.filter(e => e.type === type).length, `${tag}: ${type}`);
    const major = new Set(['ko', 'blast']), ordinary = audible.filter(e => !major.has(e.type)).map(e => e.step);
    for (let i = 2; i < ordinary.length; i++) assert.ok(ordinary[i] - ordinary[i - 2] >= 30, `${tag}: Dichte bei Schritt ${ordinary[i]}`);
    const blasters = audible.filter(e => e.type === 'blaster');
    for (let i = 3; i < blasters.length; i++) assert.ok(blasters[i].step - blasters[i - 3].step >= 60, `${tag}: Blaster je Sekunde`);
    for (const team of [0, 1, 2, 3]) {
      const own = blasters.filter(e => e.team === team);
      for (let i = 1; i < own.length; i++) assert.ok(own[i].step - own[i - 1].step >= 14, `${tag}: Blasterabstand Team ${team}`);
    }
    const loud = audible.filter(e => major.has(e.type)).map(e => e.step);
    for (const e of audible) if (['blaster', 'hit', 'cover_hit'].includes(e.type) && loud.some(s => e.step >= s && e.step < s + 18)) assert.ok(e.gain <= .5, `${tag}: Ducking`);
    const perSecond = audible.length / 40;
    assert.ok(perSecond > 1.5 && perSecond < 3.6, `${tag}: ${perSecond.toFixed(2)} Klänge je Sekunde`);
  }
});

test('Scrap-Ton soft-v1: fester Pegel, Spitzen unter −6 dBFS, Wind bei −48 LUFS', async () => {
  const audio = plain(sc.audioForParams(soft.params)), samples = await loadSamples(audio), dir = mkdtempSync(join(tmpdir(), 'scrap-soft-'));
  const measure = async file => {
    const r = await run(ffmpegBin(), ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
    const s = r.stderr.split('Summary:').pop();
    return { lufs: Number(s.match(/I:\s+(-?[\d.]+) LUFS/)[1]), peak: Number(s.match(/Peak:\s+(-?[\d.]+) dBFS/)[1]) };
  };
  try {
    const events = run40(42, HOCH, 30), plan = sc.createAudioMixPlan(events, { cfg: soft, world: HOCH }), total = 30 * SAMPLE_RATE;
    const actions = join(dir, 'actions.wav'), mixed = join(dir, 'mixed.wav'), quiet = join(dir, 'quiet.wav'), bed = join(dir, 'bed.wav');
    const mix = renderTrack(events, audio, samples, { worldW: HOCH.w, mixPlan: plan, totalSamples: total, file: actions });
    assert.equal(mix.normalization, 'fixed'); assert.equal(mix.normGainDb, 4.5); assert.ok(mix.peakOutDb <= -6 + .01, JSON.stringify(mix));
    await mixBackgroundTrack(audio, { input: actions, output: mixed, totalSamples: total });
    const m = await measure(mixed);
    assert.ok(m.lufs >= -25.5 && m.lufs <= -21, `Lautheit ${m.lufs} LUFS`); assert.ok(m.peak <= -5.5, `Spitze ${m.peak} dBFS`);
    // Wind allein: Aktionen stumm, Grundgeräusch auf seinem Zielpegel.
    renderTrack(events, audio, samples, { worldW: HOCH.w, mixPlan: { ...plan, events: plan.events.map(d => ({ ...d, gain: 0 })) }, totalSamples: total, file: quiet });
    await mixBackgroundTrack(audio, { input: quiet, output: bed, totalSamples: total });
    const w = await measure(bed);
    assert.ok(Math.abs(w.lufs + 48) <= 1, `Wind ${w.lufs} LUFS`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
