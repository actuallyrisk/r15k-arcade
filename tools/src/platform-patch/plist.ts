// R15K Arcade tools – platform patch: a minimal XML property list reader and writer for Info.plist
// files (dict, array, string, true/false; integer, real, date and data are kept as text). The writer
// produces Apple's layout (tab indentation, the standard header), so a patched generated file differs
// from the generated one only in the changed keys. Comments, processing instructions and the
// DOCTYPE are skipped when reading.
import type { PlistValue } from './apple-keys.ts';

/** A node of a property list. */
export type PlistNode =
  | { readonly kind: 'dict'; readonly entries: readonly PlistEntry[] }
  | { readonly kind: 'array'; readonly items: readonly PlistNode[] }
  | { readonly kind: 'string'; readonly value: string }
  | { readonly kind: 'boolean'; readonly isTrue: boolean }
  | { readonly kind: 'scalar'; readonly tag: string; readonly text: string };

/** One key of a dict, in file order. */
export interface PlistEntry {
  readonly key: string;
  readonly value: PlistNode;
}

/** A dict node (the root of every Info.plist). */
export type PlistDict = Extract<PlistNode, { readonly kind: 'dict' }>;

type Token =
  | { readonly kind: 'open' | 'close' | 'empty'; readonly name: string }
  | { readonly kind: 'text'; readonly text: string };

/** Token stream with a read position. */
interface Reader {
  readonly tokens: readonly Token[];
  position: number;
}

const TOKEN = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<(\/?)([A-Za-z]+)[^>]*?(\/?)>|[^<]+/g;
const SCALAR_TAGS = new Set(['integer', 'real', 'date', 'data']);
const ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};
const HEADER =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n';

/** Decodes the XML entities of a text node. */
function decode(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|\w+);/g, (match, name: string) => {
    if (name.startsWith('#x')) {
      return String.fromCodePoint(Number.parseInt(name.slice(2), 16));
    }
    if (name.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(name.slice(1), 10));
    }
    return ENTITIES[name] ?? match;
  });
}

/** Escapes text for an XML text node, as Apple's writer does. */
function encode(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Splits XML into tag and text tokens; comments, declarations and the DOCTYPE are dropped. */
function tokenize(xml: string): readonly Token[] {
  const tokens: Token[] = [];
  for (const match of xml.matchAll(TOKEN)) {
    const [whole, slash, name, selfClosing] = match;
    if (name !== undefined) {
      const kind = slash === '/' ? 'close' : selfClosing === '/' ? 'empty' : 'open';
      tokens.push({ kind, name });
    } else if (!whole.startsWith('<')) {
      tokens.push({ kind: 'text', text: whole });
    }
  }
  return tokens;
}

/** The next token that is not whitespace between elements. */
function nextTag(reader: Reader): Token {
  for (;;) {
    const token = reader.tokens[reader.position];
    reader.position += 1;
    if (token === undefined) {
      throw new Error('invalid plist: unexpected end of document');
    }
    if (token.kind !== 'text' || token.text.trim() !== '') {
      return token;
    }
  }
}

/** The decoded text up to the closing tag of an element. */
function readText(reader: Reader, name: string): string {
  let text = '';
  for (;;) {
    const token = reader.tokens[reader.position];
    reader.position += 1;
    if (token?.kind === 'text') {
      text += token.text;
    } else if (token?.kind === 'close' && token.name === name) {
      return decode(text);
    } else {
      throw new Error(`invalid plist: <${name}> holds more than text`);
    }
  }
}

/** The entries of a dict whose start tag was just read. */
function readDict(reader: Reader): PlistDict {
  const entries: PlistEntry[] = [];
  for (;;) {
    const token = nextTag(reader);
    if (token.kind === 'close' && token.name === 'dict') {
      return { kind: 'dict', entries };
    }
    if (token.kind !== 'open' || token.name !== 'key') {
      throw new Error('invalid plist: a dict entry does not start with <key>');
    }
    const key = readText(reader, 'key');
    entries.push({ key, value: readValue(reader, nextTag(reader)) });
  }
}

/** The items of an array whose start tag was just read. */
function readArray(reader: Reader): PlistNode {
  const items: PlistNode[] = [];
  for (;;) {
    const token = nextTag(reader);
    if (token.kind === 'close' && token.name === 'array') {
      return { kind: 'array', items };
    }
    items.push(readValue(reader, token));
  }
}

/** The value that starts with a token. */
function readValue(reader: Reader, token: Token): PlistNode {
  if (token.kind === 'empty') {
    return emptyValue(token.name);
  }
  if (token.kind !== 'open') {
    throw new Error('invalid plist: expected a value element');
  }
  if (token.name === 'dict') {
    return readDict(reader);
  }
  if (token.name === 'array') {
    return readArray(reader);
  }
  if (token.name === 'string') {
    return { kind: 'string', value: readText(reader, 'string') };
  }
  if (SCALAR_TAGS.has(token.name)) {
    return { kind: 'scalar', tag: token.name, text: readText(reader, token.name) };
  }
  throw new Error(`invalid plist: unknown element <${token.name}>`);
}

/** The value of a self-closing element (`<true/>`, `<dict/>`, …). */
function emptyValue(name: string): PlistNode {
  switch (name) {
    case 'true':
    case 'false':
      return { kind: 'boolean', isTrue: name === 'true' };
    case 'dict':
      return { kind: 'dict', entries: [] };
    case 'array':
      return { kind: 'array', items: [] };
    case 'string':
      return { kind: 'string', value: '' };
    default:
      throw new Error(`invalid plist: unknown element <${name}/>`);
  }
}

/** Reads an XML property list whose root is a dict. */
export function parsePlist(xml: string): PlistDict {
  const reader: Reader = { tokens: tokenize(xml), position: 0 };
  const start = nextTag(reader);
  if (start.kind !== 'open' || start.name !== 'plist') {
    throw new Error('invalid plist: the document does not start with <plist>');
  }
  const root = readValue(reader, nextTag(reader));
  if (root.kind !== 'dict') {
    throw new Error('invalid plist: the root is not a dict');
  }
  return root;
}

/** The lines of a container element: self-closing when empty, else start tag, body and end tag. */
function renderContainer(name: string, depth: number, body: readonly string[]): readonly string[] {
  const tabs = '\t'.repeat(depth);
  return body.length === 0
    ? [`${tabs}<${name}/>`]
    : [`${tabs}<${name}>`, ...body, `${tabs}</${name}>`];
}

/** The lines of a node, indented by `depth` tabs. */
function renderNode(node: PlistNode, depth: number): readonly string[] {
  const tabs = '\t'.repeat(depth);
  switch (node.kind) {
    case 'string':
      return [`${tabs}<string>${encode(node.value)}</string>`];
    case 'boolean':
      return [`${tabs}<${String(node.isTrue)}/>`];
    case 'scalar':
      return [`${tabs}<${node.tag}>${encode(node.text)}</${node.tag}>`];
    case 'array':
      return renderContainer(
        'array',
        depth,
        node.items.flatMap((item) => renderNode(item, depth + 1)),
      );
    case 'dict':
      return renderContainer(
        'dict',
        depth,
        node.entries.flatMap((entry) => [
          `${tabs}\t<key>${encode(entry.key)}</key>`,
          ...renderNode(entry.value, depth + 1),
        ]),
      );
  }
}

/** Writes a property list in Apple's XML layout. */
export function serializePlist(root: PlistDict): string {
  return `${HEADER}<plist version="1.0">\n${renderNode(root, 0).join('\n')}\n</plist>\n`;
}

/** The node of a table value. */
export function toPlistNode(value: PlistValue): PlistNode {
  if (typeof value === 'boolean') {
    return { kind: 'boolean', isTrue: value };
  }
  if (typeof value === 'string') {
    return { kind: 'string', value };
  }
  return {
    kind: 'array',
    items: value.map((item) =>
      typeof item === 'string'
        ? { kind: 'string', value: item }
        : {
            kind: 'dict',
            entries: Object.entries(item).map(([key, text]) => ({
              key,
              value: { kind: 'string', value: text },
            })),
          },
    ),
  };
}

/** The plain JavaScript value of a node (objects, arrays, strings, booleans; scalars as text). */
export function fromPlistNode(node: PlistNode): unknown {
  switch (node.kind) {
    case 'dict':
      return Object.fromEntries(
        node.entries.map((entry) => [entry.key, fromPlistNode(entry.value)]),
      );
    case 'array':
      return node.items.map((item) => fromPlistNode(item));
    case 'string':
      return node.value;
    case 'boolean':
      return node.isTrue;
    case 'scalar':
      return node.text;
  }
}
