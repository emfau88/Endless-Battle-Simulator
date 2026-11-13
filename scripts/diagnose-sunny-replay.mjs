// Temporary, post-export analysis. Never changes the tested export pipeline.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { ffmpegBin, ffprobeBin, run } from '../lib/exporter.mjs';

const root = join('output', 'sunny-replay');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
async function command(bin, args) {
  const r = await run(bin, args, { encoding: null });
  if (r.code !== 0) throw new Error(`${bin}: ${r.stderr}`);
  return r.stdout;
}
const summary = [];
for (const aspect of ['16x9', '9x16']) {
  const pair = [];
  for (const prefix of ['sunny-', 'sunny-replay-']) {
    const name = prefix + aspect, file = join(root, 'exports', name + '.mp4');
    if (!existsSync(file)) continue;
    const sidecar = JSON.parse(readFileSync(file.replace(/\.mp4$/, '.json')));
    const video = await command(ffmpegBin(), ['-v', 'error', '-i', file, '-map', '0:v:0', '-f', 'framemd5', '-']);
    const audio = await command(ffmpegBin(), ['-v', 'error', '-i', file, '-map', '0:a:0', '-f', 'f32le', '-']);
    const probe = JSON.parse(await command(ffprobeBin(), ['-v', 'error', '-show_packets', '-show_streams', '-show_format', '-show_data_hash', 'sha256', '-of', 'json', file]));
    writeFileSync(join(root, name + '-frames.txt'), video);
    writeFileSync(join(root, name + '-audio.f32le'), audio);
    writeFileSync(join(root, name + '-probe.json'), JSON.stringify(probe, null, 2));
    const input = existsSync(file + '.input.json') ? JSON.parse(readFileSync(file + '.input.json')) : null;
    pair.push({ name, mp4: digest(readFileSync(file)), decodedVideo: digest(video), decodedAudio: digest(audio), sidecar, probe, input });
  }
  if (pair.length !== 2) { summary.push({ aspect, complete: false }); continue; }
  const [a, b] = pair;
  const packets = (p, type) => {
    const index = p.probe.streams.find(s => s.codec_type === type).index;
    return p.probe.packets.filter(s => s.stream_index === index).map(({ pos, ...packet }) => packet);
  };
  const container = p => { const { filename, size, bit_rate, ...format } = p.probe.format; return format; };
  const same = {
    config: isDeepStrictEqual(a.sidecar.config, b.sidecar.config),
    exportOptions: isDeepStrictEqual(a.sidecar.exportOptions, b.sidecar.exportOptions),
    stateHash: a.sidecar.stateHash === b.sidecar.stateHash,
    eventHash: a.sidecar.audio.eventHash === b.sidecar.audio.eventHash,
    mp4: a.mp4 === b.mp4,
    decodedVideo: a.decodedVideo === b.decodedVideo,
    decodedAudio: a.decodedAudio === b.decodedAudio,
    videoPackets: isDeepStrictEqual(packets(a, 'video'), packets(b, 'video')),
    audioPackets: isDeepStrictEqual(packets(a, 'audio'), packets(b, 'audio')),
    streamMetadata: isDeepStrictEqual(a.probe.streams, b.probe.streams),
    containerMetadata: isDeepStrictEqual(container(a), container(b)),
  };
  if (a.input && b.input) {
    same.inputJpegFrames = isDeepStrictEqual(a.input.frames, b.input.frames);
    same.inputPcm = a.input.pcm === b.input.pcm;
    const args = input => JSON.stringify([input.videoArgs, input.muxArgs]).replace(/\.ebs-export-[^/]+/g, '.ebs-export-DIR');
    same.ffmpegArgs = args(a.input) === args(b.input);
    same.inputFrameDifferences = a.input.frames.flatMap((frame, i) => isDeepStrictEqual(frame, b.input.frames[i]) ? [] : [i]);
  }
  summary.push({ aspect, complete: true, same, hashes: pair.map(({ name, mp4, decodedVideo, decodedAudio }) => ({ name, mp4, decodedVideo, decodedAudio })) });
}
writeFileSync(join(root, 'comparison.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
