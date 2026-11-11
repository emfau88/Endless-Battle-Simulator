// Tonspur: Mischer (abtastgenau, reproduzierbar, begrenzt), Export mit Ton (synchron, auch in Zeitlupe), Stummoption.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { INDEX, launchBrowser } from '../lib/browser.mjs';
import { exportVideo, verifyResult } from '../lib/exporter.mjs';
import { SAMPLE_RATE, buildVoices, decodeSample, loadSamples, mixToWav } from '../lib/audio.mjs';

const dir = mkdtempSync(join(tmpdir(), 'ebs-audio-'));
process.on('exit', () => rmSync(dir, { recursive: true, force: true }));
const fast = { encoder: { preset: 'ultrafast' } };
const marble = (video, extra = {}) => ({ scenario: 'marble', seed: 42, video: { aspect: '16:9', resolution: 720, fps: 30, ...video }, ...extra });

test('Mischer: Ereignisse landen abtastgenau, WAV ist korrekt, Ergebnis ist reproduzierbar und begrenzt', async () => {
  const audio = { events: { a: { samples: ['impactGlass_light_000'], gain: 0.5 }, loud: { samples: ['impactGlass_medium_000'], gain: 3 } } };
  const samples = await loadSamples(audio);
  assert.ok(samples.get('impactGlass_light_000').length > 5000, 'Sample nicht dekodiert');
  // Ereignisse bei Schritt 60 (= 1,000 s) und Schritt 150 (= 2,500 s); „loud“ würde ohne Begrenzer übersteuern
  const events = [{ seq: 0, step: 60, type: 'a', x: 960, p: 1, c: -1 }, { seq: 1, step: 150, type: 'a', x: 960, p: 1, c: -1 },
    { seq: 2, step: 210, type: 'loud', x: 960, p: 1, c: -1 }, { seq: 3, step: 30, type: 'unbekannt', x: 0, p: 1, c: -1 }];
  const f1 = join(dir, 'm1.wav'), f2 = join(dir, 'm2.wav'), total = 4 * SAMPLE_RATE;
  const r1 = mixToWav(buildVoices(events, audio, samples), total, f1), r2 = mixToWav(buildVoices(events, audio, samples), total, f2);
  assert.equal(r1.voices, 3, 'Ereignis ohne Klang darf keine Stimme erzeugen');
  assert.equal(r1.digest, r2.digest, 'gleiche Ereignisse ergeben unterschiedliche Tonspuren');
  assert.ok(readFileSync(f1).equals(readFileSync(f2)));
  const wav = readFileSync(f1);
  assert.equal(wav.toString('ascii', 0, 4) + wav.toString('ascii', 8, 12), 'RIFFWAVE');
  assert.deepEqual([wav.readUInt16LE(22), wav.readUInt32LE(24), wav.readUInt16LE(34), wav.readUInt32LE(40)], [2, SAMPLE_RATE, 16, total * 4]);
  assert.equal(wav.length, 44 + total * 4, 'Länge der Tonspur');
  const at = (i) => Math.abs(wav.readInt16LE(44 + i * 4));
  let first = -1, peak = 0;
  for (let i = 0; i < total; i++) { const v = at(i); if (v > 40 && first < 0) first = i; if (v > peak) peak = v; }
  assert.ok(first >= SAMPLE_RATE && first < SAMPLE_RATE + 400, `erster Ton bei Abtastwert ${first}, erwartet ab ${SAMPLE_RATE}`);
  let second = -1;
  for (let i = Math.round(2.2 * SAMPLE_RATE); i < 3 * SAMPLE_RATE; i++) if (at(i) > 40) { second = i; break; }
  assert.ok(second >= 2.5 * SAMPLE_RATE && second < 2.5 * SAMPLE_RATE + 400, `zweiter Ton bei ${second}`);
  // Begrenzer: Eingang übersteuert, Ausgang bleibt unter 0 dBFS
  assert.ok(r1.peakInDb > 0 && r1.limited, `Begrenzer nicht geprüft (Eingang ${r1.peakInDb} dB)`);
  assert.ok(r1.peakOutDb < 0 && peak < 32767, `Ausgang übersteuert: ${r1.peakOutDb} dBFS`);
});

/** Versatz (in 5-ms-Schritten) zwischen Ereigniszeiten und dem Lautstärkeverlauf der Tonspur per Kreuzkorrelation. */
async function audioLag(file, events, seconds) {
  const pcm = await decodeSample(file), hop = SAMPLE_RATE / 200, n = Math.floor(Math.min(pcm.length, seconds * SAMPLE_RATE) / hop);
  const env = new Float32Array(n), exp = new Float32Array(n);
  for (let k = 0; k < n; k++) { let s = 0; for (let i = k * hop; i < (k + 1) * hop; i++) s += pcm[i] * pcm[i]; env[k] = Math.sqrt(s / hop); }
  const rise = new Float32Array(n);                       // Anstieg der Lautstärke = Einsätze
  for (let k = 1; k < n; k++) rise[k] = Math.max(0, env[k] - env[k - 1]);
  for (const e of events) { const k = Math.round((e.step / 60) * 200); if (k < n && ['clink', 'hopper', 'belt', 'rail', 'lift', 'pick'].includes(e.type)) exp[k] += 1; }
  let best = -99, bestLag = 0;
  for (let lag = -20; lag <= 20; lag++) {
    let c = 0;
    for (let k = Math.max(0, -lag); k < n - Math.max(0, lag); k++) c += exp[k] * rise[k + lag];
    if (c > best) { best = c; bestLag = lag; }
  }
  return bestLag;
}

for (const tempo of [1, 0.8]) {
  test(`Export mit Ton (Tempo ${tempo}): AAC-Stereospur in voller Länge, synchron zu den Ereignissen, nicht übersteuert`, async () => {
    const r = await exportVideo(marble({ durationSec: 5, tempo }), { out: join(dir, `t${tempo}.mp4`), ...fast });
    assert.deepEqual(verifyResult(r), []);
    assert.deepEqual([r.audioStream.codec, r.audioStream.sampleRate, r.audioStream.channels], ['aac', 48000, 2]);
    assert.ok(Math.abs(r.audioStream.duration - 5) < 0.03, `Tonspur ${r.audioStream.duration} s`);
    assert.ok(r.audio.events > 20 && r.audio.lost === 0, `Ereignisse: ${r.audio.events}, verloren: ${r.audio.lost}`);
    assert.ok(r.audio.voices > 20, 'kaum Stimmen gemischt');
    assert.ok(r.audio.peakOutDb < -0.3, `Spitzenpegel ${r.audio.peakOutDb} dBFS`);
    assert.ok(r.audioEvents.every((e) => e.step >= 1 && e.step <= 5 * 60), 'Ereignis außerhalb der Videolänge');
    const lag = await audioLag(r.file, r.audioEvents, 5);
    assert.ok(lag >= -1 && lag <= 4, `Ton liegt ${lag * 5} ms neben den Ereignissen`);
    const side = JSON.parse(readFileSync(r.sidecar, 'utf8'));
    assert.deepEqual([side.audio.codec, side.audio.events, side.audio.digest], ['aac', r.audio.events, r.audio.digest]);
  });
}

test('Ton ist reproduzierbar und beeinflusst die Simulation nicht; Stummoption liefert ein Video ohne Tonspur', async () => {
  const a = await exportVideo(marble({ durationSec: 2 }), { out: join(dir, 'a.mp4'), ...fast });
  const b = await exportVideo(marble({ durationSec: 2 }), { out: join(dir, 'b.mp4'), ...fast });
  const mute = await exportVideo(marble({ durationSec: 2, audio: false }), { out: join(dir, 'mute.mp4'), ...fast });
  assert.equal(a.audio.digest, b.audio.digest, 'gleicher Seed ergibt unterschiedlichen Ton');
  assert.equal(a.stateHash, b.stateHash);
  assert.equal(mute.stateHash, a.stateHash, 'Ton verändert den Simulationsverlauf');
  assert.deepEqual([mute.audio, mute.audioStream], [null, null]);
  assert.deepEqual(verifyResult(mute), []);
  assert.equal(JSON.parse(readFileSync(mute.sidecar, 'utf8')).config.video.audio, false, 'Stummoption steht nicht in der Konfiguration');
});

test('Szenario ohne Klangtabelle (Seeschlacht) exportiert weiterhin ohne Tonspur', async () => {
  const r = await exportVideo({ seed: 5, video: { resolution: 720, durationSec: 1 } }, { out: join(dir, 'naval.mp4'), ...fast });
  assert.deepEqual(verifyResult(r), []);
  assert.deepEqual([r.cfg.scenario, r.cfg.video.audio, r.audio, r.audioStream], ['naval', true, null, null]);
});

let browser;
before(async () => { browser = await launchBrowser({ gpu: false }); });
after(async () => { await browser?.close(); });

test('Oberfläche: Ton-Schalter nur bei Szenarien mit Ton, Einstellung bleibt gespeichert', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } }), page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const ready = () => page.waitForFunction(() => window.EBS && window.EBS.app && window.EBS.app.sim, null, { timeout: 30000 });
  const state = () => page.evaluate(() => ({ dis: document.querySelector('#audio').disabled, on: document.querySelector('#audio').checked, cfg: window.EBS.app.cfg.video.audio }));
  await page.goto(pathToFileURL(INDEX).href); await ready();
  assert.deepEqual(await state(), { dis: true, on: false, cfg: true }, 'Seeschlacht hat keinen Ton');
  await page.selectOption('#scenario', 'marble');
  assert.deepEqual(await state(), { dis: false, on: true, cfg: true });
  await page.uncheck('#audio');
  assert.equal((await state()).cfg, false);
  await page.reload(); await ready();
  assert.deepEqual(await state(), { dis: false, on: false, cfg: false }, 'Stummoption nach Neuladen');
  assert.deepEqual(errors, []);
  await ctx.close();
});
