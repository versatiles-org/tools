import { describe, it, expect } from 'vitest';
import { generateCode } from './generate_code';
import type {
	BBox,
	OptionCoverage,
	OptionFrontend,
	OptionMap,
	OptionMethod,
	OptionOS
} from './options';
import { allMethods, optionsCoverage, optionsFrontend, optionsMap, optionsOS } from './options';

const osWindows: OptionOS = optionsOS.find((opt) => opt.key === 'windows')!;
const osLinux: OptionOS = optionsOS.find((opt) => opt.key === 'linux')!;
const methodHomebrew: OptionMethod = allMethods.find((opt) => opt.key === 'homebrew')!;
const methodScript: OptionMethod = allMethods.find((opt) => opt.key === 'script')!;
const methodCargo: OptionMethod = allMethods.find((opt) => opt.key === 'cargo')!;
const methodSource: OptionMethod = allMethods.find((opt) => opt.key === 'source')!;
const methodDocker: OptionMethod = allMethods.find((opt) => opt.key === 'docker')!;
const methodDockerNginx: OptionMethod = allMethods.find((opt) => opt.key === 'docker_nginx')!;
const maps: OptionMap[] = optionsMap;
const coverageBbox: OptionCoverage = optionsCoverage.find((opt) => opt.key === 'bbox')!;
const bbox: BBox = [1, 2, 3, 4];
const frontend: OptionFrontend = optionsFrontend.find((opt) => opt.key === 'standard')!;

function _generateCode(
	os: OptionOS,
	method: OptionMethod,
	maps: OptionMap[],
	coverage?: OptionCoverage,
	bbox?: BBox,
	frontend?: OptionFrontend,
	minZoom?: number,
	maxZoom?: number
): string | undefined {
	return generateCode({ os, method, maps, coverage, bbox, frontend, minZoom, maxZoom });
}

describe('generateCode', () => {
	it('generates code for homebrew on mac/linux', () => {
		const code = _generateCode(osLinux, methodHomebrew, maps);
		expect(code).toContain('brew install versatiles');
		expect(code).toContain('curl -fLo "osm.versatiles"');
		expect(code).toContain('versatiles server --port 80 "osm.versatiles"');
	});

	it('generates code for script on windows', () => {
		const code = _generateCode(osWindows, methodScript, maps);
		expect(code).toContain(
			'Invoke-WebRequest -Uri "https://github.com/versatiles-org/versatiles-rs/releases/latest/download/install-windows.ps1"'
		);
		expect(code).toContain('Invoke-WebRequest -OutFile "osm.versatiles"');
		expect(code).toContain('versatiles.exe server --port 80 "osm.versatiles"');
	});

	it('generates code for cargo on linux', () => {
		const code = _generateCode(osLinux, methodCargo, maps);
		expect(code).toContain(
			'curl --proto "=https" --tlsv1.2 -sSf "https://sh.rustup.rs" | sh -s -- -y'
		);
		expect(code).toContain('cargo install versatiles');
		expect(code).toContain('curl -fLo "osm.versatiles"');
		expect(code).toContain('versatiles server --port 80 "osm.versatiles"');
	});

	it('generates code for source on windows', () => {
		const code = _generateCode(osWindows, methodSource, maps);
		expect(code).toContain('git clone https://github.com/versatiles-org/versatiles-rs.git');
		expect(code).toContain('Copy-Item "target\\release\\versatiles.exe"');
		expect(code).toContain('Invoke-WebRequest -OutFile "osm.versatiles"');
		expect(code).toContain('versatiles.exe server --port 80 "osm.versatiles"');
	});

	it('includes bbox argument when coverage is bbox', () => {
		const code = _generateCode(osLinux, methodScript, maps, coverageBbox, bbox);
		expect(code).toContain('--bbox "1,2,3,4"');
	});

	it('includes frontend download and server static argument', () => {
		const code = _generateCode(osLinux, methodScript, maps, undefined, undefined, frontend);
		expect(code).toContain('Downloading frontend...');
		expect(code).toContain('curl -fLo "frontend.br.tar.gz"');
		expect(code).toContain('--static "frontend.br.tar.gz"');
	});

	it('does not generate map or server commands if maps is empty', () => {
		const code = _generateCode(osLinux, methodScript, []);
		expect(code).not.toContain('Downloading map data...');
		expect(code).not.toContain('Starting VersaTiles server...');
	});

	it('does not generate frontend download if frontend is not provided', () => {
		const code = _generateCode(osLinux, methodScript, maps);
		expect(code).not.toContain('Downloading frontend...');
	});

	it('generates code for docker on linux with maps, frontend, and bbox', () => {
		const code = _generateCode(osLinux, methodDocker, maps, coverageBbox, bbox, frontend);
		expect(code).toContain('# Install Docker');
		expect(code).toContain('Downloading frontend...');
		expect(code).toContain('curl -fLo "frontend.br.tar.gz"');
		expect(code).toContain('docker run -it --rm -v $(pwd):/data versatiles/versatiles:latest');
		expect(code).toContain('--bbox "1,2,3,4"');
		expect(code).toContain('Configuring and running Docker container...');
		expect(code).toContain('--static "frontend.br.tar.gz"');
		expect(code).toContain('"osm.versatiles"');
	});

	it('generates code for docker_nginx on linux with maps, bbox, and frontend', () => {
		const code = _generateCode(osLinux, methodDockerNginx, maps, coverageBbox, bbox, frontend);
		expect(code).toContain('# Install Docker');
		expect(code).toContain('# Point your domain to the server IP');
		expect(code).toContain('-e DOMAIN=maps.example.com');
		expect(code).toContain('-e EMAIL=admin@example.com');
		expect(code).toContain('-e TILE_SOURCES=osm.versatiles');
		expect(code).toContain('-e BBOX="1,2,3,4"');
		expect(code).toContain('-e FRONTEND=standard');
		expect(code).toContain('versatiles/versatiles-nginx:latest');
	});

	it('generates code with satellite map selected', () => {
		const satelliteMaps: OptionMap[] = [optionsMap.find((opt) => opt.key === 'satellite')!];
		const code = _generateCode(osLinux, methodScript, satelliteMaps);
		expect(code).toContain('satellite.versatiles');
		expect(code).not.toContain('osm.versatiles');
	});

	it('generates code with both osm and satellite maps selected', () => {
		const bothMaps: OptionMap[] = optionsMap;
		const code = _generateCode(osLinux, methodDockerNginx, bothMaps, coverageBbox, bbox, frontend);
		expect(code).toContain('osm.versatiles');
		expect(code).toContain('satellite.versatiles');
		expect(code).toContain('-e TILE_SOURCES=osm.versatiles,satellite.versatiles');
	});

	it('generates code for docker_nginx without bbox (global coverage)', () => {
		const coverageGlobal = optionsCoverage.find((opt) => opt.key === 'global')!;
		const code = _generateCode(
			osLinux,
			methodDockerNginx,
			maps,
			coverageGlobal,
			undefined,
			frontend
		);
		expect(code).not.toContain('BBOX');
		expect(code).toContain('-e FRONTEND=standard');
		expect(code).toContain('-e TILE_SOURCES=osm.versatiles');
	});

	describe('zoom range', () => {
		const coverageGlobal = optionsCoverage.find((opt) => opt.key === 'global')!;

		it('switches global download to versatiles convert when minZoom is set', () => {
			const code = _generateCode(
				osLinux,
				methodScript,
				maps,
				coverageGlobal,
				undefined,
				undefined,
				3
			);
			expect(code).toContain('versatiles convert --min-zoom 3 "https://download.versatiles.org/');
			expect(code).not.toContain('curl -fLo "osm.versatiles"');
		});

		it('adds --min-zoom and --max-zoom alongside --bbox when both are set', () => {
			const code = _generateCode(osLinux, methodScript, maps, coverageBbox, bbox, undefined, 5, 12);
			expect(code).toContain(
				'versatiles convert --bbox-border 3 --bbox "1,2,3,4" --min-zoom 5 --max-zoom 12'
			);
		});

		it('omits --max-zoom when only minZoom is set with bbox', () => {
			const code = _generateCode(osLinux, methodScript, maps, coverageBbox, bbox, undefined, 5);
			expect(code).toContain('--min-zoom 5');
			expect(code).not.toContain('--max-zoom');
		});

		it('keeps curl path when no bbox and no zoom is set', () => {
			const code = _generateCode(osLinux, methodScript, maps, coverageGlobal);
			expect(code).toContain('curl -fLo "osm.versatiles"');
			expect(code).not.toContain('versatiles convert');
		});

		it('emits MIN_ZOOM and MAX_ZOOM env vars for docker_nginx', () => {
			const code = _generateCode(
				osLinux,
				methodDockerNginx,
				maps,
				coverageBbox,
				bbox,
				frontend,
				4,
				11
			);
			expect(code).toContain('-e BBOX="1,2,3,4"');
			expect(code).toContain('-e MIN_ZOOM=4');
			expect(code).toContain('-e MAX_ZOOM=11');
		});

		it('omits MIN_ZOOM/MAX_ZOOM for docker_nginx when not set', () => {
			const code = _generateCode(osLinux, methodDockerNginx, maps, coverageBbox, bbox, frontend);
			expect(code).not.toContain('MIN_ZOOM');
			expect(code).not.toContain('MAX_ZOOM');
		});

		it('uses convert in docker (non-nginx) when only zoom is set', () => {
			const code = _generateCode(
				osLinux,
				methodDocker,
				maps,
				coverageGlobal,
				undefined,
				frontend,
				undefined,
				10
			);
			expect(code).toContain('convert --max-zoom 10 "https://download.versatiles.org/');
		});
	});

	describe('frontend variants', () => {
		const downloadable = optionsFrontend.filter((f) => f.name);
		it.each(downloadable)('downloads $name for script install ($key)', (variant) => {
			const code = _generateCode(osLinux, methodScript, maps, undefined, undefined, variant);
			expect(code).toContain(`curl -fLo "${variant.name}.br.tar.gz"`);
			expect(code).toContain(`--static "${variant.name}.br.tar.gz"`);
		});
		it.each(downloadable)('wires FRONTEND=$key into docker_nginx', (variant) => {
			const code = _generateCode(osLinux, methodDockerNginx, maps, coverageBbox, bbox, variant);
			expect(code).toContain(`-e FRONTEND=${variant.key}`);
		});
		it('omits frontend download when none is selected', () => {
			const none = optionsFrontend.find((f) => f.key === 'none')!;
			const code = _generateCode(osLinux, methodScript, maps, undefined, undefined, none);
			expect(code).not.toContain('Downloading frontend...');
			expect(code).not.toContain('--static');
		});
	});
});
