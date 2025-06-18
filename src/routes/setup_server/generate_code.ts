import type {
	BBox,
	OptionCoverage,
	OptionFrontend,
	OptionMaps,
	OptionMethod,
	OptionOS
} from './options';

export function generateCode(
	os: OptionOS,
	method: OptionMethod,
	maps: OptionMaps[],
	coverage?: OptionCoverage,
	bbox?: BBox,
	frontend?: OptionFrontend
): string {
	const versatilesBin = os.key === 'windows' ? 'versatiles.exe' : 'versatiles';

	return [...installVersatiles(), ...downloadMaps(), ...downloadFrontend(), ...startServer()].join(
		'\n'
	);

	function* installVersatiles(): Generator<string> {
		switch (method.key) {
			case 'homebrew':
				yield `# Install VersaTiles`;
				yield `brew tap versatiles-org/versatiles`;
				yield `brew install versatiles`;
				break;
			case 'script':
				yield `# Install VersaTiles`;
				if (os.key === 'windows') {
					yield 'Invoke-WebRequest -Uri "https://github.com/versatiles-org/versatiles-rs/raw/main/helpers/install-windows.ps1" -OutFile "$env:TEMP\\install-windows.ps1"\n. "$env:TEMP\\install-windows.ps1"';
				} else {
					yield 'curl -Ls "https://raw.githubusercontent.com/versatiles-org/versatiles-rs/main/helpers/install-unix.sh" | bash';
				}
				break;
			case 'cargo':
				yield '# install rust, also see: https://www.rust-lang.org/tools/install';
				if (os.key === 'windows') {
					yield 'Invoke-WebRequest https://win.rustup.rs/ -OutFile rustup-init.exe\n.\\rustup-init.exe';
				} else {
					yield 'curl --proto "=https" --tlsv1.2 -sSf "https://sh.rustup.rs" | sh';
				}
				yield '# compile and install versatiles';
				yield 'cargo install versatiles';
				break;
			case 'source_code':
				yield '# clone the repository';
				yield `git clone https://github.com/versatiles-org/versatiles-rs.git`;
				yield '# navigate to the project directory';
				yield 'cd versatiles-rs';
				yield '# build the project';
				yield 'cargo build --release';
				yield '# install the binary';
				if (os.key === 'windows') {
					yield 'Copy-Item "target\\release\\versatiles.exe" "C:\\Program Files\\versatiles\\"';
				} else {
					yield 'sudo cp target/release/versatiles /usr/local/bin/';
				}
				break;
		}
	}

	function* downloadMaps(): Generator<string> {
		if (maps.length === 0) return;

		yield `\n# Download Maps`;

		const bboxArg = coverage?.key === 'bbox' && bbox ? `--bbox "${bbox.join(',')}"` : false;
		for (const map of maps) {
			const filename = `${map.key}.versatiles`;
			const url = `https://download.versatiles.org/${filename}`;
			if (bboxArg) {
				yield `${versatilesBin} convert --bbox-border 3 --bbox "${bboxArg}" "${url}" "${filename}"`;
			} else {
				if (os.key === 'windows') {
					yield `Invoke-WebRequest -OutFile "${filename}" -Uri "${url}"`;
				} else {
					yield `wget -c -O "${filename}" "${url}"`;
				}
			}
		}
	}

	function* downloadFrontend(): Generator<string> {
		if (!frontend || !frontend.name) return;

		yield `\n# Download Frontend`;

		const filename = `${frontend.name}.br.tar.gz`;
		const url = `https://github.com/versatiles-org/versatiles-frontend/releases/latest/download/${filename}`;
		if (os.key === 'windows') {
			yield `Invoke-WebRequest -OutFile "${filename}" -Uri "${url}"`;
		} else {
			yield `wget -c -O "${filename}" "${url}"`;
		}
	}

	function* startServer(): Generator<string> {
		if (maps.length === 0) return;

		yield `\n# Start VersaTiles Server`;

		const serverArgs = ['--port 80'];

		if (frontend?.name) {
			serverArgs.push(`--static "${frontend.name}.br.tar.gz"`);
		}

		for (const map of maps) {
			serverArgs.push(`"${map.key}.versatiles"`);
		}

		yield `${versatilesBin} server ${serverArgs.join(' ')}`;
	}
}
