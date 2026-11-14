// R15K Arcade tools – command line of `pnpm size-budget`: no arguments checks the web build; `--apk`,
// `--aab`, `--dmg` and `--msix` each take one or more package files (`--aab app.aab --apk a.apk b.apk`).
import { PACKAGE_BUDGETS } from './measure.ts';
import type { NativePackage, PackageKind } from './measure.ts';

/** Whether an option name is a package kind. */
const isPackageKind = (name: string): name is PackageKind => name in PACKAGE_BUDGETS;

/** Throws when the previous package option got no file. */
function assertFilesGiven(kind: PackageKind | undefined, hasFiles: boolean): void {
  if (kind !== undefined && !hasFiles) {
    throw new Error(`--${kind} needs at least one file`);
  }
}

/** The native packages named on the command line (empty: check the web build); throws on misuse. */
export function parsePackageArgs(argv: readonly string[]): readonly NativePackage[] {
  const packages: NativePackage[] = [];
  let kind: PackageKind | undefined;
  let hasFiles = false;
  for (const token of argv) {
    if (!token.startsWith('--')) {
      if (kind === undefined) {
        throw new Error(`unexpected argument '${token}'`);
      }
      packages.push({ kind, path: token });
      hasFiles = true;
      continue;
    }
    assertFilesGiven(kind, hasFiles);
    const name = token.slice(2);
    if (!isPackageKind(name)) {
      throw new Error(`unknown option '${token}' (use --apk, --aab, --dmg or --msix)`);
    }
    kind = name;
    hasFiles = false;
  }
  assertFilesGiven(kind, hasFiles);
  return packages;
}
