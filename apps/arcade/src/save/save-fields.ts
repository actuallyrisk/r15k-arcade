import { INITIALS_ALPHABET, INITIALS_LENGTH } from '@r15k/ui';

/** A parsed JSON object. */
export type Fields = Readonly<Record<string, unknown>>;

/** Where the fields being read live in the document and where their problems are collected. */
export interface FieldContext {
  readonly path: string;
  readonly issues: string[];
}

/** An integer field with bounds and a step (values must be multiples of the step). */
export interface IntegerRule {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

/** Whether a value is a plain JSON object. */
export function isFields(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The context of a nested object field. */
export function childContext(context: FieldContext, key: string): FieldContext {
  return { path: `${context.path}.${key}`, issues: context.issues };
}

/** The value if it passed its check; otherwise the problem is recorded and the result is undefined. */
function checked<T>(
  value: T | undefined,
  context: FieldContext,
  problem: { readonly key: string; readonly message: string },
): T | undefined {
  if (value === undefined) {
    context.issues.push(`${context.path}.${problem.key}: ${problem.message}`);
  }
  return value;
}

/** The object at `key`, or undefined (with an issue). */
export function objectAt(fields: Fields, key: string, context: FieldContext): Fields | undefined {
  const value = fields[key];
  return checked(isFields(value) ? value : undefined, context, {
    key,
    message: 'expected an object',
  });
}

/** The boolean at `key`, or undefined (with an issue). */
export function booleanAt(fields: Fields, key: string, context: FieldContext): boolean | undefined {
  const value = fields[key];
  return checked(typeof value === 'boolean' ? value : undefined, context, {
    key,
    message: 'expected a boolean',
  });
}

/** The string at `key` if it is one of `choices`, or undefined (with an issue). */
export function choiceAt<T extends string>(
  fields: Fields,
  key: string,
  rule: { readonly context: FieldContext; readonly choices: readonly T[] },
): T | undefined {
  const value = fields[key];
  const choice = rule.choices.find((candidate) => candidate === value);
  return checked(choice, rule.context, {
    key,
    message: `expected one of ${rule.choices.join(', ')}`,
  });
}

/** The integer at `key` within the rule, or undefined (with an issue). */
export function integerAt(
  fields: Fields,
  key: string,
  rule: { readonly context: FieldContext } & IntegerRule,
): number | undefined {
  const value = fields[key];
  const isValid =
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= rule.min &&
    value <= rule.max &&
    value % rule.step === 0;
  return checked(isValid ? value : undefined, rule.context, {
    key,
    message: `expected an integer ${rule.min}…${rule.max} (step ${rule.step})`,
  });
}

/** Whether a value is exactly three characters of the initials alphabet. */
export function isInitials(value: unknown): value is string {
  if (typeof value !== 'string' || value.length !== INITIALS_LENGTH) {
    return false;
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!INITIALS_ALPHABET.includes(value.charAt(index))) {
      return false;
    }
  }
  return true;
}

/** The initials at `key`, or undefined (with an issue). */
export function initialsAt(fields: Fields, key: string, context: FieldContext): string | undefined {
  const value = fields[key];
  return checked(isInitials(value) ? value : undefined, context, {
    key,
    message: 'expected three initials',
  });
}
