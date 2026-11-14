/** Removes a listener that was added with `subscribe`. */
export type Unsubscribe = () => void;

/** Minimal synchronous event emitter. */
export interface Emitter<T> {
  /** Calls every current listener with `value`, in subscription order. */
  emit(value: T): void;
  /** Adds a listener; the returned function removes it (calling it twice is harmless). */
  subscribe(listener: (value: T) => void): Unsubscribe;
  /** Removes every listener. */
  clear(): void;
}

/** One subscription; an object so that the same function can be subscribed twice independently. */
interface Subscription<T> {
  readonly listener: (value: T) => void;
}

/** Rethrows the errors that listeners raised during one emit. */
function rethrow(errors: readonly unknown[]): void {
  const [first] = errors;
  if (errors.length === 1) {
    throw first;
  }
  if (errors.length > 1) {
    throw new AggregateError(errors, `${errors.length} listeners failed`);
  }
}

/**
 * Creates an emitter. Every listener runs even when an earlier one throws; afterwards the error is
 * rethrown (several errors as one AggregateError). A listener removed during an emit is not called
 * by that emit any more; one added during an emit first receives the next value.
 */
export function createEmitter<T>(): Emitter<T> {
  const subscriptions = new Set<Subscription<T>>();
  return {
    emit(value: T): void {
      const errors: unknown[] = [];
      for (const subscription of [...subscriptions]) {
        if (!subscriptions.has(subscription)) {
          continue;
        }
        try {
          subscription.listener(value);
        } catch (error: unknown) {
          errors.push(error);
        }
      }
      rethrow(errors);
    },
    subscribe(listener: (value: T) => void): Unsubscribe {
      const subscription: Subscription<T> = { listener };
      subscriptions.add(subscription);
      return () => {
        subscriptions.delete(subscription);
      };
    },
    clear(): void {
      subscriptions.clear();
    },
  };
}
