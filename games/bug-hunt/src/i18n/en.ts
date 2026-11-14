import type { CatalogShape } from '@r15k/engine';

/** English Bug Hunt strings. */
export const BUG_HUNT_EN = {
  'bugHunt.title': 'BUG HUNT',
  'bugHunt.mode.arcade': 'ARCADE',
  'bugHunt.hud.score': 'SCORE',
  'bugHunt.hud.time': 'TIME',
  'bugHunt.hud.best': 'HI',
  'bugHunt.hud.combo': 'COMBO',
  'bugHunt.hud.multiplier': '×{value}',
  'bugHunt.hint.drag': 'DRAG HERE TO MOVE',
  'bugHunt.countdown.ready': 'READY?',
  'bugHunt.countdown.go': 'GO!',
  'bugHunt.banner.fridayDeploy': 'FRIDAY DEPLOY!',
  'bugHunt.popup.points': '+{value}',
  'bugHunt.popup.penalty': '-{value}',
  'bugHunt.result.timeUp': "TIME'S UP!",
  'bugHunt.result.points': { one: '{count} POINT', other: '{count} POINTS' },
  'bugHunt.a11y.field': 'Playfield',
  'bugHunt.a11y.controls':
    'Arrow keys or A and D move the cat. Drag or tap to run there; in landscape, hold the left or right panel. P or Escape pauses. Bug +1, golden bug +5, Friday deploy bomb −3.',
  'bugHunt.a11y.roundStart': 'Round starts. Catch bugs, avoid bombs. {value}',
  'bugHunt.a11y.countdown': '{value}',
  'bugHunt.a11y.go': 'Go!',
  'bugHunt.a11y.secondsLeft': { one: '{count} second left', other: '{count} seconds left' },
  'bugHunt.a11y.comboStage': 'Combo times {value}',
  'bugHunt.a11y.pause': 'Pause',
  'bugHunt.a11y.resuming': 'Resuming. {value}',
} as const satisfies CatalogShape;
