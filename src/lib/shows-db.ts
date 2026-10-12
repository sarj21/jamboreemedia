/**
 * Server-side access to the `shows` table.
 *
 * Replaces the old shows.json. Every read here filters out archived shows, so a
 * deleted show disappears from the site while its appearances and bookings stay
 * in the database and return if the same date is added back.
 */
import { getSupabase } from '$lib/supabase';
import { rowToShow, showKey, showSlug, type Show, type ShowRow } from '$lib/show';

const COLUMNS =
	'show_date,city,city_color,venue,time,ticket_url,live,accepting_applications,booking_notes,archived';

export const SHOW_COLUMNS = COLUMNS;

/** All shows, including archived. For admin screens. */
export async function listAllShowRows(): Promise<ShowRow[]> {
	const { data, error } = await getSupabase()
		.from('shows')
		.select(COLUMNS)
		.order('show_date', { ascending: true });

	if (error) {
		console.error('shows select failed:', error);
		return [];
	}
	return (data ?? []) as ShowRow[];
}

/** Shows that are not archived, in date order. */
export async function listActiveShows(): Promise<Show[]> {
	const { data, error } = await getSupabase()
		.from('shows')
		.select(COLUMNS)
		.eq('archived', false)
		.order('show_date', { ascending: true });

	if (error) {
		console.error('shows select failed:', error);
		return [];
	}
	return ((data ?? []) as ShowRow[]).map(rowToShow);
}

/** All shows including archived, as the shape the site uses. */
export async function listAllShows(): Promise<Show[]> {
	return (await listAllShowRows()).map(rowToShow);
}

/**
 * One show by its slug, or undefined if unknown or archived.
 *
 * Archived shows are treated as gone everywhere, which is what makes a deleted
 * date disappear from the site. Admin code that needs archived rows should use
 * listAllShowRows instead.
 */
export async function findShow(slug: string): Promise<Show | undefined> {
	const { data, error } = await getSupabase().from('shows').select(COLUMNS).eq('archived', false);

	if (error) {
		console.error('shows select failed:', error);
		return undefined;
	}

	const target = slug.toLowerCase();
	return ((data ?? []) as ShowRow[]).map(rowToShow).find((s) => showSlug(showKey(s)) === target);
}

/** The show for an ISO date, archived or not. Used by admin transfer logic. */
export async function showByDate(isoDate: string): Promise<Show | undefined> {
	const { data, error } = await getSupabase()
		.from('shows')
		.select(COLUMNS)
		.eq('show_date', isoDate)
		.maybeSingle();

	if (error) {
		console.error('shows select by date failed:', error);
		return undefined;
	}
	return data ? rowToShow(data as ShowRow) : undefined;
}

export type ShowInput = {
	show_date: string;
	city: string;
	city_color: string;
	venue: string;
	time: string;
	ticket_url: string | null;
	live: boolean;
	accepting_applications: boolean;
	booking_notes: string | null;
};

/**
 * Create or update a show by date.
 *
 * Upsert rather than insert-then-update so that re-adding a previously archived
 * date revives it in one step, keeping its appearances and bookings attached.
 */
export async function saveShow(input: ShowInput): Promise<{ error: string | null }> {
	const { error } = await getSupabase()
		.from('shows')
		.upsert(
			{ ...input, archived: false, updated_at: new Date().toISOString() },
			{
				onConflict: 'show_date'
			}
		);

	if (error) return { error: error.message };
	return { error: null };
}

/**
 * Hide a show without touching its records.
 *
 * Setting archived rather than deleting means appearances and bookings survive,
 * so re-adding the same date brings them all back.
 */
export async function archiveShow(isoDate: string): Promise<{ error: string | null }> {
	const { error } = await getSupabase()
		.from('shows')
		.update({ archived: true, updated_at: new Date().toISOString() })
		.eq('show_date', isoDate);

	if (error) return { error: error.message };
	return { error: null };
}

/** Undo an archive. */
export async function restoreShow(isoDate: string): Promise<{ error: string | null }> {
	const { error } = await getSupabase()
		.from('shows')
		.update({ archived: false, updated_at: new Date().toISOString() })
		.eq('show_date', isoDate);

	if (error) return { error: error.message };
	return { error: null };
}
