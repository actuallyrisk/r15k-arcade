import { rectContains } from '@r15k/engine';
import type { Point, PointerRelease, PointerSnapshot, Rect } from '@r15k/engine';
import {
  initialsHitAreas,
  selectorArrowRects,
  sliderTrackRect,
} from '../widgets/widget-geometry.ts';
import { valueAtX } from '../widgets/slider-math.ts';
import type {
  InitialsWidget,
  SelectorWidget,
  SliderWidget,
  Widget,
  WidgetIntent,
} from '../widgets/widget-types.ts';
import { initialsStep, selectorStep, sliderTo } from './menu-actions.ts';
import { emit, moveFocus, widgetById } from './menu-draft.ts';
import type { MenuDraft } from './menu-draft.ts';
import {
  isOnWidget,
  MORE_ABOVE_ID,
  MORE_BELOW_ID,
  pressTarget,
  scrollViewport,
  trackHitRect,
} from './menu-hits.ts';
import { MENU_DRAG_START_CSS } from './menu-pointer.ts';
import type { MenuInput } from './menu-reducer.ts';

// Pointer gestures on a menu: press (remember the widget), drag (slider value or scroll drag), release
// (activate inside the pressed widget's hit rect, no duration limit), in this order within a frame.

/** Remembers what a new press hit. */
function startPress(draft: MenuDraft, pointer: PointerSnapshot, input: MenuInput): void {
  const point = pointer.downPosition ?? pointer.position;
  const widgetId = pressTarget(draft.widgets, point, input);
  draft.press =
    widgetId === undefined
      ? undefined
      : { widgetId, pointerId: pointer.id, isScrollDrag: false, lastY: point.y };
}

/** Whether a slider press started on its track. */
function isTrackPress(
  widget: Widget | undefined,
  pointer: PointerSnapshot,
  input: MenuInput,
): boolean {
  const down = pointer.downPosition;
  return (
    widget?.kind === 'slider' &&
    down !== undefined &&
    rectContains(trackHitRect(widget, input), down)
  );
}

/** The slider value follows the pointer x (one `move` sound per frame at most). */
function dragSlider(
  draft: MenuDraft,
  widget: SliderWidget,
  context: { readonly pointer: PointerSnapshot; readonly input: MenuInput },
): void {
  const track = sliderTrackRect(widget, context.input);
  const intent = sliderTo(widget, valueAtX(widget, track, context.pointer.position.x));
  if (intent !== undefined) {
    emit(draft, intent, !draft.sounds.includes('move'));
  }
}

/** One frame of a held press: the slider follows x, or vertical travel turns into a scroll drag. */
function dragPress(draft: MenuDraft, pointer: PointerSnapshot, input: MenuInput): void {
  const press = draft.press;
  if (press === undefined) {
    return;
  }
  const widget = widgetById(draft, press.widgetId);
  if (widget?.kind === 'slider' && isTrackPress(widget, pointer, input)) {
    dragSlider(draft, widget, { pointer, input });
    return;
  }
  const down = pointer.downPosition ?? pointer.position;
  const region = input.scrollRegion;
  const travelCss = Math.abs(pointer.position.y - down.y) * input.cssPerLogical;
  const canScroll = region !== undefined && rectContains(region, down);
  const isScrollDrag = press.isScrollDrag || (canScroll && travelCss > MENU_DRAG_START_CSS);
  if (isScrollDrag) {
    draft.scrollBy -= pointer.position.y - press.lastY;
    draft.press = { ...press, isScrollDrag, lastY: pointer.position.y };
  }
}

/** Height of the next row hidden beyond a more-indicator (the touch target when there is none). */
function hiddenRowStep(draft: MenuDraft, input: MenuInput, isBelow: boolean): number {
  const viewport = scrollViewport(input);
  if (viewport === undefined) {
    return input.minTouchTarget;
  }
  const hidden = draft.widgets.filter((widget) =>
    isBelow
      ? widget.rect.y + widget.rect.height > viewport.y + viewport.height
      : widget.rect.y < viewport.y,
  );
  const row = isBelow ? hidden[0] : hidden.at(-1);
  return row?.rect.height ?? input.minTouchTarget;
}

/** The intent of a release on a selector: previous arrow → previous, next arrow or elsewhere → next. */
function selectorRelease(
  widget: SelectorWidget,
  point: Point,
  input: MenuInput,
): WidgetIntent | undefined {
  const arrows = selectorArrowRects(widget, input);
  const isPrevious = rectContains(arrows.previous, point) && !rectContains(arrows.next, point);
  return selectorStep(widget, isPrevious ? -1 : 1);
}

/** The intent of a release on initials: upper half letter −1, lower half +1; the cursor moves there. */
function initialsRelease(
  widget: InitialsWidget,
  point: Point,
  input: MenuInput,
): WidgetIntent | undefined {
  const area = initialsHitAreas(widget, input.minTouchTarget).find((hit) =>
    rectContains(hit.box, point),
  );
  if (area === undefined) {
    return undefined;
  }
  const atBox = { ...widget, cursor: area.index };
  return initialsStep(atBox, rectContains(area.up, point) ? 'up' : 'down');
}

/** The intent of a release on a slider: the value at the release x when it is over the track. */
function sliderRelease(
  widget: SliderWidget,
  point: Point,
  input: MenuInput,
): WidgetIntent | undefined {
  const track = sliderTrackRect(widget, input);
  const isOverTrack = point.x >= track.x - 1 && point.x <= track.x + track.width;
  return isOverTrack ? sliderTo(widget, valueAtX(widget, track, point.x)) : undefined;
}

/** What releasing on a widget does. */
function releaseIntent(widget: Widget, point: Point, input: MenuInput): WidgetIntent | undefined {
  switch (widget.kind) {
    case 'button':
      return { kind: 'activate', id: widget.id };
    case 'toggle':
      return { kind: 'toggle', id: widget.id, isOn: !widget.isOn };
    case 'selector':
      return selectorRelease(widget, point, input);
    case 'slider':
      return sliderRelease(widget, point, input);
    case 'initials':
      return initialsRelease(widget, point, input);
  }
}

/** The more-indicator rect a press id names. */
function indicatorOf(id: string, input: MenuInput): Rect | undefined {
  if (id === MORE_ABOVE_ID) {
    return input.moreIndicators.above;
  }
  return id === MORE_BELOW_ID ? input.moreIndicators.below : undefined;
}

/** Ends a press: activation inside the pressed widget's hit rect, a scroll step on an indicator. */
function releasePress(draft: MenuDraft, release: PointerRelease, input: MenuInput): void {
  const press = draft.press;
  draft.press = undefined;
  if (press === undefined || press.isScrollDrag) {
    return;
  }
  const indicator = indicatorOf(press.widgetId, input);
  if (indicator !== undefined) {
    const isBelow = press.widgetId === MORE_BELOW_ID;
    if (rectContains(indicator, release.position)) {
      draft.scrollBy += (isBelow ? 1 : -1) * hiddenRowStep(draft, input, isBelow);
    }
    return;
  }
  const widget = widgetById(draft, press.widgetId);
  if (
    widget === undefined ||
    widget.isDisabled ||
    !isOnWidget(widget, release.position, input.minTouchTarget)
  ) {
    return;
  }
  moveFocus(draft, widget.id);
  const intent = releaseIntent(widget, release.position, input);
  if (intent !== undefined) {
    emit(draft, intent);
  }
}

/** Whether the pressing pointer is gone without a release (cancelled, or no pointer at all). */
function isPressLost(draft: MenuDraft, pointer: PointerSnapshot | undefined): boolean {
  const press = draft.press;
  if (press === undefined) {
    return false;
  }
  return pointer === undefined || (pointer.id === press.pointerId && !pointer.isDown);
}

/** Ends the press with this frame's release of its pointer, or drops it when the pointer is gone. */
function endPress(draft: MenuDraft, input: MenuInput): void {
  const { pointer, releases } = input.frame;
  const release = releases.find((candidate) => candidate.id === draft.press?.pointerId);
  if (release !== undefined) {
    releasePress(draft, release, input);
  } else if (isPressLost(draft, pointer)) {
    draft.press = undefined;
  }
}

/** Applies the pointer part of an input frame: press, drag, release, then the wheel. */
export function applyPointer(draft: MenuDraft, input: MenuInput): void {
  const { pointer, wheelDelta } = input.frame;
  if (pointer?.wasPressed === true) {
    startPress(draft, pointer, input);
  }
  if (pointer?.isDown === true && pointer.id === draft.press?.pointerId) {
    dragPress(draft, pointer, input);
  }
  endPress(draft, input);
  if (input.scrollRegion !== undefined && wheelDelta !== 0) {
    draft.scrollBy += wheelDelta;
  }
}
