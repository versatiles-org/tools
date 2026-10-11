// Optional values the user can fill in below the generated code, instead of
// editing example values in the script by hand. They end up in a shell command,
// so everything that is not strictly a domain, an email address or a port is
// rejected. They are deliberately not part of the share link (see hash.ts).

// An unprivileged port, so the server runs without root. Ports below 1024 need
// `sudo` on Linux (see generate_code.ts).
export const DEFAULT_PORT = 8080;
export const EXAMPLE_DOMAIN = 'maps.example.com';
export const EXAMPLE_EMAIL = 'admin@example.com';

const DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const EMAIL_LOCAL_PATTERN = /^[a-z0-9._%+-]{1,64}$/i;

// A fully qualified domain name, as needed for issuing a TLS certificate
export function isValidDomain(value: string): boolean {
	return value.length <= 253 && DOMAIN_PATTERN.test(value);
}

export function isValidEmail(value: string): boolean {
	const at = value.lastIndexOf('@');
	if (at < 0 || value.length > 254) return false;
	return EMAIL_LOCAL_PATTERN.test(value.slice(0, at)) && isValidDomain(value.slice(at + 1));
}

export function isValidPort(value: number): boolean {
	return Number.isInteger(value) && value >= 1 && value <= 65535;
}

export function parsePort(raw: string): number | undefined {
	if (!/^\d{1,5}$/.test(raw)) return undefined;
	const port = Number(raw);
	return isValidPort(port) ? port : undefined;
}

// Ports below 1024 can only be bound by root on Linux
export function isPrivilegedPort(port: number): boolean {
	return port < 1024;
}
