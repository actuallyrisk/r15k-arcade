// R15K Arcade – Vitest setup of every project: a test fails when it writes an unexpected console warning
// or error. A test that expects such output installs its own spy (`vi.spyOn(console, 'warn')`) for the
// rest of the test and asserts on it; that channel is then left to the test. Unhandled errors and
// rejections already fail the run (dangerouslyIgnoreUnhandledErrors stays off).
import { format } from 'node:util';
import { afterEach, beforeEach, vi } from 'vitest';

type Channel = 'warn' | 'error';

/** The recorder installed for one channel during a test. */
interface Recording {
  readonly recorder: Console[Channel];
  readonly calls: (readonly unknown[])[];
}

const CHANNELS: readonly Channel[] = ['warn', 'error'];
// The console is swapped through an alias: the recorders capture output, they never log.
const target: Pick<Console, Channel> = console;
const ORIGINALS: Readonly<Record<Channel, Console[Channel]>> = {
  warn: target.warn,
  error: target.error,
};
const recordings = new Map<Channel, Recording>();

beforeEach(() => {
  for (const channel of CHANNELS) {
    const calls: (readonly unknown[])[] = [];
    const recorder = (...data: unknown[]): void => {
      calls.push(data);
    };
    recordings.set(channel, { recorder, calls });
    target[channel] = recorder;
  }
});

afterEach(() => {
  // A different function means the test installed its own spy and asserts on that channel itself.
  const checked = [...recordings].filter(
    ([channel, recording]) => target[channel] === recording.recorder,
  );
  vi.restoreAllMocks();
  for (const channel of CHANNELS) {
    target[channel] = ORIGINALS[channel];
  }
  recordings.clear();
  const unexpected = checked.flatMap(([channel, recording]) =>
    recording.calls.map((data) => `console.${channel}: ${format(...data)}`),
  );
  if (unexpected.length > 0) {
    throw new Error(`unexpected console output:\n${unexpected.join('\n')}`);
  }
});
