// R15K Arcade tools – Prettier over exactly the files git would commit (minus .prettierignore). Prettier's
// own ignore-path option cannot read .git/info/exclude (it resolves patterns relative to the ignore file's
// folder), so the file list comes from git and Prettier only decides per file.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as prettier from 'prettier';
import { REPO_ROOT } from '../shared/repo-paths.ts';

/** Check reports unformatted files; write rewrites them. */
export type FormatMode = 'check' | 'write';

/** What a format run found or changed (repository-relative paths). */
export interface FormatOutcome {
  /** Files Prettier formats (not ignored, with an inferred parser). */
  readonly checked: readonly string[];
  /** Files whose content differs from Prettier's output (check mode). */
  readonly unformatted: readonly string[];
  /** Files rewritten (write mode). */
  readonly written: readonly string[];
}

/** A path argument as a repository-relative, '/'-separated path without leading `./` or trailing `/`. */
export function normalisePath(path: string): string {
  const slashed = path
    .replaceAll('\\', '/')
    .replace(/^(\.\/)+/, '')
    .replace(/\/+$/, '');
  return slashed === '.' ? '' : slashed;
}

/** The files at or under one of the paths; every file when no path (or the root) is given. */
export function selectFiles(files: readonly string[], paths: readonly string[]): readonly string[] {
  const prefixes = paths.map(normalisePath);
  if (prefixes.length === 0 || prefixes.includes('')) {
    return files;
  }
  return files.filter((file) =>
    prefixes.some((prefix) => file === prefix || file.startsWith(`${prefix}/`)),
  );
}

/** Formats or checks one file; `undefined` when Prettier ignores it or has no parser for it. */
async function formatFile(
  file: string,
  options: { readonly mode: FormatMode; readonly root: string },
): Promise<'formatted' | 'changed' | undefined> {
  const absolute = join(options.root, file);
  const info = await prettier.getFileInfo(absolute, {
    ignorePath: join(options.root, '.prettierignore'),
  });
  if (info.ignored || info.inferredParser === null) {
    return undefined;
  }
  const config = (await prettier.resolveConfig(absolute)) ?? {};
  const text = readFileSync(absolute, 'utf8');
  const formatted = await prettier.format(text, { ...config, filepath: absolute });
  if (formatted === text) {
    return 'formatted';
  }
  if (options.mode === 'write') {
    writeFileSync(absolute, formatted);
  }
  return 'changed';
}

/** Runs Prettier over repository-relative files below `root` (default: the repository root). */
export async function formatFiles(options: {
  readonly mode: FormatMode;
  readonly files: readonly string[];
  readonly root?: string;
}): Promise<FormatOutcome> {
  const root = options.root ?? REPO_ROOT;
  const checked: string[] = [];
  const changed: string[] = [];
  for (const file of options.files) {
    const result = await formatFile(file, { mode: options.mode, root });
    if (result !== undefined) {
      checked.push(file);
    }
    if (result === 'changed') {
      changed.push(file);
    }
  }
  return options.mode === 'check'
    ? { checked, unformatted: changed, written: [] }
    : { checked, unformatted: [], written: changed };
}
