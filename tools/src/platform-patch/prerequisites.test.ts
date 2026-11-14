import { expect, test } from 'vitest';
import { prerequisiteProblems } from './prerequisites.ts';
import type { PrerequisiteContext } from './prerequisites.ts';

const ANDROID_ENV = { ANDROID_HOME: '/sdk', NDK_HOME: '/sdk/ndk/27', JAVA_HOME: '/jdk' };

/** A machine with every tool and folder, adjusted per test. */
function context(overrides: Partial<PrerequisiteContext> = {}): PrerequisiteContext {
  return {
    platform: 'android',
    hostPlatform: 'linux',
    env: ANDROID_ENV,
    projectDir: '/repo/apps/arcade/src-tauri/gen/android',
    hasProgram: () => true,
    exists: (path) => path !== '/repo/apps/arcade/src-tauri/gen/android',
    ...overrides,
  };
}

test('a prepared machine has no problems', () => {
  expect(prerequisiteProblems(context())).toEqual([]);
  expect(
    prerequisiteProblems(
      context({ platform: 'ios', hostPlatform: 'darwin', env: {}, exists: () => false }),
    ),
  ).toEqual([]);
});

test('missing Android toolchain variables and folders are reported', () => {
  expect(
    prerequisiteProblems(context({ env: { ANDROID_SDK_ROOT: '/sdk', NDK_HOME: '' } })),
  ).toEqual(['NDK_HOME is not set', 'JAVA_HOME is not set']);
  expect(
    prerequisiteProblems(context({ exists: (path) => path === '/sdk' || path === '/jdk' })),
  ).toEqual(['NDK_HOME names a missing folder: /sdk/ndk/27']);
});

test('iOS needs macOS and XcodeGen; every platform needs cargo and no generated project yet', () => {
  expect(prerequisiteProblems(context({ platform: 'ios' }))).toEqual([
    'the iOS project can only be generated on macOS',
  ]);
  expect(
    prerequisiteProblems(
      context({ platform: 'ios', hostPlatform: 'darwin', hasProgram: () => false }),
    ),
  ).toEqual(['cargo is not on PATH (Rust toolchain missing)', 'xcodegen is not on PATH']);
  expect(prerequisiteProblems(context({ exists: () => true }))).toEqual([
    '/repo/apps/arcade/src-tauri/gen/android already exists; delete it so that init generates it afresh',
  ]);
});
