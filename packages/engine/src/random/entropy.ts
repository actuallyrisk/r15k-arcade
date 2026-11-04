/**
 * A random uint32 seed from the platform's crypto source (default `globalThis.crypto`), which fills the
 * passed array in place. Used only to choose seeds; every random decision after that goes through a
 * seeded generator.
 */
export function createEntropySeed(
  cryptoSource: Pick<Crypto, 'getRandomValues'> = globalThis.crypto,
): number {
  const bytes = new Uint8Array(4);
  cryptoSource.getRandomValues(bytes);
  return new DataView(bytes.buffer).getUint32(0, true);
}
