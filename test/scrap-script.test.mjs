// Scrap Wars · Drehbuch-Modus (R44/D2): Turnier mit festen Runden-Seeds, jede Runde geht aus wie ihre Zeile.
// Node prüft Schlüssel, Drehbuch und Ablauf; ob die Runden wirklich so ausgehen, prüft der Browser-Test (Chromium
// rechnet sin/cos wie der Export, Node nicht).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { ROOT, launchBrowser, openExportPage } from '../lib/browser.mjs';
import { castRounds, misses, playScript, NAMES } from '../scripts/scrap-script-casting.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const context = vm.createContext({}); context.window = context;
for (const path of ['core.js', 'scenarios/scrap/simulation.js', 'scenarios/scrap/rules.js', 'scenarios/scrap/materials.js',
  'scenarios/scrap/tactics.js', 'scenarios/scrap/episode.js']) vm.runInContext(read('src/' + path), context, { filename: path });
const { EBS } = context, plain = v => JSON.parse(JSON.stringify(v));
const preset = JSON.parse(readFileSync(join(ROOT, 'presets', 'scrap-jungle-drehbuch.json'), 'utf8'));
const SCRIPT = plain(EBS.Scrap.SCRIPTS['jungle-comeback']);

test('Drehbuch: nur im Turnier der Taktik-Arena auf seiner Arena; ohne Drehbuch fehlt der Schlüssel', () => {
  const n = p => plain(EBS.Scrap.normalizeParams(p)), id = 'jungle-comeback';
  const on = n({ arena: 'jungle', episodeMode: 'tournament', script: id, workshop: true });
  assert.deepEqual([on.script, on.workshop, on.items, on.rulesVersion], [id, false, 'rockets', 'v4']);
  assert.equal(n({ arena: 'jungle', episodeMode: 'endless', script: id }).script, undefined);
  assert.equal(n({ arena: 'sunshine', rulesVersion: 'v4', episodeMode: 'tournament', script: id }).script, undefined);
  assert.equal(n({ arena: 'jungle', episodeMode: 'tournament', script: 'toString' }).script, undefined);
  assert.equal(n({ arena: 'jungle', episodeMode: 'tournament', script: 'off' }).script, undefined);
  assert.ok(!('script' in n({ arena: 'jungle', episodeMode: 'tournament' })));
  assert.ok(!('script' in n({ arena: 'sunshine', rulesVersion: 'v4', items: 'rockets', episodeMode: 'tournament' })));
  assert.equal(n(preset.params).script, id, 'Vorlage');
});

test('Drehbuch „Comeback“: zwölf Zeilen, AMBER holt auf, vor dem Finale 4:4, eigene Seeds je Runde', () => {
  assert.equal(SCRIPT.arena, 'jungle'); assert.equal(SCRIPT.rounds.length, 12);
  const wins = [0, 0, 0, 0], standings = [];
  for (const line of SCRIPT.rounds) {
    for (const key of Object.keys(line)) assert.ok(['winner', 'second', 'firstOut', 'close', 'rocket', 'seed'].includes(key), key);
    for (const key of ['winner', 'second', 'firstOut']) if (key in line) assert.ok([0, 1, 2, 3].includes(line[key]), key);
    assert.notEqual(line.second, line.winner); assert.notEqual(line.firstOut, line.winner);
    assert.ok(Number.isInteger(line.seed) && line.seed > 0, `Seed ${line.seed}`);
    wins[line.winner]++; standings.push([...wins]);
  }
  assert.equal(new Set(SCRIPT.rounds.map(l => l.seed)).size, 12, 'jeder Seed nur einmal');
  assert.equal(new Set(SCRIPT.rounds.slice(0, 3).map(l => l.winner)).size, 3, 'drei verschiedene Sieger zu Beginn');
  assert.deepEqual(standings[5], [3, 2, 0, 1], 'nach Runde 6: AMBER ohne Sieg');
  assert.deepEqual(standings[10], [4, 2, 4, 1], 'vor dem Finale: EMBER und AMBER gleichauf');
  assert.deepEqual(wins, [4, 2, 5, 1]);
  assert.deepEqual(SCRIPT.rounds[11], { ...SCRIPT.rounds[11], winner: 2, second: 0, close: true, rocket: true });
});

test('Episode mit Drehbuch: Runden-Seeds aus dem Drehbuch, zwölf Runden, danach Abspann; ohne Drehbuch acht', () => {
  const run = params => {
    const sim = new EBS.Scrap.Episode({ seed: 5, params, world: { w: 1920, h: 1080 }, view: { camera: false } });
    const seeds = []; let seq = 0;
    while (sim.phase !== 'ended' && sim.step < 20 * 60 * 60) {
      sim.stepOnce();
      for (const e of sim.events) if (e.seq >= seq) { seq = e.seq + 1; if (e.type === 'round_start') seeds.push(e.roundSeed); }
      if (sim.step % 600 === 0) assert.ok(sim.checkInvariants().ok, JSON.stringify(sim.checkInvariants().errors));
    }
    const out = { seeds, total: sim.totalRounds, completed: sim.completedRounds, phase: sim.phase, ok: sim.checkInvariants().ok, hash: sim.stateHash() };
    sim.destroy(); return out;
  };
  const scripted = run(preset.params);
  assert.deepEqual([scripted.total, scripted.completed, scripted.phase, scripted.ok], [12, 12, 'ended', true]);
  assert.deepEqual(scripted.seeds, SCRIPT.rounds.map(l => l.seed));
  assert.equal(run(preset.params).hash, scripted.hash, 'wiederholbar');
  const free = run({ ...preset.params, script: 'off' });
  assert.deepEqual([free.total, free.completed, free.seeds[0]], [8, 8, 5]);
});

let browser;
before(async () => { browser = await launchBrowser({ gpu: false }); });
after(async () => { await browser?.close(); });

test('Drehbuch im Browser: jede Runde geht aus wie ihre Zeile, Endstand, Kapitel, Schalter, Videolänge', async () => {
  const { page, errors } = await openExportPage(browser, preset);
  try {
    await page.addScriptTag({ content: `window.playScript = ${playScript.toString()}; window.castRounds = ${castRounds.toString()};` });
    const out = await page.evaluate(([params, seeds]) => {
      const sc = EBS.getScenario('scrap'), control = sc.controls.find(c => c.key === 'script');
      const played = window.playScript(EBS, params);
      const rows = window.castRounds(EBS, seeds, { arena: 'jungle', rulesVersion: 'v4', portrait: false, short: false, items: 'rockets' });
      let snap; do snap = exportAPI.simulate(1); while (snap.phase !== 'ended' && snap.step < 1200 * 60);
      return { played, rows, chapters: exportAPI.chapters(), natural: exportAPI.info().naturalDuration,
        control: { label: control.label, options: control.options.map(o => o[0]),
          enabled: [control.enabled({ episodeMode: 'tournament', arena: 'jungle' }), control.enabled({ episodeMode: 'endless', arena: 'jungle' }), control.enabled({ episodeMode: 'tournament', arena: 'sunshine' })] },
        ui: [sc.normalizeParams({ arena: 'jungle', episodeMode: 'tournament' }).script, sc.normalizeParams(params).script] };
    }, [preset.params, SCRIPT.rounds.map(l => l.seed)]);
    SCRIPT.rounds.forEach((line, i) => {
      const row = out.rows[i], played = out.played.rounds[i];
      assert.deepEqual(misses(line, row), [], `Runde ${i + 1} (Seed ${line.seed}): ${JSON.stringify(row)}`);
      assert.deepEqual([played.seed, played.winner, played.order], [line.seed, row.winner, row.order], `Runde ${i + 1}: Episode wie einzelne Runde`);
    });
    assert.deepEqual(out.played.wins, [4, 2, 5, 1]); assert.deepEqual(out.played.champions, [2], `Sieger ${NAMES[2]}`);
    assert.deepEqual([out.played.total, out.played.ended, out.played.ok], [12, true, true]);
    assert.ok(out.played.length >= 480 && out.played.length <= 600, `Video ${out.played.length} s`);
    assert.equal(out.natural, true);
    assert.deepEqual(out.chapters.map(c => c.title), [...Array.from({ length: 11 }, (_, i) => `Round ${i + 1}`), 'Round 12 – Final']);
    assert.deepEqual(out.control, { label: 'Drehbuch', options: ['off', 'jungle-comeback'], enabled: [true, false, false] });
    assert.deepEqual(out.ui, ['off', 'jungle-comeback']);
    assert.deepEqual(errors.map(e => e.message), []);
  } finally { await page.close(); }
});
