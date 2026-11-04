import { closeRng, nextFloat, nextInt, openRng, SIM_STEP_HZ } from '@r15k/engine';
import type { RngCursor, RngState } from '@r15k/engine';
import { TUNING } from '../content/tuning.ts';
import { BOMB_DRAW_LIMIT, SPAWN_RANGE } from './derived.ts';
import { difficultyProgress, fallSeconds, spawnIntervalSeconds } from './difficulty.ts';
import type { BugHuntState, Item, ItemKind } from './state.ts';

/** The spawn timer, the item list and the generator after the spawn part of a step. */
export interface SpawnOutcome {
  readonly spawnSeconds: number;
  readonly nextItemId: number;
  readonly rng: RngState;
  /** The item spawned in this step, if any (already appended to `items`). */
  readonly spawned: Item | undefined;
  readonly items: readonly Item[];
}

/** Kind of a spawn from its first draw: golden first, then a bomb once the grace time is over. */
export function spawnKind(draw: number, playSeconds: number): ItemKind {
  if (draw < TUNING.kinds.goldenChance) {
    return 'golden';
  }
  return draw < BOMB_DRAW_LIMIT && playSeconds > TUNING.kinds.bombGraceSeconds ? 'bomb' : 'bug';
}

/** Draws one item and the next spawn interval, in the fixed draw order the replays depend on. */
function drawSpawn(
  cursor: RngCursor,
  state: BugHuntState,
): { readonly item: Item; readonly spawnSeconds: number } {
  const progress = difficultyProgress(state);
  const kind = spawnKind(nextFloat(cursor), state.playTicks / SIM_STEP_HZ);
  const spawnSeconds = spawnIntervalSeconds(progress, nextFloat(cursor));
  const x = TUNING.item.spawnMargin + nextInt(cursor, SPAWN_RANGE);
  const itemFallSeconds = fallSeconds({ progress, jitter: nextFloat(cursor), kind });
  const animSeconds = nextFloat(cursor) * TUNING.item.animPhaseSeconds;
  const item: Item = {
    id: state.nextItemId,
    kind,
    x,
    fall: 0,
    fallSeconds: itemFallSeconds,
    animSeconds,
  };
  return { item, spawnSeconds };
}

/** Counts the spawn timer down by `dt` and spawns one item when it runs out. */
export function advanceSpawn(state: BugHuntState, dt: number): SpawnOutcome {
  const remaining = state.spawnSeconds - dt;
  if (remaining > 0) {
    return {
      spawnSeconds: remaining,
      nextItemId: state.nextItemId,
      rng: state.rng,
      spawned: undefined,
      items: state.items,
    };
  }
  const cursor = openRng(state.rng);
  const { item, spawnSeconds } = drawSpawn(cursor, state);
  return {
    spawnSeconds,
    nextItemId: state.nextItemId + 1,
    rng: closeRng(cursor),
    spawned: item,
    items: [...state.items, item],
  };
}
