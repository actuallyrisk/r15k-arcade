import { notImplemented } from '../util/assert.ts';
import type { Locale } from './catalog.ts';

/** Values for `{name}` placeholders. */
export type MessageParams = Readonly<Record<string, string | number>>;

/** Formats an integer with the locale's grouping (de '12.345', en '12,345'). */
export function formatInteger(_locale: Locale, _value: number): string {
  return notImplemented('engine.formatInteger');
}

/** Replaces `{name}` placeholders; numbers go through formatInteger. */
export function interpolate(_template: string, _params: MessageParams, _locale: Locale): string {
  return notImplemented('engine.interpolate');
}
