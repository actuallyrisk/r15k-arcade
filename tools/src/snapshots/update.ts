// R15K Arcade tools – `pnpm snapshots:update [--only <prefix>]`: runs the snapshot test in update mode
// (Vitest child with R15K_UPDATE_SNAPSHOTS=1 and R15K_SNAPSHOT_ONLY in its environment, never in a shell
// string) and reports which goldens it added or changed. Goldens are rewritten only when their pixels
// differ, so a second run reports nothing. Only for intended visual changes.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from '../shared/args.ts';
import { exitWith, OUT } from '../shared/cli-output.ts';
import { repoPath } from '../shared/repo-paths.ts';
import { runPnpm } from '../shared/run-command.ts';

const GOLDEN_FOLDER = repoPath('assets', 'goldens');
const TEST_FILE = 'tools/src/snapshots/snapshots.test.ts';

/** SHA-256 per golden file name with the prefix. */
function goldenHashes(prefix: string): ReadonlyMap<string, string> {
  if (!existsSync(GOLDEN_FOLDER)) {
    return new Map();
  }
  const names = readdirSync(GOLDEN_FOLDER).filter(
    (name) => name.endsWith('.png') && name.startsWith(prefix),
  );
  return new Map(
    names.map((name) => [
      name,
      createHash('sha256')
        .update(readFileSync(join(GOLDEN_FOLDER, name)))
        .digest('hex'),
    ]),
  );
}

/** Lines naming every golden that was added or changed between the two listings. */
function changes(
  before: ReadonlyMap<string, string>,
  after: ReadonlyMap<string, string>,
): readonly string[] {
  return [...after]
    .filter(([name, hash]) => before.get(name) !== hash)
    .map(([name]) => `${before.has(name) ? 'updated' : 'added'} assets/goldens/${name}`)
    .sort();
}

const { flags, values } = parseArgs(process.argv.slice(2));
const unknown = [...flags, ...[...values.keys()].filter((key) => key !== 'only')];
if (unknown.length > 0) {
  OUT.error(`unknown argument(s): ${unknown.map((name) => `--${name}`).join(' ')}`);
  OUT.error('usage: pnpm snapshots:update [--only <prefix>]');
  exitWith(1);
}

const prefix = values.get('only') ?? '';
const before = goldenHashes(prefix);
const result = runPnpm(['exec', 'vitest', 'run', '--project', 'tools', TEST_FILE], {
  env: { R15K_UPDATE_SNAPSHOTS: '1', R15K_SNAPSHOT_ONLY: prefix },
});
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
const changed = changes(before, goldenHashes(prefix));
for (const line of changed) {
  OUT.info(line);
}
OUT.info(changed.length === 0 ? 'goldens unchanged' : `${changed.length} golden(s) written`);
exitWith(result.status === 0 ? 0 : 1);
