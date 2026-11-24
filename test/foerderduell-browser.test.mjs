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

  const clearances=await page.evaluate(()=>{
    const F=EBS.Foerderduell, balls=F.buildRound(42,0,'steady').lanes[0], ball=balls[4];
    return ['9:16','16:9','1:1'].map(aspect=>{
      const {frame,lanes}=F.layout(EBS.ASPECTS[aspect]), l=lanes[0], s=l.screw, r=frame.r;
      const c=Math.cos(l.axes.angle), b=Math.sin(l.axes.angle);
      let minimum=Infinity, contactError=0, contacts=0, outletSamples=0;
      // Abtastung der gezeichneten, endlich langen Metallfläche gegen die gezeichnete Kugel.
      for(let n=0;n<360;n++) {
        const beat=ball.enter+(ball.exit-ball.enter)*n/360;
        const p=F.position(ball,balls,0,beat,l,r,0), z=p[3];
        const dx=p[0]-l.lane.root[0], dy=p[1]-l.lane.root[1];
        const x=dx*c+dy*b, v=-dx*b+dy*c, turns=F.Auger.turnsAt(beat);
        let nearest=Math.hypot(v,z)-s.shaft;
        for(let i=0;i<=300;i++) {
          const u=x+r*(i/100-1.5);
          if(u<s.start || u>s.end) continue;
          const a=F.augerAngle(s,u,turns), screen=-Math.cos(a), depth=Math.sin(a);
          const radius=Math.max(s.shaft,Math.min(s.tip,v*screen+z*depth));
          const axial=Math.max(0,Math.abs(x-u)-s.halfGauge);
          nearest=Math.min(nearest,Math.hypot(axial,radius*screen-v,radius*depth-z));
        }
        minimum=Math.min(minimum,nearest/r);
        if(F.Auger.pose(ball,beat).contact) {
          contacts++;
          contactError=Math.max(contactError,Math.abs(nearest/r-1));
        }
        if(beat>ball.release) outletSamples++;
      }
      return {aspect,minimum,contactError,contacts,outletSamples};
    });
  });
  for(const sample of clearances) {
    assert.ok(sample.minimum>=.999 && sample.contactError<.002,JSON.stringify(sample));
    assert.ok(sample.contacts>200 && sample.outletSamples>20,JSON.stringify(sample));
  }
});
