import { SIM_STEP_HZ } from '@r15k/engine';
import type { GameModeId, Result } from '@r15k/engine';
import { CAT_MAX_X, NO_AIM_X } from './derived.ts';
import type { Replay, ReplayInputEntry } from './replay.ts';

/** A runtime check of one field value and the wording of its expectation. */
interface Check<T> {
  readonly test: (value: unknown) => value is T;
  readonly expected: string;
}

/** The fields of a replay file being validated and the problems found so far. */
interface Reader {
  readonly record: Readonly<Record<string, unknown>>;
  readonly problems: string[];
}

/** Fields that are all present: every `undefined` removed from the value types. */
type Complete<T> = { readonly [K in keyof T]-?: Exclude<T[K], undefined> };

/** The keys of a replay file, in the order the tools write them. */
const REPLAY_KEYS = [
  'format',
  'version',
  'game',
  'mode',
  'contentVersion',
  'seed',
  'stepHz',
  'steps',
  'inputs',
  'finalHash',
  'finalScore',
  'note',
] as const;
const KNOWN_KEYS: ReadonlySet<string> = new Set(REPLAY_KEYS);

/** Every game mode a replay may name (a record, so a new mode cannot be forgotten here). */
const MODES: Readonly<Record<GameModeId, true>> = { arcade: true };

/** Largest seed: seeds are unsigned 32-bit integers. */
const MAX_SEED = 0xffffffff;

/** Whether a value is a plain object (not an array). */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Whether a value is an array (its elements stay unknown). */
function isList(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

/** Whether a value is a safe integer in `[min, max]`. */
function isIntegerIn(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
}

/** Whether a value is a held direction. */
function isMove(value: unknown): value is -1 | 0 | 1 {
  return value === -1 || value === 0 || value === 1;
}

/** Exactly one literal value. */
function literal<const T extends string | number>(expected: T): Check<T> {
  return {
    test: (value): value is T => value === expected,
    expected: typeof expected === 'string' ? `'${expected}'` : String(expected),
  };
}

/** A safe integer from `min` on. */
function integerFrom(min: number): Check<number> {
  return {
    test: (value): value is number => isIntegerIn(value, min, Number.MAX_SAFE_INTEGER),
    expected: `an integer ≥ ${min}`,
  };
}

const SEED: Check<number> = {
  test: (value): value is number => isIntegerIn(value, 0, MAX_SEED),
  expected: `an integer in 0…${MAX_SEED}`,
};
const MODE: Check<GameModeId> = {
  test: (value): value is GameModeId => typeof value === 'string' && Object.hasOwn(MODES, value),
  expected: `one of ${Object.keys(MODES).join(', ')}`,
};
const HASH: Check<string> = {
  test: (value): value is string => typeof value === 'string' && /^[0-9a-f]{8}$/.test(value),
  expected: '8 lower-case hex digits',
};
const TEXT: Check<string> = {
  test: (value): value is string => typeof value === 'string',
  expected: 'a string',
};

/** Reads one field, recording a problem when it fails its check. */
function read<T>(
  reader: Reader,
  key: (typeof REPLAY_KEYS)[number],
  check: Check<T>,
): T | undefined {
  const value = reader.record[key];
  if (check.test(value)) {
    return value;
  }
  reader.problems.push(`${key}: expected ${check.expected}`);
  return undefined;
}

/** One input entry, or the problem that makes it invalid. */
function readEntry(entry: unknown, firstTick: number, lastTick: number): ReplayInputEntry | string {
  if (!isList(entry) || entry.length !== 3) {
    return 'expected [tick, move, aimX]';
  }
  const [tick, move, aimX] = entry;
  if (!isIntegerIn(tick, firstTick, lastTick)) {
    return `tick: expected an integer in ${firstTick}…${lastTick} (strictly increasing, below steps)`;
  }
  if (!isMove(move)) {
    return 'move: expected -1, 0 or 1';
  }
  if (aimX !== NO_AIM_X && !isIntegerIn(aimX, 0, CAT_MAX_X)) {
    return `aimX: expected ${NO_AIM_X} or an integer in 0…${CAT_MAX_X}`;
  }
  return [tick, move, aimX];
}

/** Reads the input log; every invalid entry is reported with its index. */
function readInputs(
  reader: Reader,
  steps: number | undefined,
): readonly ReplayInputEntry[] | undefined {
  const value = reader.record['inputs'];
  if (!isList(value)) {
    reader.problems.push('inputs: expected an array');
    return undefined;
  }
  const lastTick = steps === undefined ? Number.MAX_SAFE_INTEGER : steps - 1;
  const entries: ReplayInputEntry[] = [];
  value.forEach((entry, index) => {
    const result = readEntry(entry, (entries.at(-1)?.[0] ?? -1) + 1, lastTick);
    if (typeof result === 'string') {
      reader.problems.push(`inputs[${index}]: ${result}`);
    } else {
      entries.push(result);
    }
  });
  return entries.length === value.length ? entries : undefined;
}

/** Whether every field was read successfully. */
function isComplete<T extends object>(fields: T): fields is T & Complete<T> {
  return Object.values(fields).every((value) => value !== undefined);
}

/** Validates a parsed replay file; the error lists every problem. */
export function parseReplay(value: unknown): Result<Replay, readonly string[]> {
  if (!isRecord(value)) {
    return { ok: false, error: ['expected a replay object'] };
  }
  const reader: Reader = { record: value, problems: [] };
  const steps = read(reader, 'steps', integerFrom(0));
  const fields = {
    format: read(reader, 'format', literal('r15k-replay')),
    version: read(reader, 'version', literal(1)),
    game: read(reader, 'game', literal('bug-hunt')),
    mode: read(reader, 'mode', MODE),
    contentVersion: read(reader, 'contentVersion', integerFrom(1)),
    seed: read(reader, 'seed', SEED),
    stepHz: read(reader, 'stepHz', literal(SIM_STEP_HZ)),
    steps,
    inputs: readInputs(reader, steps),
    finalHash: read(reader, 'finalHash', HASH),
    finalScore: read(reader, 'finalScore', integerFrom(0)),
    note: read(reader, 'note', TEXT),
  };
  for (const key of Object.keys(value).filter((name) => !KNOWN_KEYS.has(name))) {
    reader.problems.push(`${key}: unknown field`);
  }
  return isComplete(fields) && reader.problems.length === 0
    ? { ok: true, value: fields }
    : { ok: false, error: reader.problems };
}
