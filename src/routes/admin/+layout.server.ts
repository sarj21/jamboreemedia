import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { sessionCookie, verifySessionToken } from '$lib/admin';

const LOGIN_PATH = '/admin/login';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
	const authed = verifySessionToken(cookies.get(sessionCookie.name));

	// The login page is the one route reachable without a session.
	if (!authed && url.pathname !== LOGIN_PATH) {
		redirect(303, LOGIN_PATH);
	}

	// Already signed in and sitting on the login form? Skip past it.
	if (authed && url.pathname === LOGIN_PATH) {
		redirect(303, '/admin');
	}

	return { authed };
};
