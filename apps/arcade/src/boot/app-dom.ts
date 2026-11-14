import type { SafeAreaProbes } from '@r15k/engine';

/** The elements of index.html the app runs on. */
export interface AppElements {
  readonly stage: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly a11yRoot: HTMLElement;
  readonly safeAreaProbes: SafeAreaProbes;
}

/** An element of the page by id; a missing one is a boot error. */
function required(document: Document, id: string): HTMLElement {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`index.html lacks #${id}`);
  }
  return element;
}

/** Finds the stage, canvas, mirror root and the four safe-area probes. */
export function findAppElements(document: Document): AppElements {
  const canvas = required(document, 'screen');
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('#screen is not a canvas');
  }
  return {
    stage: required(document, 'stage'),
    canvas,
    a11yRoot: required(document, 'a11y-root'),
    safeAreaProbes: {
      top: required(document, 'safe-top'),
      right: required(document, 'safe-right'),
      bottom: required(document, 'safe-bottom'),
      left: required(document, 'safe-left'),
    },
  };
}
