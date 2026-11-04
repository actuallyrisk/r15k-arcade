// R15K Arcade tools – platform patch of a generated Info.plist: sets every key of a table (existing
// values and lists are replaced, missing keys are appended) and leaves the file byte for byte
// unchanged when nothing differs, which keeps the patch idempotent.
import { isDeepStrictEqual } from 'node:util';
import type { PatchResult } from './anchors.ts';
import type { PlistValue } from './apple-keys.ts';
import { fromPlistNode, parsePlist, serializePlist, toPlistNode } from './plist.ts';
import type { PlistDict, PlistEntry } from './plist.ts';

/** The root dict with every key of the table set, and one description per changed key. */
export function setPlistKeys(
  root: PlistDict,
  keys: Readonly<Record<string, PlistValue>>,
): { readonly root: PlistDict; readonly changes: readonly string[] } {
  const entries: PlistEntry[] = [...root.entries];
  const changes: string[] = [];
  for (const [key, value] of Object.entries(keys)) {
    const position = entries.findIndex((entry) => entry.key === key);
    const existing = entries[position];
    const entry = { key, value: toPlistNode(value) };
    if (existing === undefined) {
      entries.push(entry);
      changes.push(`${key} = ${JSON.stringify(value)} (added)`);
    } else if (!isDeepStrictEqual(fromPlistNode(existing.value), fromPlistNode(entry.value))) {
      entries[position] = entry;
      changes.push(`${key} = ${JSON.stringify(value)}`);
    }
  }
  return { root: { kind: 'dict', entries }, changes };
}

/** Applies a key table to the text of an Info.plist. */
export function patchInfoPlist(
  text: string,
  keys: Readonly<Record<string, PlistValue>>,
): PatchResult {
  const { root, changes } = setPlistKeys(parsePlist(text), keys);
  return changes.length === 0 ? { text, changes } : { text: serializePlist(root), changes };
}

/** The plain JavaScript value of the root dict of an Info.plist text. */
export function readInfoPlist(text: string): unknown {
  return fromPlistNode(parsePlist(text));
}
