// Bedienung und Konfiguration: freie Videolänge, kurzer Standard, unbekannte Szenario-ID (Oberfläche, Export, CLI).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { INDEX, ROOT, launchBrowser } from '../lib/browser.mjs';
import { exportVideo } from '../lib/exporter.mjs';

const dir = mkdtempSync(join(tmpdir(), 'ebs-config-'));
process.on('exit', () => rmSync(dir, { recursive: true, force: true }));
const URL0 = pathToFileURL(INDEX).href;
let browser;
before(async () => { browser = await launchBrowser({ gpu: false }); });
after(async () => { await browser?.close(); });

/** Öffnet die Live-Oberfläche in einem frischen Browserprofil (eigener localStorage). */
async function live(query = '', init) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  if (init) await ctx.addInitScript(init.fn, init.arg);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL0 + query);
  await page.waitForFunction(() => window.EBS && window.EBS.app && window.EBS.app.sim, null, { timeout: 30000 });
  return { ctx, page, errors };
}
const ready = (page) => page.waitForFunction(() => window.EBS && window.EBS.app && window.EBS.app.sim, null, { timeout: 30000 });
const duration = (page) => page.evaluate(() => window.EBS.app.cfg.video.durationSec);
const typeDuration = async (page, text) => { await page.fill('#durationText', text); await page.dispatchEvent('#durationText', 'change'); };
const ui = (page) => page.evaluate(() => ({
  text: document.querySelector('#durationText').value, select: document.querySelector('#duration').value,
  out: document.querySelector('#durationOut').textContent, hint: document.querySelector('#durationHint').textContent,
  bad: document.querySelector('#durationText').classList.contains('bad'),
}));

test('Kurzer Standard: ohne gespeicherte Einstellungen 45 Sekunden', async () => {
  const { ctx, page, errors } = await live();
  assert.equal(await duration(page), 45);
  assert.deepEqual(await ui(page).then((u) => [u.text, u.select, u.out]), ['45s', '45', '00:45']);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Eigene Videolänge bleibt bei Neuladen, Szenariowechsel, Neustart und Formatwechsel erhalten', async () => {
  const { ctx, page, errors } = await live();
  await typeDuration(page, '37');
  assert.equal(await duration(page), 37);
  assert.deepEqual(await ui(page).then((u) => [u.text, u.select, u.out, u.bad]), ['37s', '', '00:37', false], 'Anzeige eigener Dauer');
  // Neuladen: früher sprang jede Dauer außerhalb der Auswahlliste still auf 3600 s
  await page.reload(); await ready(page);
  assert.equal(await duration(page), 37, 'Dauer nach Neuladen');
  assert.equal((await ui(page)).select, '', 'Schnellwahl zeigt „Eigene Dauer“');
  await page.selectOption('#scenario', 'marble');
  assert.equal(await duration(page), 37, 'Dauer nach Szenariowechsel');
  await page.click('#btnRestart');
  await page.click('#segFormat button[data-v="16:9"]');
  assert.equal(await duration(page), 37, 'Dauer nach Neustart und Formatwechsel');
  assert.equal((await ui(page)).text, '37s');
  // gespeicherte Konfiguration enthält den Wert
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('ebs.cfg')).video.durationSec), 37);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Videolänge: Einheiten, Schnellwahl, Grenzen und ungültige Eingaben', async () => {
  const { ctx, page, errors } = await live();
  for (const [text, sec, shown] of [['5m', 300, '5m'], ['1h', 3600, '1h'], ['90 s', 90, '90s'], ['2,5 min', 150, '150s'], ['1', 1, '1s']]) {
    await typeDuration(page, text);
    assert.equal(await duration(page), sec, `Eingabe "${text}"`);
    assert.equal((await ui(page)).text, shown);
  }
  await typeDuration(page, '5m');
  assert.equal((await ui(page)).select, '300', 'Schnellwahl folgt der Eingabe');
  await page.selectOption('#duration', '20');
  assert.deepEqual([await duration(page), (await ui(page)).text], [20, '20s'], 'Schnellwahl setzt die Eingabe');
  // Obergrenze 4 h: wird begrenzt und gemeldet
  await typeDuration(page, '99h');
  let u = await ui(page);
  assert.equal(await duration(page), 4 * 3600);
  assert.deepEqual([u.text, u.out, u.bad], ['4h', '4:00:00', false]);
  assert.match(u.hint, /begrenzt.*1 s bis 4 h/);
  // Ungültig: Wert bleibt, Fehler ist sichtbar
  await typeDuration(page, '45');
  for (const text of ['abc', '0', '-5', '5 Tage', '']) {
    await typeDuration(page, text);
    u = await ui(page);
    assert.equal(await duration(page), 45, `ungültige Eingabe "${text}" darf nichts ändern`);
    assert.equal(u.bad, true, `Eingabe "${text}" nicht als Fehler markiert`);
    assert.match(u.hint, /keine gültige Dauer.*weiterhin 45s/);
  }
  await typeDuration(page, '45s');
  assert.equal((await ui(page)).bad, false, 'Fehlermarkierung verschwindet nach gültiger Eingabe');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Veraltete gespeicherte Konfiguration: sichtbare Meldung, Standard-Szenario startet, übrige Werte bleiben', async () => {
  const init = { fn: (cfg) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('ebs.cfg', cfg); sessionStorage.setItem('seeded', '1'); } },
    arg: JSON.stringify({ version: 1, scenario: 'gibtsnicht', seed: 5, video: { aspect: '16:9', durationSec: 37 } }) };
  const { ctx, page, errors } = await live('', init);
  const s = await page.evaluate(() => ({ sc: window.EBS.app.cfg.scenario, seed: window.EBS.app.cfg.seed, d: window.EBS.app.cfg.video.durationSec, a: window.EBS.app.cfg.video.aspect,
    hidden: document.querySelector('#notice').hidden, note: document.querySelector('#notice').textContent }));
  assert.deepEqual([s.sc, s.seed, s.d, s.a], ['naval', 5, 37, '16:9']);
  assert.equal(s.hidden, false, 'Meldung ist nicht sichtbar');
  assert.match(s.note, /gespeicherte Konfiguration.*„gibtsnicht“.*Endless Naval Battle.*naval, marble/);
  // Eintrag wurde ersetzt: nach dem Neuladen keine Meldung mehr
  await page.reload(); await ready(page);
  assert.equal(await page.evaluate(() => document.querySelector('#notice').hidden), true, 'Meldung erscheint erneut');
  assert.equal(await duration(page), 37);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Link mit unbekanntem Szenario: sichtbare Meldung statt stillem Wechsel', async () => {
  const { ctx, page, errors } = await live('?scenario=robotwars&seed=9');
  const s = await page.evaluate(() => ({ sc: window.EBS.app.cfg.scenario, seed: window.EBS.app.cfg.seed, hidden: document.querySelector('#notice').hidden, note: document.querySelector('#notice').textContent }));
  assert.deepEqual([s.sc, s.seed, s.hidden], ['naval', 9, false]);
  assert.match(s.note, /Der Link.*„robotwars“/);
  // gültiger Link: keine Meldung
  await page.goto(URL0 + '?scenario=marble'); await ready(page);
  assert.deepEqual(await page.evaluate(() => [window.EBS.app.cfg.scenario, document.querySelector('#notice').hidden]), ['marble', true]);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Export mit unbekanntem Szenario bricht mit klarer Meldung ab und erzeugt keine Datei', async () => {
  const out = join(dir, 'unknown.mp4'), logs = [];
  await assert.rejects(
    exportVideo({ scenario: 'gibtsnicht', durationSec: 1 }, { out, log: (m) => logs.push(m) }),
    (e) => e.code === 'UNKNOWN_SCENARIO' && /^Unbekanntes Szenario "gibtsnicht"\. Verfügbar: naval, marble, scrap$/.test(e.message),
  );
  assert.ok(!logs.some((m) => /Software-Renderer/.test(m)), 'unnötiger zweiter Startversuch: ' + logs.join(' | '));
  assert.deepEqual(readdirSync(dir).filter((f) => f.startsWith('unknown')), []);
  // nachgeladenes Szenario mit falscher ID: ebenfalls klare Meldung
  await assert.rejects(
    exportVideo({ scenario: 'dumy', durationSec: 1 }, { out, scripts: [join(ROOT, 'test', 'fixtures', 'dummy-scenario.js')] }),
    (e) => e.code === 'UNKNOWN_SCENARIO' && /Verfügbar: naval, marble, scrap, dummy/.test(e.message),
  );
});

test('Kommandozeile: unbekanntes Szenario -> Exit-Code 1 und verständliche Meldung', async () => {
  const out = join(dir, 'cli.mp4');
  const p = spawn(process.execPath, [join(ROOT, 'export.mjs'), '--scenario', 'gibtsnicht', '--duration', '1', '--out', out], { windowsHide: true });
  let text = '';
  p.stdout.on('data', (d) => { text += d; }); p.stderr.on('data', (d) => { text += d; });
  const code = await new Promise((res) => p.on('close', res));
  assert.equal(code, 1);
  assert.match(text, /Fehler: Unbekanntes Szenario "gibtsnicht"\. Verfügbar: naval, marble/);
  assert.ok(!existsSync(out), 'Datei trotz Fehler erzeugt');
});
