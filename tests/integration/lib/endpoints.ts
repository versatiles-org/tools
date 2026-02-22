/**
 * HTTP endpoint definitions and checker.
 */

import { PORT } from './modify.js';

const ENDPOINTS = [
	{
		path: '/index.html',
		bodyCheck: (b: string): boolean => b.includes('<html'),
		description: 'contains <html'
	},
	{
		path: '/tiles/index.json',
		bodyCheck: (b: string): boolean => b.includes('osm'),
		description: 'contains "osm"'
	},
	{
		path: '/tiles/osm/tiles.json',
		bodyCheck: (b: string): boolean => b.includes('tilejson'),
		description: 'contains "tilejson"'
	},
	{
		path: '/tiles/osm/0/0/0',
		bodyCheck: (b: string): boolean => b.length > 0,
		description: 'non-empty body'
	}
];

export async function checkEndpoints(): Promise<boolean> {
	console.log('\n=== Checking HTTP endpoints ===');
	let allPassed = true;

	for (const ep of ENDPOINTS) {
		const url = `http://localhost:${PORT}${ep.path}`;
		try {
			const res = await fetch(url);
			const body = await res.text();
			if (res.status !== 200) {
				console.log(`  FAIL ${ep.path} — HTTP ${res.status}`);
				allPassed = false;
			} else if (!ep.bodyCheck(body)) {
				console.log(`  FAIL ${ep.path} — body check failed (${ep.description})`);
				allPassed = false;
			} else {
				console.log(`  OK   ${ep.path} — ${ep.description}`);
			}
		} catch (e) {
			console.log(`  FAIL ${ep.path} — ${e}`);
			allPassed = false;
		}
	}

	return allPassed;
}
