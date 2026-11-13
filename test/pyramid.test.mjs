// Tests für das Szenario „Endless Pyramid“: geschlossener Kreislauf, Determinismus, Regler, Formate, Ton, Oberfläche, Export.
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

const sim = async (cfg = {}) => (await openExportPage(browser, { scenario: 'pyramid', seed: 42, ...cfg })).page;
const run = (page, sec) => page.evaluate((s) => window.exportAPI.simulate(s), sec);
const check = (page) => page.evaluate(() => window.exportAPI.check());
const hash = (page) => page.evaluate(() => window.exportAPI.hash());
const total = (c) => Object.values(c).reduce((a, b) => a + b, 0);

for (const aspect of ['16:9', '9:16']) {
  test(`Geschlossener Kreislauf ${aspect}: 6 Minuten beschleunigt, Prüfung alle 30 s`, async () => {
    const page = await sim({ video: { aspect } });
    let s, prev = 0;
    for (let i = 0; i < 12; i++) {
      s = await run(page, 30);
      const c = await check(page);
      assert.ok(c.ok, `t=${s.t}: ${c.errors.join('; ')}`);
      assert.equal(total(s.counts), 22, 'nicht jede Figur ist genau einer Station zugeordnet');
      assert.ok(s.pulses - prev >= 8, `Kreislauf stockt bei t=${s.t}: nur ${s.pulses - prev} Lichtimpulse in 30 s`);
      prev = s.pulses;
    }
    assert.ok(s.pulses >= 180, `zu wenige Lichtimpulse: ${s.pulses}`);
    assert.ok(s.minLaps >= 5, `eine Figur hängt fest (nur ${s.minLaps} Umläufe, andere bis ${s.maxLaps})`);
    assert.ok(s.layout.slope >= 0.045 && s.layout.rails % 2 === 1, `Bahn ungünstig: ${JSON.stringify(s.layout)}`);
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

test('Rendering, Auflösung, Bildrate und reine Darstellungsregler beeinflussen die Simulation nicht', async () => {
  const look = { figure: 1, glow: 0, pulse: 1.5, rays: 0, clouds: 3, reflection: 0.2, waves: 2, sparkle: 0, wiggle: 2, birds: false, lane: false,
    dayCycle: false, dayStart: 0.9, nightDark: 1, stars: false, sleepy: false, dayMinutes: 1 };
  const a = await sim({ seed: 5, video: { aspect: '16:9', resolution: 720, fps: 60 } });
  const b = await sim({ seed: 5, params: look, video: { aspect: '16:9', resolution: 720, fps: 30 } });
  const c = await sim({ seed: 5, video: { aspect: '16:9' } });
  await a.evaluate(() => window.exportAPI.renderFrames(30, 0.5));    // 0,5 s bei 60 fps
  await b.evaluate(() => window.exportAPI.renderFrames(15, 0.5));    // 0,5 s bei 30 fps, Tierchen, Nacht und andere Optik
  await run(c, 0.5);                                                  // 0,5 s ohne Rendering
  const [ha, hb, hc] = await Promise.all([hash(a), hash(b), hash(c)]);
  assert.equal(ha, hc); assert.equal(hb, hc);
  const info = await a.evaluate(() => window.exportAPI.info());
  assert.deepEqual([info.scenario, info.width, info.height], ['pyramid', 1280, 720]);
  await Promise.all([a.close(), b.close(), c.close()]);
});

for (const cfg of [
  { params: { size: 12, orbs: 26 } }, { params: { size: 24, orbs: 26 }, video: { aspect: '9:16' } }, { params: { size: 24, orbs: 26 } },
  { params: { rollSpeed: 0.25, beltSpeed: 0.25, current: 0.25, orbs: 12 }, video: { aspect: '9:16' } },
  { params: { rollSpeed: 1.6, beltSpeed: 2, current: 2, size: 20 } },
  { params: { figure: 1, size: 22 }, video: { aspect: '1:1' } }, { params: { warmup: 0 }, video: { tempo: 0.64 } },
]) {
  test(`Konfiguration ${JSON.stringify(cfg)} bleibt stabil (4 Minuten)`, async () => {
    const page = await sim({ seed: 9, ...cfg });
    const s = await run(page, 240);
    const c = await check(page);
    assert.ok(c.ok, c.errors.join('; '));
    assert.equal(total(s.counts), s.orbs);
    assert.ok(s.pulses > 12, `Kreislauf steht: ${s.pulses} Lichtimpulse`);
    assert.ok(s.minLaps >= 1, `eine Figur hängt fest (${s.minLaps} Umläufe)`);
    assert.ok(s.layout.slope >= 0.045, `Gefälle zu flach: ${s.layout.slope}`);
    await page.close();
  });
}

test('Gesamttempo verlangsamt alles gleichmäßig: halbes Tempo = gleicher Ablauf in doppelter Videozeit', async () => {
  const a = await sim({ seed: 4, params: { speed: 0.5 } }), b = await sim({ seed: 4 });
  const [sa, sb] = [await run(a, 240), await run(b, 120)];
  assert.ok(Math.abs(sa.t - sb.t) < 1e-6, `Simulationszeit ${sa.t} statt ${sb.t}`);
  assert.ok(Math.abs(sa.pulses - sb.pulses) <= 2, `halbes Tempo verändert den Ablauf: ${sa.pulses} statt ${sb.pulses} Lichtimpulse`);
  assert.ok((await check(a)).ok);
  const slow = await sim({ seed: 4, params: { speed: 0.25, beltSpeed: 0.25, rollSpeed: 0.25, current: 0.25 } });
  const s = await run(slow, 600);
  assert.ok((await check(slow)).ok && s.pulses >= 3 && s.minLaps >= 0, `langsamste Einstellung steht: ${s.pulses}`);
  await Promise.all([a.close(), b.close(), slow.close()]);
});

// mittlere Helligkeit des zuletzt gerenderten Bildes (0–255)
const brightness = (page, sec) => page.evaluate(async (s) => {
  window.exportAPI.simulate(s);
  const [jpg] = window.exportAPI.renderFrames(1, 0.9);
  const img = new Image(); img.src = 'data:image/jpeg;base64,' + jpg; await img.decode();
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0, 64, 64);
  const d = g.getImageData(0, 0, 64, 64).data; let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += (d[i] + d[i + 1] + d[i + 2]) / 3;
  return sum / (d.length / 4);
}, sec);

for (const [aspect, figure] of [['9:16', 1], ['16:9', 0]]) {
  test(`Tageslauf ${aspect} (${figure ? 'Tierchen' : 'Leuchtkugeln'}): folgt der Videozeit, Nacht deutlich dunkler, Simulation unberührt`, async () => {
    const page = await sim({ seed: 6, params: { figure, dayMinutes: 1 }, video: { aspect, resolution: 720 } });
    const noon = await brightness(page, 29);                    // ≈ 30 s von 60 s: Mittag
    const night = await brightness(page, 25);                   // ≈ 55 s: Nacht
    assert.ok(night < noon * 0.6, `Nacht nicht dunkel genug: ${night.toFixed(1)} gegenüber Mittag ${noon.toFixed(1)}`);
    const morning = await brightness(page, 8);                  // ≈ 63 s: neuer Tag beginnt (Vorschau läuft in Schleife)
    assert.ok(morning > night * 1.4, `kein neuer Morgen nach Tagesende: ${morning.toFixed(1)}`);
    const off = await sim({ seed: 6, params: { figure, dayMinutes: 1, dayCycle: false }, video: { aspect, resolution: 720 } });
    for (const sec of [29, 25, 8]) await brightness(off, sec);   // gleiche Abfolge wie oben
    assert.equal(await hash(page), await hash(off), 'Tageslauf verändert die Simulation');
    await Promise.all([page.close(), off.close()]);
  });
}

const finaleEvents = async (cfg, sec) => {
  const page = await sim(cfg);
  await run(page, sec);
  const ev = await page.evaluate(() => window.exportAPI.events(0));
  await page.close();
  const at = (type) => ev.filter((e) => e.type === type).map((e) => e.step / 60);
  return { full: at('full'), launch: at('launch'), firework: at('firework') };
};

test('Licht-Füllung und Finale: Fanfare einmal kurz vor dem Finale, Feuerwerk nur im Finale, an die Videolänge gekoppelt', async () => {
  // Tag von 1 Minute: Finale 5 s, Pyramide 2 s vorher voll
  const a = await finaleEvents({ seed: 2, params: { dayMinutes: 1, figure: 1 } }, 60);
  assert.equal(a.full.length, 1, `Fanfare ${a.full.length}×`);
  assert.ok(a.full[0] >= 53 && a.full[0] <= 55.5, `Fanfare bei ${a.full[0]} s`);
  assert.ok(a.firework.length >= 6 && a.firework.every((v) => v > 55 && v < 60), `Feuerwerk ${a.firework}`);
  assert.equal(a.launch.length, a.firework.length, 'jede Rakete wird abgeschossen');
  // automatisch = Videolänge: 400 s Video -> Finale in den letzten 10 s
  const b = await finaleEvents({ seed: 2, video: { durationSec: 400 } }, 400);
  assert.ok(b.full.length === 1 && b.full[0] >= 388 && b.full[0] <= 391, `Fanfare bei ${b.full}`);
  assert.ok(b.firework.length >= 12 && b.firework.every((v) => v > 390 && v < 400), `Feuerwerk ${b.firework.length}× ab ${b.firework[0]}`);
  // abschaltbar
  const c = await finaleEvents({ seed: 2, params: { dayMinutes: 1, fill: false, finale: false } }, 60);
  assert.deepEqual([c.full.length, c.launch.length, c.firework.length], [0, 0, 0]);
});

test('Finale wird gezeichnet (beide Formate, beide Darstellungen) und ändert die Simulation nicht', async () => {
  for (const [aspect, figure] of [['9:16', 1], ['16:9', 0]]) {
    const a = await sim({ seed: 8, params: { dayMinutes: 1, figure }, video: { aspect, resolution: 720 } });
    const b = await sim({ seed: 8, params: { dayMinutes: 1, figure, fill: false, finale: false, dayCycle: false }, video: { aspect, resolution: 720 } });
    await run(a, 57); await run(b, 57);
    await a.evaluate(() => window.exportAPI.renderFrames(12, 0.5)); await b.evaluate(() => window.exportAPI.renderFrames(12, 0.5));
    assert.equal(await hash(a), await hash(b), 'Füllung/Finale verändert die Simulation');
    assert.ok((await check(a)).ok);
    await Promise.all([a.close(), b.close()]);
  }
});

test('Regler werden normalisiert und begrenzt', async () => {
  const page = await sim();
  const p = await page.evaluate(() => window.EBS.normalizeConfig({ scenario: 'pyramid', params: {
    orbs: 99, size: 3, figure: 7, speed: 0, beltSpeed: 9, rollSpeed: 0, current: -1, glow: 5, birds: 'false', lane: 0, warmup: 999,
  } }).params);
  assert.deepEqual([p.orbs, p.size, p.figure, p.speed, p.beltSpeed, p.rollSpeed, p.current, p.glow, p.birds, p.lane, p.warmup],
    [26, 12, 1, 0.25, 2, 0.25, 0.25, 1.5, false, false, 120]);
  const n = await page.evaluate(() => [7, '20'].map((m) => window.EBS.normalizeConfig({ scenario: 'pyramid', params: { dayMinutes: m, dayStart: 2, dayCycle: 'false' } }).params));
  assert.deepEqual(n.map((q) => [q.dayMinutes, q.dayStart, q.dayCycle]), [[0, 0.95, false], [20, 0.95, false]]);
  const d = await page.evaluate(() => window.EBS.normalizeConfig({ scenario: 'pyramid' }).params);
  assert.deepEqual([d.dayCycle, d.dayMinutes, d.dayStart, d.nightDark, d.stars, d.sleepy], [true, 0, 0, 0.85, true, true]);
  assert.deepEqual([d.fill, d.finale, d.fillGlow, d.fireworks], [true, true, 1, 1]);
  assert.deepEqual([d.orbs, d.size, d.figure, d.speed, d.beltSpeed, d.rollSpeed, d.current, d.birds], [22, 16, 0, 1, 1, 1, 1, true]);
  await page.close();
});

for (const figure of [0, 1]) {
  test(`Tonereignisse (${figure ? 'Tierchen' : 'Leuchtkugeln'}): vollständig, in der Klangtabelle, passend zur Darstellung`, async () => {
    const page = await sim({ seed: 11, params: { figure }, video: { aspect: '9:16' } });
    await run(page, 60);
    const [ev, info] = await page.evaluate(() => [window.exportAPI.events(0), window.exportAPI.info()]);
    const types = new Set(ev.map((e) => e.type));
    for (const e of ev) {
      assert.ok(info.audio.events[e.type], `Ereignis ohne Klang: ${e.type}`);
      assert.ok(Number.isInteger(e.step) && e.step > 0 && e.step <= 3600, `Schritt ${e.step}`);
      assert.ok(e.x >= 0 && e.x <= 1080 && Number.isFinite(e.p) && e.c >= 0 && e.c <= 3, JSON.stringify(e));
    }
    for (let i = 1; i < ev.length; i++) assert.equal(ev[i].seq, ev[i - 1].seq + 1, 'Ereignis verloren');
    for (const t of ['scoop', 'pulse', 'tip', 'splash']) assert.ok(types.has(t), `${t} fehlt`);
    if (figure) { for (const t of ['boing', 'wheee', 'squeak']) assert.ok(types.has(t), `${t} fehlt`); assert.ok(!types.has('cap')); }
    else { assert.ok(types.has('cap')); for (const t of ['boing', 'wheee', 'squeak']) assert.ok(!types.has(t), `${t} bei Leuchtkugeln`); }
    await page.close();
  });
}

test('Oberfläche: Pyramide wählen, Regler und Lautstärken vorhanden, Darstellung live umschalten', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(pathToFileURL(INDEX).href + '?seed=42');
  await page.waitForFunction(() => window.EBS && window.EBS.app && window.EBS.app.sim, null, { timeout: 30000 });
  await page.selectOption('#scenario', 'pyramid');
  assert.equal(await page.evaluate(() => window.EBS.app.cfg.scenario), 'pyramid');
  assert.match(await page.textContent('#subtitle'), /Endless Pyramid/);
  for (const k of ['figure', 'orbs', 'size', 'speed', 'beltSpeed', 'rollSpeed', 'current', 'glow', 'pulse', 'rays', 'clouds', 'reflection', 'waves', 'sparkle', 'wiggle', 'birds', 'lane', 'dayMinutes', 'dayStart', 'nightDark', 'dayCycle', 'stars', 'sleepy', 'fill', 'finale', 'fillGlow', 'fireworks']) {
    assert.ok(await page.$('#p-' + k), `Regler ${k} fehlt`);
  }
  for (const k of ['master', 'scoop', 'pulse', 'tip', 'cap', 'splash', 'boing', 'wheee', 'squeak', 'full', 'launch', 'firework']) assert.ok(await page.$('#vol-' + k), `Lautstärke ${k} fehlt`);
  await page.evaluate(() => { window.__sim = window.EBS.app.sim; });
  await page.selectOption('#p-figure', '1');
  assert.equal(await page.evaluate(() => window.EBS.app.sim.cfg.figure), 1);
  assert.ok(await page.evaluate(() => window.EBS.app.sim === window.__sim), 'Umschalten der Darstellung hat neu gestartet');
  await page.fill('#p-beltSpeed', '1.5'); await page.dispatchEvent('#p-beltSpeed', 'input');
  assert.equal(await page.evaluate(() => window.EBS.app.sim.cfg.beltSpeed), 1.5);
  await page.click('#segFormat button[data-v="16:9"]');
  assert.equal(await page.evaluate(() => window.EBS.app.sim.L.land), true);
  await page.waitForTimeout(300);
  assert.deepEqual(errors, []);
  await page.close();
});

test('MP4-Testexport der Pyramide (Tierchen, hochkant): 720p, 30 fps, 3 s, mit Ton', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ebs-pyramid-'));
  try {
    const r = await exportVideo({ scenario: 'pyramid', seed: 3, params: { figure: 1, size: 22 }, video: { aspect: '9:16', resolution: 720, fps: 30, durationSec: 3 } },
      { out: join(dir, 'p.mp4'), encoder: { preset: 'veryfast' } });
    assert.deepEqual(verifyResult(r), []);
    assert.deepEqual([r.cfg.scenario, r.width, r.height, r.fps, r.frames], ['pyramid', 720, 1280, 30, 90]);
    assert.ok(r.audio && r.audio.events > 5 && r.audio.voices > 5, `zu wenig Ton: ${JSON.stringify(r.audio)}`);
    assert.ok(r.sizeBytes > 100_000, 'Datei verdächtig klein');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
