import { expect, test } from 'vitest';
import { ALLOWED_LICENCES, isLicenceAllowed } from './policy.ts';
import { licenceIssues } from './third-party.ts';

test.each(ALLOWED_LICENCES.map((licence) => [licence]))('%s is allowed', (licence) => {
  expect(isLicenceAllowed(licence)).toBe(true);
});

test.each([
  ['MIT OR Apache-2.0', true],
  ['GPL-3.0 OR MIT', true],
  ['(MIT OR Apache-2.0) AND Unicode-3.0', true],
  ['MIT AND BSD-3-Clause', true],
  ['MIT AND GPL-3.0', false],
  ['(MIT OR GPL-3.0) AND (LGPL-2.1 OR Zlib)', true],
  ['(GPL-2.0 OR LGPL-2.1) AND MIT', false],
  ['Apache-2.0 WITH LLVM-exception OR MIT', true],
  ['GPL-2.0 WITH Classpath-exception-2.0', false],
  ['MIT WITH LLVM-exception', false],
  ['MIT/Apache-2.0', true],
  ['GPL-3.0/LGPL-3.0', false],
  ['mit', true],
  ['GPL-3.0', false],
  ['UNLICENSED', false],
  ['SEE LICENSE IN LICENSE.md', false],
  ['', false],
  ['(MIT', false],
  ['MIT)', false],
  ['MIT OR', false],
  ['AND MIT', false],
  ['MIT WITH', false],
])('%j → %j', (licence, isAllowed) => {
  expect(isLicenceAllowed(licence)).toBe(isAllowed);
});

test('an undefined licence is not allowed', () => {
  expect(isLicenceAllowed(undefined)).toBe(false);
});

test('licence issues name the ecosystem, the package, its version and its licence', () => {
  const issues = licenceIssues([
    { ecosystem: 'npm', name: 'ok', version: '1.0.0', license: 'MIT', repository: '' },
    { ecosystem: 'npm', name: 'copyleft', version: '2.0.0', license: 'GPL-3.0', repository: '' },
    { ecosystem: 'cargo', name: 'quiet', version: '0.1.0', license: '', repository: '' },
  ]);
  expect(issues).toEqual([
    'licence not allowed: npm copyleft@2.0.0 (GPL-3.0)',
    'licence not allowed: cargo quiet@0.1.0 (none declared)',
  ]);
});
