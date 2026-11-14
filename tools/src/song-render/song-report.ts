// R15K Arcade tools – the clash and chord-tone report of a song, ported from the original player's song
// validator: per section the sung and played notes, dissonant intervals between sounding voices and how
// often lead and meow hit a chord tone on strong beats. Information for the author; it never fails.
import { channelTokens, noteMidi } from './note-pitch.ts';
import type { SongFile, SongSection } from './song-format.ts';
import { countNotes, SECTION_STEPS } from './validate-song.ts';

/** Report of one section. */
export interface SectionReport {
  readonly section: string;
  readonly meows: number;
  readonly leadNotes: number;
  readonly drumHits: number;
  /** Dissonant intervals on strong beats (every fourth step). */
  readonly strongBeatClashes: number;
  readonly allClashes: number;
  /** Share of lead and meow notes on strong beats that are chord tones (two decimals), if chords exist. */
  readonly chordToneRatioStrongBeats: number | undefined;
  /** The first six strong-beat clashes. */
  readonly firstClashes: readonly string[];
}

/** Voices whose sounding pitches are compared. */
const VOICES = ['lead', 'harmony', 'bass', 'meow'] as const;

/** A voice and the MIDI note it sounds at one step. */
type Sounding = readonly [voice: string, pitch: number];

/** Intervals (in semitones, modulo the octave) that count as clashes: minor second, tritone, major seventh. */
const CLASH_INTERVALS: ReadonlySet<number> = new Set([1, 6, 11]);

/** Chord qualities as semitones above the root. */
const CHORD_QUALITIES: Readonly<Record<string, readonly number[]>> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  dim: [0, 3, 6],
  add9: [0, 4, 7, 2],
};

/** Steps per bar and per beat. */
const BAR_STEPS = 16;
const BEAT_STEPS = 4;
const MAX_LISTED_CLASHES = 6;

/** Pitch classes of a chord name such as 'Am7' or 'F#dim', undefined for an unknown chord. */
function chordPitchClasses(name: string | undefined): readonly number[] | undefined {
  const match = /^([A-G])(#|b)?(.*)$/.exec(name ?? '');
  const root = match === null ? undefined : noteMidi(`${match[1] ?? ''}${match[2] ?? ''}0`);
  const qualityName = match?.[3] ?? '';
  const quality = Object.hasOwn(CHORD_QUALITIES, qualityName)
    ? CHORD_QUALITIES[qualityName]
    : undefined;
  if (root === undefined || quality === undefined) {
    return undefined;
  }
  return quality.map((interval) => (root + interval) % 12);
}

/** The pitch each step sounds (sustains hold the last note, rests end it). */
function soundingPitches(tokens: readonly string[]): readonly (number | undefined)[] {
  let current: number | undefined;
  return tokens.map((token) => {
    if (token !== '-') {
      current = token === '.' ? undefined : noteMidi(token);
    }
    return current;
  });
}

/** Clashing voice pairs at one step, as `voice/voice interval` texts. */
function stepClashes(notes: readonly Sounding[]): readonly string[] {
  const clashes: string[] = [];
  notes.forEach(([voice, pitch], index) => {
    for (const [other, otherPitch] of notes.slice(index + 1)) {
      const interval = Math.abs(pitch - otherPitch) % 12;
      if (CLASH_INTERVALS.has(interval)) {
        clashes.push(`${voice}/${other} interval ${interval}`);
      }
    }
  });
  return clashes;
}

/** Counts of chord-tone hits of lead and meow on the strong beats. */
function chordTones(
  sounding: Readonly<Record<string, readonly (number | undefined)[]>>,
  chords: readonly string[],
): { readonly hits: number; readonly total: number } {
  let hits = 0;
  let total = 0;
  for (let step = 0; step < SECTION_STEPS; step += BEAT_STEPS) {
    const classes = chordPitchClasses(chords[Math.floor(step / BAR_STEPS)]);
    const pitches = [sounding['lead']?.[step], sounding['meow']?.[step]];
    for (const pitch of pitches.filter((value) => value !== undefined)) {
      total += classes === undefined ? 0 : 1;
      hits += classes?.includes(pitch % 12) === true ? 1 : 0;
    }
  }
  return { hits, total };
}

/** Report of one section. */
function sectionReport(song: SongFile, name: string, section: SongSection): SectionReport {
  const sounding = Object.fromEntries(
    VOICES.map((voice) => [voice, soundingPitches(channelTokens(section[voice]))]),
  );
  let allClashes = 0;
  const strong: string[] = [];
  for (let step = 0; step < SECTION_STEPS; step += 1) {
    const notes = VOICES.flatMap((voice): Sounding[] => {
      const pitch = sounding[voice]?.[step];
      return pitch === undefined ? [] : [[voice, pitch]];
    });
    const clashes = stepClashes(notes);
    allClashes += clashes.length;
    strong.push(
      ...(step % BEAT_STEPS === 0 ? clashes.map((clash) => `step ${step} ${clash}`) : []),
    );
  }
  const { hits, total } = chordTones(sounding, song.chords?.[name] ?? []);
  return {
    section: name,
    meows: countNotes(channelTokens(section.meow)),
    leadNotes: countNotes(channelTokens(section.lead)),
    drumHits: channelTokens(section.drums).filter((token) => token !== '.').length,
    strongBeatClashes: strong.length,
    allClashes,
    chordToneRatioStrongBeats: total === 0 ? undefined : Number((hits / total).toFixed(2)),
    firstClashes: strong.slice(0, MAX_LISTED_CLASHES),
  };
}

/** The clash and chord-tone report of every section. */
export function songReport(song: SongFile): readonly SectionReport[] {
  return Object.entries(song.sections).map(([name, section]) => sectionReport(song, name, section));
}
