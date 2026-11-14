// R15K Arcade tools – platform patch: text-level edits of XML start tags (find, read and set an
// attribute) for the generated AndroidManifest.xml. Text edits keep the generated layout and every
// placeholder such as ${applicationId} untouched; a new attribute goes after the last one, on its
// own line when the tag lists one attribute per line.
import { escapeRegExp, locateAll } from './anchors.ts';
import type { Located } from './anchors.ts';

const ATTRIBUTE = /(\s+)([\w:.-]+)="([^"]*)"/g;

/** Every start tag of an element (`<name …>` or `<name …/>`) with its offset. */
export function startTags(text: string, element: string): readonly Located[] {
  return locateAll(text, new RegExp(`<${escapeRegExp(element)}(?=[\\s/>])[^>]*>`, 'g'));
}

/** The value of an attribute of a start tag, if present. */
export function attributeOf(tag: string, name: string): string | undefined {
  return [...tag.matchAll(ATTRIBUTE)].find((match) => match[2] === name)?.[3];
}

/** The start tag with the attribute set: replaced in place, or added after the last attribute. */
export function withAttribute(tag: string, name: string, value: string): string {
  const assignment = `${name}="${value}"`;
  const existing = new RegExp(`(\\s)${escapeRegExp(name)}="[^"]*"`);
  if (existing.test(tag)) {
    return tag.replace(existing, (_match, space: string) => `${space}${assignment}`);
  }
  const last = [...tag.matchAll(ATTRIBUTE)].at(-1);
  if (last === undefined) {
    return tag.replace(/^<[\w:.-]+/, (start) => `${start} ${assignment}`);
  }
  const end = last.index + last[0].length;
  return `${tag.slice(0, end)}${last[1] ?? ' '}${assignment}${tag.slice(end)}`;
}

/** The leading whitespace of the line on which an offset lies. */
export function lineIndent(text: string, index: number): string {
  const lineStart = text.lastIndexOf('\n', index - 1) + 1;
  return /^[ \t]*/.exec(text.slice(lineStart))?.[0] ?? '';
}
