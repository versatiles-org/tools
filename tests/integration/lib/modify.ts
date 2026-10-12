/**
 * CI modifications: backgrounding, env vars. The port is passed to the code
 * generator directly (see generate.ts), except for docker_nginx which has none.
 */

import type { KeyOS } from '../../../src/routes/setup_server/options.js';

export const PORT = 8080;

// Returns the last line that is a command, which for the native methods is the
// one that starts the server.
export function findServerLine(lines: string[]): number {
	for (let i = lines.length - 1; i >= 0; i--) {
		const trimmed = lines[i].trim();
		if (trimmed && !trimmed.startsWith('#')) return i;
	}
	throw new Error('Generated code contains no command');
}

export function applyModifications(
	code: string,
	methodKey: string,
	osKey: KeyOS,
	// Redirect the server's output to a file. Needed where the script's output is
	// a pipe (`docker exec`), which a background process would keep open.
	{ logFile = false }: { logFile?: boolean } = {}
): string {
	switch (methodKey) {
		case 'script':
		case 'homebrew':
		case 'cargo':
		case 'source': {
			if (osKey === 'windows') {
				// Background the server with Start-Process and save PID
				code = code.replace(/^(versatiles\.exe server .+)$/m, (match) => {
					const args = match.replace('versatiles.exe ', '');
					return [
						`$proc = Start-Process versatiles.exe -ArgumentList '${args}' -PassThru -NoNewWindow`,
						'$proc.Id | Out-File -Encoding ascii "$PSScriptRoot\\server.pid"'
					].join('\n');
				});
			} else {
				// Background the server and save PID
				const lines = code.split('\n');
				const redirect = logFile ? ' > "$_SMOKE_DIR/server.log" 2>&1' : '';
				lines[findServerLine(lines)] += `${redirect} & echo $! > "$_SMOKE_DIR/server.pid"`;
				code = lines.join('\n');
			}
			return code;
		}

		case 'docker': {
			code = code.replaceAll('docker run -it', 'docker run -i');
			return code;
		}

		case 'docker_nginx': {
			code = code.replace('-p 80:80 -p 443:443', `-p ${PORT}:80`);
			code = code.replace('DOMAIN=maps.example.com', 'DOMAIN=localhost');
			// Insert HTTP_ONLY=true after DOMAIN line
			code = code.replace(
				'-e DOMAIN=localhost \\\n',
				'-e DOMAIN=localhost \\\n  -e HTTP_ONLY=true \\\n'
			);
			// Remove EMAIL line
			code = code
				.split('\n')
				.filter((l) => !l.includes('-e EMAIL='))
				.join('\n');
			return code;
		}

		default:
			return code;
	}
}
