import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createLogger } from '../logger/logger.ts';
import { createMemorySink } from '../logger/memory-sink.ts';
import type { MemorySink } from '../logger/memory-sink.ts';
import { err, ok } from '../util/result.ts';
import { createMemoryStorageAdapter } from './memory-storage-adapter.ts';
import type { SaveSchema } from './save-schema.ts';
import { SaveStore } from './save-store.ts';
import type { StorageAdapter, StoredRead } from './storage-adapter.ts';

interface Document {
  readonly schemaVersion: number;
  readonly count: number;
}

const SCHEMA: SaveSchema<Document> = {
  currentVersion: 2,
  migrations: [{ from: 1, migrate: (old) => ({ schemaVersion: 2, count: Number(old['total']) }) }],
  validate: (value) => {
    const candidate = value as Partial<Document>;
    return typeof candidate.count === 'number' && Number.isFinite(candidate.count)
      ? ok({ schemaVersion: 2, count: candidate.count })
      : err(['count: expected a number']);
  },
  createDefault: () => ({ schemaVersion: 2, count: 0 }),
};

let sink: MemorySink;
let writes: (readonly [string, string])[];

/** A memory adapter that records every write. */
function recording(initial: Readonly<Record<string, string>> = {}): StorageAdapter {
  const adapter = createMemoryStorageAdapter(initial);
  return {
    ...adapter,
    write: (key, value) => {
      writes.push([key, value]);
      return adapter.write(key, value);
    },
  };
}

function storeOn(
  adapter: StorageAdapter,
  schema: SaveSchema<Document> = SCHEMA,
): SaveStore<Document> {
  const logger = createLogger({ isEnabled: true, sink: sink.sink });
  return new SaveStore({ adapter, schema, key: 'save', logger });
}

const stored = (document: unknown): Record<string, string> => ({ save: JSON.stringify(document) });
const increment = (document: Document): Document => ({ ...document, count: document.count + 1 });

beforeEach(() => {
  vi.useFakeTimers();
  sink = createMemorySink();
  writes = [];
});

afterEach(() => {
  vi.useRealTimers();
});

test('load outcomes: nothing stored: fresh defaults; changes are written after the delay', async () => {
  const store = storeOn(recording());
  expect(await store.load()).toEqual({ kind: 'fresh' });
  store.update(increment);
  store.update(increment);
  expect(writes).toEqual([]);
  await vi.advanceTimersByTimeAsync(250);
  expect(writes).toEqual([['save', '{"schemaVersion":2,"count":2}']]);
});

test('load outcomes: a valid document is loaded', async () => {
  const store = storeOn(recording(stored({ schemaVersion: 2, count: 7 })));
  expect(await store.load()).toEqual({
    kind: 'loaded',
    migratedFrom: undefined,
    isFromBackupSlot: false,
  });
  expect(store.get().count).toBe(7);
});

test('load outcomes: text with read issues came from the backup slot', async () => {
  const adapter: StorageAdapter = {
    ...recording(),
    read: (): Promise<StoredRead> =>
      Promise.resolve({
        text: '{"schemaVersion":2,"count":3}',
        issues: ['slot a: checksum mismatch'],
      }),
  };
  const store = storeOn(adapter);
  expect(await store.load()).toEqual({
    kind: 'loaded',
    migratedFrom: undefined,
    isFromBackupSlot: true,
  });
  expect(sink.entries.map((entry) => entry.message)).toContain('save loaded from the backup slot');
});

test('load outcomes: no intact text but issues: recovered', async () => {
  const adapter: StorageAdapter = {
    ...recording(),
    read: () => Promise.resolve({ text: undefined, issues: ['slot a: unreadable entry'] }),
  };
  expect(await storeOn(adapter).load()).toEqual({
    kind: 'recovered',
    issues: ['slot a: unreadable entry'],
  });
});

test('load outcomes: invalid JSON, a missing version and an invalid document are recovered', async () => {
  const cases = [
    [{ save: '{"sche' }, 'stored save is not valid JSON'],
    [stored([1, 2]), 'stored save has no schemaVersion'],
    [stored({ schemaVersion: 2, count: 'many' }), 'count: expected a number'],
  ] as const;
  for (const [initial, issue] of cases) {
    const store = storeOn(recording(initial));
    expect(await store.load()).toEqual({ kind: 'recovered', issues: [issue] });
    expect(store.get()).toEqual(SCHEMA.createDefault());
  }
});

test('load outcomes: the corrupt raw text is kept before the first write', async () => {
  const store = storeOn(recording({ save: 'garbage' }));
  await store.load();
  expect(writes).toEqual([]);
  store.update(increment);
  await store.flush();
  expect(writes).toEqual([
    ['save.corrupt', 'garbage'],
    ['save', '{"schemaVersion":2,"count":1}'],
  ]);
});

test('load outcomes: a newer document makes the store read-only with defaults in memory', async () => {
  const store = storeOn(recording(stored({ schemaVersion: 9, count: 1 })));
  expect(await store.load()).toEqual({ kind: 'newer-version', version: 9 });
  expect(store.isReadOnly).toBe(true);
  store.update(increment);
  await store.flush();
  await vi.advanceTimersByTimeAsync(1000);
  expect(writes).toEqual([]);
  expect(store.get().count).toBe(1);
});

test('load outcomes: a storage read failure recovers read-only, so the stored save is never overwritten', async () => {
  const adapter: StorageAdapter = { ...recording(), read: () => Promise.reject(new Error('io')) };
  const store = storeOn(adapter);
  expect(await store.load()).toEqual({ kind: 'recovered', issues: ['storage read failed'] });
  expect(store.isReadOnly).toBe(true);
  store.update(increment);
  await store.flush();
  expect(writes).toEqual([]);
});

test('load outcomes: load may be called only once', async () => {
  const store = storeOn(recording());
  await store.load();
  await expect(store.load()).rejects.toThrow(/only once/);
});

test('migrations: an old document is migrated and its raw text kept as save.v1 before the first write', async () => {
  const raw = JSON.stringify({ schemaVersion: 1, total: 5 });
  const store = storeOn(recording({ save: raw }));
  expect(await store.load()).toEqual({
    kind: 'loaded',
    migratedFrom: 1,
    isFromBackupSlot: false,
  });
  expect(store.get()).toEqual({ schemaVersion: 2, count: 5 });
  store.update(increment);
  await store.flush();
  expect(writes).toEqual([
    ['save.v1', raw],
    ['save', '{"schemaVersion":2,"count":6}'],
  ]);
});

test('migrations: a missing or failing migration recovers', async () => {
  const withoutMigration = { ...SCHEMA, migrations: [] };
  const missing = storeOn(recording(stored({ schemaVersion: 1, total: 1 })), withoutMigration);
  expect(await missing.load()).toEqual({
    kind: 'recovered',
    issues: ['no migration from schemaVersion 1'],
  });
  const throwing = {
    ...SCHEMA,
    migrations: [
      {
        from: 1,
        migrate: (): Record<string, unknown> => {
          throw new Error('broken');
        },
      },
    ],
  };
  const failing = storeOn(recording(stored({ schemaVersion: 1 })), throwing);
  expect(await failing.load()).toEqual({
    kind: 'recovered',
    issues: ['migration from schemaVersion 1 failed'],
  });
  expect(sink.entries.some((entry) => entry.level === 'error')).toBe(true);
});

test('before load, debounce and flush: get before load is the default; update before load writes nothing and is replaced', async () => {
  const store = storeOn(recording(stored({ schemaVersion: 2, count: 4 })));
  expect(store.get()).toEqual({ schemaVersion: 2, count: 0 });
  store.update(increment);
  expect(store.get().count).toBe(1);
  await vi.advanceTimersByTimeAsync(1000);
  await store.flush();
  expect(writes).toEqual([]);
  await store.load();
  expect(store.get().count).toBe(4);
});

test('before load, debounce and flush: flush writes at once; a flush without changes writes nothing', async () => {
  const store = storeOn(recording());
  await store.load();
  await store.flush();
  store.update(increment);
  await store.flush();
  await vi.advanceTimersByTimeAsync(1000);
  expect(writes).toHaveLength(1);
});

test('before load, debounce and flush: a failed write is logged and retried with the next flush', async () => {
  const adapter = recording();
  let isFailing = true;
  const store = storeOn({
    ...adapter,
    write: (key, value) =>
      isFailing ? Promise.reject(new Error('disk full')) : adapter.write(key, value),
  });
  await store.load();
  store.update(increment);
  await store.flush();
  expect(sink.entries.at(-1)?.level).toBe('error');
  isFailing = false;
  await store.flush();
  expect(writes).toEqual([['save', '{"schemaVersion":2,"count":1}']]);
});
