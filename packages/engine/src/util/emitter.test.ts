import { expect, test } from 'vitest';
import { createEmitter } from './emitter.ts';

test('listeners receive values in subscription order until they unsubscribe', () => {
  const emitter = createEmitter<number>();
  const seen: string[] = [];
  const stopA = emitter.subscribe((value) => seen.push(`a${value}`));
  emitter.subscribe((value) => seen.push(`b${value}`));
  emitter.emit(1);
  stopA();
  stopA();
  emitter.emit(2);
  expect(seen).toEqual(['a1', 'b1', 'b2']);
});

test('the same function subscribed twice is called twice and removed independently', () => {
  const emitter = createEmitter<string>();
  const seen: string[] = [];
  const listener = (value: string): void => {
    seen.push(value);
  };
  const first = emitter.subscribe(listener);
  emitter.subscribe(listener);
  emitter.emit('x');
  first();
  emitter.emit('y');
  expect(seen).toEqual(['x', 'x', 'y']);
});

test('clear removes every listener', () => {
  const emitter = createEmitter<number>();
  let count = 0;
  emitter.subscribe(() => (count += 1));
  emitter.clear();
  emitter.emit(1);
  expect(count).toBe(0);
});

test('a listener error is rethrown after the other listeners ran', () => {
  const emitter = createEmitter<number>();
  const seen: number[] = [];
  emitter.subscribe(() => {
    throw new Error('first failed');
  });
  emitter.subscribe((value) => seen.push(value));
  expect(() => {
    emitter.emit(5);
  }).toThrow('first failed');
  expect(seen).toEqual([5]);
});

test('several listener errors are rethrown together', () => {
  const emitter = createEmitter<number>();
  const fail = (): void => {
    throw new Error('failed');
  };
  emitter.subscribe(fail);
  emitter.subscribe(fail);
  let caught: unknown;
  try {
    emitter.emit(1);
  } catch (error: unknown) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(AggregateError);
  expect((caught as AggregateError).errors).toHaveLength(2);
});

test('changes during an emit apply to later listeners and later values', () => {
  const emitter = createEmitter<number>();
  const seen: string[] = [];
  let stopLate = (): void => undefined;
  emitter.subscribe((value) => {
    seen.push(`first${value}`);
    stopLate();
    emitter.subscribe((next) => seen.push(`added${next}`));
  });
  stopLate = emitter.subscribe((value) => seen.push(`late${value}`));
  emitter.emit(1);
  expect(seen).toEqual(['first1']);
  emitter.clear();
});
