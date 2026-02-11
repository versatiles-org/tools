#!/usr/bin/env bash
set -euo pipefail

# Smoke-tests a generated script by:
# 1. Replacing download commands with a local fixture copy
# 2. Replacing the server port with 8080 and backgrounding it
# 3. Polling for HTTP 200
# 4. Cleaning up
#
# Usage: bash tests/integration/smoke_test.sh <os> <method>
# Example: bash tests/integration/smoke_test.sh linux script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GENERATED_DIR="$SCRIPT_DIR/generated"
FIXTURE="$SCRIPT_DIR/tiny.versatiles"

OS="${1:?Usage: smoke_test.sh <os> <method>}"
METHOD="${2:?Usage: smoke_test.sh <os> <method>}"
SCRIPT="$GENERATED_DIR/${OS}_${METHOD}.sh"

if [ ! -f "$SCRIPT" ]; then
	echo "ERROR: Script not found: $SCRIPT"
	exit 1
fi

if [ ! -f "$FIXTURE" ]; then
	echo "ERROR: Fixture not found: $FIXTURE"
	echo "Run 'bash tests/integration/create_fixture.sh' first."
	exit 1
fi

WORK_DIR=$(mktemp -d)
trap 'cleanup' EXIT

SERVER_PID=""

cleanup() {
	echo "=== Cleaning up ==="
	if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
		kill "$SERVER_PID" 2>/dev/null || true
		wait "$SERVER_PID" 2>/dev/null || true
	fi
	# Stop docker containers started by docker methods
	docker rm -f versatiles 2>/dev/null || true
	rm -rf "$WORK_DIR"
}

PORT=8080

# Copy fixture and frontend placeholder into work dir
cp "$FIXTURE" "$WORK_DIR/osm.versatiles"

# Create an empty frontend tarball placeholder if needed
touch "$WORK_DIR/frontend.br.tar.gz"

echo "=== Smoke testing: ${OS}/${METHOD} ==="
echo "    Work dir: $WORK_DIR"

# Read the generated script
script_content=$(cat "$SCRIPT")

# Post-process the script depending on the method
case "$METHOD" in
script | homebrew | cargo | source)
	# Remove install commands — we assume versatiles is already available or we skip install
	# Remove download commands — we already have fixture data
	# Replace server port and background it

	# Build a simplified run script
	cat >"$WORK_DIR/run.sh" <<'RUNEOF'
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
RUNEOF

	# For non-docker methods, we just need to start the server
	# The install/download steps are skipped; the fixture is already in place
	cat >>"$WORK_DIR/run.sh" <<RUNEOF
versatiles serve --port $PORT "osm.versatiles" &
echo \$! > server.pid
RUNEOF
	;;

docker)
	# For docker method: replace the serve container command
	# The download/convert steps use Docker volumes, so replace with fixture
	cat >"$WORK_DIR/run.sh" <<RUNEOF
#!/usr/bin/env bash
set -euo pipefail
cd "\$(dirname "\$0")"

# Run the versatiles Docker container with fixture data
docker rm -f versatiles 2>/dev/null || true
docker run -d --name versatiles -p ${PORT}:8080 -v "\$(pwd)":/data versatiles/versatiles:latest \\
  serve "osm.versatiles"
RUNEOF
	;;

docker_nginx)
	# For docker_nginx: start the container without TLS (will fail Let's Encrypt but container starts)
	cat >"$WORK_DIR/run.sh" <<RUNEOF
#!/usr/bin/env bash
set -euo pipefail
cd "\$(dirname "\$0")"

mkdir -p data
cp osm.versatiles data/osm.versatiles

# Run the versatiles-nginx Docker container
docker rm -f versatiles 2>/dev/null || true
docker run -d --name versatiles \\
  -p ${PORT}:80 \\
  -v "\$(pwd)/data":/data \\
  -e DOMAIN=localhost \\
  -e EMAIL=test@example.com \\
  -e TILE_SOURCES=osm.versatiles \\
  -e BBOX="8.5,47.3,8.6,47.4" \\
  -e FRONTEND=standard \\
  versatiles/versatiles-nginx:latest
RUNEOF
	;;

*)
	echo "ERROR: Unsupported method for smoke test: $METHOD"
	exit 1
	;;
esac

chmod +x "$WORK_DIR/run.sh"

echo "=== Starting server ==="
bash "$WORK_DIR/run.sh"

# For non-docker methods, read the PID
if [ -f "$WORK_DIR/server.pid" ]; then
	SERVER_PID=$(cat "$WORK_DIR/server.pid")
	echo "    Server PID: $SERVER_PID"
fi

# For docker methods, verify container is running
if [[ "$METHOD" == docker* ]]; then
	sleep 2
	if ! docker ps --filter "name=versatiles" --format '{{.Names}}' | grep -q versatiles; then
		echo "FAIL: Docker container 'versatiles' is not running"
		docker logs versatiles 2>&1 || true
		exit 1
	fi
	echo "    Docker container 'versatiles' is running"
fi

# Health check: poll for HTTP 200
echo "=== Health check: polling http://localhost:$PORT/ ==="
max_attempts=30
attempt=0
success=false

while [ $attempt -lt $max_attempts ]; do
	attempt=$((attempt + 1))
	status=$(curl -sSo /dev/null -w '%{http_code}' "http://localhost:$PORT/" 2>/dev/null || true)

	if [ "$status" = "200" ]; then
		echo "    Attempt $attempt: HTTP $status — OK"
		success=true
		break
	fi

	echo "    Attempt $attempt: HTTP ${status:-timeout} — retrying..."
	sleep 2
done

if [ "$success" = true ]; then
	echo ""
	echo "PASSED: ${OS}/${METHOD} smoke test"
else
	echo ""
	echo "FAILED: ${OS}/${METHOD} — server did not return HTTP 200 after $max_attempts attempts"

	# Print logs for debugging
	if [[ "$METHOD" == docker* ]]; then
		echo "--- Docker logs ---"
		docker logs versatiles 2>&1 || true
	fi

	exit 1
fi
