#!/usr/bin/env node
// Marble Knockout · Farbtafel (R43 Teil 2, Gesamtlevel): alle Murmeln in Videogröße auf dem Level-Hintergrund, mit Namen,
// dazu die ähnlichen Farben dicht beieinander wie im Gedränge. Gerendert in Chromium mit dem echten Zeichencode.
//   node scripts/knockout-colors.mjs --out output/knockout-lab/g1-colors.png
// Rush (R44): je Format eine Tafel in Videogröße, 24 Murmeln hochkant (TRAP TOWER), 28 quer (THE AVALANCHE)
//   node scripts/knockout-colors.mjs --level rush --aspect 9:16 --out output/knockout-lab/rush-colors-9x16.png
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { launchBrowser, ROOT } from '../lib/browser.mjs';
import { FILES } from './knockout-lab.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const out = resolve(arg('out', 'output/knockout-lab/colors.png'));
const rush = arg('level', 'standard') === 'rush', aspect = arg('aspect', '9:16');

const browser = await launchBrowser({ gpu: false });
try {
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push(e)); page.on('console', (m) => { if (m.type() === 'error') errors.push(new Error(m.text())); });
  await page.setContent('<!doctype html><html><body style="margin:0;background:#000"></body></html>');
  for (const f of [...FILES, 'src/scenarios/knockout/art.js', 'src/scenarios/knockout/renderer.js']) await page.addScriptTag({ path: join(ROOT, f) });
  const img = rush ? await page.evaluate(rushPlate, aspect) : await page.evaluate(async () => {
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

/** Rush-Tafel (im Browser): Bild so groß wie das Video, Murmeln so groß wie im Video (hochkant r 28 bei Zoom 1, quer
 *  r 20 = 24 × 0,85 bei der festen Breite von THE AVALANCHE). Oben alle mit Namen, dann der Startkäfig in zwei Reihen,
 *  unten die neuen Farben dicht neben ihren ähnlichen Nachbarn. */
async function rushPlate(aspect) {
  const A = EBS.KnockoutArt, L = EBS.KnockoutLevels, port = aspect === '9:16', W = port ? 1080 : 1920, H = port ? 1920 : 1080;
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  A.levelBackground(g, 0, 0, W, H, 2400);
  const draw = (name, x, y, r, spin = -0.4) => A.marble(g, x, y, r, name, L.COLORS[name], spin, { band: L.BANDS.includes(name) });
  const NEW = ['OLIVE', 'INDIGO', 'PEACH', 'RUST', 'MAGENTA', 'SAND', 'FOREST', 'ROSE'];
  const label = (s, x, y, size) => A.text(g, s, x, y, size, { align: 'center', color: NEW.includes(s) ? '#ffd86b' : '#f4efe6', weight: 800 });
  const head = (s, y) => { g.save(); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, y - 30, W, 42); g.restore(); A.text(g, s, 24, y, 24, { color: '#ffd86b' }); };
  const field = port ? L.FIELD24 : L.FIELD28, r = port ? 28 : 20, cols = port ? 6 : 14, dx = port ? 170 : 134, dy = port ? 150 : 110;
  head(port ? 'TRAP TOWER · 24 MARBLES · r 28 px (ZOOM 1) · NEW COLORS IN GOLD' : 'THE AVALANCHE · 28 MARBLES · r 20 px (ZOOM 0.85) · NEW COLORS IN GOLD', 46);
  const x0 = (W - (cols - 1) * dx) / 2;
  field.forEach((n, i) => { const x = x0 + (i % cols) * dx, y = 130 + Math.floor(i / cols) * dy; draw(n, x, y, r); label(n, x, y + r + 30, port ? 20 : 17); });
  // Startkäfig in zwei Reihen wie im Level (Plätze im halben Abstand, obere Reihe versetzt in den Mulden)
  const yc = port ? 860 : 470, n = field.length, cw = port ? 876 : n * 1.3 * r, half = cw / n, cx0 = (W - cw) / 2;
  head('START CAGE · TWO ROWS', yc - 120);
  g.fillStyle = 'rgba(180,130,70,0.9)'; g.fillRect(cx0 - 10, yc + r + 2, cw + 20, 10);
  for (let i = 0; i < n; i++) draw(field[(i * 5) % n], cx0 + half * (i + 0.5), i % 2 ? yc - 0.8 * 2 * r : yc, r, 0.4 * i);
  // Ähnliche Nachbarn im Gedränge (je Gruppe eine neue Farbe dabei)
  const groups = [['OLIVE', 'LIME', 'GREEN', 'FOREST', 'MINT'], ['INDIGO', 'BLUE', 'NAVY', 'PURPLE', 'LILAC'], ['PEACH', 'SAND', 'WHITE', 'SILVER', 'GOLD'],
    ['RUST', 'ORANGE', 'BROWN', 'RED', 'MAROON'], ['MAGENTA', 'PINK', 'ROSE', 'PURPLE', 'RED'], ['TEAL', 'SKY', 'CYAN', 'BLUE', 'MINT']]
    .map((grp) => grp.filter((m) => field.includes(m)));
  const yg = port ? 1130 : 690, gw = port ? 340 : 300, gcols = port ? 3 : 6;
  head('NEIGHBOURS IN A CROWD', yg - 50);
  groups.forEach((grp, k) => {
    const d = 2 * r + 1, bx = (port ? 40 : 40) + (k % gcols) * gw, by = yg + 40 + Math.floor(k / gcols) * (port ? 380 : 0);
    grp.forEach((m, i) => { const col = i % 3, row = Math.floor(i / 3); draw(m, bx + r + col * d + (row % 2) * r, by + row * d * 0.87, r, 0.3 * i); });
    grp.forEach((m, i) => A.text(g, m, bx, by + 2 * d + 10 + i * 24, 18, { color: NEW.includes(m) ? '#ffd86b' : '#e8e2d6', weight: 800 }));
  });
  return c.toDataURL('image/png').split(',')[1];
}
