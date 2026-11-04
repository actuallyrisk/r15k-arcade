// R15K Arcade tools – `pnpm replays:update [--regenerate]`: re-runs every Bug Hunt replay in
// games/bug-hunt/replays and rewrites its final hash, final score and content version; `--regenerate`
// records the bot replays from scratch (a missing bot replay is always recorded). A file is written only
// when its text changes, and every replay prints `updated: <file>` or `unchanged: <file>`. Exit 1 on an
// invalid replay file or argument. Re-recording is a conscious step: say so in the pull request.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { CONTENT_VERSION, parseReplay, recordBotReplay, runReplay } from '@r15k/bug-hunt';
import type { Replay } from '@r15k/bug-hunt';
import { exitWith, OUT } from '../shared/cli-output.ts';
import { parseArgs } from '../shared/args.ts';
import { repoPath } from '../shared/repo-paths.ts';

/** Input source of a recorded bot replay. */
type BotInputKind = 'bot' | 'idle' | 'pointer-bot';

/** A bot replay the tool can record from scratch. */
interface BotReplaySpec {
  readonly file: string;
  readonly seed: number;
  readonly input: BotInputKind;
  readonly note: string;
}

const REPLAY_FOLDER = 'games/bug-hunt/replays';

/** The bot replays of the regression suite. */
const BOT_REPLAYS: readonly BotReplaySpec[] = [
  {
    file: 'arcade-bot-seed-1.json',
    seed: 1,
    input: 'bot',
    note: 'Arcade round of seed 1 played by the keyboard-style bot (moves, bomb dodging).',
  },
  {
    file: 'arcade-idle-seed-2.json',
    seed: 2,
    input: 'idle',
    note: 'Arcade round of seed 2 without input: misses, dodges and catches on the idle cat.',
  },
  {
    file: 'arcade-pointer-seed-3.json',
    seed: 3,
    input: 'pointer-bot',
    note: 'Arcade round of seed 3 played by the pointer bot (one aim per target, no dodging).',
  },
];

/** The message of a thrown value. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The text a replay file holds. */
function replayText(replay: Replay): string {
  return `${JSON.stringify(replay, null, 2)}\n`;
}

/** Re-runs a stored replay and returns it with its final values replaced. */
function rerun(file: string, text: string): Replay {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error: unknown) {
    throw new Error(`${file}: ${messageOf(error)}`, { cause: error });
  }
  const parsed = parseReplay(value);
  if (!parsed.ok) {
    throw new Error(`${file}: ${parsed.error.join('; ')}`);
  }
  const run = runReplay(parsed.value);
  return {
    ...parsed.value,
    contentVersion: CONTENT_VERSION,
    finalHash: run.hash,
    finalScore: run.score,
  };
}

/** Records a bot replay and checks that its input log reproduces the recorded state. */
function record(spec: BotReplaySpec): Replay {
  const replay = recordBotReplay({ seed: spec.seed, note: spec.note, input: spec.input });
  if (runReplay(replay).hash !== replay.finalHash) {
    throw new Error(`${spec.file}: the recorded input log does not reproduce the round`);
  }
  return replay;
}

/** The updated replay for one file name: recorded or re-run. */
function updatedReplay(file: string, isRegenerating: boolean): Replay {
  const path = repoPath(REPLAY_FOLDER, file);
  const spec = BOT_REPLAYS.find((candidate) => candidate.file === file);
  if (spec !== undefined && (isRegenerating || !existsSync(path))) {
    return record(spec);
  }
  return rerun(file, readFileSync(path, 'utf8'));
}

/** Writes a replay when its text changed; reports the outcome. */
function writeReplay(file: string, replay: Replay): void {
  const path = repoPath(REPLAY_FOLDER, file);
  const text = replayText(replay);
  const isUnchanged = existsSync(path) && readFileSync(path, 'utf8') === text;
  if (!isUnchanged) {
    mkdirSync(repoPath(REPLAY_FOLDER), { recursive: true });
    writeFileSync(path, text);
  }
  OUT.info(`${isUnchanged ? 'unchanged' : 'updated'}: ${REPLAY_FOLDER}/${file}`);
}

/** Every replay file name: the bot replays and whatever else the folder holds, sorted. */
function replayFiles(): readonly string[] {
  const folder = repoPath(REPLAY_FOLDER);
  const stored = existsSync(folder)
    ? readdirSync(folder).filter((name) => name.endsWith('.json'))
    : [];
  const names = new Set([...BOT_REPLAYS.map((spec) => spec.file), ...stored]);
  return [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** Whether `--regenerate` was given; undefined for any other argument. */
function regenerateFlag(argv: readonly string[]): boolean | undefined {
  try {
    const { flags, values } = parseArgs(argv);
    const isKnown = values.size === 0 && [...flags].every((name) => name === 'regenerate');
    return isKnown ? flags.has('regenerate') : undefined;
  } catch (_error: unknown) {
    return undefined;
  }
}

/** Updates every replay; returns the exit code. */
function main(argv: readonly string[]): 0 | 1 {
  const isRegenerating = regenerateFlag(argv);
  if (isRegenerating === undefined) {
    OUT.error(`unknown arguments: ${argv.join(' ')}`);
    OUT.error('usage: node tools/src/replays/update.ts [--regenerate]');
    return 1;
  }
  try {
    for (const file of replayFiles()) {
      writeReplay(file, updatedReplay(file, isRegenerating));
    }
    return 0;
  } catch (error: unknown) {
    OUT.error(messageOf(error));
    return 1;
  }
}

exitWith(main(process.argv.slice(2)));
