// R15K Arcade tools – platform patch: the Info.plist keys that make iOS, iPadOS and macOS treat the
// app as a game. One table per platform; the platform patch writes the iOS keys into the generated
// Xcode project, Tauri merges both from src-tauri/Info.ios.plist and src-tauri/Info.plist (a test
// keeps those files equal to these tables), and `verify` checks them in the built bundles.

/** A value of these tables: a flag, a string, a string list or a list of string records. */
export type PlistValue =
  boolean | string | readonly string[] | readonly Readonly<Record<string, string>>[];

/**
 * iOS and iPadOS: arcade-games category, game controllers and Game Mode, hidden status bar, iPad
 * multitasking (no full-screen requirement), pointer events, and the orientations: iPhone all except
 * upside down (platform convention), iPad all four.
 */
export const IOS_INFO_KEYS: Readonly<Record<string, PlistValue>> = {
  LSApplicationCategoryType: 'public.app-category.arcade-games',
  GCSupportsControllerUserInteraction: true,
  GCSupportedGameControllers: [{ ProfileName: 'ExtendedGamepad' }],
  GCSupportsGameMode: true,
  UIStatusBarHidden: true,
  UIViewControllerBasedStatusBarAppearance: false,
  UIRequiresFullScreen: false,
  UIApplicationSupportsIndirectInputEvents: true,
  UISupportedInterfaceOrientations: [
    'UIInterfaceOrientationPortrait',
    'UIInterfaceOrientationLandscapeLeft',
    'UIInterfaceOrientationLandscapeRight',
  ],
  'UISupportedInterfaceOrientations~ipad': [
    'UIInterfaceOrientationPortrait',
    'UIInterfaceOrientationPortraitUpsideDown',
    'UIInterfaceOrientationLandscapeLeft',
    'UIInterfaceOrientationLandscapeRight',
  ],
};

/** macOS: Game Mode and controller support (the category comes from bundle.category). */
export const MACOS_INFO_KEYS: Readonly<Record<string, PlistValue>> = {
  GCSupportsGameMode: true,
  GCSupportsControllerUserInteraction: true,
};

/** What the built macOS bundle must contain: the keys above plus the category from bundle.category. */
export const MACOS_BUNDLE_KEYS: Readonly<Record<string, PlistValue>> = {
  ...MACOS_INFO_KEYS,
  LSApplicationCategoryType: 'public.app-category.arcade-games',
};
