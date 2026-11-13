import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import vm from 'node:vm';
import {loadSamples,buildVoices,renderTrack,processTrack,measureEncodedAudio,SAMPLE_RATE,CEILING_DB} from '../lib/audio.mjs';
import {run,ffmpegBin} from '../lib/exporter.mjs';

const context=vm.createContext({});context.window=context;
for(const file of ['core.js','canvas-scene.js',...['simulation','renderer','rules','materials','daylight-art','material-art','episode'].map(f=>`scenarios/scrap/${f}.js`),'scenarios/scrap.js']) {
  vm.runInContext(readFileSync(new URL('../src/'+file,import.meta.url),'utf8'),context,{filename:file});
}
const {EBS}=context,audio=JSON.parse(JSON.stringify(EBS.getScenario('scrap').audio));
const samples=await loadSamples(audio);

test('Scrap-Ton: Holz, Stein und Beton wählen unterschiedliche Treffer-/Bruchklänge; Fallback und Regler bleiben erhalten',()=>{
  for(const type of ['cover_hit','break']) {
    const event={seq:1,step:60,type,x:960,p:19};
    const voice=material=>buildVoices([{...event,material}],audio,samples)[0];
    const selected=['wood','stone','concrete'].map(material=>voice(material).data);
    assert.equal(new Set(selected).size,3);
    for(let i=0;i<selected.length;i++)for(let j=i+1;j<selected.length;j++)assert.notDeepEqual(selected[i],selected[j]);
    assert.deepEqual(voice(undefined),voice('unknown'),'alte Materialangaben verwenden den bisherigen Fallback');
    const events=['wood','stone','concrete'].map((material,i)=>({...event,material,seq:i,step:60+i*30}));
    const base=buildVoices(events,audio,samples),half=buildVoices(events,audio,samples,{volume:{[type]:50}});
    assert.equal(base.length,3);half.forEach((v,i)=>assert.equal(v.gl,base[i].gl*.5));
    assert.equal(buildVoices(events,audio,samples,{volume:{[type]:0}}).length,0);
    assert.equal(buildVoices(events.map(e=>({...e,step:60})),audio,samples).length,1,'gleichzeitige Materialien vervielfachen den Spitzenpegel nicht');
    assert.deepEqual(buildVoices(events,audio,samples),base);
  }
});

test('Scrap-Ton: beide Sunny-Grundrisse treffen die Ziellautheit ohne die frühere extreme Begrenzung',()=>{
  for(const world of [{w:1920,h:1080},{w:1080,h:1920}]) {
    const sim=new EBS.Scrap.Episode({seed:42,params:{rulesVersion:'v3',arena:'sunshine'},world});
    for(let i=0;i<20*60;i++)sim.stepOnce();
    const mix=renderTrack(sim.events,audio,samples,{worldW:world.w,totalSamples:20*SAMPLE_RATE});
    assert.ok(Math.abs(mix.lufs+14)<=.15,JSON.stringify(mix));
    // The old mix needed 18.37/19.49 dB here. Require >= 4 dB improvement even with stricter AAC headroom.
    const previous=world.w>world.h?18.37:19.49;
    assert.ok(-mix.maxReductionDb<=previous-4,`keine ausreichende Verbesserung: ${JSON.stringify(mix)}`);
    assert.ok(mix.peakOutDb<=Math.min(CEILING_DB,audio.ceilingDb));
  }
});

test('Scrap-Ton: seltene AAC-Spitzen aus der 15-Minuten-Folge bleiben unter −1 dBTP',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'ebs-codec-peaks-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const fixture=JSON.parse(readFileSync(new URL('./fixtures/scrap-audio-peaks.json',import.meta.url),'utf8'));
  // Recorded full-episode gain and AAC-aligned windows preserve the original failing stimulus.
  // This is a codec stress excerpt; it is deliberately not normalized as an independent episode.
  const wav=join(dir,'peaks.wav'),aac=join(dir,'peaks.m4a');
  processTrack(buildVoices(fixture.events,audio,samples),fixture.durationSec*SAMPLE_RATE,
    {gain:10**(fixture.normalizationGainDb/20),ceiling:10**(audio.ceilingDb/20),releaseMs:audio.limiterReleaseMs,file:wav});
  const result=await run(ffmpegBin(),['-y','-v','error','-i',wav,'-c:a','aac','-b:a','192k',aac]);
  assert.equal(result.code,0,result.stderr);
  const encoded=await measureEncodedAudio(aac,{ffmpeg:ffmpegBin()});
  assert.equal(encoded.silent,false);assert.ok(encoded.truePeakDb<=-1,JSON.stringify(encoded));
});
