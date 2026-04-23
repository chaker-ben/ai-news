#!/bin/bash
# Hook post-tool : suit l'usage du contexte et avertit avant la dégradation
#
# Opus 4.7 : fenêtre 1M tokens — seuils relevés significativement
# (vs 150/200 avec Sonnet 4.x)

SESSION_FILE="${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/session-tokens.txt"

COUNT=$(cat "$SESSION_FILE" 2>/dev/null || echo "0")
COUNT=$((COUNT + 1))
echo "$COUNT" > "$SESSION_FILE"

# Warn at 500 tool calls (~90 min heavy work with Opus 4.7)
if [ "$COUNT" -eq 500 ]; then
  echo ""
  echo "⚠️  CONTEXT WARNING: $COUNT tool calls this session"
  echo "   → Consider /clear soon to maintain output quality"
  echo ""
elif [ "$COUNT" -eq 800 ]; then
  echo ""
  echo "🔴 CONTEXT ROT RISK: $COUNT tool calls — quality may degrade"
  echo "   → Run /clear NOW, then resume with:"
  echo "      'Read @docs/memory-bank/current-sprint.md and continue: [task]'"
  echo ""
elif [ "$COUNT" -gt 800 ] && [ $((COUNT % 100)) -eq 0 ]; then
  echo ""
  echo "🔴 CONTEXT ROT: $COUNT tool calls — /clear strongly recommended"
  echo ""
fi

exit 0
