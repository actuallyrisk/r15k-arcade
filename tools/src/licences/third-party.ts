// R15K Arcade tools – one third-party package of the licence report (.tmp/licences/third-party.json, later
// shown by the app's info screen) and the checks shared by the JavaScript and Rust parts.
import { isLicenceAllowed } from './policy.ts';

/** One third-party package with its licence. */
export interface ThirdPartyPackage {
  readonly ecosystem: 'npm' | 'cargo';
  readonly name: string;
  readonly version: string;
  /** SPDX expression as the package declares it ('' when it declares none). */
  readonly license: string;
  /** Source repository or homepage ('' when unknown). */
  readonly repository: string;
}

/** A finding of the licence step (printed as an error line). */
export type LicenceIssue = string;

/** One issue per package whose licence the policy does not allow. */
export function licenceIssues(packages: readonly ThirdPartyPackage[]): readonly LicenceIssue[] {
  return packages
    .filter((item) => !isLicenceAllowed(item.license === '' ? undefined : item.license))
    .map(
      (item) =>
        `licence not allowed: ${item.ecosystem} ${item.name}@${item.version} (${item.license === '' ? 'none declared' : item.license})`,
    );
}

/** Orders packages by ecosystem, name and version in code-unit order (stable on every machine). */
export function comparePackages(a: ThirdPartyPackage, b: ThirdPartyPackage): number {
  const keyA = `${a.ecosystem}\0${a.name}\0${a.version}`;
  const keyB = `${b.ecosystem}\0${b.name}\0${b.version}`;
  if (keyA === keyB) {
    return 0;
  }
  return keyA < keyB ? -1 : 1;
}

/** Whether a value is a plain object (not an array, not null). */
export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A string field of a parsed JSON object ('' when missing or not a string). */
export function stringField(value: Readonly<Record<string, unknown>>, key: string): string {
  const field = value[key];
  return typeof field === 'string' ? field : '';
}
