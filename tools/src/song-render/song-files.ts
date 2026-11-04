// R15K Arcade tools – loads the song files of assets/songs (sorted by file name; the id is the file name
// without `.json`) and checks their shape and musical rules.
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parseSongFile } from './song-format.ts';
import type { SongFile } from './song-format.ts';
import { validateSong } from './validate-song.ts';
import type { SongReport } from './validate-song.ts';

/** A song file with its validation report. */
export interface LoadedSong {
  readonly id: string;
  /** File text exactly as stored (it feeds the input hash). */
  readonly text: string;
  /** Undefined when the file is not valid JSON or not shaped like a song. */
  readonly song: SongFile | undefined;
  readonly report: SongReport;
}

/** Parses and validates one song file. */
function loadSong(path: string): LoadedSong {
  const id = basename(path, '.json');
  const text = readFileSync(path, 'utf8');
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      id,
      text,
      song: undefined,
      report: { errors: [reason], warnings: [], loopSeconds: 0 },
    };
  }
  const parsed = parseSongFile(value);
  if (!parsed.ok) {
    return {
      id,
      text,
      song: undefined,
      report: { errors: parsed.error, warnings: [], loopSeconds: 0 },
    };
  }
  return { id, text, song: parsed.value, report: validateSong(parsed.value) };
}

/** Every song file in `directory`, sorted by file name. */
export function loadSongs(directory: string): readonly LoadedSong[] {
  return readdirSync(directory)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => loadSong(join(directory, file)));
}
