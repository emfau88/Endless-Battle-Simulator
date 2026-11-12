import { Worker } from 'node:worker_threads';
import { abortError, throwIfAborted } from './process.mjs';

// Nur DSP im Worker. FFmpeg-Dekodierung bleibt separat abbrechbar; keine verwaisten Kindprozesse.
export function renderTrackAsync(events, audio, samples, { signal, onProgress = () => {}, ...options } = {}) {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./audio-worker.mjs', import.meta.url), {
      workerData: { events, audio, samples, options }, trackUnmanagedFds: true,
    });
    let result, failure;
    const abort = () => { worker.terminate().catch((e) => { failure = e; }); };
    signal?.addEventListener('abort', abort, { once: true });
    worker.on('message', (message) => {
      if (message.type === 'result') result = message.value;
      else if (!signal?.aborted) {
        try { onProgress(message.value); } catch (e) { failure = e; abort(); }
      }
    });
    worker.on('error', (e) => { failure = e; });
    worker.on('exit', (code) => {
      signal?.removeEventListener('abort', abort);
      if (signal?.aborted) reject(abortError());
      else if (failure) reject(failure);
      else if (code !== 0 || !result) reject(new Error(`Audio-Worker ohne Ergebnis beendet (${code}).`));
      else resolve(result);
    });
    if (signal?.aborted) abort();
  });
}
