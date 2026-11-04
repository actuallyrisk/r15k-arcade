# 0002 – Native projects are generated in CI and patched by a script

- Status: accepted (2026-11-04)
- Deciders: owner

## Context

Tauri creates the Android project (`src-tauri/gen/android`) with `tauri android init` and the Xcode
project (`src-tauri/gen/apple`) with `tauri ios init`. The Xcode project can only be generated on macOS,
and the development machine runs Windows with no native toolchains (owner decision: native builds only
in CI). The original plan was to commit both projects and edit them by hand.

## Decision

- `src-tauri/gen/` is gitignored and generated in every CI build.
- All native customisation is applied afterwards by `tools/platform-patch`:
  - It is written in TypeScript, idempotent, and covered by unit tests against fixture copies of the
    generated files.
  - It fails loudly when an expected anchor (manifest element, plist key, Gradle block) is missing, so a
    Tauri upgrade cannot silently drop a game flag.
  - It prints every change it makes.
- Swift and Kotlin glue lives in `plugins/` or as templates next to the patch script.

## Consequences

- No Mac is needed to maintain the iOS project, diffs stay small and reviewable, and every build is
  reproducible from the repository.
- Tauri upgrades can move anchors; the patch tests and the loud failure make that visible in the PR.
- Opening the native projects in Android Studio or Xcode requires running init + patch first
  (`pnpm native:prepare`).
