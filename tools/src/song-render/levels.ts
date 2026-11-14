// R15K Arcade tools – sample rate, gains and the clip guard of the offline audio render. The music gain is
// the music volume of the original web player at its default level; the SFX gain lifts the effects to
// stand next to the music at the mixer's default levels.

/** Sample rate of every rendered file (Hz). */
export const SAMPLE_RATE = 48_000;

/** Gain of the summed music voices before the master filter and compressor. */
export const MUSIC_MASTER_GAIN = 0.42;

/** Gain of the summed SFX tones: the original effects master (0.5) with 8× headroom. */
export const SFX_RENDER_GAIN = 4;

/** How long an SFX tone's oscillator runs on after its envelope has ended (s); also the buffer tail. */
export const SFX_TAIL_SECONDS = 0.03;

/** Largest absolute sample value; louder samples are clamped to it. */
export const CLIP_LIMIT = 0.999;

/** Largest share of clamped samples a render may have before it fails (0.01 %). */
export const MAX_CLIPPED_FRACTION = 0.0001;

/** Samples of the music file before the loop start (0.5 s), so a decoder offset never cuts the loop. */
export const LOOP_LEAD_IN_SAMPLES = 24_000;

/** Samples of the music file after the loop end (1 s), so a decoder offset never cuts the loop. */
export const LOOP_TAIL_SAMPLES = 48_000;
