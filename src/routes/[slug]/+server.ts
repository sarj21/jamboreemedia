import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { findShowByShortSlug, recordHit } from '$lib/short-link.server';
import { showKey } from '$lib/show';

/**
 * Short share links: /dec2 -> the Dec 2 show's tickets.
 *
 * Handled by a server endpoint rather than a page, so it responds with a bare
 * redirect and no HTML is rendered for something nobody looks at.
 *
 * The redirect is deliberately 302, not 301. A permanent redirect gets cached
 * by the browser, and the follow-up request would never reach this server, so
 * the visit counts would record only first-time visitors. Temporary redirects
 * keep the count honest.
 *
 * Static routes (/apply, /booked, /admin, ...) take priority over this dynamic
 * one, so it only ever sees short slugs.
 */
export const GET: RequestHandler = async ({ params }) => {
	const found = await findShowByShortSlug(params.slug);

	if (!found) {
		// Anything unrecognised is a genuine 404 rather than a silent redirect
		// home, which would hide broken links.
		error(404, 'No show at that link');
	}

	const { show, target } = found;

	// Counted before redirecting so the hit is recorded even if the browser
	// does not follow it.
	await recordHit(showKey(show));

	return new Response(null, {
		status: 302,
		headers: {
			location: target,
			// Short links are shared in group chats and re-visited; a day is
			// long enough that a visitor following twice still counts twice.
			'cache-control': 'no-store'
		}
	});
};
