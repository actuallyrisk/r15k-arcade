// Keyboard listeners on the window: held codes, press and release edges between two polls, typed
// characters during text entry and the fullscreen shortcut.
import type { Clock } from '../time/clock.ts';
import { ACTIONS } from './actions.ts';
import type { Action, Shortcut } from './actions.ts';
import type { Bindings } from './bindings.ts';

/** Codes that type a character while text entry is on. */
const TYPING_CODE = /^(Key[A-Z]|Digit\d|Numpad\d)$/;
/** A key value that is one printable character (one code point); named keys are longer. */
const SINGLE_CHARACTER = /^.$/u;

/** Presses of one action since the last poll. */
export interface KeyPresses {
  readonly count: number;
  readonly lastAtMs: number;
}

/** Everything the keyboard saw since the last poll. */
export interface KeyboardDrain {
  readonly held: ReadonlySet<Action>;
  readonly presses: ReadonlyMap<Action, KeyPresses>;
  readonly releases: ReadonlySet<Action>;
  readonly typedChars: readonly string[];
  readonly shortcuts: readonly Shortcut[];
}

/** What the keyboard source needs from the input manager. */
export interface KeyboardSourceOptions {
  readonly window: Window;
  readonly clock: Clock;
  readonly bindings: Bindings;
  readonly isFullscreenShortcutEnabled: boolean;
  /** Called for every key event; `isPress` for keydown (sets the last device). */
  readonly onKeyEvent: (isPress: boolean) => void;
}

function hasModifier(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey || event.altKey;
}

/** Maps each bound code to its actions. */
function codeMap(bindings: Bindings): ReadonlyMap<string, readonly Action[]> {
  const map = new Map<string, Action[]>();
  for (const action of ACTIONS) {
    for (const code of bindings.keyboard[action]) {
      map.set(code, [...(map.get(code) ?? []), action]);
    }
  }
  return map;
}

/** Keyboard state between two polls. */
export class KeyboardSource {
  private readonly options: KeyboardSourceOptions;
  private readonly heldCodes = new Set<string>();
  private codes: ReadonlyMap<string, readonly Action[]>;
  private isTextEntry = false;
  private presses = new Map<Action, KeyPresses>();
  private releases = new Set<Action>();
  private typedChars: string[] = [];
  private shortcuts: Shortcut[] = [];
  private readonly cleanup: () => void;

  constructor(options: KeyboardSourceOptions) {
    this.options = options;
    this.codes = codeMap(options.bindings);
    const onKeyDown = (event: KeyboardEvent): void => {
      this.handleKeyDown(event);
    };
    const onKeyUp = (event: KeyboardEvent): void => {
      this.handleKeyUp(event);
    };
    const onBlur = (): void => {
      this.heldCodes.clear();
    };
    const { window } = options;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    this.cleanup = () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }

  /** Replaces the bindings (held keys are re-mapped at the next poll). */
  setBindings(bindings: Bindings): void {
    this.codes = codeMap(bindings);
  }

  /** While on, letter and digit keys type characters; Backspace means `left`. */
  setTextEntry(isOn: boolean): void {
    this.isTextEntry = isOn;
  }

  /** Returns everything since the last drain and starts a new interval. */
  drain(): KeyboardDrain {
    const held = new Set([...this.heldCodes].flatMap((code) => this.actionsOf(code)));
    const drained = {
      held,
      presses: this.presses,
      releases: this.releases,
      typedChars: this.typedChars,
      shortcuts: this.shortcuts,
    };
    this.presses = new Map();
    this.releases = new Set();
    this.typedChars = [];
    this.shortcuts = [];
    return drained;
  }

  /** Removes the listeners. */
  dispose(): void {
    this.cleanup();
  }

  private actionsOf(code: string): readonly Action[] {
    return this.isTextEntry && code === 'Backspace' ? ['left'] : (this.codes.get(code) ?? []);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    this.options.onKeyEvent(true);
    if (hasModifier(event) || this.handleShortcut(event)) {
      return;
    }
    const actions = this.actionsOf(event.code);
    if (actions.length > 0) {
      // Suppresses native button activation and scrolling; Tab is not bound and keeps focus navigation.
      event.preventDefault();
    }
    if (this.handleTyping(event)) {
      return;
    }
    // A repeat of a key that blur dropped from the held set is a new press.
    if (actions.length === 0 || (event.repeat && this.heldCodes.has(event.code))) {
      return;
    }
    this.heldCodes.add(event.code);
    this.registerPresses(actions);
  }

  private registerPresses(actions: readonly Action[]): void {
    const nowMs = this.options.clock.now();
    for (const action of actions) {
      const count = (this.presses.get(action)?.count ?? 0) + 1;
      this.presses.set(action, { count, lastAtMs: nowMs });
    }
  }

  /** F11 toggles fullscreen where the platform handles it in JavaScript. */
  private handleShortcut(event: KeyboardEvent): boolean {
    if (event.code !== 'F11' || !this.options.isFullscreenShortcutEnabled) {
      return false;
    }
    event.preventDefault();
    if (!event.repeat) {
      this.shortcuts.push('toggle-fullscreen');
    }
    return true;
  }

  /** During text entry, letter and digit keys type their character instead of an action. */
  private handleTyping(event: KeyboardEvent): boolean {
    const isTyping =
      this.isTextEntry && TYPING_CODE.test(event.code) && SINGLE_CHARACTER.test(event.key);
    if (isTyping && !event.repeat) {
      this.typedChars.push(event.key.toUpperCase());
    }
    return isTyping;
  }

  private handleKeyUp(event: KeyboardEvent): void {
    this.options.onKeyEvent(false);
    const actions = this.actionsOf(event.code);
    if (actions.length > 0 && !hasModifier(event)) {
      event.preventDefault();
    }
    if (!this.heldCodes.delete(event.code)) {
      return;
    }
    const stillHeld = new Set([...this.heldCodes].flatMap((code) => this.actionsOf(code)));
    for (const action of actions) {
      if (!stillHeld.has(action)) {
        this.releases.add(action);
      }
    }
  }
}
