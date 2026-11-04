// R15K Arcade tools – platform patch `verify`: checks the built packages, not the patched sources.
// Android: the compiled manifest of the APK (`aapt2 dump xmltree`) carries every game flag, and the
// device plugin class with its three command methods survived R8 (`apkanalyzer dex packages`).
// iOS and macOS: the bundle's Info.plist (`plutil -convert json`) carries every required key. The
// parsers are pure; the commands run through the shared process runner.
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { runCommand } from '../shared/run-command.ts';
import type { CommandResult } from '../shared/run-command.ts';
import { CONFIG_CHANGES, OPTIONAL_FEATURES } from './android-manifest.ts';
import { IOS_INFO_KEYS, MACOS_BUNDLE_KEYS } from './apple-keys.ts';
import type { PlistValue } from './apple-keys.ts';

/** An element of the `aapt2 dump xmltree` output with its attributes (`android:` prefixed). */
export interface XmlTreeElement {
  readonly name: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly children: readonly XmlTreeElement[];
}

interface MutableElement {
  readonly name: string;
  readonly attributes: Record<string, string>;
  readonly children: MutableElement[];
}

const ELEMENT_LINE = /^(\s*)E: (\S+)/;
const ATTRIBUTE_LINE = /^(\s*)A: (.+?)(?:\(0x[0-9a-fA-F]+\))?=(.*)$/;
const APP_CATEGORY_GAME = 0;
const SCREEN_ORIENTATION_FULL_USER = 13;
/** Bit of each configuration change in android:configChanges (ActivityInfo.CONFIG_*). */
const CONFIG_CHANGE_BITS: Readonly<Record<string, number>> = {
  keyboard: 0x0010,
  keyboardHidden: 0x0020,
  navigation: 0x0040,
  orientation: 0x0080,
  screenLayout: 0x0100,
  uiMode: 0x0200,
  screenSize: 0x0400,
  smallestScreenSize: 0x0800,
  density: 0x1000,
};
const DEVICE_PLUGIN_CLASS = 'dev.r15k.arcade.device.DevicePlugin';
const DEVICE_PLUGIN_METHODS = ['setImmersive', 'setKeepAwake', 'moveToBackground'];

/** The attribute name with the Android namespace written as `android:`. */
function attributeName(raw: string): string {
  return raw.replace(/^(?:.*\/)?android:/, 'android:');
}

/** The attribute value: string contents without quotes, other values as printed. */
function attributeValue(raw: string): string {
  const value = raw.replace(/ \(Raw: ".*"\)$/, '');
  return /^"(.*)"$/.exec(value)?.[1] ?? value;
}

/** The open elements of the tree being built, innermost last, with their indentation. */
interface TreeBuilder {
  readonly roots: MutableElement[];
  readonly open: { readonly indent: number; readonly element: MutableElement }[];
}

/** A capture group of a match ('' when the group did not take part). */
function group(match: RegExpExecArray, index: number): string {
  return match[index] ?? '';
}

/** Closes the open elements at or deeper than an indentation; returns the innermost one left. */
function closeTo(builder: TreeBuilder, indent: number): MutableElement | undefined {
  let innermost = builder.open.at(-1);
  while (innermost !== undefined && innermost.indent >= indent) {
    builder.open.pop();
    innermost = builder.open.at(-1);
  }
  return innermost?.element;
}

/** Adds an element line to the tree. */
function addElement(builder: TreeBuilder, match: RegExpExecArray): void {
  const indent = group(match, 1).length;
  const parent = closeTo(builder, indent);
  const element: MutableElement = { name: group(match, 2), attributes: {}, children: [] };
  if (parent === undefined) {
    builder.roots.push(element);
  } else {
    parent.children.push(element);
  }
  builder.open.push({ indent, element });
}

/** Adds an attribute line to the element it belongs to. */
function addAttribute(builder: TreeBuilder, match: RegExpExecArray): void {
  const owner = closeTo(builder, group(match, 1).length);
  if (owner !== undefined) {
    owner.attributes[attributeName(group(match, 2))] = attributeValue(group(match, 3));
  }
}

/** Parses the element tree printed by `aapt2 dump xmltree` (roots in document order). */
export function parseXmlTree(output: string): readonly XmlTreeElement[] {
  const builder: TreeBuilder = { roots: [], open: [] };
  for (const line of output.split(/\r?\n/)) {
    const element = ELEMENT_LINE.exec(line);
    if (element !== null) {
      addElement(builder, element);
      continue;
    }
    const attribute = ATTRIBUTE_LINE.exec(line);
    if (attribute !== null) {
      addAttribute(builder, attribute);
    }
  }
  return builder.roots;
}

/** An integer attribute value (`13`, `0x0000000d`, `(type 0x10)0xd`). */
export function integerValue(value: string | undefined): number | undefined {
  const text = (value ?? '').replace(/^\(type 0x[0-9a-fA-F]+\)/, '');
  if (/^0x[0-9a-fA-F]+$/.test(text)) {
    return Number.parseInt(text.slice(2), 16);
  }
  return /^-?\d+$/.test(text) ? Number.parseInt(text, 10) : undefined;
}

/** A boolean attribute value (`true`, `false`, or a non-zero / zero integer). */
export function booleanValue(value: string | undefined): boolean | undefined {
  if (value === 'true' || value === 'false') {
    return value === 'true';
  }
  const number = integerValue(value);
  return number === undefined ? undefined : number !== 0;
}

/** One problem line unless the check holds. */
function problemUnless(isOk: boolean, problem: string): readonly string[] {
  return isOk ? [] : [problem];
}

/** The problems of the <application> element. */
function applicationProblems(application: XmlTreeElement): readonly string[] {
  const values = application.attributes;
  return [
    ...problemUnless(
      integerValue(values['android:appCategory']) === APP_CATEGORY_GAME,
      `application@android:appCategory is not "game" (${values['android:appCategory'] ?? 'missing'})`,
    ),
    ...problemUnless(
      booleanValue(values['android:isGame']) === true,
      `application@android:isGame is not true (${values['android:isGame'] ?? 'missing'})`,
    ),
  ];
}

/** The problems of the main activity element. */
function activityProblems(activity: XmlTreeElement): readonly string[] {
  const values = activity.attributes;
  const required = CONFIG_CHANGES.reduce((mask, name) => mask | (CONFIG_CHANGE_BITS[name] ?? 0), 0);
  const configChanges = integerValue(values['android:configChanges']) ?? 0;
  return [
    ...problemUnless(
      booleanValue(values['android:resizeableActivity']) === true,
      'activity(.MainActivity)@android:resizeableActivity is not true',
    ),
    ...problemUnless(
      integerValue(values['android:screenOrientation']) === SCREEN_ORIENTATION_FULL_USER,
      'activity(.MainActivity)@android:screenOrientation is not "fullUser"',
    ),
    ...problemUnless(
      (configChanges & required) === required,
      `activity(.MainActivity)@android:configChanges lacks one of ${CONFIG_CHANGES.join('|')}`,
    ),
  ];
}

/** The problems of the optional hardware features. */
function featureProblems(manifest: XmlTreeElement): readonly string[] {
  const features = manifest.children.filter((child) => child.name === 'uses-feature');
  return OPTIONAL_FEATURES.flatMap((name) => {
    const feature = features.find((child) => child.attributes['android:name'] === name);
    return problemUnless(
      booleanValue(feature?.attributes['android:required']) === false,
      `uses-feature ${name} is not declared with android:required="false"`,
    );
  });
}

/** Every missing game flag in the `aapt2 dump xmltree --file AndroidManifest.xml` output. */
export function androidManifestProblems(output: string): readonly string[] {
  const manifest = parseXmlTree(output).find((element) => element.name === 'manifest');
  if (manifest === undefined) {
    return ['no <manifest> element in the aapt2 output'];
  }
  const application = manifest.children.find((child) => child.name === 'application');
  const activity = application?.children.find(
    (child) =>
      child.name === 'activity' &&
      (child.attributes['android:name'] ?? '').endsWith('.MainActivity'),
  );
  return [
    ...(application === undefined
      ? ['no <application> element']
      : applicationProblems(application)),
    ...(activity === undefined
      ? ['no .MainActivity <activity> element']
      : activityProblems(activity)),
    ...featureProblems(manifest),
  ];
}

/** Every part of the device plugin missing from `apkanalyzer dex packages --defined-only`. */
export function devicePluginProblems(output: string): readonly string[] {
  const lines = output.split(/\r?\n/).map((line) => line.trim());
  const className = DEVICE_PLUGIN_CLASS.replaceAll('.', '\\.');
  const hasClass = lines.some((line) => new RegExp(`^C\\s.*\\s${className}$`).test(line));
  return [
    ...problemUnless(hasClass, `class ${DEVICE_PLUGIN_CLASS} is not in the APK (removed by R8?)`),
    ...DEVICE_PLUGIN_METHODS.flatMap((method) =>
      problemUnless(
        lines.some((line) =>
          new RegExp(`^M\\s.*\\s${className}\\s+\\S+\\s+${method}\\(`).test(line),
        ),
        `method ${DEVICE_PLUGIN_CLASS}.${method} is not in the APK (renamed or removed by R8?)`,
      ),
    ),
  ];
}

/** Every required key that the bundle's Info.plist (as JSON) lacks or holds with another value. */
export function infoPlistProblems(
  info: unknown,
  required: Readonly<Record<string, PlistValue>>,
): readonly string[] {
  const values =
    typeof info === 'object' && info !== null
      ? new Map<string, unknown>(Object.entries(info))
      : undefined;
  if (values === undefined) {
    return ['Info.plist is not a dictionary'];
  }
  return Object.entries(required).flatMap(([key, value]) => {
    const actual: unknown = values.get(key);
    const found = actual === undefined ? 'missing' : JSON.stringify(actual);
    return problemUnless(
      isDeepStrictEqual(actual, value),
      `Info.plist ${key} is ${found}, expected ${JSON.stringify(value)}`,
    );
  });
}

/** The output of a command, or a thrown error naming it when it failed. */
function outputOf(result: CommandResult, label: string): string {
  if (result.status !== 0) {
    throw new Error(`${label} failed (exit ${result.status}): ${result.stderr.trim()}`);
  }
  return result.stdout;
}

/** Paths of the Android tools and the APK to check. */
export interface AndroidVerifyOptions {
  readonly aapt2: string;
  readonly apkanalyzer: string;
  readonly apk: string;
}

/** Checks the manifest flags and the kept device plugin of a built APK. */
export function verifyAndroid(options: AndroidVerifyOptions): readonly string[] {
  const manifest = runCommand(options.aapt2, [
    ...['dump', 'xmltree', '--file', 'AndroidManifest.xml'],
    options.apk,
  ]);
  const dex = runCommand(options.apkanalyzer, ['dex', 'packages', '--defined-only', options.apk]);
  return [
    ...androidManifestProblems(outputOf(manifest, 'aapt2 dump xmltree')),
    ...devicePluginProblems(outputOf(dex, 'apkanalyzer dex packages')),
  ];
}

/** Checks the Info.plist keys of a built iOS or macOS app bundle. */
export function verifyAppleBundle(platform: 'ios' | 'macos', app: string): readonly string[] {
  const plist = platform === 'ios' ? join(app, 'Info.plist') : join(app, 'Contents', 'Info.plist');
  const result = runCommand('plutil', ['-convert', 'json', '-o', '-', plist]);
  const info: unknown = JSON.parse(outputOf(result, 'plutil -convert json'));
  return infoPlistProblems(info, platform === 'ios' ? IOS_INFO_KEYS : MACOS_BUNDLE_KEYS);
}
