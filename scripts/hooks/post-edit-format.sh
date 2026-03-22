#!/bin/bash
# Auto-format après édition
FILE="${CLAUDE_EDIT_FILE:-}"
if [[ "$FILE" =~ \.(ts|tsx|js|jsx|json|css|md)$ ]]; then
  if command -v pnpm &>/dev/null && [ -f "package.json" ]; then
    pnpm format "$FILE" 2>/dev/null || true
  fi
fi
exit 0
