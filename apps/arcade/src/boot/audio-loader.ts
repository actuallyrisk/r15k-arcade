import { parseAudioManifest, parseMusicMetadata } from '@r15k/engine';
import type { AudioManifest, AudioMixer, Logger } from '@r15k/engine';
import { AUDIO_MANIFEST_PATH } from '../content/audio-manifest.ts';

/** How far the audio load has come. */
export interface AudioLoadProgress {
  readonly loaded: number;
  readonly total: number;
  /** Every file settled (loaded or failed), or the manifest itself failed. */
  readonly isDone: boolean;
}

/** The running audio load. */
export interface AudioLoader {
  progress(): AudioLoadProgress;
}

/** What the loader fetches with and decodes into. */
export interface AudioLoaderOptions {
  readonly fetch: (url: string) => Promise<Response>;
  /** The app base URL (relative in builds, so the files load from the bundle). */
  readonly baseUrl: string;
  readonly mixer: AudioMixer;
  readonly logger: Logger;
  /** Called whenever the progress changes (wakes the loop). */
  readonly onProgress: () => void;
}

/** Fetches a file of the audio folder; rejects for HTTP errors. */
async function fetchAudio(options: AudioLoaderOptions, path: string): Promise<Response> {
  const response = await options.fetch(`${options.baseUrl}audio/${path}`);
  if (!response.ok) {
    throw new Error(`audio/${path}: HTTP ${response.status}`);
  }
  return response;
}

/** Loads the manifest; undefined (logged) when it is missing or invalid. */
async function loadManifest(options: AudioLoaderOptions): Promise<AudioManifest | undefined> {
  const response = await options.fetch(`${options.baseUrl}${AUDIO_MANIFEST_PATH}`);
  if (!response.ok) {
    throw new Error(`${AUDIO_MANIFEST_PATH}: HTTP ${response.status}`);
  }
  const manifest = parseAudioManifest(await response.json());
  if (!manifest.ok) {
    throw new Error(`${AUDIO_MANIFEST_PATH}: ${manifest.error.join('; ')}`);
  }
  return manifest.value;
}

/** Every load job of a manifest: each SFX file and each music track (metadata + MP3). */
function loadJobs(
  options: AudioLoaderOptions,
  manifest: AudioManifest,
): readonly (() => Promise<void>)[] {
  const { mixer } = options;
  const sfx = manifest.sfx.map((entry) => async () => {
    const data = await (await fetchAudio(options, entry.file)).arrayBuffer();
    await mixer.loadSfx(entry.id, data);
  });
  const music = manifest.music.map((entry) => async () => {
    const metadata = parseMusicMetadata(await (await fetchAudio(options, entry.metadata)).json());
    if (!metadata.ok) {
      throw new Error(`audio/${entry.metadata}: ${metadata.error.join('; ')}`);
    }
    const data = await (await fetchAudio(options, entry.file)).arrayBuffer();
    await mixer.loadMusic(entry.id, data, metadata.value);
  });
  return [...sfx, ...music];
}

/**
 * Starts loading the bundled audio into the mixer. Failures are logged and never fatal: a missing file
 * stays silent, a missing manifest leaves the whole app silent.
 */
export function loadAudio(options: AudioLoaderOptions): AudioLoader {
  let progress: AudioLoadProgress = { loaded: 0, total: 0, isDone: false };
  const report = (next: AudioLoadProgress): void => {
    progress = next;
    options.onProgress();
  };
  const run = async (): Promise<void> => {
    const manifest = await loadManifest(options);
    const jobs = manifest === undefined ? [] : loadJobs(options, manifest);
    report({ loaded: 0, total: jobs.length, isDone: jobs.length === 0 });
    let loaded = 0;
    await Promise.all(
      jobs.map(async (job) => {
        await job().catch((error: unknown) => {
          options.logger.warn('audio file failed to load', error);
        });
        loaded += 1;
        report({ loaded, total: jobs.length, isDone: loaded === jobs.length });
      }),
    );
  };
  run().catch((error: unknown) => {
    options.logger.warn('audio unavailable, the game runs silent', error);
    report({ ...progress, isDone: true });
  });
  return { progress: () => progress };
}
