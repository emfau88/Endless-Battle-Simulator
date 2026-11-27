// Marble Knockout, Gesamtlevel (R43 Teil 2): Prüfung im Browser. Plan: docs/MARBLE_KNOCKOUT_GESAMTLEVEL_PLAN_2026-11-25.md.
// Chromium rechnet dieselben Bits wie Node; das Bild nach einem Sprung gleicht dem nach durchgehender Wiedergabe, auch
// mit Kamera, Kacheln und Gruben. Eigene Datei und eigener CI-Job (`knockout-level-browser`): Zusammen mit den
// Browser-Prüfungen des Rennens Bahn für Bahn überschritt die Datei in der CI ohne Grafikkarte die Zeitgrenze.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { launchBrowser, openExportPage } from '../lib/browser.mjs';
import { loadKnockout, makeSim } from '../scripts/knockout-lab.mjs';

let browser;
before(async () => { browser = await launchBrowser({ gpu: false }); });
after(async () => { await browser?.close(); });

const FPS = 30;
const open = async (seed, aspect, params = {}) => (await openExportPage(browser, { scenario: 'knockout', seed, params, video: { resolution: 360, aspect, fps: FPS } })).page;
const sha = (b64) => createHash('sha256').update(b64).digest('hex');

// Ein Gesamtlevel-Bild kostet ohne Grafikkarte knapp 3 s; darum sechs Zeitpunkte je Format und drei Bilder Vorlauf.
// Turm (ab G3): zwei Zeitpunkte im Finale, der letzte kurz nach dem Sieg (Seed 3 gewinnt bei 31,1 s: Ziel, Glitzern,
// Siegerzeile). Gauntlet: Einstiegsflug (0,4 s und 4,1 s, ab G5), Titelkarte, Start, Hebe-Rad (49 s) und
// einbrechende Brücke (61 s); seit G5 liegt alles um die 7 s des Flugs später. TRAP TOWER (Rush, R44): Start, offene
// Falltüren, Gefängnis mit Gefangenen, Kehrarme, Drehbühne, Ziel (Seed 3 gewinnt bei rund 30 s).
test('Gesamtlevel (G2): Chromium rechnet wie Node; Seek-Regel mit Kamera an sechs Zeitpunkten je Format', async () => {
  const EBS = loadKnockout();
  for (const [aspect, seed, marks, extra = {}] of [
    ['9:16', 3, [0.4, 5.2, 10.2, 12.6, 26.0, 31.4]],
    ['16:9', 3, [0.4, 4.1, 10.3, 16.6, 49.0, 61.0]],
    ['9:16', 3, [0.4, 4.6, 8.0, 14.5, 23.0, 30.5], { level: 'rush' }],
  ]) {
    const params = { mode: 'level', ...extra }, name = extra.level ? `${aspect} Rush` : aspect;
    const sim = makeSim(EBS, { seed, aspect, params }), node = [];
    for (const t of [5, 12]) { while (sim.step < t * 60) sim.stepOnce(); node.push(sim.stateHash()); }
    const a = await open(seed, aspect, params), web = [];
    await a.evaluate(() => window.exportAPI.simulate(5)); web.push(await a.evaluate(() => window.exportAPI.hash()));
    await a.evaluate(() => window.exportAPI.simulate(7)); web.push(await a.evaluate(() => window.exportAPI.hash()));
    await a.close();
    assert.deepEqual(web, node, `${name}: Node und Chromium`);
    // Durchgehend: vor jedem Zeitpunkt jedes Bild zeichnen (Kachel-Speicher füllt sich); Sprung: nur rechnen
    const c = await open(seed, aspect, params), cont = [];
    let at = 0;
    for (const t of marks) {
      const lead = Math.min(0.1, t - at);
      await c.evaluate((s) => window.exportAPI.simulate(s), t - lead - at);
      const frames = await c.evaluate((n) => window.exportAPI.renderFrames(n, 1, 'image/png'), Math.round(lead * FPS));
      cont.push(sha(frames[frames.length - 1])); at = t;
    }
    await c.close();
    const j = await open(seed, aspect, params), jump = [];
    at = 0;
    for (const t of marks) {
      await j.evaluate((s) => window.exportAPI.simulate(s), t - 1 / FPS - at);
      jump.push(sha((await j.evaluate(() => window.exportAPI.renderFrames(1, 1, 'image/png')))[0])); at = t;
    }
    await j.close();
    marks.forEach((t, i) => assert.equal(jump[i], cont[i], `${name}: Bild bei ${t} s weicht ab`));
  }
});
