import { notImplemented } from '../util/assert.ts';
import type { StorageAdapter } from './storage-adapter.ts';

/** In-memory storage (tests, snapshot services). */
export function createMemoryStorageAdapter(
  _initial?: Readonly<Record<string, string>>,
): StorageAdapter {
  return notImplemented('engine.createMemoryStorageAdapter');
}
