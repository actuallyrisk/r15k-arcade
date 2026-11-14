import type { A11yTree, Layout, Translator } from '@r15k/engine';
import type { SimEvent } from '../sim/events.ts';
import { roundHudPlacement } from './hud-placement.ts';

/** Mirror node id of the playfield text. */
export const FIELD_NODE_ID = 'bug-hunt-field';

/** Mirror node id of the pause button. */
export const PAUSE_NODE_ID = 'bug-hunt-pause';

/** The time-tick that is announced (the first of the warning seconds). */
const ANNOUNCED_SECONDS_LEFT = 5;

/**
 * The round's accessibility tree: the playfield (label and controls description) and the pause button
 * at its hit rect. Without a layout yet (before the first frame) only the title.
 */
export function roundA11yTree(i18n: Translator, layout: Layout | undefined): A11yTree {
  const title = i18n.t('bugHunt.title');
  if (layout === undefined) {
    return { title, nodes: [], focusId: undefined };
  }
  return {
    title,
    nodes: [
      {
        kind: 'text',
        id: FIELD_NODE_ID,
        rect: layout.field,
        label: i18n.t('bugHunt.a11y.field'),
        description: i18n.t('bugHunt.a11y.controls'),
      },
      {
        kind: 'button',
        id: PAUSE_NODE_ID,
        rect: roundHudPlacement(layout).pauseHit,
        label: i18n.t('bugHunt.a11y.pause'),
        isDisabled: false,
      },
    ],
    focusId: undefined,
  };
}

/** The announcement of one event, if it has one. */
function eventAnnouncement(event: SimEvent, i18n: Translator): string | undefined {
  if (event.kind === 'countdown') {
    // The simulation emits digit 3 once, at the round start: it merges with the start message.
    const key = event.digit === 3 ? 'bugHunt.a11y.roundStart' : 'bugHunt.a11y.countdown';
    return i18n.t(key, { value: event.digit });
  }
  if (event.kind === 'go') {
    return i18n.t('bugHunt.a11y.go');
  }
  if (event.kind === 'time-tick' && event.secondsLeft === ANNOUNCED_SECONDS_LEFT) {
    return i18n.t('bugHunt.a11y.secondsLeft', { count: event.secondsLeft });
  }
  if (event.kind === 'combo-stage') {
    return i18n.t('bugHunt.a11y.comboStage', { value: event.multiplier });
  }
  return undefined;
}

/** Live announcements of one simulation step (round start, countdown, go, 5 s left, combo stages). */
export function roundAnnouncements(
  events: readonly SimEvent[],
  i18n: Translator,
): readonly string[] {
  return events.flatMap((event) => {
    const text = eventAnnouncement(event, i18n);
    return text === undefined ? [] : [text];
  });
}

/** Announcement of a resume countdown digit: the first one merges with "Resuming". */
export function resumeAnnouncement(digit: number, isFirst: boolean, i18n: Translator): string {
  return isFirst
    ? i18n.t('bugHunt.a11y.resuming', { value: digit })
    : i18n.t('bugHunt.a11y.countdown', { value: digit });
}
