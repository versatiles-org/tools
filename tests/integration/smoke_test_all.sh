#!/usr/bin/env bash
set -euo pipefail

# Runs all smoke tests that are feasible on the current platform.
# Detects available tools (versatiles, docker) and skips tests that can't run.
#
# Usage: bash tests/integration/smoke_test_all.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Detect platform
case "$(uname -s)" in
Linux) PLATFORM="linux" ;;
Darwin) PLATFORM="macos" ;;
*)
	echo "Unsupported platform: $(uname -s)"
	exit 1
	;;
esac

echo "Platform: $PLATFORM"

# Detect available tools
HAS_VERSATILES=false
HAS_DOCKER=false

if command -v versatiles &>/dev/null; then
	HAS_VERSATILES=true
	echo "versatiles: $(versatiles --version 2>&1 | head -1)"
fi

if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
	HAS_DOCKER=true
	echo "docker: available"
fi

if [ "$HAS_VERSATILES" = false ] && [ "$HAS_DOCKER" = false ]; then
	echo "ERROR: Neither versatiles nor docker found. Cannot run any smoke tests."
	exit 1
fi

# Step 1: Extract generated scripts
echo ""
echo "=== Extracting generated scripts ==="
npx tsx "$SCRIPT_DIR/extract_code.ts"

# Step 2: Create fixtures (tile data + frontend)
echo ""
echo "=== Creating fixtures ==="
if [ "$HAS_DOCKER" = true ]; then
	bash "$SCRIPT_DIR/create_fixture.sh"
elif [ "$HAS_VERSATILES" = true ]; then
	# Create tile fixture using the local binary instead of Docker
	if [ ! -f "$SCRIPT_DIR/tiny.versatiles" ]; then
		echo "Creating tile fixture with local versatiles binary..."
		versatiles convert \
			--bbox-border 0 \
			--bbox "8.5,47.3,8.6,47.4" \
			"https://download.versatiles.org/osm.versatiles" \
			"$SCRIPT_DIR/tiny.versatiles"
	else
		echo "Tile fixture already exists."
	fi
fi

# Download frontend if not present
if [ ! -f "$SCRIPT_DIR/frontend.br.tar.gz" ] || [ ! -s "$SCRIPT_DIR/frontend.br.tar.gz" ]; then
	echo "Downloading frontend..."
	curl -sSL -o "$SCRIPT_DIR/frontend.br.tar.gz" \
		"https://github.com/versatiles-org/versatiles-frontend/releases/latest/download/frontend.br.tar.gz"
	size=$(du -h "$SCRIPT_DIR/frontend.br.tar.gz" | cut -f1)
	echo "Downloaded frontend ($size)"
else
	echo "Frontend already exists."
fi

# Build list of tests to run
tests=()

# Non-docker methods need the versatiles binary
if [ "$HAS_VERSATILES" = true ]; then
	case "$PLATFORM" in
	linux) tests+=("linux script" "linux cargo" "linux source") ;;
	macos) tests+=("macos homebrew" "macos script" "macos cargo" "macos source") ;;
	esac
fi

# Docker methods need docker
if [ "$HAS_DOCKER" = true ]; then
	case "$PLATFORM" in
	linux) tests+=("linux docker" "linux docker_nginx") ;;
	macos) tests+=("macos docker") ;;
	esac
fi

echo ""
echo "=== Running ${#tests[@]} smoke test(s) ==="
echo ""

passed=0
failed=0
skipped_tests=()

for test in "${tests[@]}"; do
	read -r os method <<<"$test"
	echo "--- ${os}/${method} ---"
	if bash "$SCRIPT_DIR/smoke_test.sh" "$os" "$method"; then
		passed=$((passed + 1))
	else
		failed=$((failed + 1))
		skipped_tests+=("${os}/${method}")
	fi
	echo ""
done

echo "=== Results ==="
echo "Passed: $passed"
echo "Failed: $failed"

if [ "$failed" -gt 0 ]; then
	echo "Failed tests: ${skipped_tests[*]}"
	exit 1
fi

echo "All smoke tests passed!"
