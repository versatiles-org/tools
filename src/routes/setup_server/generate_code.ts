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
import type { KeyOS } from './options';
import { wrapCommand } from './shell_format';
import type { SetupState } from './types';

// The server settings are typed in by the user and end up in a shell command,
// so anything invalid is replaced by the example value or the default.
function serverSettings({ domain, email, port }: Pick<SetupState, 'domain' | 'email' | 'port'>) {
	return {
		validDomain: domain !== undefined && isValidDomain(domain) ? domain : undefined,
		validEmail: email !== undefined && isValidEmail(email) ? email : undefined,
		serverPort: port !== undefined && isValidPort(port) ? port : DEFAULT_PORT
	};
}

// Whether the server is started with sudo: binding a privileged port (like 80)
// requires root on Linux.
function serverNeedsSudo(os: KeyOS, port: number): boolean {
	return os === 'linux' && isPrivilegedPort(port);
}

/**
 * Remarks on the generated code, to be shown next to it. They are not comments
 * in the code, because not every shell accepts comments in pasted code.
 */
export function generateNotes(state: SetupState): string[] {
	const { os, method, maps, coverage, frontend } = state;
	if (!os || !method) return [];

	const { validDomain, validEmail, serverPort } = serverSettings(state);
	const notes: string[] = [];

	if (method.key === 'docker' || method.key === 'docker_nginx') {
		notes.push(
			'Docker has to be installed, for example with: curl -fsSL https://get.docker.com | sudo sh'
		);
	}

	if (method.key === 'docker_nginx') {
		notes.push('Point your domain to the IP address of the server before you run the command.');
		if (!validDomain || !validEmail) {
			notes.push('Replace the example domain and email address with your own in the fields above.');
		}
		return notes;
	}

	const downloadsMaps = maps.length > 0 && coverage?.key !== 'bbox';
	if (downloadsMaps || frontend?.name) {
		notes.push('If a download is interrupted, run its command again: "curl -C -" resumes it.');
	}

	if (method.key !== 'docker' && maps.length > 0 && serverNeedsSudo(os.key, serverPort)) {
		notes.push(
			'Ports below 1024 are reserved for root on Linux, so the server is started with sudo.'
		);
	}

	return notes;
}

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

	const { validDomain, validEmail, serverPort } = serverSettings({ domain, email, port });

	// The code consists of sections, each one a heading followed by its commands.
	// A heading is an `echo`, not a comment: zsh, the default shell of macOS, does
	// not know comments when code is pasted into it and would try to run them.
	// So the code contains no comments at all; see `generateNotes` for remarks.
	const sections =
		method.key === 'docker' || method.key === 'docker_nginx'
			? [...runDocker()]
			: [...installVersatiles(), ...downloadMaps(), ...downloadFrontend(), ...startServer()];

	return sections.map((section) => section.join('\n')).join('\n\n');

	function heading(text: string): string {
		return `echo "${text}..."`;
	}

	function wrap(...parts: string[]): string {
		return wrapCommand(os!.key, parts);
	}

	function* runDocker(): Generator<string[]> {
		if (method!.key === 'docker') {
			yield* downloadMaps('docker run -it --rm -v "$(pwd)":/data versatiles/versatiles:latest');
			yield* downloadFrontend();
			yield [
				heading('Starting VersaTiles server in a Docker container'),
				wrap(
					'docker run -d --name versatiles',
					`-p ${serverPort}:8080`,
					'-v "$(pwd)":/data',
					'versatiles/versatiles:latest serve',
					...serverArgs()
				)
			];
			return;
		}

		const args = [
			'-p 80:80 -p 443:443',
			'-v "$(pwd)/data":/data',
			`-e DOMAIN=${validDomain ?? EXAMPLE_DOMAIN}`,
			`-e EMAIL=${validEmail ?? EXAMPLE_EMAIL}`,
			`-e TILE_SOURCES=${maps.map((m) => m.key + '.versatiles').join(',')}`
		];
		if (bboxArg) args.push(`-e BBOX="${bboxArg}"`);
		args.push(`-e FRONTEND=${frontend?.key ?? 'standard'}`);

		yield [
			heading('Starting VersaTiles server with Nginx and TLS'),
			wrap('docker run -d --name versatiles', ...args, 'versatiles/versatiles-nginx:latest')
		];
	}

	function* installVersatiles(): Generator<string[]> {
		const windows = os!.key === 'windows';

		switch (method!.key) {
			case 'homebrew':
				yield [
					heading('Installing VersaTiles'),
					'brew tap versatiles-org/versatiles',
					'brew trust versatiles-org/versatiles',
					'brew install versatiles'
				];
				break;
			case 'script': {
				const url = 'https://github.com/versatiles-org/versatiles-rs/releases/latest/download';
				if (windows) {
					yield [
						heading('Installing VersaTiles'),
						wrap(
							'Invoke-WebRequest',
							`-Uri "${url}/install-windows.ps1"`,
							'-OutFile "$env:TEMP\\install-windows.ps1"'
						),
						'. "$env:TEMP\\install-windows.ps1"'
					];
				} else {
					// `-f`: fail on HTTP errors instead of piping an error page into a root shell.
					yield [heading('Installing VersaTiles'), `curl -fsSL "${url}/install-unix.sh" | sudo sh`];
				}
				break;
			}
			case 'cargo':
				if (windows) {
					yield [
						heading('Installing Rust'),
						'Invoke-WebRequest https://win.rustup.rs/ -OutFile rustup-init.exe',
						'.\\rustup-init.exe -y',
						// rustup-init updates the user profile but not the current shell —
						// prepend ~/.cargo/bin to PATH so `cargo` is found this session.
						'$env:Path = "$env:USERPROFILE\\.cargo\\bin;$env:Path"'
					];
				} else {
					yield [
						heading('Installing Rust'),
						'curl --proto "=https" --tlsv1.2 -sSf "https://sh.rustup.rs" | sh -s -- -y',
						// rustup-init writes ~/.cargo/env; source it so `cargo` is on PATH
						// in the current shell (without restarting).
						'. "$HOME/.cargo/env"'
					];
				}
				yield [heading('Compiling and installing VersaTiles'), 'cargo install versatiles'];
				break;
			case 'source':
				yield [
					heading('Building VersaTiles from source'),
					'git clone https://github.com/versatiles-org/versatiles-rs.git',
					'cd versatiles-rs',
					'cargo build --bin versatiles --release'
				];
				yield [
					heading('Installing binary'),
					windows
						? // Cargo's bin directory exists and is on PATH wherever the Rust
							// toolchain is installed, and needs no administrator rights.
							'Copy-Item "target\\release\\versatiles.exe" "$env:USERPROFILE\\.cargo\\bin\\"'
						: 'sudo cp target/release/versatiles /usr/local/bin/',
					// Return to the original working directory so subsequent map / frontend
					// downloads don't land inside versatiles-rs/.
					'cd ..'
				];
				break;
		}
	}

	function* downloadMaps(alternateVersatilesBin?: string): Generator<string[]> {
		if (maps.length === 0) return;

		const section = [heading('Downloading map data')];

		const zoomFlags: string[] = [];
		if (effectiveMinZoom !== undefined) zoomFlags.push(`--min-zoom ${effectiveMinZoom}`);
		if (effectiveMaxZoom !== undefined) zoomFlags.push(`--max-zoom ${effectiveMaxZoom}`);

		for (const map of maps) {
			const filename = `${map.key}.versatiles`;
			const url = `https://download.versatiles.org/${filename}`;
			if (needsConvert) {
				const parts = [`${alternateVersatilesBin ?? versatilesBin} convert`];
				if (bboxArg) parts.push(`--bbox "${bboxArg}" --bbox-border ${BORDER}`);
				if (zoomFlags.length > 0) parts.push(zoomFlags.join(' '));
				section.push(wrap(...parts, `"${url}"`, `"${filename}"`));
			} else {
				section.push(`${curlBin} -C - -fLo "${filename}" "${url}"`);
			}
		}

		yield section;
	}

	function* downloadFrontend(): Generator<string[]> {
		if (!frontend || !frontend.name) return;

		const filename = `${frontend.name}.br.tar.gz`;
		const url = `https://github.com/versatiles-org/versatiles-frontend/releases/latest/download/${filename}`;
		yield [heading('Downloading frontend'), wrap(`${curlBin} -C - -fLo "${filename}"`, `"${url}"`)];
	}

	// Arguments of the server that are the same for all methods
	function serverArgs(): string[] {
		const args: string[] = [];
		if (frontend?.name) args.push(`--static "${frontend.name}.br.tar.gz"`);
		args.push(maps.map((map) => `"${map.key}.versatiles"`).join(' '));
		return args;
	}

	function* startServer(): Generator<string[]> {
		if (maps.length === 0) return;

		// `command -v` resolves the binary first, because sudo's restricted PATH may
		// not contain it (e.g. ~/.cargo/bin).
		const needsSudo = serverNeedsSudo(os!.key, serverPort);
		const serverBin = needsSudo ? `sudo "$(command -v ${versatilesBin})"` : versatilesBin;

		yield [
			heading('Starting VersaTiles server'),
			wrap(`${serverBin} serve`, `--port ${serverPort}`, ...serverArgs())
		];
	}
}
