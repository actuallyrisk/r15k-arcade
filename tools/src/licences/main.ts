// R15K Arcade tools – `pnpm run licences [--require-rust]` (with `run`: plain `pnpm licences` is pnpm's
// own licenses command): the third-party licence report (JavaScript runtime packages via pnpm, Rust
// crates via cargo metadata) checked against the licence policy, plus the runtime dependency policy.
// Writes .tmp/licences/third-party.json and exits 1 on any finding. Without cargo the Rust part prints
// SKIPPED; --require-rust (CI) makes that a failure.
import { existsSync, readFileSync } from 'node:fs';
import { parseArgs } from '../shared/args.ts';
import { exitWith, OUT } from '../shared/cli-output.ts';
import { readJson, writeJson } from '../shared/fs-json.ts';
import { listRepoFiles } from '../shared/repo-files.ts';
import { repoPath } from '../shared/repo-paths.ts';
import { runCommand, runPnpm } from '../shared/run-command.ts';
import { isOnPath } from '../verify/run-step.ts';
import {
  isRuntimeSource,
  manifestIssues,
  sourceIssues,
  thirdPartyDependencies,
  workspaceManifestPaths,
} from './dependency-policy.ts';
import type { WorkspaceManifest } from './dependency-policy.ts';
import { collectJsLicences, completenessIssues } from './js-licences.ts';
import { CARGO_LOCK, collectRustLicences } from './rust-licences.ts';
import { isRecord, licenceIssues } from './third-party.ts';
import type { LicenceIssue, ThirdPartyPackage } from './third-party.ts';

/** The runtime dependencies of a manifest file. */
function readManifest(path: string): WorkspaceManifest {
  const json = readJson(repoPath(path));
  const dependencies = isRecord(json) && isRecord(json['dependencies']) ? json['dependencies'] : {};
  const entries = Object.entries(dependencies).map(([name, version]): [string, string] => [
    name,
    typeof version === 'string' ? version : '',
  ]);
  return { path, dependencies: Object.fromEntries(entries) };
}

/** Dependency policy over the manifests and the runtime sources. */
function policyIssues(
  files: readonly string[],
  manifests: readonly WorkspaceManifest[],
): readonly LicenceIssue[] {
  const sources = files.filter(isRuntimeSource);
  return [
    ...manifestIssues(manifests),
    ...sources.flatMap((file) => sourceIssues(file, readFileSync(repoPath(file), 'utf8'))),
  ];
}

/** The Rust packages, or the Rust part's failure as an issue. */
function rustPart(isRustRequired: boolean): {
  readonly packages: readonly ThirdPartyPackage[];
  readonly issues: readonly LicenceIssue[];
} {
  const outcome = collectRustLicences({
    hasCargo: isOnPath('cargo'),
    hasLockfile: existsSync(repoPath(CARGO_LOCK)),
    isRustRequired,
    runCargo: (args) => runCommand('cargo', args),
  });
  if (outcome.kind === 'skipped') {
    OUT.info(`rust licences: ${outcome.message}`);
  }
  return outcome.kind === 'ok'
    ? { packages: outcome.packages, issues: [] }
    : { packages: [], issues: outcome.kind === 'failed' ? [outcome.message] : [] };
}

const { flags, values } = parseArgs(process.argv.slice(2));
const unknown = [...[...flags].filter((flag) => flag !== 'require-rust'), ...values.keys()];
if (unknown.length > 0) {
  OUT.error(`unknown argument(s): ${unknown.map((name) => `--${name}`).join(' ')}`);
  exitWith(1);
}

const files = listRepoFiles();
const manifestPaths = workspaceManifestPaths(
  files,
  readFileSync(repoPath('pnpm-workspace.yaml'), 'utf8'),
);
const manifests = manifestPaths.map(readManifest);
const jsPackages = collectJsLicences((args) => runPnpm(args));
const rust = rustPart(flags.has('require-rust'));
const packages = [...jsPackages, ...rust.packages];
const issues = [
  ...completenessIssues(jsPackages, thirdPartyDependencies(manifests)),
  ...licenceIssues(packages),
  ...rust.issues,
  ...policyIssues(files, manifests),
];

writeJson(repoPath('.tmp', 'licences', 'third-party.json'), packages);
OUT.table([
  ['Ecosystem', 'Package', 'Version', 'Licence'],
  ...packages.map((item) => [item.ecosystem, item.name, item.version, item.license]),
]);
for (const issue of issues) {
  OUT.error(issue);
}
OUT.info(
  `${packages.length} third-party packages, ${manifests.length} manifests checked, ${issues.length} finding(s)`,
);
exitWith(issues.length === 0 ? 0 : 1);
