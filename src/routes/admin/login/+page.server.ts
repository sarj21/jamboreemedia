import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { isValidPassword, createSessionToken, sessionCookie } from '$lib/admin';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const password = String(form.get('password') ?? '');

		if (!isValidPassword(password)) {
			return fail(400, { incorrect: true });
		}

		cookies.set(sessionCookie.name, createSessionToken(), sessionCookie.attributes);
		redirect(303, '/admin');
	}
};
