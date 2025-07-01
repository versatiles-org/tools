import type { BBox } from './options';
import type { SetupState } from './types';

// utils for (de)serialising the form state into the URL hash

const HASH_SEPARATOR = '+';

export function encodeHash({ os, method, maps, coverage, bbox, frontend }: SetupState): string {
	const parts = [];

	if (!os) return '';
	parts.push(os.key);

	if (!method) return parts.join(HASH_SEPARATOR);
	parts.push(method.key);

	if (maps.length === 0) return parts.join(HASH_SEPARATOR);
	parts.push(maps.map((m) => m.key).join(','));

	if (!coverage) return parts.join(HASH_SEPARATOR);
	if (coverage.key === 'bbox' && bbox) {
		parts.push(`bbox,${bbox.join(',')}`);
	} else {
		parts.push('global');
	}

	if (!frontend) return parts.join(HASH_SEPARATOR);
	parts.push(frontend.key);

	return parts.join(HASH_SEPARATOR);
}

export function decodeHash(hash: string): {
	os?: string;
	method?: string;
	maps: string[];
	coverage?: string;
	bbox?: BBox;
	frontend?: string;
} {
	// Strip leading '#' and bail early if nothing follows
	const raw = hash.replace(/^#/, '');
	if (!raw) return { maps: [] };

	// Split the top‑level segments (joined by HASH_SEPARATOR)
	const segments = raw.split(HASH_SEPARATOR);

	const os = segments[0];
	const method = segments[1];

	// Third segment contains a comma‑separated list of map keys
	const maps = segments[2] ? segments[2].split(',').filter(Boolean) : [];

	let coverage: string | undefined;
	let bbox: BBox | undefined;

	if (segments[3]) {
		if (segments[3].startsWith('bbox,')) {
			coverage = 'bbox';
			const coords = segments[3].slice(5).split(',').map(Number);
			// Expect exactly four numeric values: minLon, minLat, maxLon, maxLat
			if (coords.length === 4 && coords.every((n) => !Number.isNaN(n))) {
				bbox = coords as BBox;
			}
		} else {
			coverage = 'global'; // e.g. 'global'
		}
	}

	const frontend = segments[4];

	return { os, method, maps, coverage, bbox, frontend };
}
