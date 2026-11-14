import { beforeEach, expect, test, vi } from 'vitest';
import { createLogger } from '../logger/logger.ts';
import { createMemorySink } from '../logger/memory-sink.ts';
import { err, ok } from '../util/result.ts';
import { SaveStore } from './save-store.ts';
import { createTauriStoreAdapter } from './tauri-store-adapter.ts';

/** Saved contents per store file, and the order of every save. */
const fake = vi.hoisted(() => ({
  files: new Map<string, Map<string, unknown>>(),
  saves: [] as string[],
  options: [] as unknown[],
}));

vi.mock('@tauri-apps/plugin-store', () => ({
  load: (path: string, options: unknown) => {
    fake.options.push(options);
    const data = new Map(fake.files.get(path) ?? []);
    return Promise.resolve({
      get: (key: string) => Promise.resolve(data.get(key)),
      set: (key: string, value: unknown) => Promise.resolve(void data.set(key, value)),
      delete: (key: string) => Promise.resolve(data.delete(key)),
      save: () => {
        fake.files.set(path, new Map(data));
        fake.saves.push(path);
        return Promise.resolve();
      },
    });
  },
}));

/** The slot entry stored in a file, parsed. */
function entryIn(path: string): { generation: number; checksum: string; value: string } {
  const raw = fake.files.get(path)?.get('save');
  if (typeof raw !== 'string') {
    throw new Error(`no entry in ${path}`);
  }
  return JSON.parse(raw) as { generation: number; checksum: string; value: string };
}

function setEntry(path: string, entry: unknown): void {
  fake.files.set(path, new Map([['save', entry]]));
}

async function writeAll(values: readonly string[]): Promise<void> {
  const adapter = await createTauriStoreAdapter('save');
  for (const value of values) {
    await adapter.write('save', value);
  }
}

beforeEach(() => {
  fake.files.clear();
  fake.saves.length = 0;
  fake.options.length = 0;
});

test('two-slot Tauri store adapter: writes alternate slots by generation and never touch the previous copy', async () => {
  await writeAll(['one', 'two', 'three']);
  expect(fake.saves).toEqual(['save-b.json', 'save-a.json', 'save-b.json']);
  expect(entryIn('save-a.json')).toMatchObject({ generation: 2, value: 'two' });
  expect(entryIn('save-b.json')).toMatchObject({ generation: 3, value: 'three' });
  expect(fake.options).toEqual([
    { autoSave: false, defaults: {} },
    { autoSave: false, defaults: {} },
  ]);
  const adapter = await createTauriStoreAdapter('save');
  expect(adapter.kind).toBe('tauri-store');
  expect(await adapter.read('save')).toEqual({ text: 'three', issues: [] });
});

test('two-slot Tauri store adapter: a truncated newest slot loads the other one and reports the loss', async () => {
  await writeAll(['one', 'two', 'three']);
  fake.files.set('save-b.json', new Map());
  const adapter = await createTauriStoreAdapter('save');
  expect(await adapter.read('save')).toEqual({ text: 'two', issues: ['slot b: missing entry'] });
});

test('two-slot Tauri store adapter: a truncated slot A falls back to slot B', async () => {
  await writeAll(['one', 'two']);
  fake.files.set('save-a.json', new Map());
  const adapter = await createTauriStoreAdapter('save');
  expect(await adapter.read('save')).toEqual({ text: 'one', issues: [] });
});

test('two-slot Tauri store adapter: checksum mismatches and unreadable entries are dropped with an issue', async () => {
  await writeAll(['one', 'two']);
  setEntry('save-a.json', JSON.stringify({ ...entryIn('save-a.json'), value: 'tampered' }));
  const adapter = await createTauriStoreAdapter('save');
  expect(await adapter.read('save')).toEqual({
    text: 'one',
    issues: ['slot a: checksum mismatch'],
  });
  await adapter.write('save', 'three');
  expect(entryIn('save-a.json')).toMatchObject({ generation: 2, value: 'three' });
  expect(entryIn('save-b.json')).toMatchObject({ generation: 1, value: 'one' });
});

test('two-slot Tauri store adapter: both slots corrupt: nothing intact, two issues', async () => {
  setEntry('save-a.json', '{"generation":');
  setEntry('save-b.json', 42);
  const adapter = await createTauriStoreAdapter('save');
  expect(await adapter.read('save')).toEqual({
    text: undefined,
    issues: ['slot a: unreadable entry', 'slot b: unreadable entry'],
  });
  setEntry('save-a.json', JSON.stringify({ generation: 0, checksum: 'x', value: 'v' }));
  setEntry('save-b.json', 'null');
  const again = await createTauriStoreAdapter('save');
  expect((await again.read('save')).issues).toHaveLength(2);
});

test('two-slot Tauri store adapter: a write without a read continues after the stored generation', async () => {
  await writeAll(['one', 'two', 'three']);
  await writeAll(['four']);
  expect(entryIn('save-a.json')).toMatchObject({ generation: 4, value: 'four' });
});

test('two-slot Tauri store adapter: remove deletes the key from both slots', async () => {
  await writeAll(['one', 'two']);
  const adapter = await createTauriStoreAdapter('save');
  await adapter.remove('save');
  expect(await adapter.read('save')).toEqual({ text: undefined, issues: [] });
  await adapter.write('save', 'fresh');
  expect(entryIn('save-b.json')).toMatchObject({ generation: 1, value: 'fresh' });
});

test('save store on the two-slot adapter: debounced writes alternate slots; both corrupt is recovered', async () => {
  vi.useFakeTimers();
  const schema = {
    currentVersion: 1,
    migrations: [],
    validate: (value: unknown) => (typeof value === 'object' ? ok(value) : err(['no object'])),
    createDefault: () => ({ schemaVersion: 1 }),
  };
  const logger = createLogger({ isEnabled: true, sink: createMemorySink().sink });
  const adapter = await createTauriStoreAdapter('save');
  const store = new SaveStore({ adapter, schema, key: 'save', logger });
  await store.load();
  store.update(() => ({ schemaVersion: 1, round: 1 }));
  await vi.advanceTimersByTimeAsync(250);
  store.update(() => ({ schemaVersion: 1, round: 2 }));
  await vi.advanceTimersByTimeAsync(250);
  expect(fake.saves).toEqual(['save-b.json', 'save-a.json']);
  setEntry('save-a.json', 'broken');
  setEntry('save-b.json', 'broken');
  const corrupt = new SaveStore({
    adapter: await createTauriStoreAdapter('save'),
    schema,
    key: 'save',
    logger,
  });
  expect((await corrupt.load()).kind).toBe('recovered');
  vi.useRealTimers();
});
