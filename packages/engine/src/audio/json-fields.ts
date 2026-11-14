// Field readers for validating parsed JSON (audio manifest and music metadata). A reader returns a
// typed placeholder for a bad field and records one message per problem, so a validator reports every
// problem at once and builds its typed result in a single expression.

/** Reads typed fields of one JSON object; every problem is pushed to the shared error list. */
export interface FieldReader {
  /** A non-empty string. */
  string(key: string): string;
  /** A relative asset path such as 'sfx/ui-move.wav' (no scheme, no leading slash, no '..'). */
  assetPath(key: string): string;
  /** An integer ≥ min (pass −Infinity for any integer). */
  integer(key: string, min: number): number;
  /** Exactly the expected value. */
  literal<T extends string | number>(key: string, expected: T): T;
  /** A nested object. */
  object(key: string): FieldReader;
  /** An array (its items are read by the caller). */
  array(key: string): readonly unknown[];
}

type JsonObject = Readonly<Record<string, unknown>>;

/** What a field must be, and how a problem describes it. */
interface Check<T> {
  readonly expectation: string;
  readonly isValid: (field: unknown) => field is T;
}

/** The object being read (undefined: it was not an object, reads return placeholders silently). */
interface ReaderState {
  readonly record: JsonObject | undefined;
  readonly path: string;
  readonly errors: string[];
}

/** One path segment: letters, digits, '_', '.', '-', but not '.' or '..' alone. */
const PATH_SEGMENT = /^(?!\.{1,2}$)[\w.-]+$/;

const isText = (field: unknown): field is string => typeof field === 'string' && field !== '';

const TEXT: Check<string> = { expectation: 'a non-empty string', isValid: isText };

const ASSET_PATH: Check<string> = {
  expectation: 'a relative asset path',
  isValid: (field): field is string =>
    isText(field) && field.split('/').every((segment) => PATH_SEGMENT.test(segment)),
};

const ARRAY: Check<readonly unknown[]> = {
  expectation: 'an array',
  isValid: (field): field is readonly unknown[] => Array.isArray(field),
};

/** An integer of at least `min` (any integer for −Infinity). */
function integerAtLeast(min: number): Check<number> {
  return {
    expectation: Number.isFinite(min) ? `an integer ≥ ${min}` : 'an integer',
    isValid: (field): field is number =>
      typeof field === 'number' && Number.isInteger(field) && field >= min,
  };
}

/** Exactly `expected`. */
function exactly<T extends string | number>(expected: T): Check<T> {
  return {
    expectation: JSON.stringify(expected),
    isValid: (field): field is T => field === expected,
  };
}

/** Whether a value is a plain JSON object. */
function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The dotted path of a field. */
function labelOf(state: ReaderState, key: string): string {
  return state.path === '' ? key : `${state.path}.${key}`;
}

/** Reads one field; a problem is recorded and gives undefined. */
function readField<T>(state: ReaderState, key: string, check: Check<T>): T | undefined {
  if (state.record === undefined) {
    return undefined;
  }
  const field = state.record[key];
  if (check.isValid(field)) {
    return field;
  }
  state.errors.push(`${labelOf(state, key)}: expected ${check.expectation}`);
  return undefined;
}

/** The reader over one state. */
function createReader(state: ReaderState): FieldReader {
  return {
    string: (key) => readField(state, key, TEXT) ?? '',
    assetPath: (key) => readField(state, key, ASSET_PATH) ?? '',
    integer: (key, min) => readField(state, key, integerAtLeast(min)) ?? min,
    literal: (key, expected) => readField(state, key, exactly(expected)) ?? expected,
    object: (key) =>
      state.record === undefined
        ? createReader(state)
        : fieldReader(state.record[key], labelOf(state, key), state.errors),
    array: (key) => readField(state, key, ARRAY) ?? [],
  };
}

/**
 * A reader for `value` at `path` ('' for the document root, 'music[0]' for an array item). When `value`
 * is not an object, that is the one recorded problem, and every read returns its placeholder silently.
 */
export function fieldReader(value: unknown, path: string, errors: string[]): FieldReader {
  if (!isJsonObject(value)) {
    errors.push(`${path === '' ? 'document' : path}: expected an object`);
  }
  return createReader({ record: isJsonObject(value) ? value : undefined, path, errors });
}
