import type { AudioBufferLike, AudioContextLike } from './audio-context-like.ts';
import {
  createFakeBuffer,
  createFakeGain,
  createFakeNode,
  createFakeSource,
} from './fake-audio-nodes.ts';
import type { StartedSource } from './fake-audio-nodes.ts';

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

type FakeState = 'suspended' | 'running' | 'interrupted' | 'closed';

/** The state of a fake context and its `statechange` listeners. */
interface FakeStateMachine {
  readonly current: () => FakeState;
  /** Changes the state at once; listeners run when it differs. */
  readonly set: (next: FakeState) => void;
  /** Changes the state one microtask later, as resume()/suspend() do. */
  readonly request: (next: 'running' | 'suspended') => Promise<void>;
  readonly listen: (listener: () => void) => void;
}

/** Creates the state machine, starting `suspended`. */
function createStateMachine(): FakeStateMachine {
  let state: FakeState = 'suspended';
  const listeners: (() => void)[] = [];
  const set = (next: FakeState): void => {
    if (next !== state) {
      state = next;
      for (const listener of [...listeners]) {
        listener();
      }
    }
  };
  const current = (): FakeState => state;
  return {
    current,
    set,
    request: async (next) => {
      if (current() === 'closed') {
        throw new Error(`InvalidStateError: cannot change a closed audio context to ${next}`);
      }
      await Promise.resolve();
      // The state may have changed meanwhile: a closed context stays closed, and only the system
      // (setState) ends an interruption.
      const latest = current();
      if (latest !== 'closed' && !(latest === 'interrupted' && next === 'running')) {
        set(next);
      }
    },
    listen: (listener) => {
      listeners.push(listener);
    },
  };
}

/** Decodes like a browser: one microtask later, a silent buffer, and a rejection for empty data. */
async function decodeFake(
  data: ArrayBuffer,
  seconds: number,
  sampleRate: number,
): Promise<AudioBufferLike> {
  await Promise.resolve();
  if (data.byteLength === 0) {
    throw new Error('EncodingError: unable to decode empty audio data');
  }
  return createFakeBuffer(seconds, sampleRate);
}

/**
 * Creates a fake audio context. It starts `suspended` at time 0 (like a browser before a gesture);
 * `resume()`/`suspend()` change the state one microtask later and then fire `statechange`, as a real
 * context does asynchronously. While `interrupted`, `resume()` keeps the interruption (only
 * `setState` ends it). A closed context rejects both. `setState` changes the state at once and fires
 * `statechange` when it differs. `decodeAudioData` resolves to a silent mono buffer of
 * `decodedSeconds` (default 1) at `sampleRate` (default 48000), and rejects empty data. Gains evaluate
 * their automation at `currentTime`, which only `advanceTime` moves.
 */
export function createFakeAudioContext(
  options: { readonly sampleRate?: number; readonly decodedSeconds?: number } = {},
): FakeAudioContext {
  const sampleRate = options.sampleRate ?? 48_000;
  const decodedSeconds = options.decodedSeconds ?? 1;
  const machine = createStateMachine();
  const startedSources: StartedSource[] = [];
  let currentTime = 0;
  const now = (): number => currentTime;
  return {
    get currentTime(): number {
      return currentTime;
    },
    sampleRate,
    get state(): string {
      return machine.current();
    },
    destination: createFakeNode(),
    startedSources,
    createGain: () => createFakeGain(now),
    createBufferSource: () => createFakeSource((source) => startedSources.push(source)),
    decodeAudioData: (data) => decodeFake(data, decodedSeconds, sampleRate),
    resume: () => machine.request('running'),
    suspend: () => machine.request('suspended'),
    close: async () => {
      await Promise.resolve();
      machine.set('closed');
    },
    addEventListener: (_type, listener) => {
      machine.listen(listener);
    },
    setState: machine.set,
    advanceTime: (seconds) => {
      currentTime += seconds;
    },
  };
}
