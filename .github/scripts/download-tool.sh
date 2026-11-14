#!/usr/bin/env bash
# R15K Arcade – downloads one pinned CI tool from its GitHub release, verifies the SHA-256 before anything
# is unpacked or executed, and puts it on the PATH of the following steps (GITHUB_PATH).
# Usage: download-tool.sh <name> <version> <sha256>
#   name     actionlint | shellcheck | gitleaks | cargo-audit | osv-scanner | ktlint | xcodegen
#   version  the workflow's *_VERSION value (the release tag is built from it; shellcheck keeps its v)
#   sha256   the workflow's *_SHA256 value (GitHub's asset digest of exactly that file)
# Linux x86_64 assets, except XcodeGen (universal macOS zip, unpacked whole: the binary needs its share
# folder next to bin). Tools land in $RUNNER_TEMP/bin, XcodeGen in $RUNNER_TEMP/xcodegen.
set -euo pipefail

name="${1:?usage: download-tool.sh <name> <version> <sha256>}"
version="${2:?usage: download-tool.sh <name> <version> <sha256>}"
sha256="${3:?usage: download-tool.sh <name> <version> <sha256>}"
temp="${RUNNER_TEMP:?RUNNER_TEMP is not set}"
bin_dir="$temp/bin"

case "$name" in
  actionlint)
    url="https://github.com/rhysd/actionlint/releases/download/v${version}/actionlint_${version}_linux_amd64.tar.gz" ;;
  shellcheck)
    url="https://github.com/koalaman/shellcheck/releases/download/${version}/shellcheck-${version}.linux.x86_64.tar.xz" ;;
  gitleaks)
    url="https://github.com/gitleaks/gitleaks/releases/download/v${version}/gitleaks_${version}_linux_x64.tar.gz" ;;
  cargo-audit)
    url="https://github.com/rustsec/rustsec/releases/download/cargo-audit/v${version}/cargo-audit-x86_64-unknown-linux-gnu-v${version}.tgz" ;;
  osv-scanner)
    url="https://github.com/google/osv-scanner/releases/download/v${version}/osv-scanner_linux_amd64" ;;
  ktlint)
    url="https://github.com/ktlint/ktlint/releases/download/${version}/ktlint" ;;
  xcodegen)
    url="https://github.com/yonaskolb/XcodeGen/releases/download/${version}/xcodegen.zip" ;;
  *)
    echo "::error::download-tool.sh: unknown tool '$name'" >&2
    exit 1 ;;
esac

# sha256sum on Linux, shasum on macOS
file_sha256() {
  if command -v sha256sum > /dev/null; then
    sha256sum "$1" | cut -d ' ' -f 1
  else
    shasum -a 256 "$1" | cut -d ' ' -f 1
  fi
}

work="$(mktemp -d "$temp/download-$name.XXXXXX")"
download="$work/${url##*/}"
curl --fail --silent --show-error --location --retry 3 --output "$download" "$url"
actual="$(file_sha256 "$download")"
if [ "$actual" != "$sha256" ]; then
  echo "::error::$name $version: SHA-256 $actual does not match the pinned $sha256" >&2
  exit 1
fi

# Copies the single executable called $name from the unpacked archive into $bin_dir.
install_from() {
  local found
  found="$(find "$1" -type f -name "$name" -print -quit)"
  if [ -z "$found" ]; then
    echo "::error::$name not found in ${url##*/}" >&2
    exit 1
  fi
  install -m 0755 "$found" "$bin_dir/$name"
}

mkdir -p "$bin_dir"
unpacked="$work/unpacked"
mkdir -p "$unpacked"
case "$download" in
  *.tar.gz | *.tgz)
    tar -xzf "$download" -C "$unpacked"
    install_from "$unpacked" ;;
  *.tar.xz)
    tar -xJf "$download" -C "$unpacked"
    install_from "$unpacked" ;;
  *.zip)
    target="$temp/$name"
    rm -rf "$target"
    unzip -q "$download" -d "$target"
    tool="$(find "$target" -type f -path "*/bin/$name" -print -quit)"
    if [ -z "$tool" ]; then
      echo "::error::bin/$name not found in ${url##*/}" >&2
      exit 1
    fi
    chmod 0755 "$tool"
    bin_dir="$(dirname "$tool")" ;;
  *)
    install -m 0755 "$download" "$bin_dir/$name" ;;
esac

echo "$bin_dir" >> "${GITHUB_PATH:?GITHUB_PATH is not set}"
echo "$name $version installed in $bin_dir (SHA-256 verified)"
