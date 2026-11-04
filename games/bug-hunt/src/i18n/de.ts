import type { MatchingCatalog } from '@r15k/engine';
import type { BUG_HUNT_EN } from './en.ts';

/** German Bug Hunt strings. */
export const BUG_HUNT_DE = {
  'bugHunt.title': 'BUG HUNT',
  'bugHunt.mode.arcade': 'ARCADE',
  'bugHunt.hud.score': 'PUNKTE',
  'bugHunt.hud.time': 'ZEIT',
  'bugHunt.hud.best': 'HI',
  'bugHunt.hud.combo': 'COMBO',
  'bugHunt.hud.multiplier': '×{value}',
  'bugHunt.hint.drag': 'HIER ZIEHEN ZUM LAUFEN',
  'bugHunt.countdown.ready': 'BEREIT?',
  'bugHunt.countdown.go': 'LOS!',
  'bugHunt.banner.fridayDeploy': 'FRIDAY DEPLOY!',
  'bugHunt.popup.points': '+{value}',
  'bugHunt.popup.penalty': '-{value}',
  'bugHunt.result.timeUp': 'ZEIT UM!',
  'bugHunt.result.points': { one: '{count} PUNKT', other: '{count} PUNKTE' },
  'bugHunt.a11y.field': 'Spielfeld',
  'bugHunt.a11y.controls':
    'Pfeiltasten oder A und D bewegen die Katze. Ziehen oder tippen, um dorthin zu laufen; im Querformat das linke oder rechte Feld halten. P oder Esc pausiert. Bug +1, goldener Bug +5, Friday-Deploy-Bombe −3.',
  'bugHunt.a11y.roundStart': 'Runde startet. Fang Bugs, weich den Bomben aus. {value}',
  'bugHunt.a11y.countdown': '{value}',
  'bugHunt.a11y.go': 'Los!',
  'bugHunt.a11y.secondsLeft': { one: 'Noch {count} Sekunde', other: 'Noch {count} Sekunden' },
  'bugHunt.a11y.comboStage': 'Combo mal {value}',
  'bugHunt.a11y.pause': 'Pause',
  'bugHunt.a11y.resuming': "Weiter geht's. {value}",
} as const satisfies MatchingCatalog<typeof BUG_HUNT_EN>;
