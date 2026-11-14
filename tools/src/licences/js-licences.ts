// R15K Arcade tools – licences of the JavaScript runtime packages: `pnpm licenses list --recursive --prod
// --json` at the root. `--recursive` is required, because the root manifest has no production
// dependencies and pnpm would otherwise report only the root project, silently empty. Workspace packages
// (@r15k/*) are our own code and are dropped; every runtime dependency named in a workspace manifest must
// appear in the report (completeness check), so an empty or partial report fails loudly.
import type { CommandResult } from '../shared/run-command.ts';
import { comparePackages, isRecord, stringField } from './third-party.ts';
import type { LicenceIssue, ThirdPartyPackage } from './third-party.ts';

/** The exact pnpm arguments of the report. */
export const JS_LICENCE_ARGS: readonly string[] = [
  'licenses',
  'list',
  '--recursive',
  '--prod',
  '--json',
];

/** Whether a package name belongs to the workspace. */
const isWorkspacePackage = (name: string): boolean => name.startsWith('@r15k/');

/** The repository of a report entry: its homepage without a `#readme` anchor. */
const repositoryOf = (homepage: string): string => homepage.replace(/#readme$/, '');

/** The packages of one licence group of the report (one entry per version). */
function groupPackages(license: string, entries: unknown): readonly ThirdPartyPackage[] {
  if (!Array.isArray(entries)) {
    throw new Error(`pnpm licence report: group '${license}' is not a list`);
  }
  return entries.filter(isRecord).flatMap((entry) => {
    const versions: unknown = entry['versions'];
    const list = Array.isArray(versions)
      ? versions.filter((value) => typeof value === 'string')
      : [];
    return list.map((version) => ({
      ecosystem: 'npm' as const,
      name: stringField(entry, 'name'),
      version,
      license: stringField(entry, 'license') || license,
      repository: repositoryOf(stringField(entry, 'homepage')),
    }));
  });
}

/** Parses the JSON report into third-party packages (workspace packages dropped), sorted by name. */
export function parseJsLicenceReport(json: string): readonly ThirdPartyPackage[] {
  const report: unknown = JSON.parse(json);
  if (!isRecord(report)) {
    throw new Error('pnpm licence report is not a JSON object');
  }
  return Object.entries(report)
    .flatMap(([license, entries]) => groupPackages(license, entries))
    .filter((item) => !isWorkspacePackage(item.name))
    .sort(comparePackages);
}

/** One issue per required runtime dependency that the report does not contain. */
export function completenessIssues(
  packages: readonly ThirdPartyPackage[],
  required: readonly string[],
): readonly LicenceIssue[] {
  const reported = new Set(packages.map((item) => item.name));
  return required
    .filter((name) => !isWorkspacePackage(name) && !reported.has(name))
    .map((name) => `licence report incomplete: ${name}`);
}

/** Runs the pnpm report and parses it; throws when pnpm fails. */
export function collectJsLicences(
  runPnpm: (args: readonly string[]) => CommandResult,
): readonly ThirdPartyPackage[] {
  const result = runPnpm(JS_LICENCE_ARGS);
  if (result.status !== 0) {
    throw new Error(`pnpm ${JS_LICENCE_ARGS.join(' ')} failed: ${result.stderr.trim()}`);
  }
  return parseJsLicenceReport(result.stdout);
}
