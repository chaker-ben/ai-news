#!/bin/bash
# Vérifie qu'on n'édite pas des fichiers protégés
PROTECTED=(".env" ".env.local" ".env.production" "*.pem" "*.key")
FILE="${CLAUDE_EDIT_FILE:-}"
for pattern in "${PROTECTED[@]}"; do
  if [[ "$FILE" == $pattern ]]; then
    echo "🚫 BLOQUÉ: édition de fichier protégé: $FILE" >&2
    exit 2
  fi
done
exit 0
