import type { PageServerLoad } from './$types';
import { getSupabase } from '$lib/supabase';
import { listAllShows } from '$lib/shows-db';
import { showSlug, toISODate, type Show } from '$lib/show';
import { normalizeHandle, type Appearance, type Person } from '$lib/people';

const PAGE_SIZE = 50;

const PERSON_COLUMNS =
	'id,name,instagram,pronouns,disciplines,notes,added_manually,added_by,created_at';
const APPEARANCE_COLUMNS =
	'id,person_id,show_date,status,tier,busy,dropped,should_rebook,reached_out_by,outcome_notes,from_application,created_at';

/** Look up city/venue per ISO date so the list can show where they have been. */
function showMetaByDate(
	allShows: Show[]
): Map<string, { slug: string; city: string; venue: string }> {
	return new Map(
		allShows.map((s) => [
			s.showDate ?? toISODate(s.date),
			{
				slug: showSlug(s.showDate ?? s.date),
				city: s.city,
				venue: s.venue || 'TBC'
			}
		])
	);
}

/**
 * Reduce a search box value to something safe to splice into a raw PostgREST
 * filter. Anything that is filter syntax is dropped, so a value like
 * `', name.ilike.*` can only ever search for those literal characters rather
 * than altering the filter.
 *
 * Apostrophes are excluded even though names may contain them: they terminate
 * the value inside PostgREST's filter grammar and return a 500. Searching for
 * "O'Brien" therefore matches nothing, which is acceptable next to the filter
 * erroring out.
 *
 * Returns null when nothing usable is left, so an input of pure punctuation
 * lists everyone rather than building a filter out of nothing.
 */
function searchTerm(raw: string): string | null {
	const cleaned = raw
		.replace(/[^a-z0-9 _@.-]/gi, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	return cleaned === '' ? null : cleaned;
}

export const load: PageServerLoad = async ({ url }) => {
	const meta = showMetaByDate(await listAllShows());

	const q = (url.searchParams.get('q') ?? '').trim();
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);

	let query = getSupabase()
		.from('people')
		// Embedded `order()` inside a nested select is rejected by this PostgREST
		// version, so appearances come back unordered and are sorted below.
		.select(`${PERSON_COLUMNS}, appearances(${APPEARANCE_COLUMNS})`, { count: 'exact' })
		.order('name', { ascending: true })
		.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

	// Names and handles, case-insensitively. The parenthesised form is
	// required: without it PostgREST reads the comma as a column separator and
	// fails with "column people.orname does not exist".
	const term = searchTerm(q);
	if (term) {
		query = query.or(`(name.ilike.*${term}*,instagram.ilike.*${term}*)`);
	}

	const { data, error: queryError, count } = await query;

	if (queryError) {
		console.error('people index query failed:', queryError);
		return {
			people: [],
			loadError: queryError.message,
			q,
			page: 1,
			total: 0,
			pageCount: 1,
			pageSize: PAGE_SIZE
		};
	}

	type Row = Person & { appearances: Appearance[] | null };

	const people = ((data ?? []) as unknown as Row[]).map((p) => ({
		...p,
		instagram: normalizeHandle(p.instagram),
		appearances: (p.appearances ?? [])
			.map((a) => ({
				...a,
				city: meta.get(a.show_date)?.city ?? null,
				venue: meta.get(a.show_date)?.venue ?? null
			}))
			.sort((a, b) => b.show_date.localeCompare(a.show_date))
	}));

	const total = count ?? 0;

	return {
		people,
		loadError: null as string | null,
		q,
		page,
		total,
		pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
		pageSize: PAGE_SIZE
	};
};
