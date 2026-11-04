import { TUNING } from '../content/tuning.ts';
import { isCaught } from './collision.ts';
import { comboMultiplier } from './combo.ts';
import type { SimEvent } from './events.ts';
import type { Cat, Item, Multiplier, SimStats } from './state.ts';

/**
 * Score, combo, cat reactions and statistics while the items of one step resolve. The multiplier is the
 * running value: it always equals comboMultiplier(streak), so stage-ups and resets compare against it.
 */
export interface Resolution {
  readonly score: number;
  readonly streak: number;
  readonly multiplier: Multiplier;
  readonly cat: Cat;
  readonly stats: SimStats;
  /** Items still falling after this step, ascending id. */
  readonly items: readonly Item[];
  readonly events: readonly SimEvent[];
}

/** Moves every item down by one step of its fall time and advances its wiggle phase. */
export function advanceItems(items: readonly Item[], dt: number): readonly Item[] {
  return items.map((item) => ({
    ...item,
    fall: item.fall + dt / item.fallSeconds,
    animSeconds: item.animSeconds + dt,
  }));
}

/** Resets the streak and the running multiplier, reporting the stage that was lost. */
function breakCombo(resolution: Resolution): Resolution {
  const previous = resolution.multiplier;
  const events: readonly SimEvent[] =
    previous === 1 ? resolution.events : [...resolution.events, { kind: 'combo-reset', previous }];
  return { ...resolution, streak: 0, multiplier: 1, events };
}

/** A caught bug or golden bug: the streak grows first, so the stage-up catch already scores more. */
function catchBug(item: Item, kind: 'bug' | 'golden', resolution: Resolution): Resolution {
  const isGolden = kind === 'golden';
  const streak = resolution.streak + 1;
  const multiplier = comboMultiplier(streak);
  const stageEvents: readonly SimEvent[] =
    multiplier > resolution.multiplier && multiplier !== 1
      ? [{ kind: 'combo-stage', multiplier }]
      : [];
  const points = (isGolden ? TUNING.points.golden : TUNING.points.bug) * multiplier;
  const { stats } = resolution;
  const event: SimEvent = {
    kind: 'catch',
    itemId: item.id,
    itemKind: kind,
    points,
    multiplier,
    x: item.x,
    fall: item.fall,
  };
  return {
    ...resolution,
    score: resolution.score + points,
    streak,
    multiplier,
    cat: {
      ...resolution.cat,
      happySeconds: isGolden
        ? TUNING.reactions.happyGoldenSeconds
        : TUNING.reactions.happyBugSeconds,
    },
    stats: {
      ...stats,
      bugsCaught: isGolden ? stats.bugsCaught : stats.bugsCaught + 1,
      goldenCaught: isGolden ? stats.goldenCaught + 1 : stats.goldenCaught,
      bestStreak: Math.max(stats.bestStreak, streak),
    },
    events: [...resolution.events, ...stageEvents, event],
  };
}

/** A caught bomb: penalty (the score never drops below 0), combo reset and a startled cat. */
function catchBomb(item: Item, resolution: Resolution): Resolution {
  const penalty = TUNING.points.bombPenalty;
  const broken = breakCombo(resolution);
  return {
    ...broken,
    score: Math.max(0, broken.score - penalty),
    cat: { ...broken.cat, startleSeconds: TUNING.reactions.startleSeconds, happySeconds: 0 },
    stats: { ...broken.stats, bombsCaught: broken.stats.bombsCaught + 1 },
    events: [
      ...broken.events,
      { kind: 'bomb', itemId: item.id, penalty, x: item.x, fall: item.fall },
    ],
  };
}

/** A bug or golden bug reached the ground: the combo breaks. */
function missBug(item: Item, kind: 'bug' | 'golden', resolution: Resolution): Resolution {
  const broken = breakCombo(resolution);
  return {
    ...broken,
    stats: { ...broken.stats, misses: broken.stats.misses + 1 },
    events: [...broken.events, { kind: 'miss', itemId: item.id, itemKind: kind, x: item.x }],
  };
}

/** A bomb reached the ground: dodged, the combo is kept. */
function dodgeBomb(item: Item, resolution: Resolution): Resolution {
  return {
    ...resolution,
    stats: { ...resolution.stats, bombsDodged: resolution.stats.bombsDodged + 1 },
    events: [...resolution.events, { kind: 'dodge', itemId: item.id, x: item.x }],
  };
}

/** Resolves one advanced item: caught inside the catch window, landed on the ground, or still falling. */
function resolveItem(item: Item, resolution: Resolution): Resolution {
  const kind = item.kind;
  const isInWindow = item.fall >= TUNING.catchFallStart && item.fall < 1;
  if (isInWindow && isCaught(item, resolution.cat)) {
    return kind === 'bomb' ? catchBomb(item, resolution) : catchBug(item, kind, resolution);
  }
  if (item.fall >= 1) {
    return kind === 'bomb' ? dodgeBomb(item, resolution) : missBug(item, kind, resolution);
  }
  return { ...resolution, items: [...resolution.items, item] };
}

/** Resolves advanced items in ascending id order against the cat of this step. */
export function resolveItems(items: readonly Item[], start: Resolution): Resolution {
  return items.reduce((resolution, item) => resolveItem(item, resolution), start);
}
