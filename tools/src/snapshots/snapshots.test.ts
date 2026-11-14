import { expect, test } from 'vitest';
import { loadSnapshotCases } from './cases/index.ts';
import { compareWithGolden, goldenPath } from './golden.ts';
import { renderSnapshot } from './harness.ts';
import {
  orphanGoldens,
  removeFailureImages,
  snapshotRuns,
  writeFailureImages,
} from './snapshot-files.ts';

// R15K_SNAPSHOT_ONLY restricts cases, goldens and the orphan check to one id prefix; only the case files
// that can hold such ids are evaluated. R15K_UPDATE_SNAPSHOTS=1 (pnpm snapshots:update) rewrites goldens.
const onlyVariable = process.env['R15K_SNAPSHOT_ONLY'];
const only = onlyVariable === undefined || onlyVariable === '' ? undefined : onlyVariable;
const isUpdate = process.env['R15K_UPDATE_SNAPSHOTS'] === '1';

const runs = snapshotRuns(await loadSnapshotCases(only));

for (const run of runs) {
  test(`${run.name} matches its golden`, () => {
    const image = renderSnapshot(run.snapshotCase, run.palette);
    const path = goldenPath(run.snapshotCase.id, run.palette);
    const result = compareWithGolden(image, path, { isUpdate });
    if (result.isMatch) {
      removeFailureImages(run);
    } else {
      writeFailureImages(run, image);
    }
    const where = `golden assets/goldens/${run.name}.png, failure images in .tmp/snapshots`;
    expect(result, where).toEqual({
      isMatch: true,
      differentPixels: isUpdate ? result.differentPixels : 0,
    });
  });
}

test('every golden belongs to a case and palette', () => {
  expect(orphanGoldens(runs, { prefix: only ?? '' })).toEqual([]);
});
