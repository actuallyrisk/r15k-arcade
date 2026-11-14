// R15K Arcade tools – zero-warnings detection of the verify runner: a step fails when its output holds a
// warning line that ESLint's --max-warnings and tsc do not already catch (pnpm WARN, Rollup/Vite "(!)",
// "warning:" prefixes, Node process warnings such as "(node:1234) [DEP0190] DeprecationWarning: …").

/**
 * A warning line: `warn`/`warning` with an optional bracket and a colon or space, `WARN ` (pnpm), `(!) `
 * (Rollup, Vite), or a Node process warning, which starts with the process id. Case-insensitive.
 */
export const WARNING_PATTERN =
  /^\s*(\[?warn(ing)?\]?[:\s]|WARN\s|\(!\)\s|\(node:\d+\) (\[\w+\] )?\w*Warning)/i;

/** Terminal colour and style sequences, removed before matching. */
const ANSI_SEQUENCE = new RegExp(`${String.fromCharCode(0x1b)}\\[[0-9;]*m`, 'g');

/** Every line of the output that is a warning and not on the allow-list (trimmed, colours removed). */
export function findWarningLines(
  output: string,
  allowList: readonly RegExp[] = [],
): readonly string[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.replace(ANSI_SEQUENCE, ''))
    .filter((line) => WARNING_PATTERN.test(line))
    .filter((line) => !allowList.some((allowed) => allowed.test(line)))
    .map((line) => line.trim());
}
