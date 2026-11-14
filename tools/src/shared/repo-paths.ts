// R15K Arcade tools – absolute paths inside the repository, independent of the working directory the
// tool was started from.
import { join, resolve } from 'node:path';

/** Absolute path of the repository root (three levels above this file). */
export const REPO_ROOT: string = resolve(import.meta.dirname, '..', '..', '..');

/** Absolute path of a repository-relative path. */
export function repoPath(...segments: readonly string[]): string {
  return join(REPO_ROOT, ...segments);
}
