// R15K Arcade tools – platform patch: applies the game flags to the native projects Tauri generates
// (`apply`) and checks them in the built packages (`verify`); see cli.ts for the command lines.
// Idempotent, prints every change, and exits 1 with `anchor not found: <what> in <file>` when the
// generated files no longer look as expected, or with every missing flag of a built package.
import { exitWith, OUT } from '../shared/cli-output.ts';
import { applyAndroid, applyIos, GENERATED_PROJECTS } from './apply.ts';
import { parsePatchCommand, PATCH_USAGE } from './cli.ts';
import type { PatchCommand } from './cli.ts';
import { verifyAndroid, verifyAppleBundle } from './verify-artifacts.ts';

/** Runs a command; returns the problems found (apply prints its changes and finds none). */
function run(command: PatchCommand): readonly string[] {
  switch (command.kind) {
    case 'apply-android': {
      const lines = applyAndroid({
        projectDir: GENERATED_PROJECTS.android,
        ...(command.releaseSigning === undefined ? {} : { releaseSigning: command.releaseSigning }),
      });
      lines.forEach((line) => {
        OUT.info(line);
      });
      return [];
    }
    case 'apply-ios':
      applyIos(GENERATED_PROJECTS.ios).forEach((line) => {
        OUT.info(line);
      });
      return [];
    case 'verify-android':
      return verifyAndroid(command);
    case 'verify-apple':
      return verifyAppleBundle(command.platform, command.app);
  }
}

let command: PatchCommand;
try {
  command = parsePatchCommand(process.argv.slice(2));
} catch (error) {
  OUT.error(error instanceof Error ? error.message : String(error));
  OUT.error(PATCH_USAGE);
  exitWith(1);
}

try {
  const problems = run(command);
  problems.forEach((problem) => {
    OUT.error(`platform-patch: ${problem}`);
  });
  if (problems.length > 0) {
    exitWith(1);
  }
  if (command.kind.startsWith('verify')) {
    OUT.info('platform-patch: every required flag is present');
  }
} catch (error) {
  OUT.error(error instanceof Error ? error.message : String(error));
  exitWith(1);
}
exitWith(0);
