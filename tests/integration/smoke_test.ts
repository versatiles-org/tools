/**
 * Smoke-tests generated installation scripts by:
 * 1. Generating code via generateCode() for each method
 * 2. Applying CI modifications (port, backgrounding, env vars)
 * 3. Executing the modified script
 * 4. Polling for HTTP readiness
 * 5. Checking HTTP endpoints
 * 6. Cleaning up
 *
 * Usage:
 *   npx tsx tests/integration/smoke_test.ts                     # all valid methods, default frontend
 *   npx tsx tests/integration/smoke_test.ts script docker       # only specified methods
 *   npx tsx tests/integration/smoke_test.ts script:blank        # method with explicit frontend
 *   npx tsx tests/integration/smoke_test.ts docker_nginx:standard script:none
 */

import { execSync } from 'child_process';
import { generateTestCode, allMethods, optionsFrontend, DEFAULT_FRONTEND } from './lib/generate.js';
import { applyModifications } from './lib/modify.js';
import { createWorkDir, writeScript, runScript, waitForServer, cleanup } from './lib/server.js';
import { checkEndpoints } from './lib/endpoints.js';
import type { KeyOS, KeyFrontend } from '../../src/routes/setup_server/options.js';

function detectOS(): KeyOS {
	switch (process.platform) {
		case 'linux':
			return 'linux';
		case 'darwin':
			return 'macos';
		case 'win32':
			return 'windows';
		default:
			throw new Error(`Unsupported platform: ${process.platform}`);
	}
}

let pendingCleanup: (() => void) | null = null;

function handleSignal(): void {
	if (pendingCleanup) {
		pendingCleanup();
		pendingCleanup = null;
	}
	process.exit(1);
}

process.on('SIGINT', handleSignal);
process.on('SIGTERM', handleSignal);

async function runSmokeTest(
	osKey: KeyOS,
	methodKey: string,
	frontendKey: KeyFrontend
): Promise<boolean> {
	const label = `${osKey}/${methodKey}/${frontendKey}`;
	console.log(`\n${'='.repeat(60)}`);
	console.log(`=== Smoke testing: ${label} ===`);
	console.log('='.repeat(60));

	const rawCode = generateTestCode(osKey, methodKey, frontendKey);
	const code = applyModifications(rawCode, methodKey, osKey);

	console.log('\n--- Modified script ---');
	console.log(code);
	console.log('--- End of script ---\n');

	const workDir = createWorkDir();
	pendingCleanup = () => cleanup(methodKey, workDir);

	try {
		const scriptPath = writeScript(workDir, code, osKey);
		console.log(`=== Starting script in ${workDir} ===`);
		runScript(scriptPath, workDir, osKey);

		await waitForServer(methodKey, workDir);

		const passed = await checkEndpoints();

		if (passed) {
			console.log(`\nPASSED: ${label}`);
		} else {
			console.log(`\nFAILED: ${label} — endpoint checks failed`);
			if (methodKey.startsWith('docker')) {
				console.log('--- Docker logs ---');
				try {
					execSync('docker logs versatiles', { stdio: 'inherit' });
				} catch {
					/* empty */
				}
			}
		}

		return passed;
	} catch (e) {
		console.log(`\nFAILED: ${label} — ${e}`);
		if (methodKey.startsWith('docker')) {
			console.log('--- Docker logs ---');
			try {
				execSync('docker logs versatiles', { stdio: 'inherit' });
			} catch {
				/* empty */
			}
		}
		return false;
	} finally {
		cleanup(methodKey, workDir);
		pendingCleanup = null;
	}
}

type Task = { method: string; frontend: KeyFrontend };

function parseTasks(cliArgs: string[], validMethodKeys: Set<string>): Task[] {
	const validFrontendKeys = new Set(optionsFrontend.map((f) => f.key));
	const tasks: Task[] = [];
	for (const arg of cliArgs) {
		const [method, frontend = DEFAULT_FRONTEND] = arg.split(':') as [string, KeyFrontend];
		if (!validMethodKeys.has(method)) {
			console.error(`Unknown method "${method}". Available: ${[...validMethodKeys].join(', ')}`);
			process.exit(1);
		}
		if (!validFrontendKeys.has(frontend)) {
			console.error(
				`Unknown frontend "${frontend}". Available: ${[...validFrontendKeys].join(', ')}`
			);
			process.exit(1);
		}
		tasks.push({ method, frontend });
	}
	return tasks;
}

async function main(): Promise<void> {
	const osKey = detectOS();
	const cliArgs = process.argv.slice(2);

	const validMethods = allMethods.filter((m) => m.os.includes(osKey));
	const validMethodKeys = new Set(validMethods.map((m) => m.key));

	const tasks: Task[] =
		cliArgs.length > 0
			? parseTasks(cliArgs, validMethodKeys)
			: validMethods.map((m) => ({ method: m.key, frontend: DEFAULT_FRONTEND }));

	if (tasks.length === 0) {
		console.error(`No tasks to run for OS "${osKey}"`);
		process.exit(1);
	}

	console.log(`Platform: ${osKey}`);
	console.log(`Tasks to run: ${tasks.map((t) => `${t.method}:${t.frontend}`).join(', ')}`);

	const results: { label: string; passed: boolean }[] = [];

	for (const task of tasks) {
		const passed = await runSmokeTest(osKey, task.method, task.frontend);
		results.push({ label: `${task.method}:${task.frontend}`, passed });
	}

	console.log(`\n${'='.repeat(60)}`);
	console.log('=== Results ===');
	for (const r of results) {
		console.log(`  ${r.passed ? 'PASSED' : 'FAILED'}: ${r.label}`);
	}

	const failed = results.filter((r) => !r.passed);
	if (failed.length > 0) {
		console.log(`\n${failed.length} test(s) failed`);
		process.exit(1);
	}

	console.log('\nAll smoke tests passed!');
}

main();
