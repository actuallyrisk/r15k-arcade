// R15K Arcade tools – platform patch of the generated gen/apple/project.yml (the XcodeGen spec):
// writes the iOS Info.plist keys into `info: → properties:` of the app target, so every XcodeGen
// regeneration keeps them. Line-based edits of that one block keep the rest of the generated file
// untouched; existing entries are replaced as a whole, missing ones are appended to the block.
import { single } from './anchors.ts';
import type { PatchResult } from './anchors.ts';
import type { PlistValue } from './apple-keys.ts';

const FILE = 'project.yml';
const ANCHOR = { what: 'info: → path: <name>_iOS/Info.plist → properties:', file: FILE };
const PLAIN_SCALAR = /^[A-Za-z][\w.~/-]*$/;
const YAML_KEYWORDS = new Set(['true', 'false', 'yes', 'no', 'on', 'off', 'null', 'y', 'n']);
const KEY_LINE = /^\s*(?:"([^"]*)"|'([^']*)'|([^\s#:'"-][^:#]*?))\s*:(?:\s|$)/;

/** The `properties:` block of the app target's Info.plist. */
interface PropertiesBlock {
  readonly plistPath: string;
  readonly start: number;
  readonly end: number;
  readonly entryIndent: number;
}

/** One entry of the block: its key (undefined for leading comments) and its lines. */
interface YamlEntry {
  readonly key: string | undefined;
  readonly lines: readonly string[];
}

/** Number of leading spaces of a line. */
function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

/** End (exclusive) of the block after `start` whose lines are indented deeper than `parentIndent`. */
function blockEnd(lines: readonly string[], start: number, parentIndent: number): number {
  let end = start;
  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (line.trim() !== '') {
      if (indentOf(line) <= parentIndent) {
        return end;
      }
      end = index + 1;
    }
  }
  return end;
}

/** The value of a `key: value` line without quotes. */
function scalarValue(line: string): string {
  const value = line.slice(line.indexOf(':') + 1).trim();
  return value.replace(/^(["'])(.*)\1$/, '$2');
}

/** The properties block of one `info:` block, if it names `<name>_iOS/Info.plist`. */
function propertiesOf(lines: readonly string[], infoLine: number): PropertiesBlock | undefined {
  const infoIndent = indentOf(lines[infoLine] ?? '');
  const end = blockEnd(lines, infoLine + 1, infoIndent);
  const children = lines.slice(infoLine + 1, end);
  const childIndent = Math.min(...children.filter((line) => line.trim() !== '').map(indentOf));
  const atChildIndent = (line: string): boolean => indentOf(line) === childIndent;
  const pathLine = children.find((line) => atChildIndent(line) && /^\s*path\s*:/.test(line));
  const header = children.findIndex(
    (line) => atChildIndent(line) && /^\s*properties\s*:\s*$/.test(line),
  );
  const plistPath = pathLine === undefined ? '' : scalarValue(pathLine);
  if (!/^[^\s/]+_iOS\/Info\.plist$/.test(plistPath) || header < 0) {
    return undefined;
  }
  const start = infoLine + 2 + header;
  const blockStop = blockEnd(lines, start, childIndent);
  const first = lines.slice(start, blockStop).find((line) => line.trim() !== '');
  const entryIndent = first === undefined ? childIndent + 2 : indentOf(first);
  return { plistPath, start, end: blockStop, entryIndent };
}

/** The single properties block of the app target; none or several are an anchor failure. */
function findPropertiesBlock(lines: readonly string[]): PropertiesBlock {
  const blocks = lines
    .map((line, index) => (/^\s*info\s*:\s*$/.test(line) ? propertiesOf(lines, index) : undefined))
    .filter((block) => block !== undefined);
  return single(blocks, ANCHOR);
}

/** The Info.plist path of the app target relative to gen/apple, e.g. `r15k-arcade_iOS/Info.plist`. */
export function findInfoPlistPath(text: string): string {
  return findPropertiesBlock(text.split('\n')).plistPath;
}

/** The key of a line at the entry indentation, or undefined for sequence items and comments. */
function keyOf(line: string): string | undefined {
  const match = KEY_LINE.exec(line);
  return match === null ? undefined : (match[1] ?? match[2] ?? match[3]);
}

/** Splits the block into entries; deeper lines, sequence items and comments belong to the entry above. */
function splitEntries(lines: readonly string[], entryIndent: number): readonly YamlEntry[] {
  const entries: { key: string | undefined; lines: string[] }[] = [];
  for (const line of lines) {
    const key = indentOf(line) === entryIndent ? keyOf(line) : undefined;
    const current = entries.at(-1);
    if (key !== undefined || current === undefined) {
      entries.push({ key, lines: [line] });
    } else {
      current.lines.push(line);
    }
  }
  return entries;
}

/** A YAML scalar: plain when that is unambiguous, otherwise double-quoted. */
function yamlScalar(text: string): string {
  const isPlain = PLAIN_SCALAR.test(text) && !YAML_KEYWORDS.has(text.toLowerCase());
  return isPlain ? text : JSON.stringify(text);
}

/** The lines of one `key: value` entry at an indentation, in the generated file's style. */
export function renderYamlEntry(key: string, value: PlistValue, indent: number): readonly string[] {
  const pad = ' '.repeat(indent);
  const head = `${pad}${yamlScalar(key)}:`;
  if (typeof value === 'boolean') {
    return [`${head} ${String(value)}`];
  }
  if (typeof value === 'string') {
    return [`${head} ${yamlScalar(value)}`];
  }
  if (value.length === 0) {
    return [`${head} []`];
  }
  const items = value.flatMap((item) =>
    typeof item === 'string'
      ? [`${pad}  - ${yamlScalar(item)}`]
      : Object.entries(item).map(
          ([name, text], position) =>
            `${pad}${position === 0 ? '  - ' : '    '}${yamlScalar(name)}: ${yamlScalar(text)}`,
        ),
  );
  return [head, ...items];
}

/** Writes every key of a table into the Info.plist properties of the app target. */
export function patchProjectYml(
  text: string,
  keys: Readonly<Record<string, PlistValue>>,
): PatchResult {
  const lines = text.split('\n');
  const block = findPropertiesBlock(lines);
  const entries = [...splitEntries(lines.slice(block.start, block.end), block.entryIndent)];
  const changes: string[] = [];
  for (const [key, value] of Object.entries(keys)) {
    const rendered = renderYamlEntry(key, value, block.entryIndent);
    const position = entries.findIndex((entry) => entry.key === key);
    const existing = entries[position];
    if (existing === undefined) {
      entries.push({ key, lines: rendered });
      changes.push(`${key} = ${JSON.stringify(value)} (added)`);
    } else if (existing.lines.join('\n') !== rendered.join('\n')) {
      entries[position] = { key, lines: rendered };
      changes.push(`${key} = ${JSON.stringify(value)}`);
    }
  }
  if (changes.length === 0) {
    return { text, changes };
  }
  const body = entries.flatMap((entry) => entry.lines);
  return {
    text: [...lines.slice(0, block.start), ...body, ...lines.slice(block.end)].join('\n'),
    changes,
  };
}
