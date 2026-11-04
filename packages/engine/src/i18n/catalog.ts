/** Languages of the app. */
export type Locale = 'de' | 'en';

/** Language setting: follow the system or a fixed locale. */
export type LanguageSetting = 'system' | Locale;

/** A message with singular and plural forms (selected by `params.count`). */
export interface PluralMessage {
  readonly one: string;
  readonly other: string;
}

/** A catalog message. */
export type Message = string | PluralMessage;

/** The shape of every catalog: key → message. */
export type CatalogShape = Readonly<Record<string, Message>>;

/**
 * The type a second-language catalog must satisfy for `T`. Tuple-wrapped (non-distributive): a literal
 * catalog maps each key to string or PluralMessage, the wide CatalogShape maps to Message.
 */
export type MatchingCatalog<T extends CatalogShape> = {
  readonly [K in keyof T]: [T[K]] extends [PluralMessage]
    ? PluralMessage
    : [T[K]] extends [string]
      ? string
      : Message;
};

/** English and German catalogs of one namespace with identical keys. */
export interface CatalogPair<T extends CatalogShape = CatalogShape> {
  readonly namespace: string;
  readonly en: T;
  readonly de: MatchingCatalog<T>;
}

/** Returns the pair unchanged; throws if a key of either catalog does not start with `<namespace>.`. */
export function defineCatalogs<const T extends CatalogShape>(pair: CatalogPair<T>): CatalogPair<T> {
  const prefix = `${pair.namespace}.`;
  const outside = [...Object.keys(pair.en), ...Object.keys(pair.de)].find(
    (key) => !key.startsWith(prefix),
  );
  if (outside !== undefined) {
    throw new Error(`catalog key '${outside}' is outside the namespace '${pair.namespace}'`);
  }
  return pair;
}
