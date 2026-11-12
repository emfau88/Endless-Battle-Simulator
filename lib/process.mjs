// Wartet auch beim Abbruch auf das Prozessende: erst danach dürfen Ausgabedateien entfernt werden.
import { spawn } from 'node:child_process';

export const abortError = () => Object.assign(new Error('Export abgebrochen.'), { name: 'AbortError' });
export function throwIfAborted(signal) { if (signal?.aborted) throw abortError(); }

export function run(cmd, args, { signal, cwd, encoding = 'utf8' } = {}) {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const stdout = [], stderr = [];
    let child, failure;
    try { child = spawn(cmd, args, { cwd, windowsHide: true }); }
    catch (e) { resolve({ code: -1, stdout: encoding === null ? Buffer.alloc(0) : '', stderr: String(e) }); return; }
    const abort = () => child.kill('SIGKILL');
    signal?.addEventListener('abort', abort, { once: true });
    child.stdout.on('data', (b) => stdout.push(b));
    child.stderr.on('data', (b) => stderr.push(b));
    child.on('error', (e) => { failure = e; });
    child.on('close', (code) => {
      signal?.removeEventListener('abort', abort);
      if (signal?.aborted) { reject(abortError()); return; }
      const buffer = Buffer.concat(stdout);
      resolve({ code: failure ? -1 : code, stdout: encoding === null ? buffer : buffer.toString(encoding),
        stderr: failure ? String(failure) : Buffer.concat(stderr).toString('utf8') });
    });
    if (signal?.aborted) abort();
  });
}
