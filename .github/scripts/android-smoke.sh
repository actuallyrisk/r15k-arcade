#!/usr/bin/env bash
# R15K Arcade – Android smoke test of the real release build, without third-party actions: boots a
# headless emulator (KVM, system image ANDROID_SMOKE_IMAGE, one retry when the boot times out), signs the
# x86_64 release APK with a throwaway keystore (no secret involved), installs and starts it and fails when
# the app is not running, did not reach the device plugin during a round (log tag R15KDevice) or crashed.
# Usage: android-smoke.sh <x86_64-release-apk> <outDir>
# Needs ANDROID_HOME, ANDROID_SMOKE_IMAGE, BUILD_TOOLS_VERSION and JAVA_HOME (setup-android). Writes
# android-smoke.png, android-smoke-round.png, logcat.txt and emulator.log to <outDir>.
set -euo pipefail

readonly PACKAGE='dev.r15k.arcade'
readonly PACKAGE_PATTERN='dev\.r15k\.arcade'
readonly BOOT_TIMEOUT_SECONDS=300

apk="${1:?usage: android-smoke.sh <apk> <outDir>}"
out_dir="${2:?usage: android-smoke.sh <apk> <outDir>}"
sdk="${ANDROID_HOME:?ANDROID_HOME is not set}"
image="${ANDROID_SMOKE_IMAGE:?ANDROID_SMOKE_IMAGE is not set}"
build_tools="$sdk/build-tools/${BUILD_TOOLS_VERSION:?BUILD_TOOLS_VERSION is not set}"
keytool="${JAVA_HOME:?JAVA_HOME is not set}/bin/keytool"
sdkmanager="$sdk/cmdline-tools/latest/bin/sdkmanager"
avdmanager="$sdk/cmdline-tools/latest/bin/avdmanager"
adb="$sdk/platform-tools/adb"
emulator="$sdk/emulator/emulator"

mkdir -p "$out_dir"
work="$(mktemp -d "${RUNNER_TEMP:-/tmp}/android-smoke.XXXXXX")"
emulator_pid=''
# avdmanager and the emulator resolve their AVD folder from different variables on the runner, so the
# emulator found no AVD; one explicit folder for both.
export ANDROID_AVD_HOME="$work/avd"
mkdir -p "$ANDROID_AVD_HOME"

stop_emulator() {
  if [ -n "$emulator_pid" ]; then
    kill "$emulator_pid" 2> /dev/null || true
    wait "$emulator_pid" 2> /dev/null || true
    emulator_pid=''
  fi
}
trap stop_emulator EXIT

enable_kvm() {
  echo 'KERNEL=="kvm", GROUP="kvm", MODE="0666", OPTIONS+="static_node=kvm"' |
    sudo tee /etc/udev/rules.d/99-kvm4all.rules > /dev/null
  sudo udevadm control --reload-rules
  sudo udevadm trigger --name-match=kvm
}

create_avd() {
  # `yes` ends with SIGPIPE once sdkmanager stops reading; that is not a failure
  (yes || true) | "$sdkmanager" --licenses > /dev/null
  "$sdkmanager" --install emulator "$image" > /dev/null
  echo no | "$avdmanager" create avd --name smoke --package "$image" --device pixel_6 --force
}

start_emulator() {
  "$emulator" -avd smoke -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect \
    >> "$out_dir/emulator.log" 2>&1 &
  emulator_pid=$!
}

# Waits until sys.boot_completed is 1; returns 1 after BOOT_TIMEOUT_SECONDS or as soon as the emulator
# process has exited (its log then holds the reason).
wait_for_boot() {
  local deadline=$((SECONDS + BOOT_TIMEOUT_SECONDS))
  until [ "$("$adb" shell getprop sys.boot_completed 2> /dev/null | tr -d '\r')" = '1' ]; do
    if ! kill -0 "$emulator_pid" 2> /dev/null; then
      echo "::warning::emulator exited during boot; last log lines:"
      tail -n 20 "$out_dir/emulator.log" || true
      return 1
    fi
    if [ "$SECONDS" -ge "$deadline" ]; then
      return 1
    fi
    sleep 5
  done
}

boot_emulator() {
  start_emulator
  if wait_for_boot; then
    return 0
  fi
  echo "::warning::emulator did not boot within ${BOOT_TIMEOUT_SECONDS} s, retrying once"
  stop_emulator
  "$adb" kill-server || true
  start_emulator
  if ! wait_for_boot; then
    echo "::error::emulator did not boot within ${BOOT_TIMEOUT_SECONDS} s (twice)"
    exit 1
  fi
}

disable_animations() {
  local setting
  for setting in window_animation_scale transition_animation_scale animator_duration_scale; do
    "$adb" shell settings put global "$setting" 0
  done
}

# Signs the APK with a keystore that exists only for this run; the password never leaves the process.
sign_apk() {
  SMOKE_KEYSTORE_PASSWORD="$(od -An -N16 -tx1 /dev/urandom | tr -d ' \n')"
  export SMOKE_KEYSTORE_PASSWORD
  "$keytool" -genkeypair -noprompt -keystore "$work/smoke.jks" -storetype PKCS12 \
    -storepass:env SMOKE_KEYSTORE_PASSWORD -keypass:env SMOKE_KEYSTORE_PASSWORD -alias smoke \
    -keyalg RSA -keysize 2048 -validity 1 -dname 'CN=R15K Arcade smoke test'
  "$build_tools/zipalign" -p -f 4 "$apk" "$work/aligned.apk"
  "$build_tools/apksigner" sign --ks "$work/smoke.jks" --ks-key-alias smoke \
    --ks-pass env:SMOKE_KEYSTORE_PASSWORD --key-pass env:SMOKE_KEYSTORE_PASSWORD \
    --out "$work/smoke.apk" "$work/aligned.apk"
}

is_running() {
  [ -n "$("$adb" shell pidof "$PACKAGE" 2> /dev/null | tr -d '\r')" ]
}

# True once the device plugin logged both commands that a round sends.
has_plugin_log() {
  local log
  log="$("$adb" logcat -d -s R15KDevice)"
  grep -q 'setKeepAwake true' <<< "$log" && grep -q 'setImmersive true' <<< "$log"
}

# Skips the intro, then starts a round from the hub's focused cabinet: keys first, taps as fallback.
start_round() {
  "$adb" shell input keyevent KEYCODE_ENTER
  sleep 2
  "$adb" shell input keyevent KEYCODE_ENTER
  sleep 4
  if has_plugin_log; then
    return 0
  fi
  # "Physical size: 1080x2400", possibly followed by an "Override size: …" line
  local output first_line size width height
  output="$("$adb" shell wm size | tr -d '\r')"
  first_line="${output%%$'\n'*}"
  size="${first_line##* }"
  width="${size%x*}"
  height="${size#*x}"
  "$adb" shell input tap "$((width / 2))" "$((height / 2))"
  sleep 2
  "$adb" shell input tap "$((width / 2))" "$((height / 2))"
  sleep 4
}

enable_kvm
create_avd
boot_emulator
disable_animations
sign_apk

failed=0
"$adb" install -r "$work/smoke.apk"
"$adb" logcat -c
"$adb" shell am start -W -n "$PACKAGE/.MainActivity"
sleep 20
"$adb" exec-out screencap -p > "$out_dir/android-smoke.png"
if ! is_running; then
  echo "::error::$PACKAGE is not running 20 s after the start"
  failed=1
fi

if [ "$failed" -eq 0 ]; then
  start_round
  if ! has_plugin_log; then
    echo "::error::device plugin not reached: no 'setKeepAwake true' and 'setImmersive true' (R15KDevice)"
    failed=1
  fi
  "$adb" exec-out screencap -p > "$out_dir/android-smoke-round.png"
fi

"$adb" logcat -d > "$out_dir/logcat.txt"
# A crash logs "FATAL EXCEPTION: <thread>" and then "Process: <package>, PID: …" under AndroidRuntime.
if grep -q -E "AndroidRuntime.*Process: ${PACKAGE_PATTERN}," "$out_dir/logcat.txt"; then
  echo "::error::crash of $PACKAGE in logcat (AndroidRuntime)"
  grep -B 2 -A 20 'FATAL EXCEPTION' "$out_dir/logcat.txt" || true
  failed=1
fi

exit "$failed"
