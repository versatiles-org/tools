#!/usr/bin/env bash
set -euo pipefail

# Validates syntax of all generated scripts:
# - shellcheck for bash scripts (.sh)
# - pwsh -Command parser for PowerShell scripts (.ps1)
#
# Usage: bash tests/integration/validate_syntax.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GENERATED_DIR="$SCRIPT_DIR/fixtures/generated"

if [ ! -d "$GENERATED_DIR" ]; then
	echo "ERROR: Generated scripts not found at $GENERATED_DIR"
	echo "Run 'npx tsx tests/integration/extract_code.ts' first."
	exit 1
fi

errors=0

# Validate bash scripts with shellcheck
echo "=== Checking bash scripts with shellcheck ==="
if command -v shellcheck &>/dev/null; then
	for script in "$GENERATED_DIR"/*.sh; do
		[ -f "$script" ] || continue
		name="$(basename "$script")"
		echo -n "  $name ... "
		# SC2086: word splitting (expected in generated install commands)
		# SC2034: unused variables (comments reference URLs)
		# SC2164: cd without || exit (generated scripts use set -e)
		# SC2046: unquoted $(pwd) in docker volume mounts (intentional)
		# SC2288: literal "..." placeholder in docker_nginx instructions
		if shellcheck -e SC2086,SC2034,SC2164,SC2046,SC2288 -s bash "$script" 2>&1; then
			echo "OK"
		else
			echo "FAIL"
			errors=$((errors + 1))
		fi
	done
else
	echo "  shellcheck not found — skipping bash validation"
fi

# Validate PowerShell scripts with pwsh parser
echo ""
echo "=== Checking PowerShell scripts with pwsh ==="
if command -v pwsh &>/dev/null; then
	for script in "$GENERATED_DIR"/*.ps1; do
		[ -f "$script" ] || continue
		name="$(basename "$script")"
		echo -n "  $name ... "
		# Convert to Windows path when running in Git Bash on Windows
		script_path="$script"
		if command -v cygpath &>/dev/null; then
			script_path="$(cygpath -w "$script")"
		fi
		# Parse-only: use [System.Management.Automation.Language.Parser]
		if pwsh -NoProfile -NonInteractive -Command "
			\$errors = \$null
			\$null = [System.Management.Automation.Language.Parser]::ParseFile('$script_path', [ref]\$null, [ref]\$errors)
			if (\$errors.Count -gt 0) {
				\$errors | ForEach-Object { Write-Error \$_.Message }
				exit 1
			}
		" 2>&1; then
			echo "OK"
		else
			echo "FAIL"
			errors=$((errors + 1))
		fi
	done
else
	echo "  pwsh not found — skipping PowerShell validation"
fi

echo ""
if [ "$errors" -gt 0 ]; then
	echo "FAILED: $errors script(s) had syntax errors"
	exit 1
else
	echo "All scripts passed syntax validation"
fi
