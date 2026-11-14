import { expect, test } from 'vitest';
import { createConsoleSink } from './console-sink.ts';
import type { LogLevel } from './logger.ts';

/** A console-like target that records its calls. */
function recordingTarget(): {
  readonly target: Pick<Console, LogLevel>;
  readonly calls: (readonly [LogLevel, readonly unknown[]])[];
} {
  const calls: (readonly [LogLevel, readonly unknown[]])[] = [];
  const method =
    (level: LogLevel) =>
    (...data: unknown[]): void => {
      calls.push([level, data]);
    };
  return {
    target: {
      debug: method('debug'),
      info: method('info'),
      warn: method('warn'),
      error: method('error'),
    },
    calls,
  };
}

test('entries go to the method of their level with the scope as prefix', () => {
  const { target, calls } = recordingTarget();
  const sink = createConsoleSink(target);
  const failure = new Error('x');
  sink({ level: 'debug', scope: 'audio', message: 'decoded', data: { id: 'meow' } });
  sink({ level: 'info', scope: '', message: 'ready', data: undefined });
  sink({ level: 'warn', scope: 'save', message: 'slot a', data: undefined });
  sink({ level: 'error', scope: 'loop', message: 'frame failed', data: failure });
  expect(calls).toEqual([
    ['debug', ['[audio] decoded', { id: 'meow' }]],
    ['info', ['ready']],
    ['warn', ['[save] slot a']],
    ['error', ['[loop] frame failed', failure]],
  ]);
});

test('the sink calls the target as a method', () => {
  const seen: unknown[] = [];
  const target = {
    prefix: '>',
    debug(...data: unknown[]): void {
      seen.push(this.prefix, ...data);
    },
    info: (): void => undefined,
    warn: (): void => undefined,
    error: (): void => undefined,
  };
  createConsoleSink(target)({ level: 'debug', scope: '', message: 'm', data: undefined });
  expect(seen).toEqual(['>', 'm']);
});
