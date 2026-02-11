#!/usr/bin/env bash
set -euo pipefail

# Creates a tiny .versatiles fixture file for smoke tests.
# Uses the versatiles Docker image to convert a small bbox from the public tile source.
#
# Usage: bash tests/integration/create_fixture.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT="$SCRIPT_DIR/tiny.versatiles"

if [ -f "$OUTPUT" ]; then
	echo "Fixture already exists: $OUTPUT"
	echo "Delete it to regenerate."
	exit 0
fi

echo "=== Creating tiny.versatiles fixture ==="
echo "    bbox: 8.5,47.3,8.6,47.4 (small area around Zurich)"

docker run --rm -v "$SCRIPT_DIR":/data versatiles/versatiles:latest \
	convert \
	--bbox-border 0 \
	--bbox "8.5,47.3,8.6,47.4" \
	"https://download.versatiles.org/osm.versatiles" \
	"tiny.versatiles"

if [ -f "$OUTPUT" ]; then
	size=$(du -h "$OUTPUT" | cut -f1)
	echo "Created fixture: $OUTPUT ($size)"
else
	echo "ERROR: Failed to create fixture"
	exit 1
fi
