import { notImplemented } from '@r15k/engine';
import type { A11yNode } from '@r15k/engine';
import type { MenuState } from './menu-reducer.ts';

/**
 * Mirror nodes of a menu: interactive nodes at their hit rects, initials as three sliders at the boxes
 * of their hit areas.
 */
export function menuA11yNodes(
  _state: MenuState,
  _options: { readonly minTouchTarget: number; readonly initialsLetter: (index: number) => string },
): readonly A11yNode[] {
  return notImplemented('ui.menuA11yNodes');
}
