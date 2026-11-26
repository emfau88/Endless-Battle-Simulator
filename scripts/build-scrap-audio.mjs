// Scrap Wars, Ton „soft-v1“ (R40, T2): backt die vom Nutzer gewählte Hörprobe B2 „sauber“ einmal zu fertigen OGG-Dateien.
// Quellen: Kenney Sci-Fi Sounds und Impact Sounds (CC0) unter assets/audio/scrap-source/, dazu eigene Synthese ohne Zufall.
// Der Export lädt nur die fertigen Dateien; dieses Skript braucht nur Node und FFmpeg.
//   node scripts/build-scrap-audio.mjs            baut die Dateien und SCRAP_AUDIO.json neu
//   node scripts/build-scrap-audio.mjs --check    baut im Speicher nach und vergleicht mit SCRAP_AUDIO.json
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { decodeSample, SAMPLE_RATE } from '../lib/audio.mjs';

const DIR = new URL('../assets/audio/', import.meta.url), SOURCES = new URL('scrap-source/', DIR);
const check = process.argv.includes('--check'), ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const path = url => fileURLToPath(url);

// ---------- Bausteine (unverändert aus der Hörprobe B2) ----------
const cache = new Map(), used = new Set();
async function src(name) {
  used.add(name);
  if (!cache.has(name)) cache.set(name, await decodeSample(path(new URL(name + '.ogg', SOURCES)), ffmpeg));
  return cache.get(name);
}
function rng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2147483648 - 1; }; }
const peakOf = x => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
function normalize(x, peak = 0.9) { const p = peakOf(x) || 1, out = new Float32Array(x.length); for (let i = 0; i < x.length; i++) out[i] = x[i] / p * peak; return out; }
function pitch(x, semis) {
  if (!semis) return x; const r = 2 ** (semis / 12), n = Math.floor((x.length - 1) / r), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const p = i * r, k = p | 0; out[i] = x[k] + (x[k + 1] - x[k]) * (p - k); } return out;
}
function lowpass(x, cutoffHz, passes = 2) {
  const a = 1 - Math.exp(-2 * Math.PI * cutoffHz / SAMPLE_RATE); const out = Float32Array.from(x);
  for (let p = 0; p < passes; p++) { let y = 0; for (let i = 0; i < out.length; i++) { y += a * (out[i] - y); out[i] = y; } } return out;
}
function trim(x, sec, fadeSec = 0.08) {
  const n = Math.min(x.length, Math.round(sec * SAMPLE_RATE)), f = Math.round(fadeSec * SAMPLE_RATE), out = x.slice(0, n);
  for (let i = 0; i < f && i < n; i++) out[n - 1 - i] *= i / f; return out;
}
function layer(parts) { // [{ x, gain, at (s) }]
  const n = Math.max(...parts.map(p => Math.round((p.at || 0) * SAMPLE_RATE) + p.x.length)), out = new Float32Array(n);
  for (const p of parts) { const o = Math.round((p.at || 0) * SAMPLE_RATE); for (let i = 0; i < p.x.length; i++) out[o + i] += p.x[i] * p.gain; }
  return normalize(out);
}
function latch(seed = 9) { // mechanisches Einrasten: zwei weiche Klicks
  const n = Math.round(.16 * SAMPLE_RATE), out = new Float32Array(n), nz = rng(seed);
  for (const [at, f, g] of [[0, 900, 1], [.07, 620, .8]]) {
    const o = Math.round(at * SAMPLE_RATE); let lp = 0;
    for (let i = 0; o + i < n; i++) { const t = i / SAMPLE_RATE; lp += .3 * (nz() - lp); out[o + i] += g * (Math.sin(2 * Math.PI * f * t) * .5 + lp) * Math.exp(-t / .012); }
  }
  return normalize(lowpass(out, 2500, 1));
}
function powerDown(sec = 0.45, from = 220, to = 70, seed = 7) { // „Strom aus“: Ton fällt eine gute Oktave
  const n = Math.round(sec * SAMPLE_RATE), out = new Float32Array(n), nz = rng(seed); let ph = 0, lp = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n; ph += 2 * Math.PI * (from * (to / from) ** u) / SAMPLE_RATE; lp += .05 * (nz() - lp);
    out[i] = (0.6 * Math.sin(ph) + 0.25 * Math.sin(2 * ph) + 0.3 * lp) * Math.min(1, i / 240) * (1 - u) ** 1.5;
  }
  return normalize(out);
}
function windBed(sec, seed = 21) { // Sunny Yard: leiser Wind, langsam wandernd
  const n = Math.round(sec * SAMPLE_RATE), out = new Float32Array(n), nz = rng(seed); let lp = 0, lp2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE; const c = .018 + .012 * Math.sin(t * .7) * Math.sin(t * .23 + 1);
    lp += c * (nz() - lp); lp2 += .004 * (lp - lp2); out[i] = (lp - lp2) * (0.75 + 0.25 * Math.sin(t * .41));
  }
  return normalize(out, 0.5);
}
const sec2n = s => Math.round(s * SAMPLE_RATE), att = (t, a) => Math.min(1, t / a);
function osc(sec, freq, env, harm = [1]) { // Oszillator mit Tonhöhen- und Lautstärkeverlauf
  const n = sec2n(sec), out = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE; ph += 2 * Math.PI * freq(t) / SAMPLE_RATE; let s = 0;
    for (let h = 0; h < harm.length; h++) s += harm[h] * Math.sin((h + 1) * ph); out[i] = s * env(t);
  }
  return normalize(out);
}
function noise(sec, cutoff, env, seed, hp = 60) { // Rauschen, zweipolig tiefpassgefiltert mit wanderndem Grenzwert
  const n = sec2n(sec), out = new Float32Array(n), nz = rng(seed), ah = 1 - Math.exp(-2 * Math.PI * hp / SAMPLE_RATE); let lp = 0, lp2 = 0, lo = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE, a = 1 - Math.exp(-2 * Math.PI * cutoff(t) / SAMPLE_RATE);
    lp += a * (nz() - lp); lp2 += a * (lp - lp2); lo += ah * (lp2 - lo); out[i] = (lp2 - lo) * env(t);
  }
  return normalize(out);
}
function rmsMax(x, win = .05) { // lautestes 50-ms-Fenster, Bass unter ~150 Hz abgeschwächt (grobe Gehörkurve)
  const w = sec2n(win), a = 1 - Math.exp(-2 * Math.PI * 150 / SAMPLE_RATE); let lo = 0, acc = 0, best = 0; const y = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) { lo += a * (x[i] - lo); y[i] = x[i] - lo; acc += y[i] * y[i]; if (i >= w) acc -= y[i - w] * y[i - w]; best = Math.max(best, acc / Math.min(w, i + 1)); }
  return Math.sqrt(best);
}
function level(x) { const k = 1 / (rmsMax(x) || 1), out = new Float32Array(x.length); for (let i = 0; i < x.length; i++) out[i] = x[i] * k; return out; }
function bonk(f0 = 380, seed = 51, sec = .16) { // runder Ton, Tonhöhe fällt schnell, weicher Anschlag
  return lowpass(layer([{ x: osc(sec, t => f0 * (.55 + .45 * Math.exp(-t / .025)), t => att(t, .0015) * Math.exp(-t / .05), [1, .3, .12]), gain: 1 },
    { x: noise(.02, () => 2500, t => Math.exp(-t / .004), seed), gain: .35 }]), 3200, 1);
}
function fwip(seed = 81, sec = .2) { // Rakete: kurzes Fauchen nach oben
  return noise(sec, t => 300 + 1900 * t / sec, t => Math.sin(Math.PI * t / sec) ** 2, seed);
}
function crumble(seed = 91, sec = .35) { // Bröseln: ein paar tiefe Mini-Bonks + dunkles Rieseln
  const r = rng(seed), parts = [{ x: noise(sec, () => 600, t => att(t, .005) * Math.exp(-t / .1), seed), gain: .5 }];
  for (let k = 0; k < 4; k++) parts.push({ x: bonk(180 + 90 * (r() + 1) / 2, seed + k, .09), gain: .5 + .25 * r(), at: k * .055 + .02 * (r() + 1) });
  return layer(parts);
}

// ---------- B2 „sauber“ mit Kistenklängen (Stand der angenommenen v4-Testclips) ----------
// Jeder Klang wird lautheitsgleich gemacht (level); die Pegel stehen als Dezibel-Stufen in der Klangtabelle von scrap.js.
async function b2() {
  const S = new Map(), put = (k, x) => S.set(k, level(x));
  put('blaster-0', trim(lowpass(pitch(await src('laserSmall_000'), -3), 2400, 1), .18, .06));
  put('blaster-1', trim(lowpass(pitch(await src('laserSmall_004'), -1), 2400, 1), .2, .07));
  put('blaster-2', trim(lowpass(pitch(await src('laserSmall_003'), -5), 2000, 1), .2, .07));
  put('rocket-0', trim(await src('forceField_001'), .45, .15));
  put('rocket-1', layer([{ x: fwip(82, .22), gain: 1 }, { x: trim(await src('forceField_003'), .35, .15), gain: .45, at: .03 }]));
  put('blast-0', layer([{ x: trim(await src('lowFrequency_explosion_001'), .6, .25), gain: 1 }, { x: lowpass(trim(await src('explosionCrunch_000'), .35, .15), 3500, 1), gain: .45 }]));
  put('blast-1', layer([{ x: trim(pitch(await src('lowFrequency_explosion_001'), -2), .6, .25), gain: 1 }, { x: lowpass(trim(await src('explosionCrunch_003'), .35, .15), 3500, 1), gain: .4 }]));
  put('hit-0', trim(await src('impactMetal_001'), .3, .1));
  put('hit-1', trim(await src('impactMetal_002'), .25, .08));
  put('hit-2', trim(pitch(await src('impactMetal_001'), -2), .3, .1));
  put('wood', trim(pitch(await src('impactWood_heavy_000'), -1), .2, .06));
  put('stone', trim(lowpass(pitch(await src('impactMetal_004'), -1), 2500, 1), .22, .08));
  put('concrete', trim(lowpass(pitch(await src('impactMetal_000'), -3), 2000, 1), .25, .08));
  put('break-wood', pitch(await src('impactWood_heavy_002'), -2));
  put('break-stone', lowpass(trim(await src('explosionCrunch_002'), .35, .15), 3000, 1));
  put('break-concrete', lowpass(trim(pitch(await src('explosionCrunch_002'), -3), .35, .15), 2600, 1));
  put('ko', layer([{ x: trim(await src('lowFrequency_explosion_000'), .8, .35), gain: 1 }, { x: await src('impactMetal_001'), gain: .6 },
    { x: powerDown(.5, 260, 70, 8), gain: .5, at: .06 }]));
  put('pickup', latch(9));
  put('drop', trim(lowpass(pitch(await src('impactMetal_004'), -3), 2200, 1), .2, .06));
  put('crate-land', trim(lowpass(pitch(await src('impactWood_heavy_000'), -5), 1800, 1), .35, .12));
  put('crate-break', layer([{ x: lowpass(pitch(await src('impactWood_medium_001'), -2), 2600, 1), gain: 1 }, { x: crumble(94), gain: .35, at: .02 }]));
  return S;
}

// Wind als nahtlose Schleife: 1 s Vorlauf, danach 30 s, deren Ende mit 4 s Überblendung in den Anfang übergeht.
const WIND = { introSec: 1, periodSec: 30, crossfadeSec: 4 };
function windLoop() {
  const intro = sec2n(WIND.introSec), period = sec2n(WIND.periodSec), fade = sec2n(WIND.crossfadeSec);
  const x = windBed(WIND.introSec + WIND.periodSec + WIND.crossfadeSec), out = x.slice(0, intro + period);
  // Gleiche Leistung für unkorreliertes Rauschen: sin/cos-Überblendung des Überhangs in den Schleifenanfang.
  for (let i = 0; i < fade; i++) { const u = (i + .5) / fade; out[intro + i] = x[intro + i] * Math.sin(u * Math.PI / 2) + x[intro + period + i] * Math.cos(u * Math.PI / 2); }
  return out;
}

// ---------- Schreiben und Prüfen ----------
function ff(args, input) {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-nostdin', ...args], { input, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(r.error?.message || r.stderr.toString());
  return r;
}
function pcm(x, channels = 1) {
  const out = Buffer.alloc(x.length * 4 * channels);
  for (let i = 0; i < x.length; i++) for (let c = 0; c < channels; c++) out.writeFloatLE(x[i], (i * channels + c) * 4);
  return out;
}
// Stereo für den Wind: FFmpeg mischt eine Mono-Schleife sonst samt Aktionen zu Mono. Der Wind ist dunkel und leise, Qualität 2 genügt.
function encode(x, file, index, channels = 1, quality = 7) {
  ff(['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SAMPLE_RATE), '-ac', String(channels), '-i', '-',
    '-c:a', 'libvorbis', '-q:a', String(quality), '-fflags', '+bitexact', '-flags:a', '+bitexact',
    '-serial_offset', String(index), '-map_metadata', '-1', '-f', 'ogg', file], pcm(x, channels));
}
function loudness(file) {
  const s = ff(['-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr.toString().split('Summary:').pop();
  return { lufs: Number(s.match(/I:\s+(-?[\d.]+) LUFS/)[1]), truePeakDb: Number(s.match(/Peak:\s+(-?[\d.]+) dBFS/)[1]) };
}
const db = v => +(20 * Math.log10(v)).toFixed(3);

const version = ff(['-version']).stdout.toString().split(/\r?\n/)[0];
const prior = check ? JSON.parse(readFileSync(new URL('SCRAP_AUDIO.json', DIR), 'utf8')) : null;
const scratch = check ? mkdtempSync(join(tmpdir(), 'scrap-audio-')) : null;
const tmp = name => check ? join(scratch, name) : path(new URL(name, DIR));
const S = await b2();
// Ein gemeinsamer Speicherfaktor für alle Klänge: Die lauteste Spitze liegt bei 0,5; die Abstände untereinander bleiben.
const storage = .5 / Math.max(...[...S.values()].map(peakOf));
const manifest = { profile: 'scrap-soft-v1', sampleRate: SAMPLE_RATE, recipe: 'Hörprobe B2 „sauber“ mit Kistenklängen (R40, T1/K5), scripts/build-scrap-audio.mjs',
  sources: { scifi: 'https://kenney.nl/assets/sci-fi-sounds', impact: 'https://kenney.nl/assets/impact-sounds', license: 'CC0-1.0' },
  note: 'Each sound is equal-loudness (loudest 50 ms window, bass below 150 Hz weighted down) and then scaled by one shared storage factor. Levels live in the Scrap sound table.',
  storageGainDb: db(storage), tool: version, sourceFiles: [], samples: [], wind: null };
let index = 0;
const compare = (name, entry, known) => {
  for (const field of ['preEncodePcmSha256', 'oggSha256']) if (known?.[field] !== entry[field]) throw new Error(`${name}: ${field} weicht ab; neu bauen und Herkunft prüfen`);
};
for (const [key, x0] of S) {
  const name = `scrap-b2-${key}`, file = tmp(name + '.ogg'), x = x0.map(v => v * storage);
  encode(x, file, index);
  const decoded = await decodeSample(file, ffmpeg), seconds = decoded.length / SAMPLE_RATE, decodedPeak = peakOf(decoded);
  if (!Number.isFinite(decodedPeak) || decodedPeak > .6 || seconds > 1.2 || seconds < .1) throw new Error(`${name}: unsicherer Klang (${decodedPeak}, ${seconds} s)`);
  const entry = { name, preEncodePcmSha256: digest(pcm(x)), oggSha256: digest(readFileSync(file)), seconds: +seconds.toFixed(4), decodedPeak: +decodedPeak.toFixed(6) };
  if (check) compare(name, entry, prior.samples.find(e => e.name === name));
  manifest.samples.push(entry); index++;
  console.log(`${name}: ${seconds.toFixed(3)} s, Spitze ${db(decodedPeak).toFixed(2)} dBFS`);
}
{
  const x = windLoop(), file = tmp('scrap-wind-loop.ogg');
  encode(x, file, index, 2, 2);
  const m = loudness(file);
  // Pegel im Export: Wind allein bei −48 LUFS (wie in der Hörprobe gegen die Aktionen bei etwa −23 LUFS).
  const entry = { file: 'scrap-wind-loop.ogg', channels: 2, vorbisQuality: 2, seconds: WIND.introSec + WIND.periodSec, loopStartSec: WIND.introSec,
    loopEndSec: WIND.introSec + WIND.periodSec, crossfadeSec: WIND.crossfadeSec, targetLufs: -48, fileLufs: m.lufs, fileTruePeakDb: m.truePeakDb,
    gainDb: +(-48 - m.lufs).toFixed(2), preEncodePcmSha256: digest(pcm(x, 2)), oggSha256: digest(readFileSync(file)) };
  if (check) compare('scrap-wind-loop', entry, prior.wind);
  manifest.wind = entry;
  console.log(`scrap-wind-loop: ${entry.seconds} s, ${m.lufs} LUFS in der Datei, Exportpegel ${entry.gainDb} dB`);
}
for (const name of [...used].sort()) {
  const bytes = readFileSync(new URL(name + '.ogg', SOURCES));
  manifest.sourceFiles.push({ file: `scrap-source/${name}.ogg`, pack: name.startsWith('impactWood') ? 'impact' : 'scifi', sha256: digest(bytes) });
}
if (check) {
  rmSync(scratch, { recursive: true, force: true });
  for (const s of manifest.sourceFiles) if (prior.sourceFiles.find(e => e.file === s.file)?.sha256 !== s.sha256) throw new Error(`${s.file}: Quelle weicht ab`);
  console.log(`Geprüft: ${index} Klänge und die Windschleife stimmen mit SCRAP_AUDIO.json überein.`);
} else {
  writeFileSync(new URL('SCRAP_AUDIO.json', DIR), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Gebaut: ${index} Klänge und die Windschleife.`);
}
