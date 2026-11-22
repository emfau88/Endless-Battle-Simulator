// Each test file belongs to exactly one CI job. New general tests default to core.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root=fileURLToPath(new URL('..',import.meta.url));
const suites={core:[],audio:[],production:[],marbleworks:[],scrap:[],'scrap-browser':[],mycelium:[],pyramid:[],territory:[],waterpark:[],cloudwars:[],foerderduell:[], 'export-marbleworks-audio':[],
  ...Object.fromEntries(['naval','marble','scrap','mycelium','pyramid','territory','marbleworks','cloudwars','foerderduell'].map(id=>['export-'+id,[]]))};
for(const file of readdirSync(join(root,'test')).filter(f=>f.endsWith('.test.mjs')).sort()) {
  const exportScenario=/^presets-export-(naval|marble|scrap|mycelium|pyramid|territory|marbleworks|cloudwars|foerderduell)\.test\.mjs$/.exec(file)?.[1];
  // Keep the active-factory replay export out of the already long production job.
  // The Scrap browser/export file gets its own job: with the detailed Scrap art it exceeds the
  // shared 600 s file limit on software rendering.
  const suite=file==='marbleworks-export.test.mjs'?'export-marbleworks-audio':exportScenario?'export-'+exportScenario:file==='scrap-browser.test.mjs'?'scrap-browser':file.startsWith('scrap')?'scrap':file.startsWith('audio')?'audio'
    :file.startsWith('mycelium')?'mycelium':file.startsWith('pyramid')?'pyramid':file.startsWith('territory')?'territory':file.startsWith('waterpark')?'waterpark':file.startsWith('cloudwars')?'cloudwars':file.startsWith('foerderduell')?'foerderduell'
    :['export.test.mjs','live.test.mjs','production.test.mjs'].includes(file)?'production'
    :/^(marble-production-|marbleworks-|production-marble-)/.test(file)?'marbleworks':'core';
  suites[suite].push(join('test',file));
}
const suite=process.argv[2];
if(suite==='--list')console.log(JSON.stringify(suites,null,2));
else {
  if(!Object.hasOwn(suites,suite))throw new Error('CI suite must be one of: '+Object.keys(suites).join(', '));
  const timeout=['production','marbleworks','scrap-browser','export-marbleworks','export-marbleworks-audio'].includes(suite)?1200000:600000;
  const result=spawnSync(process.execPath,['--test','--test-concurrency=1','--test-timeout='+timeout,
    '--test-reporter=tap',...suites[suite]],{cwd:root,stdio:'inherit'});
  if(result.error)throw result.error;
  process.exitCode=result.status??1;
}
