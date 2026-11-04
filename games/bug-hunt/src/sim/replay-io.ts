import { notImplemented } from '@r15k/engine';
import type { Result } from '@r15k/engine';
import type { Replay } from './replay.ts';

/** Validates a parsed replay file; the error lists every problem. */
export function parseReplay(_value: unknown): Result<Replay, readonly string[]> {
  return notImplemented('bug-hunt.parseReplay');
}
