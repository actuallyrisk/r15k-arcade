import { expect, test } from 'vitest';
import { compileSong, noteFrequency } from './compile-song.ts';
import { channel, meowHouse, section, testSong } from './test-support/songs.ts';

test('note frequencies follow 12-tone equal temperament around A4 = 440 Hz', () => {
  expect(noteFrequency('A4')).toBe(440);
  expect(noteFrequency('A5')).toBe(880);
  expect(noteFrequency('C4')).toBeCloseTo(261.63, 2);
  expect(noteFrequency('A#4')).toBe(noteFrequency('Bb4'));
  expect(noteFrequency('E1')).toBeCloseTo(41.2, 2);
});

test('a token that is not a note has no frequency', () => {
  expect(() => noteFrequency('k')).toThrow("not a note: 'k'");
});

test('notes start events, sustains lengthen them and rests end them', () => {
  const song = testSong({
    sections: {
      A: section({ lead: channel({ 0: 'C5', 1: '-', 2: '-', 4: 'E5', 6: '-' }), meow: channel() }),
    },
  });
  expect(compileSong(song)).toEqual({
    steps: 64,
    events: [
      { step: 0, channel: 'lead', token: 'C5', frequencyHz: noteFrequency('C5'), lengthSteps: 3 },
      { step: 4, channel: 'lead', token: 'E5', frequencyHz: noteFrequency('E5'), lengthSteps: 1 },
    ],
  });
});

test('drum hits have no frequency, and a sustain never carries over a section boundary', () => {
  const song = testSong({
    sections: {
      A: section({ drums: channel({ 0: 'k', 63: 'x' }), meow: channel({ 63: 'C5' }) }),
      B: section({ drums: channel({ 0: 's' }), meow: channel({ 0: '-', 1: '-' }) }),
    },
    order: ['A', 'B'],
  });
  const { steps, events } = compileSong(song);
  expect(steps).toBe(128);
  expect(
    events.map(({ step, channel: voice, token, frequencyHz, lengthSteps }) => [
      step,
      voice,
      token,
      frequencyHz,
      lengthSteps,
    ]),
  ).toEqual([
    [0, 'drums', 'k', 0, 1],
    [63, 'drums', 'x', 0, 1],
    [63, 'meow', 'C5', noteFrequency('C5'), 1],
    [64, 'drums', 's', 0, 1],
  ]);
});

test('events are ordered by step and then by channel, sections placed by the order', () => {
  const { steps, events } = compileSong(meowHouse());
  expect(steps).toBe(256);
  expect(
    events.slice(0, 4).map((event) => `${event.step} ${event.channel} ${event.token}`),
  ).toEqual(['0 lead E5', '0 bass A1', '0 drums k', '2 lead G5']);
  const firstOfB = events.find((event) => event.step >= 192);
  expect(firstOfB).toEqual({
    step: 192,
    channel: 'lead',
    token: 'A4',
    frequencyHz: 440,
    lengthSteps: 6,
  });
  expect(
    events.every((event, index) => index === 0 || (events[index - 1]?.step ?? 0) <= event.step),
  ).toBe(true);
});

test('an order entry without a section cannot be compiled', () => {
  expect(() => compileSong(testSong({ order: ['A', 'Z'] }))).toThrow(
    'order references unknown section Z',
  );
});
