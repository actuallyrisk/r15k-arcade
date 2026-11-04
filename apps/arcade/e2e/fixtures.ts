// R15K Arcade – Playwright fixtures and flow helpers shared by the E2E specs. Every spec imports `test`
// from here, so deterministic randomness, the fake clock, request and console checks and the emulated
// safe areas are installed in one place as the specs need them.
import { test as base } from '@playwright/test';

/** The E2E test function of the arcade (no extra fixtures yet). */
export const test = base.extend({});
