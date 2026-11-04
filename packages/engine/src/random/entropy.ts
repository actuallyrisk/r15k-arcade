import { notImplemented } from '../util/assert.ts';

/** A random uint32 seed from the platform's crypto source (default `globalThis.crypto`). */
export function createEntropySeed(_cryptoSource?: Pick<Crypto, 'getRandomValues'>): number {
  return notImplemented('engine.createEntropySeed');
}
