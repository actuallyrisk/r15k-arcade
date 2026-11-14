/** Result of reading one key. */
export interface StoredRead {
  /** Best intact value, undefined when nothing intact is stored. */
  readonly text: string | undefined;
  /** Integrity problems found while reading (empty for memory and localStorage). */
  readonly issues: readonly string[];
}

/** Key-value text storage behind the save store. */
export interface StorageAdapter {
  readonly kind: 'tauri-store' | 'local-storage' | 'memory';
  read(key: string): Promise<StoredRead>;
  write(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
