import { expect, test } from 'vitest';
import * as engine from './index.ts';

/** Splits a space-separated list of export names. */
const names = (text: string): readonly string[] => text.split(' ');

/** Sorts names in code-unit order. */
const sorted = (list: readonly string[]): readonly string[] =>
  [...list].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

/** Every runtime export of the barrel, grouped like the modules that declare them. */
const EXPECTED = [
  ...names('ok err assertNever invariant notImplemented createEmitter'),
  ...names(
    'seedRng openRng closeRng nextUint32 nextFloat nextInt nextChance pickOne createEntropySeed',
  ),
  ...names('clamp lerp inverseLerp approach isNearlyEqual triangleWave'),
  ...names('ZERO_INSETS rectRight rectBottom rectContains rectsIntersect intersectRects insetRect'),
  ...names('expandRect centerRect translateRect fnv1a32 toHex32 hashCanonical canonicalJson'),
  ...names('SIM_STEP_HZ SIM_STEP_SECONDS createSystemClock createFakeClock'),
  ...names('localDateOf todayLocal localHourOf formatLocalDate parseLocalDate toDayNumber'),
  ...names(
    'fromDayNumber addDays daysBetween weekdayOf compareLocalDates easterSunday firstAdventSunday',
  ),
  ...names(
    'createAnimationFrameScheduler createManualScheduler MAX_CATCH_UP_STEPS MAX_FRAME_DELTA_MS',
  ),
  ...names('GameLoop createFramebuffer clearFramebuffer createDrawTarget subTarget'),
  ...names('setPixel fillRect strokeRect drawHLine drawVLine fillDither'),
  ...names('SLOT ROLE_SLOT SLOT_NAMES ROLE_SLOT_NAMES SPRITE_CHAR_SLOTS'),
  ...names('parseHexColor paletteFromHex buildPaletteLut isLittleEndian createRemap'),
  ...names(
    'defineSpriteSheet compileSpriteSheet DEFAULT_SPRITE_LIMITS validateSpriteSheet blitSprite',
  ),
  ...names('compileFont validateFont drawText measureText wrapText writeRgba CanvasPresenter'),
  ...names('createLogger createConsoleSink createMemorySink'),
  ...names('DEFAULT_LAYOUT_RULES computeLayout contentRegions cssToLogical logicalToCss'),
  ...names('ViewportWatcher REFERENCE_VIEWPORTS referenceSnapshot'),
  ...names('ACTIONS createIdleInputFrame detectInitialDevice DEFAULT_BINDINGS validateBindings'),
  ...names('NAV_REPEAT GAMEPAD_AXIS_THRESHOLD TAP_MAX_DURATION_MS TAP_MAX_TRAVEL_CSS InputManager'),
  ...names('LifecycleMonitor UNAVAILABLE_TOGGLE selectPlatform createWebPlatform createWebPosture'),
  ...names('DEVICE_COMMANDS createTauriPlatform createFakePlatform'),
  ...names(
    'createMemoryStorageAdapter createLocalStorageAdapter createTauriStoreAdapter SaveStore',
  ),
  ...names('encodeSaveExport decodeSaveExport parseAudioManifest parseMusicMetadata'),
  ...names(
    'createFakeAudioContext levelToGain resolveLoopPoints setAmbientAudioSession AudioMixer',
  ),
  ...names('SceneStack EMPTY_A11Y_TREE ANNOUNCE_CLEAR_MS ANNOUNCE_MIN_SPACING_MS A11yMirror'),
  ...names(
    'defineCatalogs pluralCategory formatInteger interpolate createTranslator resolveLocale',
  ),
];

test('the contract lists every runtime name once', () => {
  expect(new Set(EXPECTED).size).toBe(EXPECTED.length);
});

test('the barrel exports exactly the runtime names of the contract', () => {
  expect(sorted(Object.keys(engine))).toEqual(sorted(EXPECTED));
});
