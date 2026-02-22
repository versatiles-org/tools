/**
 * Extracts all generated code snippets from generateCode() for every valid
 * OS/method combination and writes them to tests/integration/fixtures/generated/.
 *
 * Usage: npx tsx tests/integration/extract_code.ts
 */

import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateTestCode, optionsOS, allMethods } from './lib/generate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, 'fixtures/generated');

mkdirSync(outDir, { recursive: true });

let count = 0;

for (const os of optionsOS) {
	const validMethods = allMethods.filter((m) => m.os.includes(os.key));
	for (const method of validMethods) {
		const code = generateTestCode(os.key, method.key);

		const isWindows = os.key === 'windows';
		const ext = isWindows ? '.ps1' : '.sh';
		const filename = `${os.key}_${method.key}${ext}`;
		const filepath = join(outDir, filename);

		if (!isWindows) {
			writeFileSync(filepath, `#!/usr/bin/env bash\nset -euo pipefail\n\n${code}\n`);
		} else {
			writeFileSync(filepath, `${code}\n`);
		}

		console.log(`  wrote ${filename}`);
		count++;
	}
}

console.log(`\nExtracted ${count} scripts to ${outDir}`);
