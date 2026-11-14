import {
  createAnimationFrameScheduler,
  createConsoleSink,
  createLogger,
  createSystemClock,
  SaveStore,
  selectPlatform,
} from '@r15k/engine';
import { ARCADE_SAVE_SCHEMA } from '../save/save-schema.ts';
import { findAppElements } from './app-dom.ts';
import { setFatalDetails } from './fatal-details.ts';
import { startApp } from './start-app.ts';

/** What main.ts hands to the app (build flags as values, so no module below reads import.meta.env). */
export interface CreateAppOptions {
  readonly window: Window;
  readonly document: Document;
  readonly isDevBuild: boolean;
  readonly isE2eBuild: boolean;
  readonly baseUrl: string;
}

/** Builds every service in boot order and starts the loop; rejects only for boot errors. */
export async function createApp(options: CreateAppOptions): Promise<void> {
  setFatalDetails(options.isDevBuild);
  const elements = findAppElements(options.document);
  const logger = createLogger({
    isEnabled: options.isDevBuild,
    sink: createConsoleSink(console),
  });
  const clock = createSystemClock();
  const scheduler = createAnimationFrameScheduler(options.window);
  const platform = await selectPlatform({ window: options.window, logger });
  const save = new SaveStore({
    adapter: platform.storage,
    schema: ARCADE_SAVE_SCHEMA,
    key: 'save',
    logger,
  });
  await save.load();
  save.update((document) => ({
    ...document,
    meta: { ...document.meta, launchCount: document.meta.launchCount + 1 },
  }));
  startApp({ options, elements, logger, clock, scheduler, platform, save });
}
