// R15K Arcade tools – the catalog checks: identical key sets in en and de, identical plural shape and
// placeholder sets per key, no empty strings, keys inside their namespace, no key in two catalogs, and
// every drawn character present in r15k-8 (HUD and popup keys also in r15k-5). `--only` loads only the
// named namespaces; the ui package is always loaded because it holds the fonts.
import type { CatalogPair, FontSource, Message } from '@r15k/engine';
import { drawnText, isDrawnKey, messageForms, placeholdersOf } from './catalog-text.ts';

/** A catalog namespace the check knows. */
export type NamespaceId = 'ui' | 'bugHunt' | 'arcade';

/** Every namespace, in package order. */
export const NAMESPACES: readonly NamespaceId[] = ['ui', 'bugHunt', 'arcade'];

/** The packages that hold catalogs and fonts, each loaded by one literal dynamic import. */
export interface CatalogImporters {
  readonly ui: () => Promise<{
    readonly UI_CATALOGS: CatalogPair;
    readonly R15K_5: FontSource;
    readonly R15K_8: FontSource;
  }>;
  readonly bugHunt: () => Promise<{ readonly BUG_HUNT_CATALOGS: CatalogPair }>;
  readonly arcade: () => Promise<{ readonly ARCADE_CATALOGS: CatalogPair }>;
}

/** What the checks run on. */
export interface LoadedCatalogs {
  readonly catalogs: readonly CatalogPair[];
  readonly small: FontSource;
  readonly large: FontSource;
}

/** Keys whose drawn text must also exist in r15k-5. */
const SMALL_FONT_PREFIXES: readonly string[] = ['bugHunt.hud.', 'bugHunt.popup.'];

/** Whether a name is a namespace id. */
const isNamespace = (name: string): name is NamespaceId => NAMESPACES.some((id) => id === name);

/** The namespaces of a comma-separated `--only` value (all when undefined); throws for unknown names. */
export function parseNamespaces(only: string | undefined): readonly NamespaceId[] {
  if (only === undefined) {
    return NAMESPACES;
  }
  const names = only
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name !== '');
  const unknown = names.filter((name) => !isNamespace(name));
  if (unknown.length > 0 || names.length === 0) {
    throw new Error(
      `unknown namespace(s) '${unknown.join(',')}'; namespaces: ${NAMESPACES.join(', ')}`,
    );
  }
  return NAMESPACES.filter((id) => names.includes(id));
}

/** Imports the ui package and the packages of the requested namespaces, nothing else. */
export async function loadCatalogs(
  namespaces: readonly NamespaceId[],
  importers: CatalogImporters,
): Promise<LoadedCatalogs> {
  const ui = await importers.ui();
  const catalogs: CatalogPair[] = namespaces.includes('ui') ? [ui.UI_CATALOGS] : [];
  if (namespaces.includes('bugHunt')) {
    catalogs.push((await importers.bugHunt()).BUG_HUNT_CATALOGS);
  }
  if (namespaces.includes('arcade')) {
    catalogs.push((await importers.arcade()).ARCADE_CATALOGS);
  }
  return { catalogs, small: ui.R15K_5, large: ui.R15K_8 };
}

/** Key parity, plural shape and placeholder sets between en and de of one catalog. */
function parityIssues(pair: CatalogPair): readonly string[] {
  const en: Readonly<Record<string, Message>> = pair.en;
  const de: Readonly<Record<string, Message>> = pair.de;
  const issues = [
    ...Object.keys(en)
      .filter((key) => !Object.hasOwn(de, key))
      .map((key) => `${key}: missing in de`),
    ...Object.keys(de)
      .filter((key) => !Object.hasOwn(en, key))
      .map((key) => `${key}: missing in en`),
  ];
  for (const [key, english] of Object.entries(en)) {
    const german = de[key];
    if (german === undefined) {
      continue;
    }
    if (typeof english !== typeof german) {
      issues.push(`${key}: plural shape differs between en and de`);
    }
    const [enNames, deNames] = [placeholdersOf(english), placeholdersOf(german)];
    if (enNames.size !== deNames.size || [...enNames].some((name) => !deNames.has(name))) {
      issues.push(
        `${key}: placeholders differ (en {${[...enNames].join(', ')}}, de {${[...deNames].join(', ')}})`,
      );
    }
  }
  return issues;
}

/** Every (locale, key, message) of a catalog. */
function entriesOf(pair: CatalogPair): readonly (readonly [string, string, Message])[] {
  return [
    ...Object.entries(pair.en).map(([key, message]) => ['en', key, message] as const),
    ...Object.entries(pair.de).map(([key, message]) => ['de', key, message] as const),
  ];
}

/** Empty strings and keys outside the namespace of one catalog. */
function contentIssues(pair: CatalogPair): readonly string[] {
  const prefix = `${pair.namespace}.`;
  return entriesOf(pair).flatMap(([locale, key, message]) => [
    ...(key.startsWith(prefix)
      ? []
      : [`${key} (${locale}): outside the namespace '${pair.namespace}'`]),
    ...(messageForms(message).some((form) => form.trim() === '')
      ? [`${key} (${locale}): empty string`]
      : []),
  ]);
}

/** Keys that appear in more than one catalog. */
function duplicateIssues(catalogs: readonly CatalogPair[]): readonly string[] {
  const owner = new Map<string, string>();
  const issues: string[] = [];
  for (const pair of catalogs) {
    for (const key of new Set([...Object.keys(pair.en), ...Object.keys(pair.de)])) {
      const other = owner.get(key);
      if (other !== undefined) {
        issues.push(`${key}: defined in the catalogs '${other}' and '${pair.namespace}'`);
      }
      owner.set(key, pair.namespace);
    }
  }
  return issues;
}

/** Drawn characters of one message that a font lacks. */
function missingGlyphs(message: Message, font: FontSource): readonly string[] {
  const chars = messageForms(message).flatMap((form) => Array.from(drawnText(form)));
  return [...new Set(chars)].filter((char) => char !== '\n' && !Object.hasOwn(font.glyphs, char));
}

/** Drawn characters missing from r15k-8 (and from r15k-5 for HUD and popup keys). */
function glyphIssues(pair: CatalogPair, fonts: LoadedCatalogs): readonly string[] {
  return entriesOf(pair)
    .filter(([, key]) => isDrawnKey(key))
    .flatMap(([locale, key, message]) => {
      const isSmall = SMALL_FONT_PREFIXES.some((prefix) => key.startsWith(prefix));
      const fontsToCheck = isSmall ? [fonts.large, fonts.small] : [fonts.large];
      return fontsToCheck.flatMap((font) =>
        missingGlyphs(message, font).map(
          (char) => `${key} (${locale}): '${char}' is missing from ${font.id}`,
        ),
      );
    });
}

/** Every problem of the loaded catalogs (text fit is checked separately). */
export function catalogIssues(loaded: LoadedCatalogs): readonly string[] {
  return [
    ...loaded.catalogs.flatMap((pair) => [
      ...parityIssues(pair),
      ...contentIssues(pair),
      ...glyphIssues(pair, loaded),
    ]),
    ...duplicateIssues(loaded.catalogs),
  ];
}
