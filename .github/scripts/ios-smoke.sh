#!/usr/bin/env bash
# R15K Arcade – iOS simulator smoke test of the simulator build: the newest available iOS runtime with an
# iPhone device type it supports, a fresh simulator, install and launch; fails unless the app still runs
# after 20 s and no crash report for it appeared since the launch (named after the bundle's executable,
# or an .ips report whose header names the bundle ID).
# Usage: ios-smoke.sh <path/to/App.app> <outDir>
# Needs Xcode (xcrun simctl), jq and plutil; writes ios-smoke.png and ios-smoke.log to <outDir>. Written
# for the bash 3.2 that ships with macOS.
set -euo pipefail

readonly BUNDLE_ID='dev.r15k.arcade'

app="${1:?usage: ios-smoke.sh <app> <outDir>}"
out_dir="${2:?usage: ios-smoke.sh <app> <outDir>}"
mkdir -p "$out_dir"
udid=''

cleanup() {
  if [ -n "$udid" ]; then
    xcrun simctl shutdown "$udid" > /dev/null 2>&1 || true
    xcrun simctl delete "$udid" > /dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

# Prints "<runtime id><TAB><iPhone device type id>" for the newest available iOS runtime.
select_runtime_and_device() {
  local runtimes selection runtime device_type
  runtimes="$(xcrun simctl list runtimes available --json)"
  selection="$(jq -r '
    [.runtimes[] | select(.isAvailable and (.identifier | startswith("com.apple.CoreSimulator.SimRuntime.iOS")))]
    | sort_by(.version | split(".") | map(tonumber)) | last // empty
    | [.identifier, ([(.supportedDeviceTypes // [])[] | select(.productFamily == "iPhone")] | last | .identifier // "")]
    | @tsv' <<< "$runtimes")"
  IFS=$'\t' read -r runtime device_type <<< "$selection" || true
  if [ -z "${runtime:-}" ]; then
    echo "::error::no available iOS simulator runtime" >&2
    return 1
  fi
  if [ -z "${device_type:-}" ]; then
    device_type="$(xcrun simctl list devicetypes --json |
      jq -r '[.devicetypes[] | select(.productFamily == "iPhone")] | last | .identifier // empty')"
  fi
  printf '%s\t%s\n' "$runtime" "$device_type"
}

# True when a crash report newer than the marker file belongs to the app.
has_crash_report() {
  local marker="$1" executable="$2" reports_dir="$HOME/Library/Logs/DiagnosticReports" report name header
  [ -d "$reports_dir" ] || return 1
  while IFS= read -r report; do
    name="${report##*/}"
    header=''
    if [[ "$name" == *.ips ]]; then
      IFS= read -r header < "$report" || true
    fi
    if [[ "$name" == "$executable"* || "$header" == *"$BUNDLE_ID"* ]]; then
      echo "::error::crash report $name"
      return 0
    fi
  done < <(find "$reports_dir" -type f -newer "$marker")
  return 1
}

simulator="$(select_runtime_and_device)"
IFS=$'\t' read -r runtime device_type <<< "$simulator"
echo "simulator: $device_type on $runtime"
udid="$(xcrun simctl create r15k-smoke "$device_type" "$runtime")"
xcrun simctl boot "$udid"
xcrun simctl bootstatus "$udid" -b
xcrun simctl install "$udid" "$app"

executable="$(plutil -extract CFBundleExecutable raw "$app/Info.plist")"
marker="$(mktemp "${RUNNER_TEMP:-/tmp}/ios-smoke.XXXXXX")"
xcrun simctl launch "$udid" "$BUNDLE_ID"
sleep 20
xcrun simctl io "$udid" screenshot "$out_dir/ios-smoke.png"
xcrun simctl spawn "$udid" log show --last 2m --style compact \
  --predicate "process == \"$executable\"" > "$out_dir/ios-smoke.log" 2>&1 || true

failed=0
line="$(xcrun simctl spawn "$udid" launchctl list | grep -F "UIKitApplication:$BUNDLE_ID" || true)"
pid="${line%%[[:space:]]*}"
case "$pid" in
  '' | *[!0-9]*)
    echo "::error::$BUNDLE_ID is not running 20 s after the launch"
    failed=1 ;;
  *)
    echo "$BUNDLE_ID is running (pid $pid)" ;;
esac
if has_crash_report "$marker" "$executable"; then
  failed=1
fi
exit "$failed"
