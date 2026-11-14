import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const plain = value => JSON.parse(JSON.stringify(value));
const load = (context, file) => vm.runInContext(readFileSync(new URL('../src/' + file, import.meta.url), 'utf8'), context, { filename: file });

function registry() {
  const context = vm.createContext({ Matter: {} }); context.window = context;
  for (const file of ['core.js', 'scenarios/marble.js']) load(context, file);
  const { EBS } = context;
  const classic = EBS.getScenario('marble');
  const refs = { ...classic }, config = plain(EBS.normalizeConfig({ scenario: 'marble', seed: 73, params: { balls: 28, buffer: 3 } }));
  for (const file of ['scenarios/marble/production-simulation.js', 'scenarios/marble/production-audio.js', 'scenarios/marble/production.js', 'production-presets.js']) load(context, file);
  return { EBS, classic, refs, config };
}

test('Marble Works registers independently without changing any Classic registry property or normalized setting', () => {
  const { EBS, classic, refs, config } = registry();
  assert.equal(EBS.getScenario('marble'), classic);
  assert.deepEqual(Object.keys(classic), Object.keys(refs));
  for (const key of Object.keys(refs)) assert.equal(classic[key], refs[key], `Classic property changed: ${key}`);
  assert.deepEqual(plain(EBS.normalizeConfig({ scenario: 'marble', seed: 73, params: { balls: 28, buffer: 3 } })), config);
  assert.deepEqual([...EBS.scenarios.keys()], ['marble', 'marbleworks']);
  assert.notEqual(EBS.getScenario('marbleworks'), classic);
  assert.equal(EBS.getScenario('marbleworks').title, 'Marble Works · Progressive Factory');
});

test('Only the exact legacy Progressive recipe migrates to Marble Works; input objects remain untouched', () => {
  const { EBS } = registry();
  const legacy = { scenario: 'marble', seed: 73, params: { factoryMode: 'progressive', material: 'steel', orderSize: 96 }, video: { aspect: '16:9' } };
  const before = structuredClone(legacy), migrated = EBS.normalizeConfig(legacy);
  assert.deepEqual(legacy, before);
  assert.equal(migrated.scenario, 'marbleworks');
  assert.equal(migrated.params.factoryMode, undefined);
  assert.equal(migrated.params.material, 'steel'); assert.equal(migrated.params.orderSize, 96);
  assert.equal(migrated.video.aspect, '16:9'); assert.equal(migrated.seed, 73);
  assert.equal(EBS.normalizeConfig({ scenario: 'marble', factoryMode: 'progressive' }).scenario, 'marbleworks');
  for (const factoryMode of [undefined, 'classic', 'unknown', true]) {
    const classic = EBS.normalizeConfig({ scenario: 'marble', params: { factoryMode, balls: 28, buffer: 1 } });
    assert.equal(classic.scenario, 'marble');
    assert.deepEqual(plain(classic.params), { balls: 28, buffer: 1, warmup: 30 });
  }
});

test('Marble Works presets select their own scenario while the original Marble templates stay exact', () => {
  const { EBS } = registry();
  for (const kind of ['short', 'long']) {
    const classic = JSON.parse(readFileSync(new URL(`../presets/production/marble-${kind}.json`, import.meta.url), 'utf8'));
    const production = JSON.parse(readFileSync(new URL(`../presets/production/marbleworks-${kind}.json`, import.meta.url), 'utf8'));
    assert.deepEqual(plain(EBS.productionPreset('marble', kind)), classic);
    assert.deepEqual(plain(EBS.productionPreset('marbleworks', kind)), production);
    assert.equal(production.scenario, 'marbleworks');
    assert.equal(production.params.exportLength, 'order');
    assert.equal(EBS.productionPreset('marbleworks', kind, 731).seed, 731);
  }
});
