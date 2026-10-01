import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { supabase } from '$lib/supabase';
import { sessionCookie } from '$lib/admin';
import shows from '$lib/shows.json';
import { findShowBySlug, showSlug, toISODate, type Show } from '$lib/show';

type Booking = {
	id: number;
	show_date: string;
	name: string;
	pronouns: string | null;
	payment_handle: string;
	wants_to_defend: boolean;
	claim_description: string | null;
	created_at: string;
};

export const load: PageServerLoad = async ({ url }) => {
	const allShows = shows as Show[];

	// There is no "all" view, so default to the first show in the list.
	const wanted = url.searchParams.get('show') ?? showSlug(allShows[0].date);
	const show = findShowBySlug(allShows, wanted);

	// An unknown slug matches nothing rather than erroring.
	const { data, error } = await supabase
		.from('bookings')
		.select('id,show_date,name,pronouns,payment_handle,wants_to_defend,claim_description,created_at')
		.eq('show_date', show ? toISODate(show.date) : '1970-01-01')
		.order('created_at', { ascending: true });

	if (error) {
		console.error('bookings select failed:', error);
		return { bookings: [] as Booking[], loadError: error.message, selected: wanted };
	}

	return { bookings: (data ?? []) as Booking[], loadError: null, selected: wanted };
};

export const actions: Actions = {
	logout: async ({ cookies }) => {
		cookies.delete(sessionCookie.name, { path: '/' });
		redirect(303, '/admin/login');
	}
};
