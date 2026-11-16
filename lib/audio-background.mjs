// A prepared stereo ambience bed, mixed before trimming an episode to a clip.
// The intro is played once; the prepared period already contains its crossfade.
import { basename, join } from 'node:path';
import { AUDIO_DIR, SAMPLE_RATE, VOLUME_MAX } from './audio.mjs';
import { run } from './process.mjs';

export async function mixBackgroundTrack(audio, { input, output, totalSamples, volume = null, ffmpeg = 'ffmpeg', signal } = {}) {
  const bed = audio.background;
  if (!bed) throw new Error('Hintergrund-Klang fehlt.');
  if (typeof bed.file !== 'string' || basename(bed.file) !== bed.file || /[\\/]/.test(bed.file)) {
    throw new Error('Ungültige Hintergrund-Klangdatei.');
  }
  const intro = Math.round(bed.loopStartSec * SAMPLE_RATE), end = Math.round(bed.loopEndSec * SAMPLE_RATE);
  if (!Number.isSafeInteger(totalSamples) || totalSamples <= 0 || !Number.isSafeInteger(intro) || !Number.isSafeInteger(end)
      || intro <= 0 || end <= intro || !Number.isFinite(bed.gainDb)
      || !Number.isFinite(bed.referenceMaster) || bed.referenceMaster <= 0 || !Number.isFinite(bed.fadeSec) || bed.fadeSec < 0) {
    throw new Error('Ungültige Hintergrund-Schleifenparameter.');
  }
  const levels = { ...audio.defaultVolume, ...volume };
  const percent = key => Number.isFinite(levels[key]) ? Math.min(VOLUME_MAX, Math.max(0, levels[key])) : 100;
  const level = percent('master') / bed.referenceMaster * (bed.volumeKey ? percent(bed.volumeKey) / 100 : 1);
  const gainDb = level > 0 ? bed.gainDb + 20 * Math.log10(level) : null;
  const duration = totalSamples / SAMPLE_RATE, fade = Math.min(bed.fadeSec, duration / 2);
  const waterFilter = totalSamples <= intro
    ? `[1:a]atrim=end_sample=${totalSamples},asetpts=PTS-STARTPTS[loop];`
    : '[1:a]asplit=2[introSrc][periodSrc];' +
      `[introSrc]atrim=end_sample=${intro},asetpts=PTS-STARTPTS[intro];` +
      `[periodSrc]atrim=start_sample=${intro}:end_sample=${end},asetpts=PTS-STARTPTS,` +
      `aloop=loop=-1:size=${end - intro},atrim=end_sample=${totalSamples - intro},asetpts=PTS-STARTPTS[rest];` +
      '[intro][rest]concat=n=2:v=0:a=1[loop];';
  const filter = waterFilter + `[loop]volume=${gainDb === null ? '0' : gainDb + 'dB'}[water];` +
    '[water][0:a]amix=inputs=2:normalize=0:duration=shortest,' +
    `atrim=end_sample=${totalSamples}` +
    (fade ? `,afade=t=in:d=${fade},afade=t=out:st=${duration - fade}:d=${fade}` : '') +
    // Unity gain below the ceiling: the approved mix stays unchanged. Only raised sliders need protection.
    ',alimiter=limit=0.7079457843841379:attack=5:release=60:level=0:latency=1[mix]';
  const result = await run(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', input,
    '-i', join(AUDIO_DIR, bed.file), '-filter_complex', filter, '-map', '[mix]',
    '-c:a', 'pcm_f32le', '-ar', String(SAMPLE_RATE), '-ac', '2', '-rf64', 'auto', output], { signal });
  if (result.code !== 0) throw new Error('Wasser-Hintergrund konnte nicht gemischt werden: ' + result.stderr.trim());
  return { file: bed.file, volumeKey: bed.volumeKey, gainDb, introSeconds: bed.loopStartSec,
    periodSeconds: bed.loopEndSec - bed.loopStartSec, durationSeconds: duration, sampleRate: SAMPLE_RATE,
    channels: 2, normalization: 'none', peakCeilingDb: -3, actionMeasurementScope: 'actions-before-background' };
}
