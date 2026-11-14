import type { DrawTarget, Rect, TextChoice } from '@r15k/engine';
import { drawLabel, labelWidth } from '../draw/label.ts';
import { drawPanel } from '../draw/panel.ts';
import { UI_THEME } from '../theme/ui-theme.ts';
import { drawButton } from './button.ts';
import { dialogMetrics, dialogTextHeight, messageLines } from './dialog-metrics.ts';
import type { DialogMetrics } from './dialog-metrics.ts';
import { CONTROL_SHADOW } from './row-layout.ts';
import type { ButtonWidget, WidgetDrawOptions } from './widget-types.ts';

/** A dialog panel with a title, a wrapped message and buttons. */
export interface DialogModel {
  readonly title: string;
  readonly message: string;
  readonly buttons: readonly ButtonWidget[];
}

/** Widest button label plus its padding. */
function buttonWidth(model: DialogModel, metrics: DialogMetrics, text: TextChoice): number {
  const widest = Math.max(0, ...model.buttons.map((button) => labelWidth(button.label, text)));
  return widest + 2 * metrics.buttonPadding;
}

/** Inner width: title, message (up to the maximum) and buttons side by side when they fit. */
function innerWidth(model: DialogModel, metrics: DialogMetrics, text: TextChoice): number {
  const count = model.buttons.length;
  const row =
    count * (buttonWidth(model, metrics, text) + CONTROL_SHADOW) + (count - 1) * metrics.gap;
  const wanted = Math.max(labelWidth(model.title, text), labelWidth(model.message, text), row);
  return Math.max(1, Math.min(wanted, metrics.maxInnerWidth));
}

/** Button rects inside the inner area: side by side when they fit, else stacked full width. */
function buttonRects(
  model: DialogModel,
  inner: Rect,
  context: { readonly metrics: DialogMetrics; readonly text: TextChoice },
): readonly Rect[] {
  const { metrics, text } = context;
  const count = model.buttons.length;
  const slot = Math.floor((inner.width - (count - 1) * metrics.gap) / Math.max(1, count));
  const isRow = slot - CONTROL_SHADOW >= buttonWidth(model, metrics, text);
  return model.buttons.map((_, index) => {
    if (isRow) {
      const x = inner.x + index * (slot + metrics.gap);
      const width =
        index === count - 1 ? inner.x + inner.width - x - CONTROL_SHADOW : slot - CONTROL_SHADOW;
      return { x, y: inner.y, width, height: metrics.buttonHeight };
    }
    const y = inner.y + index * (metrics.buttonHeight + CONTROL_SHADOW + metrics.gap);
    return { x: inner.x, y, width: inner.width - CONTROL_SHADOW, height: metrics.buttonHeight };
  });
}

/** Height of the button block (row or stack) including the shadows. */
function buttonsHeight(rects: readonly Rect[]): number {
  const top = Math.min(...rects.map((rect) => rect.y));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
  return rects.length === 0 ? 0 : bottom - top + CONTROL_SHADOW;
}

/**
 * Places the dialog centred in `region` and fills in the button rects: the panel is as wide as its
 * title, message and buttons need (at most the region and a readable line length), the message is
 * wrapped at the inner width, the buttons span the inner width side by side or stacked.
 */
export function layoutDialog(
  region: Rect,
  model: DialogModel,
  options: { readonly text: TextChoice; readonly minTouchTarget: number },
): DialogModel {
  const { text } = options;
  const metrics = dialogMetrics(region, options);
  const width = innerWidth(model, metrics, text);
  const textHeight = dialogTextHeight(model, { width, text, metrics });
  const probe = buttonRects(model, { x: 0, y: 0, width, height: 0 }, { metrics, text });
  const panelHeight = 2 * metrics.padding + textHeight + buttonsHeight(probe);
  const panelWidth = width + 2 * metrics.padding;
  const panel = {
    x: region.x + Math.floor((region.width - panelWidth - metrics.panelShadow) / 2),
    y: region.y + Math.floor((region.height - panelHeight - metrics.panelShadow) / 2),
  };
  const inner = {
    x: panel.x + metrics.padding,
    y: panel.y + metrics.padding + textHeight,
    width,
    height: 0,
  };
  const rects = buttonRects(model, inner, { metrics, text });
  return {
    ...model,
    buttons: model.buttons.map((button, index) => ({
      ...button,
      rect: rects[index] ?? button.rect,
    })),
  };
}

/** The panel and inner width of a laid-out dialog, recovered from its buttons. */
function panelOf(
  model: DialogModel,
  context: { readonly metrics: DialogMetrics; readonly text: TextChoice },
): { readonly panel: Rect; readonly innerWidth: number } {
  const { metrics, text } = context;
  const left = Math.min(...model.buttons.map((button) => button.rect.x));
  const right = Math.max(...model.buttons.map((button) => button.rect.x + button.rect.width));
  const width = right + CONTROL_SHADOW - left;
  const textHeight = dialogTextHeight(model, { width, text, metrics });
  const top = Math.min(...model.buttons.map((button) => button.rect.y)) - textHeight;
  const bottom = top + textHeight + buttonsHeight(model.buttons.map((button) => button.rect));
  const panel = {
    x: left - metrics.padding,
    y: top - metrics.padding,
    width: width + 2 * metrics.padding,
    height: bottom - top + 2 * metrics.padding,
  };
  return { panel, innerWidth: width };
}

/**
 * Draws a laid-out dialog (see layoutDialog): panel, title, wrapped message and every button with
 * `options`. A dialog without buttons draws nothing. Scenes that move the focus between the buttons
 * draw the focused button again with drawWidget (its ring goes on top).
 */
export function drawDialog(
  target: DrawTarget,
  model: DialogModel,
  options: WidgetDrawOptions,
): void {
  if (model.buttons.length === 0) {
    return;
  }
  const { text } = options;
  const metrics = dialogMetrics(undefined, { text, minTouchTarget: 0 });
  const { panel, innerWidth: width } = panelOf(model, { metrics, text });
  drawPanel(target, panel);
  const x = panel.x + metrics.padding;
  let y = panel.y + metrics.padding;
  if (model.title !== '') {
    drawLabel(target, model.title, { style: text, slot: UI_THEME.textAccent, x, y });
    y += metrics.titleHeight;
  }
  for (const line of messageLines(model.message, { width, text })) {
    drawLabel(target, line, { style: text, slot: UI_THEME.text, x, y });
    y += metrics.lineHeight;
  }
  for (const button of model.buttons) {
    drawButton(target, button, options);
  }
}
