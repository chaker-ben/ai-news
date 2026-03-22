#!/bin/bash
# Bloque les commandes bash dangereuses
DANGEROUS_PATTERNS=("rm -rf /" "rm -rf ~" "chmod 777" "curl.*| bash" "wget.*| bash" "> /dev/sda")
CMD="${CLAUDE_BASH_COMMAND:-}"
for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if echo "$CMD" | grep -q "$pattern"; then
    echo "🚫 BLOQUÉ: commande dangereuse détectée: $pattern" >&2
    exit 2
  fi
done
exit 0
