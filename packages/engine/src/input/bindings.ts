import { err, ok } from '../util/result.ts';
import type { Result } from '../util/result.ts';
import { ACTIONS } from './actions.ts';
import type { Action } from './actions.ts';

/** A gamepad button of the standard mapping. */
export interface GamepadButtonControl {
  readonly kind: 'button';
  readonly index: number;
}

/** One direction of a gamepad axis of the standard mapping. */
export interface GamepadAxisControl {
  readonly kind: 'axis';
  readonly index: number;
  readonly direction: -1 | 1;
}

/** A gamepad button or axis direction. */
export type GamepadControl = GamepadButtonControl | GamepadAxisControl;

/** Keyboard codes and gamepad controls per action. */
export interface Bindings {
  /** KeyboardEvent.code values. */
  readonly keyboard: Readonly<Record<Action, readonly string[]>>;
  /** Standard mapping indices. */
  readonly gamepad: Readonly<Record<Action, readonly GamepadControl[]>>;
}

/** Default bindings: arrows and WASD, Enter/Space, Escape/Backspace, P; D-pad, stick, A, B, Start. */
export const DEFAULT_BINDINGS: Bindings = {
  keyboard: {
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    up: ['ArrowUp', 'KeyW'],
    down: ['ArrowDown', 'KeyS'],
    confirm: ['Enter', 'NumpadEnter', 'Space'],
    back: ['Escape', 'Backspace'],
    pause: ['KeyP', 'Escape'],
  },
  gamepad: {
    left: [
      { kind: 'button', index: 14 },
      { kind: 'axis', index: 0, direction: -1 },
    ],
    right: [
      { kind: 'button', index: 15 },
      { kind: 'axis', index: 0, direction: 1 },
    ],
    up: [
      { kind: 'button', index: 12 },
      { kind: 'axis', index: 1, direction: -1 },
    ],
    down: [
      { kind: 'button', index: 13 },
      { kind: 'axis', index: 1, direction: 1 },
    ],
    confirm: [{ kind: 'button', index: 0 }],
    back: [{ kind: 'button', index: 1 }],
    pause: [{ kind: 'button', index: 9 }],
  },
};

/** A JSON object (not an array, not null). */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIndex(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function parseKeyCode(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function parseGamepadControl(value: unknown): GamepadControl | undefined {
  if (!isRecord(value) || !isIndex(value['index'])) {
    return undefined;
  }
  const index = value['index'];
  const direction = value['direction'];
  if (value['kind'] === 'button' && direction === undefined) {
    return { kind: 'button', index };
  }
  if (value['kind'] === 'axis' && (direction === -1 || direction === 1)) {
    return { kind: 'axis', index, direction };
  }
  return undefined;
}

/** Parses one section (keyboard or gamepad): a list per action, every item checked. */
function parseSection<T>(
  section: string,
  value: unknown,
  parseItem: (item: unknown) => T | undefined,
): { readonly lists: Record<Action, readonly T[]>; readonly problems: readonly string[] } {
  const problems: string[] = [];
  const source = isRecord(value) ? value : {};
  if (!isRecord(value)) {
    problems.push(`${section}: expected an object`);
  }
  const unknownKeys = Object.keys(source).filter(
    (key) => !(ACTIONS as readonly string[]).includes(key),
  );
  problems.push(...unknownKeys.map((key) => `${section}.${key}: unknown action`));
  const parseList = (action: Action): readonly T[] => {
    const list = source[action];
    if (!Array.isArray(list)) {
      problems.push(`${section}.${action}: expected a list`);
      return [];
    }
    const items = list.map((item: unknown) => parseItem(item));
    items.forEach((item, index) => {
      if (item === undefined) {
        problems.push(`${section}.${action}[${index}]: invalid entry`);
      }
    });
    return items.filter((item) => item !== undefined);
  };
  const lists = Object.fromEntries(ACTIONS.map((action) => [action, parseList(action)]));
  return { lists: lists as Record<Action, readonly T[]>, problems };
}

/** Validates stored bindings; the error lists every problem. */
export function validateBindings(value: unknown): Result<Bindings, readonly string[]> {
  if (!isRecord(value)) {
    return err(['bindings: expected an object']);
  }
  const keyboard = parseSection('keyboard', value['keyboard'], parseKeyCode);
  const gamepad = parseSection('gamepad', value['gamepad'], parseGamepadControl);
  const problems = [...keyboard.problems, ...gamepad.problems];
  return problems.length > 0
    ? err(problems)
    : ok({ keyboard: keyboard.lists, gamepad: gamepad.lists });
}

/** Auto-repeat of held navigation actions (keyboard and gamepad alike). */
export const NAV_REPEAT = { initialDelayMs: 350, intervalMs: 80 } as const;

/** A gamepad axis counts as pressed beyond this magnitude. */
export const GAMEPAD_AXIS_THRESHOLD = 0.5;

/** Longest press that still counts as a gameplay tap, in milliseconds. */
export const TAP_MAX_DURATION_MS = 300;

/** Largest travel of a gameplay tap in CSS px (≈ Android touch slop 8 dp plus margin), independent of the scale. */
export const TAP_MAX_TRAVEL_CSS = 10;
