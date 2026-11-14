// R15K Arcade tools – loads the snapshot case lists. A case file is imported only when it can hold an id
// with the requested prefix, so a scoped run never evaluates the other packages' barrels. Each file holds
// the cases of one owner: every id in it starts with the file's prefix, and ids are unique.
import type { SnapshotCase } from '../snapshot-case.ts';

/** One case file: the id prefix its cases carry and a literal dynamic import of its list. */
interface CaseFile {
  readonly prefix: string;
  readonly load: () => Promise<readonly SnapshotCase[]>;
}

const CASE_FILES: readonly CaseFile[] = [
  { prefix: 'ui-', load: async () => (await import('./ui-cases.ts')).UI_CASES },
  { prefix: 'bug-hunt-', load: async () => (await import('./bug-hunt-cases.ts')).BUG_HUNT_CASES },
  { prefix: 'arcade-', load: async () => (await import('./arcade-cases.ts')).ARCADE_CASES },
];

/** Whether a file with this prefix can hold an id starting with `only` (prefixes start with one another). */
function canHold(file: CaseFile, only: string): boolean {
  return file.prefix.startsWith(only) || only.startsWith(file.prefix);
}

/** The cases of one file; throws for an id outside the file's prefix. */
async function loadFile(file: CaseFile): Promise<readonly SnapshotCase[]> {
  const cases = await file.load();
  const foreign = cases.find((snapshotCase) => !snapshotCase.id.startsWith(file.prefix));
  if (foreign !== undefined) {
    throw new Error(`snapshot case '${foreign.id}' must start with '${file.prefix}'`);
  }
  return cases;
}

/** Throws when two cases share an id. */
function assertUniqueIds(cases: readonly SnapshotCase[]): void {
  const seen = new Set<string>();
  for (const snapshotCase of cases) {
    if (seen.has(snapshotCase.id)) {
      throw new Error(`snapshot case id '${snapshotCase.id}' is used twice`);
    }
    seen.add(snapshotCase.id);
  }
}

/** The cases whose id starts with `only` (every case when undefined). */
export async function loadSnapshotCases(
  only: string | undefined,
): Promise<readonly SnapshotCase[]> {
  const prefix = only ?? '';
  const files = CASE_FILES.filter((file) => canHold(file, prefix));
  const lists = await Promise.all(files.map(loadFile));
  const cases = lists.flat().filter((snapshotCase) => snapshotCase.id.startsWith(prefix));
  assertUniqueIds(cases);
  return cases;
}
