import { describe, it, expect } from 'vitest';
import { generateCode } from './generate_code';
import type { BBox, OptionCoverage, OptionFrontend, OptionMaps, OptionMethod, OptionOS } from './options';
import { allMethods, optionsCoverage, optionsFrontend, optionsMaps, optionsOS } from './options';

const osWindows: OptionOS = optionsOS.find(opt => opt.key === 'windows')!;
const osLinux: OptionOS = optionsOS.find(opt => opt.key === 'linux')!;
const methodHomebrew: OptionMethod = allMethods.find(opt => opt.key === 'homebrew')!;
const methodScript: OptionMethod = allMethods.find(opt => opt.key === 'script')!;
const methodCargo: OptionMethod = allMethods.find(opt => opt.key === 'cargo')!;
const methodSource: OptionMethod = allMethods.find(opt => opt.key === 'source_code')!;
const maps: OptionMaps[] = optionsMaps;
const coverageBbox: OptionCoverage = optionsCoverage.find(opt => opt.key === 'bbox')!;
const bbox: BBox = [1, 2, 3, 4];
const frontend: OptionFrontend = optionsFrontend.find(opt => opt.key === 'standard')!;

describe('generateCode', () => {
	it('generates code for homebrew on mac/linux', () => {
		const code = generateCode(osLinux, methodHomebrew, maps);
		expect(code).toContain('brew install versatiles');
		expect(code).toContain('wget -c -O "osm.versatiles"');
		expect(code).toContain('versatiles server --port 80 "osm.versatiles"');
	});

	it('generates code for script on windows', () => {
		const code = generateCode(osWindows, methodScript, maps);
		expect(code).toContain('Invoke-WebRequest -Uri "https://github.com/versatiles-org/versatiles-rs/raw/main/helpers/install-windows.ps1"');
		expect(code).toContain('Invoke-WebRequest -OutFile "osm.versatiles"');
		expect(code).toContain('versatiles.exe server --port 80 "osm.versatiles"');
	});

	it('generates code for cargo on linux', () => {
		const code = generateCode(osLinux, methodCargo, maps);
		expect(code).toContain('curl --proto "=https" --tlsv1.2 -sSf "https://sh.rustup.rs" | sh');
		expect(code).toContain('cargo install versatiles');
		expect(code).toContain('wget -c -O "osm.versatiles"');
		expect(code).toContain('versatiles server --port 80 "osm.versatiles"');
	});

	it('generates code for source_code on windows', () => {
		const code = generateCode(osWindows, methodSource, maps);
		expect(code).toContain('git clone https://github.com/versatiles-org/versatiles-rs.git');
		expect(code).toContain('Copy-Item "target\\release\\versatiles.exe"');
		expect(code).toContain('Invoke-WebRequest -OutFile "osm.versatiles"');
		expect(code).toContain('versatiles.exe server --port 80 "osm.versatiles"');
	});

	it('includes bbox argument when coverage is bbox', () => {
		const code = generateCode(osLinux, methodScript, maps, coverageBbox, bbox);
		expect(code).toContain('--bbox "1,2,3,4"');
	});

	it('includes frontend download and server static argument', () => {
		const code = generateCode(osLinux, methodScript, maps, undefined, undefined, frontend);
		expect(code).toContain('# Download Frontend');
		expect(code).toContain('wget -c -O "frontend.br.tar.gz"');
		expect(code).toContain('--static "frontend.br.tar.gz"');
	});

	it('does not generate map or server commands if maps is empty', () => {
		const code = generateCode(osLinux, methodScript, []);
		expect(code).not.toContain('Download Maps');
		expect(code).not.toContain('Start VersaTiles Server');
	});

	it('does not generate frontend download if frontend is not provided', () => {
		const code = generateCode(osLinux, methodScript, maps);
		expect(code).not.toContain('Download Frontend');
	});
});