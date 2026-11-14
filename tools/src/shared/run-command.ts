// R15K Arcade tools – the only module of tools/ that starts processes. Programs run without a shell;
// pnpm is started the Windows-safe way: Windows refuses to start pnpm.cmd without a shell, and Node prints
// a DEP0190 deprecation warning when an argument array is combined with `shell: true`, so a shell is used
// only with one pre-quoted command line and no argument array.
import { spawnSync } from 'node:child_process';
import type { SpawnSyncOptionsWithStringEncoding } from 'node:child_process';
import { REPO_ROOT } from './repo-paths.ts';

/** How a process is started. */
export interface RunOptions {
  /** Default REPO_ROOT. */
  readonly cwd?: string;
  /** Merged over process.env. */
  readonly env?: Readonly<Record<string, string>>;
  /** Written to stdin. */
  readonly input?: string;
  /** Default: none. */
  readonly timeoutMs?: number;
}

/** Exit status and output of a finished process. */
export interface CommandResult {
  /** Exit code; 1 with the reason appended to stderr when the process could not start, timed out or was killed. */
  readonly status: number;
  readonly stdout: string;
  readonly stderr: string;
}

/** How pnpm is started on the current platform. */
export interface PnpmInvocation {
  readonly command: string;
  readonly args: readonly string[];
  readonly isShell: boolean;
}

/** The parts of a spawnSync result this module reads (stdout and stderr are missing when spawning failed). */
interface RawResult {
  readonly status: number | null;
  readonly signal: string | null;
  readonly stdout: string | null | undefined;
  readonly stderr: string | null | undefined;
  readonly error?: Error | undefined;
}

const MAX_BUFFER_BYTES = 64 * 1024 * 1024;
const UNSAFE_SHELL_ARGUMENT = /["%\r\n]/;

/** Spawn options shared by both start modes. */
function spawnOptions(options: RunOptions, isShell: boolean): SpawnSyncOptionsWithStringEncoding {
  return {
    cwd: options.cwd ?? REPO_ROOT,
    env: { ...process.env, ...options.env },
    shell: isShell,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: MAX_BUFFER_BYTES,
    ...(options.input === undefined ? {} : { input: options.input }),
    ...(options.timeoutMs === undefined ? {} : { timeout: options.timeoutMs }),
  };
}

/** Appends a reason line to stderr. */
function withReason(stderr: string, reason: string): string {
  return stderr === '' || stderr.endsWith('\n') ? `${stderr}${reason}\n` : `${stderr}\n${reason}\n`;
}

/** Converts a spawnSync result; a start failure, timeout or signal becomes status 1 with a reason. */
function toCommandResult(raw: RawResult): CommandResult {
  const stdout = raw.stdout ?? '';
  const stderr = raw.stderr ?? '';
  if (raw.error !== undefined) {
    return { status: 1, stdout, stderr: withReason(stderr, raw.error.message) };
  }
  if (raw.status === null) {
    return {
      status: 1,
      stdout,
      stderr: withReason(stderr, `terminated by signal ${raw.signal ?? 'unknown'}`),
    };
  }
  return { status: raw.status, stdout, stderr };
}

/** Runs a real executable without a shell (git, cargo, node via process.execPath, actionlint, …). */
export function runCommand(
  command: string,
  args: readonly string[],
  options: RunOptions = {},
): CommandResult {
  return toCommandResult(spawnSync(command, [...args], spawnOptions(options, false)));
}

/** Runs pnpm with the invocation that fits this platform (see pnpmInvocation). */
export function runPnpm(args: readonly string[], options: RunOptions = {}): CommandResult {
  const invocation = pnpmInvocation(
    {
      platform: process.platform,
      execPath: process.execPath,
      npmExecPath: process.env['npm_execpath'],
    },
    args,
  );
  if (invocation.isShell) {
    return toCommandResult(spawnSync(invocation.command, spawnOptions(options, true)));
  }
  return runCommand(invocation.command, invocation.args, options);
}

/** Whether a path's file name is a pnpm executable or entry script (npm or yarn paths do not count). */
function isPnpmPath(path: string): boolean {
  const name = path.split(/[\\/]/).pop() ?? '';
  return name.toLowerCase().startsWith('pnpm');
}

/**
 * How to start pnpm, first matching rule wins: (1) pnpm's JavaScript entry from npm_execpath through
 * Node, (2) any other pnpm npm_execpath directly (Corepack's native binary on Windows), (3) `pnpm` on
 * other platforms than Windows, (4) on Windows one pre-quoted command line through the shell, without an
 * argument array; an argument with `"`, `%` or a line break throws there.
 */
export function pnpmInvocation(
  context: {
    readonly platform: string;
    readonly execPath: string;
    readonly npmExecPath: string | undefined;
  },
  args: readonly string[],
): PnpmInvocation {
  const { npmExecPath } = context;
  if (npmExecPath !== undefined && isPnpmPath(npmExecPath)) {
    if (/\.(c|m)?js$/i.test(npmExecPath)) {
      return { command: context.execPath, args: [npmExecPath, ...args], isShell: false };
    }
    return { command: npmExecPath, args, isShell: false };
  }
  if (context.platform !== 'win32') {
    return { command: 'pnpm', args, isShell: false };
  }
  const unsafe = args.find((arg) => UNSAFE_SHELL_ARGUMENT.test(arg));
  if (unsafe !== undefined) {
    throw new Error(
      `argument cannot be passed to pnpm through the Windows shell: ${JSON.stringify(unsafe)}`,
    );
  }
  return { command: ['pnpm', ...args.map((arg) => `"${arg}"`)].join(' '), args: [], isShell: true };
}
