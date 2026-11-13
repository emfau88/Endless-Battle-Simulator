// Each test file belongs to exactly one CI job. New general tests default to core.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root=fileURLToPath(new URL('..',import.meta.url));
const suites={core:[],audio:[],production:[],scrap:[]};
for(const file of readdirSync(join(root,'test')).filter(f=>f.endsWith('.test.mjs')).sort()) {
  const suite=file.startsWith('scrap')?'scrap':file.startsWith('audio')?'audio'
    :['export.test.mjs','live.test.mjs','production.test.mjs'].includes(file)?'production':'core';
  suites[suite].push(join('test',file));
}
const suite=process.argv[2];
if(suite==='--list')console.log(JSON.stringify(suites,null,2));
else {
  if(!Object.hasOwn(suites,suite))throw new Error('CI suite must be core, audio, production or scrap');
  const result=spawnSync(process.execPath,['--test','--test-concurrency=1','--test-timeout=600000',
    '--test-reporter=tap',...suites[suite]],{cwd:root,stdio:'inherit'});
  if(result.error)throw result.error;
  process.exitCode=result.status??1;
}
