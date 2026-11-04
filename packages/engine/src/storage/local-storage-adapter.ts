import type { StorageAdapter, StoredRead } from './storage-adapter.ts';

/** Runs a synchronous storage call; an exception (quota, privacy mode) becomes a rejected promise. */
function attempt<T>(operation: () => T): Promise<T> {
  return new Promise((resolve) => {
    resolve(operation());
  });
}

/** Storage on a Web Storage object with a key prefix; storage exceptions become rejected promises. */
export function createLocalStorageAdapter(storage: Storage, prefix: string): StorageAdapter {
  return {
    kind: 'local-storage',
    read(key: string): Promise<StoredRead> {
      return attempt(() => ({ text: storage.getItem(prefix + key) ?? undefined, issues: [] }));
    },
    write(key: string, value: string): Promise<void> {
      return attempt(() => {
        storage.setItem(prefix + key, value);
      });
    },
    remove(key: string): Promise<void> {
      return attempt(() => {
        storage.removeItem(prefix + key);
      });
    },
  };
}
