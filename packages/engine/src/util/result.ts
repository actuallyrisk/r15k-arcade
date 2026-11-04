import { notImplemented } from './assert.ts';

/** Successful result of an operation that can fail. */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

/** Failed result of an operation that can fail. */
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

/** Outcome of an operation that can fail, discriminated by `ok`. */
export type Result<T, E> = Ok<T> | Err<E>;

/** Wraps a value in a successful result. */
export function ok<T>(_value: T): Ok<T> {
  return notImplemented('engine.ok');
}

/** Wraps an error in a failed result. */
export function err<E>(_error: E): Err<E> {
  return notImplemented('engine.err');
}
