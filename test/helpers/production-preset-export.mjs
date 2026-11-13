// Complete production path: scenario -> preset -> export button -> API -> MP4/JSON -> download.
// Only duration is shortened; resolution, quality, audio and scenario settings stay at the preset values.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, launchBrowser } from '../../lib/browser.mjs';
import { probeVideo, verifyResult, run, ffmpegBin } from '../../lib/exporter.mjs';

export function productionPresetTests(scenario) {
const port = 20000 + Math.floor(Math.random() * 1000), base = `http://127.0.0.1:${port}`;
const evidence = join(ROOT, 'output', 'production-checks', String(Date.now()));
let server, browser, serverLog = '';
before(async () => {
  mkdirSync(evidence, { recursive: true });
  server = spawn(process.execPath, [join(ROOT, 'server.mjs')], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', EBS_GPU: '0' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (const stream of [server.stdout, server.stderr]) stream.on('data', data => { serverLog += data; });
  for (let i = 0; i < 100 && !serverLog.includes('läuft auf'); i++) await new Promise(resolve => setTimeout(resolve, 100));
  assert.ok(serverLog.includes('läuft auf'), serverLog);
  const health = await (await fetch(base + '/api/health')).json(); assert.equal(health.ok, true);
  browser = await launchBrowser({ gpu: false });
});
after(async () => {
  await browser?.close();
  if (server && server.exitCode === null) { const exited = once(server, 'exit'); server.kill(); await exited; }
  writeFileSync(join(evidence, 'server.log'), serverLog);
});

for (const kind of ['short', 'long']) {
  test(`Produktionsweg ${scenario}/${kind}: 1080p30, 3 Sekunden, Ton und herunterladbare MP4/JSON`, async t => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    let status;
    t.after(async () => {
      await ctx.close();
      await fetch(base + '/api/export/cancel', { method: 'POST' });
      for (let i = 0; i < 100; i++) {
        status = await (await fetch(base + '/api/export')).json();
        if (status.state !== 'running') break;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      writeFileSync(join(evidence, `${scenario}-${kind}-status.json`), JSON.stringify(status, null, 2));
      assert.notEqual(status.state, 'running', 'eigener Export ist vollständig aufgeräumt');
      // Only files created by this test server; durable copies are already in evidence.
      if (status.file) {
        const file = join(ROOT, 'output', status.file);
        rmSync(file, { force: true }); rmSync(file.replace(/\.mp4$/, '.json'), { force: true });
      }
    });
    await page.goto(base + `/?scenario=${scenario}&seed=42&paused=1`);
    await page.waitForFunction(() => window.EBS?.app?.sim);
    await page.click(kind === 'short' ? '#btnShortPreset' : '#btnLongPreset');
    assert.equal(await page.evaluate(() => EBS.app.cfg.video.durationSec), kind === 'short' ? 60 : 600);
    await page.fill('#durationText', '3s'); await page.dispatchEvent('#durationText', 'change');
    const config = await page.evaluate(() => EBS.app.cfg);
    const [request] = await Promise.all([
      page.waitForRequest(req => req.url() === base + '/api/export' && req.method() === 'POST'), page.click('#btnExport'),
    ]);
    assert.deepEqual(request.postDataJSON(), config, 'Oberfläche sendet die vollständigen Einstellungen');
    await page.waitForFunction(() => document.querySelector('#btnExport').disabled);
    await page.waitForFunction(() => document.querySelector('#exportMsg a') || document.querySelector('#exportMsg').classList.contains('err'), null, { timeout: 180000 });
    status = await (await fetch(base + '/api/export')).json();
    assert.equal(status.state, 'done', status.error || JSON.stringify(status));
    assert.deepEqual(status.cfg, config);
    const file = join(ROOT, 'output', status.file), sidecar = file.replace(/\.mp4$/, '.json');
    copyFileSync(file, join(evidence, `${scenario}-${kind}.mp4`)); copyFileSync(sidecar, join(evidence, `${scenario}-${kind}.json`));
    const meta = JSON.parse(readFileSync(sidecar, 'utf8')), probe = await probeVideo(file);
    assert.deepEqual(meta.config, config, 'Begleitdatei bewahrt die Einstellungen');
    assert.deepEqual(verifyResult({ ...probe, audio: meta.audio, expectedWidth: kind === 'short' ? 1080 : 1920,
      expectedHeight: kind === 'short' ? 1920 : 1080, expectedFrames: 90, expectedFps: 30, expectedDuration: 3 }), []);
    assert.equal(meta.audio.lost, 0); assert.equal(meta.video.encoder.preset, 'medium');
    const href = await page.getAttribute('#exportMsg a', 'href'); assert.equal(href, status.url);
    const downloaded = await fetch(base + href); assert.equal(downloaded.status, 200);
    assert.ok(Buffer.from(await downloaded.arrayBuffer()).equals(readFileSync(file)), 'Download liefert exakt die geprüfte Videodatei');
    const frame = await run(ffmpegBin(), ['-y', '-v', 'error', '-ss', '2.5', '-i', file, '-frames:v', '1', join(evidence, `${scenario}-${kind}.jpg`)]);
    assert.equal(frame.code, 0, frame.stderr);
    assert.deepEqual(errors, []);
    t.diagnostic(JSON.stringify({ scenario, kind, frames: probe.frames, audio: meta.audio.encoded, elapsedSec: status.result.elapsedSec, evidence }));
  });
}

}

