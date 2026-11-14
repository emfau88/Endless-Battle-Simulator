// Build the Kenney-led C listening direction once; production loads the finished OGGs.
// Requires the existing Node/FFmpeg tools only. No runtime synthesis, network or Python.
// node scripts/build-marbleworks-audio.mjs [--check]
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);
const DIR = new URL('assets/audio/', ROOT);
const SOURCES = new URL('marbleworks-source/', DIR);
const SR = 48000, check = process.argv.includes('--check');
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const specs = {
  glass: { sources: ['impactGlass_light_000','impactGlass_light_003','impactGlass_light_004'],
    rate:.83, seconds:.29, lowpass:2200, kenney:.88,
    modes:[[620,1,.060],[1020,.19,.034],[1595,.055,.021],[285,.15,.034]] },
  wood: { sources: ['impactWood_light_001','impactWood_light_003','impactWood_light_004'],
    rate:.94, seconds:.22, lowpass:1700, kenney:.90,
    modes:[[210,1,.031],[438,.27,.020],[765,.11,.013]] },
  switch: { sources: ['impactGeneric_light_001','impactGeneric_light_003'],
    rate:.91, seconds:.18, lowpass:1450, kenney:.90,
    modes:[[355,1,.023],[670,.24,.017],[970,.08,.011]] },
  body: { sources: ['impactSoft_medium_000','impactSoft_medium_002'],
    rate:.96, seconds:.19, lowpass:900, kenney:.90,
    modes:[[112,1,.039],[205,.25,.030],[343,.06,.018]] },
  metal: { sources: ['impactMetal_light_002','impactMetal_light_003'],
    rate:.77, seconds:.24, lowpass:1600, kenney:.90,
    modes:[[420,1,.042],[805,.12,.025],[1370,.03,.012]] },
};

function ff(args, input) {
  const r=spawnSync(ffmpeg,['-hide_banner','-nostdin',...args],{
    input,windowsHide:true,maxBuffer:8*1024*1024,
  });
  if(r.status!==0) throw new Error(r.error?.message || r.stderr.toString());
  return r.stdout;
}
function decode(path) {
  const bytes=ff(['-v','error','-i',path,'-ac','1','-ar',String(SR),'-f','f32le','-']);
  const out=new Float64Array(bytes.length/4);
  for(let i=0;i<out.length;i++) out[i]=bytes.readFloatLE(i*4);
  return out;
}
function pcm(x) {
  const out=Buffer.alloc(x.length*4);
  for(let i=0;i<x.length;i++) out.writeFloatLE(x[i],i*4);
  return out;
}
function peak(x) { let p=0;for(const v of x)p=Math.max(p,Math.abs(v));return p; }
function rms(x) { let sum=0;for(const v of x)sum+=v*v;return Math.sqrt(sum/x.length); }
function scale(x,g) { for(let i=0;i<x.length;i++)x[i]*=g;return x; }
function unit(x) { return scale(x,.19/Math.max(rms(x),1e-12)); }
function envelope(x,attack=.009,release=.045) {
  const a=Math.min(x.length,Math.round(attack*SR)),r=Math.min(x.length,Math.round(release*SR));
  for(let i=0;i<a;i++)x[i]*=Math.sin(Math.PI/2*i/Math.max(1,a-1))**2;
  for(let i=0;i<r;i++)x[x.length-r+i]*=Math.cos(Math.PI/2*i/Math.max(1,r-1))**2;
  return x;
}
function biquad(x,frequency,q,highpass=false) {
  const w=2*Math.PI*frequency/SR,c=Math.cos(w),s=Math.sin(w),alpha=s/(2*q),a0=1+alpha;
  const b0=(highpass?(1+c):(1-c))/(2*a0),b1=(highpass?-(1+c):(1-c))/a0,b2=b0;
  const a1=-2*c/a0,a2=(1-alpha)/a0;
  let z1=0,z2=0;
  for(let i=0;i<x.length;i++){
    const v=x[i],y=b0*v+z1;z1=b1*v-a1*y+z2;z2=b2*v-a2*y;x[i]=y;
  }
  return x;
}
function filter(x,cutoff) {
  biquad(x,55,Math.SQRT1_2,true);
  biquad(x,cutoff,.541196100146197);
  return biquad(x,cutoff,1.306562964876377);
}
function recording(source,spec) {
  const threshold=peak(source)*.0025;
  let first=0,last=source.length-1;
  while(first<source.length && Math.abs(source[first])<=threshold)first++;
  while(last>first && Math.abs(source[last])<=threshold)last--;
  source=source.slice(Math.max(0,first-Math.round(.004*SR)),Math.min(source.length,last+Math.round(.018*SR)));
  const n=Math.min(Math.ceil(source.length/spec.rate),Math.round(spec.seconds*SR)),x=new Float64Array(n);
  for(let i=0;i<n;i++){
    const p=i*spec.rate,k=Math.floor(p),a=source[k]||0,b=source[k+1]||0;
    x[i]=a+(b-a)*(p-k);
  }
  filter(x,spec.lowpass);
  return unit(envelope(x,spec === specs.glass ? .010 : .008,.060));
}
function resonance(spec,variant) {
  const x=new Float64Array(Math.round(spec.seconds*SR)),pitch=1+(variant-1)*.014;
  for(let i=0;i<x.length;i++){
    const t=i/SR;
    for(const [f,a,d] of spec.modes)x[i]+=a*Math.sin(2*Math.PI*f*pitch*t)*Math.exp(-t/d);
  }
  return unit(envelope(filter(x,spec.lowpass)));
}

const version=ff(['-version']).toString().split(/\r?\n/)[0];
const manifest={ profile:'marbleworks-soft-c-v1', sampleRate:SR,
  source:'https://kenney.nl/assets/impact-sounds', license:'CC0-1.0',
  note:'Kenney .88–.90 plus original damped sinusoidal resonances .12–.10, after equal source RMS; these are amplitude coefficients, not a claim about perceived percentages. No added noise or reverb.',
  tool:version, samples:[] };
const prior=check?JSON.parse(readFileSync(new URL('MARBLEWORKS_AUDIO.json',DIR),'utf8')):null;
let index=0;
for(const [kind,spec] of Object.entries(specs))for(const [variant,sourceName] of spec.sources.entries()){
  const input=new URL(sourceName+'.ogg',SOURCES),name=`mw-soft-${kind}-${variant}`,output=new URL(name+'.ogg',DIR);
  const sourceHash=digest(readFileSync(input)),original=recording(decode(fileURLToPath(input)),spec),synth=resonance(spec,variant);
  const mixed=new Float64Array(Math.max(original.length,synth.length));
  for(let i=0;i<mixed.length;i++)mixed[i]=(original[i]||0)*spec.kenney+(synth[i]||0)*(1-spec.kenney);
  // The rounded endpoint is also exactly zero before encoding. OGG has ample headroom.
  scale(mixed,.54/Math.max(peak(mixed),1e-12));
  const samples=pcm(mixed),pcmHash=digest(samples);
  if(!check)ff(['-v','error','-y','-f','f32le','-ar',String(SR),'-ac','1','-i','-',
    '-c:a','libvorbis','-q:a','7','-fflags','+bitexact','-flags:a','+bitexact',
    '-serial_offset',String(index),'-map_metadata','-1',fileURLToPath(output)],samples);
  const decoded=decode(fileURLToPath(output)),decodedPeak=peak(decoded),seconds=decoded.length/SR;
  if(!Number.isFinite(decodedPeak)||decodedPeak>.65||seconds>.31||seconds<.09)throw new Error(`${name}: unsafe asset (${decodedPeak}, ${seconds}s)`);
  const entry={ name,source:`marbleworks-source/${sourceName}.ogg`,sourceSha256:sourceHash,
    kenneyCoefficient:spec.kenney,synthCoefficient:Number((1-spec.kenney).toFixed(2)),
    preEncodePcmSha256:pcmHash,oggSha256:digest(readFileSync(output)),
    decodedPcmSha256:digest(pcm(decoded)),seconds,decodedPeak:Number(decodedPeak.toFixed(6)),
    decodedRms:Number(rms(decoded).toFixed(6)),lowpassHz:spec.lowpass };
  if(check){
    const known=prior.samples.find(e=>e.name===name);
    for(const field of ['sourceSha256','preEncodePcmSha256','oggSha256','decodedPcmSha256']){
      if(known?.[field]!==entry[field])throw new Error(`${name}: ${field} differs; rebuild and review provenance`);
    }
  }
  manifest.samples.push(entry);index++;
  console.log(`${name}: ${seconds.toFixed(3)}s, peak ${(20*Math.log10(decodedPeak)).toFixed(2)}dBFS`);
}
if(!check)writeFileSync(new URL('MARBLEWORKS_AUDIO.json',DIR),JSON.stringify(manifest,null,2)+'\n');
console.log(`${check?'Verified':'Built'} ${index} isolated Marble Works assets.`);
