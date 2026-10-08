import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getSupabase } from '$lib/supabase';
import { sessionCookie } from '$lib/admin';
import shows from '$lib/shows.json';
import { findShowBySlug, showSlug, toISODate, type Show } from '$lib/show';
import type { Application, Booking } from '$lib/rows';

const PAGE_SIZE = 25;

/** Admin tabs are named after the tables they read: bookings | applications. */
type Tab = 'bookings' | 'applications';

function isTab(value: string | null): value is Tab {
	return value === 'bookings' || value === 'applications';
}

/** PostgREST reports an unknown relation/column as PGRST205 / 42703. */
function isMissingColumn(error: { code?: string } | null): boolean {
	return error?.code === 'PGRST205' || error?.code === '42703';
}

const empty = {
	bookings: [] as Booking[],
	applications: [] as Application[],
	loadError: null as string | null,
	tableMissing: false,
	page: 1,
	total: 0,
	pageSize: PAGE_SIZE
};

/**
 * Resolve which show a request refers to.
 *
 * Form actions post to `?/action`, which drops the query string, so the slug is
 * carried in a hidden field. The query string is only a fallback.
 */
function resolveShow(url: URL, form: FormData | null): {
	slug: string;
	show: Show | undefined;
} {
	const allShows = shows as Show[];
	const posted = form?.get('show');
	const slug =
		typeof posted === 'string' && posted
			? posted
			: (url.searchParams.get('show') ?? showSlug(allShows[0].date));
	return { slug, show: findShowBySlug(allShows, slug) };
}

function clampPage(raw: string | null): number {
	const n = Number(raw);
	return Number.isInteger(n) && n > 0 ? n : 1;
}

export const load: PageServerLoad = async ({ url }) => {
	const { slug, show } = resolveShow(url, null);

	const tabParam = url.searchParams.get('tab');
	const tab: Tab = isTab(tabParam) ? tabParam : 'applications';

	// An unknown slug matches nothing rather than erroring.
	const showDate = show ? toISODate(show.date) : '1970-01-01';

	const APPLIC_COLUMNS =
		'id,show_date,name,instagram,disciplines,notes,keep,status,tier,created_at';

	if (tab === 'bookings') {
		const { data, error } = await getSupabase()
			.from('bookings')
			.select('id,show_date,name,pronouns,payment_handle,wants_to_defend,claim_description,created_at')
			.eq('show_date', showDate)
			.order('created_at', { ascending: true });

		if (error) {
			console.error('bookings select failed:', error);
			return { ...empty, tab, selected: slug, loadError: error.message };
		}

		const bookings = (data ?? []) as Booking[];

		return {
			...empty,
			tab,
			selected: slug,
			bookings,
			// The header reads total for the bookings count; this tab isn't paginated.
			total: bookings.length
		};
	}

	// Applications: paginated, kept first.
	const requestedPage = clampPage(url.searchParams.get('page'));

	const { data, error, count } = await getSupabase()
		.from('applications')
		.select(APPLIC_COLUMNS, { count: 'exact' })
		.eq('show_date', showDate)
		.order('keep', { ascending: false })
		.order('created_at', { ascending: true })
		.range((requestedPage - 1) * PAGE_SIZE, requestedPage * PAGE_SIZE - 1);

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

	const total = count ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const page = Math.min(requestedPage, pageCount);

	// Past the end (stale link, or rows deleted): fall back to the last page.
	if (page !== requestedPage) {
		const { data: last } = await getSupabase()
			.from('applications')
			.select(APPLIC_COLUMNS)
			.eq('show_date', showDate)
			.order('keep', { ascending: false })
			.order('created_at', { ascending: true })
			.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

		return { ...empty, tab, selected: slug, applications: (last ?? []) as Application[], total, page };
	}

	return {
		...empty,
		tab,
		selected: slug,
		applications: (data ?? []) as Application[],
		total,
		page
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

		// PostgREST reports success even when the filters matched nothing.
		if (!data || data.length === 0) {
			console.error(`keep: no application id=${id} for show ${show.date}`);
			return fail(404, {
				actionError: 'That application no longer exists. Reload to refresh the list.'
			});
		}

		return { actionOk: true };
	},

	/** Set an application to yes / no / maybe. */
	status: async ({ request, url }) => {
		const form = await request.formData();
		const { show } = resolveShow(url, form);
		if (!show) error(404, 'Show not found');

		const id = Number(form.get('id'));
		const status = String(form.get('status') ?? '');

		if (!Number.isInteger(id) || !['yes', 'no', 'maybe'].includes(status)) {
			return fail(400, { actionError: 'Invalid status' });
		}

		const { data, error: updateError } = await getSupabase()
			.from('applications')
			.update({ status })
			.eq('id', id)
			.eq('show_date', toISODate(show.date))
			.select('id');

		if (updateError) {
			console.error('applications status update failed:', updateError);
			return fail(500, { actionError: updateError.message });
		}

		if (!data || data.length === 0) {
			console.error(`status: no application id=${id} for show ${show.date}`);
			return fail(404, { actionError: 'That application no longer exists.' });
		}

		return { actionOk: true };
	},

	/** Flag an application as a big or small name, or clear the tier. */
	tier: async ({ request, url }) => {
		const form = await request.formData();
		const { show } = resolveShow(url, form);
		if (!show) error(404, 'Show not found');

		const id = Number(form.get('id'));
		const raw = String(form.get('tier') ?? '');
		const tier = raw === 'big' || raw === 'small' ? raw : null;

		if (!Number.isInteger(id)) {
			return fail(400, { actionError: 'Invalid application id' });
		}

		const { data, error: updateError } = await getSupabase()
			.from('applications')
			.update({ tier })
			.eq('id', id)
			.eq('show_date', toISODate(show.date))
			.select('id');

		if (updateError) {
			console.error('applications tier update failed:', updateError);
			return fail(500, { actionError: updateError.message });
		}

		if (!data || data.length === 0) {
			console.error(`tier: no application id=${id} for show ${show.date}`);
			return fail(404, { actionError: 'That application no longer exists.' });
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
		const disciplines = String(form.get('disciplines') ?? '').trim();

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
			disciplines: disciplines || null,
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