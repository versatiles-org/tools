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
const osMacos: OptionOS = optionsOS.find((opt) => opt.key === 'macos')!;
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
		expect(code).toContain('brew trust versatiles-org/versatiles');
		expect(code).toContain('brew install versatiles');
		expect(code).toContain('curl -C - -fLo "osm.versatiles"');
		expect(code).toContain('sudo "$(command -v versatiles)" server --port 80 "osm.versatiles"');
	});

	it('generates code for script on windows', () => {
		const code = _generateCode(osWindows, methodScript, maps);
		expect(code).toContain(
			'Invoke-WebRequest -Uri "https://github.com/versatiles-org/versatiles-rs/releases/latest/download/install-windows.ps1"'
		);
		expect(code).toContain('curl.exe -C - -fLo "osm.versatiles"');
		expect(code).toContain('versatiles.exe server --port 80 "osm.versatiles"');
	});

	it('generates code for cargo on linux', () => {
		const code = _generateCode(osLinux, methodCargo, maps);
		expect(code).toContain(
			'curl --proto "=https" --tlsv1.2 -sSf "https://sh.rustup.rs" | sh -s -- -y'
		);
		// Sourcing ~/.cargo/env must happen *before* `cargo install` so the freshly
		// installed rustup is on PATH in the current shell.
		const sourceIdx = code!.indexOf('. "$HOME/.cargo/env"');
		const installIdx = code!.indexOf('cargo install versatiles');
		expect(sourceIdx).toBeGreaterThan(-1);
		expect(installIdx).toBeGreaterThan(sourceIdx);
		expect(code).toContain('curl -C - -fLo "osm.versatiles"');
		expect(code).toContain('sudo "$(command -v versatiles)" server --port 80 "osm.versatiles"');
	});

	it('updates PATH before cargo install on windows', () => {
		const code = _generateCode(osWindows, methodCargo, maps);
		const pathIdx = code!.indexOf('$env:Path = "$env:USERPROFILE\\.cargo\\bin;$env:Path"');
		const installIdx = code!.indexOf('cargo install versatiles');
		expect(pathIdx).toBeGreaterThan(-1);
		expect(installIdx).toBeGreaterThan(pathIdx);
	});

	it('generates code for source on windows', () => {
		const code = _generateCode(osWindows, methodSource, maps);
		expect(code).toContain('git clone https://github.com/versatiles-org/versatiles-rs.git');
		// Installs into cargo's bin directory: it exists, is on PATH and needs no
		// administrator rights (unlike "C:\\Program Files").
		expect(code).toContain(
			'Copy-Item "target\\release\\versatiles.exe" "$env:USERPROFILE\\.cargo\\bin\\"'
		);
		expect(code).not.toContain('Program Files');
		expect(code).toContain('curl.exe -C - -fLo "osm.versatiles"');
		expect(code).toContain('versatiles.exe server --port 80 "osm.versatiles"');
	});

	it('fails on HTTP errors when piping the install script into a root shell', () => {
		const code = _generateCode(osLinux, methodScript, maps);
		expect(code).toContain(
			'curl -fsSL "https://github.com/versatiles-org/versatiles-rs/releases/latest/download/install-unix.sh" | sudo sh'
		);
	});

	it('uses sudo to bind port 80 on linux only', () => {
		// Port 80 is privileged on Linux. macOS allows it for regular users and
		// Windows has no sudo.
		for (const method of [methodScript, methodCargo, methodSource]) {
			expect(_generateCode(osLinux, method, maps)).toContain(
				'sudo "$(command -v versatiles)" server --port 80'
			);
			expect(_generateCode(osMacos, method, maps)).toContain('\nversatiles server --port 80');
			expect(_generateCode(osWindows, method, maps)).toContain('\nversatiles.exe server --port 80');
		}
	});

	it('restores the working directory after a source install', () => {
		// cd .. must come after the install step but before the download step,
		// otherwise the *.versatiles files land inside versatiles-rs/.
		const code = _generateCode(osLinux, methodSource, maps)!;
		const cdInIdx = code.indexOf('cd versatiles-rs');
		const cdOutIdx = code.indexOf('cd ..');
		const downloadIdx = code.indexOf('Downloading map data');
		expect(cdInIdx).toBeGreaterThan(-1);
		expect(cdOutIdx).toBeGreaterThan(cdInIdx);
		expect(downloadIdx).toBeGreaterThan(cdOutIdx);
	});

	it('includes bbox argument when coverage is bbox', () => {
		const code = _generateCode(osLinux, methodScript, maps, coverageBbox, bbox);
		expect(code).toContain('--bbox "1,2,3,4"');
	});

	it('includes frontend download and server static argument', () => {
		const code = _generateCode(osLinux, methodScript, maps, undefined, undefined, frontend);
		expect(code).toContain('Downloading frontend...');
		expect(code).toContain('curl -C - -fLo "frontend.br.tar.gz"');
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
		expect(code).toContain('curl -C - -fLo "frontend.br.tar.gz"');
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

	it('returns undefined when coverage is bbox but no rectangle was drawn', () => {
		// Regression: previously fell through to a planet-wide curl, downloading
		// ~100 GB when the user intended a small custom region.
		expect(_generateCode(osLinux, methodScript, maps, coverageBbox, undefined)).toBeUndefined();
		expect(
			_generateCode(osLinux, methodDockerNginx, maps, coverageBbox, undefined, frontend)
		).toBeUndefined();
	});

	it('emits only comments and the docker command for docker_nginx', () => {
		// Regression: a bare `...` placeholder line failed with "command not found"
		// when the script was pasted into a shell.
		const code = _generateCode(osLinux, methodDockerNginx, maps, coverageBbox, bbox, frontend)!;
		const lines = code.split('\n');
		const commandStart = lines.findIndex((line) => line.startsWith('docker run'));
		expect(commandStart).toBeGreaterThan(-1);
		for (const line of lines.slice(0, commandStart)) {
			expect(line).toMatch(/^#/);
		}
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

		it('ignores zoom when coverage is global (UI hides it; codegen mirrors that)', () => {
			const code = _generateCode(
				osLinux,
				methodScript,
				maps,
				coverageGlobal,
				undefined,
				undefined,
				3
			);
			expect(code).toContain('curl -C - -fLo "osm.versatiles"');
			expect(code).not.toContain('versatiles convert');
			expect(code).not.toContain('--min-zoom');
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
			expect(code).toContain('curl -C - -fLo "osm.versatiles"');
			expect(code).not.toContain('versatiles convert');
		});

		// versatiles-nginx doesn't expose MIN_ZOOM/MAX_ZOOM env vars (only BBOX),
		// so the generator must not emit them even if the caller passes zoom values.
		it('never emits MIN_ZOOM/MAX_ZOOM for docker_nginx (image does not support them)', () => {
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
			expect(code).not.toContain('MIN_ZOOM');
			expect(code).not.toContain('MAX_ZOOM');
		});

		it('uses convert in docker (non-nginx) when bbox + zoom is set', () => {
			const code = _generateCode(
				osLinux,
				methodDocker,
				maps,
				coverageBbox,
				bbox,
				frontend,
				undefined,
				10
			);
			expect(code).toContain('convert --bbox-border 3 --bbox "1,2,3,4" --max-zoom 10');
		});
	});

	describe('frontend variants', () => {
		const downloadable = optionsFrontend.filter((f) => f.name);
		it.each(downloadable)('downloads $name for script install ($key)', (variant) => {
			const code = _generateCode(osLinux, methodScript, maps, undefined, undefined, variant);
			expect(code).toContain(`curl -C - -fLo "${variant.name}.br.tar.gz"`);
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

	describe('server settings', () => {
		const base = { maps, coverage: coverageBbox, bbox, frontend };

		it('uses the example domain and email with a warning by default', () => {
			const code = generateCode({ os: osLinux, method: methodDockerNginx, ...base })!;
			expect(code).toContain('-e DOMAIN=maps.example.com \\');
			expect(code).toContain('-e EMAIL=admin@example.com \\');
			expect(code).toContain('# USE THE CORRECT DOMAIN AND EMAIL SETTINGS!');
		});

		it('uses domain and email for docker_nginx and drops the warning', () => {
			const code = generateCode({
				os: osLinux,
				method: methodDockerNginx,
				...base,
				domain: 'tiles.my-city.org',
				email: 'ops@my-city.org'
			})!;
			expect(code).toContain('-e DOMAIN=tiles.my-city.org \\');
			expect(code).toContain('-e EMAIL=ops@my-city.org \\');
			expect(code).not.toContain('example.com');
			expect(code).not.toContain('USE THE CORRECT DOMAIN');
			expect(code).toContain('# Point your domain to the server IP before you continue.');
		});

		it('keeps the warning while only one of domain and email is set', () => {
			const code = generateCode({
				os: osLinux,
				method: methodDockerNginx,
				...base,
				domain: 'tiles.my-city.org'
			})!;
			expect(code).toContain('-e DOMAIN=tiles.my-city.org \\');
			expect(code).toContain('-e EMAIL=admin@example.com \\');
			expect(code).toContain('# USE THE CORRECT DOMAIN AND EMAIL SETTINGS!');
		});

		it('never emits invalid values', () => {
			const code = generateCode({
				os: osLinux,
				method: methodDockerNginx,
				...base,
				domain: 'a.com; rm -rf /',
				email: '$(id)@example.com'
			})!;
			expect(code).toContain('-e DOMAIN=maps.example.com \\');
			expect(code).toContain('-e EMAIL=admin@example.com \\');
			expect(code).not.toContain('rm -rf');
			expect(code).not.toContain('$(id)');

			for (const port of [0, 65536, 80.5, NaN]) {
				expect(generateCode({ os: osMacos, method: methodScript, ...base, port })).toContain(
					'versatiles server --port 80 '
				);
			}
		});

		it('ignores the port for docker_nginx', () => {
			const code = generateCode({ os: osLinux, method: methodDockerNginx, ...base, port: 8080 })!;
			expect(code).toContain('-p 80:80 -p 443:443 \\');
			expect(code).not.toContain('8080');
		});

		it('maps the port for docker', () => {
			const code = generateCode({ os: osLinux, method: methodDocker, ...base, port: 8081 })!;
			expect(code).toContain('docker run -d --name versatiles -p 8081:8080 -v $(pwd):/data');
		});

		it('ignores domain and email for other methods', () => {
			const code = generateCode({
				os: osLinux,
				method: methodScript,
				...base,
				domain: 'tiles.my-city.org',
				email: 'ops@my-city.org'
			})!;
			expect(code).not.toContain('my-city.org');
		});

		it.each([methodScript, methodCargo, methodSource])(
			'uses the port for $key on all operating systems',
			(method) => {
				for (const os of [osLinux, osMacos, osWindows]) {
					expect(generateCode({ os, method, ...base, port: 8080 })).toContain(
						' server --port 8080 '
					);
				}
			}
		);

		it('uses sudo on linux only for privileged ports', () => {
			const run = (port?: number) =>
				generateCode({ os: osLinux, method: methodScript, ...base, port })!;
			expect(run()).toContain('sudo "$(command -v versatiles)" server --port 80 ');
			expect(run(443)).toContain('sudo "$(command -v versatiles)" server --port 443 ');
			expect(run(1023)).toContain('sudo "$(command -v versatiles)" server --port 1023 ');
			expect(run(1024)).toContain('\nversatiles server --port 1024 ');
			expect(run(8080)).toContain('\nversatiles server --port 8080 ');
			expect(run(8080)).not.toContain('sudo "$(command');
		});
	});
});
