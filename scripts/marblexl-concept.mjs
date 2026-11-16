#!/usr/bin/env node
// Entwurfsbild der Marble-XL-Produktionslinie (Übersicht und drei Ausschnitte) als PNG.
//   node scripts/marblexl-concept.mjs [--out output/marblexl-konzept]
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { ROOT, launchAuto, openExportPage } from '../lib/browser.mjs';

const i = process.argv.indexOf('--out');
const out = resolve(i > 0 ? process.argv[i + 1] : 'output/marblexl-konzept');
const crops = [
  { name: 'ausschnitt_aufzug_rohkugeln_waschen', x: 0, y: 60, w: 1920, h: 1080 },
  { name: 'ausschnitt_waschen_polieren_ofen', x: 860, y: 380, w: 1920, h: 1080 },
  { name: 'ausschnitt_farbe_kuehlen_pruefen', x: 1900, y: 1040, w: 1920, h: 1080 },
  { name: 'ausschnitt_radaufzug_sortierung', x: 60, y: 1040, w: 1920, h: 1080 },
];
const browser = await launchAuto();
try {
  const { page, errors } = await openExportPage(browser, { scenario: 'marble', seed: 42, video: { aspect: '16:9' } });
  await page.addScriptTag({ path: join(ROOT, 'src', 'scenarios', 'marblexl', 'concept.js') });
  const res = await page.evaluate((c) => window.EBS.MarbleXLConcept.exportImages(c), crops);
  if (errors.length) throw errors[0];
  await mkdir(out, { recursive: true });
  await writeFile(join(out, 'uebersicht.png'), Buffer.from(res.overview, 'base64'));
  for (let k = 0; k < crops.length; k++) await writeFile(join(out, crops[k].name + '.png'), Buffer.from(res.crops[k], 'base64'));
  console.log(`geschrieben nach ${out}`);
} finally { await browser.close(); }
