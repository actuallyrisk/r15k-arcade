import { LifecycleMonitor } from '@r15k/engine';
import type { LifecycleEvent } from '@r15k/engine';
import { BUG_HUNT_GAME } from '@r15k/bug-hunt';
import type { SettingsV1 } from '../save/save-schema.ts';
import { createBootScene } from '../scenes/boot-scene.ts';
import { createNavigation } from '../scenes/navigation.ts';
import { applyResolvedSettings } from '../settings/apply-settings.ts';
import type { SettingsPort } from '../settings/apply-settings.ts';
import { resolveSettings } from '../settings/settings-model.ts';
import type { AppServices } from './app-services.ts';
import { APP_VERSION } from './app-version.ts';
import { loadAudio } from './audio-loader.ts';
import { settle } from './settle.ts';
import { translatorFor } from './app-translator.ts';
import type { AppParts } from './start-app.ts';

/** A settings change: saved, resolved against the system and applied. */
type SettingsUpdater = (change: (settings: SettingsV1) => SettingsV1) => void;

/** Step 10: where resolved settings take effect. */
function createSettingsPort(parts: AppParts): SettingsPort {
  const { mixer, palette, mirror, live } = parts;
  return {
    setLevel: (bus, level) => {
      mixer.setLevel(bus, level);
    },
    setMuted: (isMuted) => {
      mixer.setMuted(isMuted);
    },
    applyPalette: (id) => {
      palette.apply(id);
    },
    setLocale: (locale) => {
      live.translator = translatorFor(locale);
      mirror.setLocale(locale);
    },
  };
}

/** The only way scenes change settings: save, resolve, apply only what changed, wake the loop. */
function createSettingsUpdater(parts: AppParts, port: SettingsPort): SettingsUpdater {
  const { live, environment } = parts;
  const { save } = parts.core;
  return (change) => {
    const next = change(live.resolved.raw);
    save.update((document) => ({ ...document, settings: next }));
    const resolved = resolveSettings(next, environment.current());
    applyResolvedSettings(port, live.resolved, resolved);
    live.resolved = resolved;
    parts.wake();
  };
}

/** Suspend: the top scene pauses, the save is flushed when hidden, audio stops; resume restarts audio. */
function onLifecycle(parts: AppParts, event: LifecycleEvent): void {
  const { stack, mixer, live, core } = parts;
  if (event.kind === 'resume') {
    if (live.navigation?.isPauseOpen !== true) {
      mixer.resume();
    }
    parts.wake();
    return;
  }
  stack.suspend(event.reason);
  const isLeaving = event.reason === 'hidden' || event.reason === 'pagehide';
  if (isLeaving) {
    settle(core.save.flush(), core.logger, 'saving');
  }
  if (isLeaving || event.reason === 'blur') {
    mixer.suspend();
  }
  parts.wake();
}

/** Step 11: lifecycle, Android back button and gamepad disconnects. */
function wireLifecycle(parts: AppParts): LifecycleMonitor {
  const { window, document } = parts.core.options;
  const { backButton } = parts.core.platform;
  const lifecycle = new LifecycleMonitor({ window, document });
  parts.live.lifecycle = lifecycle;
  lifecycle.subscribe((event) => {
    onLifecycle(parts, event);
  });
  if (backButton.isAvailable) {
    backButton.subscribe(() => {
      parts.input.injectAction('back');
      parts.wake();
    });
  }
  parts.input.onGamepadDisconnected(() => {
    lifecycle.report('gamepad-disconnected');
  });
  return lifecycle;
}

/** Viewport changes: new layout, presenter and mirror mapping; a running round auto-pauses. */
function wireViewport(parts: AppParts, lifecycle: LifecycleMonitor): void {
  const { viewport, display, mirror, live } = parts;
  viewport.subscribe((snapshot) => {
    const change = display.apply(snapshot);
    mirror.setLayoutMapper((rect) => display.toCss(rect));
    if (live.navigation?.hasActiveRound === true) {
      if (change.isPostureChange) {
        lifecycle.report('posture-changed');
      } else if (change.isViewportChange) {
        lifecycle.report('viewport-changed');
      }
    }
    parts.wake();
  });
}

/** Step 12: the services every scene gets, with the navigation wired in. */
function createServices(parts: AppParts, updateSettings: SettingsUpdater): AppServices {
  const { core, live, mixer, mirror } = parts;
  const base: Omit<AppServices, 'navigation'> = {
    clock: core.clock,
    logger: core.logger,
    platform: core.platform,
    save: core.save,
    mixer,
    input: parts.input,
    i18n: () => live.translator,
    fonts: parts.fonts,
    announce: (text) => {
      mirror.announce(text);
    },
    settings: () => live.resolved,
    updateSettings,
    appVersion: APP_VERSION,
  };
  const navigation = createNavigation(parts.stack, base, {
    transition: parts.transition,
    game: BUG_HUNT_GAME,
  });
  live.navigation = navigation;
  return { ...base, navigation };
}

/** Steps 10–12: settings applied, subscriptions, services, audio load and the boot scene. */
export function finishBoot(parts: AppParts): void {
  const port = createSettingsPort(parts);
  applyResolvedSettings(port, undefined, parts.live.resolved);
  const updateSettings = createSettingsUpdater(parts, port);
  const lifecycle = wireLifecycle(parts);
  wireViewport(parts, lifecycle);
  parts.environment.subscribe(() => {
    const { raw } = parts.live.resolved;
    if (raw.theme === 'system' || raw.reducedMotion === 'system') {
      updateSettings((settings) => settings);
    }
  });
  const services = createServices(parts, updateSettings);
  const { window, baseUrl } = parts.core.options;
  const loader = loadAudio({
    fetch: (url) => window.fetch(url),
    baseUrl,
    mixer: parts.mixer,
    logger: parts.core.logger,
    onProgress: parts.wake,
  });
  parts.stack.push(createBootScene(services, loader));
  parts.loop.wake();
}
