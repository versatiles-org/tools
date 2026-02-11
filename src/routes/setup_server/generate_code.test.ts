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
	frontend?: OptionFrontend
): string | undefined {
	return generateCode({ os, method, maps, coverage, bbox, frontend });
}

describe('generateCode', () => {
	it('generates code for homebrew on mac/linux', () => {
		const code = _generateCode(osLinux, methodHomebrew, maps);
		expect(code).toContain('brew install versatiles');
		expect(code).toContain('wget -cO "osm.versatiles"');
		expect(code).toContain('versatiles server --port 80 "osm.versatiles"');
	});

	it('generates code for script on windows', () => {
		const code = _generateCode(osWindows, methodScript, maps);
		expect(code).toContain(
			'Invoke-WebRequest -Uri "https://github.com/versatiles-org/versatiles-rs/raw/main/scripts/install-windows.ps1"'
		);
		expect(code).toContain('Invoke-WebRequest -OutFile "osm.versatiles"');
		expect(code).toContain('versatiles.exe server --port 80 "osm.versatiles"');
	});

	it('generates code for cargo on linux', () => {
		const code = _generateCode(osLinux, methodCargo, maps);
		expect(code).toContain('curl --proto "=https" --tlsv1.2 -sSf "https://sh.rustup.rs" | sh');
		expect(code).toContain('cargo install versatiles');
		expect(code).toContain('wget -cO "osm.versatiles"');
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
		expect(code).toContain('# Download Frontend');
		expect(code).toContain('wget -cO "frontend.br.tar.gz"');
		expect(code).toContain('--static "frontend.br.tar.gz"');
	});

	it('does not generate map or server commands if maps is empty', () => {
		const code = _generateCode(osLinux, methodScript, []);
		expect(code).not.toContain('Download Maps');
		expect(code).not.toContain('Start VersaTiles Server');
	});

	it('does not generate frontend download if frontend is not provided', () => {
		const code = _generateCode(osLinux, methodScript, maps);
		expect(code).not.toContain('Download Frontend');
	});

	it('generates code for docker on linux with maps, frontend, and bbox', () => {
		const code = _generateCode(osLinux, methodDocker, maps, coverageBbox, bbox, frontend);
		expect(code).toContain('# Install Docker');
		expect(code).toContain('# Download Frontend');
		expect(code).toContain('wget -cO "frontend.br.tar.gz"');
		expect(code).toContain('docker run -it --rm -v $(pwd):/data versatiles/versatiles:latest');
		expect(code).toContain('--bbox "1,2,3,4"');
		expect(code).toContain('# Configure and run Docker container');
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
});
