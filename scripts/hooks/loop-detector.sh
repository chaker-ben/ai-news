#!/bin/bash
# ============================================================
# Maestro v3.5.2 — loop-detector.sh (SILENT version)
#
# Hook: Stop (déclenché quand Claude termine son tour)
#
# RÈGLE D'OR : ce hook ne DOIT JAMAIS écrire sur stdout ni stderr.
# Tout output peut être réinterprété par Claude Code comme un signal
# de continuation, créant la boucle infinie qu'on cherche à détecter.
#
# Mécanisme :
# - Log silencieusement les messages de fin de tour
# - Si boucle détectée, écrit UNIQUEMENT dans un fichier marker
# - Aucun output sur stdout/stderr, même en cas d'erreur
# - Exit 0 toujours, immédiatement
#
# Le user voit le bug via :
# - ls ~/.m-loop-alerts/ (alertes globales par projet)
# - cat <projet>/.claude/loop-detector/.STOP-LOOP-DETECTED si présent
# - /hook-check command pour diagnostic
# ============================================================

# Toujours exit 0, capture toutes les erreurs en silence
{

PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Pas un projet Maestro → sortir silencieusement
if [ ! -d "$PROJECT_ROOT/.claude" ]; then
  exit 0
fi

# Lire le message depuis stdin si disponible (non-bloquant)
CURRENT_MSG=""
if [ ! -t 0 ]; then
  # Read avec timeout pour éviter blocage
  CURRENT_MSG=$(timeout 1 cat 2>/dev/null || echo "")
fi

# Pas de message → rien à faire
if [ -z "$CURRENT_MSG" ]; then
  exit 0
fi

LOG_DIR="$PROJECT_ROOT/.claude/loop-detector"
LOG_FILE="$LOG_DIR/recent-messages.log"
STOP_SIGNAL="$LOG_DIR/.STOP-LOOP-DETECTED"
ALERTS_DIR="$HOME/.m-loop-alerts"

mkdir -p "$LOG_DIR" "$ALERTS_DIR" 2>/dev/null

# Normaliser (1ère ligne, max 200 chars, sans espaces, lowercase)
NORMALIZED=$(echo "$CURRENT_MSG" | head -1 | cut -c1-200 | tr -d '[:space:]' | tr 'A-Z' 'a-z' 2>/dev/null)

# Append au log (rotation à 20 lignes)
echo "$NORMALIZED" >> "$LOG_FILE" 2>/dev/null
LINE_COUNT=$(wc -l < "$LOG_FILE" 2>/dev/null || echo 0)
if [ "$LINE_COUNT" -gt 20 ]; then
  tail -20 "$LOG_FILE" > "$LOG_FILE.tmp" 2>/dev/null && mv "$LOG_FILE.tmp" "$LOG_FILE" 2>/dev/null
fi

# Compter les répétitions dans les 5 derniers messages
RECENT_COUNT=$(tail -5 "$LOG_FILE" 2>/dev/null | grep -cFx "$NORMALIZED" 2>/dev/null || echo 0)

# Seuil 5 : créer le signal marker (silencieusement)
if [ "$RECENT_COUNT" -ge 5 ]; then
  PROJECT_NAME=$(basename "$PROJECT_ROOT")
  ALERT_FILE="$ALERTS_DIR/$PROJECT_NAME-$(date +%Y%m%d-%H%M%S).alert"

  # Signal local au projet
  cat > "$STOP_SIGNAL" 2>/dev/null << EOF
LOOP DETECTED at $(date '+%Y-%m-%d %H:%M:%S')
Projet : $PROJECT_NAME
Path : $PROJECT_ROOT

Le message suivant a été répété $RECENT_COUNT fois consécutivement :
"$CURRENT_MSG"

ACTIONS RECOMMANDÉES :
1. Sortir de Claude Code (/exit)
2. Désactiver le hook fautif (probablement loop-detector lui-même) :
   chmod -x $PROJECT_ROOT/scripts/hooks/loop-detector.sh
3. /hook-check pour identifier la cause
4. Quand résolu : rm $STOP_SIGNAL

Note : ce hook NE PEUT PAS arrêter Claude, seulement signaler.
EOF

  # Alerte globale dans ~/.m-loop-alerts/
  cp "$STOP_SIGNAL" "$ALERT_FILE" 2>/dev/null
fi

} 2>/dev/null

# TOUJOURS exit 0, jamais d'output
exit 0
