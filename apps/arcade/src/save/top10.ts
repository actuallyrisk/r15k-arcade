import { notImplemented } from '@r15k/engine';
import type { ScoreEntryV1 } from './save-schema.ts';

/** Entries kept per top-10 list. */
export const TOP10_SIZE = 10;

/** Whether a score enters the list: score > 0 and (the list is not full or it beats the last entry). */
export function qualifiesForTop10(_entries: readonly ScoreEntryV1[], _score: number): boolean {
  return notImplemented('arcade.qualifiesForTop10');
}

/**
 * Inserts an entry after existing entries with the same score (stable), truncates to TOP10_SIZE and
 * returns its 1-based rank.
 */
export function insertTop10(
  _entries: readonly ScoreEntryV1[],
  _entry: ScoreEntryV1,
): { readonly entries: readonly ScoreEntryV1[]; readonly rank: number } {
  return notImplemented('arcade.insertTop10');
}

/** The best score of a list; 0 when it is empty. */
export function bestScore(_entries: readonly ScoreEntryV1[]): number {
  return notImplemented('arcade.bestScore');
}
