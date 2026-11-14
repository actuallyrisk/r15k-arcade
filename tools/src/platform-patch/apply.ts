// R15K Arcade tools – platform patch `apply`: runs the file patches against a generated native
// project (src-tauri/gen/android or src-tauri/gen/apple) and reports every change as
// `platform-patch: <file>: <change>`. A file is written only when its text changed, so a second run
// changes nothing. Kotlin and Swift sources of the generated projects are never touched: all native
// behaviour lives in the app's own Tauri plugins.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { repoPath } from '../shared/repo-paths.ts';
import type { PatchResult } from './anchors.ts';
import { patchReleaseSigning } from './android-gradle.ts';
import { patchAndroidManifest } from './android-manifest.ts';
import { IOS_INFO_KEYS } from './apple-keys.ts';
import { patchGradleWrapper } from './gradle-wrapper.ts';
import { patchInfoPlist } from './info-plist.ts';
import { findInfoPlistPath, patchProjectYml } from './ios-project.ts';

/** A platform whose native project Tauri generates. */
export type NativePlatform = 'android' | 'ios';

/** The generated project of each platform. */
export const GENERATED_PROJECTS: Readonly<Record<NativePlatform, string>> = {
  android: repoPath('apps', 'arcade', 'src-tauri', 'gen', 'android'),
  ios: repoPath('apps', 'arcade', 'src-tauri', 'gen', 'apple'),
};

/** The files of the generated Android project that the patch reads, relative to the project. */
export const ANDROID_FILES = {
  manifest: 'app/src/main/AndroidManifest.xml',
  appGradle: 'app/build.gradle.kts',
  gradleWrapper: 'gradle/wrapper/gradle-wrapper.properties',
} as const;

/** The XcodeGen spec of the generated iOS project, relative to the project. */
export const IOS_PROJECT_SPEC = 'project.yml';

/** Reads a generated file; a missing one fails loudly. */
function readGenerated(projectDir: string, file: string): string {
  const path = join(projectDir, file);
  if (!existsSync(path)) {
    throw new Error(`generated file not found: ${file} in ${projectDir}`);
  }
  return readFileSync(path, 'utf8');
}

/** Patches one generated file and returns its report lines. */
function patchFile(
  projectDir: string,
  file: string,
  patch: (text: string) => PatchResult,
): readonly string[] {
  const text = readGenerated(projectDir, file);
  const result = patch(text);
  const label = `platform-patch: ${basename(file)}:`;
  if (result.text !== text) {
    writeFileSync(join(projectDir, file), result.text);
  }
  if (result.changes.length === 0) {
    return [`${label} up to date`];
  }
  return result.changes.map((change) => `${label} ${change}`);
}

/** The files the patch reads in a generated project (the unpatched snapshot copies exactly these). */
export function anchorFiles(platform: NativePlatform, projectDir: string): readonly string[] {
  if (platform === 'android') {
    return [ANDROID_FILES.manifest, ANDROID_FILES.appGradle, ANDROID_FILES.gradleWrapper];
  }
  return [IOS_PROJECT_SPEC, findInfoPlistPath(readGenerated(projectDir, IOS_PROJECT_SPEC))];
}

/** Options of the Android patch. */
export interface AndroidApplyOptions {
  readonly projectDir: string;
  /** Path of a keystore.properties file: signs the release build type with its keys. */
  readonly releaseSigning?: string;
}

/** Applies the game flags (and optionally release signing) to a generated Android project. */
export function applyAndroid(options: AndroidApplyOptions): readonly string[] {
  const { projectDir, releaseSigning } = options;
  return [
    ...patchFile(projectDir, ANDROID_FILES.manifest, patchAndroidManifest),
    ...patchFile(projectDir, ANDROID_FILES.gradleWrapper, patchGradleWrapper),
    ...(releaseSigning === undefined
      ? []
      : patchFile(projectDir, ANDROID_FILES.appGradle, (text) =>
          patchReleaseSigning(text, releaseSigning),
        )),
  ];
}

/** Applies the iOS Info.plist keys to the XcodeGen spec and the generated Info.plist. */
export function applyIos(projectDir: string): readonly string[] {
  const plistPath = findInfoPlistPath(readGenerated(projectDir, IOS_PROJECT_SPEC));
  return [
    ...patchFile(projectDir, IOS_PROJECT_SPEC, (text) => patchProjectYml(text, IOS_INFO_KEYS)),
    ...patchFile(projectDir, plistPath, (text) => patchInfoPlist(text, IOS_INFO_KEYS)),
  ];
}
