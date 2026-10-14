/**
 * Database-backed half of the short share links.
 *
 * Kept apart from ./short-link.ts, and in a `.server.ts` file so SvelteKit
 * refuses to bundle it for the browser: importing the pure helpers must never
 * pull the service-role key along with it.
 */
import { getSupabase } from '$lib/supabase';
import { listActiveShows } from '$lib/shows-db';
import { showKey } from '$lib/show';
import { isShortSlug, shortSlug } from '$lib/short-link';
import type { Show } from '$lib/show';

/**
 * The show a short slug refers to, and where to send the visitor.
 *
 * A slug ignores the year, so if several shows share a month-and-day the
 * nearest one wins: the next upcoming show, or failing that the most recent
 * past one. That keeps a link usable years later instead of silently pointing
 * at the wrong date.
 *
 * A show with no ticket link yet forwards to the home page rather than nowhere.
 * The admin says so next to the link, so it is not a silent dead end.
 */
export async function findShowByShortSlug(
	slug: string
): Promise<{ show: Show; target: string } | undefined> {
	const normalized = slug.trim().toLowerCase();
	if (!isShortSlug(normalized)) return undefined;

	const shows = await listActiveShows();
	const matching = shows
		.filter((show) => shortSlug(showKey(show)) === normalized)
		.sort((a, b) => showKey(a).localeCompare(showKey(b)));

	if (matching.length === 0) return undefined;

	const today = new Date().toISOString().slice(0, 10);
	const upcoming = matching.find((s) => showKey(s) >= today);
	const show = upcoming ?? matching[matching.length - 1];

	return { show, target: show.ticketUrl ? show.ticketUrl : '/' };
}

/**
 * Count a visit. Best effort: a failed counter must never stop someone
 * reaching the tickets, so errors are logged and swallowed.
 */
export async function recordHit(isoDate: string): Promise<void> {
	try {
		const { error } = await getSupabase().rpc('record_short_link_hit', {
			p_show_date: isoDate
		});
		if (error) console.error('short link hit not recorded:', error);
	} catch (err) {
		console.error('short link hit not recorded:', err);
	}
}

export type HitCounts = Record<string, number>;

/** Visit counts keyed by show date, for the admin list. */
export async function loadHitCounts(): Promise<HitCounts> {
	const { data, error } = await getSupabase().from('short_link_hits').select('show_date,hits');

	if (error) {
		console.error('short_link_hits select failed:', error);
		return {};
	}
	return Object.fromEntries(
		((data ?? []) as { show_date: string; hits: number }[]).map((r) => [
			r.show_date,
			r.hits
		])
	);
}