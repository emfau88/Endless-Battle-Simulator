// Tests für das Szenario „Endless Marble Factory“: geschlossener Kreislauf, Determinismus, Formate, Auswahl, Export.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { INDEX, launchBrowser, openExportPage } from '../lib/browser.mjs';
import { exportVideo, verifyResult } from '../lib/exporter.mjs';

let browser;
before(async () => { browser = await launchBrowser({ gpu: false }); });
after(async () => { await browser?.close(); });

const sim = async (cfg = {}) => (await openExportPage(browser, { scenario: 'marble', seed: 42, ...cfg })).page;
const run = (page, sec) => page.evaluate((s) => window.exportAPI.simulate(s), sec);
const check = (page) => page.evaluate(() => window.exportAPI.check());
const hash = (page) => page.evaluate(() => window.exportAPI.hash());
const total = (c) => Object.values(c).reduce((a, b) => a + b, 0);

for (const aspect of ['16:9', '9:16']) {
  test(`Geschlossener Kugelkreislauf ${aspect}: 10 Minuten beschleunigt, Prüfung alle 20 s`, async () => {
    const page = await sim({ video: { aspect } });
    let s;
    for (let i = 0; i < 30; i++) {
      s = await run(page, 20);
      const c = await check(page);
      assert.ok(c.ok, `t=${s.t}: ${c.errors.join('; ')}`);
      assert.equal(s.ballsTotal, 35, 'Kugelanzahl hat sich verändert');
      assert.equal(total(s.counts), 35, 'nicht jede Kugel ist genau einer Station zugeordnet');
      assert.equal(s.missorted, 0, 'Kugel in falscher Farbröhre');
      assert.ok(s.maxJump < 20, `Kugel springt ${s.maxJump.toFixed(1)} Einheiten in einem Schritt (Teleport)`);
    }
    // Durchsatz: das Zellenrad gibt alle 1,2 s eine Kugel frei; jede Kugel hat die Anlage mehrfach durchlaufen
    // Seit dem einseitigen Behälter (Schritt 2) läuft die Anlage fast am theoretischen Maximum von 500 Umläufen
    assert.ok(s.cycles >= 470, `zu wenige Umläufe: ${s.cycles}`);
    assert.ok(s.shakes <= 2, `Behälter rüttelt zu oft: ${s.shakes}× in 10 Minuten`);
    assert.ok(s.minLaps >= 6, `eine Kugel hängt fest (nur ${s.minLaps} Umläufe)`);
    assert.ok(Math.abs(s.released - s.cycles) <= 35, 'Bilanz Freigabe/Rücklauf stimmt nicht');
    // 35 Kugeln = 5 Farben × 6 + 1 Farbe × 5; zwei Kugeln je Farbe stehen als Puffer in der Röhre
    assert.ok(Math.min(...s.sorted) >= 45 && Math.max(...s.sorted) <= 100, `Farben laufen ungleichmäßig um: ${s.sorted}`);
    await page.close();
  });
}

test('Gleicher Seed => identischer Ablauf, anderer Seed => anderer Ablauf, Neustart reproduzierbar', async () => {
  const a = await sim({ seed: 7 }), b = await sim({ seed: 7 }), c = await sim({ seed: 8 });
  await Promise.all([run(a, 90), run(b, 90), run(c, 90)]);
  const [ha, hb, hc] = await Promise.all([hash(a), hash(b), hash(c)]);
  assert.equal(ha, hb, 'zwei Läufe mit gleichem Seed unterscheiden sich');
  assert.notEqual(ha, hc, 'unterschiedliche Seeds ergeben denselben Ablauf');
  await a.evaluate(() => window.exportAPI.restart({ seed: 7 }));
  await run(a, 90);
  assert.equal(await hash(a), ha, 'Neustart in derselben Seite weicht ab');
  await Promise.all([a.close(), b.close(), c.close()]);
});

test('Rendering, Auflösung und Bildrate beeinflussen die Simulation nicht', async () => {
  const a = await sim({ seed: 5, video: { aspect: '16:9', resolution: 720, fps: 60 } });
  const b = await sim({ seed: 5, video: { aspect: '16:9', resolution: 1080, fps: 30 } });
  const c = await sim({ seed: 5, video: { aspect: '16:9' } });
  await a.evaluate(() => window.exportAPI.renderFrames(90, 0.5));    // 1,5 s bei 60 fps
  await b.evaluate(() => window.exportAPI.renderFrames(45, 0.5));    // 1,5 s bei 30 fps
  await run(c, 1.5);                                                  // 1,5 s ohne Rendering
  const [ha, hb, hc] = await Promise.all([hash(a), hash(b), hash(c)]);
  assert.equal(ha, hc); assert.equal(hb, hc);
  const info = await a.evaluate(() => window.exportAPI.info());
  assert.deepEqual([info.scenario, info.width, info.height], ['marble', 1280, 720]);
  await Promise.all([a.close(), b.close(), c.close()]);
});

for (const cfg of [
  { params: { balls: 20, buffer: 1 } }, { params: { balls: 28, buffer: 3 } }, { params: { balls: 35, buffer: 1 }, video: { aspect: '9:16' } },
  { video: { aspect: '1:1' } }, { params: { warmup: 0 } },
]) {
  test(`Konfiguration ${JSON.stringify(cfg)} bleibt stabil (5 Minuten)`, async () => {
    const page = await sim({ seed: 9, ...cfg });
    const s = await run(page, 300);
    const c = await check(page);
    assert.ok(c.ok, c.errors.join('; '));
    assert.equal(total(s.counts), s.ballsExpected);
    assert.ok(s.cycles > 100, `Anlage steht: ${s.cycles} Umläufe`);
    assert.ok(s.minLaps >= 2, 'eine Kugel hängt fest');
    await page.close();
  });
}

for (const aspect of ['16:9', '9:16']) {
  test(`Zeitlupe (tempo 0.8) ${aspect}: Kreislauf geschlossen, kein Stillstand (5 Minuten)`, async () => {
    const page = await sim({ seed: 9, video: { aspect, tempo: 0.8 } });
    const s = await run(page, 300);
    const c = await check(page);
    assert.ok(c.ok, c.errors.join('; '));
    assert.equal(total(s.counts), s.ballsExpected);
    assert.ok(s.cycles > 80, `Anlage steht: ${s.cycles} Umläufe`);
    assert.ok(s.minLaps >= 1, 'eine Kugel hängt fest');
    assert.ok(Math.abs(s.t - 240) < 1e-6, `Simulationszeit ${s.t}`);
    await page.close();
  });
}

// Regression: Im Hochkantformat ist der Behälter voller (kürzere Wege). Ohne Altkugel-Vorrang blieb dort eine Kugel
// dauerhaft an der Trichterflanke liegen; bei Seed 1 verkeilten sich später zwei Kugeln über dem Hals (Stillstand).
for (const seed of [42, 1, 4]) {
  test(`Hochkant, Seed ${seed}: keine Kugel bleibt im Behälter liegen, kein Stillstand (8 Minuten)`, async () => {
    const page = await sim({ seed, video: { aspect: '9:16' } });
    let prev = 0;
    for (let i = 0; i < 16; i++) {
      const s = await run(page, 30);
      assert.ok(s.cycles - prev >= 12, `Anlage steht bei t=${s.t}: nur ${s.cycles - prev} Umläufe in 30 s`);
      prev = s.cycles;
    }
    const s = await page.evaluate(() => window.exportAPI.snapshot());
    assert.ok(s.minLaps >= 6, `eine Kugel hängt fest (nur ${s.minLaps} Umläufe, andere bis ${s.maxLaps})`);
    assert.ok((await check(page)).ok);
    await page.close();
  });
}

test('Speicher, Partikel und Physikkörper bleiben über 30 Minuten stabil', async () => {
  const page = await sim();
  await run(page, 60);
  const heap0 = await page.evaluate(() => window.exportAPI.heap());
  const s = await run(page, 1740);
  const c = await check(page);
  assert.ok(c.ok, c.errors.join('; '));
  assert.ok(c.bodies <= 8 + 35, `zu viele Physikkörper: ${c.bodies}`);
  assert.ok(s.particlesActive <= s.particleCap);
  assert.ok(s.cycles > 1300, `Anlage wird langsamer: ${s.cycles} Umläufe in 29 min`);
  const heap1 = await page.evaluate(() => window.exportAPI.heap());
  if (heap0 && heap1) {
    console.log(`  JS-Heap: ${(heap0 / 1048576).toFixed(1)} MB -> ${(heap1 / 1048576).toFixed(1)} MB · ${s.cycles} Umläufe · größter Schritt ${s.maxJump.toFixed(1)}`);
    assert.ok((heap1 - heap0) / 1048576 < 20, 'Heap wächst');
  }
  await page.close();
});

test('Szenarioauswahl in der Oberfläche: Seeschlacht -> Kugelfabrik -> Seeschlacht', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(pathToFileURL(INDEX).href + '?seed=42');
  await page.waitForFunction(() => window.EBS && window.EBS.app && window.EBS.app.sim, null, { timeout: 30000 });
  assert.equal(await page.evaluate(() => window.EBS.app.cfg.scenario), 'naval', 'Standard-Szenario hat sich geändert');
  assert.deepEqual(await page.$$eval('#scenario option', (o) => o.map((x) => x.value)), ['naval', 'marble', 'scrap', 'mycelium']);
  await page.selectOption('#scenario', 'marble');
  assert.equal(await page.evaluate(() => window.EBS.app.cfg.scenario), 'marble');
  assert.match(await page.textContent('#subtitle'), /Endless Marble Factory/);
  await page.click('#segSpeed button[data-v="10"]');
  await page.waitForFunction(() => window.EBS.app.sim.stats.cycles >= 5, null, { timeout: 60000 });
  await page.waitForFunction(() => document.querySelector('#stat-cycles').textContent !== '–');
  await page.click('#segFormat button[data-v="16:9"]');
  assert.equal(await page.evaluate(() => window.EBS.app.sim.L.land), true);
  await page.fill('#p-buffer', '1'); await page.dispatchEvent('#p-buffer', 'input');
  assert.equal(await page.evaluate(() => window.EBS.app.sim.cfg.buffer), 1);
  await page.selectOption('#scenario', 'naval');
  assert.equal(await page.evaluate(() => window.EBS.app.cfg.scenario), 'naval');
  assert.ok(await page.evaluate(() => Array.isArray(window.EBS.app.sim.ships)), 'Seeschlacht startet nicht mehr');
  assert.deepEqual(errors, []);
  await page.close();
});

test('MP4-Testexport der Kugelfabrik: 720p, 30 fps, 2 s', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ebs-marble-'));
  try {
    const r = await exportVideo({ scenario: 'marble', seed: 3, video: { aspect: '16:9', resolution: 720, fps: 30, durationSec: 2 } },
      { out: join(dir, 'm.mp4'), encoder: { preset: 'veryfast' } });
    assert.deepEqual(verifyResult(r), []);
    assert.deepEqual([r.cfg.scenario, r.width, r.height, r.fps, r.frames], ['marble', 1280, 720, 30, 60]);
    assert.ok(r.sizeBytes > 100_000, 'Datei verdächtig klein');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
