// R15K Arcade tools – platform patch of the generated AndroidManifest.xml: the game category and
// flag on <application>; on .MainActivity a resizeable window, the full-user orientation and the
// configuration changes the game handles itself (fold, rotation, keyboard, density and theme changes
// never restart it); the gamepad and the touchscreen declared optional (controller devices,
// Chromebooks). Idempotent; every change is reported.
import { applySteps, replaceAt, single } from './anchors.ts';
import type { Located, PatchResult } from './anchors.ts';
import { attributeOf, lineIndent, startTags, withAttribute } from './xml-tags.ts';

const FILE = 'AndroidManifest.xml';
const MAIN_ACTIVITY = '.MainActivity';
const LEANBACK = 'android.software.leanback';

/** Configuration changes the activity handles itself, in this order; other generated tokens follow. */
export const CONFIG_CHANGES: readonly string[] = [
  'orientation',
  'screenSize',
  'smallestScreenSize',
  'screenLayout',
  'density',
  'keyboard',
  'keyboardHidden',
  'navigation',
  'uiMode',
];

/** Hardware features the game uses when present but never requires. */
export const OPTIONAL_FEATURES: readonly string[] = [
  'android.hardware.gamepad',
  'android.hardware.touchscreen',
];

/** The required configuration changes first, then every other token of the existing value. */
export function mergeConfigChanges(existing: string | undefined): string {
  const tokens = (existing ?? '')
    .split('|')
    .map((token) => token.trim())
    .filter((token) => token !== '');
  const others = tokens.filter((token) => !CONFIG_CHANGES.includes(token));
  return [...new Set([...CONFIG_CHANGES, ...others])].join('|');
}

/** One start tag to change: where it is, how changes name it, and the attributes to set. */
interface TagEdit {
  readonly tag: Located;
  readonly label: string;
  readonly attributes: readonly (readonly [string, string])[];
}

/** Sets attributes on one start tag and reports each one that changed. */
function setAttributes(text: string, edit: TagEdit): PatchResult {
  let tag = edit.tag.text;
  const changes: string[] = [];
  for (const [name, value] of edit.attributes) {
    if (attributeOf(tag, name) !== value) {
      tag = withAttribute(tag, name, value);
      changes.push(`${edit.label}@${name} = "${value}"`);
    }
  }
  return { text: replaceAt(text, edit.tag, tag), changes };
}

/** The game category and flag on the single <application> start tag. */
function patchApplication(text: string): PatchResult {
  const tag = single(startTags(text, 'application'), {
    what: 'exactly one <application> start tag',
    file: FILE,
  });
  return setAttributes(text, {
    tag,
    label: 'application',
    attributes: [
      ['android:appCategory', 'game'],
      ['android:isGame', 'true'],
    ],
  });
}

/** Resizeable window, full-user orientation and the handled configuration changes on .MainActivity. */
function patchMainActivity(text: string): PatchResult {
  const activities = startTags(text, 'activity').filter(
    (tag) => attributeOf(tag.text, 'android:name') === MAIN_ACTIVITY,
  );
  const tag = single(activities, {
    what: `<activity android:name="${MAIN_ACTIVITY}"> start tag`,
    file: FILE,
  });
  return setAttributes(text, {
    tag,
    label: `activity(${MAIN_ACTIVITY})`,
    attributes: [
      ['android:resizeableActivity', 'true'],
      ['android:screenOrientation', 'fullUser'],
      ['android:configChanges', mergeConfigChanges(attributeOf(tag.text, 'android:configChanges'))],
    ],
  });
}

/** The <uses-feature> start tag of a feature name, if declared. */
function featureTag(text: string, name: string): Located | undefined {
  return startTags(text, 'uses-feature').find(
    (tag) => attributeOf(tag.text, 'android:name') === name,
  );
}

/** A patch result plus the offset after which the next feature is inserted. */
interface FeatureStep extends PatchResult {
  readonly insertAt: number;
}

/** Declares one feature optional: updates an existing declaration or inserts one. */
function ensureOptionalFeature(text: string, name: string, insertAt: number): FeatureStep {
  const existing = featureTag(text, name);
  if (existing !== undefined) {
    const result = setAttributes(text, {
      tag: existing,
      label: `uses-feature(${name})`,
      attributes: [['android:required', 'false']],
    });
    // An edit before the insertion point moves it by the change in length.
    const shift = existing.index < insertAt ? result.text.length - text.length : 0;
    return { ...result, insertAt: insertAt + shift };
  }
  const element = `<uses-feature android:name="${name}" android:required="false" />`;
  const inserted = `\n${lineIndent(text, insertAt)}${element}`;
  return {
    text: `${text.slice(0, insertAt)}${inserted}${text.slice(insertAt)}`,
    changes: [`${element} inserted`],
    insertAt: insertAt + inserted.length,
  };
}

/** The optional gamepad and touchscreen features, inserted after the leanback declaration. */
function patchFeatures(text: string): PatchResult {
  const leanbacks = startTags(text, 'uses-feature').filter(
    (tag) => attributeOf(tag.text, 'android:name') === LEANBACK,
  );
  const leanback = single(leanbacks, {
    what: `exactly one <uses-feature android:name="${LEANBACK}"> element`,
    file: FILE,
  });
  let step: FeatureStep = { text, changes: [], insertAt: leanback.index + leanback.text.length };
  const changes: string[] = [];
  for (const name of OPTIONAL_FEATURES) {
    step = ensureOptionalFeature(step.text, name, step.insertAt);
    changes.push(...step.changes);
  }
  return { text: step.text, changes };
}

/** Applies the game flags to the text of a generated AndroidManifest.xml. */
export function patchAndroidManifest(text: string): PatchResult {
  return applySteps(text, [patchApplication, patchMainActivity, patchFeatures]);
}
