/**
 * Shared code generation wrapper and test constants.
 */

import { generateCode } from '../../../src/routes/setup_server/generate_code.js';
import {
	optionsOS,
	allMethods,
	optionsMap,
	optionsCoverage,
	optionsFrontend
} from '../../../src/routes/setup_server/options.js';
import type { KeyOS, KeyFrontend, BBox } from '../../../src/routes/setup_server/options.js';

export const TEST_BBOX: BBox = [8.527, 47.362, 8.552, 47.379]; // tiny region in Zurich
export const DEFAULT_FRONTEND: KeyFrontend = 'tiny';

export function generateTestCode(
	osKey: KeyOS,
	methodKey: string,
	frontendKey: KeyFrontend = DEFAULT_FRONTEND
): string {
	const os = optionsOS.find((o) => o.key === osKey)!;
	const method = allMethods.find((m) => m.key === methodKey)!;
	const coverage = optionsCoverage.find((o) => o.key === 'bbox')!;
	const frontend = optionsFrontend.find((o) => o.key === frontendKey)!;

	const code = generateCode({
		os: { key: os.key, label: os.label, hint: os.hint },
		method: { key: method.key, label: method.label, hint: method.hint },
		maps: optionsMap,
		coverage,
		bbox: TEST_BBOX,
		frontend
	});

	if (!code) {
		throw new Error(`generateCode returned undefined for ${osKey}/${methodKey}/${frontendKey}`);
	}
	return code;
}

export { optionsOS, allMethods, optionsFrontend };
