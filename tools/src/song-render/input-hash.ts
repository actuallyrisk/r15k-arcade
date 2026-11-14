// R15K Arcade tools – the input hash of the audio render: FNV-1a over the renderer's own sources, the
// song files, the canonical JSON of every SFX definition, the MP3 encoder version and the Node major
// version (Node ships the Math functions the synth uses). The rendered folder is reused while its
// manifest carries the same hash, locally and in the CI build jobs. Line endings do not count.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { canonicalJson, fnv1a32, toHex32 } from '@r15k/engine';
import type { SfxDefinition } from '@r15k/engine';

/** A text file that feeds the hash, named by a stable, platform-independent path. */
export interface HashedFile {
  readonly path: string;
  readonly text: string;
}

/** Everything the rendered audio depends on. */
export interface HashInputs {
  readonly files: readonly HashedFile[];
  readonly sfx: readonly SfxDefinition[];
  readonly encoderVersion: string;
  readonly nodeMajor: string;
}

/** Orders strings by UTF-16 code units (locale independent). */
function compareCodeUnits(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

/** The input hash (8 hex digits). */
export function computeInputHash(inputs: HashInputs): string {
  const files = [...inputs.files].sort((a, b) => compareCodeUnits(a.path, b.path));
  const parts = [
    ...files.map((file) => `file ${file.path}\n${file.text.replaceAll('\r\n', '\n')}`),
    `sfx ${canonicalJson(inputs.sfx)}`,
    `encoder ${inputs.encoderVersion}`,
    `node ${inputs.nodeMajor}`,
  ];
  return toHex32(fnv1a32(parts.join('\n')));
}

/** Every `.ts` file below `directory` as a hashed file whose path starts with `label`. */
export function readSourceFiles(directory: string, label: string): readonly HashedFile[] {
  return readdirSync(directory, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.ts'))
    .map((file) => ({
      path: `${label}/${file.replaceAll('\\', '/')}`,
      text: readFileSync(join(directory, file), 'utf8'),
    }));
}
