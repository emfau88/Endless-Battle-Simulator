#!/usr/bin/env node
// Kommandozeilen-Export: node export.mjs --duration 20 --seed 42 [--config presets/naval-standard.json] [--out datei.mp4]
import { readFileSync } from 'node:fs';
import { exportVideo, verifyResult } from './lib/exporter.mjs';

const HELP = `Endless Battle Simulator – Videoexport

  node export.mjs [Optionen]          (Werte aus --config werden von späteren Optionen überschrieben)

Konfiguration
  --config <datei.json>  Vorlage (z. B. presets/naval-standard.json) oder die JSON-Datei neben einem Video
  --scenario <id>        Szenario                                  (Standard naval)
  --seed <n>             Zufalls-Seed                              (Standard 42)
  --param key=wert       Szenario-Parameter, mehrfach möglich      (z. B. --param ships=3)
  --no-hud | --no-camera HUD bzw. Kamerabewegung ausschalten

Video
  --duration <t>         Länge: 20 | 20s | 5m | 1h                 (Standard 20s ohne Vorlage)
  --aspect <a>           9:16 | 16:9 | 1:1   (alternativ --format portrait|landscape|square)
  --resolution <r>       720 | 1080 | 1440 | 2160 (4k)             (kurze Bildseite, Standard 1080)
  --fps <n>              30 | 60                                   (Standard 30)
  --crf <n>              Qualität (kleiner = besser)               (Standard 20)
  --bitrate <b>          feste Bitrate statt CRF, z. B. 12M oder 8000k
  --preset <p>           x264-Preset ultrafast … veryslow          (Standard medium)

Abkürzungen für das Szenario "naval"
  --ships 2–4  --cannons 1–6  --fire-rate 0.25–3  --speed 0.8–1.6  --intensity 0–1 (oder 0–100)  --no-recycle

Technik
  --out <datei.mp4>      Ausgabe (Standard output/<szenario>_seed<n>_<format>_<auflösung>_<dauer>.mp4)
  --gpu | --no-gpu       Grafikkarte erzwingen / Software-Renderer erzwingen (Standard automatisch)
  --jpeg-quality <q>     Qualität der Zwischenframes 0.5–1         (Standard 0.92)
  --script <datei.js>    zusätzliches Szenario-Skript laden (mehrfach möglich)
`;

function parseDuration(v) {
  const m = String(v).trim().match(/^(\d+(?:\.\d+)?)\s*(h|m|min|s)?$/i);
  if (!m) throw new Error(`Ungültige Dauer: ${v}`);
  const n = parseFloat(m[1]), unit = (m[2] || 's').toLowerCase();
  return Math.round(n * (unit === 'h' ? 3600 : unit.startsWith('m') ? 60 : 1));
}
const parseValue = (v) => (v === 'true' ? true : v === 'false' ? false : v !== '' && Number.isFinite(+v) ? +v : v);
const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
const deepMerge = (a, b) => {
  const out = { ...(a || {}) };
  for (const [k, v] of Object.entries(b || {})) out[k] = isObj(v) && isObj(out[k]) ? deepMerge(out[k], v) : v;
  return out;
};

function parseArgs(argv) {
  const o = { file: null, cfg: { params: {}, video: { quality: {} }, view: {} }, opts: { gpu: 'auto', scripts: [] } };
  const { cfg, opts } = o;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => { if (i + 1 >= argv.length) throw new Error(`Wert fehlt für ${a}`); return argv[++i]; };
    switch (a) {
      case '-h': case '--help': o.help = true; break;
      case '--config': o.file = next(); break;
      case '--scenario': cfg.scenario = next(); break;
      case '--seed': cfg.seed = Number(next()); break;
      case '--param': {
        const [k, ...rest] = next().split('=');
        if (!k || !rest.length) throw new Error('--param erwartet key=wert');
        cfg.params[k] = parseValue(rest.join('='));
        break;
      }
      case '--duration': cfg.video.durationSec = parseDuration(next()); break;
      case '--aspect': cfg.video.aspect = next(); break;
      case '--format': { const f = next(); cfg.video.aspect = f === 'landscape' ? '16:9' : f === 'square' ? '1:1' : f === 'portrait' ? '9:16' : f; break; }
      case '--resolution': { const r = next().toLowerCase(); cfg.video.resolution = r === '4k' ? 2160 : parseInt(r, 10); break; }
      case '--fps': cfg.video.fps = Number(next()); break;
      case '--crf': cfg.video.quality.crf = Number(next()); break;
      case '--bitrate': cfg.video.quality.bitrate = next(); break;
      case '--preset': cfg.video.quality.preset = next(); break;
      case '--no-hud': cfg.view.hud = false; break;
      case '--no-camera': cfg.view.camera = false; break;
      case '--ships': cfg.params.ships = Number(next()); break;
      case '--cannons': cfg.params.cannons = Number(next()); break;
      case '--fire-rate': cfg.params.fireRate = Number(next()); break;
      case '--speed': cfg.params.projectileSpeed = Number(next()); break;
      case '--intensity': { const v = Number(next()); cfg.params.intensity = v > 1 ? v / 100 : v; break; }
      case '--no-recycle': cfg.params.recycleVisible = false; break;
      case '--out': opts.out = next(); break;
      case '--gpu': opts.gpu = true; break;
      case '--no-gpu': opts.gpu = false; break;
      case '--quality': case '--jpeg-quality': opts.jpegQuality = Number(next()); break;
      case '--script': opts.scripts.push(next()); break;
      default: throw new Error(`Unbekannte Option: ${a} (Hilfe: --help)`);
    }
  }
  return o;
}

const fmt = (s) => {
  s = Math.max(0, Math.round(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (h ? `${h}:` : '') + String(m).padStart(2, '0') + ':' + String(x).padStart(2, '0');
};

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(2); }
  if (args.help) { console.log(HELP); return; }
  let base = {};
  if (args.file) {
    try {
      const j = JSON.parse(readFileSync(args.file, 'utf8'));
      base = j.config && typeof j.config === 'object' ? j.config : j; // Video-JSON oder Vorlage
    } catch (e) { console.error(`Konfiguration ${args.file} nicht lesbar: ${e.message}`); process.exit(2); }
  }
  const cfg = deepMerge(base, args.cfg);
  if (!(cfg.video && cfg.video.durationSec) && !base.durationSec) cfg.video.durationSec = 20;

  const ac = new AbortController();
  let interrupted = false;
  process.on('SIGINT', () => {
    if (interrupted) process.exit(130);
    interrupted = true;
    process.stderr.write('\nAbbruch angefordert – räume auf …\n');
    ac.abort();
  });

  const isTTY = process.stdout.isTTY;
  let lastLine = 0;
  try {
    const r = await exportVideo(cfg, {
      ...args.opts, signal: ac.signal, log: (m) => console.log('  ' + m),
      onProgress: (p) => {
        const now = Date.now();
        if (!isTTY && now - lastLine < 5000 && p.frame !== p.totalFrames) return;
        lastLine = now;
        const w = 28, f = Math.round(p.progress * w);
        const line = `  [${'#'.repeat(f)}${'.'.repeat(w - f)}] ${(p.progress * 100).toFixed(1).padStart(5)} %  Frame ${p.frame}/${p.totalFrames}  Sim ${fmt(p.simTime)}  ${p.renderFps.toFixed(1)} fps  Rest ${fmt(p.etaSec)}`;
        if (isTTY) process.stdout.write('\r' + line); else console.log(line);
      },
    });
    if (isTTY) process.stdout.write('\n');
    const issues = verifyResult(r);
    console.log(`\nFertig in ${fmt(r.elapsedSec)} (${(r.expectedFrames / r.elapsedSec).toFixed(1)} Frames/s)`);
    console.log(`  Datei:      ${r.file}`);
    console.log(`  Video:      ${r.codec} (${r.profile}, ${r.pixFmt}) ${r.width}×${r.height} @ ${r.fps} fps · ${r.bitrateKbps} kbit/s`);
    console.log(`  Dauer:      ${r.duration.toFixed(3)} s · ${r.frames} Frames · ${(r.sizeBytes / 1048576).toFixed(1)} MB`);
    console.log(`  Szenario:   ${r.cfg.scenario} · Seed ${r.cfg.seed} · Zustand-Hash ${r.stateHash}`);
    if (r.snapshot.summary) console.log(`  Stand:      ${r.snapshot.summary}`);
    if (r.sidecar) console.log(`  Konfig.:    ${r.sidecar}  (erneut: node export.mjs --config <diese Datei>)`);
    if (issues.length) { console.error('\nPRÜFUNG FEHLGESCHLAGEN:\n  - ' + issues.join('\n  - ')); process.exit(1); }
    console.log('  Prüfung:    OK (Codec, Auflösung, Bildrate, Frameanzahl, Dauer, Simulationszustand)');
  } catch (e) {
    if (isTTY) process.stdout.write('\n');
    console.error(e.name === 'AbortError' ? 'Export abgebrochen, unvollständige Datei gelöscht.' : `Fehler: ${e.message}`);
    process.exit(e.name === 'AbortError' ? 130 : 1);
  }
}
main();
