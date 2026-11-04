# 0006 – Workspace packages as TypeScript sources without project references

- Status: accepted (2026-11-04)
- Deciders: owner

## Context

The repository is a pnpm workspace with an engine, a UI package, one package per game, the app and the
development tools. The app is bundled by Vite, tests run in Vitest and Playwright, and the tools run
directly in Node 24, which executes TypeScript files by stripping their types. Compiling every package to
JavaScript with TypeScript project references would add a build step between packages, emitted files and
declaration maps to keep in sync, and a second resolution path for every import.

## Decision

- Every workspace package exports its TypeScript source: `"exports": { ".": "./src/index.ts" }`.
- No emit and no project references. One shared `tsconfig.base.json` holds the compiler options
  (`noEmit`, `allowImportingTsExtensions`, `erasableSyntaxOnly`, bundler resolution); every package has
  a small `tsconfig.json` with its own `lib`, `types` and `include`.
- Vite, Vitest, Playwright and Node 24 (type stripping, workspace symlinks resolved to their real path
  outside `node_modules`) consume the sources directly.
- Relative imports carry the `.ts` extension; packages are imported by name only.

## Consequences

- There is no build step between packages: a change in the engine is visible in the app, the tests and
  the tools at once.
- Each package type-checks itself and, through its imports, the sources of its dependencies, so a
  package needs the DOM types wherever it reaches engine sources.
- Only erasable TypeScript syntax is allowed (no enums, namespaces or parameter properties), because Node
  strips types without transforming code.
- Barrels and every module reachable from them stay free of bundler-only features (`import.meta.env`,
  `import.meta.glob`, JSON imports): the tools import the barrels in plain Node. A test imports all
  barrels in a plain Node process to keep it that way.
