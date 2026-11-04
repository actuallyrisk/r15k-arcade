// R15K Arcade tools – platform patch of the generated gradle/wrapper/gradle-wrapper.properties: pins
// the checksum of the Gradle distribution the wrapper downloads (distributionSha256Sum), so a
// tampered download fails the build. Only reviewed versions are known; a Tauri upgrade that moves the
// wrapper to another Gradle version fails here until its checksum is added to the table below.
import { anchorNotFound } from './anchors.ts';
import type { PatchResult } from './anchors.ts';

const FILE = 'gradle-wrapper.properties';
const URL_KEY = 'distributionUrl=';
const SUM_KEY = 'distributionSha256Sum=';

/**
 * SHA-256 of the `-bin.zip` distribution per Gradle version, from
 * services.gradle.org/distributions/gradle-<version>-bin.zip.sha256.
 */
export const GRADLE_DISTRIBUTION_SHA256: Readonly<Record<string, string>> = {
  '9.6.1': '9c0f7faeeb306cb14e4279a3e084ca6b596894089a0638e68a07c945a32c9e14',
};

/** Adds or replaces distributionSha256Sum right after the single distributionUrl line. */
export function patchGradleWrapper(text: string): PatchResult {
  const lines = text.split('\n');
  const urlLines = lines.filter((line) => line.startsWith(URL_KEY));
  const [urlLine] = urlLines;
  if (urlLines.length !== 1 || urlLine === undefined) {
    throw anchorNotFound({ what: `exactly one ${URL_KEY} line`, file: FILE });
  }
  const version = /gradle-(\d+(?:\.\d+)+)-bin\.zip$/.exec(urlLine.trim())?.[1];
  if (version === undefined) {
    throw anchorNotFound({ what: `a ${URL_KEY} line naming gradle-<version>-bin.zip`, file: FILE });
  }
  const sum = GRADLE_DISTRIBUTION_SHA256[version];
  if (sum === undefined) {
    throw anchorNotFound({
      what: `a reviewed SHA-256 for Gradle ${version} (GRADLE_DISTRIBUTION_SHA256)`,
      file: FILE,
    });
  }
  const kept = lines.filter((line) => !line.startsWith(SUM_KEY));
  const position = kept.indexOf(urlLine) + 1;
  const patched = [...kept.slice(0, position), `${SUM_KEY}${sum}`, ...kept.slice(position)].join(
    '\n',
  );
  if (patched === text) {
    return { text, changes: [] };
  }
  return { text: patched, changes: [`distributionSha256Sum = ${sum} (Gradle ${version})`] };
}
