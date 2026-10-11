import { BORDER } from './components/size_estimate';
import {
	DEFAULT_PORT,
	EXAMPLE_DOMAIN,
	EXAMPLE_EMAIL,
	isPrivilegedPort,
	isValidDomain,
	isValidEmail,
	isValidPort
} from './server_settings';
import type { SetupState } from './types';

export function generateCode({
	os,
	method,
	maps,
	coverage,
	bbox,
	minZoom,
	maxZoom,
	frontend,
	domain,
	email,
	port
}: SetupState): string | undefined {
	if (!os || !method) return undefined;
	// Bbox coverage requires an actual rectangle. Without this guard, the script
	// silently falls through to a full-planet curl which is almost never what
	// the user picking "Custom region" intends.
	if (coverage?.key === 'bbox' && !bbox) return undefined;

	const versatilesBin = os.key === 'windows' ? 'versatiles.exe' : 'versatiles';
	// curl.exe ships with Windows 10+ (build 17063, April 2018); using it on
	// both OSes lets us pass `-C -` to resume interrupted multi-GB downloads.
	const curlBin = os.key === 'windows' ? 'curl.exe' : 'curl';
	const isBbox = coverage?.key === 'bbox';
	const bboxArg = isBbox && bbox ? bbox.join(',') : undefined;
	// Zoom limits are only meaningful when restricting to a custom region, and
	// versatiles-nginx doesn't expose MIN_ZOOM/MAX_ZOOM env vars — only BBOX —
	// so we drop zoom for that method instead of emitting flags the image ignores.
	const methodSupportsZoom = method.key !== 'docker_nginx';
	const effectiveMinZoom = isBbox && methodSupportsZoom ? minZoom : undefined;
	const effectiveMaxZoom = isBbox && methodSupportsZoom ? maxZoom : undefined;
	const needsConvert =
		bboxArg !== undefined || effectiveMinZoom !== undefined || effectiveMaxZoom !== undefined;

	// These values are typed in by the user and end up in a shell command, so
	// anything invalid is replaced by the example value or the default.
	const validDomain = domain !== undefined && isValidDomain(domain) ? domain : undefined;
	const validEmail = email !== undefined && isValidEmail(email) ? email : undefined;
	const serverPort = port !== undefined && isValidPort(port) ? port : DEFAULT_PORT;

	if (method.key.startsWith('docker')) {
		return [...runDocker()].join('\n');
	}

	return [...installVersatiles(), ...downloadMaps(), ...downloadFrontend(), ...startServer()].join(
		'\n'
	);

	function* runDocker(): Generator<string> {
		yield `# Install Docker on your server,`;
		yield `# e.g. \`curl -fsSL https://get.docker.com | sudo sh\``;
		switch (method!.key) {
			case 'docker': {
				yield* downloadFrontend();
				yield* downloadMaps(
					'docker run -it --rm -v $(pwd):/data versatiles/versatiles:latest \\\n'
				);

				const serverArgs = [];
				if (frontend?.name) {
					serverArgs.push(`--static "${frontend.name}.br.tar.gz"`);
				}
				for (const map of maps) {
					serverArgs.push(`"${map.key}.versatiles"`);
				}

				yield ``;
				yield `echo "Configuring and running Docker container..."`;
				yield `docker run -d --name versatiles -p ${serverPort}:8080 -v $(pwd):/data versatiles/versatiles:latest \\`;
				yield `  serve ${serverArgs.join(' ')}`;
				break;
			}
			case 'docker_nginx':
				yield `# Point your domain to the server IP before you continue.`;
				if (!validDomain || !validEmail) {
					yield `# USE THE CORRECT DOMAIN AND EMAIL SETTINGS!`;
				}
				yield `docker run -d --name versatiles \\`;
				yield `  -p 80:80 -p 443:443 \\`;
				yield `  -v $(pwd)/data:/data \\`;
				yield `  -e DOMAIN=${validDomain ?? EXAMPLE_DOMAIN} \\`;
				yield `  -e EMAIL=${validEmail ?? EXAMPLE_EMAIL} \\`;
				yield `  -e TILE_SOURCES=${maps.map((m) => m.key + '.versatiles').join(',')} \\`;

				if (bboxArg) {
					yield `  -e BBOX="${bboxArg}" \\`;
				}

				yield `  -e FRONTEND=${frontend?.key ?? 'standard'} \\`;
				yield `  versatiles/versatiles-nginx:latest`;
				break;
			default:
				yield `# Unsupported Docker method ${method!.key}`;
				break;
		}
	}

	function* installVersatiles(): Generator<string> {
		switch (method!.key) {
			case 'homebrew':
				yield `echo "Installing VersaTiles..."`;
				yield `brew tap versatiles-org/versatiles`;
				yield `brew trust versatiles-org/versatiles`;
				yield `brew install versatiles`;
				break;
			case 'script':
				yield `echo "Installing VersaTiles..."`;
				if (os!.key === 'windows') {
					yield 'Invoke-WebRequest -Uri "https://github.com/versatiles-org/versatiles-rs/releases/latest/download/install-windows.ps1" -OutFile "$env:TEMP\\install-windows.ps1"\n. "$env:TEMP\\install-windows.ps1"';
				} else {
					// `-f`: fail on HTTP errors instead of piping an error page into a root shell.
					yield 'curl -fsSL "https://github.com/versatiles-org/versatiles-rs/releases/latest/download/install-unix.sh" | sudo sh';
				}
				break;
			case 'cargo':
				yield 'echo "Installing Rust..."';
				if (os!.key === 'windows') {
					yield 'Invoke-WebRequest https://win.rustup.rs/ -OutFile rustup-init.exe\n.\\rustup-init.exe -y';
					// rustup-init updates the user profile but not the current shell —
					// prepend ~/.cargo/bin to PATH so `cargo` is found this session.
					yield '$env:Path = "$env:USERPROFILE\\.cargo\\bin;$env:Path"';
				} else {
					yield 'curl --proto "=https" --tlsv1.2 -sSf "https://sh.rustup.rs" | sh -s -- -y';
					// rustup-init writes ~/.cargo/env; source it so `cargo` is on PATH
					// in the current shell (without restarting).
					yield '. "$HOME/.cargo/env"';
				}
				yield 'echo "Compiling and installing VersaTiles..."';
				yield 'cargo install versatiles';
				break;
			case 'source':
				yield 'echo "Cloning repository..."';
				yield `git clone https://github.com/versatiles-org/versatiles-rs.git`;
				yield 'cd versatiles-rs';
				yield 'echo "Building project..."';
				yield 'cargo build --bin versatiles --release';
				yield 'echo "Installing binary..."';
				if (os!.key === 'windows') {
					// Cargo's bin directory exists and is on PATH wherever the Rust
					// toolchain is installed, and needs no administrator rights.
					yield 'Copy-Item "target\\release\\versatiles.exe" "$env:USERPROFILE\\.cargo\\bin\\"';
				} else {
					yield 'sudo cp target/release/versatiles /usr/local/bin/';
				}
				// Return to the original working directory so subsequent map / frontend
				// downloads don't land inside versatiles-rs/.
				yield 'cd ..';
				break;
		}
	}

	function* downloadMaps(alternateVersatilesBin?: string): Generator<string> {
		if (maps.length === 0) return;

		yield `\necho "Downloading map data..."`;

		for (const map of maps) {
			const filename = `${map.key}.versatiles`;
			const url = `https://download.versatiles.org/${filename}`;
			if (needsConvert) {
				const flags: string[] = [];
				if (bboxArg) flags.push(`--bbox-border ${BORDER}`, `--bbox "${bboxArg}"`);
				if (effectiveMinZoom !== undefined) flags.push(`--min-zoom ${effectiveMinZoom}`);
				if (effectiveMaxZoom !== undefined) flags.push(`--max-zoom ${effectiveMaxZoom}`);
				yield `${alternateVersatilesBin ?? versatilesBin} convert ${flags.join(' ')} "${url}" "${filename}"`;
			} else {
				yield `${curlBin} -C - -fLo "${filename}" "${url}"`;
			}
		}
	}

	function* downloadFrontend(): Generator<string> {
		if (!frontend || !frontend.name) return;

		yield `\necho "Downloading frontend..."`;

		const filename = `${frontend.name}.br.tar.gz`;
		const url = `https://github.com/versatiles-org/versatiles-frontend/releases/latest/download/${filename}`;
		yield `${curlBin} -C - -fLo "${filename}" "${url}"`;
	}

	function* startServer(): Generator<string> {
		if (maps.length === 0) return;

		yield `\necho "Starting VersaTiles server..."`;

		const serverArgs = [`--port ${serverPort}`];

		if (frontend?.name) {
			serverArgs.push(`--static "${frontend.name}.br.tar.gz"`);
		}

		for (const map of maps) {
			serverArgs.push(`"${map.key}.versatiles"`);
		}

		// Binding a privileged port (like the default 80) requires root on Linux.
		// `command -v` resolves the binary first, because sudo's restricted PATH may
		// not contain it (e.g. ~/.cargo/bin).
		const needsSudo = os!.key === 'linux' && isPrivilegedPort(serverPort);
		const serverBin = needsSudo ? `sudo "$(command -v ${versatilesBin})"` : versatilesBin;

		yield `${serverBin} server ${serverArgs.join(' ')}`;
	}
}
