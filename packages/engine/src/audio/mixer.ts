import type { Logger } from '../logger/logger.ts';
import { notImplemented } from '../util/assert.ts';
import type { AudioContextLike } from './audio-context-like.ts';
import type {
  AudioPort,
  BusName,
  MixerState,
  MusicMetadata,
  PlayMusicOptions,
  StopMusicOptions,
} from './audio-types.ts';

/** Construction options of the mixer. */
export interface AudioMixerOptions {
  /** App: () => new AudioContext() after setAmbientAudioSession. */
  readonly createContext: () => AudioContextLike | undefined;
  readonly logger: Logger;
  /** → LifecycleMonitor.report('audio-interrupted'). */
  readonly onInterrupted: () => void;
}

/** WebAudio mixer with master, music and sfx buses and pre-rendered files. */
export class AudioMixer implements AudioPort {
  constructor(_options: AudioMixerOptions) {
    return notImplemented('engine.AudioMixer.constructor');
  }

  /** Current mixer state. */
  get state(): MixerState {
    return notImplemented('engine.AudioMixer.state');
  }

  /**
   * Called synchronously inside every user activation until the context has run once: context.resume()
   * if audio is wanted. Also called on gamepad button edges.
   */
  unlock(): void {
    return notImplemented('engine.AudioMixer.unlock');
  }

  /** The app unsubscribes its activation listener once true. */
  get hasRunOnce(): boolean {
    return notImplemented('engine.AudioMixer.hasRunOnce');
  }

  /** Decodes a sound effect (WAV). */
  loadSfx(_id: string, _data: ArrayBuffer): Promise<void> {
    return notImplemented('engine.AudioMixer.loadSfx');
  }

  /** Decodes a music track (MP3) with its loop metadata. */
  loadMusic(_id: string, _data: ArrayBuffer, _metadata: MusicMetadata): Promise<void> {
    return notImplemented('engine.AudioMixer.loadMusic');
  }

  /** Plays a sound effect; no-op unless running, an unknown id warns once. */
  playSfx(_id: string): void {
    return notImplemented('engine.AudioMixer.playSfx');
  }

  /** Starts `id` at its loop start (another track fades out); no-op while it already plays. */
  playMusic(_id: string, _options?: PlayMusicOptions): void {
    return notImplemented('engine.AudioMixer.playMusic');
  }

  /** Fades the music out and forgets the wanted track. */
  stopMusic(_options?: StopMusicOptions): void {
    return notImplemented('engine.AudioMixer.stopMusic');
  }

  /** Sets a bus level (0…1 UI level). */
  setLevel(_bus: BusName, _level: number): void {
    return notImplemented('engine.AudioMixer.setLevel');
  }

  /** Master gain 0 while muted; the context keeps running. */
  setMuted(_isMuted: boolean): void {
    return notImplemented('engine.AudioMixer.setMuted');
  }

  /** Stops wanting audio and suspends the context. */
  suspend(): void {
    return notImplemented('engine.AudioMixer.suspend');
  }

  /** Wants audio again and resumes the context. */
  resume(): void {
    return notImplemented('engine.AudioMixer.resume');
  }

  /** Closes the context. */
  dispose(): void {
    return notImplemented('engine.AudioMixer.dispose');
  }
}
