// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ANNOUNCE_CLEAR_MS, ANNOUNCE_MIN_SPACING_MS } from './a11y-mirror.ts';
import { createMirrorFixture } from './test-support/mirror-fixture.ts';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** Records every text the region shows, sampled each millisecond for `ms`. */
function watch(region: Element | null, ms: number): readonly string[] {
  const shown: string[] = [];
  for (let elapsed = 0; elapsed < ms; elapsed += 1) {
    const text = region?.textContent ?? '';
    if (text !== '' && shown.at(-1) !== text) {
      shown.push(text);
    }
    vi.advanceTimersByTime(1);
  }
  return shown;
}

test('a polite message is written after the clear delay and nothing cuts it off early', () => {
  const { mirror, root } = createMirrorFixture();
  const live = root.querySelector('.a11y-live');
  mirror.announce('Round starts. 3');
  vi.advanceTimersByTime(ANNOUNCE_CLEAR_MS - 1);
  expect(live?.textContent).toBe('');
  vi.advanceTimersByTime(1);
  expect(live?.textContent).toBe('Round starts. 3');
  mirror.announce('2');
  vi.advanceTimersByTime(ANNOUNCE_MIN_SPACING_MS - 1);
  expect(live?.textContent).toBe('Round starts. 3');
  vi.advanceTimersByTime(1 + ANNOUNCE_CLEAR_MS);
  expect(live?.textContent).toBe('2');
});

test('three polite messages within 100 ms: the first and the last are spoken', () => {
  const { mirror, root } = createMirrorFixture();
  mirror.announce('one');
  vi.advanceTimersByTime(40);
  mirror.announce('two');
  vi.advanceTimersByTime(40);
  mirror.announce('three');
  expect(watch(root.querySelector('.a11y-live'), 2000)).toEqual(['one', 'three']);
});

test('a repeated text is cleared and written again, so it is read again', () => {
  const { mirror, root } = createMirrorFixture();
  const live = root.querySelector('.a11y-live');
  mirror.announce('Go');
  vi.advanceTimersByTime(ANNOUNCE_CLEAR_MS + ANNOUNCE_MIN_SPACING_MS);
  mirror.announce('Go');
  expect(live?.textContent).toBe('');
  vi.advanceTimersByTime(ANNOUNCE_CLEAR_MS);
  expect(live?.textContent).toBe('Go');
});

test('assertive messages go to the alert region without waiting for the polite queue', () => {
  const { mirror, root } = createMirrorFixture();
  mirror.announce('polite one');
  mirror.announce('polite two');
  mirror.announce('New record!', 'assertive');
  mirror.announce('Top 10!', 'assertive');
  vi.advanceTimersByTime(ANNOUNCE_CLEAR_MS);
  expect(root.querySelector('.a11y-alert')?.textContent).toBe('Top 10!');
  expect(root.querySelector('.a11y-live')?.textContent).toBe('polite one');
});

test('dispose cancels pending announcements', () => {
  const { mirror, root } = createMirrorFixture();
  const live = root.querySelector('.a11y-live');
  mirror.announce('one');
  mirror.announce('two');
  mirror.announce('alert', 'assertive');
  mirror.dispose();
  vi.advanceTimersByTime(5000);
  expect(live?.textContent).toBe('');
  expect(vi.getTimerCount()).toBe(0);
});
