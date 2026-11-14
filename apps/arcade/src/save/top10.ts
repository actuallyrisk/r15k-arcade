import type { ScoreEntryV1 } from './save-schema.ts';

/** Entries kept per top-10 list. */
export const TOP10_SIZE = 10;

/** Whether a score enters the list: score > 0 and (the list is not full or it beats the last entry). */
export function qualifiesForTop10(entries: readonly ScoreEntryV1[], score: number): boolean {
  if (score <= 0) {
    return false;
  }
  const last = entries[TOP10_SIZE - 1];
  return entries.length < TOP10_SIZE || last === undefined || score > last.score;
}

/**
 * Inserts an entry after existing entries with the same score (stable), truncates to TOP10_SIZE and
 * returns its 1-based rank.
 */
export function insertTop10(
  entries: readonly ScoreEntryV1[],
  entry: ScoreEntryV1,
): { readonly entries: readonly ScoreEntryV1[]; readonly rank: number } {
  const index = entries.findIndex((existing) => existing.score < entry.score);
  const position = index === -1 ? entries.length : index;
  const next = [...entries.slice(0, position), entry, ...entries.slice(position)];
  return { entries: next.slice(0, TOP10_SIZE), rank: position + 1 };
}

/** The best score of a list; 0 when it is empty. */
export function bestScore(entries: readonly ScoreEntryV1[]): number {
  return entries.reduce((best, entry) => Math.max(best, entry.score), 0);
}
