import { err, ok } from '../util/result.ts';
import type { Result } from '../util/result.ts';
import { fieldReader } from './json-fields.ts';

/** Mixer buses. */
export type BusName = 'master' | 'music' | 'sfx';

/** State of the mixer as the app sees it. */
export type MixerState = 'unavailable' | 'locked' | 'running' | 'suspended';

/** Loop metadata of a rendered music file, written by the offline renderer and read by the mixer. */
export interface MusicMetadata {
  readonly format: 'r15k-music';
  readonly version: 1;
  readonly id: string;
  /** 'meow-house.mp3'. */
  readonly file: string;
  /** 48000. */
  readonly sampleRate: number;
  readonly channels: 1;
  /** 96. */
  readonly bitrateKbps: number;
  /** Samples in the PCM that was encoded. */
  readonly pcmLength: number;
  /** In the PCM. */
  readonly loopStartSample: number;
  /** Exclusive. */
  readonly loopEndSample: number;
  /** First sample with |x| ≥ 0.05. */
  readonly onsetSample: number;
  readonly encoder: {
    readonly name: string;
    readonly delaySamples: number;
    readonly paddingSamples: number;
    readonly frames: number;
  };
  readonly inputHash: string;
}

/** Oscillator shape of a synthesised tone. */
export type ToneWave = 'square' | 'pulse25' | 'pulse12' | 'triangle' | 'noise';

/** One tone of a sound effect. */
export interface ToneSpec {
  readonly wave: ToneWave;
  readonly startSeconds: number;
  readonly durationSeconds: number;
  readonly frequencyHz: number;
  /** Exponential sweep to this frequency over the duration. */
  readonly endFrequencyHz?: number;
  /** Peak gain before the SFX render gain. */
  readonly volume: number;
  /** Default 0.01 (exponential). */
  readonly attackSeconds?: number;
}

/** A sound effect as a list of tones (rendered offline to WAV). */
export interface SfxDefinition {
  readonly id: string;
  readonly tones: readonly ToneSpec[];
}

/** A music entry of the audio manifest; paths are relative to audio/. */
export interface AudioManifestMusic {
  readonly id: string;
  readonly file: string;
  readonly metadata: string;
}

/** A sound effect entry of the audio manifest; the path is relative to audio/. */
export interface AudioManifestSfx {
  readonly id: string;
  readonly file: string;
}

/** The manifest of every rendered audio file (audio/manifest.json). */
export interface AudioManifest {
  readonly format: 'r15k-audio-manifest';
  readonly version: 1;
  readonly inputHash: string;
  readonly music: readonly AudioManifestMusic[];
  readonly sfx: readonly AudioManifestSfx[];
}

/** Records a problem for every id that occurs more than once in one list (empty ids are reported already). */
function checkUniqueIds(
  entries: readonly { readonly id: string }[],
  list: string,
  errors: string[],
): void {
  const seen = new Set<string>();
  for (const { id } of entries) {
    if (id !== '' && seen.has(id)) {
      errors.push(`${list}: duplicate id '${id}'`);
    }
    seen.add(id);
  }
}

/**
 * Validates a parsed audio manifest: format and version, a hash, and music and SFX entries with
 * non-empty ids (unique per list) and relative asset paths. The result is a fresh object holding only
 * the known fields; the error lists every problem.
 */
export function parseAudioManifest(value: unknown): Result<AudioManifest, readonly string[]> {
  const errors: string[] = [];
  const read = fieldReader(value, '', errors);
  const manifest: AudioManifest = {
    format: read.literal('format', 'r15k-audio-manifest'),
    version: read.literal('version', 1),
    inputHash: read.string('inputHash'),
    music: read.array('music').map((item, index) => {
      const entry = fieldReader(item, `music[${index}]`, errors);
      return {
        id: entry.string('id'),
        file: entry.assetPath('file'),
        metadata: entry.assetPath('metadata'),
      };
    }),
    sfx: read.array('sfx').map((item, index) => {
      const entry = fieldReader(item, `sfx[${index}]`, errors);
      return { id: entry.string('id'), file: entry.assetPath('file') };
    }),
  };
  checkUniqueIds(manifest.music, 'music', errors);
  checkUniqueIds(manifest.sfx, 'sfx', errors);
  return errors.length === 0 ? ok(manifest) : err(errors);
}

/** Records the problems between fields: the loop lies inside the PCM and the onset too. */
function checkSampleRanges(metadata: MusicMetadata, errors: string[]): void {
  if (metadata.loopEndSample <= metadata.loopStartSample) {
    errors.push('loopEndSample: expected more than loopStartSample');
  }
  if (metadata.loopEndSample > metadata.pcmLength) {
    errors.push('loopEndSample: expected at most pcmLength');
  }
  if (metadata.onsetSample >= metadata.pcmLength) {
    errors.push('onsetSample: expected less than pcmLength');
  }
}

/**
 * Validates parsed music metadata: format and version, mono, positive rates and lengths, a loop
 * inside the PCM and a complete encoder record (padding may be any integer: the mixer never uses
 * it). The result is a fresh object holding only the known fields; the error lists every problem.
 */
export function parseMusicMetadata(value: unknown): Result<MusicMetadata, readonly string[]> {
  const errors: string[] = [];
  const read = fieldReader(value, '', errors);
  const encoder = read.object('encoder');
  const metadata: MusicMetadata = {
    format: read.literal('format', 'r15k-music'),
    version: read.literal('version', 1),
    id: read.string('id'),
    file: read.assetPath('file'),
    sampleRate: read.integer('sampleRate', 1),
    channels: read.literal('channels', 1),
    bitrateKbps: read.integer('bitrateKbps', 1),
    pcmLength: read.integer('pcmLength', 1),
    loopStartSample: read.integer('loopStartSample', 0),
    loopEndSample: read.integer('loopEndSample', 1),
    onsetSample: read.integer('onsetSample', 0),
    encoder: {
      name: encoder.string('name'),
      delaySamples: encoder.integer('delaySamples', 0),
      paddingSamples: encoder.integer('paddingSamples', Number.NEGATIVE_INFINITY),
      frames: encoder.integer('frames', 1),
    },
    inputHash: read.string('inputHash'),
  };
  if (errors.length === 0) {
    checkSampleRanges(metadata, errors);
  }
  return errors.length === 0 ? ok(metadata) : err(errors);
}

/** Options of playMusic; fade-in default 0.6 s. */
export interface PlayMusicOptions {
  readonly fadeInSeconds?: number;
}

/** Options of stopMusic; fade-out default 0.4 s. */
export interface StopMusicOptions {
  readonly fadeOutSeconds?: number;
}

/** What scenes and games see of the mixer. */
export interface AudioPort {
  playSfx(id: string): void;
  /** No-op while `id` is already playing (not fading out). */
  playMusic(id: string, options?: PlayMusicOptions): void;
  stopMusic(options?: StopMusicOptions): void;
}
