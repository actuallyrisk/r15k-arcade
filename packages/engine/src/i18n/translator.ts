import type { CatalogPair, Locale, Message } from './catalog.ts';
import { formatInteger, interpolate } from './format.ts';
import type { MessageParams } from './format.ts';
import { pluralCategory } from './plural.ts';

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

const NO_PARAMS: MessageParams = {};

/** Keeps a rendered string as it is. */
const unchanged = (text: string): string => text;

/** Every key of a pair, from both languages (parity is checked elsewhere; this only needs the union). */
function keysOf(pair: CatalogPair): ReadonlySet<string> {
  return new Set([...Object.keys(pair.en), ...Object.keys(pair.de)]);
}

/** The messages of one locale from every catalog; a key that two catalogs define throws. */
function collectMessages(
  catalogs: readonly CatalogPair[],
  locale: Locale,
): ReadonlyMap<string, Message> {
  const owners = new Map<string, string>();
  for (const pair of catalogs) {
    for (const key of keysOf(pair)) {
      const owner = owners.get(key);
      if (owner !== undefined) {
        throw new Error(
          `catalog key '${key}' is defined twice (namespaces '${owner}' and '${pair.namespace}')`,
        );
      }
      owners.set(key, pair.namespace);
    }
  }
  return new Map(catalogs.flatMap((pair) => Object.entries(pair[locale])));
}

/** Selects the plural form by `params.count` (a missing count selects 'other') and fills placeholders. */
function render(message: Message, params: MessageParams, locale: Locale): string {
  if (typeof message === 'string') {
    return interpolate(message, params, locale);
  }
  const count = params['count'];
  const category = pluralCategory(locale, typeof count === 'number' ? count : Number.NaN);
  return interpolate(message[category], params, locale);
}

/**
 * Creates a translator over the given catalogs. Throws when two catalogs define the same key. An
 * unknown key renders as '⟦key⟧', a marker that is visible on screen and in the mirror without needing
 * a logger; the optional transform applies to every found message (meow mode), never to the marker.
 */
export function createTranslator(options: TranslatorOptions): Translator {
  const { locale } = options;
  const messages = collectMessages(options.catalogs, locale);
  const transform = options.transform ?? unchanged;
  return {
    locale,
    t: (key, params) => {
      const message = messages.get(key);
      return message === undefined
        ? `⟦${key}⟧`
        : transform(render(message, params ?? NO_PARAMS, locale));
    },
    has: (key) => messages.has(key),
    formatInteger: (value) => formatInteger(locale, value),
  };
}
