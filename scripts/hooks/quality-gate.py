#!/usr/bin/env python3
"""
Maestro v4.0.1 — quality-gate.py

Hook: PreToolUse(Bash) when the bash command is `git commit *`.

Reads .claude/quality-gates.json from the project root. If not present
or level=off, exits 0 silently. Otherwise runs the configured checks
and exits 2 if any check fails (blocks the commit).

Adapted from EasyDev v1.0.0 (MIT) quality-gate.py by ARABII.

OUTPUT POLICY:
- On success (gate passes): silent, exit 0
- On failure: print a structured report to stderr, exit 2
- On error reading config: print warning to stderr, exit 0 (fail open
  on config issues — don't block commits because of bad json)

This hook is intentionally CAREFUL about output. Unlike SessionStart,
PreToolUse hooks should not produce stray stdout that Claude might
re-interpret. We use stderr for messages, and exit code for the signal.
"""

import json
import os
import re
import subprocess
import sys
from pathlib import Path

# Bypass mechanism
BYPASS_ENV = "MAE_QUALITY_GATE_BYPASS"

# Secret patterns (regex)
SECRET_PATTERNS = [
    (r'sk_(live|test)_[A-Za-z0-9]{20,}', 'Stripe key'),
    (r'ghp_[A-Za-z0-9]{36,}', 'GitHub PAT (classic)'),
    (r'github_pat_[A-Za-z0-9_]{20,}', 'GitHub PAT (fine-grained)'),
    (r'xox[bp]-[A-Za-z0-9-]{10,}', 'Slack token'),
    (r'AKIA[0-9A-Z]{16}', 'AWS access key'),
    (r'-----BEGIN (RSA|EC|OPENSSH|DSA) PRIVATE KEY-----', 'Private key'),
    (r'AIza[0-9A-Za-z\-_]{35}', 'Google API key'),
    (r'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}', 'JWT token'),
]


def find_project_root():
    """Find the project root by looking for .claude/ or .git/."""
    cwd = Path.cwd()
    for p in [cwd] + list(cwd.parents):
        if (p / '.claude').exists() or (p / '.git').exists():
            return p
    return cwd


def load_config(project_root):
    """Load quality-gates.json or return None if absent."""
    config_path = project_root / '.claude' / 'quality-gates.json'
    if not config_path.exists():
        return None
    try:
        with open(config_path) as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        print(f"⚠️  Maestro quality-gate: bad config ({e}), failing open", file=sys.stderr)
        return None


def get_staged_files(project_root):
    """Return list of staged files (relative paths)."""
    try:
        result = subprocess.run(
            ['git', 'diff', '--cached', '--name-only', '--diff-filter=ACMR'],
            cwd=project_root, capture_output=True, text=True, timeout=10
        )
        return [f for f in result.stdout.strip().split('\n') if f]
    except (subprocess.SubprocessError, OSError):
        return []


def check_secrets(project_root, config):
    """Scan staged files for secret patterns. Return list of (file, pattern_name, line_num)."""
    if not config.get('checks', {}).get('secrets', True):
        return []

    findings = []
    staged = get_staged_files(project_root)
    skip_patterns = config.get('skip_paths', [])

    for filename in staged:
        # Skip binaries and configured paths
        full_path = project_root / filename
        if not full_path.exists() or not full_path.is_file():
            continue
        if any(filename.startswith(sp.rstrip('*/')) for sp in skip_patterns):
            continue

        # Flag .env files added to commit (heuristic — should be gitignored)
        basename = full_path.name
        if basename == '.env' or basename.startswith('.env.') and not basename.endswith('.example'):
            findings.append((filename, '.env file in commit', 0))
            continue

        # Scan content
        try:
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                for line_num, line in enumerate(f, 1):
                    if len(line) > 500:  # skip very long lines
                        continue
                    for pattern, name in SECRET_PATTERNS:
                        if re.search(pattern, line):
                            findings.append((filename, name, line_num))
                            break  # one finding per line is enough
        except OSError:
            continue

    return findings


def check_tests(project_root, config):
    """Run the project's test suite. Return (passed, summary)."""
    if not config.get('checks', {}).get('tests', False):
        return (True, 'skipped')

    # Detect test runner
    pkg = project_root / 'package.json'
    pyproj = project_root / 'pyproject.toml'
    reqs = project_root / 'requirements.txt'

    cmd = None
    if pkg.exists():
        try:
            with open(pkg) as f:
                if '"test"' in f.read():
                    cmd = ['npm', 'test', '--silent']
        except OSError:
            pass
    elif pyproj.exists() or reqs.exists():
        cmd = ['pytest', '-q']

    if not cmd:
        return (True, 'no test infrastructure detected — skipped')

    try:
        result = subprocess.run(
            cmd, cwd=project_root, capture_output=True, text=True, timeout=300
        )
        if result.returncode == 0:
            return (True, 'all tests passed')
        else:
            # Extract test failure summary (last 5 non-empty lines of stderr+stdout)
            output = (result.stderr + result.stdout).strip().split('\n')
            summary = '\n'.join(l for l in output[-8:] if l.strip())
            return (False, f'tests failed:\n{summary}')
    except subprocess.TimeoutExpired:
        return (False, 'tests timed out (>5min)')
    except (subprocess.SubprocessError, FileNotFoundError) as e:
        return (True, f'test runner not available ({e}) — skipped')


def check_lint(project_root, config):
    """Run linter if configured. Return (passed, summary)."""
    if not config.get('checks', {}).get('lint', False):
        return (True, 'skipped')

    pkg = project_root / 'package.json'
    cmd = None
    if pkg.exists():
        try:
            with open(pkg) as f:
                pkg_content = f.read()
            if '"lint"' in pkg_content:
                cmd = ['npm', 'run', 'lint', '--silent']
        except OSError:
            pass

    if not cmd:
        # Python ruff
        if (project_root / 'pyproject.toml').exists() or (project_root / 'requirements.txt').exists():
            try:
                # Check if ruff is installed
                subprocess.run(['ruff', '--version'], capture_output=True, timeout=5)
                cmd = ['ruff', 'check', '.']
            except (subprocess.SubprocessError, FileNotFoundError):
                pass

    if not cmd:
        return (True, 'no lint script detected — skipped')

    try:
        result = subprocess.run(
            cmd, cwd=project_root, capture_output=True, text=True, timeout=120
        )
        if result.returncode == 0:
            return (True, 'lint clean')
        else:
            output = (result.stderr + result.stdout).strip().split('\n')
            summary = '\n'.join(l for l in output[-6:] if l.strip())
            return (False, f'lint failed:\n{summary}')
    except subprocess.TimeoutExpired:
        return (False, 'lint timed out (>2min)')
    except (subprocess.SubprocessError, FileNotFoundError):
        return (True, 'lint runner unavailable — skipped')


def check_typecheck(project_root, config):
    """Run type-check if configured. Return (passed, summary)."""
    if not config.get('checks', {}).get('typecheck', False):
        return (True, 'skipped')

    cmd = None
    # TypeScript
    if (project_root / 'tsconfig.json').exists():
        cmd = ['npx', '--no-install', 'tsc', '--noEmit']
    # Python mypy
    elif (project_root / 'pyproject.toml').exists() or (project_root / 'setup.py').exists():
        try:
            subprocess.run(['mypy', '--version'], capture_output=True, timeout=5)
            cmd = ['mypy', '.']
        except (subprocess.SubprocessError, FileNotFoundError):
            pass

    if not cmd:
        return (True, 'no typecheck infrastructure detected — skipped')

    try:
        result = subprocess.run(
            cmd, cwd=project_root, capture_output=True, text=True, timeout=180
        )
        if result.returncode == 0:
            return (True, 'types clean')
        else:
            output = (result.stderr + result.stdout).strip().split('\n')
            summary = '\n'.join(l for l in output[-6:] if l.strip())
            return (False, f'typecheck failed:\n{summary}')
    except subprocess.TimeoutExpired:
        return (False, 'typecheck timed out (>3min)')
    except (subprocess.SubprocessError, FileNotFoundError):
        return (True, 'typecheck runner unavailable — skipped')


def check_build(project_root, config):
    """Run build if configured. Return (passed, summary)."""
    if not config.get('checks', {}).get('build', False):
        return (True, 'skipped')

    pkg = project_root / 'package.json'
    cmd = None
    if pkg.exists():
        try:
            with open(pkg) as f:
                if '"build"' in f.read():
                    cmd = ['npm', 'run', 'build', '--silent']
        except OSError:
            pass

    if not cmd:
        return (True, 'no build script — skipped')

    try:
        result = subprocess.run(
            cmd, cwd=project_root, capture_output=True, text=True, timeout=600
        )
        if result.returncode == 0:
            return (True, 'build OK')
        else:
            output = (result.stderr + result.stdout).strip().split('\n')
            summary = '\n'.join(l for l in output[-8:] if l.strip())
            return (False, f'build failed:\n{summary}')
    except subprocess.TimeoutExpired:
        return (False, 'build timed out (>10min)')
    except (subprocess.SubprocessError, FileNotFoundError):
        return (True, 'build runner unavailable — skipped')


def main():
    # Only fire on git commit commands when invoked as a PreToolUse(Bash) hook
    # Claude Code sends {"tool_input":{"command":...}} on stdin. Read it first,
    # fall back to legacy env vars. When run manually (tty, no stdin) via
    # /quality-gate check, bash_cmd stays empty and we proceed.
    bash_cmd = ''
    if not sys.stdin.isatty():
        try:
            raw = sys.stdin.read()
            if raw.strip():
                bash_cmd = json.loads(raw).get('tool_input', {}).get('command', '')
        except (json.JSONDecodeError, ValueError, OSError):
            bash_cmd = ''
    if not bash_cmd:
        bash_cmd = os.environ.get('CLAUDE_BASH_COMMAND') or os.environ.get('CLAUDE_TOOL_INPUT_COMMAND', '')
    if bash_cmd:
        # We're in a Bash hook — only fire for git commit
        # Match: "git commit", "git commit -m '...'", "git commit -am '...'", etc.
        if not re.match(r'^\s*git\s+commit(\s|$)', bash_cmd):
            sys.exit(0)

    # Bypass check
    if os.environ.get(BYPASS_ENV) == '1':
        # Log bypass
        try:
            project_root = find_project_root()
            log_path = project_root / '.claude' / 'quality-gate-bypass.log'
            log_path.parent.mkdir(exist_ok=True)
            from datetime import datetime
            with open(log_path, 'a') as f:
                f.write(f"{datetime.now().isoformat()} — bypass invoked from {project_root}\n")
        except OSError:
            pass
        sys.exit(0)

    project_root = find_project_root()
    config = load_config(project_root)

    # No config or off level — fail open
    if config is None or config.get('level', 'off') == 'off':
        sys.exit(0)

    level = config.get('level', 'medium')

    # Always check secrets (level >= low)
    secret_findings = check_secrets(project_root, config)

    # Tests (level >= medium)
    tests_pass, tests_summary = (True, 'skipped (level=low)')
    if level in ('medium', 'high', 'paranoid'):
        tests_pass, tests_summary = check_tests(project_root, config)

    # Lint + typecheck (level >= high)
    lint_pass, lint_summary = (True, 'skipped (level<high)')
    typecheck_pass, typecheck_summary = (True, 'skipped (level<high)')
    if level in ('high', 'paranoid'):
        lint_pass, lint_summary = check_lint(project_root, config)
        typecheck_pass, typecheck_summary = check_typecheck(project_root, config)

    # Build (level=paranoid)
    build_pass, build_summary = (True, 'skipped (level<paranoid)')
    if level == 'paranoid':
        build_pass, build_summary = check_build(project_root, config)

    # Compute result
    failed = False
    report_lines = ['', '=== Maestro Quality Gate ===', '']

    if secret_findings:
        failed = True
        report_lines.append('❌ Secrets detection FAILED:')
        for filename, name, line_num in secret_findings:
            if line_num > 0:
                report_lines.append(f'    {filename}:{line_num} — {name}')
            else:
                report_lines.append(f'    {filename} — {name}')
    else:
        report_lines.append('✓ Secrets   : clean')

    if level in ('medium', 'high', 'paranoid'):
        if not tests_pass:
            failed = True
            report_lines.append('❌ Tests FAILED:')
            for line in tests_summary.split('\n'):
                report_lines.append(f'    {line}')
        else:
            report_lines.append(f'✓ Tests     : {tests_summary}')

    if level in ('high', 'paranoid'):
        if not lint_pass:
            failed = True
            report_lines.append('❌ Lint FAILED:')
            for line in lint_summary.split('\n'):
                report_lines.append(f'    {line}')
        else:
            report_lines.append(f'✓ Lint      : {lint_summary}')

        if not typecheck_pass:
            failed = True
            report_lines.append('❌ Typecheck FAILED:')
            for line in typecheck_summary.split('\n'):
                report_lines.append(f'    {line}')
        else:
            report_lines.append(f'✓ Typecheck : {typecheck_summary}')

    if level == 'paranoid':
        if not build_pass:
            failed = True
            report_lines.append('❌ Build FAILED:')
            for line in build_summary.split('\n'):
                report_lines.append(f'    {line}')
        else:
            report_lines.append(f'✓ Build     : {build_summary}')

    if failed:
        report_lines += [
            '',
            '⛔ Commit blocked by Maestro quality gate.',
            '   Fix the issues above, OR for emergencies:',
            '     export MAE_QUALITY_GATE_BYPASS=1',
            '   (logged to .claude/quality-gate-bypass.log)',
            '',
        ]
        print('\n'.join(report_lines), file=sys.stderr)
        sys.exit(2)
    else:
        # Silent on success — no stdout noise
        sys.exit(0)


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        # Fail open on unexpected errors — never block commits because of our bugs
        print(f"⚠️  Maestro quality-gate internal error: {e} (failing open)", file=sys.stderr)
        sys.exit(0)
