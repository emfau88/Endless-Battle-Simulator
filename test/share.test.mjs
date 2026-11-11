// Playlink und Handybedienung: statische Auslieferung ohne Export-Server (wie GitHub Pages), Teilen-Link, JSON, Handyansicht.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createReadStream, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';
import { INDEX, ROOT, launchBrowser } from '../lib/browser.mjs';

const dir = mkdtempSync(join(tmpdir(), 'ebs-share-'));
process.on('exit', () => rmSync(dir, { recursive: true, force: true }));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json' };
const PREFIX = '/Endless-Battle-Simulator/';       // GitHub Pages liefert Projektseiten unter einem Unterpfad aus
let browser, server, base;

before(async () => {
  browser = await launchBrowser({ gpu: false });
  // Reiner Dateiserver ohne /api – so verhält sich GitHub Pages
  server = http.createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (!path.startsWith(PREFIX)) { res.writeHead(404); return res.end('nicht gefunden'); }
    const rel = normalize(path.slice(PREFIX.length) || 'index.html'), file = join(ROOT, rel);
    if (rel.startsWith('..') || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404, { 'content-type': 'text/html' }); return res.end('<h1>404</h1>'); }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}${PREFIX}`;
});
after(async () => { await browser?.close(); await new Promise((r) => server.close(r)); });

async function open(url, viewport = { width: 1440, height: 1000 }) {
  const ctx = await browser.newContext({ viewport, acceptDownloads: true }), page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.EBS && window.EBS.app && window.EBS.app.sim, null, { timeout: 30000 });
  return { ctx, page, errors };
}
const cfg = (page) => page.evaluate(() => window.EBS.app.cfg);

test('Statische Auslieferung unter einem Unterpfad: Vorschau läuft, Export wird klar als „nur am eigenen PC“ gezeigt', async () => {
  const { ctx, page, errors } = await open(base);
  await page.waitForFunction(() => !document.querySelector('#exportHint').hidden, null, { timeout: 10000 });
  assert.match(await page.textContent('#btnExport'), /nur am eigenen PC/);
  assert.match(await page.textContent('#exportHint'), /ohne Export-Server.*am eigenen PC/);
  // Vorschau und Regler funktionieren
  await page.selectOption('#scenario', 'marble');
  await page.click('#segSpeed button[data-v="10"]');
  await page.waitForFunction(() => window.EBS.app.sim.stats.cycles >= 3, null, { timeout: 30000 });
  await page.click('#btnExport');
  const msg = await page.textContent('#exportMsg');
  assert.match(msg, /start\.bat/); assert.match(msg, /npm run export -- --scenario marble/);
  assert.equal(await page.evaluate(() => document.querySelector('#exportBar').hidden), true, 'Fortschrittsbalken ohne Export');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Teilen-Link stellt in einem frischen Browser dieselbe Szene her', async () => {
  const a = await open(base);
  await a.page.selectOption('#scenario', 'marble');
  await a.page.click('#segFormat button[data-v="16:9"]');
  await a.page.fill('#seed', '123'); await a.page.dispatchEvent('#seed', 'change');
  await a.page.fill('#durationText', '37'); await a.page.dispatchEvent('#durationText', 'change');
  await a.page.fill('#p-buffer', '3'); await a.page.dispatchEvent('#p-buffer', 'input');
  await a.page.click('#segSpeed button[data-v="0.8"]');
  await a.page.uncheck('#audio'); await a.page.uncheck('#camera');
  await a.page.click('#btnCopy');
  const link = await a.page.inputValue('#shareLink'), want = await cfg(a.page);
  assert.ok(link.startsWith(base + '?'), `Link zeigt nicht auf die Seite: ${link}`);
  assert.deepEqual([want.scenario, want.seed, want.video.durationSec, want.video.tempo, want.video.audio, want.view.camera, want.params.buffer], ['marble', 123, 37, 0.8, false, false, 3]);
  const b = await open(link);
  assert.deepEqual(await cfg(b.page), want, 'geteilter Link ergibt eine andere Konfiguration');
  const [ha, hb] = await Promise.all([a.page, b.page].map((p) => p.evaluate(() => { const s = window.EBS.app.session; s.start(s.cfg); for (let i = 0; i < 300; i++) s.step(); return s.sim.stateHash(); })));
  assert.equal(ha, hb, 'gleicher Link, anderer Simulationsverlauf');
  assert.deepEqual([...a.errors, ...b.errors], []);
  await a.ctx.close(); await b.ctx.close();
});

test('Einstellungen als JSON speichern und laden (auch die JSON-Datei neben einem Video)', async () => {
  const { ctx, page, errors } = await open(pathToFileURL(INDEX).href);
  await page.selectOption('#scenario', 'marble');
  await page.fill('#durationText', '37'); await page.dispatchEvent('#durationText', 'change');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btnSaveCfg')]);
  const saved = join(dir, 'saved.json');
  await dl.saveAs(saved);
  assert.match(dl.suggestedFilename(), /^marble_seed\d+_9x16\.json$/);
  assert.deepEqual(JSON.parse(readFileSync(saved, 'utf8')), await cfg(page));
  // Datei im Format der Video-Begleitdatei laden
  const side = join(dir, 'video.json');
  writeFileSync(side, JSON.stringify({ generator: 'x', config: { scenario: 'naval', seed: 77, video: { aspect: '16:9', durationSec: 12 }, params: { ships: 3 } } }));
  await page.setInputFiles('#cfgFile', side);
  await page.waitForFunction(() => window.EBS.app.cfg.seed === 77);
  const c = await cfg(page);
  assert.deepEqual([c.scenario, c.video.aspect, c.video.durationSec, c.params.ships], ['naval', '16:9', 12, 3]);
  assert.match(await page.textContent('#shareMsg'), /video\.json geladen/);
  assert.equal(await page.inputValue('#scenario'), 'naval');
  // Fehlerhafte Dateien: Meldung, Zustand bleibt
  for (const [name, body, re] of [['kaputt.json', '{ nicht json', /konnte nicht geladen werden/], ['fremd.json', JSON.stringify({ scenario: 'gibtsnicht' }), /Unbekanntes Szenario "gibtsnicht"/]]) {
    const f = join(dir, name); writeFileSync(f, body);
    await page.setInputFiles('#cfgFile', f);
    await page.waitForFunction((n) => document.querySelector('#shareMsg').textContent.includes(n), name);
    assert.match(await page.textContent('#shareMsg'), re);
    assert.equal((await cfg(page)).seed, 77, 'fehlerhafte Datei hat die Einstellungen verändert');
  }
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Handyansicht (390×844): Bedienfeld unter der Vorschau, kein seitliches Scrollen, fingergroße Bedienflächen', async () => {
  const { ctx, page, errors } = await open(base + '?scenario=marble', { width: 390, height: 844 });
  const m = await page.evaluate(() => {
    const r = (sel) => { const b = document.querySelector(sel).getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right }; };
    return { vw: innerWidth, scrollW: document.documentElement.scrollWidth, canvas: r('#stage canvas'), panel: r('#panel'),
      controls: ['#btnPlay', '#btnRestart', '#scenario', '#durationText', '#duration', '#btnExport', '#btnCopy', '#btnLoadCfg', '#seed'].map((s) => ({ s, ...r(s) })) };
  });
  assert.ok(m.scrollW <= m.vw + 1, `Seite ist breiter als der Bildschirm: ${m.scrollW} > ${m.vw}`);
  assert.ok(m.canvas.w > 250 && m.canvas.r <= m.vw + 1 && m.canvas.h > 400, `Vorschau ${m.canvas.w}×${m.canvas.h}`);
  assert.ok(m.panel.y >= m.canvas.y + m.canvas.h - 1, 'Bedienfeld liegt nicht unter der Vorschau');
  for (const c of m.controls) {
    assert.ok(c.h >= 43, `${c.s} ist nur ${c.h.toFixed(0)} px hoch`);
    assert.ok(c.x >= 0 && c.r <= m.vw + 1, `${c.s} ragt aus dem Bildschirm`);
  }
  await page.selectOption('#scenario', 'naval');
  assert.equal((await cfg(page)).scenario, 'naval');
  assert.deepEqual(errors, []);
  await ctx.close();
});
