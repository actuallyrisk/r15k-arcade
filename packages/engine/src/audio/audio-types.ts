import { notImplemented } from '../util/assert.ts';
import type { Result } from '../util/result.ts';

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

/** Validates a parsed audio manifest; the error lists every problem. */
export function parseAudioManifest(_value: unknown): Result<AudioManifest, readonly string[]> {
  return notImplemented('engine.parseAudioManifest');
}

/** Validates parsed music metadata; the error lists every problem. */
export function parseMusicMetadata(_value: unknown): Result<MusicMetadata, readonly string[]> {
  return notImplemented('engine.parseMusicMetadata');
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
