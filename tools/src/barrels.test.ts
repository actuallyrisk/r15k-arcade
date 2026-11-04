import { expect, test } from 'vitest';
import { repoPath } from './shared/repo-paths.ts';
import { runCommand } from './shared/run-command.ts';

// A Vitest import would not prove this: Vite's transform tolerates import.meta.env, JSON imports
// without attributes and non-erasable syntax. Plain Node (type stripping, package exports, workspace
// symlinks) is what the tools run on.
const IMPORT_ALL_BARRELS = [
  "await import('@r15k/engine');",
  "await import('@r15k/ui');",
  "await import('@r15k/bug-hunt');",
  "await import('@r15k/arcade');",
].join(' ');

test('all four workspace barrels import in a plain Node process without any output on stderr', () => {
  const result = runCommand(process.execPath, ['--input-type=module', '-e', IMPORT_ALL_BARRELS], {
    cwd: repoPath('tools'),
    env: { NODE_OPTIONS: '' },
  });
  expect(result.stderr).toBe('');
  expect(result.status).toBe(0);
});
