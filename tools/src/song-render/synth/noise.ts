// R15K Arcade tools – reproducible white noise: every noise burst draws from its own xoshiro128** stream,
// seeded with the FNV-1a hash of a key that names the burst (song, step and token), so a drum hit sounds
// the same in every pass and every render.
import { fnv1a32, nextFloat, openRng, seedRng } from '@r15k/engine';

/** `length` samples of uniform white noise in [−1, 1) for `key`. */
export function noiseSamples(key: string, length: number): Float64Array {
  const cursor = openRng(seedRng(fnv1a32(key)));
  const samples = new Float64Array(length);
  for (let sample = 0; sample < length; sample += 1) {
    samples[sample] = nextFloat(cursor) * 2 - 1;
  }
  return samples;
}
