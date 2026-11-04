# 0007 – Own Tauri plugin `plugins/device`

- Status: accepted (2026-11-04)
- Deciders: owner

## Context

R15K Arcade needs three native features that the web view cannot provide and no official Tauri
plugin covers:

- **Immersive mode** on Android during rounds (system bars hidden, shown again by a swipe).
- **Keep-awake** during rounds on Android and iOS (the screen must not dim while a player watches
  the falling bugs without touching the screen).
- **Move to background** when the Android back button is pressed at the hub, the platform convention
  for a root screen.

Posture and display segments of foldables (Jetpack WindowManager) will be needed later as well.

The alternatives were community plugins or Rust crates with Objective-C/Swift bindings (third-party
code in the app, and the app's dependency policy allows no third-party crates), a JavaScript
interface injected by a patched `MainActivity` (Kotlin inside the generated Android project, which
must stay as Tauri generates it), and a plugin of our own.

## Decision

- One own Tauri 2 mobile plugin in `plugins/device`: Kotlin on Android, Swift on iOS, and a Rust
  crate that only registers them. The Rust side has no command handlers; Tauri forwards plugin
  commands that Rust does not handle to the registered mobile plugin.
- Three commands: `set_immersive { enabled }` (Android), `set_keep_awake { enabled }` (Android and
  iOS) and `move_to_background` (Android). iOS needs no immersive command, because its Info.plist
  hides the status bar, and has no back button.
- No third-party crates, no Objective-C bindings, no JavaScript interface from an activity template
  and no guest-js package: the engine's Tauri platform adapter invokes the commands directly through
  `@tauri-apps/api/core`.
- Platform APIs only. The Android library depends only on Tauri's own Android library (no AndroidX
  or other Maven dependency), and the Swift package only on Tauri's Swift package.
- The generated native projects stay as Tauri generates them, apart from the manifest, Gradle and
  plist flags that the platform patch script sets; the plugin is linked into them by Tauri's standard
  plugin mechanism. Desktop builds register nothing, and the app reports the features as unavailable
  there.

## Consequences

- Kotlin and Swift exist in the repository and are formatted and linted in CI (ktlint,
  swift-format); like the Rust side, they are compiled only in CI.
- The capability grants exactly the plugin's default permission set, which allows exactly the three
  commands.
- R8 keep rules ship with the Android library. CI checks that the plugin class and its three command
  methods survive in the release APK, and the Android emulator smoke test checks that a round
  reaches the plugin (each command logs one line).
- iOS keep-awake can only be compiled, linted and linked in CI; it is verified on a device before
  store work.
- The plugin grows posture and display segments later (Jetpack WindowManager); that adds a platform
  SDK dependency and gets its own decision record.
