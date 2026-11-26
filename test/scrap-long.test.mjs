// Scrap Wars · Langvideo-Vorlage (R40, L1): Turnier in der Taktik-Arena, Kapitelzeiten aus den Rundenstarts
// in der JSON-Begleitdatei.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT, launchBrowser, openExportPage } from '../lib/browser.mjs';
import { chapterList, exportVideo, verifyResult } from '../lib/exporter.mjs';
import { castTournaments, judge, PARAMS } from '../scripts/scrap-tournament-casting.mjs';

const dir = mkdtempSync(join(tmpdir(), 'ebs-scrap-long-'));
let browser;
before(async () => { browser = await launchBrowser({ gpu: false }); });
after(async () => { await browser?.close(); rmSync(dir, { recursive: true, force: true }); });
const preset = kind => JSON.parse(readFileSync(join(ROOT, 'presets', 'production', `scrap-${kind}.json`), 'utf8'));

test('Kapitelliste: Zeitmarken abgerundet (m:ss, ab einer Stunde h:mm:ss), ungültige Einträge entfallen', () => {
  assert.equal(chapterList(null), null); assert.equal(chapterList([]), null);
  assert.equal(chapterList([{ timeSec: -1, title: 'x' }, { timeSec: 3 }, { timeSec: NaN, title: 'y' }]), null);
  assert.deepEqual(chapterList([{ timeSec: 0, title: 'Round 1' }, { timeSec: 41.983, title: 'Round 2' }, { timeSec: 3725.5, title: 'Late' }, { timeSec: 5, title: '' }]),
    [{ timeSec: 0, time: '0:00', title: 'Round 1' }, { timeSec: 41.983, time: '0:41', title: 'Round 2' }, { timeSec: 3725.5, time: '1:02:05', title: 'Late' }]);
});

test('Scrap-Langvideo-Vorlage: Turnier mit acht Runden in der Taktik-Arena; Kapitel = Rundenstarts; Short ohne Kapitel', async () => {
  const long = preset('long');
  assert.deepEqual([long.params.episodeMode, long.params.rulesVersion, long.params.arena, long.params.soundMix, long.video.aspect],
    ['tournament', 'v4', 'sunshine', 'soft-v1', '16:9']);
  // L2: Raketen-Regeln wie im Short, 4 s Ergebnis zwischen den Runden, geprüfter Turnier-Seed
  assert.deepEqual([long.params.items, long.params.endPauseSec, long.seed], ['rockets', 4, 458]);
  assert.deepEqual({ ...PARAMS, soundMix: 'soft-v1' }, long.params, 'Casting rechnet mit den Werten der Vorlage');
  const { page, errors } = await openExportPage(browser, long);
  try {
    const out = await page.evaluate(() => {
      const fromUi = EBS.productionPreset('scrap', 'long'), early = exportAPI.chapters();
      const starts = []; let seq = 0, snap;
      // Reine Simulation bis zum Turnierende; Rundenstarts aus dem Ereignisprotokoll mitschreiben
      do {
        snap = exportAPI.simulate(1);
        for (const e of exportAPI.events(seq)) { seq = e.seq + 1; if (e.type === 'round_start') starts.push(e.step / 60); }
      } while (snap.phase !== 'ended' && snap.step < 1200 * 60);
      return { fromUi, early, starts, chapters: exportAPI.chapters(), snap: { phase: snap.phase, completed: snap.completedRounds, sec: snap.step / 60 }, natural: exportAPI.info().naturalDuration };
    });
    assert.deepEqual(out.fromUi, long, 'Datei und Oberfläche');
    assert.equal(out.natural, true); assert.equal(out.early, null, 'eine einzelne Runde ergibt noch keine Kapitel');
    assert.deepEqual([out.snap.phase, out.snap.completed], ['ended', 8]);
    assert.ok(out.snap.sec > 200 && out.snap.sec < 420, `Turnier dauert ${out.snap.sec} s`);
    assert.equal(out.chapters.length, 8);
    assert.deepEqual(out.chapters.map(c => c.title), ['Round 1', 'Round 2', 'Round 3', 'Round 4', 'Round 5', 'Round 6', 'Round 7', 'Round 8 – Final']);
    assert.equal(out.chapters[0].timeSec, 0);
    out.chapters.forEach((c, i) => {
      assert.ok(Math.abs(c.timeSec - out.starts[i]) < 1e-3, `Kapitel ${i + 1} liegt auf dem Rundenstart`);
      if (i) assert.ok(c.timeSec - out.chapters[i - 1].timeSec >= 10, 'Kapitel mindestens 10 s lang');
    });
    // Short: eine Runde, keine Kapitel
    await page.evaluate(c => exportAPI.restart(c), preset('short'));
    assert.equal(await page.evaluate(() => { exportAPI.simulate(40); return exportAPI.chapters(); }), null);
    assert.deepEqual(errors.map(e => e.message), []);
  } finally { await page.close(); }
});

test('Scrap-Langvideo (L2): Schalter „Waffen“, alle Turnier-Seeds bleiben in Chromium bis zur letzten Runde offen', async () => {
  const { page, errors } = await openExportPage(browser, preset('long'));
  try {
    await page.addScriptTag({ content: `window.castTournaments = ${castTournaments.toString()};` });
    const out = await page.evaluate(params => {
      const sc = EBS.getScenario('scrap'), control = sc.controls.find(c => c.key === 'items'), n = p => sc.normalizeParams(p);
      return { label: control.label, options: control.options.map(o => o[0]),
        enabled: [control.enabled({ rulesVersion: 'v4', layout: 'standard' }), control.enabled({ rulesVersion: 'v3', layout: 'standard' }), control.enabled({ rulesVersion: 'v4', layout: 'short' })],
        // Der Schlüssel gilt nur in der Taktik-Arena; die Episode kennt ihn nur, wenn er an ist (gleiche Zustands-Hashes)
        ui: [n({ rulesVersion: 'v4', items: 'rockets' }).items, n({ rulesVersion: 'v3', items: 'rockets' }).items, n({ rulesVersion: 'v4' }).items],
        episode: ['items' in EBS.Scrap.normalizeParams({ rulesVersion: 'v4', items: 'rockets' }), 'items' in EBS.Scrap.normalizeParams({ rulesVersion: 'v3', items: 'rockets' }), 'items' in EBS.Scrap.normalizeParams({ rulesVersion: 'v4' })],
        seeds: EBS.Scrap.LONG_SEEDS, picks: [1, 458, 459, 470, 99999].map(seed => EBS.Scrap.castTournamentSeed(seed)),
        rows: window.castTournaments(EBS, EBS.Scrap.LONG_SEEDS, params) };
    }, PARAMS);
    assert.equal(out.label, 'Waffen'); assert.deepEqual(out.options, ['classic', 'rockets']);
    assert.deepEqual(out.enabled, [true, false, false]);
    assert.deepEqual(out.ui, ['rockets', 'classic', 'classic']); assert.deepEqual(out.episode, [true, false, false]);
    assert.deepEqual(out.seeds, [458, 469, 489]); assert.deepEqual(out.picks, [458, 458, 469, 489, 458]);
    for (const r of out.rows.map(judge)) {
      assert.ok(r.complete, `Seed ${r.seed}: ${JSON.stringify({ checks: r.checks, wins: r.wins, before: r.before, length: r.length, hang: r.hang })}`);
      // Vor der letzten Runde liegen drei Roboter mit je zwei Siegen gleichauf
      assert.deepEqual([...r.before].sort(), [1, 2, 2, 2], `Seed ${r.seed}: Stand vor Runde 8`);
      assert.ok(r.length >= 280 && r.length <= 320, `Seed ${r.seed}: ${r.length} s`);
    }
    assert.deepEqual(errors.map(e => e.message), []);
  } finally { await page.close(); }
});

test('Scrap-Langvideo: Export der letzten zwei Sekunden schreibt die Kapitelzeiten in die JSON-Begleitdatei', async () => {
  const long = preset('long');
  const { page } = await openExportPage(browser, long);
  let planned;
  try { planned = await page.evaluate(() => { let p; do p = exportAPI.planEpisode(); while (!p.done); return p.durationSec; }); } finally { await page.close(); }
  const r = await exportVideo({ ...long, video: { ...long.video, durationSec: 1, resolution: 720, audio: false } },
    { out: join(dir, 'turnier-ende.mp4'), gpu: false, encoder: { preset: 'ultrafast' }, clip: { startSec: planned - 2, durationSec: 2 } });
  assert.deepEqual(verifyResult(r), []);
  assert.equal(r.cfg.video.durationSec, planned); assert.deepEqual([r.snapshot.phase, r.snapshot.completedRounds], ['ended', 8]);
  const meta = JSON.parse(readFileSync(r.sidecar, 'utf8'));
  assert.deepEqual(meta.chapters, r.chapters); assert.equal(meta.chapters.length, 8);
  assert.deepEqual(meta.chapters[0], { timeSec: 0, time: '0:00', title: 'Round 1' });
  assert.equal(meta.chapters[7].title, 'Round 8 – Final'); assert.match(meta.chapters[7].time, /^\d:\d\d$/);
  assert.equal(meta.chaptersText.split('\n').length, 8); assert.ok(meta.chaptersText.startsWith('0:00 Round 1\n'));
  assert.equal(meta.chaptersScope, 'full-episode');
  // Die Begleitdatei bleibt ein gültiges Rezept
  assert.equal(meta.config.params.episodeMode, 'tournament');
});
