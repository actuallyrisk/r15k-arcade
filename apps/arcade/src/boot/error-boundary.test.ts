import { createFakeClock, createLogger, createMemorySink } from '@r15k/engine';
import { expect, test, vi } from 'vitest';
import type { AppNavigation } from '../scenes/navigation.ts';
import { createErrorBoundary } from './error-boundary.ts';
import type { ErrorBoundary } from './error-boundary.ts';

/** The recording navigation of a boundary test. */
interface FakeNavigation {
  readonly hasActiveRound: boolean;
  readonly pauseRound: ReturnType<typeof vi.fn>;
  readonly toHub: ReturnType<typeof vi.fn>;
  readonly resetToHub: ReturnType<typeof vi.fn>;
}

/** A boundary over a recording navigation. */
function setup(hasActiveRound: boolean): {
  readonly clock: ReturnType<typeof createFakeClock>;
  readonly navigation: FakeNavigation;
  readonly wake: ReturnType<typeof vi.fn>;
  readonly onBootError: ReturnType<typeof vi.fn>;
  readonly boundary: ErrorBoundary;
} {
  const clock = createFakeClock();
  const navigation: FakeNavigation = {
    hasActiveRound,
    pauseRound: vi.fn(),
    toHub: vi.fn(),
    resetToHub: vi.fn(),
  };
  const wake = vi.fn();
  const onBootError = vi.fn();
  const logger = createLogger({ isEnabled: true, sink: createMemorySink().sink });
  const boundary = createErrorBoundary({
    logger,
    clock,
    navigation: () => navigation as unknown as AppNavigation,
    wake,
    onBootError,
  });
  return { clock, navigation, wake, onBootError, boundary };
}

test('before the first frame an error shows the boot failure box', () => {
  const { boundary, onBootError, wake } = setup(false);
  boundary.handleFatal(new Error('boom'));
  expect(onBootError).toHaveBeenCalledOnce();
  expect(wake).not.toHaveBeenCalled();
});

test('a running round pauses, any other scene returns to the hub', () => {
  const round = setup(true);
  round.boundary.markPresented();
  round.boundary.handleFatal(new Error('a'));
  expect(round.navigation.pauseRound).toHaveBeenCalledWith('player');
  expect(round.wake).toHaveBeenCalledOnce();
  const hub = setup(false);
  hub.boundary.markPresented();
  hub.boundary.handleFatal(new Error('b'));
  expect(hub.navigation.toHub).toHaveBeenCalledOnce();
});

test('repeated errors reset to the hub, then show the failure box', () => {
  const { boundary, clock, navigation, onBootError } = setup(false);
  boundary.markPresented();
  boundary.handleFatal(new Error('1'));
  clock.advance(500);
  boundary.handleFatal(new Error('2'));
  expect(navigation.resetToHub).toHaveBeenCalledOnce();
  clock.advance(500);
  boundary.handleFatal(new Error('3'));
  expect(onBootError).toHaveBeenCalledOnce();
  clock.advance(2000);
  boundary.handleFatal(new Error('4'));
  expect(navigation.toHub).toHaveBeenCalledTimes(2);
});
