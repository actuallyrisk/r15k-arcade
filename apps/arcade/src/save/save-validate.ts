import { err, ok, parseLocalDate, validateBindings } from '@r15k/engine';
import type { Bindings, Result } from '@r15k/engine';
import {
  booleanAt,
  childContext,
  choiceAt,
  initialsAt,
  integerAt,
  isFields,
  objectAt,
} from './save-fields.ts';
import type { FieldContext, Fields } from './save-fields.ts';
import type { SaveDocumentV1, ScoreEntryV1, SettingsV1 } from './save-schema.ts';
import { TOP10_SIZE } from './top10.ts';

/** Volume sliders: 0…100 in steps of 10. */
const VOLUME = { min: 0, max: 100, step: 10 } as const;

/** The bindings at `key`, or undefined (with the binding issues). */
function bindingsAt(fields: Fields, key: string, context: FieldContext): Bindings | undefined {
  const result = validateBindings(fields[key]);
  if (result.ok) {
    return result.value;
  }
  context.issues.push(...result.error.map((issue) => `${context.path}.${issue}`));
  return undefined;
}

/** Every settings field, or undefined when one is invalid. */
function readSettings(fields: Fields, context: FieldContext): SettingsV1 | undefined {
  const settings = {
    musicVolume: integerAt(fields, 'musicVolume', { context, ...VOLUME }),
    sfxVolume: integerAt(fields, 'sfxVolume', { context, ...VOLUME }),
    isMuted: booleanAt(fields, 'isMuted', context),
    theme: choiceAt(fields, 'theme', { context, choices: ['system', 'light', 'dark'] }),
    language: choiceAt(fields, 'language', { context, choices: ['system', 'de', 'en'] }),
    reducedMotion: choiceAt(fields, 'reducedMotion', { context, choices: ['system', 'on', 'off'] }),
    intro: choiceAt(fields, 'intro', { context, choices: ['full', 'short', 'off'] }),
    bindings: bindingsAt(fields, 'bindings', context),
  };
  return hasEveryValue(settings) ? settings : undefined;
}

/** Whether no property of a partially read object is undefined. */
function hasEveryValue<T extends object>(
  value: T,
): value is { readonly [K in keyof T]: Exclude<T[K], undefined> } {
  return Object.values(value).every((field) => field !== undefined);
}

/** One top-10 entry, or undefined when a field is invalid. */
function readEntry(value: unknown, context: FieldContext): ScoreEntryV1 | undefined {
  if (!isFields(value)) {
    context.issues.push(`${context.path}: expected an object`);
    return undefined;
  }
  const entry = {
    initials: initialsAt(value, 'initials', context),
    score: integerAt(value, 'score', { context, min: 1, max: Number.MAX_SAFE_INTEGER, step: 1 }),
    date: typeof value['date'] === 'string' ? value['date'] : undefined,
  };
  if (entry.date === undefined || parseLocalDate(entry.date) === undefined) {
    context.issues.push(`${context.path}.date: expected a local date YYYY-MM-DD`);
    return undefined;
  }
  return hasEveryValue(entry) ? entry : undefined;
}

/** The Arcade top 10 (at most 10 entries, sorted by descending score). */
function readTop10(value: unknown, context: FieldContext): readonly ScoreEntryV1[] | undefined {
  if (!Array.isArray(value) || value.length > TOP10_SIZE) {
    context.issues.push(`${context.path}: expected a list of at most ${TOP10_SIZE} entries`);
    return undefined;
  }
  const entries = value.map((entry: unknown, index) =>
    readEntry(entry, childContext(context, String(index))),
  );
  if (!entries.every((entry) => entry !== undefined)) {
    return undefined;
  }
  const isSorted = entries.every(
    (entry, index) => entry.score <= (entries[index - 1]?.score ?? Number.POSITIVE_INFINITY),
  );
  if (!isSorted) {
    context.issues.push(`${context.path}: expected entries sorted by descending score`);
    return undefined;
  }
  return entries;
}

/** The scores object, or undefined when invalid. */
function readScores(fields: Fields, context: FieldContext): SaveDocumentV1['scores'] | undefined {
  const bugHunt = objectAt(fields, 'bugHunt', context);
  if (bugHunt === undefined) {
    return undefined;
  }
  const arcadeContext = childContext(childContext(context, 'bugHunt'), 'arcade');
  const arcade = readTop10(bugHunt['arcade'], arcadeContext);
  return arcade === undefined ? undefined : { bugHunt: { arcade } };
}

/** The meta object, or undefined when invalid. */
function readMeta(fields: Fields, context: FieldContext): SaveDocumentV1['meta'] | undefined {
  const meta = {
    hasCompletedFirstLaunch: booleanAt(fields, 'hasCompletedFirstLaunch', context),
    launchCount: integerAt(fields, 'launchCount', {
      context,
      min: 0,
      max: Number.MAX_SAFE_INTEGER,
      step: 1,
    }),
    lastInitials: initialsAt(fields, 'lastInitials', context),
  };
  return hasEveryValue(meta) ? meta : undefined;
}

/** Reads the section object at a key of the document. */
type SectionReader<T> = (fields: Fields, context: FieldContext) => T | undefined;

/** Validates every field of a parsed save document; the error lists every problem. */
export function validateSave(value: unknown): Result<SaveDocumentV1, readonly string[]> {
  if (!isFields(value)) {
    return err(['save: expected an object']);
  }
  const issues: string[] = [];
  const root: FieldContext = { path: 'save', issues };
  if (value['schemaVersion'] !== 1) {
    issues.push('save.schemaVersion: expected 1');
  }
  const read = <T>(key: string, reader: SectionReader<T>): T | undefined => {
    const fields = objectAt(value, key, root);
    return fields === undefined ? undefined : reader(fields, childContext(root, key));
  };
  const settings = read('settings', readSettings);
  const scores = read('scores', readScores);
  const meta = read('meta', readMeta);
  if (settings === undefined || scores === undefined || meta === undefined || issues.length > 0) {
    return err(issues);
  }
  return ok({ schemaVersion: 1, settings, scores, meta });
}
