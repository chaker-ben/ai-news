#!/bin/bash
# Hook post-edit : détecte les emojis UI ajoutés dans du JSX/TSX
# Déclenché automatiquement après chaque édition de fichier .tsx/.jsx

FILE="$1"

# Ne vérifier que les fichiers React
if [[ ! "$FILE" =~ \.(tsx|jsx)$ ]]; then
  exit 0
fi

# Liste d'emojis courants utilisés comme icônes UI
EMOJI_PATTERN='[⏳📋🔄🔀✨✅❌⚙️📊🔔🏠👤🔍💡⚠️📁📂🚀💰🎯🔒🔓📝✏️🗑️➕➖🔗📤📥🔧🛠️💬🌐🎨🖼️📱💻🌟⭐💎🏆🎉🎊📍🕐📅👁️💾📨🔑ℹ️📈📉🛒📦🚗👥]'

FOUND=$(grep -n "$EMOJI_PATTERN" "$FILE" 2>/dev/null)

if [ -n "$FOUND" ]; then
  echo ""
  echo "⚠️  EMOJI DÉTECTÉ DANS $FILE"
  echo "─────────────────────────────────────────"
  echo "$FOUND"
  echo ""
  echo "Les emojis ne sont pas des icônes UI professionnelles."
  echo "→ Remplacer par des icônes Lucide : /fix-emojis"
  echo "→ Référence complète : .claude/skills/ux-standards/SKILL.md (Section 13)"
  echo "─────────────────────────────────────────"
  echo ""
  # Warning seulement — ne bloque pas l'édition
  exit 0
fi
