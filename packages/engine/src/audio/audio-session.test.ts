import { expect, test } from 'vitest';
import { setAmbientAudioSession } from './audio-session.ts';

/** A navigator-shaped object with only the given members. */
const navigatorWith = (members: object): Navigator => members as Navigator;

test('the audio session becomes ambient where the API exists', () => {
  const session = { type: 'auto' };
  expect(setAmbientAudioSession(navigatorWith({ audioSession: session }))).toBe(true);
  expect(session.type).toBe('ambient');
});

test('without the Audio Session API nothing happens', () => {
  expect(setAmbientAudioSession(navigatorWith({}))).toBe(false);
  expect(setAmbientAudioSession(navigatorWith({ audioSession: null }))).toBe(false);
  expect(setAmbientAudioSession(navigatorWith({ audioSession: {} }))).toBe(false);
});

test('a session that ignores the value reports false', () => {
  const session = {
    get type(): string {
      return 'auto';
    },
    set type(_value: string) {
      // An implementation without the 'ambient' type ignores the assignment.
    },
  };
  expect(setAmbientAudioSession(navigatorWith({ audioSession: session }))).toBe(false);
});
