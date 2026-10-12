import type { KeyOS } from './options';

// Layout of the generated code: long commands are spread over several lines,
// so they can be read without scrolling sideways.

const INDENT = '  ';

// The character that continues a command on the next line: a backtick in
// PowerShell, a backslash in POSIX shells.
function continuation(os: KeyOS): string {
	return os === 'windows' ? '`' : '\\';
}

/** Formats a command with one part per line. */
export function wrapCommand(os: KeyOS, parts: string[]): string {
	return parts.join(` ${continuation(os)}\n${INDENT}`);
}

/** Reverses `wrapCommand` for a whole script: every command is on one line again. */
export function unwrapCommands(code: string): string {
	return code.replace(/ [\\`]\n[ \t]+/g, ' ');
}
