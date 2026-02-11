/**
 * Extracts all generated code snippets from generateCode() for every valid
 * OS/method combination and writes them to tests/integration/fixtures/generated/.
 *
 * Usage: npx tsx tests/integration/extract_code.ts
 */

import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateCode } from '../../src/routes/setup_server/generate_code.js';
import {
	optionsOS,
	allMethods,
	optionsMap,
	optionsCoverage,
	optionsFrontend
} from '../../src/routes/setup_server/options.js';
import type { OptionOS, OptionMethod } from '../../src/routes/setup_server/options.js';
import type { BBox } from '../../src/routes/setup_server/options.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, 'fixtures/generated');

mkdirSync(outDir, { recursive: true });

const maps = optionsMap;
const coverageBbox = optionsCoverage.find((o) => o.key === 'bbox')!;
const bbox: BBox = [8.5, 47.3, 8.6, 47.4]; // tiny region around Zurich
const frontend = optionsFrontend.find((o) => o.key === 'standard')!;

let count = 0;

for (const os of optionsOS) {
	const validMethods = allMethods.filter((m) => m.os.includes(os.key));
	for (const method of validMethods) {
		const osOpt: OptionOS = { key: os.key, label: os.label, hint: os.hint };
		const methodOpt: OptionMethod = { key: method.key, label: method.label };

		const code = generateCode({
			os: osOpt,
			method: methodOpt,
			maps,
			coverage: coverageBbox,
			bbox,
			frontend
		});

		if (!code) {
			console.error(`WARNING: generateCode returned undefined for ${os.key}/${method.key}`);
			continue;
		}

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
