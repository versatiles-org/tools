import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	lon2tileX,
	lat2tileY,
	estimateSize,
	estimateDownloadSizes,
	clearIndexCache,
	BORDER
} from './size_estimate';
import type { OptionMap } from '../options';

describe('lon2tileX', () => {
	it('maps -180° to tile 0', () => {
		expect(lon2tileX(-180, 0)).toBe(0);
	});

	it('maps 0° to the middle tile', () => {
		expect(lon2tileX(0, 1)).toBe(1);
	});

	it('maps near 180° to last tile', () => {
		expect(lon2tileX(179.99, 1)).toBe(1);
	});

	it('returns correct tile at zoom 10', () => {
		// London ~= -0.1278° lon → tile x ≈ 511 at zoom 10
		const tx = lon2tileX(-0.1278, 10);
		expect(tx).toBe(511);
	});
});

describe('lat2tileY', () => {
	it('maps equator to middle tile', () => {
		expect(lat2tileY(0, 1)).toBe(1);
	});

	it('maps high latitude to low tile Y', () => {
		const ty = lat2tileY(85, 1);
		expect(ty).toBe(0);
	});

	it('maps negative latitude to high tile Y', () => {
		const ty = lat2tileY(-85, 1);
		expect(ty).toBe(1);
	});

	it('returns correct tile at zoom 10', () => {
		// London ~= 51.5074° lat
		const ty = lat2tileY(51.5074, 10);
		expect(ty).toBe(340);
	});
});

describe('estimateSize', () => {
	it('returns value * area for a leaf node with full overlap', () => {
		const result = estimateSize(100, 0, 0, 4, 0, 0, 4, 4);
		expect(result).toBe(100 * 16);
	});

	it('returns 0 for a zero leaf', () => {
		const result = estimateSize(0, 0, 0, 4, 0, 0, 4, 4);
		expect(result).toBe(0);
	});

	it('returns partial overlap for a leaf node', () => {
		// Node covers [0,0]-[4,4], query covers [2,2]-[4,4] → 2*2 = 4 tiles
		const result = estimateSize(50, 0, 0, 4, 2, 2, 4, 4);
		expect(result).toBe(50 * 4);
	});

	it('returns 0 when no overlap', () => {
		const result = estimateSize(100, 0, 0, 4, 5, 5, 8, 8);
		expect(result).toBe(0);
	});

	it('handles branch nodes correctly', () => {
		// 4 children: NW=10, NE=20, SW=30, SE=40
		// Node covers [0,0]-[4,4], each child covers 2x2
		const node: [number, number, number, number] = [10, 20, 30, 40];
		const result = estimateSize(node, 0, 0, 4, 0, 0, 4, 4);
		expect(result).toBe(10 * 4 + 20 * 4 + 30 * 4 + 40 * 4);
	});

	it('handles partial overlap on branch nodes', () => {
		// Query only covers NW quadrant [0,0]-[2,2]
		const node: [number, number, number, number] = [10, 20, 30, 40];
		const result = estimateSize(node, 0, 0, 4, 0, 0, 2, 2);
		expect(result).toBe(10 * 4);
	});
});

describe('BORDER', () => {
	it('equals 3', () => {
		expect(BORDER).toBe(3);
	});
});

describe('estimateDownloadSizes', () => {
	beforeEach(() => {
		clearIndexCache();
		vi.restoreAllMocks();
	});

	it('returns estimates for global coverage', async () => {
		const mockIndex = {
			levels: {
				'0': 1000,
				'1': [500, 600, 700, 800]
			}
		};

		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(mockIndex)
		});

		const maps: OptionMap[] = [{ key: 'osm', label: 'OpenStreetMap', hint: '' }];
		const result = await estimateDownloadSizes(maps, 'global', '');

		expect(result).toHaveLength(1);
		expect(result[0].mapKey).toBe('osm');
		expect(result[0].mapLabel).toBe('OpenStreetMap');
		// zoom 0: 1 tile * 1000 = 1000
		// zoom 1: 4 tiles, NW=500*1, NE=600*1, SW=700*1, SE=800*1 = 2600
		expect(result[0].bytes).toBe(3600);
	});

	it('returns estimates for bbox coverage', async () => {
		const mockIndex = {
			levels: {
				'0': 1000
			}
		};

		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(mockIndex)
		});

		const maps: OptionMap[] = [{ key: 'osm', label: 'OpenStreetMap', hint: '' }];
		// Small bbox — at zoom 0 it's still 1 tile
		const result = await estimateDownloadSizes(maps, 'bbox', '', [10, 40, 20, 50]);

		expect(result).toHaveLength(1);
		expect(result[0].bytes).toBe(1000);
	});

	it('returns estimates for multiple maps', async () => {
		const mockOsm = { levels: { '0': 100 } };
		const mockSatellite = { levels: { '0': 200 } };

		global.fetch = vi
			.fn()
			.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockOsm) })
			.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockSatellite) });

		const maps: OptionMap[] = [
			{ key: 'osm', label: 'OpenStreetMap', hint: '' },
			{ key: 'satellite', label: 'Satellite Imagery', hint: '' }
		];
		const result = await estimateDownloadSizes(maps, 'global', '');

		expect(result).toHaveLength(2);
		expect(result[0].bytes).toBe(100);
		expect(result[1].bytes).toBe(200);
	});
});
