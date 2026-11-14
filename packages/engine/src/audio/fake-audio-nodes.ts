// Nodes, params and buffers of the fake audio context. Params evaluate their automation (set and
// linear-ramp events, Web Audio formulas) at the context's current time, so tests read faded gains
// after advancing the fake clock.
import type {
  AudioBufferLike,
  AudioNodeLike,
  AudioParamLike,
  BufferSourceLike,
  GainNodeLike,
} from './audio-context-like.ts';

/** One scheduled automation event. */
interface AutomationEvent {
  readonly kind: 'set' | 'linear';
  readonly value: number;
  readonly time: number;
}

/** What a started source reports to its context. */
export interface StartedSource {
  readonly buffer: AudioBufferLike | null;
  readonly when: number;
  readonly offset: number;
  readonly loop: boolean;
}

/**
 * The param value at `time`: the value of the last event at or before `time`, interpolated towards a
 * following linear ramp (v = v0 + (v1 − v0) · (t − t0) / (t1 − t0)); before any event the initial value.
 */
function valueAt(events: readonly AutomationEvent[], initial: number, time: number): number {
  let previousTime = 0;
  let previousValue = initial;
  for (const event of events) {
    if (event.time <= time) {
      previousTime = event.time;
      previousValue = event.value;
    } else {
      return event.kind === 'linear'
        ? previousValue +
            ((event.value - previousValue) * (time - previousTime)) / (event.time - previousTime)
        : previousValue;
    }
  }
  return previousValue;
}

/** A param with automation; setting `value` schedules a set event at the current time. */
export function createFakeParam(initial: number, now: () => number): AudioParamLike {
  const events: AutomationEvent[] = [];
  const schedule = (event: AutomationEvent): void => {
    events.push(event);
    // Stable sort: events at the same time keep their insertion order, as in Web Audio.
    events.sort((a, b) => a.time - b.time);
  };
  return {
    get value(): number {
      return valueAt(events, initial, now());
    },
    set value(value: number) {
      schedule({ kind: 'set', value, time: now() });
    },
    setValueAtTime: (value, startTime) => {
      schedule({ kind: 'set', value, time: startTime });
    },
    linearRampToValueAtTime: (value, endTime) => {
      schedule({ kind: 'linear', value, time: endTime });
    },
    cancelScheduledValues: (cancelTime) => {
      const kept = events.filter((event) => event.time < cancelTime);
      events.splice(0, events.length, ...kept);
    },
  };
}

/** A node that only accepts connections. */
export function createFakeNode(): AudioNodeLike {
  return {
    connect: (destination) => destination,
    disconnect: () => undefined,
  };
}

/** A gain node with an automated gain param (initially 1). */
export function createFakeGain(now: () => number): GainNodeLike {
  return { ...createFakeNode(), gain: createFakeParam(1, now) };
}

/** A buffer source that reports its start and, like Web Audio, refuses a second start or an early stop. */
export function createFakeSource(onStart: (source: StartedSource) => void): BufferSourceLike {
  let isStarted = false;
  return {
    ...createFakeNode(),
    buffer: null,
    loop: false,
    loopStart: 0,
    loopEnd: 0,
    start(when = 0, offset = 0): void {
      if (isStarted) {
        throw new Error('InvalidStateError: a buffer source can be started only once');
      }
      isStarted = true;
      onStart({ buffer: this.buffer, when, offset, loop: this.loop });
    },
    stop(): void {
      if (!isStarted) {
        throw new Error('InvalidStateError: a buffer source must be started before it stops');
      }
    },
  };
}

/** A silent mono buffer of the given length. */
export function createFakeBuffer(durationSeconds: number, sampleRate: number): AudioBufferLike {
  const samples = new Float32Array(Math.round(durationSeconds * sampleRate));
  return {
    duration: durationSeconds,
    length: samples.length,
    sampleRate,
    getChannelData: (channel) => {
      if (channel !== 0) {
        throw new RangeError(`the fake buffer is mono; channel ${channel} does not exist`);
      }
      return samples;
    },
  };
}
