import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getSupabase } from '$lib/supabase';
import { sessionCookie } from '$lib/admin';
import shows from '$lib/shows.json';
import { findShowBySlug, showSlug, toISODate, type Show } from '$lib/show';
import type { Application, Booking } from '$lib/rows';

type Tab = 'submissions' | 'applications';

function isTab(value: string | null): value is Tab {
	return value === 'submissions' || value === 'applications';
}

/** PostgREST reports an unknown relation as PGRST205. */
function isMissingColumn(error: { code?: string; message?: string } | null): boolean {
	if (error?.code === 'PGRST205') return true;
	// The `keep` column is added by a later migration; PostgREST reports a
	// missing column as a Postgres 42703 wrapped in an error object.
	return error?.code === '42703';
}

const empty = {
	bookings: [] as Booking[],
	applications: [] as Application[],
	loadError: null as string | null,
	tableMissing: false
};

/**
 * Resolve which show a request refers to.
 *
 * Form actions post to `?/action`, which drops the page's query string, so the
 * slug is carried in a hidden field. The query string is only a fallback.
 */
function resolveShowSlug(url: URL, form: FormData | null): string {
	const allShows = shows as Show[];
	const posted = form?.get('show');
	const slug =
		typeof posted === 'string' && posted
			? posted
			: (url.searchParams.get('show') ?? showSlug(allShows[0].date));
	return slug;
}

function resolveShow(url: URL, form: FormData | null = null): {
	slug: string;
	show: Show | undefined;
} {
	const slug = resolveShowSlug(url, form);
	return { slug, show: findShowBySlug(shows as Show[], slug) };
}

export const load: PageServerLoad = async ({ url }) => {
	const { slug, show } = resolveShow(url);

	const tabParam = url.searchParams.get('tab');
	const tab: Tab = isTab(tabParam) ? tabParam : 'submissions';

	// An unknown slug matches nothing rather than erroring.
	const showDate = show ? toISODate(show.date) : '1970-01-01';

	// Only query the table the active tab needs, so one missing table can't
	// break the other view.
	if (tab === 'applications') {
		const { data, error } = await getSupabase()
			.from('applications')
			.select('id,show_date,name,instagram,notes,keep,created_at')
			.eq('show_date', showDate)
			// Kept applications first, then oldest first within each group.
			.order('keep', { ascending: false })
			.order('created_at', { ascending: true });

		if (error) {
			if (!isMissingColumn(error)) {
				console.error('applications select failed:', error);
			}
			return {
				...empty,
				tab,
				selected: slug,
				loadError: isMissingColumn(error) ? null : error.message,
				tableMissing: isMissingColumn(error)
			};
		}

		return {
			...empty,
			tab,
			selected: slug,
			applications: (data ?? []) as Application[],
			tableMissing: false
		};
	}

	const { data, error } = await getSupabase()
		.from('bookings')
		.select('id,show_date,name,pronouns,payment_handle,wants_to_defend,claim_description,created_at')
		.eq('show_date', showDate)
		.order('created_at', { ascending: true });

	if (error) {
		console.error('bookings select failed:', error);
		return {
			...empty,
			tab,
			selected: slug,
			loadError: error.message
		};
	}

	return {
		...empty,
		tab,
		selected: slug,
		bookings: (data ?? []) as Booking[]
	};
};

export const actions: Actions = {
	logout: async ({ cookies }) => {
		cookies.delete(sessionCookie.name, { path: '/' });
		redirect(303, '/admin/login');
	},

	/** Mark or unmark an application as one to keep. */
	keep: async ({ request, url }) => {
		const form = await request.formData();
		const { show } = resolveShow(url, form);
		if (!show) error(404, 'Show not found');

		const id = Number(form.get('id'));
		const keep = form.get('keep') === 'true';

		if (!Number.isInteger(id)) {
			return fail(400, { actionError: 'Invalid application id' });
		}

		// Scope by show as well as id so a stale tab can't edit another show's row.
		const { data, error: updateError } = await getSupabase()
			.from('applications')
			.update({ keep })
			.eq('id', id)
			.eq('show_date', toISODate(show.date))
			.select('id');

		if (updateError) {
			console.error('applications keep update failed:', updateError);
			return fail(500, { actionError: updateError.message });
		}

		// PostgREST reports success even when the filters matched nothing, which
		// previously made the checkbox silently revert.
		if (!data || data.length === 0) {
			console.error(`keep: no application id=${id} for show ${show.date}`);
			return fail(404, {
				actionError: 'That application no longer exists. Reload to refresh the list.'
			});
		}

		return { actionOk: true };
	},

	/** Add someone to the list by hand. */
	add: async ({ request, url }) => {
		const form = await request.formData();
		const { show } = resolveShow(url, form);
		if (!show) error(404, 'Show not found');

		const name = String(form.get('name') ?? '').trim();
		const instagram = String(form.get('instagram') ?? '').trim();

		const errors: Record<string, string> = {};
		if (!name) errors.name = 'Name is required';
		if (!instagram) errors.instagram = 'Instagram handle is required';
		if (Object.keys(errors).length) {
			return fail(400, { addErrors: errors, name, instagram });
		}

		const { error: insertError } = await getSupabase().from('applications').insert({
			show_date: toISODate(show.date),
			name,
			instagram,
			notes: null,
			keep: true
		});

		if (insertError) {
			console.error('applications manual insert failed:', insertError);
			return fail(500, { actionError: insertError.message });
		}

		return { added: true };
	}
};
