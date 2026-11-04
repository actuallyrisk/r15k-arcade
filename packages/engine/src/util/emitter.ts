import { notImplemented } from './assert.ts';

/** Removes a listener that was added with `subscribe`. */
export type Unsubscribe = () => void;

/** Minimal synchronous event emitter. */
export interface Emitter<T> {
  emit(value: T): void;
  subscribe(listener: (value: T) => void): Unsubscribe;
  clear(): void;
}

/** Creates an emitter; listener errors are rethrown after all listeners ran. */
export function createEmitter<T>(): Emitter<T> {
  return notImplemented('engine.createEmitter');
}
