import type { Widget } from '../widgets/widget-types.ts';

/**
 * The next focusable (not disabled) widget in a direction; wraps around and skips disabled widgets.
 * Without a current focus (or an unknown id) it starts at the first (1) or last (−1) widget. Returns
 * undefined when no widget is focusable.
 */
export function nextFocusable(
  widgets: readonly Widget[],
  currentId: string | undefined,
  direction: 1 | -1,
): string | undefined {
  const count = widgets.length;
  const current = widgets.findIndex((widget) => widget.id === currentId);
  const start = current === -1 ? (direction === 1 ? -1 : count) : current;
  for (let step = 1; step <= count; step += 1) {
    const index = (((start + direction * step) % count) + count) % count;
    const widget = widgets[index];
    if (widget !== undefined && !widget.isDisabled) {
      return widget.id;
    }
  }
  return undefined;
}
