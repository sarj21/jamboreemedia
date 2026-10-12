import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';
import { generalApplicationSchema, optionalField } from '$lib/schema';
import { getSupabase } from '$lib/supabase';
import { normalizeHandle } from '$lib/people';
import { listActiveShows } from '$lib/shows-db';
import { listAcceptingShows, showKey, showLogistics, showSlug } from '$lib/show';

export const load: PageServerLoad = async () => {
	const shows = await listActiveShows();

	return {
		form: await superValidate(zod4(generalApplicationSchema)),
		// Shows with per-show applications open, offered as a secondary option.
		openShows: listAcceptingShows(shows).map((show) => ({
			slug: showSlug(showKey(show)),
			date: show.date,
			city: show.city,
			cityColor: show.cityColor,
			venue: show.venue,
			notes: show.bookingNotes ?? '',
			...showLogistics(show)
		}))
	};
};

export const actions: Actions = {
	default: async (event) => {
		const form = await superValidate(event, zod4(generalApplicationSchema));

		if (!form.valid) {
			// fail() rather than a bare object, so the invalid submit reports as a
			// failure with a 400 rather than a success with errors in the payload.
			return fail(400, { form, submitError: null });
		}

		const { name, basedIn, freeDates, instagram, email, tiktok, twitter, bestContact, notes } =
			form.data;

		const { error: insertError } = await getSupabase()
			.from('general_applications')
			.insert({
				name,
				based_in: optionalField(basedIn),
				free_dates: optionalField(freeDates),
				instagram: normalizeHandle(instagram),
				email: optionalField(email),
				tiktok: optionalField(tiktok),
				twitter: optionalField(twitter),
				best_contact: optionalField(bestContact),
				notes: optionalField(notes)
			});

		if (insertError) {
			console.error('general_applications insert error:', insertError);
			return { form, submitError: insertError.message };
		}

		redirect(303, '/apply/sent');
	}
};
