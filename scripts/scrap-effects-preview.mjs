#!/usr/bin/env node
// Scrap Wars · Vergleichsblatt der Effekte (R40/E0): Ausschnitte rund um Schuss, Rakete, Treffer am Roboter,
// Treffer an Holz/Stein/Beton, Explosion und K.o., je Moment mehrere Zeitpunkte. Mit --before wird derselbe Moment
// zusätzlich aus einem anderen Stand gerendert (z. B. dem Hauptordner auf main) und direkt darüber gezeigt.
//   node scripts/scrap-effects-preview.mjs --before "C:/pfad/zum/main-Ordner" --arena sunshine --out output/scrap-effekte/sunny.jpg
// Nur Darstellung; prüft nebenbei, dass beide Stände dieselben Ereignisse erzeugen.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchAuto, openExportPage, ROOT } from '../lib/browser.mjs';

const arg = (name, def) => { const i = process.argv.indexOf('--' + name); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : def; };
const arena = arg('arena', 'sunshine'), seed = Number(arg('seed', 42)), before = arg('before', null);
const out = resolve(arg('out', `output/scrap-effekte/${arena}.jpg`));
const cfg = { scenario: 'scrap', seed, params: { arena, rulesVersion: 'v3' }, video: { aspect: '16:9', resolution: 1080, fps: 30 }, view: { hud: true, camera: false } };
const ARENA_NAMES = { sunshine: 'Sunny Yard', yard: 'Scrapyard', foundry: 'Foundry', crossroads: 'Crossroads' };

// Momente: erstes passendes Ereignis nach 2 s; Zeitpunkte in Sekunden nach dem Ereignis; Ausschnitt in Bildpunkten (1080p)
const MOMENTS = [
  { key: 'shot', title: 'Schuss (Blaster)', pick: e => e.type === 'blaster', at: [0.02, 0.07, 0.13, 0.2, 0.5], crop: 300 },
  { key: 'rocket', title: 'Rakete', pick: e => e.type === 'rocket', at: [0.02, 0.1, 0.25, 0.5, 1.0], crop: 300 },
  { key: 'hit', title: 'Treffer am Roboter', pick: e => e.type === 'hit' && e.p >= 3, at: [0, 0.05, 0.15, 0.3, 3], crop: 200 },
  { key: 'wood', title: 'Treffer Holz', pick: e => e.type === 'cover_hit' && e.material === 'wood' && e.p === 19, at: [0, 0.07, 0.14, 0.21, 3], crop: 280 },
  { key: 'stone', title: 'Treffer Stein', pick: e => e.type === 'cover_hit' && e.material === 'stone' && e.p === 19, at: [0, 0.07, 0.14, 0.21, 3], crop: 280 },
  { key: 'concrete', title: 'Treffer Beton', pick: e => e.type === 'cover_hit' && e.material === 'concrete' && e.p === 19, at: [0, 0.07, 0.14, 0.21, 3], crop: 280 },
  { key: 'blast', title: 'Explosion', pick: e => e.type === 'blast', at: [0.02, 0.1, 0.25, 0.8, 2.5], crop: 320 },
  { key: 'ko', title: 'K.o.', pick: e => e.type === 'ko', at: [0.02, 0.2, 0.6, 1.5, 4], crop: 320 },
];
const CELL = 240;

async function capture(browser, root) {
  const base = root ? pathToFileURL(resolve(root)).href : undefined;
  const { page, errors, info } = await openExportPage(browser, cfg, { base });
  const scale = info.width / info.world.w;
  // 1) Ereignisse sammeln (reine Simulation), dann von vorn
  const events = await page.evaluate(() => { window.exportAPI.simulate(90); return window.exportAPI.events(0); });
  const chosen = MOMENTS.map(m => ({ ...m, e: events.find(e => e.step >= 120 && m.pick(e)) || null }));
  await page.evaluate(c => window.exportAPI.restart(c), cfg);
  // 2) Aufnahmezeitpunkte auf dem Bildraster, aufsteigend
  const frameOf = sec => Math.round(sec * info.fps);
  const shots = [];
  for (const m of chosen) if (m.e) for (const [col, dt] of m.at.entries()) shots.push({ key: m.key, col, frame: frameOf(m.e.step / 60 + dt) });
  const crops = {}, perFrame = info.physHz / info.fps, frames = [...new Set(shots.map(s => s.frame))].sort((a, b) => a - b);
  let frame = 0;
  for (const f of frames) {
    const here = shots.filter(s => s.frame === f).map(s => {
      const m = chosen.find(c => c.key === s.key), size = m.crop * scale;
      return { ...s, sx: m.e.x * scale - size / 2, sy: m.e.y * scale - size / 2, size };
    });
    // simulate(seconds) rechnet ganze Physikschritte; renderFrames(1) rückt genau ein Bild vor.
    // Zugeschnitten wird noch im Browser, damit nur kleine Ausschnitte zurückkommen.
    const pngs = await page.evaluate(async ([sec, rects, cell]) => {
      if (sec > 0) window.exportAPI.simulate(sec);
      const img = new Image(); img.src = 'data:image/png;base64,' + window.exportAPI.renderFrames(1, 1, 'image/png')[0]; await img.decode();
      return rects.map(r => {
        const c = document.createElement('canvas'); c.width = c.height = cell; const g = c.getContext('2d');
        g.imageSmoothingQuality = 'high'; g.drawImage(img, r.sx, r.sy, r.size, r.size, 0, 0, cell, cell);
        return c.toDataURL('image/png').split(',')[1];
      });
    }, [(f - frame - 1) * perFrame / info.physHz, here, CELL]);
    frame = f;
    here.forEach((s, i) => { (crops[s.key] ||= [])[s.col] = { png: pngs[i] }; });
  }
  if (errors.length) throw errors[0];
  const digest = events.map(e => `${e.seq}:${e.type}:${e.step}`).join('|');
  await page.close();
  return { chosen, crops, digest };
}

const browser = await launchAuto();
try {
  const runs = [];
  if (before) runs.push({ label: 'vorher', ...(await capture(browser, before)) });
  runs.push({ label: before ? 'nachher' : 'jetzt', ...(await capture(browser, null)) });
  if (runs.length === 2 && runs[0].digest !== runs[1].digest) throw new Error('Vorher und nachher erzeugen unterschiedliche Ereignisse: die Simulation hat sich verändert.');
  // 3) Blatt zusammensetzen (im Browser, damit Beschriftung und Skalierung wie im Video gezeichnet werden)
  const rows = [];
  for (const [i, m] of MOMENTS.entries()) for (const run of runs) {
    const c = run.chosen[i];
    rows.push({ title: m.title, label: run.label, zoom: CELL / m.crop, at: m.at, time: c.e ? c.e.step / 60 : null, cells: run.crops[m.key] || [] });
  }
  const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
  const jpeg = await page.evaluate(async ({ rows, CELL, heading }) => {
    const LEFT = 210, GAP = 8, HEAD = 70, cols = 5, W = LEFT + cols * (CELL + GAP) + GAP;
    const H = HEAD + rows.length * (CELL + GAP) + GAP, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.fillStyle = '#10171c'; g.fillRect(0, 0, W, H);
    const font = (w, s) => `${w} ${s}px "Segoe UI", Arial, sans-serif`;
    g.fillStyle = '#edf1e5'; g.font = font(700, 26); g.textBaseline = 'middle'; g.fillText(heading, 16, 34);
    for (const [r, row] of rows.entries()) {
      const y = HEAD + r * (CELL + GAP);
      if (row.label !== 'nachher' || r === 0) { g.fillStyle = '#26323a'; g.fillRect(0, y - GAP / 2, W, 1); }
      g.fillStyle = '#edf1e5'; g.font = font(700, 19); g.fillText(row.title, 14, y + 26);
      g.fillStyle = row.label === 'nachher' ? '#9fe38a' : row.label === 'vorher' ? '#e8a07a' : '#9caeb6'; g.font = font(700, 16);
      g.fillText(row.label.toUpperCase(), 14, y + 54);
      g.fillStyle = '#8fa1a9'; g.font = font(500, 14);
      g.fillText(row.time == null ? 'kein Ereignis' : `bei ${row.time.toFixed(2)} s · Zoom ${row.zoom.toFixed(2).replace('.', ',')}×`, 14, y + 80);
      for (let k = 0; k < cols; k++) {
        const x = LEFT + GAP + k * (CELL + GAP), cell = row.cells[k];
        g.fillStyle = '#1b252b'; g.fillRect(x, y, CELL, CELL);
        if (cell) {
          const img = new Image(); img.src = 'data:image/png;base64,' + cell.png; await img.decode();
          g.drawImage(img, x, y, CELL, CELL);
        }
        g.fillStyle = 'rgba(16,23,28,.78)'; g.fillRect(x, y + CELL - 22, 74, 22);
        g.fillStyle = '#edf1e5'; g.font = font(600, 13); g.fillText(`+${row.at[k].toFixed(2).replace('.', ',')} s`, x + 6, y + CELL - 11);
      }
    }
    return c.toDataURL('image/jpeg', 0.9).split(',')[1];
  }, { rows, CELL, heading: `Scrap Wars · Effekte · ${ARENA_NAMES[arena] || arena} · Seed ${seed} · 1080p quer` });
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, Buffer.from(jpeg, 'base64'));
  const missing = MOMENTS.filter((m, i) => !runs.at(-1).chosen[i].e).map(m => m.title);
  console.log(`${out}${missing.length ? '  fehlend: ' + missing.join(', ') : ''}${runs.length === 2 ? '  Ereignisse gleich' : ''}`);
} finally { await browser.close(); }
