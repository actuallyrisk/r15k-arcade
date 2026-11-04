// R15K Arcade tools – command lines of the platform patch (main.ts) and of `pnpm native:prepare`
// (prepare.ts), parsed into typed commands. Unknown actions, platforms or options are usage errors,
// so a typo in a workflow fails instead of silently skipping a patch.
import { parseArgs } from '../shared/args.ts';
import type { NativePlatform } from './apply.ts';

/** A platform patch command. */
export type PatchCommand =
  | { readonly kind: 'apply-android'; readonly releaseSigning?: string }
  | { readonly kind: 'apply-ios' }
  | {
      readonly kind: 'verify-android';
      readonly aapt2: string;
      readonly apkanalyzer: string;
      readonly apk: string;
    }
  | { readonly kind: 'verify-apple'; readonly platform: 'ios' | 'macos'; readonly app: string };

/** Usage of the platform patch. */
export const PATCH_USAGE = [
  'usage: node tools/src/platform-patch/main.ts apply --platform android [--release-signing <keystore.properties>]',
  '       node tools/src/platform-patch/main.ts apply --platform ios',
  '       node tools/src/platform-patch/main.ts verify --platform android --aapt2 <path> --apkanalyzer <path> --apk <file>',
  '       node tools/src/platform-patch/main.ts verify --platform ios|macos --app <path/to/App.app>',
].join('\n');

/** Usage of `pnpm native:prepare`. */
export const PREPARE_USAGE = 'usage: pnpm native:prepare --platform android|ios';

type Options = ReadonlyMap<string, string>;

/** Fails unless every option is one of the allowed names. */
function allowOnly(options: Options, allowed: readonly string[]): void {
  const unknown = [...options.keys()].filter((name) => !allowed.includes(name));
  if (unknown.length > 0) {
    throw new Error(`unknown option(s): ${unknown.map((name) => `--${name}`).join(' ')}`);
  }
}

/** The value of a required option. */
function required(options: Options, name: string): string {
  const value = options.get(name);
  if (value === undefined) {
    throw new Error(`missing option --${name}`);
  }
  return value;
}

/** The options of a command line without flags (every option of these tools takes a value). */
function optionsOf(argv: readonly string[]): Options {
  const { flags, values } = parseArgs(argv);
  if (flags.size > 0) {
    throw new Error(
      `option(s) without a value: ${[...flags].map((name) => `--${name}`).join(' ')}`,
    );
  }
  return values;
}

/** `apply --platform android [--release-signing <file>]`. */
function applyAndroidCommand(options: Options): PatchCommand {
  allowOnly(options, ['platform', 'release-signing']);
  const releaseSigning = options.get('release-signing');
  return releaseSigning === undefined
    ? { kind: 'apply-android' }
    : { kind: 'apply-android', releaseSigning };
}

/** `verify --platform android --aapt2 <path> --apkanalyzer <path> --apk <file>`. */
function verifyAndroidCommand(options: Options): PatchCommand {
  allowOnly(options, ['platform', 'aapt2', 'apkanalyzer', 'apk']);
  return {
    kind: 'verify-android',
    aapt2: required(options, 'aapt2'),
    apkanalyzer: required(options, 'apkanalyzer'),
    apk: required(options, 'apk'),
  };
}

/** `verify --platform ios|macos --app <path>`. */
function verifyAppleCommand(options: Options, platform: 'ios' | 'macos'): PatchCommand {
  allowOnly(options, ['platform', 'app']);
  return { kind: 'verify-apple', platform, app: required(options, 'app') };
}

/** Parses the arguments of main.ts (action first, then options). */
export function parsePatchCommand(argv: readonly string[]): PatchCommand {
  const [action, ...rest] = argv;
  const options = optionsOf(rest);
  const target = `${action ?? ''} ${options.get('platform') ?? ''}`;
  switch (target) {
    case 'apply android':
      return applyAndroidCommand(options);
    case 'apply ios':
      allowOnly(options, ['platform']);
      return { kind: 'apply-ios' };
    case 'verify android':
      return verifyAndroidCommand(options);
    case 'verify ios':
      return verifyAppleCommand(options, 'ios');
    case 'verify macos':
      return verifyAppleCommand(options, 'macos');
    default:
      throw new Error(`unknown command: ${target.trim() === '' ? '(none)' : target}`);
  }
}

/** Parses the arguments of prepare.ts (`--platform android|ios`). */
export function parsePreparePlatform(argv: readonly string[]): NativePlatform {
  const options = optionsOf(argv);
  allowOnly(options, ['platform']);
  const platform = required(options, 'platform');
  if (platform !== 'android' && platform !== 'ios') {
    throw new Error(`unknown platform: ${platform}`);
  }
  return platform;
}
