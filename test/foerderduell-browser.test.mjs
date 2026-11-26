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
        const x=dx*c+dy*b-s.depthScale*z, v=-dx*b+dy*c, turns=F.Auger.turnsAt(beat);
        let nearest=Math.hypot(v,z)-s.shaft;
        for(let i=0;i<=300;i++) {
          const u=x+r*(i/100-1.5);
          if(u<s.start || u>s.end) continue;
          const a=F.augerAngle(s,u,turns), screen=-Math.cos(a), depth=Math.sin(a);
          const radius=Math.max(s.shaft,Math.min(s.tip,v*screen+z*depth));
          const axial=Math.max(0,Math.abs(x-u)-s.halfGauge)/s.axisScale;
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

test('Nabe dreht in beiden Formaten, Einzelrennen und Ideenansicht spielen im Browser weiter', async t=>{
  const browser=await launchBrowser({gpu:false});
  t.after(()=>browser.close());
  const page=await browser.newPage(), errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await page.goto(pathToFileURL(INDEX).href+'?scenario=foerderduell&paused=1');
  await page.waitForFunction(()=>window.EBS?.app?.sim);
  const samples=await page.evaluate(()=>{
    const app=EBS.app, F=EBS.Foerderduell, results=[];
    for(const aspect of ['9:16','16:9']) {
      app.session.start(EBS.normalizeConfig({scenario:'foerderduell',video:{aspect}}));
      const renderer=app.session.renderer, lane=renderer.layout.lanes[0], s=lane.screw;
      const scale=renderer.fit*renderer.scale, radius=.54*1.14*s.tip;
      const mark=s.origin+Math.round(((s.end+s.start)/2-s.origin)/s.pitch)*s.pitch;
      for(const dt of [0,7,14,17,20,27]) {
        while(app.sim.step<146+dt) app.session.step();
        renderer.draw();
        const turns=F.Auger.turnsAt(app.sim.beat), angle=-2*Math.PI*turns;
        const brassAt=(u,v)=>{
          const [x,y]=lane.axes.at(u,v);
          const [red,green,blue]=renderer.ctx.getImageData(Math.round(x*scale),Math.round(y*scale),1,1).data;
          return red>170 && red>green+18 && green>blue+25;
        };
        const onHub=a=>brassAt(s.axleEnd+s.depthScale*radius*Math.sin(a),-radius*Math.cos(a));
        const a=F.augerAngle(s,mark,turns), z=Math.sin(a), bladeRadius=.77*s.tip;
        const blade=brassAt(mark+s.halfGauge+s.depthScale*bladeRadius*z,-bladeRadius*Math.cos(a));
        results.push({aspect,dt,hub:onHub(angle),otherArm:onHub(angle+2*Math.PI/3),
          blade,visible:z>.72?true:z<-.98?false:null});
      }
    }
    return results;
  });
  for(const sample of samples) {
    assert.ok(sample.hub && !sample.otherArm,JSON.stringify(sample));
    if(sample.visible!==null) assert.equal(sample.blade,sample.visible,JSON.stringify(sample));
  }

  await page.evaluate(()=>{
    const app=EBS.app;
    app.session.start(EBS.productionPreset('foerderduell','short'));
    while(app.sim.step<app.sim.roundLength-3) app.session.step();
    window.finishedShort=app.sim;
    app.setRunning(true);
  });
  await page.waitForFunction(()=>EBS.app.sim!==window.finishedShort && EBS.app.sim.step>1);
  assert.equal(await page.evaluate(()=>EBS.app.cfg.params.mode),'single');

  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(pathToFileURL(join(ROOT,'docs','reference','szenenideen.html')).href);
  const canvas=page.locator('canvas'), button=page.locator('[data-wiedergabe]');
  assert.ok(await canvas.isVisible());
  assert.equal(await button.textContent(),'Animation abspielen');
  await canvas.evaluate(c=>{ window.firstIdeaFrame=c.toDataURL(); });
  await button.click();
  await page.waitForFunction(()=>document.querySelector('canvas').toDataURL()!==window.firstIdeaFrame);
  await button.click();
  assert.equal(await button.textContent(),'Animation abspielen');
  await page.selectOption('[name=variante]','1');
  assert.match(await page.textContent('figcaption'),/Zwei Portionen/);
  await page.selectOption('[name=szene]','ringwerk');
  assert.ok(await canvas.isHidden() && await button.isHidden());
  assert.deepEqual(errors,[]);
});
