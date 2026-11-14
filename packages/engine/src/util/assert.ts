/** Readable form of an unexpected value for error messages; never throws. */
function describeValue(value: unknown): string {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value !== 'object' || value === null) {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    // Cyclic or BigInt-holding objects cannot be serialised; the type tag still names the value.
    return Object.prototype.toString.call(value);
  }
}

/**
 * Throws for a value that the type system proves impossible (exhaustive switches). The message reads
 * `Unexpected <context>: <value>`.
 */
export function assertNever(value: never, context: string): never {
  throw new Error(`Unexpected ${context}: ${describeValue(value)}`);
}

/** Throws an error with `message` unless `condition` holds. */
export function invariant(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Marks a scaffold stub that is not implemented yet and always throws. It never calls anything else,
 * because it is the one function every stub calls.
 */
export function notImplemented(symbol: string): never {
  throw new Error(`not implemented: ${symbol}`);
}
