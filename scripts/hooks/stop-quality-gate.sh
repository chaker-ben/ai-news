#!/bin/bash
# stop-quality-gate.sh — vérifie RÉELLEMENT que la tâche est complète
# Appelé par le hook Stop. Retourne exit 2 si quality gates échouent.
#
# Différence vs prompt Stop : on ne demande pas à Claude de se noter,
# on EXÉCUTE les gates.

set +e

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR" || exit 0

# ── Prévention de boucle infinie (contrat du hook Stop) ──────────────
# Claude Code envoie un JSON sur stdin contenant "stop_hook_active".
# S'il vaut true, Claude est DÉJÀ en continuation forcée par un Stop
# précédent : on autorise l'arrêt (exit 0) pour ne JAMAIS boucler.
# Sans ce garde-fou, un exit 2 répété re-poste le message à l'infini.
STDIN_JSON=""
if [ ! -t 0 ]; then
  STDIN_JSON=$(timeout 1 cat 2>/dev/null || true)
fi
if printf '%s' "$STDIN_JSON" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  exit 0
fi

# Skip si pas de package.json (pas un projet Node)
[ -f "package.json" ] || exit 0

# Skip si pas de script test (optionnel)
HAS_TEST=$(node -e "try{const p=require('./package.json');console.log(p.scripts&&p.scripts.test?'1':'0')}catch(e){console.log('0')}" 2>/dev/null)
HAS_TYPECHECK=$(node -e "try{const p=require('./package.json');console.log(p.scripts&&p.scripts.typecheck?'1':'0')}catch(e){console.log('0')}" 2>/dev/null)

FAILED=0
REPORT=""

# TypeScript strict
if [ "$HAS_TYPECHECK" = "1" ]; then
  if ! pnpm typecheck --silent > /tmp/m-stop-tc.log 2>&1; then
    FAILED=1
    REPORT="$REPORT\n❌ TypeScript errors (pnpm typecheck failed)"
  fi
fi

# Tests passent
if [ "$HAS_TEST" = "1" ]; then
  # Détecter s'il y a au moins un fichier de test — sinon on skip silencieusement
  TEST_FILES=$(find . -type f \( -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.spec.tsx" \) -not -path "./node_modules/*" -not -path "./.next/*" 2>/dev/null | head -1)
  if [ -n "$TEST_FILES" ]; then
    if ! pnpm test --silent > /tmp/m-stop-test.log 2>&1; then
      FAILED=1
      REPORT="$REPORT\n❌ Tests failing (pnpm test failed)"
    fi
  fi
fi

# TODO/FIXME non résolus dans les fichiers récemment modifiés
RECENT_TODOS=$(git diff --cached 2>/dev/null | grep -cE '^\+.*(TODO|FIXME|XXX)' || echo 0)
if [ "$RECENT_TODOS" -gt 5 ]; then
  REPORT="$REPORT\n⚠️  $RECENT_TODOS nouveaux TODO/FIXME/XXX dans le diff — créer une tâche de suivi"
fi

if [ "$FAILED" = "1" ]; then
  echo "" >&2
  echo "🔴 QUALITY GATES FAILED — la session ne peut pas se terminer proprement" >&2
  echo -e "$REPORT" >&2
  echo "" >&2
  echo "Fix requis avant de conclure. Logs :" >&2
  echo "  /tmp/m-stop-tc.log" >&2
  echo "  /tmp/m-stop-test.log" >&2
  exit 2
fi

exit 0
