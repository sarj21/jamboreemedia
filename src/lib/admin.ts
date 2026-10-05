import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

const COOKIE_NAME = 'jamboree_admin';
const SESSION_DAYS = 7;

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

export function isValidPassword(candidate: string): boolean {
	const expected = env.ADMIN_PASSWORD;
	// Fail closed: an unset password must never authenticate anyone.
	if (!expected) return false;
	return safeEqual(candidate, expected);
}

export function createSessionToken(): string {
	const key = secret();
	if (!key) {
		throw new Error('SESSION_SECRET is not set');
	}
	const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
	const payload = `admin.${expires}`;
	return `${payload}.${sign(payload, key)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
	if (!token) return false;

	const parts = token.split('.');
	if (parts.length !== 3) return false;

	const key = secret();
	if (!key) return false;

	const [role, expires, mac] = parts;
	const payload = `${role}.${expires}`;
	if (!safeEqual(sign(payload, key), mac)) return false;

	const expiresAt = Number(expires);
	if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

	return role === 'admin';
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
