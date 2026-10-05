import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { applicationSchema } from '$lib/schema';
import { getSupabase } from '$lib/supabase';
import shows from '$lib/shows.json';
import {
	findShowBySlug,
	isAcceptingBookings,
	showLogistics,
	toISODate,
	type Show
} from '$lib/show';

export const load: PageServerLoad = async ({ params }) => {
	const show = findShowBySlug(shows as Show[], params.date);
	if (!show || !isAcceptingBookings(show)) {
		error(404, 'Show not open for applications');
	}

	const logistics = showLogistics(show);
	const form = await superValidate(zod4(applicationSchema));
	return {
		form,
		date: show.date,
		city: show.city,
		cityColor: show.cityColor,
		venue: show.venue,
		notes: show.bookingNotes ?? '',
		...logistics
	};
};

export const actions: Actions = {
	default: async (event) => {
		const show = findShowBySlug(shows as Show[], event.params.date);
		if (!show || !isAcceptingBookings(show)) {
			error(404, 'Show not open for applications');
		}

		const form = await superValidate(event, zod4(applicationSchema));

		if (!form.valid) {
			return { form, submitError: null };
		}

		const { name, instagram, notes } = form.data;

		const { error: insertError } = await getSupabase().from('applications').insert({
			show_date: toISODate(show.date),
			name,
			instagram,
			notes: notes?.trim() ? notes : null
		});

		if (insertError) {
			console.error('applications insert error:', insertError);
			return { form, submitError: insertError.message };
		}

		redirect(303, `/booking/apply/${event.params.date}/success`);
	}
};