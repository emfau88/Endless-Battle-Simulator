// Tonspur: Mischer (abtastgenau, reproduzierbar, begrenzt), Lautheit (−14 LUFS, Regler in beide Richtungen),
// Export mit Ton (synchron, auch in Zeitlupe), Stummoption.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { INDEX, ROOT, launchBrowser } from '../lib/browser.mjs';
import { exportVideo, ffmpegBin, run, verifyResult } from '../lib/exporter.mjs';
import { CEILING_DB, SAMPLE_RATE, TARGET_LUFS, buildVoices, decodeSample, loadSamples, measureEncodedAudio, processTrack, renderTrack } from '../lib/audio.mjs';

const dir = mkdtempSync(join(tmpdir(), 'ebs-audio-'));
process.on('exit', () => rmSync(dir, { recursive: true, force: true }));
const fast = { encoder: { preset: 'ultrafast' } };
const marble = (video, extra = {}) => ({ scenario: 'marble', seed: 42, video: { aspect: '16:9', resolution: 720, fps: 30, ...video }, ...extra });

/** Unabhängige Nachmessung mit FFmpeg (EBU R128): integrierte Lautheit und True Peak einer Datei. */
async function ebur128(file) {
  const r = await run(ffmpegBin(), ['-hide_banner', '-nostats', '-i', file, '-filter_complex', 'ebur128=peak=true', '-f', 'null', '-']);
  const i = [...r.stderr.matchAll(/^\s+I:\s+(-?[\d.]+) LUFS/gm)].pop(), p = [...r.stderr.matchAll(/^\s+Peak:\s+(-?[\d.]+) dBFS/gm)].pop();
  return { lufs: i ? +i[1] : NaN, truePeak: p ? +p[1] : NaN };
}
/** Fertiges Video: Lautheit am YouTube-Ziel (eigene Messung genau, FFmpeg nach AAC-Kodierung auf ±1 LU), True Peak unter −1 dBTP. */
async function assertYouTubeLoudness(r) {
  assert.ok(Math.abs(r.audio.lufs - TARGET_LUFS) <= 0.15, `eigene Messung ${r.audio.lufs} LUFS statt ${TARGET_LUFS}`);
  assert.ok(r.audio.peakOutDb <= CEILING_DB + 0.01, `Spitze ${r.audio.peakOutDb} dBFS über ${CEILING_DB}`);
  const m = await ebur128(r.file);
  assert.deepEqual(r.audio.encoded, { lufs: m.lufs, truePeakDb: m.truePeak, silent: false });
  assert.ok(Math.abs(m.lufs - TARGET_LUFS) <= 1, `FFmpeg misst ${m.lufs} LUFS statt ${TARGET_LUFS}`);
  assert.ok(m.truePeak <= -1, `True Peak ${m.truePeak} dBTP (YouTube empfiehlt höchstens −1)`);
}

test('AAC-Nachmessung unterscheidet Stille und echte Spitzen; fehlende Audiodatei ist kein bestandener Check', async () => {
  for(const [name,source,silent] of [['silence','anullsrc=r=48000:cl=stereo',true],['loud','sine=frequency=997:sample_rate=48000',false]]) {
    const file=join(dir,name+'.m4a');
    const result=await run(ffmpegBin(),['-y','-v','error','-f','lavfi','-i',source,'-t','1','-af','volume=16','-ac','2','-c:a','aac','-b:a','192k',file]);
    assert.equal(result.code,0,result.stderr);
    const measured=await measureEncodedAudio(file,{ffmpeg:ffmpegBin()});
    assert.equal(measured.silent,silent);
    if(silent)assert.equal(measured.truePeakDb,null);
    else assert.ok(measured.truePeakDb>-1,JSON.stringify(measured));
  }
  await assert.rejects(measureEncodedAudio(join(dir,'missing.mp4'),{ffmpeg:ffmpegBin()}),/nicht messbar/);
});

test('Mischer: Ereignisse landen abtastgenau, WAV ist korrekt, Ergebnis ist reproduzierbar und begrenzt', async () => {
  const audio = { events: { a: { samples: ['impactGlass_light_000'], gain: 0.5 }, loud: { samples: ['impactGlass_medium_000'], gain: 3 } } };
  const samples = await loadSamples(audio);
  assert.ok(samples.get('impactGlass_light_000').length > 5000, 'Sample nicht dekodiert');
  // Ereignisse bei Schritt 60 (= 1,000 s) und Schritt 150 (= 2,500 s); „loud“ würde ohne Begrenzer übersteuern
  const events = [{ seq: 0, step: 60, type: 'a', x: 960, p: 1, c: -1 }, { seq: 1, step: 150, type: 'a', x: 960, p: 1, c: -1 },
    { seq: 2, step: 210, type: 'loud', x: 960, p: 1, c: -1 }, { seq: 3, step: 30, type: 'unbekannt', x: 0, p: 1, c: -1 }];
  const f1 = join(dir, 'm1.wav'), f2 = join(dir, 'm2.wav'), total = 4 * SAMPLE_RATE;
  const r1 = processTrack(buildVoices(events, audio, samples), total, { file: f1 }), r2 = processTrack(buildVoices(events, audio, samples), total, { file: f2 });
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
  // Begrenzer: Eingang übersteuert, Ausgang bleibt unter der Obergrenze; die Vorausschau verschiebt die Einsätze nicht (oben)
  assert.ok(r1.peakInDb > 0 && r1.limited && r1.maxReductionDb < -3, `Begrenzer nicht geprüft (Eingang ${r1.peakInDb} dB, Absenkung ${r1.maxReductionDb} dB)`);
  assert.ok(r1.peakOutDb <= CEILING_DB + 0.01 && peak < 32767, `Ausgang übersteuert: ${r1.peakOutDb} dBFS`);
});

test('Lautheitsmessung nach BS.1770: Sinus 997 Hz mit −20 dBFS in beiden Kanälen ergibt −20 LUFS', () => {
  const n = 5 * SAMPLE_RATE, sine = new Float32Array(n + 1), a = 10 ** (-20 / 20);
  for (let i = 0; i <= n; i++) sine[i] = Math.sin((2 * Math.PI * 997 * i) / SAMPLE_RATE);
  const r = processTrack([{ start: 0, data: sine, rate: 1, gl: a, gr: a, type: 's' }], n, { limit: false });
  assert.ok(Math.abs(r.lufs + 20) < 0.1, `gemessen ${r.lufs} LUFS`);
  assert.equal(processTrack([], n, { limit: false }).lufs, -Infinity, 'Stille muss −Infinity ergeben');
});

test('Einmessung: Standard trifft −14 LUFS; Gesamtregler und Einzelregler wirken in beide Richtungen, Spitze bleibt begrenzt', async () => {
  const audio = { events: { a: { samples: ['impactGlass_medium_000'], gain: 0.3 }, b: { samples: ['impactWood_medium_000'], gain: 0.2 } } };
  const samples = await loadSamples(audio), total = 10 * SAMPLE_RATE, events = [];
  for (let k = 0; k < 40; k++) events.push({ seq: k, step: 6 + k * 14, type: k % 3 ? 'a' : 'b', x: 200 + (k * 97) % 1500, p: 1, c: -1 });
  const go = (volume, name) => renderTrack(events, audio, samples, { volume, totalSamples: total, file: join(dir, name + '.wav') });
  const std = go(null, 'std'), same = go({ master: 100, a: 100, b: 100 }, 'same');
  assert.ok(Math.abs(std.lufs - TARGET_LUFS) <= 0.15, `Standard ${std.lufs} LUFS`);
  assert.equal(same.digest, std.digest, 'alle Regler auf 100 % müssen den Standard ergeben');
  assert.ok(std.peakOutDb <= CEILING_DB + 0.01, `Spitze ${std.peakOutDb} dBFS`);
  const quiet = go({ master: 50 }, 'quiet'), loud = go({ master: 200 }, 'loud'), bUp = go({ b: 200 }, 'bUp'), bDown = go({ b: 0 }, 'bDown');
  assert.ok(Math.abs(std.lufs - 6.02 - quiet.lufs) < 0.05, `Gesamt 50 % muss genau 6 dB leiser sein: ${std.lufs} -> ${quiet.lufs} LUFS`);
  assert.ok(loud.lufs > std.lufs + 0.5 && loud.peakOutDb <= CEILING_DB + 0.01, `Gesamt 200 %: ${loud.lufs} LUFS, Spitze ${loud.peakOutDb} dBFS`);
  assert.ok(bUp.lufs > std.lufs && bDown.lufs < std.lufs, `Klang b: 200 % -> ${bUp.lufs}, 0 % -> ${bDown.lufs} LUFS`);
  assert.equal(bDown.voices, events.filter((e) => e.type === 'a').length, '0 % muss den Klang entfernen');
});

test('Lautstärke je Klang: 100 % ändert nichts, 50 % halbiert, 200 % verdoppelt, 0 % macht stumm; Verstärkung wirkt linear', async () => {
  const audio = { events: { a: { samples: ['impactGlass_light_000'], gain: 0.5 }, b: { samples: ['impactGlass_medium_000'], gain: 0.4 } } };
  const samples = await loadSamples(audio);
  const events = [{ seq: 0, step: 30, type: 'a', x: 500, p: 1, c: -1 }, { seq: 1, step: 60, type: 'b', x: 1400, p: 1, c: -1 }, { seq: 2, step: 90, type: 'a', x: 960, p: 1, c: -1 }];
  const base = buildVoices(events, audio, samples);
  assert.deepEqual(buildVoices(events, audio, samples, { volume: { master: 100, a: 100, b: 100 } }), base, '100 % verändert den Klang');
  const mixed = buildVoices(events, audio, samples, { volume: { a: 50, b: 200 } });
  assert.equal(mixed.length, 3);
  mixed.forEach((v, i) => {
    const f = v.type === 'a' ? 0.5 : 2;
    assert.ok(Math.abs(v.gl - base[i].gl * f) < 1e-12 && Math.abs(v.gr - base[i].gr * f) < 1e-12, `Stimme ${i} (${v.type}) falsch skaliert`);
  });
  assert.deepEqual(buildVoices(events, audio, samples, { volume: { b: 0 } }).map((v) => v.type), ['a', 'a'], '0 % muss den Klang entfernen');
  const total = 2 * SAMPLE_RATE;
  const r100 = processTrack(base, total, { limit: false }), r50 = processTrack(base, total, { gain: 0.5, limit: false });
  assert.ok(Math.abs(r100.lufs - r50.lufs - 6.02) < 0.02, `halbe Verstärkung: ${r100.lufs} -> ${r50.lufs} LUFS`);
  assert.ok(Math.abs(r100.peakInDb - r50.peakInDb - 6.02) < 0.02);
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
    await assertYouTubeLoudness(r);
    assert.ok(r.audioEvents.every((e) => e.step >= 1 && e.step <= 5 * 60), 'Ereignis außerhalb der Videolänge');
    const lag = await audioLag(r.file, r.audioEvents, 5);
    assert.ok(lag >= -1 && lag <= 4, `Ton liegt ${lag * 5} ms neben den Ereignissen`);
    const side = JSON.parse(readFileSync(r.sidecar, 'utf8'));
    assert.deepEqual([side.audio.codec, side.audio.events, side.audio.digest], ['aac', r.audio.events, r.audio.digest]);
    assert.deepEqual(side.audio.encoded,r.audio.encoded);
    assert.ok(verifyResult({...r,audio:{...r.audio,encoded:{silent:false,truePeakDb:-.7}}}).some(e=>e.includes('True-Peak')));
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

test('Seeschlacht: Tonspur aus Schuss, Treffer, Platscher, Tock und Tink; Dichtebegrenzung hält die Stimmenzahl klein', async () => {
  const r = await exportVideo({ seed: 5, video: { resolution: 720, durationSec: 4 } }, { out: join(dir, 'naval.mp4'), ...fast });
  assert.deepEqual(verifyResult(r), []);
  assert.deepEqual([r.cfg.scenario, r.audioStream.codec, r.audioStream.channels], ['naval', 'aac', 2]);
  assert.ok(r.audio.voices > 5 && r.audio.voices < r.audio.events, `Stimmen ${r.audio.voices} bei ${r.audio.events} Ereignissen`);
  assert.ok(r.audio.voices / 4 < 12, `zu dichter Ton: ${(r.audio.voices / 4).toFixed(1)} Stimmen je Sekunde`);
  await assertYouTubeLoudness(r);
});

// Hochformat: leiser (Gesamt 50 %, Platscher aus); Querformat: lauter (Gesamt 150 %, Platscher 200 %)
for (const [aspect, volume, louder] of [['9:16', { master: 50, splash: 0 }, false], ['16:9', { master: 150, splash: 200 }, true]]) {
  test(`Seeschlacht ${aspect}: Standard = −14 LUFS, Regler machen ${louder ? 'lauter' : 'leiser'}, Simulation unverändert`, async () => {
    const video = { aspect, resolution: 720, durationSec: 3 }, tag = aspect.replace(':', 'x');
    const std = await exportVideo({ seed: 5, video }, { out: join(dir, `naval_std_${tag}.mp4`), ...fast });
    const alt = await exportVideo({ seed: 5, video: { ...video, volume } }, { out: join(dir, `naval_alt_${tag}.mp4`), ...fast });
    assert.deepEqual(verifyResult(alt), []);
    await assertYouTubeLoudness(std);
    assert.equal(alt.stateHash, std.stateHash, 'Lautstärke verändert die Simulation');
    assert.equal(alt.audio.events, std.audio.events);
    assert.equal(alt.audio.standardLufs, std.audio.standardLufs, 'Einmessung hängt von den Reglern ab');
    if (louder) {
      assert.ok(alt.audio.lufs > std.audio.lufs + 1.5, `lauter: ${std.audio.lufs} -> ${alt.audio.lufs} LUFS`);
      assert.ok(alt.audio.peakOutDb <= CEILING_DB + 0.01, `Spitze ${alt.audio.peakOutDb} dBFS`);
    } else {
      assert.ok(alt.audio.lufs < std.audio.lufs - 4, `leiser: ${std.audio.lufs} -> ${alt.audio.lufs} LUFS`);
      assert.ok(alt.audio.voices < std.audio.voices, `Platscher nicht stumm: ${alt.audio.voices} von ${std.audio.voices} Stimmen`);
    }
    assert.deepEqual(JSON.parse(readFileSync(alt.sidecar, 'utf8')).config.video.volume, { master: 100, shot: 100, hit: 100, splash: 100, land: 100, reload: 100, ...volume });
  });
}

test('Szenario ohne Klangtabelle exportiert ohne Tonspur', async () => {
  const r = await exportVideo({ scenario: 'dummy', seed: 2, video: { aspect: '16:9', resolution: 720, durationSec: 1 } },
    { out: join(dir, 'dummy.mp4'), scripts: [join(ROOT, 'test', 'fixtures', 'dummy-scenario.js')], ...fast });
  assert.deepEqual(verifyResult(r), []);
  assert.deepEqual([r.cfg.scenario, r.audio, r.audioStream], ['dummy', null, null]);
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
  assert.deepEqual(await state(), { dis: false, on: true, cfg: true }, 'Seeschlacht hat Ton');
  await page.selectOption('#scenario', 'marble');
  assert.deepEqual(await state(), { dis: false, on: true, cfg: true });
  await page.uncheck('#audio');
  assert.equal((await state()).cfg, false);
  await page.reload(); await ready();
  assert.deepEqual(await state(), { dis: false, on: false, cfg: false }, 'Stummoption nach Neuladen');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Oberfläche: Lautstärkeregler gesamt und je Klang, gelten in Hoch- und Querformat und bleiben gespeichert', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } }), page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const ready = () => page.waitForFunction(() => window.EBS && window.EBS.app && window.EBS.app.sim, null, { timeout: 30000 });
  const vol = () => page.evaluate(() => window.EBS.app.cfg.video.volume);
  const slide = async (k, v) => { await page.fill('#vol-' + k, String(v)); await page.dispatchEvent('#vol-' + k, 'input'); };
  const sliders = () => page.evaluate(() => [...document.querySelectorAll('#volumeControls .ctl')].map((d) => ({
    label: d.querySelector('label').textContent.trim(), dis: d.querySelector('input').disabled })));
  await page.goto(pathToFileURL(INDEX).href); await ready();
  // Normalisierung: 0–200 %, ganze Zahlen, fehlend = 100, unbekannte Klänge fallen weg; flache Form aus dem Teilen-Link
  assert.deepEqual(await page.evaluate(() => [
    EBS.normalizeConfig({ video: { volume: { master: 250, shot: -5, hit: '155.4', foo: 30 } } }).video.volume,
    EBS.normalizeConfig({ 'vol.splash': '20' }).video.volume,
    EBS.normalizeConfig({ scenario: 'marble', video: { volume: { master: 60, shot: 10 } } }).video.volume.shot,
  ]), [{ master: 200, shot: 0, hit: 155, splash: 100, land: 100, reload: 100 }, { master: 100, shot: 100, hit: 100, splash: 20, land: 100, reload: 100 }, undefined]);
  assert.deepEqual(await sliders(), [['Gesamtlautstärke 100 % · −14 LUFS', false], ['Kanonenschuss 100 %', false], ['Treffer 100 %', false], ['Platscher 100 %', false],
    ['Kugel am Grund 100 %', false], ['Nachladen 100 %', false]]
    .map(([label, dis]) => ({ label, dis })));
  assert.equal(await page.getAttribute('#vol-shot', 'max'), '200');
  await slide('master', 70); await slide('splash', 25); await slide('shot', 150);
  const want = { master: 70, shot: 150, hit: 100, splash: 25, land: 100, reload: 100 };
  assert.deepEqual(await vol(), want);
  assert.deepEqual(await Promise.all(['#vo-master', '#vo-shot', '#vo-splash'].map((s) => page.textContent(s))), ['70 % · ≈ −17 LUFS', '150 % · +3,5 dB', '25 % · −12,0 dB']);
  await page.click('#segFormat button[data-v="16:9"]');
  assert.equal(await page.evaluate(() => window.EBS.app.cfg.video.aspect), '16:9');
  assert.deepEqual(await vol(), want, 'Querformat setzt die Lautstärke zurück');
  await page.reload(); await ready();
  assert.deepEqual(await vol(), want, 'Lautstärke nach Neuladen');
  assert.deepEqual([await page.inputValue('#vol-splash'), await page.inputValue('#vol-shot')], ['25', '150']);
  await page.click('#segFormat button[data-v="9:16"]');
  assert.deepEqual(await vol(), want, 'Hochformat setzt die Lautstärke zurück');
  // ohne Ton gesperrt; „Alle auf 100 %“ setzt zurück
  await page.uncheck('#audio');
  assert.ok((await sliders()).every((s) => s.dis), 'Regler bei ausgeschaltetem Ton nicht gesperrt');
  await page.check('#audio');
  await page.click('#btnVolumeReset');
  assert.deepEqual(await vol(), { master: 100, shot: 100, hit: 100, splash: 100, land: 100, reload: 100 });
  // Kugelfabrik: eigene Klänge
  await page.selectOption('#scenario', 'marble');
  assert.equal((await sliders()).length, 10);
  assert.deepEqual(Object.keys(await vol()), ['master', 'hopper', 'tick', 'pick', 'belt', 'flap', 'clink', 'valve', 'rail', 'lift']);
  assert.deepEqual(errors, []);
  await ctx.close();
});
