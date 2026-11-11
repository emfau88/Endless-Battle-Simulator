// Deterministischer Videoexport – szenariounabhängig:
//   Konfiguration -> Seite normalisiert sie (Szenario, Seed, Video) -> feste Physikschritte pro Frame
//   -> Frame rendern (unabhängig von Echtzeit) -> JPEG per Pipe an FFmpeg -> H.264-MP4 (+ JSON mit Konfiguration).
//   Keine Einzelbilder auf der Platte.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { launchBrowser, openExportPage, ROOT } from './browser.mjs';

export const ffmpegBin = () => process.env.FFMPEG_PATH || 'ffmpeg';
export const ffprobeBin = () => process.env.FFPROBE_PATH || 'ffprobe';

export function run(cmd, args) {
  return new Promise((res) => {
    let stdout = '', stderr = '';
    let p;
    try { p = spawn(cmd, args, { windowsHide: true }); } catch (e) { res({ code: -1, stdout, stderr: String(e) }); return; }
    p.stdout.on('data', (d) => { stdout += d; });
    p.stderr.on('data', (d) => { stderr += d; });
    p.on('error', (e) => res({ code: -1, stdout, stderr: String(e) }));
    p.on('close', (code) => res({ code, stdout, stderr }));
  });
}

export async function checkFfmpeg() {
  const v = await run(ffmpegBin(), ['-hide_banner', '-version']);
  if (v.code !== 0) throw new Error(`FFmpeg nicht gefunden (${ffmpegBin()}). Bitte installieren oder FFMPEG_PATH setzen.`);
  const enc = await run(ffmpegBin(), ['-hide_banner', '-encoders']);
  if (!/libx264/.test(enc.stdout)) throw new Error('FFmpeg wurde ohne libx264 (H.264) gebaut.');
  const p = await run(ffprobeBin(), ['-version']);
  if (p.code !== 0) throw new Error(`ffprobe nicht gefunden (${ffprobeBin()}). Bitte installieren oder FFPROBE_PATH setzen.`);
  return v.stdout.split(/\r?\n/)[0];
}

/** Liest Auflösung, Bildrate, Dauer, Bitrate und Frameanzahl einer Videodatei aus. */
export async function probeVideo(file) {
  const r = await run(ffprobeBin(), ['-v', 'error', '-select_streams', 'v:0', '-count_packets',
    '-show_entries', 'stream=codec_name,profile,width,height,r_frame_rate,avg_frame_rate,nb_read_packets,pix_fmt,color_space:format=duration,size,bit_rate',
    '-of', 'json', file]);
  if (r.code !== 0) throw new Error('ffprobe fehlgeschlagen: ' + r.stderr.trim());
  const j = JSON.parse(r.stdout), s = j.streams[0], f = j.format;
  const rate = (x) => { const [a, b] = String(x).split('/').map(Number); return b ? a / b : a; };
  return {
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

async function openWithRenderer(cfg, gpu, log, scripts) {
  const tryOpen = async (useGpu) => {
    const browser = await launchBrowser({ gpu: useGpu });
    try {
      const { page, errors, info } = await openExportPage(browser, cfg, { scripts });
      return { browser, page, errors, info };
    } catch (e) { await browser.close().catch(() => {}); throw e; }
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
  const { onProgress = () => {}, signal, gpu = 'auto', log = () => {}, scripts = [], sidecar = true } = opts;
  const jpegQuality = opts.jpegQuality ?? opts.quality ?? 0.92;
  const ffVersion = await checkFfmpeg();
  const t0 = Date.now();
  let session = null, ff = null, tmp = null;
  const abortErr = () => Object.assign(new Error('Export abgebrochen.'), { name: 'AbortError' });
  try {
    if (signal?.aborted) throw abortErr();
    session = await openWithRenderer(cfg, gpu, log, scripts);
    const { page, errors, info } = session;
    const c = info.cfg, fps = info.fps, total = Math.round(c.video.durationSec * fps);
    const q = { ...c.video.quality, ...Object.fromEntries(Object.entries(opts.encoder || {}).filter(([, v]) => v !== undefined)) };
    const outPath = resolve(typeof opts.out === 'function' ? opts.out(info) : opts.out || join(ROOT, 'output', defaultFileName(c)));
    tmp = outPath.replace(/\.mp4$/i, '') + '.part.mp4';
    await mkdir(dirname(outPath), { recursive: true });
    log(`Szenario: ${info.scenarioTitle} · Seed ${c.seed} · ${c.video.aspect} ${info.width}×${info.height} @ ${fps} fps · ${total} Frames`);
    log(`Renderer: ${info.glRenderer || info.renderer} · Encoder: ${q.bitrate ? q.bitrate + ' kbit/s' : 'CRF ' + q.crf} (${q.preset})`);
    if (info.width !== info.expected.width || info.height !== info.expected.height) {
      throw new Error(`Canvas ${info.width}×${info.height} statt ${info.expected.width}×${info.expected.height}`);
    }
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
    const ffDone = new Promise((res, rej) => {
      ff.on('error', rej);
      ff.on('close', (code, sig) => (code === 0 ? res() : rej(new Error(`FFmpeg wurde mit ${code ?? sig} beendet. ${ffErr.trim()}`))));
    });
    ffDone.catch(() => {});
    const ffDied = ffDone.then(() => { throw new Error('FFmpeg hat die Eingabe vorzeitig geschlossen.'); });
    ffDied.catch(() => {});

    const batch = opts.batch || (info.width * info.height > 4e6 ? 3 : 10); // 1440p/4K: kleinere Pakete
    let frame = 0, heapMB = null;
    while (frame < total) {
      if (signal?.aborted) throw abortErr();
      if (errors.length) throw errors[0];
      const n = Math.min(batch, total - frame);
      const frames = await page.evaluate(([k, jq]) => window.exportAPI.renderFrames(k, jq), [n, jpegQuality]);
      for (const b64 of frames) {
        if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await Promise.race([once(ff.stdin, 'drain'), ffDied]);
      }
      frame += n;
      if (frame % (fps * 60) < n || frame === total) heapMB = (await page.evaluate(() => window.exportAPI.heap())) / 1048576;
      const el = (Date.now() - t0) / 1000, rf = frame / el;
      onProgress({ frame, totalFrames: total, progress: frame / total, elapsedSec: el, renderFps: rf, etaSec: (total - frame) / rf, simTime: (frame / fps) * c.video.tempo, heapMB });
    }
    const check = await page.evaluate(() => window.exportAPI.check());
    const snapshot = await page.evaluate(() => window.exportAPI.snapshot());
    const hash = await page.evaluate(() => window.exportAPI.hash());
    ff.stdin.end();
    await ffDone;
    await session.browser.close(); session = null;
    await rm(outPath, { force: true });
    await rename(tmp, outPath); tmp = null;
    const probe = await probeVideo(outPath);
    const result = {
      file: outPath, ...probe, expectedFrames: total, expectedDuration: total / fps, expectedFps: fps,
      expectedWidth: info.expected.width, expectedHeight: info.expected.height, renderer: info.glRenderer || info.renderer,
      ffmpeg: ffVersion, encoder: q, elapsedSec: (Date.now() - t0) / 1000, heapMB, simCheck: check, snapshot, stateHash: hash, cfg: c,
    };
    if (sidecar) {
      result.sidecar = outPath.replace(/\.mp4$/i, '') + '.json';
      await writeFile(result.sidecar, JSON.stringify({
        generator: 'Endless Battle Simulator', createdAt: new Date().toISOString(),
        // "config" lässt sich direkt wieder einlesen: node export.mjs --config <diese Datei>
        config: c, stateHash: hash, summary: snapshot.summary || null,
        video: { file: outPath.split(/[\\/]/).pop(), width: probe.width, height: probe.height, fps: probe.fps, duration: probe.duration, frames: probe.frames, codec: probe.codec, encoder: q },
        versions: { pixi: info.pixi, matter: info.matter, ffmpeg: ffVersion }, renderer: result.renderer,
      }, null, 2) + '\n');
    }
    return result;
  } catch (e) {
    if (ff && ff.exitCode === null) { try { ff.stdin.destroy(); } catch { /* egal */ } ff.kill('SIGKILL'); await once(ff, 'close').catch(() => {}); }
    if (tmp) await rm(tmp, { force: true }).catch(() => {});
    throw e;
  } finally {
    if (session) await session.browser.close().catch(() => {});
  }
}

/** Vergleicht das Ergebnis mit den Sollwerten. Gibt eine Liste von Abweichungen zurück (leer = ok). */
export function verifyResult(r) {
  const issues = [];
  if (r.codec !== 'h264') issues.push(`Codec ${r.codec} statt h264`);
  if (r.width !== r.expectedWidth || r.height !== r.expectedHeight) issues.push(`Auflösung ${r.width}×${r.height} statt ${r.expectedWidth}×${r.expectedHeight}`);
  if (Math.abs(r.fps - r.expectedFps) > 0.01) issues.push(`Bildrate ${r.fps} statt ${r.expectedFps}`);
  if (r.frames !== r.expectedFrames) issues.push(`${r.frames} Frames statt ${r.expectedFrames}`);
  if (Math.abs(r.duration - r.expectedDuration) > 1.5 / r.expectedFps) issues.push(`Dauer ${r.duration}s statt ${r.expectedDuration}s`);
  if (r.simCheck && !r.simCheck.ok) issues.push('Simulationsprüfung: ' + r.simCheck.errors.join('; '));
  return issues;
}
