import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { INDEX, launchBrowser } from '../lib/browser.mjs';

test('Großkarte und Langfilm sind im Simulator erreichbar, Standbilder hängen nur von der Videozeit ab', async t => {
  const browser = await launchBrowser({ gpu:false });
  t.after(() => browser.close());
  const page = await browser.newPage({viewport:{width:1280, height:800}}), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(pathToFileURL(INDEX).href + '?scenario=territory&paused=1');
  await page.waitForFunction(() => window.EBS?.app?.sim);
  await page.selectOption('#p-layout','wilds');
  await page.click('#p-layout-apply');
  assert.equal(await page.evaluate(() => EBS.app.cfg.video.aspect), '16:9');
  await page.click('#btnLongPreset');
  const film = await page.evaluate(() => EBS.app.cfg);
  assert.equal(film.seed,46); assert.equal(film.params.layout,'wilds'); assert.equal(film.params.videoEnd,'victory');

  const result = await page.evaluate(() => {
    const s = EBS.app.session, cfg = s.cfg, times = [16, 130.6, 131.5, 170];
    function capture(withFrames) {
      s.start(cfg);
      const frames = [];
      for (const target of times) {
        const end = Math.round(target*60);
        while (s.sim.step < end) {
          s.step();
          if (withFrames && s.sim.step < end && (s.sim.step%420 === 0 || (s.sim.step > end-24 && s.sim.step%2 === 0))) s.renderer.draw();
        }
        const state = s.sim.stateHash();
        s.renderer.draw();
        if (state !== s.sim.stateHash()) throw Error('Zeichnen verändert die Simulation');
        frames.push(s.renderer.canvas.toDataURL('image/png'));
      }
      return frames;
    }
    const playback = capture(true), seek = capture(false);
    return { same: seek.map((f,i)=>f===playback[i]), tiles:s.sim.roundSim.tiles.length,
      cues:s.sim.events.filter(e=>['giant_arrival','meteor_warning','meteor_impact','meteor_clear'].includes(e.type)).map(e=>e.type) };
  });
  assert.equal(result.tiles,221);
  assert.deepEqual(result.same,[true,true,true,true]);
  for (const cue of ['giant_arrival','meteor_warning','meteor_impact','meteor_clear']) assert.ok(result.cues.includes(cue));
  assert.deepEqual(errors,[]);
});
