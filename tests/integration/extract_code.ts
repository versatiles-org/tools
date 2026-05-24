/**
 * Extracts all generated code snippets from generateCode() for every valid
 * OS/method combination and writes them to tests/integration/fixtures/generated/.
 *
 * Usage: npx tsx tests/integration/extract_code.ts
 */

import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
	generateTestCode,
	optionsOS,
	allMethods,
	optionsFrontend,
	DEFAULT_FRONTEND
} from './lib/generate.js';
import type { KeyOS, KeyFrontend } from '../../src/routes/setup_server/options.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, 'fixtures/generated');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// Methods whose generated output varies with the frontend choice.
// Other methods embed only the frontend tarball name, so cross-frontend coverage
// for `script` is representative.
const FRONTEND_VARIANT_METHODS = ['script', 'docker_nginx'];

function write(osKey: KeyOS, methodKey: string, frontendKey: KeyFrontend, filename: string): void {
	const code = generateTestCode(osKey, methodKey, frontendKey);
	const filepath = join(outDir, filename);
	if (osKey === 'windows') {
		writeFileSync(filepath, `${code}\n`);
	} else {
		writeFileSync(filepath, `#!/usr/bin/env bash\nset -euo pipefail\n\n${code}\n`);
	}
	console.log(`  wrote ${filename}`);
}

let count = 0;

// Default matrix: all OS × method with the default frontend.
for (const os of optionsOS) {
	const validMethods = allMethods.filter((m) => m.os.includes(os.key));
	for (const method of validMethods) {
		const ext = os.key === 'windows' ? '.ps1' : '.sh';
		write(os.key, method.key, DEFAULT_FRONTEND, `${os.key}_${method.key}${ext}`);
		count++;
	}
}

// Per-frontend fixtures for representative methods on Linux.
for (const frontend of optionsFrontend) {
	if (frontend.key === DEFAULT_FRONTEND) continue;
	for (const methodKey of FRONTEND_VARIANT_METHODS) {
		write('linux', methodKey, frontend.key, `linux_${methodKey}_${frontend.key}.sh`);
		count++;
	}
}

const onDisk = readdirSync(outDir).length;
if (onDisk !== count) {
	throw new Error(`Expected to write ${count} scripts, but found ${onDisk} in ${outDir}`);
}

console.log(`\nExtracted ${count} scripts to ${outDir}`);
