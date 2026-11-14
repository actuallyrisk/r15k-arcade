// R15K Arcade tools – exactly the files git would commit: tracked and untracked files minus everything
// a git ignore source excludes (.gitignore, .git/info/exclude, the global excludes file). Formatting and
// the to-do check work on this list, so files that git ignores are never touched.
import { statSync } from 'node:fs';
import { repoPath } from './repo-paths.ts';
import { runCommand } from './run-command.ts';

/** Repository-relative, '/'-separated paths of every existing file git would commit, sorted. */
export function listRepoFiles(): readonly string[] {
  const result = runCommand('git', [
    'ls-files',
    '--cached',
    '--others',
    '--exclude-standard',
    '-z',
  ]);
  if (result.status !== 0) {
    throw new Error(`git ls-files failed: ${result.stderr.trim()}`);
  }
  const files = new Set(result.stdout.split('\0').filter((file) => file !== ''));
  return [...files]
    .filter((file) => statSync(repoPath(file), { throwIfNoEntry: false })?.isFile() === true)
    .sort();
}
