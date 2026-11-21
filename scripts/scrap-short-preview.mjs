#!/usr/bin/env node
// Scrap Wars · Vorschaubilder des Shorts (R40/S1): Einstieg, Kampf und Sieger als Einzelbilder und als ein Blatt.
// Nur Darstellung; rechnet die Runde im Browser wie der Export.
//   node scripts/scrap-short-preview.mjs --seed 42 --out output/scrap-short
//   node scripts/scrap-short-preview.mjs --at 1,12.5,30   eigene Zeitpunkte in Sekunden statt der drei Standardbilder
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { launchAuto, openExportPage } from '../lib/browser.mjs';

const arg = (name, def) => { const i = process.argv.indexOf('--' + name); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : def; };
const seed = Number(arg('seed', 42)), out = resolve(arg('out', 'output/scrap-short')), custom = arg('at', '');
const cfg = { scenario: 'scrap', seed, params: { arena: 'sunshine', rulesVersion: 'v4', layout: 'short', soundMix: 'soft-v1' },
  video: { aspect: '9:16', resolution: 1080, fps: 30 }, view: { hud: true, camera: false } };

const browser = await launchAuto();
try {
  const { page, errors, info } = await openExportPage(browser, cfg);
  // 1) Ablauf vorab: Rundenende und ein Kampfmoment (erste Explosion, sonst der fünfte Treffer)
  const plan = await page.evaluate(() => {
    let snap; do snap = window.exportAPI.simulate(1); while (snap.phase === 'running' && snap.step < 120 * 60);
    const events = window.exportAPI.events(0), end = events.find(e => e.type === 'round_end');
    const hits = events.filter(e => e.type === 'hit'), fight = events.find(e => e.type === 'blast') || hits[4] || hits[0];
    return { end: end ? end.step / 60 : null, fight: fight ? fight.step / 60 : 10, winner: snap.winner, kos: events.filter(e => e.type === 'ko').map(e => +(e.step / 60).toFixed(1)) };
  });
  if (plan.end === null) throw new Error(`Seed ${seed}: Runde endet nicht in 120 s.`);
  const shots = custom ? custom.split(',').map((v, i) => ({ name: `bild-${i + 1}`, label: `${v} s`, sec: Number(v) }))
    : [{ name: 'einstieg', label: 'Einstieg · 1,0 s', sec: 1 }, { name: 'kampf', label: `Kampf · ${plan.fight.toFixed(1)} s`, sec: plan.fight + .15 },
      { name: 'sieger', label: `Sieger · ${(plan.end + 1).toFixed(1)} s`, sec: plan.end + 1 }];
  await page.evaluate(c => window.exportAPI.restart(c), cfg);
  await mkdir(out, { recursive: true });
  const images = []; let frame = 0;
  for (const shot of shots.sort((a, b) => a.sec - b.sec)) {
    const target = Math.max(frame + 1, Math.round(shot.sec * info.fps));
    const png = await page.evaluate(([sec]) => {
      if (sec > 0) window.exportAPI.simulate(sec);
      return window.exportAPI.renderFrames(1, 1, 'image/png')[0];
    }, [(target - frame - 1) / info.fps]);
    frame = target; images.push({ ...shot, png });
    await writeFile(join(out, `seed${seed}-${shot.name}.png`), Buffer.from(png, 'base64'));
  }
  if (errors.length) throw errors[0];
  // 2) Blatt: die Bilder nebeneinander, halbe Größe, mit Beschriftung
  const sheet = await page.evaluate(async ({ images, heading }) => {
    const W = 540, H = 960, GAP = 16, HEAD = 64, c = document.createElement('canvas');
    c.width = GAP + images.length * (W + GAP); c.height = HEAD + H + 44;
    const g = c.getContext('2d'); g.fillStyle = '#10171c'; g.fillRect(0, 0, c.width, c.height);
    g.textBaseline = 'middle'; g.fillStyle = '#edf1e5'; g.font = '700 24px "Segoe UI", Arial, sans-serif'; g.fillText(heading, GAP, 32);
    for (const [i, shot] of images.entries()) {
      const img = new Image(); img.src = 'data:image/png;base64,' + shot.png; await img.decode();
      const x = GAP + i * (W + GAP); g.imageSmoothingQuality = 'high'; g.drawImage(img, x, HEAD, W, H);
      g.fillStyle = '#9caeb6'; g.font = '600 17px "Segoe UI", Arial, sans-serif'; g.fillText(shot.label, x, HEAD + H + 22);
    }
    return c.toDataURL('image/jpeg', .92).split(',')[1];
  }, { images, heading: `Scrap Wars · Short · Sunny Yard · Seed ${seed} · 1080 × 1920` });
  const file = join(out, `seed${seed}-blatt.jpg`);
  await writeFile(file, Buffer.from(sheet, 'base64'));
  console.log(`${file}\n  Rundenende ${plan.end.toFixed(1)} s · K.o. bei ${plan.kos.join(', ')} s · Sieger ${['EMBER', 'AZURE', 'AMBER', 'MOSS'][plan.winner] ?? '–'}`);
  await page.close();
} finally { await browser.close(); }
