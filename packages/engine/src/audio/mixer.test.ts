import { expect, test } from 'vitest';
import { createTestLogger } from '../scenes/test-support/test-logger.ts';
import { AudioMixer } from './mixer.ts';
import {
  AUDIO_BYTES,
  TEST_METADATA,
  createMixerFixture,
  gainAt,
  settle,
} from './test-support/mixer-fixture.ts';

const MASTER = 0;
const MUSIC = 1;
const SFX = 2;

test('a context that already runs at creation reports running', () => {
  const { mixer } = createMixerFixture({ isRunning: true });
  expect(mixer.state).toBe('running');
  expect(mixer.hasRunOnce).toBe(true);
});

test('a suspended context is locked until unlock resumes it', async () => {
  const { mixer } = createMixerFixture();
  expect(mixer.state).toBe('locked');
  expect(mixer.hasRunOnce).toBe(false);
  mixer.unlock();
  await settle();
  expect(mixer.state).toBe('running');
  expect(mixer.hasRunOnce).toBe(true);
});

test('suspend and resume follow the wanted state; unlock does not override a suspend', async () => {
  const { mixer } = createMixerFixture({ isRunning: true });
  mixer.suspend();
  await settle();
  expect(mixer.state).toBe('suspended');
  mixer.unlock();
  await settle();
  expect(mixer.state).toBe('suspended');
  mixer.resume();
  await settle();
  expect(mixer.state).toBe('running');
});

test('an interruption reports once and resumes automatically when it ends', async () => {
  const { mixer, context, onInterrupted } = createMixerFixture({ isRunning: true });
  context.setState('interrupted');
  expect(mixer.state).toBe('suspended');
  mixer.unlock();
  await settle();
  expect(onInterrupted).toHaveBeenCalledTimes(1);
  expect(mixer.state).toBe('suspended');
  context.setState('suspended');
  await settle();
  expect(mixer.state).toBe('running');
  context.setState('interrupted');
  expect(onInterrupted).toHaveBeenCalledTimes(2);
});

test('an interruption that ends while audio is not wanted stays suspended', async () => {
  const { mixer, context } = createMixerFixture({ isRunning: true });
  context.setState('interrupted');
  mixer.suspend();
  context.setState('suspended');
  await settle();
  expect(mixer.state).toBe('suspended');
});

test('an interruption before the first run keeps the mixer suspended, not locked', () => {
  const { mixer, context } = createMixerFixture();
  context.setState('interrupted');
  expect(mixer.state).toBe('suspended');
});

test('a throwing interruption handler is logged', () => {
  const { context, entries, onInterrupted } = createMixerFixture({ isRunning: true });
  onInterrupted.mockImplementation(() => {
    throw new Error('lifecycle broke');
  });
  context.setState('interrupted');
  expect(entries.map((entry) => entry.message)).toEqual(['audio interruption handler failed']);
});

test('levels set the bus gains as level squared; mute zeroes the master only', () => {
  const fixture = createMixerFixture({ isRunning: true });
  const { mixer } = fixture;
  mixer.setLevel('music', 0.5);
  mixer.setLevel('sfx', 2);
  expect([gainAt(fixture, MASTER), gainAt(fixture, MUSIC), gainAt(fixture, SFX)]).toEqual([
    1, 0.25, 1,
  ]);
  mixer.setMuted(true);
  mixer.setLevel('master', 0.5);
  expect(gainAt(fixture, MASTER)).toBe(0);
  expect(gainAt(fixture, MUSIC)).toBe(0.25);
  mixer.setMuted(false);
  expect(gainAt(fixture, MASTER)).toBe(0.25);
});

test('without a context the mixer is unavailable and every call is a safe no-op', async () => {
  const { logger, entries } = createTestLogger();
  const mixer = new AudioMixer({
    createContext: () => undefined,
    logger,
    onInterrupted: () => undefined,
  });
  expect(mixer.state).toBe('unavailable');
  await mixer.loadSfx('ui-move', AUDIO_BYTES());
  await mixer.loadMusic('meow-house', AUDIO_BYTES(), TEST_METADATA);
  mixer.unlock();
  mixer.setLevel('music', 0.3);
  mixer.setMuted(true);
  mixer.playSfx('ui-move');
  mixer.stopMusic();
  mixer.suspend();
  mixer.resume();
  mixer.dispose();
  expect(mixer.state).toBe('unavailable');
  expect(mixer.hasRunOnce).toBe(false);
  expect(entries).toEqual([]);
});

test('a throwing context factory is logged and leaves the mixer unavailable', () => {
  const { logger, entries } = createTestLogger();
  const mixer = new AudioMixer({
    createContext: () => {
      throw new Error('AudioContext is not defined');
    },
    logger,
    onInterrupted: () => undefined,
  });
  expect(mixer.state).toBe('unavailable');
  expect(entries[0]?.message).toBe('audio context could not be created');
});

test('dispose closes the context; afterwards the mixer is unavailable', async () => {
  const { mixer, context } = createMixerFixture({ isRunning: true });
  await mixer.loadSfx('ui-move', AUDIO_BYTES());
  mixer.dispose();
  await settle();
  expect(context.state).toBe('closed');
  expect(mixer.state).toBe('unavailable');
  mixer.playSfx('ui-move');
  mixer.dispose();
  expect(context.startedSources).toEqual([]);
});

test('a refused resume or suspend is logged as a warning', async () => {
  const { mixer, context, entries } = createMixerFixture();
  context.setState('closed');
  mixer.unlock();
  mixer.suspend();
  await settle();
  expect(entries.map((entry) => entry.message)).toEqual([
    'audio context did not resume',
    'audio context did not suspend',
  ]);
});

test('audio decoded after dispose is dropped', async () => {
  const { mixer, context } = createMixerFixture({ isRunning: true });
  const loadingSfx = mixer.loadSfx('ui-move', AUDIO_BYTES());
  const loadingMusic = mixer.loadMusic('meow-house', AUDIO_BYTES(), TEST_METADATA);
  mixer.playMusic('meow-house');
  mixer.dispose();
  await Promise.all([loadingSfx, loadingMusic]);
  mixer.playSfx('ui-move');
  expect(context.startedSources).toEqual([]);
});
