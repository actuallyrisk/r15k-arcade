// R15K Arcade tools – `pnpm i18n-check [--only ui,bugHunt,arcade]`: checks the DE/EN catalogs (parity,
// plural shape, placeholders, empty strings, namespaces, duplicates, glyph coverage) and the text fit of
// every drawn string. Each package is loaded by one literal dynamic import, and `--only` loads only the
// named namespaces (plus @r15k/ui for the fonts), so a check never evaluates an unfinished package.
import { compileFont } from '@r15k/engine';
import { parseArgs } from '../shared/args.ts';
import { exitWith, OUT } from '../shared/cli-output.ts';
import { catalogIssues, loadCatalogs, parseNamespaces } from './check.ts';
import type { CatalogImporters, NamespaceId } from './check.ts';
import { textFitIssues } from './text-fit.ts';

const IMPORTERS: CatalogImporters = {
  ui: () => import('@r15k/ui'),
  bugHunt: () => import('@r15k/bug-hunt'),
  arcade: () => import('@r15k/arcade'),
};

const { flags, values } = parseArgs(process.argv.slice(2));
const unknown = [...flags, ...[...values.keys()].filter((key) => key !== 'only')];
if (unknown.length > 0) {
  OUT.error(`unknown argument(s): ${unknown.map((name) => `--${name}`).join(' ')}`);
  OUT.error('usage: pnpm i18n-check [--only ui,bugHunt,arcade]');
  exitWith(1);
}

let namespaces: readonly NamespaceId[] = [];
try {
  namespaces = parseNamespaces(values.get('only'));
} catch (error: unknown) {
  OUT.error(error instanceof Error ? error.message : String(error));
  exitWith(1);
}

const loaded = await loadCatalogs(namespaces, IMPORTERS);
const issues = [
  ...catalogIssues(loaded),
  ...textFitIssues(loaded.catalogs, compileFont(loaded.large)),
];
for (const issue of issues) {
  OUT.error(issue);
}
const keys = loaded.catalogs.reduce((total, pair) => total + Object.keys(pair.en).length, 0);
OUT.info(
  `${loaded.catalogs.length} catalog(s) with ${keys} keys checked (${namespaces.join(', ')}), ${issues.length} problem(s)`,
);
exitWith(issues.length === 0 ? 0 : 1);
