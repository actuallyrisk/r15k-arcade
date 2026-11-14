// R15K Bug Hunt – tuning table: every number of the simulation and of the round view. Values derive from
// the original 404 game (160 px field) scaled 1.5×. Falling is normalized progress from the field top to
// the ground line, timed like the original's 99 px of travel, so every field height plays the same
// (ADR 0004). Changing a simulation value changes replays: bump CONTENT_VERSION and run
// `pnpm replays:update` (CONTRIBUTING.md, "Replays"). Values under `view`, `overlay`, `ground` and `hud`
// change only goldens.

/** Every tuning value of Bug Hunt. */
export const TUNING = {
  field: {
    /** Playfield width in logical px, identical on every display (ADR 0004). */
    width: 240,
    /** Smallest field height the layout may choose (2:1). */
    minHeight: 120,
    /** Largest field height the layout may choose (1:2). */
    maxHeight: 480,
  },
  countdown: {
    /** Length of "BEREIT? 3 · 2 · 1 · LOS!" before every round in seconds (part of the simulation). */
    seconds: 1.8,
    /** Digits counted down. */
    digits: 3,
  },
  /** Length of the 3-2-1 countdown when resuming from pause in seconds (view only, sim not stepped). */
  resumeCountdownSeconds: 1.8,
  roundSeconds: {
    /** Round length in Arcade mode in seconds. */
    arcade: 60,
  },
  /** Last seconds of a round that tick and show the warning. */
  timeWarningSeconds: 5,
  /** Delay between "LOS!" and the first spawn in seconds. */
  firstSpawnDelaySeconds: 0.3,
  spawn: {
    /** Spawn interval at progress 0 before jitter, in seconds. */
    baseSeconds: 0.8,
    /** Interval reduction at full progress, in seconds. */
    progressReduction: 0.36,
    /** Smallest jitter factor of the interval. */
    jitterMin: 0.75,
    /** Width of the jitter factor range (factor = jitterMin + jitterRange × u). */
    jitterRange: 0.5,
  },
  fall: {
    /** Numerator of the fall time distance / (baseRate + progressRate × p + jitterRate × u): the original's 99 px of travel. */
    distance: 99,
    /** Fall rate at progress 0. */
    baseRate: 24,
    /** Extra fall rate at full progress. */
    progressRate: 26,
    /** Random extra fall rate (times u). */
    jitterRate: 10,
    /** Golden bugs fall this many times faster. */
    goldenSpeedFactor: 1.35,
  },
  kinds: {
    /** Probability that a spawn is a golden bug. */
    goldenChance: 0.07,
    /** Probability that a spawn is a bomb (rolled after the golden chance). */
    bombChance: 0.2,
    /** Seconds of play before the first bomb may spawn. */
    bombGraceSeconds: 2,
  },
  item: {
    /** Item hitbox width in field px. */
    width: 11,
    /** Minimum distance of a spawned item to each field edge in field px. */
    spawnMargin: 3,
    /** Range of the random initial wiggle phase in seconds (drawn at spawn, so part of the replay). */
    animPhaseSeconds: 0.4,
  },
  cat: {
    /** Cat sprite width in field px. */
    width: 24,
    /** Cat sprite height in field px. */
    height: 24,
    /** Keyboard and gamepad speed in px/s (crosses 240 px in ≈ 1.07 s). */
    keyboardSpeed: 225,
    /** Pointer follow speed in px/s. */
    pointerSpeed: 720,
    /** Pixels removed from each side of the cat for the catch zone. */
    catchInset: 3,
  },
  /** Normalized fall progress from which an overlapping item counts as caught (the original's last 12 of 99 px). */
  catchFallStart: 0.88,
  points: {
    /** Points for a bug before the multiplier. */
    bug: 1,
    /** Points for a golden bug before the multiplier. */
    golden: 5,
    /** Points lost for a caught bomb in Arcade (the score never drops below 0). */
    bombPenalty: 3,
  },
  combo: {
    /** Consecutive catches for 2×. */
    stage2: 5,
    /** Consecutive catches for 3×. */
    stage3: 10,
    /** Consecutive catches for 4×. */
    stage4: 20,
  },
  reactions: {
    /** Happy face after a bug in seconds. */
    happyBugSeconds: 0.25,
    /** Happy face after a golden bug in seconds. */
    happyGoldenSeconds: 0.45,
    /** Startle after a caught bomb in seconds. */
    startleSeconds: 0.6,
  },
  bot: {
    /** The bot dodges bombs that overlap the cat from this fall progress on. */
    avoidBombFallStart: 0.7,
    /** Horizontal distance in px within which the bot stops moving. */
    deadZone: 4,
  },
  view: {
    /** Seconds the "LOS!" banner stays. */
    goBannerSeconds: 0.7,
    /** Seconds the "FRIDAY DEPLOY!" banner stays. */
    bombBannerSeconds: 0.9,
    /** Lifetime of a score popup in seconds. */
    popupSeconds: 0.7,
    /** Upward speed of popups in px/s (no rise with reduced motion). */
    popupRisePerSecond: 18,
    /** Popups kept at once (the oldest is dropped). */
    maxPopups: 8,
    /** Popup start height above the cat's top in px. */
    popupOffsetY: 10,
    /** Duration of the bomb screen shake in seconds (none with reduced motion). */
    shakeSeconds: 0.25,
    /** Horizontal shake amplitude in px (offset ∈ {−x, 0, x}). */
    shakeX: 2,
    /** Vertical shake amplitude in px (offset ∈ {−y, 0, y}). */
    shakeY: 1,
    /** XOR salt that derives the view-only shake RNG seed from the round seed. */
    shakeSeedSalt: 0x5eed,
    /** Seconds per cat run frame. */
    runFrameSeconds: 0.1,
    /** Seconds per item wiggle frame. */
    itemFrameSeconds: 0.2,
    /** Duration of the catch hop in seconds. */
    catHopSeconds: 0.12,
    /** Height of the catch hop in px (no hop with reduced motion). */
    catHopPixels: 2,
    /** Seconds a caught item takes to fly into the cat's paws (view only; the catch window is unchanged). */
    catchTweenSeconds: 0.08,
    /** View time between the round end and the game-over overlay in seconds. */
    roundEndDelaySeconds: 0.6,
  },
  overlay: {
    /** Cap line of "BEREIT?" in px relative to the field's vertical centre. */
    readyOffsetY: -24,
    /** Cap line of the countdown digit in px relative to the field's vertical centre. */
    digitOffsetY: -8,
    /** Size of the countdown digit as a multiple of menuText. */
    digitFactor: 3,
    /** Cap line of banners as a fraction of the field height from the field top. */
    bannerYFraction: 0.3,
    /** Free space kept on each side of a banner inside the field in px. */
    bannerPadding: 2,
  },
  ground: {
    /** Ground band height in px (ink line plus blue band). */
    height: 16,
    /** Horizontal spacing of the ground dither dots in px. */
    ditherStepX: 4,
    /** Vertical spacing of the ground dither rows in px. */
    ditherStepY: 3,
    /** Horizontal shift of every odd dither row in px. */
    ditherOddRowShift: 2,
    /** First dither row below the ground line in px. */
    ditherOffsetY: 3,
  },
  hud: {
    /** Distance of the score and best texts to the band edges in px. */
    edgePadding: 3,
    /** Progress pips shown towards the next combo stage. */
    comboPips: 4,
    /** Minimum bottom-panel height that shows the drag hint in px. */
    dragHintMinHeight: 40,
    /** Dash length of the time bar during the warning in px (non-colour cue). */
    warningDash: 2,
  },
} as const;
