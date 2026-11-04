import { expect, test } from 'vitest';
import { createMemorySink } from './memory-sink.ts';

test('a memory sink keeps entries in order as a live view', () => {
  const memory = createMemorySink();
  const view = memory.entries;
  expect(view).toEqual([]);
  memory.sink({ level: 'info', scope: 'a', message: 'one', data: undefined });
  memory.sink({ level: 'warn', scope: 'b', message: 'two', data: 2 });
  expect(view.map((entry) => entry.message)).toEqual(['one', 'two']);
  expect(memory.entries).toBe(view);
});
