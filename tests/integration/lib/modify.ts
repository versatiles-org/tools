/**
 * CI modifications: port overrides, backgrounding, env vars.
 */

import type { KeyOS } from '../../../src/routes/setup_server/options.js';

export const PORT = 8080;

export function applyModifications(code: string, methodKey: string, osKey: KeyOS): string {
	switch (methodKey) {
		case 'script':
		case 'homebrew':
		case 'cargo':
		case 'source': {
			code = code.replace('--port 80', `--port ${PORT}`);

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
				// Background the server (last non-comment, non-empty line) and save PID
				const lines = code.split('\n');
				for (let i = lines.length - 1; i >= 0; i--) {
					const trimmed = lines[i].trim();
					if (trimmed && !trimmed.startsWith('#')) {
						lines[i] += ' & echo $! > "$_SMOKE_DIR/server.pid"';
						break;
					}
				}
				code = lines.join('\n');
			}
			return code;
		}

		case 'docker': {
			code = code.replace('-p 80:8080', `-p ${PORT}:8080`);
			code = code.replaceAll('docker run -it', 'docker run -i');
			return code;
		}

		case 'docker_nginx': {
			// Remove placeholder lines (e.g. bare "...")
			code = code
				.split('\n')
				.filter((l) => l.trim() !== '...')
				.join('\n');
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
