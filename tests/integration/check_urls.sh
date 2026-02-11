#!/usr/bin/env bash
set -euo pipefail

# Extracts all URLs from generated scripts and validates them with HEAD requests.
#
# Usage: bash tests/integration/check_urls.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GENERATED_DIR="$SCRIPT_DIR/generated"

if [ ! -d "$GENERATED_DIR" ]; then
	echo "ERROR: Generated scripts not found at $GENERATED_DIR"
	echo "Run 'npx tsx tests/integration/extract_code.ts' first."
	exit 1
fi

# Extract unique URLs from all generated scripts
urls=$(grep -rhoE 'https?://[^"'"'"' \\)+]+' "$GENERATED_DIR" | sort -u)

if [ -z "$urls" ]; then
	echo "WARNING: No URLs found in generated scripts"
	exit 0
fi

errors=0
checked=0

echo "=== Checking URLs with HEAD requests ==="
while IFS= read -r url; do
	echo -n "  $url ... "
	status=$(curl -sSL -o /dev/null -w '%{http_code}' --head --max-time 15 "$url" 2>/dev/null || true)
	if [ -z "$status" ] || [ "$status" = "000" ]; then
		# Some servers reject HEAD; fall back to GET with range
		status=$(curl -sSL -o /dev/null -w '%{http_code}' -r 0-0 --max-time 15 "$url" 2>/dev/null || true)
	fi

	checked=$((checked + 1))

	case "$status" in
	2* | 3*)
		echo "OK ($status)"
		;;
	405)
		# Method Not Allowed for HEAD — URL exists but server rejects HEAD
		echo "OK (HEAD not allowed, but reachable)"
		;;
	*)
		echo "FAIL ($status)"
		errors=$((errors + 1))
		;;
	esac
done <<<"$urls"

echo ""
echo "Checked $checked URL(s)"
if [ "$errors" -gt 0 ]; then
	echo "FAILED: $errors URL(s) unreachable"
	exit 1
else
	echo "All URLs reachable"
fi
