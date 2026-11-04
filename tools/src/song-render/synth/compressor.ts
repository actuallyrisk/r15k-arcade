// R15K Arcade tools – the master compressor of the music: a feed-forward peak detector (separate attack
// and release smoothing of |x|, no look-ahead) drives a soft-knee gain curve. The settings are those of
// the original player's DynamicsCompressorNode (threshold −16 dB, knee 10 dB, ratio 4 and the Web Audio
// default attack and release); no make-up gain is applied.

/** Settings of a compressor. */
export interface CompressorSettings {
  readonly thresholdDb: number;
  readonly kneeDb: number;
  readonly ratio: number;
  readonly attackSeconds: number;
  readonly releaseSeconds: number;
}

/** The music master compressor. */
export const MASTER_COMPRESSOR: CompressorSettings = {
  thresholdDb: -16,
  kneeDb: 10,
  ratio: 4,
  attackSeconds: 0.003,
  releaseSeconds: 0.25,
};

/** Detector level treated as silence (dB); below the threshold, so silence is never compressed. */
const SILENCE_DB = -200;

/** Output level (dB) of the static soft-knee curve for an input level (dB). */
export function compressorCurveDb(inputDb: number, settings: CompressorSettings): number {
  const { thresholdDb, kneeDb, ratio } = settings;
  const over = inputDb - thresholdDb;
  if (2 * over < -kneeDb) {
    return inputDb;
  }
  if (2 * over > kneeDb) {
    return thresholdDb + over / ratio;
  }
  const kneeOver = over + kneeDb / 2;
  return inputDb + ((1 / ratio - 1) * kneeOver * kneeOver) / (2 * kneeDb);
}

/** Gain factor the curve applies at a detector level (linear amplitude). */
function curveGain(level: number, settings: CompressorSettings): number {
  const levelDb = level > 0 ? 20 * Math.log10(level) : SILENCE_DB;
  return 10 ** ((compressorCurveDb(levelDb, settings) - levelDb) / 20);
}

/** Compresses `input`. */
export function applyCompressor(
  input: Float64Array,
  settings: CompressorSettings,
  sampleRate: number,
): Float64Array {
  const attack = Math.exp(-1 / (settings.attackSeconds * sampleRate));
  const release = Math.exp(-1 / (settings.releaseSeconds * sampleRate));
  const output = new Float64Array(input.length);
  let level = 0;
  for (let sample = 0; sample < input.length; sample += 1) {
    const value = input[sample] ?? 0;
    const magnitude = Math.abs(value);
    const coefficient = magnitude > level ? attack : release;
    level = coefficient * level + (1 - coefficient) * magnitude;
    output[sample] = value * curveGain(level, settings);
  }
  return output;
}
