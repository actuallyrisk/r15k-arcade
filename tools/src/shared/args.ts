// R15K Arcade tools – command-line flags (`--flag`) and options (`--key value`). Positional arguments are
// rejected here; tools with positional arguments (paths, sub-commands) take them off before parsing.

/** Parsed command line. */
interface ParsedArgs {
  readonly flags: ReadonlySet<string>;
  readonly values: ReadonlyMap<string, string>;
}

/**
 * Parses `--flag` and `--key value` arguments: a `--name` followed by a token that does not start with
 * `--` is an option with that value, otherwise a flag. Anything else throws.
 */
export function parseArgs(argv: readonly string[]): ParsedArgs {
  const flags = new Set<string>();
  const values = new Map<string, string>();
  let index = 0;
  while (index < argv.length) {
    const token = argv[index] ?? '';
    const name = token.startsWith('--') ? token.slice(2) : '';
    if (name === '') {
      throw new Error(`unexpected argument '${token}'`);
    }
    const next = argv[index + 1];
    if (next !== undefined && !next.startsWith('--')) {
      values.set(name, next);
      index += 2;
    } else {
      flags.add(name);
      index += 1;
    }
  }
  return { flags, values };
}
