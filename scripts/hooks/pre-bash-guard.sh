#!/bin/bash
# Hook pre-bash : bloque les commandes dangereuses
# Contrat Claude Code : l'input de l'outil arrive en JSON sur stdin
# ({"tool_name":"Bash","tool_input":{"command":...}}). On lit stdin en
# priorité, avec repli sur les anciennes variables d'env (compat).
# Sans cette lecture stdin, le garde ne recevait rien => inerte.

INPUT=""
if [ ! -t 0 ]; then
  INPUT=$(cat 2>/dev/null)
fi
CMD=$(printf '%s' "$INPUT" | python3 -c 'import sys,json
try: print(json.load(sys.stdin).get("tool_input",{}).get("command",""))
except Exception: print("")' 2>/dev/null)
[ -z "$CMD" ] && CMD="${CLAUDE_BASH_COMMAND:-${CLAUDE_TOOL_INPUT_COMMAND:-}}"

if [[ -z "$CMD" ]]; then
  exit 0
fi

# Block rm recursive+force in any flag combination order
if echo "$CMD" | grep -qE 'rm\s+.*(-rf|-fr|-r\s+-f|-f\s+-r|--recursive\s+--force|--force\s+--recursive).*(/\s*$|~\s*$|\$HOME)'; then
  echo "BLOQUÉ: suppression récursive dangereuse détectée" >&2
  exit 2
fi

# Block piped remote execution
if echo "$CMD" | grep -qE '(curl|wget)[^|]*\|\s*(ba)?sh'; then
  echo "BLOQUÉ: exécution de code distant détectée" >&2
  exit 2
fi

# Block chmod 777
if echo "$CMD" | grep -qE 'chmod\s+(777|a\+rwx)'; then
  echo "BLOQUÉ: permissions dangereuses (chmod 777)" >&2
  exit 2
fi

# Block writing to system disk
if echo "$CMD" | grep -qE '>\s*/dev/sd[a-z]'; then
  echo "BLOQUÉ: écriture sur disque système détectée" >&2
  exit 2
fi

# Block reading .env secrets
if echo "$CMD" | grep -qE 'cat\s+\.env$|cat\s+\.env\.|echo\s+\$[A-Z_]*(SECRET|PASSWORD|TOKEN|API_KEY)'; then
  echo "BLOQUÉ: lecture de secrets détectée" >&2
  exit 2
fi

exit 0
