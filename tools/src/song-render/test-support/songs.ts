// R15K Arcade tools – song fixtures for the renderer's tests: the shipped Meow House file and minimal
// one-section songs built from a few placed tokens.
import { readFileSync } from 'node:fs';
import { repoPath } from '../../shared/repo-paths.ts';
import { parseSongFile } from '../song-format.ts';
import type { SongFile, SongSection } from '../song-format.ts';

/** The shipped Meow House song file, parsed as JSON. */
export function meowHouseJson(): unknown {
  return JSON.parse(readFileSync(repoPath('assets', 'songs', 'meow-house.json'), 'utf8'));
}

/** The shipped Meow House song. */
export function meowHouse(): SongFile {
  const parsed = parseSongFile(meowHouseJson());
  if (!parsed.ok) {
    throw new Error(`meow-house.json does not parse: ${parsed.error.join('; ')}`);
  }
  return parsed.value;
}

/** A 64-step channel of rests with the given tokens placed at their steps. */
export function channel(placed: Readonly<Record<number, string>> = {}, steps = 64): string {
  return Array.from({ length: steps }, (_, step) => placed[step] ?? '.').join(' ');
}

/** A section of rests and two meows (enough for the meow rule), channels replaced by `overrides`. */
export function section(overrides: Partial<SongSection> = {}): SongSection {
  return {
    lead: channel(),
    harmony: channel(),
    bass: channel(),
    drums: channel(),
    meow: channel({ 0: 'C5', 8: 'D5' }),
    ...overrides,
  };
}

/** A one-section song at 120 bpm; `overrides` replaces top-level fields. */
export function testSong(overrides: Partial<SongFile> = {}): SongFile {
  return {
    name: 'Test',
    bpm: 120,
    key: 'C major',
    sections: { A: section() },
    order: ['A'],
    ...overrides,
  };
}
