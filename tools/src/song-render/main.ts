// R15K Arcade tools – `pnpm assets`: renders the songs of assets/songs to MP3 with loop metadata and the
// SFX definitions of the game and the app to WAV, into apps/arcade/public/audio (generated, not
// committed). Skips the render while the manifest's input hash matches ("audio up to date"); `--force`
// renders anyway; `--check` only validates and prints the authoring notes and the song report.
import { parseArgs } from '../shared/args.ts';
import { exitWith, OUT } from '../shared/cli-output.ts';
import { repoPath } from '../shared/repo-paths.ts';
import { runAssets } from './run-assets.ts';
import { ALL_SFX } from './sfx-sources.ts';

/** Flags this command accepts. */
const FLAGS: ReadonlySet<string> = new Set(['force', 'check']);

const { flags, values } = parseArgs(process.argv.slice(2));
const unknown = [...flags, ...values.keys()].filter((name) => !FLAGS.has(name) || values.has(name));
if (unknown.length > 0) {
  OUT.error(`unknown argument(s): ${unknown.map((name) => `--${name}`).join(' ')}`);
  OUT.error('usage: pnpm assets [--force | --check]');
  exitWith(1);
}

let code: 0 | 1 = 1;
try {
  code = await runAssets({
    songsDir: repoPath('assets', 'songs'),
    outputDir: repoPath('apps', 'arcade', 'public', 'audio'),
    sfx: ALL_SFX,
    isForced: flags.has('force'),
    isCheckOnly: flags.has('check'),
    out: OUT,
  });
} catch (error) {
  OUT.error(error instanceof Error ? error.message : String(error));
}
exitWith(code);
