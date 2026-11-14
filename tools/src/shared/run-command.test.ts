import { expect, test } from 'vitest';
import { pnpmInvocation, runCommand, runPnpm } from './run-command.ts';

const NODE = 'C:\\Program Files\\nodejs\\node.exe';

test('a pnpm JavaScript entry in npm_execpath runs through Node', () => {
  const entry = 'C:\\Users\\dev\\pnpm\\bin\\pnpm.cjs';
  expect(
    pnpmInvocation({ platform: 'win32', execPath: NODE, npmExecPath: entry }, ['run', 'lint']),
  ).toEqual({
    command: NODE,
    args: [entry, 'run', 'lint'],
    isShell: false,
  });
});

test.each(['/usr/lib/node_modules/pnpm/bin/pnpm.mjs', '/opt/pnpm/dist/pnpm.js'])(
  'the entry %s runs through Node on any platform',
  (entry) => {
    const invocation = pnpmInvocation(
      { platform: 'linux', execPath: '/usr/bin/node', npmExecPath: entry },
      ['test'],
    );
    expect(invocation).toEqual({ command: '/usr/bin/node', args: [entry, 'test'], isShell: false });
  },
);

test('a native pnpm binary in npm_execpath runs directly without a shell', () => {
  const binary =
    'C:\\Users\\dev\\AppData\\Local\\node\\corepack\\v1\\pnpm\\12.16.1\\pnpm-native.exe';
  expect(
    pnpmInvocation({ platform: 'win32', execPath: NODE, npmExecPath: binary }, ['typecheck']),
  ).toEqual({
    command: binary,
    args: ['typecheck'],
    isShell: false,
  });
});

test('without npm_execpath plain pnpm runs outside Windows', () => {
  const context = { platform: 'darwin', execPath: '/usr/bin/node', npmExecPath: undefined };
  expect(pnpmInvocation(context, ['run', 'build'])).toEqual({
    command: 'pnpm',
    args: ['run', 'build'],
    isShell: false,
  });
});

test('npm and yarn paths do not count as pnpm', () => {
  const npm = pnpmInvocation(
    { platform: 'linux', execPath: '/usr/bin/node', npmExecPath: '/usr/lib/npm-cli.js' },
    [],
  );
  expect(npm).toEqual({ command: 'pnpm', args: [], isShell: false });
  const yarn = pnpmInvocation(
    { platform: 'win32', execPath: NODE, npmExecPath: 'C:\\yarn\\yarn.js' },
    ['x'],
  );
  expect(yarn).toEqual({ command: 'pnpm "x"', args: [], isShell: true });
});

test('on Windows without npm_execpath one pre-quoted command line goes through the shell', () => {
  const invocation = pnpmInvocation({ platform: 'win32', execPath: NODE, npmExecPath: undefined }, [
    'exec',
    'vitest',
    'run',
    'tools/src/a b.test.ts',
  ]);
  expect(invocation).toEqual({
    command: 'pnpm "exec" "vitest" "run" "tools/src/a b.test.ts"',
    args: [],
    isShell: true,
  });
});

test.each(['say "hi"', '100%', 'line\nbreak', 'carriage\rreturn'])(
  'the Windows shell rejects the argument %j',
  (argument) => {
    const context = { platform: 'win32', execPath: NODE, npmExecPath: undefined };
    expect(() => pnpmInvocation(context, ['run', argument])).toThrow('cannot be passed to pnpm');
  },
);

const ECHO_SCRIPT = [
  "process.stdin.setEncoding('utf8');",
  "let text = '';",
  'process.stdin.on("data", (chunk) => { text += chunk; });',
  "process.stdin.on('end', () => {",
  "  process.stdout.write(text + ':' + process.env.R15K_RUN_TEST);",
  "  process.stderr.write('to-stderr');",
  '  process.exitCode = 3;',
  '});',
].join('\n');

test('runCommand passes env and input and returns stdout, stderr and the exit code', () => {
  const result = runCommand(process.execPath, ['-e', ECHO_SCRIPT], {
    env: { R15K_RUN_TEST: 'env-ok' },
    input: 'input-ok',
  });
  expect(result).toEqual({ status: 3, stdout: 'input-ok:env-ok', stderr: 'to-stderr' });
});

test('a program that cannot start reports status 1 with the reason', () => {
  const result = runCommand('r15k-no-such-program', ['--version']);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('ENOENT');
});

test('a timeout ends the process with status 1 and the reason', () => {
  const result = runCommand(process.execPath, ['-e', 'setInterval(() => {}, 1000);'], {
    timeoutMs: 300,
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('ETIMEDOUT');
});

test('runPnpm starts the pinned pnpm of this workspace without a warning', () => {
  const result = runPnpm(['--version']);
  expect(result).toEqual({ status: 0, stdout: '12.16.1\n', stderr: '' });
});
