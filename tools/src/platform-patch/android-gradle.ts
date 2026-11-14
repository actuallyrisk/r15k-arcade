// R15K Arcade tools – platform patch of the generated app/build.gradle.kts, only with
// --release-signing <keystore.properties>: a release signing config read from that properties file
// (storeFile, storePassword, keyAlias, keyPassword; the file and its secrets never enter the
// repository) and its use in the release build type. The inserted lines carry marker comments, so a
// second run replaces them instead of adding them twice.
import { anchorNotFound, escapeRegExp, single } from './anchors.ts';
import type { PatchResult } from './anchors.ts';

const FILE = 'build.gradle.kts';
const MARKER = 'platform-patch: release signing';
const BEGIN = `// ${MARKER} (begin)`;
const END = `// ${MARKER} (end)`;
const INDENT_UNIT = '    ';

/** A `<header> {` block: start of its header line, end of the header line, offset of its `}`. */
interface Block {
  readonly lineStart: number;
  readonly bodyStart: number;
  readonly end: number;
  readonly indent: string;
}

/** Offset of the brace that closes a block whose body starts at `from`, or -1. */
function closingBrace(text: string, from: number): number {
  let depth = 1;
  for (let index = from; index < text.length; index += 1) {
    const char = text[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return -1;
}

/** Where to look for a block: inside a parent (or the whole text) and at which indentation. */
interface BlockQuery {
  readonly header: string;
  readonly within?: Block;
  readonly indent?: string;
}

/** The single `<header> {` block of a query; none, several or an unclosed one are anchor failures. */
function findBlock(text: string, query: BlockQuery): Block {
  const anchor = { what: `exactly one ${query.header} { block`, file: FILE };
  const start = query.within?.bodyStart ?? 0;
  const end = query.within?.end ?? text.length;
  const pattern = new RegExp(`^([ \\t]*)${escapeRegExp(query.header)} \\{[ \\t]*$`, 'gm');
  const matches = [...text.matchAll(pattern)].filter(
    (match) =>
      match.index >= start &&
      match.index < end &&
      (query.indent === undefined || match[1] === query.indent),
  );
  const match = single(matches, anchor);
  const bodyStart = match.index + match[0].length;
  const close = closingBrace(text, bodyStart);
  if (close < 0) {
    throw anchorNotFound(anchor);
  }
  return { lineStart: match.index, bodyStart, end: close, indent: match[1] ?? '' };
}

/** The text without lines a previous run inserted. */
function removeReleaseSigning(text: string): string {
  const kept: string[] = [];
  let isInside = false;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === BEGIN || trimmed === END) {
      isInside = trimmed === BEGIN;
    } else if (!isInside && !trimmed.endsWith(`// ${MARKER}`)) {
      kept.push(line);
    }
  }
  return kept.join('\n');
}

/** A Kotlin string literal body for a path. */
function kotlinString(value: string): string {
  return value.replace(/[\\"$]/g, (char) => `\\${char}`);
}

/** The signingConfigs block, one line per entry, indented like `buildTypes {`. */
function signingConfigLines(indent: string, keystoreProperties: string): readonly string[] {
  const inner = `${indent}${INDENT_UNIT}`;
  const body = `${inner}${INDENT_UNIT}`;
  const property = (name: string): string => `keystoreProperties.getProperty("${name}")`;
  return [
    `${indent}${BEGIN}`,
    `${indent}signingConfigs {`,
    `${inner}create("release") {`,
    `${body}val keystoreProperties = java.util.Properties()`,
    `${body}file("${kotlinString(keystoreProperties)}").inputStream().use { keystoreProperties.load(it) }`,
    `${body}storeFile = file(${property('storeFile')})`,
    `${body}storePassword = ${property('storePassword')}`,
    `${body}keyAlias = ${property('keyAlias')}`,
    `${body}keyPassword = ${property('keyPassword')}`,
    `${inner}}`,
    `${indent}}`,
    `${indent}${END}`,
  ];
}

/** Signs the release build type with the keys named in a keystore.properties file. */
export function patchReleaseSigning(text: string, keystoreProperties: string): PatchResult {
  const base = removeReleaseSigning(text);
  const android = findBlock(base, { header: 'android', indent: '' });
  const buildTypes = findBlock(base, { header: 'buildTypes', within: android });
  const release = findBlock(base, { header: 'getByName("release")', within: buildTypes });
  const useLine = `${release.indent}${INDENT_UNIT}signingConfig = signingConfigs.getByName("release") // ${MARKER}`;
  const block = signingConfigLines(buildTypes.indent, keystoreProperties).join('\n');
  const patched = [
    base.slice(0, buildTypes.lineStart),
    `${block}\n`,
    base.slice(buildTypes.lineStart, release.bodyStart),
    `\n${useLine}`,
    base.slice(release.bodyStart),
  ].join('');
  if (patched === text) {
    return { text, changes: [] };
  }
  return {
    text: patched,
    changes: [
      `android.signingConfigs.release from ${keystoreProperties}`,
      'android.buildTypes.release.signingConfig = signingConfigs.release',
    ],
  };
}
