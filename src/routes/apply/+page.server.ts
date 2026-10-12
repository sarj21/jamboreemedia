import type { PageServerLoad } from './$types';
import { listActiveShows } from '$lib/shows-db';
import { listAcceptingShows, showKey, showLogistics, showSlug } from '$lib/show';

export const load: PageServerLoad = async () => {
	const shows = await listActiveShows();

	return {
		// Dates currently taking applications. These are the primary route in;
		// the general form at /apply/general is the fallback for when none suit.
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
