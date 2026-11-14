// @vitest-environment happy-dom
import { afterEach, expect, test, vi } from 'vitest';
import { LifecycleMonitor } from './lifecycle-monitor.ts';
import type { LifecycleEvent } from './lifecycle-monitor.ts';

function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
  document.dispatchEvent(new Event('visibilitychange'));
}

afterEach(() => {
  Reflect.deleteProperty(document, 'visibilityState');
});

test('LifecycleMonitor: DOM events become suspend and resume events', () => {
  const monitor = new LifecycleMonitor({ window, document });
  const events: LifecycleEvent[] = [];
  monitor.subscribe((event) => events.push(event));
  setVisibility('hidden');
  expect(monitor.isVisible).toBe(false);
  setVisibility('visible');
  expect(monitor.isVisible).toBe(true);
  window.dispatchEvent(new Event('blur'));
  window.dispatchEvent(new Event('focus'));
  window.dispatchEvent(new Event('pagehide'));
  expect(events).toEqual([
    { kind: 'suspend', reason: 'hidden' },
    { kind: 'resume' },
    { kind: 'suspend', reason: 'blur' },
    { kind: 'resume' },
    { kind: 'suspend', reason: 'pagehide' },
  ]);
  monitor.dispose();
});

test('LifecycleMonitor: producers outside the DOM report their reasons', () => {
  const monitor = new LifecycleMonitor({ window, document });
  const listener = vi.fn<(event: LifecycleEvent) => void>();
  monitor.subscribe(listener);
  for (const reason of ['audio-interrupted', 'posture-changed', 'viewport-changed'] as const) {
    monitor.report(reason);
  }
  monitor.report('gamepad-disconnected');
  expect(listener.mock.calls.map(([event]) => event)).toEqual([
    { kind: 'suspend', reason: 'audio-interrupted' },
    { kind: 'suspend', reason: 'posture-changed' },
    { kind: 'suspend', reason: 'viewport-changed' },
    { kind: 'suspend', reason: 'gamepad-disconnected' },
  ]);
  monitor.dispose();
});

test('LifecycleMonitor: dispose removes the DOM listeners and the subscribers', () => {
  const monitor = new LifecycleMonitor({ window, document });
  const listener = vi.fn();
  const unsubscribe = monitor.subscribe(listener);
  monitor.dispose();
  window.dispatchEvent(new Event('blur'));
  setVisibility('hidden');
  monitor.report('blur');
  unsubscribe();
  expect(listener).not.toHaveBeenCalled();
});
