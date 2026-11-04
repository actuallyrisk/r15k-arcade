// R15K Arcade tools – `pnpm icons`: renders the app icon sprite in the light palette (slot 0 transparent)
// and lets `tauri icon` produce every platform icon in apps/arcade/src-tauri/icons (and in the generated
// native projects when they exist). Icons are build outputs, never committed; the source sprite and the
// outputs fall under ASSETS-LICENSE.md.
import { APP_ICON_SPRITE_SHEET } from '@r15k/arcade';
import { buildPaletteLut, compileSpriteSheet } from '@r15k/engine';
import { PALETTES } from '@r15k/ui';
import { exitWith, OUT } from '../shared/cli-output.ts';
import { REPO_ROOT } from '../shared/repo-paths.ts';
import { runPnpm } from '../shared/run-command.ts';
import { generateIcons, ICON_PATHS } from './generate-icons.ts';

if (process.argv.length > 2) {
  OUT.error(`unexpected argument(s): ${process.argv.slice(2).join(' ')}; usage: pnpm icons`);
  exitWith(1);
}

try {
  const result = generateIcons({
    root: REPO_ROOT,
    sprite: compileSpriteSheet(APP_ICON_SPRITE_SHEET)['app-icon'],
    lut: buildPaletteLut(PALETTES.light.colors),
    runTauriIcon: (source, output) =>
      runPnpm(['--filter', '@r15k/arcade', 'exec', 'tauri', 'icon', source, '-o', output]),
  });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
} catch (error: unknown) {
  OUT.error(error instanceof Error ? error.message : String(error));
  exitWith(1);
}
OUT.info(`icons written to ${ICON_PATHS.iconsFolder} (sources in ${ICON_PATHS.sourceFolder})`);
exitWith(0);
