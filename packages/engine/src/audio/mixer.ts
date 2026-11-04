import type { Logger } from '../logger/logger.ts';
import type { AudioBufferLike, AudioContextLike } from './audio-context-like.ts';
import type {
  AudioPort,
  BusName,
  MixerState,
  MusicMetadata,
  PlayMusicOptions,
  StopMusicOptions,
} from './audio-types.ts';
import { resolveLoopPoints } from './loop-points.ts';
import {
  createMixerGraph,
  fadeOutMusicVoice,
  setParamNow,
  startMusicVoice,
} from './mixer-graph.ts';
import type { LoadedTrack, MixerGraph, MusicVoice } from './mixer-graph.ts';
import { levelToGain } from './volume.ts';

/** Construction options of the mixer. */
export interface AudioMixerOptions {
  /** App: () => new AudioContext() after setAmbientAudioSession. */
  readonly createContext: () => AudioContextLike | undefined;
  readonly logger: Logger;
  /** → LifecycleMonitor.report('audio-interrupted'). */
  readonly onInterrupted: () => void;
}

/** The track the app wants to hear and the fade-in it asked for. */
interface WantedTrack {
  readonly id: string;
  readonly fadeInSeconds: number;
}

const DEFAULT_FADE_IN_SECONDS = 0.6;
const DEFAULT_FADE_OUT_SECONDS = 0.4;

/** Creates the context; a throwing factory (no WebAudio) is logged and leaves the mixer unavailable. */
function openContext(options: AudioMixerOptions): AudioContextLike | undefined {
  try {
    return options.createContext();
  } catch (error: unknown) {
    options.logger.warn('audio context could not be created', error);
    return undefined;
  }
}

/**
 * WebAudio mixer with master, music and sfx buses and pre-rendered files. The context is created at
 * construction (decoding works before a gesture). Whether audio is wanted (initially yes) changes
 * only through `suspend()`/`resume()`; `unlock()` and the end of an interruption resume the context
 * while it is wanted, because WebKit keeps an interrupted context suspended until script resumes it.
 * One wanted music track starts as soon as it is loaded and the context runs; every call is safe
 * without a context, without loaded audio and after `dispose()`.
 */
export class AudioMixer implements AudioPort {
  private graph: MixerGraph | undefined;
  private readonly logger: Logger;
  private readonly onInterrupted: () => void;
  private readonly levels: Record<BusName, number> = { master: 1, music: 1, sfx: 1 };
  private readonly sfxBuffers = new Map<string, AudioBufferLike>();
  private readonly tracks = new Map<string, LoadedTrack>();
  private readonly warnedIds = new Set<string>();
  private wanted: WantedTrack | undefined;
  private voice: MusicVoice | undefined;
  private isMuted = false;
  private isAudioWanted = true;
  private hasRun = false;
  private isInterrupted = false;

  constructor(options: AudioMixerOptions) {
    this.logger = options.logger;
    this.onInterrupted = options.onInterrupted;
    const context = openContext(options);
    if (context !== undefined) {
      this.graph = createMixerGraph(context);
      this.hasRun = context.state === 'running';
      context.addEventListener('statechange', () => {
        this.handleStateChange();
      });
    }
  }

  /**
   * `unavailable` without a context (or after dispose); `running` whenever the context runs;
   * `locked` while it is suspended and has never run; otherwise (suspended or interrupted) `suspended`.
   */
  get state(): MixerState {
    const contextState = this.graph?.context.state;
    if (contextState === undefined || contextState === 'closed') {
      return 'unavailable';
    }
    if (contextState === 'running') {
      return 'running';
    }
    return this.hasRun || contextState === 'interrupted' ? 'suspended' : 'locked';
  }

  /**
   * Called synchronously inside every user activation until the context has run once:
   * context.resume() if audio is wanted. Also called on gamepad button edges (resuming a running
   * context changes nothing).
   */
  unlock(): void {
    this.resumeIfWanted();
  }

  /** The app unsubscribes its activation listener once true. */
  get hasRunOnce(): boolean {
    return this.hasRun;
  }

  /**
   * Decodes a sound effect (WAV); without a context, or when disposed meanwhile, it keeps nothing.
   * Decoding errors reject.
   */
  async loadSfx(id: string, data: ArrayBuffer): Promise<void> {
    const graph = this.graph;
    if (graph === undefined) {
      return;
    }
    const buffer = await graph.context.decodeAudioData(data);
    if (this.graph === graph) {
      this.sfxBuffers.set(id, buffer);
    }
  }

  /**
   * Decodes a music track (MP3), resolves its loop points and starts it if it is the wanted track.
   * Without a context, or when disposed meanwhile, it keeps nothing. Decoding errors reject.
   */
  async loadMusic(id: string, data: ArrayBuffer, metadata: MusicMetadata): Promise<void> {
    const graph = this.graph;
    if (graph === undefined) {
      return;
    }
    const buffer = await graph.context.decodeAudioData(data);
    const loop = resolveLoopPoints(
      {
        durationSeconds: buffer.duration,
        sampleRate: buffer.sampleRate,
        channel0: buffer.getChannelData(0),
      },
      metadata,
    );
    if (this.graph === graph) {
      this.tracks.set(id, { buffer, loop });
      this.startWantedTrack();
    }
  }

  /** Plays a sound effect; no-op unless running, an unknown id warns once. */
  playSfx(id: string): void {
    const graph = this.runningGraph();
    if (graph === undefined) {
      return;
    }
    const buffer = this.sfxBuffers.get(id);
    if (buffer === undefined) {
      this.warnOnce(id, 'unknown sound effect');
      return;
    }
    const source = graph.context.createBufferSource();
    source.buffer = buffer;
    source.connect(graph.buses.sfx);
    source.start(graph.context.currentTime);
  }

  /**
   * Makes `id` the wanted track and starts it at its loop start (another playing track fades out over
   * 0.4 s); no-op while `id` already plays and is not fading out, so re-entering the hub never restarts
   * it. If the context is locked or suspended, the track starts once it runs. An id without loaded
   * music warns once and starts as soon as its `loadMusic` resolves while it is still wanted.
   */
  playMusic(id: string, options: PlayMusicOptions = {}): void {
    if (this.voice?.id === id) {
      return;
    }
    this.fadeOutVoice(DEFAULT_FADE_OUT_SECONDS);
    this.wanted = { id, fadeInSeconds: options.fadeInSeconds ?? DEFAULT_FADE_IN_SECONDS };
    if (!this.tracks.has(id)) {
      this.warnOnce(id, 'music not loaded');
    }
    this.startWantedTrack();
  }

  /** Fades the music out (default 0.4 s) and forgets the wanted track. */
  stopMusic(options: StopMusicOptions = {}): void {
    this.wanted = undefined;
    this.fadeOutVoice(options.fadeOutSeconds ?? DEFAULT_FADE_OUT_SECONDS);
  }

  /** Sets a bus level (0…1 UI level, applied as levelToGain). */
  setLevel(bus: BusName, level: number): void {
    this.levels[bus] = level;
    this.applyGain(bus);
  }

  /** Master gain 0 while muted; the context keeps running. */
  setMuted(isMuted: boolean): void {
    this.isMuted = isMuted;
    this.applyGain('master');
  }

  /** Stops wanting audio and suspends the context. */
  suspend(): void {
    this.isAudioWanted = false;
    const graph = this.graph;
    if (graph !== undefined) {
      graph.context.suspend().catch((error: unknown) => {
        this.logger.warn('audio context did not suspend', error);
      });
    }
  }

  /** Wants audio again and resumes the context. */
  resume(): void {
    this.isAudioWanted = true;
    this.resumeIfWanted();
  }

  /** Closes the context; the mixer is unavailable afterwards. */
  dispose(): void {
    const graph = this.graph;
    if (graph === undefined) {
      return;
    }
    this.graph = undefined;
    this.voice = undefined;
    this.wanted = undefined;
    this.sfxBuffers.clear();
    this.tracks.clear();
    graph.context.close().catch((error: unknown) => {
      this.logger.warn('audio context did not close', error);
    });
  }

  /** Follows the context: interruptions are reported once, then resumed while audio is wanted. */
  private handleStateChange(): void {
    const contextState = this.graph?.context.state;
    if (contextState === 'interrupted') {
      this.beginInterruption();
      return;
    }
    if (contextState === 'running') {
      this.hasRun = true;
    }
    if (this.isInterrupted && (contextState === 'running' || contextState === 'suspended')) {
      this.isInterrupted = false;
      this.resumeIfWanted();
    }
    this.startWantedTrack();
  }

  /** Marks an interruption and reports it once. */
  private beginInterruption(): void {
    if (this.isInterrupted) {
      return;
    }
    this.isInterrupted = true;
    try {
      this.onInterrupted();
    } catch (error: unknown) {
      this.logger.error('audio interruption handler failed', error);
    }
  }

  /** Resumes the context when audio is wanted; a refusal is logged (it may need a gesture). */
  private resumeIfWanted(): void {
    const graph = this.graph;
    if (graph === undefined || !this.isAudioWanted) {
      return;
    }
    graph.context.resume().then(
      () => {
        this.handleStateChange();
      },
      (error: unknown) => {
        this.logger.warn('audio context did not resume', error);
      },
    );
  }

  /** The graph while its context runs. */
  private runningGraph(): MixerGraph | undefined {
    return this.graph?.context.state === 'running' ? this.graph : undefined;
  }

  /** Starts the wanted track when it is loaded, the context runs and nothing plays yet. */
  private startWantedTrack(): void {
    const graph = this.runningGraph();
    const wanted = this.wanted;
    if (graph === undefined || wanted === undefined || this.voice !== undefined) {
      return;
    }
    const track = this.tracks.get(wanted.id);
    if (track !== undefined) {
      this.voice = startMusicVoice(graph, track, wanted);
    }
  }

  /** Fades the playing track out; it no longer counts as playing. */
  private fadeOutVoice(seconds: number): void {
    const graph = this.graph;
    const voice = this.voice;
    this.voice = undefined;
    if (graph !== undefined && voice !== undefined) {
      fadeOutMusicVoice(graph, voice, seconds);
    }
  }

  /** Applies the gain of one bus at the current time. */
  private applyGain(bus: BusName): void {
    const graph = this.graph;
    if (graph === undefined) {
      return;
    }
    const gain = bus === 'master' && this.isMuted ? 0 : levelToGain(this.levels[bus]);
    setParamNow(graph.buses[bus].gain, gain, graph.context.currentTime);
  }

  /** Logs `message` once per id. */
  private warnOnce(id: string, message: string): void {
    const key = `${message}:${id}`;
    if (!this.warnedIds.has(key)) {
      this.warnedIds.add(key);
      this.logger.warn(message, { id });
    }
  }
}
