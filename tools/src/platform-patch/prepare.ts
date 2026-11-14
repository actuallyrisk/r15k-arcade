// R15K Arcade tools – `pnpm native:prepare --platform android|ios` (CI, or a Mac / Android Studio
// setup): checks the prerequisites, generates the native project with `tauri <platform> init --ci`,
// renders the app icons into it (`pnpm icons`), copies the unpatched anchor files to
// .tmp/native-generated/<platform>/ and applies the platform patch. Stops at the first failure.
import { existsSync } from 'node:fs';
import { exitWith, OUT } from '../shared/cli-output.ts';
import { runCommand, runPnpm } from '../shared/run-command.ts';
import type { CommandResult } from '../shared/run-command.ts';
import { applyAndroid, applyIos, GENERATED_PROJECTS } from './apply.ts';
import type { NativePlatform } from './apply.ts';
import { parsePreparePlatform, PREPARE_USAGE } from './cli.ts';
import { prerequisiteProblems } from './prerequisites.ts';
import { snapshotAnchorFiles, snapshotDir } from './snapshot.ts';

/** Prints a finished command's output and fails when it did not succeed. */
function report(result: CommandResult, label: string): void {
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
}

/** Every step of the preparation, in order. */
function prepare(platform: NativePlatform): void {
  const projectDir = GENERATED_PROJECTS[platform];
  const problems = prerequisiteProblems({
    platform,
    hostPlatform: process.platform,
    env: process.env,
    projectDir,
    hasProgram: (name) => runCommand(name, ['--version']).status === 0,
    exists: existsSync,
  });
  if (problems.length > 0) {
    throw new Error(`native:prepare prerequisites not met:\n  ${problems.join('\n  ')}`);
  }
  OUT.info(`> native:prepare: tauri ${platform} init --ci`);
  report(runPnpm(['tauri', platform, 'init', '--ci']), `tauri ${platform} init`);
  OUT.info('> native:prepare: pnpm icons');
  report(runPnpm(['icons']), 'pnpm icons');
  const outDir = snapshotDir(platform);
  for (const file of snapshotAnchorFiles({ platform, projectDir, outDir })) {
    OUT.info(`> native:prepare: unpatched copy of ${file} in ${outDir}`);
  }
  const lines = platform === 'android' ? applyAndroid({ projectDir }) : applyIos(projectDir);
  lines.forEach((line) => {
    OUT.info(line);
  });
}

let platform: NativePlatform;
try {
  platform = parsePreparePlatform(process.argv.slice(2));
} catch (error) {
  OUT.error(error instanceof Error ? error.message : String(error));
  OUT.error(PREPARE_USAGE);
  exitWith(1);
}

try {
  prepare(platform);
} catch (error) {
  OUT.error(error instanceof Error ? error.message : String(error));
  exitWith(1);
}
exitWith(0);
