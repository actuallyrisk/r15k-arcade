// R15K Arcade tools – text fit: every drawn string, in de and en, measured upper-cased with the real r15k-8
// at the widest text choice any reference viewport uses for its role, against its container class:
// `word` (every key not named below) – each single word ≤ 236 px at zoom 2 (the narrowest panel inner
// width; menu text wraps between words, so only a longer word would be broken); `hud-label`/`hud-value`
// (the five HUD keys) – the whole string ≤ 52 px at zoom 1 (the narrowest side panel minus padding);
// `banner` (banners and countdown) – the whole string ≤ 236 px at zoom 1. Settings rows and panel texts
// wrap, so they need no whole-string check.
import { measureText } from '@r15k/engine';
import type { CatalogPair, CompiledFont, TextZoom } from '@r15k/engine';
import { drawnText, isDrawnKey, messageForms } from './catalog-text.ts';

/** The container class of a drawn string. */
export type FitContainer = 'word' | 'hud-label' | 'hud-value' | 'banner';

/** How a container is measured. */
interface FitRule {
  readonly maxWidth: number;
  readonly zoom: TextZoom;
  /** Each word on its own, or the whole string. */
  readonly isPerWord: boolean;
}

/** Narrowest panel inner width in logical px. */
const PANEL_WIDTH = 236;
/** Narrowest side panel (56 px) minus padding, in logical px. */
const HUD_WIDTH = 52;

/** The measuring rule of each container class. */
export const FIT_RULES: Readonly<Record<FitContainer, FitRule>> = {
  word: { maxWidth: PANEL_WIDTH, zoom: 2, isPerWord: true },
  'hud-label': { maxWidth: HUD_WIDTH, zoom: 1, isPerWord: false },
  'hud-value': { maxWidth: HUD_WIDTH, zoom: 1, isPerWord: false },
  banner: { maxWidth: PANEL_WIDTH, zoom: 1, isPerWord: false },
};

const HUD_LABEL_KEYS: ReadonlySet<string> = new Set(
  ['score', 'time', 'best', 'combo'].map((name) => `bugHunt.hud.${name}`),
);
const HUD_VALUE_KEYS: ReadonlySet<string> = new Set(['bugHunt.hud.multiplier']);
const BANNER_PREFIXES: readonly string[] = ['bugHunt.banner.', 'bugHunt.countdown.'];

/** The container class of a key. */
export function containerOf(key: string): FitContainer {
  if (HUD_LABEL_KEYS.has(key)) {
    return 'hud-label';
  }
  if (HUD_VALUE_KEYS.has(key)) {
    return 'hud-value';
  }
  return BANNER_PREFIXES.some((prefix) => key.startsWith(prefix)) ? 'banner' : 'word';
}

/** The pieces that must fit: the words (split at spaces and after '-', as wrapping does) or the whole text. */
function piecesOf(text: string, rule: FitRule): readonly string[] {
  if (!rule.isPerWord) {
    return [text];
  }
  return text
    .split(/\s+/)
    .flatMap((word) => word.split(/(?<=-)/))
    .filter((word) => word !== '');
}

/** One issue per piece of a drawn form that is wider than its container. */
function formIssues(
  form: string,
  context: { readonly key: string; readonly locale: string; readonly font: CompiledFont },
): readonly string[] {
  const container = containerOf(context.key);
  const rule = FIT_RULES[container];
  return piecesOf(drawnText(form), rule).flatMap((piece) => {
    const width = measureText(context.font, piece, rule.zoom);
    return width <= rule.maxWidth
      ? []
      : [
          `${context.key} (${context.locale}): '${piece}' is ${width} px wide; ${container} allows ${rule.maxWidth} px (${context.font.id} × ${rule.zoom})`,
        ];
  });
}

/** Every drawn string of the catalogs that does not fit its container (font: compiled r15k-8). */
export function textFitIssues(
  catalogs: readonly CatalogPair[],
  font: CompiledFont,
): readonly string[] {
  return catalogs.flatMap((pair) =>
    (['en', 'de'] as const).flatMap((locale) =>
      Object.entries(pair[locale])
        .filter(([key]) => isDrawnKey(key))
        .flatMap(([key, message]) =>
          messageForms(message).flatMap((form) => formIssues(form, { key, locale, font })),
        ),
    ),
  );
}
