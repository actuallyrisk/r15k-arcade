// Live announcements of the accessibility mirror. Setting a message first clears its region and writes
// the text a little later, so a repeated text is read again. Polite messages are spaced: the region
// holds a written message for a minimum time; meanwhile only the newest further message waits (it
// replaces queued ones, never the one being set). Assertive messages skip the queue.

/** Queues messages into the polite and the assertive region. */
export interface LiveRegion {
  announce(text: string, politeness: 'polite' | 'assertive'): void;
  /** Cancels every pending write. */
  dispose(): void;
}

/** Elements and timing of the live region. */
export interface LiveRegionOptions {
  readonly polite: HTMLElement;
  readonly assertive: HTMLElement;
  /** Delay between clearing a region and writing the message. */
  readonly clearMs: number;
  /** How long a written polite message stays before the next one is set. */
  readonly minSpacingMs: number;
}

/** One region and its pending write. */
interface RegionWriter {
  /** Writes `text` after the clear delay; `onHeld` runs `holdMs` after the write. */
  write(text: string, options: { readonly holdMs: number; readonly onHeld: () => void }): void;
  cancel(): void;
}

/** Clears the region now and writes the text after `clearMs` (a newer write cancels an older one). */
function createRegionWriter(region: HTMLElement, clearMs: number): RegionWriter {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = (): void => {
    clearTimeout(timer);
  };
  return {
    write: (text, { holdMs, onHeld }) => {
      cancel();
      region.textContent = '';
      timer = setTimeout(() => {
        region.textContent = text;
        timer = setTimeout(onHeld, holdMs);
      }, clearMs);
    },
    cancel,
  };
}

/** Creates the live region over two existing elements. */
export function createLiveRegion(options: LiveRegionOptions): LiveRegion {
  const polite = createRegionWriter(options.polite, options.clearMs);
  const assertive = createRegionWriter(options.assertive, options.clearMs);
  let isPoliteBusy = false;
  let queued: string | undefined;
  const setPolite = (text: string): void => {
    isPoliteBusy = true;
    polite.write(text, {
      holdMs: options.minSpacingMs,
      onHeld: () => {
        isPoliteBusy = false;
        const next = queued;
        queued = undefined;
        if (next !== undefined) {
          setPolite(next);
        }
      },
    });
  };
  return {
    announce: (text, politeness) => {
      if (politeness === 'assertive') {
        assertive.write(text, { holdMs: 0, onHeld: () => undefined });
      } else if (isPoliteBusy) {
        queued = text;
      } else {
        setPolite(text);
      }
    },
    dispose: () => {
      polite.cancel();
      assertive.cancel();
      queued = undefined;
    },
  };
}
