import { notImplemented } from '@r15k/engine';

/** What main.ts hands to the app (build flags as values, so no module below reads import.meta.env). */
export interface CreateAppOptions {
  readonly window: Window;
  readonly document: Document;
  readonly isDevBuild: boolean;
  readonly isE2eBuild: boolean;
  readonly baseUrl: string;
}

/** Builds every service in boot order and starts the loop; rejects only for boot errors. */
export function createApp(_options: CreateAppOptions): Promise<void> {
  return notImplemented('arcade.createApp');
}
