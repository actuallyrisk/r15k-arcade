// R15K Arcade tools – the report of `pnpm assets --check`: per song its loop length, every validator
// warning as an authoring note (`note: <song>: <warning>`, deliberately without a warning prefix: notes
// never fail a build) and the clash and chord-tone report per section.
import type { SfxDefinition } from '@r15k/engine';
import type { CliOutput } from '../shared/cli-output.ts';
import type { LoadedSong } from './song-files.ts';
import { songReport } from './song-report.ts';
import type { SectionReport } from './song-report.ts';

/** One info line per section, followed by its first strong-beat clashes. */
function sectionLines(id: string, section: SectionReport): readonly string[] {
  const ratio = section.chordToneRatioStrongBeats;
  return [
    `${id} ${section.section}: ${section.meows} meows, ${section.leadNotes} lead notes, ` +
      `${section.drumHits} drum hits, ${section.strongBeatClashes} strong-beat clashes ` +
      `(${section.allClashes} in total), chord tones on strong beats ${ratio === undefined ? 'n/a' : ratio.toFixed(2)}`,
    ...section.firstClashes.map((clash) => `${id} ${section.section}: clash at ${clash}`),
  ];
}

/** Prints the check report of valid songs and SFX definitions. */
export function printCheckReport(
  songs: readonly LoadedSong[],
  sfx: readonly SfxDefinition[],
  out: CliOutput,
): void {
  for (const { id, song, report } of songs) {
    out.info(`${id}: valid, loop ${report.loopSeconds.toFixed(2)} s`);
    for (const warning of report.warnings) {
      out.info(`note: ${id}: ${warning}`);
    }
    for (const section of song === undefined ? [] : songReport(song)) {
      sectionLines(id, section).forEach((line) => {
        out.info(line);
      });
    }
  }
  out.info(`sfx: ${sfx.length} definitions valid`);
}
