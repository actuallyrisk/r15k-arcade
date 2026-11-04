#!/usr/bin/env bash
# R15K Arcade – attaches the sideload packages to the GitHub Release v<version>: the signed Android APKs
# (Android refuses unsigned APKs, so without android-signed they are skipped with a notice), the
# universal macOS DMG and the Windows NSIS setup. MSIX and AAB are store-only and never attached.
# Usage: release-upload.sh <version> <artifactsDir>
# <artifactsDir> holds one folder per downloaded artifact (android-signed, macos-dmg, windows-nsis).
# Needs GH_TOKEN (the owner's token, so the upload is the owner's) and GITHUB_REPOSITORY.
set -euo pipefail
shopt -s nullglob

version="${1:?usage: release-upload.sh <version> <artifactsDir>}"
artifacts="${2:?usage: release-upload.sh <version> <artifactsDir>}"
repository="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is not set}"
: "${GH_TOKEN:?GH_TOKEN is not set}"

apks=("$artifacts"/android-signed/*.apk)
dmgs=("$artifacts"/macos-dmg/*.dmg)
setups=("$artifacts"/windows-nsis/*.exe)

if [ "${#dmgs[@]}" -ne 1 ] || [ "${#setups[@]}" -ne 1 ]; then
  echo "::error::expected one DMG and one NSIS setup in $artifacts" >&2
  exit 1
fi
files=("${dmgs[0]}" "${setups[0]}")
if [ "${#apks[@]}" -eq 0 ]; then
  echo "::notice::APK upload skipped (no signed APK)"
else
  files+=("${apks[@]}")
fi

gh release upload "v$version" "${files[@]}" --clobber --repo "$repository"
printf 'attached to v%s: %s\n' "$version" "${files[*]##*/}"
