// R15K Arcade tools – sample buffers of the offline mix (float64 while mixing): summing voices at sample
// offsets, gains, and the clip guard that clamps the final float32 output and fails a render that clips
// more than a tiny share of its samples.
import { CLIP_LIMIT, MAX_CLIPPED_FRACTION } from '../levels.ts';

/** Adds `voice` into `target` from sample `offset` on; samples past the end of `target` are dropped. */
export function mixInto(target: Float64Array, voice: Float64Array, offset: number): void {
  const end = Math.min(voice.length, target.length - offset);
  for (let sample = 0; sample < end; sample += 1) {
    target[offset + sample] = (target[offset + sample] ?? 0) + (voice[sample] ?? 0);
  }
}

/** The product of a signal and a per-sample gain (the length of `signal`). */
export function applyGain(signal: Float64Array, gain: Float64Array): Float64Array {
  return signal.map((value, sample) => value * (gain[sample] ?? 0));
}

/** The signal scaled by a constant factor. */
export function scaleSignal(signal: Float64Array, factor: number): Float64Array {
  return signal.map((value) => value * factor);
}

/** Final samples and how many of them the clip guard clamped. */
export interface GuardedPcm {
  readonly pcm: Float32Array;
  readonly clippedSamples: number;
}

/**
 * Clamps the signal to ±CLIP_LIMIT and converts it to float32; throws when more than
 * MAX_CLIPPED_FRACTION of the samples had to be clamped (`label` names the render in the error).
 */
export function guardClipping(signal: Float64Array, label: string): GuardedPcm {
  const pcm = new Float32Array(signal.length);
  let clippedSamples = 0;
  signal.forEach((value, sample) => {
    const isClipped = Math.abs(value) > CLIP_LIMIT;
    clippedSamples += isClipped ? 1 : 0;
    pcm[sample] = isClipped ? Math.sign(value) * CLIP_LIMIT : value;
  });
  if (clippedSamples > signal.length * MAX_CLIPPED_FRACTION) {
    throw new Error(`${label}: ${clippedSamples} of ${signal.length} samples clip`);
  }
  return { pcm, clippedSamples };
}

/** Largest absolute sample value. */
export function peakOf(samples: Float32Array | Float64Array): number {
  let peak = 0;
  for (const value of samples) {
    peak = Math.max(peak, Math.abs(value));
  }
  return peak;
}
