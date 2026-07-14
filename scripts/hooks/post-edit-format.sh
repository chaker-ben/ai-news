#!/bin/bash
# Hook post-edit : format automatique après chaque édition

FILE="${CLAUDE_TOOL_INPUT_FILE_PATH:-${CLAUDE_EDIT_FILE:-}}"

# Exit silently if no file path
if [[ -z "$FILE" ]] || [[ ! -f "$FILE" ]]; then
  exit 0
fi

# Only format supported file types
if [[ ! "$FILE" =~ \.(ts|tsx|js|jsx|json|css|md)$ ]]; then
  exit 0
fi

# Run prettier if available
if command -v pnpm &>/dev/null && [ -f "package.json" ]; then
  npx prettier --write "$FILE" 2>/dev/null || true
fi

exit 0
