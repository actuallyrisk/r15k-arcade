/** Throws for a value that the type system proves impossible (exhaustive switches). */
export function assertNever(_value: never, _context: string): never {
  return notImplemented('engine.assertNever');
}

/** Throws an error with `message` unless `condition` holds. */
export function invariant(_isCondition: boolean, _message: string): asserts _isCondition {
  return notImplemented('engine.invariant');
}

/**
 * Marks a scaffold stub that is not implemented yet and always throws. It never calls anything else,
 * because it is the one function every stub calls.
 */
export function notImplemented(symbol: string): never {
  throw new Error(`not implemented: ${symbol}`);
}
