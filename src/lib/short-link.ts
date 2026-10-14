/**
 * Short share links, e.g. jamboree.media/dec2 for a show on 2026-12-02.
 *
 * Pure helpers only, with no Supabase import, so components can use them without
 * dragging the service-role key toward the browser. Anything that reads the
 * database lives in ./short-link.server.ts instead.
 */

const MONTH_ABBR = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * Short slug for a show date: "2026-12-02" -> "dec2".
 *
 * No leading zero and no separator, so it stays easy to type from a phone or
 * read aloud. Note this is only unique per month-and-day: two shows on
 * 2 December in different years both produce "dec2". See
 * findShowByShortSlug in the server module for how that is resolved.
 */
export function shortSlug(isoDate: string): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
	if (!m) return '';
	return `${MONTH_ABBR[Number(m[2]) - 1]}${Number(m[3])}`;
}

/**
 * The URL people share, for display in the admin.
 *
 * `origin` is the current site's origin, so the copy shown is a full URL
 * rather than a bare path.
 */
export function shortLinkFor(isoDate: string, origin?: string): string {
	const slug = shortSlug(isoDate);
	if (!slug) return '';
	return origin ? `${origin.replace(/\/$/, '')}/${slug}` : `/${slug}`;
}

/** Shape of a valid short slug, so bad ones 404 without a database round trip. */
export function isShortSlug(value: string): boolean {
	return /^[a-z]{3}\d{1,2}$/.test(value.trim().toLowerCase());
}