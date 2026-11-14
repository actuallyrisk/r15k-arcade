// R15K Arcade tools – `pnpm size-budget`: without arguments checks the web build in apps/arcade/dist
// (which must exist); `--apk <file> […]`, `--aab`, `--dmg`, `--msix` check native packages. Prints a
// table, writes .tmp/size-budget.json and exits 1 when a budget is exceeded.
import { exitWith, OUT } from '../shared/cli-output.ts';
import { writeJson } from '../shared/fs-json.ts';
import { repoPath } from '../shared/repo-paths.ts';
import { BUDGETS } from './budgets.ts';
import { measurePackages, measureWebBuild } from './measure.ts';
import type { BudgetCheck } from './measure.ts';
import { parsePackageArgs } from './package-args.ts';

/** Bytes as KB with one decimal (KB = 1024 bytes). */
const kilobytes = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`;

/** Runs the checks the command line asks for. */
function runChecks(argv: readonly string[]): readonly BudgetCheck[] {
  const packages = parsePackageArgs(argv);
  return packages.length === 0
    ? measureWebBuild(repoPath('apps', 'arcade', 'dist'), BUDGETS)
    : measurePackages(packages, BUDGETS);
}

let checks: readonly BudgetCheck[] = [];
try {
  checks = runChecks(process.argv.slice(2));
} catch (error: unknown) {
  OUT.error(error instanceof Error ? error.message : String(error));
  exitWith(1);
}

OUT.table([
  ['Budget', 'Size', 'Limit', 'Result'],
  ...checks.map((check) => [
    check.label,
    kilobytes(check.bytes),
    kilobytes(check.limit),
    check.isWithin ? 'ok' : 'OVER BUDGET',
  ]),
]);
writeJson(repoPath('.tmp', 'size-budget.json'), { checks });
const over = checks.filter((check) => !check.isWithin);
for (const check of over) {
  OUT.error(`${check.label}: ${kilobytes(check.bytes)} exceeds ${kilobytes(check.limit)}`);
}
exitWith(over.length === 0 ? 0 : 1);
