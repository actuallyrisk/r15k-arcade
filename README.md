# R15K Arcade

A collection of small pixel games in the design of [r15k.dev](https://r15k.dev), built as one app for
Android, iOS/iPadOS, macOS and Windows. The first game is **Bug Hunt**: the cat catches falling bugs and
dodges Friday deploys. Free, offline, no ads, no tracking.

The app is a Tauri 2 shell around a TypeScript engine that draws everything into an indexed pixel
framebuffer (Canvas 2D, WebAudio, no runtime libraries).

## Repository

| Path              | Content                                                                |
| ----------------- | ---------------------------------------------------------------------- |
| `apps/arcade`     | The app: hub, intro, settings, top 10; Vite entry and the Tauri shell  |
| `packages/engine` | Loop, RNG, time, renderer, layout, input, audio, scenes, a11y, storage |
| `packages/ui`     | Palettes, bitmap fonts, pixel widgets and menu navigation              |
| `games/bug-hunt`  | Bug Hunt: deterministic simulation, round view, sprites, catalogs      |
| `plugins/device`  | Own Tauri plugin: immersive mode, keep-awake, move to background       |
| `tools`           | Verify runner, formatter, snapshots, content checks, audio render      |
| `docs/decisions`  | Decision records                                                       |

## Getting started

Node.js 24 (see `.node-version`) with Corepack:

```sh
corepack enable
pnpm install
pnpm dev
```

## Commands

| Command                        | What it does                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| `pnpm dev`                     | Renders audio if needed, serves the app at `http://localhost:5173`                       |
| `pnpm build`                   | Renders audio if needed, production web build (`apps/arcade/dist`)                       |
| `pnpm build:e2e`               | Web build in mode `e2e` (adds the CSP meta tag)                                          |
| `pnpm preview`                 | Serves the last build at `http://localhost:4173`                                         |
| `pnpm verify`                  | Every check of the CI `checks` job, step by step; `--step <id>` one                      |
| `pnpm typecheck`               | TypeScript for every package                                                             |
| `pnpm lint` / `pnpm lint:fix`  | ESLint with `--max-warnings 0` / with fixes                                              |
| `pnpm format` / `format:check` | Prettier over the files git would commit (optionally limited to paths)                   |
| `pnpm test`                    | Unit tests, replays and pixel snapshots (Vitest)                                         |
| `pnpm test:watch`              | Vitest in watch mode                                                                     |
| `pnpm test:coverage`           | Tests with the coverage gates                                                            |
| `pnpm test:e2e`                | E2E build plus Playwright in Chromium and WebKit                                         |
| `pnpm todo-check`              | To-do markers must carry an issue number                                                 |
| `pnpm snapshots:update`        | Re-renders pixel goldens (`--only <prefix>`), for intended changes                       |
| `pnpm replays:update`          | Re-records replays after simulation changes                                              |
| `pnpm assets`                  | Renders songs and sound effects (`--force`, `--check`)                                   |
| `pnpm icons`                   | Renders the app icons from the icon sprite                                               |
| `pnpm sprite-check`            | Validates sprites and fonts (`--only <ids>`)                                             |
| `pnpm i18n-check`              | Checks catalog parity, placeholders, glyphs and text fit                                 |
| `pnpm run licences`            | Licence report and dependency policy (`run`: bare `pnpm licences` is pnpm's own command) |
| `pnpm size-budget`             | Size budgets of the web build or a native package                                        |
| `pnpm native:prepare`          | Generates and patches a native project (`--platform android\|ios`)                       |
| `pnpm tauri …`                 | The Tauri CLI of the app                                                                 |

## Local and CI-only tooling

Everything above runs on a development machine with Node.js and pnpm alone; `pnpm test:e2e` needs the
Playwright browsers once (`pnpm --filter @r15k/arcade exec playwright install chromium webkit`).

Rust, the Android SDK and Xcode are needed only for native builds, which run in GitHub Actions on every
pull request (Android, iOS simulator, macOS, Windows). Locally, `pnpm verify` prints the Rust checks,
actionlint, shellcheck and gitleaks as `SKIPPED (… not installed – runs in CI)`; CI always runs them.

## Contributing

Code standards, tests, commits and the definition of done are in [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

The source code is MIT-licensed ([LICENSE](LICENSE)). Sprites, bitmap fonts, songs, rendered audio,
icons, logo, store graphics and the name and brand "R15K" are all rights reserved
([ASSETS-LICENSE.md](ASSETS-LICENSE.md)).
