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
 *   npx tsx tests/integration/smoke_test.ts                    # all valid methods for current OS
 *   npx tsx tests/integration/smoke_test.ts script docker      # only specified methods
 */

import { execSync } from 'child_process';
import { generateTestCode, allMethods } from './lib/generate.js';
import { applyModifications } from './lib/modify.js';
import { createWorkDir, writeScript, runScript, waitForServer, cleanup } from './lib/server.js';
import { checkEndpoints } from './lib/endpoints.js';
import type { KeyOS } from '../../src/routes/setup_server/options.js';

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

async function runSmokeTest(osKey: KeyOS, methodKey: string): Promise<boolean> {
	console.log(`\n${'='.repeat(60)}`);
	console.log(`=== Smoke testing: ${osKey}/${methodKey} ===`);
	console.log('='.repeat(60));

	const rawCode = generateTestCode(osKey, methodKey, 'standard');
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
			console.log(`\nPASSED: ${osKey}/${methodKey}`);
		} else {
			console.log(`\nFAILED: ${osKey}/${methodKey} — endpoint checks failed`);
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
		console.log(`\nFAILED: ${osKey}/${methodKey} — ${e}`);
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

async function main(): Promise<void> {
	const osKey = detectOS();
	const cliArgs = process.argv.slice(2);

	const validMethods = allMethods.filter((m) => m.os.includes(osKey));

	let methods: typeof validMethods;
	if (cliArgs.length > 0) {
		methods = validMethods.filter((m) => cliArgs.includes(m.key));
		if (methods.length === 0) {
			console.error(`No valid methods found for OS "${osKey}" matching: ${cliArgs.join(', ')}`);
			console.error(`Available methods: ${validMethods.map((m) => m.key).join(', ')}`);
			process.exit(1);
		}
	} else {
		methods = validMethods;
	}

	console.log(`Platform: ${osKey}`);
	console.log(`Methods to test: ${methods.map((m) => m.key).join(', ')}`);

	const results: { method: string; passed: boolean }[] = [];

	for (const method of methods) {
		const passed = await runSmokeTest(osKey, method.key);
		results.push({ method: method.key, passed });
	}

	console.log(`\n${'='.repeat(60)}`);
	console.log('=== Results ===');
	for (const r of results) {
		console.log(`  ${r.passed ? 'PASSED' : 'FAILED'}: ${r.method}`);
	}

	const failed = results.filter((r) => !r.passed);
	if (failed.length > 0) {
		console.log(`\n${failed.length} test(s) failed`);
		process.exit(1);
	}

	console.log('\nAll smoke tests passed!');
}

main();
