#!/usr/bin/env python3
"""Security check — détecte les patterns dangereux dans les fichiers édités."""
import sys, os, re

DANGEROUS_PATTERNS = [
    (r'eval\(', 'eval() usage'),
    (r'innerHTML\s*=', 'innerHTML assignment'),
    (r'dangerouslySetInnerHTML', 'dangerouslySetInnerHTML without DOMPurify'),
    (r'document\.write\(', 'document.write()'),
    (r'__proto__', '__proto__ manipulation'),
    (r'process\.env\.[A-Z_]+\s*=', 'env variable assignment at runtime'),
]

file_path = os.environ.get('CLAUDE_EDIT_FILE', '')
if not file_path or not os.path.exists(file_path):
    sys.exit(0)

with open(file_path, 'r', errors='ignore') as f:
    content = f.read()

warnings = []
for pattern, description in DANGEROUS_PATTERNS:
    if re.search(pattern, content):
        warnings.append(f'⚠️  Security warning: {description} in {file_path}')

for w in warnings:
    print(w, file=sys.stderr)

sys.exit(0)
