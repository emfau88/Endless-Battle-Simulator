// Deterministischer Videoexport – szenariounabhängig:
//   Konfiguration -> Seite normalisiert sie (Szenario, Seed, Video) -> feste Physikschritte pro Frame
//   -> Frame rendern (unabhängig von Echtzeit) -> JPEG per Pipe an FFmpeg -> H.264-MP4 (+ JSON mit Konfiguration).
//   Keine Einzelbilder auf der Platte.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { launchBrowser, openExportPage, ROOT } from './browser.mjs';
import { loadSamples, SAMPLE_RATE } from './audio.mjs';
import { renderTrackAsync } from './audio-job.mjs';
import { abortError, throwIfAborted, run } from './process.mjs';
import { publishOutputs } from './output.mjs';
import { sourceProvenance, playwrightVersion, exportRecipe } from './provenance.mjs';
export { run } from './process.mjs';

export const ffmpegBin = () => process.env.FFMPEG_PATH || 'ffmpeg';
export const ffprobeBin = () => process.env.FFPROBE_PATH || 'ffprobe';

export async function checkFfmpeg({ signal } = {}) {
  const v = await run(ffmpegBin(), ['-hide_banner', '-version'], { signal });
  if (v.code !== 0) throw new Error(`FFmpeg nicht gefunden (${ffmpegBin()}). Bitte installieren oder FFMPEG_PATH setzen.`);
  const enc = await run(ffmpegBin(), ['-hide_banner', '-encoders'], { signal });
  if (!/libx264/.test(enc.stdout)) throw new Error('FFmpeg wurde ohne libx264 (H.264) gebaut.');
  const p = await run(ffprobeBin(), ['-version'], { signal });
  if (p.code !== 0) throw new Error(`ffprobe nicht gefunden (${ffprobeBin()}). Bitte installieren oder FFPROBE_PATH setzen.`);
  return v.stdout.split(/\r?\n/)[0];
}

/** Liest Auflösung, Bildrate, Dauer, Bitrate und Frameanzahl einer Videodatei aus. */
export async function probeVideo(file, { signal } = {}) {
  const r = await run(ffprobeBin(), ['-v', 'error', '-select_streams', 'v:0', '-count_packets',
    '-show_entries', 'stream=codec_name,profile,width,height,r_frame_rate,avg_frame_rate,nb_read_packets,pix_fmt,color_space:format=duration,size,bit_rate',
    '-of', 'json', file], { signal });
  if (r.code !== 0) throw new Error('ffprobe fehlgeschlagen: ' + r.stderr.trim());
  const j = JSON.parse(r.stdout), s = j.streams[0], f = j.format;
  const rate = (x) => { const [a, b] = String(x).split('/').map(Number); return b ? a / b : a; };
  // Tonspur (falls vorhanden)
  const a = await run(ffprobeBin(), ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_name,sample_rate,channels,duration', '-of', 'json', file], { signal });
  if (a.code !== 0) throw new Error('ffprobe (Tonspur) fehlgeschlagen: ' + a.stderr.trim());
  const as = a.code === 0 ? (JSON.parse(a.stdout).streams || [])[0] : null;
  return {
    audioStream: as ? { codec: as.codec_name, sampleRate: Number(as.sample_rate), channels: as.channels, duration: Number(as.duration) } : null,
    codec: s.codec_name, profile: s.profile, pixFmt: s.pix_fmt, colorSpace: s.color_space, width: s.width, height: s.height,
    fps: rate(s.r_frame_rate), avgFps: rate(s.avg_frame_rate), frames: Number(s.nb_read_packets),
    duration: Number(f.duration), sizeBytes: Number(f.size), bitrateKbps: Math.round(Number(f.bit_rate) / 1000),
  };
}

/** Standard-Dateiname aus der (normalisierten) Konfiguration, z. B. naval_seed42_9x16_1080p30_20s.mp4 */
export function defaultFileName(cfg, suffix = '') {
  const v = cfg.video, d = v.durationSec;
  const dur = d % 3600 === 0 ? `${d / 3600}h` : d % 60 === 0 ? `${d / 60}min` : `${d}s`;
  const tempo = v.tempo && v.tempo !== 1 ? `_${v.tempo}x` : '';
  return `${cfg.scenario}_seed${cfg.seed}_${v.aspect.replace(':', 'x')}_${v.resolution}p${v.fps}_${dur}${tempo}${suffix}.mp4`;
}

/** Encoder-Argumente: Qualität über CRF oder feste Bitrate (kbit/s). */
export function encoderArgs(q) {
  const args = ['-c:v', 'libx264', '-preset', q.preset || 'medium', '-profile:v', 'high'];
  if (q.bitrate) args.push('-b:v', `${q.bitrate}k`, '-maxrate', `${Math.round(q.bitrate * 1.5)}k`, '-bufsize', `${q.bitrate * 2}k`);
  else args.push('-crf', String(q.crf ?? 20));
  return args;
}

async function openWithRenderer(cfg, gpu, log, scripts, signal) {
  const tryOpen = async (useGpu) => {
    throwIfAborted(signal);
    const browser = await launchBrowser({ gpu: useGpu });
    const abort = () => { browser.close().catch(() => {}); };
    signal?.addEventListener('abort', abort, { once: true });
    try {
      throwIfAborted(signal);
      const { page, errors, info } = await openExportPage(browser, cfg, { scripts });
      throwIfAborted(signal);
      return { browser, page, errors, info, gpu: useGpu && !/swiftshader|llvmpipe|software/i.test(info.glRenderer || '') };
    } catch (e) { await browser.close().catch(() => {}); throw e; }
    finally { signal?.removeEventListener('abort', abort); }
  };
  if (gpu === false) return tryOpen(false);
  try {
    const r = await tryOpen(true);
    if (gpu === 'auto' && /swiftshader|llvmpipe|software/i.test(r.info.glRenderer || '')) {
      log('Keine Hardware-Grafik verfügbar – nutze Software-Renderer.');
      await r.browser.close();
      return tryOpen(false);
    }
    return r;
  } catch (e) {
    throwIfAborted(signal);
    if (gpu === true || e.code) throw e;   // Konfigurationsfehler: ein zweiter Versuch ohne GPU hilft nicht
    log('GPU-Start fehlgeschlagen (' + e.message + ') – nutze Software-Renderer.');
    return tryOpen(false);
  }
}

/**
 * Exportiert ein MP4. Alle Video-Einstellungen kommen aus cfg.video (Seitenverhältnis, Auflösung, fps, Dauer, Qualität).
 * @param {object} cfg  Konfiguration (Schema v1 oder flaches Phase-A-Format)
 * @param {object} opts
 *   out       Ausgabedatei | (info) => Pfad | leer = output/<Standardname>
 *   onProgress, signal (AbortSignal), log
 *   gpu       'auto' | true | false
 *   jpegQuality  Qualität der Zwischenframes (0..1)
 *   encoder   { crf, preset, bitrate } – überschreibt cfg.video.quality
 *   scripts   zusätzliche Szenario-Dateien
 *   sidecar   JSON mit Konfiguration neben das Video schreiben (Standard: true)
 */
export async function exportVideo(cfg, opts = {}) {
  const recipe = exportRecipe(cfg);
  cfg = recipe.config;
  opts = { ...recipe.options, ...opts };
  const { onProgress = () => {}, signal, gpu = process.env.EBS_GPU === '0' ? false : 'auto', log = () => {}, scripts = [], sidecar = true } = opts;
  const jpegQuality = opts.jpegQuality ?? opts.quality ?? 0.92;
  if (!Number.isFinite(jpegQuality) || jpegQuality < 0.5 || jpegQuality > 1) throw new Error('JPEG-Qualität muss zwischen 0.5 und 1 liegen.');
  if (opts.encoder) {
    const quality = { ...cfg?.video?.quality };
    cfg = { ...cfg, video: { ...cfg?.video, quality } };
    for (const key of ['crf', 'preset', 'bitrate']) {
      if (cfg[key] !== undefined) quality[key] = cfg[key];
      if (opts.encoder[key] !== undefined) quality[key] = opts.encoder[key];
      delete cfg[key];
    }
  }
  const t0 = Date.now();
  let session = null, ff = null, ffClosed = null, workdir = null, preserveRecovery = false;
  let frame = 0, total = 0, fps = 30, tempo = 1, heapMB = null;
  const progress = (phase, value, detail = {}) => {
    throwIfAborted(signal);
    const elapsedSec = (Date.now() - t0) / 1000, renderFps = elapsedSec ? frame / elapsedSec : 0;
    onProgress({ phase, frame, totalFrames: total, progress: value, elapsedSec, renderFps,
      etaSec: phase === 'rendering' && renderFps ? (total - frame) / renderFps : null,
      simTime: frame / fps * tempo, heapMB, ...detail });
    throwIfAborted(signal);
  };
  const cancelActive = () => {
    if (ff && ff.exitCode === null && ff.signalCode === null) ff.kill('SIGKILL');
    session?.browser.close().catch(() => {});
  };
  signal?.addEventListener('abort', cancelActive, { once: true });
  try {
    progress('starting', 0);
    const ffVersion = await checkFfmpeg({ signal });
    const ffprobeVersion = (await run(ffprobeBin(), ['-version'], { signal })).stdout.split(/\r?\n/)[0];
    const provenance = await sourceProvenance({ scripts, signal });
    session = await openWithRenderer(cfg, gpu, log, scripts, signal);
    throwIfAborted(signal);
    const { page, errors, info } = session;
    const c = info.cfg, q = c.video.quality;
    fps = info.fps; total = Math.round(c.video.durationSec * fps); tempo = c.video.tempo;
    const episodeDuration = total / fps;
    let clip = null;
    if (opts.clip !== undefined) {
      if (!info.supportsClips) throw new Error(`Ausschnitte sind für das Szenario "${c.scenario}" noch nicht freigegeben (derzeit: scrap).`);
      const { startSec, durationSec } = opts.clip || {};
      if (![startSec, durationSec].every(Number.isFinite) || startSec < 0 || durationSec <= 0 ||
          startSec + durationSec > episodeDuration + 1e-9 ||
          [startSec, durationSec].some(s => Math.abs(s * fps - Math.round(s * fps)) > 1e-7)) {
        throw new Error('Ausschnitt benötigt Start ≥ 0 und Dauer > 0 auf Bildgrenzen, innerhalb der Episodendauer.');
      }
      clip = { startSec, durationSec }; total = Math.round(durationSec * fps);
    }
    const versions = { node: process.versions.node, playwright: playwrightVersion, chromium: session.browser.version(),
      pixi: info.pixi, matter: info.matter, ffmpeg: ffVersion, ffprobe: ffprobeVersion };
    const exportOptions = { jpegQuality, gpu: session.gpu };
    if (clip) exportOptions.clip = clip;
    const defaultName = clip ? defaultFileName(c, `_clip_${clip.startSec}s_${clip.durationSec}s`) : defaultFileName(c);
    const outPath = resolve(typeof opts.out === 'function' ? opts.out(info) : opts.out || join(ROOT, 'output', defaultName));
    const sidecarPath = outPath.replace(/\.mp4$/i, '') + '.json';
    if (sidecar && sidecarPath === outPath) throw new Error('Video und Metadaten benötigen unterschiedliche Dateinamen.');
    await mkdir(dirname(outPath), { recursive: true });
    workdir = await mkdtemp(join(dirname(outPath), '.ebs-export-'));
    const tmp = join(workdir, 'video.mp4'), wav = join(workdir, 'audio.wav'), mux = join(workdir, 'mux.mp4');
    log(`Szenario: ${info.scenarioTitle} · Seed ${c.seed} · ${c.video.aspect} ${info.width}×${info.height} @ ${fps} fps · ${total} Frames`);
    log(`Renderer: ${info.glRenderer || info.renderer} · Encoder: ${q.bitrate ? q.bitrate + ' kbit/s' : 'CRF ' + q.crf} (${q.preset})`);
    if (info.width !== info.expected.width || info.height !== info.expected.height) {
      throw new Error(`Canvas ${info.width}×${info.height} statt ${info.expected.width}×${info.expected.height}`);
    }
    const audioDef = c.video.audio && info.audio ? info.audio : null, events = [];
    let nextSeq = 0, lostEvents = 0;
    const collectEvents = async () => {
      if (!audioDef) return;
      const ev = await page.evaluate(s => window.exportAPI.events(s), nextSeq);
      if (ev.length) {
        lostEvents += ev[0].seq - nextSeq;
        for (const e of ev) events.push(e);
        nextSeq = ev[ev.length - 1].seq + 1;
      }
    };
    // Simulate in small, cancellable chunks and drain the bounded event queue.
    // Keep the ORIGINAL episode config and Scrap's round/seed sequence.
    // Other scenarios must opt in only after validating their renderer state.
    const simulateWithoutCapture = async (seconds, stage, value) => {
      let remaining = Math.round(seconds * 60);
      while (remaining > 0) {
        progress('simulating', value, { simulationStage: stage });
        const steps = Math.min(60, remaining);
        await page.evaluate(s => window.exportAPI.simulate(s / 60), steps);
        await collectEvents(); remaining -= steps;
        if (errors.length) throw errors[0];
      }
      const checked = await page.evaluate(() => window.exportAPI.check());
      if (!checked.ok) throw new Error('Simulationsprüfung: ' + checked.errors.join('; '));
    };
    if (clip?.startSec) await simulateWithoutCapture(clip.startSec, 'pre-roll', .01);
    progress('rendering', 0.02);
    ff = spawn(ffmpegBin(), [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      // Canvas-JPEG ist BT.601 Full-Range -> in Standard-Video (BT.709, TV-Range) umrechnen
      '-vf', 'scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p,setparams=range=tv:colorspace=bt709:color_primaries=bt709:color_trc=bt709',
      '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
      ...encoderArgs(q),
      '-r', String(fps), '-g', String(fps * 2), '-movflags', '+faststart',
      '-metadata', `comment=Endless Battle Simulator ${JSON.stringify(c)}`,
      tmp,
    ], { stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true });
    let ffErr = '';
    ff.stderr.on('data', (d) => { ffErr = (ffErr + d).slice(-4000); });
    ff.stdin.on('error', () => {}); // EPIPE etc. wird über ffDone gemeldet
    ffClosed = new Promise((res) => ff.once('close', res));
    const ffDone = new Promise((res, rej) => {
      ff.on('error', rej);
      ff.on('close', (code, sig) => (code === 0 ? res() : rej(new Error(`FFmpeg wurde mit ${code ?? sig} beendet. ${ffErr.trim()}`))));
    });
    ffDone.catch(() => {});
    const ffDied = ffDone.then(() => { throw new Error('FFmpeg hat die Eingabe vorzeitig geschlossen.'); });
    ffDied.catch(() => {});

    const batch = opts.batch || (info.width * info.height > 4e6 ? 3 : 10); // 1440p/4K: kleinere Pakete
    // Ton: nur wenn gewünscht und das Szenario eine Klangtabelle mitbringt; Ereignisse werden je Paket abgeholt
    while (frame < total) {
      throwIfAborted(signal);
      if (errors.length) throw errors[0];
      const n = Math.min(batch, total - frame);
      const frames = await page.evaluate(([k, jq]) => window.exportAPI.renderFrames(k, jq), [n, jpegQuality]);
      for (const b64 of frames) {
        throwIfAborted(signal);
        if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await Promise.race([once(ff.stdin, 'drain'), ffDied]);
      }
      frame += n;
      await collectEvents();
      if (frame % (fps * 60) < n || frame === total) heapMB = (await page.evaluate(() => window.exportAPI.heap())) / 1048576;
      progress('rendering', 0.02 + 0.76 * frame / total);
    }
    const check = await page.evaluate(() => window.exportAPI.check());
    const snapshot = await page.evaluate(() => window.exportAPI.snapshot());
    const hash = await page.evaluate(() => window.exportAPI.hash());
    if (errors.length) throw errors[0];
    ff.stdin.end();
    progress('encoding', 0.79);
    await ffDone;
    // A clip uses the same full-episode mix/normalization as a continuous
    // export. Include tails crossing the cut and later events affecting LUFS;
    // only then trim PCM to the requested video interval during muxing.
    if (clip && audioDef) await simulateWithoutCapture(episodeDuration - clip.startSec - clip.durationSec, 'audio-tail', .795);
    await session.browser.close(); session = null;
    let audio = null;
    if (audioDef) {
      // Tonspur mischen (WAV) und ohne Neukodierung des Bildes ins MP4 einbinden
      progress('audio-loading', 0.80);
      const samples = await loadSamples(audioDef, { ffmpeg: ffmpegBin(), signal });
      const volume = c.video.volume || null;
      const asked = cfg && cfg.video && cfg.video.volume && typeof cfg.video.volume === 'object' ? Object.keys(cfg.video.volume) : [];
      const unknown = asked.filter((k) => !(volume && k in volume));
      if (unknown.length) log(`Lautstärke für unbekannte Klänge ignoriert: ${unknown.join(', ')} (vorhanden: ${Object.keys(volume || {}).join(', ')})`);
      const changed = Object.entries(volume || {}).filter(([, v]) => v !== 100);
      if (changed.length) log(`Lautstärke: ${changed.map(([k, v]) => `${k === 'master' ? 'Gesamt' : audioDef.events[k]?.label || k} ${v} %`).join(', ')}`);
      // Standardmischung auf −14 LUFS (YouTube) einmessen, dann die Regler relativ dazu anwenden
      progress('audio-mixing', 0.82, { audioProgress: 0 });
      const mix = await renderTrackAsync(events, audioDef, samples, { worldW: info.world.w, volume,
        totalSamples: Math.round(episodeDuration * SAMPLE_RATE), file: wav, signal,
        onProgress: (p) => progress('audio-mixing', 0.82 + 0.12 * p, { audioProgress: p }) });
      progress('muxing', 0.95);
      const m = await run(ffmpegBin(), ['-y', '-hide_banner', '-loglevel', 'error', '-i', tmp,
        ...(clip ? ['-ss', String(clip.startSec)] : []), '-i', wav, '-map', '0:v:0', '-map', '1:a:0',
        ...(clip ? ['-t', String(clip.durationSec)] : []),
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', mux], { signal });
      if (m.code !== 0) throw new Error('Ton konnte nicht eingebunden werden: ' + m.stderr.trim());
      await rm(tmp, { force: true }); await rm(wav, { force: true });
      await rename(mux, tmp);
      audio = { events: events.length, eventHash: createHash('sha256').update(JSON.stringify(events)).digest('hex'), lost: lostEvents, ...mix };
      if (clip) Object.assign(audio, { measurementScope: 'full-episode', episodeDurationSec: episodeDuration,
        clip, note: 'Mix/voice/LUFS values describe the full episode before PCM trimming; AAC is encoded for this clip.' });
      log(`Ton${clip ? ' (vollständige Episode vor Ausschnitt)' : ''}: ${audio.events} Ereignisse, ${audio.voices} Stimmen, Lautheit ${audio.lufs} LUFS (Standard ${audio.standardLufs}, Ziel ${audio.targetLufs}), `
        + `Spitze ${audio.peakOutDb} dBFS${audio.limited ? `, Begrenzer bis ${audio.maxReductionDb} dB` : ''}`);
    }
    progress('verifying', 0.97);
    const probe = await probeVideo(tmp, { signal });
    const result = {
      file: outPath, ...probe, expectedFrames: total, expectedDuration: total / fps, expectedFps: fps,
      expectedWidth: info.expected.width, expectedHeight: info.expected.height, renderer: info.glRenderer || info.renderer,
      ffmpeg: ffVersion, encoder: q, elapsedSec: (Date.now() - t0) / 1000, heapMB, simCheck: check, snapshot, stateHash: hash, cfg: c,
      audio, audioEvents: events, provenance, versions, exportOptions,
    };
    const issues = verifyResult(result);
    if (issues.length) throw new Error('Exportprüfung fehlgeschlagen: ' + issues.join('; '));
    progress('saving', 0.99);
    const files = [{ staged: tmp, target: outPath }];
    if (sidecar) {
      result.sidecar = sidecarPath;
      const jsonFile = join(workdir, 'metadata.json');
      await writeFile(jsonFile, JSON.stringify({
        schemaVersion: 2, generator: 'Endless Battle Simulator', createdAt: new Date().toISOString(),
        // "config" lässt sich direkt wieder einlesen: node export.mjs --config <diese Datei>
        config: c, exportOptions, provenance, stateHash: hash, summary: snapshot.summary || null,
        video: { file: outPath.split(/[\\/]/).pop(), width: probe.width, height: probe.height, fps: probe.fps, duration: probe.duration, frames: probe.frames, codec: probe.codec, encoder: q },
        audio: audio ? { ...audio, codec: probe.audioStream ? probe.audioStream.codec : null, sampleRate: SAMPLE_RATE } : null,
        versions, renderer: result.renderer,
      }, null, 2) + '\n');
      files.push({ staged: jsonFile, target: sidecarPath });
    }
    await publishOutputs(files, { backupDir: workdir, signal });
    // Ab hier sind beide Dateien übernommen. Ein danach eintreffender Abbruch ist zu spät.
    // 100 %/done setzt der Aufrufer erst nach erfolgreicher Rückkehr (einschließlich Aufräumen).
    return result;
  } catch (e) {
    preserveRecovery = !!e.recoveryDir;
    throw signal?.aborted && !preserveRecovery ? abortError() : e;
  } finally {
    signal?.removeEventListener('abort', cancelActive);
    if (ff && ff.exitCode === null && ff.signalCode === null) { ff.stdin.destroy(); ff.kill('SIGKILL'); }
    if (ffClosed) await ffClosed;
    if (session) await session.browser.close().catch(() => {});
    if (workdir && !preserveRecovery) await rm(workdir, { recursive: true, force: true }).catch((e) => log(`Temporärdateien bitte prüfen: ${workdir} (${e.message})`));
  }
}

/** Vergleicht das Ergebnis mit den Sollwerten. Gibt eine Liste von Abweichungen zurück (leer = ok). */
export function verifyResult(r) {
  const issues = [];
  if (r.codec !== 'h264') issues.push(`Codec ${r.codec} statt h264`);
  if (r.width !== r.expectedWidth || r.height !== r.expectedHeight) issues.push(`Auflösung ${r.width}×${r.height} statt ${r.expectedWidth}×${r.expectedHeight}`);
  if (!Number.isFinite(r.fps) || Math.abs(r.fps - r.expectedFps) > 0.01) issues.push(`Bildrate ${r.fps} statt ${r.expectedFps}`);
  if (r.frames !== r.expectedFrames) issues.push(`${r.frames} Frames statt ${r.expectedFrames}`);
  if (!Number.isFinite(r.duration) || Math.abs(r.duration - r.expectedDuration) > 1.5 / r.expectedFps) issues.push(`Dauer ${r.duration}s statt ${r.expectedDuration}s`);
  if (r.simCheck && !r.simCheck.ok) issues.push('Simulationsprüfung: ' + r.simCheck.errors.join('; '));
  if (r.audio) {
    if (!r.audioStream) issues.push('Tonspur fehlt');
    else {
      if (!Number.isFinite(r.audioStream.duration) || Math.abs(r.audioStream.duration - r.expectedDuration) > 0.06) issues.push(`Tonspur ${r.audioStream.duration}s statt ${r.expectedDuration}s`);
      if (r.audioStream.codec !== 'aac' || r.audioStream.sampleRate !== SAMPLE_RATE || r.audioStream.channels !== 2) issues.push('Tonspur ist nicht AAC/Stereo/48 kHz');
    }
    if (r.audio.lost) issues.push(`${r.audio.lost} Tonereignisse verloren`);
  } else if (r.audioStream) issues.push('unerwartete Tonspur');
  return issues;
}
