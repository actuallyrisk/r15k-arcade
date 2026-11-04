# 0001 – Tech stack: Tauri 2 + TypeScript, TypeScript 6.0

- Status: accepted (2026-11-04)
- Deciders: owner (planning interview)

## Context

R15K Arcade ships to Android, iOS/iPadOS, macOS and Windows from one codebase, must stay small, be
written to strict code standards and reuse the look of r15k.dev. Candidates were Tauri 2 with a
TypeScript engine, Godot 4, Flutter + Flame and Defold.

## Decision

- Tauri 2 as the native shell for all four platforms; Rust only as thin glue.
- Game code in TypeScript with an own, dependency-free engine on Canvas 2D and WebAudio.
- TypeScript **6.0.x**, not 7.x: `typescript-eslint` 8.72 declares `typescript >=4.8.4 <6.1.0`, and the
  type-checked lint rules are a hard requirement of the code standards.

## Consequences

- Smallest app sizes of all candidates, the Immomentor toolchain (pnpm, ESLint, Prettier, Vitest), and a
  browser dev loop without native toolchains.
- Rendering performance depends on the system WebView; the game is designed for a small indexed
  framebuffer, which is cheap on every WebView.
- Native features (posture, share sheet, games services, purchases) need own Tauri plugins.
- Revisit the TypeScript pin when `typescript-eslint` supports TypeScript 7; Renovate must not bump
  `typescript` beyond `<6.1` until then.
