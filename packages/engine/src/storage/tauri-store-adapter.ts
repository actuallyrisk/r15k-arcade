import { notImplemented } from '../util/assert.ts';
import type { StorageAdapter } from './storage-adapter.ts';

/**
 * Storage on the Tauri store plugin with two slot files (`<baseName>-a.json`, `<baseName>-b.json`):
 * every write goes to the older slot, so a crash during a save never destroys the last good copy.
 */
export function createTauriStoreAdapter(_baseName: string): Promise<StorageAdapter> {
  return notImplemented('engine.createTauriStoreAdapter');
}
