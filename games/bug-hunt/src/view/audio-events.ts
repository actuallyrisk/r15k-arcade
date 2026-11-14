import type { BugHuntSfxId } from '../content/sfx.ts';
import type { SimEvent } from '../sim/events.ts';

/** The stage-up sound of a combo multiplier. */
const COMBO_SFX = { 2: 'combo-2', 3: 'combo-3', 4: 'combo-4' } as const;

/** Events whose sound does not depend on their data. */
const FIXED_SFX: Readonly<Partial<Record<SimEvent['kind'], BugHuntSfxId>>> = {
  countdown: 'tick',
  'time-tick': 'tick',
  go: 'go',
  bomb: 'bomb',
};

/** The sound of one event, before the combo replacement; undefined for silent events. */
function eventSfx(event: SimEvent, bestScore: number): BugHuntSfxId | undefined {
  if (event.kind === 'catch') {
    return event.itemKind === 'golden' ? 'gold-catch' : 'bug-catch';
  }
  if (event.kind === 'round-end') {
    return event.score > bestScore && event.score > 0 ? 'new-record' : 'round-over';
  }
  return FIXED_SFX[event.kind];
}

/**
 * The sounds of one simulation step, each at most once: countdown and time ticks tick, `go` plays go,
 * catches play bug-catch or gold-catch – replaced by combo-n when the combo reached a stage in the same
 * step – bombs play bomb, and the round end plays new-record (score above the best and above 0) or
 * round-over.
 */
export function roundSfx(events: readonly SimEvent[], bestScore: number): readonly BugHuntSfxId[] {
  const topStage = events.reduce<2 | 3 | 4 | undefined>(
    (top, event) =>
      event.kind === 'combo-stage' && (top === undefined || event.multiplier > top)
        ? event.multiplier
        : top,
    undefined,
  );
  const sounds = events.map((event) => {
    const sound = eventSfx(event, bestScore);
    const isCatch = sound === 'bug-catch' || sound === 'gold-catch';
    return isCatch && topStage !== undefined ? COMBO_SFX[topStage] : sound;
  });
  return [...new Set(sounds.filter((sound) => sound !== undefined))];
}
