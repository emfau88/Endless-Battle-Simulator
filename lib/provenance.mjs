import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { ROOT } from './browser.mjs';
import { run, throwIfAborted } from './process.mjs';

const require = createRequire(import.meta.url);
export const playwrightVersion = require('playwright/package.json').version;

export async function sourceProvenance({ cwd = ROOT, scripts = [], signal } = {}) {
  const commit = await run('git', ['rev-parse', 'HEAD'], { cwd, signal });
  let git = { status: 'unavailable', commit: null, branch: null, changes: [] };
  if (commit.code === 0) {
    const status = await run('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], { cwd, signal });
    const branch = await run('git', ['branch', '--show-current'], { cwd, signal });
    git = { commit: commit.stdout.trim(), branch: branch.code === 0 ? branch.stdout.trim() || null : null,
      status: status.code === 0 ? (status.stdout ? 'dirty' : 'clean') : 'unavailable',
      changes: status.code === 0 ? status.stdout.split('\0').filter(Boolean) : [] };
  }
  const sources = [];
  for (const file of scripts) {
    throwIfAborted(signal);
    const path = resolve(file), contents = await readFile(path);
    sources.push({ path, sha256: createHash('sha256').update(contents).digest('hex') });
  }
  throwIfAborted(signal);
  return { capturedAt: new Date().toISOString(), git, scripts: sources };
}

// Nur deklarative Exportwerte übernehmen. Eine fremde JSON-Datei darf weder Skripte ausführen
// noch Ausgabepfade festlegen. Zusatzskripte bleiben explizite --script-Argumente.
export function exportRecipe(input) {
  const sidecar = input?.config && typeof input.config === 'object';
  const saved = sidecar ? input.exportOptions : null, options = {};
  if (saved && typeof saved.gpu === 'boolean') options.gpu = saved.gpu;
  if (Number.isFinite(saved?.jpegQuality)) options.jpegQuality = saved.jpegQuality;
  return { config: sidecar ? input.config : input, options };
}
