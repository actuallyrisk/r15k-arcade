import { notImplemented } from '../util/assert.ts';
import type { LogSink } from './logger.ts';

/** A sink that writes to a console-like target; the only console use of the code base. */
export function createConsoleSink(
  _target: Pick<Console, 'debug' | 'info' | 'warn' | 'error'>,
): LogSink {
  return notImplemented('engine.createConsoleSink');
}
