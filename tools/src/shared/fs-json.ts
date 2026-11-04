// R15K Arcade tools – JSON files in the layout every tool writes (two-space indent and a final newline,
// the layout release-please uses as well).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/** Reads and parses a JSON file. */
export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Writes `JSON.stringify(value, null, 2) + '\n'`, creating missing parent directories. */
export function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}
