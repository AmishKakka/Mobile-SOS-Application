#!/usr/bin/env bash
# Filter device/emulator Logcat for Maps, Socket.IO, cleartext, and React Native JS logs.
# Usage: from MobileSOSApp/, run: ./scripts/android-maps-socket-logcat.sh
set -euo pipefail
exec adb logcat | grep -E --line-buffered 'ReactNative|ReactNativeJS|Google Android Maps|GoogleMap|cleartext|CLEARTEXT|socket\.io|Socket|OkHttp|OkHttpClient|NetworkSecurity'
