import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { archiveShow, listAllShowRows, restoreShow, saveShow } from '$lib/shows-db';
import { getSupabase } from '$lib/supabase';
import { sessionCookie } from '$lib/admin';

const SHOW_TIME = /^([0-9]{1,2})(?::([0-9]{2}))?\s*(am|pm)$/i;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** Normalise and validate the submitted fields, returning errors per field. */
function readShowForm(form: FormData) {
	const errors: Record<string, string> = {};

	const showDate = String(form.get('showDate') ?? '').trim();
	if (!/^\d{4}-\d{2}-\d{2}$/.test(showDate)) {
		errors.showDate = 'Pick a date';
	}

	const city = String(form.get('city') ?? '').trim();
	if (!city) errors.city = 'City is required';

	const venue = String(form.get('venue') ?? '').trim();
	if (!venue) errors.venue = 'Venue is required';

	const time = String(form.get('time') ?? '').trim();
	if (!SHOW_TIME.test(time)) {
		errors.time = 'Use a time like 8:00pm';
	}

	const cityColor = String(form.get('cityColor') ?? '').trim() || '#5FB8B2';
	if (!HEX_COLOR.test(cityColor)) {
		errors.cityColor = 'Use a hex colour like #5FB8B2';
	}

	const trimmed = (key: string) => {
		const value = String(form.get(key) ?? '').trim();
		return value === '' ? null : value;
	};

	if (Object.keys(errors).length > 0) return { errors, value: null };

	return {
		errors,
		value: {
			show_date: showDate,
			city,
			city_color: cityColor,
			venue,
			time,
			ticket_url: trimmed('ticketUrl'),
			live: form.get('live') === 'true',
			accepting_applications: form.get('acceptingApplications') === 'true',
			booking_notes: trimmed('bookingNotes')
		}
	};
}

export const load: PageServerLoad = async () => {
	const rows = await listAllShowRows();

	// How much is attached to each show, so the delete warning can be honest
	// about what will be preserved. Only the date column is read.
	const [appearances, bookings] = await Promise.all([
		getSupabase()
			.from('appearances')
			.select('show_date')
			.then((r) => r.data ?? []),
		getSupabase()
			.from('bookings')
			.select('show_date')
			.then((r) => r.data ?? [])
	]);

	const counts: Record<string, { appearances: number; bookings: number }> = {};
	for (const a of appearances) {
		counts[a.show_date] ??= { appearances: 0, bookings: 0 };
		counts[a.show_date].appearances++;
	}
	for (const b of bookings) {
		counts[b.show_date] ??= { appearances: 0, bookings: 0 };
		counts[b.show_date].bookings++;
	}

	return {
		shows: rows,
		counts
	};
};

export const actions: Actions = {
	/** Create or update a show. Saving an archived date revives it. */
	save: async ({ request }) => {
		const form = await request.formData();
		const { errors, value } = readShowForm(form);

		if (!value) {
			return fail(400, {
				actionError: 'Check the highlighted fields',
				fieldErrors: errors,
				draft: Object.fromEntries(form.entries())
			});
		}

		const { error } = await saveShow(value);
		if (error) {
			return fail(500, { actionError: error });
		}

		return { saved: true };
	},

	/** Soft delete: the show disappears but its records are kept. */
	archive: async ({ request }) => {
		const form = await request.formData();
		const showDate = String(form.get('showDate') ?? '');
		if (!/^\d{4}-\d{2}-\d{2}$/.test(showDate)) {
			return fail(400, { actionError: 'Unknown show' });
		}

		const { error } = await archiveShow(showDate);
		if (error) return fail(500, { actionError: error });
		return { archived: true };
	},

	/** Bring an archived show back, with its records still attached. */
	restore: async ({ request }) => {
		const form = await request.formData();
		const showDate = String(form.get('showDate') ?? '');
		if (!/^\d{4}-\d{2}-\d{2}$/.test(showDate)) {
			return fail(400, { actionError: 'Unknown show' });
		}

		const { error } = await restoreShow(showDate);
		if (error) return fail(500, { actionError: error });
		return { restored: true };
	},

	logout: async ({ cookies }) => {
		cookies.delete(sessionCookie.name, { path: '/' });
		redirect(303, '/admin/login');
	}
};
