import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { INDEX, ROOT, launchBrowser, openExportPage } from '../lib/browser.mjs';
import { exportVideo, verifyResult, ffmpegBin, run } from '../lib/exporter.mjs';
import { loadSamples, renderTrack, SAMPLE_RATE } from '../lib/audio.mjs';

const dir = mkdtempSync(join(tmpdir(), 'ebs-scrap-'));
let browser;
before(async () => { browser = await launchBrowser({ gpu: false }); });
after(async () => { await browser?.close(); rmSync(dir, { recursive: true, force: true }); });
const config = (video = {}, params = {}) => ({ scenario: 'scrap', seed: 42, params,
  video: { aspect: '9:16', resolution: 720, fps: 30, durationSec: 3, ...video } });
const options = name => ({ out: join(dir, name + '.mp4'), gpu: false, encoder: { preset: 'ultrafast' } });
const audit = join(ROOT, 'test', 'fixtures', 'capture-audit.js');

test('Scrap: Canvas-Upload, beide Formate/Quadrat und 30/60 fps erhalten Simulation und Ereignisse', async () => {
  for (const aspect of ['9:16', '16:9', '1:1']) {
    const { page, errors } = await openExportPage(browser, config({ aspect }));
    try {
      const drawn = await page.evaluate(() => {
        exportAPI.renderFrames(12);
        return { hash: exportAPI.hash(), events: exportAPI.events(0) };
      });
      await page.evaluate(() => { exportAPI.restart({ video: { fps: 60 } }); exportAPI.renderFrames(24); });
      assert.equal(await page.evaluate(() => exportAPI.hash()), drawn.hash);
      assert.deepEqual(await page.evaluate(() => exportAPI.events(0)), drawn.events);
      await page.evaluate(() => { exportAPI.restart({ video: { fps: 30 } }); exportAPI.simulate(.4); });
      assert.equal(await page.evaluate(() => exportAPI.hash()), drawn.hash);
      const readOnly = await page.evaluate(() => {
        const cfg = exportAPI.config(), world = exportAPI.info().world, sc = EBS.getScenario('scrap');
        const sim = sc.create({ seed: cfg.seed, params: cfg.params, world, timeScale: cfg.video.tempo });
        for (let i = 0; i < 54 * 60; i++) sim.stepOnce(); // result banner during pause
        const renderer = sc.createRenderer({ sim, world, renderScale: .5, view: cfg.view });
        const before = sim.stateHash(); renderer.draw(); renderer.draw(); const after = sim.stateHash();
        renderer.destroy(); return { before, after, phase: sim.phase };
      });
      assert.equal(readOnly.phase, 'pause'); assert.equal(readOnly.before, readOnly.after);
      assert.deepEqual(errors.map(e => e.message), []);
    } finally { await page.close(); }
  }
});

test('Scrap: UI-Regler, Teilen-Link und JSON bewahren Runde, Pause, Tempo, Bild und Ton', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  try {
    await page.goto(pathToFileURL(INDEX).href + '?scenario=scrap&seed=314&tempo=0.8');
    await page.waitForFunction(() => window.EBS?.app?.cfg.scenario === 'scrap');
    await page.uncheck('#p-repeatRounds');
    await page.locator('#p-endPauseSec').evaluate(el => { el.value = '7'; el.dispatchEvent(new Event('change')); });
    await page.locator('#vol-rocket').evaluate(el => { el.value = '135'; el.dispatchEvent(new Event('input')); });
    const expected = await page.evaluate(() => EBS.app.cfg);
    assert.equal(expected.params.repeatRounds, false); assert.equal(expected.params.endPauseSec, 7);
    assert.equal(expected.video.tempo, .8); assert.equal(expected.video.volume.rocket, 135);
    await page.waitForFunction(() => document.querySelector('#shareLink').value.includes('vol.rocket=135'));
    const link = await page.inputValue('#shareLink');
    // Reload in the same tab: two continuously painted software-WebGL previews
    // needlessly compete for the renderer on slow CI machines.
    await page.goto(link); await page.waitForFunction(() => window.EBS?.app?.cfg.scenario === 'scrap');
    assert.deepEqual(await page.evaluate(() => EBS.app.cfg), expected);
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#btnSaveCfg')]);
    const file = join(dir, 'scrap-config.json'); await download.saveAs(file);
    assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), expected);
    await page.selectOption('#scenario', 'naval'); await page.setInputFiles('#cfgFile', file);
    await page.waitForFunction(() => EBS.app.cfg.scenario === 'scrap');
    assert.deepEqual(await page.evaluate(() => EBS.app.cfg), expected);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  } finally { await page.close(); }
});

test('Scrap: echte kurze MP4s beider Formate entsprechen der Simulation; Exportrezept reproduziert Ton und Bild', async () => {
  for (const aspect of ['9:16', '16:9']) {
    const c = config({ aspect, durationSec: 2, audio: aspect === '16:9' });
    const r = await exportVideo(c, options(aspect === '9:16' ? 'portrait' : 'landscape'));
    assert.deepEqual(verifyResult(r), []);
    const { page } = await openExportPage(browser, c);
    try {
      await page.evaluate(() => exportAPI.simulate(2));
      assert.equal(await page.evaluate(() => exportAPI.hash()), r.stateHash);
      if (c.video.audio) {
        assert.deepEqual(await page.evaluate(() => exportAPI.events(0)), r.audioEvents);
        assert.equal(r.audio.lost, 0); assert.ok(r.audio.voices > 0);
        const replay = await exportVideo(JSON.parse(readFileSync(r.sidecar, 'utf8')), { out: join(dir, 'replay.mp4') });
        assert.equal(replay.stateHash, r.stateHash); assert.equal(replay.audio.eventHash, r.audio.eventHash);
        assert.ok(readFileSync(replay.file).equals(readFileSync(r.file)), 'MP4-Wiederholung nicht bytegleich');
      } else assert.equal(r.audioStream, null);
    } finally { await page.close(); }
  }
});

test('Ausschnitt: Originalepisode, voller Ton samt Nachklang/Normalisierung und gespeicherter Versatz bleiben erhalten', async () => {
  const c = config({ aspect: '16:9', durationSec: 6 });
  const r = await exportVideo(c, { ...options('clip'), scripts: [audit], clip: { startSec: 2, durationSec: 2 } });
  assert.deepEqual(verifyResult(r), []);
  assert.equal(r.frames, 60); assert.equal(r.cfg.video.durationSec, 6);
  assert.deepEqual(r.exportOptions.clip, { startSec: 2, durationSec: 2 });
  assert.equal(r.audio.measurementScope, 'full-episode');
  const { page, info } = await openExportPage(browser, c);
  try {
    const segment = await page.evaluate(() => {
      const images = exportAPI.renderFrames(120).slice(60);
      return images.reduce((digest, image) => EBS.util.fnv1a(digest + '|' + image), 0);
    });
    assert.equal(segment, r.snapshot.captureAudit.digest, 'Jedes erfasste Clip-Bild entspricht dem kontinuierlich gerenderten Abschnitt');
    assert.equal(r.snapshot.captureAudit.frames, 60);
    assert.equal(await page.evaluate(() => exportAPI.hash()), r.stateHash);
    await page.evaluate(() => exportAPI.simulate(2));
    const events = await page.evaluate(() => exportAPI.events(0));
    assert.deepEqual(events, r.audioEvents, 'Auch Ereignisse nach dem Clip bestimmen die Originalmischung');
    const samples = await loadSamples(info.audio), wav = join(dir, 'full-episode.wav');
    renderTrack(events, info.audio, samples, { worldW: info.world.w, volume: info.cfg.video.volume, totalSamples: 6 * SAMPLE_RATE, file: wav });
    const expected = join(dir, 'expected.m4a');
    const encoded = await run(ffmpegBin(), ['-y', '-v', 'error', '-ss', '2', '-i', wav, '-t', '2', '-c:a', 'aac', '-b:a', '192k', expected]);
    assert.equal(encoded.code, 0);
    const decode = file => run(ffmpegBin(), ['-v', 'error', '-i', file, '-map', '0:a:0', '-f', 'f32le', '-ac', '2', '-ar', '48000', '-'], { encoding: null });
    const actualPcm = await decode(r.file), expectedPcm = await decode(expected);
    assert.equal(actualPcm.code, 0); assert.equal(expectedPcm.code, 0);
    assert.ok(actualPcm.stdout.equals(expectedPcm.stdout), 'Ausschnitt weicht vom ausgeschnittenen Episodenton ab');
    const replay = await exportVideo(JSON.parse(readFileSync(r.sidecar, 'utf8')), { out: join(dir, 'clip-replay.mp4'), scripts: [audit] });
    assert.equal(replay.stateHash, r.stateHash); assert.equal(replay.audio.eventHash, r.audio.eventHash);
    assert.ok(readFileSync(replay.file).equals(readFileSync(r.file)));
  } finally { await page.close(); }
});

test('Scrap: Rundenwechsel im kurzen Clip und Abbruch im Vorlauf/Tonmischer verwenden den gemeinsamen Produktionsweg', async () => {
  const c = config({ durationSec: 60, aspect: '16:9' });
  const r = await exportVideo(c, { ...options('transition'), clip: { startSec: 52, durationSec: 5 } });
  assert.deepEqual(verifyResult(r), []); assert.equal(r.snapshot.round, 2);
  assert.ok(r.audioEvents.some(e => e.type === 'round_end' && e.step / 60 > 52));
  assert.ok(r.audioEvents.some(e => e.type === 'round_start' && e.round === 2 && e.step / 60 < 57));
  for (const phase of ['simulating', 'audio-mixing']) {
    const ac = new AbortController(), name = 'abort-' + phase;
    await assert.rejects(exportVideo(c, { ...options(name), clip: { startSec: 52, durationSec: 1 }, signal: ac.signal,
      onProgress: p => { if (p.phase === phase) ac.abort(); } }), e => e.name === 'AbortError');
    assert.ok(!readdirSync(dir).some(f => f.startsWith(name) || f.startsWith('.ebs-export-')));
  }
});

test('Ausschnitt: ungültige Grenzen werden ohne Veröffentlichung abgewiesen', async () => {
  for (const clip of [{ startSec: -1, durationSec: 1 }, { startSec: 2, durationSec: 9 }, { startSec: .001, durationSec: 1 }, { startSec: 0 }]) {
    await assert.rejects(exportVideo(config(), { ...options('invalid'), clip }), /Ausschnitt benötigt/);
  }
  await assert.rejects(exportVideo({ ...config(), scenario: 'naval' }, { ...options('invalid'), clip: { startSec: 0, durationSec: 1 } }), /noch nicht freigegeben/);
  assert.ok(!readdirSync(dir).some(f => f.startsWith('invalid') || f.startsWith('.ebs-export-')));
});

test('Scrap-Turnier: UI berechnet die Dauer, Export endet nach dem Finale und Planung ist abbrechbar', async () => {
  const page = await browser.newPage();
  try {
    await page.goto(pathToFileURL(INDEX).href + '?scenario=scrap&paused=1');
    await page.waitForFunction(() => window.EBS?.app?.cfg.scenario === 'scrap');
    await page.selectOption('#p-rulesVersion', 'v2');
    await page.selectOption('#p-episodeMode', 'tournament');
    await page.waitForFunction(() => document.querySelector('#durationHint').textContent.startsWith('Automatisch:'));
    const cfg = await page.evaluate(() => EBS.app.cfg);
    assert.ok(cfg.video.durationSec > 200 && cfg.video.durationSec < 800);
    assert.equal(await page.isDisabled('#durationText'), true);
    const end = cfg.video.durationSec;
    const r = await exportVideo({ ...cfg, video: { ...cfg.video, durationSec: 1, resolution: 720, audio: false } },
      { ...options('finale'), clip: { startSec: end - 2, durationSec: 2 } });
    assert.equal(r.cfg.video.durationSec, end); assert.equal(r.snapshot.phase, 'ended');
    assert.equal(r.snapshot.completedRounds, 8); assert.deepEqual(verifyResult(r), []);
    const ac = new AbortController();
    await assert.rejects(exportVideo(cfg, { ...options('abort-planning'), signal: ac.signal,
      onProgress: p => { if (p.phase === 'planning') ac.abort(); } }), e => e.name === 'AbortError');
    assert.ok(!readdirSync(dir).some(f => f.startsWith('abort-planning') || f.startsWith('.ebs-export-')));
  } finally { await page.close(); }
});
