// Seeschlacht, Modus „Ruhiges Duell“ (in Arbeit): eigenes Regelwerk neben dem unveränderten Standardmodus.
// Der Standardmodus selbst ist über die Referenz-Hashes abgesichert (npm run golden).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { INDEX, launchBrowser, openExportPage } from '../lib/browser.mjs';

let browser;
before(async () => { browser = await launchBrowser({ gpu: false }); });
after(async () => { await browser?.close(); });

const open = async (cfg = {}) => (await openExportPage(browser, { seed: 42, ...cfg })).page;
const run = (page, sec) => page.evaluate((s) => window.exportAPI.simulate(s), sec);
const check = (page) => page.evaluate(() => window.exportAPI.check());
const hash = (page) => page.evaluate(() => window.exportAPI.hash());
const config = (page) => page.evaluate(() => window.exportAPI.config());
const CALM = { params: { mode: 'calm' }, video: { aspect: '16:9' } };
// Zustandsreferenz des Modus: Seed 42, Querformat, nach 1 200 und 7 200 Schritten. Nur nach einer gewollten
// Verhaltensänderung des Modus neu eintragen und im Pull Request begründen.
// Stand 2: Runden mit festem Schaden je Treffer, Segel am Schiffsschaden (vorher '30430187', '36607512').
// Stand 3: Rakete vom Heck (vorher 'ccf6c083', '6096ac27').
// Stand 4: Goldtreffer zählt doppelt (vorher '5a64ecd4', '66d227d3').
// Stand 5: Kanonen 30 % größer, die Mündung sitzt dadurch etwas weiter vorn (vorher '48a74102', 'dff41b7b').
const REFERENCE = ['dc0bcd3f', 'a30e14c3'];

test('Standardmodus bleibt unberührt: Modus endless, bekannte Klangliste, kein Segelzustand', async () => {
  const page = await open();
  const c = await config(page), s = await run(page, 1);
  assert.equal(c.params.mode, 'endless');
  assert.equal(c.params.cannons, 4);
  assert.deepEqual(c.video.volume, { master: 100, shot: 100, hit: 100, splash: 100, land: 100, reload: 100 });
  assert.equal(s.ballsExpected, 40);
  assert.equal('mode' in s, false, 'Momentaufnahme des Standardmodus hat neue Felder bekommen');
  assert.equal('sails' in s.ships[0], false);
  await page.close();
  // ein unbekannter Modus fällt auf den Standard zurück
  const other = await open({ params: { mode: 'gibt-es-nicht' } });
  assert.equal((await config(other)).params.mode, 'endless');
  await other.close();
});

test('Ruhiges Duell: Grundwerte des Modus (2 Kanonen je Schiff, halbe Feuerrate, eigene Standardmischung)', async () => {
  const page = await open(CALM), base = await open({ video: { aspect: '16:9' } });
  const c = await config(page);
  assert.equal(c.params.mode, 'calm');
  assert.deepEqual(c.video.volume, { master: 65, shot: 100, hit: 100, bounce: 100, rocket: 100, burst: 100, gold: 100, splash: 100, land: 100, reload: 100 });
  const s = await run(page, 120), b = await run(base, 120);
  assert.equal(s.mode, 'calm');
  assert.equal(s.ballsExpected, 20, 'zwei Schiffe × zwei Kanonen × fünf Kugeln');
  // halbe Feuerrate bei halber Kanonenzahl: rund ein Viertel der Schüsse des Standardmodus
  const ratio = s.shots / b.shots;
  assert.ok(ratio > 0.2 && ratio < 0.32, `Schussverhältnis zum Standardmodus ${ratio.toFixed(3)} (erwartet etwa 0,25)`);
  await page.close(); await base.close();
});

test('Ruhiges Duell: gleicher Seed = gleicher Ablauf, Zustandsreferenz, Kreislauf und Segelschäden (2 Minuten)', async () => {
  const pages = [await open(CALM), await open(CALM)], hashes = [];
  for (const page of pages) {
    await run(page, 20);
    const h20 = await hash(page), s = await run(page, 100), c = await check(page);
    hashes.push([h20, await hash(page)]);
    assert.ok(c.ok, c.errors.join('; '));
    assert.equal(s.ballsTotal, s.ballsExpected, 'Kugelanzahl hat sich verändert');
    assert.equal(s.shots - s.recycled, s.inFlight + s.inRecycle, 'Bilanz Schüsse/Recycling stimmt nicht');
    assert.equal(s.splashes, s.shots - s.inFlight, 'Kugel hat die Flugphase ohne Wasserkontakt verlassen');
    assert.ok(s.bounces > 0, 'keine Abpraller gezählt');
    assert.ok(s.sailHits > 20, `zu wenige Segeldurchschüsse: ${s.sailHits}`);
    for (const ship of s.ships) {
      assert.equal(ship.sails.length, 5);
      assert.ok(ship.sails.some((x) => x.holes > 0 && x.wear > 0), `${ship.name}: Segel ohne Schaden`);
      for (const x of ship.sails) assert.ok(x.wear >= 0 && x.wear <= 1);
    }
    await page.close();
  }
  assert.deepEqual(hashes[0], hashes[1], 'zwei Läufe mit gleichem Seed weichen ab');
  assert.deepEqual(hashes[0], REFERENCE, 'Zustandsreferenz des Modus hat sich geändert');
});

test('Ruhiges Duell: Runde endet mit Versenkung, Punkt, Feuerpause mit Reparatur und neuem Schiff', async () => {
  const page = await open(CALM);
  let s = await run(page, 120), sinkAt = 0, shotsAtSink = 0;
  assert.deepEqual([s.sunk, s.round, s.score], [0, 1, [0, 0]]);
  // jeder Treffer nimmt einen festen Betrag: Kanonenkugel 2 %, goldene Kugel das Doppelte, Raketensplitter 0,5 %
  for (const ship of s.ships) {
    const want = ship.hitsTaken * 0.02 + ship.goldTaken * 0.02 + ship.shardsTaken * 0.005;
    assert.ok(Math.abs(ship.damage - want) < 1e-9, `${ship.name}: Schaden ${ship.damage} bei ${ship.hitsTaken} Treffern (${ship.goldTaken} golden) und ${ship.shardsTaken} Splittern`);
  }
  assert.ok(s.goldHits >= 2, `Goldtreffer in 2 Minuten: ${s.goldHits}`);
  assert.equal(s.goldHits, s.ships[0].goldTaken + s.ships[1].goldTaken);
  assert.ok(s.rockets >= 8 && s.rockets <= 14, `Raketen in 2 Minuten: ${s.rockets} (erwartet etwa 11)`);
  assert.ok(s.shardHits > 0, 'kein Splitter hat getroffen');
  for (let t = 121; t <= 260 && !sinkAt; t++) { s = await run(page, 1); if (s.sunk) { sinkAt = t; shotsAtSink = s.shots; } }
  assert.ok(sinkAt, 'in 260 s ist kein Schiff gesunken');
  const loser = s.ships.findIndex((x) => x.phase === 'sinking'), winner = 1 - loser;
  assert.ok(loser >= 0, 'kein Schiff im Zustand sinking');
  assert.equal(s.score[winner], 1); assert.equal(s.score[loser], 0);
  assert.equal(s.round, 1, 'die Rundennummer springt erst mit der neuen Runde');
  s = await run(page, 10);                                   // mitten in der Feuerpause
  assert.equal(s.shots, shotsAtSink, 'in der Feuerpause ist geschossen worden');
  assert.equal(s.sunk, 1, 'ein Nachzügler hat auch den Sieger versenkt');
  s = await run(page, 14);                                   // neue Runde läuft
  const c = await check(page);
  assert.ok(c.ok, c.errors.join('; '));
  assert.deepEqual(s.ships.map((x) => x.phase), ['afloat', 'afloat']);
  assert.equal(s.round, 2);
  assert.equal(s.ships[loser].gen, 1, 'das neue Schiff trägt die nächste Nummer');
  assert.equal(s.ships[winner].gen, 0);
  for (const ship of s.ships) assert.ok(ship.damage < 0.15, `${ship.name} startet nicht frisch: ${ship.damage}`);
  assert.ok(s.ships[loser].sails.every((x) => x.holes === 0 || x.hits > 0), 'neues Schiff hat alte Segellöcher');
  assert.ok(s.shots > shotsAtSink, 'nach der Feuerpause wird nicht wieder geschossen');
  assert.equal(s.ballsTotal, s.ballsExpected);
  assert.equal(s.shots - s.recycled, s.inFlight + s.inRecycle, 'Bilanz Schüsse/Recycling stimmt nicht');
  assert.equal(s.splashes, s.shots - s.inFlight, 'Kugel hat die Flugphase ohne Wasserkontakt verlassen');
  await page.close();
});

test('Ruhiges Duell: Zeichnen verändert den Zustand nicht (Segel mit Löchern im Bild)', async () => {
  const video = { aspect: '16:9', resolution: 720, fps: 30 };
  const drawn = await open({ ...CALM, video }), plain = await open({ ...CALM, video });
  await run(drawn, 14);
  for (let k = 0; k < 3; k++) await drawn.evaluate(() => { window.exportAPI.renderFrames(30, 0.1); });   // 90 Bilder = 3 s
  const s = await run(plain, 17);
  assert.ok(s.sailHits > 0, 'im Prüfzeitraum ist noch kein Segel durchschossen');
  assert.equal(await hash(drawn), await hash(plain));
  await drawn.close(); await plain.close();
});

test('Ruhiges Duell: läuft auch im Hochformat und mit drei Schiffen (je 1 Minute)', async () => {
  for (const cfg of [{ params: { mode: 'calm' }, video: { aspect: '9:16' } }, { params: { mode: 'calm', ships: 3 }, video: { aspect: '16:9' } }]) {
    const page = await open(cfg), s = await run(page, 60), c = await check(page);
    assert.ok(c.ok, c.errors.join('; '));
    assert.equal(s.ballsTotal, s.ballsExpected);
    assert.equal(s.ballsExpected, (cfg.params.ships || 2) * 2 * 5);
    await page.close();
  }
});

test('Oberfläche: Moduswechsel blendet den Kanonenregler aus und lädt die Standardmischung des Modus', async (t) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });   // frisches Profil, eigener localStorage
  t.after(() => ctx.close());
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(pathToFileURL(INDEX).href);
  await page.waitForFunction(() => window.EBS && window.EBS.app && window.EBS.app.sim, null, { timeout: 30000 });
  const state = () => page.evaluate(() => ({
    scenario: window.EBS.app.cfg.scenario, mode: document.getElementById('p-mode').value, simMode: window.EBS.app.cfg.params.mode,
    cannonsHidden: document.getElementById('p-cannons').closest('.ctl, label').hidden,
    master: +document.getElementById('vol-master').value, cfgMaster: window.EBS.app.cfg.video.volume.master,
    bounce: !!document.getElementById('vol-bounce'), balls: window.EBS.app.sim.balls.length,
  }));
  const endless = { scenario: 'naval', mode: 'endless', simMode: 'endless', cannonsHidden: false, master: 100, cfgMaster: 100, bounce: false, balls: 40 };
  assert.deepEqual(await state(), endless);
  await page.selectOption('#p-mode', 'calm');
  await page.waitForFunction(() => window.EBS.app.cfg.params.mode === 'calm' && document.getElementById('vol-bounce'));
  assert.deepEqual(await state(), { scenario: 'naval', mode: 'calm', simMode: 'calm', cannonsHidden: true, master: 65, cfgMaster: 65, bounce: true, balls: 20 });
  await page.selectOption('#p-mode', 'endless');
  await page.waitForFunction(() => window.EBS.app.cfg.params.mode === 'endless' && !document.getElementById('vol-bounce'));
  assert.deepEqual(await state(), endless);
  assert.deepEqual(errors, []);
});
