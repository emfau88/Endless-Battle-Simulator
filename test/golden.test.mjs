// Referenz-Hashes: Die Simulation beider Szenarien verhält sich bei festen Seeds exakt wie beim gespeicherten Stand.
// Schlägt dieser Test nach einer gewollten Verhaltensänderung fehl: node scripts/golden-hashes.mjs --write
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launchBrowser } from '../lib/browser.mjs';
import { CASES, CHECKPOINTS, computeGolden, diffGolden, readGolden } from '../scripts/golden-hashes.mjs';

let browser, stored, current;
before(async () => {
  browser = await launchBrowser({ gpu: false });
  stored = readGolden();
  current = await computeGolden(browser);
});
after(async () => { await browser?.close(); });

test('Referenzdatei ist vollständig und passt zu den installierten Versionen', () => {
  assert.deepEqual(Object.keys(stored.hashes).sort(), CASES.map((c) => c.key).sort(), 'Fälle in der Referenzdatei weichen ab');
  assert.deepEqual(stored.checkpoints, CHECKPOINTS);
  // Hashes gelten für genau diese Versionen; nach einem Update bewusst neu erzeugen und die Änderung prüfen
  assert.deepEqual(current.versions, stored.versions, 'Bibliotheks- oder Chromium-Version geändert – Referenz-Hashes neu erzeugen');
  const all = Object.values(stored.hashes).flatMap((r) => Object.values(r));
  assert.equal(new Set(all).size, all.length, 'zwei Fälle liefern denselben Hash – Fälle unterscheiden sich nicht');
});

test('Simulation unverändert: Naval und Marble, 9:16 und 16:9, zwei Seeds, Tempo 1 und 0,8', () => {
  const d = diffGolden(stored, current);
  assert.deepEqual(d, [], `Physikverlauf weicht von der Referenz ab:\n  ${d.join('\n  ')}`);
});
