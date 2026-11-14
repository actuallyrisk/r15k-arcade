/** Fixed simulation rate in steps per second, shared by the loop and every deterministic simulation. */
export const SIM_STEP_HZ = 120;

/** Length of one fixed simulation step in seconds. */
export const SIM_STEP_SECONDS: number = 1 / SIM_STEP_HZ;
