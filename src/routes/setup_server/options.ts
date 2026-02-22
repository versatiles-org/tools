import type { Option } from './components/FormOptionGroup.svelte';

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
	hint: string;
};
export const allMethods: (OptionMethod & { os: KeyOS[] })[] = [
	{
		key: 'homebrew',
		label: 'Homebrew',
		hint: 'Easiest way to install on macOS',
		os: ['macos']
	},
	{
		key: 'script',
		label: 'Install script',
		hint: 'Recommended — downloads a prebuilt binary',
		os: ['linux', 'macos', 'windows']
	},
	{
		key: 'docker_nginx',
		label: 'Docker with Nginx+TLS',
		hint: 'Production-ready with Nginx reverse proxy and automatic HTTPS',
		os: ['linux']
	},
	{
		key: 'docker',
		label: 'Docker',
		hint: 'Run in an isolated container without installing',
		os: ['linux', 'macos']
	},
	{
		key: 'cargo',
		label: 'Cargo',
		hint: 'Install via the Rust package manager (requires Rust toolchain)',
		os: ['linux', 'macos', 'windows']
	},
	{
		key: 'source',
		label: 'Build from source',
		hint: 'Clone and compile manually (requires Rust toolchain)',
		os: ['linux', 'macos', 'windows']
	}
];
export function optionsMethod(os: KeyOS): OptionMethod[] {
	return allMethods
		.filter((method) => method.os.includes(os))
		.map((method) => ({
			key: method.key,
			label: method.label,
			hint: method.hint
		}));
}

// ### Map Options
export type KeyMap = 'osm' | 'satellite';
export type OptionMap = Option & { key: KeyMap };
export const optionsMap: OptionMap[] = [
	{
		key: 'osm',
		label: 'OpenStreetMap',
		hint: 'Vector tiles with streets, buildings, and labels'
	},
	{
		key: 'satellite',
		label: 'Satellite imagery',
		hint: 'Raster tiles with satellite and aerial imagery'
	}
];

// ### Coverage Options
export type BBox = [number, number, number, number];
export type KeyCoverage = 'global' | 'bbox';
export type OptionCoverage = Option & { key: KeyCoverage };
export const optionsCoverage: OptionCoverage[] = [
	{
		key: 'global',
		label: 'Entire world',
		hint: 'Download the complete planet dataset'
	},
	{
		key: 'bbox',
		label: 'Custom region',
		hint: 'Select a bounding box to reduce download size'
	}
];

// ### Frontend Options
export type KeyFrontend = 'none' | 'standard' | 'dev' | 'min' | 'tiny';
export type OptionFrontend = Option & {
	key: KeyFrontend;
	hint: string;
	name?: string;
};
export const optionsFrontend: OptionFrontend[] = [
	{
		key: 'standard',
		label: 'Standard',
		hint: 'All fonts, styles, and sprites (~90 MB)',
		name: 'frontend',
		selected: true
	},
	{
		key: 'dev',
		label: 'Development',
		name: 'frontend-dev',
		hint: 'All fonts, styles, and sprites with dev tools (~90 MB)'
	},
	{
		key: 'min',
		label: 'Minimal',
		name: 'frontend-min',
		hint: 'Reduced font set (~45 MB)'
	},
	{
		key: 'tiny',
		label: 'Tiny',
		name: 'frontend-tiny',
		hint: 'Latin characters only (~1 MB)'
	},
	{ key: 'none', label: 'None', hint: 'No frontend — serve only tile data' }
];
