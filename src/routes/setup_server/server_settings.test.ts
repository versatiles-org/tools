import { describe, it, expect } from 'vitest';
import {
	isPrivilegedPort,
	isValidDomain,
	isValidEmail,
	isValidPort,
	parsePort
} from './server_settings';

// The values end up in a shell command, so these must never be accepted.
const SHELL_INJECTIONS = [
	'a.com; rm -rf /',
	'a.com && id',
	'$(id).example.com',
	'`id`.example.com',
	'a.com | sh',
	'a.com\nid',
	'a.com "x"',
	"a.com 'x'",
	'a.com\\',
	'a.com > /etc/passwd'
];

describe('isValidDomain', () => {
	it.each(['maps.example.com', 'example.org', 'a-b.c-d.example.co.uk', 'XN--BCHER-KVA.example'])(
		'accepts %s',
		(value) => {
			expect(isValidDomain(value)).toBe(true);
		}
	);

	it.each([
		'',
		'localhost',
		'example',
		'.example.com',
		'example.com.',
		'-a.example.com',
		'a-.example.com',
		'a..example.com',
		'exa mple.com',
		'https://example.com',
		'example.com/path',
		'example.com:8080',
		'192.168.0.1',
		`${'a'.repeat(64)}.example.com`,
		`${'a.'.repeat(126)}com`,
		...SHELL_INJECTIONS
	])('rejects %j', (value) => {
		expect(isValidDomain(value)).toBe(false);
	});
});

describe('isValidEmail', () => {
	it.each(['admin@example.com', 'first.last+tag@maps.example.org', 'a_b%c-d@example.co.uk'])(
		'accepts %s',
		(value) => {
			expect(isValidEmail(value)).toBe(true);
		}
	);

	it.each([
		'',
		'admin',
		'@example.com',
		'admin@',
		'admin@localhost',
		'ad min@example.com',
		'admin@@example.com',
		'"admin"@example.com',
		'admin@example.com;id',
		'$(id)@example.com',
		'`id`@example.com',
		'a|b@example.com',
		`${'a'.repeat(65)}@example.com`,
		...SHELL_INJECTIONS.map((domain) => `admin@${domain}`)
	])('rejects %j', (value) => {
		expect(isValidEmail(value)).toBe(false);
	});
});

describe('parsePort', () => {
	it.each([
		['1', 1],
		['80', 80],
		['8080', 8080],
		['65535', 65535]
	])('parses %s', (raw, port) => {
		expect(parsePort(raw)).toBe(port);
	});

	it.each(['', '0', '65536', '123456', '-1', '80.5', '8e3', '0x50', ' 80', '80; id', '$(id)'])(
		'rejects %j',
		(raw) => {
			expect(parsePort(raw)).toBeUndefined();
		}
	);
});

describe('isValidPort', () => {
	it('accepts integers from 1 to 65535 only', () => {
		expect(isValidPort(1)).toBe(true);
		expect(isValidPort(65535)).toBe(true);
		expect(isValidPort(0)).toBe(false);
		expect(isValidPort(65536)).toBe(false);
		expect(isValidPort(80.5)).toBe(false);
		expect(isValidPort(NaN)).toBe(false);
	});
});

describe('isPrivilegedPort', () => {
	it('is true below 1024', () => {
		expect(isPrivilegedPort(80)).toBe(true);
		expect(isPrivilegedPort(1023)).toBe(true);
		expect(isPrivilegedPort(1024)).toBe(false);
		expect(isPrivilegedPort(8080)).toBe(false);
	});
});
