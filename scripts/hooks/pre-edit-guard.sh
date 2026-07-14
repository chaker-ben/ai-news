#!/bin/bash
# Pre-edit guard — bloque l'édition de fichiers sensibles
# Contrat Claude Code : l'input de l'outil arrive en JSON sur stdin
# ({"tool_input":{"file_path":...}}). On lit stdin en priorité avec
# repli sur les anciennes variables d'env (compat). Sans la lecture
# stdin, FILE restait vide => garde inerte.

INPUT=""
if [ ! -t 0 ]; then
  INPUT=$(cat 2>/dev/null)
fi
FILE=$(printf '%s' "$INPUT" | python3 -c 'import sys,json
try: print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))
except Exception: print("")' 2>/dev/null)
[ -z "$FILE" ] && FILE="${CLAUDE_TOOL_INPUT_FILE_PATH:-${CLAUDE_EDIT_FILE:-}}"

# Pas de fichier passé → laisser passer (ne pas bloquer gratuitement)
[ -z "$FILE" ] && exit 0

# Extraire le nom de base pour matcher même avec chemin absolu
BASENAME="$(basename "$FILE")"

# Liste de patterns interdits (glob-style)
PROTECTED_PATTERNS=(
  ".env"
  ".env.*"
  "*.pem"
  "*.key"
  "*.p12"
  "*.pfx"
  "id_rsa"
  "id_ed25519"
  "*.gpg"
)

for pattern in "${PROTECTED_PATTERNS[@]}"; do
  case "$BASENAME" in
    $pattern)
      echo "🚫 BLOQUÉ: édition de fichier sensible interdite: $BASENAME" >&2
      echo "    → Utiliser .env.example pour documenter les variables" >&2
      exit 2
      ;;
  esac
done

# Bloquer les écritures dans node_modules, .next, dist
case "$FILE" in
  */node_modules/*|*/.next/*|*/dist/*|*/build/*)
    echo "🚫 BLOQUÉ: édition dans un dossier généré: $FILE" >&2
    exit 2
    ;;
esac

exit 0
