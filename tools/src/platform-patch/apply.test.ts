import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { ANDROID_FILES, anchorFiles, applyAndroid, applyIos } from './apply.ts';
import { snapshotAnchorFiles } from './snapshot.ts';
import { expected, fixture } from './test-support/fixtures.ts';

let folder = '';

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'r15k-'));
});

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
});

/** Writes files into a fake generated project and returns its folder. */
function fakeProject(name: string, files: Readonly<Record<string, string>>): string {
  const projectDir = join(folder, name);
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(dirname(join(projectDir, file)), { recursive: true });
    writeFileSync(join(projectDir, file), text);
  }
  return projectDir;
}

/** A fake gen/android tree made of the fixtures. */
function androidProject(): string {
  return fakeProject('android', {
    [ANDROID_FILES.manifest]: fixture('android/AndroidManifest.xml'),
    [ANDROID_FILES.appGradle]: fixture('android/build.gradle.kts'),
    [ANDROID_FILES.gradleWrapper]: fixture('android/gradle-wrapper.properties'),
    'app/src/main/java/dev/r15k/arcade/MainActivity.kt': 'class MainActivity\n',
  });
}

/** A fake gen/apple tree made of the fixtures. */
function iosProject(): string {
  return fakeProject('apple', {
    'project.yml': fixture('ios/project.yml'),
    'r15k-arcade_iOS/Info.plist': fixture('ios/Info.plist'),
  });
}

const read = (projectDir: string, file: string): string =>
  readFileSync(join(projectDir, file), 'utf8');

test('apply patches the generated Android project and a second run changes nothing', () => {
  const projectDir = androidProject();
  const first = applyAndroid({ projectDir });
  expect(first).toContain(
    'platform-patch: AndroidManifest.xml: application@android:isGame = "true"',
  );
  expect(read(projectDir, ANDROID_FILES.manifest)).toBe(expected('android/AndroidManifest.xml'));
  expect(read(projectDir, ANDROID_FILES.gradleWrapper)).toBe(
    expected('android/gradle-wrapper.properties'),
  );
  expect(read(projectDir, ANDROID_FILES.appGradle)).toBe(fixture('android/build.gradle.kts'));
  expect(read(projectDir, 'app/src/main/java/dev/r15k/arcade/MainActivity.kt')).toBe(
    'class MainActivity\n',
  );
  expect(applyAndroid({ projectDir })).toEqual([
    'platform-patch: AndroidManifest.xml: up to date',
    'platform-patch: gradle-wrapper.properties: up to date',
  ]);
});

test('apply with release signing also patches the app build file', () => {
  const projectDir = androidProject();
  const releaseSigning = '/home/runner/work/_temp/keystore.properties';
  applyAndroid({ projectDir, releaseSigning });
  expect(read(projectDir, ANDROID_FILES.appGradle)).toBe(expected('android/build.gradle.kts'));
  expect(applyAndroid({ projectDir, releaseSigning })).toContain(
    'platform-patch: build.gradle.kts: up to date',
  );
});

test('apply patches the generated iOS project and a second run changes nothing', () => {
  const projectDir = iosProject();
  const first = applyIos(projectDir);
  expect(first).toContain('platform-patch: project.yml: GCSupportsGameMode = true (added)');
  expect(read(projectDir, 'project.yml')).toBe(expected('ios/project.yml'));
  expect(read(projectDir, 'r15k-arcade_iOS/Info.plist')).toBe(expected('ios/Info.plist'));
  expect(applyIos(projectDir)).toEqual([
    'platform-patch: project.yml: up to date',
    'platform-patch: Info.plist: up to date',
  ]);
});

test('a missing generated file fails loudly', () => {
  const projectDir = fakeProject('empty', {});
  expect(() => applyAndroid({ projectDir })).toThrow(
    'generated file not found: app/src/main/AndroidManifest.xml',
  );
  expect(() => applyIos(projectDir)).toThrow('generated file not found: project.yml');
});

test('the unpatched snapshot copies exactly the anchor files, before apply changes them', () => {
  const projectDir = androidProject();
  const outDir = join(folder, 'snapshot', 'android');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'stale.txt'), 'stale');
  const copied = snapshotAnchorFiles({ platform: 'android', projectDir, outDir });
  applyAndroid({ projectDir });
  expect(copied).toEqual(anchorFiles('android', projectDir));
  for (const file of copied) {
    expect(read(outDir, file)).toBe(fixture(`android/${file.split('/').at(-1) ?? ''}`));
  }
  expect(() => read(outDir, 'stale.txt')).toThrow();
});

test('the iOS snapshot finds the Info.plist through the XcodeGen spec', () => {
  const projectDir = iosProject();
  const outDir = join(folder, 'snapshot', 'ios');
  expect(snapshotAnchorFiles({ platform: 'ios', projectDir, outDir })).toEqual([
    'project.yml',
    'r15k-arcade_iOS/Info.plist',
  ]);
  expect(read(outDir, 'r15k-arcade_iOS/Info.plist')).toBe(fixture('ios/Info.plist'));
});
