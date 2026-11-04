import { notImplemented } from '../util/assert.ts';
import type { AudioBufferLike, AudioContextLike } from './audio-context-like.ts';

/** A scripted audio context for tests and snapshot services. */
export interface FakeAudioContext extends AudioContextLike {
  readonly startedSources: readonly {
    readonly buffer: AudioBufferLike | null;
    readonly when: number;
    readonly offset: number;
    readonly loop: boolean;
  }[];
  setState(state: 'suspended' | 'running' | 'interrupted' | 'closed'): void;
  advanceTime(seconds: number): void;
}

/** Creates a fake audio context. */
export function createFakeAudioContext(_options?: {
  readonly sampleRate?: number;
  readonly decodedSeconds?: number;
}): FakeAudioContext {
  return notImplemented('engine.createFakeAudioContext');
}
