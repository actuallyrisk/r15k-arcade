// R15K Arcade – ESLint building blocks for eslint.config.mjs: file globs, import restrictions, banned
// syntax and properties, naming options (CONTRIBUTING.md, "Code standards"). Flat config does not merge
// rule options, so the config combines these constants into the complete set each block needs. A module
// of its own so that no ESLint file exceeds the 300-line limit.

/** Splits a space-separated word list (long lists stay on few lines). */
const words = (text) => text.split(' ');

export const RUNTIME = ['packages/*/src/**/*.ts', 'games/*/src/**/*.ts', 'apps/arcade/src/**/*.ts'];
export const TESTS = ['**/*.test.ts', '**/test-support/**/*.ts', 'apps/arcade/e2e/**/*.ts'];
export const CONFIGS = ['**/*.config.ts', '**/*.config.mjs', 'vitest.setup.ts'];
/** The only files that may import Tauri packages (plus their tests, which import the mocked modules). */
export const TAURI_SOURCES = words(
  'platform/tauri-platform storage/tauri-store-adapter platform/select-platform',
).map((name) => `packages/engine/src/${name}.ts`);
export const TAURI_FILES = [
  ...TAURI_SOURCES,
  ...TAURI_SOURCES.map((file) => file.replace(/\.ts$/, '.test.ts')),
];

export const TOOLS_ONLY = {
  regex: '^@r15k/tools$',
  message: 'tools/ is dev-only and never imported by runtime code.',
};
export const NODE_ONLY = {
  regex: '^node:',
  message: 'Node built-ins are allowed only in tools/, configs and E2E.',
};
export const TAURI_ONLY = {
  regex: '^@tauri-apps/',
  message: 'Only the engine Tauri adapters import Tauri packages.',
};
/** One import style per Tauri module: a module imported both statically and with import() fails the Vite build. */
export const TAURI_LAZY = {
  regex: '^@tauri-apps/(?!api/core$)',
  allowTypeImports: true,
  message:
    'Load Tauri plugins and @tauri-apps/api/{app,window} with import(); only @tauri-apps/api/core is imported statically.',
};
export const CHILD_PROCESS = {
  regex: '^(node:)?child_process$',
  message: 'Start processes through tools/src/shared/run-command.ts (no shell, Windows-safe pnpm).',
};
export const ENGINE_ALONE = {
  regex: '^@r15k/',
  message: 'packages/engine imports nothing from the workspace.',
};
export const UI_DEPS = {
  regex: '^@r15k/(?!engine$)',
  message: 'packages/ui may import only @r15k/engine.',
};
export const GAME_DEPS = {
  regex: '^@r15k/(?!engine$|ui$)',
  message: 'A game imports only @r15k/engine and @r15k/ui.',
};

export const TIME_BANS = [
  {
    object: 'Date',
    property: 'now',
    message: 'Use the injected Clock (packages/engine/src/time).',
  },
  {
    object: 'performance',
    property: 'now',
    message: 'Use the injected Clock (packages/engine/src/time).',
  },
];
export const RANDOM_BAN = {
  object: 'Math',
  property: 'random',
  message: 'Use the engine RNG (openRng/nextFloat).',
};
const NEW_DATE = {
  selector: "NewExpression[callee.name='Date']",
  message: 'Use the injected Clock / local-date helpers.',
};
const NO_ENUM = {
  selector: 'TSEnumDeclaration',
  message: 'Use a string literal union with an as-const table.',
};
const NO_NAMESPACE = { selector: "TSModuleDeclaration[kind='namespace']", message: 'Use modules.' };
const DYNAMIC_IMPORT_LITERAL = {
  selector: "ImportExpression[source.type!='Literal']",
  message: 'Dynamic import() takes a string literal so import boundaries stay checkable.',
};
const DYNAMIC_IMPORT_WORKSPACE = {
  selector: 'ImportExpression[source.value=/^@r15k\\b/]',
  message: 'Import workspace packages statically.',
};
const DYNAMIC_IMPORT_TAURI = {
  selector: 'ImportExpression[source.value=/^@tauri-apps\\b/]',
  message: 'Only the engine Tauri adapters import Tauri packages.',
};
export const DYNAMIC_IMPORT_TAURI_CORE = {
  selector: "ImportExpression[source.value='@tauri-apps/api/core']",
  message:
    'Import @tauri-apps/api/core statically; a module imported both ways fails the Vite build.',
};
/** Complete no-restricted-syntax sets (later blocks replace earlier ones). */
export const SYNTAX_BASE = [NEW_DATE, NO_ENUM, NO_NAMESPACE];
export const SYNTAX_RUNTIME = [
  ...SYNTAX_BASE,
  DYNAMIC_IMPORT_LITERAL,
  DYNAMIC_IMPORT_WORKSPACE,
  DYNAMIC_IMPORT_TAURI,
];
export const SYNTAX_CLOCK = [
  NO_ENUM,
  NO_NAMESPACE,
  DYNAMIC_IMPORT_LITERAL,
  DYNAMIC_IMPORT_WORKSPACE,
  DYNAMIC_IMPORT_TAURI,
];
export const SYNTAX_TAURI = [...SYNTAX_BASE, DYNAMIC_IMPORT_LITERAL, DYNAMIC_IMPORT_WORKSPACE];

const BOOLEAN_PREFIXES = words(
  'is has had can should was did will needs allows IS_ HAS_ CAN_ SHOULD_',
);
/** Boolean names fixed by external shapes: Result discriminant `ok`, WebAudio `loop`, assertion `condition`. */
const BOOLEAN_NAME_EXCEPTIONS = { regex: '^(ok|loop|condition)$', match: false };
/** Options of @typescript-eslint/naming-convention; the boolean selector also allows `_isOn`-style stub parameters. */
export const NAMING_CONVENTION = [
  { selector: 'default', format: ['camelCase'], leadingUnderscore: 'allow' },
  { selector: 'import', format: ['camelCase', 'PascalCase'] },
  { selector: 'variable', modifiers: ['const', 'global'], format: ['camelCase', 'UPPER_CASE'] },
  { selector: 'variable', modifiers: ['destructured'], format: null },
  { selector: 'typeLike', format: ['PascalCase'] },
  { selector: ['objectLiteralProperty', 'objectLiteralMethod', 'typeProperty'], format: null },
  {
    selector: ['variable', 'parameter', 'classProperty', 'typeProperty', 'accessor'],
    types: ['boolean'],
    format: ['PascalCase', 'UPPER_CASE'],
    prefix: BOOLEAN_PREFIXES,
    filter: BOOLEAN_NAME_EXCEPTIONS,
    leadingUnderscore: 'allow',
  },
];
