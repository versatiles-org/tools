/**
 * Smoke-tests generated installation scripts by:
 * 1. Generating code via generateCode() for each method
 * 2. Applying CI modifications (backgrounding, env vars)
 * 3. Executing the modified script
 * 4. Polling for HTTP readiness
 * 5. Checking HTTP endpoints
 * 6. Cleaning up
 *
 * To be fast, a test downloads one map source at low zoom levels only.
 *
 * Usage:
 *   npx tsx tests/integration/smoke_test.ts                     # all valid methods, default frontend
 *   npx tsx tests/integration/smoke_test.ts script docker       # only specified methods
 *   npx tsx tests/integration/smoke_test.ts script:blank        # method with explicit frontend
 *   npx tsx tests/integration/smoke_test.ts script --full       # all map sources and zoom levels
 *
 *   # Run the Linux script inside a container of the given image instead of on
 *   # this machine. Additionally tests the privileged port 80.
 *   npx tsx tests/integration/smoke_test.ts script --container debian:stable-slim
 */

import { execSync } from 'child_process';
import { generateTestCode, allMethods, optionsFrontend, DEFAULT_FRONTEND } from './lib/generate.js';
import { applyModifications, findServerLine } from './lib/modify.js';
import {
	createWorkDir,
	writeScript,
	runScript,
	waitForServer,
	waitForStatus,
	cleanup
} from './lib/server.js';
import {
	PRIVILEGED_HOST_PORT,
	PRIVILEGED_PORT,
	printContainerLogs,
	removeContainer,
	runScriptInContainer,
	startContainer,
	startServerOnPrivilegedPort,
	stopServerInContainer
} from './lib/container.js';
import { checkEndpoints } from './lib/endpoints.js';
import type { KeyOS, KeyFrontend } from '../../src/routes/setup_server/options.js';

// Methods that can run in a container. The Docker methods would need Docker
// inside Docker, and the compiling ones need a toolchain the images don't have.
const CONTAINER_METHODS = ['script'];

type Task = { method: string; frontend: KeyFrontend };
type Options = { full: boolean; container?: string };

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

function printDockerLogs(): void {
	console.log('--- Docker logs ---');
	try {
		execSync('docker logs versatiles', { stdio: 'inherit' });
	} catch {
		/* empty */
	}
}

/** Runs the script on this machine. */
async function runOnHost(osKey: KeyOS, task: Task, options: Options): Promise<boolean> {
	const { method, frontend } = task;
	const rawCode = generateTestCode(osKey, method, { frontend, full: options.full });
	const code = applyModifications(rawCode, method, osKey);

	console.log('\n--- Modified script ---');
	console.log(code);
	console.log('--- End of script ---\n');

	const workDir = createWorkDir();
	pendingCleanup = () => cleanup(method, workDir);

	try {
		const scriptPath = writeScript(workDir, code, osKey);
		console.log(`=== Starting script in ${workDir} ===`);
		runScript(scriptPath, workDir, osKey);

		await waitForServer(method, workDir);

		const passed = await checkEndpoints();
		if (!passed && method.startsWith('docker')) printDockerLogs();
		return passed;
	} catch (e) {
		console.log(`\n${e}`);
		if (method.startsWith('docker')) printDockerLogs();
		return false;
	} finally {
		cleanup(method, workDir);
		pendingCleanup = null;
	}
}

/**
 * Runs the script in a container, then restarts the server on the privileged
 * port. The second phase reuses the installation and the data of the first, so
 * it only costs a few seconds.
 */
async function runInContainer(image: string, task: Task, options: Options): Promise<boolean> {
	const { method, frontend } = task;
	const generate = (port?: number) =>
		generateTestCode('linux', method, { frontend, full: options.full, port });

	const code = applyModifications(generate(), method, 'linux', { logFile: true });
	const privilegedLines = generate(PRIVILEGED_PORT).split('\n');
	const privilegedServerLine = privilegedLines[findServerLine(privilegedLines)];

	console.log('\n--- Modified script ---');
	console.log(code);
	console.log('--- End of script ---\n');

	const workDir = createWorkDir();
	pendingCleanup = removeContainer;

	try {
		startContainer(image);
		runScriptInContainer(workDir, code);

		await waitForStatus();
		if (!(await checkEndpoints())) {
			printContainerLogs();
			return false;
		}

		stopServerInContainer();
		startServerOnPrivilegedPort(privilegedServerLine);

		await waitForStatus(PRIVILEGED_HOST_PORT);
		const passed = await checkEndpoints(PRIVILEGED_HOST_PORT);
		if (!passed) printContainerLogs();
		return passed;
	} catch (e) {
		console.log(`\n${e}`);
		printContainerLogs();
		return false;
	} finally {
		removeContainer();
		// The container wrote nothing here, so this only removes the script.
		cleanup('container', workDir);
		pendingCleanup = null;
	}
}

function fail(message: string): never {
	console.error(message);
	process.exit(1);
}

function parseArgs(cliArgs: string[]): { tasks: string[]; options: Options } {
	const tasks: string[] = [];
	const options: Options = { full: false };

	for (let i = 0; i < cliArgs.length; i++) {
		const arg = cliArgs[i];
		if (arg === '--full') {
			options.full = true;
		} else if (arg === '--container') {
			const image = cliArgs[++i];
			if (!image || image.startsWith('--'))
				fail('--container needs an image, e.g. debian:stable-slim');
			options.container = image;
		} else if (arg.startsWith('--')) {
			fail(`Unknown option "${arg}". Available: --full, --container <image>`);
		} else {
			tasks.push(arg);
		}
	}
	return { tasks, options };
}

function parseTasks(taskArgs: string[], validMethodKeys: Set<string>): Task[] {
	const validFrontendKeys = new Set(optionsFrontend.map((f) => f.key));
	const tasks: Task[] = [];
	for (const arg of taskArgs) {
		const [method, frontend = DEFAULT_FRONTEND] = arg.split(':') as [string, KeyFrontend];
		if (!validMethodKeys.has(method)) {
			fail(`Unknown method "${method}". Available: ${[...validMethodKeys].join(', ')}`);
		}
		if (!validFrontendKeys.has(frontend)) {
			fail(`Unknown frontend "${frontend}". Available: ${[...validFrontendKeys].join(', ')}`);
		}
		tasks.push({ method, frontend });
	}
	return tasks;
}

async function main(): Promise<void> {
	const { tasks: taskArgs, options } = parseArgs(process.argv.slice(2));

	// A container always runs Linux, whatever this machine runs.
	const osKey = options.container ? 'linux' : detectOS();

	const validMethods = allMethods
		.filter((m) => m.os.includes(osKey))
		.filter((m) => !options.container || CONTAINER_METHODS.includes(m.key));
	const validMethodKeys = new Set<string>(validMethods.map((m) => m.key));

	const tasks: Task[] =
		taskArgs.length > 0
			? parseTasks(taskArgs, validMethodKeys)
			: validMethods.map((m) => ({ method: m.key, frontend: DEFAULT_FRONTEND }));

	if (tasks.length === 0) fail(`No tasks to run for OS "${osKey}"`);

	const where = options.container ? ` in ${options.container}` : '';
	console.log(`Platform: ${osKey}${where}`);
	console.log(`Map data: ${options.full ? 'all sources, all zoom levels' : 'fast subset'}`);
	console.log(`Tasks to run: ${tasks.map((t) => `${t.method}:${t.frontend}`).join(', ')}`);

	const results: { label: string; passed: boolean }[] = [];

	for (const task of tasks) {
		const label = `${osKey}/${task.method}/${task.frontend}${where}`;
		console.log(`\n${'='.repeat(60)}`);
		console.log(`=== Smoke testing: ${label} ===`);
		console.log('='.repeat(60));

		const passed = options.container
			? await runInContainer(options.container, task, options)
			: await runOnHost(osKey, task, options);

		console.log(`\n${passed ? 'PASSED' : 'FAILED'}: ${label}`);
		results.push({ label, passed });
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
