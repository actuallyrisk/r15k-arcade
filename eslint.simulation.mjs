// R15K Arcade – ESLint block for the deterministic game simulations (the sim folder of every game): only
// engine random, math and type-only imports; no DOM, clocks, implementation-approximated Math, `**`,
// async code or locale-dependent calls (CONTRIBUTING.md, "Code standards"). Used by eslint.config.mjs.
import {
  NODE_ONLY,
  RANDOM_BAN,
  SYNTAX_RUNTIME,
  TAURI_ONLY,
  TIME_BANS,
} from './eslint.restrictions.mjs';

/** Splits a space-separated word list (long lists stay on few lines). */
const words = (text) => text.split(' ');

/** Engine names the simulation may import at runtime (type-only imports are always allowed). */
const SIM_ENGINE_NAMES = [
  ...words(
    'seedRng openRng closeRng nextUint32 nextFloat nextInt nextChance pickOne clamp lerp inverseLerp',
  ),
  ...words(
    'approach fnv1a32 toHex32 hashCanonical canonicalJson rectContains rectsIntersect SIM_STEP_HZ SIM_STEP_SECONDS',
  ),
  'notImplemented', // scaffold stub marker; this entry is deleted once no simulation stub remains
];
const APPROXIMATED_MESSAGE =
  'Implementation-approximated in JS engines: not deterministic across WebViews.';
const APPROXIMATED = words(
  'sin cos tan asin acos atan atan2 sinh cosh tanh asinh acosh atanh exp expm1 log log1p log2 log10 pow sqrt cbrt hypot',
).map((property) => ({ object: 'Math', property, message: APPROXIMATED_MESSAGE }));
const SIM_GLOBALS = [
  ...words(
    'window document navigator globalThis self performance requestAnimationFrame cancelAnimationFrame setTimeout',
  ),
  ...words(
    'setInterval clearTimeout clearInterval queueMicrotask localStorage sessionStorage indexedDB fetch AudioContext',
  ),
  ...words(
    'Image ImageData OffscreenCanvas HTMLCanvasElement crypto console process Date Intl WeakRef FinalizationRegistry',
  ),
  ...words('SharedArrayBuffer Atomics'),
];
const NO_POW_OPERATOR = {
  selector: "BinaryExpression[operator='**'], AssignmentExpression[operator='**=']",
  message: '** uses Math.pow (approximated); multiply explicitly.',
};
const NO_ASYNC = { selector: ':function[async=true]', message: 'The simulation is synchronous.' };
const NO_LOCALE_CALLS = {
  selector: 'CallExpression[callee.property.name=/^(localeCompare|toLocale[A-Za-z]*)$/]',
  message: 'Locale-dependent results are not deterministic across devices.',
};

/** Complete flat-config block for the simulation sources (their tests are excluded). */
export const SIMULATION_BLOCK = {
  files: ['games/*/src/sim/**/*.ts'],
  ignores: ['**/*.test.ts'],
  rules: {
    '@typescript-eslint/no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@r15k/engine',
            allowImportNames: SIM_ENGINE_NAMES,
            allowTypeImports: true,
            message: 'sim may use only engine random, math and type-only imports.',
          },
          { name: '@r15k/ui', message: 'sim must not import ui.' },
        ],
        patterns: [
          { regex: '^@r15k/(?!engine$)', message: 'sim imports only @r15k/engine.' },
          {
            regex: '(^|/)(view|sprites|i18n)(/|$)',
            message: 'sim must not import view, sprites or i18n.',
          },
          NODE_ONLY,
          TAURI_ONLY,
        ],
      },
    ],
    'no-restricted-globals': ['error', ...SIM_GLOBALS],
    'no-restricted-properties': ['error', RANDOM_BAN, ...TIME_BANS, ...APPROXIMATED],
    'no-restricted-syntax': [
      'error',
      ...SYNTAX_RUNTIME,
      NO_POW_OPERATOR,
      NO_ASYNC,
      NO_LOCALE_CALLS,
    ],
  },
};
