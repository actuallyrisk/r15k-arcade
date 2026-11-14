// R15K Arcade tools – MP3 encoding of the music with the LAME encoder compiled to WebAssembly
// (wasm-media-encoders, a pinned dev dependency: no native binary, the same output on every OS). The
// encoder owns the buffers it returns, so every chunk is copied before the next call.
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { createMp3Encoder } from 'wasm-media-encoders';

/** The encoder version the metadata names; the renderer checks it against the installed package. */
export const MP3_ENCODER_VERSION = '0.7.0';

/** Name of the encoder package. */
const ENCODER_PACKAGE = 'wasm-media-encoders';

/** The version of the installed encoder package (its manifest is not exported, so it is looked up). */
export function installedEncoderVersion(): string {
  let directory = dirname(createRequire(import.meta.url).resolve(ENCODER_PACKAGE));
  while (dirname(directory) !== directory) {
    const manifest = join(directory, 'package.json');
    if (existsSync(manifest)) {
      const { name, version } = JSON.parse(readFileSync(manifest, 'utf8')) as {
        readonly name?: unknown;
        readonly version?: unknown;
      };
      if (name === ENCODER_PACKAGE && typeof version === 'string') {
        return version;
      }
    }
    directory = dirname(directory);
  }
  throw new Error(`cannot find the version of ${ENCODER_PACKAGE}`);
}

/** Encoder name written into the music metadata. */
export const MP3_ENCODER_NAME = `lame (wasm-media-encoders ${MP3_ENCODER_VERSION})`;

/** Samples handed to the encoder per call (32 MPEG frames). */
const CHUNK_SAMPLES = 1152 * 32;

/** Joins byte chunks into one array. */
function concatBytes(chunks: readonly Uint8Array[]): Uint8Array {
  const bytes = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

/** Encodes mono float PCM as a constant-bitrate MP3 stream. */
export async function encodeMp3(
  pcm: Float32Array,
  options: { readonly sampleRate: 48000; readonly bitrateKbps: 96 },
): Promise<Uint8Array> {
  const encoder = await createMp3Encoder();
  encoder.configure({ sampleRate: options.sampleRate, channels: 1, bitrate: options.bitrateKbps });
  const chunks: Uint8Array[] = [];
  for (let start = 0; start < pcm.length; start += CHUNK_SAMPLES) {
    chunks.push(encoder.encode([pcm.subarray(start, start + CHUNK_SAMPLES)]).slice());
  }
  chunks.push(encoder.finalize().slice());
  return concatBytes(chunks);
}
