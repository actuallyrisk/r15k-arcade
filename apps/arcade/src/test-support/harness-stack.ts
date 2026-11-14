// The scene stack of the app test harness (scene errors are collected, not thrown) and its scripted
// input source.
import { createIdleInputFrame, createLogger, createMemorySink, SceneStack } from '@r15k/engine';
import type { InputFrame } from '@r15k/engine';
import type { FrameInput } from '../boot/frame-driver.ts';

/** A stack that collects scene errors, and an input source fed from a queue of frames. */
export function createHarnessStack(): {
  readonly stack: SceneStack;
  readonly inputs: InputFrame[];
  readonly input: FrameInput;
  readonly errors: unknown[];
} {
  const logger = createLogger({ isEnabled: false, sink: createMemorySink().sink });
  const errors: unknown[] = [];
  const stack = new SceneStack({
    logger,
    onSceneError: (error) => {
      errors.push(error);
    },
  });
  const inputs: InputFrame[] = [];
  const input: FrameInput = {
    poll: () => inputs.shift() ?? createIdleInputFrame('keyboard'),
    isGamepadConnected: false,
  };
  return { stack, inputs, input, errors };
}
