// R15K Arcade tools – platform patch: copies the files the patch reads, still unpatched, out of a
// freshly generated native project into .tmp/native-generated/<platform>/ (paths relative to the
// project). CI uploads that folder, and the patch test fixtures are refreshed from it whenever the
// Tauri templates change, so template drift shows up as a reviewed fixture diff.
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { repoPath } from '../shared/repo-paths.ts';
import { anchorFiles } from './apply.ts';
import type { NativePlatform } from './apply.ts';

/** The snapshot folder of a platform. */
export function snapshotDir(platform: NativePlatform): string {
  return repoPath('.tmp', 'native-generated', platform);
}

/** Where to copy from and to. */
export interface SnapshotOptions {
  readonly platform: NativePlatform;
  readonly projectDir: string;
  readonly outDir: string;
}

/** Replaces the snapshot folder with copies of the anchor files; returns their relative paths. */
export function snapshotAnchorFiles(options: SnapshotOptions): readonly string[] {
  const files = anchorFiles(options.platform, options.projectDir);
  rmSync(options.outDir, { recursive: true, force: true });
  for (const file of files) {
    const target = join(options.outDir, file);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(options.projectDir, file), target);
  }
  return files;
}
