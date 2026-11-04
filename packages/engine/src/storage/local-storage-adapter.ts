import { notImplemented } from '../util/assert.ts';
import type { StorageAdapter } from './storage-adapter.ts';

/** Storage on a Web Storage object with a key prefix; storage exceptions become rejected promises. */
export function createLocalStorageAdapter(_storage: Storage, _prefix: string): StorageAdapter {
  return notImplemented('engine.createLocalStorageAdapter');
}
