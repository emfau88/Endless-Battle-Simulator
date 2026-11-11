// Tonspur aus Simulationsereignissen: Samples dekodieren, deterministisch mischen, als WAV schreiben.
// Bewusst ohne FFmpeg-Filterketten – ein langes Video hat tausende Ereignisse; gemischt wird blockweise in Node.
import { spawn } from 'node:child_process';
import { closeSync, openSync, writeSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './browser.mjs';

export const SAMPLE_RATE = 48000;
export const AUDIO_DIR = join(ROOT, 'assets', 'audio');
const STEP_HZ = 60;                    // Physikschritte je Videosekunde (auch in Zeitlupe)

/** Dekodiert eine Audiodatei zu Mono-Float32 mit 48 kHz. */
export function decodeSample(file, ffmpeg = 'ffmpeg') {
  return new Promise((res, rej) => {
    const p = spawn(ffmpeg, ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(SAMPLE_RATE), '-'], { windowsHide: true });
    const chunks = []; let err = '';
    p.stdout.on('data', (d) => chunks.push(d));
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', rej);
    p.on('close', (code) => {
      if (code !== 0) return rej(new Error(`Sound ${file} nicht lesbar: ${err.trim() || 'FFmpeg-Code ' + code}`));
      const buf = Buffer.concat(chunks), n = Math.floor(buf.length / 4), out = new Float32Array(n);
      for (let i = 0; i < n; i++) out[i] = buf.readFloatLE(i * 4);
      res(out);
    });
  });
}

/** Im Code erzeugte Klänge (deterministisch): 'synth:cannon' = dumpfer Kanonenschuss, 'synth:splash' = Platscher. */
export function synthSample(name) {
  let seed = name.length * 2654435761 >>> 0;
  const noise = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2147483648 - 1; };
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
  throw new Error(`Unbekannter erzeugter Klang: ${name}`);
}

/** Lädt alle in der Klangtabelle genannten Samples (Dateiname ohne Endung, aus assets/audio; 'synth:…' wird erzeugt). */
export async function loadSamples(audio, { dir = AUDIO_DIR, ffmpeg = 'ffmpeg' } = {}) {
  const names = [...new Set(Object.values(audio.events).flatMap((e) => e.samples))], map = new Map();
  for (const name of names) {
    if (name.startsWith('synth:')) { map.set(name, synthSample(name)); continue; }
    if (!/^[\w-]+$/.test(name)) throw new Error(`Ungültiger Sample-Name: ${name}`);
    map.set(name, await decodeSample(join(dir, name + '.ogg'), ffmpeg));
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

/** Ereignisse -> Stimmen (Startabtastwert, Sample, Abspielrate, Pegel links/rechts). */
export function buildVoices(events, audio, samples, { worldW = 1920 } = {}) {
  const voices = [], lastStep = {};
  for (const e of [...events].sort((a, b) => a.step - b.step || a.seq - b.seq)) {
    const def = audio.events[e.type];
    if (!def) continue;
    // Dichtebegrenzung je Klang: Ereignisse, die zu dicht auf das vorige folgen, bleiben stumm
    if (def.minGap && lastStep[e.type] !== undefined && e.step - lastStep[e.type] < def.minGap * STEP_HZ) continue;
    lastStep[e.type] = e.step;
    const data = samples.get(def.samples[Math.floor(rand01(e.seq, 1) * def.samples.length)]);
    const strength = def.ref ? clamp(e.p / def.ref, 0.35, 1.3) : 1;
    const g = def.gain * strength * (0.85 + 0.3 * rand01(e.seq, 2));
    const semis = (def.semis || 0) + (def.scale && e.c >= 0 ? def.scale[e.c % def.scale.length] : 0) + (rand01(e.seq, 3) * 2 - 1) * (def.detune || 0);
    const pan = clamp((e.x / worldW - 0.5) * 0.8, -0.4, 0.4);
    voices.push({ start: Math.round((e.step / STEP_HZ) * SAMPLE_RATE), data, rate: 2 ** (semis / 12), gl: g * (1 - Math.max(0, pan)), gr: g * (1 + Math.min(0, pan)), type: e.type });
  }
  return voices.sort((a, b) => a.start - b.start);
}

/**
 * Mischt die Stimmen blockweise und schreibt eine WAV-Datei (16 Bit, Stereo, 48 kHz) mit genau totalSamples Abtastwerten.
 * Liefert Spitzenpegel vor/nach dem Begrenzer und eine Prüfsumme der Daten (für Reproduzierbarkeitstests).
 */
export function mixToWav(voices, totalSamples, file, { master = 0.9 } = {}) {
  const fd = openSync(file, 'w'), dataBytes = totalSamples * 4, head = Buffer.alloc(44);
  head.write('RIFF', 0); head.writeUInt32LE(36 + dataBytes, 4); head.write('WAVEfmt ', 8); head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20); head.writeUInt16LE(2, 22); head.writeUInt32LE(SAMPLE_RATE, 24); head.writeUInt32LE(SAMPLE_RATE * 4, 28);
  head.writeUInt16LE(4, 32); head.writeUInt16LE(16, 34); head.write('data', 36); head.writeUInt32LE(dataBytes, 40);
  writeSync(fd, head);
  const BLOCK = SAMPLE_RATE, L = new Float32Array(BLOCK), Rr = new Float32Array(BLOCK), out = Buffer.alloc(BLOCK * 4);
  let next = 0, active = [], peakIn = 0, peakOut = 0, digest = 0x811c9dc5, used = 0;
  try {
    for (let b0 = 0; b0 < totalSamples; b0 += BLOCK) {
      const n = Math.min(BLOCK, totalSamples - b0);
      L.fill(0); Rr.fill(0);
      while (next < voices.length && voices[next].start < b0 + n) { active.push(voices[next++]); used++; }
      const still = [];
      for (const v of active) {
        const d = v.data, len = d.length - 1, i0 = Math.max(0, v.start - b0);
        let alive = true;
        for (let i = i0; i < n; i++) {
          const pos = (b0 + i - v.start) * v.rate;
          if (pos >= len) { alive = false; break; }
          const k = pos | 0, s = d[k] + (d[k + 1] - d[k]) * (pos - k);
          L[i] += s * v.gl; Rr[i] += s * v.gr;
        }
        if (alive) still.push(v);
      }
      active = still;
      for (let i = 0; i < n; i++) {
        for (let ch = 0; ch < 2; ch++) {
          const x = (ch ? Rr[i] : L[i]) * master, ax = Math.abs(x);
          if (ax > peakIn) peakIn = ax;
          // weicher Begrenzer: linear bis −4,4 dBFS, darüber sanft gestaucht, nie über 0,95 (−0,45 dBFS)
          const y = ax < 0.6 ? x : Math.sign(x) * (0.6 + 0.35 * Math.tanh((ax - 0.6) / 0.35));
          if (Math.abs(y) > peakOut) peakOut = Math.abs(y);
          const q = Math.round(y * 32767);
          out.writeInt16LE(q, (i * 2 + ch) * 2);
          digest = Math.imul(digest ^ (q & 0xffff), 0x01000193) >>> 0;
        }
      }
      writeSync(fd, out, 0, n * 4);
    }
  } finally { closeSync(fd); }
  const db = (v) => (v > 0 ? 20 * Math.log10(v) : -Infinity);
  return { voices: used, peakInDb: +db(peakIn).toFixed(2), peakOutDb: +db(peakOut).toFixed(2), limited: peakIn > 0.6, digest: digest.toString(16).padStart(8, '0') };
}
