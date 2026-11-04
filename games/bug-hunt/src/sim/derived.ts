import { SIM_STEP_HZ } from '@r15k/engine';
import { TUNING } from '../content/tuning.ts';

/** Steps of the round countdown ("BEREIT? 3 · 2 · 1 · LOS!"). */
export const COUNTDOWN_TICKS: number = Math.round(TUNING.countdown.seconds * SIM_STEP_HZ);

/** Steps one countdown digit stays. */
export const DIGIT_PERIOD_TICKS: number = COUNTDOWN_TICKS / TUNING.countdown.digits;

/** Playing steps of an Arcade round. */
export const ROUND_TICKS: number = Math.round(TUNING.roundSeconds.arcade * SIM_STEP_HZ);

/** Steps of a complete Arcade round from creation to its end (countdown plus playing time). */
export const ROUND_TOTAL_TICKS: number = COUNTDOWN_TICKS + ROUND_TICKS;

/** Largest left edge of the cat. */
export const CAT_MAX_X: number = TUNING.field.width - TUNING.cat.width;

/** Left edge of the cat at the start of a round (centred). */
export const CAT_START_X: number = CAT_MAX_X / 2;

/** Offset from the cat's left edge to its centre. */
export const CAT_CENTER_OFFSET: number = TUNING.cat.width / 2;

/** Offset from an item's left edge to its centre. */
export const ITEM_CENTER_OFFSET: number = TUNING.item.width / 2;

/** Number of possible left edges of a spawned item (the margin is kept on both sides). */
export const SPAWN_RANGE: number =
  TUNING.field.width - TUNING.item.width - 2 * TUNING.item.spawnMargin;

/** Cat left edge minus item left edge when both are centred on each other (integer). */
export const BOT_AIM_OFFSET: number = Math.floor(CAT_CENTER_OFFSET - ITEM_CENTER_OFFSET);

/** Spawn draws below this value are bombs once the grace time is over (rolled after the golden chance). */
export const BOMB_DRAW_LIMIT: number = TUNING.kinds.goldenChance + TUNING.kinds.bombChance;

/** Replay input entry value of "no new aim in this step" (the replay file format). */
export const NO_AIM_X = -1;
