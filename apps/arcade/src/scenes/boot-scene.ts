import { fillRect, SLOT, strokeRect } from '@r15k/engine';
import type { RenderContext, Scene } from '@r15k/engine';
import { drawGridPaper, drawLabel, scaledChoice, UI_THEME } from '@r15k/ui';
import type { AppServices } from '../boot/app-services.ts';
import type { AudioLoader } from '../boot/audio-loader.ts';
import { defineScene } from './scene-base.ts';
import { SCENE_IDS } from './scene-ids.ts';
import { capHeightOf } from './text-support.ts';

/** The boot scene moves on after this long even when the audio is still loading (s). */
const BOOT_FALLBACK_SECONDS = 3;
/** Size of the progress bar (logical px). */
const BAR = { width: 96, height: 5, gap: 10 } as const;

/** Draws the title and the progress bar (ink frame, blue fill). */
function renderBoot(
  services: AppServices,
  context: { readonly render: RenderContext; readonly fraction: number },
): void {
  const { target, layout } = context.render;
  const { safe } = layout;
  const style = scaledChoice(layout.menuText, 2);
  const cap = capHeightOf(style);
  const top = safe.y + Math.floor((safe.height - cap - BAR.gap - BAR.height) / 2);
  const centreX = safe.x + Math.floor(safe.width / 2);
  drawGridPaper(target, { x: 0, y: 0, ...layout.logical });
  drawLabel(target, services.i18n().t('arcade.app.title'), {
    style,
    slot: UI_THEME.text,
    shadowSlot: SLOT.pink,
    x: centreX,
    y: top,
    align: 'center',
  });
  const width = Math.min(BAR.width, safe.width - 8);
  const bar = {
    x: centreX - Math.floor(width / 2),
    y: top + cap + BAR.gap,
    width,
    height: BAR.height,
  };
  fillRect(target, bar, UI_THEME.panelFill);
  fillRect(target, { ...bar, width: Math.round(bar.width * context.fraction) }, UI_THEME.accent);
  strokeRect(target, bar, UI_THEME.panelBorder);
}

/** The boot scene: title and progress bar while the audio loads; then (or after 3 s) the intro or hub. */
export function createBootScene(services: AppServices, loader: AudioLoader): Scene {
  let elapsed = 0;
  let isDone = false;
  const fraction = (): number => {
    const { loaded, total, isDone: isLoaded } = loader.progress();
    return isLoaded ? 1 : total === 0 ? 0 : loaded / total;
  };
  return defineScene({
    id: SCENE_IDS.boot,
    update: (frame) => {
      elapsed += frame.deltaSeconds;
      if (!isDone && (loader.progress().isDone || elapsed >= BOOT_FALLBACK_SECONDS)) {
        isDone = true;
        services.navigation.afterBoot();
      }
    },
    render: (render) => {
      renderBoot(services, { render, fraction: fraction() });
    },
    a11y: () => ({
      title: services.i18n().t('arcade.app.title'),
      nodes: [
        {
          kind: 'heading',
          id: 'loading',
          level: 2,
          rect: { x: 0, y: 0, width: 1, height: 1 },
          label: services.i18n().t('arcade.boot.loading'),
        },
      ],
      focusId: undefined,
    }),
    isAnimating: () => !isDone,
  });
}
