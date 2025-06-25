import { describe, it, expect } from 'vitest';
import { optionsOS, optionsMethod, optionsMap, optionsCoverage, optionsFrontend } from './options';

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
		expect(keys).toStrictEqual(['cargo', 'homebrew', 'script', 'source']);
	});
	it('should return correct methods for linux', () => {
		const result = optionsMethod('linux');
		const keys = result.map((opt) => opt.key).sort();
		expect(keys).toStrictEqual(['cargo', 'docker-nginx', 'script', 'source']);
	});
	it('should return correct methods for windows', () => {
		const result = optionsMethod('windows');
		const keys = result.map((opt) => opt.key).sort();
		expect(keys).toStrictEqual(['cargo', 'script', 'source']);
	});
	it('should include small property when present', () => {
		const result = optionsMethod('linux');
		const cargo = result.find((opt) => opt.key === 'cargo');
		expect(cargo).toHaveProperty('small', true);
	});
});

describe('optionsMaps', () => {
	it('should contain OpenStreetMap option', () => {
		expect(optionsMap).toEqual([expect.objectContaining({ key: 'osm', label: 'OpenStreetMap' })]);
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
		expect(keys).toEqual(['standard', 'dev', 'min', 'none']);
	});
	it('should have selected true for standard', () => {
		expect(optionsFrontend.find((opt) => opt.key === 'standard')?.selected).toBe(true);
	});
});
