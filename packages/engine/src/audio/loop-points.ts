import { clamp } from '../math/scalar.ts';
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

/** A decoded duration this close to the encoded PCM length means the decoder trimmed delay/padding. */
const TRIMMED_TOLERANCE_SECONDS = 0.002;

/** The onset is the first sample at least this loud (the renderer uses the same threshold). */
const ONSET_THRESHOLD = 0.05;

/** Largest decoder offset that is believed; anything beyond is a misdetection. */
const MAX_OFFSET_SECONDS = 0.1;

/** Index of the first sample with |x| ≥ the onset threshold, or undefined in silence. */
function firstOnset(samples: Float32Array): number | undefined {
  const index = samples.findIndex((sample) => Math.abs(sample) >= ONSET_THRESHOLD);
  return index < 0 ? undefined : index;
}

/**
 * Loop points that account for the decoder's encoder-delay handling. When the decoded duration equals
 * the encoded PCM length (within 2 ms) the decoder honoured the LAME tag and the offset is 0. Otherwise
 * the offset is where the decoded onset lies relative to the onset in the PCM, clamped to 0…0.1 s (0
 * when the decoded track has no onset). Works for any decoded sample rate, because it compares seconds.
 */
export function resolveLoopPoints(decoded: DecodedTrackInfo, metadata: MusicMetadata): LoopPoints {
  const expectedSeconds = metadata.pcmLength / metadata.sampleRate;
  const isTrimmed =
    Math.abs(decoded.durationSeconds - expectedSeconds) <= TRIMMED_TOLERANCE_SECONDS;
  const onsetDecoded = isTrimmed ? undefined : firstOnset(decoded.channel0);
  const offsetSeconds =
    onsetDecoded === undefined
      ? 0
      : clamp(
          onsetDecoded / decoded.sampleRate - metadata.onsetSample / metadata.sampleRate,
          0,
          MAX_OFFSET_SECONDS,
        );
  return {
    offsetSeconds,
    loopStartSeconds: offsetSeconds + metadata.loopStartSample / metadata.sampleRate,
    loopEndSeconds: offsetSeconds + metadata.loopEndSample / metadata.sampleRate,
  };
}
