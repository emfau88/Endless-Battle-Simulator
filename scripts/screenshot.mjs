#!/usr/bin/env node
// Einzelbild der laufenden Simulation als PNG (gleiche Seite und gleicher Renderer wie der Videoexport).
//   node scripts/screenshot.mjs --scenario marble --aspect 16:9 --at 12 --out output/marble_16x9.png
//   node scripts/screenshot.mjs --scenario scrap --params '{"rulesVersion":"v3","arena":"foundry"}' --at 1
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { launchAuto, openExportPage } from '../lib/browser.mjs';

const arg = (name, def) => { const i = process.argv.indexOf('--' + name); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : def; };
const params = JSON.parse(arg('params', '{}'));
if (!params || typeof params !== 'object' || Array.isArray(params)) throw new Error('--params erwartet ein JSON-Objekt.');
const cfg = {
  scenario: arg('scenario', 'naval'), seed: Number(arg('seed', 42)),
  params,
  video: { aspect: arg('aspect', '9:16'), resolution: Number(arg('resolution', 1080)), fps: 30 },
  view: { hud: arg('hud', 'true') !== 'false', camera: arg('camera', 'true') !== 'false' },
};
const at = Number(arg('at', 10)), out = resolve(arg('out', `output/${cfg.scenario}_${cfg.video.aspect.replace(':', 'x')}.png`));

const browser = await launchAuto();
try {
  const { page, errors, info } = await openExportPage(browser, cfg);
  const t0 = Date.now();
  await page.evaluate((s) => window.exportAPI.simulate(s), at);
  // Vorlauf: einige Frames rendern, damit Anzeigen aktuell sind (das Naval-HUD aktualisiert sich nur jeden 6. Frame)
  await page.evaluate(() => { window.exportAPI.renderFrames(12, 0.1); });
  const [png] = await page.evaluate(() => window.exportAPI.renderFrames(1, 1, 'image/png'));
  const check = await page.evaluate(() => window.exportAPI.check());
  if (errors.length) throw errors[0];
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, Buffer.from(png, 'base64'));
  console.log(`${out}  ${info.width}×${info.height}  Simzeit ${at}s  (${Date.now() - t0} ms, ${info.glRenderer})  Prüfung: ${check.ok ? 'OK' : check.errors.join('; ')}`);
} finally { await browser.close(); }
