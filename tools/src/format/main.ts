// R15K Arcade tools – `pnpm format` (--write) and `pnpm format:check` (--check), optionally restricted to
// repository-relative paths: node tools/src/format/main.ts --check|--write [paths…]. Exit 1 when check
// finds unformatted files.
import { exitWith, OUT } from '../shared/cli-output.ts';
import { listRepoFiles } from '../shared/repo-files.ts';
import { formatFiles, selectFiles } from './format-files.ts';

const [mode, ...paths] = process.argv.slice(2);
if (mode !== '--check' && mode !== '--write') {
  OUT.error('usage: node tools/src/format/main.ts --check|--write [paths…]');
  exitWith(1);
}

const files = selectFiles(listRepoFiles(), paths);
const outcome = await formatFiles({ mode: mode === '--check' ? 'check' : 'write', files });
for (const file of outcome.written) {
  OUT.info(`formatted ${file}`);
}
for (const file of outcome.unformatted) {
  OUT.error(`not formatted: ${file}`);
}
if (outcome.unformatted.length > 0) {
  OUT.error(
    `${outcome.unformatted.length} of ${outcome.checked.length} files are not formatted (run pnpm format)`,
  );
  exitWith(1);
}
OUT.info(`${outcome.checked.length} files checked, ${outcome.written.length} rewritten`);
exitWith(0);
