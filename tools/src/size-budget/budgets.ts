// R15K Arcade tools – size budgets (KB = 1024 bytes); changing one needs an ADR. Web JS is measured
// gzip -9, every other web file outside dist/audio raw (source maps excluded), audio and native packages
// raw.

/** Every size budget in bytes. */
export const BUDGETS = {
  /** Σ gzip -9 of every .js file in dist. */
  webJsGzip: 120 * 1024,
  /** Σ raw bytes of every other dist file outside dist/audio (not *.js, not *.map). */
  webAssetsRawWithoutAudio: 250 * 1024,
  /** Σ raw bytes of every file in dist/audio. */
  audioRaw: 3 * 1024 * 1024,
  /** Raw size of each Android APK (one per ABI). */
  apkPerAbi: 15 * 1024 * 1024,
  /** Raw size of the Android App Bundle. */
  aab: 25 * 1024 * 1024,
  /** Raw size of the universal macOS DMG. */
  dmg: 25 * 1024 * 1024,
  /** Raw size of the Windows MSIX. */
  msix: 15 * 1024 * 1024,
} as const;

/** Name of a budget. */
export type BudgetId = keyof typeof BUDGETS;

/** A budget table (the real one or a smaller one in tests). */
export type BudgetTable = Readonly<Record<BudgetId, number>>;
