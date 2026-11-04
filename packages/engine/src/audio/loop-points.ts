import { notImplemented } from '../util/assert.ts';
import type { MusicMetadata } from './audio-types.ts';

/** What the mixer knows about a decoded music track. */
export interface DecodedTrackInfo {
  readonly durationSeconds: number;
  readonly sampleRate: number;
  readonly channel0: Float32Array;
}

/** Playback offset and loop points of a decoded track, in seconds. */
export interface LoopPoints {
  readonly offsetSeconds: number;
  readonly loopStartSeconds: number;
  readonly loopEndSeconds: number;
}

/** Loop points that account for the decoder's encoder-delay handling. */
export function resolveLoopPoints(
  _decoded: DecodedTrackInfo,
  _metadata: MusicMetadata,
): LoopPoints {
  return notImplemented('engine.resolveLoopPoints');
}
