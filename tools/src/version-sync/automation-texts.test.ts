import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { readJson } from '../shared/fs-json.ts';
import { repoPath } from '../shared/repo-paths.ts';

// release-please and Renovate open pull requests and an issue with the owner's token. Their texts must
// be the repository's own: a missing or empty release-please header or footer brings back the tool's
// default text, and Renovate's default pull request template ends with a footer of its own.

/** Attribution wording that none of the automated texts may contain. */
const ATTRIBUTION = /\bgenerated\b|co-?author/i;
const RELEASE_PLEASE = 'release-please-config.json';
const RENOVATE = 'renovate.json';

/** Narrows a parsed JSON value to an object. */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A top-level string setting of a repository JSON file ('' when missing or not a string). */
function setting(file: string, key: string): string {
  const config = readJson(repoPath(file));
  const value = isRecord(config) ? config[key] : undefined;
  return typeof value === 'string' ? value : '';
}

test.each([
  [RELEASE_PLEASE, 'pull-request-header'],
  [RELEASE_PLEASE, 'pull-request-footer'],
  [RENOVATE, 'prBodyTemplate'],
  [RENOVATE, 'dependencyDashboardHeader'],
])('%s sets %s to a non-empty text in our own words', (file, key) => {
  const text = setting(file, key);
  expect(text.trim()).not.toBe('');
  expect(text).not.toMatch(ATTRIBUTION);
});

test.each([RELEASE_PLEASE, RENOVATE])('%s contains no attribution anywhere', (file) => {
  expect(readFileSync(repoPath(file), 'utf8')).not.toMatch(ATTRIBUTION);
});

test('Renovate pull requests render no footer', () => {
  expect(setting(RENOVATE, 'prBodyTemplate')).not.toContain('{{{footer}}}');
});

test('Renovate branches follow the chore/deps- convention', () => {
  expect(setting(RENOVATE, 'branchPrefix')).toBe('chore/deps-');
});
