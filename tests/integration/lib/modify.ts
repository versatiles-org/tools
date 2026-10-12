/**
 * CI modifications: backgrounding, env vars. The port is passed to the code
 * generator directly (see generate.ts), except for docker_nginx which has none.
 */

import type { KeyOS } from '../../../src/routes/setup_server/options.js';
import { unwrapCommands } from '../../../src/routes/setup_server/shell_format.js';

export const PORT = 8080;

// Splits off the last command, which for the native methods is the one that
// starts the server. It may span several lines; it is returned on a single one.
export function splitServerCommand(code: string): { before: string; command: string } {
	const lines = code.split('\n');
	let end = lines.length - 1;
	while (end >= 0 && (!lines[end].trim() || lines[end].trim().startsWith('#'))) end--;
	if (end < 0) throw new Error('Generated code contains no command');

	let start = end;
	while (start > 0 && /[\\`]$/.test(lines[start - 1])) start--;

	return {
		before: lines.slice(0, start).join('\n'),
		command: unwrapCommands(lines.slice(start, end + 1).join('\n'))
	};
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
				const { before, command } = splitServerCommand(code);
				if (!command.startsWith('versatiles.exe serve ')) {
					throw new Error(`Expected the last command to start the server, but got: ${command}`);
				}
				const args = command.replace('versatiles.exe ', '');
				return [
					before,
					`$proc = Start-Process versatiles.exe -ArgumentList '${args}' -PassThru -NoNewWindow`,
					'$proc.Id | Out-File -Encoding ascii "$PSScriptRoot\\server.pid"'
				].join('\n');
			}

			// Background the server and save PID. The command keeps its line breaks,
			// so the code that runs is laid out like the code a user copies.
			const redirect = logFile ? ' > "$_SMOKE_DIR/server.log" 2>&1' : '';
			return `${code.trimEnd()}${redirect} & echo $! > "$_SMOKE_DIR/server.pid"`;
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
