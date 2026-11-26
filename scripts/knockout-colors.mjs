#!/usr/bin/env node
// Marble Knockout · Farbtafel (R43 Teil 2, Gesamtlevel): alle Murmeln in Videogröße auf dem Level-Hintergrund, mit Namen,
// dazu die ähnlichen Farben dicht beieinander wie im Gedränge. Gerendert in Chromium mit dem echten Zeichencode.
//   node scripts/knockout-colors.mjs --out output/knockout-lab/g1-colors.png
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { launchBrowser, ROOT } from '../lib/browser.mjs';
import { FILES } from './knockout-lab.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const out = resolve(arg('out', 'output/knockout-lab/colors.png'));

const browser = await launchBrowser({ gpu: false });
try {
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push(e)); page.on('console', (m) => { if (m.type() === 'error') errors.push(new Error(m.text())); });
  await page.setContent('<!doctype html><html><body style="margin:0;background:#000"></body></html>');
  for (const f of [...FILES, 'src/scenarios/knockout/art.js', 'src/scenarios/knockout/renderer.js']) await page.addScriptTag({ path: join(ROOT, f) });
  const img = await page.evaluate(async () => {
    const A = EBS.KnockoutArt, L = EBS.KnockoutLevels, W = 1500, H = 1180;
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    A.levelBackground(g, 0, 0, W, H, 2400);
    const draw = (name, x, y, r, spin = -0.4) => A.marble(g, x, y, r, name, L.COLORS[name], spin, { band: L.BANDS.includes(name) });
    const label = (s, x, y, size) => A.text(g, s, x, y, size, { align: 'center', color: '#f4efe6' });
    const head = (s, y) => { g.save(); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, y - 30, W, 42); g.restore(); A.text(g, s, 24, y, 24, { color: '#ffd86b' }); };
    // 1) Short: 16 Murmeln, r 28 (Videogröße bei Zoom 1)
    head('SHORT · THE TOWER · 16 MARBLES · r 28 px', 46);
    L.FIELD16.forEach((n, i) => { const x = 95 + (i % 8) * 180, y = 120 + Math.floor(i / 8) * 130; draw(n, x, y, 28); label(n, x, y + 58, 20); });
    // 2) Langvideo: 20 Murmeln, r 24
    head('LONG · THE GAUNTLET · 20 MARBLES · r 24 px', 400);
    L.FIELD20.forEach((n, i) => { const x = 80 + (i % 10) * 148, y = 470 + Math.floor(i / 10) * 115; draw(n, x, y, 24); label(n, x, y + 52, 18); });
    // 3) Ähnliche Farben dicht an dicht (r 24), wie im Becken
    head('NEIGHBOURS IN A CROWD · r 24 px', 750);
    const groups = [['BLUE', 'NAVY', 'SKY', 'CYAN', 'TEAL', 'MINT'], ['RED', 'MAROON', 'PINK', 'ORANGE', 'BROWN'], ['YELLOW', 'GOLD', 'LIME', 'GREEN'], ['PURPLE', 'LILAC', 'WHITE', 'SILVER', 'BLACK']];
    let gx = 40;
    groups.forEach((grp) => {
      const r = 24, d = 2 * r + 1;
      grp.forEach((n, i) => {
        const col = i % 3, row = Math.floor(i / 3), x = gx + r + col * d + (row % 2) * r, y = 830 + row * d * 0.87;
        draw(n, x, y, r, 0.3 * i);
      });
      grp.forEach((n, i) => A.text(g, n, gx, 935 + i * 22, 17, { color: '#e8e2d6' }));
      gx += 3 * d + r + 140;
    });
    // 4) Kleinstes Bild (Zoom 0,62 in der Abschnitts-Kamera): Lesbarkeit
    head('SMALLEST VIEW · r 15 px (SECTIONS CAMERA)', 1110);
    L.FIELD20.forEach((n, i) => draw(n, 40 + i * 72, 1150, 15));
    return c.toDataURL('image/png').split(',')[1];
  });
  if (errors.length) throw errors[0];
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, Buffer.from(img, 'base64'));
  console.log(out);
} finally { await browser.close(); }
