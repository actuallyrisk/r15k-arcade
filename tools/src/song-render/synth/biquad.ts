// R15K Arcade tools – biquad filters with the coefficients of the Web Audio BiquadFilterNode (RBJ audio
// EQ cookbook): lowpass and highpass take Q in dB, bandpass takes a linear Q. The cutoff may change per
// sample (automated filters recompute their coefficients every sample).

/** Filter types the renderer uses. */
export type BiquadType = 'lowpass' | 'highpass' | 'bandpass';

/** Coefficients normalised by a0. */
export interface BiquadCoefficients {
  readonly b0: number;
  readonly b1: number;
  readonly b2: number;
  readonly a1: number;
  readonly a2: number;
}

/** Type, cutoff and Q of a filter. */
export interface BiquadSettings {
  readonly type: BiquadType;
  readonly q: number;
  readonly sampleRate: number;
}

/** Coefficients for `frequencyHz` (clamped to 0 … Nyquist) with the type and Q of `settings`. */
export function biquadCoefficients(
  settings: BiquadSettings,
  frequencyHz: number,
): BiquadCoefficients {
  const nyquist = settings.sampleRate / 2;
  const omega = (2 * Math.PI * Math.min(Math.max(frequencyHz, 0), nyquist)) / settings.sampleRate;
  const cos = Math.cos(omega);
  const sin = Math.sin(omega);
  const alpha =
    settings.type === 'bandpass' ? sin / (2 * settings.q) : sin / (2 * 10 ** (settings.q / 20));
  const a0 = 1 + alpha;
  const a = { a1: (-2 * cos) / a0, a2: (1 - alpha) / a0 };
  switch (settings.type) {
    case 'lowpass':
      return { b0: (1 - cos) / 2 / a0, b1: (1 - cos) / a0, b2: (1 - cos) / 2 / a0, ...a };
    case 'highpass':
      return { b0: (1 + cos) / 2 / a0, b1: -(1 + cos) / a0, b2: (1 + cos) / 2 / a0, ...a };
    case 'bandpass':
      return { b0: alpha / a0, b1: 0, b2: -alpha / a0, ...a };
  }
}

/** Filters `input` (direct form I); `frequencies` is one cutoff for all samples or one per sample. */
export function applyBiquad(
  input: Float64Array,
  settings: BiquadSettings,
  frequencies: number | Float64Array,
): Float64Array {
  const output = new Float64Array(input.length);
  const fixed =
    typeof frequencies === 'number' ? biquadCoefficients(settings, frequencies) : undefined;
  const coefficientsAt = (sample: number): BiquadCoefficients =>
    fixed ??
    biquadCoefficients(settings, typeof frequencies === 'number' ? 0 : (frequencies[sample] ?? 0));
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let sample = 0; sample < input.length; sample += 1) {
    const { b0, b1, b2, a1, a2 } = coefficientsAt(sample);
    const x0 = input[sample] ?? 0;
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    output[sample] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }
  return output;
}
