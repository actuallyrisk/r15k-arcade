import { fillRect, strokeRect } from '@r15k/engine';
import type { DrawTarget, Rect } from '@r15k/engine';
import { drawLabel } from '../draw/label.ts';
import { UI_THEME } from '../theme/ui-theme.ts';
import { controlMetrics, drawnRow, THUMB_WIDTH, trackOf, TRACK_HEIGHT } from './row-layout.ts';
import { drawRowFocus, drawRowLabel, valueSlot } from './row-draw.ts';
import { thumbX } from './slider-math.ts';
import type { SliderWidget, WidgetDrawOptions } from './widget-types.ts';

/** The track: ink border, blue-tint interior, the part left of the thumb in blue. */
function drawTrack(target: DrawTarget, widget: SliderWidget, track: Rect): void {
  const isDisabled = widget.isDisabled;
  const interior = { x: track.x + 1, y: track.y + 1, width: track.width - 2, height: 1 };
  fillRect(target, interior, isDisabled ? UI_THEME.disabledFill : UI_THEME.selectedFill);
  const filled = thumbX(widget, track) + Math.floor(THUMB_WIDTH / 2) - interior.x;
  fillRect(
    target,
    { ...interior, width: Math.max(0, filled) },
    isDisabled ? UI_THEME.disabledBorder : UI_THEME.accent,
  );
  strokeRect(target, track, isDisabled ? UI_THEME.disabledBorder : UI_THEME.panelBorder);
}

/** The thumb: 3 px wide, one cap height tall, centred on the track. */
function drawThumb(
  target: DrawTarget,
  widget: SliderWidget,
  context: { readonly track: Rect; readonly options: WidgetDrawOptions },
): void {
  const { track, options } = context;
  const height = controlMetrics(options.text).capHeight;
  const thumb = {
    x: thumbX(widget, track),
    y: track.y + Math.floor(TRACK_HEIGHT / 2) - Math.floor(height / 2),
    width: THUMB_WIDTH,
    height,
  };
  let slot = options.isPressed ? UI_THEME.selectedBorder : UI_THEME.panelBorder;
  if (widget.isDisabled) {
    slot = UI_THEME.disabledBorder;
  }
  fillRect(target, thumb, slot);
}

/**
 * Draws a slider row: label left; track (height 3, ink border, blue-tint fill, blue filled part) with a
 * 3 px ink thumb; value text right-aligned. Pressed: the thumb turns blue-ink.
 */
export function drawSlider(
  target: DrawTarget,
  widget: SliderWidget,
  options: WidgetDrawOptions,
): void {
  const row = drawnRow(widget, options.text);
  drawRowLabel(target, widget, { row, options });
  const track = trackOf(widget, { row, style: options.text });
  drawTrack(target, widget, track);
  drawThumb(target, widget, { track, options });
  drawLabel(target, widget.valueText, {
    style: options.text,
    slot: valueSlot(widget),
    x: row.value.x + row.value.width,
    y: row.valueY,
    align: 'right',
  });
  drawRowFocus(target, widget, options);
}
