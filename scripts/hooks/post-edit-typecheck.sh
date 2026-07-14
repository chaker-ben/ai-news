#!/bin/bash
# Post-edit typecheck — debouncé v3
# Exécute pnpm typecheck UNIQUEMENT :
# - tous les 10 édits TS/TSX
# - OU si le dernier typecheck date de > 60s
#
# Évite de lancer un typecheck complet sur chaque édition dans un monorepo.

FILE="${CLAUDE_TOOL_INPUT_FILE_PATH:-${CLAUDE_EDIT_FILE:-}}"

# Skip si pas de fichier TS/TSX
[[ "$FILE" =~ \.(ts|tsx)$ ]] || exit 0

# Skip si pas de package.json
[ -f "package.json" ] || exit 0

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
STATE_DIR="$PROJECT_DIR/.claude"
COUNTER_FILE="$STATE_DIR/.typecheck-counter"
LAST_RUN_FILE="$STATE_DIR/.typecheck-last-run"

mkdir -p "$STATE_DIR"

# Incrémenter compteur
COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)
COUNT=$((COUNT + 1))
echo "$COUNT" > "$COUNTER_FILE"

# Lire timestamp du dernier run
LAST_RUN=$(cat "$LAST_RUN_FILE" 2>/dev/null || echo 0)
NOW=$(date +%s)
ELAPSED=$((NOW - LAST_RUN))

# Déclencher si : 10 édits accumulés OU > 60s depuis dernier run
SHOULD_RUN=0
if [ "$COUNT" -ge 10 ]; then
  SHOULD_RUN=1
  REASON="10 édits accumulés"
elif [ "$ELAPSED" -gt 60 ] && [ "$COUNT" -ge 3 ]; then
  SHOULD_RUN=1
  REASON="60s depuis dernier check"
fi

if [ "$SHOULD_RUN" = "1" ]; then
  # Reset compteur + timestamp
  echo "0" > "$COUNTER_FILE"
  echo "$NOW" > "$LAST_RUN_FILE"

  # Lancer typecheck en arrière-plan pour ne pas bloquer
  if command -v pnpm &>/dev/null; then
    (pnpm typecheck --silent > /tmp/m-typecheck-bg.log 2>&1
     RC=$?
     if [ "$RC" != "0" ]; then
       echo "⚠️  TypeScript errors détectés ($REASON)" >&2
       echo "    Logs : /tmp/m-typecheck-bg.log" >&2
     fi) &
  fi
fi

exit 0
