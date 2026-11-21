// Scrap Wars · Short (R40, S1): Darstellung ohne Kopfleiste, Einstiegstext, Sieger groß, Seek-Bild, Schalter.
// Die Simulation des Shorts prüft test/scrap-v4.test.mjs.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { INDEX, launchBrowser, openExportPage } from '../lib/browser.mjs';

let browser;
before(async () => { browser = await launchBrowser({ gpu: process.env.EBS_GPU === '1' }); });
after(async () => { await browser?.close(); });
const SHORT = { rulesVersion: 'v4', arena: 'sunshine', layout: 'short' };

test('Scrap-Short: kein Text am Rand, keine Kopfleiste, Einstiegstext 2,5 s, Sieger groß ohne „NEXT ROUND“', async () => {
  const { page, errors } = await openExportPage(browser, { scenario: 'scrap', seed: 42, video: { resolution: 720 } });
  try {
    const result = await page.evaluate(params => {
      const cfg = EBS.normalizeConfig({ scenario: 'scrap', seed: 42, params, video: { aspect: '9:16', resolution: 720 }, view: { hud: true, camera: false } });
      const world = { w: 1080, h: 1920 }, sc = EBS.getScenario('scrap');
      const sim = sc.create({ seed: 42, params: cfg.params, world, view: cfg.view, timeScale: 1 });
      const renderer = sc.createRenderer({ sim, world, view: cfg.view, renderScale: 2 / 3 });
      const proto = CanvasRenderingContext2D.prototype, fill = proto.fillText, stroke = proto.strokeText;
      // Jede Schrift mit ihrer Lage im Bild (Anteil der Bildhöhe), samt halber Schrifthöhe
      const shot = () => {
        const words = [];
        const note = function (value, x, y) {
          const m = this.getTransform(), size = parseFloat(this.font.match(/([\d.]+)px/)[1]) * Math.hypot(m.b, m.d);
          const py = m.b * x + m.d * y + m.f;
          words.push({ text: String(value), top: (py - size / 2) / this.canvas.height, bottom: (py + size / 2) / this.canvas.height });
        };
        try {
          proto.fillText = function (...a) { note.apply(this, a); return fill.apply(this, a); };
          proto.strokeText = function (...a) { note.apply(this, a); return stroke.apply(this, a); };
          renderer.draw();
        } finally { proto.fillText = fill; proto.strokeText = stroke; }
        // Randstreifen: oben 8 %, unten 19 % bleiben einfarbig (eine Zeile Abstand für die Kantenglättung)
        const c = renderer.canvas, g = c.getContext('2d'), plain = (y0, y1) => {
          const d = g.getImageData(0, y0, c.width, y1 - y0).data;
          for (let i = 4; i < d.length; i += 4) if (d[i] !== d[0] || d[i + 1] !== d[1] || d[i + 2] !== d[2]) return false;
          return true;
        };
        return { step: sim.step, phase: sim.phase, words, top: plain(0, Math.floor(c.height * .08) - 1), bottom: plain(Math.ceil(c.height * .81) + 1, c.height) };
      };
      const out = { layout: { ...renderer.layout }, shots: [], labelWidth: renderer.arena._labelLayout(sim.roundSim.robots, 540, 700, 1.4)[0].width };
      for (const step of [6, 60, 144, 156, 600]) { while (sim.step < step) sim.stepOnce(); out.shots.push(shot()); }
      while (sim.phase === 'running') sim.stepOnce();
      const end = sim.step, hash = sim.stateHash();
      for (const step of [end + 3, end + 60, end + 149]) { while (sim.step < step) sim.stepOnce(); out.shots.push(shot()); }
      out.winner = sim.roundSim.robots[sim.roundSim.winner].name; out.readOnly = hash !== undefined && sim.checkInvariants().ok;
      renderer.destroy(); sim.destroy(); return out;
    }, SHORT);
    assert.equal(result.layout.short, true);
    assert.ok(Math.abs(result.layout.y / 1920 - .08) < 1e-9 && Math.abs((result.layout.y + result.layout.height) / 1920 - .81) < .002);
    assert.ok(Math.abs(result.labelWidth - 58 * 1.4) < 1e-9, 'Schilder 1,4-fach');
    const texts = s => s.words.map(w => w.text), banned = /SCRAP WARS|ROUND|NEXT|COMPLETE|KNOCKED|WOOD|STONE|CONCRETE|★/;
    for (const s of result.shots) {
      assert.ok(s.top && s.bottom, `Schritt ${s.step}: Randstreifen nicht frei`);
      assert.ok(s.words.every(w => w.top >= .08 && w.bottom <= .81), `Schritt ${s.step}: Text am Rand ${JSON.stringify(s.words.filter(w => w.top < .08 || w.bottom > .81))}`);
      assert.ok(texts(s).every(t => !banned.test(t)), `Schritt ${s.step}: ${texts(s).join(' | ')}`);
    }
    const [early, mid, late, gone, fight, won, hold, last] = result.shots;
    for (const s of [early, mid, late]) {
      assert.ok(texts(s).includes('4 BOTS · 1 SURVIVOR') && texts(s).includes('PICK YOUR COLOR'), `Schritt ${s.step}`);
      const head = s.words.find(w => w.text === '4 BOTS · 1 SURVIVOR'), sub = s.words.find(w => w.text === 'PICK YOUR COLOR');
      assert.ok(Math.abs((head.top + head.bottom) / 2 - .22) < 1e-6 && sub.top > head.top, 'Einstiegstext bei 22 % Höhe, zweite Zeile darunter');
    }
    for (const s of [gone, fight]) assert.ok(!texts(s).some(t => /BOTS|PICK|WINS/.test(t)), `Schritt ${s.step}: ${texts(s).join(' | ')}`);
    for (const s of [won, hold, last]) {
      assert.equal(s.phase, 'outro');
      const big = s.words.filter(w => w.text === `${result.winner} WINS`);
      assert.ok(big.length >= 1, `Schritt ${s.step}: Sieger fehlt`);
      if (s !== won) assert.ok(big[0].bottom - big[0].top > .05, 'Sieger groß (über 5 % der Bildhöhe)');
    }
    assert.ok(result.readOnly);
    assert.deepEqual(errors.map(e => e.message), []);
  } finally { await page.close(); }
});

test('Scrap-Short: Bild nach Seek entspricht laufendem Zeichnen (Einstieg, Kampf, Abspann)', async () => {
  const { page, errors } = await openExportPage(browser, { scenario: 'scrap', seed: 42, video: { resolution: 720 } });
  try {
    const results = await page.evaluate(params => {
      const cfg = EBS.normalizeConfig({ scenario: 'scrap', seed: 42, params, video: { aspect: '9:16', resolution: 720 }, view: { hud: true, camera: false } });
      const world = { w: 1080, h: 1920 }, sc = EBS.getScenario('scrap');
      const create = () => {
        const sim = sc.create({ seed: 42, params: cfg.params, world, view: cfg.view, timeScale: 1 });
        return { sim, renderer: sc.createRenderer({ sim, world, view: cfg.view, renderScale: 2 / 3 }) };
      };
      const probe = create();
      while (probe.sim.phase === 'running' && probe.sim.step < 91 * 60) probe.sim.stepOnce();
      if (probe.sim.phase !== 'outro') throw Error('Short endet nicht im Abspann');
      const end = probe.sim.step, even = v => Math.ceil(v / 2) * 2;
      const blast = probe.sim.events.find(e => e.type === 'blast')?.step ?? probe.sim.events.find(e => e.type === 'hit').step;
      probe.renderer.destroy(); probe.sim.destroy();
      const out = [];
      // Einstiegstext beim Ein- und Ausblenden, frische Explosion, Sieger beim Einblenden und im Stand
      for (const target of [6, 144, even(blast + 6), even(end + 8), even(end + 90)]) {
        const continuous = create(), start = Math.max(0, target - 60);
        while (continuous.sim.step < start) continuous.sim.stepOnce();
        let frame;
        while (continuous.sim.step < target) {
          continuous.sim.stepOnce();
          if (continuous.sim.step % 2 === 0) { continuous.renderer.draw(); frame = continuous.renderer.canvas.toDataURL(); }
        }
        const sought = create();
        while (sought.sim.step < target) sought.sim.stepOnce();
        const events = JSON.stringify(sought.sim.events), hash = sought.sim.stateHash();
        sought.renderer.draw();
        out.push({ target, samePixels: frame === sought.renderer.canvas.toDataURL(),
          sameState: continuous.sim.stateHash() === hash && sought.sim.stateHash() === hash,
          readOnlyEvents: events === JSON.stringify(sought.sim.events), ok: sought.sim.checkInvariants().ok });
        for (const x of [continuous, sought]) { x.renderer.destroy(); x.sim.destroy(); }
      }
      return out;
    }, SHORT);
    assert.equal(results.length, 5);
    for (const r of results) assert.ok(r.samePixels && r.sameState && r.readOnlyEvents && r.ok, JSON.stringify(r));
    assert.deepEqual(errors.map(e => e.message), []);
  } finally { await page.close(); }
});

test('Scrap-Short: deutscher Schalter „Bildaufbau“, nur Taktik-Arena auf Sunny Yard; hochkant endet das Video von selbst', async t => {
  const ctx = await browser.newContext(); t.after(() => ctx.close());
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(pathToFileURL(INDEX).href + '?scenario=scrap&seed=42&paused=1&aspect=9:16');
  await page.waitForFunction(() => window.EBS?.app?.sim);
  // Ohne Angabe: normales Bild, in der Episode fehlt der Schlüssel (gleiche Zustands-Hashes wie bisher)
  assert.equal(await page.evaluate(() => EBS.app.cfg.params.layout), 'standard');
  assert.equal(await page.evaluate(() => 'layout' in EBS.app.sim.cfg), false);
  assert.deepEqual(await page.locator('#p-layout option').allTextContents(),
    ['Normal · Kopfleiste, ganze Arena', 'Short · kleine Karte, ohne Kopfleiste, eine Runde (nur Hochformat)']);
  assert.equal(await page.isDisabled('#p-layout'), true, 'ohne Taktik-Arena auf Sunny Yard gesperrt');
  // Erst die Regeln, dann die Karte: Auf Sunny Yard ist die Regelwahl ohne Taktik-Arena gesperrt.
  await page.selectOption('#p-rulesVersion', 'v4'); await page.selectOption('#p-arena', 'sunshine');
  assert.equal(await page.isDisabled('#p-layout'), false);
  await page.selectOption('#p-layout', 'short');
  await page.waitForFunction(() => EBS.app.sim.short === true && document.querySelector('#durationOut').textContent !== '…');
  assert.equal(await page.isDisabled('#durationText'), true);
  assert.match(await page.textContent('#durationHint'), /eine Runde bis zum Sieg und 2,5 Sekunden Abspann/);
  const sec = await page.evaluate(() => EBS.app.cfg.video.durationSec);
  assert.ok(sec > 10 && sec < 95, String(sec));
  // Andere Karte: Schalter fällt auf normal zurück, die Länge ist wieder frei wählbar
  await page.selectOption('#p-arena', 'yard');
  assert.equal(await page.evaluate(() => EBS.app.cfg.params.layout), 'standard');
  assert.equal(await page.isDisabled('#durationText'), false);
  assert.deepEqual(errors, []);
});
