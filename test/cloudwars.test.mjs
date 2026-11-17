// Tests für „Cloud Wars“ (in Arbeit), Paket C0: Gerüst und Gelände. Plan: docs/CLOUD_WARS_PLAN_2026-11-18.md
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { launchBrowser, openExportPage } from '../lib/browser.mjs';

let browser;
before(async () => { browser = await launchBrowser({ gpu: false }); });
after(async () => { await browser?.close(); });

const open = async (seed, aspect) => (await openExportPage(browser, { scenario: 'cloudwars', seed, video: { resolution: 720, aspect } })).page;
const frameHash = async (page) => createHash('sha256').update(await page.evaluate(() => window.exportAPI.renderFrames(1, 1, 'image/png')[0])).digest('hex');

test('Ausschnitt erfüllt die Geländeregeln in beiden Formaten', async () => {
  for (const aspect of ['9:16', '16:9']) for (const seed of [42, 7, 2026]) {
    const page = await open(seed, aspect);
    const { area } = await page.evaluate(() => window.exportAPI.snapshot());
    assert.equal(area.miss, 0, `Seed ${seed} ${aspect}: ${JSON.stringify(area)}`);
    assert.ok((await page.evaluate(() => window.exportAPI.check())).ok);
    await page.close();
  }
});

test('Gleicher Seed ergibt dasselbe Gelände, anderer Seed ein anderes; Zeichnen ändert den Zustand nicht', async () => {
  // Nacheinander öffnen: Gleichzeitig zeichnende Seiten wichen ohne Grafikkarte in Einzelpixeln voneinander ab
  const a = await open(42, '9:16'), ha = await frameHash(a);
  const b = await open(42, '9:16'), hb = await frameHash(b);
  const c = await open(7, '9:16'), hc = await frameHash(c);
  assert.equal(ha, hb, 'Gelände bei gleichem Seed nicht pixelgleich');
  assert.notEqual(ha, hc, 'anderer Seed ergibt dasselbe Bild');
  await b.evaluate(() => window.exportAPI.renderFrames(9, 0.5));               // 10 Bilder gezeichnet
  await c.evaluate(() => window.exportAPI.restart({ seed: 42 }));
  await c.evaluate(() => window.exportAPI.simulate(10 / 30));                  // gleiche Zeit ohne Bilder
  assert.equal(await b.evaluate(() => window.exportAPI.hash()), await c.evaluate(() => window.exportAPI.hash()));
  await Promise.all([a.close(), b.close(), c.close()]);
});

// Paket C1: Wolken in der Simulation
const openMode = async (seed, mode, aspect) => (await openExportPage(browser, { scenario: 'cloudwars', seed, params: { mode }, video: { resolution: 360, aspect } })).page;

test('Gleicher Seed ergibt denselben Wolken-Ablauf', async () => {
  const hashes = [];
  for (const i of [0, 1]) {
    const page = await openMode(5, 'rounds', '16:9');
    await page.evaluate(() => window.exportAPI.simulate(90));
    hashes.push(await page.evaluate(() => window.exportAPI.hash()));
    await page.close();
  }
  assert.equal(hashes[0], hashes[1]);
});

test('Runden-Modus: zehn Minuten ohne Verletzung der Invarianten, Runden enden, Masse bleibt begrenzt', async () => {
  const page = await openMode(3, 'rounds', '16:9');
  const r = await page.evaluate(() => {
    const api = window.exportAPI; let max = 0, errors = [], absorbs = 0, wins = 0, seq = -1, gap = false;
    for (let s = 0; s < 600; s += 2) {
      const sn = api.simulate(2); max = Math.max(max, sn.maxMass);
      const c = api.check(); if (!c.ok) errors.push(...c.errors);
      for (const e of api.events(seq + 1)) { if (seq >= 0 && e.seq !== seq + 1) gap = true; seq = e.seq; if (e.type === 'absorb') absorbs++; if (e.type === 'win') wins++; }
    }
    return { max, errors: errors.slice(0, 5), absorbs, wins, gap, round: api.snapshot().round };
  });
  assert.deepEqual(r.errors, []);
  assert.equal(r.gap, false, 'Lücke in der Ereignisfolge');
  assert.ok(r.max < 120, `größte Masse ${r.max}`);
  assert.ok(r.absorbs > 100, `nur ${r.absorbs} Fress-Ereignisse`);
  assert.ok(r.wins >= 1 && r.round >= 2, `keine Runde beendet (${r.wins})`);
  await page.close();
});

test('Short-Modus: ein Team gewinnt innerhalb von zwei Minuten und bleibt Sieger', async () => {
  const page = await openMode(42, 'short', '9:16');
  const s = await page.evaluate(() => { window.exportAPI.simulate(120); return window.exportAPI.snapshot(); });
  assert.ok(s.ended && s.winner >= 0 && s.alive === 1, JSON.stringify({ ended: s.ended, winner: s.winner, alive: s.alive }));
  assert.equal(s.round, 1);
  await page.close();
});
