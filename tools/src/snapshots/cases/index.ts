// R15K Arcade tools – loads the snapshot case lists. A case file is imported only when it can hold an id
// with the requested prefix, so a scoped run never evaluates the other packages' barrels.
import { notImplemented } from '@r15k/engine';
import type { SnapshotCase } from '../snapshot-case.ts';

/** The cases whose id starts with `only` (every case when undefined). */
export function loadSnapshotCases(_only: string | undefined): Promise<readonly SnapshotCase[]> {
  return notImplemented('tools.loadSnapshotCases');
}
