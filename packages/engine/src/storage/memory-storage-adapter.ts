import type { StorageAdapter, StoredRead } from './storage-adapter.ts';

/** In-memory storage (tests, snapshot services). */
export function createMemoryStorageAdapter(
  initial: Readonly<Record<string, string>> = {},
): StorageAdapter {
  const entries = new Map(Object.entries(initial));
  return {
    kind: 'memory',
    read(key: string): Promise<StoredRead> {
      return Promise.resolve({ text: entries.get(key), issues: [] });
    },
    write(key: string, value: string): Promise<void> {
      entries.set(key, value);
      return Promise.resolve();
    },
    remove(key: string): Promise<void> {
      entries.delete(key);
      return Promise.resolve();
    },
  };
}
