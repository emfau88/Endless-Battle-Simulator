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

// Paket C2: Wolken zeichnen
test('Seek-Regel: Bild nach Sprung gleich Bild nach durchgehender Wiedergabe (mit Fressen im Bild)', async () => {
  const frame = (page) => page.evaluate(() => window.exportAPI.renderFrames(1, 1, 'image/png')[0]);
  const jump = await openMode(42, 'short', '9:16');
  await jump.evaluate(() => window.exportAPI.simulate(8 - 1 / 30));
  const a = await frame(jump), ha = await jump.evaluate(() => window.exportAPI.hash());
  await jump.close();
  const cont = await openMode(42, 'short', '9:16');
  await cont.evaluate(() => { window.exportAPI.renderFrames(239, 0.3); });        // 239 gezeichnete Bilder bei 30 fps
  const b = await frame(cont), hb = await cont.evaluate(() => window.exportAPI.hash());
  const eats = await cont.evaluate(() => window.exportAPI.events(0).filter((e) => e.type === 'absorb').length);
  await cont.close();
  assert.equal(ha, hb);
  assert.ok(eats > 3, `zu wenig Fressen bis Sekunde 8: ${eats}`);
  assert.ok(a === b, 'Bild nach Sprung weicht vom Bild nach durchgehender Wiedergabe ab');
});

// Paket C3: Gewitter, Blitze, Feuer, Feuerwehr
test('Gewitter, Blitze und Brände entstehen; Waldverlust je Runde begrenzt', async () => {
  const page = await openMode(2, 'rounds', '16:9');
  const r = await page.evaluate(() => {
    const api = window.exportAPI, types = {}; let burnMax = 0, fireMax = 0, errors = [];
    for (let s = 0; s < 300; s += 2) {
      const sn = api.simulate(2); burnMax = Math.max(burnMax, sn.burned); fireMax = Math.max(fireMax, sn.fires);
      const c = api.check(); if (!c.ok) errors.push(...c.errors);
    }
    for (const e of api.events(0)) types[e.type] = (types[e.type] || 0) + 1;
    return { types, burnMax, fireMax, errors: errors.slice(0, 3) };
  });
  assert.deepEqual(r.errors, []);
  for (const type of ['storm', 'strike', 'fire']) assert.ok(r.types[type] > 0, `kein Ereignis ${type}: ${JSON.stringify(r.types)}`);
  assert.ok(r.fireMax <= 40, `zu viele Brände: ${r.fireMax}`);
  assert.ok(r.burnMax > 0.005 && r.burnMax < 0.2, `Waldverlust ${r.burnMax}`);
  await page.close();
});

test('Seek-Regel mitten im Brand: Brandflächen nach Sprung gleich wie nach Wiedergabe', async () => {
  const frame = (page) => page.evaluate(() => window.exportAPI.renderFrames(1, 1, 'image/png')[0]);
  const cont = await openMode(2, 'rounds', '16:9');
  await cont.evaluate(() => { window.exportAPI.simulate(140); window.exportAPI.renderFrames(1, 0.3); window.exportAPI.renderFrames(299, 0.3); });
  const b = await frame(cont), hb = await cont.evaluate(() => window.exportAPI.hash());
  const s = await cont.evaluate(() => window.exportAPI.snapshot());
  await cont.close();
  const jump = await openMode(2, 'rounds', '16:9');
  await jump.evaluate(() => window.exportAPI.simulate(150));
  const a = await frame(jump), ha = await jump.evaluate(() => window.exportAPI.hash());
  await jump.close();
  assert.ok(s.burned > 0 || s.fires > 0, 'kein Brand im geprüften Abschnitt');
  assert.equal(ha, hb);
  assert.ok(a === b, 'Bild nach Sprung weicht vom Bild nach durchgehender Wiedergabe ab');
});

test('Tageslauf und Wetter: reine Funktionen, Short immer klar, Runden mit Nebelstart und ohne Wiederholung', async () => {
  const page = await openMode(5, 'rounds', '16:9');
  const r = await page.evaluate(() => {
    const St = EBS.CloudWarsStory, segs = St.weatherChanges(5, 3600, 'rounds');
    return {
      short: [0, 100, 300].map((t) => St.weatherAt(5, t, 'short').kind),
      shortNight: St.light(St.dayAt(300, 'short')).night,
      first: segs[0].kind, repeat: segs.some((s, i) => i > 0 && s.kind === segs[i - 1].kind),
      lens: segs.slice(1, -1).map((s) => St.weatherAt(5, s.t0 + 1, 'rounds').t0 === s.t0),
      night: St.light(St.dayAt(520, 'rounds')).night, noon: St.light(St.dayAt(150, 'rounds')).night,
      again: JSON.stringify(St.weatherAt(5, 777, 'rounds')) === JSON.stringify(St.weatherAt(5, 777, 'rounds')),
    };
  });
  await page.close();
  assert.deepEqual(r.short, ['clear', 'clear', 'clear']);
  assert.equal(r.shortNight, 0);
  assert.equal(r.first, 'fog');
  assert.equal(r.repeat, false);
  assert.ok(r.lens.every(Boolean));
  assert.ok(r.night > 0.8 && r.noon === 0, `Nacht ${r.night}, Mittag ${r.noon}`);
  assert.ok(r.again);
});

test('Seek-Regel bei Nacht: Lichter, Autos und Boote nach Sprung gleich wie nach Wiedergabe', async () => {
  const frame = (page) => page.evaluate(() => window.exportAPI.renderFrames(1, 1, 'image/png')[0]);
  const cont = await openMode(2, 'rounds', '16:9');
  await cont.evaluate(() => { window.exportAPI.simulate(515); window.exportAPI.renderFrames(149, 0.3); });
  const b = await frame(cont);
  await cont.close();
  const jump = await openMode(2, 'rounds', '16:9');
  await jump.evaluate(() => window.exportAPI.simulate(520 - 1 / 30));
  const a = await frame(jump);
  await jump.close();
  assert.ok(a === b, 'Nachtbild nach Sprung weicht vom Bild nach durchgehender Wiedergabe ab');
});

test('Einblendungen: Short beginnt mit der Frage und endet mit dem Sieger; Texte englisch', async () => {
  const page = await openMode(42, 'short', '9:16');
  const r = await page.evaluate(() => {
    const api = window.exportAPI, seen = new Set();
    const first = api.simulate(1).banners.map((b) => b.text);
    for (let i = 0; i < 1200; i++) { const s = api.simulate(0.1); for (const b of s.banners) seen.add(b.text); if (s.ended && s.t - s.endAt > 3) break; }
    return { first, seen: [...seen] };
  });
  await page.close();
  assert.deepEqual(r.first, ['WHICH CLOUD RULES THE SKY?']);
  assert.ok(r.seen.some((t) => / RULES THE SKY!$/.test(t)), r.seen.join(' | '));
  assert.ok(r.seen.every((t) => /^[A-Z0-9 !?]+$/.test(t)), r.seen.join(' | '));
});
