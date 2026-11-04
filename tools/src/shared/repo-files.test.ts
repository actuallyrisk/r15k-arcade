import { existsSync } from 'node:fs';
import { expect, test } from 'vitest';
import { listRepoFiles } from './repo-files.ts';
import { REPO_ROOT, repoPath } from './repo-paths.ts';

test('the repository root holds the workspace manifest', () => {
  expect(existsSync(repoPath('pnpm-workspace.yaml'))).toBe(true);
  expect(repoPath('tools', 'src')).toBe(repoPath('tools/src'));
  expect(repoPath()).toBe(REPO_ROOT);
});

test('the file list holds tracked and untracked files as sorted, slash-separated paths', () => {
  const files = listRepoFiles();
  expect(files).toContain('package.json');
  expect(files).toContain('tools/src/shared/repo-files.ts');
  expect(files.every((file) => !file.includes('\\') && existsSync(repoPath(file)))).toBe(true);
  expect([...files].sort()).toEqual(files);
});

test('the file list leaves out everything git ignores', () => {
  const files = listRepoFiles();
  const ignored = files.filter((file) => /(^|\/)(node_modules|dist|coverage|\.tmp)\//.test(file));
  expect(ignored).toEqual([]);
});
