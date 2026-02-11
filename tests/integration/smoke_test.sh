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
	# Docker containers may create root-owned files in the work dir
	if ! rm -rf "$WORK_DIR" 2>/dev/null; then
		docker run --rm -v "$WORK_DIR":/cleanup alpine rm -rf /cleanup 2>/dev/null || true
		rm -rf "$WORK_DIR" 2>/dev/null || true
	fi
}

PORT=8080

# Copy fixture into work dir
cp "$FIXTURE" "$WORK_DIR/osm.versatiles"

# Detect if the generated script uses a frontend (--static flag or FRONTEND env)
HAS_FRONTEND=false
FRONTEND_FILE="$SCRIPT_DIR/frontend.br.tar.gz"
if grep -q '\-\-static\|FRONTEND=' "$SCRIPT"; then
	if [ -f "$FRONTEND_FILE" ] && [ -s "$FRONTEND_FILE" ]; then
		HAS_FRONTEND=true
		cp "$FRONTEND_FILE" "$WORK_DIR/frontend.br.tar.gz"
	else
		echo "WARNING: Generated script uses a frontend but $FRONTEND_FILE not found or empty."
		echo "         Run 'bash tests/integration/create_fixture.sh' to download it."
		echo "         Falling back to health check on /status."
	fi
fi

echo "=== Smoke testing: ${OS}/${METHOD} ==="
echo "    Work dir: $WORK_DIR"
echo "    Frontend: $HAS_FRONTEND"

# Build the serve arguments for non-docker methods
SERVE_ARGS="--port $PORT"
if [ "$HAS_FRONTEND" = true ] && [[ "$METHOD" != docker* ]]; then
	SERVE_ARGS="$SERVE_ARGS --static \"frontend.br.tar.gz\""
fi

# Post-process the script depending on the method
case "$METHOD" in
script | homebrew | cargo | source)
	# Build a simplified run script: skip install/download, just start the server
	cat >"$WORK_DIR/run.sh" <<RUNEOF
#!/usr/bin/env bash
set -euo pipefail
cd "\$(dirname "\$0")"
versatiles serve $SERVE_ARGS "osm.versatiles" &
echo \$! > server.pid
RUNEOF
	;;

docker)
	# For docker method: run the versatiles container with fixture data
	DOCKER_SERVE_ARGS="serve"
	if [ "$HAS_FRONTEND" = true ]; then
		DOCKER_SERVE_ARGS="serve --static \"frontend.br.tar.gz\""
	fi
	cat >"$WORK_DIR/run.sh" <<RUNEOF
#!/usr/bin/env bash
set -euo pipefail
cd "\$(dirname "\$0")"

docker rm -f versatiles 2>/dev/null || true
docker run -d --name versatiles -p ${PORT}:8080 -v "\$(pwd)":/data versatiles/versatiles:latest \\
  $DOCKER_SERVE_ARGS "osm.versatiles"
RUNEOF
	;;

docker_nginx)
	# For docker_nginx: run in HTTP_ONLY mode to skip Let's Encrypt certificates
	cat >"$WORK_DIR/run.sh" <<RUNEOF
#!/usr/bin/env bash
set -euo pipefail
cd "\$(dirname "\$0")"

mkdir -p data
cp osm.versatiles data/osm.versatiles

docker rm -f versatiles 2>/dev/null || true
docker run -d --name versatiles \\
  -p ${PORT}:80 \\
  -v "\$(pwd)/data":/data \\
  -e DOMAIN=localhost \\
  -e HTTP_ONLY=true \\
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
if [ "$METHOD" = "docker_nginx" ]; then
	# For docker_nginx: check the backend directly via docker exec.
	# Nginx's proxy_cache_valid caches ALL responses (including 502) for 5 min,
	# so if the first request hits nginx before the backend is ready, the cached
	# 502 persists and all subsequent health checks fail.
	echo "=== Health check: polling backend via docker exec ==="
	max_attempts=60
	attempt=0
	success=false

	while [ $attempt -lt $max_attempts ]; do
		attempt=$((attempt + 1))
		if docker exec versatiles curl -sf http://127.0.0.1:8080/status >/dev/null 2>&1; then
			echo "    Attempt $attempt: backend OK"
			success=true
			break
		fi
		echo "    Attempt $attempt: backend not ready — retrying..."
		sleep 2
	done

	# Also verify nginx is accepting connections
	if [ "$success" = true ]; then
		echo "    Checking nginx on port $PORT..."
		sleep 1
		nginx_status=$(curl -sSo /dev/null -w '%{http_code}' "http://localhost:$PORT/" 2>/dev/null || true)
		if [[ "$nginx_status" =~ ^(200|502)$ ]]; then
			echo "    nginx responding: HTTP $nginx_status"
		else
			echo "    WARNING: nginx returned HTTP $nginx_status"
		fi
	fi
else
	# With frontend: check / to verify the frontend is served
	# Without frontend: check /status (root returns 404 without static content)
	if [ "$HAS_FRONTEND" = true ]; then
		HEALTH_URL="http://localhost:$PORT/"
	else
		HEALTH_URL="http://localhost:$PORT/status"
	fi
	echo "=== Health check: polling $HEALTH_URL ==="
	max_attempts=15
	attempt=0
	success=false

	while [ $attempt -lt $max_attempts ]; do
		attempt=$((attempt + 1))
		status=$(curl -sSo /dev/null -w '%{http_code}' "$HEALTH_URL" 2>/dev/null || true)

		if [ "$status" = "200" ]; then
			echo "    Attempt $attempt: HTTP $status — OK"
			success=true
			break
		fi

		echo "    Attempt $attempt: HTTP ${status:-timeout} — retrying..."
		sleep 2
	done
fi

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
