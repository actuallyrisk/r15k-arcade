import type { Locale } from '../i18n/catalog.ts';
import type { Rect } from '../math/geometry.ts';
import { setAttributeValue } from './a11y-attributes.ts';
import { createMirrorEntry, placeElement, shapeOf } from './a11y-elements.ts';
import type { MirrorEntry } from './a11y-elements.ts';
import type { A11yEvent, A11yNode, A11yTree } from './a11y-types.ts';
import { createLiveRegion } from './live-region.ts';
import type { LiveRegion } from './live-region.ts';

/** Construction options of the mirror layer. */
export interface A11yMirrorOptions {
  /** #a11y-root. */
  readonly root: HTMLElement;
  readonly document: Document;
  /** logicalToCss bound to the current layout. */
  readonly toCss: (rect: Rect) => Rect;
  /** The app queues the event and wakes the loop. */
  readonly onEvent: (event: A11yEvent) => void;
}

/** A live message is cleared, then set this many milliseconds later (repeated texts are re-read). */
export const ANNOUNCE_CLEAR_MS = 80;

/** A polite message stays at least this long before the next one. */
export const ANNOUNCE_MIN_SPACING_MS = 500;

/** The brand name labelling the mirror's main landmark (the same in every language). */
const LANDMARK_LABEL = 'R15K Arcade';

/**
 * A key that steps a spinbutton becomes a select event. Only untrusted keys count: assistive
 * technology adjusts an ARIA spinbutton by dispatching synthetic arrow keys, while real keystrokes
 * reach the input manager, which moves the pixel selector itself.
 */
function keyToSelect(id: string, entry: MirrorEntry, event: Event): A11yEvent | undefined {
  if (event.isTrusted || !('key' in event) || typeof event.key !== 'string') {
    return undefined;
  }
  const optionId = entry.optionForKey(event.key);
  return optionId === undefined ? undefined : { kind: 'select', id, optionId };
}

/** DOM events the mirror turns into mirror events, by event type. */
const EVENT_MAPPERS: Readonly<
  Record<string, (id: string, entry: MirrorEntry, event: Event) => A11yEvent | undefined>
> = {
  focusin: (id) => ({ kind: 'focus', id }),
  click: (id, entry) =>
    entry.kind === 'button' || entry.kind === 'switch' ? { kind: 'activate', id } : undefined,
  input: (id, entry) =>
    entry.kind === 'slider' ? { kind: 'value', id, value: Number(entry.value()) } : undefined,
  keydown: keyToSelect,
};

/** Creates an element with a class name. */
function createWithClass(document: Document, tag: string, className: string): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  return element;
}

/**
 * Invisible DOM layer that mirrors every pixel widget for assistive technology: one real element per
 * node, in tree order, placed exactly at `toCss(node.rect)` (degenerate sizes grow to 1 CSS px).
 * Canvas → DOM: `sync` diffs by node id and moves DOM focus when the tree's focus changed and the
 * element is not focused already. DOM → canvas: focus, clicks on buttons and switches, range input
 * changes and synthetic adjusting keys on selector spinbuttons become mirror events for `onEvent`;
 * focus that the mirror moves itself is not reported back. A node id that occurs twice in one tree is mirrored once (the first node).
 */
export class A11yMirror {
  private readonly document: Document;
  private readonly onEvent: (event: A11yEvent) => void;
  private toCss: (rect: Rect) => Rect;
  private readonly main: HTMLElement;
  private readonly title: HTMLElement;
  private readonly regions: readonly HTMLElement[];
  private readonly live: LiveRegion;
  private readonly entries = new Map<string, MirrorEntry>();
  private readonly idsByElement = new WeakMap<EventTarget, string>();
  private nodes: readonly A11yNode[] = [];
  private lastFocusId: string | undefined;
  private isFocusing = false;

  constructor(options: A11yMirrorOptions) {
    this.document = options.document;
    this.onEvent = options.onEvent;
    this.toCss = options.toCss;
    const { document } = options;
    this.main = createWithClass(document, 'main', 'a11y-main');
    this.main.setAttribute('aria-label', LANDMARK_LABEL);
    this.title = createWithClass(document, 'h1', 'a11y-title');
    this.main.append(this.title);
    const polite = this.createRegion('a11y-live', 'status', 'polite');
    const assertive = this.createRegion('a11y-alert', 'alert', 'assertive');
    this.regions = [polite, assertive];
    options.root.append(this.main, polite, assertive);
    this.live = createLiveRegion({
      polite,
      assertive,
      clearMs: ANNOUNCE_CLEAR_MS,
      minSpacingMs: ANNOUNCE_MIN_SPACING_MS,
    });
    for (const type of Object.keys(EVENT_MAPPERS)) {
      this.main.addEventListener(type, this.handleDomEvent);
    }
  }

  /** Keyed diff by node id; cheap enough every frame (unchanged state is never written). */
  sync(tree: A11yTree): void {
    const focused = this.document.activeElement;
    if (this.title.textContent !== tree.title) {
      this.title.textContent = tree.title;
    }
    const mirrored = new Map<string, A11yNode>();
    let previous: Element = this.title;
    for (const node of tree.nodes) {
      if (!mirrored.has(node.id)) {
        mirrored.set(node.id, node);
        const { element } = this.syncNode(node);
        if (previous.nextElementSibling !== element) {
          this.main.insertBefore(element, previous.nextElementSibling);
        }
        previous = element;
      }
    }
    this.nodes = [...mirrored.values()];
    this.removeEntriesExcept(mirrored);
    this.restoreFocus(focused);
    this.syncFocus(tree.focusId);
  }

  /** Queues a live announcement (polite unless stated otherwise). */
  announce(text: string, politeness: 'polite' | 'assertive' = 'polite'): void {
    this.live.announce(text, politeness);
  }

  /** Sets `<html lang>`. */
  setLocale(locale: Locale): void {
    this.document.documentElement.lang = locale;
  }

  /** Replaces the logical-to-CSS mapping after a layout change and moves every element at once. */
  setLayoutMapper(toCss: (rect: Rect) => Rect): void {
    this.toCss = toCss;
    for (const node of this.nodes) {
      const entry = this.entries.get(node.id);
      if (entry !== undefined) {
        placeElement(entry.element, toCss(node.rect));
      }
    }
  }

  /** Removes the mirror elements, their listeners and pending announcements. */
  dispose(): void {
    this.live.dispose();
    for (const type of Object.keys(EVENT_MAPPERS)) {
      this.main.removeEventListener(type, this.handleDomEvent);
    }
    this.main.remove();
    for (const region of this.regions) {
      region.remove();
    }
    this.entries.clear();
    this.nodes = [];
  }

  /** Turns a DOM event on a mirror element into a mirror event. */
  private readonly handleDomEvent = (event: Event): void => {
    const target = event.target;
    const id = target === null ? undefined : this.idsByElement.get(target);
    const entry = id === undefined ? undefined : this.entries.get(id);
    if (id === undefined || entry === undefined || (event.type === 'focusin' && this.isFocusing)) {
      return;
    }
    const mirrorEvent = EVENT_MAPPERS[event.type]?.(id, entry, event);
    if (mirrorEvent === undefined) {
      return;
    }
    if (event.type === 'keydown') {
      // The step is handled here; the keyboard source must not see the synthetic key as well.
      event.preventDefault();
      event.stopPropagation();
    }
    this.onEvent(mirrorEvent);
  };

  /** Creates a live region element. */
  private createRegion(className: string, role: string, politeness: string): HTMLElement {
    const region = createWithClass(this.document, 'div', className);
    region.setAttribute('role', role);
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    return region;
  }

  /** Brings the element of one node up to date (a new element when its shape changed). */
  private syncNode(node: A11yNode): MirrorEntry {
    const existing = this.entries.get(node.id);
    const entry = existing?.shape === shapeOf(node) ? existing : this.replaceEntry(existing, node);
    entry.update(node);
    setAttributeValue(entry.element, 'aria-description', node.description);
    placeElement(entry.element, this.toCss(node.rect));
    return entry;
  }

  /** Creates the element of a node and drops the old one. */
  private replaceEntry(existing: MirrorEntry | undefined, node: A11yNode): MirrorEntry {
    existing?.element.remove();
    const entry = createMirrorEntry(this.document, node);
    entry.element.setAttribute('data-a11y-id', node.id);
    this.idsByElement.set(entry.element, node.id);
    this.entries.set(node.id, entry);
    return entry;
  }

  /** Removes the elements of nodes that left the tree. */
  private removeEntriesExcept(ids: ReadonlyMap<string, unknown>): void {
    for (const [id, entry] of this.entries) {
      if (!ids.has(id)) {
        entry.element.remove();
        this.entries.delete(id);
      }
    }
  }

  /** Focuses the previously focused mirror element again if reordering took the focus away. */
  private restoreFocus(focused: Element | null): void {
    const id = focused === null ? undefined : this.idsByElement.get(focused);
    const element = id === undefined ? undefined : this.entries.get(id)?.element;
    if (element === focused && this.document.activeElement !== element) {
      this.focus(element);
    }
  }

  /** Moves DOM focus when the tree's focus changed and the element is not focused already. */
  private syncFocus(focusId: string | undefined): void {
    if (focusId === this.lastFocusId) {
      return;
    }
    this.lastFocusId = focusId;
    const element = focusId === undefined ? undefined : this.entries.get(focusId)?.element;
    if (element !== undefined && this.document.activeElement !== element) {
      this.focus(element);
    }
  }

  /** Focuses a mirror element without scrolling and without reporting the focus back. */
  private focus(element: HTMLElement): void {
    this.isFocusing = true;
    try {
      element.focus({ preventScroll: true });
    } finally {
      this.isFocusing = false;
    }
  }
}
