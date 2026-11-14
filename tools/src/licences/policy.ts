// R15K Arcade tools – licence policy for third-party packages, on SPDX expressions: `OR` is allowed when
// any side is, `AND` when every side is, `X WITH Y` only when that exact combination is listed. The
// legacy Cargo form `MIT/Apache-2.0` counts as `OR`. Identifiers match case-insensitively; anything
// unknown or unparsable is not allowed.

/** The allowed licences (SPDX identifiers and listed `WITH` combinations). */
export const ALLOWED_LICENCES: readonly string[] = [
  'MIT',
  'Apache-2.0',
  'Apache-2.0 WITH LLVM-exception',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  '0BSD',
  'Zlib',
  'Unicode-3.0',
  'Unicode-DFS-2016',
  'CC0-1.0',
  'BSL-1.0',
  'MPL-2.0',
  'Unlicense',
];

const ALLOWED = new Set(ALLOWED_LICENCES.map((licence) => licence.toLowerCase()));
const OPERATORS = new Set(['AND', 'OR', 'WITH', '(', ')']);

/** A recursive-descent reader over the tokens of one expression. */
interface Reader {
  readonly tokens: readonly string[];
  position: number;
}

/** The next token without consuming it. */
const peek = (reader: Reader): string | undefined => reader.tokens[reader.position];

/** Consumes and returns the next token. */
function take(reader: Reader): string | undefined {
  const token = peek(reader);
  reader.position += 1;
  return token;
}

/** A licence identifier (not an operator); throws otherwise. */
function identifier(reader: Reader): string {
  const token = take(reader);
  if (token === undefined || OPERATORS.has(token)) {
    throw new Error('identifier expected');
  }
  return token;
}

/** factor := '(' expression ')' | identifier [WITH identifier] */
function factor(reader: Reader): boolean {
  if (peek(reader) === '(') {
    take(reader);
    const isAllowed = expression(reader);
    if (take(reader) !== ')') {
      throw new Error('closing parenthesis expected');
    }
    return isAllowed;
  }
  const licence = identifier(reader);
  if (peek(reader) !== 'WITH') {
    return ALLOWED.has(licence.toLowerCase());
  }
  take(reader);
  return ALLOWED.has(`${licence} WITH ${identifier(reader)}`.toLowerCase());
}

/** term := factor (AND factor)*; every factor must be allowed. */
function term(reader: Reader): boolean {
  let isAllowed = factor(reader);
  while (peek(reader) === 'AND') {
    take(reader);
    isAllowed = factor(reader) && isAllowed;
  }
  return isAllowed;
}

/** expression := term (OR term)*; one allowed term is enough. */
function expression(reader: Reader): boolean {
  let isAllowed = term(reader);
  while (peek(reader) === 'OR') {
    take(reader);
    isAllowed = term(reader) || isAllowed;
  }
  return isAllowed;
}

/** Splits an expression into identifiers, operators and parentheses (`/` becomes OR). */
function tokenize(text: string): readonly string[] {
  return text
    .replaceAll('/', ' OR ')
    .replaceAll('(', ' ( ')
    .replaceAll(')', ' ) ')
    .split(/\s+/)
    .filter((token) => token !== '');
}

/** Whether a licence expression is allowed by the policy (unknown or malformed: false). */
export function isLicenceAllowed(licence: string | undefined): boolean {
  if (licence === undefined) {
    return false;
  }
  const reader: Reader = { tokens: tokenize(licence), position: 0 };
  try {
    const isAllowed = expression(reader);
    return isAllowed && reader.position === reader.tokens.length;
  } catch (_error: unknown) {
    // A malformed expression is reported like an unknown licence (the caller names the package).
    return false;
  }
}
