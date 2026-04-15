#!/usr/bin/env bash
set -Eeuo pipefail

# =========================
# Hardcode values here
# =========================

APK_PATH="/Users/omchauhan/Desktop/Mobile-SOS-Application/MobileSOSApp/android/app/build/outputs/apk/debug/app-debug.apk"
PACKAGE_NAME="com.mobilesosapp"

# Use the CONNECT endpoints shown in Wireless debugging after pairing
# Format: "IP:CONNECT_PORT"
DEVICE_NAMES=(
  "Phone Aksh"
  "Phone Amish"
  "Phone Realme"
  "Phone Harsh"
)

CONNECT_ADDRS=(
  "192.168.0.70:40919"
  "192.168.0.185:38287"
  "192.168.0.61:42547"
  "192.168.0.213:33695"
)

UNINSTALL_FIRST="true"
CLEAR_LOGCAT_AFTER_INSTALL="true"

red()    { printf "\033[31m%s\033[0m\n" "$*"; }
green()  { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
blue()   { printf "\033[34m%s\033[0m\n" "$*"; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    red "Missing required command: $1"
    exit 1
  }
}

check_arrays() {
  local n1="${#DEVICE_NAMES[@]}"
  local n2="${#CONNECT_ADDRS[@]}"

  if [[ "$n1" -eq 0 ]]; then
    red "No devices configured."
    exit 1
  fi

  if [[ "$n1" -ne "$n2" ]]; then
    red "DEVICE_NAMES and CONNECT_ADDRS must have the same length."
    exit 1
  fi
}

require_cmd adb
check_arrays

if [[ ! -f "$APK_PATH" ]]; then
  red "APK not found: $APK_PATH"
  red "Build it first."
  exit 1
fi

blue "Restarting ADB..."
adb kill-server >/dev/null 2>&1 || true
adb start-server >/dev/null

for i in "${!DEVICE_NAMES[@]}"; do
  name="${DEVICE_NAMES[$i]}"
  serial="${CONNECT_ADDRS[$i]}"

  yellow "==== Connecting $name ===="
  adb connect "$serial"
  echo
done

blue "ADB device list after connect:"
adb devices -l
echo

if [[ "$UNINSTALL_FIRST" == "true" ]]; then
  for i in "${!DEVICE_NAMES[@]}"; do
    name="${DEVICE_NAMES[$i]}"
    serial="${CONNECT_ADDRS[$i]}"

    yellow "==== Uninstalling old app from $name ($serial) ===="
    adb -s "$serial" uninstall "$PACKAGE_NAME" || true
    echo
  done
fi

for i in "${!DEVICE_NAMES[@]}"; do
  name="${DEVICE_NAMES[$i]}"
  serial="${CONNECT_ADDRS[$i]}"

  yellow "==== Installing APK on $name ($serial) ===="
  adb -s "$serial" install -r "$APK_PATH"
  echo
done

if [[ "$CLEAR_LOGCAT_AFTER_INSTALL" == "true" ]]; then
  for i in "${!DEVICE_NAMES[@]}"; do
    serial="${CONNECT_ADDRS[$i]}"
    adb -s "$serial" logcat -c || true
  done
fi

green "Connect + install finished."
blue "Final ADB device list:"
adb devices -l