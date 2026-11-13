#!/usr/bin/env node
// Referenz-Hashes der Simulation: halten fest, wie sich Seeschlacht, Kugelfabrik und Myzel bei festen Seeds verhalten.
// Damit lässt sich nach einer Änderung belegen, dass die Physik unverändert ist (oder wo sie bewusst abweicht).
//   node scripts/golden-hashes.mjs           vergleicht den aktuellen Code mit test/fixtures/golden-hashes.json
//   node scripts/golden-hashes.mjs --write   schreibt die Datei neu (nur nach einer gewollten Verhaltensänderung)
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, launchBrowser, openExportPage } from '../lib/browser.mjs';

export const GOLDEN_FILE = join(ROOT, 'test', 'fixtures', 'golden-hashes.json');
// Prüfpunkte in Physikschritten (60 je Sekunde bei Tempo 1; bei Tempo 0,8 deckt ein Schritt 0,8/60 s ab)
export const CHECKPOINTS = [1200, 7200];
export const CASES = [];
for (const scenario of ['naval', 'marble', 'mycelium']) for (const aspect of ['9:16', '16:9']) for (const seed of [42, 7]) for (const tempo of [1, 0.8, 0.64]) {
  CASES.push({ key: `${scenario} ${aspect} seed${seed} tempo${tempo}`, scenario, aspect, seed, tempo });
}

/** Berechnet alle Hashes mit dem aktuellen Code (ohne Rendering, Software-Chromium). */
export async function computeGolden(browser) {
  const hashes = {};
  let versions = null;
  for (const c of CASES) {
    const { page, info, errors } = await openExportPage(browser, { scenario: c.scenario, seed: c.seed, video: { aspect: c.aspect, tempo: c.tempo } });
    if (info.scenario !== c.scenario || info.cfg.video.tempo !== c.tempo) throw new Error(`Konfiguration nicht übernommen: ${c.key}`);
    versions = versions || { playwright: JSON.parse(readFileSync(join(ROOT, 'node_modules', 'playwright', 'package.json'), 'utf8')).version, chromium: browser.version(), pixi: info.pixi, matter: info.matter };
    const row = {};
    let done = 0;
    for (const steps of CHECKPOINTS) {
      await page.evaluate((s) => window.exportAPI.simulate(s), (steps - done) / 60);
      done = steps;
      row[steps] = await page.evaluate(() => window.exportAPI.hash());
    }
    const check = await page.evaluate(() => window.exportAPI.check());
    if (!check.ok) throw new Error(`${c.key}: ${check.errors.join('; ')}`);
    if (errors.length) throw errors[0];
    hashes[c.key] = row;
    await page.close();
  }
  return { versions, checkpoints: CHECKPOINTS, hashes };
}

export const readGolden = () => JSON.parse(readFileSync(GOLDEN_FILE, 'utf8'));

/** Liste der Abweichungen zwischen gespeicherten und neu berechneten Hashes (leer = identisch). */
export function diffGolden(stored, current) {
  const out = [];
  for (const k of new Set([...Object.keys(stored.hashes), ...Object.keys(current.hashes)])) {
    const a = stored.hashes[k], b = current.hashes[k];
    if (!a || !b) { out.push(`${k}: ${a ? 'fehlt im aktuellen Lauf' : 'fehlt in der Referenzdatei'}`); continue; }
    for (const s of current.checkpoints) if (a[s] !== b[s]) out.push(`${k} nach ${s} Schritten: ${a[s]} -> ${b[s]}`);
  }
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const browser = await launchBrowser({ gpu: false });
  try {
    const t0 = Date.now(), current = await computeGolden(browser);
    console.log(`${CASES.length} Fälle × ${CHECKPOINTS.length} Prüfpunkte in ${((Date.now() - t0) / 1000).toFixed(1)} s · ${JSON.stringify(current.versions)}`);
    if (process.argv.includes('--write')) {
      const commit = process.argv[process.argv.indexOf('--commit') + 1];
      writeFileSync(GOLDEN_FILE, JSON.stringify({
        note: 'Referenz-Hashes der Simulation. Nur nach gewollter Verhaltensänderung neu schreiben: node scripts/golden-hashes.mjs --write',
        createdAt: new Date().toISOString().slice(0, 10), ...(process.argv.includes('--commit') ? { commit } : {}), ...current,
      }, null, 2) + '\n');
      console.log('geschrieben: ' + GOLDEN_FILE);
    } else {
      const stored = readGolden(), d = diffGolden(stored, current);
      if (JSON.stringify(stored.versions) !== JSON.stringify(current.versions)) console.log(`Hinweis: Versionen weichen ab (Referenz ${JSON.stringify(stored.versions)})`);
      console.log(d.length ? 'ABWEICHUNGEN:\n  ' + d.join('\n  ') : 'identisch mit der Referenz');
      process.exitCode = d.length ? 1 : 0;
    }
  } finally { await browser.close(); }
}
