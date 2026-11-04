// R15K Arcade tools – version sync. release-please bumps one version in many files: the workspace
// manifests, tauri.conf.json, both Cargo.toml files and the two workspace entries of Cargo.lock (the
// "extra-files" of release-please-config.json). This check proves that every one of them carries the
// version of .release-please-manifest.json and is listed for release-please, and that every JSON file
// release-please rewrites is stored exactly as release-please writes it back (two-space JSON.stringify
// and a final newline), so a release PR that misses a file fails its own checks. Read-only and without a
// TOML or YAML dependency: Cargo versions and workspace globs are read with line-anchored expressions.
import { existsSync, globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MANIFEST = '.release-please-manifest.json';
const CONFIG = 'release-please-config.json';
const WORKSPACE = 'pnpm-workspace.yaml';
const ROOT_PACKAGE = 'package.json';
const TAURI_CONFIG = 'apps/arcade/src-tauri/tauri.conf.json';
const CARGO_MANIFESTS = ['apps/arcade/src-tauri/Cargo.toml', 'plugins/device/Cargo.toml'] as const;
const CARGO_LOCK = 'apps/arcade/src-tauri/Cargo.lock';
/** The workspace crates whose Cargo.lock entries release-please updates. */
const LOCKED_CRATES = ['r15k-arcade', 'tauri-plugin-device'] as const;
const JSON_VERSION_PATH = '$.version';
const TOML_VERSION_PATH = '$.package.version';

/** One entry of `packages["."]["extra-files"]` in release-please-config.json. */
export interface ExtraFile {
  readonly type: string;
  readonly path: string;
  readonly jsonpath: string;
}

/** A version read from one place of one file. */
export interface FoundVersion {
  /** Repository-relative path with `/` separators. */
  readonly file: string;
  /** What was read: `$.version`, `[package] version` or `[[package]] <crate>`. */
  readonly field: string;
  /** The version, `undefined` when the file or the field is missing. */
  readonly version: string | undefined;
}

/** Result of {@link checkVersionSync}. */
export interface VersionSyncReport {
  /** The version of `.` in .release-please-manifest.json. */
  readonly expected: string | undefined;
  readonly versions: readonly FoundVersion[];
  /** One line per problem; empty when everything is in sync. */
  readonly problems: readonly string[];
}

/** Narrows a parsed JSON value to an object. */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A string value, or `undefined` for anything else. */
function stringOf(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** Text of a repository file with LF line ends, `undefined` when the file does not exist. */
function readOptional(root: string, file: string): string | undefined {
  const path = join(root, file);
  return existsSync(path) ? readFileSync(path, 'utf8').replaceAll('\r\n', '\n') : undefined;
}

/** Parsed JSON of a repository file, `undefined` when the file does not exist. */
function readJsonOptional(root: string, file: string): unknown {
  const text = readOptional(root, file);
  if (text === undefined) {
    return undefined;
  }
  const value: unknown = JSON.parse(text);
  return value;
}

/** True when the text is exactly `JSON.stringify(JSON.parse(text), null, 2) + '\n'`. */
export function hasJsonStringifyLayout(text: string): boolean {
  return text === `${JSON.stringify(JSON.parse(text), null, 2)}\n`;
}

/** The `version = "…"` of the `[package]` table of a Cargo.toml (other tables are ignored). */
export function cargoPackageVersion(text: string): string | undefined {
  let isInPackage = false;
  for (const line of text.replaceAll('\r\n', '\n').split('\n')) {
    if (/^\s*\[/.test(line)) {
      isInPackage = /^\s*\[package\]\s*(#.*)?$/.test(line);
    } else if (isInPackage) {
      const version = /^\s*version\s*=\s*"([^"]+)"/.exec(line)?.[1];
      if (version !== undefined) {
        return version;
      }
    }
  }
  return undefined;
}

/** The version of the `[[package]]` entry named `name` in a Cargo.lock, `undefined` when absent. */
export function cargoLockVersion(text: string, name: string): string | undefined {
  const blocks = text.replaceAll('\r\n', '\n').split(/^\[\[package\]\][^\S\n]*$/m);
  const block = blocks.find((candidate) => /^name = "([^"]+)"$/m.exec(candidate)?.[1] === name);
  return block === undefined ? undefined : /^version = "([^"]+)"$/m.exec(block)?.[1];
}

/** The globs of the `packages:` block list of pnpm-workspace.yaml (plain or quoted scalars). */
export function workspaceGlobs(yaml: string): readonly string[] {
  const block = /^packages:[^\S\n]*\n((?:[^\S\n]+-[^\n]*(?:\n|$))+)/m.exec(yaml)?.[1] ?? '';
  return block
    .split('\n')
    .map((line) => line.replace(/^\s*-\s*/, '').replace(/\s+#.*$/, ''))
    .map((glob) => glob.trim().replace(/^(['"])(.*)\1$/, '$2'))
    .filter((glob) => glob !== '');
}

/** The extra-files of the root package of a parsed release-please-config.json. */
export function releasePleaseExtraFiles(config: unknown): readonly ExtraFile[] {
  const packages = isRecord(config) ? config['packages'] : undefined;
  const rootPackage = isRecord(packages) ? packages['.'] : undefined;
  const entries: unknown = isRecord(rootPackage) ? rootPackage['extra-files'] : undefined;
  const list: readonly unknown[] = Array.isArray(entries) ? entries : [];
  return list.filter(isRecord).map((entry) => ({
    type: stringOf(entry['type']) ?? '',
    path: stringOf(entry['path']) ?? '',
    jsonpath: stringOf(entry['jsonpath']) ?? '',
  }));
}

/** The workspace manifests (`<glob>/package.json`) of pnpm-workspace.yaml, sorted. */
function workspaceManifests(root: string): readonly string[] {
  const globs = workspaceGlobs(readOptional(root, WORKSPACE) ?? '');
  const files = globSync(
    globs.map((glob) => `${glob}/package.json`),
    { cwd: root },
  );
  return [...new Set(files.map((file) => file.replaceAll('\\', '/')))].sort();
}

/** The Cargo.lock filter release-please uses for one workspace crate. */
function lockFilter(crate: string): string {
  return `$.package[?(@.name.value=='${crate}')].version`;
}

/** Whether release-please lists `path` as an extra-file of `type` with `jsonpath`. */
function isListed(extraFiles: readonly ExtraFile[], wanted: ExtraFile): boolean {
  return extraFiles.some(
    (entry) =>
      entry.type === wanted.type &&
      entry.path === wanted.path &&
      entry.jsonpath === wanted.jsonpath,
  );
}

/** Sorted, de-duplicated file list. */
function unique(files: readonly string[]): readonly string[] {
  return [...new Set(files)].sort();
}

/** JSON files with a top-level `version`: root manifest, workspace manifests, JSON extra-files. */
function jsonVersionFiles(root: string, extraFiles: readonly ExtraFile[]): readonly string[] {
  const listed = extraFiles
    .filter((entry) => entry.type === 'json' && entry.jsonpath === JSON_VERSION_PATH)
    .map((entry) => entry.path);
  return unique([ROOT_PACKAGE, ...workspaceManifests(root), TAURI_CONFIG, ...listed]);
}

/** Every version the release has to keep in sync (Cargo.lock entries only once it exists). */
function collectVersions(root: string, extraFiles: readonly ExtraFile[]): readonly FoundVersion[] {
  const json = jsonVersionFiles(root, extraFiles).map((file) => {
    const parsed = readJsonOptional(root, file);
    const version = isRecord(parsed) ? stringOf(parsed['version']) : undefined;
    return { file, field: JSON_VERSION_PATH, version };
  });
  const cargo = CARGO_MANIFESTS.map((file) => {
    const text = readOptional(root, file);
    const version = text === undefined ? undefined : cargoPackageVersion(text);
    return { file, field: '[package] version', version };
  });
  const lock = readOptional(root, CARGO_LOCK);
  const locked =
    lock === undefined
      ? []
      : LOCKED_CRATES.map((crate) => ({
          file: CARGO_LOCK,
          field: `[[package]] ${crate}`,
          version: cargoLockVersion(lock, crate),
        }));
  return [...json, ...cargo, ...locked];
}

/** Versions that differ from the manifest version. */
function versionProblems(versions: readonly FoundVersion[], expected: string): readonly string[] {
  return versions
    .filter((found) => found.version !== expected)
    .map(
      (found) =>
        `${found.file} (${found.field}): ${found.version ?? 'missing'} instead of ${expected}`,
    );
}

/** Versioned files that release-please would not update, and extra-files that do not exist. */
function coverageProblems(root: string, extraFiles: readonly ExtraFile[]): readonly string[] {
  const wanted: readonly ExtraFile[] = [
    ...[...workspaceManifests(root), TAURI_CONFIG].map((path) => ({
      type: 'json',
      path,
      jsonpath: JSON_VERSION_PATH,
    })),
    ...CARGO_MANIFESTS.map((path) => ({ type: 'toml', path, jsonpath: TOML_VERSION_PATH })),
    ...LOCKED_CRATES.map((crate) => ({
      type: 'toml',
      path: CARGO_LOCK,
      jsonpath: lockFilter(crate),
    })),
  ];
  const unlisted = wanted
    .filter((entry) => !isListed(extraFiles, entry))
    .map((entry) => `${CONFIG}: no ${entry.type} extra-file for ${entry.path} (${entry.jsonpath})`);
  const missing = unique(extraFiles.map((entry) => entry.path))
    .filter((path) => path !== CARGO_LOCK && readOptional(root, path) === undefined)
    .map((path) => `${CONFIG}: extra-file ${path} does not exist`);
  return [...unlisted, ...missing];
}

/** JSON files release-please rewrites that are not stored in its layout. */
function layoutProblems(root: string, extraFiles: readonly ExtraFile[]): readonly string[] {
  const listed = extraFiles.filter((entry) => entry.type === 'json').map((entry) => entry.path);
  return unique([ROOT_PACKAGE, MANIFEST, ...workspaceManifests(root), ...listed]).flatMap(
    (file) => {
      const text = readOptional(root, file);
      return text === undefined || hasJsonStringifyLayout(text)
        ? []
        : [`${file}: not stored as JSON.stringify(value, null, 2) with a final newline`];
    },
  );
}

/** Checks every version release-please maintains in the repository at `root`. */
export function checkVersionSync(root: string): VersionSyncReport {
  const manifest = readJsonOptional(root, MANIFEST);
  const expected = isRecord(manifest) ? stringOf(manifest['.']) : undefined;
  const extraFiles = releasePleaseExtraFiles(readJsonOptional(root, CONFIG));
  const versions = collectVersions(root, extraFiles);
  const problems = [
    ...(expected === undefined
      ? [`${MANIFEST}: no version for "."`]
      : versionProblems(versions, expected)),
    ...coverageProblems(root, extraFiles),
    ...layoutProblems(root, extraFiles),
  ];
  return { expected, versions, problems };
}
