// R15K Arcade tools – turns a song into note events as the original player does: per section and
// channel, a note token starts an event, `-` extends the previous one and `.` rests. Sustains never
// carry over a section boundary. Events are ordered by step, then by channel.
import { channelTokens, noteMidi } from './note-pitch.ts';
import { SONG_CHANNELS } from './song-format.ts';
import type { SongChannel, SongFile, SongSection } from './song-format.ts';
import { SECTION_STEPS } from './validate-song.ts';

/** One note or drum hit of a song. */
export interface NoteEvent {
  /** Step from the start of the song (sixteenth notes). */
  readonly step: number;
  readonly channel: SongChannel;
  /** Note name or drum token. */
  readonly token: string;
  /** Pitch of a note (0 for drum tokens). */
  readonly frequencyHz: number;
  /** Steps the note lasts, including its sustains. */
  readonly lengthSteps: number;
}

/** MIDI note number of A4. */
const A4_MIDI = 69;
/** Frequency of A4 (Hz). */
const A4_HZ = 440;

/** Frequency of a note token in 12-tone equal temperament ('A4' = 440 Hz); throws for other tokens. */
export function noteFrequency(token: string): number {
  const midi = noteMidi(token);
  if (midi === undefined) {
    throw new Error(`not a note: '${token}'`);
  }
  return A4_HZ * 2 ** ((midi - A4_MIDI) / 12);
}

/** Mutable event while its sustains are counted. */
interface OpenEvent {
  readonly step: number;
  readonly token: string;
  lengthSteps: number;
}

/** The events of one channel string, with steps relative to the section start. */
function channelEvents(tokens: readonly string[]): readonly OpenEvent[] {
  const events: OpenEvent[] = [];
  let current: OpenEvent | undefined;
  tokens.forEach((token, step) => {
    if (token === '-') {
      if (current !== undefined) {
        current.lengthSteps += 1;
      }
      return;
    }
    current = token === '.' ? undefined : { step, token, lengthSteps: 1 };
    if (current !== undefined) {
      events.push(current);
    }
  });
  return events;
}

/** The events of one section, placed at `firstStep`. */
function sectionEvents(section: SongSection, firstStep: number): readonly NoteEvent[] {
  return SONG_CHANNELS.flatMap((channel) =>
    channelEvents(channelTokens(section[channel])).map((event) => ({
      step: firstStep + event.step,
      channel,
      token: event.token,
      frequencyHz: channel === 'drums' ? 0 : noteFrequency(event.token),
      lengthSteps: event.lengthSteps,
    })),
  );
}

/** Every event of a validated song, ordered by step and then by channel. */
export function compileSong(song: SongFile): {
  readonly steps: number;
  readonly events: readonly NoteEvent[];
} {
  const events = song.order.flatMap((name, index) => {
    const section = Object.hasOwn(song.sections, name) ? song.sections[name] : undefined;
    if (section === undefined) {
      throw new Error(`order references unknown section ${name}`);
    }
    return sectionEvents(section, index * SECTION_STEPS);
  });
  return {
    steps: song.order.length * SECTION_STEPS,
    events: [...events].sort((a, b) => a.step - b.step),
  };
}
