import { notImplemented } from '@r15k/engine';
import type { Widget } from '../widgets/widget-types.ts';

/** The next focusable widget in a direction; wraps and skips disabled widgets. */
export function nextFocusable(
  _widgets: readonly Widget[],
  _currentId: string | undefined,
  _direction: 1 | -1,
): string | undefined {
  return notImplemented('ui.nextFocusable');
}
