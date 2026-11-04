#!/usr/bin/env bash
# R15K Arcade – signs the unsigned Android release packages with the upload key: every APK with zipalign
# and apksigner (v2/v3 signatures), the AAB with jarsigner (the format Play expects for an upload).
# Usage: sign-android.sh <packagesDir> <outDir> <version>
# Needs ANDROID_HOME, BUILD_TOOLS_VERSION, JAVA_HOME and the signing values ANDROID_KEYSTORE_FILE (the
# decoded keystore), ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS and ANDROID_KEY_PASSWORD, all through
# the environment: passwords are handed to the tools as environment references, never as arguments.
# Writes r15k-arcade_<version>_<abi>.apk and r15k-arcade_<version>.aab to <outDir>.
set -euo pipefail
shopt -s nullglob

packages_dir="${1:?usage: sign-android.sh <packagesDir> <outDir> <version>}"
out_dir="${2:?usage: sign-android.sh <packagesDir> <outDir> <version>}"
version="${3:?usage: sign-android.sh <packagesDir> <outDir> <version>}"
build_tools="${ANDROID_HOME:?ANDROID_HOME is not set}/build-tools/${BUILD_TOOLS_VERSION:?BUILD_TOOLS_VERSION is not set}"
jarsigner="${JAVA_HOME:?JAVA_HOME is not set}/bin/jarsigner"
keystore="${ANDROID_KEYSTORE_FILE:?ANDROID_KEYSTORE_FILE is not set}"
key_alias="${ANDROID_KEY_ALIAS:?ANDROID_KEY_ALIAS is not set}"
: "${ANDROID_KEYSTORE_PASSWORD:?ANDROID_KEYSTORE_PASSWORD is not set}"
: "${ANDROID_KEY_PASSWORD:?ANDROID_KEY_PASSWORD is not set}"

mkdir -p "$out_dir"
work="$(mktemp -d "${RUNNER_TEMP:-/tmp}/sign-android.XXXXXX")"
trap 'rm -rf "$work"' EXIT

apks=("$packages_dir"/*.apk)
aabs=("$packages_dir"/*.aab)
if [ "${#apks[@]}" -eq 0 ] || [ "${#aabs[@]}" -ne 1 ]; then
  echo "::error::expected APKs and exactly one AAB in $packages_dir" >&2
  exit 1
fi

for apk in "${apks[@]}"; do
  # app-<abi>-release-unsigned.apk → <abi>
  abi="${apk##*/app-}"
  abi="${abi%%-release*}"
  signed="$out_dir/r15k-arcade_${version}_${abi}.apk"
  "$build_tools/zipalign" -p -f 4 "$apk" "$work/aligned.apk"
  "$build_tools/apksigner" sign --ks "$keystore" --ks-key-alias "$key_alias" --v4-signing-enabled false \
    --ks-pass env:ANDROID_KEYSTORE_PASSWORD --key-pass env:ANDROID_KEY_PASSWORD \
    --out "$signed" "$work/aligned.apk"
  "$build_tools/apksigner" verify "$signed"
  echo "signed $signed"
done

bundle="$out_dir/r15k-arcade_${version}.aab"
cp "${aabs[0]}" "$bundle"
"$jarsigner" -keystore "$keystore" -storepass:env ANDROID_KEYSTORE_PASSWORD \
  -keypass:env ANDROID_KEY_PASSWORD -sigalg SHA256withRSA -digestalg SHA-256 "$bundle" "$key_alias"
"$jarsigner" -verify "$bundle" > /dev/null
echo "signed $bundle"
