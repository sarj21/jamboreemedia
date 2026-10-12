import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { sessionCookie, readSession } from '$lib/admin';

const LOGIN_PATH = '/admin/login';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
	const session = readSession(cookies.get(sessionCookie.name));

	// The login page is the one route reachable without a session.
	if (!session && url.pathname !== LOGIN_PATH) {
		redirect(303, LOGIN_PATH);
	}

	// Already signed in and sitting on the login form? Skip past it.
	if (session && url.pathname === LOGIN_PATH) {
		redirect(303, '/admin');
	}

	// Which of us is signed in, so edits can be attributed.
	return { authed: session !== null, username: session?.username ?? null };
};
