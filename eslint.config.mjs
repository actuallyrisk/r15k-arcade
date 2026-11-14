// R15K Arcade – ESLint flat config: workspace import boundaries (engine ← ui ← games ← app, pure
// simulation), banned APIs (Math.random, clocks, console, default exports, enum), size limits, naming
// and TSDoc on exports, as described in CONTRIBUTING.md ("Code standards"); the building blocks live in
// eslint.restrictions.mjs and eslint.simulation.mjs.
// Type-checked rules need every linted .ts file in a tsconfig.json (projectService); the two app config
// files and all .mjs files are linted without type information. Blocks for narrower globs come later and
// REPLACE the options of the same rule from earlier blocks (flat config does not merge rule options), so
// every block repeats the complete restriction set it needs.
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importX from 'eslint-plugin-import-x';
import jsdoc from 'eslint-plugin-jsdoc';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import {
  CHILD_PROCESS,
  CONFIGS,
  DYNAMIC_IMPORT_TAURI_CORE,
  ENGINE_ALONE,
  GAME_DEPS,
  NAMING_CONVENTION,
  NODE_ONLY,
  RANDOM_BAN,
  RUNTIME,
  SYNTAX_BASE,
  SYNTAX_CLOCK,
  SYNTAX_RUNTIME,
  SYNTAX_TAURI,
  TAURI_FILES,
  TAURI_LAZY,
  TAURI_ONLY,
  TAURI_SOURCES,
  TESTS,
  TIME_BANS,
  TOOLS_ONLY,
  UI_DEPS,
} from './eslint.restrictions.mjs';
import { SIMULATION_BLOCK } from './eslint.simulation.mjs';

const imports = (...patterns) => ['error', { patterns }];

export default defineConfig(
  {
    // Dot-directories hold editor, CI and tool state, never linted source.
    ignores: [
      '**/.*/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'apps/arcade/public/**',
      'apps/arcade/src-tauri/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'tools/src/platform-patch/fixtures/**',
      'plugins/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  prettier,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: { ...globals.browser },
    },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver({ alwaysTryTypes: true })],
    },
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        {
          allowDefaultCaseForExhaustiveSwitch: false,
          considerDefaultExhaustiveForUnions: false,
          requireDefaultForNonUnion: true,
        },
      ],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': true, 'ts-ignore': true, 'ts-nocheck': true },
      ],
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/max-params': ['error', { max: 3, countVoidThis: false }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/naming-convention': ['error', ...NAMING_CONVENTION],
      'no-console': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
      'no-restricted-properties': ['error', RANDOM_BAN, ...TIME_BANS],
      'no-restricted-syntax': ['error', ...SYNTAX_BASE],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': [
        'error',
        { max: 40, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      complexity: ['error', 10],
      'max-depth': ['error', 3],
      'import-x/no-default-export': 'error',
      'import-x/no-cycle': ['error', { ignoreExternal: true }],
      'import-x/no-self-import': 'error',
      'import-x/no-useless-path-segments': 'error',
      'import-x/no-relative-packages': 'error',
      'import-x/consistent-type-specifier-style': ['error', 'prefer-top-level'],
      'import-x/extensions': ['error', 'always', { ignorePackages: true, checkTypeImports: true }],
      'import-x/no-extraneous-dependencies': [
        'error',
        { devDependencies: false, includeTypes: true },
      ],
      'import-x/no-unresolved': 'off',
      'import-x/named': 'off',
      '@typescript-eslint/no-restricted-imports': imports(TOOLS_ONLY, TAURI_ONLY),
    },
  },
  // Runtime sources: no Node built-ins, dynamic imports only with literal, non-workspace, non-Tauri targets.
  {
    files: RUNTIME,
    rules: {
      'import-x/no-nodejs-modules': 'error',
      'no-restricted-syntax': ['error', ...SYNTAX_RUNTIME],
      '@typescript-eslint/no-restricted-imports': imports(TOOLS_ONLY, NODE_ONLY, TAURI_ONLY),
    },
  },
  {
    files: ['packages/engine/src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': imports(ENGINE_ALONE, NODE_ONLY, TAURI_ONLY),
    },
  },
  {
    files: ['packages/ui/src/**/*.ts'],
    rules: { '@typescript-eslint/no-restricted-imports': imports(UI_DEPS, NODE_ONLY, TAURI_ONLY) },
  },
  {
    files: ['games/*/src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': imports(GAME_DEPS, NODE_ONLY, TAURI_ONLY),
    },
  },
  // Deterministic simulation: engine random/math/type-only, no DOM, no clocks, no approximated math, no locale.
  SIMULATION_BLOCK,
  // Clock and loop own the time sources.
  {
    files: ['packages/engine/src/time/**/*.ts', 'packages/engine/src/loop/**/*.ts'],
    rules: {
      'no-restricted-properties': ['error', RANDOM_BAN],
      'no-restricted-syntax': ['error', ...SYNTAX_CLOCK],
    },
  },
  // The engine Tauri adapters are the only Tauri importers.
  {
    files: TAURI_FILES,
    rules: {
      '@typescript-eslint/no-restricted-imports': imports(ENGINE_ALONE, NODE_ONLY),
      'no-restricted-syntax': ['error', ...SYNTAX_TAURI],
    },
  },
  // Their sources import @tauri-apps/api/core statically and every other Tauri module lazily.
  {
    files: TAURI_SOURCES,
    rules: {
      '@typescript-eslint/no-restricted-imports': imports(ENGINE_ALONE, NODE_ONLY, TAURI_LAZY),
      'no-restricted-syntax': ['error', ...SYNTAX_TAURI, DYNAMIC_IMPORT_TAURI_CORE],
    },
  },
  // The engine logger sink is the only console user (tools print via process.stdout/stderr).
  { files: ['packages/engine/src/logger/console-sink.ts'], rules: { 'no-console': 'off' } },
  // tools/, configs and E2E run in Node and depend on dev dependencies only; processes start in one module.
  {
    files: ['tools/src/**/*.ts', ...CONFIGS, 'apps/arcade/e2e/**/*.ts', '**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'import-x/no-extraneous-dependencies': [
        'error',
        { devDependencies: true, includeTypes: true },
      ],
      '@typescript-eslint/no-restricted-imports': imports(TOOLS_ONLY, TAURI_ONLY, CHILD_PROCESS),
    },
  },
  {
    files: ['tools/src/shared/run-command.ts'],
    rules: { '@typescript-eslint/no-restricted-imports': imports(TOOLS_ONLY, TAURI_ONLY) },
  },
  // Tests: dev dependencies and @ts-expect-error with a reason; every other rule and limit applies unchanged.
  {
    files: TESTS,
    rules: {
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          minimumDescriptionLength: 10,
          'ts-ignore': true,
          'ts-nocheck': true,
        },
      ],
      'import-x/no-extraneous-dependencies': [
        'error',
        { devDependencies: true, includeTypes: true },
      ],
    },
  },
  // Vite, Vitest, Playwright, ESLint and commitlint load their config through a default export.
  { files: CONFIGS, rules: { 'import-x/no-default-export': 'off' } },
  // Config files import plugin objects through their documented default exports; those packages also
  // export the same names, which these two rules would report.
  {
    files: [...CONFIGS, '**/*.mjs'],
    rules: { 'import-x/no-named-as-default': 'off', 'import-x/no-named-as-default-member': 'off' },
  },
  // TSDoc on every exported declaration (tests export nothing).
  {
    files: ['**/*.ts'],
    ignores: ['**/*.test.ts'],
    plugins: { jsdoc },
    rules: {
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: true,
          require: {
            FunctionDeclaration: true,
            ClassDeclaration: true,
            MethodDefinition: true,
            ArrowFunctionExpression: false,
            FunctionExpression: false,
          },
          contexts: ['TSInterfaceDeclaration', 'TSTypeAliasDeclaration', 'VariableDeclaration'],
          checkConstructors: false,
          checkGetters: true,
          checkSetters: true,
        },
      ],
    },
  },
  // App config files are not part of a tsconfig.json project (see apps/arcade/tsconfig.node.json).
  {
    files: ['apps/arcade/vite.config.ts', 'apps/arcade/playwright.config.ts', '**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
