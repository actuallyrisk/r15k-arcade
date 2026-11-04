// R15K Arcade – Vitest for the whole workspace: five projects and the coverage gates (simulation ≥ 90 %,
// engine ≥ 80 %, ui ≥ 70 %, all four metrics). Coverage is global across projects, so per-area thresholds
// use glob patterns. Files whose bodies are still scaffold stubs (marker below) stay out of coverage until
// they are implemented; a threshold glob without measured files passes. vitest.setup.ts fails a test on
// unexpected console warnings or errors.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Assembled from two parts so that this file does not contain the marker it searches for.
const STUB_MARKER = 'return notImplemented' + "('";
const SOURCES = [
  'packages/*/src/**/*.ts',
  'games/*/src/**/*.ts',
  'apps/arcade/src/**/*.ts',
  'tools/src/**/*.ts',
];

/** Source files that still contain a scaffold stub body. */
function stubFiles(): string[] {
  return globSync(SOURCES, { cwd: import.meta.dirname })
    .map((file) => file.replaceAll('\\', '/'))
    .filter((file) => !file.endsWith('.test.ts'))
    .filter((file) => readFileSync(new URL(file, import.meta.url), 'utf8').includes(STUB_MARKER));
}

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'engine', root: './packages/engine', include: ['src/**/*.test.ts'] },
      },
      { extends: true, test: { name: 'ui', root: './packages/ui', include: ['src/**/*.test.ts'] } },
      {
        extends: true,
        test: { name: 'bug-hunt', root: './games/bug-hunt', include: ['src/**/*.test.ts'] },
      },
      {
        extends: true,
        test: { name: 'arcade', root: './apps/arcade', include: ['src/**/*.test.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'tools',
          root: './tools',
          include: ['src/**/*.test.ts'],
          testTimeout: 60_000,
        },
      },
    ],
    environment: 'node',
    restoreMocks: true,
    // No results cache: runs that execute at the same time in one checkout never share a cache file.
    cache: false,
    setupFiles: [fileURLToPath(new URL('./vitest.setup.ts', import.meta.url))],
    coverage: {
      provider: 'v8',
      include: SOURCES,
      exclude: [
        '**/*.test.ts',
        '**/index.ts',
        '**/test-support/**',
        'apps/arcade/src/main.ts',
        'tools/src/**/main.ts',
        'tools/src/snapshots/update.ts',
        'tools/src/replays/update.ts',
        ...stubFiles(),
      ],
      reporter: ['text-summary', 'json-summary', 'html'],
      reportsDirectory: '.tmp/coverage',
      thresholds: {
        'games/*/src/sim/**': { lines: 90, branches: 90, functions: 90, statements: 90 },
        'packages/engine/src/**': { lines: 80, branches: 80, functions: 80, statements: 80 },
        'packages/ui/src/**': { lines: 70, branches: 70, functions: 70, statements: 70 },
      },
    },
  },
});
