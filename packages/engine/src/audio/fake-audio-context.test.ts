import { expect, test, vi } from 'vitest';
import { createFakeAudioContext } from './fake-audio-context.ts';

test('a new fake context is suspended at time 0 with the default sample rate', () => {
  const context = createFakeAudioContext();
  expect([context.state, context.currentTime, context.sampleRate]).toEqual([
    'suspended',
    0,
    48_000,
  ]);
  context.advanceTime(1.5);
  expect(context.currentTime).toBe(1.5);
});

test('resume and suspend change the state one microtask later and fire statechange', async () => {
  const context = createFakeAudioContext();
  const listener = vi.fn();
  context.addEventListener('statechange', listener);
  const resumed = context.resume();
  expect(context.state).toBe('suspended');
  await resumed;
  expect(context.state).toBe('running');
  await context.suspend();
  expect(context.state).toBe('suspended');
  expect(listener).toHaveBeenCalledTimes(2);
});

test('setState fires statechange only for a change', () => {
  const context = createFakeAudioContext();
  const listener = vi.fn();
  context.addEventListener('statechange', listener);
  context.setState('suspended');
  context.setState('interrupted');
  expect(listener).toHaveBeenCalledTimes(1);
});

test('resume keeps an interruption; a closed context rejects both requests', async () => {
  const context = createFakeAudioContext();
  context.setState('interrupted');
  await context.resume();
  expect(context.state).toBe('interrupted');
  await context.close();
  expect(context.state).toBe('closed');
  await expect(context.resume()).rejects.toThrow('closed');
  await expect(context.suspend()).rejects.toThrow('closed');
});

test('decodeAudioData gives a silent mono buffer and rejects empty data', async () => {
  const context = createFakeAudioContext({ sampleRate: 44_100, decodedSeconds: 2 });
  const buffer = await context.decodeAudioData(new ArrayBuffer(8));
  expect([buffer.duration, buffer.sampleRate, buffer.length]).toEqual([2, 44_100, 88_200]);
  expect(buffer.getChannelData(0).every((sample) => sample === 0)).toBe(true);
  expect(() => buffer.getChannelData(1)).toThrow(RangeError);
  await expect(context.decodeAudioData(new ArrayBuffer(0))).rejects.toThrow('EncodingError');
});

test('started sources are recorded; a source starts once and stops only after starting', () => {
  const context = createFakeAudioContext();
  const source = context.createBufferSource();
  expect(() => {
    source.stop();
  }).toThrow('InvalidStateError');
  source.loop = true;
  source.connect(context.destination);
  source.start(1, 0.5);
  source.stop(2);
  source.disconnect();
  expect(context.startedSources).toEqual([{ buffer: null, when: 1, offset: 0.5, loop: true }]);
  expect(() => {
    source.start();
  }).toThrow('InvalidStateError');
});

test('gain automation follows set and linear-ramp events at the current time', () => {
  const context = createFakeAudioContext();
  const { gain } = context.createGain();
  expect(gain.value).toBe(1);
  gain.setValueAtTime(0, 1);
  gain.linearRampToValueAtTime(0.8, 3);
  gain.setValueAtTime(0.2, 5);
  const values = [0.5, 1, 2, 3, 4, 5, 6].map((time) => {
    context.advanceTime(time - context.currentTime);
    return gain.value;
  });
  expect(values).toEqual([1, 0, 0.4, 0.8, 0.8, 0.2, 0.2]);
});

test('cancelScheduledValues drops events from the given time on; assigning value sets it now', () => {
  const context = createFakeAudioContext();
  const { gain } = context.createGain();
  gain.setValueAtTime(0.5, 1);
  gain.setValueAtTime(0.1, 2);
  gain.cancelScheduledValues(2);
  context.advanceTime(3);
  expect(gain.value).toBe(0.5);
  gain.value = 0.7;
  expect(gain.value).toBe(0.7);
});
