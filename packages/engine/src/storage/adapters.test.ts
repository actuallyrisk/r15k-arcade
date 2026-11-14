// @vitest-environment happy-dom
import { beforeEach, expect, test } from 'vitest';
import { createLocalStorageAdapter } from './local-storage-adapter.ts';
import { createMemoryStorageAdapter } from './memory-storage-adapter.ts';

test('memory adapter: reads its initial entries, writes and removes', async () => {
  const adapter = createMemoryStorageAdapter({ save: 'one' });
  expect(adapter.kind).toBe('memory');
  expect(await adapter.read('save')).toEqual({ text: 'one', issues: [] });
  await adapter.write('save', 'two');
  expect(await adapter.read('save')).toEqual({ text: 'two', issues: [] });
  await adapter.remove('save');
  expect(await adapter.read('save')).toEqual({ text: undefined, issues: [] });
  expect((await createMemoryStorageAdapter().read('x')).text).toBeUndefined();
});

beforeEach(() => {
  localStorage.clear();
});

test('localStorage adapter: keys carry the prefix', async () => {
  const adapter = createLocalStorageAdapter(localStorage, 'r15k-arcade:');
  expect(adapter.kind).toBe('local-storage');
  expect(await adapter.read('save')).toEqual({ text: undefined, issues: [] });
  await adapter.write('save', '{"a":1}');
  expect(localStorage.getItem('r15k-arcade:save')).toBe('{"a":1}');
  expect(await adapter.read('save')).toEqual({ text: '{"a":1}', issues: [] });
  await adapter.remove('save');
  expect(localStorage.getItem('r15k-arcade:save')).toBeNull();
});

test('localStorage adapter: storage exceptions become rejected promises', async () => {
  const failing = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('quota');
    },
    removeItem: () => {
      throw new Error('blocked');
    },
  } as unknown as Storage;
  const adapter = createLocalStorageAdapter(failing, '');
  await expect(adapter.read('save')).rejects.toThrow('blocked');
  await expect(adapter.write('save', 'x')).rejects.toThrow('quota');
  await expect(adapter.remove('save')).rejects.toThrow('blocked');
});
