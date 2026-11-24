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
    const s = EBS.app.session, cfg = s.cfg;
    const times = [7.6, 10.7, 14, 29.3, 31.2, 130.6, 132.4, 135.7, 170, 387.5];
    const ink = [], bubbles = [];
    const drawBubble = EBS.Territory.drawHqBubble;
    let activeTeam = null;
    EBS.Territory.drawHqBubble = function (...args) { activeTeam = args[4].team; return drawBubble(...args); };
    // Compare the actual foreground against the underlying board at each pass.
    // The meteor near the citadel is outside both of these crops.
    function giantPixels(r, time, ridgeId) {
      const view = s.renderer.hexView, ridge = r.tiles[ridgeId], canvas = document.createElement('canvas');
      canvas.width = 320; canvas.height = 250;
      const g = canvas.getContext('2d', {willReadFrequently:true});
      const p = view.project(ridge.x, ridge.height, ridge.z);
      g.translate(160 - Math.round(p.x), 171 - Math.round(p.y));
      g.drawImage(view.canvas, 0, 0, view.width, view.height);
      const before = g.getImageData(0,0,320,250).data;
      EBS.Territory.drawWilds(g, r, view, time);
      const after = g.getImageData(0,0,320,250).data;
      let changed = 0;
      for (let i = 0; i < after.length; i += 4) {
        const difference = Math.abs(before[i] - after[i]) + Math.abs(before[i+1] - after[i+1])
          + Math.abs(before[i+2] - after[i+2]);
        if (difference > 12) changed++;
      }
      return changed;
    }
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
        activeTeam = null; s.renderer.draw();
        if (state !== s.sim.stateHash()) throw Error('Zeichnen verändert die Simulation');
        frames.push(s.renderer.canvas.toDataURL('image/png'));
        if (!withFrames) {
          bubbles.push(activeTeam);
          if (target <= 14 || (target >= 130 && target < 136)) {
            const r = s.sim.roundSim;
            ink.push(giantPixels(r, r.time + s.sim.accumulator, target <= 14 ? 118 : 102));
          }
        }
      }
      return frames;
    }
    const playback = capture(true), seek = capture(false);
    const display = ['slim','off'].map(mode => {
      s.sim.setParam('display', mode);
      activeTeam = null; s.renderer.draw();
      return activeTeam;
    });
    EBS.Territory.drawHqBubble = drawBubble;
    return { same: seek.map((f,i)=>f===playback[i]), ink, bubbles, display, tiles:s.sim.roundSim.tiles.length,
      cues:s.sim.events.filter(e=>['giant_arrival','meteor_warning','meteor_impact','meteor_clear'].includes(e.type)).map(e=>e.type) };
  });
  assert.equal(result.tiles,221);
  assert.ok(result.same.length === 10 && result.same.every(Boolean));
  assert.deepEqual(result.bubbles, [null,null,null,2,null,null,null,null,null,0]);
  assert.deepEqual(result.display, [0,null]);
  const [before, emerging, entered, leaving, behindRock, gone] = result.ink;
  assert.equal(before, 0); assert.equal(gone, 0);
  assert.ok(emerging > 100 && entered > emerging * 1.5, JSON.stringify(result.ink));
  assert.ok(behindRock > 100 && leaving > behindRock * 1.5, JSON.stringify(result.ink));
  for (const cue of ['giant_arrival','meteor_warning','meteor_impact','meteor_clear']) assert.ok(result.cues.includes(cue));
  assert.deepEqual(errors,[]);
});
