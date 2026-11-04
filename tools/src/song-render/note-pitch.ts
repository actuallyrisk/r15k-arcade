// R15K Arcade tools – note names of the song format ('A4', 'C#5', 'Bb3') as MIDI note numbers, and the
// token list of a channel string.

/** A note token: letter, optional sharp or flat, one octave digit. */
const NOTE_PATTERN = /^([A-G])(#|b)?(\d)$/;

/** Semitones of the natural notes above C. */
const SEMITONES: Readonly<Record<string, number>> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Semitone shift of an accidental. */
const ACCIDENTALS: Readonly<Record<string, number>> = { '#': 1, b: -1 };

/** MIDI note number of a note token (12 · (octave + 1) + semitone), undefined for any other token. */
export function noteMidi(token: string): number | undefined {
  const match = NOTE_PATTERN.exec(token);
  if (match === null) {
    return undefined;
  }
  const [, letter = '', accidental = '', octave = ''] = match;
  return 12 * (Number(octave) + 1) + (SEMITONES[letter] ?? 0) + (ACCIDENTALS[accidental] ?? 0);
}

/** The whitespace-separated tokens of a channel string. */
export function channelTokens(text: string): readonly string[] {
  return text
    .trim()
    .split(/\s+/)
    .filter((token) => token !== '');
}
