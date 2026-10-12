import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	authenticate,
	hasConfiguredUsers,
	createSessionToken,
	readSession,
	sessionCookie
} from '$lib/admin';

export const load: PageServerLoad = ({ cookies }) => {
	// Only skip the form for a *valid* session. Testing whether a cookie merely
	// exists would bounce a stale or expired cookie back and forth with the
	// layout guard: /admin/login -> /admin -> /admin/login, forever.
	if (readSession(cookies.get(sessionCookie.name))) {
		redirect(303, '/admin');
	}
	return { configured: hasConfiguredUsers() };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const username = String(form.get('username') ?? '');
		const password = String(form.get('password') ?? '');

		// No accounts configured means every login would be refused. Say so
		// rather than blaming the password someone typed correctly.
		if (!hasConfiguredUsers()) {
			return fail(503, { notConfigured: true });
		}

		const account = authenticate(username, password);

		// One generic message: never reveal whether the username exists.
		if (!account) {
			return fail(400, { incorrect: true });
		}

		cookies.set(sessionCookie.name, createSessionToken(account), sessionCookie.attributes);
		redirect(303, '/admin');
	}
};
