// R15K Arcade tools – the sprite and font checks: every exported sheet passes the engine's
// validateSpriteSheet, sheet ids start with their package folder and are unique, the expected sprites
// exist with their frame counts and sizes, and both UI fonts carry the required character set. A scoped
// run (`--only <ids>`) checks only the named sheets and fonts.
import { SLOT, SPRITE_CHAR_SLOTS, validateFont, validateSpriteSheet } from '@r15k/engine';
import type { FontSource, SpriteSheetSource, SpriteSource } from '@r15k/engine';

/** Frame counts of the sprites the game and the app rely on (`<sheet id>/<sprite name>`). */
export const EXPECTED_FRAMES: Readonly<Record<string, number>> = {
  'bug-hunt-cat/cat-sit': 1,
  'bug-hunt-cat/cat-run': 4,
  'bug-hunt-cat/cat-happy': 1,
  'bug-hunt-cat/cat-startle': 1,
  'bug-hunt-items/bug': 2,
  'bug-hunt-items/golden-bug': 2,
  'bug-hunt-items/bomb': 2,
  'arcade-app-icon/app-icon': 1,
};

/** Sizes (width × height) of the same sprites. */
export const EXPECTED_SIZES: Readonly<Record<string, readonly [number, number]>> = {
  'bug-hunt-cat/cat-sit': [24, 24],
  'bug-hunt-cat/cat-run': [24, 24],
  'bug-hunt-cat/cat-happy': [24, 24],
  'bug-hunt-cat/cat-startle': [24, 24],
  'bug-hunt-items/bug': [11, 11],
  'bug-hunt-items/golden-bug': [11, 11],
  'bug-hunt-items/bomb': [11, 12],
  'arcade-app-icon/app-icon': [32, 32],
};

/** A sheet as found in a sprite file. */
export interface LoadedSheet {
  readonly file: string;
  /** Package folder of the file; the sheet id must start with `${owner}-`. */
  readonly owner: string;
  readonly sheet: SpriteSheetSource;
}

/** Ids a run checks: undefined = everything. */
export type CheckScope = ReadonlySet<string> | undefined;

/** Ids of the two UI fonts. */
export const FONT_IDS: readonly string[] = ['r15k-5', 'r15k-8'];

/** Whether an id is checked in this run. */
const isInScope = (id: string, scope: CheckScope): boolean => scope === undefined || scope.has(id);

/** The scope of a comma-separated `--only` value (undefined: everything). */
export function parseScope(only: string | undefined): CheckScope {
  if (only === undefined) {
    return undefined;
  }
  return new Set(
    only
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id !== ''),
  );
}

/** Whether a run checks a font (and therefore imports the ui package that holds them). */
export function areFontsInScope(scope: CheckScope): boolean {
  return FONT_IDS.some((id) => isInScope(id, scope));
}

/** Validation, naming and uniqueness problems of the loaded sheets in scope. */
export function sheetIssues(sheets: readonly LoadedSheet[], scope: CheckScope): readonly string[] {
  const seen = new Map<string, string>();
  return sheets
    .filter((loaded) => isInScope(loaded.sheet.id, scope))
    .flatMap(({ file, owner, sheet }) => {
      const issues = validateSpriteSheet(sheet).map(
        (issue) =>
          `${file}: ${issue.sheet}/${issue.sprite}${issue.frame === undefined ? '' : ` frame ${issue.frame}`}: ${issue.message}`,
      );
      if (!sheet.id.startsWith(`${owner}-`)) {
        issues.push(`${file}: sheet id '${sheet.id}' must start with '${owner}-'`);
      }
      const other = seen.get(sheet.id);
      if (other !== undefined) {
        issues.push(`${file}: sheet id '${sheet.id}' is also used in ${other}`);
      }
      seen.set(sheet.id, file);
      return issues;
    });
}

/** The problems of one expected sprite (missing, wrong frame count, wrong size). */
function expectationIssues(key: string, sprite: SpriteSource | undefined): readonly string[] {
  if (sprite === undefined) {
    return [`expected sprite ${key} is missing`];
  }
  const issues: string[] = [];
  const frames = EXPECTED_FRAMES[key];
  if (frames !== undefined && sprite.frames.length !== frames) {
    issues.push(`${key}: ${sprite.frames.length} frame(s), expected ${frames}`);
  }
  const [width, height] = EXPECTED_SIZES[key] ?? [sprite.width, sprite.height];
  if (sprite.width !== width || sprite.height !== height) {
    issues.push(`${key}: ${sprite.width}×${sprite.height}, expected ${width}×${height}`);
  }
  return issues;
}

/** Expected frame counts and sizes of the sheets in scope. */
export function expectedSpriteIssues(
  sheets: readonly LoadedSheet[],
  scope: CheckScope,
): readonly string[] {
  const byId = new Map(sheets.map((loaded) => [loaded.sheet.id, loaded.sheet]));
  return Object.keys(EXPECTED_FRAMES)
    .filter((key) => isInScope(key.split('/')[0] ?? '', scope))
    .flatMap((key) => {
      const [sheetId = '', spriteName = ''] = key.split('/');
      return expectationIssues(key, byId.get(sheetId)?.sprites[spriteName]);
    });
}

/** Missing or malformed glyphs of the fonts in scope. */
export function fontIssues(
  fonts: readonly FontSource[],
  options: { readonly requiredChars: string; readonly scope: CheckScope },
): readonly string[] {
  return fonts
    .filter((font) => isInScope(font.id, options.scope))
    .flatMap((font) =>
      validateFont(font, options.requiredChars).map(
        (issue) =>
          `${issue.font}: '${issue.char}' (U+${codePointHex(issue.char)}): ${issue.message}`,
      ),
    );
}

/** The code point of a character as upper-case hex, at least four digits. */
function codePointHex(char: string): string {
  return (char.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0');
}

/** Requested ids that name neither a loaded sheet nor a font. */
export function unknownIds(
  scope: CheckScope,
  known: { readonly sheets: readonly LoadedSheet[]; readonly fontIds: readonly string[] },
): readonly string[] {
  const ids = new Set([...known.sheets.map((loaded) => loaded.sheet.id), ...known.fontIds]);
  return [...(scope ?? [])].filter((id) => !ids.has(id));
}

/** Slot names by sprite character ('o' → 'ink'). */
function slotNames(): ReadonlyMap<string, string> {
  const nameOfSlot = new Map<number, string>(
    Object.entries(SLOT).map(([name, slot]) => [slot, name]),
  );
  return new Map(
    Object.entries(SPRITE_CHAR_SLOTS).map(([char, slot]) => [char, nameOfSlot.get(slot) ?? '?']),
  );
}

/** A sprite as text: every frame with a header, then a legend of the characters it uses. */
export function printSprite(
  sheetId: string,
  name: string,
  sprite: SpriteSource,
): readonly string[] {
  const lines = sprite.frames.flatMap((rows, frame) => [
    `${sheetId}/${name} frame ${frame + 1} of ${sprite.frames.length} (${sprite.width}×${sprite.height})`,
    ...rows,
    '',
  ]);
  const used = [...new Set(sprite.frames.flat().join(''))].sort();
  const names = slotNames();
  const legend = used.map((char) => `${char} ${names.get(char) ?? 'unknown character'}`);
  return [...lines, `legend: ${legend.join(', ')}`];
}
