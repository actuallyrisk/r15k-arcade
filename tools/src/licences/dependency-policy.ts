// R15K Arcade tools – the runtime dependency policy (CONTRIBUTING.md, "Dependencies"), belt and braces
// next to the ESLint import rules: workspace manifests may depend at runtime only on @r15k/* (as
// workspace:*), @tauri-apps/api and the official Tauri plugins store, haptics, window-state, opener,
// dialog, fs and os, and only packages/engine may depend on Tauri. Runtime sources (tests included) never
// load a workspace package with import(), and only the engine's Tauri adapters and their tests load Tauri
// modules with import(). tools/ is not scanned: its literal dynamic imports of workspace packages are
// intended.
import type { LicenceIssue } from './third-party.ts';

/** The only files that may load Tauri modules with import() (the three adapters and their tests). */
export const TAURI_FILES: readonly string[] = [
  'packages/engine/src/platform/tauri-platform.ts',
  'packages/engine/src/storage/tauri-store-adapter.ts',
  'packages/engine/src/platform/select-platform.ts',
  'packages/engine/src/platform/tauri-platform.test.ts',
  'packages/engine/src/storage/tauri-store-adapter.test.ts',
  'packages/engine/src/platform/select-platform.test.ts',
];

/** Third-party packages allowed as runtime dependencies. */
export const ALLOWED_RUNTIME_DEPENDENCIES: readonly string[] = [
  '@tauri-apps/api',
  ...['store', 'haptics', 'window-state', 'opener', 'dialog', 'fs', 'os'].map(
    (plugin) => `@tauri-apps/plugin-${plugin}`,
  ),
];

/** The one manifest that may depend on Tauri packages. */
const ENGINE_MANIFEST = 'packages/engine/package.json';
/** Sources of the runtime packages (the ESLint runtime globs). */
const RUNTIME_SOURCE = /^(?:(?:packages|games)\/[^/]+\/src|apps\/arcade\/src)\/.+\.ts$/;
const DYNAMIC_WORKSPACE_IMPORT = /\bimport\(\s*['"`]@r15k\//;
const DYNAMIC_TAURI_IMPORT = /\bimport\(\s*['"`]@tauri-apps\//;

/** The runtime dependencies of one workspace manifest. */
export interface WorkspaceManifest {
  /** Repository-relative path of the package.json. */
  readonly path: string;
  readonly dependencies: Readonly<Record<string, string>>;
}

/** The repository-relative package.json paths of the workspace: the root and every `packages:` glob. */
export function workspaceManifestPaths(
  files: readonly string[],
  workspaceYaml: string,
): readonly string[] {
  const block = /^packages:[ \t]*\r?\n((?:[ \t]+-.*(?:\r?\n|$))+)/m.exec(workspaceYaml)?.[1] ?? '';
  const patterns = [...block.matchAll(/-\s*['"]?([^'"\s]+)['"]?/g)].map((match) => match[1] ?? '');
  const expressions = patterns.map(
    (pattern) =>
      new RegExp(`^${pattern.replaceAll('.', '\\.').replaceAll('*', '[^/]+')}/package\\.json$`),
  );
  return files.filter(
    (file) => file === 'package.json' || expressions.some((expression) => expression.test(file)),
  );
}

/** Every third-party runtime dependency named by any manifest, sorted and unique. */
export function thirdPartyDependencies(manifests: readonly WorkspaceManifest[]): readonly string[] {
  const names = manifests.flatMap((manifest) => Object.keys(manifest.dependencies));
  return [...new Set(names.filter((name) => !name.startsWith('@r15k/')))].sort();
}

/** The issues of one dependency entry. */
function dependencyIssues(manifest: WorkspaceManifest, name: string): readonly LicenceIssue[] {
  const where = `${manifest.path}: dependency ${name}`;
  if (name.startsWith('@r15k/')) {
    const version = manifest.dependencies[name];
    return version === 'workspace:*'
      ? []
      : [`${where} must be "workspace:*", not "${version ?? ''}"`];
  }
  if (!ALLOWED_RUNTIME_DEPENDENCIES.includes(name)) {
    return [`${where} is not an allowed runtime dependency (CONTRIBUTING.md, "Dependencies")`];
  }
  return manifest.path === ENGINE_MANIFEST
    ? []
    : [`${where}: only packages/engine may depend on Tauri`];
}

/** Every policy violation of the workspace manifests. */
export function manifestIssues(manifests: readonly WorkspaceManifest[]): readonly LicenceIssue[] {
  return manifests.flatMap((manifest) =>
    Object.keys(manifest.dependencies).flatMap((name) => dependencyIssues(manifest, name)),
  );
}

/** Whether a repository file is a runtime source (scanned for dynamic imports). */
export function isRuntimeSource(file: string): boolean {
  return RUNTIME_SOURCE.test(file);
}

/** The dynamic-import violations of one runtime source file. */
export function sourceIssues(file: string, text: string): readonly LicenceIssue[] {
  const issues: LicenceIssue[] = [];
  if (DYNAMIC_WORKSPACE_IMPORT.test(text)) {
    issues.push(`${file}: workspace packages are imported statically, never with import()`);
  }
  if (DYNAMIC_TAURI_IMPORT.test(text) && !TAURI_FILES.includes(file)) {
    issues.push(`${file}: only the engine Tauri adapters load Tauri modules with import()`);
  }
  return issues;
}
