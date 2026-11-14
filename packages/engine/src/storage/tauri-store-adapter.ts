import type { Store } from '@tauri-apps/plugin-store';
import { fnv1a32, toHex32 } from '../math/hash.ts';
import type { StorageAdapter, StoredRead } from './storage-adapter.ts';

/** The store methods the adapter uses. */
type SlotStore = Pick<Store, 'get' | 'set' | 'delete' | 'save'>;

/** One stored copy: its write generation, the checksum of the value and the value. */
interface SlotEntry {
  readonly generation: number;
  readonly checksum: string;
  readonly value: string;
}

/** What one slot holds for a key. */
type SlotState =
  | { readonly kind: 'missing' }
  | { readonly kind: 'broken'; readonly issue: string }
  | { readonly kind: 'intact'; readonly entry: SlotEntry };

const SLOT_NAMES = ['a', 'b'] as const;

function checksumOf(value: string): string {
  return toHex32(fnv1a32(value));
}

/** Parses a slot entry; undefined for anything that is not a complete entry. */
function parseEntry(raw: string): SlotEntry | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (_error: unknown) {
    // A truncated or garbled entry; the caller reports it as an issue.
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return undefined;
  }
  const { generation, checksum, value } = parsed as Partial<Record<keyof SlotEntry, unknown>>;
  const isEntry =
    typeof generation === 'number' &&
    Number.isSafeInteger(generation) &&
    generation >= 1 &&
    typeof checksum === 'string' &&
    typeof value === 'string';
  return isEntry ? { generation, checksum, value } : undefined;
}

async function readSlot(store: SlotStore, key: string, name: string): Promise<SlotState> {
  const raw = await store.get<unknown>(key);
  if (raw === undefined) {
    return { kind: 'missing' };
  }
  const entry = typeof raw === 'string' ? parseEntry(raw) : undefined;
  if (entry === undefined) {
    return { kind: 'broken', issue: `slot ${name}: unreadable entry` };
  }
  if (entry.checksum !== checksumOf(entry.value)) {
    return { kind: 'broken', issue: `slot ${name}: checksum mismatch` };
  }
  return { kind: 'intact', entry };
}

/** The issues of both slots; a missing entry is one when the other slot was written at least twice. */
function issuesOf(states: readonly SlotState[]): readonly string[] {
  return states.flatMap((state, index) => {
    if (state.kind === 'broken') {
      return [state.issue];
    }
    const other = states[1 - index];
    const isLost =
      state.kind === 'missing' && other?.kind === 'intact' && other.entry.generation >= 2;
    return isLost ? [`slot ${SLOT_NAMES[index] ?? '?'}: missing entry`] : [];
  });
}

/**
 * The two-slot adapter on two loaded stores. Every write goes to slot `generation % 2`, so the copy of
 * the previous write is never touched; reads return the intact copy with the highest generation.
 */
function createTwoSlotAdapter(slots: readonly [SlotStore, SlotStore]): StorageAdapter {
  const generations = new Map<string, number>();
  const read = async (key: string): Promise<StoredRead> => {
    const states = await Promise.all(
      slots.map((store, index) => readSlot(store, key, SLOT_NAMES[index] ?? '?')),
    );
    const entries = states.flatMap((state) => (state.kind === 'intact' ? [state.entry] : []));
    const best = entries.reduce<SlotEntry | undefined>(
      (newest, entry) =>
        newest === undefined || entry.generation > newest.generation ? entry : newest,
      undefined,
    );
    generations.set(key, Math.max(generations.get(key) ?? 0, best?.generation ?? 0));
    return { text: best?.value, issues: issuesOf(states) };
  };
  return {
    kind: 'tauri-store',
    read,
    async write(key: string, value: string): Promise<void> {
      if (!generations.has(key)) {
        await read(key);
      }
      const generation = (generations.get(key) ?? 0) + 1;
      const slot = generation % 2 === 0 ? slots[0] : slots[1];
      await slot.set(key, JSON.stringify({ generation, checksum: checksumOf(value), value }));
      await slot.save();
      generations.set(key, generation);
    },
    async remove(key: string): Promise<void> {
      for (const slot of slots) {
        await slot.delete(key);
        await slot.save();
      }
      generations.delete(key);
    },
  };
}

/**
 * Storage on the Tauri store plugin with two slot files (`<baseName>-a.json`, `<baseName>-b.json`):
 * every write goes to the older slot, so a crash during a save never destroys the last good copy.
 */
export async function createTauriStoreAdapter(baseName: string): Promise<StorageAdapter> {
  const { load } = await import('@tauri-apps/plugin-store');
  // The plugin saves only when asked, so a write is exactly one set + save on one slot.
  const options = { autoSave: false, defaults: {} };
  const slotA = await load(`${baseName}-a.json`, options);
  const slotB = await load(`${baseName}-b.json`, options);
  return createTwoSlotAdapter([slotA, slotB]);
}
