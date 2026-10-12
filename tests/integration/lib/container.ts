/**
 * Runs the generated script for Linux inside a container of a given
 * distribution, as a regular user with sudo.
 *
 * Unlike a CI runner this is an environment we control: the install doesn't
 * touch the host, and binding port 80 behaves like on a real server. So this is
 * where the privileged port is tested.
 */

import { execFileSync, spawnSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { PORT } from './modify.js';

const NAME = 'versatiles-smoke';
const USER = 'tester';
const WORK_DIR = `/home/${USER}/smoke`;

export const PRIVILEGED_PORT = 80;
// Host port that is mapped to the privileged port of the container.
export const PRIVILEGED_HOST_PORT = 8081;

export const SUDO_PREFIX = 'sudo "$(command -v versatiles)"';

// Installs what a freshly set up server has but a minimal image lacks, and
// creates a regular user that may use sudo. sudo keeps the configuration of
// the distribution, including its restricted PATH.
const PREPARE = `
set -eu
if command -v apt-get >/dev/null 2>&1; then
	export DEBIAN_FRONTEND=noninteractive
	apt-get update -qq
	apt-get install -y -qq --no-install-recommends ca-certificates curl sudo >/dev/null
elif command -v dnf >/dev/null 2>&1; then
	packages=""
	for tool in curl sudo tar gzip useradd; do
		command -v "$tool" >/dev/null 2>&1 && continue
		case $tool in
			useradd) packages="$packages shadow-utils" ;;
			*) packages="$packages $tool" ;;
		esac
	done
	[ -z "$packages" ] || dnf install -y -q $packages >/dev/null
else
	echo "Unsupported image: neither apt-get nor dnf found" >&2
	exit 1
fi
useradd --create-home --shell /bin/bash ${USER}
echo '${USER} ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/${USER}
chmod 0440 /etc/sudoers.d/${USER}
mkdir -p ${WORK_DIR}
chown ${USER} ${WORK_DIR}
`;

function docker(args: string[]): void {
	const result = spawnSync('docker', args, { stdio: 'inherit' });
	if (result.error) throw new Error(`docker ${args[0]} failed: ${result.error.message}`);
	if (result.status !== 0) throw new Error(`docker ${args[0]} exited with code ${result.status}`);
}

/** Runs a bash command as the regular user in the work directory; returns its exit code. */
function execAsUser(command: string): number {
	const result = spawnSync(
		'docker',
		['exec', '-u', USER, '-w', WORK_DIR, NAME, 'bash', '-c', command],
		{ stdio: 'inherit' }
	);
	if (result.error) throw new Error(`docker exec failed: ${result.error.message}`);
	return result.status ?? 1;
}

export function startContainer(image: string): void {
	removeContainer();
	console.log(`=== Starting container from ${image} ===`);
	docker([
		'run',
		'-d',
		'--init',
		'--name',
		NAME,
		// Docker lets every user of a container bind any port. Restore the default
		// of a Linux host, where ports below 1024 are reserved for root.
		'--sysctl',
		'net.ipv4.ip_unprivileged_port_start=1024',
		'-p',
		`${PORT}:${PORT}`,
		'-p',
		`${PRIVILEGED_HOST_PORT}:${PRIVILEGED_PORT}`,
		image,
		'sleep',
		'infinity'
	]);
	console.log('=== Preparing container ===');
	docker(['exec', '-u', 'root', NAME, 'sh', '-c', PREPARE]);
}

export function runScriptInContainer(hostDir: string, code: string): void {
	const scriptPath = join(hostDir, 'run.sh');
	const header = ['#!/usr/bin/env bash', 'set -euo pipefail', `_SMOKE_DIR="${WORK_DIR}"`, ''];
	writeFileSync(scriptPath, header.join('\n') + code + '\n');
	docker(['cp', scriptPath, `${NAME}:${WORK_DIR}/run.sh`]);

	console.log(`=== Running script in container as user "${USER}" ===`);
	const status = execAsUser('bash run.sh');
	if (status !== 0) throw new Error(`Script exited with code ${status}`);
}

export function stopServerInContainer(): void {
	execAsUser('kill "$(cat server.pid)" && sleep 1');
}

/**
 * Starts the server with `serverLine`, the command generated for the privileged
 * port, after making sure that this port really needs it.
 */
export function startServerOnPrivilegedPort(serverLine: string): void {
	if (!serverLine.startsWith(SUDO_PREFIX)) {
		throw new Error(`Expected the server to be started with sudo, but got: ${serverLine}`);
	}

	// Without sudo the server must fail to bind the port. If it doesn't, this
	// environment doesn't reserve the port for root, and a passing test would
	// say nothing about whether the generated command works on a real server.
	console.log(`=== Port ${PRIVILEGED_PORT} without sudo must fail ===`);
	const plainLine = serverLine.replace(SUDO_PREFIX, 'versatiles');
	const status = execAsUser(
		`timeout 10 ${plainLine} > plain.log 2>&1; s=$?; tail -n 3 plain.log; exit $s`
	);
	if (status === 0 || status === 124) {
		throw new Error(
			`A regular user could bind port ${PRIVILEGED_PORT}: the container does not reserve privileged ports`
		);
	}
	console.log(`    Failed as expected (exit code ${status})`);

	console.log(`=== Port ${PRIVILEGED_PORT} with the generated command ===`);
	console.log(`    ${serverLine}`);
	const started = execAsUser(`${serverLine} > server80.log 2>&1 & echo $! > server80.pid`);
	if (started !== 0) throw new Error(`Starting the server exited with code ${started}`);
}

export function printContainerLogs(): void {
	console.log('--- Server logs ---');
	execAsUser('tail -n 20 server.log plain.log server80.log 2>/dev/null; true');
}

export function removeContainer(): void {
	try {
		execFileSync('docker', ['rm', '-f', NAME], { stdio: 'pipe' });
	} catch {
		/* empty */
	}
}
