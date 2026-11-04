// R15K Arcade tools – the musical rules of a song file, ported rule for rule (with the same messages)
// from the original player's song validator: tempo, section order, 64 tokens per channel, drum tokens,
// note ranges per channel and sustains. Warnings are authoring notes and never fail a render.
import { channelTokens, noteMidi } from './note-pitch.ts';
import { SONG_CHANNELS } from './song-format.ts';
import type { SongChannel, SongFile } from './song-format.ts';

/** Result of validating a song. */
export interface SongReport {
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  /** Length of one pass through `order` (s). */
  readonly loopSeconds: number;
}

/** Steps per section: 4 bars of 16 sixteenths. */
export const SECTION_STEPS = 64;

/** A channel that plays notes. */
type PitchedChannel = Exclude<SongChannel, 'drums'>;

/** Lowest and highest note per pitched channel. */
const RANGES: Readonly<Record<PitchedChannel, readonly [string, string]>> = {
  lead: ['C4', 'E6'],
  harmony: ['G3', 'C6'],
  bass: ['E1', 'E3'],
  meow: ['D4', 'A5'],
};

/** Valid drum tokens: kick, snare, hi-hat, open hi-hat, kick with hi-hat, rest. */
const DRUM_TOKENS: ReadonlySet<string> = new Set(['k', 's', 'h', 'o', 'x', '.']);

/** Tempo limits (beats per minute). */
const MIN_BPM = 90;
const MAX_BPM = 190;

/** Meows per section below or above which the section gets a note. */
const MIN_MEOWS = 2;
const MAX_MEOWS = 12;

/** Where the findings of one channel go. */
interface ChannelContext {
  readonly label: string;
  readonly channel: SongChannel;
  readonly errors: string[];
  readonly warnings: string[];
}

/** Checks one note token of a pitched channel against the note pattern and the channel's range. */
function checkNote(
  context: ChannelContext & { readonly channel: PitchedChannel },
  token: string,
  index: number,
): void {
  const { label, channel, errors } = context;
  const pitch = noteMidi(token);
  if (pitch === undefined) {
    errors.push(`${label}.${channel}[${index}]: bad note ${token}`);
    return;
  }
  const [low, high] = RANGES[channel];
  if (pitch < (noteMidi(low) ?? 0) || pitch > (noteMidi(high) ?? 0)) {
    errors.push(`${label}.${channel}[${index}]: ${token} outside ${low}..${high}`);
  }
}

/** Checks one token of a channel. */
function checkToken(context: ChannelContext, token: string, index: number): void {
  const { label, channel } = context;
  if (channel === 'drums') {
    if (!DRUM_TOKENS.has(token)) {
      context.errors.push(`${label}.drums[${index}]: bad token ${token}`);
    }
    return;
  }
  if (token === '.' || token === '-') {
    if (token === '-' && index === 0 && channel !== 'meow') {
      context.warnings.push(
        `${label}.${channel}[0] starts with sustain (continues from previous section)`,
      );
    }
    return;
  }
  checkNote({ ...context, channel }, token, index);
}

/** Checks the token count, every token and the sustains of one channel. */
function checkChannel(context: ChannelContext, tokens: readonly string[]): void {
  const { label, channel, errors } = context;
  if (tokens.length !== SECTION_STEPS) {
    errors.push(`${label}.${channel}: ${tokens.length} tokens, need ${SECTION_STEPS}`);
  }
  tokens.forEach((token, index) => {
    checkToken(context, token, index);
  });
  tokens.forEach((token, index) => {
    if (index > 0 && token === '-' && tokens[index - 1] === '.') {
      errors.push(`${label}.${channel}[${index}]: sustain after rest`);
    }
  });
}

/** The number of sung notes in a meow channel. */
export function countNotes(tokens: readonly string[]): number {
  return tokens.filter((token) => token !== '.' && token !== '-').length;
}

/** Errors about the tempo and the section order. */
function songErrors(song: SongFile): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(song.bpm) || song.bpm < MIN_BPM || song.bpm > MAX_BPM) {
    errors.push(`bpm must be a number ${MIN_BPM}..${MAX_BPM}`);
  }
  if (song.order.length === 0) {
    errors.push('order missing');
  }
  for (const name of song.order) {
    if (!Object.hasOwn(song.sections, name)) {
      errors.push(`order references unknown section ${name}`);
    }
  }
  return errors;
}

/** Checks a song against every rule of the format. */
export function validateSong(song: SongFile): SongReport {
  const errors = songErrors(song);
  const warnings: string[] = [];
  for (const [label, section] of Object.entries(song.sections)) {
    for (const channel of SONG_CHANNELS) {
      checkChannel({ label, channel, errors, warnings }, channelTokens(section[channel]));
    }
    const meows = countNotes(channelTokens(section.meow));
    if (meows < MIN_MEOWS) {
      warnings.push(`${label}: only ${meows} meow(s) - the hook should actually meow`);
    }
    if (meows > MAX_MEOWS) {
      warnings.push(`${label}: ${meows} meows in 4 bars - probably too busy/annoying`);
    }
  }
  const beatsPerMinute = song.bpm > 0 ? song.bpm : 1;
  const loopSeconds = (song.order.length * SECTION_STEPS * 60) / 4 / beatsPerMinute;
  return { errors, warnings, loopSeconds };
}
