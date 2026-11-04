import { expect, test } from 'vitest';
import { createAnimationFrameScheduler, createManualScheduler } from './frame-scheduler.ts';

test('the animation frame scheduler delegates to the host', () => {
  const requested: FrameRequestCallback[] = [];
  const cancelled: number[] = [];
  const host = {
    requestAnimationFrame(callback: FrameRequestCallback): number {
      requested.push(callback);
      return requested.length;
    },
    cancelAnimationFrame(handle: number): void {
      cancelled.push(handle);
    },
  };
  const scheduler = createAnimationFrameScheduler(host);
  const times: number[] = [];
  const handle = scheduler.request((timeMs) => times.push(timeMs));
  scheduler.cancel(handle);
  requested[0]?.(12.5);
  expect(handle).toBe(1);
  expect(cancelled).toEqual([1]);
  expect(times).toEqual([12.5]);
});

test('a manual frame runs the callbacks requested before it, with its timestamp', () => {
  const scheduler = createManualScheduler();
  const seen: string[] = [];
  scheduler.request((timeMs) => {
    seen.push(`a${timeMs}`);
    scheduler.request((later) => seen.push(`c${later}`));
  });
  scheduler.request((timeMs) => seen.push(`b${timeMs}`));
  expect(scheduler.pendingCount).toBe(2);
  expect(scheduler.runFrame(16)).toBe(true);
  expect(seen).toEqual(['a16', 'b16']);
  expect(scheduler.pendingCount).toBe(1);
  expect(scheduler.runFrame(32)).toBe(true);
  expect(seen).toEqual(['a16', 'b16', 'c32']);
  expect(scheduler.runFrame(48)).toBe(false);
});

test('cancelled callbacks never run, even when cancelled during the frame', () => {
  const scheduler = createManualScheduler();
  const seen: string[] = [];
  let second = 0;
  scheduler.request(() => {
    seen.push('first');
    scheduler.cancel(second);
  });
  second = scheduler.request(() => seen.push('second'));
  const third = scheduler.request(() => seen.push('third'));
  scheduler.cancel(third);
  scheduler.cancel(999);
  expect(scheduler.runFrame(1)).toBe(true);
  expect(seen).toEqual(['first']);
  expect(scheduler.pendingCount).toBe(0);
});

test('an error in one callback does not stop the others of the frame', () => {
  const scheduler = createManualScheduler();
  const seen: string[] = [];
  scheduler.request(() => {
    throw new Error('frame failed');
  });
  scheduler.request(() => seen.push('ran'));
  expect(() => scheduler.runFrame(1)).toThrow('frame failed');
  expect(seen).toEqual(['ran']);
  const fail = (): void => {
    throw new Error('again');
  };
  scheduler.request(fail);
  scheduler.request(fail);
  expect(() => scheduler.runFrame(2)).toThrow(AggregateError);
});
