#!/usr/bin/env bash
set -Eeuo pipefail

# =========================
# Hardcode pairing endpoints here
# Format: "IP:PAIR_PORT"
# =========================
DEVICE_NAMES=(
  "Phone Aksh"
  "Phone Amish"
  # "Phone Realme"
  "Phone Harsh"
)

PAIR_ADDRS=(
  "192.168.0.70:37187"
  "192.168.0.185:38497"
  # "192.168.0.61:42105"
  "192.168.0.213:33935"
)

DISCONNECT_ALL_FIRST="true"

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
  local n2="${#PAIR_ADDRS[@]}"

  if [[ "$n1" -eq 0 ]]; then
    red "No devices configured."
    exit 1
  fi

  if [[ "$n1" -ne "$n2" ]]; then
    red "DEVICE_NAMES and PAIR_ADDRS must have the same length."
    exit 1
  fi
}

pause() {
  read -r -p "$*"
}

require_cmd adb
check_arrays

blue "Restarting ADB..."
adb kill-server >/dev/null 2>&1 || true
adb start-server >/dev/null

if [[ "$DISCONNECT_ALL_FIRST" == "true" ]]; then
  blue "Disconnecting old wireless ADB sessions..."
  adb disconnect >/dev/null 2>&1 || true
fi

blue "Current ADB device list:"
adb devices -l || true
echo

for i in "${!DEVICE_NAMES[@]}"; do
  name="${DEVICE_NAMES[$i]}"
  pair_addr="${PAIR_ADDRS[$i]}"

  yellow "==== Pairing $name ===="
  echo "On $name:"
  echo "  Settings -> Developer options -> Wireless debugging -> Pair device with pairing code"
  echo "Use pairing endpoint: $pair_addr"
  echo
  pause "Press Enter when the pairing screen is visible on $name..."
  adb pair "$pair_addr"
  echo
done

green "Pairing step finished."
green "Now open Wireless debugging on each phone and note the CONNECT endpoint shown there."
green "Put those CONNECT endpoints into connect_install.sh."