import type {
	BBox,
	OptionCoverage,
	OptionFrontend,
	OptionMaps,
	OptionMethod,
	OptionOS
} from './options';

// utils for (de)serialising the form state into the URL hash

export function encodeHash({
	selectedOS,
	selectedMethod,
	selectedMaps,
	selectedCoverage,
	selectedBBox,
	selectedFrontend
}: {
	selectedOS?: OptionOS;
	selectedMethod?: OptionMethod;
	selectedMaps: OptionMaps[];
	selectedCoverage?: OptionCoverage;
	selectedBBox?: BBox;
	selectedFrontend?: OptionFrontend;
}): string {
	const parts = [];

	if (!selectedOS) return '';
	parts.push(selectedOS.key);

	if (!selectedMethod) return parts.join('+');
	parts.push(selectedMethod.key);

	if (selectedMaps.length === 0) return parts.join('+');
	parts.push(selectedMaps.map((m) => m.key).join(','));

	if (!selectedCoverage) return parts.join('+');
	if (selectedCoverage.key === 'bbox' && selectedBBox) {
		parts.push(`bbox:${selectedBBox.join(',')}`);
	} else {
		parts.push('global');
	}

	if (!selectedFrontend) return parts.join('+');
	parts.push(selectedFrontend.key);

	return parts.join('+');
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

	// Split the top‑level segments (joined by '+')
	const segments = raw.split('+');

	const os = segments[0];
	const method = segments[1];

	// Third segment contains a comma‑separated list of map keys
	const maps = segments[2] ? segments[2].split(',').filter(Boolean) : [];

	let coverage: string | undefined;
	let bbox: BBox | undefined;

	if (segments[3]) {
		if (segments[3].startsWith('bbox:')) {
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
