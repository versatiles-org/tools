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
import type { KeyOS, KeyFrontend, KeyMap, BBox } from '../../../src/routes/setup_server/options.js';
import { PORT } from './modify.js';

export const TEST_BBOX: BBox = [8.527, 47.362, 8.552, 47.379]; // tiny region in Zurich
export const DEFAULT_FRONTEND: KeyFrontend = 'tiny';

// Nearly all of a smoke test's time is spent fetching tiles. Unless a test asks
// for `full`, it downloads a single source up to this zoom level only. (The
// zoom limit has no effect on docker_nginx, which doesn't support one.)
export const TEST_MAP: KeyMap = 'osm';
export const TEST_MAX_ZOOM = 5;

export interface TestOptions {
	frontend?: KeyFrontend;
	/** All map sources and all zoom levels, instead of the fast subset. */
	full?: boolean;
	/** Port of the server; defaults to the unprivileged test port. */
	port?: number;
}

export function generateTestCode(
	osKey: KeyOS,
	methodKey: string,
	{ frontend: frontendKey = DEFAULT_FRONTEND, full = false, port = PORT }: TestOptions = {}
): string {
	const os = optionsOS.find((o) => o.key === osKey)!;
	const method = allMethods.find((m) => m.key === methodKey)!;
	const coverage = optionsCoverage.find((o) => o.key === 'bbox')!;
	const frontend = optionsFrontend.find((o) => o.key === frontendKey)!;

	const code = generateCode({
		os: { key: os.key, label: os.label, hint: os.hint },
		method: { key: method.key, label: method.label, hint: method.hint },
		maps: full ? optionsMap : optionsMap.filter((map) => map.key === TEST_MAP),
		coverage,
		bbox: TEST_BBOX,
		maxZoom: full ? undefined : TEST_MAX_ZOOM,
		frontend,
		port
	});

	if (!code) {
		throw new Error(`generateCode returned undefined for ${osKey}/${methodKey}/${frontendKey}`);
	}
	return code;
}

export { optionsOS, allMethods, optionsFrontend };
