import { describe, it, expect } from 'vitest';
import { encodeHash, decodeHash } from './hash';
import type { OptionCoverage, OptionFrontend, OptionMap, OptionMethod, OptionOS } from './options';

describe('encodeHash', () => {
	it('returns empty string if os is missing', () => {
		expect(
			encodeHash({
				maps: []
			})
		).toBe('');
	});

	it('returns only OS key if method is missing', () => {
		expect(
			encodeHash({
				os: { key: 'linux' } as OptionOS,
				maps: []
			})
		).toBe('linux');
	});

	it('returns OS and method if maps are empty', () => {
		expect(
			encodeHash({
				os: { key: 'linux' } as OptionOS,
				method: { key: 'docker' } as OptionMethod,
				maps: []
			})
		).toBe('linux+docker');
	});

	it('returns OS, method, and maps', () => {
		expect(
			encodeHash({
				os: { key: 'linux' } as OptionOS,
				method: { key: 'docker' } as OptionMethod,
				maps: [{ key: 'osm-vector' }, { key: 'satellite-raster' }] as OptionMap[]
			})
		).toBe('linux+docker+osm-vector,satellite-raster');
	});

	it('returns OS, method, maps, and global coverage', () => {
		expect(
			encodeHash({
				os: { key: 'linux' } as OptionOS,
				method: { key: 'docker' } as OptionMethod,
				maps: [{ key: 'osm-vector' }] as OptionMap[],
				coverage: { key: 'global' } as OptionCoverage
			})
		).toBe('linux+docker+osm-vector+global');
	});

	it('returns OS, method, maps, bbox coverage, and bbox', () => {
		expect(
			encodeHash({
				os: { key: 'linux' } as OptionOS,
				method: { key: 'docker' } as OptionMethod,
				maps: [{ key: 'osm-vector' }] as OptionMap[],
				coverage: { key: 'bbox' } as OptionCoverage,
				bbox: [1, 2, 3, 4]
			})
		).toBe('linux+docker+osm-vector+bbox,1,2,3,4');
	});

	it('returns full hash with frontend', () => {
		expect(
			encodeHash({
				os: { key: 'linux' } as OptionOS,
				method: { key: 'docker' } as OptionMethod,
				maps: [{ key: 'osm-vector' }] as OptionMap[],
				coverage: { key: 'global' } as OptionCoverage,
				frontend: { key: 'web' } as OptionFrontend
			})
		).toBe('linux+docker+osm-vector+global+web');
	});

	it('does not encode the server settings', () => {
		// Domain, email and port are a helper for the code block only. An email
		// address in particular must not end up in a link that gets shared.
		expect(
			encodeHash({
				os: { key: 'linux' } as OptionOS,
				method: { key: 'docker' } as OptionMethod,
				maps: [{ key: 'osm-vector' } as OptionMap],
				coverage: { key: 'global' } as OptionCoverage,
				frontend: { key: 'standard' } as OptionFrontend,
				domain: 'tiles.my-city.org',
				email: 'ops@my-city.org',
				port: 8080
			})
		).toBe('linux+docker+osm-vector+global+standard');
	});

	it('encodes both minZoom and maxZoom with bbox coverage', () => {
		expect(
			encodeHash({
				os: { key: 'linux' } as OptionOS,
				method: { key: 'docker' } as OptionMethod,
				maps: [{ key: 'osm-vector' }] as OptionMap[],
				coverage: { key: 'bbox' } as OptionCoverage,
				bbox: [1, 2, 3, 4],
				minZoom: 3,
				maxZoom: 12,
				frontend: { key: 'web' } as OptionFrontend
			})
		).toBe('linux+docker+osm-vector+bbox,1,2,3,4+z,3,12+web');
	});

	it('encodes only minZoom with bbox coverage', () => {
		expect(
			encodeHash({
				os: { key: 'linux' } as OptionOS,
				method: { key: 'docker' } as OptionMethod,
				maps: [{ key: 'osm-vector' }] as OptionMap[],
				coverage: { key: 'bbox' } as OptionCoverage,
				bbox: [1, 2, 3, 4],
				minZoom: 5
			})
		).toBe('linux+docker+osm-vector+bbox,1,2,3,4+z,5,');
	});

	it('encodes only maxZoom with bbox coverage', () => {
		expect(
			encodeHash({
				os: { key: 'linux' } as OptionOS,
				method: { key: 'docker' } as OptionMethod,
				maps: [{ key: 'osm-vector' }] as OptionMap[],
				coverage: { key: 'bbox' } as OptionCoverage,
				bbox: [1, 2, 3, 4],
				maxZoom: 10
			})
		).toBe('linux+docker+osm-vector+bbox,1,2,3,4+z,,10');
	});

	it('drops zoom segment when coverage is global', () => {
		expect(
			encodeHash({
				os: { key: 'linux' } as OptionOS,
				method: { key: 'docker' } as OptionMethod,
				maps: [{ key: 'osm-vector' }] as OptionMap[],
				coverage: { key: 'global' } as OptionCoverage,
				minZoom: 3,
				maxZoom: 12,
				frontend: { key: 'web' } as OptionFrontend
			})
		).toBe('linux+docker+osm-vector+global+web');
	});
});

describe('decodeHash', () => {
	it('returns empty maps if hash is empty', () => {
		expect(decodeHash('')).toEqual({ maps: [] });
		expect(decodeHash('#')).toEqual({ maps: [] });
	});

	it('decodes OS only', () => {
		expect(decodeHash('linux')).toEqual({
			os: 'linux',
			maps: []
		});
	});

	it('decodes OS and method', () => {
		expect(decodeHash('linux+docker')).toEqual({
			os: 'linux',
			method: 'docker',
			maps: []
		});
	});

	it('decodes OS, method, and maps', () => {
		expect(decodeHash('linux+docker+osm-vector,satellite-raster')).toEqual({
			os: 'linux',
			method: 'docker',
			maps: ['osm-vector', 'satellite-raster']
		});
	});

	it('reads the old map names of links made before the rename', () => {
		expect(decodeHash('linux+docker+osm,satellite,elevation,landcover-vectors').maps).toEqual([
			'osm-vector',
			'satellite-raster',
			'elevation-raster',
			'landcover-vector'
		]);
	});

	it('decodes global coverage', () => {
		expect(decodeHash('linux+docker+osm-vector+global')).toEqual({
			os: 'linux',
			method: 'docker',
			maps: ['osm-vector'],
			coverage: 'global'
		});
	});

	it('decodes bbox coverage with valid bbox', () => {
		expect(decodeHash('linux+docker+osm-vector+bbox,1,2,3,4')).toEqual({
			os: 'linux',
			method: 'docker',
			maps: ['osm-vector'],
			coverage: 'bbox',
			bbox: [1, 2, 3, 4]
		});
	});

	it('decodes full hash with frontend', () => {
		expect(decodeHash('linux+docker+osm-vector+global+web')).toEqual({
			os: 'linux',
			method: 'docker',
			maps: ['osm-vector'],
			coverage: 'global',
			frontend: 'web'
		});
	});

	it('ignores invalid bbox', () => {
		expect(decodeHash('linux+docker+osm-vector+bbox,1,2,3')).toEqual({
			os: 'linux',
			method: 'docker',
			maps: ['osm-vector'],
			coverage: 'bbox'
		});
	});

	it.each([
		['an empty value', 'bbox,1,2,,4'],
		['a non-numeric value', 'bbox,1,2,x,4'],
		['a non-finite value', 'bbox,1,2,Infinity,4'],
		['too many values', 'bbox,1,2,3,4,5'],
		['a longitude out of range', 'bbox,-181,2,3,4'],
		['a latitude out of range', 'bbox,1,2,3,91']
	])('ignores a bbox with %s', (_, segment) => {
		expect(decodeHash(`linux+docker+osm-vector+${segment}`)).toEqual({
			os: 'linux',
			method: 'docker',
			maps: ['osm-vector'],
			coverage: 'bbox'
		});
	});

	it('decodes a bbox with negative and fractional values', () => {
		expect(decodeHash('linux+docker+osm-vector+bbox,-180,-85.05,8.5,90').bbox).toEqual([
			-180, -85.05, 8.5, 90
		]);
	});

	it('decodes zoom range with both bounds and trailing frontend', () => {
		expect(decodeHash('linux+docker+osm-vector+global+z,3,12+web')).toEqual({
			os: 'linux',
			method: 'docker',
			maps: ['osm-vector'],
			coverage: 'global',
			minZoom: 3,
			maxZoom: 12,
			frontend: 'web'
		});
	});

	it('decodes zoom range with only minZoom', () => {
		expect(decodeHash('linux+docker+osm-vector+global+z,5,')).toEqual({
			os: 'linux',
			method: 'docker',
			maps: ['osm-vector'],
			coverage: 'global',
			minZoom: 5
		});
	});

	it('decodes zoom range with only maxZoom', () => {
		expect(decodeHash('linux+docker+osm-vector+global+z,,10')).toEqual({
			os: 'linux',
			method: 'docker',
			maps: ['osm-vector'],
			coverage: 'global',
			maxZoom: 10
		});
	});

	it('treats segment without z, prefix as frontend, not zoom', () => {
		expect(decodeHash('linux+docker+osm-vector+global+standard')).toEqual({
			os: 'linux',
			method: 'docker',
			maps: ['osm-vector'],
			coverage: 'global',
			frontend: 'standard'
		});
	});
});
