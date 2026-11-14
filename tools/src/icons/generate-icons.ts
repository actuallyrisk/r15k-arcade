// R15K Arcade tools – the icon pipeline: renders .tmp/icons/app-icon.png (1024 × 1024) and
// Wide310x150Logo.png, runs `tauri icon` on the first (from apps/arcade, output src-tauri/icons) and copies
// the wide logo there. Nothing is copied into src-tauri/gen: `tauri icon` writes the Android and iOS icons
// into the generated projects itself when they exist, so this pipeline never reads icons/android.
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CompiledSprite } from '@r15k/engine';
import { encodePng } from '../png/png-encode.ts';
import type { CommandResult } from '../shared/run-command.ts';
import { ICON_SCALE, placeCentred, renderIcon, WIDE_LOGO } from './render-icon.ts';

/** Paths of the icon pipeline, relative to the repository root. */
export const ICON_PATHS = {
  sourceFolder: '.tmp/icons',
  iconsFolder: 'apps/arcade/src-tauri/icons',
  /** The source image as `tauri icon` sees it from apps/arcade. */
  tauriSource: '../../.tmp/icons/app-icon.png',
  /** The output folder as `tauri icon` sees it from apps/arcade. */
  tauriOutput: 'src-tauri/icons',
} as const;

/** What the pipeline needs (the repository root is a temporary folder in tests). */
export interface IconPipeline {
  readonly root: string;
  readonly sprite: CompiledSprite;
  readonly lut: Uint32Array;
  /** Runs `tauri icon <source> -o <output>` in apps/arcade. */
  readonly runTauriIcon: (source: string, output: string) => CommandResult;
}

/** Renders the source images, runs `tauri icon` and copies the wide logo; throws when tauri fails. */
export function generateIcons(pipeline: IconPipeline): CommandResult {
  const source = join(pipeline.root, ICON_PATHS.sourceFolder);
  mkdirSync(source, { recursive: true });
  const icon = renderIcon(pipeline.sprite, { lut: pipeline.lut, scale: ICON_SCALE });
  writeFileSync(join(source, 'app-icon.png'), encodePng(icon));
  const small = renderIcon(pipeline.sprite, { lut: pipeline.lut, scale: WIDE_LOGO.iconScale });
  const wide = placeCentred(small, { width: WIDE_LOGO.width, height: WIDE_LOGO.height });
  writeFileSync(join(source, 'Wide310x150Logo.png'), encodePng(wide));
  const result = pipeline.runTauriIcon(ICON_PATHS.tauriSource, ICON_PATHS.tauriOutput);
  if (result.status !== 0) {
    throw new Error(`tauri icon failed (exit ${result.status}):\n${result.stdout}${result.stderr}`);
  }
  const icons = join(pipeline.root, ICON_PATHS.iconsFolder);
  mkdirSync(icons, { recursive: true });
  copyFileSync(join(source, 'Wide310x150Logo.png'), join(icons, 'Wide310x150Logo.png'));
  return result;
}
