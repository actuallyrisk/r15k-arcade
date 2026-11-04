# 0005 – Build-tool-internal downloads

- Status: accepted (2026-11-04)
- Deciders: owner

## Context

CI is supply-chain conscious: it uses only GitHub's own `actions/*`, each pinned by commit SHA, and
every tool it downloads itself (actionlint, shellcheck, gitleaks, cargo-audit, OSV-Scanner, ktlint,
XcodeGen) is pinned by version and verified by SHA-256 before it runs. No third-party action is used.

The pinned build tools themselves still fetch a few things on their own while they run, and the
repository cannot pin those the same way:

- **Homebrew bottles during `tauri ios init`.** The Tauri CLI installs missing iOS tools with Homebrew:
  XcodeGen, `libimobiledevice` (`idevicesyslog`) and CocoaPods. XcodeGen is installed beforehand from its
  pinned release zip, so Homebrew never installs it; the other two come from Homebrew when the runner
  image lacks them. Homebrew verifies the checksum of every bottle; the version is the one of the
  runner's Homebrew.
- **NSIS and `nsis_tauri_utils`** for the Windows setup, downloaded by the Tauri bundler. Version and
  hash are fixed inside the pinned Tauri CLI.
- **The Gradle distribution**, fetched by the wrapper of the generated Android project. Its checksum is
  enforced through `distributionSha256Sum`, which the platform patch writes for the known Gradle
  version and refuses to guess for an unknown one.
- **Gradle and Maven dependencies** (Android Gradle Plugin, Kotlin, AndroidX), resolved by Gradle with
  the versions of the Tauri template of the pinned CLI, the same kind of dependency resolution as for
  crates and npm packages.
- **Rust toolchain, Android SDK packages and the emulator image**, installed by `rustup` and
  `sdkmanager` in the pinned versions; both installers verify what they download.

## Decision

These downloads are accepted. They are verified by the tool that makes them, never reach runtime code
(the app contains only our own code, the Tauri runtime and the allowed Tauri plugins) and cannot be
pinned by the repository without replacing the tools. Everything CI downloads by itself stays pinned by
version and SHA-256.

## Consequences

- The list above is reviewed on every Tauri CLI upgrade, because the CLI decides what the iOS
  initialisation, the bundler and the Android template fetch.
- A new download of this kind (a new tool fetched by a build tool, or a tool that stops verifying what
  it fetches) needs an update of this decision record before it is accepted.
- A Gradle upgrade through a new Tauri template fails the platform patch until the new distribution
  checksum is added, so it is always reviewed.
