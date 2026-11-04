// R15K Arcade tools – how catalog messages become drawn text: every form of a message (plural messages
// have two), its `{name}` placeholders, and the text as the pixel UI draws it (upper case, placeholders
// left out because their values are drawn by the code that fills them). Keys that are only DOM text
// (screen readers, the boot failure box) are never drawn.
import type { Message } from '@r15k/engine';

const PLACEHOLDER = /\{(\w+)\}/g;

/** Keys that are DOM text only, besides every key containing `.a11y.` and every `arcade.fatal.` key. */
const DOM_ONLY_KEYS: ReadonlySet<string> = new Set([
  'ui.menu.scrollUp',
  'ui.menu.scrollDown',
  'arcade.initials.label',
]);

/** The forms of a message: one string, or the `one` and `other` forms of a plural message. */
export function messageForms(message: Message): readonly string[] {
  return typeof message === 'string' ? [message] : [message.one, message.other];
}

/** The placeholder names of every form of a message. */
export function placeholdersOf(message: Message): ReadonlySet<string> {
  return new Set(
    messageForms(message).flatMap((form) =>
      [...form.matchAll(PLACEHOLDER)].map((match) => match[1] ?? ''),
    ),
  );
}

/** Whether the pixel UI draws a key (false for DOM-only text). */
export function isDrawnKey(key: string): boolean {
  return !key.includes('.a11y.') && !key.startsWith('arcade.fatal.') && !DOM_ONLY_KEYS.has(key);
}

/** A form as drawn: upper case (`ß` → `SS`), placeholders left out. */
export function drawnText(form: string): string {
  return form.replace(PLACEHOLDER, '').toUpperCase();
}
