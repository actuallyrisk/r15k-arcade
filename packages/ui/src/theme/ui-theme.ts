import { ROLE_SLOT, SLOT } from '@r15k/engine';
import type { SlotIndex } from '@r15k/engine';

/** Slots of every UI role; draw code uses roles, never raw tokens. */
export interface UiTheme {
  /** ink. */
  readonly text: SlotIndex;
  /** grey. */
  readonly textMuted: SlotIndex;
  /** blueInk. */
  readonly textAccent: SlotIndex;
  /** ROLE_SLOT.warning – drawn only on hudFill (never on paper). */
  readonly textWarning: SlotIndex;
  /** paper. */
  readonly panelFill: SlotIndex;
  /** ink. */
  readonly panelBorder: SlotIndex;
  /** shadow. */
  readonly panelShadow: SlotIndex;
  /** ink (primary). */
  readonly buttonFill: SlotIndex;
  /** paper (primary). */
  readonly buttonText: SlotIndex;
  /** blueTint (pressed/selected; always with a non-colour cue). */
  readonly selectedFill: SlotIndex;
  /** blueInk. */
  readonly selectedBorder: SlotIndex;
  /** greyFaint. */
  readonly disabledFill: SlotIndex;
  /** grey. */
  readonly disabledText: SlotIndex;
  /** greyLight. */
  readonly disabledBorder: SlotIndex;
  /** blueInk. */
  readonly focusRing: SlotIndex;
  /** paper. */
  readonly focusGap: SlotIndex;
  /** ink (the HUD bar). */
  readonly hudFill: SlotIndex;
  /** paper. */
  readonly hudText: SlotIndex;
  /** blue (progress bars, ground). */
  readonly accent: SlotIndex;
  /** grid. */
  readonly gridLine: SlotIndex;
  /** ROLE_SLOT.popupShadow. */
  readonly popupShadow: SlotIndex;
}

/** The UI roles of the R15K look. */
export const UI_THEME: UiTheme = {
  text: SLOT.ink,
  textMuted: SLOT.grey,
  textAccent: SLOT.blueInk,
  textWarning: ROLE_SLOT.warning,
  panelFill: SLOT.paper,
  panelBorder: SLOT.ink,
  panelShadow: SLOT.shadow,
  buttonFill: SLOT.ink,
  buttonText: SLOT.paper,
  selectedFill: SLOT.blueTint,
  selectedBorder: SLOT.blueInk,
  disabledFill: SLOT.greyFaint,
  disabledText: SLOT.grey,
  disabledBorder: SLOT.greyLight,
  focusRing: SLOT.blueInk,
  focusGap: SLOT.paper,
  hudFill: SLOT.ink,
  hudText: SLOT.paper,
  accent: SLOT.blue,
  gridLine: SLOT.grid,
  popupShadow: ROLE_SLOT.popupShadow,
};
