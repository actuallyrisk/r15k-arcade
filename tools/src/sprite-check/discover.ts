// R15K Arcade tools – finds the sprite files (packages/*/src/sprites/*.ts, games/*/src/sprites/*.ts,
// apps/*/src/sprites/*.ts, no tests) and the sprite sheets they export. Sheet ids start with the name of
// the package folder that holds them ('bug-hunt-cat' in games/bug-hunt), so a scoped run (`--only`) can
// tell from the path alone which files to import.
import type { SpriteSheetSource } from '@r15k/engine';

/** A sprite file and the package folder that owns it. */
export interface SpriteFile {
  /** Repository-relative path. */
  readonly path: string;
  /** Package folder name; every sheet id in the file starts with `${owner}-`. */
  readonly owner: string;
}

const SPRITE_FILE = /^(?:packages|games|apps)\/([^/]+)\/src\/sprites\/[^/]+\.ts$/;

/** The sprite files among repository files, sorted. */
export function discoverSpriteFiles(files: readonly string[]): readonly SpriteFile[] {
  return files
    .filter((file) => !file.endsWith('.test.ts'))
    .flatMap((path) => {
      const owner = SPRITE_FILE.exec(path)?.[1];
      return owner === undefined ? [] : [{ path, owner }];
    })
    .sort((a, b) => (a.path === b.path ? 0 : a.path < b.path ? -1 : 1));
}

/** Whether a file can hold one of the requested ids (every file without a restriction). */
export function isFileInScope(file: SpriteFile, only: ReadonlySet<string> | undefined): boolean {
  return only === undefined || [...only].some((id) => id.startsWith(`${file.owner}-`));
}

/** Whether a value has the shape of a sprite sheet source (an id and a sprites object). */
function isSpriteSheet(value: unknown): value is SpriteSheetSource {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate: { readonly id?: unknown; readonly sprites?: unknown } = value;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.sprites === 'object' &&
    candidate.sprites !== null
  );
}

/** Every sprite sheet among a module's exports. */
export function exportedSheets(moduleExports: unknown): readonly SpriteSheetSource[] {
  if (typeof moduleExports !== 'object' || moduleExports === null) {
    return [];
  }
  const values: readonly unknown[] = Object.values(moduleExports);
  return values.filter(isSpriteSheet);
}
