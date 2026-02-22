/**
 * Script execution, server polling, and cleanup.
 */

import { writeFileSync, readFileSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync, spawnSync } from 'child_process';
import { tmpdir } from 'os';
import { PORT } from './modify.js';

const SCRIPT_TIMEOUT = 30 * 60 * 1000; // 30 minutes (cargo/source builds are slow)

export function createWorkDir(): string {
	const workDir = join(
		tmpdir(),
		`versatiles-smoke-${Date.now()}-${Math.random().toString(36).slice(2)}`
	);
	mkdirSync(workDir, { recursive: true });
	return workDir;
}

export function writeScript(workDir: string, code: string, osKey: string): string {
	if (osKey === 'windows') {
		const scriptPath = join(workDir, 'run.ps1');
		writeFileSync(scriptPath, code + '\n');
		return scriptPath;
	} else {
		const scriptPath = join(workDir, 'run.sh');
		const header = [
			'#!/usr/bin/env bash',
			'set -euo pipefail',
			'_SMOKE_DIR="$(cd "$(dirname "$0")" && pwd)"',
			''
		].join('\n');
		writeFileSync(scriptPath, header + code + '\n');
		return scriptPath;
	}
}

export function runScript(scriptPath: string, workDir: string, osKey: string): void {
	const cmd = osKey === 'windows' ? 'pwsh' : 'bash';
	const args =
		osKey === 'windows' ? ['-ExecutionPolicy', 'Bypass', '-File', scriptPath] : [scriptPath];

	const result = spawnSync(cmd, args, {
		cwd: workDir,
		stdio: 'inherit',
		timeout: SCRIPT_TIMEOUT
	});

	if (result.error) {
		throw new Error(`Script execution failed: ${result.error.message}`);
	}
	if (result.status !== 0) {
		throw new Error(`Script exited with code ${result.status}`);
	}
}

// --- Server Polling ---

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForServer(methodKey: string, workDir: string): Promise<void> {
	if (methodKey === 'docker_nginx') {
		await waitForDockerNginx();
	} else if (methodKey === 'docker') {
		await waitForDocker();
	} else {
		await waitForProcess(workDir);
	}
}

async function waitForProcess(workDir: string): Promise<void> {
	const pidFile = join(workDir, 'server.pid');
	const pid = parseInt(readFileSync(pidFile, 'utf-8').trim(), 10);
	console.log(`    Server PID: ${pid}`);

	console.log(`=== Health check: polling http://localhost:${PORT}/status ===`);
	for (let i = 1; i <= 15; i++) {
		try {
			const res = await fetch(`http://localhost:${PORT}/status`);
			if (res.ok) {
				console.log(`    Attempt ${i}: HTTP ${res.status} — OK`);
				return;
			}
			console.log(`    Attempt ${i}: HTTP ${res.status} — retrying...`);
		} catch {
			console.log(`    Attempt ${i}: not ready — retrying...`);
		}
		await sleep(2000);
	}
	throw new Error('Server did not become ready after 15 attempts');
}

async function waitForDocker(): Promise<void> {
	await sleep(2000);
	verifyContainerRunning();

	console.log(`=== Health check: polling http://localhost:${PORT}/status ===`);
	for (let i = 1; i <= 15; i++) {
		try {
			const res = await fetch(`http://localhost:${PORT}/status`);
			if (res.ok) {
				console.log(`    Attempt ${i}: HTTP ${res.status} — OK`);
				return;
			}
			console.log(`    Attempt ${i}: HTTP ${res.status} — retrying...`);
		} catch {
			console.log(`    Attempt ${i}: not ready — retrying...`);
		}
		await sleep(2000);
	}
	throw new Error('Server did not become ready after 15 attempts');
}

async function waitForDockerNginx(): Promise<void> {
	await sleep(2000);
	verifyContainerRunning();

	// Poll backend directly via docker exec to avoid nginx caching 502
	console.log('=== Health check: polling backend via docker exec ===');
	for (let i = 1; i <= 60; i++) {
		try {
			execSync('docker exec versatiles curl -sf http://127.0.0.1:8080/status', {
				stdio: 'pipe'
			});
			console.log(`    Attempt ${i}: backend OK`);
			break;
		} catch {
			if (i === 60) throw new Error('Backend did not become ready after 60 attempts');
			console.log(`    Attempt ${i}: backend not ready — retrying...`);
		}
		await sleep(2000);
	}

	// Verify nginx is accepting connections
	console.log(`    Checking nginx on port ${PORT}...`);
	await sleep(1000);
	for (let i = 1; i <= 5; i++) {
		try {
			const res = await fetch(`http://localhost:${PORT}/`);
			console.log(`    nginx responding: HTTP ${res.status}`);
			return;
		} catch {
			console.log(`    nginx not ready — retrying...`);
		}
		await sleep(2000);
	}
}

function verifyContainerRunning(): void {
	const result = execSync('docker ps --filter "name=versatiles" --format "{{.Names}}"', {
		encoding: 'utf-8'
	}).trim();
	if (!result.includes('versatiles')) {
		console.log('Docker logs:');
		try {
			execSync('docker logs versatiles', { stdio: 'inherit' });
		} catch {
			/* empty */
		}
		throw new Error('Docker container "versatiles" is not running');
	}
	console.log('    Docker container "versatiles" is running');
}

// --- Cleanup ---

export function cleanup(methodKey: string, workDir: string): void {
	console.log('\n=== Cleaning up ===');

	// Stop server
	if (methodKey === 'docker' || methodKey === 'docker_nginx') {
		try {
			execSync('docker rm -f versatiles', { stdio: 'pipe' });
		} catch {
			/* empty */
		}
	} else {
		try {
			const pidFile = join(workDir, 'server.pid');
			const pid = parseInt(readFileSync(pidFile, 'utf-8').trim(), 10);
			process.kill(pid);
		} catch {
			/* empty */
		}
	}

	// Remove work directory
	try {
		rmSync(workDir, { recursive: true, force: true });
	} catch {
		// Docker may create root-owned files
		try {
			execSync(`docker run --rm -v "${workDir}":/cleanup alpine rm -rf /cleanup`, {
				stdio: 'pipe'
			});
		} catch {
			/* empty */
		}
		try {
			rmSync(workDir, { recursive: true, force: true });
		} catch {
			/* empty */
		}
	}
}
