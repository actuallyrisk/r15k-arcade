import {
  AudioMixer,
  createFakeAudioContext,
  createLogger,
  createMemorySink,
  createMemoryStorageAdapter,
  createTranslator,
  SaveStore,
} from '@r15k/engine';
import type { Clock, Locale, Logger, Platform } from '@r15k/engine';
import { BUG_HUNT_CATALOGS } from '@r15k/bug-hunt';
import { getUiFonts, UI_CATALOGS } from '@r15k/ui';
import { ARCADE_CATALOGS } from '../i18n/catalogs.ts';
import { ARCADE_SAVE_SCHEMA } from '../save/save-schema.ts';
import type { SaveDocumentV1, SettingsV1 } from '../save/save-schema.ts';
import { resolveSettings } from '../settings/settings-model.ts';
import type { AppServices, Navigation, ResolvedSettings } from './app-services.ts';

/**
 * Fixed app version shown in pixel snapshots, so a release never changes a golden; a display
 * placeholder for goldens only, never a package or release version.
 */
export const SNAPSHOT_APP_VERSION = '0.0.0';

/** Does nothing (snapshot services never navigate). */
const IGNORE = (): void => {
  // Snapshots render one scene; navigation and input control have no effect there.
};

/** A navigation that ignores every call. */
const NO_NAVIGATION: Navigation = {
  afterBoot: IGNORE,
  toHub: IGNORE,
  openSettings: IGNORE,
  startRound: IGNORE,
  pauseRound: IGNORE,
  resumeRound: IGNORE,
  finishRound: IGNORE,
  continueAfterGameOver: IGNORE,
  submitInitials: IGNORE,
  back: IGNORE,
};

/** Settings resolved for a snapshot: the case's locale, light palette preference, motion on. */
function resolveFor(settings: SettingsV1, locale: Locale): ResolvedSettings {
  const environment = {
    isDarkPreferred: false,
    isReducedMotionPreferred: false,
    languages: [locale],
  };
  return { ...resolveSettings(settings, environment), locale };
}

/** A memory save store that is never loaded, so updates stay in memory and nothing is written. */
function createSnapshotSave(
  logger: Logger,
  initialDocument: SaveDocumentV1 | undefined,
): SaveStore<SaveDocumentV1> {
  const save = new SaveStore({
    adapter: createMemoryStorageAdapter(),
    schema: ARCADE_SAVE_SCHEMA,
    key: 'save',
    logger,
  });
  if (initialDocument !== undefined) {
    save.update(() => initialDocument);
  }
  return save;
}

/**
 * Synchronous services for pixel snapshots: a disabled logger, a fake mixer, a memory save store that
 * is never loaded (seeded with `initialDocument`), no-op input, navigation and settings updates.
 */
export function createSnapshotServices(options: {
  readonly locale: Locale;
  readonly platform: Platform;
  readonly clock: Clock;
  readonly initialDocument?: SaveDocumentV1;
}): AppServices {
  const logger = createLogger({ isEnabled: false, sink: createMemorySink().sink });
  const save = createSnapshotSave(logger, options.initialDocument);
  const translator = createTranslator({
    locale: options.locale,
    catalogs: [UI_CATALOGS, BUG_HUNT_CATALOGS, ARCADE_CATALOGS],
  });
  let resolved = resolveFor(save.get().settings, options.locale);
  return {
    clock: options.clock,
    logger,
    platform: options.platform,
    save,
    mixer: new AudioMixer({
      createContext: () => createFakeAudioContext(),
      logger,
      onInterrupted: IGNORE,
    }),
    input: { setTextEntry: IGNORE },
    i18n: () => translator,
    fonts: getUiFonts(),
    announce: IGNORE,
    settings: () => resolved,
    updateSettings: (change) => {
      const settings = change(resolved.raw);
      save.update((document) => ({ ...document, settings }));
      resolved = resolveFor(settings, options.locale);
    },
    navigation: NO_NAVIGATION,
    appVersion: SNAPSHOT_APP_VERSION,
  };
}
