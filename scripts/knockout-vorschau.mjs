#!/usr/bin/env node
// Marble Knockout · Vorschau V0 (R43): Szene „Crumbling Bridge“ in drei Stilen, je 9:16 und 16:9, dazu ein Blatt je
// Stil und ein Gesamtblatt. Zeichnung aus docs/reference/knockout-vorschau.js, gerendert in Chromium.
//   node scripts/knockout-vorschau.mjs --out output/knockout-vorschau
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { launchBrowser, ROOT } from '../lib/browser.mjs';

const arg = (name, def) => { const i = process.argv.indexOf('--' + name); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : def; };
const out = resolve(arg('out', 'output/knockout-vorschau'));
const LABELS = { A: 'A · Holz & Abendlicht (Empfehlung)', B: 'B · Hell & clean', C: 'C · Glas & Nacht' };

const browser = await launchBrowser({ gpu: false });
try {
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e));
  await page.setContent('<!doctype html><html><body style="margin:0;background:#000"></body></html>');
  await page.addScriptTag({ path: join(ROOT, 'docs', 'reference', 'knockout-vorschau.js') });
  const files = await page.evaluate(labels => {
    const KV = window.KnockoutVorschau, canvases = {}, files = {};
    for (const style of ['A', 'B', 'C']) for (const format of ['16x9', '9x16']) {
      const c = document.createElement('canvas');
      [c.width, c.height] = format === '9x16' ? [1080, 1920] : [1920, 1080];
      KV.draw(c.getContext('2d'), style, format);
      canvases[style + format] = c;
      files[`stil-${style}-${format}.png`] = c.toDataURL('image/png').split(',')[1];
    }
    // Blatt je Stil: links 16:9 (Langvideo), rechts 9:16 (Short), gleiche Höhe
    const GAP = 18, HEAD = 74, LH = 720, LW = 1280, PW = 405;
    const sheet = style => {
      const c = document.createElement('canvas'); c.width = GAP * 3 + LW + PW; c.height = HEAD + LH + GAP;
      const g = c.getContext('2d'); g.fillStyle = '#0f1418'; g.fillRect(0, 0, c.width, c.height);
      g.imageSmoothingQuality = 'high';
      g.drawImage(canvases[style + '16x9'], GAP, HEAD, LW, LH);
      g.drawImage(canvases[style + '9x16'], GAP * 2 + LW, HEAD, PW, LH);
      g.fillStyle = '#edf1e5'; g.font = '700 26px "Segoe UI", Arial, sans-serif'; g.textBaseline = 'middle';
      g.fillText(`Marble Knockout · Stil ${labels[style]}`, GAP, 28);
      g.fillStyle = '#9caeb6'; g.font = '600 17px "Segoe UI", Arial, sans-serif';
      g.fillText('Bahn 4 „Crumbling Bridge“ mitten im Rennen · links Langvideo 16:9, rechts Short 9:16 · Vorschau aus einer Kopie, noch keine Simulation', GAP, 56);
      return c;
    };
    const sheets = ['A', 'B', 'C'].map(sheet);
    sheets.forEach((c, i) => { files[`blatt-${'ABC'[i]}.jpg`] = c.toDataURL('image/jpeg', 0.9).split(',')[1]; });
    // Gesamtblatt: die drei Blätter untereinander, verkleinert
    const k = 0.62, all = document.createElement('canvas');
    all.width = Math.round(sheets[0].width * k); all.height = Math.round(sheets[0].height * k) * 3;
    const ga = all.getContext('2d'); ga.imageSmoothingQuality = 'high';
    sheets.forEach((c, i) => ga.drawImage(c, 0, i * Math.round(c.height * k), Math.round(c.width * k), Math.round(c.height * k)));
    files['alle-stile.jpg'] = all.toDataURL('image/jpeg', 0.88).split(',')[1];
    // Kleine Referenzbilder des gewählten Stils A für docs/reference/
    for (const [format, w, h] of [['16x9', 960, 540], ['9x16', 540, 960]]) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(canvases['A' + format], 0, 0, w, h);
      files[`knockout-stil-a-${format}.jpg`] = c.toDataURL('image/jpeg', 0.82).split(',')[1];
    }
    return files;
  }, LABELS);
  if (errors.length) throw errors[0];
  await mkdir(out, { recursive: true });
  for (const [name, data] of Object.entries(files)) await writeFile(join(out, name), Buffer.from(data, 'base64'));
  console.log(`${Object.keys(files).length} Dateien in ${out}`);
} finally { await browser.close(); }
