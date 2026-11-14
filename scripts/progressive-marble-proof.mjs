// Reproduce review screenshots and the optional complete short test recording.
// node scripts/progressive-marble-proof.mjs [--video]
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, launchBrowser, openExportPage } from '../lib/browser.mjs';
import { exportVideo, verifyResult } from '../lib/exporter.mjs';

const out = join(ROOT, 'output', 'progressive-marble-v1');
await mkdir(out, { recursive: true });
const browser = await launchBrowser({ gpu: false });
const results = [];
try {
  for (const shot of [
    { name: '01-start-16x9', at: 2 },
    { name: '02-polishing-16x9', at: 60, cameraMode: 'manual', cameraPosition: 25 },
    { name: '03-expansion-16x9', at: 210 },
    { name: '04-factory-overview-16x9', at: 280, cameraMode: 'overview' },
    { name: '05-annealing-9x16', at: 240, aspect: '9:16', cameraMode: 'manual', cameraPosition: 61 },
    { name: '06-completed-16x9', at: 490 },
    { name: '07-materials-16x9', at: 210, material: 'mixed', cameraMode: 'manual', cameraPosition: 47 },
  ]) {
    const { page, errors } = await openExportPage(browser, { scenario: 'marble', seed: 42,
      params: { factoryMode: 'progressive', exportLength: 'duration', cameraMode: shot.cameraMode || 'auto',
        cameraPosition: shot.cameraPosition || 50, material: shot.material || 'glass' },
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
} finally { await browser.close(); }
await writeFile(join(out, 'screenshots.json'), JSON.stringify(results, null, 2) + '\n');
if (process.argv.includes('--video')) {
  const result = await exportVideo({ scenario: 'marble', seed: 42,
    params: { factoryMode: 'progressive', exportLength: 'order', orderSize: 24, productionSpeed: 2, intensity: 2 },
    video: { aspect: '16:9', resolution: 720, fps: 30, audio: true, quality: { crf: 20, preset: 'fast' } },
    view: { camera: true, hud: true } },
  { out: join(out, 'progressive-marble-full-order-test.mp4'), gpu: false, log: console.log,
    onProgress: p => { if (p.frame && p.frame % 300 === 0) console.log(`Frames ${p.frame}/${p.totalFrames}`); } });
  const issues = verifyResult(result); if (issues.length) throw new Error(issues.join('; '));
  console.log(JSON.stringify({ duration: result.duration, frames: result.frames, stateHash: result.stateHash, out: result.out }));
}
