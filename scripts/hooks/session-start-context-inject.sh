#!/bin/bash
# ============================================================
# Maestro v4.0.1 — session-start-context-inject.sh (with sense-env)
#
# Hook: SessionStart
#
# Merges two responsibilities (Decision 1 = A, fusion):
#   1. Inject project-rules.md + current-sprint.md (v3.5 behavior, preserved)
#   2. Inject measured environment signals (sense-env, ported from EasyDev MIT)
#
# NOTE on output safety:
# - SessionStart hooks CAN output to stdout — Claude reads it as context
# - This is fundamentally different from Stop hooks (which we made SILENT in v3.5.2)
# - Output here is intentional and bounded (no loops possible)
# - All errors captured silently to prevent hook failure cascading
#
# Adapted from EasyDev v1.0.0 (MIT) sense-env.py by ARABII.
# ============================================================

# Wrap everything in a block with all errors silenced
{

set +e  # don't exit on errors, we want graceful degradation

PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Skip if not in an Maestro project
if [ ! -d "$PROJECT_ROOT/.claude" ]; then
  exit 0
fi

# ── PART 1: Context injection (v3.5 behavior preserved) ──────────────────────

INJECTED=0
HEADER_PRINTED=0

print_header() {
  if [ "$HEADER_PRINTED" = "0" ]; then
    echo "=== Maestro — Project context auto-injected ==="
    echo ""
    HEADER_PRINTED=1
  fi
}

inject_file() {
  local label="$1"
  local path="$2"
  if [ -f "$path" ]; then
    print_header
    echo "--- $label: $path ---"
    cat "$path" 2>/dev/null
    echo ""
    echo "--- end $label ---"
    echo ""
    INJECTED=$((INJECTED + 1))
  fi
}

# Look for project-rules.md (new convention maestro_docs/, fallback docs/)
if [ -f "$PROJECT_ROOT/maestro_docs/memory-bank/project-rules.md" ]; then
  inject_file "PROJECT RULES (project-rules.md)" \
              "$PROJECT_ROOT/maestro_docs/memory-bank/project-rules.md"
elif [ -f "$PROJECT_ROOT/docs/memory-bank/project-rules.md" ]; then
  inject_file "PROJECT RULES (project-rules.md)" \
              "$PROJECT_ROOT/docs/memory-bank/project-rules.md"
fi

# Look for current-sprint.md
if [ -f "$PROJECT_ROOT/maestro_docs/memory-bank/current-sprint.md" ]; then
  inject_file "CURRENT SPRINT (current-sprint.md)" \
              "$PROJECT_ROOT/maestro_docs/memory-bank/current-sprint.md"
elif [ -f "$PROJECT_ROOT/docs/memory-bank/current-sprint.md" ]; then
  inject_file "CURRENT SPRINT (current-sprint.md)" \
              "$PROJECT_ROOT/docs/memory-bank/current-sprint.md"
fi

# ── PART 2: Environment measurement (sense-env, NEW in v4.0.1) ───────────────

# Opt-out mechanism: skip if file exists
SENSE_OPT_OUT="$PROJECT_ROOT/.claude/.sense-env-disabled"
SENSE_CACHE="$PROJECT_ROOT/.claude/.sense-env-cache"
SENSE_CACHE_MAX_AGE_SECS=3600

if [ -f "$SENSE_OPT_OUT" ]; then
  exit 0
fi

# Cache check
if [ -f "$SENSE_CACHE" ]; then
  if command -v stat >/dev/null 2>&1; then
    CACHE_MTIME=""
    if stat -f%m "$SENSE_CACHE" >/dev/null 2>&1; then
      CACHE_MTIME=$(stat -f%m "$SENSE_CACHE" 2>/dev/null)
    else
      CACHE_MTIME=$(stat -c%Y "$SENSE_CACHE" 2>/dev/null)
    fi
    NOW=$(date +%s)
    if [ -n "$CACHE_MTIME" ]; then
      AGE=$((NOW - CACHE_MTIME))
      if [ "$AGE" -lt "$SENSE_CACHE_MAX_AGE_SECS" ]; then
        cat "$SENSE_CACHE" 2>/dev/null
        exit 0
      fi
    fi
  fi
fi

# Measure environment signals
SENSE_OUTPUT=""

TOTAL_FILES_ROUGH=$(find "$PROJECT_ROOT" -maxdepth 2 -type f 2>/dev/null | head -1000 | wc -l)
if [ "$TOTAL_FILES_ROUGH" -gt 10000 ]; then
  SENSE_OUTPUT="
=== Maestro — Environment signals (limited scan) ===

→ Project is large (>10k files at root). Detailed scan skipped for performance.
→ Run /sense manually for full measurement if needed.
"
else

# Detect language / stack
LANG_DETECTED=""
LSP_HINT=""
if [ -f "$PROJECT_ROOT/package.json" ]; then
  if grep -q '"typescript"' "$PROJECT_ROOT/package.json" 2>/dev/null || [ -f "$PROJECT_ROOT/tsconfig.json" ]; then
    LANG_DETECTED="TypeScript"
    LSP_HINT="typescript-lsp"
  else
    LANG_DETECTED="JavaScript"
  fi
elif [ -f "$PROJECT_ROOT/pyproject.toml" ] || [ -f "$PROJECT_ROOT/requirements.txt" ]; then
  LANG_DETECTED="Python"
  LSP_HINT="pyright-lsp"
elif [ -f "$PROJECT_ROOT/go.mod" ]; then
  LANG_DETECTED="Go"
  LSP_HINT="gopls-lsp"
elif [ -f "$PROJECT_ROOT/Cargo.toml" ]; then
  LANG_DETECTED="Rust"
  LSP_HINT="rust-analyzer-lsp"
fi

# Count source files (bounded)
SRC_COUNT=0
if [ -n "$LANG_DETECTED" ]; then
  case "$LANG_DETECTED" in
    TypeScript|JavaScript)
      SRC_COUNT=$(find "$PROJECT_ROOT" \( -name node_modules -o -name .next -o -name dist -o -name build -o -name .git \) -prune -o \
                  -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \) -print 2>/dev/null | head -5000 | wc -l | tr -d ' ')
      ;;
    Python)
      SRC_COUNT=$(find "$PROJECT_ROOT" \( -name __pycache__ -o -name .venv -o -name venv -o -name .git \) -prune -o \
                  -type f -name '*.py' -print 2>/dev/null | head -5000 | wc -l | tr -d ' ')
      ;;
    Go)
      SRC_COUNT=$(find "$PROJECT_ROOT" -type f -name '*.go' -not -path '*/vendor/*' 2>/dev/null | head -5000 | wc -l | tr -d ' ')
      ;;
    Rust)
      SRC_COUNT=$(find "$PROJECT_ROOT" -type f -name '*.rs' -not -path '*/target/*' 2>/dev/null | head -5000 | wc -l | tr -d ' ')
      ;;
  esac
fi

# Git status
GIT_STATUS="not_a_repo"
GIT_DIRTY_COUNT=0
GIT_BRANCH=""
if [ -d "$PROJECT_ROOT/.git" ]; then
  GIT_STATUS="clean"
  GIT_DIRTY_COUNT=$(cd "$PROJECT_ROOT" && git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  if [ "$GIT_DIRTY_COUNT" -gt 0 ]; then
    GIT_STATUS="dirty"
  fi
  GIT_BRANCH=$(cd "$PROJECT_ROOT" && git branch --show-current 2>/dev/null)
fi

# Quality gates configured?
QG_STATUS="absent"
QG_LEVEL=""
if [ -f "$PROJECT_ROOT/.claude/quality-gates.json" ]; then
  QG_STATUS="configured"
  QG_LEVEL=$(grep -o '"level":[ ]*"[^"]*"' "$PROJECT_ROOT/.claude/quality-gates.json" 2>/dev/null | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
fi

# Graphify present?
GRAPH_STATUS="absent"
if [ -f "$PROJECT_ROOT/graphify-out/graph.json" ]; then
  GRAPH_STATUS="present"
fi

# Build signal block
SENSE_OUTPUT="
=== Maestro — Environment signals ===

→ Language     : ${LANG_DETECTED:-unknown}"
[ -n "$LSP_HINT" ] && SENSE_OUTPUT="${SENSE_OUTPUT}
→ LSP hint     : ${LSP_HINT} (install for token savings on large codebases)"
SENSE_OUTPUT="${SENSE_OUTPUT}
→ Source files : ${SRC_COUNT}
→ Git status   : ${GIT_STATUS}"
[ "$GIT_DIRTY_COUNT" -gt 0 ] && SENSE_OUTPUT="${SENSE_OUTPUT} (${GIT_DIRTY_COUNT} modified files)"
[ -n "$GIT_BRANCH" ] && SENSE_OUTPUT="${SENSE_OUTPUT}
→ Branch       : ${GIT_BRANCH}"
SENSE_OUTPUT="${SENSE_OUTPUT}
→ Quality gates: ${QG_STATUS}"
[ -n "$QG_LEVEL" ] && SENSE_OUTPUT="${SENSE_OUTPUT} (level: ${QG_LEVEL})"
[ "$QG_STATUS" = "absent" ] && SENSE_OUTPUT="${SENSE_OUTPUT} (run /quality-gate init to configure)"
SENSE_OUTPUT="${SENSE_OUTPUT}
→ Graphify     : ${GRAPH_STATUS}"
[ "$SRC_COUNT" -gt 200 ] && [ "$GRAPH_STATUS" = "absent" ] && SENSE_OUTPUT="${SENSE_OUTPUT} (project > 200 files — consider /graph-setup)"

# Suggestions
SUGGESTIONS=""
if [ "$GIT_DIRTY_COUNT" -gt 20 ]; then
  SUGGESTIONS="${SUGGESTIONS}
  → ${GIT_DIRTY_COUNT} uncommitted changes. Consider focused commits before new work."
fi

if [ -n "$SUGGESTIONS" ]; then
  SENSE_OUTPUT="${SENSE_OUTPUT}

Suggestions based on measurements:${SUGGESTIONS}"
fi

SENSE_OUTPUT="${SENSE_OUTPUT}

(Disable env measurement: touch .claude/.sense-env-disabled. Manual: /sense)
"

fi  # end of "project not too big" branch

# Write cache and emit
mkdir -p "$PROJECT_ROOT/.claude" 2>/dev/null
echo "$SENSE_OUTPUT" > "$SENSE_CACHE" 2>/dev/null
echo "$SENSE_OUTPUT"

# Brownfield suggestion if no rules calibrated
if [ "$INJECTED" = "0" ]; then
  if [ -d "$PROJECT_ROOT/.git" ]; then
    COMMIT_COUNT=$(cd "$PROJECT_ROOT" && git log --oneline 2>/dev/null | wc -l | tr -d ' ')
    if [ "${COMMIT_COUNT:-0}" -gt 20 ]; then
      echo ""
      echo "=== Maestro — Brownfield project not calibrated ==="
      echo ""
      echo "This project has $COMMIT_COUNT commits but no project-rules.md."
      echo "Run /audit then /rules to calibrate Maestro on this codebase."
      echo ""
    fi
  fi
fi

} 2>/dev/null

exit 0
