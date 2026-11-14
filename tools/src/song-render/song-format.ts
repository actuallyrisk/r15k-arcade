// R15K Arcade tools – the song file format of assets/songs/*.json (the format of the original web
// player): per section five channels of 64 whitespace-separated tokens, sections played in `order`.
// parseSongFile checks the shape only; validateSong checks the musical rules.
import type { Result } from '@r15k/engine';

/** A voice of a song section. */
export type SongChannel = 'lead' | 'harmony' | 'bass' | 'drums' | 'meow';

/** Every channel, in the order the original player schedules them within a step. */
export const SONG_CHANNELS: readonly SongChannel[] = ['lead', 'harmony', 'bass', 'drums', 'meow'];

/** One section: a token string per channel. */
export interface SongSection {
  readonly lead: string;
  readonly harmony: string;
  readonly bass: string;
  readonly drums: string;
  readonly meow: string;
}

/** A song file. */
export interface SongFile {
  readonly name: string;
  readonly bpm: number;
  readonly key: string;
  readonly concept?: string;
  /** Chord names per section, one per bar (used only by the clash report). */
  readonly chords?: Readonly<Record<string, readonly string[]>>;
  readonly sections: Readonly<Record<string, SongSection>>;
  readonly order: readonly string[];
}

/** A JSON object. */
type JsonObject = Readonly<Record<string, unknown>>;

/** Whether a parsed JSON value is an object (not an array, not null). */
function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Whether a value is an array of strings. */
function isStringList(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/** A string field (`''` when invalid, the problem added to `errors` with the field name). */
function stringField(value: JsonObject, field: string, errors: string[]): string {
  const text = value[field];
  if (typeof text === 'string') {
    return text;
  }
  errors.push(`${field} must be a string`);
  return '';
}

/** A section with every channel as a string, or undefined with the problems added to `errors`. */
function parseSection(name: string, value: unknown, errors: string[]): SongSection | undefined {
  if (!isObject(value)) {
    errors.push(`section ${name} must be an object`);
    return undefined;
  }
  const problems: string[] = [];
  const [lead = '', harmony = '', bass = '', drums = '', meow = ''] = SONG_CHANNELS.map((channel) =>
    stringField(value, channel, problems),
  );
  errors.push(...problems.map((problem) => `${name}.${problem}`));
  return problems.length === 0 ? { lead, harmony, bass, drums, meow } : undefined;
}

/** Every valid section (problems added to `errors`). */
function parseSections(value: unknown, errors: string[]): Readonly<Record<string, SongSection>> {
  const sections: Record<string, SongSection> = {};
  if (!isObject(value)) {
    errors.push('sections missing');
    return sections;
  }
  for (const [name, section] of Object.entries(value)) {
    const parsed = parseSection(name, section, errors);
    if (parsed !== undefined) {
      sections[name] = parsed;
    }
  }
  return sections;
}

/** The chord lists, or undefined when absent (problems added to `errors`). */
function parseChords(
  value: unknown,
  errors: string[],
): Readonly<Record<string, readonly string[]>> | undefined {
  if (value === undefined) {
    return undefined;
  }
  const chords: Record<string, readonly string[]> = {};
  if (!isObject(value)) {
    errors.push('chords must map section names to lists of chord names');
    return chords;
  }
  for (const [section, names] of Object.entries(value)) {
    if (isStringList(names)) {
      chords[section] = names;
    } else {
      errors.push(`chords.${section} must be a list of chord names`);
    }
  }
  return chords;
}

/** The optional concept text, or undefined when absent (problems added to `errors`). */
function parseConcept(value: unknown, errors: string[]): string | undefined {
  if (value !== undefined && typeof value !== 'string') {
    errors.push('concept must be a string');
  }
  return typeof value === 'string' ? value : undefined;
}

/** The section order (`[]` when invalid, the problem added to `errors`). */
function parseOrder(value: unknown, errors: string[]): readonly string[] {
  if (isStringList(value)) {
    return value;
  }
  errors.push('order missing');
  return [];
}

/** The tempo (`0` when not a number, the problem added to `errors`). */
function parseBpm(value: unknown, errors: string[]): number {
  if (typeof value === 'number') {
    return value;
  }
  errors.push('bpm must be a number 90..190');
  return 0;
}

/** Every field of a song file; problems are added to `errors`. */
function songFields(value: JsonObject, errors: string[]): SongFile {
  const concept = parseConcept(value['concept'], errors);
  const chords = parseChords(value['chords'], errors);
  return {
    name: stringField(value, 'name', errors),
    bpm: parseBpm(value['bpm'], errors),
    key: stringField(value, 'key', errors),
    ...(concept === undefined ? {} : { concept }),
    ...(chords === undefined ? {} : { chords }),
    sections: parseSections(value['sections'], errors),
    order: parseOrder(value['order'], errors),
  };
}

/** Checks the shape of a parsed song file; the error lists every problem. */
export function parseSongFile(value: unknown): Result<SongFile, readonly string[]> {
  if (!isObject(value)) {
    return { ok: false, error: ['a song file must be a JSON object'] };
  }
  const errors: string[] = [];
  const song = songFields(value, errors);
  return errors.length === 0 ? { ok: true, value: song } : { ok: false, error: errors };
}
