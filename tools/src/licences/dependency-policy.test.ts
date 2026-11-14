import { expect, test } from 'vitest';
import {
  isRuntimeSource,
  manifestIssues,
  sourceIssues,
  TAURI_FILES,
  thirdPartyDependencies,
  workspaceManifestPaths,
} from './dependency-policy.ts';
import type { WorkspaceManifest } from './dependency-policy.ts';

const WORKSPACE_YAML = [
  '# header',
  'packages:',
  '  - apps/*',
  "  - 'packages/*'",
  '  - games/*',
  '  - tools',
  '',
  'catalog:',
  '  vite: 8.3.5',
  '',
].join('\n');

const ENGINE: WorkspaceManifest = {
  path: 'packages/engine/package.json',
  dependencies: { '@tauri-apps/api': 'catalog:', '@tauri-apps/plugin-store': 'catalog:' },
};
const UI: WorkspaceManifest = {
  path: 'packages/ui/package.json',
  dependencies: { '@r15k/engine': 'workspace:*' },
};

test('the workspace manifests are the root and every packages glob of pnpm-workspace.yaml', () => {
  const files = [
    'package.json',
    'apps/arcade/package.json',
    'packages/engine/package.json',
    'packages/ui/package.json',
    'games/bug-hunt/package.json',
    'tools/package.json',
    '.github/renovate/package.json',
    'apps/arcade/src-tauri/package.json',
    'tools/src/fixtures/package.json',
  ];
  expect(workspaceManifestPaths(files, WORKSPACE_YAML)).toEqual(files.slice(0, 6));
});

test('allowed manifests pass and their third-party dependencies are listed once', () => {
  expect(manifestIssues([ENGINE, UI])).toEqual([]);
  const app = { path: 'apps/arcade/package.json', dependencies: { '@r15k/ui': 'workspace:*' } };
  expect(thirdPartyDependencies([ENGINE, UI, app, ENGINE])).toEqual([
    '@tauri-apps/api',
    '@tauri-apps/plugin-store',
  ]);
});

test('an unlisted package, Tauri outside the engine and a non-workspace @r15k version fail', () => {
  const issues = manifestIssues([
    { path: 'packages/engine/package.json', dependencies: { 'left-pad': '1.3.0' } },
    { path: 'games/bug-hunt/package.json', dependencies: { '@tauri-apps/plugin-os': 'catalog:' } },
    { path: 'packages/ui/package.json', dependencies: { '@r15k/engine': '0.1.0' } },
    { path: 'apps/arcade/package.json', dependencies: { '@tauri-apps/plugin-http': 'catalog:' } },
  ]);
  expect(issues).toEqual([
    'packages/engine/package.json: dependency left-pad is not an allowed runtime dependency (CONTRIBUTING.md, "Dependencies")',
    'games/bug-hunt/package.json: dependency @tauri-apps/plugin-os: only packages/engine may depend on Tauri',
    'packages/ui/package.json: dependency @r15k/engine must be "workspace:*", not "0.1.0"',
    'apps/arcade/package.json: dependency @tauri-apps/plugin-http is not an allowed runtime dependency (CONTRIBUTING.md, "Dependencies")',
  ]);
});

test.each([
  ['packages/engine/src/platform/web-platform.ts', true],
  ['packages/ui/src/widgets/button.test.ts', true],
  ['games/bug-hunt/src/sim/step.ts', true],
  ['apps/arcade/src/main.ts', true],
  ['apps/arcade/e2e/round.spec.ts', false],
  ['apps/arcade/vite.config.ts', false],
  ['tools/src/i18n-check/main.ts', false],
  ['packages/engine/package.json', false],
])('isRuntimeSource(%j) is %j', (file, isRuntime) => {
  expect(isRuntimeSource(file)).toBe(isRuntime);
});

const TAURI_CORE = "const core = await import('@tauri-apps/api/core');";
const WORKSPACE = "const ui = await import('@r15k/ui');";

test('the six Tauri files may load Tauri modules with import(), every other runtime file may not', () => {
  expect(TAURI_FILES).toHaveLength(6);
  for (const file of TAURI_FILES) {
    expect(sourceIssues(file, TAURI_CORE)).toEqual([]);
  }
  expect(sourceIssues('packages/engine/src/platform/tauri-platform.test.ts', TAURI_CORE)).toEqual(
    [],
  );
  expect(sourceIssues('packages/engine/src/platform/web-platform.test.ts', TAURI_CORE)).toEqual([
    'packages/engine/src/platform/web-platform.test.ts: only the engine Tauri adapters load Tauri modules with import()',
  ]);
});

test('import() of a workspace package fails in every runtime file, the Tauri files included', () => {
  for (const file of ['apps/arcade/src/boot/create-app.ts', ...TAURI_FILES]) {
    expect(sourceIssues(file, WORKSPACE)).toEqual([
      `${file}: workspace packages are imported statically, never with import()`,
    ]);
  }
  expect(sourceIssues('games/bug-hunt/src/view/hud.ts', "import { x } from '@r15k/ui';")).toEqual(
    [],
  );
});
