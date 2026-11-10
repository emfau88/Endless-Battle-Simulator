// Browsertest der Live-Oberfläche über den lokalen Server (inkl. Screenshot und Export per API).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, launchAuto } from '../lib/browser.mjs';

const PORT = 18000 + Math.floor(Math.random() * 1000);
const BASE = `http://127.0.0.1:${PORT}`;
let server, browser;

before(async () => {
  server = spawn(process.execPath, [join(ROOT, 'server.mjs')], { env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'inherit'] });
  let out = '';
  server.stdout.on('data', (d) => { out += d; });
  for (let i = 0; i < 100 && !out.includes('läuft auf'); i++) await new Promise((r) => setTimeout(r, 100));
  assert.ok(out.includes('läuft auf'), 'Server startet nicht');
  browser = await launchAuto();
});
after(async () => {
  await browser?.close();
  if (server && server.exitCode === null) { server.kill(); await once(server, 'exit').catch(() => {}); }
});

test('Server meldet FFmpeg', async () => {
  const h = await (await fetch(BASE + '/api/health')).json();
  assert.equal(h.ok, true);
  assert.match(h.ffmpeg, /ffmpeg version/);
});

test('Live-Simulation läuft im Browser, Bedienfeld funktioniert, Screenshot', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(BASE + '/?seed=42');
  await page.waitForFunction(() => window.EBS && window.EBS.app && window.EBS.app.sim, null, { timeout: 30000 });
  // 10× vorspulen, damit Treffer/Schäden sichtbar sind
  await page.click('#segSpeed button[data-v="10"]');
  await page.waitForFunction(() => window.EBS.app.sim.stats.hits >= 15, null, { timeout: 60000 });
  const s = await page.evaluate(() => window.EBS.app.sim.snapshot());
  assert.ok(s.shots > 0 && s.hits > 0, 'keine Schüsse/Treffer');
  assert.ok(Number(await page.textContent('#sFps')) > 0, 'FPS-Anzeige leer');
  assert.notEqual(await page.textContent('#stat-shots'), '–');
  assert.match(await page.textContent('#scenarioNote'), /ROT .* BLAU/);
  // Pause hält die Simulationszeit an
  await page.click('#btnPlay');
  const t1 = await page.evaluate(() => window.EBS.app.sim.t);
  await page.waitForTimeout(600);
  assert.equal(await page.evaluate(() => window.EBS.app.sim.t), t1, 'Pause stoppt die Simulation nicht');
  await page.click('#btnPlay');
  await page.click('#segSpeed button[data-v="1"]');
  await page.waitForTimeout(800);
  mkdirSync(join(ROOT, 'output'), { recursive: true });
  await page.screenshot({ path: join(ROOT, 'output', 'screenshot_live.png') });
  // Neustart mit anderem Seed und Querformat
  await page.fill('#seed', '7'); await page.dispatchEvent('#seed', 'change');
  await page.click('#segFormat button[data-v="16:9"]');
  const info = await page.evaluate(() => ({ seed: window.EBS.app.cfg.seed, w: window.EBS.app.sim.L.W, t: window.EBS.app.sim.t }));
  assert.deepEqual([info.seed, info.w], [7, 1920]);
  assert.ok(info.t < 1, 'Neustart setzt Zeit nicht zurück');
  await page.click('#segFormat button[data-v="9:16"]');
  // Szenario-Regler werden aus der Registrierung erzeugt und wirken
  await page.fill('#p-intensity', '1'); await page.dispatchEvent('#p-intensity', 'input');
  assert.equal(await page.evaluate(() => window.EBS.app.sim.cfg.intensity), 1);
  assert.equal(await page.textContent('#o-intensity'), '100 %');
  await page.selectOption('#p-ships', '3');
  assert.equal(await page.evaluate(() => window.EBS.app.sim.ships.length), 3);
  await page.selectOption('#p-ships', '2');
  assert.deepEqual(errors, []);
  await page.close();
});

test('Button „Video exportieren“ erzeugt über die Oberfläche ein 20-s-MP4', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + '/?seed=21');
  await page.waitForFunction(() => window.EBS && window.EBS.app && window.EBS.app.sim, null, { timeout: 30000 });
  await page.selectOption('#duration', '20');
  await page.click('#btnExport');
  await page.waitForSelector('#exportMsg a', { timeout: 180000 });
  const text = await page.textContent('#exportMsg');
  assert.match(text, /1080×1920, 30 fps, 20\.00 s, 600 Frames/);
  const href = await page.getAttribute('#exportMsg a', 'href');
  const file = join(ROOT, decodeURIComponent(href).replace(/^\//, ''));
  assert.ok(existsSync(file), 'Videodatei fehlt');
  assert.ok(existsSync(file.replace(/\.mp4$/, '.json')), 'Konfigurationsdatei fehlt');
  rmSync(file, { force: true }); rmSync(file.replace(/\.mp4$/, '.json'), { force: true });
  assert.deepEqual(errors, []);
  await page.close();
});

test('Export per Button-API erzeugt ein abspielbares MP4', async () => {
  const res = await fetch(BASE + '/api/export', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ seed: 11, durationSec: 2, format: 'portrait' }) });
  assert.equal(res.status, 202);
  let s;
  for (let i = 0; i < 240; i++) {
    s = await (await fetch(BASE + '/api/export')).json();
    if (s.state !== 'running') break;
    await new Promise((r) => setTimeout(r, 500));
  }
  assert.equal(s.state, 'done', s.error);
  assert.equal(s.result.frames, 60);
  const file = join(ROOT, 'output', s.file);
  assert.ok(existsSync(file));
  const head = await fetch(BASE + s.url, { headers: { range: 'bytes=0-99' } });
  assert.equal(head.status, 206);
  assert.equal(head.headers.get('content-type'), 'video/mp4');
  rmSync(file, { force: true }); rmSync(file.replace(/\.mp4$/, '.json'), { force: true });
});
