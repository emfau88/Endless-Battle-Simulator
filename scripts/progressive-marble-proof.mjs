// Reproduce review screenshots and a short upgrade clip (or a complete small order).
// node scripts/progressive-marble-proof.mjs [--video | --process-video | --full-video] [--gpu]
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, launchBrowser, openExportPage } from '../lib/browser.mjs';
import { exportVideo, verifyResult } from '../lib/exporter.mjs';

const out = join(ROOT, 'output', 'progressive-marble-v1');
await mkdir(out, { recursive: true });
const browser = await launchBrowser({ gpu: process.argv.includes('--gpu') });
const results = [];
const fullMini = process.argv.includes('--full-video');
const processClip = process.argv.includes('--process-video');
const videoConfig = { scenario: 'marbleworks', seed: 42,
  params: { exportLength: 'order', orderSize: fullMini ? 24 : 144, productionSpeed: fullMini ? 2 : 1, intensity: fullMini ? 2 : 1,
    ...(processClip ? { cameraMode: 'manual', cameraPosition: 46, cameraZoom: 1.2 } : {}) },
  video: { aspect: '16:9', resolution: processClip ? 1080 : 720, fps: 30, audio: true, quality: { crf: 20, preset: 'fast' } },
  view: { camera: true, hud: true } };
let clip;
try {
  for (const shot of [
    { name: '01-start-16x9', at: 2 },
    { name: '02-polishing-16x9', at: 60, cameraMode: 'manual', cameraPosition: 20, cameraZoom: 1.2 },
    { name: '03-expansion-16x9', at: 210 },
    { name: '04-factory-overview-16x9', at: 280, cameraMode: 'overview' },
    { name: '05-annealing-9x16', at: 280, aspect: '9:16', cameraMode: 'manual', cameraPosition: 46 },
    { name: '06-completed-16x9', at: 490 },
    { name: '07-materials-16x9', at: 210, material: 'mixed', cameraMode: 'manual', cameraPosition: 47 },
    { name: '08-infusion-16x9', at: 280, cameraMode: 'manual', cameraPosition: 46, cameraZoom: 1.2 },
    { name: '09-collection-16x9', at: 490, cameraMode: 'manual', cameraPosition: 96, cameraZoom: 1.1 },
    { name: '10-process-effects-16x9', at: 366.75, cameraMode: 'manual', cameraPosition: 46, cameraZoom: 1.3 },
    { name: '11-process-effects-9x16', at: 366.75, aspect: '9:16', cameraMode: 'manual', cameraPosition: 46, cameraZoom: 1.05 },
  ]) {
    const { page, errors } = await openExportPage(browser, { scenario: 'marbleworks', seed: 42,
      params: { exportLength: 'duration', cameraMode: shot.cameraMode || 'auto',
        cameraPosition: shot.cameraPosition || 50, cameraZoom: shot.cameraZoom || 1, material: shot.material || 'glass' },
      video: { aspect: shot.aspect || '16:9', resolution: 1080, fps: 30 } });
    await page.evaluate(at => exportAPI.simulate(at), shot.at);
    const [png] = await page.evaluate(() => exportAPI.renderFrames(1, 1, 'image/png'));
    const check = await page.evaluate(() => exportAPI.check());
    if (errors.length || !check.ok) throw new Error(errors.map(String).concat(check.errors).join('; '));
    await writeFile(join(out, shot.name + '.png'), Buffer.from(png, 'base64'));
    results.push({ ...shot, hash: await page.evaluate(() => exportAPI.hash()), snapshot: await page.evaluate(() => exportAPI.snapshot()) });
    console.log(shot.name + ' · verified');
    await page.close();
  }
  if ((process.argv.includes('--video') || processClip) && !fullMini) {
    const { page } = await openExportPage(browser, videoConfig);
    const state = await page.evaluate(() => exportAPI.simulate(600));
    if (!state.complete) throw new Error('Review order did not finish.');
    clip = { startSec: processClip ? 360 : Math.max(0, Math.floor(state.milestones.find(m => m.type === 'parallel').time) - 5), durationSec: 20 };
    await page.close();
  }
} finally { await browser.close(); }
await writeFile(join(out, 'screenshots.json'), JSON.stringify(results, null, 2) + '\n');
if (process.argv.includes('--video') || fullMini || processClip) {
  const file = join(out, processClip ? 'marbleworks-process-test.mp4' : clip ? 'progressive-marble-upgrade-test.mp4' : 'progressive-marble-full-order-test.mp4');
  const result = await exportVideo(videoConfig,
  { out: file, ...(clip ? { clip } : {}), gpu: process.argv.includes('--gpu'), log: console.log,
    onProgress: p => { if (p.frame && p.frame % 300 === 0) console.log(`Frames ${p.frame}/${p.totalFrames}`); } });
  const issues = verifyResult(result); if (issues.length) throw new Error(issues.join('; '));
  console.log(JSON.stringify({ duration: result.duration, frames: result.frames, stateHash: result.stateHash, out: file }));
}
