// R15K Arcade tools – single-period wavetables built from Fourier coefficients like a Web Audio
// PeriodicWave (cosine terms `real`, sine terms `imag`, normalised to a peak of 1) and read with linear
// interpolation. Pulse waves use the original player's coefficients; the square wave is band-limited per
// note so that no harmonic lies above 20 kHz. Tables are built once per shape and cached.

/** Samples per period. */
export const WAVETABLE_SIZE = 4096;

/** Harmonics of the pulse waves (k = 1 … 31, as the original player's periodic waves). */
const PULSE_HARMONICS = 31;
/** Harmonics of the triangle wave. */
const TRIANGLE_HARMONICS = 31;
/** Harmonics of the sawtooth wave. */
const SAWTOOTH_HARMONICS = 63;
/** Highest frequency a square harmonic may reach (Hz). */
const SQUARE_HARMONIC_LIMIT_HZ = 20_000;

/** Coefficient of harmonic k (1-based): its cosine and sine amplitude. */
type Harmonic = (k: number) => readonly [real: number, imag: number];

const cache = new Map<string, Float64Array>();

/** One period summed from `count` harmonics and normalised to a peak of 1. */
function buildTable(count: number, harmonic: Harmonic): Float64Array {
  const table = new Float64Array(WAVETABLE_SIZE);
  for (let k = 1; k <= count; k += 1) {
    const [real, imag] = harmonic(k);
    for (let index = 0; index < WAVETABLE_SIZE; index += 1) {
      const angle = (2 * Math.PI * k * index) / WAVETABLE_SIZE;
      table[index] = (table[index] ?? 0) + real * Math.cos(angle) + imag * Math.sin(angle);
    }
  }
  const peak = table.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
  return peak === 0 ? table : table.map((value) => value / peak);
}

/** The cached table for `key`, built on first use. */
function cached(key: string, build: () => Float64Array): Float64Array {
  const existing = cache.get(key);
  if (existing !== undefined) {
    return existing;
  }
  const table = build();
  cache.set(key, table);
  return table;
}

/** Pulse wave with the given duty cycle (0.25 lead, 0.125 harmony). */
export function pulseTable(duty: number): Float64Array {
  return cached(`pulse:${duty}`, () =>
    buildTable(PULSE_HARMONICS, (k) => [
      Math.sin(2 * Math.PI * k * duty) / (Math.PI * k),
      (1 - Math.cos(2 * Math.PI * k * duty)) / (Math.PI * k),
    ]),
  );
}

/** Triangle wave: odd harmonics with alternating sign and amplitude 1/k². */
export function triangleTable(): Float64Array {
  return cached('triangle', () =>
    buildTable(TRIANGLE_HARMONICS, (k) => {
      const sign = (k - 1) % 4 === 0 ? 1 : -1;
      return [0, k % 2 === 1 ? sign / (k * k) : 0];
    }),
  );
}

/** Sawtooth wave: every harmonic with amplitude 1/k. */
export function sawtoothTable(): Float64Array {
  return cached('sawtooth', () =>
    buildTable(SAWTOOTH_HARMONICS, (k) => [0, (k % 2 === 1 ? 1 : -1) / k]),
  );
}

/** Square wave for notes up to `maxFrequencyHz`: odd harmonics 1/k with k ≤ 20 kHz / frequency. */
export function squareTable(maxFrequencyHz: number): Float64Array {
  const count = Math.max(1, Math.floor(SQUARE_HARMONIC_LIMIT_HZ / maxFrequencyHz));
  return cached(`square:${count}`, () => buildTable(count, (k) => [0, k % 2 === 1 ? 1 / k : 0]));
}

/** Table value at `phase` (0 ≤ phase < 1), linearly interpolated between neighbouring samples. */
export function readTable(table: Float64Array, phase: number): number {
  const position = phase * WAVETABLE_SIZE;
  const index = Math.floor(position);
  const fraction = position - index;
  const current = table[index % WAVETABLE_SIZE] ?? 0;
  const following = table[(index + 1) % WAVETABLE_SIZE] ?? 0;
  return current + (following - current) * fraction;
}
