import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { INDEX, ROOT, launchBrowser } from '../lib/browser.mjs';

test('Szenenauswahl, Vorlagen und identische Bilder bei Wiedergabe und Zeitsprung', async t => {
  const browser=await launchBrowser({gpu:false});
  t.after(()=>browser.close());
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(INDEX).href+'?paused=1&seed=42');
  await page.waitForFunction(()=>window.EBS?.app?.sim);
  await page.selectOption('#scenario','foerderduell');
  assert.match(await page.textContent('#subtitle'),/Schnecke gegen Stempel/);
  for(const kind of ['short','long']) {
    await page.click(kind==='short'?'#btnShortPreset':'#btnLongPreset');
    await page.waitForFunction(()=>document.querySelector('#durationOut').textContent!=='…');
    const file=JSON.parse(await readFile(join(ROOT,'presets/production/foerderduell-'+kind+'.json'),'utf8'));
    assert.deepEqual(await page.evaluate(k=>EBS.productionPreset('foerderduell',k),kind),file);
    assert.deepEqual(await page.evaluate(()=>EBS.app.cfg),await page.evaluate(f=>EBS.normalizeConfig(f),file));
    assert.equal(await page.isDisabled('#durationText'),kind==='short');
    const verified=await page.evaluate(kind=>{
      const session=EBS.app.session, cfg=structuredClone(session.cfg);
      const points=kind==='short'?[174,580,615,663]:[166,804,956];
      function replay(continuous) {
        session.start(cfg);
        const pictures=[], states=[], scores=[];
        for(let i=1;i<=points.at(-1);i++) {
          session.step();
          if(continuous && i%2===0) session.renderer.draw();
          if(!points.includes(i)) continue;
          const state=session.sim.stateHash(); session.render();
          if(session.sim.stateHash()!==state) throw Error('Zeichnen verändert das Rennen.');
          pictures.push(session.app.canvas.toDataURL('image/png'));
          states.push(state); scores.push(session.sim.snapshot().scores);
        }
        return {pictures,states,scores};
      }
      const played=replay(true), jumped=replay(false);
      return {pixels:played.pictures.every((p,i)=>p===jumped.pictures[i]),states:played.states.every((s,i)=>s===jumped.states[i]),
        varied:new Set(played.pictures).size, scores:played.scores, round:session.sim.roundIndex+1};
    },kind);
    assert.equal(verified.pixels,true); assert.equal(verified.states,true);
    assert.equal(verified.varied,kind==='short'?4:3);
    if(kind==='short') {assert.deepEqual(verified.scores[1],[8,7]); assert.deepEqual(verified.scores.at(-1),[9,14]);}
    else assert.equal(verified.round,2);
  }
  await page.selectOption('#p-supply','packets');
  assert.equal(await page.evaluate(()=>EBS.app.cfg.params.supply),'packets');
  const square=await page.evaluate(()=>{
    const session=EBS.app.session; session.setAspect('1:1'); session.setView('hud',false); session.render();
    return [session.app.canvas.width,session.app.canvas.height,session.sim.checkInvariants().ok];
  });
  assert.deepEqual(square,[1080,1080,true]); assert.deepEqual(errors,[]);
});
