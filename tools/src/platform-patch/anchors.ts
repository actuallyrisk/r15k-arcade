// R15K Arcade tools – platform patch: the result type of every patch and its loud failure. A patch
// finds what it changes by anchors (an element, a block, a line); when an anchor is missing or
// ambiguous it throws `anchor not found: <what> in <file>` instead of guessing, so a changed Tauri
// template stops the build instead of silently dropping a game flag.

/** The new text of a patched file and one description per change (none when already up to date). */
export interface PatchResult {
  readonly text: string;
  readonly changes: readonly string[];
}

/** Where a patch expected an anchor: a description of the anchor and the file label. */
export interface Anchor {
  readonly what: string;
  readonly file: string;
}

/** A located match: its text and its offset in the searched text. */
export interface Located {
  readonly text: string;
  readonly index: number;
}

/** The error of a missing or ambiguous anchor. */
export function anchorNotFound(anchor: Anchor): Error {
  return new Error(`anchor not found: ${anchor.what} in ${anchor.file}`);
}

/** The only element of a list of candidates; none or several are an anchor failure. */
export function single<T>(candidates: readonly T[], anchor: Anchor): T {
  const [first] = candidates;
  if (candidates.length !== 1 || first === undefined) {
    throw anchorNotFound(anchor);
  }
  return first;
}

/** Every match of a global regular expression with its offset. */
export function locateAll(text: string, pattern: RegExp): readonly Located[] {
  return [...text.matchAll(pattern)].map((match) => ({ text: match[0], index: match.index }));
}

/** Escapes a literal for use inside a regular expression. */
export function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Replaces the located span of a text. */
export function replaceAt(text: string, located: Located, replacement: string): string {
  return `${text.slice(0, located.index)}${replacement}${text.slice(located.index + located.text.length)}`;
}

/** Applies patch steps in order and collects their changes. */
export function applySteps(
  text: string,
  steps: readonly ((current: string) => PatchResult)[],
): PatchResult {
  let current = text;
  const changes: string[] = [];
  for (const step of steps) {
    const result = step(current);
    current = result.text;
    changes.push(...result.changes);
  }
  return { text: current, changes };
}
