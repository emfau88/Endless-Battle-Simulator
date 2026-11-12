import { parentPort, workerData } from 'node:worker_threads';
import { renderTrack } from './audio.mjs';

let last = 0;
const { events, audio, samples, options } = workerData;
const value = renderTrack(events, audio, samples, { ...options, onProgress: (progress) => {
  const now = Date.now();
  if (now - last >= 100 || progress === 1) {
    last = now; parentPort.postMessage({ type: 'progress', value: progress });
  }
} });
parentPort.postMessage({ type: 'result', value });
