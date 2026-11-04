// R15K Arcade tools – `pnpm sprite-check [--only <ids>] [--print <sheet>/<sprite>]`: validates every sprite
// sheet of the sprite files and both UI fonts, then the expected frame counts and sizes. `--only` takes
// comma-separated sheet and font ids and imports only the files and packages that hold them, so a check
// never depends on another package's unfinished data. `--print` shows one sprite as text with slot names.
import { pathToFileURL } from 'node:url';
import { parseArgs } from '../shared/args.ts';
import { exitWith, OUT } from '../shared/cli-output.ts';
import { listRepoFiles } from '../shared/repo-files.ts';
import { repoPath } from '../shared/repo-paths.ts';
import {
  areFontsInScope,
  expectedSpriteIssues,
  FONT_IDS,
  fontIssues,
  parseScope,
  printSprite,
  sheetIssues,
  unknownIds,
} from './check.ts';
import type { CheckScope, LoadedSheet } from './check.ts';
import { discoverSpriteFiles, exportedSheets, isFileInScope } from './discover.ts';

/** The sheets of every sprite file that can hold an id in scope. */
async function loadSheets(scope: CheckScope): Promise<readonly LoadedSheet[]> {
  const files = discoverSpriteFiles(listRepoFiles()).filter((file) => isFileInScope(file, scope));
  const lists = await Promise.all(
    files.map(async (file) => {
      const loaded: unknown = await import(pathToFileURL(repoPath(file.path)).href);
      return exportedSheets(loaded).map((sheet) => ({ file: file.path, owner: file.owner, sheet }));
    }),
  );
  return lists.flat();
}

/** Font problems; the ui package is imported only when a font is in scope. */
async function checkFonts(scope: CheckScope): Promise<readonly string[]> {
  if (!areFontsInScope(scope)) {
    return [];
  }
  const ui = await import('@r15k/ui');
  return fontIssues([ui.R15K_5, ui.R15K_8], { requiredChars: ui.REQUIRED_CHARSET, scope });
}

/** Prints one sprite (`<sheet>/<sprite>`); exit 1 when it does not exist. */
async function print(target: string): Promise<never> {
  const [sheetId = '', name = ''] = target.split('/');
  const sheets = await loadSheets(new Set([sheetId]));
  const sprite = sheets.find((loaded) => loaded.sheet.id === sheetId)?.sheet.sprites[name];
  if (sprite === undefined) {
    OUT.error(`no sprite '${target}'`);
    return exitWith(1);
  }
  OUT.info(printSprite(sheetId, name, sprite).join('\n'));
  return exitWith(0);
}

const { flags, values } = parseArgs(process.argv.slice(2));
const unknown = [
  ...flags,
  ...[...values.keys()].filter((key) => key !== 'only' && key !== 'print'),
];
if (unknown.length > 0) {
  OUT.error(`unknown argument(s): ${unknown.map((name) => `--${name}`).join(' ')}`);
  OUT.error('usage: pnpm sprite-check [--only <ids>] [--print <sheet>/<sprite>]');
  exitWith(1);
}
const printTarget = values.get('print');
if (printTarget !== undefined) {
  await print(printTarget);
}

const scope = parseScope(values.get('only'));
const sheets = await loadSheets(scope);
const issues = [
  ...unknownIds(scope, { sheets, fontIds: FONT_IDS }).map(
    (id) => `unknown sheet or font id '${id}'`,
  ),
  ...sheetIssues(sheets, scope),
  ...expectedSpriteIssues(sheets, scope),
  ...(await checkFonts(scope)),
];
for (const issue of issues) {
  OUT.error(issue);
}
const checked = sheets.filter((loaded) => scope === undefined || scope.has(loaded.sheet.id));
OUT.info(`${checked.length} sprite sheet(s) checked, ${issues.length} problem(s)`);
exitWith(issues.length === 0 ? 0 : 1);
