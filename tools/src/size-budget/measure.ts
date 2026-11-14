// R15K Arcade tools – measures the web build and native packages against the size budgets. The web build
// is the folder apps/arcade/dist: JavaScript counts gzip -9, every other file outside dist/audio raw
// (source maps never count), the audio folder raw. Native packages count raw, one check per file.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
import type { BudgetId, BudgetTable } from './budgets.ts';

/** The result of one budget check. */
export interface BudgetCheck {
  readonly budget: BudgetId;
  /** What was measured (a budget name or a package file name). */
  readonly label: string;
  readonly bytes: number;
  readonly limit: number;
  readonly isWithin: boolean;
}

/** A native package kind and the budget it is checked against. */
export const PACKAGE_BUDGETS = {
  apk: 'apkPerAbi',
  aab: 'aab',
  dmg: 'dmg',
  msix: 'msix',
} as const satisfies Readonly<Record<string, BudgetId>>;

/** A native package kind (`--apk`, `--aab`, `--dmg`, `--msix`). */
export type PackageKind = keyof typeof PACKAGE_BUDGETS;

/** A native package file to check. */
export interface NativePackage {
  readonly kind: PackageKind;
  readonly path: string;
}

/** Every file below a folder, as '/'-separated relative paths, sorted. */
export function listFiles(folder: string): readonly string[] {
  const entries = readdirSync(folder, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(folder, join(entry.parentPath, entry.name)).replaceAll('\\', '/'))
    .sort();
}

/** One check result. */
function check(
  budget: BudgetId,
  measured: { label: string; bytes: number },
  budgets: BudgetTable,
): BudgetCheck {
  const limit = budgets[budget];
  return { budget, ...measured, limit, isWithin: measured.bytes <= limit };
}

/** Which web budget a dist file counts towards; source maps count towards none. */
function webBudgetOf(file: string): BudgetId | undefined {
  if (file.startsWith('audio/')) {
    return 'audioRaw';
  }
  if (file.endsWith('.map')) {
    return undefined;
  }
  return file.endsWith('.js') ? 'webJsGzip' : 'webAssetsRawWithoutAudio';
}

/** The counted size of one dist file: gzip -9 for JavaScript, raw for everything else. */
function countedBytes(path: string, budget: BudgetId): number {
  return budget === 'webJsGzip'
    ? gzipSync(readFileSync(path), { level: 9 }).length
    : statSync(path).size;
}

/** The three web budgets of a build folder; throws when the folder does not exist. */
export function measureWebBuild(dist: string, budgets: BudgetTable): readonly BudgetCheck[] {
  if (!existsSync(dist)) {
    throw new Error(
      `${dist} does not exist – build the app first (pnpm --filter @r15k/arcade build)`,
    );
  }
  const totals = new Map<BudgetId, number>([
    ['webJsGzip', 0],
    ['webAssetsRawWithoutAudio', 0],
    ['audioRaw', 0],
  ]);
  for (const file of listFiles(dist)) {
    const budget = webBudgetOf(file);
    if (budget !== undefined) {
      totals.set(budget, (totals.get(budget) ?? 0) + countedBytes(join(dist, file), budget));
    }
  }
  return [...totals].map(([budget, bytes]) => check(budget, { label: budget, bytes }, budgets));
}

/** One check per native package (raw size); throws for a missing file. */
export function measurePackages(
  packages: readonly NativePackage[],
  budgets: BudgetTable,
): readonly BudgetCheck[] {
  return packages.map(({ kind, path }) => {
    if (!existsSync(path)) {
      throw new Error(`${kind} package ${path} does not exist`);
    }
    const label = `${kind} ${basename(path)}`;
    return check(PACKAGE_BUDGETS[kind], { label, bytes: statSync(path).size }, budgets);
  });
}
