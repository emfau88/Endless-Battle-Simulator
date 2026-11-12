#!/usr/bin/env node
// Lokaler Server: liefert die Simulation aus und steuert den Videoexport für den Button im Browser.
//   npm start  ->  http://localhost:8080
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, sep, basename } from 'node:path';
import { ROOT } from './lib/browser.mjs';
import { exportVideo, verifyResult, checkFfmpeg, defaultFileName } from './lib/exporter.mjs';

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '127.0.0.1';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.mp4': 'video/mp4', '.svg': 'image/svg+xml', '.map': 'application/json', '.md': 'text/markdown; charset=utf-8',
};
const ALLOWED = ['index.html', 'src', 'vendor', 'output', 'presets', 'README.md'];

let job = { state: 'idle' };
let exportTask = Promise.resolve();

const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); };
const publicJob = () => { const { controller, ...rest } = job; return rest; };

async function readBody(req) {
  let data = '';
  for await (const chunk of req) { data += chunk; if (data.length > 1e5) throw new Error('Anfrage zu groß'); }
  return data ? JSON.parse(data) : {};
}

function startExport(cfg) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
  const controller = new AbortController();
  job = { state: 'running', phase: 'starting', progress: 0, frame: 0, totalFrames: 0, startedAt: Date.now(), controller, log: [] };
  const current = job;
  exportTask = exportVideo(cfg, {
    // Dateiname aus der von der Seite normalisierten Konfiguration (Szenario, Seed, Format, Auflösung, Dauer)
    out: (info) => {
      current.file = defaultFileName(info.cfg, '_' + stamp);
      current.url = `/output/${current.file}`;
      current.cfg = info.cfg;
      return join(ROOT, 'output', current.file);
    },
    signal: controller.signal,
    log: (m) => { current.log.push(m); console.log('[export]', m); },
    onProgress: (p) => Object.assign(current, p),
  }).then((r) => {
    const issues = verifyResult(r);
    Object.assign(current, { state: issues.length ? 'error' : 'done', phase: 'done', progress: 1, error: issues.join('; ') || undefined,
      result: { width: r.width, height: r.height, fps: r.fps, duration: r.duration, frames: r.frames, sizeBytes: r.sizeBytes, renderer: r.renderer, elapsedSec: r.elapsedSec } });
    console.log(`[export] fertig: ${current.file} (${r.frames} Frames, ${r.duration.toFixed(2)} s)`);
  }).catch((e) => {
    Object.assign(current, { state: e.name === 'AbortError' ? 'cancelled' : 'error', error: e.message });
    console.log(`[export] ${current.state}: ${e.message}`);
  });
}

async function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath).replace(/^\/+/, '') || 'index.html';
  rel = normalize(rel);
  const top = rel.split(sep)[0];
  if (rel.startsWith('..') || !ALLOWED.includes(top)) { res.writeHead(404); res.end('Nicht gefunden'); return; }
  const file = join(ROOT, rel);
  let st;
  try { st = await stat(file); } catch { res.writeHead(404); res.end('Nicht gefunden'); return; }
  if (!st.isFile()) { res.writeHead(404); res.end('Nicht gefunden'); return; }
  const type = TYPES[extname(file).toLowerCase()] || 'application/octet-stream';
  const headers = { 'content-type': type, 'accept-ranges': 'bytes', 'cache-control': 'no-cache' };
  if (type === 'video/mp4') headers['content-disposition'] = `inline; filename="${basename(file)}"`;
  const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0, end = range[2] ? Math.min(Number(range[2]), st.size - 1) : st.size - 1;
    if (start > end || start >= st.size) { res.writeHead(416, { 'content-range': `bytes */${st.size}` }); res.end(); return; }
    res.writeHead(206, { ...headers, 'content-range': `bytes ${start}-${end}/${st.size}`, 'content-length': end - start + 1 });
    createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { ...headers, 'content-length': st.size });
  createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname === '/api/export' && req.method === 'GET') return json(res, 200, publicJob());
    if (url.pathname === '/api/export' && req.method === 'POST') {
      if (job.state === 'running') return json(res, 409, { ...publicJob(), error: 'Es läuft bereits ein Export.' });
      const body = await readBody(req);
      // Konfiguration wird unverändert weitergereicht; die Simulationsseite normalisiert und begrenzt alle Werte.
      startExport(typeof body === 'object' && body ? body : {});
      return json(res, 202, publicJob());
    }
    if (url.pathname === '/api/export/cancel' && req.method === 'POST') {
      if (job.state === 'running') { job.cancelRequested = true; job.controller.abort(); }
      return json(res, 200, publicJob());
    }
    if (url.pathname === '/api/health') {
      let ffmpeg = null;
      try { ffmpeg = await checkFfmpeg(); } catch (e) { ffmpeg = 'FEHLT: ' + e.message; }
      return json(res, 200, { ok: true, ffmpeg });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    return serveStatic(req, res, url.pathname);
  } catch (e) {
    return json(res, 500, { error: e.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Endless Battle Simulator läuft auf http://localhost:${PORT}`);
  console.log('Beenden mit Strg+C.');
});
const shutdown = async () => {
  if (job.state === 'running') job.controller.abort();
  server.close();
  await exportTask; // Worker, Chromium, FFmpeg und temporäre Dateien zuerst vollständig aufräumen.
  server.closeAllConnections();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
