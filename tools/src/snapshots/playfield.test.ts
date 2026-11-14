// R15K Arcade tools – guard: the snapshot harness keeps its own copy of the playfield size because it
// may not import the game barrel at runtime; this test keeps the copy equal to the game's tuning.
import { TUNING } from '@r15k/bug-hunt';
import { describe, expect, it } from 'vitest';
import { SNAPSHOT_PLAYFIELD } from './harness.ts';

describe('SNAPSHOT_PLAYFIELD', () => {
  it('equals the Bug Hunt playfield tuning', () => {
    expect(SNAPSHOT_PLAYFIELD).toEqual(TUNING.field);
  });
});
