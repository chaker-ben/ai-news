#!/bin/bash
# TypeCheck rapide après édition de fichiers TS
FILE="${CLAUDE_EDIT_FILE:-}"
if [[ "$FILE" =~ \.(ts|tsx)$ ]]; then
  if command -v pnpm &>/dev/null && [ -f "package.json" ]; then
    pnpm typecheck 2>/dev/null || echo "⚠️  TypeScript errors detected — run pnpm typecheck"
  fi
fi
exit 0
