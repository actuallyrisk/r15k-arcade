// Capabilities that a platform does not support: they report `isAvailable: false` and every method is
// a no-op that resolves at once.
import type {
  BackButtonCapability,
  FullscreenCapability,
  GamesServicesCapability,
  HapticsCapability,
  OpenUrlCapability,
  ShareCapability,
  TipsCapability,
  WindowRevealCapability,
} from './platform-types.ts';

const resolved = (): Promise<void> => Promise.resolve();

/** No haptics. */
export const UNAVAILABLE_HAPTICS: HapticsCapability = { isAvailable: false, play: resolved };

/** No fullscreen control (browsers handle F11 natively). */
export const UNAVAILABLE_FULLSCREEN: FullscreenCapability = {
  isAvailable: false,
  shortcut: 'none',
  toggle: resolved,
};

/** No way to open URLs. */
export const UNAVAILABLE_OPEN_URL: OpenUrlCapability = { isAvailable: false, open: resolved };

/** No system back button; subscribers are never called. */
export const UNAVAILABLE_BACK_BUTTON: BackButtonCapability = {
  isAvailable: false,
  subscribe: () => () => undefined,
  moveToBackground: resolved,
};

/** Nothing to reveal (the window is always visible). */
export const UNAVAILABLE_WINDOW_REVEAL: WindowRevealCapability = {
  isAvailable: false,
  show: resolved,
};

/** No share sheet. */
export const UNAVAILABLE_SHARE: ShareCapability = { isAvailable: false, sharePng: resolved };

/** No games services. */
export const UNAVAILABLE_GAMES_SERVICES: GamesServicesCapability = {
  isAvailable: false,
  submitScore: resolved,
};

/** No tip jar. */
export const UNAVAILABLE_TIPS: TipsCapability = { isAvailable: false };
