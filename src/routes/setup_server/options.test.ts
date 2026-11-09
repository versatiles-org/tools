import { describe, it, expect } from 'vitest';
import {
	defaultFrontend,
	defaultMaps,
	undrawnMapNotes,
	optionsOS,
	optionsMethod,
	optionsMap,
	optionsCoverage,
	optionsFrontend
} from './options';

describe('optionsOS', () => {
	it('should contain all OS options', () => {
		const keys = optionsOS.map((opt) => opt.key);
		expect(keys).toEqual(['linux', 'macos', 'windows']);
	});
});

describe('optionsMethod', () => {
	it('should return correct methods for macos', () => {
		const result = optionsMethod('macos');
		const keys = result.map((opt) => opt.key).sort();
		expect(keys).toStrictEqual(['cargo', 'docker', 'homebrew', 'script', 'source']);
	});
	it('should return correct methods for linux', () => {
		const result = optionsMethod('linux');
		const keys = result.map((opt) => opt.key).sort();
		expect(keys).toStrictEqual(['cargo', 'docker', 'docker_nginx', 'script', 'source']);
	});
	it('should return correct methods for windows', () => {
		const result = optionsMethod('windows');
		const keys = result.map((opt) => opt.key).sort();
		expect(keys).toStrictEqual(['cargo', 'script', 'source']);
	});
});

describe('optionsMaps', () => {
	it('should contain OpenStreetMap, Satellite, Elevation, and Land cover options', () => {
		expect(optionsMap).toEqual([
			expect.objectContaining({ key: 'osm-vector', label: 'OpenStreetMap' }),
			expect.objectContaining({ key: 'satellite-raster', label: 'Satellite imagery' }),
			expect.objectContaining({ key: 'elevation-raster', label: 'Elevation' }),
			expect.objectContaining({ key: 'landcover-vector', label: 'Land cover' })
		]);
	});
});

describe('defaultMaps', () => {
	it('should preselect OpenStreetMap', () => {
		expect(defaultMaps.map((map) => map.key)).toEqual(['osm-vector']);
	});
});

describe('undrawnMapNotes', () => {
	const pick = (...keys: string[]) => optionsMap.filter((map) => keys.includes(map.key));
	const ELEVATION = /^Elevation is only drawn/;
	const LANDCOVER = /^Land cover is only drawn/;

	it('has no notes for maps that are drawn', () => {
		expect(undrawnMapNotes([])).toEqual([]);
		expect(undrawnMapNotes(pick('osm-vector', 'elevation-raster', 'landcover-vector'))).toEqual([]);
		expect(undrawnMapNotes(pick('satellite-raster', 'elevation-raster'))).toEqual([]);
		expect(undrawnMapNotes(pick('satellite-raster'))).toEqual([]);
	});

	it('notes elevation without a map to draw it on', () => {
		expect(undrawnMapNotes(pick('elevation-raster'))).toEqual([expect.stringMatching(ELEVATION)]);
	});

	it('notes land cover without OpenStreetMap, even with satellite imagery', () => {
		expect(undrawnMapNotes(pick('landcover-vector'))).toEqual([expect.stringMatching(LANDCOVER)]);
		expect(
			undrawnMapNotes(pick('satellite-raster', 'elevation-raster', 'landcover-vector'))
		).toEqual([expect.stringMatching(LANDCOVER)]);
	});

	it('notes both add-ons without any map', () => {
		expect(undrawnMapNotes(pick('elevation-raster', 'landcover-vector'))).toEqual([
			expect.stringMatching(ELEVATION),
			expect.stringMatching(LANDCOVER)
		]);
	});
});

describe('optionsCoverage', () => {
	it('should contain global and bbox options', () => {
		const keys = optionsCoverage.map((opt) => opt.key);
		expect(keys).toEqual(['global', 'bbox']);
	});
});

describe('optionsFrontend', () => {
	it('should contain all frontend options', () => {
		const keys = optionsFrontend.map((opt) => opt.key);
		expect(keys).toEqual(['standard', 'dev', 'min', 'blank', 'tiny', 'none']);
	});
	it('should preselect the standard frontend', () => {
		expect(optionsFrontend.filter((opt) => opt.selected).map((opt) => opt.key)).toEqual([
			'standard'
		]);
		expect(defaultFrontend?.key).toBe('standard');
	});
	it('should define the blank frontend variant', () => {
		expect(optionsFrontend.find((opt) => opt.key === 'blank')).toEqual({
			key: 'blank',
			label: 'Blank',
			name: 'frontend-blank',
			hint: expect.any(String)
		});
	});
	it('should give every downloadable frontend a name matching frontend[-key]', () => {
		for (const opt of optionsFrontend) {
			if (opt.key === 'none') {
				expect(opt.name).toBeUndefined();
			} else if (opt.key === 'standard') {
				expect(opt.name).toBe('frontend');
			} else {
				expect(opt.name).toBe(`frontend-${opt.key}`);
			}
		}
	});
});
