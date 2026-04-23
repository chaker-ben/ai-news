#!/bin/bash
# Hook post-edit : détecte les anti-patterns print A4 dans les fichiers HTML
# Déclenché automatiquement après chaque édition de fichier .html / .htm
# Warning non-bloquant, pointe vers @.claude/skills/print-layout/SKILL.md
#
# Référence : .claude/skills/print-layout/SKILL.md (sections 1, 2, 3, 7)

FILE="${CLAUDE_TOOL_INPUT_FILE_PATH:-$1}"

# Garde-fous : fichier existe et est du HTML
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  exit 0
fi
if [[ ! "$FILE" =~ \.(html|htm)$ ]]; then
  exit 0
fi

# Ne déclenche QUE sur les HTML qui ressemblent à du print A4
# Critère : présence d'une règle @page OU d'une classe .pg / .pbody / .pftr
if ! grep -qE '@page|class="pg"|class="pbody"|class="pftr"|class="phdr"' "$FILE" 2>/dev/null; then
  exit 0
fi

declare -a ISSUES

# ── Anti-pattern 1 : min-height sur une page ─────────────────────────────────
# Le guide interdit min-height car il casse le page-break en impression.
if grep -nE 'min-height:\s*(297mm|100vh|100%)' "$FILE" | grep -vE '^\s*//|^\s*\*' > /tmp/aidd-print-minh 2>/dev/null; then
  if [ -s /tmp/aidd-print-minh ]; then
    while IFS= read -r line; do
      ISSUES+=("min-height détecté — remplacer par height (SKILL §1) :: $line")
    done < /tmp/aidd-print-minh
  fi
fi

# ── Anti-pattern 2 : position:absolute sur footer ─────────────────────────────
# Le footer doit rester dans le flow flex (flex-shrink: 0).
if grep -nE 'position:\s*absolute' "$FILE" > /tmp/aidd-print-abs 2>/dev/null; then
  if [ -s /tmp/aidd-print-abs ]; then
    # Ne flag que si c'est proche d'un contexte footer
    while IFS= read -r line; do
      if echo "$line" | grep -qiE 'footer|pftr|\.pftr'; then
        ISSUES+=("position:absolute sur footer — utiliser flex-shrink:0 (SKILL §2) :: $line")
      fi
    done < /tmp/aidd-print-abs
  fi
fi

# ── Anti-pattern 3 : .pg sans overflow:hidden à proximité ────────────────────
# Vérif structurelle : la classe .pg doit avoir overflow:hidden dans son bloc CSS.
# On isole le bloc CSS de .pg avec awk (BRE, pas de \s → [[:space:]]).
if grep -q 'class="pg"' "$FILE" 2>/dev/null; then
  PG_BLOCK=$(awk '/^[[:space:]]*\.pg[[:space:]]*\{/,/\}/' "$FILE")
  if [ -n "$PG_BLOCK" ] && ! echo "$PG_BLOCK" | grep -qE 'overflow:[[:space:]]*hidden'; then
    ISSUES+=("classe .pg sans overflow:hidden visible dans son CSS (SKILL §3)")
  fi
fi

# ── Anti-pattern 4 : page-break manquant sur .pg ─────────────────────────────
if grep -q 'class="pg"' "$FILE" 2>/dev/null; then
  PG_BLOCK=$(awk '/^[[:space:]]*\.pg[[:space:]]*\{/,/\}/' "$FILE")
  if [ -n "$PG_BLOCK" ] && ! echo "$PG_BLOCK" | grep -q 'page-break'; then
    ISSUES+=("classe .pg sans page-break-after/inside (SKILL §3)")
  fi
fi

# ── Anti-pattern 5 : @page manquant mais structure print présente ─────────────
if grep -qE 'class="pg"' "$FILE" && ! grep -q '@page' "$FILE"; then
  ISSUES+=("Structure print détectée mais règle @page absente (SKILL §3)")
fi

# Cleanup temp files
rm -f /tmp/aidd-print-minh /tmp/aidd-print-abs 2>/dev/null

# ── Output ───────────────────────────────────────────────────────────────────
if [ ${#ISSUES[@]} -gt 0 ]; then
  echo "" >&2
  echo "🖨️  PRINT CHECK — $FILE" >&2
  echo "─────────────────────────────────────────────" >&2
  for issue in "${ISSUES[@]}"; do
    echo "⚠️  $issue" >&2
  done
  echo "─────────────────────────────────────────────" >&2
  echo "Guide complet : @.claude/skills/print-layout/SKILL.md" >&2
  echo "Template prêt : .claude/skills/print-layout/templates/structural.css" >&2
  echo "" >&2
fi

# Warning seulement — ne bloque pas l'édition (cohérent avec post-edit-emoji-check)
exit 0
