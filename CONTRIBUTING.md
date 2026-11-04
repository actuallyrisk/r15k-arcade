# Contributing to R15K Arcade

R15K Arcade is one app with a collection of small pixel games in the design of r15k.dev. This document is
the complete set of rules for code, tests, commits and checks in this repository. Tracked files refer to
its headings (for example "CONTRIBUTING.md, Code standards").

## Setup

- **Node.js 24 LTS.** The exact version is in `.node-version`; `package.json` accepts `>=24.19.0 <25`.
- **pnpm through Corepack.** Run `corepack enable` once; the pinned pnpm version comes from the
  `packageManager` field of `package.json`.
- `pnpm install` installs the whole workspace from the lockfile.
- `pnpm dev` renders the audio if needed and serves the app at `http://localhost:5173`. Day-to-day game
  work needs nothing else: the browser is the development loop.
- `pnpm test:e2e` builds the app in E2E mode and runs Playwright. Download its browsers once with
  `pnpm --filter @r15k/arcade exec playwright install chromium webkit`.
- Rust, Android and Apple toolchains are needed only for native builds, and those run in CI. Nothing
  native has to be installed for local work.
- The app makes no network requests at runtime. Everything it needs is bundled, and everything it stores
  stays on the device.

## Code standards

### TypeScript

- One shared `tsconfig.base.json` with `strict` plus `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`,
  `noPropertyAccessFromIndexSignature`, `useUnknownInCatchVariables`, `verbatimModuleSyntax`,
  `isolatedModules`, `erasableSyntaxOnly`, `allowImportingTsExtensions`, `noUnusedLocals`,
  `noUnusedParameters` and `allowUnreachableCode: false`; target ES2022, module ESNext, module
  resolution `Bundler`, no emit.
- Packages are consumed as TypeScript sources (ADR 0006): every package exports `./src/index.ts`, and
  Vite, Vitest, Playwright and Node 24 read the sources directly. Only erasable syntax is allowed.
- Relative imports carry the `.ts` extension; other packages are imported by their name only
  (`@r15k/engine`), never through deep paths.
- No `any` (explicit or implicit), no non-null assertions (`!`), no `@ts-ignore`. `@ts-expect-error` is
  allowed only in tests, with a reason.

### ESLint

- typescript-eslint `strictTypeChecked` and `stylisticTypeChecked`, run with `--max-warnings 0`.
- Explicit return types on exported functions, consistent type imports, exhaustive switches.
- Size limits: at most 300 code lines per file, 40 code lines per function, complexity 10, nesting depth
  3 and 3 parameters (pass an options object beyond that). Blank lines and comment lines are not
  counted. Tests follow exactly the same rules, without exceptions.
- Banned everywhere: `Math.random` (use the engine RNG), `Date.now`, `performance.now` and `new Date()`
  outside the engine's time and loop modules (use the injected clock), `console` outside the engine
  logger, default exports (except in tool configs whose tool requires one: Vite, Vitest, Playwright,
  ESLint, commitlint), `enum`, `var`, `any`, non-null assertions and `@ts-ignore`.

### Deterministic simulation

The simulation folder of every game (`games/*/src/sim`) is pure and deterministic, so replays reproduce
exactly on every device:

- it imports only the engine's random and math functions and type-only imports;
- no DOM, no browser globals, no clocks, no timers, no async code;
- no implementation-approximated `Math` functions (`sin`, `cos`, `exp`, `log`, `pow`, `sqrt`, `hypot`,
  …) and no `**` operator: only the operations ECMAScript specifies exactly;
- no locale-dependent calls (`localeCompare`, `toLocale…`).

### Package boundaries

- `packages/engine` imports nothing from the workspace; `packages/ui` imports only the engine; a game
  imports only the engine and the UI package and never another game; `apps/arcade` may import
  everything. No import cycles.
- `tools/` is development-only and is never imported by runtime code. Runtime code imports no Node
  built-ins.
- Only the three engine Tauri adapters (`platform/tauri-platform.ts`, `platform/select-platform.ts`,
  `storage/tauri-store-adapter.ts`) import Tauri packages: `@tauri-apps/api/core` statically, every
  other Tauri module lazily with a literal `import()`. A module imported both ways would fail the Vite
  build.
- Tools start processes only through `tools/src/shared/run-command.ts` (no shell with an argument
  array, Windows-safe pnpm).

### Naming and structure

- Files `kebab-case.ts`; types and classes `PascalCase`; functions and variables `camelCase`;
  `UPPER_SNAKE_CASE` only for module-level constants. Booleans read as questions (`isPaused`,
  `hasFocus`, `canSpawn`). Full words, except well-known short names (`x`, `y`, `dt`, `rng`, `id`, `ui`).
- One concept per file. Named exports only; each package exposes a single `src/index.ts`.
- Data first: `readonly` types and `as const` tables, string literal unions instead of enums,
  `undefined` instead of `null` (except where DOM APIs return `null`).
- Logic as pure functions. Classes only for long-lived services that own resources (renderer, mixer,
  input manager, storage).
- No magic numbers in game code: every tuning value lives in the game's `content/tuning.ts` with a
  one-line TSDoc comment saying what it controls.
- Errors are never swallowed silently. Scene and loop boundaries catch, log through the engine logger
  (development builds only) and fall back to a safe state.

### Comments and documentation

- English. Comments explain why, not what. TSDoc on every exported symbol.
- No commented-out code.
- To-do markers only with an issue number: `TODO(#123)` or `FIXME(#123)`. The to-do check fails on
  every marker without one.
- Every config, workflow, script, tool and plugin file starts with a short header comment that states
  its purpose and its non-obvious constraints. JSON files without comments use a `description` field
  where their schema has one.

### Rust, Kotlin and Swift

- Rust is glue only: plugin registration, window and platform setup. No game logic in Rust.
  `cargo fmt --check` and `cargo clippy --all-targets -- -D warnings` must pass; no `unwrap()` outside
  tests (use `expect` with a message for unrecoverable startup errors). The toolchain is pinned in
  `rust-toolchain.toml`.
- Kotlin and Swift exist only inside `plugins/`, formatted and linted with ktlint and swift-format.
  Keep them minimal and documented.

## Formatting

- Prettier with `semi: true`, `singleQuote: true`, `trailingComma: "all"`, `printWidth: 100`,
  `tabWidth: 2`, `useTabs: false`, `bracketSpacing: true`, `arrowParens: "always"`, `endOfLine: "lf"`
  (`.prettierrc.json`).
- EditorConfig: UTF-8, LF, two spaces (four for Rust and Kotlin), final newline, no trailing whitespace
  except in Markdown.
- `pnpm format` formats and `pnpm format:check` checks exactly the files git would commit. Never
  formatted (`.prettierignore`): lockfiles, the changelog, the JSON files that release-please rewrites
  (every `package.json`, `tauri.conf.json`, the release manifest), build output, coverage, reports,
  rendered audio, generated native projects and icons, verbatim song copies, recorded replays and
  platform-patch fixtures.

## Tests

- Vitest, with test files next to the code (`*.test.ts`); DOM-facing tests opt in per file with
  `// @vitest-environment happy-dom`. A test fails on unexpected console warnings or errors.
- Coverage gates (CI fails below, all four metrics): game simulations ≥ 90 %, `packages/engine` ≥ 80 %,
  `packages/ui` ≥ 70 %.
- **Replays** reproduce recorded rounds exactly (see "Replays").
- **Pixel snapshots:** scenes render into the indexed framebuffer in Node and are compared with golden
  PNGs for every palette (light, dark, high contrast, Game Boy). Update goldens only for intended
  changes, with `pnpm snapshots:update`, and explain the change in the pull request. CI uploads diff
  images when a snapshot fails.
- **E2E:** Playwright in Chromium and WebKit at every reference viewport: start → round → top-10 entry
  → settings → reload keeps the data.
- **Real builds:** CI installs and launches the Android build in an emulator and the iOS build in a
  simulator, takes a screenshot and fails on a crash.

## Replays

`games/*/replays/*.json` hold a seed, the mode, the content version and an input log, and the replay must
reproduce the recorded final state hash exactly. Every change of a simulation tuning value, of the
simulation code's behaviour or of the content version changes them. Re-record consciously with
`pnpm replays:update`, bump the content version when the content changed, and say so in the pull
request.

## Commits and pull requests

- Conventional Commits in English, with the types and scopes of `commitlint.config.mjs` (scopes:
  `engine`, `ui`, `bug-hunt`, `arcade`, `plugins`, `tauri`, `android`, `ios`, `macos`, `windows`, `ci`,
  `deps`, `tools`, `docs`).
- Branches: `feat/…`, `fix/…`, `chore/…`, `ci/…`, `docs/…`, `refactor/…`. Dependency updates arrive on
  `chore/deps-…`, release pull requests on `release-please--branches--main`.
- Pull requests go only into `main`, after review. They are squash-merged: the pull request title is the
  whole commit message and is checked by commitlint; pull request descriptions never become commits.
- The only author is the repository owner. No co-author trailers, no lines naming a tool that wrote
  something and no tool attribution of any kind in commits, pull requests, issues, reviews or files.
- release-please and Renovate run as pinned command-line tools with the owner's token. Their pull
  request and issue texts are written in this repository's own words, and nothing is ever merged
  automatically.

## Checks

- `pnpm verify` runs locally exactly what the CI `checks` job runs, step by step: typecheck, ESLint,
  Prettier, to-do markers, unit tests with replays, pixel snapshots and coverage gates, sprite check,
  i18n check, audio render, web build, size budgets, licence report and dependency policy, icons,
  actionlint with shellcheck, gitleaks, `cargo fmt` and clippy. `pnpm verify --step <id>` runs one
  step, which is what CI calls.
- actionlint, shellcheck, gitleaks, `cargo fmt` and clippy run only where their tools are installed;
  locally they print `SKIPPED (… not installed – runs in CI)`. With `--ci` (CI) a skipped step fails.
- A step passes only with zero errors and zero warnings: ESLint runs with `--max-warnings 0`, Vite fails
  on every build warning, tests fail on console warnings, and the runner fails a step whose output holds
  any warning line.

## Definition of done

A change is done when all of this holds:

1. `pnpm verify` passes locally with zero errors and zero warnings.
2. New or changed behaviour is covered by tests: unit tests, replays or pixel goldens, whichever fits.
3. The change was checked visually in the browser (`pnpm dev`) at every reference viewport, with
   screenshots in the pull request.
4. The README and the decision records are current.

## Dependencies

- Zero third-party JavaScript packages at runtime. Allowed at runtime: `@tauri-apps/api`, the official
  Tauri plugins store, haptics, window-state, opener, dialog, fs and os, and our own Tauri plugins in
  `plugins/`. Any other runtime dependency needs a decision record and the owner's approval.
- No third-party Rust crates in the app or its plugins without a decision record.
- Development dependencies are exact versions from the pnpm catalog in `pnpm-workspace.yaml`, with a
  minimum release age of one day, and are updated by Renovate. Dependency build scripts are disabled;
  each reviewed package is listed in `allowBuilds`.
- Tools that CI downloads are pinned by version and verified by SHA-256. GitHub actions come only from
  `actions/*` and are pinned by commit SHA.

## Decisions

Trade-offs are recorded as decision records in `docs/decisions/NNNN-short-title.md` with the sections
Context, Decision and Consequences. Every record is self-contained and public: it describes the decision
on its own.
