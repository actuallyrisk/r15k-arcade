import { expect, test } from 'vitest';
import { createLogger } from './logger.ts';
import { createMemorySink } from './memory-sink.ts';

test('an enabled logger hands every level to the sink', () => {
  const memory = createMemorySink();
  const logger = createLogger({ isEnabled: true, sink: memory.sink });
  const failure = new Error('boom');
  logger.debug('d', { n: 1 });
  logger.info('i');
  logger.warn('w', 'detail');
  logger.error('e', failure);
  expect(memory.entries).toEqual([
    { level: 'debug', scope: '', message: 'd', data: { n: 1 } },
    { level: 'info', scope: '', message: 'i', data: undefined },
    { level: 'warn', scope: '', message: 'w', data: 'detail' },
    { level: 'error', scope: '', message: 'e', data: failure },
  ]);
});

test('child loggers extend the scope with dots', () => {
  const memory = createMemorySink();
  const root = createLogger({ isEnabled: true, sink: memory.sink });
  root.child('audio').child('mixer').warn('locked');
  createLogger({ isEnabled: true, sink: memory.sink, scope: 'app' }).child('boot').info('ready');
  expect(memory.entries.map((entry) => entry.scope)).toEqual(['audio.mixer', 'app.boot']);
});

test('a disabled logger and its children drop everything', () => {
  const memory = createMemorySink();
  const logger = createLogger({ isEnabled: false, sink: memory.sink, scope: 'app' });
  logger.debug('d');
  logger.info('i');
  logger.warn('w');
  logger.error('e', new Error('x'));
  logger.child('nested').error('still nothing');
  expect(memory.entries).toEqual([]);
});

test('sink errors reach the caller', () => {
  const logger = createLogger({
    isEnabled: true,
    sink: () => {
      throw new Error('sink failed');
    },
  });
  expect(() => {
    logger.info('x');
  }).toThrow('sink failed');
});
