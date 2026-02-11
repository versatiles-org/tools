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

# Check a single URL, returns the HTTP status code.
# Tries HEAD first, then falls back to a limited GET if HEAD fails.
# Retries once on transient failures (502, 503, 000).
check_url() {
	local url="$1"
	local status

	# Try HEAD request first
	status=$(curl -sSL -o /dev/null -w '%{http_code}' --head --max-time 15 "$url" 2>/dev/null || true)

	# Fall back to GET (download only first byte) if HEAD was rejected or failed
	if [[ ! "$status" =~ ^2 ]] && [ "$status" != "405" ]; then
		sleep 1
		status=$(curl -sSL -o /dev/null -w '%{http_code}' --max-time 15 "$url" 2>/dev/null || true)
	fi

	echo "$status"
}

echo "=== Checking URLs ==="
while IFS= read -r url; do
	echo -n "  $url ... "
	status=$(check_url "$url")

	checked=$((checked + 1))

	case "$status" in
	2* | 3* | 405)
		echo "OK ($status)"
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
