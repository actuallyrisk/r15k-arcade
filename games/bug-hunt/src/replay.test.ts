// Recorded replays must reproduce their final state exactly. A failure after a simulation or tuning
// change is expected: re-record with `pnpm replays:update` and say so in the pull request.
import { expect, test } from 'vitest';
import { CONTENT_VERSION } from './content/version.ts';
import { parseReplay } from './sim/replay-io.ts';
import { runReplay } from './sim/replay.ts';

const FILES: Readonly<Record<string, unknown>> = import.meta.glob('../replays/*.json', {
  eager: true,
  import: 'default',
});

/** The recorded replays: seed and input source are part of each file name. */
const EXPECTED_FILES = [
  '../replays/arcade-bot-seed-1.json',
  '../replays/arcade-idle-seed-2.json',
  '../replays/arcade-pointer-seed-3.json',
];

test('every recorded replay is present', () => {
  expect(Object.keys(FILES).sort()).toEqual(EXPECTED_FILES);
});

test.each(Object.entries(FILES))('%s reproduces its recorded final state', (_file, value) => {
  const parsed = parseReplay(value);
  if (!parsed.ok) {
    throw new Error(`invalid replay: ${parsed.error.join('; ')}`);
  }
  const replay = parsed.value;
  expect(
    replay.contentVersion,
    'content changed – run pnpm replays:update and say so in the PR',
  ).toBe(CONTENT_VERSION);
  const run = runReplay(replay);
  expect(run.state.phase).toBe('ended');
  expect(run.hash).toBe(replay.finalHash);
  expect(run.score).toBe(replay.finalScore);
});
