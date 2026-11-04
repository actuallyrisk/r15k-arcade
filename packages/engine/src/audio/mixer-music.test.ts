import { expect, test } from 'vitest';
import {
  AUDIO_BYTES,
  TEST_METADATA,
  createMixerFixture,
  gainAt,
  settle,
} from './test-support/mixer-fixture.ts';
import type { MixerFixture } from './test-support/mixer-fixture.ts';

/** Index of the fade gain of the n-th started music voice (after master, music and sfx). */
const voiceGain = (voice: number): number => 3 + voice;

/** A running mixer with Meow House loaded. */
async function withMeowHouse(): Promise<MixerFixture> {
  const fixture = createMixerFixture({ isRunning: true });
  await fixture.mixer.loadMusic('meow-house', AUDIO_BYTES(), TEST_METADATA);
  return fixture;
}

/** The recorded source starts, with the buffer reduced to whether one was set. */
const startsOf = (fixture: MixerFixture): readonly object[] =>
  fixture.context.startedSources.map(({ buffer, ...start }) => ({
    hasBuffer: buffer !== null,
    ...start,
  }));

/** Messages of the warnings logged so far. */
const warnings = (fixture: MixerFixture): readonly string[] =>
  fixture.entries.filter((entry) => entry.level === 'warn').map((entry) => entry.message);

test('playMusic starts a looping source at its loop start and fades it in', async () => {
  const fixture = await withMeowHouse();
  fixture.mixer.playMusic('meow-house');
  expect(startsOf(fixture)).toEqual([{ hasBuffer: true, when: 0, offset: 0.25, loop: true }]);
  expect(gainAt(fixture, voiceGain(0))).toBe(0);
  fixture.context.advanceTime(0.3);
  expect(gainAt(fixture, voiceGain(0))).toBeCloseTo(0.5);
  fixture.context.advanceTime(0.3);
  expect(gainAt(fixture, voiceGain(0))).toBeCloseTo(1);
});

test('a fade-in of 0 starts at full gain', async () => {
  const fixture = await withMeowHouse();
  fixture.mixer.playMusic('meow-house', { fadeInSeconds: 0 });
  expect(gainAt(fixture, voiceGain(0))).toBe(1);
});

test('playMusic of the playing id starts no second source', async () => {
  const fixture = await withMeowHouse();
  fixture.mixer.playMusic('meow-house');
  fixture.mixer.playMusic('meow-house');
  expect(fixture.context.startedSources).toHaveLength(1);
});

test('during a fade-out playMusic starts the track again', async () => {
  const fixture = await withMeowHouse();
  fixture.mixer.playMusic('meow-house');
  fixture.context.advanceTime(1);
  fixture.mixer.stopMusic();
  fixture.context.advanceTime(0.2);
  expect(gainAt(fixture, voiceGain(0))).toBeCloseTo(0.5);
  fixture.mixer.playMusic('meow-house');
  expect(fixture.context.startedSources).toHaveLength(2);
  fixture.context.advanceTime(0.2);
  expect(gainAt(fixture, voiceGain(0))).toBe(0);
});

test('another track replaces the playing one, which fades out', async () => {
  const fixture = await withMeowHouse();
  await fixture.mixer.loadMusic('round', AUDIO_BYTES(), TEST_METADATA);
  fixture.mixer.playMusic('meow-house', { fadeInSeconds: 0 });
  fixture.mixer.playMusic('round', { fadeInSeconds: 0 });
  expect(fixture.context.startedSources).toHaveLength(2);
  fixture.context.advanceTime(0.4);
  expect(gainAt(fixture, voiceGain(0))).toBe(0);
  expect(gainAt(fixture, voiceGain(1))).toBe(1);
});

test('playMusic of a never loaded id starts nothing and warns once', () => {
  const fixture = createMixerFixture({ isRunning: true });
  fixture.mixer.playMusic('meow-house');
  fixture.mixer.playMusic('meow-house');
  expect(fixture.context.startedSources).toEqual([]);
  expect(warnings(fixture)).toEqual(['music not loaded']);
  expect(fixture.entries[0]?.data).toEqual({ id: 'meow-house' });
});

test('playMusic before loadMusic resolves starts the track on resolution', async () => {
  const fixture = createMixerFixture({ isRunning: true });
  const loading = fixture.mixer.loadMusic('meow-house', AUDIO_BYTES(), TEST_METADATA);
  fixture.mixer.playMusic('meow-house');
  expect(fixture.context.startedSources).toHaveLength(0);
  await loading;
  expect(fixture.context.startedSources).toHaveLength(1);
});

test('stopMusic before loadMusic resolves keeps the track from starting', async () => {
  const fixture = createMixerFixture({ isRunning: true });
  const loading = fixture.mixer.loadMusic('meow-house', AUDIO_BYTES(), TEST_METADATA);
  fixture.mixer.playMusic('meow-house');
  fixture.mixer.stopMusic({ fadeOutSeconds: 0 });
  await loading;
  expect(fixture.context.startedSources).toEqual([]);
});

test('a track wanted while locked starts once unlock lets the context run', async () => {
  const fixture = createMixerFixture();
  await fixture.mixer.loadMusic('meow-house', AUDIO_BYTES(), TEST_METADATA);
  fixture.mixer.playMusic('meow-house');
  expect(fixture.context.startedSources).toEqual([]);
  fixture.mixer.unlock();
  await settle();
  expect(fixture.context.startedSources).toHaveLength(1);
});

test('a decoding failure rejects and leaves the track unloaded', async () => {
  const fixture = createMixerFixture({ isRunning: true });
  await expect(
    fixture.mixer.loadMusic('meow-house', new ArrayBuffer(0), TEST_METADATA),
  ).rejects.toThrow('EncodingError');
  await expect(fixture.mixer.loadSfx('ui-move', new ArrayBuffer(0))).rejects.toThrow();
  fixture.mixer.playMusic('meow-house');
  expect(fixture.context.startedSources).toEqual([]);
});

test('playSfx plays a loaded effect only while running and warns once for an unknown id', async () => {
  const fixture = createMixerFixture();
  await fixture.mixer.loadSfx('ui-move', AUDIO_BYTES());
  fixture.mixer.playSfx('ui-move');
  expect(fixture.context.startedSources).toEqual([]);
  fixture.mixer.unlock();
  await settle();
  fixture.context.advanceTime(2);
  fixture.mixer.playSfx('ui-move');
  fixture.mixer.playSfx('ui-unknown');
  fixture.mixer.playSfx('ui-unknown');
  expect(startsOf(fixture)).toEqual([{ hasBuffer: true, when: 2, offset: 0, loop: false }]);
  expect(warnings(fixture)).toEqual(['unknown sound effect']);
});
