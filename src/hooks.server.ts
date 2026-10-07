import { redirect, type Handle } from '@sveltejs/kit';

/**
 * The booking and apply pages moved:
 *
 *   /booking/apply      -> /apply
 *   /booking/apply/...  -> /apply/...
 *   /booking/...        -> /booked/...
 *
 * Links to these were pasted into chats and may still be open in tabs, so keep
 * the old paths working.
 */
const OLD_PREFIX = '/booking';

const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	if (pathname === OLD_PREFIX || pathname.startsWith(`${OLD_PREFIX}/`)) {
		const rest = pathname.slice(OLD_PREFIX.length);

		// /apply is checked first: it is a literal path, not a show slug.
		if (rest === '/apply' || rest.startsWith('/apply/')) {
			redirect(308, rest);
		}

		redirect(308, `/booked${rest}`);
	}

	return resolve(event);
};

export { handle };