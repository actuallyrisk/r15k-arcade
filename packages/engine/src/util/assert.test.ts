import { expect, test } from 'vitest';
import { assertNever, invariant, notImplemented } from './assert.ts';

/** Calls assertNever with a value the type system would not allow. */
const failWith = (value: unknown): (() => never) => {
  return () => assertNever(value as never, 'kind');
};

test('assertNever names the context and the value', () => {
  expect(failWith('bomb')).toThrow('Unexpected kind: "bomb"');
  expect(failWith(7)).toThrow('Unexpected kind: 7');
  expect(failWith(undefined)).toThrow('Unexpected kind: undefined');
  expect(failWith(null)).toThrow('Unexpected kind: null');
  expect(failWith({ type: 'x' })).toThrow('Unexpected kind: {"type":"x"}');
});

test('assertNever still describes values that JSON cannot serialise', () => {
  const cyclic: { self?: unknown } = {};
  cyclic.self = cyclic;
  expect(failWith(cyclic)).toThrow('Unexpected kind: [object Object]');
  expect(failWith(10n)).toThrow('Unexpected kind: 10');
});

test('invariant passes silently or throws its message', () => {
  expect(() => {
    invariant(true, 'never shown');
  }).not.toThrow();
  expect(() => {
    invariant(false, 'broken invariant');
  }).toThrow('broken invariant');
});

test('notImplemented names the symbol', () => {
  expect(() => notImplemented('engine.example')).toThrow('not implemented: engine.example');
});
