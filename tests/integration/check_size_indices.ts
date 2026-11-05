/**
 * Checks that download.versatiles.org publishes a size index for every map
 * the setup page offers, and that a browser on another origin can read it.
 * Without one, the page only says that no estimate is available.
 *
 * Usage: npx tsx tests/integration/check_size_indices.ts
 */

import { optionsMap } from '../../src/routes/setup_server/options.js';
import {
	sizeIndexUrl,
	type QuadNode
} from '../../src/routes/setup_server/components/size_estimate.js';

const ORIGIN = 'https://versatiles.org';

// Returns the problem with a node of the quadtree, or undefined if it is valid.
function checkNode(node: unknown, path: string): string | undefined {
	if (typeof node === 'number') {
		return Number.isFinite(node) && node >= 0 ? undefined : `${path} is not a size: ${node}`;
	}
	if (!Array.isArray(node) || node.length !== 4) {
		return `${path} is neither a number nor an array of four nodes`;
	}
	for (let i = 0; i < 4; i++) {
		const problem = checkNode(node[i] as QuadNode, `${path}[${i}]`);
		if (problem) return problem;
	}
	return undefined;
}

async function checkIndex(mapKey: (typeof optionsMap)[number]['key']): Promise<string[]> {
	const url = sizeIndexUrl(mapKey);
	const res = await fetch(url, { headers: { Origin: ORIGIN } });
	if (!res.ok) return [`${url}: HTTP ${res.status}`];

	const problems: string[] = [];
	const allowOrigin = res.headers.get('access-control-allow-origin');
	if (allowOrigin !== '*' && allowOrigin !== ORIGIN) {
		problems.push(`${url}: access-control-allow-origin is ${allowOrigin ?? 'missing'}`);
	}

	const body: unknown = await res.json();
	const levels = (body as { levels?: unknown })?.levels;
	if (typeof levels !== 'object' || levels === null) {
		return [...problems, `${url}: has no "levels" object`];
	}
	const zooms = Object.keys(levels);
	if (zooms.length === 0) problems.push(`${url}: has no zoom levels`);
	for (const zoom of zooms) {
		if (!/^\d+$/.test(zoom)) problems.push(`${url}: "${zoom}" is not a zoom level`);
		const problem = checkNode((levels as Record<string, unknown>)[zoom], `levels.${zoom}`);
		if (problem) problems.push(`${url}: ${problem}`);
	}

	if (problems.length === 0) console.log(`ok   ${url} (zoom ${zooms[0]}–${zooms.at(-1)})`);
	return problems;
}

const problems = (await Promise.all(optionsMap.map((map) => checkIndex(map.key)))).flat();
for (const problem of problems) console.error(`FAIL ${problem}`);
process.exit(problems.length > 0 ? 1 : 0);
