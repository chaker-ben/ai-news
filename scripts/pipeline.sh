#!/bin/bash
# ============================================================
# Maestro — Automated Pipeline Runner (v3.2)
# Usage: ./scripts/pipeline.sh "feature description" [--profile fast|balanced|quality]
#
# Changements v3.2 vs v3.1 :
# - Phase 04 : bloc de review wrappé dans run_review_parallel() (fix `local` hors fonction)
# - Détection blockers : parsing du bloc m-verdict au lieu de grep sur la prose
# - Should_run : comparaison numérique au lieu de string (robuste aux phases 01.5, 03.5, etc.)
# - shellcheck clean
# ============================================================

set -e

# ── Args ──────────────────────────────────────────────────────────────────────
FEATURE="${1}"
PROFILE="${2:-balanced}"
RESUME_FLAG=""

for arg in "$@"; do
  if [ "$arg" = "--resume" ]; then
    RESUME_FLAG="1"
  fi
done

if [ -z "$FEATURE" ] && [ -z "$RESUME_FLAG" ]; then
  echo "Usage: ./scripts/pipeline.sh \"feature description\" [--profile fast|balanced|quality] [--resume]"
  exit 1
fi

PROFILE="${PROFILE/--profile=/}"
PROFILE="${PROFILE/--profile /}"

case "$PROFILE" in
  fast)     EFFORT="low"   ;;
  balanced) EFFORT="high"  ;;
  quality)  EFFORT="xhigh" ;;
  *)        EFFORT="high"; PROFILE="balanced" ;;
esac

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
MEMORY_BANK="$PROJECT_DIR/docs/memory-bank"
SPECS_DIR="$PROJECT_DIR/docs/specs"
STATE_FILE="$PROJECT_DIR/.claude/.pipeline-state"
LOG_FILE="$PROJECT_DIR/.claude/pipeline-log.md"

# ── Colors ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'

# ── Logging ───────────────────────────────────────────────────────────────────
log() {
  local phase="$1"; local status="$2"; local msg="$3"
  mkdir -p "$(dirname "$LOG_FILE")"
  echo "$(date '+%Y-%m-%d %H:%M:%S') | $phase | $status | $msg" >> "$LOG_FILE"
}

section() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

success() { echo -e "${GREEN}  ✅ $1${NC}"; }
warn()    { echo -e "${YELLOW}  ⚠️  $1${NC}"; }
fail()    { echo -e "${RED}  ❌ $1${NC}"; }
info()    { echo -e "  → $1"; }

# ── v3.2 : Verdict parsing (remplace grep "BLOCKERS|CRITIQUE") ────────────────
# Chaque agent read-only termine son rapport par un bloc fenced :
#   ```m-verdict
#   status: pass | needs_review | blockers_found
#   blockers: <int>
#   major: <int>
#   minor: <int>
#   continue_pipeline: true | false
#   summary: <one-liner>
#   ```
#
# Voir : @.claude/skills/m-agent-output-contract/SKILL.md

parse_verdict_field() {
  local file="$1"; local field="$2"
  [ -f "$file" ] || { echo ""; return; }
  # Extrait le bloc ```m-verdict ... ``` et cherche la ligne "field: value"
  awk '/^```m-verdict[[:space:]]*$/{flag=1; next} /^```[[:space:]]*$/{if(flag){exit}} flag' "$file" \
    | grep -E "^[[:space:]]*${field}:" \
    | head -1 \
    | sed -E "s/^[[:space:]]*${field}:[[:space:]]*//" \
    | xargs
}

has_blockers() {
  local file="$1"
  local status
  status=$(parse_verdict_field "$file" "status")
  if [ -z "$status" ]; then
    # Pas de bloc m-verdict → fallback prudent sur grep historique
    warn "Agent output sans bloc m-verdict — fallback grep (voir skill agent-output-contract)"
    grep -qiE 'BLOCKERS|CRITIQUE|ÉLEVÉ|blockers_found' "$file" 2>/dev/null
    return $?
  fi
  [ "$status" = "blockers_found" ]
}

# ── v3.2 : should_run en comparaison numérique (robuste) ──────────────────────
# Avant : [ "$phase" \>= "$RESUME_FROM" ] (string compare, fragile)
# Après : conversion en entier × 10 (pour gérer 01.5, 03.5)
phase_to_num() {
  local p="$1"
  # "01" → 10, "01.5" → 15, "06" → 60
  local integer=$(echo "$p" | cut -d. -f1 | sed 's/^0*//')
  integer="${integer:-0}"
  local decimal=$(echo "$p" | cut -sd. -f2)
  decimal="${decimal:-0}"
  echo $(( integer * 10 + decimal ))
}

should_run() {
  local phase="$1"
  [ "$(phase_to_num "$phase")" -ge "$(phase_to_num "$RESUME_FROM")" ]
}

# ── State machine ─────────────────────────────────────────────────────────────
write_state() {
  local phase="$1"; local status="$2"
  mkdir -p "$(dirname "$STATE_FILE")"
  cat > "$STATE_FILE" <<EOF
feature=$FEATURE
slug=$FEATURE_SLUG
profile=$PROFILE
phase=$phase
status=$status
updated=$(date '+%Y-%m-%d %H:%M:%S')
EOF
}

read_state() {
  [ -f "$STATE_FILE" ] || return 1
  # shellcheck disable=SC1090
  source "$STATE_FILE"
}

if [ -n "$RESUME_FLAG" ]; then
  if ! read_state; then
    fail "Pas d'état à reprendre (fichier .claude/.pipeline-state absent)"
    exit 1
  fi
  FEATURE="${feature:-$FEATURE}"
  FEATURE_SLUG="${slug:-}"
  PROFILE="${profile:-balanced}"
  RESUME_FROM="${phase:-01}"
  info "Reprise de la pipeline depuis phase $RESUME_FROM"
else
  FEATURE_SLUG=$(echo "$FEATURE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g')
  RESUME_FROM="01"
fi

# ── Checkpoint (human pause) ──────────────────────────────────────────────────
checkpoint() {
  local reason="$1"
  echo ""
  warn "PIPELINE PAUSED — Human checkpoint required"
  echo "  Reason: $reason"
  echo "  Reprendre plus tard : ./scripts/pipeline.sh --resume"
  echo ""
  read -p "  Press ENTER to continue, or Ctrl+C to abort: "
  echo ""
}

# ── Run a Claude task with budget hint ────────────────────────────────────────
run_task() {
  local agent="$1"; local prompt="$2"; local task_name="$3"; local budget="${4:-16000}"

  info "Running @$agent — $task_name (budget: ${budget} tokens, effort: $EFFORT)..."
  local START; START=$(date +%s)

  local full_prompt="[EFFORT=$EFFORT BUDGET=${budget}]

$prompt"

  if ! claude --agent "$agent" --print "$full_prompt" > /tmp/m-task-output.txt 2>&1; then
    fail "$task_name failed"
    cat /tmp/m-task-output.txt
    log "$task_name" "FAILED" "$agent"
    return 1
  fi

  local END; END=$(date +%s)
  local DURATION=$((END - START))
  success "$task_name — ${DURATION}s"
  log "$task_name" "OK" "$agent — ${DURATION}s"
}

# ── TDD RED verification ──────────────────────────────────────────────────────
verify_tdd_red() {
  info "Vérification TDD RED (tests compilent mais échouent)..."

  if ! pnpm typecheck --silent > /tmp/m-tdd-typecheck.log 2>&1; then
    fail "TDD RED invalide : les tests ne compilent pas"
    tail -20 /tmp/m-tdd-typecheck.log
    return 1
  fi

  if pnpm test --silent > /tmp/m-tdd-test.log 2>&1; then
    fail "TDD RED invalide : les tests PASSENT alors qu'ils devraient échouer"
    warn "Soit le tester n'a pas écrit de tests, soit le code est déjà là"
    return 1
  fi

  success "TDD RED valide : tests compilent et échouent comme attendu"
  return 0
}

# ── Quality gates (parallélisés) ──────────────────────────────────────────────
run_quality_gates() {
  section "QUALITY GATES (parallèle)"
  local failed=0

  (pnpm typecheck --silent 2>&1 > /tmp/m-qg-typecheck.log; echo $? > /tmp/m-qg-typecheck.exit) &
  local PID_TC=$!
  (pnpm lint --silent 2>&1 > /tmp/m-qg-lint.log; echo $? > /tmp/m-qg-lint.exit) &
  local PID_LINT=$!
  (pnpm test --silent 2>&1 > /tmp/m-qg-test.log; echo $? > /tmp/m-qg-test.exit) &
  local PID_TEST=$!
  (pnpm build 2>&1 > /tmp/m-qg-build.log; echo $? > /tmp/m-qg-build.exit) &
  local PID_BUILD=$!

  info "  4 quality gates en parallèle (typecheck, lint, test, build)..."
  wait $PID_TC $PID_LINT $PID_TEST $PID_BUILD

  local RC_TC; RC_TC=$(cat /tmp/m-qg-typecheck.exit 2>/dev/null || echo 1)
  local RC_LINT; RC_LINT=$(cat /tmp/m-qg-lint.exit 2>/dev/null || echo 1)
  local RC_TEST; RC_TEST=$(cat /tmp/m-qg-test.exit 2>/dev/null || echo 1)
  local RC_BUILD; RC_BUILD=$(cat /tmp/m-qg-build.exit 2>/dev/null || echo 1)

  [ "$RC_TC" = "0" ]    && success "TypeScript — 0 errors" || { fail "TypeScript errors"; tail -5 /tmp/m-qg-typecheck.log; failed=1; }
  [ "$RC_LINT" = "0" ]  && success "Lint — 0 errors"        || { fail "Lint errors";        tail -5 /tmp/m-qg-lint.log;      failed=1; }
  [ "$RC_TEST" = "0" ]  && success "Tests — all passing"    || { fail "Tests failing";      tail -5 /tmp/m-qg-test.log;      failed=1; }
  [ "$RC_BUILD" = "0" ] && success "Build — success"        || { fail "Build failed";       tail -5 /tmp/m-qg-build.log;     failed=1; }

  return $failed
}

# ── Audit parallèle (security + performance) ──────────────────────────────────
run_audits_parallel() {
  section "PHASE 05 — Security & Performance Audit (parallèle)"

  local SECURITY_PROMPT="Security audit for: \"$FEATURE\"
Check OWASP Top 10: A01 Broken Access Control, A02 Crypto, A03 Injection, A07 Auth failures.
Focus on: Clerk middleware, Zod validation, SQL injection risks, dangerouslySetInnerHTML, secrets in code.
Fix CRITICAL issues directly. For HIGH/MEDIUM, log to docs/memory-bank/errors-log.md with ERR-SEC-XXX format.
Output: summary of issues found (critical / high / medium / low counts) + actions taken.
Terminate with m-verdict block (see @.claude/skills/m-agent-output-contract/SKILL.md)."

  local PERF_PROMPT="Performance audit for: \"$FEATURE\"
Check: N+1 Prisma queries, bundle size, Web Vitals (LCP/FID/CLS), missing indexes, excessive 'use client'.
Fix HIGH impact issues directly. For MEDIUM/LOW, log to docs/memory-bank/errors-log.md with ERR-PERF-XXX format.
Output: findings summary + estimated gains (bundle kb saved, query ms saved).
Terminate with m-verdict block (see @.claude/skills/m-agent-output-contract/SKILL.md)."

  info "Security + Performance lancés en parallèle..."
  (claude --agent security-auditor --print "[EFFORT=$EFFORT BUDGET=16000]

$SECURITY_PROMPT" > /tmp/m-audit-sec.log 2>&1; echo $? > /tmp/m-audit-sec.exit) &
  local PID_SEC=$!
  (claude --agent performance-auditor --print "[EFFORT=$EFFORT BUDGET=16000]

$PERF_PROMPT" > /tmp/m-audit-perf.log 2>&1; echo $? > /tmp/m-audit-perf.exit) &
  local PID_PERF=$!

  wait $PID_SEC $PID_PERF

  local RC_SEC; RC_SEC=$(cat /tmp/m-audit-sec.exit 2>/dev/null || echo 1)
  local RC_PERF; RC_PERF=$(cat /tmp/m-audit-perf.exit 2>/dev/null || echo 1)

  if [ "$RC_SEC" = "0" ]; then
    success "Security audit terminé"
    log "Security Audit" "OK" "security-auditor"
  else
    fail "Security audit failed"
    cat /tmp/m-audit-sec.log
    log "Security Audit" "FAILED" "security-auditor"
  fi

  if [ "$RC_PERF" = "0" ]; then
    success "Performance audit terminé"
    log "Performance Audit" "OK" "performance-auditor"
  else
    fail "Performance audit failed"
    cat /tmp/m-audit-perf.log
    log "Performance Audit" "FAILED" "performance-auditor"
  fi

  # v3.2 : vérifier les verdicts pour bloquer si blockers trouvés
  if has_blockers /tmp/m-audit-sec.log; then
    warn "Security audit reports blockers — see /tmp/m-audit-sec.log"
    return 1
  fi
  if has_blockers /tmp/m-audit-perf.log; then
    warn "Performance audit reports blockers — see /tmp/m-audit-perf.log"
    return 1
  fi

  [ "$RC_SEC" = "0" ] && [ "$RC_PERF" = "0" ]
}

# ── v3.2 NEW : Review parallèle (phase 04) wrappé en fonction ─────────────────
# Fix du bug "local outside function" (v3.1)
run_review_parallel() {
  section "PHASE 04 — Review (design + code, parallèle)"

  local DESIGN_PROMPT="Review the implementation for: \"$FEATURE\"
Apply @.claude/skills/m-ux-standards/SKILL.md standards.
Check:
- 5 button states (normal, hover, active, focus, disabled)
- Skeleton loaders on all async operations > 200ms
- Empty states on all lists
- Error states with human-readable messages + recovery action
- Dark mode tested
- RTL Arabic layout correct (propriétés logiques, pas left/right)
- Touch targets ≥ 44×44px (mobile)
- No emojis as UI icons (use Lucide only)
- Print/PDF outputs if present : @.claude/skills/m-print-layout/SKILL.md compliance
Output: report with severity tags. Do NOT modify code (read-only agent).
Terminate with m-verdict block (see @.claude/skills/m-agent-output-contract/SKILL.md)."

  local CODE_PROMPT="Review code quality for: \"$FEATURE\"
Check: patterns, abstractions, duplication, naming, error handling, TypeScript strictness (any forbidden).
Output: report only (read-only agent). No security review (separate phase).
Terminate with m-verdict block (see @.claude/skills/m-agent-output-contract/SKILL.md)."

  info "Design review + Code review en parallèle..."
  (claude --agent design-reviewer --print "[EFFORT=$EFFORT BUDGET=16000]

$DESIGN_PROMPT" > /tmp/m-review-design.log 2>&1; echo $? > /tmp/m-review-design.exit) &
  local PID_DESIGN=$!
  (claude --agent reviewer --print "[EFFORT=$EFFORT BUDGET=16000]

$CODE_PROMPT" > /tmp/m-review-code.log 2>&1; echo $? > /tmp/m-review-code.exit) &
  local PID_CODE=$!

  wait $PID_DESIGN $PID_CODE

  success "Design review terminé"
  success "Code review terminé"

  # v3.2 : checkpoint si blockers dans l'un ou l'autre
  local review_has_blockers=0
  if has_blockers /tmp/m-review-design.log; then
    warn "Design review reports blockers"
    review_has_blockers=1
  fi
  if has_blockers /tmp/m-review-code.log; then
    warn "Code review reports blockers"
    review_has_blockers=1
  fi

  if [ $review_has_blockers -eq 1 ]; then
    checkpoint "Review blockers found — see /tmp/m-review-*.log"
  fi

  local FIXES_PROMPT="Read design review at /tmp/m-review-design.log and code review at /tmp/m-review-code.log.
Apply fixes for BLOCKER and MAJOR issues only. Leave MINOR/SUGGESTIONS for later.
Keep tests green after fixes."

  run_task "implementer" "$FIXES_PROMPT" "Apply review fixes" 32000

  if ! pnpm test --silent > /tmp/m-review-retest.log 2>&1; then
    fail "Tests failing after review fixes"
    checkpoint "Review fixes broke tests — fix before continuing"
  fi
}

# ── Main ──────────────────────────────────────────────────────────────────────
mkdir -p "$SPECS_DIR" "$MEMORY_BANK" "$(dirname "$STATE_FILE")"

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Maestro v3.2 — Automated Pipeline                     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo "  Feature : $FEATURE"
echo "  Profile : $PROFILE (effort: $EFFORT)"
echo "  Slug    : $FEATURE_SLUG"
echo "  Resume  : from phase $RESUME_FROM"
echo "  Started : $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

PIPELINE_START=$(date +%s)
log "PIPELINE" "START" "Feature: $FEATURE | Profile: $PROFILE"

# ────────────────────────────────────────────────────────────────────────────
# PHASE 01 — CONTEXT & SPEC
# ────────────────────────────────────────────────────────────────────────────
if should_run "01"; then
  write_state "01" "running"
  section "PHASE 01 — Context & Spec"

  CONTEXT_PROMPT="Read docs/memory-bank/project-brief.md and docs/memory-bank/current-sprint.md.
Analyze this feature request: \"$FEATURE\"
Flag any ambiguities. If requirements are clear, write a context summary to docs/memory-bank/current-sprint.md.
Output: CLEAR if ready to proceed, or list of questions if clarification needed.
Keep output under 8000 tokens.
Terminate with m-verdict block (see @.claude/skills/m-agent-output-contract/SKILL.md)."

  run_task "context-analyst" "$CONTEXT_PROMPT" "Context Analysis" 8000

  # v3.2 : needs_review dans le verdict déclenche le checkpoint
  STATUS=$(parse_verdict_field /tmp/m-task-output.txt "status")
  if [ "$STATUS" = "needs_review" ] || [ "$STATUS" = "blockers_found" ]; then
    checkpoint "Context analyst needs clarification — review /tmp/m-task-output.txt"
  elif [ -z "$STATUS" ]; then
    # Fallback historique si pas de verdict structuré
    if grep -qi "QUESTION\|UNCLEAR\|AMBIGUOUS" /tmp/m-task-output.txt 2>/dev/null; then
      checkpoint "Context analyst needs clarification (legacy grep) — review /tmp/m-task-output.txt"
    fi
  fi

  SPEC_PROMPT="Read docs/memory-bank/current-sprint.md.
Generate a complete spec for: \"$FEATURE\"
Follow @.claude/skills/m-specs-writing/SKILL.md standards.
Output:
1. PRD (condensed: overview, must-have features, constraints, out of scope)
2. User Stories in Given/When/Then format (P0 first, 3-7 criteria each, at least one negative path)
3. API endpoints needed
4. DB changes needed
5. Ordered task plan respecting dependencies
Save spec to docs/specs/$FEATURE_SLUG-spec.md
Update docs/memory-bank/current-sprint.md with the task plan."

  run_task "architect" "$SPEC_PROMPT" "Spec Generation" 32000
  success "Spec saved → docs/specs/$FEATURE_SLUG-spec.md"
fi

# ────────────────────────────────────────────────────────────────────────────
# PHASE 01.5 — CHALLENGE (quality profile only)
# ────────────────────────────────────────────────────────────────────────────
if [ "$PROFILE" = "quality" ] && should_run "01.5"; then
  write_state "01.5" "running"
  section "PHASE 01.5 — Adversarial Challenge"

  CHALLENGE_PROMPT="Read docs/specs/$FEATURE_SLUG-spec.md.
Apply cognitive protocol 5 (Adversarial Cognitive Friction).
Read @.claude/skills/m-cognitive-protocols/SKILL.md and @.claude/agents/devil-advocate.md.

Attack the spec along all 7 angles:
1. Hypothèses implicites non testées
2. Edge cases nucléaires
3. Dépendances critiques sans fallback
4. Sécurité contournée
5. Dette technique créée
6. Angles morts UX/business
7. Vecteur alternatif (au moins 1)

If after genuinely attacking all 7 angles nothing rises above MINOR, report status: pass
with evidence of what you attacked. Calibration beats quota.

Output a structured report with BLOCKERS, angles morts, hypothèses fragiles, vecteur alternatif.
Save report to docs/specs/$FEATURE_SLUG-challenge.md
Terminate with m-verdict block (see @.claude/skills/m-agent-output-contract/SKILL.md)."

  run_task "devil-advocate" "$CHALLENGE_PROMPT" "Adversarial Challenge" 16000

  if has_blockers /tmp/m-task-output.txt; then
    warn "Devil's advocate found blockers in spec"
    checkpoint "Review docs/specs/$FEATURE_SLUG-challenge.md — resolve blockers in spec before continuing"
  else
    success "No blockers found — proceeding to TDD"
  fi
fi

# ────────────────────────────────────────────────────────────────────────────
# PHASE 02 — TDD
# ────────────────────────────────────────────────────────────────────────────
if [ "$PROFILE" != "fast" ] && should_run "02"; then
  write_state "02" "running"
  section "PHASE 02 — TDD (Writing Failing Tests)"

  TDD_PROMPT="Read docs/specs/$FEATURE_SLUG-spec.md.
Write ALL tests BEFORE any implementation (RED phase).
- Unit tests for every business logic rule
- Integration tests for every API endpoint (happy path + error cases)
- Use Given/When/Then from User Stories as test cases
- Name each test: 'should [behavior] when [condition]'
CRITICAL: tests must COMPILE (typecheck passes) but FAIL (no implementation yet).
Do NOT create any implementation file yet — only tests.
Confirm when done: output test count and 'ALL TESTS FAILING ✓'"

  run_task "tester" "$TDD_PROMPT" "TDD — Write Failing Tests" 24000

  if ! verify_tdd_red; then
    fail "Phase TDD invalide — tests pas en état RED"
    checkpoint "Corriger l'état des tests avant de continuer (ils doivent compiler mais échouer)"
  fi
fi

# ────────────────────────────────────────────────────────────────────────────
# PHASE 03 — IMPLEMENT
# ────────────────────────────────────────────────────────────────────────────
if should_run "03"; then
  write_state "03" "running"
  section "PHASE 03 — Implementation"

  IMPL_PROMPT="Read docs/specs/$FEATURE_SLUG-spec.md and docs/memory-bank/patterns.md.
Implement the feature to make all tests pass (GREEN phase).
Standards to follow (read each skill):
- @.claude/skills/m-ux-standards/SKILL.md (tokens, micro-interactions, a11y)
- @.claude/skills/m-architecture-standards/SKILL.md (layering, boundaries)
- @.claude/skills/m-web-standards/SKILL.md OR @.claude/skills/m-mobile-standards/SKILL.md
- @.claude/skills/m-print-layout/SKILL.md if generating HTML for print/PDF

Implementation order:
1. DB migration (if needed)
2. API endpoints (Zod validation obligatoire)
3. Business logic (error handling systématique)
4. UI components (5 états: normal/hover/active/focus/disabled + loading/empty/error)
5. i18n keys synchronisées (fr/en/ar)

AUTO-UPGRADE to 'quality' profile if any of: auth/middleware.ts, Stripe webhook, DB migration, crypto.
Confirm when done: all tests passing, TypeScript clean, lint clean."

  run_task "implementer" "$IMPL_PROMPT" "Implementation" 64000

  info "Verifying tests pass after implementation..."
  if pnpm test --silent > /tmp/m-impl-test.log 2>&1; then
    success "All tests passing"
  else
    fail "Some tests still failing"
    tail -30 /tmp/m-impl-test.log
    checkpoint "Implementer couldn't make all tests pass — review and fix before continuing"
  fi
fi

# ────────────────────────────────────────────────────────────────────────────
# PHASE 04 — REVIEW (via run_review_parallel, v3.2 fix)
# ────────────────────────────────────────────────────────────────────────────
if [ "$PROFILE" != "fast" ] && should_run "04"; then
  write_state "04" "running"
  run_review_parallel
fi

# ────────────────────────────────────────────────────────────────────────────
# PHASE 05 — AUDIT (quality profile only)
# ────────────────────────────────────────────────────────────────────────────
if [ "$PROFILE" = "quality" ] && should_run "05"; then
  write_state "05" "running"
  run_audits_parallel || checkpoint "Audit failures — review logs before continuing"
fi

# ────────────────────────────────────────────────────────────────────────────
# PHASE 06 — SHIP
# ────────────────────────────────────────────────────────────────────────────
if should_run "06"; then
  write_state "06" "running"
  section "PHASE 06 — Ship"

  DOC_PROMPT="Update documentation for: \"$FEATURE\"
- Update README if feature changes usage
- Update API docs if new endpoints added
- Update docs/memory-bank/patterns.md if reusable patterns were created
- Update docs/memory-bank/current-sprint.md with status: DONE
Keep it concise — no marketing fluff."

  run_task "doc-writer" "$DOC_PROMPT" "Documentation" 8000

  if run_quality_gates; then
    BRANCH="feat/$FEATURE_SLUG"
    git checkout -b "$BRANCH" 2>/dev/null || git checkout "$BRANCH" 2>/dev/null

    LINES_CHANGED=$(git diff --stat main 2>/dev/null | tail -1 | grep -oE '[0-9]+ insertion' | head -1 | awk '{print $1}')
    if [ -n "$LINES_CHANGED" ] && [ "$LINES_CHANGED" -gt 300 ]; then
      warn "PR fait $LINES_CHANGED lignes — dépasse la règle max 300. Considérer un découpage."
    fi

    git add -A
    git commit -m "feat: $FEATURE

Implemented via Maestro v3.2 automated pipeline
Profile: $PROFILE (effort: $EFFORT)
Spec: docs/specs/$FEATURE_SLUG-spec.md

- All tests passing
- TypeScript clean
- RTL + dark mode + accessibility verified
- Lines changed: ${LINES_CHANGED:-?}" 2>/dev/null || true

    success "Branch ready: $BRANCH"
    info "Push: git push origin $BRANCH"
    log "PIPELINE" "SUCCESS" "Branch: $BRANCH"
    write_state "06" "done"
  else
    fail "Quality gates failed — fix issues before shipping"
    write_state "06" "failed"
    checkpoint "Review the failures above and fix before continuing"
    log "PIPELINE" "BLOCKED" "Quality gates failed"
  fi
fi

# ────────────────────────────────────────────────────────────────────────────
# Summary
# ────────────────────────────────────────────────────────────────────────────
PIPELINE_END=$(date +%s)
TOTAL=$((PIPELINE_END - PIPELINE_START))
MINUTES=$((TOTAL / 60))
SECONDS=$((TOTAL % 60))

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Pipeline Complete — ${MINUTES}m ${SECONDS}s                              ${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo "  Feature : $FEATURE"
echo "  Profile : $PROFILE"
echo "  Branch  : feat/$FEATURE_SLUG"
echo "  Spec    : docs/specs/$FEATURE_SLUG-spec.md"
echo "  Log     : .claude/pipeline-log.md"
echo "  State   : .claude/.pipeline-state (delete to start fresh)"
echo ""
