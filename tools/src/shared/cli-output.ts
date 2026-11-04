// R15K Arcade tools – console output of every tool. Writes through process.stdout/stderr (the engine
// logger is the only console user of the code base); warnings and errors carry the prefixes `warning:`
// and `error:`, so the verify runner's warning detection sees every warning a tool prints.

/** Output channel of the tools. */
export interface CliOutput {
  info(text: string): void;
  warn(text: string): void;
  error(text: string): void;
  table(rows: readonly (readonly string[])[]): void;
}

/** Pads every column to its widest cell; columns are separated by two spaces. */
function formatTable(rows: readonly (readonly string[])[]): string {
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, column) => {
      widths[column] = Math.max(widths[column] ?? 0, cell.length);
    });
  }
  return rows
    .map((row) => row.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join('  '))
    .map((line) => `${line.trimEnd()}\n`)
    .join('');
}

/** The tools' output on stdout (info, tables) and stderr (warnings, errors). */
export const OUT: CliOutput = {
  info(text: string): void {
    process.stdout.write(`${text}\n`);
  },
  warn(text: string): void {
    process.stderr.write(`warning: ${text}\n`);
  },
  error(text: string): void {
    process.stderr.write(`error: ${text}\n`);
  },
  table(rows: readonly (readonly string[])[]): void {
    process.stdout.write(formatTable(rows));
  },
};

/** Ends the process with an exit code. */
export function exitWith(code: 0 | 1): never {
  process.exit(code);
}
