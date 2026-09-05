#!/bin/bash
# Hook post-edit : détecte les emojis UI ajoutés dans du JSX/TSX
# Déclenché après chaque édition de fichier .tsx/.jsx (warning non-bloquant).
#
# Contrat Claude Code : input de l'outil en JSON sur stdin
# ({"tool_input":{"file_path":...}}). On lit stdin en priorité, avec repli
# sur l'argument $1 / l'ancienne variable d'env. Sans ça, FILE restait vide
# => hook inerte.

INPUT=""
if [ ! -t 0 ]; then
  INPUT=$(cat 2>/dev/null)
fi
FILE=$(printf '%s' "$INPUT" | python3 -c 'import sys,json
try: print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))
except Exception: print("")' 2>/dev/null)
[ -z "$FILE" ] && FILE="${CLAUDE_TOOL_INPUT_FILE_PATH:-$1}"

# Ne vérifier que les fichiers React existants
[ -z "$FILE" ] && exit 0
if [[ ! "$FILE" =~ \.(tsx|jsx)$ ]]; then
  exit 0
fi
[ -f "$FILE" ] || exit 0

# Emojis courants utilisés comme icônes UI
EMOJI_PATTERN='[⏳📋🔄🔀✨✅❌⚙️📊🔔🏠👤🔍💡⚠️📁📂🚀💰🎯🔒🔓📝✏️🗑️➕➖🔗📤📥🔧🛠️💬🌐🎨🖼️📱💻🌟⭐💎🏆🎉🎊📍🕐📅👁️💾📨🔑ℹ️📈📉🛒📦🚗👥]'

FOUND=$(grep -nE "$EMOJI_PATTERN" "$FILE" 2>/dev/null)

if [ -n "$FOUND" ]; then
  MSG="[Maestro] Emoji(s) UI détecté(s) dans $FILE. Les emojis ne sont pas des icônes professionnelles — proposer de les remplacer par des icônes Lucide (commande /fix-emojis). Réf : .claude/skills/m-ux-standards/SKILL.md (Section 13). Lignes :
$FOUND"
  # Sortie structurée -> visible par Claude (PostToolUse additionalContext)
  printf '%s' "$MSG" | python3 -c 'import sys,json; print(json.dumps({"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":sys.stdin.read()}}))' 2>/dev/null
fi

# Warning uniquement — ne bloque jamais l'édition
exit 0
