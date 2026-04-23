#!/bin/bash
# Pre-commit hook : vérifie la synchronisation des clés de traduction

# Find translation files
MESSAGES_DIR=""
if [ -d "messages" ]; then
  MESSAGES_DIR="messages"
elif [ -d "src/locales" ]; then
  MESSAGES_DIR="src/locales"
fi

if [ -z "$MESSAGES_DIR" ]; then
  exit 0  # No i18n directory found — skip
fi

# Detect files
EN_FILE=$(find "$MESSAGES_DIR" -name "en.json" | head -1)
AR_FILE=$(find "$MESSAGES_DIR" -name "ar.json" | head -1)
FR_FILE=$(find "$MESSAGES_DIR" -name "fr.json" | head -1)

if [ -z "$EN_FILE" ]; then
  exit 0  # No en.json — skip
fi

FAILED=0

check_sync() {
  local file="$1"
  local lang="$2"
  if [ -f "$file" ]; then
    DIFF=$(diff \
      <(jq -r '[paths | join(".")] | sort | .[]' "$EN_FILE" 2>/dev/null) \
      <(jq -r '[paths | join(".")] | sort | .[]' "$file" 2>/dev/null))
    if [ -n "$DIFF" ]; then
      echo "❌ $lang.json is out of sync with en.json:"
      echo "$DIFF" | head -10
      FAILED=1
    fi
  fi
}

check_sync "$AR_FILE" "ar"
check_sync "$FR_FILE" "fr"

if [ "$FAILED" -eq 1 ]; then
  echo ""
  echo "Fix: add missing keys to all translation files before committing"
  exit 1
fi

exit 0
