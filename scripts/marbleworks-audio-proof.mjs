// Real H.264/AAC camera-sound review; uses the normal export/replay pipeline.
// node scripts/marbleworks-audio-proof.mjs [--gpu]
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from '../lib/browser.mjs';
import { exportVideo, verifyResult, run, ffmpegBin } from '../lib/exporter.mjs';

const output = join(ROOT, 'output', 'marbleworks-camera-audio');
await mkdir(output, { recursive: true });
const reviews = [
  { aspect: '16:9', stem: 'marbleworks-audio-16x9', startSec: 0,
    title: '16:9 · Überblick und Zuführung', text: 'Vom ruhigen Überblick zur nahen Zuführung. Der Ton rückt mit dem Kamerablick nach vorn.' },
  { aspect: '9:16', stem: 'marbleworks-audio-9x16', startSec: 8,
    title: '9:16 · Nahansicht und Stationswechsel', text: 'Von der Zuführung zur ersten Veredelung. Beim Wechsel treten entfernte Kontakte akustisch zurück.' },
];
const results = [];
for (const review of reviews) {
  const cfg = { scenario: 'marbleworks', seed: 42,
    params: { exportLength: 'order', orderSize: 24, productionSpeed: 2, intensity: 2, cameraMode: 'auto' },
    video: { aspect: review.aspect, resolution: 720, fps: 30, audio: true, quality: { crf: 20, preset: 'fast' } },
    view: { camera: true, hud: false } };
  const file = join(output, review.stem + '.mp4');
  const result = await exportVideo(cfg, { out: file, gpu: process.argv.includes('--gpu'),
    clip: { startSec: review.startSec, durationSec: 24 }, log: console.log,
    onProgress: p => { if (p.frame && p.frame % 300 === 0) console.log(`${review.aspect} ${p.frame}/${p.totalFrames} frames`); } });
  const issues = verifyResult(result);
  if (issues.length || result.audio.limited || result.audio.encoded.silent) {
    throw new Error(JSON.stringify({ issues, audio: result.audio }));
  }
  const shot = await run(ffmpegBin(), ['-v', 'error', '-y', '-ss', '12', '-i', file,
    '-frames:v', '1', join(output, review.stem + '.png')]);
  if (shot.code !== 0) throw new Error(shot.stderr);
  const plan = result.audioMixPlan;
  await writeFile(join(output, review.stem + '-mix-plan.json'), JSON.stringify(plan, null, 2) + '\n');
  results.push({ ...review, file, sidecar: result.sidecar, frames: result.frames,
    stateHash: result.stateHash, audio: result.audio, checks: issues, elapsedSec: result.elapsedSec });
}
await writeFile(join(output, 'review-results.json'), JSON.stringify(results, null, 2) + '\n');
await writeFile(join(output, 'index.html'), `<!doctype html><html lang="de"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Marble Works · Kamera und Klang</title>
<style>body{margin:0;background:#f3f0e8;color:#2c332d;font:16px/1.6 system-ui}main{max-width:1140px;margin:50px auto;padding:0 24px}h1{font:48px/1.1 Georgia;margin:10px 0 22px}p{color:#65705f;max-width:780px}.grid{display:grid;grid-template-columns:1.5fr 1fr;gap:24px;margin-top:30px}article{padding:24px;background:#fffef9;border:1px solid #deded2;border-radius:14px}h2{font:27px Georgia;margin:0 0 12px}video{width:100%;max-height:600px;background:#d1d0c2;border-radius:8px}a{color:#49623c}small{color:#757d6e}.meta{margin-top:32px;border-top:1px solid #ddd;padding-top:18px}@media(max-width:720px){.grid{grid-template-columns:1fr}h1{font-size:36px}}</style>
<main><small>MARBLE WORKS · KLANGSTUDIE 02</small><h1>Der Klang folgt dem Blick.</h1>
<p>Variante C mit Kenney als Hauptklang. Zwei echte Exporte mit weichen Kontakten, sparsamer Geräuschdichte und kamerabhängiger Lautstärke. Je 24 Sekunden, mit unveränderter Kamerafahrt.</p>
<div class="grid">${reviews.map(r=>`<article><h2>${r.title}</h2><p>${r.text}</p><video controls preload="metadata" poster="${r.stem}.png"><source src="${r.stem}.mp4" type="video/mp4"></video><p><a href="${r.stem}.mp4" download>Video speichern</a> · <a href="${r.stem}.json" download>Rezept</a></p></article>`).join('')}</div>
<p class="meta">Nur Marble Works verwendet diese Mischung. Die kurzen Klänge erhalten beim Start ihr Kameragewicht und klingen natürlich aus. Live-Simulationen bleiben wie bisher stumm; hier hörst du den Videoexport.</p>
<script>const videos=[...document.querySelectorAll('video')];videos.forEach(v=>v.addEventListener('play',()=>videos.forEach(other=>{if(other!==v)other.pause()})));</script></main></html>`);
console.log(JSON.stringify(results.map(r => ({ video: r.stem, frames: r.frames, audio: r.audio, elapsedSec: r.elapsedSec })), null, 2));
