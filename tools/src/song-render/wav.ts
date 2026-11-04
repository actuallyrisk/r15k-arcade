// R15K Arcade tools – 16-bit PCM WAV files (RIFF, `fmt ` and `data` chunks, little endian, mono) for the
// sound effects. Samples are clamped to [−1, 1] and scaled by 32767.

/** Bytes of the RIFF, `fmt ` and `data` headers. */
const HEADER_BYTES = 44;
/** Bytes per 16-bit sample. */
const BYTES_PER_SAMPLE = 2;
/** Largest 16-bit sample value. */
const FULL_SCALE = 32_767;

/** Writes a four-character chunk id. */
function writeTag(view: DataView, offset: number, tag: string): void {
  for (let index = 0; index < tag.length; index += 1) {
    view.setUint8(offset + index, tag.charCodeAt(index));
  }
}

/** Encodes mono float PCM as a 16-bit PCM WAV file. */
export function encodeWav(pcm: Float32Array, sampleRate: number): Uint8Array {
  const dataBytes = pcm.length * BYTES_PER_SAMPLE;
  const bytes = new Uint8Array(HEADER_BYTES + dataBytes);
  const view = new DataView(bytes.buffer);
  writeTag(view, 0, 'RIFF');
  view.setUint32(4, HEADER_BYTES - 8 + dataBytes, true);
  writeTag(view, 8, 'WAVE');
  writeTag(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * BYTES_PER_SAMPLE, true); // byte rate
  view.setUint16(32, BYTES_PER_SAMPLE, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeTag(view, 36, 'data');
  view.setUint32(40, dataBytes, true);
  pcm.forEach((value, index) => {
    const clamped = Math.min(1, Math.max(-1, value));
    view.setInt16(HEADER_BYTES + index * BYTES_PER_SAMPLE, Math.round(clamped * FULL_SCALE), true);
  });
  return bytes;
}
