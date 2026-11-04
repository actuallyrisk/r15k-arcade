// R15K Arcade tools – platform patch tests: reads the generated-project fixtures (rendered from the
// Tauri CLI templates, refreshed from the unpatched CI snapshots) and their patched expectations.
import { readFileSync } from 'node:fs';

/** Text of a file below platform-patch/fixtures, e.g. `android/AndroidManifest.xml`. */
export function fixture(path: string): string {
  return readFileSync(new URL(`../fixtures/${path}`, import.meta.url), 'utf8');
}

/** Text of a patched expectation below platform-patch/fixtures/expected. */
export function expected(path: string): string {
  return fixture(`expected/${path}`);
}

/** The fixture with one literal occurrence replaced; fails when the literal is not in it. */
export function fixtureWith(path: string, search: string, replacement: string): string {
  const text = fixture(path);
  if (!text.includes(search)) {
    throw new Error(`fixture ${path} does not contain ${JSON.stringify(search)}`);
  }
  return text.replace(search, () => replacement);
}
