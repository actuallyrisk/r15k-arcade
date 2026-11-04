import { notImplemented } from '../util/assert.ts';

/** Limits `value` to `[min, max]`. */
export function clamp(_value: number, _min: number, _max: number): number {
  return notImplemented('engine.clamp');
}

/** Linear interpolation from `from` to `to`. */
export function lerp(_from: number, _to: number, _fraction: number): number {
  return notImplemented('engine.lerp');
}

/** Fraction of `value` between `from` and `to`; 0 when `from === to`. */
export function inverseLerp(_from: number, _to: number, _value: number): number {
  return notImplemented('engine.inverseLerp');
}

/** Moves `current` towards `target` by at most `maxDelta`. */
export function approach(_current: number, _target: number, _maxDelta: number): number {
  return notImplemented('engine.approach');
}

/** Whether two numbers differ by at most `epsilon`. */
export function isNearlyEqual(_a: number, _b: number, _epsilon: number): boolean {
  return notImplemented('engine.isNearlyEqual');
}

/** Triangle wave 0…1…0 over one period, without trigonometry (UI blinking and bobbing). */
export function triangleWave(_timeSeconds: number, _periodSeconds: number): number {
  return notImplemented('engine.triangleWave');
}
