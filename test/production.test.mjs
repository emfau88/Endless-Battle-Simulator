// Produktionsgrenzen: echte Kindprozesse/Worker, Wiederholungsrezept und Schutz vorhandener Ergebnisse.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from '../lib/process.mjs';
import { publishOutputs } from '../lib/output.mjs';
import { sourceProvenance, exportRecipe } from '../lib/provenance.mjs';
import { renderTrackAsync } from '../lib/audio-job.mjs';
import { renderTrack, synthSample, SAMPLE_RATE } from '../lib/audio.mjs';
import { exportVideo } from '../lib/exporter.mjs';
import { ROOT } from '../lib/browser.mjs';

async function temporary(t) {
  const dir = await mkdtemp(join(tmpdir(), 'ebs-production-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const aborted = (e) => e.name === 'AbortError';
const cfg = { scenario: 'marble', seed: 42, video: { aspect: '16:9', resolution: 720, durationSec: 1 } };
const fast = { gpu: false, encoder: { preset: 'ultrafast' } };
const audio = { events: { hit: { samples: ['synth:cannon'], gain: 0.4 } } };
const samples = new Map([['synth:cannon', synthSample('synth:cannon')]]);
const events = (n) => Array.from({ length: n }, (_, i) => ({ seq: i, step: i * 2, type: 'hit', x: i % 1920, p: 1 }));

test('Abbruch beendet einen laufenden Kindprozess vor Rückgabe und startet bei vorherigem Abbruch keinen Export', async (t) => {
  const dir = await temporary(t), pidFile = join(dir, 'pid'), ac = new AbortController();
  const pending = assert.rejects(run(process.execPath, ['-e',
    'require("fs").writeFileSync(process.argv[1], String(process.pid)); setInterval(() => {}, 1000)', pidFile], { signal: ac.signal }), aborted);
  try {
    for (let i = 0; i < 100 && !existsSync(pidFile); i++) await delay(20);
    assert.ok(existsSync(pidFile), 'Kindprozess ist nicht gestartet');
    const pid = Number(await readFile(pidFile, 'utf8')), start = Date.now();
    ac.abort(); await pending;
    assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
    assert.ok(Date.now() - start < 2500, 'Kindprozess-Abbruch dauert zu lange');
    await assert.rejects(exportVideo(cfg, { ...fast, signal: ac.signal, out: join(dir, 'never.mp4') }), aborted);
    assert.deepEqual(await readdir(dir), ['pid']);
  } finally { ac.abort(); await pending; }
});

test('Audio-Worker erzeugt dieselben WAV-Bytes, Messwerte und Prüfsummen wie der bisherige synchrone Mischer', async (t) => {
  const dir = await temporary(t), options = { totalSamples: 2 * SAMPLE_RATE, volume: { master: 80, hit: 120 } };
  const expected = renderTrack(events(20), audio, samples, { ...options, file: join(dir, 'sync.wav') });
  const progress = [];
  const actual = await renderTrackAsync(events(20), audio, samples, { ...options, file: join(dir, 'worker.wav'), onProgress: (p) => progress.push(p) });
  assert.deepEqual(actual, expected);
  assert.deepEqual(await readFile(join(dir, 'worker.wav')), await readFile(join(dir, 'sync.wav')));
  assert.equal(progress.at(-1), 1);
  assert.ok(progress.every((p, i) => p >= (progress[i - 1] || 0)));
});

test('Laufender Audiomix lässt den Hauptthread frei und beendet den Worker beim Abbruch', async (t) => {
  const dir = await temporary(t), file = join(dir, 'audio.wav'), ac = new AbortController();
  let requestedAt, timerRan = false;
  await assert.rejects(renderTrackAsync(events(600), audio, samples, {
    totalSamples: 20 * SAMPLE_RATE, file, signal: ac.signal,
    onProgress: (p) => {
      if (p > 0 && p < 1 && requestedAt === undefined) {
        requestedAt = Date.now();
        setTimeout(() => { timerRan = true; ac.abort(); }, 0);
      }
    },
  }), aborted);
  assert.ok(timerRan, 'Hauptthread konnte den Abbruch nicht während der Mischung auslösen');
  assert.ok(Date.now() - requestedAt < 2500, 'Worker-Abbruch dauert zu lange');
  // Unter Windows würde ein noch offener WAV-Handle diesen Schritt verhindern.
  await rm(file, { force: true });
  assert.deepEqual(await readdir(dir), []);
});

test('Dateiübernahme rollt bei einem Fehler nach der ersten Datei MP4 und JSON zurück', async (t) => {
  const dir = await temporary(t), video = join(dir, 'video.mp4'), json = join(dir, 'video.json'), staged = join(dir, 'new.mp4');
  await writeFile(video, 'previous video'); await writeFile(json, 'previous metadata'); await writeFile(staged, 'new video');
  await assert.rejects(publishOutputs([{ staged, target: video }, { staged: join(dir, 'missing.json'), target: json }], { backupDir: dir }), { code: 'ENOENT' });
  assert.equal(await readFile(video, 'utf8'), 'previous video');
  assert.equal(await readFile(json, 'utf8'), 'previous metadata');
  assert.deepEqual((await readdir(dir)).sort(), ['video.json', 'video.mp4']);
});

test('Programmstand unterscheidet sauberes Git, geänderte/unversionierte Quellen und fehlendes Repository', async (t) => {
  const dir = await temporary(t);
  assert.equal((await sourceProvenance({ cwd: dir })).git.status, 'unavailable');
  const git = async (...args) => { const r = await run('git', args, { cwd: dir }); assert.equal(r.code, 0, r.stderr); };
  await git('init', '-q'); await writeFile(join(dir, 'source.js'), 'original'); await git('add', 'source.js');
  await git('-c', 'user.name=Production Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'fixture');
  const clean = await sourceProvenance({ cwd: dir });
  assert.equal(clean.git.status, 'clean'); assert.match(clean.git.commit, /^[a-f0-9]{40}$/);
  await writeFile(join(dir, 'source.js'), 'changed'); await writeFile(join(dir, 'extra.js'), 'untracked');
  const dirty = await sourceProvenance({ cwd: dir, scripts: [join(dir, 'extra.js')] });
  assert.equal(dirty.git.status, 'dirty'); assert.equal(dirty.git.commit, clean.git.commit);
  assert.ok(dirty.git.changes.some((s) => s.includes('source.js')));
  assert.ok(dirty.git.changes.some((s) => s === '?? extra.js'));
  assert.match(dirty.scripts[0].sha256, /^[a-f0-9]{64}$/);
});

test('Wiederholungsrezept übernimmt nur deklarative Capturewerte, keine fremden Pfade oder Skripte', () => {
  const recipe = exportRecipe({ config: cfg, exportOptions: { gpu: false, jpegQuality: 0.87, out: 'unwanted.mp4', scripts: ['untrusted.js'] } });
  assert.equal(recipe.config, cfg);
  assert.deepEqual(recipe.options, { gpu: false, jpegQuality: 0.87 });
});

for (const phase of ['starting', 'rendering', 'encoding', 'audio-loading', 'audio-mixing', 'muxing', 'verifying', 'saving']) {
  test(`Abbruch in Phase ${phase}: vorhandene MP4/JSON bleiben erhalten, keine temporären Dateien`, async (t) => {
    const dir = await temporary(t), out = join(dir, 'existing.mp4'), json = join(dir, 'existing.json');
    await writeFile(out, 'previous video'); await writeFile(json, 'previous metadata');
    const ac = new AbortController(); let reached = false;
    await assert.rejects(exportVideo(cfg, { ...fast, out, signal: ac.signal, onProgress: (p) => {
      assert.ok(p.progress < 1, 'Ein noch laufender Export meldet 100 %');
      if (p.phase === phase && (phase !== 'rendering' || p.frame > 0) && (phase !== 'audio-mixing' || p.audioProgress > 0)) {
        reached = true; ac.abort();
      }
    } }), aborted);
    assert.ok(reached, `Phase ${phase} wurde nicht erreicht`);
    assert.equal(await readFile(out, 'utf8'), 'previous video');
    assert.equal(await readFile(json, 'utf8'), 'previous metadata');
    assert.deepEqual((await readdir(dir)).sort(), ['existing.json', 'existing.mp4']);
  });
}

test('Fehlgeschlagene Simulationsprüfung veröffentlicht kein Video und ersetzt keine vorhandenen Dateien', async (t) => {
  const dir = await temporary(t), out = join(dir, 'existing.mp4'), json = join(dir, 'existing.json'), script = join(dir, 'broken.js');
  const source = await readFile(join(ROOT, 'test/fixtures/dummy-scenario.js'), 'utf8');
  await writeFile(script, source.replace('ok: this.x > 0 && this.x < this.world.w, errors: []', 'ok: false, errors: ["injected failure"]'));
  await writeFile(out, 'previous video'); await writeFile(json, 'previous metadata');
  await assert.rejects(exportVideo({ ...cfg, scenario: 'dummy' }, { ...fast, out, scripts: [script] }), /Exportprüfung fehlgeschlagen:.*injected failure/);
  assert.equal(await readFile(out, 'utf8'), 'previous video');
  assert.equal(await readFile(json, 'utf8'), 'previous metadata');
  assert.deepEqual((await readdir(dir)).sort(), ['broken.js', 'existing.json', 'existing.mp4']);
});

test('Sidecar-Rezept wiederholt wirksame Encoder-/Capturewerte, Zustand und Audio auch über die CLI', async (t) => {
  const dir = await temporary(t), original = join(dir, 'original.mp4'), repeat = join(dir, 'repeat.mp4');
  const first = await exportVideo({ ...cfg, preset: 'medium', video: { ...cfg.video, durationSec: 2 } }, {
    ...fast, out: original, jpegQuality: 0.83, encoder: { crf: 26, preset: 'ultrafast' },
  });
  const side = JSON.parse(await readFile(first.sidecar, 'utf8'));
  assert.deepEqual(side.config.video.quality, { crf: 26, preset: 'ultrafast', bitrate: null });
  assert.deepEqual(side.video.encoder, side.config.video.quality);
  assert.deepEqual(side.exportOptions, { gpu: false, jpegQuality: 0.83 });
  assert.match(side.audio.eventHash, /^[a-f0-9]{64}$/);
  for (const k of ['node', 'playwright', 'chromium', 'pixi', 'matter', 'ffmpeg', 'ffprobe']) assert.ok(side.versions[k], k);
  assert.match(side.provenance.git.commit, /^[a-f0-9]{40}$/);
  const cli = await run(process.execPath, [join(ROOT, 'export.mjs'), '--config', first.sidecar, '--out', repeat]);
  assert.equal(cli.code, 0, cli.stderr + cli.stdout);
  const replay = JSON.parse(await readFile(repeat.replace('.mp4', '.json'), 'utf8'));
  assert.deepEqual(replay.config, side.config);
  assert.deepEqual(replay.exportOptions, side.exportOptions);
  assert.deepEqual(replay.audio, side.audio);
  assert.equal(replay.stateHash, side.stateHash);
  assert.deepEqual(await readFile(repeat), await readFile(original), 'Wiederholung auf demselben Software-Renderer liefert andere MP4-Bytes');
  assert.ok(!(await readdir(dir)).some((f) => f.startsWith('.ebs-export-')));
});
