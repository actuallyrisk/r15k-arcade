// R15K Arcade tools – AudioParam automation with the formulas of the Web Audio specification:
// setValueAtTime holds a value, linear and exponential ramps run from the previous event's time and value
// to their own, and after the last event its value holds. Events at the same time keep their insertion
// order. Times are seconds relative to the start of the voice that owns the parameter.

/** Kind of an automation event. */
export type ParamEventKind = 'set' | 'linear' | 'exponential';

/** One automation event: the value the parameter has (or reaches) at `time`. */
export interface ParamEvent {
  readonly kind: ParamEventKind;
  readonly value: number;
  readonly time: number;
}

/** A parameter's default value and its events, sorted by time. */
export interface ParamTimeline {
  readonly defaultValue: number;
  readonly events: readonly ParamEvent[];
}

/** `setValueAtTime(value, time)`. */
export function setValueAt(value: number, time: number): ParamEvent {
  return { kind: 'set', value, time };
}

/** `linearRampToValueAtTime(value, time)`. */
export function linearRampTo(value: number, time: number): ParamEvent {
  return { kind: 'linear', value, time };
}

/** `exponentialRampToValueAtTime(value, time)`. */
export function exponentialRampTo(value: number, time: number): ParamEvent {
  return { kind: 'exponential', value, time };
}

/** A timeline from events in insertion order (stable sort by time). */
export function automate(defaultValue: number, events: readonly ParamEvent[]): ParamTimeline {
  return { defaultValue, events: [...events].sort((a, b) => a.time - b.time) };
}

/** Value at `time` of the ramp `next`, which starts at (`startTime`, `startValue`). */
function rampValue(
  next: ParamEvent,
  start: { readonly time: number; readonly value: number },
  time: number,
): number {
  const fraction = (time - start.time) / (next.time - start.time);
  if (next.kind === 'linear') {
    return start.value + (next.value - start.value) * fraction;
  }
  // Exponential ramps need a start and an end of the same sign; otherwise the start value holds.
  if (start.value * next.value <= 0) {
    return start.value;
  }
  return start.value * (next.value / start.value) ** fraction;
}

/**
 * Value at `time`, given the index of the first event later than `time` (`next`): the previous event's
 * value, or the ramp toward the next event.
 */
function valueBetween(timeline: ParamTimeline, next: number, time: number): number {
  const previous = timeline.events[next - 1];
  const upcoming = timeline.events[next];
  const start = previous ?? { time: 0, value: timeline.defaultValue };
  if (upcoming === undefined || upcoming.kind === 'set') {
    return start.value;
  }
  return rampValue(upcoming, start, time);
}

/** Index of the first event later than `time`, searching from `from`. */
function nextEventIndex(timeline: ParamTimeline, from: number, time: number): number {
  let index = from;
  while (index < timeline.events.length && (timeline.events[index]?.time ?? Infinity) <= time) {
    index += 1;
  }
  return index;
}

/** Value of the parameter at `time`. */
export function paramValueAt(timeline: ParamTimeline, time: number): number {
  return valueBetween(timeline, nextEventIndex(timeline, 0, time), time);
}

/** Values of the parameter at the sample times `n / sampleRate` for n = 0 … length − 1. */
export function renderParam(
  timeline: ParamTimeline,
  length: number,
  sampleRate: number,
): Float64Array {
  const values = new Float64Array(length);
  let next = 0;
  for (let sample = 0; sample < length; sample += 1) {
    const time = sample / sampleRate;
    next = nextEventIndex(timeline, next, time);
    values[sample] = valueBetween(timeline, next, time);
  }
  return values;
}
