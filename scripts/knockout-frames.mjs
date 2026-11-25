#!/usr/bin/env node
// Marble Knockout · Bildblatt (R43): Einzelbilder einer Galerie, Bahn oder eines Rennens zu festen Zeitpunkten,
// gerendert in Chromium mit dem echten Painter. Zum Abstimmen der Bahnen; Ausgabe nur nach output/.
//   node scripts/knockout-frames.mjs --mode gallery --element drum --times 1,3,6,10 --out output/knockout-lab/drum.jpg
//   node scripts/knockout-frames.mjs --mode stage --stage 3 --seed 2 --times 2,8,14,20 --aspect 16:9
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { launchBrowser, ROOT } from '../lib/browser.mjs';
import { FILES } from './knockout-lab.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const aspect = arg('aspect', '16:9'), mode = arg('mode', 'gallery');
const times = arg('times', '1,3,6,10').split(',').map(Number);
const out = resolve(arg('out', `output/knockout-lab/${mode}-${arg('element', arg('stage', 'x'))}-${aspect.replace(':', 'x')}.jpg`));
const params = { mode, element: arg('element', 'all'), stage: Number(arg('stage', 0)), short: arg('short', 'A'), slowmo: 'on' };
const scale = Number(arg('scale', 0.5)), cols = Number(arg('cols', aspect === '9:16' ? 4 : 2));

const browser = await launchBrowser({ gpu: false });
try {
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push(e)); page.on('console', (m) => { if (m.type() === 'error') errors.push(new Error(m.text())); });
  await page.setContent('<!doctype html><html><body style="margin:0;background:#000"></body></html>');
  for (const f of [...FILES, 'src/scenarios/knockout/art.js', 'src/scenarios/knockout/renderer.js']) await page.addScriptTag({ path: join(ROOT, f) });
  const each = argv.includes('--each');
  const data = await page.evaluate(({ aspect, params, times, scale, cols, seed, each }) => {
    const world = aspect === '9:16' ? { w: 1080, h: 1920 } : { w: 1920, h: 1080 };
    // --each: je Galerie-Element ein Bild zur ersten Zeit
    if (each) {
      const ids = Object.keys(EBS.KnockoutGallery);
      params = { ...params, element: ids[0] }; times = ids.map(() => times[0]);
      var sims = ids.map((id) => new EBS.KnockoutSim.KnockoutSimulation({ seed, params: { ...params, element: id }, world }));
    }
    let sim = each ? sims[0] : new EBS.KnockoutSim.KnockoutSimulation({ seed, params, world });
    let P = new EBS.KnockoutRender.Painter(sim, scale);
    const fw = Math.round(world.w * scale), fh = Math.round(world.h * scale), rows = Math.ceil(times.length / cols), head = 26;
    const sheet = document.createElement('canvas'); sheet.width = cols * fw + (cols + 1) * 8; sheet.height = rows * (fh + head) + (rows + 1) * 8;
    const sg = sheet.getContext('2d'); sg.fillStyle = '#111'; sg.fillRect(0, 0, sheet.width, sheet.height);
    const frame = document.createElement('canvas'); frame.width = fw; frame.height = fh;
    const fg = frame.getContext('2d'), info = [];
    times.forEach((t, i) => {
      if (each) { sim = sims[i]; P = new EBS.KnockoutRender.Painter(sim, scale); }
      while (sim.t < t - 1e-9) sim.stepOnce();
      fg.setTransform(scale, 0, 0, scale, 0, 0); P.paint(fg);
      const x = 8 + (i % cols) * (fw + 8), y = 8 + Math.floor(i / cols) * (fh + head + 8);
      sg.drawImage(frame, x, y + head);
      sg.fillStyle = '#ddd'; sg.font = '600 16px Arial'; sg.fillText(`t ${t.toFixed(1)} s · ${sim.phase || ''} · rt ${sim.world.t.toFixed(1)} · ${sim.spec ? sim.spec.title : ''}`, x + 4, y + 18);
      info.push(sim.snapshot ? JSON.stringify(sim.snapshot()).slice(0, 160) : '');
    });
    return { img: sheet.toDataURL('image/jpeg', 0.88).split(',')[1], info, hash: sim.stateHash() };
  }, { aspect, params, times, scale, cols, seed: Number(arg('seed', 1)), each });
  if (errors.length) throw errors[0];
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, Buffer.from(data.img, 'base64'));
  console.log(out); console.log('Hash', data.hash);
} finally { await browser.close(); }
