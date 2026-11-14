// R15K Arcade tools – writes the rendered audio folder: sfx/<id>.wav, music/<id>.mp3 with its loop
// metadata music/<id>.json, and manifest.json last, so an interrupted render never leaves a manifest
// that claims a complete folder. The folder is generated output and is replaced as a whole.
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AudioManifest, AudioManifestMusic, SfxDefinition } from '@r15k/engine';
import type { CliOutput } from '../shared/cli-output.ts';
import { writeJson } from '../shared/fs-json.ts';
import { SAMPLE_RATE } from './levels.ts';
import { buildMusicMetadata, MUSIC_BITRATE_KBPS } from './metadata.ts';
import { encodeMp3 } from './mp3.ts';
import { scanMp3Frames } from './mp3-frames.ts';
import { renderSfx } from './render-sfx.ts';
import { renderSong } from './render-song.ts';
import type { SongFile } from './song-format.ts';
import { peakOf } from './synth/mix-buffer.ts';
import { encodeWav } from './wav.ts';

/** File name of the manifest inside the audio folder. */
export const MANIFEST_FILE = 'manifest.json';

/** What to render and where. */
export interface AudioJob {
  readonly outputDir: string;
  readonly songs: readonly { readonly id: string; readonly song: SongFile }[];
  readonly sfx: readonly SfxDefinition[];
  readonly inputHash: string;
  readonly out: CliOutput;
}

/** Kilobytes with one decimal. */
function kilobytes(bytes: number): string {
  return (bytes / 1024).toFixed(1);
}

/** Writes a binary file below the output folder and returns its size. */
function writeBinary(job: AudioJob, file: string, bytes: Uint8Array): number {
  writeFileSync(join(job.outputDir, file), bytes);
  return bytes.length;
}

/** Renders every SFX to a WAV file. */
function writeSfx(job: AudioJob): void {
  const bytes = job.sfx.reduce(
    (total, definition) =>
      total +
      writeBinary(job, `sfx/${definition.id}.wav`, encodeWav(renderSfx(definition), SAMPLE_RATE)),
    0,
  );
  job.out.info(`sfx: ${job.sfx.length} WAV files, ${kilobytes(bytes)} KB`);
}

/** Renders one song to MP3 with its metadata; returns its manifest entry. */
async function writeSong(
  job: AudioJob,
  entry: { readonly id: string; readonly song: SongFile },
): Promise<AudioManifestMusic> {
  const { id, song } = entry;
  const render = renderSong(song, id);
  const mp3 = await encodeMp3(render.pcm, {
    sampleRate: SAMPLE_RATE,
    bitrateKbps: MUSIC_BITRATE_KBPS,
  });
  const frames = scanMp3Frames(mp3);
  const metadata = buildMusicMetadata({
    id,
    pcm: render.pcm,
    loopSamples: render.loopSamples,
    frames,
    inputHash: job.inputHash,
  });
  writeBinary(job, `music/${id}.mp3`, mp3);
  writeJson(join(job.outputDir, `music/${id}.json`), metadata);
  job.out.info(
    `music: ${id}.mp3, loop ${(render.loopSamples / SAMPLE_RATE).toFixed(3)} s, ` +
      `${frames.audioFrames} frames, ${kilobytes(mp3.length)} KB, peak ${peakOf(render.pcm).toFixed(3)}`,
  );
  return { id, file: `music/${id}.mp3`, metadata: `music/${id}.json` };
}

/** Replaces the audio folder with a fresh render of every song and SFX, manifest last. */
export async function writeAudio(job: AudioJob): Promise<void> {
  rmSync(job.outputDir, { recursive: true, force: true });
  mkdirSync(join(job.outputDir, 'sfx'), { recursive: true });
  mkdirSync(join(job.outputDir, 'music'), { recursive: true });
  writeSfx(job);
  const music: AudioManifestMusic[] = [];
  for (const entry of job.songs) {
    music.push(await writeSong(job, entry));
  }
  const manifest: AudioManifest = {
    format: 'r15k-audio-manifest',
    version: 1,
    inputHash: job.inputHash,
    music,
    sfx: job.sfx.map(({ id }) => ({ id, file: `sfx/${id}.wav` })),
  };
  writeJson(join(job.outputDir, MANIFEST_FILE), manifest);
  const files = readdirSync(job.outputDir, { recursive: true, encoding: 'utf8' }).filter((file) =>
    statSync(join(job.outputDir, file)).isFile(),
  );
  const total = files.reduce((sum, file) => sum + statSync(join(job.outputDir, file)).size, 0);
  job.out.info(`audio: ${files.length} files, ${kilobytes(total)} KB in total`);
}
