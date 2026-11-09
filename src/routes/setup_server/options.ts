import type { Option } from './components/FormOptionGroup.svelte';

// ### OS Options
export type KeyOS = 'linux' | 'macos' | 'windows';
export type OptionOS = Option & { key: KeyOS };
export const optionsOS: OptionOS[] = [
	{ key: 'linux', label: 'Linux', hint: 'Debian, Ubuntu, Fedora, Raspberry Pi OS, etc.' },
	{ key: 'macos', label: 'macOS', hint: 'macOS 10.15 (Catalina) or later' },
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
// The key names the file on download.versatiles.org and the tile source on the server.
export type KeyMap = 'osm-vector' | 'satellite-raster' | 'elevation-raster' | 'landcover-vector';

// download.versatiles.org stores each map in a folder named like the map.
export function mapUrl(key: KeyMap): string {
	return `https://download.versatiles.org/${key}/${key}.versatiles`;
}
export type OptionMap = Option & {
	key: KeyMap;
	// Some maps only add to another one, so the frontends draw them only together
	// with one of these maps. The note explains this when none of them is selected.
	drawnWith?: { maps: KeyMap[]; note: string };
};
export const optionsMap: OptionMap[] = [
	{
		key: 'osm-vector',
		label: 'OpenStreetMap',
		hint: 'Recommended — the map with streets, buildings, and labels',
		selected: true
	},
	{
		key: 'satellite-raster',
		label: 'Satellite imagery',
		hint: 'Satellite and aerial imagery, with labels if OpenStreetMap is selected too'
	},
	{
		key: 'elevation-raster',
		label: 'Elevation',
		hint: 'Adds hillshading and 3D terrain to OpenStreetMap or satellite imagery',
		drawnWith: {
			maps: ['osm-vector', 'satellite-raster'],
			note: 'Elevation is only drawn on OpenStreetMap or satellite imagery, so select one of them too.'
		}
	},
	{
		// The frontends' styler draws it under OpenStreetMap when the server has it.
		key: 'landcover-vector',
		label: 'Land cover',
		hint: 'Adds forests, farmland, and other land cover to OpenStreetMap',
		drawnWith: {
			maps: ['osm-vector'],
			note: 'Land cover is only drawn under OpenStreetMap, so select it too.'
		}
	}
];
// The maps that are preselected in the form
export const defaultMaps: OptionMap[] = optionsMap.filter((option) => option.selected);

// Notes on selected maps that the frontends would not draw, because none of the
// maps they are drawn with is selected.
export function undrawnMapNotes(maps: OptionMap[]): string[] {
	const selected = new Set(maps.map((map) => map.key));
	return maps
		.filter(({ drawnWith }) => drawnWith && !drawnWith.maps.some((key) => selected.has(key)))
		.map(({ drawnWith }) => drawnWith!.note);
}

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
export type KeyFrontend = 'none' | 'standard' | 'dev' | 'min' | 'blank' | 'tiny';
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
		key: 'blank',
		label: 'Blank',
		name: 'frontend-blank',
		hint: 'Fonts and sprites only, no styles (~85 MB)'
	},
	{
		key: 'tiny',
		label: 'Tiny',
		name: 'frontend-tiny',
		hint: 'Latin characters only (~1 MB)'
	},
	{ key: 'none', label: 'None', hint: 'No frontend — serve only tile data' }
];
// The frontend that is preselected in the form
export const defaultFrontend: OptionFrontend | undefined = optionsFrontend.find(
	(option) => option.selected
);
