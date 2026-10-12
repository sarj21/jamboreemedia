import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

const COOKIE_NAME = 'jamboree_admin';
const SESSION_DAYS = 7;

/**
 * Bumped when the token payload changed shape. A v1 cookie is `admin.<expires>`
 * and a v2 is `v2.<expires>.<user>`, so the version prefix lets old cookies be
 * rejected cleanly instead of being mis-parsed.
 */
const TOKEN_VERSION = 'v2';

export type AdminUser = {
	/** Lowercased: usernames are matched case-insensitively. */
	name: string;
	password: string;
};

export type Session = {
	username: string;
	expires: number;
};

function secret(): string | null {
	return env.SESSION_SECRET || null;
}

/** Constant-time string comparison that tolerates differing lengths. */
function safeEqual(a: string, b: string): boolean {
	const ab = Buffer.from(a);
	const bb = Buffer.from(b);
	if (ab.length !== bb.length) {
		// Still burn a comparison so length mismatches aren't a fast path.
		timingSafeEqual(ab, ab);
		return false;
	}
	return timingSafeEqual(ab, bb);
}

function sign(value: string, key: string): string {
	return createHmac('sha256', key).update(value).digest('base64url');
}

/**
 * Parse `ADMIN_USERS` into a list of accounts.
 *
 * Format: `name:password` pairs, comma separated, e.g.
 *   ADMIN_USERS="chris:hunter2,steven:hunter2"
 *
 * Only the first colon in an entry separates name from password, so passwords
 * may contain colons. They may not contain commas, which would split the entry.
 * Names are lowercased and compared case-insensitively.
 *
 * Entries missing either half are ignored rather than half-configured.
 */
export function adminUsers(): AdminUser[] {
	const raw = env.ADMIN_USERS;
	if (!raw) return [];

	const users: AdminUser[] = [];
	for (const entry of raw.split(',')) {
		const trimmed = entry.trim();
		if (!trimmed) continue;
		const separator = trimmed.indexOf(':');
		if (separator <= 0) continue;
		const name = trimmed.slice(0, separator).trim().toLowerCase();
		const password = trimmed.slice(separator + 1);
		if (!name || !password) continue;
		users.push({ name, password });
	}
	return users;
}

/**
 * Check a username and password against the configured accounts.
 *
 * Returns the canonical username on success, or null. An unset or empty
 * `ADMIN_USERS` authenticates nobody: a missing config must never become a
 * valid login.
 *
 * When no username matches we still burn a password comparison, so a wrong
 * username and a wrong password take a similar amount of time.
 */
export function authenticate(username: string, password: string): string | null {
	const users = adminUsers();
	if (users.length === 0) return null;

	const name = username.trim().toLowerCase();
	const match = users.find((u) => safeEqual(u.name, name));

	if (!match) {
		safeEqual(password, users[0].password);
		return null;
	}

	return safeEqual(password, match.password) ? match.name : null;
}

/**
 * Whether any account is configured.
 *
 * A login attempt with no accounts can never succeed, so callers should say so
 * plainly rather than presenting a generic "incorrect" that sends the user
 * hunting for a typo in a password that is actually correct.
 */
export function hasConfiguredUsers(): boolean {
	return adminUsers().length > 0;
}

export function createSessionToken(username: string): string {
	const key = secret();
	if (!key) {
		throw new Error('SESSION_SECRET is not set');
	}
	const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
	// The username is base64url encoded so it can contain no delimiter that
	// would make the signed payload ambiguous.
	const payload = `${TOKEN_VERSION}.${expires}.${Buffer.from(username, 'utf8').toString('base64url')}`;
	return `${payload}.${sign(payload, key)}`;
}

/** Verify a cookie and return the session it encodes, or null. */
export function readSession(token: string | undefined): Session | null {
	if (!token) return null;

	const parts = token.split('.');
	// v2 has four parts: version, expires, user, signature.
	if (parts.length !== 4) return null;
	const [version, expires, user, mac] = parts;
	if (version !== TOKEN_VERSION) return null;

	const key = secret();
	if (!key) return null;

	const payload = `${version}.${expires}.${user}`;
	if (!safeEqual(sign(payload, key), mac)) return null;

	const expiresAt = Number(expires);
	if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

	let username: string;
	try {
		username = Buffer.from(user, 'base64url').toString('utf8');
	} catch {
		return null;
	}
	if (!username) return null;

	return { username, expires: expiresAt };
}

export function verifySessionToken(token: string | undefined): boolean {
	return readSession(token) !== null;
}

export const sessionCookie = {
	name: COOKIE_NAME,
	attributes: {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: SESSION_DAYS * 24 * 60 * 60
	} as const
};
