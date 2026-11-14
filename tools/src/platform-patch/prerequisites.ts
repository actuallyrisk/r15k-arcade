// R15K Arcade tools – `pnpm native:prepare` prerequisites, checked before `tauri <platform> init`
// runs, so a missing toolchain fails with one clear message instead of halfway through the init:
// Rust, the Android SDK, NDK and JDK (Android), macOS with XcodeGen on PATH (iOS; otherwise the init
// would install XcodeGen with Homebrew), and no generated project yet (init never overwrites files,
// so a stale project would hide template changes).

/** What the check looks at; injected so that it is testable without the real machine. */
export interface PrerequisiteContext {
  readonly platform: 'android' | 'ios';
  readonly hostPlatform: string;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly projectDir: string;
  readonly hasProgram: (name: string) => boolean;
  readonly exists: (path: string) => boolean;
}

/** A problem when an environment variable is unset or names a missing folder. */
function folderVariableProblem(context: PrerequisiteContext, names: readonly string[]): string[] {
  const value = names
    .map((name) => context.env[name])
    .find((entry) => entry !== undefined && entry !== '');
  if (value === undefined) {
    return [`${names.join(' or ')} is not set`];
  }
  return context.exists(value) ? [] : [`${names.join(' or ')} names a missing folder: ${value}`];
}

/** The Android toolchain problems. */
function androidProblems(context: PrerequisiteContext): readonly string[] {
  return [
    ...folderVariableProblem(context, ['ANDROID_HOME', 'ANDROID_SDK_ROOT']),
    ...folderVariableProblem(context, ['NDK_HOME']),
    ...folderVariableProblem(context, ['JAVA_HOME']),
  ];
}

/** The iOS toolchain problems. */
function iosProblems(context: PrerequisiteContext): readonly string[] {
  if (context.hostPlatform !== 'darwin') {
    return ['the iOS project can only be generated on macOS'];
  }
  return context.hasProgram('xcodegen') ? [] : ['xcodegen is not on PATH'];
}

/** Every unmet prerequisite of `native:prepare` for a platform (empty when ready). */
export function prerequisiteProblems(context: PrerequisiteContext): readonly string[] {
  return [
    ...(context.hasProgram('cargo') ? [] : ['cargo is not on PATH (Rust toolchain missing)']),
    ...(context.exists(context.projectDir)
      ? [`${context.projectDir} already exists; delete it so that init generates it afresh`]
      : []),
    ...(context.platform === 'android' ? androidProblems(context) : iosProblems(context)),
  ];
}
