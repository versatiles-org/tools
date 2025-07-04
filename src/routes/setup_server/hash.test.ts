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
				maps: [{ key: 'osm' }, { key: 'sat' }] as OptionMap[]
			})
		).toBe('linux+docker+osm,sat');
	});

	it('returns OS, method, maps, and global coverage', () => {
		expect(
			encodeHash({
				os: { key: 'linux' } as OptionOS,
				method: { key: 'docker' } as OptionMethod,
				maps: [{ key: 'osm' }] as OptionMap[],
				coverage: { key: 'global' } as OptionCoverage
			})
		).toBe('linux+docker+osm+global');
	});

	it('returns OS, method, maps, bbox coverage, and bbox', () => {
		expect(
			encodeHash({
				os: { key: 'linux' } as OptionOS,
				method: { key: 'docker' } as OptionMethod,
				maps: [{ key: 'osm' }] as OptionMap[],
				coverage: { key: 'bbox' } as OptionCoverage,
				bbox: [1, 2, 3, 4]
			})
		).toBe('linux+docker+osm+bbox,1,2,3,4');
	});

	it('returns full hash with frontend', () => {
		expect(
			encodeHash({
				os: { key: 'linux' } as OptionOS,
				method: { key: 'docker' } as OptionMethod,
				maps: [{ key: 'osm' }] as OptionMap[],
				coverage: { key: 'global' } as OptionCoverage,
				frontend: { key: 'web' } as OptionFrontend
			})
		).toBe('linux+docker+osm+global+web');
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
		expect(decodeHash('linux+docker+osm,sat')).toEqual({
			os: 'linux',
			method: 'docker',
			maps: ['osm', 'sat']
		});
	});

	it('decodes global coverage', () => {
		expect(decodeHash('linux+docker+osm+global')).toEqual({
			os: 'linux',
			method: 'docker',
			maps: ['osm'],
			coverage: 'global'
		});
	});

	it('decodes bbox coverage with valid bbox', () => {
		expect(decodeHash('linux+docker+osm+bbox,1,2,3,4')).toEqual({
			os: 'linux',
			method: 'docker',
			maps: ['osm'],
			coverage: 'bbox',
			bbox: [1, 2, 3, 4]
		});
	});

	it('decodes full hash with frontend', () => {
		expect(decodeHash('linux+docker+osm+global+web')).toEqual({
			os: 'linux',
			method: 'docker',
			maps: ['osm'],
			coverage: 'global',
			frontend: 'web'
		});
	});

	it('ignores invalid bbox', () => {
		expect(decodeHash('linux+docker+osm+bbox,1,2,3')).toEqual({
			os: 'linux',
			method: 'docker',
			maps: ['osm'],
			coverage: 'bbox'
		});
	});
});
