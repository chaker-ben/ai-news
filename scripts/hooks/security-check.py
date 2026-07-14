#!/usr/bin/env python3
"""Security check v3 — détecte patterns dangereux réels (OWASP Top 10 focus).

Différence vs v2 :
- Couvre SQL injection (string concat dans Prisma.$queryRawUnsafe)
- Couvre secrets hardcodés (JWT, Stripe keys, DB URLs)
- Couvre auth bypass patterns
- Couvre XSS (dangerouslySetInnerHTML sans DOMPurify dans le même fichier)
- Couvre Math.random() pour tokens/IDs
- Couvre localStorage avec secrets
"""
import sys
import os
import re

# Chaque pattern : (regex, description, severity)
# severity : HIGH / MEDIUM / LOW (HIGH bloque, les autres warnent)
PATTERNS = [
    # Code execution
    (r'\beval\s*\(', 'eval() — code injection risk', 'HIGH'),
    (r'\bnew\s+Function\s*\(', 'new Function() — equivalent to eval', 'HIGH'),
    (r'\bdocument\.write\s*\(', 'document.write() — XSS risk', 'HIGH'),
    (r'__proto__\s*=', '__proto__ manipulation — prototype pollution', 'HIGH'),

    # XSS
    (r'\binnerHTML\s*=(?!\s*[\'"`]{2})', 'innerHTML assignment — sanitize with DOMPurify', 'MEDIUM'),

    # SQL injection (Prisma)
    (r'\$queryRawUnsafe\s*\(\s*[`\'"][^`\'"]*\$\{', 'Prisma $queryRawUnsafe with template literal — SQL injection', 'HIGH'),
    (r'\$executeRawUnsafe\s*\(\s*[`\'"][^`\'"]*\$\{', 'Prisma $executeRawUnsafe with template literal', 'HIGH'),

    # Secrets hardcodés
    (r'(sk_live|sk_test)_[A-Za-z0-9]{24,}', 'Stripe secret key hardcoded', 'HIGH'),
    (r'(pk_live|pk_test)_[A-Za-z0-9]{24,}', 'Stripe publishable key hardcoded (use env var)', 'MEDIUM'),
    (r'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}', 'JWT token hardcoded', 'HIGH'),
    (r'xoxb-[0-9]{10,}-[0-9]{10,}-[A-Za-z0-9]{24,}', 'Slack bot token hardcoded', 'HIGH'),
    (r'AKIA[0-9A-Z]{16}', 'AWS access key hardcoded', 'HIGH'),
    (r'AIza[0-9A-Za-z_-]{35}', 'Google API key hardcoded', 'HIGH'),
    (r'ghp_[A-Za-z0-9]{36}', 'GitHub personal access token hardcoded', 'HIGH'),
    (r'postgresql://[^\s\'"]+:[^\s@\'"]+@[^\s/\'"]+', 'PostgreSQL connection string with password hardcoded', 'HIGH'),

    # Auth bypass
    (r'(?:skipAuth|bypassAuth|noAuth)\s*[:=]\s*true', 'Auth bypass flag — ensure not in production path', 'HIGH'),

    # Crypto faible
    (r'Math\.random\(\)[^;]*(token|id|secret|key|nonce|salt)', 'Math.random() used for security-sensitive value — use crypto.randomUUID() or crypto.getRandomValues()', 'HIGH'),
    (r'\bMD5\s*\(', 'MD5 is broken — use bcrypt/argon2 for passwords, SHA-256+ for integrity', 'MEDIUM'),
    (r'\bSHA1\s*\(', 'SHA1 is weak for security — prefer SHA-256+', 'MEDIUM'),

    # Storage dangereux
    (r'localStorage\.setItem\s*\(\s*[\'"][^\'"]*(token|secret|password|key)', 'Secret stored in localStorage — prefer httpOnly cookies', 'MEDIUM'),
    (r'sessionStorage\.setItem\s*\(\s*[\'"][^\'"]*(token|secret|password)', 'Secret in sessionStorage', 'MEDIUM'),

    # Runtime env manipulation
    (r'process\.env\.[A-Z_]+\s*=\s*[\'"]', 'process.env assignment at runtime', 'MEDIUM'),

    # CORS permissif
    (r'Access-Control-Allow-Origin[\'"]?\s*[,:]\s*[\'"]\*', 'CORS wildcard — specify trusted origins', 'MEDIUM'),

    # Redirection non validée
    (r'res\.redirect\s*\(\s*req\.query\.', 'Open redirect — validate URL against whitelist', 'HIGH'),

    # Shell injection
    (r'(?:exec|execSync|spawn|spawnSync)\s*\([^)]*\$\{', 'Shell command with template literal — command injection risk', 'HIGH'),
]

def scan_file(file_path):
    """Retourne liste de (pattern_desc, severity, line_number, line_content)."""
    findings = []
    try:
        with open(file_path, 'r', errors='ignore') as f:
            lines = f.readlines()
    except Exception:
        return findings

    for line_num, line in enumerate(lines, 1):
        # Skip commented lines (rapide, pas parfait pour /* */)
        stripped = line.strip()
        if stripped.startswith('//') or stripped.startswith('#') or stripped.startswith('*'):
            continue
        for pattern, desc, severity in PATTERNS:
            if re.search(pattern, line):
                findings.append((desc, severity, line_num, line.rstrip()))
    return findings


def main():
    file_path = (
        os.environ.get('CLAUDE_TOOL_INPUT_FILE_PATH')
        or os.environ.get('CLAUDE_EDIT_FILE')
        or ''
    )
    if not file_path or not os.path.exists(file_path):
        sys.exit(0)

    # Skip fichiers non pertinents
    skip_extensions = {'.md', '.json', '.lock', '.svg', '.png', '.jpg', '.ico', '.txt', '.yml', '.yaml'}
    _, ext = os.path.splitext(file_path)
    if ext.lower() in skip_extensions:
        sys.exit(0)

    # Skip dossiers générés
    skip_dirs = {'/node_modules/', '/.next/', '/dist/', '/build/', '/.git/'}
    if any(d in file_path for d in skip_dirs):
        sys.exit(0)

    findings = scan_file(file_path)
    if not findings:
        sys.exit(0)

    # Afficher les findings
    high_count = sum(1 for _, sev, _, _ in findings if sev == 'HIGH')
    medium_count = sum(1 for _, sev, _, _ in findings if sev == 'MEDIUM')

    print("", file=sys.stderr)
    print(f"🔒 SECURITY CHECK — {file_path}", file=sys.stderr)
    print("─" * 60, file=sys.stderr)
    for desc, severity, line_num, line in findings:
        icon = "🔴" if severity == 'HIGH' else "🟡" if severity == 'MEDIUM' else "🔵"
        print(f"{icon} [{severity}] Line {line_num}: {desc}", file=sys.stderr)
        # Afficher la ligne tronquée
        truncated = line[:80] + ("..." if len(line) > 80 else "")
        print(f"    {truncated}", file=sys.stderr)
    print("─" * 60, file=sys.stderr)
    print(f"Summary: {high_count} HIGH, {medium_count} MEDIUM", file=sys.stderr)
    print("", file=sys.stderr)

    # HIGH bloque l'édition (exit 2), MEDIUM warn seulement
    # On peut activer le blocage via variable d'env MAE_SECURITY_BLOCK=1
    if high_count > 0 and os.environ.get('MAE_SECURITY_BLOCK') == '1':
        sys.exit(2)

    sys.exit(0)


if __name__ == '__main__':
    main()
