import { beforeEach, expect, test, vi } from 'vitest';
import type { SnapshotCase } from '../snapshot-case.ts';

type FileName = 'ui' | 'bug-hunt' | 'arcade';

// The case files are replaced by recording fakes: a factory runs only when its file is evaluated.
const state = vi.hoisted(() => {
  const defaults: Readonly<Record<FileName, readonly string[]>> = {
    ui: ['ui-font-r15k-5', 'ui-font-r15k-8', 'ui-widgets'],
    'bug-hunt': ['bug-hunt-countdown'],
    arcade: ['arcade-hub-portrait', 'arcade-too-small'],
  };
  const evaluated: FileName[] = [];
  const ids: Record<FileName, readonly string[]> = { ...defaults };
  const evaluate = (file: FileName): readonly SnapshotCase[] => {
    evaluated.push(file);
    return ids[file].map((id) => ({
      id,
      viewport: 'desktop',
      locale: 'en',
      catalogs: [],
      draw: (): void => undefined,
    }));
  };
  return { defaults, evaluated, ids, evaluate };
});

// Registered again before every test on a fresh module registry, so every test evaluates anew.
beforeEach(() => {
  vi.resetModules();
  state.evaluated.length = 0;
  Object.assign(state.ids, state.defaults);
  vi.doMock('./ui-cases.ts', () => ({ UI_CASES: state.evaluate('ui') }));
  vi.doMock('./bug-hunt-cases.ts', () => ({ BUG_HUNT_CASES: state.evaluate('bug-hunt') }));
  vi.doMock('./arcade-cases.ts', () => ({ ARCADE_CASES: state.evaluate('arcade') }));
});

/** Loads the cases through a freshly evaluated index module. */
async function load(only: string | undefined): Promise<readonly string[]> {
  const { loadSnapshotCases } = await import('./index.ts');
  return (await loadSnapshotCases(only)).map((snapshotCase) => snapshotCase.id);
}

const ALL_IDS = [...state.defaults.ui, ...state.defaults['bug-hunt'], ...state.defaults.arcade];

test.each<[string | undefined, readonly FileName[], readonly string[]]>([
  [undefined, ['ui', 'bug-hunt', 'arcade'], ALL_IDS],
  ['', ['ui', 'bug-hunt', 'arcade'], ALL_IDS],
  ['ui-', ['ui'], state.defaults.ui],
  ['ui-font', ['ui'], ['ui-font-r15k-5', 'ui-font-r15k-8']],
  ['u', ['ui'], state.defaults.ui],
  ['bug', ['bug-hunt'], ['bug-hunt-countdown']],
  ['arcade-too', ['arcade'], ['arcade-too-small']],
  ['tools-', [], []],
])('only %j evaluates the files %j and returns %j', async (only, files, ids) => {
  expect(await load(only)).toEqual(ids);
  expect([...state.evaluated].sort()).toEqual([...files].sort());
});

test('a case whose id does not carry its file prefix is rejected', async () => {
  state.ids.ui = ['ui-widgets', 'arcade-hub-portrait'];
  await expect(load('ui-')).rejects.toThrow(
    "snapshot case 'arcade-hub-portrait' must start with 'ui-'",
  );
});

test('two cases with the same id are rejected', async () => {
  state.ids.arcade = ['arcade-top10', 'arcade-top10'];
  await expect(load(undefined)).rejects.toThrow("snapshot case id 'arcade-top10' is used twice");
});
