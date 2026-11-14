// R15K Arcade tools – the to-do marker rule (CONTRIBUTING.md, "Code standards"): an upper-case marker word
// must be followed directly by an issue number in parentheses, `(#123)`. The match is case-sensitive, so
// lower-case names such as the script todo-check never match. The words are written here through
// character classes, so this file does not flag itself.

/** File extensions of the text files that are scanned. */
export const SCANNED_EXTENSIONS: readonly string[] = [
  '.ts',
  '.mjs',
  '.rs',
  '.kt',
  '.kts',
  '.swift',
  '.pro',
  '.yml',
  '.yaml',
  '.sh',
  '.ps1',
  '.toml',
  '.json',
  '.md',
  '.css',
  '.html',
  '.xml',
  '.plist',
];

/** A marker word without an issue number right after it. */
const MARKER_WITHOUT_ISSUE = /\b(T[O]DO|F[I]XME)\b(?!\(#\d+\))/g;

/** One marker without an issue number. */
export interface TodoFinding {
  readonly file: string;
  /** 1-based. */
  readonly line: number;
  /** 1-based. */
  readonly column: number;
  readonly marker: string;
}

/** Whether a repository file is a scanned text file. */
export function isScannedFile(file: string): boolean {
  return SCANNED_EXTENSIONS.some((extension) => file.endsWith(extension));
}

/** Every marker without an issue number in a file's text. */
export function findTodoMarkers(file: string, text: string): readonly TodoFinding[] {
  return text.split('\n').flatMap((lineText, index) =>
    [...lineText.matchAll(MARKER_WITHOUT_ISSUE)].map((match) => ({
      file,
      line: index + 1,
      column: match.index + 1,
      marker: match[0],
    })),
  );
}
