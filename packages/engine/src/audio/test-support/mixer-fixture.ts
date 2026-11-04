// A mixer over a fake audio context with a recording logger, the gains it created (master, music and
// sfx first, then one fade gain per music voice) and a helper that lets pending promises settle.
import { vi } from 'vitest';
import type { Mock } from 'vitest';
import type { LogEntry } from '../../logger/logger.ts';
import { createTestLogger } from '../../scenes/test-support/test-logger.ts';
import type { GainNodeLike } from '../audio-context-like.ts';
import type { MusicMetadata } from '../audio-types.ts';
import { createFakeAudioContext } from '../fake-audio-context.ts';
import type { FakeAudioContext } from '../fake-audio-context.ts';
import { AudioMixer } from '../mixer.ts';

/** Metadata of a 1 s track at 48 kHz whose loop is 0.25 s … 0.75 s (the fake decodes 1 s). */
export const TEST_METADATA: MusicMetadata = {
  format: 'r15k-music',
  version: 1,
  id: 'meow-house',
  file: 'music/meow-house.mp3',
  sampleRate: 48_000,
  channels: 1,
  bitrateKbps: 96,
  pcmLength: 48_000,
  loopStartSample: 12_000,
  loopEndSample: 36_000,
  onsetSample: 100,
  encoder: { name: 'lame', delaySamples: 1105, paddingSamples: 47, frames: 43 },
  inputHash: '0123abcd',
};

/** Non-empty bytes, which the fake context decodes. */
export const AUDIO_BYTES = (): ArrayBuffer => new ArrayBuffer(16);

/** Everything a mixer test looks at. */
export interface MixerFixture {
  readonly mixer: AudioMixer;
  readonly context: FakeAudioContext;
  readonly entries: readonly LogEntry[];
  readonly gains: readonly GainNodeLike[];
  readonly onInterrupted: Mock<() => void>;
}

/** Creates a mixer; `isRunning` starts the context running (autoplay allowed). */
export function createMixerFixture(options: { readonly isRunning?: boolean } = {}): MixerFixture {
  const context = createFakeAudioContext();
  if (options.isRunning === true) {
    context.setState('running');
  }
  const gains: GainNodeLike[] = [];
  const createGain = context.createGain.bind(context);
  context.createGain = () => {
    const gain = createGain();
    gains.push(gain);
    return gain;
  };
  const { logger, entries } = createTestLogger();
  const onInterrupted = vi.fn<() => void>();
  const mixer = new AudioMixer({ createContext: () => context, logger, onInterrupted });
  return { mixer, context, entries, gains, onInterrupted };
}

/** Lets every pending promise and its follow-ups settle (one macrotask). */
export function settle(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/** The gain value of `gains[index]` at the context's current time. */
export function gainAt(fixture: MixerFixture, index: number): number | undefined {
  return fixture.gains[index]?.gain.value;
}
