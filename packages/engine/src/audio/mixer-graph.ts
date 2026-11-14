// The node graph of the mixer and its music voices: source → fade gain (music only) → bus gain →
// master gain → destination. Each music voice has its own fade gain, so one track can fade out while
// the next fades in; the bus gains carry only the volume levels.
import type {
  AudioBufferLike,
  AudioContextLike,
  AudioParamLike,
  BufferSourceLike,
  GainNodeLike,
} from './audio-context-like.ts';
import type { BusName } from './audio-types.ts';
import type { LoopPoints } from './loop-points.ts';

/** A context with the three bus gains connected. */
export interface MixerGraph {
  readonly context: AudioContextLike;
  readonly buses: Readonly<Record<BusName, GainNodeLike>>;
}

/** A decoded music track with its resolved loop points. */
export interface LoadedTrack {
  readonly buffer: AudioBufferLike;
  readonly loop: LoopPoints;
}

/** A playing music track that is not fading out. */
export interface MusicVoice {
  readonly id: string;
  readonly source: BufferSourceLike;
  readonly fade: GainNodeLike;
}

/** One linear gain change. */
interface Ramp {
  readonly from: number;
  readonly to: number;
  readonly startTime: number;
  readonly seconds: number;
}

/** Creates master, music and sfx gains (in this order) and connects them to the destination. */
export function createMixerGraph(context: AudioContextLike): MixerGraph {
  const master = context.createGain();
  master.connect(context.destination);
  const music = context.createGain();
  music.connect(master);
  const sfx = context.createGain();
  sfx.connect(master);
  return { context, buses: { master, music, sfx } };
}

/** Sets a param from now on, dropping every change scheduled from now. */
export function setParamNow(param: AudioParamLike, value: number, time: number): void {
  param.cancelScheduledValues(time);
  param.setValueAtTime(value, time);
}

/** Replaces scheduled changes with a linear ramp (an immediate change when it has no duration). */
function rampParam(param: AudioParamLike, ramp: Ramp): void {
  setParamNow(param, ramp.from, ramp.startTime);
  if (ramp.seconds > 0) {
    param.linearRampToValueAtTime(ramp.to, ramp.startTime + ramp.seconds);
  } else {
    param.setValueAtTime(ramp.to, ramp.startTime);
  }
}

/** Starts a track at its loop start, looping between its loop points, and fades it in. */
export function startMusicVoice(
  graph: MixerGraph,
  track: LoadedTrack,
  request: { readonly id: string; readonly fadeInSeconds: number },
): MusicVoice {
  const { context } = graph;
  const now = context.currentTime;
  const source = context.createBufferSource();
  source.buffer = track.buffer;
  source.loop = true;
  source.loopStart = track.loop.loopStartSeconds;
  source.loopEnd = track.loop.loopEndSeconds;
  const fade = context.createGain();
  source.connect(fade);
  fade.connect(graph.buses.music);
  rampParam(fade.gain, { from: 0, to: 1, startTime: now, seconds: request.fadeInSeconds });
  source.start(now, track.loop.loopStartSeconds);
  return { id: request.id, source, fade };
}

/** Fades a voice out from its current gain and stops its source when the fade ends. */
export function fadeOutMusicVoice(graph: MixerGraph, voice: MusicVoice, seconds: number): void {
  const now = graph.context.currentTime;
  const duration = Math.max(seconds, 0);
  rampParam(voice.fade.gain, {
    from: voice.fade.gain.value,
    to: 0,
    startTime: now,
    seconds: duration,
  });
  voice.source.stop(now + duration);
}
