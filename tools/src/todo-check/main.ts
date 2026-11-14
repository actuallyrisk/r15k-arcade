// R15K Arcade tools – `pnpm todo-check [paths…]`: scans the text files git would commit (optionally only
// those under the given repository-relative paths) for to-do markers without an issue number and exits 1
// when it finds one.
import { readFileSync } from 'node:fs';
import { selectFiles } from '../format/format-files.ts';
import { exitWith, OUT } from '../shared/cli-output.ts';
import { listRepoFiles } from '../shared/repo-files.ts';
import { repoPath } from '../shared/repo-paths.ts';
import { findTodoMarkers, isScannedFile } from './check.ts';

const paths = process.argv.slice(2);
const flag = paths.find((path) => path.startsWith('--'));
if (flag !== undefined) {
  OUT.error(`unknown argument '${flag}'; usage: pnpm todo-check [paths…]`);
  exitWith(1);
}

const files = selectFiles(listRepoFiles(), paths).filter(isScannedFile);
const findings = files.flatMap((file) =>
  findTodoMarkers(file, readFileSync(repoPath(file), 'utf8')),
);
for (const finding of findings) {
  OUT.error(
    `${finding.file}:${finding.line}:${finding.column}: ${finding.marker} needs an issue number, e.g. ${finding.marker}(#123)`,
  );
}
if (findings.length > 0) {
  OUT.error(`${findings.length} to-do marker(s) without an issue number in ${files.length} files`);
  exitWith(1);
}
OUT.info(`${files.length} files checked, no to-do marker without an issue number`);
exitWith(0);
