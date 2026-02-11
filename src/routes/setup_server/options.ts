import type { Option } from './FormOption/FormOptionGroup.svelte';

// ### OS Options
export type KeyOS = 'linux' | 'macos' | 'windows';
export type OptionOS = Option & { key: KeyOS };
export const optionsOS: OptionOS[] = [
	{ key: 'linux', label: 'Linux', hint: 'Debian, Ubuntu, Fedora, Raspberry Pi OS, etc.' },
	{ key: 'macos', label: 'MacOS', hint: 'MacOS 10.15 (Catalina) or later' },
	{ key: 'windows', label: 'Windows', hint: 'Windows 10 or later' }
];

// ### Method Options
export type OptionMethod = Option & {
	key: 'homebrew' | 'script' | 'docker' | 'docker_nginx' | 'cargo' | 'source';
};
export const allMethods: (OptionMethod & { os: KeyOS[] })[] = [
	{ key: 'homebrew', label: 'Homebrew', os: ['macos'] },
	{
		key: 'script',
		label: 'Use Install Script',
		os: ['linux', 'macos', 'windows']
	},
	{
		key: 'docker_nginx',
		label: 'Docker with Nginx+TLS',
		os: ['linux']
	},
	{
		key: 'docker',
		label: 'Docker',
		small: true,
		os: ['linux', 'macos']
	},
	{
		key: 'cargo',
		label: 'Use Cargo',
		small: true,
		os: ['linux', 'macos', 'windows']
	},
	{
		key: 'source',
		label: 'Build from Source',
		small: true,
		os: ['linux', 'macos', 'windows']
	}
];
export function optionsMethod(os: KeyOS): OptionMethod[] {
	return allMethods
		.filter((method) => method.os.includes(os))
		.map((method) => ({
			key: method.key,
			label: method.label,
			small: method.small
		}));
}

// ### Map Options
export type KeyMap = 'osm' | 'satellite';
export type OptionMap = Option & { key: KeyMap };
export const optionsMap: OptionMap[] = [
	{ key: 'osm', label: 'OpenStreetMap' },
	{ key: 'satellite', label: 'Satellite Imagery' }
];

// ### Coverage Options
export type BBox = [number, number, number, number];
export type KeyCoverage = 'global' | 'bbox';
export type OptionCoverage = Option & { key: KeyCoverage };
export const optionsCoverage: OptionCoverage[] = [
	{ key: 'global', label: 'Entire World' },
	{ key: 'bbox', label: 'Custom Region' }
];

// ### Frontend Options
export type KeyFrontend = 'none' | 'standard' | 'dev' | 'min';
export type OptionFrontend = Option & {
	key: KeyFrontend;
	hint: string;
	name?: string;
};
export const optionsFrontend: OptionFrontend[] = [
	{
		key: 'standard',
		label: 'Standard',
		hint: 'The Standard Frontend includes MapLibre-GL-JS, styles, fonts, sprites.',
		name: 'frontend',
		selected: true
	},
	{
		key: 'dev',
		label: 'Development',
		name: 'frontend-dev',
		hint: 'The Development Frontend Includes additional debugging tools and features.'
	},
	{
		key: 'min',
		label: 'Minimal',
		name: 'frontend-min',
		hint: 'The Minimal Frontend Includes only the essential libraries and fonts.'
	},
	{ key: 'none', label: 'None', hint: 'No Frontend will be included.' }
];
