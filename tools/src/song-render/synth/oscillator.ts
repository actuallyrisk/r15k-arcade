// R15K Arcade tools – phase-accumulating oscillators: a wavetable or a sine, driven by a per-sample
// frequency (so automated and modulated frequencies work like a Web Audio OscillatorNode). The phase
// starts at 0 on the voice's first sample.
import { readTable } from './wavetable.ts';

/** What an oscillator plays: a wavetable or an exact sine. */
export type OscillatorShape = Float64Array | 'sine';

/** One sample of the shape at `phase` (0 ≤ phase < 1). */
function shapeValue(shape: OscillatorShape, phase: number): number {
  return shape === 'sine' ? Math.sin(2 * Math.PI * phase) : readTable(shape, phase);
}

/** The oscillator output for the given per-sample frequencies (Hz). */
export function renderOscillator(
  shape: OscillatorShape,
  frequencies: Float64Array,
  sampleRate: number,
): Float64Array {
  const output = new Float64Array(frequencies.length);
  let phase = 0;
  for (let sample = 0; sample < frequencies.length; sample += 1) {
    output[sample] = shapeValue(shape, phase);
    phase += (frequencies[sample] ?? 0) / sampleRate;
    phase -= Math.floor(phase);
  }
  return output;
}
