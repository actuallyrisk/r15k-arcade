import { notImplemented } from '../util/assert.ts';
import type { CatalogPair, Locale } from './catalog.ts';
import type { MessageParams } from './format.ts';

/** Looks up and formats catalog messages in one locale. */
export interface Translator {
  readonly locale: Locale;
  /** Plural messages use params.count. */
  t(key: string, params?: MessageParams): string;
  has(key: string): boolean;
  formatInteger(value: number): string;
}

/** Construction options of a translator. */
export interface TranslatorOptions {
  readonly locale: Locale;
  readonly catalogs: readonly CatalogPair[];
  /** Transforms rendered strings (meow mode, a later milestone). */
  readonly transform?: (text: string) => string;
}

/** Creates a translator; throws on duplicate keys across catalogs, an unknown key renders as '⟦key⟧'. */
export function createTranslator(_options: TranslatorOptions): Translator {
  return notImplemented('engine.createTranslator');
}
