// Tonspur aus Simulationsereignissen: Samples dekodieren, deterministisch mischen, als WAV schreiben.
// Bewusst ohne FFmpeg-Filterketten – ein langes Video hat tausende Ereignisse; gemischt wird blockweise in Node.
import { run, throwIfAborted } from './process.mjs';
import { closeSync, openSync, writeSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './browser.mjs';

export const SAMPLE_RATE = 48000;
export const AUDIO_DIR = join(ROOT, 'assets', 'audio');
const STEP_HZ = 60;                    // Physikschritte je Videosekunde (auch in Zeitlupe)

/** Dekodiert eine Audiodatei zu Mono-Float32 mit 48 kHz. */
export async function decodeSample(file, ffmpeg = 'ffmpeg', { signal } = {}) {
  const r = await run(ffmpeg, ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(SAMPLE_RATE), '-'], { signal, encoding: null });
  if (r.code !== 0) throw new Error(`Sound ${file} nicht lesbar: ${r.stderr.trim() || 'FFmpeg-Code ' + r.code}`);
  const buf = r.stdout, n = Math.floor(buf.length / 4), out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = buf.readFloatLE(i * 4);
  return out;
}

/** Im Code erzeugte Klänge (deterministisch): 'synth:cannon' = dumpfer Kanonenschuss, 'synth:splash' = Platscher. */
export function synthSample(name) {
  let seed = name.length * 2654435761 >>> 0;
  const noise = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2147483648 - 1; };
  // Offline equivalents of the Scrap prototype's short oscillator cues.
  // Separate names encode the actual weapon, not the particle's visual size.
  const scrap = {
    'synth:scrap-blaster': [.10, 380, 150],
    'synth:scrap-rocket': [.18, 100, 34],
    'synth:scrap-pickup': [.14, 560, 900],
  }[name];
  if (scrap) {
    const [duration, from, to] = scrap, out = new Float32Array(Math.round(duration * SAMPLE_RATE));
    let phase = 0;
    for (let i = 0; i < out.length; i++) {
      const u = i / out.length;
      phase += 2 * Math.PI * from * (to / from) ** u / SAMPLE_RATE;
      const tone = name === 'synth:scrap-pickup' ? Math.sin(phase) : 2 / Math.PI * Math.asin(Math.sin(phase));
      out[i] = tone * .8 * Math.min(1, i / 96) * Math.exp(-5 * u) * (1 - u);
    }
    return out;
  }
  if (name === 'synth:cannon') {
    const n = Math.round(0.5 * SAMPLE_RATE), out = new Float32Array(n);
    let phase = 0, lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SAMPLE_RATE, f = 48 + 90 * Math.exp(-t / 0.035);            // Tonhöhe fällt schnell ab
      phase += (2 * Math.PI * f) / SAMPLE_RATE;
      lp += 0.08 * (noise() - lp);                                                // tiefpassgefiltertes Rauschen = Knall
      const body = Math.sin(phase) * Math.exp(-t / 0.13), crack = lp * 3.2 * Math.exp(-t / 0.03);
      out[i] = Math.tanh((body + crack) * 1.4) * 0.9 * Math.min(1, i / 48);       // 1 ms Einschwingen gegen Knacken
    }
    return out;
  }
  if (name === 'synth:splash') {
    const n = Math.round(0.55 * SAMPLE_RATE), out = new Float32Array(n);
    let lp = 0, lp2 = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SAMPLE_RATE, x = noise();
      lp += 0.35 * (x - lp); lp2 += 0.04 * (lp - lp2);                            // Bandpass: Rauschen ohne Tiefen und ohne Zischen
      const env = Math.min(1, t / 0.012) * (0.75 * Math.exp(-t / 0.07) + 0.25 * Math.exp(-t / 0.22));
      out[i] = (lp - lp2) * env * 1.6;
    }
    return out;
  }
  // Endless Pyramid: heller Glockenton (Lichtimpuls) und drei verspielte Klänge der Tierchen
  if (name === 'synth:chime') {
    const n = Math.round(1.4 * SAMPLE_RATE), out = new Float32Array(n), f0 = 784;
    const parts = [[1, 1, 1.2], [2, 0.45, 0.7], [2.76, 0.32, 0.45], [4.07, 0.18, 0.25]];   // Teilton, Pegel, Abklingzeit (s)
    for (let i = 0; i < n; i++) {
      const t = i / SAMPLE_RATE;
      let v = 0;
      for (const [k, a, d] of parts) v += a * Math.sin(2 * Math.PI * f0 * k * t) * Math.exp(-t / d);
      out[i] = v * 0.45 * Math.min(1, i / 144);
    }
    return out;
  }
  if (name === 'synth:boing') {
    const n = Math.round(0.4 * SAMPLE_RATE), out = new Float32Array(n);
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SAMPLE_RATE, f = 170 + 280 * Math.exp(-t / 0.035) + 45 * Math.sin(2 * Math.PI * 13 * t) * Math.exp(-t / 0.18);
      phase += 2 * Math.PI * f / SAMPLE_RATE;
      out[i] = (Math.sin(phase) + 0.25 * Math.sin(2 * phase)) * 0.75 * Math.exp(-t / 0.13) * Math.min(1, i / 96);
    }
    return out;
  }
  if (name === 'synth:wheee') {
    const n = Math.round(0.6 * SAMPLE_RATE), out = new Float32Array(n);
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const u = i / n, t = i / SAMPLE_RATE, f = 620 + 760 * Math.sin(Math.PI * Math.min(1, u * 1.25)) + 22 * Math.sin(2 * Math.PI * 6 * t);
      phase += 2 * Math.PI * f / SAMPLE_RATE;
      out[i] = (Math.sin(phase) + 0.12 * Math.sin(2 * phase)) * 0.55 * Math.sin(Math.PI * u) ** 0.6;
    }
    return out;
  }
  if (name === 'synth:squeak') {
    const n = Math.round(0.15 * SAMPLE_RATE), out = new Float32Array(n);
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const u = i / n;
      phase += 2 * Math.PI * 1300 * (2100 / 1300) ** u / SAMPLE_RATE;
      out[i] = (Math.sin(phase) + 0.2 * Math.sin(3 * phase)) * 0.5 * Math.min(1, i / 240) * (1 - u) ** 1.5;
    }
    return out;
  }
  // Endless Pyramid, Finale: Raketenpfeifen, Knall mit Knistern, Fanfare (aufsteigender Dur-Akkord aus Glockentönen)
  if (name === 'synth:launch') {
    const n = Math.round(0.7 * SAMPLE_RATE), out = new Float32Array(n);
    let phase = 0, lp = 0;
    for (let i = 0; i < n; i++) {
      const u = i / n;
      phase += 2 * Math.PI * (480 + 1100 * u * u) / SAMPLE_RATE; lp += 0.2 * (noise() - lp);
      out[i] = (0.5 * Math.sin(phase) + 0.5 * lp) * Math.sin(Math.PI * u) * 0.6;
    }
    return out;
  }
  if (name === 'synth:firework') {
    const n = Math.round(1.6 * SAMPLE_RATE), out = new Float32Array(n);
    let phase = 0, lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SAMPLE_RATE;
      phase += 2 * Math.PI * (55 + 70 * Math.exp(-t / 0.05)) / SAMPLE_RATE; lp += 0.12 * (noise() - lp);
      let v = Math.sin(phase) * Math.exp(-t / 0.22) + lp * 2.8 * Math.exp(-t / 0.06);
      if (t > 0.25 && noise() > 0.9993 - 0.0006 * Math.exp(-(t - 0.25) / 0.5)) v += 0.9 * Math.exp(-(t - 0.25) / 0.7);   // Knistern
      out[i] = Math.tanh(v * 1.3) * 0.85 * Math.min(1, i / 48);
    }
    return out;
  }
  if (name === 'synth:fanfare') {
    const n = Math.round(1.9 * SAMPLE_RATE), out = new Float32Array(n);
    for (const [k, semi] of [[0, 0], [1, 4], [2, 7], [3, 12]]) {
      const t0 = [0, 0.12, 0.24, 0.42][k], f0 = 523.25 * 2 ** (semi / 12), s0 = Math.round(t0 * SAMPLE_RATE);
      for (let i = s0; i < n; i++) {
        const t = (i - s0) / SAMPLE_RATE;
        let v = 0;
        for (const [m, a, d] of [[1, 1, 0.9], [2, 0.4, 0.5], [3, 0.2, 0.3]]) v += a * Math.sin(2 * Math.PI * f0 * m * t) * Math.exp(-t / d);
        out[i] += v * 0.28 * Math.min(1, (i - s0) / 96);
      }
    }
    return out;
  }
  throw new Error(`Unbekannter erzeugter Klang: ${name}`);
}

/** Lädt alle in der Klangtabelle genannten Samples (Dateiname ohne Endung, aus assets/audio; 'synth:…' wird erzeugt). */
export async function loadSamples(audio, { dir = AUDIO_DIR, ffmpeg = 'ffmpeg', signal } = {}) {
  const names = [...new Set(Object.values(audio.events).flatMap((e) => e.samples))], map = new Map();
  for (const name of names) {
    throwIfAborted(signal);
    if (name.startsWith('synth:')) { map.set(name, synthSample(name)); continue; }
    if (!/^[\w-]+$/.test(name)) throw new Error(`Ungültiger Sample-Name: ${name}`);
    map.set(name, await decodeSample(join(dir, name + '.ogg'), ffmpeg, { signal }));
  }
  return map;
}

/** Deterministische Pseudozufallszahl 0..1 aus Ereignisnummer und Kanal – gleiche Ereignisse klingen immer gleich. */
function rand01(seq, salt) {
  let t = (Math.imul(seq + 1, 0x9e3779b1) ^ Math.imul(salt, 0x85ebca6b)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ---------------------------------------------------------------------
//  Lautstärke
//  Jede Tonspur wird auf die YouTube-Referenz eingemessen: Die Standardmischung (alle Regler 100 %) erreicht
//  −14 LUFS integriert. Gesamt- und Einzelregler wirken relativ dazu in beide Richtungen (0–200 %, 200 % = +6 dB).
// ---------------------------------------------------------------------
export const TARGET_LUFS = -14;                              // YouTube senkt lautere Videos ab, hebt leisere aber nicht an
export const CEILING_DB = -1.5;                              // höchste Spitze (Reserve für Zwischenabtastwerte und AAC)
export const VOLUME_MAX = 200;                               // Regler in Prozent, 100 = Standard
const CEILING = 10 ** (CEILING_DB / 20);
const LOOKAHEAD = 240;                                       // Begrenzer: 5 ms Vorausschau …
const RELEASE = 1 - Math.exp(-1 / (0.06 * SAMPLE_RATE));     // … und 60 ms Rücklauf
const MAX_EXTRA_DB = 24;                                     // höchstens so viel Zusatzverstärkung gegen den Lautheitsverlust im Begrenzer
                                                             // (Glasklirren der Kugelfabrik braucht gut 12 dB, siehe Tests)

/** Faktor aus einem Lautstärkeregler in Prozent (fehlend = 100 %, erlaubt 0–200 %). */
const volFactor = (volume, key) => (volume && Number.isFinite(volume[key]) ? clamp(volume[key], 0, VOLUME_MAX) / 100 : 1);
const db = (v) => (v > 0 ? 20 * Math.log10(v) : -Infinity);
const round2 = (v) => (Number.isFinite(v) ? +v.toFixed(2) : v);

/**
 * Ereignisse -> Stimmen (Startabtastwert, Sample, Abspielrate, Pegel links/rechts).
 * volume: Regler je Klang in Prozent ({ shot: 50, … }); 0 % = Klang stumm, fehlend = 100 %.
 */
export function buildVoices(events, audio, samples, { worldW = 1920, volume = null } = {}) {
  const voices = [], lastStep = {};
  for (const e of [...events].sort((a, b) => a.step - b.step || a.seq - b.seq)) {
    const def = audio.events[e.type];
    if (!def) continue;
    const vol = volFactor(volume, e.type);
    if (vol === 0) continue;
    // Dichtebegrenzung je Klang: Ereignisse, die zu dicht auf das vorige folgen, bleiben stumm
    if (def.minGap && lastStep[e.type] !== undefined && e.step - lastStep[e.type] < def.minGap * STEP_HZ) continue;
    lastStep[e.type] = e.step;
    const data = samples.get(def.samples[Math.floor(rand01(e.seq, 1) * def.samples.length)]);
    const strength = def.ref ? clamp(e.p / def.ref, 0.35, 1.3) : 1;
    const g = def.gain * strength * (0.85 + 0.3 * rand01(e.seq, 2)) * vol;
    const semis = (def.semis || 0) + (def.scale && e.c >= 0 ? def.scale[e.c % def.scale.length] : 0) + (rand01(e.seq, 3) * 2 - 1) * (def.detune || 0);
    const pan = clamp((e.x / worldW - 0.5) * 0.8, -0.4, 0.4);
    voices.push({ start: Math.round((e.step / STEP_HZ) * SAMPLE_RATE), data, rate: 2 ** (semis / 12), gl: g * (1 - Math.max(0, pan)), gr: g * (1 + Math.min(0, pan)), type: e.type });
  }
  return voices.sort((a, b) => a.start - b.start);
}

/** Mischt die Stimmen blockweise (je 1 s) und übergibt jeden Block an onBlock(L, R, n). Liefert die Zahl der Stimmen. */
function mixBlocks(voices, totalSamples, onBlock) {
  const BLOCK = SAMPLE_RATE, L = new Float32Array(BLOCK), R = new Float32Array(BLOCK);
  let next = 0, active = [], used = 0;
  for (let b0 = 0; b0 < totalSamples; b0 += BLOCK) {
    const n = Math.min(BLOCK, totalSamples - b0);
    L.fill(0); R.fill(0);
    while (next < voices.length && voices[next].start < b0 + n) { active.push(voices[next++]); used++; }
    const still = [];
    for (const v of active) {
      const d = v.data, len = d.length - 1, i0 = Math.max(0, v.start - b0);
      let alive = true;
      for (let i = i0; i < n; i++) {
        const pos = (b0 + i - v.start) * v.rate;
        if (pos >= len) { alive = false; break; }
        const k = pos | 0, s = d[k] + (d[k + 1] - d[k]) * (pos - k);
        L[i] += s * v.gl; R[i] += s * v.gr;
      }
      if (alive) still.push(v);
    }
    active = still;
    onBlock(L, R, n);
  }
  return used;
}

/** Integrierte Lautheit nach ITU-R BS.1770-4 / EBU R128: K-Filter, 400-ms-Blöcke mit 75 % Überlappung, Gates −70 LUFS und −10 LU. */
class LoudnessMeter {
  constructor() { this.z = new Float64Array(8); this.sub = []; this.acc = 0; this.cnt = 0; }
  process(L, R, from, to) {
    // K-Filter für 48 kHz (BS.1770-4): Hochton-Kuhschwanz, dann Hochpass; je Kanal als Biquad (transponierte Direktform II)
    const b0 = 1.53512485958697, b1 = -2.69169618940638, b2 = 1.19839281085285, a1 = -1.69065929318241, a2 = 0.73248077421585;
    const c1 = -1.99004745483398, c2 = 0.99007225036621, SUB = SAMPLE_RATE / 10, z = this.z;
    let [l1, l2, l3, l4, r1, r2, r3, r4] = z, acc = this.acc, cnt = this.cnt;
    for (let i = from; i < to; i++) {
      let x = L[i], y = b0 * x + l1; l1 = b1 * x - a1 * y + l2; l2 = b2 * x - a2 * y;
      x = y; y = x + l3; l3 = -2 * x - c1 * y + l4; l4 = x - c2 * y; acc += y * y;
      x = R[i]; y = b0 * x + r1; r1 = b1 * x - a1 * y + r2; r2 = b2 * x - a2 * y;
      x = y; y = x + r3; r3 = -2 * x - c1 * y + r4; r4 = x - c2 * y; acc += y * y;
      if (++cnt === SUB) { this.sub.push(acc); acc = 0; cnt = 0; }   // Energie je 100-ms-Teilblock (beide Kanäle)
    }
    z.set([l1, l2, l3, l4, r1, r2, r3, r4]); this.acc = acc; this.cnt = cnt;
  }
  /** Integrierte Lautheit in LUFS (−Infinity bei Stille oder unter 400 ms). */
  integrated() {
    const s = this.sub, N = (SAMPLE_RATE / 10) * 4, blocks = [];
    for (let j = 0; j + 4 <= s.length; j++) blocks.push((s[j] + s[j + 1] + s[j + 2] + s[j + 3]) / N);
    const lufs = (e) => -0.691 + 10 * Math.log10(e);
    const mean = (gate) => { let sum = 0, n = 0; for (const e of blocks) if (e > 0 && lufs(e) > gate) { sum += e; n++; } return n ? sum / n : 0; };
    const abs = mean(-70);
    if (!abs) return -Infinity;
    const rel = mean(Math.max(-70, lufs(abs) - 10));
    return rel ? lufs(rel) : -Infinity;
  }
}

/**
 * Spitzenbegrenzer mit Vorausschau: gleitendes Minimum der nötigen Verstärkung über das Vorausschaufenster, langsamer
 * Rücklauf, dann gleitender Mittelwert. Das Signal läuft um D = Fenster − 1 Abtastwerte verzögert hindurch; so ist die
 * Verstärkung bei jeder Spitze bereits weit genug abgesenkt (kein Übersteuern, keine harten Knicke).
 */
class Limiter {
  constructor(ceiling, W = LOOKAHEAD) {
    Object.assign(this, { c: ceiling, W, D: W - 1, qh: 0, qn: 0, ri: 0, sum: W, r: 1, di: 0, idx: 0, minGain: 1 });
    this.qv = new Float64Array(W + 1); this.qi = new Float64Array(W + 1);       // monotone Warteschlange (gleitendes Minimum)
    this.rb = new Float64Array(W).fill(1);                                      // Ringpuffer für den Mittelwert
    this.dl = new Float32Array(this.D); this.dr = new Float32Array(this.D);     // Verzögerung des Signals
  }
  process(inL, inR, n, outL, outR) {
    const { c, W, D, qv, qi, rb, dl, dr } = this, cap = W + 1;
    let { qh, qn, ri, sum, r, di, idx, minGain } = this;
    for (let i = 0; i < n; i++, idx++) {
      const xl = inL[i], xr = inR[i], pk = Math.max(Math.abs(xl), Math.abs(xr)), g = pk > c ? c / pk : 1;
      while (qn > 0 && qv[(qh + qn - 1) % cap] >= g) qn--;
      const t = (qh + qn) % cap; qv[t] = g; qi[t] = idx; qn++;
      if (qi[qh] <= idx - W) { qh = (qh + 1) % cap; qn--; }
      const m = qv[qh];
      r = m < r ? m : r + (m - r) * RELEASE;
      sum += r - rb[ri]; rb[ri] = r; ri = ri + 1 === W ? 0 : ri + 1;
      const a = sum / W;
      if (a < minGain) minGain = a;
      outL[i] = dl[di] * a; outR[i] = dr[di] * a; dl[di] = xl; dr[di] = xr; di = di + 1 === D ? 0 : di + 1;
    }
    Object.assign(this, { qh, qn, ri, sum, r, di, idx, minGain });
  }
}

function wavHeader(totalSamples) {
  const dataBytes = totalSamples * 4, head = Buffer.alloc(44);
  head.write('RIFF', 0); head.writeUInt32LE(36 + dataBytes, 4); head.write('WAVEfmt ', 8); head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20); head.writeUInt16LE(2, 22); head.writeUInt32LE(SAMPLE_RATE, 24); head.writeUInt32LE(SAMPLE_RATE * 4, 28);
  head.writeUInt16LE(4, 32); head.writeUInt16LE(16, 34); head.write('data', 36); head.writeUInt32LE(dataBytes, 40);
  return head;
}

/**
 * Mischt die Stimmen, verstärkt um gain, begrenzt (limit) und misst die Lautheit. Mit file entsteht eine WAV-Datei
 * (16 Bit, Stereo, 48 kHz) mit genau totalSamples Abtastwerten; die Vorausschau des Begrenzers verschiebt die Spur nicht.
 * Liefert Lautheit (LUFS), Spitzen vor/nach dem Begrenzer, stärkste Absenkung und eine Prüfsumme der Daten.
 */
export function processTrack(voices, totalSamples, { gain = 1, outGain = 1, limit = true, file = null, ceiling = CEILING, onProgress = () => {} } = {}) {
  const meter = new LoudnessMeter(), lim = limit ? new Limiter(ceiling) : null;
  const oL = new Float32Array(SAMPLE_RATE), oR = new Float32Array(SAMPLE_RATE);
  const toI16 = (x) => { const q = Math.round(x * 32767); return q > 32767 ? 32767 : q < -32768 ? -32768 : q; };
  let fd = null, buf = null, bufN = 0, skip = lim ? lim.D : 0, written = 0, peakIn = 0, peakOut = 0, digest = 0x811c9dc5, used = 0;
  const sink = (L, R, n) => {
    const from = Math.min(skip, n), to = Math.min(n, from + (totalSamples - written));
    skip -= from;
    if (to <= from) return;
    for (let i = from; i < to; i++) {
      if (lim) {   // Sicherung gegen Rundungsfehler: nie über die Obergrenze
        if (L[i] > ceiling) L[i] = ceiling; else if (L[i] < -ceiling) L[i] = -ceiling;
        if (R[i] > ceiling) R[i] = ceiling; else if (R[i] < -ceiling) R[i] = -ceiling;
      }
      if (outGain !== 1) { L[i] *= outGain; R[i] *= outGain; }   // hinter dem Begrenzer: exakt leiser, ohne Begrenzerwirkung
      const al = Math.abs(L[i]), ar = Math.abs(R[i]);
      if (al > peakOut) peakOut = al; if (ar > peakOut) peakOut = ar;
    }
    meter.process(L, R, from, to);
    if (buf) {
      for (let i = from; i < to; i++) {
        const ql = toI16(L[i]), qr = toI16(R[i]);
        buf.writeInt16LE(ql, bufN); buf.writeInt16LE(qr, bufN + 2); bufN += 4;
        digest = Math.imul(digest ^ (ql & 0xffff), 0x01000193) >>> 0;
        digest = Math.imul(digest ^ (qr & 0xffff), 0x01000193) >>> 0;
        if (bufN === buf.length) { writeSync(fd, buf, 0, bufN); bufN = 0; }
      }
    }
    written += to - from;
  };
  try {
    if (file) { fd = openSync(file, 'w'); writeSync(fd, wavHeader(totalSamples)); buf = Buffer.alloc(SAMPLE_RATE * 4); }
    used = mixBlocks(voices, totalSamples, (L, R, n) => {
      for (let i = 0; i < n; i++) {
        const l = (L[i] *= gain), r = (R[i] *= gain), pk = Math.max(Math.abs(l), Math.abs(r));
        if (pk > peakIn) peakIn = pk;
      }
      if (lim) { lim.process(L, R, n, oL, oR); sink(oL, oR, n); } else sink(L, R, n);
      onProgress(written / totalSamples);
    });
    if (lim) {   // die letzten D Abtastwerte stecken noch in der Verzögerung
      lim.process(new Float32Array(lim.D), new Float32Array(lim.D), lim.D, oL, oR); sink(oL, oR, lim.D);
    }
    if (buf && bufN) writeSync(fd, buf, 0, bufN);
  } finally { if (fd !== null) closeSync(fd); }
  return {
    voices: used, lufs: round2(meter.integrated()), peakInDb: round2(db(peakIn)), peakOutDb: round2(db(peakOut)),
    maxReductionDb: lim ? round2(db(lim.minGain)) : 0, limited: !!lim && lim.minGain < 0.989, digest: digest.toString(16).padStart(8, '0'),
  };
}

/**
 * Fertige Tonspur fürs Video: Die Standardmischung (alle Regler 100 %) wird gemessen und so verstärkt, dass sie nach dem
 * Begrenzer target (−14 LUFS) erreicht. Mit dieser Verstärkung entsteht die Spur mit den gewählten Reglern – 100 % trifft
 * also das YouTube-Ziel, darunter wird es leiser, darüber lauter. Schreibt die WAV-Datei.
 */
export function renderTrack(events, audio, samples, { worldW = 1920, volume = null, totalSamples, file, target = TARGET_LUFS, onProgress = () => {} } = {}) {
  // Höchstens zehn Durchläufe: Rohmessung, acht Einmessungen, Ausgabe. Kein Einfluss auf die Audiodaten.
  let pass = 0;
  const measure = (voices, options) => {
    const out = processTrack(voices, totalSamples, { ...options, onProgress: (p) => onProgress((pass + p) / 10) });
    pass++; return out;
  };
  const base = buildVoices(events, audio, samples, { worldW });
  const raw = measure(base, { limit: false });
  let gDb = 0, standardLufs = raw.lufs;
  if (Number.isFinite(raw.lufs)) {
    const cap = target - raw.lufs + MAX_EXTRA_DB;
    let prev = null;
    gDb = target - raw.lufs;
    // Der Begrenzer kostet Lautheit: nachregeln (Sekantenverfahren), bis die Standardmischung das Ziel auf 0,1 LU trifft
    for (let i = 0; i < 8; i++) {
      const L = measure(base, { gain: 10 ** (gDb / 20) }).lufs, err = target - L;
      standardLufs = L;
      if (Math.abs(err) < 0.1 || gDb >= cap) break;
      let slope = 1;
      if (prev && gDb !== prev.gDb) { const s = (L - prev.L) / (gDb - prev.gDb); if (s > 0.05 && s < 1.5) slope = s; }
      prev = { gDb, L };
      gDb = Math.min(cap, gDb + err / slope);
    }
  }
  // Einzelregler verändern die Mischung vor dem Begrenzer. Der Gesamtregler wirkt unter 100 % dahinter (50 % = genau −6 dB,
  // auch wenn der Begrenzer kräftig arbeitet), über 100 % davor (lauter, Spitzen bleiben begrenzt).
  const perSound = volume && Object.entries(volume).some(([k, v]) => k !== 'master' && v !== 100);
  const voices = perSound ? buildVoices(events, audio, samples, { worldW, volume }) : base, m = volFactor(volume, 'master');
  const out = measure(voices, { gain: 10 ** (gDb / 20) * Math.max(1, m), outGain: Math.min(1, m), file });
  onProgress(1);
  return { ...out, targetLufs: target, standardLufs, normGainDb: round2(gDb) };
}
