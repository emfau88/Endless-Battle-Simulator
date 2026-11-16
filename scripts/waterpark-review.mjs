#!/usr/bin/env node
// Real renderer review only: screenshots, motion and optional Pyramid preservation check.
// node scripts/waterpark-review.mjs [--gpu] [--pyramid-only | --waterpark-only]
// Outputs stay in output/waterpark-dev; selecting documentation images is a separate action.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, launchBrowser, openExportPage } from '../lib/browser.mjs';

export const REVIEW_DIR = join(ROOT, 'output', 'waterpark-dev');
const digest = data => createHash('sha256').update(data).digest('hex');
const messages = errors => errors.map(error => error.message || String(error));
export const REVIEW_SHOTS = [
  { name: 'waterpark-day-16x9-240s', preset: 'waterpark-long', at: 240 },
  { name: 'waterpark-evening-16x9-570s', preset: 'waterpark-long', at: 570 },
  { name: 'waterpark-short-9x16-08s', preset: 'waterpark-short', at: 8 },
  { name: 'waterpark-short-9x16-22s', preset: 'waterpark-short', at: 22 },
  { name: 'waterpark-short-9x16-29s', preset: 'waterpark-short', at: 29 },
];

export async function readPreset(name) {
  return JSON.parse(await readFile(join(ROOT, 'presets', 'production', `${name}.json`), 'utf8'));
}

export async function captureAt(page, at) {
  return page.evaluate(time => {
    const fps = exportAPI.config().video.fps;
    exportAPI.simulate(Math.max(0, time - 1 / fps));
    const [png] = exportAPI.renderFrames(1, 1, 'image/png');
    return { png, hash: exportAPI.hash(), snapshot: exportAPI.snapshot(), check: exportAPI.check(), config: exportAPI.config() };
  }, at);
}

export async function captureWaterparkReview(browser, out = REVIEW_DIR) {
  const shots = [];
  await mkdir(out, { recursive: true });
  for (const shot of REVIEW_SHOTS) {
    const cfg = await readPreset(shot.preset);
    const { page, errors, info } = await openExportPage(browser, cfg);
    try {
      const result = await captureAt(page, shot.at);
      assert.ok(result.check.ok, `${shot.name}: ${result.check.errors.join('; ')}`);
      assert.deepEqual(messages(errors), [], `${shot.name}: browser errors`);
      const png = Buffer.from(result.png, 'base64'), file = join(out, shot.name + '.png');
      await writeFile(file, png);
      shots.push({ ...shot, file, width: info.width, height: info.height, pngSha256: digest(png),
        stateHash: result.hash, check: result.check, snapshot: result.snapshot, config: result.config, browserErrors: [] });
      console.log(`${shot.name}: captured and checked`);
    } finally { await page.close(); }
  }

  const cfg = await readPreset('waterpark-short');
  cfg.video = { ...cfg.video, resolution: 720, fps: 30 };
  const { page, errors } = await openExportPage(browser, cfg);
  let motion;
  try {
    motion = await page.evaluate(() => {
      exportAPI.simulate(8);
      const before = exportAPI.snapshot(), firstHash = exportAPI.hash();
      const frames = exportAPI.renderFrames(60, .8);
      const finalHash = exportAPI.hash(), after = exportAPI.snapshot(), check = exportAPI.check();
      exportAPI.restart(); exportAPI.simulate(10);
      return { before, after, check, firstHash, finalHash, simulatedHash: exportAPI.hash(),
        changed: frames[0] !== frames.at(-1), first: frames[0], last: frames.at(-1) };
    });
    assert.ok(motion.changed, 'Two seconds of real rendering must visibly move');
    assert.notEqual(motion.firstHash, motion.finalHash, 'Simulation must advance during rendering');
    assert.equal(motion.finalHash, motion.simulatedHash, 'Rendering must not alter the simulation');
    assert.ok(motion.check.ok, motion.check.errors.join('; '));
    assert.deepEqual(messages(errors), [], 'Motion check: browser errors');
    for (const key of ['first', 'last']) {
      await writeFile(join(out, `waterpark-motion-${key}.jpg`), Buffer.from(motion[key], 'base64'));
      delete motion[key];
    }
    console.log('waterpark-motion: 60 frames / 2 seconds, visible motion and simulation parity checked');
  } finally { await page.close(); }
  return { shots, motion };
}

async function openPyramidOnly(browser, cfg, source) {
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error));
  page.on('console', message => { if (message.type() === 'error') errors.push(new Error(message.text())); });
  await page.setContent('<!doctype html><html><body></body></html>');
  for (const file of ['vendor/pixi.min.js', 'src/core.js', 'src/canvas-scene.js', 'src/scenarios/shared/critter-art.js']) {
    await page.addScriptTag({ path: join(ROOT, file) });
  }
  await page.addScriptTag({ content: source });
  await page.evaluate(async config => {
    const cfg = EBS.normalizeConfig(config), world = EBS.ASPECTS[cfg.video.aspect];
    const app = await EBS.createStage(world, { renderScale: EBS.videoSize(cfg.video).scale, exportMode: true });
    document.body.appendChild(app.canvas);
    EBS.installExportAPI(new EBS.Session(app).start(cfg));
  }, cfg);
  return { page, errors };
}

async function pixelDifference(browser, images) {
  const page = await browser.newPage();
  try {
    return await page.evaluate(async images => {
      const pixels = [];
      let width = 0, height = 0;
      for (const image of images) {
        const img = new Image(); img.src = 'data:image/png;base64,' + image; await img.decode();
        const canvas = document.createElement('canvas'); width = canvas.width = img.width; height = canvas.height = img.height;
        const g = canvas.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
        pixels.push(g.getImageData(0, 0, width, height).data);
      }
      let changedPixels = 0, maxChannelDelta = 0, sumDelta = 0, left = width, top = height, right = -1, bottom = -1;
      for (let i = 0; i < pixels[0].length; i += 4) {
        let changed = false;
        for (let channel = 0; channel < 4; channel++) {
          const delta = Math.abs(pixels[0][i + channel] - pixels[1][i + channel]);
          if (delta) changed = true;
          maxChannelDelta = Math.max(maxChannelDelta, delta); sumDelta += delta;
        }
        if (changed) { changedPixels++; const x = (i / 4) % width, y = Math.floor(i / 4 / width);
          left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
      }
      return { width, height, changedPixels, maxChannelDelta, sumDelta, bounds: changedPixels ? [left, top, right, bottom] : null };
    }, images);
  } finally { await page.close(); }
}

export async function comparePyramidBaseline(browser, out = REVIEW_DIR) {
  const baselineFile = join(REVIEW_DIR, 'pyramid-before.js');
  const [before, after] = await Promise.all([
    readFile(baselineFile, 'utf8'), readFile(join(ROOT, 'src/scenarios/pyramid.js'), 'utf8'),
  ]);
  const comparisons = [];
  for (const aspect of ['16:9', '9:16']) for (const theme of [0, 1]) for (const at of theme ? [10, 24] : [20, 57]) {
    const cfg = { scenario: 'pyramid', seed: 42,
      params: { figure: 1, theme, size: theme ? 23 : 18, dayMinutes: theme ? 25 / 60 : 1, shortFilm: !!theme },
      video: { aspect, resolution: 720, fps: 30, durationSec: theme ? 25 : 60, tempo: 1 }, view: { hud: true, camera: false } };
    const renders = [];
    for (const source of [before, after]) {
      const { page, errors } = await openPyramidOnly(browser, cfg, source);
      try {
        const result = await captureAt(page, at);
        assert.ok(result.check.ok, result.check.errors.join('; '));
        assert.deepEqual(messages(errors), [], 'Pyramid baseline browser errors');
        renders.push(result);
      } finally { await page.close(); }
    }
    const label = `pyramid-${aspect.replace(':', 'x')}-theme${theme}-${at}s`;
    assert.equal(renders[0].hash, renders[1].hash, `${label}: simulation changed`);
    assert.deepEqual(renders[0].snapshot, renders[1].snapshot, `${label}: state changed`);
    const pixelIdentical = renders[0].png === renders[1].png;
    let difference;
    if (!pixelIdentical) {
      for (let i = 0; i < 2; i++) await writeFile(join(out, `${label}-${i ? 'after' : 'before'}.png`), Buffer.from(renders[i].png, 'base64'));
      difference = await pixelDifference(browser, renders.map(render => render.png));
      const reference = await openPyramidOnly(browser, cfg, before);
      try {
        const repeated = await captureAt(reference.page, at);
        difference.baselineRepeat = await pixelDifference(browser, [renders[0].png, repeated.png]);
        difference.afterVsRepeatedBaseline = await pixelDifference(browser, [renders[1].png, repeated.png]);
      } finally { await reference.page.close(); }
    }
    const matchesBaselineRender = pixelIdentical || difference.afterVsRepeatedBaseline.changedPixels === 0;
    assert.ok(matchesBaselineRender, `${label}: current scene differs from both original baseline renders; inspect saved PNGs`);
    const png = Buffer.from(renders[1].png, 'base64');
    await writeFile(join(out, label + '.png'), png);
    comparisons.push({ aspect, theme, at, stateHash: renders[1].hash, pngSha256: digest(png), pixelIdentical, matchesBaselineRender, ...(difference ? { difference } : {}) });
    console.log(`${label}: ${pixelIdentical ? 'complete scene pixels and state identical' : JSON.stringify(difference)}`);
  }
  return { baselineFile, beforeSourceSha256: digest(before), afterSourceSha256: digest(after), comparisons };
}

async function main() {
  const args = process.argv.slice(2), out = REVIEW_DIR;
  assert.ok(!(args.includes('--pyramid-only') && args.includes('--waterpark-only')), 'Choose at most one review scope');
  await mkdir(out, { recursive: true });
  const browser = await launchBrowser({ gpu: args.includes('--gpu') });
  const report = { checkedAt: new Date().toISOString(), chromium: browser.version(), gpuRequested: args.includes('--gpu') };
  try {
    if (!args.includes('--pyramid-only')) report.waterpark = await captureWaterparkReview(browser, out);
    if (!args.includes('--waterpark-only')) report.pyramid = await comparePyramidBaseline(browser, out);
    const name = args.includes('--pyramid-only') ? 'pyramid-scene-preservation.json' : args.includes('--waterpark-only') ? 'waterpark-review.json' : 'waterpark-full-review.json';
    await writeFile(join(out, name), JSON.stringify(report, null, 2) + '\n');
    console.log(join(out, name));
  } finally { await browser.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
