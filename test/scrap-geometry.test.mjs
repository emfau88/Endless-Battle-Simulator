import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeScrapMapHashes, SCRAP_MAP_FILE } from '../scripts/scrap-map-hashes.mjs';

test('Scrapyard-Geometrie: drei Seeds in beiden Grundrissen bleiben bis zu Folgerunden exakt reproduzierbar', () => {
  const { note, ...expected } = JSON.parse(readFileSync(SCRAP_MAP_FILE, 'utf8'));
  const actual = computeScrapMapHashes();
  assert.deepEqual(expected.cases.map(c => [c.aspect, c.seed]), [
    ['16:9', 42], ['16:9', 7], ['16:9', 314], ['9:16', 42], ['9:16', 7], ['9:16', 314],
  ]);
  assert.ok(expected.cases.every(c => c.checkpoints.map(p => p.step).join(',') === '0,600,2400,7200'));
  assert.deepEqual(actual, expected);
});
